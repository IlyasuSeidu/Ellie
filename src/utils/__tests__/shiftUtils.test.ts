/**
 * Tests for Shift Calculation Utilities
 */

import { calculateShiftDay } from '../shiftUtils';
import { ShiftPattern, ShiftSystem, ShiftCycle } from '@/types';

describe('calculateShiftDay', () => {
  describe('2-shift system', () => {
    it('should calculate day shift correctly for 4-4-4 pattern', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      // Day 1 (position 0) should be a day shift
      const day1 = calculateShiftDay(new Date('2024-01-01'), shiftCycle);
      expect(day1.shiftType).toBe('day');
      expect(day1.isWorkDay).toBe(true);
      expect(day1.isNightShift).toBe(false);

      // Day 4 (position 3) should still be a day shift
      const day4 = calculateShiftDay(new Date('2024-01-04'), shiftCycle);
      expect(day4.shiftType).toBe('day');
      expect(day4.isWorkDay).toBe(true);
    });

    it('should calculate night shift correctly for 4-4-4 pattern', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      // Day 5 (position 4) should be a night shift
      const day5 = calculateShiftDay(new Date('2024-01-05'), shiftCycle);
      expect(day5.shiftType).toBe('night');
      expect(day5.isWorkDay).toBe(true);
      expect(day5.isNightShift).toBe(true);

      // Day 8 (position 7) should still be a night shift
      const day8 = calculateShiftDay(new Date('2024-01-08'), shiftCycle);
      expect(day8.shiftType).toBe('night');
      expect(day8.isWorkDay).toBe(true);
      expect(day8.isNightShift).toBe(true);
    });

    it('should calculate days off correctly for 4-4-4 pattern', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      // Day 9 (position 8) should be a day off
      const day9 = calculateShiftDay(new Date('2024-01-09'), shiftCycle);
      expect(day9.shiftType).toBe('off');
      expect(day9.isWorkDay).toBe(false);
      expect(day9.isNightShift).toBe(false);

      // Day 12 (position 11) should still be a day off
      const day12 = calculateShiftDay(new Date('2024-01-12'), shiftCycle);
      expect(day12.shiftType).toBe('off');
      expect(day12.isWorkDay).toBe(false);
    });

    it('should handle cycle repetition correctly', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      // Day 13 (position 0 in second cycle) should be a day shift again
      const day13 = calculateShiftDay(new Date('2024-01-13'), shiftCycle);
      expect(day13.shiftType).toBe('day');
      expect(day13.isWorkDay).toBe(true);
      expect(day13.isNightShift).toBe(false);
    });
  });

  describe('3-shift system', () => {
    it('should calculate morning shift correctly for custom 3-shift pattern', () => {
      const shiftCycle: ShiftCycle = {
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

      // Day 1 (position 0) should be a morning shift
      const day1 = calculateShiftDay(new Date('2024-01-01'), shiftCycle);
      expect(day1.shiftType).toBe('morning');
      expect(day1.isWorkDay).toBe(true);
      expect(day1.isNightShift).toBe(false);

      // Day 2 (position 1) should still be a morning shift
      const day2 = calculateShiftDay(new Date('2024-01-02'), shiftCycle);
      expect(day2.shiftType).toBe('morning');
      expect(day2.isWorkDay).toBe(true);
    });

    it('should calculate afternoon shift correctly for custom 3-shift pattern', () => {
      const shiftCycle: ShiftCycle = {
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

      // Day 3 (position 2) should be an afternoon shift
      const day3 = calculateShiftDay(new Date('2024-01-03'), shiftCycle);
      expect(day3.shiftType).toBe('afternoon');
      expect(day3.isWorkDay).toBe(true);
      expect(day3.isNightShift).toBe(false);

      // Day 5 (position 4) should still be an afternoon shift
      const day5 = calculateShiftDay(new Date('2024-01-05'), shiftCycle);
      expect(day5.shiftType).toBe('afternoon');
      expect(day5.isWorkDay).toBe(true);
    });

    it('should calculate night shift correctly for custom 3-shift pattern', () => {
      const shiftCycle: ShiftCycle = {
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

      // Day 6 (position 5) should be a night shift
      const day6 = calculateShiftDay(new Date('2024-01-06'), shiftCycle);
      expect(day6.shiftType).toBe('night');
      expect(day6.isWorkDay).toBe(true);
      expect(day6.isNightShift).toBe(true);

      // Day 7 (position 6) should still be a night shift
      const day7 = calculateShiftDay(new Date('2024-01-07'), shiftCycle);
      expect(day7.shiftType).toBe('night');
      expect(day7.isWorkDay).toBe(true);
      expect(day7.isNightShift).toBe(true);
    });

    it('should calculate days off correctly for custom 3-shift pattern', () => {
      const shiftCycle: ShiftCycle = {
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

      // Day 8 (position 7) should be a day off
      const day8 = calculateShiftDay(new Date('2024-01-08'), shiftCycle);
      expect(day8.shiftType).toBe('off');
      expect(day8.isWorkDay).toBe(false);
      expect(day8.isNightShift).toBe(false);

      // Day 9 (position 8) should still be a day off
      const day9 = calculateShiftDay(new Date('2024-01-09'), shiftCycle);
      expect(day9.shiftType).toBe('off');
      expect(day9.isWorkDay).toBe(false);
    });

    it('should handle cycle repetition correctly for 3-shift', () => {
      const shiftCycle: ShiftCycle = {
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

      // Day 10 (position 0 in second cycle) should be a morning shift again
      const day10 = calculateShiftDay(new Date('2024-01-10'), shiftCycle);
      expect(day10.shiftType).toBe('morning');
      expect(day10.isWorkDay).toBe(true);
      expect(day10.isNightShift).toBe(false);
    });
  });

  describe('phase offset', () => {
    it('should apply phase offset correctly for 2-shift system', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        shiftSystem: ShiftSystem.TWO_SHIFT,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
        startDate: '2024-01-01',
        phaseOffset: 4, // Offset by 4 days (start at night shifts)
      };

      // Day 1 with offset of 4 should be a night shift (position 4)
      const day1 = calculateShiftDay(new Date('2024-01-01'), shiftCycle);
      expect(day1.shiftType).toBe('night');
      expect(day1.isWorkDay).toBe(true);
      expect(day1.isNightShift).toBe(true);
    });

    it('should apply phase offset correctly for 3-shift system', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.CUSTOM,
        shiftSystem: ShiftSystem.THREE_SHIFT,
        daysOn: 0,
        nightsOn: 0,
        morningOn: 2,
        afternoonOn: 3,
        nightOn: 2,
        daysOff: 2,
        startDate: '2024-01-01',
        phaseOffset: 2, // Offset by 2 days (start at afternoon shifts)
      };

      // Day 1 with offset of 2 should be an afternoon shift (position 2)
      const day1 = calculateShiftDay(new Date('2024-01-01'), shiftCycle);
      expect(day1.shiftType).toBe('afternoon');
      expect(day1.isWorkDay).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle custom pattern with daysOn=0 for 3-shift system', () => {
      const shiftCycle: ShiftCycle = {
        patternType: ShiftPattern.CUSTOM,
        shiftSystem: ShiftSystem.THREE_SHIFT,
        daysOn: 0, // Set to 0 for 3-shift (should be ignored)
        nightsOn: 0, // Set to 0 for 3-shift (should be ignored)
        morningOn: 2,
        afternoonOn: 3,
        nightOn: 2,
        daysOff: 2,
        startDate: '2024-01-01',
        phaseOffset: 0,
      };

      // Should correctly identify as morning shift (not fail due to daysOn=0)
      const day1 = calculateShiftDay(new Date('2024-01-01'), shiftCycle);
      expect(day1.shiftType).toBe('morning');
      expect(day1.isWorkDay).toBe(true);

      // Verify the entire cycle works correctly
      const day2 = calculateShiftDay(new Date('2024-01-02'), shiftCycle);
      expect(day2.shiftType).toBe('morning');

      const day3 = calculateShiftDay(new Date('2024-01-03'), shiftCycle);
      expect(day3.shiftType).toBe('afternoon');

      const day6 = calculateShiftDay(new Date('2024-01-06'), shiftCycle);
      expect(day6.shiftType).toBe('night');

      const day8 = calculateShiftDay(new Date('2024-01-08'), shiftCycle);
      expect(day8.shiftType).toBe('off');
      expect(day8.isWorkDay).toBe(false);
    });
  });
});
