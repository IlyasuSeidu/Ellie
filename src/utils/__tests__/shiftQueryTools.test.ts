/**
 * Tests for Shift Query Tools
 *
 * Validates the tool execution functions used by the Ellie voice assistant.
 * Uses real shift calculations (no mocks) to verify integration correctness.
 */

import {
  executeGetShiftForDate,
  executeGetShiftsInRange,
  executeGetCurrentStatus,
  executeGetStatistics,
  executeGetNextOccurrence,
  executeTool,
} from '../shiftQueryTools';
import { ShiftPattern, ShiftSystem, ShiftCycle } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Standard 4-4-4 pattern (2-shift): 4 day, 4 night, 4 off = 12-day cycle.
 * Start date: 2024-01-01
 *
 * Positions:
 *   0-3  (Jan 1-4)   -> day
 *   4-7  (Jan 5-8)   -> night
 *   8-11 (Jan 9-12)  -> off
 *   12   (Jan 13)    -> day (new cycle)
 */
const twoShiftCycle: ShiftCycle = {
  patternType: ShiftPattern.STANDARD_4_4_4,
  shiftSystem: ShiftSystem.TWO_SHIFT,
  daysOn: 4,
  nightsOn: 4,
  daysOff: 4,
  startDate: '2024-01-01',
  phaseOffset: 0,
};

/**
 * Custom 3-shift pattern: 2 morning, 3 afternoon, 2 night, 2 off = 9-day cycle.
 * Start date: 2024-01-01
 *
 * Positions:
 *   0-1  (Jan 1-2)   -> morning
 *   2-4  (Jan 3-5)   -> afternoon
 *   5-6  (Jan 6-7)   -> night
 *   7-8  (Jan 8-9)   -> off
 *   9    (Jan 10)     -> morning (new cycle)
 */
const threeShiftCycle: ShiftCycle = {
  patternType: ShiftPattern.CUSTOM,
  shiftSystem: ShiftSystem.THREE_SHIFT,
  daysOn: 0,
  nightsOn: 0,
  morningOn: 2,
  afternoonOn: 3,
  nightOn: 2,
  daysOff: 2,
  startDate: '2024-01-01',
  phaseOffset: 0,
};

/**
 * Standard 3-3-3 pattern (2-shift): 3 day, 3 night, 3 off = 9-day cycle.
 * Start date: 2024-03-01
 */
const threeThreeThreeCycle: ShiftCycle = {
  patternType: ShiftPattern.STANDARD_3_3_3,
  shiftSystem: ShiftSystem.TWO_SHIFT,
  daysOn: 3,
  nightsOn: 3,
  daysOff: 3,
  startDate: '2024-03-01',
  phaseOffset: 0,
};

// ---------------------------------------------------------------------------
// executeGetShiftForDate
// ---------------------------------------------------------------------------

