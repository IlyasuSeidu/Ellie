/**
 * Validation Utilities Test Suite
 *
 * Comprehensive tests for validation and sanitization functions.
 */

import {
  validateEmail,
  validateShiftCycle,
  sanitizeInput,
  sanitizeHtml,
  validateDate,
  validateTime,
  validateCountryCode,
  validateCurrencyCode,
  validatePhoneNumber,
  validateUrl,
  validateRange,
  validateStringLength,
  validateRequired,
  validateArrayMinLength,
  sanitizeSql,
} from '@/utils/validationUtils';
import { ShiftPattern } from '@/types';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@example.com')).toBe(true);
    expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    expect(validateEmail('user_name@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user @example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should reject emails with multiple @ symbols', () => {
    expect(validateEmail('user@@example.com')).toBe(false);
    expect(validateEmail('user@example@com')).toBe(false);
  });
});

describe('validateShiftCycle', () => {
  it('should validate correct shift cycle', () => {
    const validCycle = {
      patternType: ShiftPattern.STANDARD_3_3_3,
      daysOn: 3,
      nightsOn: 3,
      daysOff: 3,
      startDate: '2024-01-01',
      phaseOffset: 0,
    };

    expect(validateShiftCycle(validCycle)).toBe(true);
  });

  it('should validate cycle with custom pattern', () => {
    const customCycle = {
      patternType: ShiftPattern.CUSTOM,
      daysOn: 0,
      nightsOn: 0,
      daysOff: 0,
      startDate: '2024-01-01',
      phaseOffset: 0,
      customPattern: [
        {
          date: '2024-01-01',
          isWorkDay: true,
          isNightShift: false,
          shiftType: 'day',
        },
      ],
    };

    expect(validateShiftCycle(customCycle)).toBe(true);
  });

  it('should reject invalid shift cycle', () => {
    expect(validateShiftCycle(null)).toBe(false);
    expect(validateShiftCycle(undefined)).toBe(false);
    expect(validateShiftCycle({})).toBe(false);
    expect(validateShiftCycle({ patternType: 'INVALID' })).toBe(false);
  });

  it('should reject cycle with invalid date format', () => {
    const invalid = {
      patternType: ShiftPattern.STANDARD_3_3_3,
      daysOn: 3,
      nightsOn: 3,
      daysOff: 3,
      startDate: '01-01-2024', // Wrong format
      phaseOffset: 0,
    };

    expect(validateShiftCycle(invalid)).toBe(false);
  });

  it('should reject cycle with negative values', () => {
    const invalid = {
      patternType: ShiftPattern.STANDARD_3_3_3,
      daysOn: -1,
      nightsOn: 3,
      daysOff: 3,
      startDate: '2024-01-01',
      phaseOffset: 0,
    };

    expect(validateShiftCycle(invalid)).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('should escape HTML special characters', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should escape all dangerous characters', () => {
    expect(sanitizeInput('& < > " \' /')).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  Hello World  ')).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('should limit length', () => {
    const longString = 'a'.repeat(2000);
    const result = sanitizeInput(longString);
    expect(result.length).toBe(1000);
  });

  it('should respect custom max length', () => {
    const input = 'a'.repeat(200);
    const result = sanitizeInput(input, 100);
    expect(result.length).toBe(100);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
    expect(sanitizeInput(undefined as unknown as string)).toBe('');
    expect(sanitizeInput(123 as unknown as string)).toBe('');
  });

  it('should handle normal text without modification', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeHtml', () => {
  it('should allow safe tags', () => {
    expect(sanitizeHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
    expect(sanitizeHtml('<strong>Bold</strong>')).toBe('<strong>Bold</strong>');
    expect(sanitizeHtml('<em>Italic</em>')).toBe('<em>Italic</em>');
  });

  it('should escape dangerous tags', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle mixed safe and dangerous tags', () => {
    const input = '<p>Safe</p><script>dangerous</script>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>Safe</p>');
    expect(result).not.toContain('<script>');
  });

  it('should handle self-closing br tags', () => {
    expect(sanitizeHtml('Line1<br>Line2')).toBe('Line1<br>Line2');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });
});

describe('validateDate', () => {
  it('should validate correct date format', () => {
    expect(validateDate('2024-01-15')).toBe(true);
    expect(validateDate('2024-12-31')).toBe(true);
    expect(validateDate('2000-01-01')).toBe(true);
  });

  it('should reject invalid date format', () => {
    expect(validateDate('01-15-2024')).toBe(false);
    expect(validateDate('15/01/2024')).toBe(false);
    expect(validateDate('2024/01/15')).toBe(false);
    expect(validateDate('2024-1-5')).toBe(false);
  });

  it('should reject invalid dates', () => {
    expect(validateDate('2024-13-01')).toBe(false); // Invalid month
    expect(validateDate('2024-01-32')).toBe(false); // Invalid day
    expect(validateDate('')).toBe(false);
  });
});

describe('validateTime', () => {
  it('should validate correct time format', () => {
    expect(validateTime('14:30')).toBe(true);
    expect(validateTime('00:00')).toBe(true);
    expect(validateTime('23:59')).toBe(true);
  });

  it('should reject invalid time format', () => {
    expect(validateTime('24:00')).toBe(false); // Invalid hour
    expect(validateTime('14:60')).toBe(false); // Invalid minute
    expect(validateTime('2:30')).toBe(false); // Missing leading zero
    expect(validateTime('14:5')).toBe(false); // Missing leading zero
    expect(validateTime('14:30:00')).toBe(false); // Includes seconds
  });

  it('should reject 12-hour format', () => {
    expect(validateTime('2:30 PM')).toBe(false);
    expect(validateTime('02:30 PM')).toBe(false);
  });
});

describe('validateCountryCode', () => {
  it('should validate correct country codes', () => {
    expect(validateCountryCode('US')).toBe(true);
    expect(validateCountryCode('GB')).toBe(true);
    expect(validateCountryCode('FR')).toBe(true);
    expect(validateCountryCode('us')).toBe(true); // Case insensitive
  });

  it('should reject invalid country codes', () => {
    expect(validateCountryCode('USA')).toBe(false); // Too long
    expect(validateCountryCode('U')).toBe(false); // Too short
    expect(validateCountryCode('12')).toBe(false); // Numbers
    expect(validateCountryCode('')).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(validateCountryCode(null as unknown as string)).toBe(false);
    expect(validateCountryCode(undefined as unknown as string)).toBe(false);
  });
});

describe('validateCurrencyCode', () => {
  it('should validate correct currency codes', () => {
    expect(validateCurrencyCode('USD')).toBe(true);
    expect(validateCurrencyCode('EUR')).toBe(true);
    expect(validateCurrencyCode('GBP')).toBe(true);
    expect(validateCurrencyCode('usd')).toBe(true); // Case insensitive
  });

  it('should reject invalid currency codes', () => {
    expect(validateCurrencyCode('US')).toBe(false); // Too short
    expect(validateCurrencyCode('USDD')).toBe(false); // Too long
    expect(validateCurrencyCode('123')).toBe(false); // Numbers
    expect(validateCurrencyCode('')).toBe(false);
  });
});

describe('validatePhoneNumber', () => {
  it('should validate international phone numbers', () => {
    expect(validatePhoneNumber('+12345678900')).toBe(true);
    expect(validatePhoneNumber('+1-234-567-8900')).toBe(true);
    expect(validatePhoneNumber('+1 (234) 567-8900')).toBe(true);
    expect(validatePhoneNumber('+44 20 7123 4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhoneNumber('1234567890')).toBe(false); // Missing +
    expect(validatePhoneNumber('123')).toBe(false); // Too short
    expect(validatePhoneNumber('')).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(validatePhoneNumber(null as unknown as string)).toBe(false);
    expect(validatePhoneNumber(undefined as unknown as string)).toBe(false);
  });
});

describe('validateUrl', () => {
  it('should validate correct URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://example.com')).toBe(true);
    expect(validateUrl('https://example.com/path')).toBe(true);
    expect(validateUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('example.com')).toBe(false); // Missing protocol
    expect(validateUrl('ftp://example.com')).toBe(false); // Wrong protocol
    expect(validateUrl('not a url')).toBe(false);
    expect(validateUrl('')).toBe(false);
  });

  it('should reject non-string input', () => {
    expect(validateUrl(null as unknown as string)).toBe(false);
    expect(validateUrl(undefined as unknown as string)).toBe(false);
  });
});

