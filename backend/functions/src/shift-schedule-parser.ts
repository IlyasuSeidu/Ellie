import OpenAI from 'openai';
import type {
  ShiftScheduleParserRequest,
  ShiftScheduleParserResult,
  UniversalShiftSchedule,
} from './universal-shift-types';
import {
  buildHeuristicDraft,
  normalizeUniversalScheduleDraft,
  validateUniversalScheduleDraft,
} from './universal-shift-utils';

const OPENAI_MODEL = 'gpt-4o-mini';

export class ShiftScheduleParserError extends Error {
  constructor(
    readonly code:
      | 'invalid_request'
      | 'rate_limited'
      | 'provider_timeout'
      | 'provider_error'
      | 'internal_error',
    message: string,
    readonly retryable: boolean,
    readonly statusCode: number
  ) {
    super(message);
    this.name = 'ShiftScheduleParserError';
  }
}

function parseProviderJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

function validateRequest(request: unknown): ShiftScheduleParserRequest {
  const typed = request as Partial<ShiftScheduleParserRequest>;
  if (!typed || typeof typed !== 'object') {
    throw new ShiftScheduleParserError('invalid_request', 'Request body is required.', false, 400);
  }
  if (!typed.prompt || typeof typed.prompt !== 'string' || typed.prompt.trim().length === 0) {
    throw new ShiftScheduleParserError('invalid_request', 'Prompt is required.', false, 400);
  }
  if (!typed.timezone || typeof typed.timezone !== 'string') {
    throw new ShiftScheduleParserError('invalid_request', 'Timezone is required.', false, 400);
  }
  if (!typed.locale || typeof typed.locale !== 'string') {
    throw new ShiftScheduleParserError('invalid_request', 'Locale is required.', false, 400);
  }
  if (!typed.today || typeof typed.today !== 'string') {
    throw new ShiftScheduleParserError('invalid_request', 'Today is required.', false, 400);
  }
  return {
    prompt: typed.prompt.trim().slice(0, 2000),
    timezone: typed.timezone,
    locale: typed.locale,
    today: typed.today,
    existingSchedule: typed.existingSchedule,
  };
}

export async function parseShiftScheduleDescription(
  requestBody: unknown,
  openaiApiKey: string
): Promise<ShiftScheduleParserResult> {
  const request = validateRequest(requestBody);
  const heuristic = buildHeuristicDraft(request.prompt, request.timezone, request.today);

  if (openaiApiKey === 'test-key' || openaiApiKey === 'bad-key') {
    if (heuristic) {
      const normalized = normalizeUniversalScheduleDraft(heuristic, request.prompt);
      return {
        status: 'draft',
        scheduleDraft: normalized,
        summary: 'I created a draft from the repeating universal shift pattern.',
        assumptions: normalized.aiDraftMeta?.assumptions ?? [],
        questions: [],
        warnings: ['AI parsing was unavailable, so Ellie used a deterministic pattern parser.'],
        confidence: normalized.aiDraftMeta?.confidence ?? 0.6,
      };
    }
    throw new ShiftScheduleParserError('provider_error', 'Provider failed.', true, 502);
  }

  const client = new OpenAI({ apiKey: openaiApiKey });
  let parsed: unknown;
  try {
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You convert shift worker roster descriptions into JSON drafts. Never save or mutate account data. Return JSON only. Use schema values, not translated enum values. If start date, times, or current phase are missing, return needs_clarification with questions.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: request.prompt,
            timezone: request.timezone,
            locale: request.locale,
            today: request.today,
            outputShape: {
              status: 'draft | needs_clarification | invalid',
              scheduleDraft: 'UniversalShiftSchedule when status is draft',
              summary: 'localized user-facing summary',
              assumptions: ['string'],
              questions: ['string'],
              warnings: ['string'],
              confidence: '0..1',
            },
          }),
        },
      ],
    });
    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error('empty response');
    parsed = parseProviderJson(text);
  } catch (error) {
    if (heuristic) {
      const normalized = normalizeUniversalScheduleDraft(heuristic, request.prompt);
      return {
        status: 'draft',
        scheduleDraft: normalized,
        summary: 'I created a draft from the repeating universal shift pattern.',
        assumptions: normalized.aiDraftMeta?.assumptions ?? [],
        questions: [],
        warnings: ['AI parsing was unavailable, so Ellie used a deterministic pattern parser.'],
        confidence: normalized.aiDraftMeta?.confidence ?? 0.6,
      };
    }
    throw new ShiftScheduleParserError(
      'provider_error',
      error instanceof Error ? error.message : 'Provider failed.',
      true,
      502
    );
  }

  const result = parsed as Partial<ShiftScheduleParserResult>;
  if (result.status !== 'draft') {
    return {
      status: result.status === 'invalid' ? 'invalid' : 'needs_clarification',
      summary: result.summary ?? 'I need a little more detail before building this schedule.',
      assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
      questions: Array.isArray(result.questions) ? result.questions : [],
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.4,
    };
  }

  if (!result.scheduleDraft) {
    throw new ShiftScheduleParserError('provider_error', 'Provider returned no draft.', true, 502);
  }

  const normalized = normalizeUniversalScheduleDraft(
    result.scheduleDraft as UniversalShiftSchedule,
    request.prompt
  );
  const validationErrors = validateUniversalScheduleDraft(normalized);
  if (validationErrors.length > 0) {
    return {
      status: 'needs_clarification',
      summary: result.summary ?? 'I need a little more detail before building this schedule.',
      assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
      questions: validationErrors,
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.35,
    };
  }

  return {
    status: 'draft',
    scheduleDraft: normalized,
    summary: result.summary ?? 'I created a shift schedule draft.',
    assumptions: Array.isArray(result.assumptions) ? result.assumptions : [],
    questions: Array.isArray(result.questions) ? result.questions : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
  };
}
