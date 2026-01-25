/**
 * Validation Tests
 *
 * Comprehensive tests for Zod schemas and type guards.
 */

import { describe, it, expect } from '@jest/globals';
import {
  shiftDaySchema,
  shiftCycleSchema,
  holidaySchema,
  userProfileSchema,
  shiftLogEntrySchema,
  shiftReportSchema,
  notificationSettingsSchema,
  earningsConfigSchema,
  appSettingsSchema,
  isShiftDay,
  isHoliday,
  isUserProfile,
  isShiftCycle,
  isShiftLogEntry,
  isShiftReport,
  isAppSettings,
  validateDateString,
  validateTimeString,
  validateEmail,
  validateShiftDay,
  validateHoliday,
  safeParseShiftDay,
  safeParseHoliday,
} from '@/types/validation';
import { ShiftPattern, EnergyLevel, ReportType } from '@/types';

describe('Date and Time Validation', () => {
  describe('validateDateString', () => {
    it('should validate correct date format YYYY-MM-DD', () => {
      expect(validateDateString('2024-01-15')).toBe(true);
      expect(validateDateString('2024-12-31')).toBe(true);
      expect(validateDateString('2025-06-01')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(validateDateString('15-01-2024')).toBe(false);
      expect(validateDateString('2024/01/15')).toBe(false);
      expect(validateDateString('01-15-2024')).toBe(false);
      expect(validateDateString('2024-1-15')).toBe(false);
      expect(validateDateString('not-a-date')).toBe(false);
    });
  });

  describe('validateTimeString', () => {
    it('should validate correct time format HH:mm', () => {
      expect(validateTimeString('09:30')).toBe(true);
      expect(validateTimeString('23:59')).toBe(true);
      expect(validateTimeString('00:00')).toBe(true);
    });

    it('should reject invalid time formats', () => {
      expect(validateTimeString('9:30')).toBe(false);
      expect(validateTimeString('24:00')).toBe(false);
      expect(validateTimeString('23:60')).toBe(false);
      expect(validateTimeString('12:30 PM')).toBe(false);
      expect(validateTimeString('not-a-time')).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });
  });
});

describe('Shift Day Schema', () => {
  const validShiftDay = {
    date: '2024-01-15',
    isWorkDay: true,
    isNightShift: false,
    shiftType: 'day',
  };

  it('should validate a valid shift day', () => {
    expect(() => shiftDaySchema.parse(validShiftDay)).not.toThrow();
  });

  it('should validate shift day with notes', () => {
    const withNotes = { ...validShiftDay, notes: 'Early start' };
    expect(() => shiftDaySchema.parse(withNotes)).not.toThrow();
  });

  it('should reject invalid date format', () => {
    const invalid = { ...validShiftDay, date: '15-01-2024' };
    expect(() => shiftDaySchema.parse(invalid)).toThrow();
  });

  it('should reject invalid shift type', () => {
    const invalid = { ...validShiftDay, shiftType: 'invalid' };
    expect(() => shiftDaySchema.parse(invalid)).toThrow();
  });

  it('should reject missing required fields', () => {
    const { date: _date, ...incomplete } = validShiftDay;
    expect(() => shiftDaySchema.parse(incomplete)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isShiftDay(validShiftDay)).toBe(true);
    expect(isShiftDay({ invalid: 'data' })).toBe(false);
  });
});

describe('Shift Cycle Schema', () => {
  const validShiftCycle = {
    patternType: ShiftPattern.STANDARD_3_3_3,
    daysOn: 3,
    nightsOn: 3,
    daysOff: 3,
    startDate: '2024-01-01',
    phaseOffset: 0,
  };

  it('should validate a valid shift cycle', () => {
    expect(() => shiftCycleSchema.parse(validShiftCycle)).not.toThrow();
  });

  it('should validate shift cycle with custom pattern', () => {
    const withCustom = {
      ...validShiftCycle,
      patternType: ShiftPattern.CUSTOM,
      customPattern: [
        { date: '2024-01-01', isWorkDay: true, isNightShift: false, shiftType: 'day' },
      ],
    };
    expect(() => shiftCycleSchema.parse(withCustom)).not.toThrow();
  });

  it('should reject negative day values', () => {
    const invalid = { ...validShiftCycle, daysOn: -1 };
    expect(() => shiftCycleSchema.parse(invalid)).toThrow();
  });

  it('should reject excessive day values', () => {
    const invalid = { ...validShiftCycle, daysOn: 366 };
    expect(() => shiftCycleSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid date format', () => {
    const invalid = { ...validShiftCycle, startDate: 'invalid-date' };
    expect(() => shiftCycleSchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isShiftCycle(validShiftCycle)).toBe(true);
    expect(isShiftCycle({ invalid: 'data' })).toBe(false);
  });
});

describe('Holiday Schema', () => {
  const validHoliday = {
    id: 'holiday-1',
    name: 'New Year',
    date: '2024-01-01',
    country: 'US',
    type: 'national',
  };

  it('should validate a valid holiday', () => {
    expect(() => holidaySchema.parse(validHoliday)).not.toThrow();
  });

  it('should validate holiday with optional fields', () => {
    const withOptional = {
      ...validHoliday,
      description: 'First day of the year',
      isPaid: true,
    };
    expect(() => holidaySchema.parse(withOptional)).not.toThrow();
  });

  it('should reject empty name', () => {
    const invalid = { ...validHoliday, name: '' };
    expect(() => holidaySchema.parse(invalid)).toThrow();
  });

  it('should reject invalid country code', () => {
    const invalid = { ...validHoliday, country: 'USA' }; // Should be 2 letters
    expect(() => holidaySchema.parse(invalid)).toThrow();
  });

  it('should reject invalid holiday type', () => {
    const invalid = { ...validHoliday, type: 'invalid' };
    expect(() => holidaySchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isHoliday(validHoliday)).toBe(true);
    expect(isHoliday({ invalid: 'data' })).toBe(false);
  });
});

describe('User Profile Schema', () => {
  const validProfile = {
    id: 'user-123',
    name: 'John Doe',
    occupation: 'Nurse',
    company: 'Hospital ABC',
    country: 'US',
    email: 'john@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should validate a valid user profile', () => {
    expect(() => userProfileSchema.parse(validProfile)).not.toThrow();
  });

  it('should validate profile with optional fields', () => {
    const withOptional = {
      ...validProfile,
      photoURL: 'https://example.com/photo.jpg',
      shiftCycle: {
        patternType: ShiftPattern.STANDARD_3_3_3,
        daysOn: 3,
        nightsOn: 3,
        daysOff: 3,
        startDate: '2024-01-01',
        phaseOffset: 0,
      },
      notificationSettings: {
        shift24HoursBefore: true,
        shift4HoursBefore: true,
        holidayAlerts: true,
        patternChangeAlerts: false,
        soundEnabled: true,
        vibrationEnabled: true,
      },
    };
    expect(() => userProfileSchema.parse(withOptional)).not.toThrow();
  });

  it('should reject invalid email', () => {
    const invalid = { ...validProfile, email: 'not-an-email' };
    expect(() => userProfileSchema.parse(invalid)).toThrow();
  });

  it('should reject empty name', () => {
    const invalid = { ...validProfile, name: '' };
    expect(() => userProfileSchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isUserProfile(validProfile)).toBe(true);
    expect(isUserProfile({ invalid: 'data' })).toBe(false);
  });
});

describe('Shift Log Entry Schema', () => {
  const validLogEntry = {
    id: 'log-1',
    userId: 'user-123',
    date: '2024-01-15',
    shiftType: 'day',
    startTime: '09:00',
    endTime: '17:00',
    hoursWorked: 8,
    loggedAt: '2024-01-15T18:00:00Z',
  };

  it('should validate a valid shift log entry', () => {
    expect(() => shiftLogEntrySchema.parse(validLogEntry)).not.toThrow();
  });

  it('should validate with optional fields', () => {
    const withOptional = {
      ...validLogEntry,
      energyLevel: EnergyLevel.HIGH,
      notes: 'Good shift',
    };
    expect(() => shiftLogEntrySchema.parse(withOptional)).not.toThrow();
  });

  it('should reject invalid time format', () => {
    const invalid = { ...validLogEntry, startTime: '9:00' };
    expect(() => shiftLogEntrySchema.parse(invalid)).toThrow();
  });

  it('should reject negative hours worked', () => {
    const invalid = { ...validLogEntry, hoursWorked: -1 };
    expect(() => shiftLogEntrySchema.parse(invalid)).toThrow();
  });

  it('should reject hours worked > 24', () => {
    const invalid = { ...validLogEntry, hoursWorked: 25 };
    expect(() => shiftLogEntrySchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isShiftLogEntry(validLogEntry)).toBe(true);
    expect(isShiftLogEntry({ invalid: 'data' })).toBe(false);
  });
});

describe('Notification Settings Schema', () => {
  const validSettings = {
    shift24HoursBefore: true,
    shift4HoursBefore: false,
    holidayAlerts: true,
    patternChangeAlerts: true,
    soundEnabled: false,
    vibrationEnabled: true,
  };

  it('should validate valid notification settings', () => {
    expect(() => notificationSettingsSchema.parse(validSettings)).not.toThrow();
  });

  it('should reject non-boolean values', () => {
    const invalid = { ...validSettings, shift24HoursBefore: 'true' };
    expect(() => notificationSettingsSchema.parse(invalid)).toThrow();
  });

  it('should reject missing fields', () => {
    const { soundEnabled: _soundEnabled, ...incomplete } = validSettings;
    expect(() => notificationSettingsSchema.parse(incomplete)).toThrow();
  });
});

describe('Earnings Config Schema', () => {
  const validConfig = {
    hourlyRate: 25.5,
    nightShiftMultiplier: 1.5,
    overtimeThreshold: 40,
    overtimeMultiplier: 1.5,
    holidayMultiplier: 2.0,
    currency: 'USD',
  };

  it('should validate valid earnings config', () => {
    expect(() => earningsConfigSchema.parse(validConfig)).not.toThrow();
  });

  it('should reject negative hourly rate', () => {
    const invalid = { ...validConfig, hourlyRate: -10 };
    expect(() => earningsConfigSchema.parse(invalid)).toThrow();
  });

  it('should reject multiplier < 1', () => {
    const invalid = { ...validConfig, nightShiftMultiplier: 0.5 };
    expect(() => earningsConfigSchema.parse(invalid)).toThrow();
  });

  it('should reject invalid currency code', () => {
    const invalid = { ...validConfig, currency: 'US' }; // Should be 3 letters
    expect(() => earningsConfigSchema.parse(invalid)).toThrow();
  });
});

describe('Shift Report Schema', () => {
  const validReport = {
    id: 'report-1',
    userId: 'user-123',
    type: ReportType.COUNT_SHIFTS,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    statistics: {
      totalShifts: 10,
      dayShifts: 5,
      nightShifts: 3,
      daysOff: 2,
      totalHours: 80,
      averageHoursPerShift: 8,
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
    generatedAt: '2024-02-01T00:00:00Z',
  };

  it('should validate valid shift report', () => {
    expect(() => shiftReportSchema.parse(validReport)).not.toThrow();
  });

  it('should validate report with earnings', () => {
    const withEarnings = {
      ...validReport,
      earnings: {
        regularPay: 2000,
        nightShiftPay: 300,
        overtimePay: 200,
        holidayPay: 100,
        totalPay: 2600,
        currency: 'USD',
      },
    };
    expect(() => shiftReportSchema.parse(withEarnings)).not.toThrow();
  });

  it('should reject negative shift counts', () => {
    const invalid = {
      ...validReport,
      statistics: { ...validReport.statistics, totalShifts: -1 },
    };
    expect(() => shiftReportSchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isShiftReport(validReport)).toBe(true);
    expect(isShiftReport({ invalid: 'data' })).toBe(false);
  });
});

describe('App Settings Schema', () => {
  const validSettings = {
    theme: 'light',
    language: 'en',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    firstDayOfWeek: 1,
    analyticsEnabled: true,
    crashReportingEnabled: true,
  };

  it('should validate valid app settings', () => {
    expect(() => appSettingsSchema.parse(validSettings)).not.toThrow();
  });

  it('should accept all theme values', () => {
    expect(() => appSettingsSchema.parse({ ...validSettings, theme: 'dark' })).not.toThrow();
    expect(() => appSettingsSchema.parse({ ...validSettings, theme: 'system' })).not.toThrow();
  });

  it('should accept all date format values', () => {
    expect(() =>
      appSettingsSchema.parse({ ...validSettings, dateFormat: 'MM/DD/YYYY' })
    ).not.toThrow();
    expect(() =>
      appSettingsSchema.parse({ ...validSettings, dateFormat: 'DD/MM/YYYY' })
    ).not.toThrow();
  });

  it('should accept valid firstDayOfWeek values', () => {
    expect(() => appSettingsSchema.parse({ ...validSettings, firstDayOfWeek: 0 })).not.toThrow();
    expect(() => appSettingsSchema.parse({ ...validSettings, firstDayOfWeek: 1 })).not.toThrow();
  });

  it('should reject invalid firstDayOfWeek value', () => {
    const invalid = { ...validSettings, firstDayOfWeek: 2 };
    expect(() => appSettingsSchema.parse(invalid)).toThrow();
  });

  it('should work with type guard', () => {
    expect(isAppSettings(validSettings)).toBe(true);
    expect(isAppSettings({ invalid: 'data' })).toBe(false);
  });
});

describe('Validation Helper Functions', () => {
  describe('validateShiftDay', () => {
    it('should successfully validate valid data', () => {
      const data = {
        date: '2024-01-15',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      };
      expect(() => validateShiftDay(data)).not.toThrow();
    });

    it('should throw on invalid data', () => {
      expect(() => validateShiftDay({ invalid: 'data' })).toThrow();
    });
  });

  describe('validateHoliday', () => {
    it('should successfully validate valid data', () => {
      const data = {
        id: 'holiday-1',
        name: 'Christmas',
        date: '2024-12-25',
        country: 'US',
        type: 'national',
      };
      expect(() => validateHoliday(data)).not.toThrow();
    });

    it('should throw on invalid data', () => {
      expect(() => validateHoliday({ invalid: 'data' })).toThrow();
    });
  });
});

describe('Safe Parse Functions', () => {
  describe('safeParseShiftDay', () => {
    it('should return success for valid data', () => {
      const data = {
        date: '2024-01-15',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      };
      const result = safeParseShiftDay(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(data);
      }
    });

    it('should return error for invalid data', () => {
      const result = safeParseShiftDay({ invalid: 'data' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('safeParseHoliday', () => {
    it('should return success for valid data', () => {
      const data = {
        id: 'holiday-1',
        name: 'Easter',
        date: '2024-03-31',
        country: 'UK',
        type: 'religious',
      };
      const result = safeParseHoliday(data);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid data', () => {
      const result = safeParseHoliday({ invalid: 'data' });
      expect(result.success).toBe(false);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle null values correctly', () => {
    expect(isShiftDay(null)).toBe(false);
    expect(isHoliday(null)).toBe(false);
    expect(isUserProfile(null)).toBe(false);
  });

  it('should handle undefined values correctly', () => {
    expect(isShiftDay(undefined)).toBe(false);
    expect(isHoliday(undefined)).toBe(false);
    expect(isUserProfile(undefined)).toBe(false);
  });

  it('should handle empty objects correctly', () => {
    expect(isShiftDay({})).toBe(false);
    expect(isHoliday({})).toBe(false);
    expect(isUserProfile({})).toBe(false);
  });

  it('should handle arrays correctly', () => {
    expect(isShiftDay([])).toBe(false);
    expect(isHoliday([])).toBe(false);
    expect(isUserProfile([])).toBe(false);
  });

  it('should handle primitive values correctly', () => {
    expect(isShiftDay('string')).toBe(false);
    expect(isHoliday(123)).toBe(false);
    expect(isUserProfile(true)).toBe(false);
  });
});
