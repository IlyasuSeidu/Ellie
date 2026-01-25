/**
 * Calendar Type Definitions
 *
 * Types specific to calendar rendering and interactions.
 */

import { ShiftType } from './index';

/**
 * Calendar Marking Type
 *
 * Types of markings that can appear on calendar days.
 */
export type CalendarMarkingType =
  | 'dayShift'
  | 'nightShift'
  | 'dayOff'
  | 'holiday'
  | 'today'
  | 'selected';

/**
 * Calendar Marking
 *
 * Visual marking configuration for a calendar day.
 */
export interface CalendarMarking {
  /** Type of marking */
  type: CalendarMarkingType;
  /** Marking color */
  color: string;
  /** Whether to show a dot indicator */
  marked?: boolean;
  /** Dot color */
  dotColor?: string;
  /** Whether the day is selected */
  selected?: boolean;
  /** Selection color */
  selectedColor?: string;
  /** Whether the day is disabled */
  disabled?: boolean;
  /** Text color */
  textColor?: string;
  /** Custom data */
  customData?: Record<string, unknown>;
}

/**
 * Calendar Day State
 *
 * Complete state of a calendar day including shift and marking info.
 */
export interface CalendarDayState {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Shift type for this day */
  shiftType: ShiftType;
  /** Whether this is a work day */
  isWorkDay: boolean;
  /** Whether this is a night shift */
  isNightShift: boolean;
  /** Whether this is today */
  isToday: boolean;
  /** Whether this day is selected */
  isSelected: boolean;
  /** Whether there's a holiday on this day */
  hasHoliday: boolean;
  /** Holiday name if applicable */
  holidayName?: string;
  /** Calendar marking configuration */
  marking: CalendarMarking;
  /** Optional notes */
  notes?: string;
}

/**
 * Month Data
 *
 * Aggregated data for a calendar month.
 */
export interface MonthData {
  /** Year */
  year: number;
  /** Month (1-12) */
  month: number;
  /** Number of days in month */
  daysInMonth: number;
  /** Map of dates to their states */
  days: Record<string, CalendarDayState>;
  /** Statistics for the month */
  statistics: {
    /** Total day shifts */
    dayShifts: number;
    /** Total night shifts */
    nightShifts: number;
    /** Total days off */
    daysOff: number;
    /** Total holidays */
    holidays: number;
    /** Total work days */
    workDays: number;
  };
}

/**
 * Calendar Theme Configuration
 *
 * Theming options for the calendar component.
 */
export interface CalendarTheme {
  /** Background color */
  backgroundColor: string;
  /** Calendar background color */
  calendarBackground: string;
  /** Text color for section headers */
  textSectionTitleColor: string;
  /** Default day text color */
  dayTextColor: string;
  /** Today's text color */
  todayTextColor: string;
  /** Disabled day text color */
  textDisabledColor: string;
  /** Month text color */
  monthTextColor: string;
  /** Selected day background color */
  selectedDayBackgroundColor: string;
  /** Selected day text color */
  selectedDayTextColor: string;
  /** Day shift marker color */
  dayShiftColor: string;
  /** Night shift marker color */
  nightShiftColor: string;
  /** Day off marker color */
  dayOffColor: string;
  /** Holiday marker color */
  holidayColor: string;
  /** Dot color for marked days */
  dotColor: string;
  /** Weekend text color */
  weekendTextColor?: string;
  /** Arrow color for month navigation */
  arrowColor?: string;
}

/**
 * Calendar View Mode
 *
 * Different view modes for displaying the calendar.
 */
export type CalendarViewMode = 'month' | 'week' | 'agenda';

/**
 * Calendar Props
 *
 * Configuration props for the calendar component.
 */
export interface CalendarProps {
  /** Initial date to display */
  initialDate?: string;
  /** Minimum selectable date */
  minDate?: string;
  /** Maximum selectable date */
  maxDate?: string;
  /** View mode */
  viewMode?: CalendarViewMode;
  /** Theme configuration */
  theme?: CalendarTheme;
  /** Whether to show week numbers */
  showWeekNumbers?: boolean;
  /** First day of week (0 = Sunday, 1 = Monday) */
  firstDay?: 0 | 1;
  /** Month data to display */
  monthData: MonthData;
  /** Callback when a day is pressed */
  onDayPress?: (date: string) => void;
  /** Callback when a day is long pressed */
  onDayLongPress?: (date: string) => void;
  /** Callback when month changes */
  onMonthChange?: (year: number, month: number) => void;
}

/**
 * Agenda Item
 *
 * Item displayed in agenda view.
 */
export interface AgendaItem {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Item title */
  title: string;
  /** Item description */
  description?: string;
  /** Start time in HH:mm format */
  startTime?: string;
  /** End time in HH:mm format */
  endTime?: string;
  /** Item type */
  type: 'shift' | 'holiday' | 'note';
  /** Associated shift type if applicable */
  shiftType?: ShiftType;
  /** Item color */
  color?: string;
}

/**
 * Week View Data
 *
 * Data for a week view display.
 */
export interface WeekViewData {
  /** Week start date */
  weekStart: string;
  /** Week end date */
  weekEnd: string;
  /** Array of day states for the week */
  days: CalendarDayState[];
  /** Week number */
  weekNumber?: number;
}

/**
 * Calendar Event
 *
 * Generic calendar event (shift, holiday, or custom).
 */
export interface CalendarEvent {
  /** Unique identifier */
  id: string;
  /** Event date */
  date: string;
  /** Event title */
  title: string;
  /** Event description */
  description?: string;
  /** Event type */
  type: 'shift' | 'holiday' | 'custom';
  /** All-day event flag */
  allDay: boolean;
  /** Start time if not all-day */
  startTime?: string;
  /** End time if not all-day */
  endTime?: string;
  /** Event color */
  color?: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Date Range
 *
 * Represents a range of dates.
 */
export interface DateRange {
  /** Start date in YYYY-MM-DD format */
  startDate: string;
  /** End date in YYYY-MM-DD format */
  endDate: string;
}

/**
 * Calendar Filter Options
 *
 * Options for filtering calendar data.
 */
export interface CalendarFilterOptions {
  /** Show day shifts */
  showDayShifts?: boolean;
  /** Show night shifts */
  showNightShifts?: boolean;
  /** Show days off */
  showDaysOff?: boolean;
  /** Show holidays */
  showHolidays?: boolean;
  /** Date range filter */
  dateRange?: DateRange;
  /** Custom filter function */
  customFilter?: (day: CalendarDayState) => boolean;
}

/**
 * Calendar Actions
 *
 * Available actions on calendar days.
 */
export interface CalendarActions {
  /** Add note to day */
  addNote: (date: string, note: string) => void;
  /** Remove note from day */
  removeNote: (date: string) => void;
  /** Mark day as selected */
  selectDay: (date: string) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Navigate to specific date */
  goToDate: (date: string) => void;
  /** Navigate to today */
  goToToday: () => void;
}

/**
 * Calendar State
 *
 * State management for calendar component.
 */
export interface CalendarState {
  /** Currently displayed month */
  currentMonth: number;
  /** Currently displayed year */
  currentYear: number;
  /** Selected date */
  selectedDate?: string;
  /** View mode */
  viewMode: CalendarViewMode;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string;
  /** Month data cache */
  monthCache: Map<string, MonthData>;
}
