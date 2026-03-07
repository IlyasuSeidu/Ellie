import { renderHook } from '@testing-library/react-native';
import { useActiveShift } from '../useActiveShift';
import { toDateString } from '@/utils/dateUtils';
import { RosterType, ShiftPattern, ShiftSystem, type ShiftCycle } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';

function buildTwoShiftCycle(startDate: string): ShiftCycle {
  return {
    patternType: ShiftPattern.CUSTOM,
    rosterType: RosterType.ROTATING,
    shiftSystem: ShiftSystem.TWO_SHIFT,
    daysOn: 1,
    nightsOn: 1,
    daysOff: 1,
    startDate,
    phaseOffset: 0,
  };
}

function buildThreeShiftCycle(startDate: string): ShiftCycle {
  return {
    patternType: ShiftPattern.CUSTOM,
    rosterType: RosterType.ROTATING,
    shiftSystem: ShiftSystem.THREE_SHIFT,
    daysOn: 0,
    nightsOn: 0,
    morningOn: 1,
    afternoonOn: 1,
    nightOn: 1,
    daysOff: 1,
    startDate,
    phaseOffset: 0,
  };
}

const twoShiftData: OnboardingData = {
  shiftSystem: '2-shift',
  shiftTimes: {
    dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
    nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
  },
};

const threeShiftData: OnboardingData = {
  shiftSystem: '3-shift',
  shiftTimes: {
    morningShift: { startTime: '05:00', endTime: '13:00', duration: 8 },
    afternoonShift: { startTime: '13:00', endTime: '21:00', duration: 8 },
    nightShift3: { startTime: '21:00', endTime: '05:00', duration: 8 },
  },
};

describe('useActiveShift', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks a rotating day shift as live during day hours', () => {
    jest.setSystemTime(new Date('2026-03-07T10:00:00'));

    const { result } = renderHook(() =>
      useActiveShift(buildTwoShiftCycle('2026-03-07'), twoShiftData, 0, toDateString(new Date()))
    );

    expect(result.current?.shiftType).toBe('day');
    expect(result.current?.accentShiftType).toBe('day');
    expect(result.current?.isOnShift).toBe(true);
  });

  it('keeps accent colors off before a scheduled rotating day shift starts', () => {
    jest.setSystemTime(new Date('2026-03-07T06:30:00'));

    const { result } = renderHook(() =>
      useActiveShift(buildTwoShiftCycle('2026-03-07'), twoShiftData, 0, toDateString(new Date()))
    );

    expect(result.current?.shiftType).toBe('day');
    expect(result.current?.accentShiftType).toBe('off');
    expect(result.current?.isOnShift).toBe(false);
  });

  it('marks a rotating night shift as live during the same-night work window', () => {
    jest.setSystemTime(new Date('2026-03-08T22:00:00'));

    const { result } = renderHook(() =>
      useActiveShift(buildTwoShiftCycle('2026-03-07'), twoShiftData, 0, toDateString(new Date()))
    );

    expect(result.current?.shiftType).toBe('night');
    expect(result.current?.accentShiftType).toBe('night');
    expect(result.current?.isOnShift).toBe(true);
  });

  it('keeps a rotating night shift live after midnight via overnight carry-over', () => {
    jest.setSystemTime(new Date('2026-03-09T02:00:00'));

    const { result } = renderHook(() =>
      useActiveShift(buildTwoShiftCycle('2026-03-07'), twoShiftData, 0, toDateString(new Date()))
    );

    expect(result.current?.shiftType).toBe('night');
    expect(result.current?.accentShiftType).toBe('night');
    expect(result.current?.scheduledShiftType).toBe('off');
    expect(result.current?.isOnShift).toBe(true);
    expect(result.current?.isOvernightCarryOver).toBe(true);
  });

  it('marks a rotating morning shift as live during morning hours', () => {
    jest.setSystemTime(new Date('2026-03-07T09:00:00'));

    const { result } = renderHook(() =>
      useActiveShift(
        buildThreeShiftCycle('2026-03-07'),
        threeShiftData,
        0,
        toDateString(new Date())
      )
    );

    expect(result.current?.shiftType).toBe('morning');
    expect(result.current?.accentShiftType).toBe('morning');
    expect(result.current?.isOnShift).toBe(true);
  });

  it('marks a rotating afternoon shift as live during afternoon hours', () => {
    jest.setSystemTime(new Date('2026-03-08T15:00:00'));

    const { result } = renderHook(() =>
      useActiveShift(
        buildThreeShiftCycle('2026-03-07'),
        threeShiftData,
        0,
        toDateString(new Date())
      )
    );

    expect(result.current?.shiftType).toBe('afternoon');
    expect(result.current?.accentShiftType).toBe('afternoon');
    expect(result.current?.isOnShift).toBe(true);
  });

  it('marks a rotating 3-shift night shift as live during night hours', () => {
    jest.setSystemTime(new Date('2026-03-09T22:30:00'));

    const { result } = renderHook(() =>
      useActiveShift(
        buildThreeShiftCycle('2026-03-07'),
        threeShiftData,
        0,
        toDateString(new Date())
      )
    );

    expect(result.current?.shiftType).toBe('night');
    expect(result.current?.accentShiftType).toBe('night');
    expect(result.current?.isOnShift).toBe(true);
  });
});
