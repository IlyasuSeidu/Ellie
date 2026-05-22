import type { ShiftCycle, ShiftDay, UniversalShiftSchedule } from '@/types';
import { calculateUniversalShiftDay } from '@/utils/universalShiftUtils';
import { getDateRange, toDateString } from '@/utils/dateUtils';

export interface ShiftStatistics {
  totalDays: number;
  workDays: number;
  daysOff: number;
  dayShifts: number;
  nightShifts: number;
  morningShifts: number;
  afternoonShifts: number;
}

export interface PhaseInfo {
  currentPhase: ShiftDay['shiftType'];
  position: number;
  dayInPhase: number;
  totalDaysInPhase: number;
}

export function buildShiftCycle(data: {
  universalSchedule?: UniversalShiftSchedule;
}): ShiftCycle | null {
  return data.universalSchedule ?? null;
}

export function calculateShiftDay(date: Date, shiftCycle: ShiftCycle): ShiftDay {
  return calculateUniversalShiftDay(date, shiftCycle);
}

export function getShiftDaysInRange(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): ShiftDay[] {
  return getDateRange(startDate, endDate).map((date) => calculateShiftDay(date, shiftCycle));
}

export function getShiftStatistics(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle
): ShiftStatistics {
  const days = getShiftDaysInRange(startDate, endDate, shiftCycle);
  const stats: ShiftStatistics = {
    totalDays: days.length,
    workDays: 0,
    daysOff: 0,
    dayShifts: 0,
    nightShifts: 0,
    morningShifts: 0,
    afternoonShifts: 0,
  };

  for (const day of days) {
    if (day.isWorkDay) stats.workDays += 1;
    else stats.daysOff += 1;

    if (day.shiftType === 'morning') stats.morningShifts += 1;
    else if (day.shiftType === 'afternoon') stats.afternoonShifts += 1;
    else if (day.shiftType === 'night' || day.isNightShift) stats.nightShifts += 1;
    else if (day.shiftType === 'day') stats.dayShifts += 1;
  }

  return stats;
}

export function getPhaseInfo(date: Date, shiftCycle: ShiftCycle): PhaseInfo {
  const day = calculateShiftDay(date, shiftCycle);
  return {
    currentPhase: day.shiftType,
    position: day.universal?.sequenceIndex ?? 0,
    dayInPhase: (day.universal?.sequenceIndex ?? 0) + 1,
    totalDaysInPhase: day.universal?.cycleLength ?? shiftCycle.sequence.length,
  };
}

export function getNextOccurrence(
  startDate: Date,
  shiftCycle: ShiftCycle,
  targetShiftType: ShiftDay['shiftType'],
  maxDaysAhead = 365
): Date | null {
  for (let offset = 0; offset <= maxDaysAhead; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + offset);
    const day = calculateShiftDay(candidate, shiftCycle);
    if (day.shiftType === targetShiftType) {
      return candidate;
    }
  }
  return null;
}

export function getNextShift(
  startDate: Date,
  shiftCycle: ShiftCycle,
  maxDaysAhead = 365
): Date | null {
  for (let offset = 0; offset <= maxDaysAhead; offset += 1) {
    const candidate = new Date(startDate);
    candidate.setDate(startDate.getDate() + offset);
    const day = calculateShiftDay(candidate, shiftCycle);
    if (day.isWorkDay) {
      return candidate;
    }
  }
  return null;
}

export function countWorkDays(startDate: Date, endDate: Date, shiftCycle: ShiftCycle): number {
  return getShiftStatistics(startDate, endDate, shiftCycle).workDays;
}

export function findNextDayOff(
  fromDate: Date,
  shiftCycle: ShiftCycle,
  maxDaysAhead = 365
): ShiftDay | null {
  for (let offset = 1; offset <= maxDaysAhead; offset += 1) {
    const candidate = new Date(fromDate);
    candidate.setDate(fromDate.getDate() + offset);
    const day = calculateShiftDay(candidate, shiftCycle);
    if (!day.isWorkDay) {
      return day;
    }
  }
  return null;
}

export function alignPhaseOffsetToReferenceDate(
  selectedPosition: number,
  cycleLength: number,
  startDate: Date | string | undefined,
  referenceDate: Date = new Date()
): number {
  if (!startDate || cycleLength <= 0) return selectedPosition;
  const start = typeof startDate === 'string' ? new Date(`${startDate}T00:00:00`) : startDate;
  if (Number.isNaN(start.getTime())) return selectedPosition;
  const diffDays = Math.floor(
    (new Date(toDateString(referenceDate)).getTime() - new Date(toDateString(start)).getTime()) /
      86_400_000
  );
  return (((selectedPosition - diffDays) % cycleLength) + cycleLength) % cycleLength;
}
