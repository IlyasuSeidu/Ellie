import { createHash } from 'node:crypto';

export const ANALYTICS_EVENTS_COLLECTION = 'analyticsEvents';
export const ANALYTICS_REALTIME_DAILY_COLLECTION = 'analyticsRealtimeDaily';
export const ANALYTICS_DAILY_SUMMARIES_COLLECTION = 'analyticsDailySummaries';
export const AI_DECISION_QUEUE_COLLECTION = 'aiDecisionQueue';

const EVENT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_PARAM_KEYS = 60;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 25;
const MAX_CLIENT_STRING_LENGTH = 120;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const SENSITIVE_KEYS = new Set([
  'access_token',
  'auth_token',
  'company',
  'display_name',
  'email',
  'email_address',
  'first_name',
  'full_name',
  'id_token',
  'last_name',
  'message',
  'mining_site',
  'name',
  'password',
  'phone',
  'phone_number',
  'prompt',
  'query',
  'query_text',
  'raw_query',
  'refresh_token',
  'response_text',
  'site_name',
  'token',
  'transcript',
  'transcription',
]);

export type AnalyticsCategory =
  | 'ai'
  | 'error'
  | 'feature'
  | 'navigation'
  | 'notification'
  | 'offline'
  | 'onboarding'
  | 'performance'
  | 'reminder'
  | 'retention'
  | 'revenue'
  | 'session'
  | 'shift'
  | 'voice'
  | 'other';

export type AnalyticsPrimitive = string | number | boolean | null;
export type AnalyticsParamValue = AnalyticsPrimitive | AnalyticsPrimitive[];
export type AnalyticsParams = Record<string, AnalyticsParamValue>;

export interface AnalyticsClientContext {
  appVersion?: string;
  buildNumber?: string;
  country?: string;
  installId?: string;
  language?: string;
  localDateKey?: string;
  localTime?: string;
  osVersion?: string;
  platform?: string;
  sessionId?: string;
  timeZone?: string;
  timezoneOffsetMinutes?: number;
}

export interface AnalyticsTrackEventRequest {
  name?: unknown;
  eventName?: unknown;
  params?: unknown;
  properties?: unknown;
  client?: unknown;
  clientContext?: unknown;
  occurredAtMs?: unknown;
  timestamp?: unknown;
}

export interface AnalyticsIdentity {
  userId: string | null;
  installId: string | null;
}

export interface AnalyticsEventDocument {
  id: string;
  eventName: string;
  category: AnalyticsCategory;
  params: AnalyticsParams;
  userId: string | null;
  installIdHash: string | null;
  sessionIdHash: string | null;
  hasAuthenticatedUser: boolean;
  client: Required<AnalyticsClientContext>;
  occurredAtMs: number;
  receivedAtMs: number;
  dayKey: string;
  hourKey: string;
  localDateKey: string;
  schemaVersion: 1;
}

export interface DailyAnalyticsSummary {
  id: string;
  dayKey: string;
  generatedAtMs: number;
  schemaVersion: 1;
  eventCount: number;
  uniqueActorCount: number;
  countsByCategory: Record<string, number>;
  countsByEvent: Record<string, number>;
  countsByPlatform: Record<string, number>;
  onboarding: {
    started: number;
    completed: number;
    conversionRate: number | null;
    stepViews: Record<string, number>;
    stepCompletions: Record<string, number>;
    dropOffs: { step: string; views: number; completions: number; dropOffRate: number }[];
  };
  voice: {
    sessionsStarted: number;
    succeeded: number;
    failed: number;
    successRate: number | null;
    errorRate: number | null;
    avgLatencyMs: number | null;
    topIntents: { intent: string; count: number }[];
    toolExecutions: Record<
      string,
      { attempts: number; succeeded: number; avgLatencyMs: number | null }
    >;
  };
  revenue: {
    paywallViews: number;
    ctaClicks: number;
    subscribeTaps: number;
    purchases: number;
    trials: number;
    ctaToPurchaseRate: number | null;
  };
  offline: {
    handledAnswers: number;
    unsupportedQuestions: number;
    topUnsupportedIntents: { intent: string; count: number }[];
  };
  quality: {
    errorEvents: number;
    apiErrorRate: number | null;
    avgColdStartMs: number | null;
  };
  dailyIntelligenceReport: DailyIntelligenceReport;
}

