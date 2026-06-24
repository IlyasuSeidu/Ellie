import type { SmartReminderSettings } from './reminders';

// ── Universal Shift Schedule ──────────────────────────────────────────────────

/**
 * Semantic kind for a universal shift definition.
 */
export type UniversalShiftKind =
  | 'work'
  | 'off'
  | 'travel'
  | 'on_call'
  | 'training'
  | 'leave'
  | 'custom';

/**
 * How shift time is specified in a universal definition.
 */
export type UniversalShiftTimePolicy = 'timed' | 'all_day' | 'none';

/**
 * How the shift is considered "active" for reminders / active-shift tracking.
 */
export type UniversalShiftActivePolicy = 'timed_window' | 'all_day_active' | 'not_active';

/**
 * A reusable shift type definition used in a universal schedule.
 */
export interface UniversalShiftDefinition {
  id: string;
  name: string;
  kind: UniversalShiftKind;
  timePolicy: UniversalShiftTimePolicy;
  activePolicy: UniversalShiftActivePolicy;
  /** HH:mm */
  startTime?: string;
  /** HH:mm */
  endTime?: string;
  durationMinutes?: number;
  crossesMidnight?: boolean;
  countsAsWork: boolean;
  countsAsNight: boolean;
  countsForStats: boolean;
  /** Hex color string, e.g. "#2196F3" */
  color: string;
  /** Ionicons icon name */
  icon: string;
  locationName?: string;
  reminderProfileId?: string;
  reminderProfile?: Partial<SmartReminderSettings>;
}

/**
 * One slot in the repeating sequence.
 */
export interface UniversalShiftSequenceItem {
  id: string;
  shiftDefinitionId: string;
  labelOverride?: string;
}

export type UniversalHolidayExceptionAction = 'mark_off' | 'use_shift_definition';

/**
 * A materialized public-holiday override for one calendar date.
 *
 * These can be generated from HolidayService when the user chooses a country
 * and year range, while keeping schedule calculation deterministic.
 */
export interface UniversalHolidayException {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  holidayName: string;
  country: string;
  action: UniversalHolidayExceptionAction;
  /** Required when action is "use_shift_definition". */
  shiftDefinitionId?: string;
  /** Optional payroll hint for downstream pay/earnings logic. */
  paidOverride?: boolean;
  /** Defaults to true: rest/off days stay untouched unless explicitly disabled. */
  appliesToWorkShiftsOnly?: boolean;
}

export interface UniversalHolidayExceptionApplied {
  id: string;
  holidayName: string;
  country: string;
  action: UniversalHolidayExceptionAction;
  paidOverride?: boolean;
  originalDefinitionId: string;
  originalDefinitionName: string;
  originalKind: UniversalShiftKind;
}

export type UniversalOneOffExceptionAction = 'mark_off' | 'use_shift_definition';

/**
 * A user-created override for one specific date.
 */
export interface UniversalOneOffException {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  action: UniversalOneOffExceptionAction;
  /** Required when action is "use_shift_definition". */
  shiftDefinitionId?: string;
  label?: string;
  reason?: string;
  paidOverride?: boolean;
}

export interface UniversalOneOffExceptionApplied {
  id: string;
  action: UniversalOneOffExceptionAction;
  label?: string;
  reason?: string;
  paidOverride?: boolean;
  originalDefinitionId: string;
  originalDefinitionName: string;
  originalKind: UniversalShiftKind;
}

/**
 * A complete v3 universal shift schedule.
 */
