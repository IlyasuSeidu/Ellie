/**
 * Universal shift query tools for Ellie voice assistant.
 */

import { type ShiftCycle, type ShiftDay } from '@/types';
import { calculateShiftDay, getShiftDaysInRange, getShiftStatistics } from './shiftUtils';
import { addDays, toDateString } from './dateUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type {
  GetCurrentBlockInfoInput,
  GetDaysUntilInput,
  GetNextBlockInput,
  GetNextOccurrenceInput,
  GetShiftForDateInput,
  GetShiftsInRangeInput,
  GetStatisticsInput,
  ShiftStatisticsResult,
} from '@/types/voiceAssistant';

const MAX_SEARCH_DAYS = 730;

export interface BlockTransitionResult {
  found: boolean;
  date?: string;
  daysUntil?: number;
  blockLengthDays?: number;
}

export interface DaysUntilResult {
  found: boolean;
  date?: string;
  daysUntil?: number;
  alreadyInTargetBlock: boolean;
}

export interface CurrentBlockInfoResult {
  date: string;
  isWorkBlock: boolean;
  blockType: 'work' | 'rest';
  dayInBlock: number;
  blockLengthDays: number;
  shift: ShiftDay;
}

function parseInputDate(rawDate?: string): Date {
  return rawDate ? new Date(`${rawDate}T00:00:00`) : new Date();
}

function sameWorkState(day: ShiftDay, targetIsWorkDay: boolean): boolean {
  return day.isWorkDay === targetIsWorkDay;
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
    if (!sameWorkState(day, targetIsWorkDay)) break;
    length += 1;
    cursor = addDays(cursor, 1);
  }

  return length;
}

