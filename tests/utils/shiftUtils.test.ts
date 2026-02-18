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
import { ShiftPattern, ShiftSystem } from '@/types';

describe('getShiftPattern', () => {
  it('should return correct pattern for STANDARD_3_3_3', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_3_3_3);
    expect(pattern).toEqual({
      config: {
        daysOn: 3,
        nightsOn: 3,
        daysOff: 3,
        totalCycleDays: 9,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    });
  });

  it('should return correct pattern for STANDARD_5_5_5', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_5_5_5);
    expect(pattern).toEqual({
      config: {
        daysOn: 5,
        nightsOn: 5,
        daysOff: 5,
        totalCycleDays: 15,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    });
  });

  it('should return correct pattern for STANDARD_10_10_10', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_10_10_10);
    expect(pattern).toEqual({
      config: {
        daysOn: 10,
        nightsOn: 10,
        daysOff: 10,
        totalCycleDays: 30,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    });
  });

  it('should return correct pattern for STANDARD_2_2_3', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_2_2_3);
    expect(pattern).toEqual({
      config: {
        daysOn: 2,
        nightsOn: 2,
        daysOff: 3,
        totalCycleDays: 7,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT],
    });
  });

  it('should return correct pattern for STANDARD_4_4_4', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_4_4_4);
    expect(pattern).toEqual({
      config: {
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        totalCycleDays: 12,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    });
  });

  it('should return correct pattern for STANDARD_7_7_7', () => {
    const pattern = getShiftPattern(ShiftPattern.STANDARD_7_7_7);
    expect(pattern).toEqual({
      config: {
        daysOn: 7,
        nightsOn: 7,
        daysOff: 7,
        totalCycleDays: 21,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    });
  });

  it('should return zeros for CUSTOM pattern', () => {
    const pattern = getShiftPattern(ShiftPattern.CUSTOM);
    expect(pattern).toEqual({
      config: {
        daysOn: 0,
        nightsOn: 0,
        daysOff: 0,
        totalCycleDays: 0,
      },
      defaultShiftSystem: ShiftSystem.TWO_SHIFT,
      supportsShiftSystem: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT],
    });
  });
});