describe('validateRange', () => {
  it('should validate numbers in range', () => {
    expect(validateRange(5, 1, 10)).toBe(true);
    expect(validateRange(1, 1, 10)).toBe(true); // Min boundary
    expect(validateRange(10, 1, 10)).toBe(true); // Max boundary
  });

  it('should reject numbers outside range', () => {
    expect(validateRange(0, 1, 10)).toBe(false);
    expect(validateRange(11, 1, 10)).toBe(false);
    expect(validateRange(-5, 1, 10)).toBe(false);
  });

  it('should reject non-numeric values', () => {
    expect(validateRange(NaN, 1, 10)).toBe(false);
    expect(validateRange('5' as unknown as number, 1, 10)).toBe(false);
  });

  it('should handle negative ranges', () => {
    expect(validateRange(-5, -10, -1)).toBe(true);
    expect(validateRange(0, -10, 10)).toBe(true);
  });
});

describe('validateStringLength', () => {
  it('should validate strings within length bounds', () => {
    expect(validateStringLength('hello', 1, 10)).toBe(true);
    expect(validateStringLength('a', 1, 10)).toBe(true); // Min
    expect(validateStringLength('abcdefghij', 1, 10)).toBe(true); // Max
  });

  it('should reject strings outside length bounds', () => {
    expect(validateStringLength('', 1, 10)).toBe(false); // Too short
    expect(validateStringLength('abcdefghijk', 1, 10)).toBe(false); // Too long
  });

  it('should reject non-string input', () => {
    expect(validateStringLength(null as unknown as string, 1, 10)).toBe(false);
    expect(validateStringLength(123 as unknown as string, 1, 10)).toBe(false);
  });

  it('should handle exact length requirements', () => {
    expect(validateStringLength('test', 4, 4)).toBe(true);
    expect(validateStringLength('test', 3, 4)).toBe(true);
    expect(validateStringLength('test', 4, 5)).toBe(true);
  });
});

