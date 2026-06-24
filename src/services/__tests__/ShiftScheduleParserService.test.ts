/**
 * Tests for ShiftScheduleParserService
 *
 * Covers configuration checks, all error conditions, and happy-path
 * parsing of draft / needs_clarification / invalid responses.
 */

// ── Mock setup (must be before imports) ──────────────────────────────────────

// The service imports `config` as a default export (`import config from '@/config/env'`).
// Jest hoists jest.mock() before variable declarations, so the factory cannot close
// over const variables defined in this file. Instead we build the mutable config
// object *inside* the factory and expose it via the module's __mock__ named export
// so tests can read and mutate it at runtime.

jest.mock('@/config/env', () => {
  const shiftScheduleParser = {
    url: 'https://test.cloudfunctions.net/parseShiftScheduleDescription',
    timeoutMs: 45000,
    maxPromptLength: 2000,
  };
  return {
    __esModule: true,
    default: { shiftScheduleParser },
    // Expose the mutable object so tests can read and update it
    __mock__: { shiftScheduleParser },
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  isAiParserAvailable,
  parseShiftScheduleDescription,
  ShiftScheduleParserError,
  type ShiftScheduleParserRequest,
} from '../ShiftScheduleParserService';
import type { UniversalShiftSchedule } from '@/types';

// Obtain the mutable shiftScheduleParser config object exposed by the factory
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockShiftScheduleParser: { url: string; timeoutMs: number; maxPromptLength: number } =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (require('@/config/env') as any).__mock__.shiftScheduleParser;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(prompt = 'I work 4 days on, 4 days off'): ShiftScheduleParserRequest {
  return {
    prompt,
    timezone: 'UTC',
    locale: 'en',
    today: '2026-01-01',
  };
}

/** Minimal valid UniversalShiftSchedule that passes the Zod schema */
const validScheduleDraft: UniversalShiftSchedule = {
  version: 3,
  name: 'Test Schedule',
  timezone: 'UTC',
  anchorDate: '2026-01-01',
  phaseOffset: 0,
  shiftDefinitions: [
    {
      id: 'def1',
      name: 'Day',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '06:00',
      endTime: '18:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#2196F3',
      icon: 'sunny',
    },
    {
      id: 'def2',
      name: 'Off',
      kind: 'off',
      timePolicy: 'all_day',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#5f7484',
      icon: 'home',
    },
  ],
  sequence: [
    { id: 's1', shiftDefinitionId: 'def1' },
    { id: 's2', shiftDefinitionId: 'def1' },
    { id: 's3', shiftDefinitionId: 'def2' },
    { id: 's4', shiftDefinitionId: 'def2' },
  ],
  source: 'manual', // service must override to 'ai'
};

/** Build a fetch mock that resolves with a JSON body and a given HTTP status */
function fetchOk(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function fetchEnvelope(data: unknown, requestId = 'req-envelope') {
  return fetchOk({
    ok: true,
    requestId,
    data,
  });
}

function fetchError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'error' }),
  });
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset parser config to a valid URL before each test
  mockShiftScheduleParser.url = 'https://test.cloudfunctions.net/parseShiftScheduleDescription';
  mockShiftScheduleParser.timeoutMs = 45000;
  mockShiftScheduleParser.maxPromptLength = 2000;
});

// ── isAiParserAvailable ───────────────────────────────────────────────────────

describe('isAiParserAvailable', () => {
  it('returns false when URL is empty', () => {
    mockShiftScheduleParser.url = '';
    expect(isAiParserAvailable()).toBe(false);
  });

  it('returns false when URL is whitespace only', () => {
    mockShiftScheduleParser.url = '   ';
    expect(isAiParserAvailable()).toBe(false);
  });

  it('returns true when a valid https URL is set', () => {
    mockShiftScheduleParser.url = 'https://test.cloudfunctions.net/parseShiftScheduleDescription';
    expect(isAiParserAvailable()).toBe(true);
  });

  it('returns true when a valid http URL is set', () => {
    mockShiftScheduleParser.url = 'http://localhost:5001/parse';
    expect(isAiParserAvailable()).toBe(true);
  });
});

