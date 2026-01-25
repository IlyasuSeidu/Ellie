/**
 * Shift Calculation Utilities
 *
 * Functions for calculating shift schedules, patterns, and related data.
 */

import { ShiftPattern, ShiftCycle, ShiftDay, ShiftType } from '@/types';
import { diffInDays, addDays, toDateString, getDateRange } from './dateUtils';

/**
 * Get pattern configuration for predefined shift patterns
 *
 * @param patternType - The shift pattern type
 * @returns Pattern configuration with daysOn, nightsOn, daysOff
 *
 * @example
 * ```typescript
 * getShiftPattern(ShiftPattern.STANDARD_3_3_3)
 * // Returns: { daysOn: 3, nightsOn: 3, daysOff: 3 }
 * ```
 */
export function getShiftPattern(patternType: ShiftPattern): {
  daysOn: number;
  nightsOn: number;
  daysOff: number;
} {
  const patterns: Record<ShiftPattern, { daysOn: number; nightsOn: number; daysOff: number }> = {
    [ShiftPattern.STANDARD_3_3_3]: { daysOn: 3, nightsOn: 3, daysOff: 3 },
    [ShiftPattern.STANDARD_5_5_5]: { daysOn: 5, nightsOn: 5, daysOff: 5 },
    [ShiftPattern.STANDARD_10_10_10]: { daysOn: 10, nightsOn: 10, daysOff: 10 },
    [ShiftPattern.STANDARD_2_2_3]: { daysOn: 2, nightsOn: 2, daysOff: 3 },
    [ShiftPattern.STANDARD_4_4_4]: { daysOn: 4, nightsOn: 4, daysOff: 4 },
    [ShiftPattern.STANDARD_7_7_7]: { daysOn: 7, nightsOn: 7, daysOff: 7 },
    [ShiftPattern.CONTINENTAL]: { daysOn: 7, nightsOn: 7, daysOff: 7 }, // Simplified
    [ShiftPattern.PITMAN]: { daysOn: 2, nightsOn: 2, daysOff: 3 }, // Simplified Pitman
    [ShiftPattern.CUSTOM]: { daysOn: 0, nightsOn: 0, daysOff: 0 }, // User-defined
  };

  return patterns[patternType];
}

/**
 * Create a full ShiftCycle from a pattern type and start date
 *
 * @param patternType - The shift pattern type
 * @param startDate - Start date in YYYY-MM-DD format
 * @param phaseOffset - Optional phase offset for team rotation (default: 0)
 * @returns Complete ShiftCycle configuration
 *
 * @example
 * ```typescript
 * getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01')
 * // Returns full ShiftCycle object
 * ```
 */
export function getShiftCycle(
  patternType: ShiftPattern,
  startDate: string,
  phaseOffset = 0
): ShiftCycle {
  const pattern = getShiftPattern(patternType);

  return {
    patternType,
    daysOn: pattern.daysOn,
    nightsOn: pattern.nightsOn,
    daysOff: pattern.daysOff,
    startDate,
    phaseOffset,
  };
}

/**
 * Calculate shift information for a specific date
 *
 * @param date - Date to calculate shift for
 * @param shiftCycle - Shift cycle configuration
 * @returns ShiftDay object with shift information
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * calculateShiftDay(new Date('2024-01-05'), cycle);
 * // Returns ShiftDay with isWorkDay, shiftType, etc.
 * ```
 */
export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  // For custom patterns, we would look up in the customPattern array
  if (shiftCycle.patternType === ShiftPattern.CUSTOM && shiftCycle.customPattern) {
    const dateStr = toDateString(date);
    const customDay = shiftCycle.customPattern.find((d) => d.date === dateStr);
    if (customDay) {
      return customDay;
    }
  }

  // Calculate days since cycle start
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);

  // Apply phase offset (add to shift the cycle forward)
  daysSinceStart += shiftCycle.phaseOffset;

  // Calculate cycle length
  const cycleLength = shiftCycle.daysOn + shiftCycle.nightsOn + shiftCycle.daysOff;

  // Handle negative days (before start date + offset)
  if (daysSinceStart < 0) {
    // Adjust to positive position in cycle
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  // Position in current cycle
  const positionInCycle = daysSinceStart % cycleLength;

  // Determine shift type based on position
  let shiftType: ShiftType;
  let isWorkDay: boolean;
  let isNightShift: boolean;

  if (positionInCycle < shiftCycle.daysOn) {
    // Day shift period
    shiftType = 'day';
    isWorkDay = true;
    isNightShift = false;
  } else if (positionInCycle < shiftCycle.daysOn + shiftCycle.nightsOn) {
    // Night shift period
    shiftType = 'night';
    isWorkDay = true;
    isNightShift = true;
  } else {
    // Days off period
    shiftType = 'off';
    isWorkDay = false;
    isNightShift = false;
  }

  return {
    date: toDateString(date),
    isWorkDay,
    isNightShift,
    shiftType,
  };
}