export interface UniversalShiftSchedule {
  version: 3;
  name: string;
  timezone: string;
  /** YYYY-MM-DD */
  anchorDate: string;
  phaseOffset: number;
  shiftDefinitions: UniversalShiftDefinition[];
  sequence: UniversalShiftSequenceItem[];
  holidayExceptions?: UniversalHolidayException[];
  oneOffExceptions?: UniversalOneOffException[];
  source: 'manual' | 'ai' | 'template' | 'migration';
  /** ISO timestamp */
  updatedAt?: string;
  aiDraftMeta?: {
    originalPrompt: string;
    confidence: number;
    assumptions: string[];
    unresolvedQuestions: string[];
    parserSource?: 'remote_ai' | 'local_fallback';
    fallbackReason?: 'not_configured' | 'not_found' | 'server_error' | 'network_error' | 'timeout';
  };
}

/**
 * Extended shift day metadata when running a universal schedule.
 */
export interface UniversalShiftDayMeta {
  definitionId: string;
  definitionName: string;
  kind: UniversalShiftKind;
  color: string;
  icon: string;
  timePolicy: UniversalShiftTimePolicy;
  activePolicy: UniversalShiftActivePolicy;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  countsAsWork: boolean;
  countsAsNight: boolean;
  locationName?: string;
  reminderProfileId?: string;
  reminderProfile?: Partial<SmartReminderSettings>;
  sequenceIndex: number;
  cycleLength: number;
  oneOffException?: UniversalOneOffExceptionApplied;
  holidayException?: UniversalHolidayExceptionApplied;
}

/**
 * Shift Type
 *
 * Canonical display bucket for a shift day. Universal schedules may carry any
 * custom name/kind/icon/color in `ShiftDay.universal`; this field remains a
 * compact compatibility bucket for existing dashboard visuals.
 */
export type ShiftType = 'day' | 'night' | 'morning' | 'afternoon' | 'off';

/**
 * Shift Day
 *
 * Represents a single day in the shift calendar with its properties.
 */
export interface ShiftDay {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Whether this is a work day */
  isWorkDay: boolean;
  /** Whether this is a night shift */
  isNightShift: boolean;
  /** Type of shift for this day */
  shiftType: ShiftType;
  /** Optional notes for this shift day */
  notes?: string;
  /** Present when calculated from a universal schedule */
  universal?: UniversalShiftDayMeta;
}

export type ShiftCycle = UniversalShiftSchedule;

/**
 * Holiday Type
 *
 * Categories of holidays for filtering and display.
 */
export type HolidayType = 'national' | 'religious' | 'cultural' | 'observance';

/**
 * Holiday
 *
 * Represents a holiday or special day in the calendar.
 */
export interface Holiday {
  /** Unique identifier */
  id: string;
  /** Holiday name */
  name: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Type of holiday */
  type: HolidayType;
  /** Optional description */
  description?: string;
  /** Whether it's a paid holiday */
  isPaid?: boolean;
}

/**
 * Notification Settings
 *
 * User preferences for shift-related notifications.
 */
export interface NotificationSettings {
  /** Send notification 24 hours before shift */
  shift24HoursBefore: boolean;
  /** Send notification 4 hours before shift */
  shift4HoursBefore: boolean;
  /** Send alerts for upcoming holidays */
  holidayAlerts: boolean;
  /** Send alerts when shift pattern changes */
  patternChangeAlerts: boolean;
  /** Notification sound enabled */
  soundEnabled: boolean;
  /** Notification vibration enabled */
  vibrationEnabled: boolean;
  /** Optional advanced smart-reminder settings */
  smartReminders?: SmartReminderSettings;
}

/**
 * User Profile
 *
 * Core user information and preferences.
 */
export interface UserProfile {
  /** Unique user identifier */
  id: string;
  /** User's full name */
  name: string;
  /** User's occupation/job title */
  occupation: string;
  /** Company/employer name */
  company: string;
  /** Country code (ISO 3166-1 alpha-2) */
  country: string;
  /** Email address */
  email: string;
  /** Profile photo URL */
  photoURL?: string;
  /** Account creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Current shift cycle configuration */
  shiftCycle?: ShiftCycle;
  /** Notification preferences */
  notificationSettings?: NotificationSettings;
}

