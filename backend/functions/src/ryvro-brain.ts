/**
 * Ryvro voice backend — OpenAI API Handler
 *
 * Processes user queries using OpenAI with function tools.
 * Implements a tool loop: model calls tools, we execute them,
 * then send results back until a final text response is produced.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from 'openai/resources/chat/completions';
import { executeTool } from './shift-tools';
import {
  RyvroBrainErrorCode,
  RyvroBrainRequest,
  RyvroBrainResponse,
  QueryProcessingOptions,
} from './types';

const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 5;
const DEFAULT_PROVIDER_TIMEOUT_MS = 25000;

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

interface OpenAIErrorShape {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
}

export class RyvroBrainProcessingError extends Error {
  readonly code: RyvroBrainErrorCode;
  readonly retryable: boolean;
  readonly statusCode: number;
  readonly providerStatus?: number;

  constructor(
    code: RyvroBrainErrorCode,
    message: string,
    retryable: boolean,
    statusCode: number,
    providerStatus?: number
  ) {
    super(message);
    this.name = 'RyvroBrainProcessingError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.providerStatus = providerStatus;
  }
}

function parseLocalDate(dateText: string): Date {
  return new Date(`${dateText}T00:00:00`);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function cleanQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function monthIndex(monthName: string): number {
  return MONTH_NAMES.indexOf(monthName.toLowerCase() as (typeof MONTH_NAMES)[number]);
}

function weekdayIndex(weekdayName: string): number {
  return WEEKDAY_NAMES.indexOf(weekdayName.toLowerCase() as (typeof WEEKDAY_NAMES)[number]);
}

function stripOrdinalSuffix(value: string): number {
  return Number(value.replace(/(st|nd|rd|th)$/i, ''));
}

function parseMonthDay(monthName: string, dayText: string, fallbackYear: number): Date | undefined {
  const month = monthIndex(monthName);
  const day = stripOrdinalSuffix(dayText);
  if (month < 0 || !Number.isFinite(day) || day < 1 || day > 31) {
    return undefined;
  }
  return new Date(fallbackYear, month, day);
}

function resolveOrdinalWeekdayInMonth(
  query: string,
  fallbackYear: number
): { date: string } | undefined {
  const match = query.match(
    /\b(first|second|third|fourth|fifth)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+(?:in|of)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/
  );

  if (!match) {
    return undefined;
  }

  const ordinal = ORDINALS[match[1]];
  const weekday = weekdayIndex(match[2]);
  const month = monthIndex(match[3]);
  if (!ordinal || weekday < 0 || month < 0) {
    return undefined;
  }

  const firstOfMonth = new Date(fallbackYear, month, 1);
  const offset = (weekday - firstOfMonth.getDay() + 7) % 7;
  const resolved = addDays(firstOfMonth, offset + (ordinal - 1) * 7);
  if (resolved.getMonth() !== month) {
    return undefined;
  }

  return { date: toDateString(resolved) };
}

function resolveDirectDateRange(
  query: string,
  currentDate: Date
): { startDate: string; endDate: string } | undefined {
  const nextDaysMatch = query.match(/\bnext\s+(\d{1,2})\s+days?\b/);
  if (nextDaysMatch) {
    const days = Number(nextDaysMatch[1]);
    if (Number.isFinite(days) && days > 0 && days <= 62) {
      return {
        startDate: toDateString(currentDate),
        endDate: toDateString(addDays(currentDate, days - 1)),
      };
    }
  }

  if (/\blast\s+week\b|\bprevious\s+week\b/.test(query)) {
    const thisWeekStart = startOfWeek(currentDate);
    const previousWeekStart = addDays(thisWeekStart, -7);
    return {
      startDate: toDateString(previousWeekStart),
      endDate: toDateString(addDays(previousWeekStart, 6)),
    };
  }

  if (/\bfrom\s+today\s+to\s+(?:the\s+)?end\s+of\s+(?:the\s+)?month\b/.test(query)) {
    return {
      startDate: toDateString(currentDate),
      endDate: toDateString(endOfMonth(currentDate)),
    };
  }

  if (/\bend\s+of\s+(?:the\s+)?month\b/.test(query)) {
    const monthEnd = endOfMonth(currentDate);
    return {
      startDate: toDateString(addDays(monthEnd, -6)),
      endDate: toDateString(monthEnd),
    };
  }

  const monthNames = MONTH_NAMES.join('|');
  const dayPattern = String.raw`\d{1,2}(?:st|nd|rd|th)?`;
  const monthRangeMatch = query.match(
    new RegExp(
      String.raw`\b(?:from|between)\s+(${monthNames})\s+(${dayPattern})\s+(?:to|and)\s+(?:(${monthNames})\s+)?(${dayPattern})\b`
    )
  );
  if (monthRangeMatch) {
    const start = parseMonthDay(monthRangeMatch[1], monthRangeMatch[2], currentDate.getFullYear());
    const end = parseMonthDay(
      monthRangeMatch[3] ?? monthRangeMatch[1],
      monthRangeMatch[4],
      currentDate.getFullYear()
    );
    if (start && end) {
      if (end < start) {
        end.setFullYear(end.getFullYear() + 1);
      }
      return { startDate: toDateString(start), endDate: toDateString(end) };
    }
  }

  const sameMonthRangeMatch = query.match(
    new RegExp(
      String.raw`\bfrom\s+(?:the\s+)?(${dayPattern})\s+to\s+(?:the\s+)?(${dayPattern})\s+of\s+(${monthNames})\b`
    )
  );
  if (sameMonthRangeMatch) {
    const start = parseMonthDay(
      sameMonthRangeMatch[3],
      sameMonthRangeMatch[1],
      currentDate.getFullYear()
    );
    const end = parseMonthDay(
      sameMonthRangeMatch[3],
      sameMonthRangeMatch[2],
      currentDate.getFullYear()
    );
    if (start && end) {
      return { startDate: toDateString(start), endDate: toDateString(end) };
    }
  }

  return undefined;
}

function isShiftQuestion(query: string): boolean {
  return /\b(shift|work|working|off|schedule|roster|am i|do i|have|next|from|between|last week|end of)\b/.test(
    query
  );
}

export function resolveDirectScheduleQuery(
  request: RyvroBrainRequest
): { toolName: string; input: Record<string, unknown> } | undefined {
  const query = cleanQuery(request.query);
  if (!isShiftQuestion(query)) {
    return undefined;
  }

  const currentDate = parseLocalDate(request.userContext.currentDate);
  const exactDate = resolveOrdinalWeekdayInMonth(query, currentDate.getFullYear());
  if (exactDate) {
    return { toolName: 'get_shift_for_date', input: exactDate };
  }

  const range = resolveDirectDateRange(query, currentDate);
  if (range) {
    return { toolName: 'get_shifts_in_range', input: range };
  }

  return undefined;
}

function tryDirectScheduleAnswer(
  request: RyvroBrainRequest,
  requestId: string
): RyvroBrainResponse | undefined {
  const directQuery = resolveDirectScheduleQuery(request);
  if (!directQuery) {
    return undefined;
  }

  const toolResult = executeTool(
    directQuery.toolName,
    directQuery.input,
    request.userContext.shiftCycle
  );

  return {
    text:
      directQuery.toolName === 'get_shifts_in_range'
        ? 'Here is your shift schedule for that date range.'
        : 'Here is your shift for that date.',
    shiftData: {
      toolName: directQuery.toolName,
      data: toolResult,
    },
    requestId,
  };
}

function mapProviderError(error: unknown): RyvroBrainProcessingError {
  if (error instanceof RyvroBrainProcessingError) {
    return error;
  }

  const providerError = error as OpenAIErrorShape;
  const status = typeof providerError.status === 'number' ? providerError.status : undefined;
  const code = String(providerError.code ?? '').toLowerCase();
  const type = String(providerError.type ?? '').toLowerCase();
  const message = providerError.message || 'Provider request failed';

  if (status === 429) {
    return new RyvroBrainProcessingError(
      'rate_limited',
      'Too many requests. Please retry shortly.',
      true,
      429,
      status
    );
  }

  if (
    status === 408 ||
    status === 504 ||
    code.includes('timeout') ||
    type.includes('timeout') ||
    message.toLowerCase().includes('timeout')
  ) {
    return new RyvroBrainProcessingError(
      'provider_timeout',
      'Provider request timed out.',
      true,
      504,
      status
    );
  }

  if (status && status >= 500) {
    return new RyvroBrainProcessingError(
      'provider_error',
      'Provider temporarily unavailable.',
      true,
      502,
      status
    );
  }

  if (status && status >= 400) {
    return new RyvroBrainProcessingError(
      'provider_error',
      'Provider rejected the request.',
      false,
      502,
      status
    );
  }

  return new RyvroBrainProcessingError('internal_error', message, true, 500);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new RyvroBrainProcessingError(
            'provider_timeout',
            'Provider request timed out.',
            true,
            504
          )
        );
      }, timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * OpenAI tool definitions for shift queries.
 */
