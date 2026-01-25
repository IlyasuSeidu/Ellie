/**
 * Shift Utilities Test Suite
 *
 * Comprehensive tests for shift calculation functions with edge cases.
 */

import {
  getShiftPattern,
  getShiftCycle,
  calculateShiftDay,
  isWorkDay,
  getNextShift,
  getShiftDaysInRange,
  countWorkDays,
  getShiftStatistics,
  isNightShift,
  getPhaseInfo,
} from '@/utils/shiftUtils';
import { ShiftPattern } from '@/types';

describe('getShiftPattern', () => {
  it('should return correct pattern for STANDARD_3_3_3', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_3_3_3);
    expect(pattern).toEqual({
      daysOn: 3,
      nightsOn: 3,
      daysOff: 3,
    });
  });

  it('should return correct pattern for STANDARD_5_5_5', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_5_5_5);
    expect(pattern).toEqual({
      daysOn: 5,
      nightsOn: 5,
      daysOff: 5,
    });
  });

  it('should return correct pattern for STANDARD_10_10_10', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_10_10_10);
    expect(pattern).toEqual({
      daysOn: 10,
      nightsOn: 10,
      daysOff: 10,
    });
  });

  it('should return correct pattern for STANDARD_2_2_3', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_2_2_3);
    expect(pattern).toEqual({
      daysOn: 2,
      nightsOn: 2,
      daysOff: 3,
    });
  });

  it('should return correct pattern for STANDARD_4_4_4', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_4_4_4);
    expect(pattern).toEqual({
      daysOn: 4,
      nightsOn: 4,
      daysOff: 4,
    });
  });

  it('should return correct pattern for STANDARD_7_7_7', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_7_7_7);
    expect(pattern).toEqual({
      daysOn: 7,
      nightsOn: 7,
      daysOff: 7,
    });
  });

  it('should return zeros for CUSTOM pattern', () => {
    const pattern = getShiftPattern(ShiftPattern.CUSTOM);
    expect(pattern).toEqual({
      daysOn: 0,
      nightsOn: 0,
      daysOff: 0,
    });
  });
});

describe('getShiftCycle', () => {
  it('should create a valid shift cycle', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

    expect(cycle).toEqual({
      patternType: ShiftPattern.STANDARD_3_3_3,
      daysOn: 3,
      nightsOn: 3,
      daysOff: 3,
      startDate: '2024-01-01',
      phaseOffset: 0,
    });
  });

  it('should apply phase offset', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_5_5_5, '2024-01-01', 5);

    expect(cycle.phaseOffset).toBe(5);
  });

  it('should default phase offset to 0', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2024-06-15');

    expect(cycle.phaseOffset).toBe(0);
  });
});

