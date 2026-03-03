/**
 * Shift Query Tools
 *
 * Tool execution functions for the Ellie voice assistant.
 * These are the functions called when Claude invokes tools,
 * both client-side (for testing) and mirrored on the backend.
 */

import { RosterType, type ShiftCycle, type ShiftDay } from '@/types';
import {
  getFIFOBlockInfo,
  calculateShiftDay,
  getShiftDaysInRange,
  getShiftStatistics,
  getNextOccurrence,
} from './shiftUtils';
import { addDays, toDateString } from './dateUtils';
import { formatTimeForDisplay, getShiftTimesFromData } from './shiftTimeUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type {
  GetCurrentBlockInfoInput,
  GetDaysUntilInput,
  GetNextBlockInput,
  GetShiftForDateInput,
  GetShiftsInRangeInput,
  GetStatisticsInput,
  GetNextOccurrenceInput,
  ShiftStatisticsResult,
} from '@/types/voiceAssistant';

const MAX_SEARCH_DAYS = 730;

function parseInputDate(rawDate?: string): Date {
  return rawDate ? new Date(rawDate) : new Date();
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
    const isBlockTransition =
      day.isWorkDay === targetIsWorkDay && previousDay.isWorkDay !== targetIsWorkDay;

    if (isBlockTransition) {
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
  const currentDay = calculateShiftDay(fromDate, shiftCycle);
  if (currentDay.isWorkDay === targetIsWorkDay) {
    return {
      found: true,
      date: fromDate,
      daysUntil: 0,
      alreadyInTargetBlock: true,
    };
  }

  let cursor = addDays(fromDate, 1);
  for (let i = 1; i <= MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(cursor, shiftCycle);
    if (day.isWorkDay === targetIsWorkDay) {
      return {
        found: true,
        date: cursor,
        daysUntil: i,
        alreadyInTargetBlock: false,
      };
    }
    cursor = addDays(cursor, 1);
  }

  return { found: false, alreadyInTargetBlock: false };
}

export interface BlockTransitionResult {
  found: boolean;
  blockType: 'work' | 'rest';
  startDate?: string;
  daysUntilStart?: number;
  blockLengthDays?: number;
}

export interface DaysUntilResult {
  found: boolean;
  daysUntil: number | null;
  targetDate?: string;
  alreadyInTargetBlock: boolean;
}

export interface CurrentBlockInfoResult {
  date: string;
  rosterType: 'rotating' | 'fifo';
  blockType: 'work' | 'rest';
  shiftType: ShiftDay['shiftType'];
  dayInBlock: number;
  blockLengthDays: number;
  daysUntilBlockChange: number;
  cycleLength?: number;
}

function buildCurrentBlockInfo(date: Date, shiftCycle: ShiftCycle): CurrentBlockInfoResult {
  const shiftDay = calculateShiftDay(date, shiftCycle);
  const isWorkDay = shiftDay.isWorkDay;

  if (shiftCycle.rosterType === RosterType.FIFO && shiftCycle.fifoConfig) {
    const fifoBlockInfo = getFIFOBlockInfo(date, shiftCycle);
    if (fifoBlockInfo) {
      return {
        date: toDateString(date),
        rosterType: 'fifo',
        blockType: fifoBlockInfo.inWorkBlock ? 'work' : 'rest',
        shiftType: shiftDay.shiftType,
        dayInBlock: fifoBlockInfo.dayInBlock,
        blockLengthDays: fifoBlockInfo.blockLength,
        daysUntilBlockChange: fifoBlockInfo.daysUntilBlockChange,
        cycleLength: fifoBlockInfo.cycleLength,
      };
    }
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
 * Get the shift for a specific date.
 * Tool: get_shift_for_date
 */
export function executeGetShiftForDate(
  input: GetShiftForDateInput,
  shiftCycle: ShiftCycle
): ShiftDay {
  const date = new Date(input.date);
  return calculateShiftDay(date, shiftCycle);
}

/**
 * Get shifts in a date range.
 * Tool: get_shifts_in_range
 */
export function executeGetShiftsInRange(
  input: GetShiftsInRangeInput,
  shiftCycle: ShiftCycle
): ShiftDay[] {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  return getShiftDaysInRange(startDate, endDate, shiftCycle);
}

/**
 * Get the current shift status.
 * Tool: get_current_status
 *
 * Returns today's shift info plus active shift times if available.
 */
export function executeGetCurrentStatus(
  shiftCycle: ShiftCycle,
  userData?: OnboardingData
): {
  todayShift: ShiftDay;
  shiftTimes?: string;
  currentBlockInfo: CurrentBlockInfoResult;
} {
  const today = new Date();
  const todayShift = calculateShiftDay(today, shiftCycle);
  const currentBlockInfo = buildCurrentBlockInfo(today, shiftCycle);

  let shiftTimes: string | undefined;
  if (userData && todayShift.isWorkDay) {
    const times = getShiftTimesFromData(userData);
    const matchingTime = times.find((t) => t.type === todayShift.shiftType);
    if (matchingTime) {
      shiftTimes = `${formatTimeForDisplay(matchingTime.startTime)} to ${formatTimeForDisplay(matchingTime.endTime)}`;
    }
  }

  return { todayShift, shiftTimes, currentBlockInfo };
}

/**
 * Get shift statistics for a period.
 * Tool: get_statistics
 */
export function executeGetStatistics(
  input: GetStatisticsInput,
  shiftCycle: ShiftCycle
): ShiftStatisticsResult {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const stats = getShiftStatistics(startDate, endDate, shiftCycle);
  const rangeDays = getShiftDaysInRange(startDate, endDate, shiftCycle);
  const workBlockDays = rangeDays.filter((day) => day.isWorkDay).length;
  const restBlockDays = rangeDays.length - workBlockDays;

  return {
    totalShifts: stats.dayShifts + stats.nightShifts + stats.morningShifts + stats.afternoonShifts,
    dayShifts: stats.dayShifts,
    nightShifts: stats.nightShifts,
    morningShifts: stats.morningShifts,
    afternoonShifts: stats.afternoonShifts,
    daysOff: stats.daysOff,
    totalDays:
      stats.dayShifts +
      stats.nightShifts +
      stats.morningShifts +
      stats.afternoonShifts +
      stats.daysOff,
    workBlockDays,
    restBlockDays,
  };
}

/**
 * Find the next occurrence of a specific shift type.
 * Tool: get_next_occurrence
 */
export function executeGetNextOccurrence(
  input: GetNextOccurrenceInput,
  shiftCycle: ShiftCycle
): { found: boolean; shiftDay?: ShiftDay } {
  const fromDate = input.fromDate ? new Date(input.fromDate) : new Date();
  const result = getNextOccurrence(fromDate, input.shiftType, shiftCycle);

  if (result) {
    return { found: true, shiftDay: result };
  }
  return { found: false };
}

/**
 * Get the next work block start.
 * Tool: get_next_work_block
 */
export function executeGetNextWorkBlock(
  input: GetNextBlockInput,
  shiftCycle: ShiftCycle
): BlockTransitionResult {
  const fromDate = parseInputDate(input.fromDate);
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

/**
 * Get the next rest block start.
 * Tool: get_next_rest_block
 */
export function executeGetNextRestBlock(
  input: GetNextBlockInput,
  shiftCycle: ShiftCycle
): BlockTransitionResult {
  const fromDate = parseInputDate(input.fromDate);
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

/**
 * Get days until work resumes.
 * Tool: days_until_work
 */
export function executeGetDaysUntilWork(
  input: GetDaysUntilInput,
  shiftCycle: ShiftCycle
): DaysUntilResult {
  const fromDate = parseInputDate(input.fromDate);
  const result = findNextByWorkState(fromDate, shiftCycle, true);

  if (!result.found || !result.date || result.daysUntil === undefined) {
    return {
      found: false,
      daysUntil: null,
      alreadyInTargetBlock: false,
    };
  }

  return {
    found: true,
    daysUntil: result.daysUntil,
    targetDate: toDateString(result.date),
    alreadyInTargetBlock: result.alreadyInTargetBlock,
  };
}

/**
 * Get days until rest/off block starts.
 * Tool: days_until_rest
 */
export function executeGetDaysUntilRest(
  input: GetDaysUntilInput,
  shiftCycle: ShiftCycle
): DaysUntilResult {
  const fromDate = parseInputDate(input.fromDate);
  const result = findNextByWorkState(fromDate, shiftCycle, false);

  if (!result.found || !result.date || result.daysUntil === undefined) {
    return {
      found: false,
      daysUntil: null,
      alreadyInTargetBlock: false,
    };
  }

  return {
    found: true,
    daysUntil: result.daysUntil,
    targetDate: toDateString(result.date),
    alreadyInTargetBlock: result.alreadyInTargetBlock,
  };
}

/**
 * Get current work/rest block metadata.
 * Tool: current_block_info
 */
export function executeGetCurrentBlockInfo(
  input: GetCurrentBlockInfoInput,
  shiftCycle: ShiftCycle
): CurrentBlockInfoResult {
  const date = parseInputDate(input.date);
  return buildCurrentBlockInfo(date, shiftCycle);
}

/**
 * Execute a tool by name with the given input.
 * Used by the backend to dispatch Claude's tool_use calls.
 */
export function executeTool(
  toolName: string,
  input: unknown,
  shiftCycle: ShiftCycle,
  userData?: OnboardingData
): unknown {
  switch (toolName) {
    case 'get_shift_for_date':
      return executeGetShiftForDate(input as GetShiftForDateInput, shiftCycle);
    case 'get_shifts_in_range':
      return executeGetShiftsInRange(input as GetShiftsInRangeInput, shiftCycle);
    case 'get_current_status':
      return executeGetCurrentStatus(shiftCycle, userData);
    case 'get_statistics':
      return executeGetStatistics(input as GetStatisticsInput, shiftCycle);
    case 'get_next_occurrence':
      return executeGetNextOccurrence(input as GetNextOccurrenceInput, shiftCycle);
    case 'get_next_work_block':
      return executeGetNextWorkBlock(input as GetNextBlockInput, shiftCycle);
    case 'get_next_rest_block':
      return executeGetNextRestBlock(input as GetNextBlockInput, shiftCycle);
    case 'days_until_work':
      return executeGetDaysUntilWork(input as GetDaysUntilInput, shiftCycle);
    case 'days_until_rest':
      return executeGetDaysUntilRest(input as GetDaysUntilInput, shiftCycle);
    case 'current_block_info':
      return executeGetCurrentBlockInfo(input as GetCurrentBlockInfoInput, shiftCycle);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
