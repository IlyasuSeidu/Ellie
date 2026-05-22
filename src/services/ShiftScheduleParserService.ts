/**
 * ShiftScheduleParserService
 *
 * Client for the backend parseShiftScheduleDescription Cloud Function.
 * Handles all error conditions: backend not configured, invalid prompt,
 * rate limit, timeout, provider error, malformed response, network error.
 *
 * AI output is always a draft — never directly saved.
 */

import config from '@/config/env';
import { universalShiftScheduleSchema } from '@/types/validation';
import type {
  UniversalShiftActivePolicy,
  UniversalShiftDefinition,
  UniversalShiftKind,
  UniversalShiftSchedule,
  UniversalShiftTimePolicy,
} from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ShiftScheduleParserRequest {
  prompt: string;
  timezone: string;
  locale: string;
  today: string;
  existingSchedule?: UniversalShiftSchedule;
}

export interface ShiftScheduleParserResult {
  status: 'draft' | 'needs_clarification' | 'invalid';
  scheduleDraft?: UniversalShiftSchedule;
  summary: string;
  assumptions: string[];
  questions: string[];
  warnings: string[];
  confidence: number;
  requestId?: string;
}

export type ParserErrorCode =
  | 'NOT_CONFIGURED'
  | 'PROMPT_TOO_LONG'
  | 'PROMPT_EMPTY'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'SCHEMA_VALIDATION_FAILED';

export class ShiftScheduleParserError extends Error {
  constructor(
    public readonly code: ParserErrorCode,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ShiftScheduleParserError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

function isConfiguredUrl(url: string | undefined | null): boolean {
  const u = (url ?? '').trim();
  if (!u || u.includes('REGION-PROJECT') || u.includes('your-project-id')) return false;
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(u);
}

function combineAbortSignals(timeoutSignal: AbortSignal, callerSignal?: AbortSignal): AbortSignal {
  if (!callerSignal) return timeoutSignal;
  if (callerSignal.aborted) return callerSignal;

  const controller = new AbortController();
  const abort = () => controller.abort();
  timeoutSignal.addEventListener('abort', abort, { once: true });
  callerSignal.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

function unwrapParserEnvelope(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;

  if (root['ok'] === true && root['data'] && typeof root['data'] === 'object') {
    const data = root['data'] as Record<string, unknown>;
    return {
      ...data,
      requestId:
        typeof data['requestId'] === 'string'
          ? data['requestId']
          : typeof root['requestId'] === 'string'
            ? root['requestId']
            : undefined,
    };
  }

  return root;
}

function sanitizeDraft(raw: unknown): UniversalShiftSchedule | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const result = universalShiftScheduleSchema.safeParse(raw);
  if (!result.success) return undefined;

  const draft = result.data as UniversalShiftSchedule;
  // Force source to 'ai' — backend must not be trusted to set arbitrary sources
  return { ...draft, source: 'ai' as const };
}

interface LocalShiftSpec {
  id: string;
  name: string;
  kind: UniversalShiftKind;
  aliases: string[];
  color: string;
  icon: string;
  timePolicy: UniversalShiftTimePolicy;
  activePolicy: UniversalShiftActivePolicy;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  countsAsWork: boolean;
  countsAsNight: boolean;
  countsForStats: boolean;
}

const LOCAL_SHIFT_SPECS: LocalShiftSpec[] = [
  {
    id: 'day',
    name: 'Day Shift',
    kind: 'work',
    aliases: ['day', 'days', 'morning', 'mornings', 'early', 'earlies'],
    color: '#2196F3',
    icon: 'sunny',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '06:00',
    endTime: '18:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'evening',
    name: 'Evening Shift',
    kind: 'work',
    aliases: ['evening', 'evenings', 'swing', 'swings', 'late', 'lates', 'afternoon', 'afternoons'],
    color: '#FF9800',
    icon: 'cafe',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '14:00',
    endTime: '22:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'night',
    name: 'Night Shift',
    kind: 'work',
    aliases: ['night', 'nights', 'graveyard', 'graveyards'],
    color: '#7C4DFF',
    icon: 'moon',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '18:00',
    endTime: '06:00',
    crossesMidnight: true,
    countsAsWork: true,
    countsAsNight: true,
    countsForStats: true,
  },
  {
    id: 'off',
    name: 'Off',
    kind: 'off',
    aliases: ['off', 'rest', 'home', 'break', 'days off', 'rest days'],
    color: '#57534e',
    icon: 'home',
    timePolicy: 'none',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: false,
  },
  {
    id: 'travel',
    name: 'Travel Day',
    kind: 'travel',
    aliases: ['travel', 'travels', 'fly', 'fly-in', 'fly-out', 'mobilisation', 'mobilization'],
    color: '#00BCD4',
    icon: 'airplane',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'on-call',
    name: 'On Call',
    kind: 'on_call',
    aliases: ['on call', 'on-call', 'standby', 'callout', 'call-out'],
    color: '#E91E63',
    icon: 'phone-portrait',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'training',
    name: 'Training',
    kind: 'training',
    aliases: ['training', 'trainings', 'course', 'courses', 'induction', 'inductions'],
    color: '#4CAF50',
    icon: 'school',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '08:00',
    endTime: '16:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'leave',
    name: 'Leave',
    kind: 'leave',
    aliases: ['leave', 'vacation', 'holiday', 'pto', 'annual leave', 'sick leave'],
    color: '#8BC34A',
    icon: 'bed',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: false,
  },
];

function findCountForAliases(prompt: string, aliases: string[]): number {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[\\s-]+');
    const before = new RegExp(`(\\d+)\\s*(?:x\\s*)?(?:${escaped})\\b`, 'i').exec(prompt);
    if (before) return Number(before[1]);
    const after = new RegExp(`\\b(?:${escaped})\\s*(?:for\\s*)?(\\d+)\\b`, 'i').exec(prompt);
    if (after) return Number(after[1]);
  }
  return 0;
}

function findOnOffPattern(prompt: string): { on: number; off: number } | null {
  const match =
    /\b(\d+)\s*(?:days?\s*)?(?:on|work(?:ing)?|worked)\s*(?:,|\/|then|and)?\s*(\d+)\s*(?:days?\s*)?off\b/i.exec(
      prompt
    ) ??
    /\b(\d+)\s*(?:on|work(?:ing)?|worked)\s*(?:,|\/|then|and)?\s*(\d+)\s*(?:off|rest)\b/i.exec(
      prompt
    );

  if (!match) return null;
  const on = Number(match[1]);
  const off = Number(match[2]);
  return on > 0 && off > 0 ? { on, off } : null;
}

function parseOrdinal(text: string | undefined): number | null {
  if (!text) return null;
  const normalized = text.toLowerCase();
  const wordMap: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    eleventh: 11,
    twelfth: 12,
  };
  if (wordMap[normalized]) return wordMap[normalized];
  const numeric = /^(\d+)(?:st|nd|rd|th)?$/i.exec(normalized);
  return numeric ? Number(numeric[1]) : null;
}

