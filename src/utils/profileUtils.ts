/**
 * Profile Utility Functions
 *
 * Shared display-name helpers for profile and completion screens.
 * Extracted from PremiumCompletionScreen for reuse across the app.
 */

import { ShiftPattern, ShiftSystem, type FIFOConfig } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';

/**
 * Get human-readable pattern name for display
 */
export function getPatternDisplayName(data: {
  patternType?: ShiftPattern;
  shiftSystem?: string;
  customPattern?: OnboardingData['customPattern'];
  fifoConfig?: FIFOConfig;
}): string {
  // Handle FIFO custom patterns
  if (data.patternType === ShiftPattern.FIFO_CUSTOM && data.fifoConfig) {
    const { workBlockDays, restBlockDays } = data.fifoConfig;
    return `${workBlockDays}/${restBlockDays} Custom FIFO`;
  }

  // Handle rotating custom patterns
  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    if (data.shiftSystem === '3-shift') {
      const { morningOn = 0, afternoonOn = 0, nightOn = 0, daysOff = 0 } = data.customPattern;
      return `${morningOn}-${afternoonOn}-${nightOn}-${daysOff} Custom Rotation`;
    }
    const { daysOn = 0, nightsOn = 0, daysOff = 0 } = data.customPattern;
    return `${daysOn}-${nightsOn}-${daysOff} Custom Rotation`;
  }

  const patternNames: Record<ShiftPattern, string> = {
    [ShiftPattern.STANDARD_4_4_4]: '4-4-4 Rotation',
    [ShiftPattern.STANDARD_7_7_7]: '7-7-7 Rotation',
    [ShiftPattern.STANDARD_2_2_3]: '2-2-3 (Pitman)',
    [ShiftPattern.STANDARD_5_5_5]: '5-5-5 Rotation',
    [ShiftPattern.STANDARD_3_3_3]: '3-3-3 Rotation',
    [ShiftPattern.STANDARD_10_10_10]: '10-10-10 Rotation',
    [ShiftPattern.CONTINENTAL]: 'Continental',
    [ShiftPattern.PITMAN]: 'Pitman',
    [ShiftPattern.CUSTOM]: 'Custom Rotation',
    [ShiftPattern.FIFO_8_6]: '8/6 FIFO Roster',
    [ShiftPattern.FIFO_7_7]: '7/7 FIFO Roster',
    [ShiftPattern.FIFO_14_14]: '14/14 FIFO Roster',
    [ShiftPattern.FIFO_14_7]: '14/7 FIFO Roster',
    [ShiftPattern.FIFO_21_7]: '21/7 FIFO Roster',
    [ShiftPattern.FIFO_28_14]: '28/14 FIFO Roster',
    [ShiftPattern.FIFO_CUSTOM]: 'Custom FIFO Roster',
  };

  return patternNames[data.patternType || ShiftPattern.CUSTOM];
}

/**
 * Get shift system display name
 */
export function getShiftSystemDisplayName(shiftSystem?: string): string {
  if (shiftSystem === '3-shift' || shiftSystem === ShiftSystem.THREE_SHIFT) {
    return '3-Shift (8h)';
  }
  return '2-Shift (12h)';
}

/**
 * Get roster type display name
 */
export function getRosterTypeDisplayName(rosterType?: string): string {
  return rosterType === 'fifo' ? 'FIFO' : 'Rotating';
}

/**
 * Get FIFO work pattern description
 */
export function getFIFOWorkPatternName(fifoConfig?: FIFOConfig): string {
  if (!fifoConfig) return 'Not set';

  const { workBlockPattern, swingPattern } = fifoConfig;

  if (workBlockPattern === 'straight-days') return 'Straight Days';
  if (workBlockPattern === 'straight-nights') return 'Straight Nights';
  if (workBlockPattern === 'swing' && swingPattern) {
    return `Swing (${swingPattern.daysOnDayShift}D + ${swingPattern.daysOnNightShift}N)`;
  }
  if (workBlockPattern === 'custom') return 'Custom Sequence';

  return 'Not set';
}

/**
 * Get FIFO cycle description
 */
export function getFIFOCycleDescription(fifoConfig?: FIFOConfig): string {
  if (!fifoConfig) return 'Not set';
  const { workBlockDays, restBlockDays } = fifoConfig;
  return `${workBlockDays} days work, ${restBlockDays} days home`;
}