export interface DailyIntelligenceReport {
  reportDate: string;
  dau: number;
  eventCount: number;
  onboardingConversionRate: number | null;
  onboardingDropOffs: { screen: string; count: number; dropOffRate: number }[];
  voiceSessionsYesterday: number;
  voiceSuccessRate: number | null;
  topVoiceQueries: { intent: string; count: number }[];
  voiceErrorRate: number | null;
  avgVoiceLatencyMs: number | null;
  apiErrorRate: number | null;
  paywallViews: number;
  paywallCtaToPurchaseRate: number | null;
  offlineUnsupportedQuestions: number;
  topOfflineUnsupportedIntents: { intent: string; count: number }[];
  platformBreakdown: Record<string, number>;
}

export type AiDecisionType =
  | 'engineering_alert'
  | 'onboarding_optimization'
  | 'offline_gap'
  | 'revenue_optimization'
  | 'voice_quality';

export type AiDecisionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AiDecisionCandidate {
  id: string;
  dayKey: string;
  type: AiDecisionType;
  severity: AiDecisionSeverity;
  title: string;
  observation: string;
  recommendedAction: string;
  evidence: Record<string, AnalyticsParamValue>;
  status: 'open';
  createdAtMs: number;
  schemaVersion: 1;
}

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyticsValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeString(value: unknown, maxLength = MAX_CLIENT_STRING_LENGTH): string {
  if (typeof value !== 'string') {
    return 'unknown';
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? truncate(trimmed, maxLength) : 'unknown';
}

function hashStable(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

function normalizeNullableHash(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? hashStable(normalized) : null;
}

function getDayKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function getHourKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 13);
}

function normalizeOccurredAtMs(value: unknown, receivedAtMs: number): number {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return receivedAtMs;
  }
  if (numeric > receivedAtMs + 5 * 60 * 1000) {
    return receivedAtMs;
  }
  if (numeric < receivedAtMs - ONE_YEAR_MS) {
    return receivedAtMs;
  }
  return Math.round(numeric);
}

function normalizeEventName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AnalyticsValidationError('Event name is required.');
  }
  const normalized = value.trim();
  if (!EVENT_NAME_PATTERN.test(normalized)) {
    throw new AnalyticsValidationError(
      'Event name must be 1-64 alphanumeric/underscore characters.'
    );
  }
  return normalized;
}

