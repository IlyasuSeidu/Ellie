/**
 * Ellie Brain — Firebase Cloud Function Entry Point
 *
 * HTTPS callable function that processes voice assistant queries.
 * Validates requests, calls OpenAI API with tool use, returns responses.
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import {
  AI_DECISION_QUEUE_COLLECTION,
  ANALYTICS_DAILY_SUMMARIES_COLLECTION,
  ANALYTICS_EVENTS_COLLECTION,
  ANALYTICS_REALTIME_DAILY_COLLECTION,
  AnalyticsValidationError,
  buildAiDecisionCandidates,
  buildAnalyticsEventDocument,
  buildDailyAnalyticsSummary,
  getDateKeyDaysAgo,
  getDayRange,
  type AiDecisionCandidate,
  type AnalyticsEventDocument,
  type AnalyticsTrackEventRequest,
  type DailyAnalyticsSummary,
} from './analytics-ai';
import {
  AI_DAILY_ANALYSES_COLLECTION,
  DEFAULT_CLAUDE_INTELLIGENCE_MODEL,
  buildClaudeDecisionQueueCandidates,
  buildFallbackDailyIntelligenceAnalysis,
  requestClaudeDailyIntelligenceAnalysis,
  type ClaudeDailyIntelligenceAnalysis,
} from './claude-intelligence';
import { buildDailyAudienceRun, ellieAudienceAdapter } from './audience-os';
import {
  createAudienceOpsError,
  type AudienceOpsSuccessEnvelope,
  validateAudienceRunInput,
} from './audience-os/http';
import { EllieBrainProcessingError, processQuery } from './ellie-brain';
import { EllieBrainSuccessEnvelope } from './types';
import { createErrorEnvelope, createRequestId, validateRequestBody } from './http-utils';

const openaiApiKey = defineSecret('OPENAI_API_KEY');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
const analyticsAdminUids = defineString('ANALYTICS_ADMIN_UIDS', { default: '' });
const claudeIntelligenceModel = defineString('CLAUDE_INTELLIGENCE_MODEL', {
  default: DEFAULT_CLAUDE_INTELLIGENCE_MODEL,
});
const PROVIDER_TIMEOUT_MS = 25000;
const MAX_DAILY_ANALYTICS_EVENTS = 50000;
const DEFAULT_DASHBOARD_SUMMARY_LIMIT = 14;

function logStructured(level: 'info' | 'error', message: string, details: Record<string, unknown>) {
  const payload = JSON.stringify({ message, ...details });
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(payload);
}

if (getApps().length === 0) {
  initializeApp();
}

function getAdminFirestore() {
  return getFirestore();
}

function getAnalyticsAdminUids(): Set<string> {
  return new Set(
    analyticsAdminUids
      .value()
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean)
  );
}

function assertAnalyticsAdmin(uid: string | undefined): string {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in to access analytics intelligence.');
  }

  const adminUids = getAnalyticsAdminUids();
  if (!adminUids.has(uid)) {
    throw new HttpsError('permission-denied', 'Analytics intelligence is restricted.');
  }

  return uid;
}

function normalizeInstallId(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const direct = record.installId;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }
  const client = record.clientContext ?? record.client;
  if (client && typeof client === 'object' && !Array.isArray(client)) {
    const fromClient = (client as Record<string, unknown>).installId;
    if (typeof fromClient === 'string' && fromClient.trim().length > 0) {
      return fromClient.trim();
    }
  }
  return null;
}

function requireTrackEventRequest(data: unknown): AnalyticsTrackEventRequest {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'Analytics event payload must be an object.');
  }
  return data as AnalyticsTrackEventRequest;
}

function buildRealtimeUpdates(event: AnalyticsEventDocument): Record<string, unknown> {
  const platform = event.client.platform || 'unknown';
  return {
    dayKey: event.dayKey,
    updatedAtMs: event.receivedAtMs,
    totalEvents: FieldValue.increment(1),
    [`categories.${event.category}`]: FieldValue.increment(1),
    [`events.${event.eventName}`]: FieldValue.increment(1),
    [`platforms.${platform}`]: FieldValue.increment(1),
  };
}

async function writeAiDecisionCandidates(
  candidates: AiDecisionCandidate[],
  summary: DailyAnalyticsSummary
): Promise<number> {
  if (candidates.length === 0) {
    return 0;
  }

  const db = getAdminFirestore();
  const batch = db.batch();
  for (const candidate of candidates) {
    batch.set(db.collection(AI_DECISION_QUEUE_COLLECTION).doc(candidate.id), {
      ...candidate,
      summaryId: summary.id,
    });
  }
  await batch.commit();
  return candidates.length;
}

function getClaudeIntelligenceModel(): string {
  return claudeIntelligenceModel.value().trim() || DEFAULT_CLAUDE_INTELLIGENCE_MODEL;
}

async function writeDailyIntelligenceAnalysis(
  analysis: ClaudeDailyIntelligenceAnalysis
): Promise<void> {
  await getAdminFirestore().collection(AI_DAILY_ANALYSES_COLLECTION).doc(analysis.id).set(analysis);
}

async function generateDailyIntelligenceForSummary(
  summary: DailyAnalyticsSummary,
  apiKey: string
): Promise<{ analysis: ClaudeDailyIntelligenceAnalysis; decisionCount: number }> {
  const model = getClaudeIntelligenceModel();
  const normalizedApiKey = apiKey.trim();
  let analysis: ClaudeDailyIntelligenceAnalysis;

  if (normalizedApiKey.length === 0) {
    analysis = buildFallbackDailyIntelligenceAnalysis(
      summary,
      Date.now(),
      model,
      'ANTHROPIC_API_KEY secret is not configured.'
    );
  } else {
    try {
      analysis = await requestClaudeDailyIntelligenceAnalysis(summary, normalizedApiKey, model);
    } catch (error) {
      analysis = buildFallbackDailyIntelligenceAnalysis(
        summary,
        Date.now(),
        model,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  await writeDailyIntelligenceAnalysis(analysis);
  const decisionCount = await writeAiDecisionCandidates(
    buildClaudeDecisionQueueCandidates(analysis, analysis.generatedAtMs),
    summary
  );

  return { analysis, decisionCount };
}

async function aggregateAnalyticsDay(dayKey: string): Promise<{
  summary: DailyAnalyticsSummary;
  decisionCount: number;
  analysis?: ClaudeDailyIntelligenceAnalysis;
  claudeDecisionCount?: number;
}> {
  const db = getAdminFirestore();
  const { startMs, endMs } = getDayRange(dayKey);
  const snapshot = await db
    .collection(ANALYTICS_EVENTS_COLLECTION)
    .where('occurredAtMs', '>=', startMs)
    .where('occurredAtMs', '<', endMs)
    .limit(MAX_DAILY_ANALYTICS_EVENTS)
    .get();

  const events = snapshot.docs.map((doc) => doc.data() as AnalyticsEventDocument);
  const generatedAtMs = Date.now();
  const summary = buildDailyAnalyticsSummary(dayKey, events, generatedAtMs);
  await db.collection(ANALYTICS_DAILY_SUMMARIES_COLLECTION).doc(summary.id).set(summary);
  const decisionCount = await writeAiDecisionCandidates(
    buildAiDecisionCandidates(summary, generatedAtMs),
    summary
  );

  return { summary, decisionCount };
}

/**
 * Callable analytics ingestion endpoint.
 *
 * Clients send sanitized product events here in parallel with Firebase Analytics.
 * The function accepts signed-in users and pre-auth installs; identifiers are
 * hashed before storage so dashboards can count actors without keeping PII.
 */