describe('executeGetShiftForDate', () => {
  it('should return a day shift for the first day of a 2-shift cycle', () => {
    const result = executeGetShiftForDate({ date: '2024-01-01' }, twoShiftCycle);

    expect(result).toBeDefined();
    expect(result.date).toBe('2024-01-01');
    expect(result.shiftType).toBe('day');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(false);
  });

  it('should return a night shift within the night phase of a 2-shift cycle', () => {
    // Position 4 (Jan 5) is the first night shift day in 4-4-4
    const result = executeGetShiftForDate({ date: '2024-01-06' }, twoShiftCycle);

    expect(result.shiftType).toBe('night');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(true);
  });

  it('should return off for a day-off position in a 2-shift cycle', () => {
    // Position 8 (Jan 9) is the first off day in 4-4-4
    const result = executeGetShiftForDate({ date: '2024-01-10' }, twoShiftCycle);

    expect(result.shiftType).toBe('off');
    expect(result.isWorkDay).toBe(false);
    expect(result.isNightShift).toBe(false);
  });

  it('should handle cycle wrap-around correctly', () => {
    // Position 12 (Jan 13) wraps to position 0 -> day shift
    const result = executeGetShiftForDate({ date: '2024-01-13' }, twoShiftCycle);

    expect(result.shiftType).toBe('day');
    expect(result.isWorkDay).toBe(true);
  });

  it('should return a morning shift for the first day of a 3-shift cycle', () => {
    const result = executeGetShiftForDate({ date: '2024-01-01' }, threeShiftCycle);

    expect(result.date).toBe('2024-01-01');
    expect(result.shiftType).toBe('morning');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(false);
  });

  it('should return an afternoon shift for a 3-shift cycle', () => {
    // Position 2 (Jan 3) -> afternoon
    const result = executeGetShiftForDate({ date: '2024-01-03' }, threeShiftCycle);

    expect(result.shiftType).toBe('afternoon');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(false);
  });

  it('should return a night shift for a 3-shift cycle', () => {
    // Position 5 (Jan 6) -> night
    const result = executeGetShiftForDate({ date: '2024-01-06' }, threeShiftCycle);

    expect(result.shiftType).toBe('night');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(true);
  });

  it('should return off for a day-off position in a 3-shift cycle', () => {
    // Position 7 (Jan 8) -> off
    const result = executeGetShiftForDate({ date: '2024-01-08' }, threeShiftCycle);

    expect(result.shiftType).toBe('off');
    expect(result.isWorkDay).toBe(false);
    expect(result.isNightShift).toBe(false);
  });

  it('should handle dates far in the future', () => {
    // 360 days later (30 full 12-day cycles = position 0 -> day shift)
    const result = executeGetShiftForDate({ date: '2024-12-26' }, twoShiftCycle);

    expect(result).toBeDefined();
    expect(result.date).toBe('2024-12-26');
    // Just verify it returns a valid ShiftDay structure
    expect(['day', 'night', 'off']).toContain(result.shiftType);
    expect(typeof result.isWorkDay).toBe('boolean');
    expect(typeof result.isNightShift).toBe('boolean');
  });
});

// ---------------------------------------------------------------------------
// executeGetShiftsInRange
// ---------------------------------------------------------------------------

