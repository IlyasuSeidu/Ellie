/**
 * Date Utilities Test Suite
 *
 * Comprehensive tests for date manipulation functions with edge cases.
 */

import {
  formatDate,
  parseDate,
  getDaysInMonth,
  isDateInRange,
  addDays,
  isSameDay,
  startOfDay,
  endOfDay,
  diffInDays,
  getToday,
  isToday,
  isPast,
  isFuture,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  toDateString,
  getDateRange,
  getDayOfWeek,
  isWeekend,
} from '@/utils/dateUtils';

describe('formatDate', () => {
  it('should format date with YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
  });

  it('should format date with MM/DD/YYYY', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2024');
  });

  it('should format date with DD/MM/YYYY', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2024');
  });

  it('should format with time', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-15 10:30:00');
  });

  it('should handle month boundary', () => {
    const date = new Date('2024-01-31T23:59:59');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-31');
  });

  it('should handle year boundary', () => {
    const date = new Date('2024-12-31T23:59:59');
    expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-12-31');
  });
});

describe('parseDate', () => {
  it('should parse YYYY-MM-DD format', () => {
    const date = parseDate('2024-01-15');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it('should parse MM/DD/YYYY format', () => {
    const date = parseDate('01/15/2024', 'MM/DD/YYYY');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });

  it('should parse DD/MM/YYYY format', () => {
    const date = parseDate('15/01/2024', 'DD/MM/YYYY');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
  });

  it('should parse ISO datetime', () => {
    const date = parseDate('2024-01-15T10:30:00');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getHours()).toBe(10);
    expect(date.getMinutes()).toBe(30);
  });
});

describe('getDaysInMonth', () => {
  it('should return 31 for January', () => {
    expect(getDaysInMonth(2024, 1)).toBe(31);
  });

  it('should return 29 for February in leap year', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
  });

  it('should return 28 for February in non-leap year', () => {
    expect(getDaysInMonth(2023, 2)).toBe(28);
  });

  it('should return 30 for April', () => {
    expect(getDaysInMonth(2024, 4)).toBe(30);
  });

  it('should return 31 for December', () => {
    expect(getDaysInMonth(2024, 12)).toBe(31);
  });

  it('should handle century non-leap year', () => {
    // 1900 was not a leap year
    expect(getDaysInMonth(1900, 2)).toBe(28);
  });

  it('should handle century leap year', () => {
    // 2000 was a leap year
    expect(getDaysInMonth(2000, 2)).toBe(29);
  });
});

describe('isDateInRange', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-31');

  it('should return true for date within range', () => {
    const date = new Date('2024-01-15');
    expect(isDateInRange(date, start, end)).toBe(true);
  });

  it('should return true for start date', () => {
    expect(isDateInRange(start, start, end)).toBe(true);
  });

  it('should return true for end date', () => {
    expect(isDateInRange(end, start, end)).toBe(true);
  });

  it('should return false for date before range', () => {
    const date = new Date('2023-12-31');
    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should return false for date after range', () => {
    const date = new Date('2024-02-01');
    expect(isDateInRange(date, start, end)).toBe(false);
  });

  it('should handle same start and end date', () => {
    const date = new Date('2024-01-15');
    expect(isDateInRange(date, date, date)).toBe(true);
  });
});

describe('addDays', () => {
  it('should add positive days', () => {
    const date = new Date('2024-01-15');
    const result = addDays(date, 5);
    expect(toDateString(result)).toBe('2024-01-20');
  });

  it('should subtract days with negative number', () => {
    const date = new Date('2024-01-15');
    const result = addDays(date, -5);
    expect(toDateString(result)).toBe('2024-01-10');
  });

  it('should handle month boundary', () => {
    const date = new Date('2024-01-30');
    const result = addDays(date, 2);
    expect(toDateString(result)).toBe('2024-02-01');
  });

  it('should handle year boundary', () => {
    const date = new Date('2024-12-30');
    const result = addDays(date, 2);
    expect(toDateString(result)).toBe('2025-01-01');
  });

  it('should handle leap year', () => {
    const date = new Date('2024-02-28');
    const result = addDays(date, 1);
    expect(toDateString(result)).toBe('2024-02-29');
  });

  it('should handle adding zero days', () => {
    const date = new Date('2024-01-15');
    const result = addDays(date, 0);
    expect(toDateString(result)).toBe('2024-01-15');
  });
});

describe('isSameDay', () => {
  it('should return true for same day', () => {
    const date1 = new Date('2024-01-15T10:00:00');
    const date2 = new Date('2024-01-15T15:30:00');
    expect(isSameDay(date1, date2)).toBe(true);
  });

  it('should return false for different days', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-01-16');
    expect(isSameDay(date1, date2)).toBe(false);
  });

  it('should return true for exact same date', () => {
    const date = new Date('2024-01-15T10:00:00');
    expect(isSameDay(date, date)).toBe(true);
  });

  it('should handle midnight boundary', () => {
    const date1 = new Date('2024-01-15T23:59:59');
    const date2 = new Date('2024-01-16T00:00:00');
    expect(isSameDay(date1, date2)).toBe(false);
  });
});

