export type UniversalShiftKind =
  | 'work'
  | 'off'
  | 'travel'
  | 'on_call'
  | 'training'
  | 'leave'
  | 'custom';

export type UniversalShiftTimePolicy = 'timed' | 'all_day' | 'none';
export type UniversalShiftActivePolicy = 'timed_window' | 'all_day_active' | 'not_active';

export interface UniversalShiftDefinition {
  id: string;
  name: string;
  kind: UniversalShiftKind;
  timePolicy: UniversalShiftTimePolicy;
  activePolicy: UniversalShiftActivePolicy;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  crossesMidnight?: boolean;
  countsAsWork: boolean;
  countsAsNight: boolean;
  countsForStats: boolean;
  color: string;
  icon: string;
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
}

export interface UniversalShiftSequenceItem {
  id: string;
  shiftDefinitionId: string;
  labelOverride?: string;
}

export type UniversalHolidayExceptionAction = 'mark_off' | 'use_shift_definition';

export interface UniversalHolidayException {
  id: string;
  date: string;
  holidayName: string;
  country: string;
  action: UniversalHolidayExceptionAction;
  shiftDefinitionId?: string;
  paidOverride?: boolean;
  appliesToWorkShiftsOnly?: boolean;
}

export type UniversalOneOffExceptionAction = 'mark_off' | 'use_shift_definition';

export interface UniversalOneOffException {
  id: string;
  date: string;
  action: UniversalOneOffExceptionAction;
  shiftDefinitionId?: string;
  label?: string;
  reason?: string;
  paidOverride?: boolean;
}

export interface UniversalShiftSchedule {
  version: 3;
  name: string;
  timezone: string;
  anchorDate: string;
  phaseOffset: number;
  shiftDefinitions: UniversalShiftDefinition[];
  sequence: UniversalShiftSequenceItem[];
  holidayExceptions?: UniversalHolidayException[];
  oneOffExceptions?: UniversalOneOffException[];
  source: 'manual' | 'ai' | 'template' | 'migration';
  updatedAt?: string;
  aiDraftMeta?: {
    originalPrompt: string;
    confidence: number;
    assumptions: string[];
    unresolvedQuestions: string[];
  };
}

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
