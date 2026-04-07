import type { ShiftType } from './index';

export type ReminderFatigueRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type SmartReminderType =
  | 'SHIFT_REMINDER_CUSTOM_EARLY'
  | 'SHIFT_PREP_REMINDER'
  | 'COMMUTE_REMINDER'
  | 'SHIFT_START_IMMINENT'
  | 'PRE_BRIEFING_REMINDER'
  | 'BACK_TO_BACK_WARNING'
  | 'SHORT_TURNAROUND_WARNING'
  | 'FATIGUE_ALERT'
  | 'FIFO_TRAVEL_DAY_TOMORROW'
  | 'FIFO_FLY_OUT_TODAY'
  | 'POST_SHIFT_CHECKIN';

export const SMART_REMINDER_TYPES: readonly SmartReminderType[] = [
  'SHIFT_REMINDER_CUSTOM_EARLY',
  'SHIFT_PREP_REMINDER',
  'COMMUTE_REMINDER',
  'SHIFT_START_IMMINENT',
  'PRE_BRIEFING_REMINDER',
  'BACK_TO_BACK_WARNING',
  'SHORT_TURNAROUND_WARNING',
  'FATIGUE_ALERT',
  'FIFO_TRAVEL_DAY_TOMORROW',
  'FIFO_FLY_OUT_TODAY',
  'POST_SHIFT_CHECKIN',
] as const;

export function isSmartReminderType(value: unknown): value is SmartReminderType {
  return typeof value === 'string' && SMART_REMINDER_TYPES.includes(value as SmartReminderType);
}

export interface ReminderEvent {
  type: SmartReminderType;
  triggerAt: Date;
  shiftDate: string;
  shiftType: ShiftType;
  isCritical: boolean;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface SmartReminderSettings {
  earlyReminderHours: number;
  prepTimeMinutes: number;
  commuteTimeMinutes: number;
  imminentReminderEnabled: boolean;
  preBriefingEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  fatigueAwareReminders: boolean;
  backToBackWarnings: boolean;
  shortTurnaroundWarnings: boolean;
  postShiftCheckin: boolean;
  fifoTravelReminders: boolean;
}

export const SMART_REMINDER_SETTINGS_KEY = 'reminders:settings';
export const SMART_REMINDER_LOCAL_USER_ID_KEY = 'reminders:local-user-id';

export const DEFAULT_SMART_REMINDER_SETTINGS: SmartReminderSettings = {
  earlyReminderHours: 8,
  prepTimeMinutes: 60,
  commuteTimeMinutes: 30,
  imminentReminderEnabled: true,
  preBriefingEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  fatigueAwareReminders: true,
  backToBackWarnings: true,
  shortTurnaroundWarnings: true,
  postShiftCheckin: false,
  fifoTravelReminders: true,
};
