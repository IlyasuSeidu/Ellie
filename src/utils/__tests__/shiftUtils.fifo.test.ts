import type { OnboardingData } from '@/contexts/OnboardingContext';
import { RosterType, ShiftPattern } from '@/types';
import {
  buildShiftCycle,
  calculateShiftDay,
  getDefaultFIFOConfig,
  getFIFOBlockInfo,
} from '../shiftUtils';

describe('shiftUtils FIFO', () => {
  it('builds default fifo cycle for predefined fifo pattern', () => {
    const data: OnboardingData = {
      name: 'Worker',
      patternType: ShiftPattern.FIFO_8_6,
      rosterType: 'fifo',
      startDate: new Date('2026-01-01'),
      phaseOffset: 0,
    };

    const cycle = buildShiftCycle(data);
    expect(cycle).not.toBeNull();
    expect(cycle?.rosterType).toBe(RosterType.FIFO);
    expect(cycle?.fifoConfig?.workBlockDays).toBe(8);
    expect(cycle?.fifoConfig?.restBlockDays).toBe(6);
  });

  it('uses custom fifo config for fifo custom pattern', () => {
    const data: OnboardingData = {
      name: 'Worker',
      patternType: ShiftPattern.FIFO_CUSTOM,
      rosterType: 'fifo',
      startDate: new Date('2026-01-01'),
      phaseOffset: 0,
      fifoConfig: {
        workBlockDays: 10,
        restBlockDays: 5,
        workBlockPattern: 'straight-days',
      },
    };

    const cycle = buildShiftCycle(data);
    expect(cycle?.fifoConfig?.workBlockDays).toBe(10);
    expect(cycle?.daysOn).toBe(10);
    expect(cycle?.daysOff).toBe(5);
  });

  it('calculates work and rest days for fifo cycles', () => {
    const fifoConfig = getDefaultFIFOConfig(ShiftPattern.FIFO_8_6)!;
    const cycle = {
      patternType: ShiftPattern.FIFO_8_6,
      rosterType: RosterType.FIFO,
      daysOn: fifoConfig.workBlockDays,
      nightsOn: 0,
      daysOff: fifoConfig.restBlockDays,
      startDate: '2026-01-01',
      phaseOffset: 0,
      fifoConfig,
    };

    const workDay = calculateShiftDay(new Date('2026-01-03'), cycle);
    const restDay = calculateShiftDay(new Date('2026-01-10'), cycle);

    expect(workDay.isWorkDay).toBe(true);
    expect(restDay.isWorkDay).toBe(false);
    expect(restDay.shiftType).toBe('off');
  });

  it('returns fifo block info with day position and countdown', () => {
    const fifoConfig = getDefaultFIFOConfig(ShiftPattern.FIFO_7_7)!;
    const cycle = {
      patternType: ShiftPattern.FIFO_7_7,
      rosterType: RosterType.FIFO,
      daysOn: fifoConfig.workBlockDays,
      nightsOn: 0,
      daysOff: fifoConfig.restBlockDays,
      startDate: '2026-01-01',
      phaseOffset: 0,
      fifoConfig,
    };

    const info = getFIFOBlockInfo(new Date('2026-01-04'), cycle);
    expect(info).not.toBeNull();
    expect(info?.inWorkBlock).toBe(true);
    expect(info?.dayInBlock).toBe(4);
    expect(info?.daysUntilBlockChange).toBe(3);
  });
});