const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_shift_for_date',
      description:
        'Get the shift type for a specific date. Use when the user asks about one exact date, including natural phrases such as today, tomorrow, Friday, Saturday two weeks from now, or next two weeks Saturday after you resolve them to YYYY-MM-DD.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date to check in YYYY-MM-DD format',
          },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_shifts_in_range',
      description:
        'Get all shifts in a date range. Use for queries about a week, weekend, month, next 7 days, next 14 days, last week, end of the month, or a spoken date range such as from June 12 to June 27 after resolving the natural range to YYYY-MM-DD startDate and endDate.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        },
        required: ['startDate', 'endDate'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_status',
      description: "Get the user's current shift status. Use for 'Am I working today?'",
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_statistics',
      description: 'Get shift statistics for a time period.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          endDate: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        },
        required: ['startDate', 'endDate'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_next_occurrence',
      description: 'Find the next occurrence of a specific shift type.',
      parameters: {
        type: 'object',
        properties: {
          shiftType: {
            type: 'string',
            enum: [
              'day',
              'night',
              'morning',
              'afternoon',
              'off',
              'work',
              'travel',
              'on_call',
              'training',
              'leave',
              'custom',
            ],
            description:
              'The shift type or universal shift kind to find. For universal schedules, use travel, on_call, training, leave, custom, work, night, or off when relevant.',
          },
          fromDate: {
            type: 'string',
            description: 'Start searching from this date (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: ['shiftType'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_next_work_block',
      description:
        'Find the next date when a work block starts. Useful for FIFO and rotating schedules.',
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description: 'Start searching from this date (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_next_rest_block',
      description:
        'Find the next date when a rest/off block starts. Useful for FIFO and rotating schedules.',
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description: 'Start searching from this date (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'days_until_work',
      description: 'Get number of days until work starts (or 0 if currently in a work block).',
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description: 'Date to measure from (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'days_until_rest',
      description: 'Get number of days until rest/off starts (or 0 if currently resting).',
      parameters: {
        type: 'object',
        properties: {
          fromDate: {
            type: 'string',
            description: 'Date to measure from (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'current_block_info',
      description:
        'Get current block status (work/rest), day in block, block length, and days until block change.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date to inspect (YYYY-MM-DD). Defaults to today.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
];

/**
 * Build the system prompt for the model.
 */
export function buildSystemPrompt(request: RyvroBrainRequest): string {
  const ctx = request.userContext;
  const shiftSystemDesc =
    ctx.shiftSystem === '2-shift'
      ? '2-shift system (12-hour shifts: day and night)'
      : '3-shift system (8-hour shifts: morning, afternoon, and night)';
  const rosterTypeDesc = ctx.rosterType === 'fifo' ? 'FIFO / block roster' : 'rotating roster';
  const universalSchedule =
    ctx.shiftCycle.scheduleMode === 'universal' ? ctx.shiftCycle.universalSchedule : undefined;
  const universalShiftTypes = universalSchedule
    ? universalSchedule.shiftDefinitions
        .map((definition) => `${definition.name} (${definition.kind})`)
        .join(', ')
    : '';

  return `You are Ryvro, a friendly and helpful voice assistant for shift workers. You help ${ctx.name} understand their work schedule.

PERSONALITY:
- Warm, concise, and empathetic to shift workers
- Use second person ("you have a night shift") not third person
- Keep responses under 2-3 sentences for voice readability
- When mentioning dates, use natural language ("this Saturday, December 5th")
- For shift types, use friendly names: "day shift", "night shift", "morning shift", "afternoon shift", "day off"
- Be conversational and supportive
- Treat mining, FIFO, offshore, hospital, security, factory, transport, hospitality, aviation, rail, and other industries as examples only. Do not assume the user works in mining, FIFO, or at a site unless their profile or schedule says so.
- Use "work location" when speaking generally; use the user's exact location, site, ward, depot, terminal, plant, venue, rig, or station only when it is present in context.

CONTEXT:
- Current date: ${ctx.currentDate}
- Current time: ${ctx.currentTime}
- User's shift system: ${shiftSystemDesc}
- User's roster type: ${rosterTypeDesc}
- Schedule mode: ${universalSchedule ? 'universal custom schedule' : 'legacy shift pattern'}${
    universalSchedule ? `\n- Universal shift types: ${universalShiftTypes}` : ''
  }
- User's name: ${ctx.name}${ctx.occupation ? `\n- User's occupation: ${ctx.occupation}` : ''}
- Industry assumption: none unless occupation, roster type, or schedule location makes it explicit.

RULES:
- Always use the provided tools to look up shift data. Never guess or make up schedules.
- If the user asks about a specific date, use get_shift_for_date.
- If they ask about a range (week, month, next 7 days, next 14 days, last week, end of the month, from June 12 to June 27), use get_shifts_in_range.
- Treat natural date phrases as dates before answering. Examples: "Saturday two weeks from now" and "next two weeks Saturday" mean the Saturday in the week that starts two weeks from the current date. "Next two Saturdays" means answer both upcoming Saturdays.
- For week ranges, "this week" means the current Sunday through Saturday calendar week, and "next week" means the following Sunday through Saturday calendar week. If the user adds a weekday, for example "next week Saturday" or "Saturday next week", answer that weekday inside the following Sunday-through-Saturday week, not the immediate upcoming weekday.
- For month ranges, "this month" means the current calendar month, and "next month" means the following calendar month.
- "Next 7 days" means the current date through six days after the current date. "Next 14 days" means the current date through thirteen days after the current date.
- "Last week" means the previous Sunday through Saturday calendar week.
- "End of the month" means the final seven calendar days of the current month. "From today to the end of the month" means the current date through the final calendar day of the current month.
- Date ranges such as "from June 12 to June 27" and "from the 12th to the 27th of June" are inclusive and should use get_shifts_in_range.
- Ordinal weekday phrases such as "first Saturday in August" are exact dates and should use get_shift_for_date.
- For all range questions, call get_shifts_in_range instead of answering from memory so the app can display and speak a grouped schedule.
- If a date phrase can reasonably mean two different things, ask one short clarification question before using a tool. Do not guess.
- If they ask "am I working now/today", use get_current_status.
- If they ask about counts or statistics, use get_statistics.
- For "next day off", "next night shift", or a named universal shift such as on-call, training, travel, leave, or custom work, use get_next_occurrence.
- For block-based questions ("next swing", "next work block", "next rest/home block"), use get_next_work_block or get_next_rest_block.
- For "how many days until work/home", use days_until_work or days_until_rest.
- For "what block am I in", use current_block_info.
- If the user mentions a personal event on a date, acknowledge it warmly before giving the shift info.
- If the user's question is not about shifts, politely let them know you specialize in shift schedule questions.`;
}

/**
 * Parse model tool arguments safely.
 */
function parseToolArgs(args: string): Record<string, unknown> {
  if (!args || !args.trim()) return {};
  try {
    const parsed = JSON.parse(args);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Process a query through OpenAI with tool use loop.
 */
export async function processQuery(
  request: RyvroBrainRequest,
  openaiApiKey: string,
  options: QueryProcessingOptions
): Promise<RyvroBrainResponse> {
  const directAnswer = tryDirectScheduleAnswer(request, options.requestId);
  if (directAnswer) {
    return directAnswer;
  }

  const client = new OpenAI({ apiKey: openaiApiKey });
  const providerTimeoutMs = options.timeoutMs || DEFAULT_PROVIDER_TIMEOUT_MS;

  const systemPrompt = buildSystemPrompt(request);

  // Build initial messages from conversation history + current query
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  if (request.conversationHistory) {
    for (const msg of request.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.text,
      });
    }
  }

  messages.push({
    role: 'user',
    content: request.query,
  });

  let lastShiftData: { toolName: string; data: unknown } | undefined;

  // Tool loop — model may call multiple tools in sequence
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await withTimeout(
        client.chat.completions.create({
          model: OPENAI_MODEL,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          temperature: 0.3,
        }),
        providerTimeoutMs
      );

      const assistant = completion.choices[0]?.message;
      if (!assistant) {
        break;
      }

      const toolCalls = assistant.tool_calls ?? [];

      messages.push({
        role: 'assistant',
        content: assistant.content ?? '',
        tool_calls: toolCalls,
      });

      if (toolCalls.length === 0) {
        const responseText = (assistant.content || '').trim();
        return {
          text: responseText || "I'm sorry, I couldn't generate a response. Please try again.",
          shiftData: lastShiftData,
          requestId: options.requestId,
        };
      }

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') {
          continue;
        }

        const toolName = toolCall.function.name;
        const input = parseToolArgs(toolCall.function.arguments);
        const toolResult = executeTool(toolName, input, request.userContext.shiftCycle);

        lastShiftData = {
          toolName,
          data: toolResult,
        };

        const toolMessage: ChatCompletionToolMessageParam = {
          role: 'tool',
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
        };

        messages.push(toolMessage);
      }
    }
  } catch (error) {
    throw mapProviderError(error);
  }

  return {
    text: "I'm sorry, I had trouble processing your question. Please try asking in a different way.",
    shiftData: lastShiftData,
    requestId: options.requestId,
  };
}