/**
 * Check if a specific date is a work day
 *
 * @param date - Date to check
 * @param shiftCycle - Shift cycle configuration
 * @returns True if the date is a work day
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * isWorkDay(new Date('2024-01-02'), cycle); // true or false
 * ```
 */
export function isWorkDay(date: Date, shiftCycle: ShiftCycle): boolean {
  const shiftDay = calculateShiftDay(date, shiftCycle);
  return shiftDay.isWorkDay;
}

/**
 * Find the next work day from a given date
 *
 * @param currentDate - Starting date
 * @param shiftCycle - Shift cycle configuration
 * @param maxDaysAhead - Maximum days to search ahead (default: 365)
 * @returns Date of next shift, or null if not found within maxDaysAhead
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * getNextShift(new Date('2024-01-05'), cycle);
 * // Returns the next work day after Jan 5, 2024
 * ```
 */
export function getNextShift(
  currentDate: Date,
  shiftCycle: ShiftCycle,
  maxDaysAhead = 365
): Date | null {
  let checkDate = addDays(currentDate, 1);
  let daysChecked = 0;

  while (daysChecked < maxDaysAhead) {
    if (isWorkDay(checkDate, shiftCycle)) {
      return checkDate;
    }
    checkDate = addDays(checkDate, 1);
    daysChecked++;
  }

  return null;
}

/**
 * Get all shift days within a date range
 *
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param shiftCycle - Shift cycle configuration
 * @returns Array of ShiftDay objects for all dates in range
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * getShiftDaysInRange(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   cycle
 * );
 * // Returns array of 31 ShiftDay objects
 * ```
 */
export function getShiftDaysInRange(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): ShiftDay[] {
  const dates = getDateRange(startDate, endDate);
  return dates.map((date) => calculateShiftDay(date, shiftCycle));
}

/**
 * Count work days in a date range
 *
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param shiftCycle - Shift cycle configuration
 * @returns Number of work days in the range
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * countWorkDays(new Date('2024-01-01'), new Date('2024-01-31'), cycle);
 * // Returns count of work days in January
 * ```
 */
export function countWorkDays(startDate: Date, endDate: Date, shiftCycle: ShiftCycle): number {
  const shiftDays = getShiftDaysInRange(startDate, endDate, shiftCycle);
  return shiftDays.filter((day) => day.isWorkDay).length;
}

/**
 * Get statistics for shifts in a date range
 *
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param shiftCycle - Shift cycle configuration
 * @returns Object with counts of day shifts, night shifts, and days off
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-31'), cycle);
 * // Returns: { dayShifts: 10, nightShifts: 10, daysOff: 11 }
 * ```
 */
export function getShiftStatistics(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): {
  dayShifts: number;
  nightShifts: number;
  daysOff: number;
  totalDays: number;
} {
  const shiftDays = getShiftDaysInRange(startDate, endDate, shiftCycle);

  const dayShifts = shiftDays.filter((day) => day.shiftType === 'day').length;
  const nightShifts = shiftDays.filter((day) => day.shiftType === 'night').length;
  const daysOff = shiftDays.filter((day) => day.shiftType === 'off').length;

  return {
    dayShifts,
    nightShifts,
    daysOff,
    totalDays: shiftDays.length,
  };
}

/**
 * Check if a date falls on a night shift
 *
 * @param date - Date to check
 * @param shiftCycle - Shift cycle configuration
 * @returns True if the date is a night shift
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * isNightShift(new Date('2024-01-04'), cycle); // true or false
 * ```
 */
export function isNightShift(date: Date, shiftCycle: ShiftCycle): boolean {
  const shiftDay = calculateShiftDay(date, shiftCycle);
  return shiftDay.isNightShift;
}

/**
 * Get the current phase position in the shift cycle
 *
 * @param date - Date to check
 * @param shiftCycle - Shift cycle configuration
 * @returns Object with phase info (position, total length, type)
 *
 * @example
 * ```typescript
 * const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01');
 * getPhaseInfo(new Date('2024-01-02'), cycle);
 * // Returns: { position: 1, cycleLength: 9, phaseType: 'day' }
 * ```
 */
export function getPhaseInfo(
  date: Date,
  shiftCycle: ShiftCycle
): {
  position: number;
  cycleLength: number;
  phaseType: 'day' | 'night' | 'off';
} {
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);
  daysSinceStart += shiftCycle.phaseOffset;

  const cycleLength = shiftCycle.daysOn + shiftCycle.nightsOn + shiftCycle.daysOff;

  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const position = daysSinceStart % cycleLength;

  let phaseType: 'day' | 'night' | 'off';
  if (position < shiftCycle.daysOn) {
    phaseType = 'day';
  } else if (position < shiftCycle.daysOn + shiftCycle.nightsOn) {
    phaseType = 'night';
  } else {
    phaseType = 'off';
  }

  return {
    position,
    cycleLength,
    phaseType,
  };
}
