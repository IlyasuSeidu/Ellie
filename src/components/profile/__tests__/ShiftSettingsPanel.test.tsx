import type { TFunction } from 'i18next';
import { ShiftPattern } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { getCyclePositionLabel } from '../ShiftSettingsPanel';
import { alignPhaseOffsetToReferenceDate } from '@/utils/shiftUtils';

const createProfileTranslator = (): TFunction<'profile', undefined> =>
  ((key: string, options?: Record<string, unknown>) => {
    switch (key) {
      case 'shift.dayShift':
        return 'Day Shift';
      case 'shift.nightShift':
        return 'Night Shift';
      case 'shift.morningShifts':
        return 'Morning Shift';
      case 'shift.afternoonShifts':
        return 'Afternoon Shift';
      case 'shift.daysOff':
        return 'Days Off';
      case 'shift.workBlock':
        return 'Work Block';
      case 'shift.restBlock':
        return 'Rest Block';
      case 'shift.cyclePhase':
        return `${String(options?.phase)} - Day ${String(options?.day)} of ${String(options?.total)}`;
      case 'shift.cycleDay':
        return `Day ${String(options?.day)} of cycle`;
      case 'shift.cycleWorkBlock':
        return `Work Block - Day ${String(options?.day)} of ${String(options?.total)}`;
      case 'shift.cycleRestBlock':
        return `Rest Block - Day ${String(options?.day)} of ${String(options?.total)}`;
      default:
        return key;
    }
  }) as unknown as TFunction<'profile', undefined>;

describe('getCyclePositionLabel', () => {
  const t = createProfileTranslator();

  it('uses singular rotating labels for standard two-shift patterns', () => {
    const data: OnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
      phaseOffset: 0,
    };

    expect(getCyclePositionLabel(data, t)).toBe('Day Shift - Day 1 of 4');
  });

  it('uses singular rotating labels for standard three-shift patterns', () => {
    const data: OnboardingData = {
      shiftSystem: '3-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_3_3_3,
      phaseOffset: 3,
    };

    expect(getCyclePositionLabel(data, t)).toBe('Afternoon Shift - Day 1 of 3');
  });

  it('keeps custom rotating patterns aligned with the same phase labels', () => {
    const data: OnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.CUSTOM,
      customPattern: {
        daysOn: 2,
        nightsOn: 2,
        daysOff: 2,
      },
      phaseOffset: 2,
    };

    expect(getCyclePositionLabel(data, t)).toBe('Night Shift - Day 1 of 2');
  });

  it('falls back to friendly labels when resync-specific keys are unavailable', () => {
    const data: OnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
      phaseOffset: 4,
    };

    expect(getCyclePositionLabel(data, t)).toBe('Night Shift - Day 1 of 4');
  });

  it('shows block labels for FIFO positions', () => {
    const workBlockData: OnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'fifo',
      patternType: ShiftPattern.FIFO_8_6,
      phaseOffset: 2,
      fifoConfig: {
        workBlockDays: 8,
        restBlockDays: 6,
        workBlockPattern: 'straight-days',
      },
    };

    const restBlockData: OnboardingData = {
      ...workBlockData,
      phaseOffset: 10,
    };

    expect(getCyclePositionLabel(workBlockData, t)).toBe('Work Block - Day 3 of 8');
    expect(getCyclePositionLabel(restBlockData, t)).toBe('Rest Block - Day 3 of 6');
  });

  it('uses anchored phase offset to show the current rotating phase for today', () => {
    const today = new Date('2026-03-16T09:00:00.000Z');
    const data: OnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
      startDate: new Date('2026-03-10T00:00:00.000Z'),
      phaseOffset: alignPhaseOffsetToReferenceDate(5, 12, '2026-03-10', today),
    };

    expect(getCyclePositionLabel(data, t, today)).toBe('Night Shift - Day 2 of 4');
  });
});