describe('validateRequired', () => {
  it('should return true for non-null/undefined values', () => {
    expect(validateRequired('hello')).toBe(true);
    expect(validateRequired(0)).toBe(true);
    expect(validateRequired(false)).toBe(true);
    expect(validateRequired('')).toBe(true); // Empty string is not null
    expect(validateRequired([])).toBe(true);
    expect(validateRequired({})).toBe(true);
  });

  it('should return false for null or undefined', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
  });
});

describe('validateArrayMinLength', () => {
  it('should validate arrays meeting minimum length', () => {
    expect(validateArrayMinLength([1, 2, 3], 2)).toBe(true);
    expect(validateArrayMinLength([1, 2], 2)).toBe(true); // Exact
    expect(validateArrayMinLength([], 0)).toBe(true);
  });

  it('should reject arrays below minimum length', () => {
    expect(validateArrayMinLength([1], 2)).toBe(false);
    expect(validateArrayMinLength([], 1)).toBe(false);
  });

  it('should reject non-array input', () => {
    expect(validateArrayMinLength(null as unknown as unknown[], 1)).toBe(false);
    expect(validateArrayMinLength('not array' as unknown as unknown[], 1)).toBe(false);
  });
});

describe('sanitizeSql', () => {
  it('should remove SQL injection patterns', () => {
    const input = "'; DROP TABLE users; --";
    const result = sanitizeSql(input);
    expect(result).not.toContain("'");
    expect(result).not.toContain(';');
    expect(result).not.toContain('--');
    expect(result).not.toContain('DROP');
  });

  it('should remove SQL keywords', () => {
    expect(sanitizeSql('SELECT * FROM users')).not.toContain('SELECT');
    expect(sanitizeSql('DELETE FROM users')).not.toContain('DELETE');
    expect(sanitizeSql('INSERT INTO users')).not.toContain('INSERT');
    expect(sanitizeSql('UPDATE users SET')).not.toContain('UPDATE');
  });

  it('should remove UNION attacks', () => {
    const input = "' UNION SELECT password FROM users --";
    const result = sanitizeSql(input);
    expect(result).not.toContain('UNION');
    expect(result).not.toContain('SELECT');
  });

  it('should remove OR/AND conditions', () => {
    const input = "admin' OR '1'='1";
    const result = sanitizeSql(input);
    expect(result).not.toContain('OR');
  });

  it('should remove comment patterns', () => {
    const input = 'test -- comment';
    const result = sanitizeSql(input);
    expect(result).not.toContain('--');
  });

  it('should remove multi-line comments', () => {
    const input = 'test /* comment */ more';
    const result = sanitizeSql(input);
    expect(result).not.toContain('/*');
    expect(result).not.toContain('*/');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeSql(null as unknown as string)).toBe('');
    expect(sanitizeSql(undefined as unknown as string)).toBe('');
  });

  it('should handle case-insensitive SQL keywords', () => {
    expect(sanitizeSql('select')).not.toContain('select');
    expect(sanitizeSql('SELECT')).not.toContain('SELECT');
    expect(sanitizeSql('SeLeCt')).not.toContain('SeLeCt');
  });
});

describe('combined validation scenarios', () => {
  it('should handle complex user registration data', () => {
    const email = 'user@example.com';
    const name = sanitizeInput('  John Doe  ');
    const country = 'US';

    expect(validateEmail(email)).toBe(true);
    expect(name).toBe('John Doe');
    expect(validateCountryCode(country)).toBe(true);
  });

  it('should sanitize and validate dangerous input', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized.length).toBeGreaterThan(0);
  });

  it('should handle SQL injection attempts', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const cleaned = sanitizeSql(sqlInjection);

    expect(cleaned).not.toContain('DROP');
    expect(cleaned).not.toContain('TABLE');
  });
});