function sanitizeParamKey(key: string): string | null {
  const trimmed = key.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

function sanitizePrimitive(value: unknown): AnalyticsPrimitive | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return truncate(value.trim(), MAX_STRING_LENGTH);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function sanitizeArray(value: unknown[]): AnalyticsPrimitive[] | undefined {
  const sanitized = value
    .slice(0, MAX_ARRAY_LENGTH)
    .map((entry) => sanitizePrimitive(entry))
    .filter((entry): entry is AnalyticsPrimitive => entry !== undefined);
  return sanitized.length > 0 ? sanitized : undefined;
}

export function sanitizeAnalyticsParams(input: unknown): AnalyticsParams {
  if (!isRecord(input)) {
    return {};
  }

  const sanitized: AnalyticsParams = {};
  for (const [rawKey, rawValue] of Object.entries(input).slice(0, MAX_PARAM_KEYS)) {
    const key = sanitizeParamKey(rawKey);
    if (!key || rawValue === undefined) {
      continue;
    }

    if (isSensitiveKey(key)) {
      if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        sanitized[`${key}_hash`] = hashStable(rawValue.trim());
        sanitized[`${key}_length`] = rawValue.trim().length;
      }
      sanitized[`${key}_redacted`] = true;
      continue;
    }

    const value = Array.isArray(rawValue) ? sanitizeArray(rawValue) : sanitizePrimitive(rawValue);
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function classifyAnalyticsEvent(eventName: string): AnalyticsCategory {
  const normalized = eventName.toLowerCase();
  if (normalized.startsWith('ai') || normalized.includes('_ai_')) return 'ai';
  if (normalized.startsWith('error') || normalized.includes('_error')) return 'error';
  if (normalized.startsWith('feature')) return 'feature';
  if (normalized.startsWith('screen')) return 'navigation';
  if (normalized.startsWith('notification')) return 'notification';
  if (normalized.startsWith('offline')) return 'offline';
  if (normalized.startsWith('onboarding') || normalized.startsWith('aha_moment'))
    return 'onboarding';
  if (normalized.startsWith('performance') || normalized.includes('latency')) return 'performance';
  if (normalized.startsWith('reminder') || normalized.startsWith('smart_reminder'))
    return 'reminder';
  if (normalized.startsWith('day_') || normalized.startsWith('retention')) return 'retention';
  if (
    normalized.startsWith('paywall') ||
    normalized.startsWith('purchase') ||
    normalized.startsWith('trial') ||
    normalized.startsWith('subscription') ||
    normalized.startsWith('revenue')
  ) {
    return 'revenue';
  }
  if (normalized.startsWith('session')) return 'session';
  if (normalized.startsWith('shift')) return 'shift';
  if (normalized.startsWith('voice') || normalized.startsWith('wake_word')) return 'voice';
  return 'other';
}

function normalizeClientContext(input: unknown): Required<AnalyticsClientContext> {
  const context = isRecord(input) ? input : {};
  const timezoneOffsetRaw = context.timezoneOffsetMinutes;
  const timezoneOffsetMinutes =
    typeof timezoneOffsetRaw === 'number' && Number.isFinite(timezoneOffsetRaw)
      ? Math.round(timezoneOffsetRaw)
      : 0;

  return {
    appVersion: normalizeString(context.appVersion),
    buildNumber: normalizeString(context.buildNumber),
    country: normalizeString(context.country, 12),
    installId: normalizeString(context.installId, 160),
    language: normalizeString(context.language, 40),
    localDateKey: normalizeString(context.localDateKey, 20),
    localTime: normalizeString(context.localTime, 20),
    osVersion: normalizeString(context.osVersion),
    platform: normalizeString(context.platform, 30),
    sessionId: normalizeString(context.sessionId, 160),
    timeZone: normalizeString(context.timeZone),
    timezoneOffsetMinutes,
  };
}

export function buildAnalyticsEventDocument(
  id: string,
  request: AnalyticsTrackEventRequest,
  identity: AnalyticsIdentity,
  receivedAtMs: number
): AnalyticsEventDocument {
  const eventName = normalizeEventName(request.eventName ?? request.name);
  const client = normalizeClientContext(request.clientContext ?? request.client);
  const occurredAtMs = normalizeOccurredAtMs(
    request.occurredAtMs ?? request.timestamp,
    receivedAtMs
  );
  const installId =
    identity.installId ?? (client.installId !== 'unknown' ? client.installId : null);
  const sessionId = client.sessionId !== 'unknown' ? client.sessionId : null;
  const params = sanitizeAnalyticsParams(request.params ?? request.properties);
  const dayKey = getDayKey(occurredAtMs);

  return {
    id,
    eventName,
    category: classifyAnalyticsEvent(eventName),
    params,
    userId: identity.userId,
    installIdHash: normalizeNullableHash(installId),
    sessionIdHash: normalizeNullableHash(sessionId),
    hasAuthenticatedUser: Boolean(identity.userId),
    client,
    occurredAtMs,
    receivedAtMs,
    dayKey,
    hourKey: getHourKey(occurredAtMs),
    localDateKey: client.localDateKey !== 'unknown' ? client.localDateKey : dayKey,
    schemaVersion: 1,
  };
}

function increment(map: Record<string, number>, key: string, amount = 1): void {
  map[key] = (map[key] ?? 0) + amount;
}

function numberParam(params: AnalyticsParams, keys: string[]): number | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function stringParam(params: AnalyticsParams, keys: string[]): string | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function booleanParam(params: AnalyticsParams, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function safeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }
  return Number((numerator / denominator).toFixed(4));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function topEntries(
  map: Record<string, number>,
  limit: number
): { intent: string; count: number }[] {
  return Object.entries(map)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, limit)
    .map(([intent, count]) => ({ intent, count }));
}

function createReport(
  summary: Omit<DailyAnalyticsSummary, 'dailyIntelligenceReport'>
): DailyIntelligenceReport {
  return {
    reportDate: summary.dayKey,
    dau: summary.uniqueActorCount,
    eventCount: summary.eventCount,
    onboardingConversionRate: summary.onboarding.conversionRate,
    onboardingDropOffs: summary.onboarding.dropOffs.slice(0, 10).map((dropOff) => ({
      screen: dropOff.step,
      count: Math.max(0, dropOff.views - dropOff.completions),
      dropOffRate: dropOff.dropOffRate,
    })),
    voiceSessionsYesterday: summary.voice.sessionsStarted,
    voiceSuccessRate: summary.voice.successRate,
    topVoiceQueries: summary.voice.topIntents,
    voiceErrorRate: summary.voice.errorRate,
    avgVoiceLatencyMs: summary.voice.avgLatencyMs,
    apiErrorRate: summary.quality.apiErrorRate,
    paywallViews: summary.revenue.paywallViews,
    paywallCtaToPurchaseRate: summary.revenue.ctaToPurchaseRate,
    offlineUnsupportedQuestions: summary.offline.unsupportedQuestions,
    topOfflineUnsupportedIntents: summary.offline.topUnsupportedIntents,
    platformBreakdown: summary.countsByPlatform,
  };
}

export function buildDailyAnalyticsSummary(
  dayKey: string,
  events: AnalyticsEventDocument[],
  generatedAtMs: number
): DailyAnalyticsSummary {
  const countsByCategory: Record<string, number> = {};
  const countsByEvent: Record<string, number> = {};
  const countsByPlatform: Record<string, number> = {};
  const actors = new Set<string>();
  const stepViews: Record<string, number> = {};
  const stepCompletions: Record<string, number> = {};
  const voiceIntents: Record<string, number> = {};
  const unsupportedIntents: Record<string, number> = {};
  const voiceLatencies: number[] = [];
  const coldStartLatencies: number[] = [];
  const toolExecutionStats: Record<
    string,
    { attempts: number; succeeded: number; latencies: number[] }
  > = {};

  let onboardingStarted = 0;
  let onboardingCompleted = 0;
  let voiceSessionsStarted = 0;
  let voiceSucceeded = 0;
  let voiceFailed = 0;
  let paywallViews = 0;
  let ctaClicks = 0;
  let subscribeTaps = 0;
  let purchases = 0;
  let trials = 0;
  let offlineHandled = 0;
  let offlineUnsupported = 0;
  let errorEvents = 0;

  for (const event of events) {
    increment(countsByCategory, event.category);
    increment(countsByEvent, event.eventName);
    increment(countsByPlatform, event.client.platform || 'unknown');

    const actor = event.userId ?? event.installIdHash;
    if (actor) {
      actors.add(actor);
    }

    const name = event.eventName.toLowerCase();
    if (name === 'onboarding_started') onboardingStarted += 1;
    if (name === 'onboarding_completed') onboardingCompleted += 1;
    if (name === 'onboarding_step_viewed') {
      increment(stepViews, stringParam(event.params, ['step_id', 'step']) ?? 'unknown');
    }
    if (name === 'onboarding_step_completed') {
      increment(stepCompletions, stringParam(event.params, ['step_id', 'step']) ?? 'unknown');
    }

    if (name === 'voice_session_started') voiceSessionsStarted += 1;
    if (name === 'voice_query_succeeded' || name === 'voice_offline_answer_handled')
      voiceSucceeded += 1;
    if (name === 'voice_query_failed' || name === 'voice_offline_answer_unhandled')
      voiceFailed += 1;
    const voiceIntent = stringParam(event.params, [
      'queryIntentDetected',
      'query_intent_detected',
      'intent',
      'queryCategory',
      'query_category',
    ]);
    if (voiceIntent && (event.category === 'voice' || event.category === 'offline')) {
      increment(voiceIntents, voiceIntent);
    }
    const voiceLatency = numberParam(event.params, [
      'responseLatencyMs',
      'response_latency_ms',
      'requestLatencyMs',
      'request_latency_ms',
      'latency_ms',
    ]);
    if (voiceLatency !== null && voiceLatency >= 0 && event.category === 'voice') {
      voiceLatencies.push(voiceLatency);
    }

    if (name === 'voice_tool_executed') {
      const toolName = stringParam(event.params, ['toolName', 'tool_name']) ?? 'unknown';
      const succeeded =
        booleanParam(event.params, ['executionSucceeded', 'execution_succeeded']) ?? false;
      const latency = numberParam(event.params, ['executionTimeMs', 'execution_time_ms']);
      const current = toolExecutionStats[toolName] ?? { attempts: 0, succeeded: 0, latencies: [] };
      current.attempts += 1;
      if (succeeded) current.succeeded += 1;
      if (latency !== null && latency >= 0) current.latencies.push(latency);
      toolExecutionStats[toolName] = current;
    }

    if (name === 'paywall_viewed') paywallViews += 1;
    if (name === 'paywall_cta_clicked') ctaClicks += 1;
    if (name === 'paywall_subscribe_tapped') subscribeTaps += 1;
    if (name === 'purchase_completed') purchases += 1;
    if (name === 'trial_started') trials += 1;

    if (name === 'voice_offline_answer_handled' || name === 'offline_answer_handled') {
      offlineHandled += 1;
    }
    if (name === 'voice_offline_answer_unhandled' || name === 'offline_question_unsupported') {
      offlineUnsupported += 1;
      increment(
        unsupportedIntents,
        voiceIntent ?? stringParam(event.params, ['reason']) ?? 'unknown'
      );
    }

    if (event.category === 'error' || name.includes('failed')) errorEvents += 1;
    const coldStart = numberParam(event.params, ['coldStartMs', 'cold_start_ms']);
    if (coldStart !== null && coldStart >= 0) {
      coldStartLatencies.push(coldStart);
    }
  }

  const dropOffs = Object.entries(stepViews)
    .map(([step, views]) => {
      const completions = stepCompletions[step] ?? 0;
      return {
        step,
        views,
        completions,
        dropOffRate: safeRate(Math.max(0, views - completions), views) ?? 0,
      };
    })
    .sort((first, second) => second.dropOffRate - first.dropOffRate || second.views - first.views);

  const toolExecutions = Object.fromEntries(
    Object.entries(toolExecutionStats).map(([toolName, stats]) => [
      toolName,
      {
        attempts: stats.attempts,
        succeeded: stats.succeeded,
        avgLatencyMs: average(stats.latencies),
      },
    ])
  );

  const summaryWithoutReport: Omit<DailyAnalyticsSummary, 'dailyIntelligenceReport'> = {
    id: dayKey,
    dayKey,
    generatedAtMs,
    schemaVersion: 1,
    eventCount: events.length,
    uniqueActorCount: actors.size,
    countsByCategory,
    countsByEvent,
    countsByPlatform,
    onboarding: {
      started: onboardingStarted,
      completed: onboardingCompleted,
      conversionRate: safeRate(onboardingCompleted, onboardingStarted),
      stepViews,
      stepCompletions,
      dropOffs,
    },
    voice: {
      sessionsStarted: voiceSessionsStarted,
      succeeded: voiceSucceeded,
      failed: voiceFailed,
      successRate: safeRate(voiceSucceeded, voiceSucceeded + voiceFailed),
      errorRate: safeRate(voiceFailed, voiceSucceeded + voiceFailed),
      avgLatencyMs: average(voiceLatencies),
      topIntents: topEntries(voiceIntents, 20),
      toolExecutions,
    },
    revenue: {
      paywallViews,
      ctaClicks,
      subscribeTaps,
      purchases,
      trials,
      ctaToPurchaseRate: safeRate(purchases, ctaClicks),
    },
    offline: {
      handledAnswers: offlineHandled,
      unsupportedQuestions: offlineUnsupported,
      topUnsupportedIntents: topEntries(unsupportedIntents, 20),
    },
    quality: {
      errorEvents,
      apiErrorRate: safeRate(errorEvents, events.length),
      avgColdStartMs: average(coldStartLatencies),
    },
  };

  return {
    ...summaryWithoutReport,
    dailyIntelligenceReport: createReport(summaryWithoutReport),
  };
}

function decisionId(dayKey: string, type: AiDecisionType, key: string): string {
  return `${dayKey}_${type}_${hashStable(key).slice(0, 12)}`;
}

export function buildAiDecisionCandidates(
  summary: DailyAnalyticsSummary,
  createdAtMs: number
): AiDecisionCandidate[] {
  const decisions: AiDecisionCandidate[] = [];
  const worstDropOff = summary.onboarding.dropOffs[0];

  if (worstDropOff && worstDropOff.views >= 20 && worstDropOff.dropOffRate >= 0.35) {
    decisions.push({
      id: decisionId(summary.dayKey, 'onboarding_optimization', worstDropOff.step),
      dayKey: summary.dayKey,
      type: 'onboarding_optimization',
      severity: worstDropOff.dropOffRate >= 0.5 ? 'high' : 'medium',
      title: `Onboarding drop-off is high at ${worstDropOff.step}`,
      observation: `${Math.round(worstDropOff.dropOffRate * 100)}% of users who viewed ${worstDropOff.step} did not complete it.`,
      recommendedAction:
        'Ask Claude to propose one focused copy/layout test for this step and ship it behind an experiment flag.',
      evidence: {
        step: worstDropOff.step,
        views: worstDropOff.views,
        completions: worstDropOff.completions,
        dropOffRate: worstDropOff.dropOffRate,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  if (
    summary.voice.errorRate !== null &&
    summary.voice.succeeded + summary.voice.failed >= 10 &&
    summary.voice.errorRate >= 0.2
  ) {
    decisions.push({
      id: decisionId(summary.dayKey, 'voice_quality', 'voice_error_rate'),
      dayKey: summary.dayKey,
      type: 'voice_quality',
      severity: summary.voice.errorRate >= 0.4 ? 'critical' : 'high',
      title: 'Voice assistant failure rate is above production tolerance',
      observation: `${Math.round(summary.voice.errorRate * 100)}% of tracked voice queries failed.`,
      recommendedAction:
        'Inspect top failing stages and prioritize speech/API/tool fallback fixes before adding new voice features.',
      evidence: {
        failed: summary.voice.failed,
        succeeded: summary.voice.succeeded,
        errorRate: summary.voice.errorRate,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  if (summary.offline.unsupportedQuestions >= 5) {
    const holidayOrDateIntent = summary.offline.topUnsupportedIntents.find((entry) =>
      /holiday|date|calendar|public_holiday/i.test(entry.intent)
    );
    decisions.push({
      id: decisionId(summary.dayKey, 'offline_gap', holidayOrDateIntent?.intent ?? 'unsupported'),
      dayKey: summary.dayKey,
      type: 'offline_gap',
      severity: holidayOrDateIntent ? 'high' : 'medium',
      title: holidayOrDateIntent
        ? 'Holiday/date offline intent is being requested'
        : 'Unsupported offline questions are accumulating',
      observation: `${summary.offline.unsupportedQuestions} offline questions could not be answered locally.`,
      recommendedAction: holidayOrDateIntent
        ? 'Prioritize holiday/date intent support next because users are asking for it while offline.'
        : 'Review unsupported intents and add the highest-volume local handler if it can be answered without network access.',
      evidence: {
        unsupportedQuestions: summary.offline.unsupportedQuestions,
        topIntent:
          holidayOrDateIntent?.intent ??
          summary.offline.topUnsupportedIntents[0]?.intent ??
          'unknown',
        topIntentCount:
          holidayOrDateIntent?.count ?? summary.offline.topUnsupportedIntents[0]?.count ?? 0,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  if (
    summary.revenue.ctaToPurchaseRate !== null &&
    summary.revenue.ctaClicks >= 20 &&
    summary.revenue.ctaToPurchaseRate < 0.05
  ) {
    decisions.push({
      id: decisionId(summary.dayKey, 'revenue_optimization', 'paywall_cta_purchase'),
      dayKey: summary.dayKey,
      type: 'revenue_optimization',
      severity: 'medium',
      title: 'Paywall CTA is not converting into purchases',
      observation: `${summary.revenue.ctaClicks} CTA clicks produced ${summary.revenue.purchases} purchases.`,
      recommendedAction:
        'Compare RevenueCat purchase errors, entitlement activation latency, and paywall copy before changing pricing.',
      evidence: {
        ctaClicks: summary.revenue.ctaClicks,
        purchases: summary.revenue.purchases,
        ctaToPurchaseRate: summary.revenue.ctaToPurchaseRate,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  if (
    summary.quality.apiErrorRate !== null &&
    summary.eventCount >= 50 &&
    summary.quality.apiErrorRate > 0.05
  ) {
    decisions.push({
      id: decisionId(summary.dayKey, 'engineering_alert', 'api_error_rate'),
      dayKey: summary.dayKey,
      type: 'engineering_alert',
      severity: summary.quality.apiErrorRate >= 0.15 ? 'critical' : 'high',
      title: 'Tracked failure events are elevated',
      observation: `${Math.round(summary.quality.apiErrorRate * 100)}% of events were failures/errors.`,
      recommendedAction:
        'Treat this as an engineering incident until the dominant failing event is identified and fixed.',
      evidence: {
        eventCount: summary.eventCount,
        errorEvents: summary.quality.errorEvents,
        apiErrorRate: summary.quality.apiErrorRate,
      },
      status: 'open',
      createdAtMs,
      schemaVersion: 1,
    });
  }

  return decisions;
}

export function getDateKeyDaysAgo(daysAgo: number, nowMs = Date.now()): string {
  const date = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function getDayRange(dayKey: string): { startMs: number; endMs: number } {
  const startMs = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(startMs)) {
    throw new AnalyticsValidationError('Invalid day key.');
  }
  return {
    startMs,
    endMs: startMs + 24 * 60 * 60 * 1000,
  };
}
