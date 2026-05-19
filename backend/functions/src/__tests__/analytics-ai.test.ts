import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAiDecisionCandidates,
  buildAnalyticsEventDocument,
  buildDailyAnalyticsSummary,
  sanitizeAnalyticsParams,
  type AnalyticsEventDocument,
} from '../analytics-ai';

test('sanitizes sensitive analytics fields without storing raw text', () => {
  const params = sanitizeAnalyticsParams({
    query_text: 'When is my next day off?',
    screen_name: 'HomeScreen',
    latency_ms: 123,
    toolsInvoked: ['get_shift_for_date', 'days_until_rest'],
    nested: { unsafe: true },
    empty: undefined,
  });

  assert.equal(params.query_text_redacted, true);
  assert.equal(params.query_text_length, 24);
  assert.equal(typeof params.query_text_hash, 'string');
  assert.equal(params.screen_name, 'HomeScreen');
  assert.equal(params.latency_ms, 123);
  assert.deepEqual(params.toolsInvoked, ['get_shift_for_date', 'days_until_rest']);
  assert.equal('query_text' in params, false);
  assert.equal('nested' in params, false);
  assert.equal('empty' in params, false);
});

test('builds normalized event documents with hashed install and session identifiers', () => {
  const doc = buildAnalyticsEventDocument(
    'event-1',
    {
      eventName: 'voice_query_succeeded',
      params: { intent: 'next_shift', responseLatencyMs: 450 },
      clientContext: {
        installId: 'install-123',
        sessionId: 'session-123',
        platform: 'ios',
        localDateKey: '2026-04-17',
      },
      occurredAtMs: Date.parse('2026-04-17T08:00:00.000Z'),
    },
    { userId: 'user-123', installId: null },
    Date.parse('2026-04-17T08:00:01.000Z')
  );

  assert.equal(doc.eventName, 'voice_query_succeeded');
  assert.equal(doc.category, 'voice');
  assert.equal(doc.hasAuthenticatedUser, true);
  assert.equal(doc.userId, 'user-123');
  assert.equal(doc.dayKey, '2026-04-17');
  assert.equal(doc.localDateKey, '2026-04-17');
  assert.equal(doc.installIdHash?.length, 32);
  assert.equal(doc.sessionIdHash?.length, 32);
});

test('aggregates daily voice, revenue, onboarding, and offline signals', () => {
  const receivedAtMs = Date.parse('2026-04-17T10:00:00.000Z');
  const event = (
    id: string,
    eventName: string,
    params: Record<string, unknown>
  ): AnalyticsEventDocument =>
    buildAnalyticsEventDocument(
      id,
      {
        eventName,
        params,
        clientContext: { installId: `install-${id}`, platform: 'ios' },
        occurredAtMs: receivedAtMs,
      },
      { userId: id.startsWith('u') ? id : null, installId: null },
      receivedAtMs
    );

  const events = [
    event('u1', 'onboarding_started', {}),
    event('u1', 'onboarding_step_viewed', { step_id: 'shift_pattern' }),
    event('u2', 'onboarding_step_viewed', { step_id: 'shift_pattern' }),
    event('u1', 'onboarding_step_completed', { step_id: 'shift_pattern' }),
    event('u1', 'voice_session_started', {}),
    event('u1', 'voice_query_succeeded', { intent: 'next_shift', responseLatencyMs: 500 }),
    event('u2', 'voice_query_failed', { intent: 'next_shift' }),
    event('u3', 'paywall_viewed', {}),
    event('u3', 'paywall_cta_clicked', {}),
    event('u3', 'purchase_completed', {}),
    event('u4', 'voice_offline_answer_unhandled', { intent: 'holiday_date' }),
  ];

  const summary = buildDailyAnalyticsSummary('2026-04-17', events, receivedAtMs);

  assert.equal(summary.eventCount, events.length);
  assert.equal(summary.uniqueActorCount, 4);
  assert.equal(summary.voice.successRate, 0.3333);
  assert.equal(summary.voice.avgLatencyMs, 500);
  assert.equal(summary.revenue.ctaToPurchaseRate, 1);
  assert.equal(summary.offline.unsupportedQuestions, 1);
  assert.equal(summary.onboarding.dropOffs[0]?.step, 'shift_pattern');
  assert.equal(summary.dailyIntelligenceReport.reportDate, '2026-04-17');
});

test('creates AI decision candidates for unsupported holiday/date offline intent', () => {
  const receivedAtMs = Date.parse('2026-04-17T10:00:00.000Z');
  const events = Array.from({ length: 5 }, (_, index) =>
    buildAnalyticsEventDocument(
      `event-${index}`,
      {
        eventName: 'voice_offline_answer_unhandled',
        params: { intent: 'holiday_date' },
        clientContext: { installId: `install-${index}`, platform: 'ios' },
        occurredAtMs: receivedAtMs,
      },
      { userId: null, installId: null },
      receivedAtMs
    )
  );
  const summary = buildDailyAnalyticsSummary('2026-04-17', events, receivedAtMs);
  const decisions = buildAiDecisionCandidates(summary, receivedAtMs);

  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]?.type, 'offline_gap');
  assert.equal(decisions[0]?.severity, 'high');
  assert.match(decisions[0]?.recommendedAction ?? '', /holiday\/date/);
});
