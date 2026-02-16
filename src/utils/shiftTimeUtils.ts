/**
 * Shift Time Utilities
 *
 * Helper functions for converting, calculating, and validating shift times
 * used in the Premium Shift Time Input screen.
 */

import type { OnboardingData } from '@/contexts/OnboardingContext';

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
 * Detect shift type based on start time and shift system
 *
 * 2-Shift System:
 * - Day shift: 6:00 AM to 5:59 PM
 * - Night shift: 6:00 PM to 5:59 AM
 *
 * 3-Shift System:
 * - Morning shift: 6:00 AM to 1:59 PM
 * - Afternoon shift: 2:00 PM to 9:59 PM
 * - Night shift: 10:00 PM to 5:59 AM
 *
 * @param startTime24h - Start time in HH:MM format (24-hour)
 * @param shiftSystem - The shift system being used ('2-shift' or '3-shift')
 * @returns Shift type: 'day' | 'night' | 'morning' | 'afternoon'
 */
export function detectShiftType(
  startTime24h: string,
  shiftSystem: '2-shift' | '3-shift' = '2-shift'
): 'day' | 'night' | 'morning' | 'afternoon' {
  const [hours] = startTime24h.split(':').map(Number);

  if (shiftSystem === '2-shift') {
    // 2-shift system: Day (6 AM - 6 PM) or Night (6 PM - 6 AM)
    return hours >= 6 && hours < 18 ? 'day' : 'night';
  }
  // 3-shift system: Morning, Afternoon, or Night
  if (hours >= 6 && hours < 14) {
    return 'morning'; // 6 AM - 2 PM
  } else if (hours >= 14 && hours < 22) {
    return 'afternoon'; // 2 PM - 10 PM
  }
  return 'night'; // 10 PM - 6 AM
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

/**
 * Determine which shift types are required based on the shift pattern and system
 *
 * For 2-shift systems (12-hour):
 * - Checks if pattern includes day shifts (daysOn > 0)
 * - Checks if pattern includes night shifts (nightsOn > 0)
 *
 * For 3-shift systems (8-hour):
 * - Checks if pattern includes morning shifts (morningOn > 0)
 * - Checks if pattern includes afternoon shifts (afternoonOn > 0)
 * - Checks if pattern includes night shifts (nightOn > 0)
 *
 * @param shiftSystem - The shift system ('2-shift' or '3-shift')
 * @param customPattern - Custom pattern configuration if applicable
 * @returns Array of required shift types
 */
export function getRequiredShiftTypes(
  shiftSystem: '2-shift' | '3-shift',
  customPattern?: {
    daysOn: number;
    nightsOn: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  }
): Array<'day' | 'night' | 'morning' | 'afternoon'> {
  if (!customPattern) {
    // Standard patterns: require all shift types for the system
    // Standard 2-shift patterns (4-4-4, 7-7-7, etc.) have both day and night shifts
    // Standard 3-shift patterns have morning, afternoon, and night shifts
    return shiftSystem === '2-shift' ? ['day', 'night'] : ['morning', 'afternoon', 'night'];
  }

  if (shiftSystem === '2-shift') {
    const required: Array<'day' | 'night'> = [];

    if (customPattern.daysOn > 0) {
      required.push('day');
    }
    if (customPattern.nightsOn > 0) {
      required.push('night');
    }

    // If pattern has no working shifts (edge case), require at least day shift
    if (required.length === 0) {
      required.push('day');
    }

    return required;
  }

  // 3-shift system
  const required: Array<'morning' | 'afternoon' | 'night'> = [];

  if ((customPattern.morningOn ?? 0) > 0) {
    required.push('morning');
  }
  if ((customPattern.afternoonOn ?? 0) > 0) {
    required.push('afternoon');
  }
  if ((customPattern.nightOn ?? 0) > 0) {
    required.push('night');
  }

  // If pattern has no working shifts (edge case), require at least morning shift
  if (required.length === 0) {
    required.push('morning');
  }

  return required;
}

/**
 * Get shift times from onboarding data, preferring new structure
 *
 * @param data - OnboardingData
 * @returns Array of shift time entries
 */
export function getShiftTimesFromData(data: OnboardingData): Array<{
  type: 'day' | 'night' | 'morning' | 'afternoon';
  startTime: string;
  endTime: string;
  duration: 8 | 12;
}> {
  const result: Array<{
    type: 'day' | 'night' | 'morning' | 'afternoon';
    startTime: string;
    endTime: string;
    duration: 8 | 12;
  }> = [];

  // Prefer new structure
  if (data.shiftTimes) {
    if (data.shiftTimes.dayShift) {
      result.push({ type: 'day', ...data.shiftTimes.dayShift });
    }
    if (data.shiftTimes.nightShift) {
      result.push({ type: 'night', ...data.shiftTimes.nightShift });
    }
    if (data.shiftTimes.morningShift) {
      result.push({ type: 'morning', ...data.shiftTimes.morningShift });
    }
    if (data.shiftTimes.afternoonShift) {
      result.push({ type: 'afternoon', ...data.shiftTimes.afternoonShift });
    }
    if (data.shiftTimes.nightShift3) {
      result.push({ type: 'night', ...data.shiftTimes.nightShift3 });
    }
  } else if (data.shiftStartTime && data.shiftEndTime && data.shiftDuration && data.shiftType) {
    // Fallback to legacy structure
    result.push({
      type: data.shiftType,
      startTime: data.shiftStartTime,
      endTime: data.shiftEndTime,
      duration: data.shiftDuration,
    });
  }

  return result;
}