describe('getShiftCycle', () => {
  it('should create a valid shift cycle', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2024-01-01', 0);

    expect(cycle).toEqual({
      patternType: ShiftPattern.STANDARD_3_3_3,
      shiftSystem: ShiftSystem.TWO_SHIFT,
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
    it('should calculate custom pattern using cycle arithmetic', () => {
      // Custom pattern: 2 days on, 1 night, 3 off
      const cycle = {
        patternType: ShiftPattern.CUSTOM,
        daysOn: 2,
        nightsOn: 1,
        daysOff: 3,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      const jan1 = calculateShiftDay(new Date('2024-01-01'), cycle);
      expect(jan1.shiftType).toBe('day');
      expect(jan1.isWorkDay).toBe(true);

      const jan2 = calculateShiftDay(new Date('2024-01-02'), cycle);
      expect(jan2.shiftType).toBe('day');

      const jan3 = calculateShiftDay(new Date('2024-01-03'), cycle);
      expect(jan3.shiftType).toBe('night');
      expect(jan3.isNightShift).toBe(true);

      const jan4 = calculateShiftDay(new Date('2024-01-04'), cycle);
      expect(jan4.shiftType).toBe('off');
      expect(jan4.isWorkDay).toBe(false);
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
      morningShifts: 0,
      afternoonShifts: 0,
      daysOff: 3,
      totalDays: 9,
    });
  });

  it('should calculate statistics for partial cycle', () => {
    const stats = getShiftStatistics(new Date('2024-01-01'), new Date('2024-01-05'), cycle);

    expect(stats).toEqual({
      dayShifts: 3,
      nightShifts: 2,
      morningShifts: 0,
      afternoonShifts: 0,
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
      morningShifts: 0,
      afternoonShifts: 0,
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

describe('custom 3-shift pattern verification', () => {
  it('should correctly calculate a custom 3-shift pattern (3M/2A/2N/3O)', () => {
    const cycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.THREE_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      morningOn: 3,
      afternoonOn: 2,
      nightOn: 2,
      daysOff: 3,
      startDate: '2026-03-01',
      phaseOffset: 0,
    };

    // Generate one full 10-day cycle
    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-10'), cycle);

    // Verify the exact pattern: M M M A A N N O O O
    expect(days.map((d) => d.shiftType)).toEqual([
      'morning',
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'night',
      'night',
      'off',
      'off',
      'off',
    ]);

    // Verify work day flags
    expect(days.filter((d) => d.isWorkDay).length).toBe(7);
    expect(days.filter((d) => !d.isWorkDay).length).toBe(3);
    expect(days.filter((d) => d.isNightShift).length).toBe(2);

    // Verify cycle repeats correctly (day 11 = morning again)
    const day11 = calculateShiftDay(new Date('2026-03-11'), cycle);
    expect(day11.shiftType).toBe('morning');

    // Full month stats
    const stats = getShiftStatistics(new Date('2026-03-01'), new Date('2026-03-31'), cycle);
    expect(stats.morningShifts).toBe(10); // 3 per cycle * 3 full + 1 partial
    expect(stats.afternoonShifts).toBe(6); // 2 per cycle * 3
    expect(stats.nightShifts).toBe(6); // 2 per cycle * 3
    expect(stats.daysOff).toBe(9); // 3 per cycle * 3
    expect(stats.dayShifts).toBe(0); // No 2-shift day shifts
    expect(stats.totalDays).toBe(31);

    // Print calendar for visual verification
    const allDays = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-31'), cycle);
    const cal = allDays.map(
      (d, i) =>
        `Mar ${String(i + 1).padStart(2)}: pos=${i % 10} -> ${d.shiftType.padEnd(9)} ${d.isWorkDay ? 'WORK' : 'OFF '}`
    );
    console.log('\n' + cal.join('\n'));
  });

  it('should correctly calculate Continental pattern (2M/2A/2N/4O)', () => {
    const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-10'), cycle);

    // Verify: M M A A N N O O O O
    expect(days.map((d) => d.shiftType)).toEqual([
      'morning',
      'morning',
      'afternoon',
      'afternoon',
      'night',
      'night',
      'off',
      'off',
      'off',
      'off',
    ]);

    // Day 11 should be morning again (cycle repeats)
    const day11 = calculateShiftDay(new Date('2026-03-11'), cycle);
    expect(day11.shiftType).toBe('morning');
  });

  it('should handle phase offset correctly for 3-shift custom', () => {
    const cycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.THREE_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      morningOn: 3,
      afternoonOn: 2,
      nightOn: 2,
      daysOff: 3,
      startDate: '2026-03-01',
      phaseOffset: 5, // Start at position 5 = first night shift
    };

    const day1 = calculateShiftDay(new Date('2026-03-01'), cycle);
    expect(day1.shiftType).toBe('night');
    expect(day1.isNightShift).toBe(true);
  });
});

describe('2-shift pattern verification', () => {
  it('should correctly calculate 4-4-4 pattern (4D/4N/4O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-12'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'day',
      'day',
      'night',
      'night',
      'night',
      'night',
      'off',
      'off',
      'off',
      'off',
    ]);

    // Cycle repeats
    const day13 = calculateShiftDay(new Date('2026-03-13'), cycle);
    expect(day13.shiftType).toBe('day');

    // Work/off flags
    expect(days.filter((d) => d.isWorkDay).length).toBe(8);
    expect(days.filter((d) => d.isNightShift).length).toBe(4);
  });

  it('should correctly calculate 7-7-7 pattern (7D/7N/7O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_7_7_7, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-21'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'day',
      'day',
      'day',
      'day',
      'day',
      'night',
      'night',
      'night',
      'night',
      'night',
      'night',
      'night',
      'off',
      'off',
      'off',
      'off',
      'off',
      'off',
      'off',
    ]);

    const day22 = calculateShiftDay(new Date('2026-03-22'), cycle);
    expect(day22.shiftType).toBe('day');
  });

  it('should correctly calculate 3-3-3 pattern (3D/3N/3O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_3_3_3, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-09'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'day',
      'night',
      'night',
      'night',
      'off',
      'off',
      'off',
    ]);
  });

  it('should correctly calculate 5-5-5 pattern (5D/5N/5O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_5_5_5, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-15'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'day',
      'day',
      'day',
      'night',
      'night',
      'night',
      'night',
      'night',
      'off',
      'off',
      'off',
      'off',
      'off',
    ]);
  });

  it('should correctly calculate 2-2-3 pattern (2D/2N/3O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_2_2_3, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-07'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'night',
      'night',
      'off',
      'off',
      'off',
    ]);

    // Cycle repeats
    const day8 = calculateShiftDay(new Date('2026-03-08'), cycle);
    expect(day8.shiftType).toBe('day');
  });

  it('should correctly calculate 10-10-10 pattern (10D/10N/10O)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_10_10_10, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-30'), cycle);

    // First 10 = day, next 10 = night, last 10 = off
    expect(days.slice(0, 10).every((d) => d.shiftType === 'day')).toBe(true);
    expect(days.slice(10, 20).every((d) => d.shiftType === 'night')).toBe(true);
    expect(days.slice(20, 30).every((d) => d.shiftType === 'off')).toBe(true);
  });

  it('should correctly calculate Pitman pattern (2D/2N/3O)', () => {
    const cycle = getShiftCycle(ShiftPattern.PITMAN, '2026-03-01', 0);

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-07'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'night',
      'night',
      'off',
      'off',
      'off',
    ]);
  });

  it('should correctly calculate custom 2-shift pattern (5D/3N/2O)', () => {
    const cycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 5,
      nightsOn: 3,
      daysOff: 2,
      startDate: '2026-03-01',
      phaseOffset: 0,
    };

    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-10'), cycle);

    expect(days.map((d) => d.shiftType)).toEqual([
      'day',
      'day',
      'day',
      'day',
      'day',
      'night',
      'night',
      'night',
      'off',
      'off',
    ]);

    // Verify stats
    const stats = getShiftStatistics(new Date('2026-03-01'), new Date('2026-03-10'), cycle);
    expect(stats.dayShifts).toBe(5);
    expect(stats.nightShifts).toBe(3);
    expect(stats.daysOff).toBe(2);
    expect(stats.morningShifts).toBe(0);
    expect(stats.afternoonShifts).toBe(0);
  });

  it('should handle phase offset for 2-shift (start on night)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 4);

    // phaseOffset=4 means start at position 4 = first night shift
    const day1 = calculateShiftDay(new Date('2026-03-01'), cycle);
    expect(day1.shiftType).toBe('night');

    const day5 = calculateShiftDay(new Date('2026-03-05'), cycle);
    expect(day5.shiftType).toBe('off');
  });

  it('should handle phase offset for 2-shift (start on off)', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 8);

    // phaseOffset=8 means start at position 8 = first off day
    const day1 = calculateShiftDay(new Date('2026-03-01'), cycle);
    expect(day1.shiftType).toBe('off');

    const day5 = calculateShiftDay(new Date('2026-03-05'), cycle);
    expect(day5.shiftType).toBe('day');
  });

  it('should print full month calendar for 4-4-4 pattern', () => {
    const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 0);
    const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-31'), cycle);

    const cal = days.map(
      (d, i) =>
        `Mar ${String(i + 1).padStart(2)}: pos=${String(i % 12).padStart(2)} -> ${d.shiftType.padEnd(5)} ${d.isWorkDay ? 'WORK' : 'OFF '}`
    );
    console.log('\n4-4-4 Calendar:\n' + cal.join('\n'));

    const stats = getShiftStatistics(new Date('2026-03-01'), new Date('2026-03-31'), cycle);
    console.log(
      `\nStats: ${stats.dayShifts}D ${stats.nightShifts}N ${stats.daysOff}O = ${stats.totalDays} total`
    );

    // Basic sanity checks
    expect(stats.dayShifts + stats.nightShifts + stats.daysOff).toBe(31);
    expect(stats.morningShifts).toBe(0);
    expect(stats.afternoonShifts).toBe(0);
  });
});