function findRequestedCurrentSequenceIndex(
  prompt: string,
  matched: Array<{ spec: LocalShiftSpec; count: number }>
): number | null {
  const ordinalPattern =
    '(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\\d+(?:st|nd|rd|th)?)';

  for (const { spec } of matched) {
    for (const alias of spec.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[\\s-]+');
      const patterns = [
        new RegExp(
          `\\b(?:today|now|currently|current day|on shift)\\b[^.\\n]{0,80}?${ordinalPattern}\\s+${escaped}\\b`,
          'i'
        ),
        new RegExp(
          `\\b(?:make|set|mark)\\s+(?:today|now|current day)\\b[^.\\n]{0,80}?${ordinalPattern}\\s+${escaped}\\b`,
          'i'
        ),
        new RegExp(
          `\\b${ordinalPattern}\\s+${escaped}\\b[^.\\n]{0,80}?\\b(?:today|now|currently|current day)\\b`,
          'i'
        ),
      ];

      const ordinal = patterns
        .map((pattern) => pattern.exec(prompt))
        .find((match): match is RegExpExecArray => Boolean(match))?.[1];
      const occurrence = parseOrdinal(ordinal);
      if (!occurrence || occurrence < 1) continue;

      let index = 0;
      for (const item of matched) {
        if (item.spec.id === spec.id) {
          return occurrence <= item.count ? index + occurrence - 1 : null;
        }
        index += item.count;
      }
    }
  }

  return null;
}

