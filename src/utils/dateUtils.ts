/**
 * Date Utility Functions
 *
 * Provides a clean API for date manipulation and formatting using dayjs.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/**
 * Format a date using the specified format string
 *
 * @param date - Date to format
 * @param format - Format string (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD MMM YYYY')
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2024-01-15'), 'YYYY-MM-DD') // '2024-01-15'
 * formatDate(new Date('2024-01-15'), 'DD/MM/YYYY') // '15/01/2024'
 * ```
 */
export function formatDate(date: Date, format: string): string {
  return dayjs(date).format(format);
}

/**
 * Parse a date string into a Date object
 *
 * @param dateString - Date string to parse
 * @param format - Optional format string (if not provided, auto-detects ISO and common formats)
 * @returns Parsed Date object
 *
 * @example
 * ```typescript
 * parseDate('2024-01-15') // Date object for Jan 15, 2024
 * parseDate('2024-01-15T10:30:00') // Date object for Jan 15, 2024 at 10:30
 * parseDate('01/15/2024', 'MM/DD/YYYY') // Date object for Jan 15, 2024
 * ```
 */
export function parseDate(dateString: string, format?: string): Date {
  // If no format specified, let dayjs auto-parse (handles ISO datetime, etc.)
  if (!format) {
    return dayjs(dateString).toDate();
  }
  return dayjs(dateString, format).toDate();
}

/**
 * Get the number of days in a specific month and year
 *
 * @param year - Year
 * @param month - Month (1-12)
 * @returns Number of days in the month
 *
 * @example
 * ```typescript
 * getDaysInMonth(2024, 2) // 29 (2024 is a leap year)
 * getDaysInMonth(2023, 2) // 28
 * ```
 */
export function getDaysInMonth(year: number, month: number): number {
  return dayjs(`${year}-${month.toString().padStart(2, '0')}-01`).daysInMonth();
}

/**
 * Check if a date is within a specified range (inclusive)
 *
 * @param date - Date to check
 * @param start - Start of range
 * @param end - End of range
 * @returns True if date is within range
 *
 * @example
 * ```typescript
 * isDateInRange(new Date('2024-01-15'), new Date('2024-01-01'), new Date('2024-01-31')) // true
 * ```
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = dayjs(date);
  return d.isSameOrAfter(dayjs(start), 'day') && d.isSameOrBefore(dayjs(end), 'day');
}

/**
 * Add a specified number of days to a date
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative to subtract)
 * @returns New date with days added
 *
 * @example
 * ```typescript
 * addDays(new Date('2024-01-15'), 5) // Jan 20, 2024
 * addDays(new Date('2024-01-15'), -5) // Jan 10, 2024
 * ```
 */
export function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate();
}

/**
 * Check if two dates represent the same day
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 *
 * @example
 * ```typescript
 * isSameDay(new Date('2024-01-15 10:30'), new Date('2024-01-15 18:45')) // true
 * isSameDay(new Date('2024-01-15'), new Date('2024-01-16')) // false
 * ```
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dayjs(date1).isSame(dayjs(date2), 'day');
}

/**
 * Get the start of day for a given date (00:00:00)
 *
 * @param date - Input date
 * @returns Date at start of day
 *
 * @example
 * ```typescript
 * startOfDay(new Date('2024-01-15 15:30')) // 2024-01-15 00:00:00
 * ```
 */
export function startOfDay(date: Date): Date {
  return dayjs(date).startOf('day').toDate();
}

/**
 * Get the end of day for a given date (23:59:59.999)
 *
 * @param date - Input date
 * @returns Date at end of day
 *
 * @example
 * ```typescript
 * endOfDay(new Date('2024-01-15 08:30')) // 2024-01-15 23:59:59.999
 * ```
 */
export function endOfDay(date: Date): Date {
  return dayjs(date).endOf('day').toDate();
}

/**
 * Calculate the difference in days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates (can be negative)
 *
 * @example
 * ```typescript
 * diffInDays(new Date('2024-01-20'), new Date('2024-01-15')) // 5
 * diffInDays(new Date('2024-01-15'), new Date('2024-01-20')) // -5
 * ```
 */
export function diffInDays(date1: Date, date2: Date): number {
  return dayjs(date1).diff(dayjs(date2), 'day');
}

/**
 * Get today's date at start of day
 *
 * @returns Today's date at 00:00:00
 *
 * @example
 * ```typescript
 * getToday() // Today at 00:00:00
 * ```
 */
export function getToday(): Date {
  return dayjs().startOf('day').toDate();
}

/**
 * Check if a date is today
 *
 * @param date - Date to check
 * @returns True if date is today
 *
 * @example
 * ```typescript
 * isToday(new Date()) // true
 * ```
 */
export function isToday(date: Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

/**
 * Check if a date is in the past
 *
 * @param date - Date to check
 * @returns True if date is before today
 *
 * @example
 * ```typescript
 * isPast(new Date('2023-01-01')) // true (assuming current date is after)
 * ```
 */
export function isPast(date: Date): boolean {
  return dayjs(date).isBefore(dayjs(), 'day');
}

/**
 * Check if a date is in the future
 *
 * @param date - Date to check
 * @returns True if date is after today
 *
 * @example
 * ```typescript
 * isFuture(new Date('2025-01-01')) // true (assuming current date is before)
 * ```
 */
export function isFuture(date: Date): boolean {
  return dayjs(date).isAfter(dayjs(), 'day');
}

/**
 * Get the first day of month for a given date
 *
 * @param date - Input date
 * @returns First day of the month
 *
 * @example
 * ```typescript
 * getFirstDayOfMonth(new Date('2024-01-15')) // 2024-01-01
 * ```
 */
export function getFirstDayOfMonth(date: Date): Date {
  return dayjs(date).startOf('month').toDate();
}

/**
 * Get the last day of month for a given date
 *
 * @param date - Input date
 * @returns Last day of the month
 *
 * @example
 * ```typescript
 * getLastDayOfMonth(new Date('2024-02-15')) // 2024-02-29
 * ```
 */
export function getLastDayOfMonth(date: Date): Date {
  return dayjs(date).endOf('month').toDate();
}

/**
 * Format a date to YYYY-MM-DD string
 *
 * @param date - Date to format
 * @returns Date in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * toDateString(new Date('2024-01-15')) // '2024-01-15'
 * ```
 */
export function toDateString(date: Date): string {
  // Use local time methods to stay consistent with dayjs (which defaults to local time)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get an array of dates between start and end (inclusive)
 *
 * @param start - Start date
 * @param end - End date
 * @returns Array of dates from start to end
 *
 * @example
 * ```typescript
 * getDateRange(new Date('2024-01-01'), new Date('2024-01-03'))
 * // [Date(2024-01-01), Date(2024-01-02), Date(2024-01-03)]
 * ```
 */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = dayjs(start).startOf('day');
  const endDay = dayjs(end).startOf('day');

  while (current.isSameOrBefore(endDay)) {
    dates.push(current.toDate());
    current = current.add(1, 'day');
  }

  return dates;
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 *
 * @param date - Input date
 * @returns Day of week number
 *
 * @example
 * ```typescript
 * getDayOfWeek(new Date('2024-01-15')) // Returns day number
 * ```
 */
export function getDayOfWeek(date: Date): number {
  return dayjs(date).day();
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 *
 * @param date - Date to check
 * @returns True if date is Saturday or Sunday
 *
 * @example
 * ```typescript
 * isWeekend(new Date('2024-01-13')) // true (if Saturday)
 * isWeekend(new Date('2024-01-15')) // false (if Monday)
 * ```
 */
export function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6;
}