export const trackAnalyticsEvent = onCall(
  {
    cors: true,
    maxInstances: 30,
    timeoutSeconds: 20,
    memory: '256MiB',
  },
  async (request) => {
    const data = requireTrackEventRequest(request.data);
    const userId = request.auth?.uid ?? null;
    const installId = normalizeInstallId(request.data);

    if (!userId && !installId) {
      throw new HttpsError(
        'invalid-argument',
        'Analytics events require an authenticated user or install identifier.'
      );
    }

    const db = getAdminFirestore();
    const eventRef = db.collection(ANALYTICS_EVENTS_COLLECTION).doc();
    const receivedAtMs = Date.now();

    try {
      const event = buildAnalyticsEventDocument(
        eventRef.id,
        data,
        { userId, installId },
        receivedAtMs
      );
      await Promise.all([
        eventRef.set(event),
        db
          .collection(ANALYTICS_REALTIME_DAILY_COLLECTION)
          .doc(event.dayKey)
          .set(buildRealtimeUpdates(event), { merge: true }),
      ]);

      return {
        ok: true,
        eventId: event.id,
        dayKey: event.dayKey,
      };
    } catch (error) {
      if (error instanceof AnalyticsValidationError) {
        throw new HttpsError('invalid-argument', error.message);
      }

      logStructured('error', 'Analytics event ingestion failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpsError('internal', 'Failed to record analytics event.');
    }
  }
);

/**
 * Nightly analytics aggregation. Stores dashboard-ready summaries plus an AI
 * decision queue that Claude/ops tooling can consume without scanning raw events.
 */
export const aggregateDailyAnalytics = onSchedule(
  {
    schedule: 'every day 05:00',
    timeZone: 'Etc/UTC',
    secrets: [anthropicApiKey],
    maxInstances: 1,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const dayKey = getDateKeyDaysAgo(1);
    const { summary, decisionCount } = await aggregateAnalyticsDay(dayKey);
    const intelligence = await generateDailyIntelligenceForSummary(
      summary,
      anthropicApiKey.value()
    );
    logStructured('info', 'Daily analytics aggregation completed', {
      dayKey,
      eventCount: summary.eventCount,
      decisionCount,
      claudeStatus: intelligence.analysis.status,
      claudeDecisionCount: intelligence.decisionCount,
    });
  }
);

export const rebuildAnalyticsDay = onCall(
  {
    cors: true,
    secrets: [anthropicApiKey],
    maxInstances: 3,
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async (request) => {
    assertAnalyticsAdmin(request.auth?.uid);
    const dayKey =
      request.data &&
      typeof request.data === 'object' &&
      !Array.isArray(request.data) &&
      typeof (request.data as Record<string, unknown>).dayKey === 'string'
        ? ((request.data as Record<string, unknown>).dayKey as string).trim()
        : getDateKeyDaysAgo(1);

    const { summary, decisionCount } = await aggregateAnalyticsDay(dayKey);
    const intelligence = await generateDailyIntelligenceForSummary(
      summary,
      anthropicApiKey.value()
    );
    return {
      ok: true,
      summary,
      decisionCount,
      intelligence: intelligence.analysis,
      claudeDecisionCount: intelligence.decisionCount,
    };
  }
);

export const generateDailyAiIntelligence = onCall(
  {
    cors: true,
    secrets: [anthropicApiKey],
    maxInstances: 3,
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    assertAnalyticsAdmin(request.auth?.uid);
    const dayKey =
      request.data &&
      typeof request.data === 'object' &&
      !Array.isArray(request.data) &&
      typeof (request.data as Record<string, unknown>).dayKey === 'string'
        ? ((request.data as Record<string, unknown>).dayKey as string).trim()
        : getDateKeyDaysAgo(1);
    const db = getAdminFirestore();
    const summarySnapshot = await db
      .collection(ANALYTICS_DAILY_SUMMARIES_COLLECTION)
      .doc(dayKey)
      .get();
    if (!summarySnapshot.exists) {
      throw new HttpsError(
        'not-found',
        'No analytics summary exists for that day. Run rebuildAnalyticsDay first.'
      );
    }

    const summary = summarySnapshot.data() as DailyAnalyticsSummary;
    const intelligence = await generateDailyIntelligenceForSummary(
      summary,
      anthropicApiKey.value()
    );
    return {
      ok: true,
      intelligence: intelligence.analysis,
      claudeDecisionCount: intelligence.decisionCount,
    };
  }
);

export const getAnalyticsDashboardSnapshot = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    assertAnalyticsAdmin(request.auth?.uid);
    const requestedLimit =
      request.data &&
      typeof request.data === 'object' &&
      !Array.isArray(request.data) &&
      typeof (request.data as Record<string, unknown>).summaryLimit === 'number'
        ? ((request.data as Record<string, unknown>).summaryLimit as number)
        : DEFAULT_DASHBOARD_SUMMARY_LIMIT;
    const summaryLimit = Math.max(1, Math.min(60, Math.floor(requestedLimit)));
    const db = getAdminFirestore();

    const [summarySnapshot, decisionSnapshot, realtimeSnapshot, analysisSnapshot] =
      await Promise.all([
        db
          .collection(ANALYTICS_DAILY_SUMMARIES_COLLECTION)
          .orderBy('generatedAtMs', 'desc')
          .limit(summaryLimit)
          .get(),
        db.collection(AI_DECISION_QUEUE_COLLECTION).where('status', '==', 'open').limit(100).get(),
        db
          .collection(ANALYTICS_REALTIME_DAILY_COLLECTION)
          .orderBy('updatedAtMs', 'desc')
          .limit(2)
          .get(),
        db
          .collection(AI_DAILY_ANALYSES_COLLECTION)
          .orderBy('generatedAtMs', 'desc')
          .limit(summaryLimit)
          .get(),
      ]);

    const summaries = summarySnapshot.docs.map((doc) => doc.data());
    const decisions = decisionSnapshot.docs
      .map((doc) => doc.data())
      .sort((first, second) => {
        const severityRank: Record<string, number> = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return (
          (severityRank[String(second.severity)] ?? 0) -
            (severityRank[String(first.severity)] ?? 0) ||
          Number(second.createdAtMs ?? 0) - Number(first.createdAtMs ?? 0)
        );
      });
    const realtime = realtimeSnapshot.docs.map((doc) => doc.data());
    const analyses = analysisSnapshot.docs.map((doc) => doc.data());

    return {
      ok: true,
      summaries,
      analyses,
      decisions,
      realtime,
    };
  }
);