describe('day-within-phase offset verification', () => {
  describe('2-shift system (4-4-4 pattern)', () => {
    // Pattern: D D D D N N N N O O O O (cycle = 12)
    // Phase offsets:
    //   Day phase:   day1=0, day2=1, day3=2, day4=3
    //   Night phase: day1=4, day2=5, day3=6, day4=7
    //   Off phase:   day1=8, day2=9, day3=10, day4=11

    it('day phase, day 1 (offset=0) -> start date is day shift', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 0);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-05'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual(['day', 'day', 'day', 'day', 'night']);
      console.log('2-shift | Day phase, day 1 (offset=0): D D D D N ...');
    });

    it('day phase, day 3 (offset=2) -> start date is 3rd day of day shift', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 2);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      // pos 2,3 = day, pos 4,5,6,7 = night, pos 8 = off
      expect(days.map((d) => d.shiftType)).toEqual([
        'day',
        'day',
        'night',
        'night',
        'night',
        'night',
      ]);
      console.log('2-shift | Day phase, day 3 (offset=2): D D N N N N ...');
    });

    it('night phase, day 1 (offset=4) -> start date is night shift', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 4);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'night',
        'night',
        'night',
        'night',
        'off',
        'off',
      ]);
      console.log('2-shift | Night phase, day 1 (offset=4): N N N N O O ...');
    });

    it('night phase, day 3 (offset=6) -> start date is 3rd night shift', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 6);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      // pos 6,7 = night, pos 8,9,10,11 = off
      expect(days.map((d) => d.shiftType)).toEqual(['night', 'night', 'off', 'off', 'off', 'off']);
      console.log('2-shift | Night phase, day 3 (offset=6): N N O O O O ...');
    });

    it('off phase, day 1 (offset=8) -> start date is day off', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 8);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual(['off', 'off', 'off', 'off', 'day', 'day']);
      console.log('2-shift | Off phase, day 1 (offset=8): O O O O D D ...');
    });

    it('off phase, day 3 (offset=10) -> start date is 3rd day off', () => {
      const cycle = getShiftCycle(ShiftPattern.STANDARD_4_4_4, '2026-03-01', 10);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      // pos 10,11 = off, pos 0,1,2,3 = day
      expect(days.map((d) => d.shiftType)).toEqual(['off', 'off', 'day', 'day', 'day', 'day']);
      console.log('2-shift | Off phase, day 3 (offset=10): O O D D D D ...');
    });
  });

  describe('3-shift system (Continental: 2M/2A/2N/4O)', () => {
    // Pattern: M M A A N N O O O O (cycle = 10)
    // Phase offsets:
    //   Morning:   day1=0, day2=1
    //   Afternoon: day1=2, day2=3
    //   Night:     day1=4, day2=5
    //   Off:       day1=6, day2=7, day3=8, day4=9

    it('morning phase, day 1 (offset=0) -> start date is morning shift', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 0);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'morning',
        'morning',
        'afternoon',
        'afternoon',
        'night',
        'night',
      ]);
      console.log('3-shift | Morning phase, day 1 (offset=0): M M A A N N ...');
    });

    it('morning phase, day 2 (offset=1) -> start date is 2nd morning', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 1);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'morning',
        'afternoon',
        'afternoon',
        'night',
        'night',
        'off',
      ]);
      console.log('3-shift | Morning phase, day 2 (offset=1): M A A N N O ...');
    });

    it('afternoon phase, day 1 (offset=2) -> start date is afternoon shift', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 2);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'afternoon',
        'afternoon',
        'night',
        'night',
        'off',
        'off',
      ]);
      console.log('3-shift | Afternoon phase, day 1 (offset=2): A A N N O O ...');
    });

    it('night phase, day 1 (offset=4) -> start date is night shift', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 4);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual(['night', 'night', 'off', 'off', 'off', 'off']);
      console.log('3-shift | Night phase, day 1 (offset=4): N N O O O O ...');
    });

    it('night phase, day 2 (offset=5) -> start date is 2nd night', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 5);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'night',
        'off',
        'off',
        'off',
        'off',
        'morning',
      ]);
      console.log('3-shift | Night phase, day 2 (offset=5): N O O O O M ...');
    });

    it('off phase, day 1 (offset=6) -> start date is first day off', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 6);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'off',
        'off',
        'off',
        'off',
        'morning',
        'morning',
      ]);
      console.log('3-shift | Off phase, day 1 (offset=6): O O O O M M ...');
    });

    it('off phase, day 3 (offset=8) -> start date is 3rd day off', () => {
      const cycle = getShiftCycle(ShiftPattern.CONTINENTAL, '2026-03-01', 8);
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      expect(days.map((d) => d.shiftType)).toEqual([
        'off',
        'off',
        'morning',
        'morning',
        'afternoon',
        'afternoon',
      ]);
      console.log('3-shift | Off phase, day 3 (offset=8): O O M M A A ...');
    });
  });

  describe('custom 3-shift with day-within-phase (3M/2A/2N/3O)', () => {
    it('afternoon phase, day 2 (offset=4) -> start on 2nd afternoon', () => {
      const cycle = {
        patternType: ShiftPattern.CUSTOM,
        shiftSystem: ShiftSystem.THREE_SHIFT,
        daysOn: 0,
        nightsOn: 0,
        morningOn: 3,
        afternoonOn: 2,
        nightOn: 2,
        daysOff: 3,
        startDate: '2026-03-01',
        phaseOffset: 4, // morning(3) + afternoon day 2 - 1 = 4
      };
      const days = getShiftDaysInRange(new Date('2026-03-01'), new Date('2026-03-06'), cycle);
      // pos 4 = afternoon(2nd), pos 5 = night, pos 6 = night, pos 7,8,9 = off
      expect(days.map((d) => d.shiftType)).toEqual([
        'afternoon',
        'night',
        'night',
        'off',
        'off',
        'off',
      ]);
      console.log('Custom 3-shift | Afternoon day 2 (offset=4): A N N O O O ...');
    });
  });
});
