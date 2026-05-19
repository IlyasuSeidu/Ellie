import { type AiDecisionCandidate, type DailyAnalyticsSummary } from './analytics-ai';

export const AI_DAILY_ANALYSES_COLLECTION = 'aiDailyAnalyses';
export const DEFAULT_CLAUDE_INTELLIGENCE_MODEL = 'claude-sonnet-4-6';
export const CLAUDE_INTELLIGENCE_PROMPT_VERSION = 1;

export interface ClaudeIntelligencePrompt {
  system: string;
  user: string;
}

export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
}

export interface ClaudeMessageTextBlock {
  type: 'text';
  text: string;
}

export interface ClaudeMessagesResponse {
  id?: string;
  model?: string;
  stop_reason?: string | null;
  content?: ClaudeMessageTextBlock[];
  usage?: ClaudeUsage;
}

export interface IntelligenceEmergency {
  metric: string;
  currentValue: string | number | boolean | null;
  lastWeekValue?: string | number | boolean | null;
  change?: string | number | boolean | null;
  recommendedAction: string;
}

export interface IntelligenceOpportunity {
  observation: string;
  recommendation: string;
  estimatedImpact: string;
}

export interface IntelligenceEngineeringAlert {
  area: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface IntelligenceAbTestRecommendation {
  hypothesis: string;
  control: string;
  treatment: string;
  primaryMetric: string;
}

export interface ClaudeDailyIntelligencePayload {
  emergencies: IntelligenceEmergency[];
  opportunities: IntelligenceOpportunity[];
  churnAlerts: {
    genuineCount: number;
    fifoCaution: string;
  };
  engineeringAlerts: IntelligenceEngineeringAlert[];
  abTestRecommendation: IntelligenceAbTestRecommendation | null;
  executiveSummary: string;
}

export interface ClaudeDailyIntelligenceAnalysis extends ClaudeDailyIntelligencePayload {
  id: string;
  dayKey: string;
  generatedAtMs: number;
  model: string;
  promptVersion: number;
  sourceSummaryId: string;
  inputEventCount: number;
  status: 'completed' | 'fallback';
  rawResponseText?: string;
  responseId?: string;
  stopReason?: string | null;
  usage?: ClaudeUsage;
  errorMessage?: string;
  schemaVersion: 1;
}

export interface ClaudeDailyAnalysisResult {
  analysis: ClaudeDailyIntelligenceAnalysis;
  queueCandidates: AiDecisionCandidate[];
}

interface AnthropicFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
}

export type AnthropicFetch = (
  url: string,
  init: {
    method: 'POST';
    headers: Record<string, string>;
    body: string;
  }
) => Promise<AnthropicFetchResponse>;

const MAX_RAW_RESPONSE_LENGTH = 12000;
const MAX_EXECUTIVE_SUMMARY_LENGTH = 700;
const MAX_FIELD_LENGTH = 500;

function clampString(value: unknown, fallback: string, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function clampNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeSeverity(value: unknown): 'critical' | 'high' | 'medium' | 'low' {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
}

function normalizeEmergency(value: unknown): IntelligenceEmergency | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    metric: clampString(record.metric, 'unknown'),
    currentValue:
      typeof record.currentValue === 'string' ||
      typeof record.currentValue === 'number' ||
      typeof record.currentValue === 'boolean' ||
      record.currentValue === null
        ? record.currentValue
        : null,
    lastWeekValue:
      typeof record.lastWeekValue === 'string' ||
      typeof record.lastWeekValue === 'number' ||
      typeof record.lastWeekValue === 'boolean' ||
      record.lastWeekValue === null
        ? record.lastWeekValue
        : null,
    change:
      typeof record.change === 'string' ||
      typeof record.change === 'number' ||
      typeof record.change === 'boolean' ||
      record.change === null
        ? record.change
        : null,
    recommendedAction: clampString(
      record.recommendedAction,
      'Investigate this metric before taking action.'
    ),
  };
}

