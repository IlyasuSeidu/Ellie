/**
 * Voice Assistant Prompts & Tool Definitions
 *
 * System prompt and Claude tool definitions for the Ellie voice assistant.
 * These are used by the backend Cloud Function when calling Claude API.
 * Kept in the frontend codebase for reference and testing.
 */

import type { VoiceAssistantUserContext } from '@/types/voiceAssistant';

/**
 * Build the system prompt for Claude based on user context.
 */
export function buildSystemPrompt(context: VoiceAssistantUserContext): string {
  const shiftSystemDesc =
    context.shiftSystem === '2-shift'
      ? '2-shift system (12-hour shifts: day and night)'
      : '3-shift system (8-hour shifts: morning, afternoon, and night)';
  const rosterTypeDesc = context.rosterType === 'fifo' ? 'FIFO / block roster' : 'rotating roster';

  return `You are Ellie, a friendly and helpful voice assistant for shift workers. You help ${context.name} understand their work schedule.

PERSONALITY:
- Warm, concise, and empathetic to shift workers
- Use second person ("you have a night shift") not third person
- Keep responses under 2-3 sentences for voice readability
- When mentioning dates, use natural language ("this Saturday, December 5th")
- For shift types, use friendly names: "day shift", "night shift", "morning shift", "afternoon shift", "day off"
- Be conversational and supportive

CONTEXT:
- Current date: ${context.currentDate}
- Current time: ${context.currentTime}
- User's shift system: ${shiftSystemDesc}
- User's roster type: ${rosterTypeDesc}
- User's name: ${context.name}${context.occupation ? `\n- User's occupation: ${context.occupation}` : ''}

RULES:
- Always use the provided tools to look up shift data. Never guess or make up schedules.
- If the user asks about a specific date, use get_shift_for_date.
- If they ask about a range (week, month), use get_shifts_in_range.
- If they ask "am I working now/today", use get_current_status.
- If they ask about counts or statistics, use get_statistics.
- For "next day off" or "next night shift", use get_next_occurrence.
- For block-based questions ("next swing", "next work block", "next rest/home block"), use get_next_work_block or get_next_rest_block.
- For "how many days until work/home", use days_until_work or days_until_rest.
- For "what block am I in", use current_block_info.
- If the user mentions a personal event on a date, acknowledge it warmly before giving the shift info.
- If the user's question is not about shifts, politely let them know you specialize in shift schedule questions.`;
}

/**
 * Tool definitions for the Claude API.
 * These define what tools Claude can call during conversation.
 */
export const CLAUDE_TOOL_DEFINITIONS = [
  {
    name: 'get_shift_for_date',
    description:
      'Get the shift type for a specific date. Use when the user asks about a particular date like "What shift do I have on December 5th?" or "Am I working on Friday?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string' as const,
          description: 'The date to check in YYYY-MM-DD format',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_shifts_in_range',
    description:
      'Get all shifts in a date range. Use for queries like "What shifts do I have next week?", "Show me my schedule for March", or "What am I working this week?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string' as const,
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string' as const,
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_current_status',
    description:
      'Get the user\'s current shift status right now. Use for questions like "Am I working today?", "What shift am I on?", "Am I working right now?"',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'get_statistics',
    description:
      'Get shift statistics for a time period. Use for questions like "How many night shifts do I have this month?", "How many days off in March?", "What\'s my work schedule like this month?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: {
          type: 'string' as const,
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: 'string' as const,
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_next_occurrence',
    description:
      'Find the next occurrence of a specific shift type. Use for "When is my next day off?", "When do I next work a night shift?", "When is my next morning shift?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        shiftType: {
          type: 'string' as const,
          enum: ['day', 'night', 'morning', 'afternoon', 'off'],
          description: 'The shift type to find the next occurrence of',
        },
        fromDate: {
          type: 'string' as const,
          description:
            'Start searching from this date (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: ['shiftType'],
    },
  },
  {
    name: 'get_next_work_block',
    description:
      'Find the next date when a work block starts. Useful for FIFO and rotating questions like "when do I swing back in?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        fromDate: {
          type: 'string' as const,
          description:
            'Start searching from this date (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_next_rest_block',
    description:
      'Find the next date when a rest/home block starts. Useful for "when am I next off-site?"',
    input_schema: {
      type: 'object' as const,
      properties: {
        fromDate: {
          type: 'string' as const,
          description:
            'Start searching from this date (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'days_until_work',
    description: 'Get number of days until work starts, or 0 if currently in a work block.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fromDate: {
          type: 'string' as const,
          description: 'Date to measure from (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'days_until_rest',
    description: 'Get number of days until rest/home starts, or 0 if currently in a rest block.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fromDate: {
          type: 'string' as const,
          description: 'Date to measure from (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: [] as string[],
    },
  },
  {
    name: 'current_block_info',
    description:
      'Get current block status (work/rest), day-in-block, block length, and days until block change.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string' as const,
          description: 'Date to inspect (YYYY-MM-DD). Defaults to today if not provided.',
        },
      },
      required: [] as string[],
    },
  },
];
