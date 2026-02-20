/**
 * Shift Query Tools
 *
 * Tool execution functions for the Ellie voice assistant.
 * These are the functions called when Claude invokes tools,
 * both client-side (for testing) and mirrored on the backend.
 */

import type { ShiftCycle, ShiftDay } from '@/types';
import {
  calculateShiftDay,
  getShiftDaysInRange,
  getShiftStatistics,
  getNextOccurrence,
} from './shiftUtils';
import { formatTimeForDisplay, getShiftTimesFromData } from './shiftTimeUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type {
  GetShiftForDateInput,
  GetShiftsInRangeInput,
  GetStatisticsInput,
  GetNextOccurrenceInput,
  ShiftStatisticsResult,
} from '@/types/voiceAssistant';

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
} {
  const today = new Date();
  const todayShift = calculateShiftDay(today, shiftCycle);

  let shiftTimes: string | undefined;
  if (userData && todayShift.isWorkDay) {
    const times = getShiftTimesFromData(userData);
    const matchingTime = times.find((t) => t.type === todayShift.shiftType);
    if (matchingTime) {
      shiftTimes = `${formatTimeForDisplay(matchingTime.startTime)} to ${formatTimeForDisplay(matchingTime.endTime)}`;
    }
  }

  return { todayShift, shiftTimes };
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
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
