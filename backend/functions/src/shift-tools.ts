/**
 * Server-side shift calculation tools.
 *
 * Mirrors client-side behavior for rotating and FIFO rosters.
 * These functions are used when the model invokes tool calls.
 */

import { FIFOConfig, ShiftCycle, ShiftDay, ShiftType } from './types';

const MAX_SEARCH_DAYS = 730;

/**
 * Calculate days between two dates (date1 - date2) using local calendar days.
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

function isThreeShift(shiftCycle: ShiftCycle): boolean {
  return (
    shiftCycle.shiftSystem === '3-shift' ||
    (shiftCycle.morningOn !== undefined && shiftCycle.morningOn > 0) ||
    (shiftCycle.afternoonOn !== undefined && shiftCycle.afternoonOn > 0) ||
    (shiftCycle.nightOn !== undefined && shiftCycle.nightOn > 0)
  );
}

function getFIFOConfig(shiftCycle: ShiftCycle): FIFOConfig | undefined {
  if (shiftCycle.rosterType !== 'fifo' || !shiftCycle.fifoConfig) {
    return undefined;
  }
  return shiftCycle.fifoConfig;
}

function getCycleLength(shiftCycle: ShiftCycle): number {
  const fifoConfig = getFIFOConfig(shiftCycle);
  if (fifoConfig) {
    return fifoConfig.workBlockDays + fifoConfig.restBlockDays;
  }

  if (isThreeShift(shiftCycle)) {
    return (
      (shiftCycle.morningOn || 0) +
      (shiftCycle.afternoonOn || 0) +
      (shiftCycle.nightOn || 0) +
      shiftCycle.daysOff
    );
  }

  return shiftCycle.daysOn + shiftCycle.nightsOn + shiftCycle.daysOff;
}

function calculateFIFOShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle,
  fifoConfig: FIFOConfig
): ShiftDay {
  const cycleLength = fifoConfig.workBlockDays + fifoConfig.restBlockDays;
  const normalizedDaysSinceStart =
    daysSinceStart < 0 ? cycleLength + (daysSinceStart % cycleLength) : daysSinceStart;
  const positionInCycle = normalizedDaysSinceStart % cycleLength;

  if (positionInCycle < fifoConfig.workBlockDays) {
    const dayInWorkBlock = positionInCycle;
    let shiftType: ShiftType = 'day';
    let isNightShift = false;

    switch (fifoConfig.workBlockPattern) {
      case 'straight-days':
        shiftType = 'day';
        isNightShift = false;
        break;
      case 'straight-nights':
        shiftType = 'night';
        isNightShift = true;
        break;
      case 'swing':
        if (fifoConfig.swingPattern) {
          if (dayInWorkBlock < fifoConfig.swingPattern.daysOnDayShift) {
            shiftType = 'day';
            isNightShift = false;
          } else {
            shiftType = 'night';
            isNightShift = true;
          }
        } else {
          const weekInBlock = Math.floor(dayInWorkBlock / 7);
          shiftType = weekInBlock % 2 === 0 ? 'day' : 'night';
          isNightShift = shiftType === 'night';
        }
        break;
      case 'custom':
        if (fifoConfig.customWorkSequence && fifoConfig.customWorkSequence.length > 0) {
          const sequenceIndex = dayInWorkBlock % fifoConfig.customWorkSequence.length;
          shiftType = fifoConfig.customWorkSequence[sequenceIndex];
          isNightShift = shiftType === 'night';
        }
        break;
      default:
        shiftType = 'day';
        isNightShift = false;
        break;
    }

    return {
      date: toDateString(date),
      isWorkDay: true,
      isNightShift,
      shiftType,
    };
  }

  return {
    date: toDateString(date),
    isWorkDay: false,
    isNightShift: false,
    shiftType: 'off',
  };
}

function calculateRotatingShiftDay(
  date: Date,
  daysSinceStart: number,
  shiftCycle: ShiftCycle
): ShiftDay {
  const cycleLength = getCycleLength(shiftCycle);
  const normalizedDaysSinceStart =
    daysSinceStart < 0 ? cycleLength + (daysSinceStart % cycleLength) : daysSinceStart;
  const positionInCycle = normalizedDaysSinceStart % cycleLength;

  let shiftType: ShiftType;
  let isWorkDay: boolean;
  let isNightShift: boolean;

  if (isThreeShift(shiftCycle)) {
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
  } else if (positionInCycle < shiftCycle.daysOn) {
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

  return {
    date: toDateString(date),
    isWorkDay,
    isNightShift,
    shiftType,
  };
}

/**
 * Calculate shift for a specific date.
 */