describe('calculateShiftDay', () => {
  describe('STANDARD_3_3_3 pattern', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

    it('should calculate day shift correctly', () => {
      // Day 0 (Jan 1) - first day shift
      const day0 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(day0).toEqual({
        date: '2024-01-01',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      });

      // Day 2 (Jan 3) - last day shift
      const day2 = calculateShiftDay(new Date('2024-01-03'), cycle);
      expect(day2).toEqual({
        date: '2024-01-03',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      });
    });

    it('should calculate night shift correctly', () => {
      // Day 3 (Jan 4) - first night shift
      const day3 = calculateShiftDay(new Date('2024-01-04'), cycle);
      expect(day3).toEqual({
        date: '2024-01-04',
        isWorkDay: true,
        isNightShift: true,
        shiftType: 'night',
      });

      // Day 5 (Jan 6) - last night shift
      const day5 = calculateShiftDay(new Date('2024-01-06'), cycle);
      expect(day5).toEqual({
        date: '2024-01-06',
        isWorkDay: true,
        isNightShift: true,
        shiftType: 'night',
      });
    });

    it('should calculate days off correctly', () => {
      // Day 6 (Jan 7) - first day off
      const day6 = calculateShiftDay(new Date('2024-01-07'), cycle);
      expect(day6).toEqual({
        date: '2024-01-07',
        isWorkDay: false,
        isNightShift: false,
        shiftType: 'off',
      });

      // Day 8 (Jan 9) - last day off
      const day8 = calculateShiftDay(new Date('2024-01-09'), cycle);
      expect(day8).toEqual({
        date: '2024-01-09',
        isWorkDay: false,
        isNightShift: false,
        shiftType: 'off',
      });
    });

    it('should cycle correctly after first rotation', () => {
      // Day 9 (Jan 10) - back to day shift
      const day9 = calculateShiftDay(new Date('2024-01-10'), cycle);
      expect(day9).toEqual({
        date: '2024-01-10',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      });
    });
  });

  describe('phase offset handling', () => {
    it('should handle phase offset correctly', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 3);

      // With offset of 3, Jan 1 should be in night shift phase
      const day0 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(day0.shiftType).toBe('night');
    });

    it('should handle phase offset wrapping around cycle', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 9);

      // Offset of 9 (full cycle) should be same as 0
      const day0 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(day0.shiftType).toBe('day');
    });
  });

  describe('month boundary edge cases', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-30', 0);

    it('should handle month boundary correctly', () => {
      // Jan 30 - day shift
      const jan30 = calculateShiftDay(new Date('2024-01-30'), cycle);
      expect(jan30.shiftType).toBe('day');

      // Feb 1 - should be in same cycle
      const feb1 = calculateShiftDay(new Date('2024-02-01'), cycle);
      expect(feb1.shiftType).toBe('day');
    });

    it('should handle February leap year', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-02-28', 0);

      // 2024 is a leap year
      const feb29 = calculateShiftDay(new Date('2024-02-29'), cycle);
      expect(feb29).toBeDefined();

      const mar1 = calculateShiftDay(new Date('2024-03-01'), cycle);
      expect(mar1).toBeDefined();
    });
  });

  describe('year boundary edge cases', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2023-12-30', 0);

    it('should handle year boundary correctly', () => {
      // Dec 30, 2023 - day shift
      const dec30 = calculateShiftDay(new Date('2023-12-30'), cycle);
      expect(dec30.shiftType).toBe('day');

      // Jan 1, 2024 - should continue cycle
      const jan1 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(jan1.shiftType).toBe('day');
    });
  });

  describe('dates before start date', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-10', 0);

    it('should calculate shifts before start date', () => {
      // Jan 9 - should be 1 day before cycle starts
      const jan9 = calculateShiftDay(new Date('2024-01-09'), cycle);
      expect(jan9.shiftType).toBe('off'); // Last day of previous cycle

      // Jan 1 - should be 9 days before
      const jan1 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(jan1).toBeDefined();
      expect(jan1.shiftType).toBe('day'); // 9 days back = 1 full cycle = same position
    });
  });

  describe('custom pattern', () => {
    it('should use custom pattern when provided', () => {
      const customPattern = [
        {
          date: '2024-01-01',
          isWorkDay: true,
          isNightShift: false,
          shiftType: 'day' as const,
        },
        {
          date: '2024-01-02',
          isWorkDay: false,
          isNightShift: false,
          shiftType: 'off' as const,
        },
      ];

      const cycle = {
        patternType: ShiftPattern.CUSTOM,
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        startDate: '2024-01-01',
        phaseOffset: 0,
        customPattern,
      };

      const jan1 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(jan1).toEqual(customPattern[0]);

      const jan2 = calculateShiftDay(new Date('2024-01-02'), cycle);
      expect(jan2).toEqual(customPattern[1]);
    });
  });
});

describe('isWorkDay', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should return true for day shifts', () => {
    expect(isWorkDay(new Date('2024-01-01'), cycle)).toBe(true);
    expect(isWorkDay(new Date('2024-01-02'), cycle)).toBe(true);
  });

  it('should return true for night shifts', () => {
    expect(isWorkDay(new Date('2024-01-04'), cycle)).toBe(true);
    expect(isWorkDay(new Date('2024-01-05'), cycle)).toBe(true);
  });

  it('should return false for days off', () => {
    expect(isWorkDay(new Date('2024-01-07'), cycle)).toBe(false);
    expect(isWorkDay(new Date('2024-01-08'), cycle)).toBe(false);
  });
});

