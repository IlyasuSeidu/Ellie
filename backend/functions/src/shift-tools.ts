/**
 * Server-Side Shift Calculation Tools
 *
 * Ported from client-side shiftUtils.ts for use in the Cloud Function.
 * These are called when the LLM invokes tools during conversation.
 */

import { ShiftCycle, ShiftDay, ShiftType } from './types';

/**
 * Calculate days between two dates (date2 - date1).
 */
function diffInDays(date1: Date, date2: Date): number {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as YYYY-MM-DD.
 */
function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate shift for a specific date.
 */
export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  const startDate = new Date(shiftCycle.startDate);
  let daysSinceStart = diffInDays(date, startDate);
  daysSinceStart += shiftCycle.phaseOffset;

  const is3Shift =
    shiftCycle.shiftSystem === '3-shift' ||
    (shiftCycle.morningOn !== undefined && shiftCycle.morningOn > 0) ||
    (shiftCycle.afternoonOn !== undefined && shiftCycle.afternoonOn > 0) ||
    (shiftCycle.nightOn !== undefined && shiftCycle.nightOn > 0);

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

  if (daysSinceStart < 0) {
    daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
  }

  const positionInCycle = daysSinceStart % cycleLength;

  let shiftType: ShiftType;
  let isWorkDay: boolean;
  let isNightShift: boolean;

  if (is3Shift) {
    const morningOn = shiftCycle.morningOn || 0;
    const afternoonOn = shiftCycle.afternoonOn || 0;
    const nightOn = shiftCycle.nightOn || 0;

    if (positionInCycle < morningOn) {
      shiftType = 'morning';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < morningOn + afternoonOn) {
      shiftType = 'afternoon';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < morningOn + afternoonOn + nightOn) {
      shiftType = 'night';
      isWorkDay = true;
      isNightShift = true;
    } else {
      shiftType = 'off';
      isWorkDay = false;
      isNightShift = false;
    }
  } else {
    if (positionInCycle < shiftCycle.daysOn) {
      shiftType = 'day';
      isWorkDay = true;
      isNightShift = false;
    } else if (positionInCycle < shiftCycle.daysOn + shiftCycle.nightsOn) {
      shiftType = 'night';
      isWorkDay = true;
      isNightShift = true;
    } else {
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
 * Get shifts for a date range.
 */
export function getShiftDaysInRange(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): ShiftDay[] {
  const result: ShiftDay[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    result.push(calculateShiftDay(current, shiftCycle));
    current = addDays(current, 1);
  }

  return result;
}

/**
 * Get shift statistics for a date range.
 */
export function getShiftStatistics(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): {
  totalShifts: number;
  dayShifts: number;
  nightShifts: number;
  morningShifts: number;
  afternoonShifts: number;
  daysOff: number;
  totalDays: number;
} {
  const days = getShiftDaysInRange(startDate, endDate, shiftCycle);

  const dayShifts = days.filter((d) => d.shiftType === 'day').length;
  const nightShifts = days.filter((d) => d.shiftType === 'night').length;
  const morningShifts = days.filter((d) => d.shiftType === 'morning').length;
  const afternoonShifts = days.filter((d) => d.shiftType === 'afternoon').length;
  const daysOff = days.filter((d) => d.shiftType === 'off').length;

  return {
    totalShifts: dayShifts + nightShifts + morningShifts + afternoonShifts,
    dayShifts,
    nightShifts,
    morningShifts,
    afternoonShifts,
    daysOff,
    totalDays: days.length,
  };
}

/**
 * Find the next occurrence of a specific shift type.
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

/**
 * Execute a tool by name.
 */
export function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  shiftCycle: ShiftCycle
): unknown {
  switch (toolName) {
    case 'get_shift_for_date': {
      const date = new Date(input.date as string);
      return calculateShiftDay(date, shiftCycle);
    }
    case 'get_shifts_in_range': {
      const startDate = new Date(input.startDate as string);
      const endDate = new Date(input.endDate as string);
      return getShiftDaysInRange(startDate, endDate, shiftCycle);
    }
    case 'get_current_status': {
      const today = new Date();
      return { todayShift: calculateShiftDay(today, shiftCycle) };
    }
    case 'get_statistics': {
      const startDate = new Date(input.startDate as string);
      const endDate = new Date(input.endDate as string);
      return getShiftStatistics(startDate, endDate, shiftCycle);
    }
    case 'get_next_occurrence': {
      const fromDate = input.fromDate ? new Date(input.fromDate as string) : new Date();
      const result = getNextOccurrence(fromDate, input.shiftType as ShiftType, shiftCycle);
      return result ? { found: true, shiftDay: result } : { found: false };
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