export const markAiDecisionReviewed = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 20,
    memory: '256MiB',
  },
  async (request) => {
    const reviewerUid = assertAnalyticsAdmin(request.auth?.uid);
    if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
      throw new HttpsError('invalid-argument', 'Decision review payload must be an object.');
    }

    const data = request.data as Record<string, unknown>;
    const decisionId = typeof data.decisionId === 'string' ? data.decisionId.trim() : '';
    const status = typeof data.status === 'string' ? data.status.trim() : '';
    if (!decisionId || !['reviewed', 'accepted', 'dismissed'].includes(status)) {
      throw new HttpsError('invalid-argument', 'Provide a decisionId and valid review status.');
    }

    await getAdminFirestore()
      .collection(AI_DECISION_QUEUE_COLLECTION)
      .doc(decisionId)
      .set(
        {
          status,
          reviewedAtMs: Date.now(),
          reviewedBy: reviewerUid,
          reviewNote:
            typeof data.note === 'string' && data.note.trim().length > 0
              ? data.note.trim().slice(0, 500)
              : null,
        },
        { merge: true }
      );

    return { ok: true };
  }
);

/**
 * Main HTTPS endpoint for the Ellie Brain.
 *
 * POST /ellieBrain
 * Body: EllieBrainRequest
 * Response: EllieBrainResponse
 */
