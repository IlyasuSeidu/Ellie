/**
 * Shift Calculation Utilities
 *
 * Functions for calculating shift schedules, patterns, and related data.
 */

import {
  ShiftPattern,
  ShiftCycle,
  ShiftDay,
  ShiftType,
  ShiftSystem,
  ShiftPatternConfig,
  FIFOConfig,
  RosterType,
} from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { diffInDays, addDays, toDateString, getDateRange } from './dateUtils';

function isFIFOPattern(patternType: ShiftPattern): boolean {
  switch (patternType) {
    case ShiftPattern.FIFO_8_6:
    case ShiftPattern.FIFO_7_7:
    case ShiftPattern.FIFO_14_14:
    case ShiftPattern.FIFO_14_7:
    case ShiftPattern.FIFO_21_7:
    case ShiftPattern.FIFO_28_14:
    case ShiftPattern.FIFO_CUSTOM:
      return true;
    default:
      return false;
  }
}

export function getDefaultFIFOConfig(patternType: ShiftPattern): FIFOConfig | null {
  switch (patternType) {
    case ShiftPattern.FIFO_8_6:
      return { workBlockDays: 8, restBlockDays: 6, workBlockPattern: 'straight-days' };
    case ShiftPattern.FIFO_7_7:
      return { workBlockDays: 7, restBlockDays: 7, workBlockPattern: 'straight-days' };
    case ShiftPattern.FIFO_14_14:
      return { workBlockDays: 14, restBlockDays: 14, workBlockPattern: 'straight-days' };
    case ShiftPattern.FIFO_14_7:
      return { workBlockDays: 14, restBlockDays: 7, workBlockPattern: 'straight-days' };
    case ShiftPattern.FIFO_21_7:
      return { workBlockDays: 21, restBlockDays: 7, workBlockPattern: 'straight-days' };
    case ShiftPattern.FIFO_28_14:
      return { workBlockDays: 28, restBlockDays: 14, workBlockPattern: 'straight-days' };
    default:
      return null;
  }
}

/**
 * Get pattern configuration for predefined shift patterns
 *
 * @param patternType - The shift pattern type
 * @returns Pattern configuration with shift system metadata
 *
 * @example
 * ```typescript
 * getShiftPattern(ShiftPattern.STANDARD_3_3_3)
 * // Returns: {
 * //   config: { daysOn: 3, nightsOn: 3, daysOff: 3, totalCycleDays: 9 },
 * //   defaultShiftSystem: ShiftSystem.TWO_SHIFT,
 * //   supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT]
 * // }
 * ```
 */
