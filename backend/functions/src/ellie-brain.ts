/**
 * Ellie Brain — OpenAI API Handler
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
  EllieBrainErrorCode,
  EllieBrainRequest,
  EllieBrainResponse,
  QueryProcessingOptions,
} from './types';

const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TOOL_ROUNDS = 5;
const DEFAULT_PROVIDER_TIMEOUT_MS = 25000;

interface OpenAIErrorShape {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
}

export class EllieBrainProcessingError extends Error {
  readonly code: EllieBrainErrorCode;
  readonly retryable: boolean;
  readonly statusCode: number;
  readonly providerStatus?: number;

  constructor(
    code: EllieBrainErrorCode,
    message: string,
    retryable: boolean,
    statusCode: number,
    providerStatus?: number
  ) {
    super(message);
    this.name = 'EllieBrainProcessingError';
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.providerStatus = providerStatus;
  }
}

function mapProviderError(error: unknown): EllieBrainProcessingError {
  if (error instanceof EllieBrainProcessingError) {
    return error;
  }

  const providerError = error as OpenAIErrorShape;
  const status = typeof providerError.status === 'number' ? providerError.status : undefined;
  const code = String(providerError.code ?? '').toLowerCase();
  const type = String(providerError.type ?? '').toLowerCase();
  const message = providerError.message || 'Provider request failed';

  if (status === 429) {
    return new EllieBrainProcessingError(
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
    return new EllieBrainProcessingError(
      'provider_timeout',
      'Provider request timed out.',
      true,
      504,
      status
    );
  }

  if (status && status >= 500) {
    return new EllieBrainProcessingError(
      'provider_error',
      'Provider temporarily unavailable.',
      true,
      502,
      status
    );
  }

  if (status && status >= 400) {
    return new EllieBrainProcessingError(
      'provider_error',
      'Provider rejected the request.',
      false,
      502,
      status
    );
  }

  return new EllieBrainProcessingError('internal_error', message, true, 500);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new EllieBrainProcessingError(
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
        'Get the shift type for a specific date. Use when the user asks about a particular date.',
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
        'Get all shifts in a date range. Use for queries about a week, month, or period.',
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
            enum: ['day', 'night', 'morning', 'afternoon', 'off'],
            description: 'The shift type to find',
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
];

/**
 * Build the system prompt for the model.
 */
function buildSystemPrompt(request: EllieBrainRequest): string {
  const ctx = request.userContext;
  const shiftSystemDesc =
    ctx.shiftSystem === '2-shift'
      ? '2-shift system (12-hour shifts: day and night)'
      : '3-shift system (8-hour shifts: morning, afternoon, and night)';

  return `You are Ellie, a friendly and helpful voice assistant for shift workers. You help ${ctx.name} understand their work schedule.

PERSONALITY:
- Warm, concise, and empathetic to shift workers
- Use second person ("you have a night shift") not third person
- Keep responses under 2-3 sentences for voice readability
- When mentioning dates, use natural language ("this Saturday, December 5th")
- For shift types, use friendly names: "day shift", "night shift", "morning shift", "afternoon shift", "day off"
- Be conversational and supportive

CONTEXT:
- Current date: ${ctx.currentDate}
- Current time: ${ctx.currentTime}
- User's shift system: ${shiftSystemDesc}
- User's name: ${ctx.name}${ctx.occupation ? `\n- User's occupation: ${ctx.occupation}` : ''}

RULES:
- Always use the provided tools to look up shift data. Never guess or make up schedules.
- If the user asks about a specific date, use get_shift_for_date.
- If they ask about a range (week, month), use get_shifts_in_range.
- If they ask "am I working now/today", use get_current_status.
- If they ask about counts or statistics, use get_statistics.
- For "next day off" or "next night shift", use get_next_occurrence.
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
  request: EllieBrainRequest,
  openaiApiKey: string,
  options: QueryProcessingOptions
): Promise<EllieBrainResponse> {
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
