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
});