describe('getNextShift', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should find next shift from day off', () => {
    const nextShift = getNextShift(new Date('2024-01-07'), cycle);
    expect(nextShift).toEqual(new Date('2024-01-10'));
  });

  it('should find next shift from end of night shift', () => {
    const nextShift = getNextShift(new Date('2024-01-06'), cycle);
    expect(nextShift).toEqual(new Date('2024-01-10'));
  });

  it('should find next shift from day shift', () => {
    const nextShift = getNextShift(new Date('2024-01-01'), cycle);
    expect(nextShift).toEqual(new Date('2024-01-02'));
  });

  it('should return null if no shift found within max days', () => {
    // Create a cycle with all days off (shouldn't happen in practice)
    const allOffCycle = {
      patternType: ShiftPattern.CUSTOM,
      daysOn: 0,
      nightsOn: 0,
      daysOff: 365,
      startDate: '2024-01-01',
      phaseOffset: 0,
    };

    const nextShift = getNextShift(new Date('2024-01-01'), allOffCycle, 10);
    expect(nextShift).toBeNull();
  });
});

describe('getShiftDaysInRange', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should return all days in range', () => {
    const days = getShiftDaysInRange(new Date('2024-01-01'), new Date('2024-01-09'), cycle);

    expect(days).toHaveLength(9);
    expect(days[0].date).toBe('2024-01-01');
    expect(days[8].date).toBe('2024-01-09');
  });

  it('should have correct shift types in range', () => {
    const days = getShiftDaysInRange(new Date('2024-01-01'), new Date('2024-01-09'), cycle);

    // Days 0-2: day shifts
    expect(days[0].shiftType).toBe('day');
    expect(days[1].shiftType).toBe('day');
    expect(days[2].shiftType).toBe('day');

    // Days 3-5: night shifts
    expect(days[3].shiftType).toBe('night');
    expect(days[4].shiftType).toBe('night');
    expect(days[5].shiftType).toBe('night');

    // Days 6-8: off
    expect(days[6].shiftType).toBe('off');
    expect(days[7].shiftType).toBe('off');
    expect(days[8].shiftType).toBe('off');
  });

  it('should handle single day range', () => {
    const days = getShiftDaysInRange(new Date('2024-01-01'), new Date('2024-01-01'), cycle);

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2024-01-01');
  });

  it('should handle range spanning multiple cycles', () => {
    const days = getShiftDaysInRange(new Date('2024-01-01'), new Date('2024-01-31'), cycle);

    expect(days).toHaveLength(31);

    // Should have complete cycles
    const dayShifts = days.filter((d) => d.shiftType === 'day');
    const nightShifts = days.filter((d) => d.shiftType === 'night');
    const daysOff = days.filter((d) => d.shiftType === 'off');

    // 31 days = 3 complete cycles (27 days) + 4 days
    expect(dayShifts.length).toBeGreaterThan(0);
    expect(nightShifts.length).toBeGreaterThan(0);
    expect(daysOff.length).toBeGreaterThan(0);
  });
});

describe('countWorkDays', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should count work days in range', () => {
    const count = countWorkDays(new Date('2024-01-01'), new Date('2024-01-09'), cycle);

    // 3 day shifts + 3 night shifts = 6 work days
    expect(count).toBe(6);
  });

  it('should count zero for range with no work days', () => {
    const count = countWorkDays(new Date('2024-01-07'), new Date('2024-01-09'), cycle);

    // All days off
    expect(count).toBe(0);
  });

  it('should count correctly for full month', () => {
    const count = countWorkDays(new Date('2024-01-01'), new Date('2024-01-31'), cycle);

    // 31 days / 9 day cycle = 3.44 cycles
    // Each cycle has 6 work days
    // Should be around 20-21 work days
    expect(count).toBeGreaterThan(18);
    expect(count).toBeLessThan(23);
  });
});

