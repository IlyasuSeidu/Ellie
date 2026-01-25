/**
 * Core Type Definitions for Shift Tracking Application
 *
 * This file contains all core TypeScript type definitions used throughout
 * the application for shift scheduling, tracking, and management.
 */

/**
 * Shift Pattern Types
 *
 * Predefined shift patterns commonly used in industries with rotating schedules.
 * Each pattern defines a specific work rotation cycle.
 */
export enum ShiftPattern {
  /** 3 days on, 3 nights on, 3 days off */
  STANDARD_3_3_3 = 'STANDARD_3_3_3',
  /** 5 days on, 5 nights on, 5 days off */
  STANDARD_5_5_5 = 'STANDARD_5_5_5',
  /** 10 days on, 10 nights on, 10 days off */
  STANDARD_10_10_10 = 'STANDARD_10_10_10',
  /** 2 days on, 2 nights on, 3 days off */
  STANDARD_2_2_3 = 'STANDARD_2_2_3',
  /** 4 days on, 4 nights on, 4 days off */
  STANDARD_4_4_4 = 'STANDARD_4_4_4',
  /** 7 days on, 7 nights on, 7 days off */
  STANDARD_7_7_7 = 'STANDARD_7_7_7',
  /** Continental shift pattern (8-hour shifts, 3 teams) */
  CONTINENTAL = 'CONTINENTAL',
  /** Pitman shift pattern (12-hour shifts, 4 teams) */
  PITMAN = 'PITMAN',
  /** Custom user-defined pattern */
  CUSTOM = 'CUSTOM',
}

/**
 * Shift Type
 *
 * Indicates whether a shift is during the day, night, or a day off.
 */
export type ShiftType = 'day' | 'night' | 'off';

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
}

/**
 * Shift Cycle Configuration
 *
 * Defines the parameters for a shift rotation cycle.
 */
export interface ShiftCycle {
  /** The pattern type being used */
  patternType: ShiftPattern;
  /** Number of consecutive day shifts */
  daysOn: number;
  /** Number of consecutive night shifts */
  nightsOn: number;
  /** Number of consecutive days off */
  daysOff: number;
  /** Start date of the cycle in YYYY-MM-DD format */
  startDate: string;
  /** Phase offset in days (for team rotation) */
  phaseOffset: number;
  /** Optional custom pattern definition */
  customPattern?: ShiftDay[];
}

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