export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  const startDate = new Date(shiftCycle.startDate);
  const daysSinceStart = diffInDays(date, startDate) + shiftCycle.phaseOffset;
  const fifoConfig = getFIFOConfig(shiftCycle);

  if (fifoConfig) {
    return calculateFIFOShiftDay(date, daysSinceStart, shiftCycle, fifoConfig);
  }

  return calculateRotatingShiftDay(date, daysSinceStart, shiftCycle);
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
  workBlockDays: number;
  restBlockDays: number;
} {
  const days = getShiftDaysInRange(startDate, endDate, shiftCycle);

  const dayShifts = days.filter((d) => d.shiftType === 'day').length;
  const nightShifts = days.filter((d) => d.shiftType === 'night').length;
  const morningShifts = days.filter((d) => d.shiftType === 'morning').length;
  const afternoonShifts = days.filter((d) => d.shiftType === 'afternoon').length;
  const daysOff = days.filter((d) => d.shiftType === 'off').length;
  const workBlockDays = days.filter((d) => d.isWorkDay).length;
  const restBlockDays = days.length - workBlockDays;

  return {
    totalShifts: dayShifts + nightShifts + morningShifts + afternoonShifts,
    dayShifts,
    nightShifts,
    morningShifts,
    afternoonShifts,
    daysOff,
    totalDays: days.length,
    workBlockDays,
    restBlockDays,
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
  for (let i = 0; i < maxDaysAhead; i += 1) {
    const day = calculateShiftDay(checkDate, shiftCycle);
    if (day.shiftType === shiftType) return day;
    checkDate = addDays(checkDate, 1);
  }
  return null;
}

function getBlockLengthFromStart(
  startDate: Date,
  shiftCycle: ShiftCycle,
  targetIsWorkDay: boolean
): number {
  let length = 1;
  let cursor = addDays(startDate, 1);

  for (let i = 0; i < MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(cursor, shiftCycle);
    if (day.isWorkDay !== targetIsWorkDay) {
      break;
    }
    length += 1;
    cursor = addDays(cursor, 1);
  }

  return length;
}

function findNextBlockStart(
  fromDate: Date,
  shiftCycle: ShiftCycle,
  targetIsWorkDay: boolean
): { found: boolean; date?: Date; daysUntil?: number; blockLengthDays?: number } {
  let previousDay = calculateShiftDay(fromDate, shiftCycle);
  let cursor = addDays(fromDate, 1);

  for (let i = 1; i <= MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(cursor, shiftCycle);
    const transitioned =
      day.isWorkDay === targetIsWorkDay && previousDay.isWorkDay !== targetIsWorkDay;

    if (transitioned) {
      return {
        found: true,
        date: cursor,
        daysUntil: i,
        blockLengthDays: getBlockLengthFromStart(cursor, shiftCycle, targetIsWorkDay),
      };
    }

    previousDay = day;
    cursor = addDays(cursor, 1);
  }

  return { found: false };
}

function findNextByWorkState(
  fromDate: Date,
  shiftCycle: ShiftCycle,
  targetIsWorkDay: boolean
): { found: boolean; date?: Date; daysUntil?: number; alreadyInTargetBlock: boolean } {
  const current = calculateShiftDay(fromDate, shiftCycle);
  if (current.isWorkDay === targetIsWorkDay) {
    return { found: true, date: fromDate, daysUntil: 0, alreadyInTargetBlock: true };
  }

  let cursor = addDays(fromDate, 1);
  for (let i = 1; i <= MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(cursor, shiftCycle);
    if (day.isWorkDay === targetIsWorkDay) {
      return { found: true, date: cursor, daysUntil: i, alreadyInTargetBlock: false };
    }
    cursor = addDays(cursor, 1);
  }

  return { found: false, alreadyInTargetBlock: false };
}

function getCurrentBlockInfo(date: Date, shiftCycle: ShiftCycle) {
  const shiftDay = calculateShiftDay(date, shiftCycle);
  const isWorkDay = shiftDay.isWorkDay;
  const fifoConfig = getFIFOConfig(shiftCycle);

  if (fifoConfig) {
    const cycleLength = fifoConfig.workBlockDays + fifoConfig.restBlockDays;
    let daysSinceStart = diffInDays(date, new Date(shiftCycle.startDate)) + shiftCycle.phaseOffset;
    if (daysSinceStart < 0) {
      daysSinceStart = cycleLength + (daysSinceStart % cycleLength);
    }
    const positionInCycle = daysSinceStart % cycleLength;
    const inWorkBlock = positionInCycle < fifoConfig.workBlockDays;
    const dayInBlock = inWorkBlock
      ? positionInCycle + 1
      : positionInCycle - fifoConfig.workBlockDays + 1;
    const blockLengthDays = inWorkBlock ? fifoConfig.workBlockDays : fifoConfig.restBlockDays;

    return {
      date: toDateString(date),
      rosterType: 'fifo',
      blockType: inWorkBlock ? 'work' : 'rest',
      shiftType: shiftDay.shiftType,
      dayInBlock,
      blockLengthDays,
      daysUntilBlockChange: Math.max(0, blockLengthDays - dayInBlock),
      cycleLength,
    };
  }

  let dayInBlock = 1;
  let backCursor = addDays(date, -1);
  for (let i = 0; i < MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(backCursor, shiftCycle);
    if (day.isWorkDay !== isWorkDay) {
      break;
    }
    dayInBlock += 1;
    backCursor = addDays(backCursor, -1);
  }

  let daysUntilBlockChange = 0;
  let forwardCursor = addDays(date, 1);
  for (let i = 0; i < MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(forwardCursor, shiftCycle);
    if (day.isWorkDay !== isWorkDay) {
      break;
    }
    daysUntilBlockChange += 1;
    forwardCursor = addDays(forwardCursor, 1);
  }

  return {
    date: toDateString(date),
    rosterType: 'rotating',
    blockType: isWorkDay ? 'work' : 'rest',
    shiftType: shiftDay.shiftType,
    dayInBlock,
    blockLengthDays: dayInBlock + daysUntilBlockChange,
    daysUntilBlockChange,
  };
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
      return {
        todayShift: calculateShiftDay(today, shiftCycle),
        currentBlockInfo: getCurrentBlockInfo(today, shiftCycle),
      };
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
    case 'get_next_work_block': {
      const fromDate = input.fromDate ? new Date(input.fromDate as string) : new Date();
      const result = findNextBlockStart(fromDate, shiftCycle, true);
      if (!result.found || !result.date || result.daysUntil === undefined) {
        return { found: false, blockType: 'work' };
      }
      return {
        found: true,
        blockType: 'work',
        startDate: toDateString(result.date),
        daysUntilStart: result.daysUntil,
        blockLengthDays: result.blockLengthDays,
      };
    }
    case 'get_next_rest_block': {
      const fromDate = input.fromDate ? new Date(input.fromDate as string) : new Date();
      const result = findNextBlockStart(fromDate, shiftCycle, false);
      if (!result.found || !result.date || result.daysUntil === undefined) {
        return { found: false, blockType: 'rest' };
      }
      return {
        found: true,
        blockType: 'rest',
        startDate: toDateString(result.date),
        daysUntilStart: result.daysUntil,
        blockLengthDays: result.blockLengthDays,
      };
    }
    case 'days_until_work': {
      const fromDate = input.fromDate ? new Date(input.fromDate as string) : new Date();
      const result = findNextByWorkState(fromDate, shiftCycle, true);
      if (!result.found || !result.date || result.daysUntil === undefined) {
        return { found: false, daysUntil: null, alreadyInTargetBlock: false };
      }
      return {
        found: true,
        daysUntil: result.daysUntil,
        targetDate: toDateString(result.date),
        alreadyInTargetBlock: result.alreadyInTargetBlock,
      };
    }
    case 'days_until_rest': {
      const fromDate = input.fromDate ? new Date(input.fromDate as string) : new Date();
      const result = findNextByWorkState(fromDate, shiftCycle, false);
      if (!result.found || !result.date || result.daysUntil === undefined) {
        return { found: false, daysUntil: null, alreadyInTargetBlock: false };
      }
      return {
        found: true,
        daysUntil: result.daysUntil,
        targetDate: toDateString(result.date),
        alreadyInTargetBlock: result.alreadyInTargetBlock,
      };
    }
    case 'current_block_info': {
      const date = input.date ? new Date(input.date as string) : new Date();
      return getCurrentBlockInfo(date, shiftCycle);
    }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