export function getShiftPattern(patternType: ShiftPattern): {
  config: ShiftPatternConfig;
  defaultShiftSystem: ShiftSystem;
  supportsShiftSystem: ShiftSystem[];
} {
  const patterns: Record<
    ShiftPattern,
    {
      config: ShiftPatternConfig;
      defaultShiftSystem: ShiftSystem;
      supportsShiftSystem: ShiftSystem[];
    }
  > = {
    [ShiftPattern.STANDARD_3_3_3]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 3,
        nightsOn: 3,
        daysOff: 3,
        totalCycleDays: 9,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    },
    [ShiftPattern.STANDARD_5_5_5]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 5,
        nightsOn: 5,
        daysOff: 5,
        totalCycleDays: 15,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    },
    [ShiftPattern.STANDARD_10_10_10]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 10,
        nightsOn: 10,
        daysOff: 10,
        totalCycleDays: 30,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.STANDARD_2_2_3]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 2,
        nightsOn: 2,
        daysOff: 3,
        totalCycleDays: 7,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.STANDARD_4_4_4]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        totalCycleDays: 12,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    },
    [ShiftPattern.STANDARD_7_7_7]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 7,
        nightsOn: 7,
        daysOff: 7,
        totalCycleDays: 21,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    },
    [ShiftPattern.CONTINENTAL]: {
      config: {
        rosterType: RosterType.ROTATING,
        morningOn: 2,
        afternoonOn: 2,
        nightOn: 2,
        daysOff: 4,
        totalCycleDays: 10,
      },
      defaultShiftSystem: ShiftSystem.THREE_SHIFT,
      supportsShiftSystem: [ShiftSystem.THREE_SHIFT],
    },
    [ShiftPattern.PITMAN]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 2,
        nightsOn: 2,
        daysOff: 3,
        totalCycleDays: 7,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.CUSTOM]: {
      config: {
        rosterType: RosterType.ROTATING,
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        totalCycleDays: 0,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    },
    // FIFO Patterns (use FIFOConfig instead of these dummy configs in practice)
    [ShiftPattern.FIFO_8_6]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 8,
        nightsOn: 0,
        daysOff: 6,
        totalCycleDays: 14,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_7_7]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 7,
        nightsOn: 0,
        daysOff: 7,
        totalCycleDays: 14,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_14_14]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 14,
        nightsOn: 0,
        daysOff: 14,
        totalCycleDays: 28,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_14_7]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 14,
        nightsOn: 0,
        daysOff: 7,
        totalCycleDays: 21,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_21_7]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 21,
        nightsOn: 0,
        daysOff: 7,
        totalCycleDays: 28,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_28_14]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 28,
        nightsOn: 0,
        daysOff: 14,
        totalCycleDays: 42,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
    [ShiftPattern.FIFO_CUSTOM]: {
      config: {
        rosterType: RosterType.FIFO,
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        totalCycleDays: 0,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    },
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
  if (isFIFOPattern(patternType)) {
    const fifoConfig = getDefaultFIFOConfig(patternType);
    if (!fifoConfig) {
      return {
        patternType,
        rosterType: RosterType.FIFO,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        startDate,
        phaseOffset,
      };
    }

    return {
      patternType,
      rosterType: RosterType.FIFO,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: fifoConfig.workBlockDays,
      nightsOn: 0,
      daysOff: fifoConfig.restBlockDays,
      startDate,
      phaseOffset,
      fifoConfig,
    };
  }

  const pattern = getShiftPattern(patternType);
  const config = pattern.config;

  const cycle: ShiftCycle = {
    patternType,
    rosterType: RosterType.ROTATING,
    shiftSystem: pattern.defaultShiftSystem,
    daysOn: config.daysOn ?? 0,
    nightsOn: config.nightsOn ?? 0,
    daysOff: config.daysOff,
    startDate,
    phaseOffset,
  };

  // Include 3-shift fields if present
  if (config.morningOn !== undefined) cycle.morningOn = config.morningOn;
  if (config.afternoonOn !== undefined) cycle.afternoonOn = config.afternoonOn;
  if (config.nightOn !== undefined) cycle.nightOn = config.nightOn;

  return cycle;
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
/**
 * Calculate shift day for FIFO/block rosters
 *
 * @param date - Date to calculate
 * @param daysSinceStart - Days since cycle start (with phase offset applied)
 * @param shiftCycle - Shift cycle configuration
 * @returns Shift day information
 *
 * @internal
 */
function calculateFIFOShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle
): ShiftDay {
  const config = shiftCycle.fifoConfig;
  if (!config) {
    return {
      date: toDateString(date),
      isWorkDay: false,
      isNightShift: false,
      shiftType: 'off',
    };
  }
  const cycleLength = config.workBlockDays + config.restBlockDays;

  // Handle negative days (before start date)
  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const positionInCycle = daysSinceStart % cycleLength;

  // Determine if in work block or rest block
  if (positionInCycle < config.workBlockDays) {
    // IN WORK BLOCK
    const dayInWorkBlock = positionInCycle;

    // Determine shift type based on work block pattern
    let shiftType: ShiftType;
    let isNightShift: boolean;

    switch (config.workBlockPattern) {
      case 'straight-days':
        shiftType = 'day';
        isNightShift = false;
        break;

      case 'straight-nights':
        shiftType = 'night';
        isNightShift = true;
        break;

      case 'swing':
        if (config.swingPattern) {
          // Swing between days and nights based on configured pattern
          if (dayInWorkBlock < config.swingPattern.daysOnDayShift) {
            shiftType = 'day';
            isNightShift = false;
          } else {
            shiftType = 'night';
            isNightShift = true;
          }
        } else {
          // Default swing: alternate weeks (7 days each)
          const weekInBlock = Math.floor(dayInWorkBlock / 7);
          if (weekInBlock % 2 === 0) {
            shiftType = 'day';
            isNightShift = false;
          } else {
            shiftType = 'night';
            isNightShift = true;
          }
        }
        break;

      case 'custom':
        if (config.customWorkSequence && config.customWorkSequence.length > 0) {
          const sequenceIndex = dayInWorkBlock % config.customWorkSequence.length;
          shiftType = config.customWorkSequence[sequenceIndex];
          isNightShift = shiftType === 'night';
        } else {
          shiftType = 'day';
          isNightShift = false;
        }
        break;

      default:
        shiftType = 'day';
        isNightShift = false;
    }

    return {
      date: toDateString(date),
      isWorkDay: true,
      isNightShift,
      shiftType,
    };
  }
  // IN REST BLOCK
  return {
    date: toDateString(date),
    isWorkDay: false,
    isNightShift: false,
    shiftType: 'off',
  };
}