describe('getShiftStatistics', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should calculate correct statistics for one cycle', () => {
    const stats = getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-09'), cycle);

    expect(stats).toEqual({
      dayShifts: 3,
      nightShifts: 3,
      daysOff: 3,
      totalDays: 9,
    });
  });

  it('should calculate statistics for partial cycle', () => {
    const stats = getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-05'), cycle);

    expect(stats).toEqual({
      dayShifts: 3,
      nightShifts: 2,
      daysOff: 0,
      totalDays: 5,
    });
  });

  it('should calculate statistics for multiple cycles', () => {
    const stats = getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-31'), cycle);

    expect(stats.totalDays).toBe(31);
    expect(stats.dayShifts + stats.nightShifts + stats.daysOff).toBe(31);

    // Verify proportions are roughly correct
    // 31 days / 9 day cycle = 3.44 cycles
    // Each cycle: 3 day, 3 night, 3 off
    // 3 full cycles (27 days) + 4 partial (day-day-day-night) = 12 day, 10 night, 9 off
    expect(stats.dayShifts).toBeGreaterThan(9);
    expect(stats.nightShifts).toBeGreaterThan(9);
    expect(stats.daysOff).toBeGreaterThanOrEqual(9);
  });
});

describe('isNightShift', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should return true for night shifts', () => {
    expect(isNightShift(new Date('2024-01-04'), cycle)).toBe(true);
    expect(isNightShift(new Date('2024-01-05'), cycle)).toBe(true);
    expect(isNightShift(new Date('2024-01-06'), cycle)).toBe(true);
  });

  it('should return false for day shifts', () => {
    expect(isNightShift(new Date('2024-01-01'), cycle)).toBe(false);
    expect(isNightShift(new Date('2024-01-02'), cycle)).toBe(false);
  });

  it('should return false for days off', () => {
    expect(isNightShift(new Date('2024-01-07'), cycle)).toBe(false);
    expect(isNightShift(new Date('2024-01-08'), cycle)).toBe(false);
  });
});

describe('getPhaseInfo', () => {
  const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

  it('should return correct phase info for day shift', () => {
    const phase = getPhaseInfo(new Date('2024-01-01'), cycle);

    expect(phase).toEqual({
      position: 0,
      cycleLength: 9,
      phaseType: 'day',
    });
  });

  it('should return correct phase info for night shift', () => {
    const phase = getPhaseInfo(new Date('2024-01-04'), cycle);

    expect(phase).toEqual({
      position: 3,
      cycleLength: 9,
      phaseType: 'night',
    });
  });

  it('should return correct phase info for day off', () => {
    const phase = getPhaseInfo(new Date('2024-01-07'), cycle);

    expect(phase).toEqual({
      position: 6,
      cycleLength: 9,
      phaseType: 'off',
    });
  });

  it('should handle position wrapping in new cycle', () => {
    const phase = getPhaseInfo(new Date('2024-01-10'), cycle);

    expect(phase).toEqual({
      position: 0,
      cycleLength: 9,
      phaseType: 'day',
    });
  });

  it('should handle phase offset', () => {
    const cycleWithOffset = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 3);
    const phase = getPhaseInfo(new Date('2024-01-01'), cycleWithOffset);

    expect(phase.phaseType).toBe('night');
  });
});

describe('different shift patterns', () => {
  it('should work correctly with STANDARD_2_2_3', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_2_2_3, '2024-01-01', 0);

    const days = getShiftDaysInRange(new Date('2024-01-01'), new Date('2024-01-07'), cycle);

    // Day 0-1: day shifts (2 days)
    expect(days[0].shiftType).toBe('day');
    expect(days[1].shiftType).toBe('day');

    // Day 2-3: night shifts (2 days)
    expect(days[2].shiftType).toBe('night');
    expect(days[3].shiftType).toBe('night');

    // Day 4-6: off (3 days)
    expect(days[4].shiftType).toBe('off');
    expect(days[5].shiftType).toBe('off');
    expect(days[6].shiftType).toBe('off');
  });

  it('should work correctly with STANDARD_7_7_7', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_7_7_7, '2024-01-01', 0);

    const stats = getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-21'), cycle);

    // One complete 21-day cycle
    expect(stats).toEqual({
      dayShifts: 7,
      nightShifts: 7,
      daysOff: 7,
      totalDays: 21,
    });
  });

  it('should work correctly with STANDARD_4_4_4', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2024-01-01', 0);

    const count = countWorkDays(new Date('2024-01-01'), new Date('2024-01-12'), cycle);

    // One complete cycle: 4 day + 4 night = 8 work days
    expect(count).toBe(8);
  });
});
