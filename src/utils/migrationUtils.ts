import type { OnboardingData } from '@/contexts/OnboardingContext';
import { RosterType, ShiftPattern, type ShiftCycle } from '@/types';

function isFIFOPattern(patternType: ShiftPattern | undefined): boolean {
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

export function migrateShiftCycleToV2(oldCycle: Partial<ShiftCycle>): ShiftCycle {
  const patternType = oldCycle.patternType ?? ShiftPattern.CUSTOM;
  const inferredRosterType =
    oldCycle.rosterType ??
    (oldCycle.fifoConfig || isFIFOPattern(patternType) ? RosterType.FIFO : RosterType.ROTATING);

  return {
    patternType,
    rosterType: inferredRosterType,
    shiftSystem: oldCycle.shiftSystem,
    daysOn: oldCycle.daysOn ?? 0,
    nightsOn: oldCycle.nightsOn ?? 0,
    morningOn: oldCycle.morningOn,
    afternoonOn: oldCycle.afternoonOn,
    nightOn: oldCycle.nightOn,
    daysOff: oldCycle.daysOff ?? 0,
    startDate: oldCycle.startDate ?? new Date().toISOString().slice(0, 10),
    phaseOffset: oldCycle.phaseOffset ?? 0,
    customPattern: oldCycle.customPattern,
    fifoConfig: oldCycle.fifoConfig,
  };
}

export function migrateOnboardingDataToV2(data: OnboardingData): OnboardingData {
  if (data.rosterType) {
    return data;
  }

  if (data.fifoConfig || isFIFOPattern(data.patternType)) {
    return { ...data, rosterType: RosterType.FIFO };
  }

  return { ...data, rosterType: RosterType.ROTATING };
}