/**
 * Compute total cycle length in days
 */
export function getCycleLengthDays(data: OnboardingData): number | null {
  if (data.rosterType === 'fifo' && data.fifoConfig) {
    return data.fifoConfig.workBlockDays + data.fifoConfig.restBlockDays;
  }

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    if (data.shiftSystem === '3-shift') {
      const { morningOn = 0, afternoonOn = 0, nightOn = 0, daysOff = 0 } = data.customPattern;
      return morningOn + afternoonOn + nightOn + daysOff;
    }
    return data.customPattern.daysOn + data.customPattern.nightsOn + data.customPattern.daysOff;
  }

  // Standard patterns — extract from pattern name
  const cycleLengths: Partial<Record<ShiftPattern, number>> = {
    [ShiftPattern.STANDARD_3_3_3]: 9,
    [ShiftPattern.STANDARD_4_4_4]: 12,
    [ShiftPattern.STANDARD_5_5_5]: 15,
    [ShiftPattern.STANDARD_7_7_7]: 21,
    [ShiftPattern.STANDARD_10_10_10]: 30,
    [ShiftPattern.STANDARD_2_2_3]: 7,
    [ShiftPattern.CONTINENTAL]: 8,
    [ShiftPattern.PITMAN]: 14,
    [ShiftPattern.FIFO_7_7]: 14,
    [ShiftPattern.FIFO_8_6]: 14,
    [ShiftPattern.FIFO_14_14]: 28,
    [ShiftPattern.FIFO_14_7]: 21,
    [ShiftPattern.FIFO_21_7]: 28,
    [ShiftPattern.FIFO_28_14]: 42,
  };

  return data.patternType ? (cycleLengths[data.patternType] ?? null) : null;
}

/**
 * Compute work:rest ratio string
 */
export function getWorkRestRatio(data: OnboardingData): string {
  if (data.rosterType === 'fifo' && data.fifoConfig) {
    const { workBlockDays, restBlockDays } = data.fifoConfig;
    const gcd = greatestCommonDivisor(workBlockDays, restBlockDays);
    return `${workBlockDays / gcd}:${restBlockDays / gcd}`;
  }

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    const workDays =
      data.shiftSystem === '3-shift'
        ? (data.customPattern.morningOn ?? 0) +
          (data.customPattern.afternoonOn ?? 0) +
          (data.customPattern.nightOn ?? 0)
        : data.customPattern.daysOn + data.customPattern.nightsOn;
    const restDays = data.customPattern.daysOff;
    if (restDays === 0) return `${workDays}:0`;
    const gcd = greatestCommonDivisor(workDays, restDays);
    return `${workDays / gcd}:${restDays / gcd}`;
  }

  // Standard patterns
  const ratios: Partial<Record<ShiftPattern, string>> = {
    [ShiftPattern.STANDARD_3_3_3]: '2:1',
    [ShiftPattern.STANDARD_4_4_4]: '2:1',
    [ShiftPattern.STANDARD_5_5_5]: '2:1',
    [ShiftPattern.STANDARD_7_7_7]: '2:1',
    [ShiftPattern.STANDARD_10_10_10]: '2:1',
    [ShiftPattern.STANDARD_2_2_3]: '4:3',
    [ShiftPattern.CONTINENTAL]: '1:1',
    [ShiftPattern.PITMAN]: '1:1',
    [ShiftPattern.FIFO_7_7]: '1:1',
    [ShiftPattern.FIFO_8_6]: '4:3',
    [ShiftPattern.FIFO_14_14]: '1:1',
    [ShiftPattern.FIFO_14_7]: '2:1',
    [ShiftPattern.FIFO_21_7]: '3:1',
    [ShiftPattern.FIFO_28_14]: '2:1',
  };

  return data.patternType ? (ratios[data.patternType] ?? '-') : '-';
}

/**
 * Format 24h time string for display (e.g., "06:00" → "6:00 AM")
 */
export function formatShiftTime(time?: string): string {
  if (!time) return 'Not set';

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr || '00';

  if (isNaN(hour)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  if (b === 0) return a;
  return greatestCommonDivisor(b, a % b);
}
