import type {
  AgentAction,
  AgentTask,
  AudienceLead,
  DailyBrief,
  SheetTab,
  SheetWorkbook,
} from './types';

function tab(
  name: string,
  rows: Array<Record<string, string | number | boolean | null>>
): SheetTab {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { name, columns, rows };
}

export function buildSheetWorkbook(
  leads: AudienceLead[],
  tasks: AgentTask[],
  actions: AgentAction[],
  brief: DailyBrief
): SheetWorkbook {
  const leadsRows = leads.map((lead) => ({
    lead_id: lead.leadId,
    product_id: lead.productId,
    full_name: lead.profile.fullName ?? null,
    job_title: lead.profile.jobTitle ?? null,
    company: lead.profile.company ?? null,
    source: lead.source.sourceLabel,
    source_type: lead.source.sourceType,
    consent_status: lead.contact.consentStatus,
    preferred_channel: lead.contact.preferredChannel ?? null,
    timezone: lead.audienceProfile.timezone ?? null,
    language: lead.audienceProfile.language ?? null,
    preferred_tone: lead.audienceProfile.preferredTone ?? null,
    persona: lead.personaId ?? null,
    fit_score: lead.score?.totalScore ?? null,
    stage: lead.stage,
    owner_agent: lead.operational.ownerAgent ?? null,
    next_action: lead.operational.nextAction ?? null,
    next_action_at: lead.operational.nextActionAt ?? null,
    goals: lead.audienceProfile.goals.join(' | ') || null,
    frustrations: lead.audienceProfile.frustrations.join(' | ') || null,
    current_tools: lead.audienceProfile.currentTools.join(' | ') || null,
    objections: lead.audienceProfile.objections.join(' | ') || null,
    personalization_summary: lead.personalizationSummary ?? null,
    activation_status: lead.lifecycle.activationStatus,
    payment_status: lead.lifecycle.paymentStatus,
    advocacy_status: lead.lifecycle.advocacyStatus,
    updated_at: lead.updatedAt,
  }));

  const actionRows = actions.map((action) => ({
    timestamp: action.timestamp,
    lead_id: action.leadId ?? null,
    agent: action.agentId,
    action_type: action.actionType,
    summary: action.summary,
    status: action.status,
    metadata: action.metadata ? JSON.stringify(action.metadata) : null,
  }));

  const queueRows = tasks.map((task) => ({
    task_id: task.taskId,
    lead_id: task.leadId ?? null,
    agent: task.agentId,
    subagent: task.subagentId ?? null,
    task_type: task.taskType,
    priority: task.priority,
    stage: task.stage ?? null,
    due_at: task.dueAt,
    summary: task.summary,
  }));

  const briefRows = [
    {
      generated_at: brief.generatedAt,
      product_id: brief.productId,
      product_name: brief.productName,
      lead_count: brief.leadCount,
      ingested_count: brief.ingestedCount,
      queued_task_count: brief.queuedTaskCount,
      blocked_count: brief.blockedCount,
      intro_ready_count: brief.introReadyCount,
      activation_due_count: brief.activationDueCount,
      conversion_due_count: brief.conversionDueCount,
      retention_due_count: brief.retentionDueCount,
      summary: brief.summary,
    },
  ];

  const overridesRows = [
    {
      lead_id: null,
      pause: false,
      do_not_contact: false,
      priority_override: null,
      owner_override: null,
      notes: null,
    },
  ];

  return {
    tabs: [
      tab('Leads_Master', leadsRows),
      tab('Agent_Actions', actionRows),
      tab('Queue', queueRows),
      tab('Daily_Brief', briefRows),
      tab('Overrides', overridesRows),
    ],
  };
}
