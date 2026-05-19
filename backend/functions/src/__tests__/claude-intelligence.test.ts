import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildClaudeDailyIntelligencePrompt,
  buildClaudeDecisionQueueCandidates,
  buildFallbackDailyIntelligenceAnalysis,
  parseClaudeDailyIntelligencePayload,
  requestClaudeDailyIntelligenceAnalysis,
} from '../claude-intelligence';
import { buildDailyAnalyticsSummary, type AnalyticsEventDocument } from '../analytics-ai';

const summary = buildDailyAnalyticsSummary(
  '2026-04-17',
  [] as AnalyticsEventDocument[],
  1776400000000
);

test('builds a Claude prompt from aggregate summaries only', () => {
  const prompt = buildClaudeDailyIntelligencePrompt(summary);

  assert.match(prompt.system, /strict JSON/i);
  assert.match(prompt.user, /daily Ellie analytics report/i);
  assert.match(prompt.user, /dailyIntelligenceReport|report/);
  assert.doesNotMatch(prompt.user, /raw_query|email|phone/i);
});

test('parses Claude JSON payloads with strict normalized output', () => {
  const payload = parseClaudeDailyIntelligencePayload(`Here is JSON:\n{
    "emergencies": [{"metric":"voice_error_rate","currentValue":0.4,"recommendedAction":"Fix voice fallback."}],
    "opportunities": [{"observation":"Offline questions are rising.","recommendation":"Prioritize holiday/date intent.","estimatedImpact":"High"}],
    "churnAlerts": {"genuineCount": 2, "fifoCaution":"Rest blocks are not churn."},
    "engineeringAlerts": [{"area":"voice","issue":"Failures high","severity":"critical"}],
    "abTestRecommendation": {"hypothesis":"Shorter copy converts","control":"Current","treatment":"Shorter","primaryMetric":"completion"},
    "executiveSummary":"Voice quality needs attention."
  }`);

  assert.equal(payload.emergencies.length, 1);
  assert.equal(payload.opportunities[0]?.recommendation, 'Prioritize holiday/date intent.');
  assert.equal(payload.engineeringAlerts[0]?.severity, 'critical');
  assert.equal(payload.abTestRecommendation?.primaryMetric, 'completion');
});

test('requests Claude Messages API with required headers and model', async () => {
  const fetchCalls: unknown[] = [];
  const analysis = await requestClaudeDailyIntelligenceAnalysis(
    summary,
    'sk-test',
    'claude-sonnet-4-6',
    async (url, init) => {
      fetchCalls.push({ url, init });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            id: 'msg_123',
            model: 'claude-sonnet-4-6',
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 20 },
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  emergencies: [],
                  opportunities: [],
                  churnAlerts: { genuineCount: 0, fifoCaution: 'FIFO caution.' },
                  engineeringAlerts: [],
                  abTestRecommendation: null,
                  executiveSummary: 'All clear.',
                }),
              },
            ],
          }),
      };
    }
  );

  const call = fetchCalls[0] as {
    url: string;
    init: { headers: Record<string, string>; body: string };
  };
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.init.headers['x-api-key'], 'sk-test');
  assert.equal(call.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(JSON.parse(call.init.body).model, 'claude-sonnet-4-6');
  assert.equal(analysis.status, 'completed');
  assert.equal(analysis.responseId, 'msg_123');
});

test('fallback analysis creates deterministic decision candidates', () => {
  const fallback = buildFallbackDailyIntelligenceAnalysis(
    summary,
    1776400000000,
    'claude-sonnet-4-6',
    'missing secret'
  );
  const candidates = buildClaudeDecisionQueueCandidates(fallback, 1776400000001);

  assert.equal(fallback.status, 'fallback');
  assert.equal(fallback.errorMessage, 'missing secret');
  assert.ok(Array.isArray(candidates));
});
