/**
 * Dashboard Type Definitions
 *
 * Types specific to the Main Dashboard screen and its components.
 */

import { ShiftType, ShiftDay, ShiftCycle } from './index';

/**
 * Monthly statistics calculated from shift data
 */
export interface MonthStatistics {
  /** Total work days (day + night + morning + afternoon shifts) */
  workDays: number;
  /** Total days off */
  offDays: number;
  /** Total days in the month */
  totalDays: number;
  /** Number of day shifts */
  dayShifts: number;
  /** Number of night shifts */
  nightShifts: number;
  /** Work-life balance percentage (offDays / totalDays * 100) */
  workLifeBalance: number;
}

/**
 * Upcoming shift entry for the preview list
 */
export interface UpcomingShift {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Type of shift */
  shiftType: ShiftType;
  /** Whether it's a work day */
  isWorkDay: boolean;
  /** Formatted display date (e.g., "Mon, Feb 16") */
  displayDate: string;
  /** Shift time display (e.g., "7:00 AM - 7:00 PM") */
  timeDisplay?: string;
}

/**
 * Current shift status for the hero card
 */
export interface CurrentShiftStatus {
  /** Today's shift day data */
  shiftDay: ShiftDay;
  /** Shift time display string */
  timeDisplay: string;
  /** Time until next shift change */
  countdown: string;
  /** Whether the user is currently on shift */
  isOnShift: boolean;
}

/**
 * Dashboard data aggregating all computed values
 */
export interface DashboardData {
  /** User's name from onboarding */
  userName: string;
  /** User's occupation from onboarding */
  occupation: string;
  /** The computed shift cycle */
  shiftCycle: ShiftCycle;
  /** Today's shift status */
  currentShift: CurrentShiftStatus;
  /** Current month's shift days */
  monthShifts: ShiftDay[];
  /** Current month's statistics */
  monthStats: MonthStatistics;
  /** Next upcoming shifts */
  upcomingShifts: UpcomingShift[];
}

/**
 * Shift style configuration for visual display
 */
export interface ShiftStyle {
  /** Gradient background colors */
  background: [string, string];
  /** Icon name from Ionicons */
  icon: string;
  /** Display label */
  label: string;
  /** Badge abbreviation */
  badge: string;
  /** Background color with opacity for calendar cells */
  cellBackground: string;
}

/**
 * Map of shift types to their visual styles
 */
export type ShiftStyleMap = Record<ShiftType, ShiftStyle>;