export const ellieBrain = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
    maxInstances: 20,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    const startedAt = Date.now();
    const requestId = createRequestId(req.get('x-request-id'));

    // Only allow POST
    if (req.method !== 'POST') {
      res
        .status(405)
        .json(createErrorEnvelope(requestId, 'invalid_request', 'Method not allowed.', false));
      return;
    }

    try {
      const validation = validateRequestBody(req.body);
      if (!validation.ok) {
        const shouldRetry =
          validation.code === 'rate_limited' || validation.code === 'provider_timeout';
        res
          .status(validation.statusCode)
          .json(createErrorEnvelope(requestId, validation.code, validation.message, shouldRetry));
        return;
      }

      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        logStructured('error', 'OPENAI_API_KEY secret is not configured', {
          requestId,
          errorCode: 'internal_error',
          latencyMs: Date.now() - startedAt,
        });
        res
          .status(500)
          .json(
            createErrorEnvelope(requestId, 'internal_error', 'Service configuration error.', false)
          );
        return;
      }

      const response = await processQuery(validation.request, apiKey, {
        requestId,
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });

      if (!response.text || response.text.trim().length === 0) {
        throw new EllieBrainProcessingError(
          'provider_error',
          'Provider returned an empty response.',
          true,
          502
        );
      }

      const successEnvelope: EllieBrainSuccessEnvelope = {
        ok: true,
        requestId,
        data: {
          ...response,
          requestId,
        },
      };

      logStructured('info', 'Ellie Brain request completed', {
        requestId,
        latencyMs: Date.now() - startedAt,
        providerStatus: 'ok',
      });

      res.status(200).json(successEnvelope);
    } catch (error) {
      const mappedError =
        error instanceof EllieBrainProcessingError
          ? error
          : new EllieBrainProcessingError(
              'internal_error',
              'Something went wrong. Please try again.',
              true,
              500
            );

      logStructured('error', 'Ellie Brain request failed', {
        requestId,
        errorCode: mappedError.code,
        retryable: mappedError.retryable,
        providerStatus: mappedError.providerStatus ?? 'unknown',
        latencyMs: Date.now() - startedAt,
        message: mappedError.message,
      });

      res
        .status(mappedError.statusCode)
        .json(
          createErrorEnvelope(
            requestId,
            mappedError.code,
            mappedError.message,
            mappedError.retryable
          )
        );
    }
  }
);

export const signalLoopPreview = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  (req, res) => {
    const requestId = createRequestId(req.get('x-request-id'));

    if (req.method !== 'POST') {
      res
        .status(405)
        .json(createAudienceOpsError(requestId, 'invalid_request', 'Method not allowed.'));
      return;
    }

    try {
      const input = validateAudienceRunInput(req.body);
      const result = buildDailyAudienceRun(input, ellieAudienceAdapter);

      const response: AudienceOpsSuccessEnvelope = {
        ok: true,
        requestId,
        data: result as unknown as Record<string, unknown>,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid SignalLoop preview request.';
      const code =
        message.includes('adapter') || message.includes('implemented')
          ? 'unsupported_adapter'
          : 'invalid_request';

      res.status(400).json(createAudienceOpsError(requestId, code, message));
    }
  }
);

export const audienceOpsPreview = signalLoopPreview;
