/**
 * Profile Utility Functions
 *
 * Shared display-name helpers for profile and completion screens.
 * Extracted from PremiumCompletionScreen for reuse across the app.
 */

import { ShiftPattern, ShiftSystem, type FIFOConfig } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import i18n from '@/i18n';

const patternNameTranslationKeys: Partial<Record<ShiftPattern, string>> = {
  [ShiftPattern.STANDARD_3_3_3]: 'shift.patternSelector.patterns.STANDARD_3_3_3.name',
  [ShiftPattern.STANDARD_4_4_4]: 'shift.patternSelector.patterns.STANDARD_4_4_4.name',
  [ShiftPattern.STANDARD_5_5_5]: 'shift.patternSelector.patterns.STANDARD_5_5_5.name',
  [ShiftPattern.STANDARD_7_7_7]: 'shift.patternSelector.patterns.STANDARD_7_7_7.name',
  [ShiftPattern.STANDARD_10_10_10]: 'shift.patternSelector.patterns.STANDARD_10_10_10.name',
  [ShiftPattern.STANDARD_2_2_3]: 'shift.patternSelector.patterns.STANDARD_2_2_3.name',
  [ShiftPattern.CONTINENTAL]: 'shift.patternSelector.patterns.CONTINENTAL.name',
  [ShiftPattern.PITMAN]: 'shift.patternSelector.patterns.PITMAN.name',
  [ShiftPattern.CUSTOM]: 'shift.patternSelector.patterns.CUSTOM.name',
  [ShiftPattern.FIFO_7_7]: 'shift.patternSelector.patterns.FIFO_7_7.name',
  [ShiftPattern.FIFO_8_6]: 'shift.patternSelector.patterns.FIFO_8_6.name',
  [ShiftPattern.FIFO_14_14]: 'shift.patternSelector.patterns.FIFO_14_14.name',
  [ShiftPattern.FIFO_14_7]: 'shift.patternSelector.patterns.FIFO_14_7.name',
  [ShiftPattern.FIFO_21_7]: 'shift.patternSelector.patterns.FIFO_21_7.name',
  [ShiftPattern.FIFO_28_14]: 'shift.patternSelector.patterns.FIFO_28_14.name',
  [ShiftPattern.FIFO_CUSTOM]: 'shift.patternSelector.patterns.FIFO_CUSTOM.name',
};

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
    return i18n.t('shift.profileUtils.customFIFO', {
      ns: 'profile',
      workBlockDays,
      restBlockDays,
      defaultValue: '{{workBlockDays}}/{{restBlockDays}} Custom FIFO',
    });
  }

  // Handle rotating custom patterns
  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    if (data.shiftSystem === '3-shift') {
      const { morningOn = 0, afternoonOn = 0, nightOn = 0, daysOff = 0 } = data.customPattern;
      return i18n.t('shift.profileUtils.customRotationThreeShift', {
        ns: 'profile',
        morningOn,
        afternoonOn,
        nightOn,
        daysOff,
        defaultValue: '{{morningOn}}-{{afternoonOn}}-{{nightOn}}-{{daysOff}} Custom Rotation',
      });
    }
    const { daysOn = 0, nightsOn = 0, daysOff = 0 } = data.customPattern;
    return i18n.t('shift.profileUtils.customRotationTwoShift', {
      ns: 'profile',
      daysOn,
      nightsOn,
      daysOff,
      defaultValue: '{{daysOn}}-{{nightsOn}}-{{daysOff}} Custom Rotation',
    });
  }

  const patternType = data.patternType || ShiftPattern.CUSTOM;
  const key = patternNameTranslationKeys[patternType];
  if (!key) {
    return i18n.t('shift.patternSelector.patterns.CUSTOM.name', {
      ns: 'profile',
      defaultValue: 'Custom Rotation',
    });
  }
  return i18n.t(key, {
    ns: 'profile',
    defaultValue: i18n.t('shift.patternSelector.patterns.CUSTOM.name', {
      ns: 'profile',
      defaultValue: 'Custom Rotation',
    }),
  });
}

/**
 * Get shift system display name
 */
export function getShiftSystemDisplayName(shiftSystem?: string): string {
  if (shiftSystem === '3-shift' || shiftSystem === ShiftSystem.THREE_SHIFT) {
    return i18n.t('shift.chips.threeShift', {
      ns: 'profile',
      defaultValue: '3-Shift (8h)',
    });
  }
  return i18n.t('shift.chips.twoShift', {
    ns: 'profile',
    defaultValue: '2-Shift (12h)',
  });
}

/**
 * Get roster type display name
 */
export function getRosterTypeDisplayName(rosterType?: string): string {
  return rosterType === 'fifo'
    ? i18n.t('shift.chips.fifo', {
        ns: 'profile',
        defaultValue: 'FIFO',
      })
    : i18n.t('shift.chips.rotating', {
        ns: 'profile',
        defaultValue: 'Rotating',
      });
}

/**
 * Get FIFO work pattern description
 */
export function getFIFOWorkPatternName(fifoConfig?: FIFOConfig): string {
  if (!fifoConfig) {
    return i18n.t('completion.summary.notSet', {
      ns: 'onboarding',
      defaultValue: 'Not set',
    });
  }

  const { workBlockPattern, swingPattern } = fifoConfig;

  if (workBlockPattern === 'straight-days') {
    return i18n.t('shift.chips.straightDays', {
      ns: 'profile',
      defaultValue: 'Straight Days',
    });
  }
  if (workBlockPattern === 'straight-nights') {
    return i18n.t('shift.chips.straightNights', {
      ns: 'profile',
      defaultValue: 'Straight Nights',
    });
  }
  if (workBlockPattern === 'swing' && swingPattern) {
    const swingLabel = i18n.t('shift.chips.swing', {
      ns: 'profile',
      defaultValue: 'Swing',
    });
    const dayAbbrev = i18n.t('shift.profileUtils.dayAbbrev', {
      ns: 'profile',
      defaultValue: 'D',
    });
    const nightAbbrev = i18n.t('shift.profileUtils.nightAbbrev', {
      ns: 'profile',
      defaultValue: 'N',
    });
    return `${swingLabel} (${swingPattern.daysOnDayShift}${dayAbbrev} + ${swingPattern.daysOnNightShift}${nightAbbrev})`;
  }
  if (workBlockPattern === 'custom') {
    return i18n.t('shift.chips.custom', {
      ns: 'profile',
      defaultValue: 'Custom',
    });
  }

  return i18n.t('completion.summary.notSet', {
    ns: 'onboarding',
    defaultValue: 'Not set',
  });
}

/**
 * Get FIFO cycle description
 */
export function getFIFOCycleDescription(fifoConfig?: FIFOConfig): string {
  if (!fifoConfig) {
    return i18n.t('completion.summary.notSet', {
      ns: 'onboarding',
      defaultValue: 'Not set',
    });
  }
  const { workBlockDays, restBlockDays } = fifoConfig;
  const workText = i18n.t('shift.configCard.workDaysOnSite', {
    ns: 'profile',
    count: workBlockDays,
    defaultValue: '{{count}} days on-site',
  });
  const restText = i18n.t('shift.configCard.restDaysAtHome', {
    ns: 'profile',
    count: restBlockDays,
    defaultValue: '{{count}} days at home',
  });
  return `${workText}, ${restText}`;
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
  if (!time) {
    return i18n.t('completion.summary.notSet', {
      ns: 'onboarding',
      defaultValue: 'Not set',
    });
  }

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
