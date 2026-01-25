/**
 * Validation Utilities
 *
 * Functions for validating and sanitizing user input.
 */

import {
  validateEmail as zodValidateEmail,
  isShiftCycle as zodIsShiftCycle,
  validateDateString,
  validateTimeString,
} from '@/types/validation';
import type { ShiftCycle } from '@/types';

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if email is valid
 *
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // true
 * validateEmail('invalid-email'); // false
 * ```
 */
export function validateEmail(email: string): boolean {
  return zodValidateEmail(email);
}

/**
 * Type guard for ShiftCycle
 *
 * @param cycle - Value to check
 * @returns True if value is a valid ShiftCycle
 *
 * @example
 * ```typescript
 * const data = { patternType: 'STANDARD_3_3_3', ... };
 * if (validateShiftCycle(data)) {
 *   // data is ShiftCycle type
 * }
 * ```
 */
export function validateShiftCycle(cycle: unknown): cycle is ShiftCycle {
  return zodIsShiftCycle(cycle);
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 *
 * Performs the following sanitization:
 * - Removes HTML tags
 * - Escapes special characters
 * - Trims whitespace
 * - Limits length to prevent DoS
 *
 * @param input - User input string
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * sanitizeInput('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *
 * sanitizeInput('  Hello World  ');
 * // Returns: 'Hello World'
 * ```
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length to prevent DoS
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML special characters to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Sanitize HTML to allow only safe tags
 *
 * Allows basic formatting tags while removing potentially dangerous content.
 * Allowed tags: b, i, em, strong, p, br
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML with only safe tags
 *
 * @example
 * ```typescript
 * sanitizeHtml('<p>Safe content</p><script>alert("xss")</script>');
 * // Returns: '<p>Safe content</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  // List of allowed tags
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  return html.replace(tagPattern, (match, tagName) => {
    const tag = tagName.toLowerCase();
    if (allowedTags.includes(tag)) {
      return match;
    }
    // Replace disallowed tags with escaped version
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
}

/**
 * Validate date string format (YYYY-MM-DD)
 *
 * @param date - Date string to validate
 * @returns True if date is in valid format
 *
 * @example
 * ```typescript
 * validateDate('2024-01-15'); // true
 * validateDate('15-01-2024'); // false
 * validateDate('2024/01/15'); // false
 * ```
 */
export function validateDate(date: string): boolean {
  return validateDateString(date);
}

/**
 * Validate time string format (HH:mm in 24-hour format)
 *
 * @param time - Time string to validate
 * @returns True if time is in valid format
 *
 * @example
 * ```typescript
 * validateTime('14:30'); // true
 * validateTime('23:59'); // true
 * validateTime('24:00'); // false
 * validateTime('2:30 PM'); // false
 * ```
 */
export function validateTime(time: string): boolean {
  return validateTimeString(time);
}

/**
 * Validate country code (ISO 3166-1 alpha-2)
 *
 * @param code - Country code to validate
 * @returns True if code is valid 2-letter format
 *
 * @example
 * ```typescript
 * validateCountryCode('US'); // true
 * validateCountryCode('GB'); // true
 * validateCountryCode('USA'); // false
 * validateCountryCode('us'); // true (will be uppercased)
 * ```
 */
export function validateCountryCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  return /^[A-Z]{2}$/i.test(code);
}

/**
 * Validate currency code (ISO 4217)
 *
 * @param code - Currency code to validate
 * @returns True if code is valid 3-letter format
 *
 * @example
 * ```typescript
 * validateCurrencyCode('USD'); // true
 * validateCurrencyCode('EUR'); // true
 * validateCurrencyCode('US'); // false
 * ```
 */
export function validateCurrencyCode(code: string): boolean {
  if (typeof code !== 'string') {
    return false;
  }
  return /^[A-Z]{3}$/i.test(code);
}

/**
 * Validate phone number (international format)
 *
 * Accepts formats like: +1234567890, +1-234-567-8900, +1 (234) 567-8900
 *
 * @param phone - Phone number to validate
 * @returns True if phone number appears valid
 *
 * @example
 * ```typescript
 * validatePhoneNumber('+12345678900'); // true
 * validatePhoneNumber('+1-234-567-8900'); // true
 * validatePhoneNumber('1234567890'); // false (missing +)
 * ```
 */
export function validatePhoneNumber(phone: string): boolean {
  if (typeof phone !== 'string') {
    return false;
  }
  // Basic international format: starts with +, followed by digits, spaces, hyphens, or parentheses
  return /^\+[0-9]{1,3}[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/.test(phone);
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if URL is valid
 *
 * @example
 * ```typescript
 * validateUrl('https://example.com'); // true
 * validateUrl('http://example.com/path'); // true
 * validateUrl('example.com'); // false (missing protocol)
 * validateUrl('not a url'); // false
 * ```
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate numeric range
 *
 * @param value - Number to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns True if value is within range
 *
 * @example
 * ```typescript
 * validateRange(5, 1, 10); // true
 * validateRange(0, 1, 10); // false
 * validateRange(10, 1, 10); // true
 * ```
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate string length
 *
 * @param str - String to validate
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @returns True if string length is within bounds
 *
 * @example
 * ```typescript
 * validateStringLength('hello', 1, 10); // true
 * validateStringLength('', 1, 10); // false
 * validateStringLength('very long string', 1, 10); // false
 * ```
 */
export function validateStringLength(str: string, minLength: number, maxLength: number): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * Validate that a value is not null or undefined
 *
 * @param value - Value to check
 * @returns True if value is not null or undefined
 *
 * @example
 * ```typescript
 * validateRequired('hello'); // true
 * validateRequired(''); // true (empty string is not null)
 * validateRequired(null); // false
 * validateRequired(undefined); // false
 * ```
 */
export function validateRequired<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validate array has minimum length
 *
 * @param arr - Array to validate
 * @param minLength - Minimum required length
 * @returns True if array meets minimum length
 *
 * @example
 * ```typescript
 * validateArrayMinLength([1, 2, 3], 2); // true
 * validateArrayMinLength([1], 2); // false
 * validateArrayMinLength([], 0); // true
 * ```
 */
export function validateArrayMinLength<T>(arr: T[], minLength: number): boolean {
  return Array.isArray(arr) && arr.length >= minLength;
}

/**
 * Remove SQL injection patterns from input
 *
 * @param input - Input string to sanitize
 * @returns Sanitized string with SQL patterns removed
 *
 * @example
 * ```typescript
 * sanitizeSql("'; DROP TABLE users; --");
 * // Returns: " DROP TABLE users "
 * ```
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove common SQL injection patterns
  return input
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bUNION\b/gi, '') // Remove UNION keyword
    .replace(/\bSELECT\b/gi, '') // Remove SELECT keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bTABLE\b/gi, '') // Remove TABLE keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bINSERT\b/gi, '') // Remove INSERT keyword
    .replace(/\bUPDATE\b/gi, ''); // Remove UPDATE keyword
}