function to24Hour(hourText: string, minuteText: string | undefined, meridiem: string): string {
  let hour = Number(hourText);
  if (meridiem.toLowerCase() === 'pm' && hour < 12) hour += 12;
  if (meridiem.toLowerCase() === 'am' && hour === 12) hour = 0;
  const minutes = Number(minuteText ?? '0');
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function findTimeRangeForSpec(
  prompt: string,
  spec: LocalShiftSpec
): Pick<UniversalShiftDefinition, 'startTime' | 'endTime' | 'crossesMidnight'> {
  for (const alias of spec.aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[\\s-]+');
    const re = new RegExp(
      `\\b${escaped}\\b[^.\\n]{0,80}?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)\\s*(?:to|until|-|–)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)`,
      'i'
    );
    const match = re.exec(prompt);
    if (!match) continue;
    const startTime = to24Hour(match[1] ?? '0', match[2], match[3] ?? 'am');
    const endTime = to24Hour(match[4] ?? '0', match[5], match[6] ?? 'pm');
    return {
      startTime,
      endTime,
      crossesMidnight:
        spec.crossesMidnight || (startTime >= endTime && spec.timePolicy === 'timed'),
    };
  }

  return {
    startTime: spec.startTime,
    endTime: spec.endTime,
    crossesMidnight: spec.crossesMidnight,
  };
}

function buildLocalParserFallback(
  request: ShiftScheduleParserRequest
): ShiftScheduleParserResult | null {
  const onOffPattern = findOnOffPattern(request.prompt);
  const matched = LOCAL_SHIFT_SPECS.map((spec) => {
    const count = findCountForAliases(request.prompt, spec.aliases);
    return count > 0 ? { spec, count } : null;
  }).filter((item): item is { spec: LocalShiftSpec; count: number } => item !== null);

  if (
    onOffPattern &&
    !matched.some(({ spec }) => spec.id === 'day') &&
    !matched.some(({ spec }) => spec.id === 'night') &&
    !matched.some(({ spec }) => spec.id === 'evening')
  ) {
    const daySpec = LOCAL_SHIFT_SPECS.find((spec) => spec.id === 'day');
    if (daySpec) matched.unshift({ spec: daySpec, count: onOffPattern.on });
  }

  if (onOffPattern && !matched.some(({ spec }) => spec.id === 'off')) {
    const offSpec = LOCAL_SHIFT_SPECS.find((spec) => spec.id === 'off');
    if (offSpec) matched.push({ spec: offSpec, count: onOffPattern.off });
  }

  if (matched.length === 0) return null;

  const stamp = Date.now().toString(36);
  const idMap = new Map<string, string>();
  const shiftDefinitions: UniversalShiftDefinition[] = matched.map(({ spec }, index) => {
    const id = `ai-${spec.id}-${index}-${stamp}`;
    idMap.set(spec.id, id);
    const timeRange = findTimeRangeForSpec(request.prompt, spec);
    return {
      id,
      name: spec.name,
      kind: spec.kind,
      timePolicy: spec.timePolicy,
      activePolicy: spec.activePolicy,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      crossesMidnight: timeRange.crossesMidnight,
      countsAsWork: spec.countsAsWork,
      countsAsNight: spec.countsAsNight,
      countsForStats: spec.countsForStats,
      color: spec.color,
      icon: spec.icon,
    };
  });

  const sequence = matched.flatMap(({ spec, count }) =>
    Array.from({ length: count }, (_, index) => ({
      id: `ai-item-${spec.id}-${index}-${stamp}`,
      shiftDefinitionId: idMap.get(spec.id) ?? spec.id,
    }))
  );
  const requestedCurrentIndex = findRequestedCurrentSequenceIndex(request.prompt, matched);

  const scheduleDraft: UniversalShiftSchedule = {
    version: 3,
    name: 'AI shift schedule',
    timezone: request.timezone,
    anchorDate: request.today,
    phaseOffset: requestedCurrentIndex ?? 0,
    shiftDefinitions,
    sequence,
    source: 'ai',
    aiDraftMeta: {
      originalPrompt: request.prompt,
      confidence: 0.62,
      assumptions: [
        'Used the local deterministic parser because the AI parser endpoint was unavailable.',
        'Used common default times where the prompt did not specify exact start and end times.',
        ...(requestedCurrentIndex !== null
          ? ['Lined up the cycle so the requested current shift lands on the match-from date.']
          : []),
      ],
      unresolvedQuestions: [],
    },
  };

  const sanitized = sanitizeDraft(scheduleDraft);
  if (!sanitized) return null;

  return {
    status: 'draft',
    scheduleDraft: sanitized,
    summary: 'I created a draft from the repeating universal shift pattern.',
    assumptions: sanitized.aiDraftMeta?.assumptions ?? [],
    questions: [],
    warnings: ['AI parser endpoint was unavailable, so Ellie used the built-in pattern parser.'],
    confidence: sanitized.aiDraftMeta?.confidence ?? 0.62,
  };
}

export async function parseShiftScheduleDescription(
  request: ShiftScheduleParserRequest,
  signal?: AbortSignal
): Promise<ShiftScheduleParserResult> {
  const parserUrl = config.shiftScheduleParser.url;
  const timeoutMs = config.shiftScheduleParser.timeoutMs;
  const maxLen = config.shiftScheduleParser.maxPromptLength;
  const prompt = request.prompt.trim();

  if (!prompt) {
    throw new ShiftScheduleParserError(
      'PROMPT_EMPTY',
      'Please describe your shift schedule.',
      false
    );
  }
  if (prompt.length > maxLen) {
    throw new ShiftScheduleParserError(
      'PROMPT_TOO_LONG',
      `Description is too long (max ${maxLen} characters).`,
      false
    );
  }

  if (!isConfiguredUrl(parserUrl)) {
    const fallback = buildLocalParserFallback({ ...request, prompt });
    if (fallback) return fallback;

    throw new ShiftScheduleParserError(
      'NOT_CONFIGURED',
      'AI shift parser is not configured. You can still build your schedule manually.',
      false
    );
  }

  const timeoutController = new AbortController();
  const combinedSignal = combineAbortSignals(timeoutController.signal, signal);
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  try {
    const response = await fetch(parserUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: combinedSignal,
    });

    clearTimeout(timer);

    if (response.status === 429) {
      throw new ShiftScheduleParserError(
        'RATE_LIMITED',
        'Too many requests. Please wait a moment and try again.',
        true
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        const fallback = buildLocalParserFallback({ ...request, prompt });
        if (fallback) return fallback;
      }
      throw new ShiftScheduleParserError(
        'SERVER_ERROR',
        `Server returned ${response.status}. Please try again.`,
        response.status >= 500
      );
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ShiftScheduleParserError(
        'MALFORMED_RESPONSE',
        'The server returned an unexpected response. Please try again.',
        true
      );
    }

    const raw = unwrapParserEnvelope(json);

    if (!raw || typeof raw !== 'object') {
      throw new ShiftScheduleParserError(
        'MALFORMED_RESPONSE',
        'The server returned an empty response.',
        true
      );
    }

    const status = raw['status'];
    if (status !== 'draft' && status !== 'needs_clarification' && status !== 'invalid') {
      throw new ShiftScheduleParserError(
        'MALFORMED_RESPONSE',
        'The server returned an unrecognized status.',
        true
      );
    }

    let scheduleDraft: UniversalShiftSchedule | undefined;
    if (raw['scheduleDraft']) {
      scheduleDraft = sanitizeDraft(raw['scheduleDraft']);
      if (!scheduleDraft && status === 'draft') {
        throw new ShiftScheduleParserError(
          'SCHEMA_VALIDATION_FAILED',
          'The AI generated an invalid schedule structure. Please try rephrasing.',
          false
        );
      }
    }

    return {
      status: status as ShiftScheduleParserResult['status'],
      scheduleDraft,
      summary: typeof raw['summary'] === 'string' ? raw['summary'] : '',
      assumptions: Array.isArray(raw['assumptions'])
        ? (raw['assumptions'] as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      questions: Array.isArray(raw['questions'])
        ? (raw['questions'] as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      warnings: Array.isArray(raw['warnings'])
        ? (raw['warnings'] as unknown[]).filter((x): x is string => typeof x === 'string')
        : [],
      confidence: typeof raw['confidence'] === 'number' ? raw['confidence'] : 0,
      requestId: typeof raw['requestId'] === 'string' ? raw['requestId'] : undefined,
    };
  } catch (err) {
    clearTimeout(timer);

    if (err instanceof ShiftScheduleParserError) throw err;

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new ShiftScheduleParserError(
          'TIMEOUT',
          'The request timed out. Please check your connection and try again.',
          true
        );
      }

      const message = err.message.toLowerCase();
      if (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('failed to fetch') ||
        message.includes('load failed')
      ) {
        throw new ShiftScheduleParserError(
          'NETWORK_ERROR',
          'No network connection. You can still build your schedule manually.',
          true
        );
      }
    }

    throw new ShiftScheduleParserError(
      'NETWORK_ERROR',
      'Unable to reach the AI parser. You can still build your schedule manually.',
      true
    );
  }
}

/** True if AI parsing is available (URL is configured). */
export function isAiParserAvailable(): boolean {
  return isConfiguredUrl(config.shiftScheduleParser.url);
}