function normalizeOpportunity(value: unknown): IntelligenceOpportunity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    observation: clampString(record.observation, 'No observation provided.'),
    recommendation: clampString(record.recommendation, 'Review this opportunity manually.'),
    estimatedImpact: clampString(record.estimatedImpact, 'Unknown'),
  };
}

function normalizeEngineeringAlert(value: unknown): IntelligenceEngineeringAlert | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    area: clampString(record.area, 'unknown'),
    issue: clampString(record.issue, 'No issue provided.'),
    severity: normalizeSeverity(record.severity),
  };
}

function normalizeAbTest(value: unknown): IntelligenceAbTestRecommendation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    hypothesis: clampString(record.hypothesis, 'No test recommended.'),
    control: clampString(record.control, 'Current experience'),
    treatment: clampString(record.treatment, 'Proposed change'),
    primaryMetric: clampString(record.primaryMetric, 'primary_conversion'),
  };
}

function normalizeAnalysisPayload(value: unknown): ClaudeDailyIntelligencePayload {
  const record =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    emergencies: Array.isArray(record.emergencies)
      ? record.emergencies
          .map(normalizeEmergency)
          .filter((entry): entry is IntelligenceEmergency => Boolean(entry))
          .slice(0, 10)
      : [],
    opportunities: Array.isArray(record.opportunities)
      ? record.opportunities
          .map(normalizeOpportunity)
          .filter((entry): entry is IntelligenceOpportunity => Boolean(entry))
          .slice(0, 10)
      : [],
    churnAlerts: {
      genuineCount:
        record.churnAlerts &&
        typeof record.churnAlerts === 'object' &&
        !Array.isArray(record.churnAlerts)
          ? Math.max(
              0,
              Math.round(clampNumber((record.churnAlerts as Record<string, unknown>).genuineCount))
            )
          : 0,
      fifoCaution:
        record.churnAlerts &&
        typeof record.churnAlerts === 'object' &&
        !Array.isArray(record.churnAlerts)
          ? clampString(
              (record.churnAlerts as Record<string, unknown>).fifoCaution,
              'Do not treat FIFO rest-block inactivity as churn without roster context.'
            )
          : 'Do not treat FIFO rest-block inactivity as churn without roster context.',
    },
    engineeringAlerts: Array.isArray(record.engineeringAlerts)
      ? record.engineeringAlerts
          .map(normalizeEngineeringAlert)
          .filter((entry): entry is IntelligenceEngineeringAlert => Boolean(entry))
          .slice(0, 10)
      : [],
    abTestRecommendation: normalizeAbTest(record.abTestRecommendation),
    executiveSummary: clampString(
      record.executiveSummary,
      'No Claude-generated executive summary was produced.',
      MAX_EXECUTIVE_SUMMARY_LENGTH
    ),
  };
}

function extractJsonObject(text: string): unknown {
  const withoutFence = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Claude response did not contain a JSON object.');
  }
  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