/**
 * Energy Level
 *
 * User's energy level tracking for shift performance.
 */
export enum EnergyLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Shift Log Entry
 *
 * Records details about a completed shift.
 */
export interface ShiftLogEntry {
  /** Unique identifier */
  id: string;
  /** User ID */
  userId: string;
  /** Shift date in YYYY-MM-DD format */
  date: string;
  /** Shift type */
  shiftType: ShiftType;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Hours worked */
  hoursWorked: number;
  /** Energy level during shift */
  energyLevel?: EnergyLevel;
  /** Notes about the shift */
  notes?: string;
  /** Timestamp when logged */
  loggedAt: string;
}

/**
 * Report Type
 *
 * Types of reports that can be generated.
 */
export enum ReportType {
  /** Count of shifts worked */
  COUNT_SHIFTS = 'COUNT_SHIFTS',
  /** Hours per shift analysis */
  HOURS_PER_SHIFT = 'HOURS_PER_SHIFT',
  /** Earnings report */
  EARNINGS = 'EARNINGS',
  /** Overtime hours report */
  OVERTIME = 'OVERTIME',
}

/**
 * Shift Statistics
 *
 * Statistical data about shifts over a period.
 */
export interface ShiftStatistics {
  /** Total number of shifts */
  totalShifts: number;
  /** Total day shifts */
  dayShifts: number;
  /** Total night shifts */
  nightShifts: number;
  /** Total days off */
  daysOff: number;
  /** Total hours worked */
  totalHours: number;
  /** Average hours per shift */
  averageHoursPerShift: number;
  /** Start date of period */
  startDate: string;
  /** End date of period */
  endDate: string;
}

/**
 * Earnings Configuration
 *
 * Configuration for calculating shift earnings.
 */
export interface EarningsConfig {
  /** Base hourly rate */
  hourlyRate: number;
  /** Night shift premium multiplier (e.g., 1.5 for time and a half) */
  nightShiftMultiplier: number;
  /** Overtime threshold in hours per week */
  overtimeThreshold: number;
  /** Overtime multiplier */
  overtimeMultiplier: number;
  /** Holiday pay multiplier */
  holidayMultiplier: number;
  /** Currency code (e.g., USD, EUR, GBP) */
  currency: string;
}

/**
 * Shift Report
 *
 * Generated report for a specific period.
 */
export interface ShiftReport {
  /** Unique identifier */
  id: string;
  /** User ID */
  userId: string;
  /** Report type */
  type: ReportType;
  /** Start date of report period */
  startDate: string;
  /** End date of report period */
  endDate: string;
  /** Statistics for the period */
  statistics: ShiftStatistics;
  /** Earnings data if applicable */
  earnings?: {
    regularPay: number;
    nightShiftPay: number;
    overtimePay: number;
    holidayPay: number;
    totalPay: number;
    currency: string;
  };
  /** Report generation timestamp */
  generatedAt: string;
}

/**
 * App Theme
 *
 * Application theme preferences.
 */
export type AppTheme = 'light' | 'dark' | 'system';

/**
 * App Settings
 *
 * Application-wide settings and preferences.
 */
export interface AppSettings {
  /** Theme preference */
  theme: AppTheme;
  /** Language code (ISO 639-1) */
  language: string;
  /** Date format preference */
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  /** Time format preference */
  timeFormat: '12h' | '24h';
  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek: 0 | 1;
  /** Enable analytics */
  analyticsEnabled: boolean;
  /** Enable crash reporting */
  crashReportingEnabled: boolean;
}

/**
 * API Error Response
 *
 * Standard error response from API calls.
 */
export interface APIError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Timestamp of error */
  timestamp: string;
}

/**
 * Pagination Parameters
 *
 * Parameters for paginated API requests.
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 *
 * Generic paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Whether there is a next page */
    hasNext: boolean;
    /** Whether there is a previous page */
    hasPrev: boolean;
  };
}
