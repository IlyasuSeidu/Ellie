/**
 * Backend Type Definitions
 *
 * Shared types for the Ryvro voice Cloud Function.
 * Mirrors relevant client-side types.
 */

import type { UniversalShiftKind, UniversalShiftSchedule } from './universal-shift-types';

export type ShiftType = 'day' | 'night' | 'morning' | 'afternoon' | 'off';
export type RosterType = 'rotating' | 'fifo';
export type ScheduleMode = 'legacy' | 'universal';

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
  scheduleMode?: ScheduleMode;
  universalSchedule?: UniversalShiftSchedule;
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
  universal?: {
    definitionId: string;
    definitionName: string;
    kind: UniversalShiftKind;
    color: string;
    icon: string;
    timePolicy: string;
    activePolicy: string;
    startTime?: string;
    endTime?: string;
    crossesMidnight?: boolean;
    countsAsWork: boolean;
    countsAsNight: boolean;
    locationName?: string;
    reminderProfileId?: string;
    reminderProfile?: {
      earlyReminderHours?: number;
      prepTimeMinutes?: number;
      commuteTimeMinutes?: number;
      imminentReminderEnabled?: boolean;
      preBriefingEnabled?: boolean;
      quietHoursEnabled?: boolean;
      quietHoursStart?: string;
      quietHoursEnd?: string;
      fatigueAwareReminders?: boolean;
      backToBackWarnings?: boolean;
      shortTurnaroundWarnings?: boolean;
      postShiftCheckin?: boolean;
      travelReminders?: boolean;
    };
    sequenceIndex: number;
    cycleLength: number;
    oneOffException?: {
      id: string;
      action: 'mark_off' | 'use_shift_definition';
      label?: string;
      reason?: string;
      paidOverride?: boolean;
      originalDefinitionId: string;
      originalDefinitionName: string;
      originalKind: UniversalShiftKind;
    };
    holidayException?: {
      id: string;
      holidayName: string;
      country: string;
      action: 'mark_off' | 'use_shift_definition';
      paidOverride?: boolean;
      originalDefinitionId: string;
      originalDefinitionName: string;
      originalKind: UniversalShiftKind;
    };
  };
}

export interface RyvroBrainRequest {
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

export interface RyvroBrainResponse {
  text: string;
  shiftData?: {
    toolName: string;
    data: unknown;
  };
  requestId?: string;
}

export type RyvroBrainErrorCode =
  | 'invalid_request'
  | 'missing_user_context'
  | 'invalid_user_context'
  | 'rate_limited'
  | 'provider_timeout'
  | 'provider_error'
  | 'internal_error';

export interface RyvroBrainError {
  code: RyvroBrainErrorCode;
  message: string;
  retryable: boolean;
  requestId: string;
}

export interface RyvroBrainSuccessEnvelope {
  ok: true;
  requestId: string;
  data: RyvroBrainResponse;
}

export interface RyvroBrainErrorEnvelope {
  ok: false;
  requestId: string;
  error: RyvroBrainError;
}

export type RyvroBrainResponseEnvelope = RyvroBrainSuccessEnvelope | RyvroBrainErrorEnvelope;

export interface QueryProcessingOptions {
  requestId: string;
  timeoutMs: number;
}
