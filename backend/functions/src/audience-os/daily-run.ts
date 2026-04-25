import { ingestRawLeads, dedupeLeads } from './lead-gen';
import { normalizeProductManifest } from './manifest';
import { buildSheetWorkbook } from './sheet-view';
import type {
  AgentAction,
  AgentTask,
  AudienceLead,
  AudienceProductAdapter,
  AudienceRunInput,
  DailyBrief,
  DailyRunResult,
  LeadAssessment,
} from './types';
import { buildLeadWorkflow } from './workflow';

function nowIso(inputNow?: string): string {
  if (inputNow) {
    return new Date(inputNow).toISOString();
  }

  return new Date().toISOString();
}

function countBy<T>(
  items: T[],
  selector: (item: T) => string | undefined
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = selector(item);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function buildDailyBrief(
  generatedAt: string,
  productId: string,
  productName: string,
  leads: AudienceLead[],
  ingestedLeads: AudienceLead[],
  tasks: AgentTask[]
): DailyBrief {
  const personaCounts = countBy(leads, (lead) => lead.personaId).slice(0, 5);
  const signalCounts = countBy(
    leads.flatMap((lead) => lead.matchedSignals.map((signal) => ({ signal }))),
    (item) => item.signal
  ).slice(0, 5);

  const blockedCount = leads.filter((lead) => lead.stage === 'blocked').length;
  const introReadyCount = leads.filter((lead) => lead.stage === 'intro_ready').length;
  const activationDueCount = tasks.filter((task) => task.agentId === 'activation-operator').length;
  const conversionDueCount = tasks.filter((task) => task.agentId === 'conversion-operator').length;
  const retentionDueCount = tasks.filter((task) => task.agentId === 'retention-operator').length;

  return {
    generatedAt,
    productId,
    productName,
    leadCount: leads.length,
    ingestedCount: ingestedLeads.length,
    queuedTaskCount: tasks.length,
    blockedCount,
    introReadyCount,
    activationDueCount,
    conversionDueCount,
    retentionDueCount,
    topPersonas: personaCounts.map((item) => ({ personaId: item.key, count: item.count })),
    topSignals: signalCounts.map((item) => ({ signal: item.key, count: item.count })),
    summary: `${productName}: ${leads.length} leads tracked, ${tasks.length} queued tasks, ${introReadyCount} intro-ready leads.`,
  };
}

export function buildDailyAudienceRun(
  input: AudienceRunInput,
  adapter: AudienceProductAdapter
): DailyRunResult {
  const generatedAt = nowIso(input.now);
  const manifest = normalizeProductManifest(input.manifest);
  const existingLeads = input.leads ?? [];
  const { leads: ingestedLeads, actions: ingestActions } = ingestRawLeads(
    manifest,
    input.rawLeads ?? [],
    generatedAt
  );
  const combinedLeads = dedupeLeads([...existingLeads, ...ingestedLeads]);

  const assessments: LeadAssessment[] = [];
  const tasks: AgentTask[] = [];
  const actions: AgentAction[] = [...ingestActions];
  const leadSnapshots: AudienceLead[] = [];

  for (const lead of combinedLeads) {
    const result = buildLeadWorkflow(manifest, lead, adapter, generatedAt);
    leadSnapshots.push(result.updatedLead);
    assessments.push(result.assessment);
    tasks.push(...result.tasks);
    actions.push(...result.actions);
  }

  const brief = buildDailyBrief(
    generatedAt,
    manifest.productId,
    manifest.name,
    leadSnapshots,
    ingestedLeads,
    tasks
  );

  const topPersona = brief.topPersonas[0]?.personaId ?? null;
  const leadGenTask: AgentTask | null =
    ingestedLeads.length > 0
      ? {
          taskId: `lead-gen-review-${Date.parse(generatedAt)}`,
          agentId: 'lead-gen-operator',
          subagentId: 'source-quality-analyst',
          priority: 'medium',
          taskType: 'source_review',
          dueAt: generatedAt,
          summary: 'Review newly ingested source quality and dedupe health.',
          details: {
            ingestedLeadCount: ingestedLeads.length,
            sourceLabels: Array.from(new Set(ingestedLeads.map((lead) => lead.source.sourceLabel))),
          },
        }
      : null;
  const orchestratorTask: AgentTask = {
    taskId: `orchestrator-daily-brief-${Date.parse(generatedAt)}`,
    agentId: 'orchestrator',
    priority: 'high',
    taskType: 'daily_brief',
    dueAt: generatedAt,
    summary: 'Write the operator brief and confirm the next queue.',
    details: {
      topPersona,
      queuedTaskCount: tasks.length,
      productId: manifest.productId,
    },
  };
  const researchWriterTask: AgentTask = {
    taskId: `research-writer-content-${Date.parse(generatedAt)}`,
    agentId: 'research-writer',
    subagentId: 'signal-miner',
    priority: 'medium',
    taskType: 'content_refresh',
    dueAt: generatedAt,
    summary: 'Refresh hooks and opt-in angles from the latest audience evidence.',
    details: {
      topSignals: brief.topSignals,
      topPersonas: brief.topPersonas,
    },
  };
  const productLearningTask: AgentTask = {
    taskId: `product-learning-cluster-${Date.parse(generatedAt)}`,
    agentId: 'product-learning',
    subagentId: 'pain-clusterer',
    priority: 'medium',
    taskType: 'evidence_cluster',
    dueAt: generatedAt,
    summary: 'Cluster repeated pain patterns and promise gaps from today’s run.',
    details: {
      leadCount: leadSnapshots.length,
      topSignals: brief.topSignals,
    },
  };
  const sheetSyncTask: AgentTask = {
    taskId: `sheet-sync-${Date.parse(generatedAt)}`,
    agentId: 'sheet-sync-operator',
    subagentId: 'delta-writer',
    priority: 'medium',
    taskType: 'sheet_sync',
    dueAt: generatedAt,
    summary: 'Mirror the latest lead, queue, and action state into Google Sheets.',
    details: {
      tabs: ['Leads_Master', 'Agent_Actions', 'Queue', 'Daily_Brief', 'Overrides'],
    },
  };

  if (leadGenTask) {
    tasks.push(leadGenTask);
  }

  tasks.push(orchestratorTask, researchWriterTask, productLearningTask, sheetSyncTask);

  actions.push(
    {
      timestamp: generatedAt,
      agentId: 'orchestrator',
      actionType: 'daily_brief_planned',
      summary: 'Daily brief task queued.',
      status: 'planned',
      metadata: { queuedTaskCount: tasks.length },
    },
    {
      timestamp: generatedAt,
      agentId: 'sheet-sync-operator',
      actionType: 'sheet_sync_planned',
      summary: 'Sheet sync task queued.',
      status: 'planned',
      metadata: { tabs: 5 },
    }
  );

  const sheetWorkbook = buildSheetWorkbook(leadSnapshots, tasks, actions, brief);

  return {
    manifest: { productId: manifest.productId, name: manifest.name },
    leadSnapshots,
    ingestedLeads,
    assessments,
    tasks,
    actions,
    sheetWorkbook,
    brief,
  };
}
