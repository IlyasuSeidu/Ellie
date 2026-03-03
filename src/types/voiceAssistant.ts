/**
 * Voice Assistant Type Definitions
 *
 * Types for the Ellie voice assistant feature including
 * conversation state, messages, tool calls, and service interfaces.
 */

import type { ShiftCycle, ShiftType } from './index';
import type { OnboardingData } from '@/contexts/OnboardingContext';

/**
 * Voice assistant operational states
 */
export type VoiceAssistantState =
  | 'idle' // Button visible, not active
  | 'listening' // Microphone active, capturing speech
  | 'processing' // Sending to backend, awaiting response
  | 'speaking' // TTS playing response
  | 'error'; // Error state with retry option

/**
 * Message role in conversation
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Single conversation message
 */
export interface VoiceMessage {
  /** Unique message ID */
  id: string;
  /** Who sent the message */
  role: MessageRole;
  /** Text content */
  text: string;
  /** When the message was created */
  timestamp: number;
  /** Optional shift data attached to assistant response */
  shiftData?: ShiftQueryResult;
}

/**
 * Result from a shift query tool call
 */
export interface ShiftQueryResult {
  /** The tool that was called */
  toolName: string;
  /** Raw result data */
  data: unknown;
}

/**
 * User context sent to the backend with each query
 */
export interface VoiceAssistantUserContext {
  /** User's first name */
  name: string;
  /** User's occupation */
  occupation?: string;
  /** Serialized ShiftCycle */
  shiftCycle: ShiftCycle;
  /** Current date in YYYY-MM-DD */
  currentDate: string;
  /** Current time in HH:MM */
  currentTime: string;
  /** Shift system type */
  shiftSystem: '2-shift' | '3-shift';
  /** Shift times configuration */
  shiftTimes?: OnboardingData['shiftTimes'];
  /** Roster paradigm hint for backend prompt/tool behavior */
  rosterType?: ShiftCycle['rosterType'];
  /** FIFO block configuration when rosterType is fifo */
  fifoConfig?: ShiftCycle['fifoConfig'];
}

/**
 * Request payload to the backend
 */
export interface EllieBrainRequest {
  /** Transcribed user query */
  query: string;
  /** User context for personalized responses */
  userContext: VoiceAssistantUserContext;
  /** Previous messages for multi-turn conversation (last 6) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

/**
 * Response from the backend
 */
export interface EllieBrainResponse {
  /** Natural language response text */
  text: string;
  /** Optional structured shift data */
  shiftData?: ShiftQueryResult;
  /** Optional request id for diagnostics */
  requestId?: string;
}

/**
 * Normalized backend error payload.
 */
export interface EllieBrainErrorPayload {
  /** Stable machine-readable code */
  code:
    | 'invalid_request'
    | 'missing_user_context'
    | 'invalid_user_context'
    | 'rate_limited'
    | 'provider_timeout'
    | 'provider_error'
    | 'internal_error'
    | 'malformed_response'
    | 'network_unreachable'
    | 'request_cancelled';
  /** Human-readable message for UI/logs */
  message: string;
  /** Whether the operation should be retried */
  retryable: boolean;
  /** Optional request id for cross-system tracing */
  requestId?: string;
  /** Optional HTTP status from backend transport */
  statusCode?: number;
}

/**
 * Backward-compatible backend response envelope.
 */
export interface EllieBrainResponseEnvelope {
  ok?: boolean;
  requestId?: string;
  data?: EllieBrainResponse;
  error?: EllieBrainErrorPayload | string;
}

/**
 * Speech recognition event data
 */
export interface SpeechRecognitionResult {
  /** Transcribed text */
  transcript: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * Voice assistant error types
 */
export type VoiceAssistantErrorType =
  | 'permission_denied'
  | 'speech_recognition_failed'
  | 'network_error'
  | 'backend_error'
  | 'rate_limited'
  | 'timeout'
  | 'wake_word_unavailable'
  | 'tts_error'
  | 'unknown';

/**
 * Voice assistant error
 */
export interface VoiceAssistantError {
  type: VoiceAssistantErrorType;
  message: string;
  retryable: boolean;
  code?: string;
  requestId?: string;
  statusCode?: number;
}

/**
 * User-facing non-fatal notice.
 */
export interface VoiceAssistantNotice {
  type: 'info' | 'warning';
  message: string;
  code?: string;
}

/**
 * Local diagnostic categories for voice assistant telemetry.
 */
export type VoiceAssistantDiagnosticCategory =
  | 'wake_word'
  | 'speech_recognition'
  | 'ellie_brain'
  | 'tts'
  | 'pipeline'
  | 'persistence';

/**
 * Lightweight timestamped diagnostic event stored locally for crash recovery.
 */
export interface VoiceAssistantDiagnosticEvent {
  id: string;
  timestamp: number;
  category: VoiceAssistantDiagnosticCategory;
  code: string;
  message: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

/**
 * Tool definitions for the Claude API.
 * These mirror the tools the backend registers with Claude.
 */
export type ShiftToolName =
  | 'get_shift_for_date'
  | 'get_shifts_in_range'
  | 'get_current_status'
  | 'get_statistics'
  | 'get_next_occurrence'
  | 'get_next_work_block'
  | 'get_next_rest_block'
  | 'days_until_work'
  | 'days_until_rest'
  | 'current_block_info';

/**
 * Input types for each tool
 */
export interface GetShiftForDateInput {
  date: string; // YYYY-MM-DD
}

export interface GetShiftsInRangeInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetCurrentStatusInput {
  // No inputs needed — uses userContext
}

export interface GetStatisticsInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetNextOccurrenceInput {
  shiftType: ShiftType;
  fromDate?: string; // YYYY-MM-DD, defaults to today
}

export interface GetNextBlockInput {
  fromDate?: string; // YYYY-MM-DD, defaults to today
}

export interface GetDaysUntilInput {
  fromDate?: string; // YYYY-MM-DD, defaults to today
}

export interface GetCurrentBlockInfoInput {
  date?: string; // YYYY-MM-DD, defaults to today
}

/**
 * Shift statistics result from get_statistics tool
 */
export interface ShiftStatisticsResult {
  totalShifts: number;
  dayShifts: number;
  nightShifts: number;
  morningShifts: number;
  afternoonShifts: number;
  daysOff: number;
  totalDays: number;
  workBlockDays?: number;
  restBlockDays?: number;
}