function findNextBlockStart(
  fromDate: Date,
  shiftCycle: ShiftCycle,
  targetIsWorkDay: boolean
): BlockTransitionResult {
  let previousDay = calculateShiftDay(fromDate, shiftCycle);
  let cursor = addDays(fromDate, 1);

  for (let i = 1; i <= MAX_SEARCH_DAYS; i += 1) {
    const day = calculateShiftDay(cursor, shiftCycle);
    if (day.isWorkDay === targetIsWorkDay && previousDay.isWorkDay !== targetIsWorkDay) {
      return {
        found: true,
        date: toDateString(cursor),
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
): DaysUntilResult {
  const currentDay = calculateShiftDay(fromDate, shiftCycle);
  if (currentDay.isWorkDay === targetIsWorkDay) {
    return {
      found: true,
      date: toDateString(fromDate),
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
        date: toDateString(cursor),
        daysUntil: i,
        alreadyInTargetBlock: false,
      };
    }
    cursor = addDays(cursor, 1);
  }

  return { found: false, alreadyInTargetBlock: false };
}

function findMatchingShiftDefinition(shiftCycle: ShiftCycle, requested: string): Set<string> {
  const normalized = requested.trim().toLowerCase();
  const matches = shiftCycle.shiftDefinitions
    .filter(
      (definition) =>
        definition.id.toLowerCase() === normalized ||
        definition.name.toLowerCase() === normalized ||
        definition.kind.toLowerCase() === normalized ||
        (normalized === 'night' && definition.countsAsNight)
    )
    .map((definition) => definition.id);

  return new Set(matches);
}

export function executeGetShiftForDate(
  input: GetShiftForDateInput,
  shiftCycle: ShiftCycle
): ShiftDay {
  return calculateShiftDay(parseInputDate(input.date), shiftCycle);
}

export function executeGetShiftsInRange(
  input: GetShiftsInRangeInput,
  shiftCycle: ShiftCycle
): ShiftDay[] {
  return getShiftDaysInRange(
    parseInputDate(input.startDate),
    parseInputDate(input.endDate),
    shiftCycle
  );
}

export function executeGetCurrentStatus(
  shiftCycle: ShiftCycle,
  _userData?: OnboardingData
): ShiftDay {
  return calculateShiftDay(new Date(), shiftCycle);
}

export function executeGetStatistics(
  input: GetStatisticsInput,
  shiftCycle: ShiftCycle
): ShiftStatisticsResult {
  const stats = getShiftStatistics(
    parseInputDate(input.startDate),
    parseInputDate(input.endDate),
    shiftCycle
  );
  const definitionCounts: Record<string, number> = {};
  for (const day of getShiftDaysInRange(
    parseInputDate(input.startDate),
    parseInputDate(input.endDate),
    shiftCycle
  )) {
    if (day.universal?.definitionName) {
      definitionCounts[day.universal.definitionName] =
        (definitionCounts[day.universal.definitionName] ?? 0) + 1;
    }
  }

  return {
    totalShifts: stats.workDays,
    dayShifts: stats.dayShifts,
    nightShifts: stats.nightShifts,
    morningShifts: stats.morningShifts,
    afternoonShifts: stats.afternoonShifts,
    daysOff: stats.daysOff,
    totalDays: stats.totalDays,
    definitionCounts,
  };
}

export function executeGetNextOccurrence(
  input: GetNextOccurrenceInput,
  shiftCycle: ShiftCycle
): { found: boolean; date?: string; daysUntil?: number; shift?: ShiftDay } {
  const fromDate = parseInputDate(input.fromDate);
  const definitionIds = findMatchingShiftDefinition(shiftCycle, String(input.shiftType));
  const requestedType = String(input.shiftType).toLowerCase();

  for (let offset = 0; offset <= MAX_SEARCH_DAYS; offset += 1) {
    const candidate = addDays(fromDate, offset);
    const day = calculateShiftDay(candidate, shiftCycle);
    if (
      definitionIds.has(day.universal?.definitionId ?? '') ||
      day.shiftType === requestedType ||
      (requestedType === 'work' && day.isWorkDay) ||
      (requestedType === 'off' && !day.isWorkDay)
    ) {
      return { found: true, date: toDateString(candidate), daysUntil: offset, shift: day };
    }
  }

  return { found: false };
}

export function executeGetNextWorkBlock(
  input: GetNextBlockInput,
  shiftCycle: ShiftCycle
): BlockTransitionResult {
  return findNextBlockStart(parseInputDate(input.fromDate), shiftCycle, true);
}

export function executeGetNextRestBlock(
  input: GetNextBlockInput,
  shiftCycle: ShiftCycle
): BlockTransitionResult {
  return findNextBlockStart(parseInputDate(input.fromDate), shiftCycle, false);
}

export function executeGetDaysUntilWork(
  input: GetDaysUntilInput,
  shiftCycle: ShiftCycle
): DaysUntilResult {
  return findNextByWorkState(parseInputDate(input.fromDate), shiftCycle, true);
}

export function executeGetDaysUntilRest(
  input: GetDaysUntilInput,
  shiftCycle: ShiftCycle
): DaysUntilResult {
  return findNextByWorkState(parseInputDate(input.fromDate), shiftCycle, false);
}

export function executeGetCurrentBlockInfo(
  input: GetCurrentBlockInfoInput,
  shiftCycle: ShiftCycle
): CurrentBlockInfoResult {
  const date = parseInputDate(input.date);
  const shift = calculateShiftDay(date, shiftCycle);
  const targetIsWorkDay = shift.isWorkDay;
  let dayInBlock = 1;
  let cursor = addDays(date, -1);

  for (let i = 0; i < MAX_SEARCH_DAYS; i += 1) {
    const previous = calculateShiftDay(cursor, shiftCycle);
    if (previous.isWorkDay !== targetIsWorkDay) break;
    dayInBlock += 1;
    cursor = addDays(cursor, -1);
  }

  const blockStart = addDays(date, -(dayInBlock - 1));
  return {
    date: toDateString(date),
    isWorkBlock: targetIsWorkDay,
    blockType: targetIsWorkDay ? 'work' : 'rest',
    dayInBlock,
    blockLengthDays: getBlockLengthFromStart(blockStart, shiftCycle, targetIsWorkDay),
    shift,
  };
}

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
      throw new Error(`Unknown shift query tool: ${toolName}`);
  }
}