// ── parseShiftScheduleDescription — error conditions ─────────────────────────

describe('parseShiftScheduleDescription - error conditions', () => {
  it('throws NOT_CONFIGURED when URL is empty', async () => {
    mockShiftScheduleParser.url = '';
    await expect(
      parseShiftScheduleDescription(makeRequest('unknown pattern'))
    ).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    });
  });

  it('uses the built-in parser when URL is empty but the prompt is recognizable', async () => {
    mockShiftScheduleParser.url = '';

    const result = await parseShiftScheduleDescription(makeRequest('I work 4 on 4 off'));

    expect(result.status).toBe('draft');
    expect(result.parserSource).toBe('local_fallback');
    expect(result.fallbackReason).toBe('not_configured');
    expect(result.scheduleDraft?.sequence).toHaveLength(8);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws PROMPT_EMPTY when prompt is empty', async () => {
    await expect(parseShiftScheduleDescription(makeRequest('   '))).rejects.toMatchObject({
      code: 'PROMPT_EMPTY',
    });
  });

  it('throws PROMPT_TOO_LONG when prompt exceeds maxLength', async () => {
    mockShiftScheduleParser.maxPromptLength = 10;
    const longPrompt = 'A'.repeat(11);
    await expect(parseShiftScheduleDescription(makeRequest(longPrompt))).rejects.toMatchObject({
      code: 'PROMPT_TOO_LONG',
    });
  });

  it('throws TIMEOUT when fetch throws an AbortError', async () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    await expect(
      parseShiftScheduleDescription(makeRequest('unknown pattern'))
    ).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('throws RATE_LIMITED on a 429 response', async () => {
    mockFetch.mockReturnValue(fetchError(429));

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });

  it('throws SERVER_ERROR on a 500 response', async () => {
    mockFetch.mockReturnValue(fetchError(500));

    await expect(
      parseShiftScheduleDescription(makeRequest('unknown pattern'))
    ).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
  });

  it('falls back to the built-in parser when a 500 response interrupts a recognizable prompt', async () => {
    mockFetch.mockReturnValue(fetchError(500));

    const result = await parseShiftScheduleDescription(makeRequest('I work 4 on 4 off'));

    expect(result.status).toBe('draft');
    expect(result.parserSource).toBe('local_fallback');
    expect(result.fallbackReason).toBe('server_error');
    expect(result.scheduleDraft?.aiDraftMeta?.parserSource).toBe('local_fallback');
    expect(result.scheduleDraft?.aiDraftMeta?.fallbackReason).toBe('server_error');
    expect(result.warnings).toContain(
      'Ryvro used its built-in pattern builder because online AI was unavailable. Review the draft before saving.'
    );
  });

  it('falls back to the built-in parser when a timeout interrupts a recognizable prompt', async () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValue(abortError);

    const result = await parseShiftScheduleDescription(makeRequest('I work 4 on 4 off'));

    expect(result.status).toBe('draft');
    expect(result.parserSource).toBe('local_fallback');
    expect(result.fallbackReason).toBe('timeout');
  });

  it('falls back to the built-in parser when a network error interrupts a recognizable prompt', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    const result = await parseShiftScheduleDescription(makeRequest('I work 4 on 4 off'));

    expect(result.status).toBe('draft');
    expect(result.parserSource).toBe('local_fallback');
    expect(result.fallbackReason).toBe('network_error');
  });

  it('throws SERVER_ERROR on a 400 response', async () => {
    mockFetch.mockReturnValue(fetchError(400));

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'SERVER_ERROR',
    });
  });

  it('falls back to the built-in parser when the configured endpoint returns 404', async () => {
    mockFetch.mockReturnValue(fetchError(404));

    const result = await parseShiftScheduleDescription(
      makeRequest(
        'A nurse 2 day shifts, 2 night shifts, then 3 off. Day is 7 AM to 7 PM. Night is 7 PM to 7 AM.'
      )
    );

    expect(result.status).toBe('draft');
    expect(result.parserSource).toBe('local_fallback');
    expect(result.fallbackReason).toBe('not_found');
    expect(result.scheduleDraft?.source).toBe('ai');
    expect(result.scheduleDraft?.sequence).toHaveLength(7);
    expect(result.scheduleDraft?.shiftDefinitions.map((definition) => definition.name)).toEqual([
      'Day Shift',
      'Night Shift',
      'Off',
    ]);
    expect(result.scheduleDraft?.shiftDefinitions[0]).toMatchObject({
      startTime: '07:00',
      endTime: '19:00',
    });
    expect(result.scheduleDraft?.shiftDefinitions[1]).toMatchObject({
      startTime: '19:00',
      endTime: '07:00',
      crossesMidnight: true,
    });
    expect(result.warnings).toContain(
      'Ryvro used its built-in pattern builder because online AI was unavailable. Review the draft before saving.'
    );
  });

  it('falls back for plain on/off language when the configured endpoint returns 404', async () => {
    mockFetch.mockReturnValue(fetchError(404));

    const result = await parseShiftScheduleDescription(makeRequest('I work 4 on 4 off'));

    expect(result.status).toBe('draft');
    expect(result.scheduleDraft?.sequence).toHaveLength(8);
    expect(result.scheduleDraft?.shiftDefinitions.map((definition) => definition.name)).toEqual([
      'Day Shift',
      'Off',
    ]);
    expect(
      result.scheduleDraft?.sequence
        .slice(0, 4)
        .every((item) => item.shiftDefinitionId.includes('day'))
    ).toBe(true);
    expect(
      result.scheduleDraft?.sequence
        .slice(4)
        .every((item) => item.shiftDefinitionId.includes('off'))
    ).toBe(true);
  });

  it('lines up the fallback draft when the prompt says today is a specific shift occurrence', async () => {
    mockFetch.mockReturnValue(fetchError(404));

    const result = await parseShiftScheduleDescription(
      makeRequest('I work 4 days, 4 nights, then 4 off. Make today the second night.')
    );

    expect(result.scheduleDraft?.phaseOffset).toBe(5);
    expect(result.assumptions).toContain(
      'Lined up the cycle so the requested current shift lands on the match-from date.'
    );
  });

  it('does not count days off as day shifts when parsing early late night patterns', async () => {
    mockFetch.mockReturnValue(fetchError(404));

    const result = await parseShiftScheduleDescription(
      makeRequest(
        'Airport worker: 2 early shifts 5am to 1pm, 2 late shifts 1pm to 9pm, 2 night shifts 9pm to 5am, then 4 days off. Start today on the first late shift.'
      )
    );

    expect(result.status).toBe('draft');
    expect(result.scheduleDraft?.sequence).toHaveLength(10);
    expect(result.scheduleDraft?.phaseOffset).toBe(2);
    expect(result.scheduleDraft?.shiftDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Day Shift', startTime: '05:00', endTime: '13:00' }),
        expect.objectContaining({ name: 'Evening Shift', startTime: '13:00', endTime: '21:00' }),
        expect.objectContaining({
          name: 'Night Shift',
          startTime: '21:00',
          endTime: '05:00',
          crossesMidnight: true,
        }),
        expect.objectContaining({ name: 'Off' }),
      ])
    );

    const countByName = new Map<string, number>();
    const definitionsById = new Map(
      (result.scheduleDraft?.shiftDefinitions ?? []).map((definition) => [
        definition.id,
        definition.name,
      ])
    );
    for (const item of result.scheduleDraft?.sequence ?? []) {
      const name = definitionsById.get(item.shiftDefinitionId) ?? 'Unknown';
      countByName.set(name, (countByName.get(name) ?? 0) + 1);
    }

    expect(countByName.get('Day Shift')).toBe(2);
    expect(countByName.get('Evening Shift')).toBe(2);
    expect(countByName.get('Night Shift')).toBe(2);
    expect(countByName.get('Off')).toBe(4);
  });

  it('covers the built-in fallback parser across broad shift-worker industries', async () => {
    mockShiftScheduleParser.url = '';
    const industryPrompts = [
      'Nurse schedule: 2 day shifts 7am to 7pm, 2 night shifts 7pm to 7am, then 3 off.',
      'Security guard: 4 days, 4 nights, 4 off.',
      'Paramedic rota: 1 day shift, 1 night shift, then 4 days off.',
      'Factory operator: 2 mornings, 2 afternoons, 2 nights, then 4 off.',
      'Rail controller: 3 early shifts, 3 late shifts, 3 nights, then 5 off.',
      'Airport ground crew: 2 early shifts 5am to 1pm, 2 late shifts 1pm to 9pm, then 2 off.',
      'Hotel front desk: 5 evenings, 2 off.',
      'Retail supervisor: 5 day shifts, 2 rest days.',
      'Warehouse picker: 4 nights, 3 off.',
      'Logistics dispatcher: 2 days, 2 nights, 4 off.',
      'Offshore technician: 14 days on, 14 days off.',
      'Mining FIFO operator: 7 days, 7 nights, 14 off.',
      'Power plant operator: 3 days, 3 nights, 6 off.',
      'Data center technician: 4 day shifts, 4 night shifts, 4 off.',
      'Cleaning team lead: 6 nights, 3 off.',
      'Contact center team: 5 late shifts, 2 off.',
      'Broadcast engineer: 2 days, 2 on call, 3 off.',
      'Port worker: 2 travel days, 10 day shifts, 4 off.',
      'Construction shutdown crew: 12 days on, 2 days off.',
      'Training week: 3 training days, 1 on-call day, then 3 leave days.',
    ];

    const parsedResults = await Promise.all(
      industryPrompts.map((prompt) => parseShiftScheduleDescription(makeRequest(prompt)))
    );

    expect(parsedResults).toHaveLength(20);
    for (const result of parsedResults) {
      expect(result.status).toBe('draft');
      expect(result.scheduleDraft?.source).toBe('ai');
      expect(result.scheduleDraft?.shiftDefinitions.length).toBeGreaterThan(0);
      expect(result.scheduleDraft?.sequence.length).toBeGreaterThan(0);
      expect(result.warnings).toContain(
        'Ryvro used its built-in pattern builder because online AI was unavailable. Review the draft before saving.'
      );
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws MALFORMED_RESPONSE when response.json() throws', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })
    );

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
  });

  it('throws MALFORMED_RESPONSE when JSON body is not an object', async () => {
    // The service casts raw to Record<string, unknown> then checks typeof
    // Returning a primitive string as the parsed JSON value
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve('just a string'),
      })
    );

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
  });

  it('throws MALFORMED_RESPONSE when status field is unrecognized', async () => {
    mockFetch.mockReturnValue(fetchOk({ status: 'unknown_status', summary: '', confidence: 0 }));

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    });
  });

  it('throws SCHEMA_VALIDATION_FAILED when scheduleDraft fails schema validation and status is "draft"', async () => {
    // scheduleDraft present but structurally invalid (missing required fields)
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'draft',
        scheduleDraft: { version: 3, name: '' }, // invalid — fails Zod schema
        summary: 'Draft generated',
        confidence: 0.7,
        assumptions: [],
        questions: [],
        warnings: [],
      })
    );

    await expect(parseShiftScheduleDescription(makeRequest())).rejects.toMatchObject({
      code: 'SCHEMA_VALIDATION_FAILED',
    });
  });

  it('throws NETWORK_ERROR on a generic fetch network failure', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      parseShiftScheduleDescription(makeRequest('unknown pattern'))
    ).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});

