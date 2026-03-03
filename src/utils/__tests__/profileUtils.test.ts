import {
  formatShiftTime,
  getCycleLengthDays,
  getFIFOCycleDescription,
  getFIFOWorkPatternName,
  getPatternDisplayName,
  getRosterTypeDisplayName,
  getShiftSystemDisplayName,
  getWorkRestRatio,
} from '../profileUtils';
import { ShiftPattern } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';

describe('profileUtils', () => {
  describe('getPatternDisplayName', () => {
    it('formats FIFO custom pattern', () => {
      const result = getPatternDisplayName({
        patternType: ShiftPattern.FIFO_CUSTOM,
        fifoConfig: {
          workBlockDays: 14,
          restBlockDays: 7,
          workBlockPattern: 'straight-days',
        },
      });

      expect(result).toBe('14/7 Custom FIFO');
    });

    it('formats rotating custom pattern for 3-shift', () => {
      const result = getPatternDisplayName({
        patternType: ShiftPattern.CUSTOM,
        shiftSystem: '3-shift',
        customPattern: {
          daysOn: 0,
          nightsOn: 0,
          daysOff: 2,
          morningOn: 3,
          afternoonOn: 3,
          nightOn: 3,
        },
      });

      expect(result).toBe('3-3-3-2 Custom Rotation');
    });

    it('returns known standard pattern name', () => {
      const result = getPatternDisplayName({
        patternType: ShiftPattern.STANDARD_2_2_3,
      });

      expect(result).toBe('2-2-3 (Pitman)');
    });
  });

  describe('display name helpers', () => {
    it('formats shift system display names', () => {
      expect(getShiftSystemDisplayName('2-shift')).toBe('2-Shift (12h)');
      expect(getShiftSystemDisplayName('3-shift')).toBe('3-Shift (8h)');
    });

    it('formats roster type display names', () => {
      expect(getRosterTypeDisplayName('fifo')).toBe('FIFO');
      expect(getRosterTypeDisplayName('rotating')).toBe('Rotating');
      expect(getRosterTypeDisplayName(undefined)).toBe('Rotating');
    });

    it('formats FIFO work pattern names', () => {
      expect(
        getFIFOWorkPatternName({
          workBlockDays: 7,
          restBlockDays: 7,
          workBlockPattern: 'straight-days',
        })
      ).toBe('Straight Days');

      expect(
        getFIFOWorkPatternName({
          workBlockDays: 14,
          restBlockDays: 7,
          workBlockPattern: 'swing',
          swingPattern: { daysOnDayShift: 7, daysOnNightShift: 7 },
        })
      ).toBe('Swing (7D + 7N)');
    });

    it('formats FIFO cycle descriptions', () => {
      expect(
        getFIFOCycleDescription({
          workBlockDays: 14,
          restBlockDays: 7,
          workBlockPattern: 'straight-days',
        })
      ).toBe('14 days work, 7 days home');
    });
  });

  describe('cycle and ratio helpers', () => {
    it('computes cycle length for FIFO data', () => {
      const data: OnboardingData = {
        rosterType: 'fifo',
        fifoConfig: {
          workBlockDays: 21,
          restBlockDays: 7,
          workBlockPattern: 'straight-days',
        },
      };

      expect(getCycleLengthDays(data)).toBe(28);
    });

    it('computes cycle length for custom 2-shift pattern', () => {
      const data: OnboardingData = {
        patternType: ShiftPattern.CUSTOM,
        shiftSystem: '2-shift',
        customPattern: {
          daysOn: 4,
          nightsOn: 4,
          daysOff: 4,
        },
      };

      expect(getCycleLengthDays(data)).toBe(12);
    });

    it('computes reduced work/rest ratio for FIFO', () => {
      const data: OnboardingData = {
        rosterType: 'fifo',
        fifoConfig: {
          workBlockDays: 14,
          restBlockDays: 7,
          workBlockPattern: 'straight-days',
        },
      };

      expect(getWorkRestRatio(data)).toBe('2:1');
    });

    it('returns fallback ratio when pattern is missing', () => {
      const data: OnboardingData = {};
      expect(getWorkRestRatio(data)).toBe('-');
    });
  });

  describe('formatShiftTime', () => {
    it('formats 24h input to 12h display', () => {
      expect(formatShiftTime('06:00')).toBe('6:00 AM');
      expect(formatShiftTime('18:30')).toBe('6:30 PM');
      expect(formatShiftTime('00:15')).toBe('12:15 AM');
    });

    it('returns fallback for empty/invalid input', () => {
      expect(formatShiftTime()).toBe('Not set');
      expect(formatShiftTime('bad')).toBe('bad');
    });
  });
});