export interface FIFOBlockInfo {
  inWorkBlock: boolean;
  dayInBlock: number;
  blockLength: number;
  daysUntilBlockChange: number;
  positionInCycle: number;
  cycleLength: number;
}

export function getFIFOBlockInfo(date: Date, shiftCycle: ShiftCycle): FIFOBlockInfo | null {
  if (shiftCycle.rosterType !== RosterType.FIFO || !shiftCycle.fifoConfig) {
    return null;
  }

  const config = shiftCycle.fifoConfig;
  const cycleLength = config.workBlockDays + config.restBlockDays;
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate) + shiftCycle.phaseOffset;

  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const positionInCycle = daysSinceStart % cycleLength;
  const inWorkBlock = positionInCycle < config.workBlockDays;
  const dayInBlock = inWorkBlock ? positionInCycle + 1 : positionInCycle - config.workBlockDays + 1;
  const blockLength = inWorkBlock ? config.workBlockDays : config.restBlockDays;

  return {
    inWorkBlock,
    dayInBlock,
    blockLength,
    daysUntilBlockChange: Math.max(0, blockLength - dayInBlock),
    positionInCycle,
    cycleLength,
  };
}

/**
 * Calculate shift day for rotating rosters
 *
 * @param date - Date to calculate
 * @param daysSinceStart - Days since cycle start (with phase offset applied)
 * @param shiftCycle - Shift cycle configuration
 * @returns Shift day information
 *
 * @internal
 */
function calculateRotatingShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle
): ShiftDay {
  // Determine if this is a 3-shift system
  const is3Shift =
    shiftCycle.shiftSystem === ShiftSystem.THREE_SHIFT ||
    (shiftCycle.morningOn !== undefined && shiftCycle.morningOn > 0) ||
    (shiftCycle.afternoonOn !== undefined && shiftCycle.afternoonOn > 0) ||
    (shiftCycle.nightOn !== undefined && shiftCycle.nightOn > 0);

  // Calculate cycle length based on shift system
  let cycleLength: number;
  if (is3Shift) {
    cycleLength =
      (shiftCycle.morningOn || 0) +
      (shiftCycle.afternoonOn || 0) +
      (shiftCycle.nightOn || 0) +
      shiftCycle.daysOff;
  } else {
    cycleLength = shiftCycle.daysOn + shiftCycle.nightsOn + shiftCycle.daysOff;
  }

  // Handle negative days (before start date + offset)
  if (daysSinceStart < 0) {
    // Adjust to positive position in cycle
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  // Position in current cycle
  const positionInCycle = daysSinceStart % cycleLength;

  // Determine shift type based on position and shift system
  let shiftType: ShiftType;
  let isWorkDay: boolean;
  let isNightShift: boolean;

  if (is3Shift) {
    // 3-shift system logic
    const morningOn = shiftCycle.morningOn || 0;
    const afternoonOn = shiftCycle.afternoonOn || 0;
    const nightOn = shiftCycle.nightOn || 0;

    if (positionInCycle < morningOn) {
      // Morning shift period
      shiftType = 'morning';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < morningOn + afternoonOn) {
      // Afternoon shift period
      shiftType = 'afternoon';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < morningOn + afternoonOn + nightOn) {
      // Night shift period (3-shift)
      shiftType = 'night';
      isWorkDay = true;
      isNightShift = true;
    } else {
      // Days off period
      shiftType = 'off';
      isWorkDay = false;
      isNightShift = false;
    }
  } else {
    // 2-shift system logic
    if (positionInCycle < shiftCycle.daysOn) {
      // Day shift period
      shiftType = 'day';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < shiftCycle.daysOn + shiftCycle.nightsOn) {
      // Night shift period (2-shift)
      shiftType = 'night';
      isWorkDay = true;
      isNightShift = true;
    } else {
      // Days off period
      shiftType = 'off';
      isWorkDay = false;
      isNightShift = false;
    }
  }

  return {
    date: toDateString(date),
    isWorkDay,
    isNightShift,
    shiftType,
  };
}

/**
 * Calculate shift information for a specific date
 *
 * Supports both rotating rosters (days → nights → off) and FIFO rosters (work blocks → rest blocks)
 *
 * @param date - Date to calculate shift for
 * @param shiftCycle - Shift cycle configuration
 * @returns Shift day information including type, work status, and night shift status
 *
 * @example
 * ```typescript
 * // Rotating roster
 * calculateShiftDay(new Date('2024-01-15'), rotatingCycle)
 * // Returns: { date: '2024-01-15', isWorkDay: true, isNightShift: false, shiftType: 'day' }
 *
 * // FIFO roster
 * calculateShiftDay(new Date('2024-01-15'), fifoCycle)
 * // Returns: { date: '2024-01-15', isWorkDay: true, isNightShift: false, shiftType: 'day' }
 * ```
 */
export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  // Calculate days since cycle start
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);

  // Apply phase offset (add to shift the cycle forward)
  daysSinceStart += shiftCycle.phaseOffset;

  // Dispatch to appropriate calculation based on roster type
  if (shiftCycle.rosterType === 'fifo' && shiftCycle.fifoConfig) {
    return calculateFIFOShiftDay(date, daysSinceStart, shiftCycle);
  }
  return calculateRotatingShiftDay(date, daysSinceStart, shiftCycle);
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
  morningShifts: number;
  afternoonShifts: number;
  daysOff: number;
  totalDays: number;
} {
  const shiftDays = getShiftDaysInRange(startDate, endDate, shiftCycle);

  const dayShifts = shiftDays.filter((day) => day.shiftType === 'day').length;
  const nightShifts = shiftDays.filter((day) => day.shiftType === 'night').length;
  const morningShifts = shiftDays.filter((day) => day.shiftType === 'morning').length;
  const afternoonShifts = shiftDays.filter((day) => day.shiftType === 'afternoon').length;
  const daysOff = shiftDays.filter((day) => day.shiftType === 'off').length;

  return {
    dayShifts,
    nightShifts,
    morningShifts,
    afternoonShifts,
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
  phaseType: ShiftType;
} {
  const shiftDay = calculateShiftDay(date, shiftCycle);

  let cycleLength: number;
  if (shiftCycle.rosterType === RosterType.FIFO && shiftCycle.fifoConfig) {
    cycleLength = shiftCycle.fifoConfig.workBlockDays + shiftCycle.fifoConfig.restBlockDays;
  } else if (
    shiftCycle.shiftSystem === ShiftSystem.THREE_SHIFT ||
    (shiftCycle.morningOn !== undefined && shiftCycle.morningOn > 0) ||
    (shiftCycle.afternoonOn !== undefined && shiftCycle.afternoonOn > 0) ||
    (shiftCycle.nightOn !== undefined && shiftCycle.nightOn > 0)
  ) {
    cycleLength =
      (shiftCycle.morningOn || 0) +
      (shiftCycle.afternoonOn || 0) +
      (shiftCycle.nightOn || 0) +
      shiftCycle.daysOff;
  } else {
    cycleLength = shiftCycle.daysOn + shiftCycle.nightsOn + shiftCycle.daysOff;
  }

  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);
  daysSinceStart += shiftCycle.phaseOffset;

  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const position = daysSinceStart % cycleLength;

  return {
    position,
    cycleLength,
    phaseType: shiftDay.shiftType,
  };
}