describe('executeGetShiftsInRange', () => {
  it('should return an array of ShiftDays for the specified date range', () => {
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    // 12 days inclusive
    expect(result).toHaveLength(12);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[11].date).toBe('2024-01-12');
  });

  it('should produce correct shift types across one full 2-shift cycle', () => {
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    // Days 1-4: day shifts
    for (let i = 0; i < 4; i++) {
      expect(result[i].shiftType).toBe('day');
      expect(result[i].isWorkDay).toBe(true);
    }
    // Days 5-8: night shifts
    for (let i = 4; i < 8; i++) {
      expect(result[i].shiftType).toBe('night');
      expect(result[i].isWorkDay).toBe(true);
      expect(result[i].isNightShift).toBe(true);
    }
    // Days 9-12: off
    for (let i = 8; i < 12; i++) {
      expect(result[i].shiftType).toBe('off');
      expect(result[i].isWorkDay).toBe(false);
    }
  });

  it('should produce correct shift types across one full 3-shift cycle', () => {
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-09' },
      threeShiftCycle
    );

    // 9-day cycle
    expect(result).toHaveLength(9);

    // Days 1-2: morning
    expect(result[0].shiftType).toBe('morning');
    expect(result[1].shiftType).toBe('morning');

    // Days 3-5: afternoon
    expect(result[2].shiftType).toBe('afternoon');
    expect(result[3].shiftType).toBe('afternoon');
    expect(result[4].shiftType).toBe('afternoon');

    // Days 6-7: night
    expect(result[5].shiftType).toBe('night');
    expect(result[6].shiftType).toBe('night');

    // Days 8-9: off
    expect(result[7].shiftType).toBe('off');
    expect(result[8].shiftType).toBe('off');
  });

  it('should return a single-day array when start equals end', () => {
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-01-01');
    expect(result[0].shiftType).toBe('day');
  });

  it('should span multiple cycles correctly', () => {
    // 24 days = two full 12-day cycles for 4-4-4
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-24' },
      twoShiftCycle
    );

    expect(result).toHaveLength(24);

    // Second cycle starts at index 12
    expect(result[12].shiftType).toBe('day');
    expect(result[12].date).toBe('2024-01-13');
    expect(result[16].shiftType).toBe('night');
    expect(result[20].shiftType).toBe('off');
  });

  it('should handle a range that starts mid-cycle', () => {
    // Start at Jan 5 (position 4 = night shift)
    const result = executeGetShiftsInRange(
      { startDate: '2024-01-05', endDate: '2024-01-08' },
      twoShiftCycle
    );

    expect(result).toHaveLength(4);
    result.forEach((day) => {
      expect(day.shiftType).toBe('night');
      expect(day.isWorkDay).toBe(true);
      expect(day.isNightShift).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// executeGetCurrentStatus
// ---------------------------------------------------------------------------

describe('executeGetCurrentStatus', () => {
  it('should return todayShift as a valid ShiftDay', () => {
    const result = executeGetCurrentStatus(twoShiftCycle);

    expect(result).toHaveProperty('todayShift');
    expect(result.todayShift).toHaveProperty('date');
    expect(result.todayShift).toHaveProperty('shiftType');
    expect(result.todayShift).toHaveProperty('isWorkDay');
    expect(result.todayShift).toHaveProperty('isNightShift');
    expect(['day', 'night', 'off']).toContain(result.todayShift.shiftType);
  });

  it('should not include shiftTimes when no userData is provided', () => {
    const result = executeGetCurrentStatus(twoShiftCycle);

    expect(result.shiftTimes).toBeUndefined();
  });

  it('should not include shiftTimes when userData is provided but today is a day off', () => {
    // Create a cycle where today is guaranteed to be off by using a very long off period
    const alwaysOffCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      daysOff: 999,
      startDate: '2020-01-01',
      phaseOffset: 0,
    };

    const userData: OnboardingData = {
      shiftTimes: {
        dayShift: { startTime: '06:00', endTime: '18:00', duration: 12 },
        nightShift: { startTime: '18:00', endTime: '06:00', duration: 12 },
      },
    };

    const result = executeGetCurrentStatus(alwaysOffCycle, userData);

    expect(result.todayShift.isWorkDay).toBe(false);
    expect(result.shiftTimes).toBeUndefined();
  });

  it('should include formatted shiftTimes when today is a work day with matching time data', () => {
    // We need a cycle that guarantees today is a day shift.
    // Use a cycle with a huge daysOn period so today definitely falls in a day shift.
    const alwaysDayCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 9999,
      nightsOn: 0,
      daysOff: 1,
      startDate: '2020-01-01',
      phaseOffset: 0,
    };

    const userData: OnboardingData = {
      shiftTimes: {
        dayShift: { startTime: '06:00', endTime: '18:00', duration: 12 },
      },
    };

    const result = executeGetCurrentStatus(alwaysDayCycle, userData);

    expect(result.todayShift.isWorkDay).toBe(true);
    expect(result.todayShift.shiftType).toBe('day');
    expect(result.shiftTimes).toBeDefined();
    expect(result.shiftTimes).toBe('6:00 AM to 6:00 PM');
  });

  it('should include formatted shiftTimes for a night shift with matching time data', () => {
    // Cycle that guarantees today is a night shift
    const alwaysNightCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 0,
      nightsOn: 9999,
      daysOff: 1,
      startDate: '2020-01-01',
      phaseOffset: 0,
    };

    const userData: OnboardingData = {
      shiftTimes: {
        nightShift: { startTime: '18:00', endTime: '06:00', duration: 12 },
      },
    };

    const result = executeGetCurrentStatus(alwaysNightCycle, userData);

    expect(result.todayShift.isWorkDay).toBe(true);
    expect(result.todayShift.shiftType).toBe('night');
    expect(result.shiftTimes).toBeDefined();
    expect(result.shiftTimes).toBe('6:00 PM to 6:00 AM');
  });

  it('should return undefined shiftTimes when userData has no matching shift type', () => {
    // Cycle that guarantees today is a day shift
    const alwaysDayCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 9999,
      nightsOn: 0,
      daysOff: 1,
      startDate: '2020-01-01',
      phaseOffset: 0,
    };

    // Only provide night shift times, not day shift times
    const userData: OnboardingData = {
      shiftTimes: {
        nightShift: { startTime: '18:00', endTime: '06:00', duration: 12 },
      },
    };

    const result = executeGetCurrentStatus(alwaysDayCycle, userData);

    expect(result.todayShift.shiftType).toBe('day');
    // No matching time for 'day' type, so shiftTimes should be undefined
    expect(result.shiftTimes).toBeUndefined();
  });

  it('should work with 3-shift system cycles', () => {
    const result = executeGetCurrentStatus(threeShiftCycle);

    expect(result).toHaveProperty('todayShift');
    expect(['morning', 'afternoon', 'night', 'off']).toContain(result.todayShift.shiftType);
  });
});