export function extractClaudeText(response: ClaudeMessagesResponse): string {
  return (response.content ?? [])
    .filter(
      (block): block is ClaudeMessageTextBlock =>
        block?.type === 'text' && typeof block.text === 'string'
    )
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export function buildClaudeDailyIntelligencePrompt(
  summary: DailyAnalyticsSummary
): ClaudeIntelligencePrompt {
  const system = [
    'You are the AI intelligence engine for Ellie, a shift schedule app for mining workers.',
    'Analyze aggregated analytics only. Never ask for raw PII. Never invent metrics that are not in the report.',
    'Mining workers use rotating and FIFO rosters; FIFO rest-block inactivity is not automatically churn.',
    'Return strict JSON only. No markdown. No commentary outside JSON.',
  ].join(' ');

  const user = JSON.stringify({
    task: 'Analyze this daily Ellie analytics report and produce founder/actionable intelligence.',
    requiredJsonShape: {
      emergencies: [
        {
          metric: 'string',
          currentValue: 'number|string|boolean|null',
          lastWeekValue: 'number|string|boolean|null',
          change: 'number|string|boolean|null',
          recommendedAction: 'string',
        },
      ],
      opportunities: [
        {
          observation: 'string',
          recommendation: 'string',
          estimatedImpact: 'string',
        },
      ],
      churnAlerts: {
        genuineCount: 0,
        fifoCaution: 'string',
      },
      engineeringAlerts: [
        {
          area: 'string',
          issue: 'string',
          severity: 'critical|high|medium|low',
        },
      ],
      abTestRecommendation: {
        hypothesis: 'string',
        control: 'string',
        treatment: 'string',
        primaryMetric: 'string',
      },
      executiveSummary: 'string, max 3 sentences',
    },
    report: summary.dailyIntelligenceReport,
    supportingAggregates: {
      countsByCategory: summary.countsByCategory,
      countsByEvent: summary.countsByEvent,
      onboarding: summary.onboarding,
      voice: summary.voice,
      revenue: summary.revenue,
      offline: summary.offline,
      quality: summary.quality,
    },
  });

  return { system, user };
}

export function parseClaudeDailyIntelligencePayload(text: string): ClaudeDailyIntelligencePayload {
  return normalizeAnalysisPayload(extractJsonObject(text));
}

export function buildFallbackDailyIntelligenceAnalysis(
  summary: DailyAnalyticsSummary,
  generatedAtMs: number,
  model: string,
  errorMessage?: string
): ClaudeDailyIntelligenceAnalysis {
  const opportunities: IntelligenceOpportunity[] = [];
  const engineeringAlerts: IntelligenceEngineeringAlert[] = [];

  if (summary.offline.unsupportedQuestions > 0) {
    opportunities.push({
      observation: `${summary.offline.unsupportedQuestions} offline questions were unsupported.`,
      recommendation:
        'Review top unsupported offline intents and prioritize local handlers for high-frequency safety/schedule questions.',
      estimatedImpact: 'Improves underground usability and reduces failed Hey Ellie sessions.',
    });
  }

  if (summary.voice.errorRate !== null && summary.voice.errorRate >= 0.2) {
    engineeringAlerts.push({
      area: 'voice_assistant',
      issue: `Voice error rate is ${Math.round(summary.voice.errorRate * 100)}%.`,
      severity: summary.voice.errorRate >= 0.4 ? 'critical' : 'high',
    });
  }

  if (summary.quality.apiErrorRate !== null && summary.quality.apiErrorRate > 0.05) {
    engineeringAlerts.push({
      area: 'backend_quality',
      issue: `Tracked failure/error event rate is ${Math.round(summary.quality.apiErrorRate * 100)}%.`,
      severity: summary.quality.apiErrorRate >= 0.15 ? 'critical' : 'high',
    });
  }

  return {
    id: summary.dayKey,
    dayKey: summary.dayKey,
    generatedAtMs,
    model,
    promptVersion: CLAUDE_INTELLIGENCE_PROMPT_VERSION,
    sourceSummaryId: summary.id,
    inputEventCount: summary.eventCount,
    status: 'fallback',
    emergencies: engineeringAlerts
      .filter((alert) => alert.severity === 'critical')
      .map((alert) => ({
        metric: alert.area,
        currentValue: alert.issue,
        recommendedAction: 'Treat as an incident until the dominant failure source is confirmed.',
      })),
    opportunities,
    churnAlerts: {
      genuineCount: 0,
      fifoCaution: 'Do not treat FIFO rest-block inactivity as churn without roster context.',
    },
    engineeringAlerts,
    abTestRecommendation: summary.onboarding.dropOffs[0]
      ? {
          hypothesis: `Reducing friction on ${summary.onboarding.dropOffs[0].step} will improve onboarding completion.`,
          control: 'Current onboarding step copy and layout.',
          treatment: 'One clearer, mining-specific explanation plus a lower-effort action path.',
          primaryMetric: 'onboarding_step_completed',
        }
      : null,
    executiveSummary:
      'Claude analysis was unavailable, so Ellie produced a deterministic fallback from the daily analytics summary.',
    errorMessage,
    schemaVersion: 1,
  };
}

export async function requestClaudeDailyIntelligenceAnalysis(
  summary: DailyAnalyticsSummary,
  apiKey: string,
  model: string,
  fetchImpl: AnthropicFetch = fetch as unknown as AnthropicFetch
): Promise<ClaudeDailyIntelligenceAnalysis> {
  const prompt = buildClaudeDailyIntelligencePrompt(summary);
  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Claude API returned ${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`
    );
  }

  const parsed = JSON.parse(responseText) as ClaudeMessagesResponse;
  const text = extractClaudeText(parsed);
  if (!text) {
    throw new Error('Claude response did not include text content.');
  }

  return {
    ...parseClaudeDailyIntelligencePayload(text),
    id: summary.dayKey,
    dayKey: summary.dayKey,
    generatedAtMs: Date.now(),
    model: parsed.model ?? model,
    promptVersion: CLAUDE_INTELLIGENCE_PROMPT_VERSION,
    sourceSummaryId: summary.id,
    inputEventCount: summary.eventCount,
    status: 'completed',
    rawResponseText: text.slice(0, MAX_RAW_RESPONSE_LENGTH),
    responseId: parsed.id,
    stopReason: parsed.stop_reason ?? null,
    usage: parsed.usage,
    schemaVersion: 1,
  };
}

function severityForDecision(type: string): 'critical' | 'high' | 'medium' | 'low' {
  return type === 'emergency' ? 'critical' : type === 'engineering' ? 'high' : 'medium';
}

function candidateId(dayKey: string, type: string, index: number): string {
  return `${dayKey}_claude_${type}_${index}`;
}

export function buildClaudeDecisionQueueCandidates(
  analysis: ClaudeDailyIntelligenceAnalysis,
  createdAtMs: number
): AiDecisionCandidate[] {
  const candidates: AiDecisionCandidate[] = [];

  analysis.emergencies.forEach((emergency, index) => {
    candidates.push({
      id: candidateId(analysis.dayKey, 'emergency', index),
      dayKey: analysis.dayKey,
      type: 'engineering_alert',
      severity: severityForDecision('emergency'),
      title: `Claude emergency: ${emergency.metric}`,
      observation: `Current value: ${String(emergency.currentValue)}. Change: ${String(emergency.change ?? 'unknown')}.`,
      recommendedAction: emergency.recommendedAction,
      evidence: {
        source: 'claude_daily_analysis',
        model: analysis.model,
        metric: emergency.metric,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  });

  analysis.engineeringAlerts.forEach((alert, index) => {
    candidates.push({
      id: candidateId(analysis.dayKey, 'engineering', index),
      dayKey: analysis.dayKey,
      type: 'engineering_alert',
      severity: alert.severity,
      title: `Claude engineering alert: ${alert.area}`,
      observation: alert.issue,
      recommendedAction: 'Review the alert and either assign an owner or dismiss it with a note.',
      evidence: {
        source: 'claude_daily_analysis',
        model: analysis.model,
        area: alert.area,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  });

  analysis.opportunities.slice(0, 3).forEach((opportunity, index) => {
    candidates.push({
      id: candidateId(analysis.dayKey, 'opportunity', index),
      dayKey: analysis.dayKey,
      type: 'onboarding_optimization',
      severity: severityForDecision('opportunity'),
      title: `Claude opportunity: ${opportunity.observation.slice(0, 80)}`,
      observation: opportunity.observation,
      recommendedAction: opportunity.recommendation,
      evidence: {
        source: 'claude_daily_analysis',
        model: analysis.model,
        estimatedImpact: opportunity.estimatedImpact,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  });

  if (analysis.abTestRecommendation) {
    candidates.push({
      id: candidateId(analysis.dayKey, 'ab_test', 0),
      dayKey: analysis.dayKey,
      type: 'onboarding_optimization',
      severity: 'medium',
      title: 'Claude A/B test recommendation',
      observation: analysis.abTestRecommendation.hypothesis,
      recommendedAction: `${analysis.abTestRecommendation.treatment} Primary metric: ${analysis.abTestRecommendation.primaryMetric}.`,
      evidence: {
        source: 'claude_daily_analysis',
        model: analysis.model,
        control: analysis.abTestRecommendation.control,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  return candidates;
}
