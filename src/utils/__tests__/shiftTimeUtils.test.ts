/**
 * Tests for Shift Time Utilities
 */

import {
  convertTo24Hour,
  convertTo12Hour,
  calculateEndTime,
  detectShiftType,
  validateTimeFormat,
  formatTimeForDisplay,
  parseTimeInput,
  getRequiredShiftTypes,
  getShiftTimesFromData,
} from '../shiftTimeUtils';

describe('shiftTimeUtils', () => {
  describe('convertTo24Hour', () => {
    it('should convert AM times correctly', () => {
      expect(convertTo24Hour('06:00', 'AM')).toBe('06:00');
      expect(convertTo24Hour('09:30', 'AM')).toBe('09:30');
      expect(convertTo24Hour('11:45', 'AM')).toBe('11:45');
    });

    it('should convert 12:XX AM to 00:XX', () => {
      expect(convertTo24Hour('12:00', 'AM')).toBe('00:00');
      expect(convertTo24Hour('12:30', 'AM')).toBe('00:30');
    });

    it('should convert PM times correctly', () => {
      expect(convertTo24Hour('01:00', 'PM')).toBe('13:00');
      expect(convertTo24Hour('06:30', 'PM')).toBe('18:30');
      expect(convertTo24Hour('11:45', 'PM')).toBe('23:45');
    });

    it('should keep 12:XX PM as 12:XX', () => {
      expect(convertTo24Hour('12:00', 'PM')).toBe('12:00');
      expect(convertTo24Hour('12:30', 'PM')).toBe('12:30');
    });
  });

  describe('convertTo12Hour', () => {
    it('should convert morning hours correctly', () => {
      expect(convertTo12Hour('00:00')).toEqual({ time: '12:00', period: 'AM' });
      expect(convertTo12Hour('06:00')).toEqual({ time: '06:00', period: 'AM' });
      expect(convertTo12Hour('09:30')).toEqual({ time: '09:30', period: 'AM' });
      expect(convertTo12Hour('11:45')).toEqual({ time: '11:45', period: 'AM' });
    });

    it('should convert noon correctly', () => {
      expect(convertTo12Hour('12:00')).toEqual({ time: '12:00', period: 'PM' });
      expect(convertTo12Hour('12:30')).toEqual({ time: '12:30', period: 'PM' });
    });

    it('should convert afternoon/evening hours correctly', () => {
      expect(convertTo12Hour('13:00')).toEqual({ time: '01:00', period: 'PM' });
      expect(convertTo12Hour('18:30')).toEqual({ time: '06:30', period: 'PM' });
      expect(convertTo12Hour('23:45')).toEqual({ time: '11:45', period: 'PM' });
    });
  });

  describe('calculateEndTime', () => {
    it('should calculate end time within same day (8-hour shift)', () => {
      expect(calculateEndTime('06:00', 8)).toBe('14:00');
      expect(calculateEndTime('07:00', 8)).toBe('15:00');
      expect(calculateEndTime('09:30', 8)).toBe('17:30');
    });

    it('should calculate end time within same day (12-hour shift)', () => {
      expect(calculateEndTime('06:00', 12)).toBe('18:00');
      expect(calculateEndTime('07:00', 12)).toBe('19:00');
    });

    it('should handle overnight shifts correctly (crossing midnight)', () => {
      expect(calculateEndTime('18:00', 12)).toBe('06:00');
      expect(calculateEndTime('22:00', 12)).toBe('10:00');
      expect(calculateEndTime('23:00', 8)).toBe('07:00');
    });

    it('should handle shifts starting at midnight', () => {
      expect(calculateEndTime('00:00', 12)).toBe('12:00');
      expect(calculateEndTime('00:00', 8)).toBe('08:00');
    });

    it('should handle shifts with minutes', () => {
      expect(calculateEndTime('06:15', 12)).toBe('18:15');
      expect(calculateEndTime('13:45', 8)).toBe('21:45');
    });
  });

  describe('detectShiftType', () => {
    it('should detect day shift (6:00 AM to 5:59 PM)', () => {
      expect(detectShiftType('06:00')).toBe('day');
      expect(detectShiftType('07:00')).toBe('day');
      expect(detectShiftType('12:00')).toBe('day');
      expect(detectShiftType('17:59')).toBe('day');
    });

    it('should detect night shift (6:00 PM to 5:59 AM)', () => {
      expect(detectShiftType('18:00')).toBe('night');
      expect(detectShiftType('22:00')).toBe('night');
      expect(detectShiftType('00:00')).toBe('night');
      expect(detectShiftType('05:59')).toBe('night');
    });

    it('should detect boundary times correctly', () => {
      expect(detectShiftType('05:59')).toBe('night');
      expect(detectShiftType('06:00')).toBe('day');
      expect(detectShiftType('17:59')).toBe('day');
      expect(detectShiftType('18:00')).toBe('night');
    });
  });

  describe('validateTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(validateTimeFormat('00:00')).toBe(true);
      expect(validateTimeFormat('06:30')).toBe(true);
      expect(validateTimeFormat('12:00')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
    });

    it('should accept single-digit hours', () => {
      expect(validateTimeFormat('6:00')).toBe(true);
      expect(validateTimeFormat('9:30')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateTimeFormat('24:00')).toBe(false);
      expect(validateTimeFormat('12:60')).toBe(false);
      expect(validateTimeFormat('abc:00')).toBe(false);
      expect(validateTimeFormat('12-30')).toBe(false);
      expect(validateTimeFormat('1230')).toBe(false);
      expect(validateTimeFormat('12:')).toBe(false);
    });

    it('should reject out of range values', () => {
      expect(validateTimeFormat('25:00')).toBe(false);
      expect(validateTimeFormat('12:61')).toBe(false);
      expect(validateTimeFormat('-1:00')).toBe(false);
    });
  });

  describe('formatTimeForDisplay', () => {
    it('should format morning times correctly', () => {
      expect(formatTimeForDisplay('00:00')).toBe('12:00 AM');
      expect(formatTimeForDisplay('06:00')).toBe('6:00 AM');
      expect(formatTimeForDisplay('09:30')).toBe('9:30 AM');
      expect(formatTimeForDisplay('11:45')).toBe('11:45 AM');
    });

    it('should format afternoon/evening times correctly', () => {
      expect(formatTimeForDisplay('12:00')).toBe('12:00 PM');
      expect(formatTimeForDisplay('13:00')).toBe('1:00 PM');
      expect(formatTimeForDisplay('18:30')).toBe('6:30 PM');
      expect(formatTimeForDisplay('23:59')).toBe('11:59 PM');
    });

    it('should remove leading zeros from hours', () => {
      expect(formatTimeForDisplay('06:00')).toBe('6:00 AM');
      expect(formatTimeForDisplay('09:00')).toBe('9:00 AM');
    });
  });

  describe('parseTimeInput', () => {
    it('should parse valid time inputs', () => {
      expect(parseTimeInput('06:00')).toEqual({ hours: '06', minutes: '00' });
      expect(parseTimeInput('12:30')).toEqual({ hours: '12', minutes: '30' });
      expect(parseTimeInput('9:45')).toEqual({ hours: '9', minutes: '45' });
    });

    it('should strip non-numeric characters except colon', () => {
      expect(parseTimeInput('06:00 AM')).toEqual({ hours: '06', minutes: '00' });
      expect(parseTimeInput('12:30pm')).toEqual({ hours: '12', minutes: '30' });
    });

    it('should return null for invalid formats', () => {
      expect(parseTimeInput('12345')).toBeNull();
      expect(parseTimeInput('abc')).toBeNull();
      expect(parseTimeInput('12:30:45')).toBeNull();
      expect(parseTimeInput('12')).toBeNull();
    });

    it('should return null if hours or minutes exceed 2 digits', () => {
      expect(parseTimeInput('123:00')).toBeNull();
      expect(parseTimeInput('12:345')).toBeNull();
    });
  });

  // Integration tests
  describe('Integration scenarios', () => {
    it('should correctly handle a full day shift workflow', () => {
      // User selects 6:00 AM, 12-hour shift
      const startTime24h = convertTo24Hour('06:00', 'AM');
      expect(startTime24h).toBe('06:00');

      const endTime24h = calculateEndTime(startTime24h, 12);
      expect(endTime24h).toBe('18:00');

      const shiftType = detectShiftType(startTime24h);
      expect(shiftType).toBe('day');

      const displayStart = formatTimeForDisplay(startTime24h);
      const displayEnd = formatTimeForDisplay(endTime24h);
      expect(displayStart).toBe('6:00 AM');
      expect(displayEnd).toBe('6:00 PM');
    });

    it('should correctly handle a full night shift workflow', () => {
      // User selects 10:00 PM, 12-hour shift
      const startTime24h = convertTo24Hour('10:00', 'PM');
      expect(startTime24h).toBe('22:00');

      const endTime24h = calculateEndTime(startTime24h, 12);
      expect(endTime24h).toBe('10:00');

      const shiftType = detectShiftType(startTime24h);
      expect(shiftType).toBe('night');

      const displayStart = formatTimeForDisplay(startTime24h);
      const displayEnd = formatTimeForDisplay(endTime24h);
      expect(displayStart).toBe('10:00 PM');
      expect(displayEnd).toBe('10:00 AM');
    });

    it('should correctly handle an 8-hour evening shift', () => {
      // User selects 6:00 PM, 8-hour shift
      const startTime24h = convertTo24Hour('06:00', 'PM');
      expect(startTime24h).toBe('18:00');

      const endTime24h = calculateEndTime(startTime24h, 8);
      expect(endTime24h).toBe('02:00');

      const shiftType = detectShiftType(startTime24h);
      expect(shiftType).toBe('night');

      const displayStart = formatTimeForDisplay(startTime24h);
      const displayEnd = formatTimeForDisplay(endTime24h);
      expect(displayStart).toBe('6:00 PM');
      expect(displayEnd).toBe('2:00 AM');
    });

    it('should handle midnight start time correctly', () => {
      const startTime24h = convertTo24Hour('12:00', 'AM');
      expect(startTime24h).toBe('00:00');

      const endTime24h = calculateEndTime(startTime24h, 12);
      expect(endTime24h).toBe('12:00');

      const shiftType = detectShiftType(startTime24h);
      expect(shiftType).toBe('night');

      const displayStart = formatTimeForDisplay(startTime24h);
      const displayEnd = formatTimeForDisplay(endTime24h);
      expect(displayStart).toBe('12:00 AM');
      expect(displayEnd).toBe('12:00 PM');
    });
  });

  describe('detectShiftType with 3-shift system', () => {
    it('should return "morning" for times between 6 AM and 2 PM in 3-shift system', () => {
      expect(detectShiftType('06:00', '3-shift')).toBe('morning');
      expect(detectShiftType('08:30', '3-shift')).toBe('morning');
      expect(detectShiftType('12:00', '3-shift')).toBe('morning');
      expect(detectShiftType('13:59', '3-shift')).toBe('morning');
    });

    it('should return "afternoon" for times between 2 PM and 10 PM in 3-shift system', () => {
      expect(detectShiftType('14:00', '3-shift')).toBe('afternoon');
      expect(detectShiftType('16:30', '3-shift')).toBe('afternoon');
      expect(detectShiftType('18:00', '3-shift')).toBe('afternoon');
      expect(detectShiftType('21:59', '3-shift')).toBe('afternoon');
    });

    it('should return "night" for times between 10 PM and 6 AM in 3-shift system', () => {
      expect(detectShiftType('22:00', '3-shift')).toBe('night');
      expect(detectShiftType('23:30', '3-shift')).toBe('night');
      expect(detectShiftType('00:00', '3-shift')).toBe('night');
      expect(detectShiftType('03:00', '3-shift')).toBe('night');
      expect(detectShiftType('05:59', '3-shift')).toBe('night');
    });

    it('should handle boundary times correctly in 3-shift system', () => {
      // Morning starts at 6:00
      expect(detectShiftType('06:00', '3-shift')).toBe('morning');
      expect(detectShiftType('05:59', '3-shift')).toBe('night');

      // Afternoon starts at 14:00
      expect(detectShiftType('14:00', '3-shift')).toBe('afternoon');
      expect(detectShiftType('13:59', '3-shift')).toBe('morning');

      // Night starts at 22:00
      expect(detectShiftType('22:00', '3-shift')).toBe('night');
      expect(detectShiftType('21:59', '3-shift')).toBe('afternoon');
    });
  });

  describe('getRequiredShiftTypes', () => {
    it('should return default shift type when no custom pattern provided for 2-shift', () => {
      const result = getRequiredShiftTypes('2-shift');
      expect(result).toEqual(['day']);
    });

    it('should return default shift type when no custom pattern provided for 3-shift', () => {
      const result = getRequiredShiftTypes('3-shift');
      expect(result).toEqual(['morning']);
    });

    it('should return required shifts for 2-shift custom pattern with both day and night', () => {
      const result = getRequiredShiftTypes('2-shift', {
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
      });
      expect(result).toEqual(['day', 'night']);
    });

    it('should return only day shift for 2-shift pattern with only days', () => {
      const result = getRequiredShiftTypes('2-shift', {
        daysOn: 5,
        nightsOn: 0,
        daysOff: 2,
      });
      expect(result).toEqual(['day']);
    });

    it('should return only night shift for 2-shift pattern with only nights', () => {
      const result = getRequiredShiftTypes('2-shift', {
        daysOn: 0,
        nightsOn: 5,
        daysOff: 2,
      });
      expect(result).toEqual(['night']);
    });

    it('should handle edge case of 2-shift pattern with no working shifts', () => {
      const result = getRequiredShiftTypes('2-shift', {
        daysOn: 0,
        nightsOn: 0,
        daysOff: 7,
      });
      expect(result).toEqual(['day']); // Should default to day
    });

    it('should return required shifts for 3-shift custom pattern with all shifts', () => {
      const result = getRequiredShiftTypes('3-shift', {
        daysOn: 0,
        nightsOn: 0,
        morningOn: 2,
        afternoonOn: 3,
        nightOn: 2,
        daysOff: 2,
      });
      expect(result).toEqual(['morning', 'afternoon', 'night']);
    });

    it('should return only required shifts for 3-shift pattern', () => {
      const result = getRequiredShiftTypes('3-shift', {
        daysOn: 0,
        nightsOn: 0,
        morningOn: 5,
        afternoonOn: 0,
        nightOn: 0,
        daysOff: 2,
      });
      expect(result).toEqual(['morning']);
    });

    it('should handle edge case of 3-shift pattern with no working shifts', () => {
      const result = getRequiredShiftTypes('3-shift', {
        daysOn: 0,
        nightsOn: 0,
        morningOn: 0,
        afternoonOn: 0,
        nightOn: 0,
        daysOff: 7,
      });
      expect(result).toEqual(['morning']); // Should default to morning
    });
  });

  describe('getShiftTimesFromData', () => {
    it('should extract shift times from new structure with day shift', () => {
      const data = {
        shiftTimes: {
          dayShift: {
            startTime: '06:00',
            endTime: '18:00',
            duration: 12 as const,
          },
        },
      };
      const result = getShiftTimesFromData(data);
      expect(result).toEqual([
        {
          type: 'day',
          startTime: '06:00',
          endTime: '18:00',
          duration: 12,
        },
      ]);
    });

    it('should extract shift times from new structure with multiple shifts', () => {
      const data = {
        shiftTimes: {
          dayShift: {
            startTime: '06:00',
            endTime: '18:00',
            duration: 12 as const,
          },
          nightShift: {
            startTime: '18:00',
            endTime: '06:00',
            duration: 12 as const,
          },
        },
      };
      const result = getShiftTimesFromData(data);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        type: 'day',
        startTime: '06:00',
        endTime: '18:00',
        duration: 12,
      });
      expect(result).toContainEqual({
        type: 'night',
        startTime: '18:00',
        endTime: '06:00',
        duration: 12,
      });
    });

    it('should extract 3-shift times from new structure', () => {
      const data = {
        shiftTimes: {
          morningShift: {
            startTime: '06:00',
            endTime: '14:00',
            duration: 8 as const,
          },
          afternoonShift: {
            startTime: '14:00',
            endTime: '22:00',
            duration: 8 as const,
          },
          nightShift3: {
            startTime: '22:00',
            endTime: '06:00',
            duration: 8 as const,
          },
        },
      };
      const result = getShiftTimesFromData(data);
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        type: 'morning',
        startTime: '06:00',
        endTime: '14:00',
        duration: 8,
      });
      expect(result).toContainEqual({
        type: 'afternoon',
        startTime: '14:00',
        endTime: '22:00',
        duration: 8,
      });
      expect(result).toContainEqual({
        type: 'night',
        startTime: '22:00',
        endTime: '06:00',
        duration: 8,
      });
    });

    it('should fall back to legacy structure when shiftTimes not present', () => {
      const data = {
        shiftStartTime: '06:00',
        shiftEndTime: '18:00',
        shiftDuration: 12 as const,
        shiftType: 'day' as const,
      };
      const result = getShiftTimesFromData(data);
      expect(result).toEqual([
        {
          type: 'day',
          startTime: '06:00',
          endTime: '18:00',
          duration: 12,
        },
      ]);
    });

    it('should return empty array when no shift data present', () => {
      const data = {};
      const result = getShiftTimesFromData(data);
      expect(result).toEqual([]);
    });
  });
});