// ---------------------------------------------------------------------------
// executeGetStatistics
// ---------------------------------------------------------------------------

describe('executeGetStatistics', () => {
  it('should return correct statistics for one full 2-shift cycle (4-4-4)', () => {
    const result = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    expect(result.dayShifts).toBe(4);
    expect(result.nightShifts).toBe(4);
    expect(result.daysOff).toBe(4);
    expect(result.morningShifts).toBe(0);
    expect(result.afternoonShifts).toBe(0);
    expect(result.totalShifts).toBe(8); // 4 day + 4 night
    expect(result.totalDays).toBe(12); // 4 + 4 + 4
  });

  it('should return correct statistics for one full 3-shift cycle', () => {
    const result = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-09' },
      threeShiftCycle
    );

    expect(result.morningShifts).toBe(2);
    expect(result.afternoonShifts).toBe(3);
    expect(result.nightShifts).toBe(2);
    expect(result.daysOff).toBe(2);
    expect(result.dayShifts).toBe(0);
    expect(result.totalShifts).toBe(7); // 2 + 3 + 2
    expect(result.totalDays).toBe(9); // 2 + 3 + 2 + 2
  });

  it('should return correct stats for two full 2-shift cycles', () => {
    const result = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-24' },
      twoShiftCycle
    );

    expect(result.dayShifts).toBe(8);
    expect(result.nightShifts).toBe(8);
    expect(result.daysOff).toBe(8);
    expect(result.totalShifts).toBe(16);
    expect(result.totalDays).toBe(24);
  });

  it('should return correct stats for a partial cycle', () => {
    // Only the first 6 days: 4 day + 2 night
    const result = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-06' },
      twoShiftCycle
    );

    expect(result.dayShifts).toBe(4);
    expect(result.nightShifts).toBe(2);
    expect(result.daysOff).toBe(0);
    expect(result.totalShifts).toBe(6);
    expect(result.totalDays).toBe(6);
  });

  it('should return zero shifts for a single off day', () => {
    // Jan 9 is position 8 -> off day
    const result = executeGetStatistics(
      { startDate: '2024-01-09', endDate: '2024-01-09' },
      twoShiftCycle
    );

    expect(result.totalShifts).toBe(0);
    expect(result.daysOff).toBe(1);
    expect(result.totalDays).toBe(1);
  });

  it('should correctly count a single work day', () => {
    // Jan 1 is position 0 -> day shift
    const result = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(result.dayShifts).toBe(1);
    expect(result.nightShifts).toBe(0);
    expect(result.daysOff).toBe(0);
    expect(result.totalShifts).toBe(1);
    expect(result.totalDays).toBe(1);
  });

  it('should handle the 3-3-3 pattern over a 27-day span (3 full cycles)', () => {
    const result = executeGetStatistics(
      { startDate: '2024-03-01', endDate: '2024-03-27' },
      threeThreeThreeCycle
    );

    // 3 cycles of 3-3-3: 9 day shifts, 9 night shifts, 9 off
    expect(result.dayShifts).toBe(9);
    expect(result.nightShifts).toBe(9);
    expect(result.daysOff).toBe(9);
    expect(result.totalShifts).toBe(18);
    expect(result.totalDays).toBe(27);
  });
});

// ---------------------------------------------------------------------------
// executeGetNextOccurrence
// ---------------------------------------------------------------------------

