/**
 * Backend Type Definitions
 *
 * Shared types for the Ellie Brain Cloud Function.
 * Mirrors relevant client-side types.
 */

export type ShiftType = 'day' | 'night' | 'morning' | 'afternoon' | 'off';
export type RosterType = 'rotating' | 'fifo';

export interface FIFOConfig {
  workBlockDays: number;
  restBlockDays: number;
  workBlockPattern: 'straight-days' | 'straight-nights' | 'swing' | 'custom';
  swingPattern?: {
    daysOnDayShift: number;
    daysOnNightShift: number;
  };
  customWorkSequence?: ShiftType[];
  flyInDay?: number;
  flyOutDay?: number;
  siteName?: string;
}

export interface ShiftCycle {
  patternType: string;
  shiftSystem?: string;
  rosterType?: RosterType;
  daysOn: number;
  nightsOn: number;
  morningOn?: number;
  afternoonOn?: number;
  nightOn?: number;
  daysOff: number;
  startDate: string;
  phaseOffset: number;
  fifoConfig?: FIFOConfig;
}

export interface ShiftDay {
  date: string;
  isWorkDay: boolean;
  isNightShift: boolean;
  shiftType: ShiftType;
}

export interface EllieBrainRequest {
  query: string;
  userContext: {
    name: string;
    occupation?: string;
    shiftCycle: ShiftCycle;
    rosterType?: RosterType;
    fifoConfig?: FIFOConfig;
    currentDate: string;
    currentTime: string;
    shiftSystem: '2-shift' | '3-shift';
    shiftTimes?: Array<{
      type: string;
      startTime: string;
      endTime: string;
    }>;
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    text: string;
  }>;
}

export interface EllieBrainResponse {
  text: string;
  shiftData?: {
    toolName: string;
    data: unknown;
  };
  requestId?: string;
}

export type EllieBrainErrorCode =
  | 'invalid_request'
  | 'missing_user_context'
  | 'invalid_user_context'
  | 'rate_limited'
  | 'provider_timeout'
  | 'provider_error'
  | 'internal_error';

export interface EllieBrainError {
  code: EllieBrainErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
}

export interface EllieBrainSuccessEnvelope {
  ok: true;
  requestId: string;
  data: EllieBrainResponse;
}

export interface EllieBrainErrorEnvelope {
  ok: false;
  requestId: string;
  error: EllieBrainError;
}

export type EllieBrainResponseEnvelope = EllieBrainSuccessEnvelope | EllieBrainErrorEnvelope;

export interface QueryProcessingOptions {
  requestId: string;
  timeoutMs: number;
}