/**
 * Build a ShiftCycle from onboarding data.
 *
 * Extracted here so it can be shared between the dashboard screen
 * and the voice assistant context.
 *
 * @param data - Onboarding data containing shift configuration
 * @returns A ShiftCycle or null if essential fields are missing
 */
export function buildShiftCycle(data: OnboardingData): ShiftCycle | null {
  if (!data.patternType || !data.startDate) return null;

  const startDateStr = toDateString(
    typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
  );

  const inferredRosterType: RosterType =
    data.rosterType === RosterType.FIFO || isFIFOPattern(data.patternType)
      ? RosterType.FIFO
      : RosterType.ROTATING;

  if (inferredRosterType === RosterType.FIFO) {
    const fifoConfig = data.fifoConfig ?? getDefaultFIFOConfig(data.patternType);
    if (!fifoConfig) {
      return null;
    }

    return {
      patternType: data.patternType,
      rosterType: RosterType.FIFO,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: fifoConfig.workBlockDays,
      nightsOn: 0,
      daysOff: fifoConfig.restBlockDays,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
      fifoConfig,
    };
  }

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    return {
      patternType: ShiftPattern.CUSTOM,
      rosterType: RosterType.ROTATING,
      shiftSystem: data.shiftSystem === '3-shift' ? ShiftSystem.THREE_SHIFT : ShiftSystem.TWO_SHIFT,
      daysOn: data.customPattern.daysOn,
      nightsOn: data.customPattern.nightsOn,
      morningOn: data.customPattern.morningOn,
      afternoonOn: data.customPattern.afternoonOn,
      nightOn: data.customPattern.nightOn,
      daysOff: data.customPattern.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  // Standard pattern
  const pattern = getShiftPattern(data.patternType);
  const config = pattern.config;

  const shiftSystem =
    data.shiftSystem === '3-shift' ? ShiftSystem.THREE_SHIFT : ShiftSystem.TWO_SHIFT;

  // If pattern already has 3-shift fields (e.g. Continental), use them directly
  if (
    config.morningOn !== undefined ||
    config.afternoonOn !== undefined ||
    config.nightOn !== undefined
  ) {
    return {
      patternType: data.patternType,
      rosterType: RosterType.ROTATING,
      shiftSystem: ShiftSystem.THREE_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      morningOn: config.morningOn ?? 0,
      afternoonOn: config.afternoonOn ?? 0,
      nightOn: config.nightOn ?? 0,
      daysOff: config.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  const daysOn = config.daysOn ?? 0;
  const nightsOn = config.nightsOn ?? 0;

  // For 2-shift patterns selected with 3-shift system, convert:
  // morningOn = daysOn, afternoonOn = daysOn, nightOn = nightsOn
  if (shiftSystem === ShiftSystem.THREE_SHIFT) {
    return {
      patternType: data.patternType,
      rosterType: RosterType.ROTATING,
      shiftSystem,
      daysOn: 0,
      nightsOn: 0,
      morningOn: daysOn,
      afternoonOn: daysOn,
      nightOn: nightsOn,
      daysOff: config.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  return {
    patternType: data.patternType,
    rosterType: RosterType.ROTATING,
    shiftSystem,
    daysOn,
    nightsOn,
    daysOff: config.daysOff,
    startDate: startDateStr,
    phaseOffset: data.phaseOffset || 0,
  };
}

/**
 * Find the next occurrence of a specific shift type from a given date.
 *
 * Searches forward day-by-day from the day after `fromDate` until a day
 * matching `shiftType` is found, or `maxDaysAhead` is reached.
 *
 * @param fromDate - Start searching from the day after this date
 * @param shiftType - The shift type to find
 * @param shiftCycle - Shift cycle configuration
 * @param maxDaysAhead - Maximum days to search (default 365)
 * @returns The matching ShiftDay, or null if not found within range
 */
export function getNextOccurrence(
  fromDate: Date,
  shiftType: ShiftType,
  shiftCycle: ShiftCycle,
  maxDaysAhead = 365
): ShiftDay | null {
  let checkDate = addDays(fromDate, 1);
  for (let i = 0; i < maxDaysAhead; i++) {
    const day = calculateShiftDay(checkDate, shiftCycle);
    if (day.shiftType === shiftType) return day;
    checkDate = addDays(checkDate, 1);
  }
  return null;
}