describe('executeGetNextOccurrence', () => {
  it('should find the next day off from the start of a 2-shift cycle', () => {
    // From Jan 1 (day shift, position 0), next off is Jan 9 (position 8)
    const result = executeGetNextOccurrence(
      { shiftType: 'off', fromDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('off');
    expect(result.shiftDay!.date).toBe('2024-01-09');
    expect(result.shiftDay!.isWorkDay).toBe(false);
  });

  it('should find the next night shift from the start of a 2-shift cycle', () => {
    // From Jan 1 (position 0), next night shift is Jan 5 (position 4)
    const result = executeGetNextOccurrence(
      { shiftType: 'night', fromDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('night');
    expect(result.shiftDay!.date).toBe('2024-01-05');
  });

  it('should find the next day shift from an off day', () => {
    // From Jan 12 (position 11, last off day), next day shift is Jan 13 (position 0 new cycle)
    const result = executeGetNextOccurrence(
      { shiftType: 'day', fromDate: '2024-01-12' },
      twoShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('day');
    expect(result.shiftDay!.date).toBe('2024-01-13');
  });

  it('should find the next morning shift from the start of a 3-shift cycle', () => {
    // From Jan 2 (position 1, last morning), next morning is Jan 10 (position 0 new cycle)
    const result = executeGetNextOccurrence(
      { shiftType: 'morning', fromDate: '2024-01-02' },
      threeShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('morning');
    expect(result.shiftDay!.date).toBe('2024-01-10');
  });

  it('should find the next afternoon shift in a 3-shift cycle', () => {
    // From Jan 1 (position 0, morning), next afternoon is Jan 3 (position 2)
    const result = executeGetNextOccurrence(
      { shiftType: 'afternoon', fromDate: '2024-01-01' },
      threeShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('afternoon');
    expect(result.shiftDay!.date).toBe('2024-01-03');
  });

  it('should skip the current day and search from the day after', () => {
    // From Jan 5 (night shift in 4-4-4), should NOT return Jan 5 even though it matches 'night'
    // Should return Jan 6 instead
    const result = executeGetNextOccurrence(
      { shiftType: 'night', fromDate: '2024-01-05' },
      twoShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay!.date).toBe('2024-01-06');
  });

  it('should use today as default when fromDate is not provided', () => {
    // No fromDate specified, should use today
    const result = executeGetNextOccurrence(
      { shiftType: 'off' },
      twoShiftCycle
    );

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('off');
    expect(result.shiftDay!.isWorkDay).toBe(false);
  });

  it('should not find a non-existent shift type in a 2-shift cycle', () => {
    // 'morning' does not exist in a 2-shift pattern with daysOn/nightsOn/daysOff
    const result = executeGetNextOccurrence(
      { shiftType: 'morning', fromDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(result.found).toBe(false);
    expect(result.shiftDay).toBeUndefined();
  });

  it('should not find a day shift type in a 3-shift cycle', () => {
    // 'day' does not exist in a 3-shift pattern (it has morning/afternoon/night/off)
    const result = executeGetNextOccurrence(
      { shiftType: 'day', fromDate: '2024-01-01' },
      threeShiftCycle
    );

    expect(result.found).toBe(false);
    expect(result.shiftDay).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// executeTool (dispatch)
// ---------------------------------------------------------------------------

describe('executeTool', () => {
  it('should dispatch get_shift_for_date correctly', () => {
    const result = executeTool(
      'get_shift_for_date',
      { date: '2024-01-01' },
      twoShiftCycle
    ) as ReturnType<typeof executeGetShiftForDate>;

    expect(result.date).toBe('2024-01-01');
    expect(result.shiftType).toBe('day');
    expect(result.isWorkDay).toBe(true);
  });

  it('should dispatch get_shifts_in_range correctly', () => {
    const result = executeTool(
      'get_shifts_in_range',
      { startDate: '2024-01-01', endDate: '2024-01-03' },
      twoShiftCycle
    ) as ReturnType<typeof executeGetShiftsInRange>;

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
    result.forEach((day) => {
      expect(day.shiftType).toBe('day');
    });
  });

  it('should dispatch get_current_status correctly', () => {
    const result = executeTool(
      'get_current_status',
      {},
      twoShiftCycle
    ) as ReturnType<typeof executeGetCurrentStatus>;

    expect(result).toHaveProperty('todayShift');
    expect(result.todayShift).toHaveProperty('date');
    expect(result.todayShift).toHaveProperty('shiftType');
  });

  it('should dispatch get_current_status with userData', () => {
    const alwaysDayCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.TWO_SHIFT,
      daysOn: 9999,
      nightsOn: 0,
      daysOff: 1,
      startDate: '2020-01-01',
      phaseOffset: 0,
    };

    const userData: OnboardingData = {
      shiftTimes: {
        dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
      },
    };

    const result = executeTool(
      'get_current_status',
      {},
      alwaysDayCycle,
      userData
    ) as ReturnType<typeof executeGetCurrentStatus>;

    expect(result.todayShift.shiftType).toBe('day');
    expect(result.shiftTimes).toBe('7:00 AM to 7:00 PM');
  });

  it('should dispatch get_statistics correctly', () => {
    const result = executeTool(
      'get_statistics',
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    ) as ReturnType<typeof executeGetStatistics>;

    expect(result.totalShifts).toBe(8);
    expect(result.dayShifts).toBe(4);
    expect(result.nightShifts).toBe(4);
    expect(result.daysOff).toBe(4);
    expect(result.totalDays).toBe(12);
  });

  it('should dispatch get_next_occurrence correctly', () => {
    const result = executeTool(
      'get_next_occurrence',
      { shiftType: 'off', fromDate: '2024-01-01' },
      twoShiftCycle
    ) as ReturnType<typeof executeGetNextOccurrence>;

    expect(result.found).toBe(true);
    expect(result.shiftDay).toBeDefined();
    expect(result.shiftDay!.shiftType).toBe('off');
  });

  it('should return an error for an unknown tool name', () => {
    const result = executeTool(
      'unknown_tool',
      {},
      twoShiftCycle
    ) as { error: string };

    expect(result).toHaveProperty('error');
    expect(result.error).toBe('Unknown tool: unknown_tool');
  });

  it('should return an error for an empty tool name', () => {
    const result = executeTool(
      '',
      {},
      twoShiftCycle
    ) as { error: string };

    expect(result).toHaveProperty('error');
    expect(result.error).toBe('Unknown tool: ');
  });

  it('should return an error for a similarly named but incorrect tool', () => {
    const result = executeTool(
      'getShiftForDate',
      { date: '2024-01-01' },
      twoShiftCycle
    ) as { error: string };

    expect(result).toHaveProperty('error');
    expect(result.error).toBe('Unknown tool: getShiftForDate');
  });
});

// ---------------------------------------------------------------------------
// Integration: cross-function consistency
// ---------------------------------------------------------------------------

describe('cross-function consistency', () => {
  it('getShiftForDate and getShiftsInRange should agree on individual days', () => {
    const range = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    // Verify each day in the range matches the single-day query
    for (const day of range) {
      const single = executeGetShiftForDate({ date: day.date }, twoShiftCycle);
      expect(single.shiftType).toBe(day.shiftType);
      expect(single.isWorkDay).toBe(day.isWorkDay);
      expect(single.isNightShift).toBe(day.isNightShift);
    }
  });

  it('statistics should be consistent with the shift range data', () => {
    const range = executeGetShiftsInRange(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    const stats = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-12' },
      twoShiftCycle
    );

    const manualDayCount = range.filter((d) => d.shiftType === 'day').length;
    const manualNightCount = range.filter((d) => d.shiftType === 'night').length;
    const manualOffCount = range.filter((d) => d.shiftType === 'off').length;

    expect(stats.dayShifts).toBe(manualDayCount);
    expect(stats.nightShifts).toBe(manualNightCount);
    expect(stats.daysOff).toBe(manualOffCount);
    expect(stats.totalDays).toBe(range.length);
  });

  it('next occurrence date should match the shift type at that date', () => {
    const occurrence = executeGetNextOccurrence(
      { shiftType: 'night', fromDate: '2024-01-01' },
      twoShiftCycle
    );

    expect(occurrence.found).toBe(true);

    // Verify the found date actually has the expected shift type
    const verification = executeGetShiftForDate(
      { date: occurrence.shiftDay!.date },
      twoShiftCycle
    );
    expect(verification.shiftType).toBe('night');
  });

  it('statistics totalShifts + daysOff should equal totalDays', () => {
    const stats = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-31' },
      twoShiftCycle
    );

    expect(stats.totalShifts + stats.daysOff).toBe(stats.totalDays);
  });

  it('3-shift statistics should maintain totalShifts + daysOff = totalDays invariant', () => {
    const stats = executeGetStatistics(
      { startDate: '2024-01-01', endDate: '2024-01-27' },
      threeShiftCycle
    );

    expect(stats.totalShifts + stats.daysOff).toBe(stats.totalDays);
    expect(stats.totalShifts).toBe(
      stats.morningShifts + stats.afternoonShifts + stats.nightShifts + stats.dayShifts
    );
  });
});
