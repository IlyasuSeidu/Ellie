/**
 * Shift Time Utilities
 *
 * Helper functions for converting, calculating, and validating shift times
 * used in the Premium Shift Time Input screen.
 */

/**
 * Convert 12-hour time format to 24-hour format
 * @param time - Time in HH:MM format (12-hour)
 * @param period - AM or PM
 * @returns Time in HH:MM format (24-hour)
 */
export function convertTo24Hour(time: string, period: 'AM' | 'PM'): string {
  const [hoursStr, minutes] = time.split(':');
  let hours = parseInt(hoursStr, 10);

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Convert 24-hour time format to 12-hour format
 * @param time24h - Time in HH:MM format (24-hour)
 * @returns Object with time (HH:MM) and period (AM/PM)
 */
export function convertTo12Hour(time24h: string): { time: string; period: 'AM' | 'PM' } {
  const [hoursStr, minutes] = time24h.split(':');
  let hours = parseInt(hoursStr, 10);
  const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  return {
    time: `${hours.toString().padStart(2, '0')}:${minutes}`,
    period,
  };
}

/**
 * Calculate shift end time based on start time and duration
 * Handles overnight shifts that cross midnight
 * @param startTime24h - Start time in HH:MM format (24-hour)
 * @param duration - Shift duration in hours
 * @returns End time in HH:MM format (24-hour)
 */
export function calculateEndTime(startTime24h: string, duration: number): string {
  const [hours, minutes] = startTime24h.split(':').map(Number);
  const startDate = new Date(2000, 0, 1, hours, minutes);
  const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

  const endHours = endDate.getHours().toString().padStart(2, '0');
  const endMinutes = endDate.getMinutes().toString().padStart(2, '0');

  return `${endHours}:${endMinutes}`;
}

/**
 * Detect whether a shift is day or night based on start time
 * Day shift: 6:00 AM to 5:59 PM
 * Night shift: 6:00 PM to 5:59 AM
 * @param startTime24h - Start time in HH:MM format (24-hour)
 * @returns 'day' or 'night'
 */
export function detectShiftType(startTime24h: string): 'day' | 'night' {
  const [hours] = startTime24h.split(':').map(Number);
  return hours >= 6 && hours < 18 ? 'day' : 'night';
}

/**
 * Validate time format (HH:MM)
 * @param time - Time string to validate
 * @returns true if valid format, false otherwise
 */
export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-2]?[0-9]):([0-5][0-9])$/;
  if (!timeRegex.test(time)) {
    return false;
  }

  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Format time for display (12-hour format with AM/PM)
 * @param time24h - Time in HH:MM format (24-hour)
 * @returns Formatted time string (e.g., "6:00 AM")
 */
export function formatTimeForDisplay(time24h: string): string {
  const { time, period } = convertTo12Hour(time24h);
  // Remove leading zero from hours
  const [hours, minutes] = time.split(':');
  const displayHours = hours.startsWith('0') ? hours.slice(1) : hours;
  return `${displayHours}:${minutes} ${period}`;
}

/**
 * Parse time input and extract hours and minutes
 * @param input - Time input string
 * @returns Object with hours and minutes, or null if invalid
 */
export function parseTimeInput(input: string): { hours: string; minutes: string } | null {
  const cleaned = input.replace(/[^\d:]/g, '');
  const parts = cleaned.split(':');

  if (parts.length !== 2) {
    return null;
  }

  const [hours, minutes] = parts;

  if (hours.length > 2 || minutes.length > 2) {
    return null;
  }

  return { hours, minutes };
}