describe('startOfDay', () => {
  it('should return start of day', () => {
    const date = new Date('2024-01-15T15:30:45');
    const result = startOfDay(date);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('should not modify already at start of day', () => {
    const date = new Date('2024-01-15T00:00:00');
    const result = startOfDay(date);
    expect(result.getTime()).toBe(date.getTime());
  });
});

describe('endOfDay', () => {
  it('should return end of day', () => {
    const date = new Date('2024-01-15T10:30:00');
    const result = endOfDay(date);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});

describe('diffInDays', () => {
  it('should calculate positive difference', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-01-10');
    expect(diffInDays(date1, date2)).toBe(5);
  });

  it('should calculate negative difference', () => {
    const date1 = new Date('2024-01-10');
    const date2 = new Date('2024-01-15');
    expect(diffInDays(date1, date2)).toBe(-5);
  });

  it('should return 0 for same day', () => {
    const date = new Date('2024-01-15T10:00:00');
    const date2 = new Date('2024-01-15T15:00:00');
    expect(diffInDays(date, date2)).toBe(0);
  });

  it('should handle month boundary', () => {
    const date1 = new Date('2024-02-01');
    const date2 = new Date('2024-01-30');
    expect(diffInDays(date1, date2)).toBe(2);
  });

  it('should handle year boundary', () => {
    const date1 = new Date('2025-01-01');
    const date2 = new Date('2024-12-30');
    expect(diffInDays(date1, date2)).toBe(2);
  });

  it('should handle leap year', () => {
    const date1 = new Date('2024-03-01');
    const date2 = new Date('2024-02-01');
    expect(diffInDays(date1, date2)).toBe(29); // 2024 is leap year
  });
});

describe('getToday', () => {
  it('should return today with time set to start of day', () => {
    const today = getToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(today.getSeconds()).toBe(0);
    expect(today.getMilliseconds()).toBe(0);
  });

  it('should return current date', () => {
    const today = getToday();
    const now = new Date();
    expect(today.getDate()).toBe(now.getDate());
    expect(today.getMonth()).toBe(now.getMonth());
    expect(today.getFullYear()).toBe(now.getFullYear());
  });
});

describe('isToday', () => {
  it('should return true for today', () => {
    const today = new Date();
    expect(isToday(today)).toBe(true);
  });

  it('should return false for yesterday', () => {
    const yesterday = addDays(new Date(), -1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('should return false for tomorrow', () => {
    const tomorrow = addDays(new Date(), 1);
    expect(isToday(tomorrow)).toBe(false);
  });
});

describe('isPast', () => {
  it('should return true for past date', () => {
    const past = new Date('2020-01-01');
    expect(isPast(past)).toBe(true);
  });

  it('should return false for future date', () => {
    const future = new Date('2030-01-01');
    expect(isPast(future)).toBe(false);
  });

  it('should handle today', () => {
    const today = new Date();
    // Could be true or false depending on exact time
    const result = isPast(today);
    expect(typeof result).toBe('boolean');
  });
});

describe('isFuture', () => {
  it('should return true for future date', () => {
    const future = new Date('2030-01-01');
    expect(isFuture(future)).toBe(true);
  });

  it('should return false for past date', () => {
    const past = new Date('2020-01-01');
    expect(isFuture(past)).toBe(false);
  });
});

describe('getFirstDayOfMonth', () => {
  it('should return first day of month', () => {
    const date = new Date('2024-01-15');
    const result = getFirstDayOfMonth(date);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2024);
  });

  it('should handle already first day', () => {
    const date = new Date('2024-01-01');
    const result = getFirstDayOfMonth(date);
    expect(result.getDate()).toBe(1);
  });

  it('should handle last day of month', () => {
    const date = new Date('2024-01-31');
    const result = getFirstDayOfMonth(date);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });
});

describe('getLastDayOfMonth', () => {
  it('should return last day of January', () => {
    const date = new Date('2024-01-15');
    const result = getLastDayOfMonth(date);
    expect(result.getDate()).toBe(31);
  });

  it('should return last day of February (leap year)', () => {
    const date = new Date('2024-02-15');
    const result = getLastDayOfMonth(date);
    expect(result.getDate()).toBe(29);
  });

  it('should return last day of February (non-leap year)', () => {
    const date = new Date('2023-02-15');
    const result = getLastDayOfMonth(date);
    expect(result.getDate()).toBe(28);
  });

  it('should return last day of April', () => {
    const date = new Date('2024-04-15');
    const result = getLastDayOfMonth(date);
    expect(result.getDate()).toBe(30);
  });
});

describe('toDateString', () => {
  it('should convert to YYYY-MM-DD format', () => {
    const date = new Date('2024-01-15T10:30:00');
    expect(toDateString(date)).toBe('2024-01-15');
  });

  it('should handle single digit month', () => {
    const date = new Date('2024-01-15');
    expect(toDateString(date)).toBe('2024-01-15');
  });

  it('should handle single digit day', () => {
    const date = new Date('2024-01-05');
    expect(toDateString(date)).toBe('2024-01-05');
  });

  it('should handle end of year', () => {
    const date = new Date('2024-12-31');
    expect(toDateString(date)).toBe('2024-12-31');
  });
});

describe('getDateRange', () => {
  it('should return array of dates in range', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-05');
    const range = getDateRange(start, end);

    expect(range).toHaveLength(5);
    expect(toDateString(range[0])).toBe('2024-01-01');
    expect(toDateString(range[4])).toBe('2024-01-05');
  });

  it('should handle single day range', () => {
    const date = new Date('2024-01-15');
    const range = getDateRange(date, date);

    expect(range).toHaveLength(1);
    expect(toDateString(range[0])).toBe('2024-01-15');
  });

  it('should handle month boundary', () => {
    const start = new Date('2024-01-30');
    const end = new Date('2024-02-02');
    const range = getDateRange(start, end);

    expect(range).toHaveLength(4);
    expect(toDateString(range[0])).toBe('2024-01-30');
    expect(toDateString(range[1])).toBe('2024-01-31');
    expect(toDateString(range[2])).toBe('2024-02-01');
    expect(toDateString(range[3])).toBe('2024-02-02');
  });

  it('should handle year boundary', () => {
    const start = new Date('2024-12-30');
    const end = new Date('2025-01-02');
    const range = getDateRange(start, end);

    expect(range).toHaveLength(4);
    expect(toDateString(range[0])).toBe('2024-12-30');
    expect(toDateString(range[3])).toBe('2025-01-02');
  });

  it('should handle leap year February', () => {
    const start = new Date('2024-02-28');
    const end = new Date('2024-03-01');
    const range = getDateRange(start, end);

    expect(range).toHaveLength(3);
    expect(toDateString(range[0])).toBe('2024-02-28');
    expect(toDateString(range[1])).toBe('2024-02-29');
    expect(toDateString(range[2])).toBe('2024-03-01');
  });

  it('should handle full month', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');
    const range = getDateRange(start, end);

    expect(range).toHaveLength(31);
  });
});

describe('getDayOfWeek', () => {
  it('should return 0 for Sunday', () => {
    const date = new Date('2024-01-07'); // Sunday
    expect(getDayOfWeek(date)).toBe(0);
  });

  it('should return 1 for Monday', () => {
    const date = new Date('2024-01-01'); // Monday
    expect(getDayOfWeek(date)).toBe(1);
  });

  it('should return 6 for Saturday', () => {
    const date = new Date('2024-01-06'); // Saturday
    expect(getDayOfWeek(date)).toBe(6);
  });
});

describe('isWeekend', () => {
  it('should return true for Saturday', () => {
    const date = new Date('2024-01-06'); // Saturday
    expect(isWeekend(date)).toBe(true);
  });

  it('should return true for Sunday', () => {
    const date = new Date('2024-01-07'); // Sunday
    expect(isWeekend(date)).toBe(true);
  });

  it('should return false for Monday', () => {
    const date = new Date('2024-01-01'); // Monday
    expect(isWeekend(date)).toBe(false);
  });

  it('should return false for Friday', () => {
    const date = new Date('2024-01-05'); // Friday
    expect(isWeekend(date)).toBe(false);
  });
});

describe('edge cases and timezone handling', () => {
  it('should handle daylight saving time transitions', () => {
    // March DST transition in US (second Sunday in March)
    const beforeDST = new Date('2024-03-09T12:00:00');
    const afterDST = new Date('2024-03-11T12:00:00');
    const diff = diffInDays(afterDST, beforeDST);
    expect(diff).toBe(2);
  });

  it('should handle dates far in the past', () => {
    const date = new Date('1900-01-01');
    expect(toDateString(date)).toBe('1900-01-01');
  });

  it('should handle dates far in the future', () => {
    const date = new Date('2100-12-31');
    expect(toDateString(date)).toBe('2100-12-31');
  });

  it('should handle leap day calculations correctly', () => {
    const leapDay2024 = new Date('2024-02-29');
    const nextDay = addDays(leapDay2024, 1);
    expect(toDateString(nextDay)).toBe('2024-03-01');

    const prevDay = addDays(leapDay2024, -1);
    expect(toDateString(prevDay)).toBe('2024-02-28');
  });

  it('should handle century boundary correctly', () => {
    const date1999 = new Date('1999-12-31');
    const date2000 = addDays(date1999, 1);
    expect(toDateString(date2000)).toBe('2000-01-01');
  });

  it('should handle date ranges across multiple years', () => {
    const start = new Date('2023-12-01');
    const end = new Date('2024-01-31');
    const range = getDateRange(start, end);

    expect(range.length).toBeGreaterThan(60);
    expect(toDateString(range[0])).toBe('2023-12-01');
    expect(toDateString(range[range.length - 1])).toBe('2024-01-31');
  });
});