// ── parseShiftScheduleDescription — happy paths ───────────────────────────────

describe('parseShiftScheduleDescription - happy paths', () => {
  it('parses a "draft" response with a valid scheduleDraft', async () => {
    mockFetch.mockReturnValue(
      fetchEnvelope(
        {
          status: 'draft',
          scheduleDraft: validScheduleDraft,
          summary: 'Parsed successfully',
          assumptions: ['Assumes 12-hour shifts'],
          questions: [],
          warnings: ['No night shifts detected'],
          confidence: 0.85,
        },
        'req-abc-123'
      )
    );

    const result = await parseShiftScheduleDescription(makeRequest());

    expect(result.status).toBe('draft');
    expect(result.scheduleDraft).toBeDefined();
    expect(result.summary).toBe('Parsed successfully');
    expect(result.assumptions).toEqual(['Assumes 12-hour shifts']);
    expect(result.confidence).toBe(0.85);
    expect(result.requestId).toBe('req-abc-123');
  });

  it('parses a "needs_clarification" response with questions', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'needs_clarification',
        summary: 'Need more info',
        assumptions: [],
        questions: ['What time does your shift start?', 'How many days off?'],
        warnings: [],
        confidence: 0.3,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());

    expect(result.status).toBe('needs_clarification');
    expect(result.questions).toEqual(['What time does your shift start?', 'How many days off?']);
    expect(result.scheduleDraft).toBeUndefined();
  });

  it('parses an "invalid" response with a summary', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'invalid',
        summary: 'Could not understand the description',
        assumptions: [],
        questions: [],
        warnings: [],
        confidence: 0,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());

    expect(result.status).toBe('invalid');
    expect(result.summary).toBe('Could not understand the description');
    expect(result.scheduleDraft).toBeUndefined();
  });

  it('forces source to "ai" regardless of what the backend returns', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'draft',
        scheduleDraft: { ...validScheduleDraft, source: 'manual' }, // backend sends 'manual'
        summary: '',
        assumptions: [],
        questions: [],
        warnings: [],
        confidence: 1,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());

    expect(result.scheduleDraft?.source).toBe('ai');
  });

  it('filters non-string items from assumptions, questions, and warnings arrays', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'needs_clarification',
        summary: '',
        assumptions: ['Valid assumption', 42, null, true, 'Another assumption'],
        questions: [undefined, 'Real question', { not: 'a string' }],
        warnings: [false, 'Real warning'],
        confidence: 0.5,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());

    expect(result.assumptions).toEqual(['Valid assumption', 'Another assumption']);
    expect(result.questions).toEqual(['Real question']);
    expect(result.warnings).toEqual(['Real warning']);
  });

  it('defaults summary to empty string when missing from response', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'invalid',
        // no summary field
        assumptions: [],
        questions: [],
        warnings: [],
        confidence: 0,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());
    expect(result.summary).toBe('');
  });

  it('defaults confidence to 0 when missing from response', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'invalid',
        summary: 'Bad input',
        assumptions: [],
        questions: [],
        warnings: [],
        // no confidence field
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());
    expect(result.confidence).toBe(0);
  });

  it('omits requestId when not present in response', async () => {
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'invalid',
        summary: '',
        assumptions: [],
        questions: [],
        warnings: [],
        confidence: 0,
        // no requestId
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());
    expect(result.requestId).toBeUndefined();
  });

  it('accepts an empty scheduleDraft when status is needs_clarification', async () => {
    // status = needs_clarification, no scheduleDraft — valid, should not throw
    mockFetch.mockReturnValue(
      fetchOk({
        status: 'needs_clarification',
        summary: 'Needs more info',
        assumptions: [],
        questions: ['What is your shift length?'],
        warnings: [],
        confidence: 0.2,
      })
    );

    const result = await parseShiftScheduleDescription(makeRequest());
    expect(result.status).toBe('needs_clarification');
    expect(result.scheduleDraft).toBeUndefined();
  });
});

// ── ShiftScheduleParserError ──────────────────────────────────────────────────

describe('ShiftScheduleParserError', () => {
  it('has name "ShiftScheduleParserError"', () => {
    const err = new ShiftScheduleParserError('TIMEOUT', 'timed out');
    expect(err.name).toBe('ShiftScheduleParserError');
  });

  it('exposes code and retryable properties', () => {
    const err = new ShiftScheduleParserError('RATE_LIMITED', 'rate limited', true);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
  });

  it('defaults retryable to false', () => {
    const err = new ShiftScheduleParserError('NOT_CONFIGURED', 'not configured');
    expect(err.retryable).toBe(false);
  });
});
