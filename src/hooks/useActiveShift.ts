/**
 * useActiveShift Hook
 *
 * Encapsulates all time-aware shift status logic:
 * - Determines the "effective" shift (handles overnight carry-over)
 * - Tracks whether the user is currently on shift
 * - Provides time display and countdown text
 * - Recalculates every 60 seconds via a live tick
 *
 * Supports both 2-shift (day/night 12h) and 3-shift
 * (morning/afternoon/night 8h) systems.
 */

import { useMemo } from 'react';
import { calculateShiftDay } from '@/utils/shiftUtils';
import { getToday, addDays } from '@/utils/dateUtils';
import { formatTimeForDisplay, getShiftTimesFromData } from '@/utils/shiftTimeUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { ShiftCycle, ShiftType } from '@/types';

// ── Types ────────────────────────────────────────────────────────────

export interface ActiveShiftResult {
  /** The shift type currently in effect (may differ from calendar during overnight carry-over) */
  shiftType: ShiftType;
  /** The scheduled shift type for today (from the calendar pattern) */
  scheduledShiftType: ShiftType;
  /** Whether this is a work day (true during overnight carry-over) */
  isWorkDay: boolean;
  /** Whether the user is currently within shift hours */
  isOnShift: boolean;
  /** Whether the effective shift differs from the scheduled shift (overnight carry-over active) */
  isOvernightCarryOver: boolean;
  /** Time range display, e.g. "6:00 PM - 6:00 AM" */
  timeDisplay: string;
  /** Countdown text, e.g. "4h 30m left in night shift" */
  countdown: string;
}

// ── Pure helpers (no React dependencies) ─────────────────────────────

/** Parse "HH:MM" into total minutes since midnight */
function parseTimeToMinutes(time24h: string): number {
  const [h, m] = time24h.split(':').map(Number);
  return h * 60 + m;
}

/** Format a duration in minutes to "Xh Ym" display string */
function formatMinutesCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Human-readable display name for each shift type */
const SHIFT_DISPLAY_NAME: Record<ShiftType, string> = {
  day: 'day shift',
  night: 'night shift',
  morning: 'morning shift',
  afternoon: 'afternoon shift',
  off: 'day off',
};

/**
 * Find the shift time entry that matches a given shift type, respecting the
 * user's shift system.  For 'night' shifts this disambiguates between
 * 2-shift (`nightShift`, 12h) and 3-shift (`nightShift3`, 8h) entries.
 */
function findShiftTime(
  shiftTimes: Array<{ type: string; startTime: string; endTime: string; duration: number }>,
  shiftType: ShiftType,
  data: OnboardingData | null
) {
  const matches = shiftTimes.filter((st) => st.type === shiftType);
  if (matches.length <= 1) return matches[0] ?? null;

  // Multiple 'night' entries — pick based on shift system.
  const is3Shift = data?.shiftSystem === '3-shift';
  return matches.find((m) => (is3Shift ? m.duration === 8 : m.duration === 12)) ?? matches[0];
}

/**
 * Get the "effective" shift the user is currently in.
 *
 * After midnight the calendar date rolls over, but if yesterday's shift
 * was overnight (e.g. 18:00–06:00 or 22:00–06:00) and hasn't ended yet,
 * we keep showing that shift until it actually ends.
 */
function getEffectiveShift(
  todayShift: { shiftType: ShiftType; isWorkDay: boolean },
  yesterdayShift: { shiftType: ShiftType; isWorkDay: boolean } | null,
  data: OnboardingData | null
): { shiftType: ShiftType; isWorkDay: boolean; isOnShift: boolean } {
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const shiftTimes = data ? getShiftTimesFromData(data) : [];

  // 1. Check if yesterday's overnight shift is still running
  if (yesterdayShift && yesterdayShift.isWorkDay && yesterdayShift.shiftType !== 'off') {
    const yesterdayTime = findShiftTime(shiftTimes, yesterdayShift.shiftType, data);
    if (yesterdayTime) {
      const startMin = parseTimeToMinutes(yesterdayTime.startTime);
      const endMin = parseTimeToMinutes(yesterdayTime.endTime);

      // Overnight shift: end < start (e.g. 22:00–06:00 → 360 < 1320)
      if (endMin < startMin && nowMin < endMin) {
        return { shiftType: yesterdayShift.shiftType, isWorkDay: true, isOnShift: true };
      }
    }
  }

  // 2. Check if today's shift is currently active
  if (todayShift.isWorkDay && todayShift.shiftType !== 'off') {
    const todayTime = findShiftTime(shiftTimes, todayShift.shiftType, data);
    if (todayTime) {
      const startMin = parseTimeToMinutes(todayTime.startTime);
      const endMin = parseTimeToMinutes(todayTime.endTime);

      if (endMin > startMin) {
        // Same-day shift (e.g. 06:00–14:00, 14:00–22:00, 07:00–19:00)
        return { ...todayShift, isOnShift: nowMin >= startMin && nowMin < endMin };
      }
      // Overnight shift starting today (e.g. 22:00–06:00)
      return { ...todayShift, isOnShift: nowMin >= startMin };
    }
    // No time data → fall back to calendar-only
    return { ...todayShift, isOnShift: true };
  }

  // 3. Off day or no work
  return { ...todayShift, isOnShift: false };
}

/** Get time display string for the given shift type */
function getTimeDisplay(shiftType: ShiftType, data: OnboardingData): string {
  const shiftTimes = getShiftTimesFromData(data);
  const matching = findShiftTime(shiftTimes, shiftType, data);
  if (matching) {
    return `${formatTimeForDisplay(matching.startTime)} - ${formatTimeForDisplay(matching.endTime)}`;
  }
  return '';
}

/**
 * Calculate countdown text to the next shift event.
 * Time-aware: uses shift start/end times + current clock.
 */
function getCountdownText(
  currentShiftType: ShiftType,
  cycle: ShiftCycle,
  data: OnboardingData | null
): string {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentName = SHIFT_DISPLAY_NAME[currentShiftType];

  const shiftTimes = data ? getShiftTimesFromData(data) : [];
  const currentShiftTime = findShiftTime(shiftTimes, currentShiftType, data);

  // If currently on a work shift and we have time data, check time-of-day
  if (currentShiftType !== 'off' && currentShiftTime) {
    const startMin = parseTimeToMinutes(currentShiftTime.startTime);
    const endMin = parseTimeToMinutes(currentShiftTime.endTime);

    if (endMin > startMin) {
      // Same-day shift
      if (nowMinutes >= startMin && nowMinutes < endMin) {
        const display = formatMinutesCountdown(endMin - nowMinutes);
        return display ? `${display} left in ${currentName}` : '';
      } else if (nowMinutes < startMin) {
        const display = formatMinutesCountdown(startMin - nowMinutes);
        return display ? `${display} until ${currentName} starts` : '';
      }
    } else {
      // Overnight shift
      if (nowMinutes >= startMin) {
        const display = formatMinutesCountdown(24 * 60 - nowMinutes + endMin);
        return display ? `${display} left in ${currentName}` : '';
      } else if (nowMinutes < endMin) {
        const display = formatMinutesCountdown(endMin - nowMinutes);
        return display ? `${display} left in ${currentName}` : '';
      }
      if (nowMinutes >= endMin && nowMinutes < startMin) {
        const display = formatMinutesCountdown(startMin - nowMinutes);
        return display ? `${display} until ${currentName} starts` : '';
      }
    }
  }

  // Shift ended or off day → find the next work shift
  const today = getToday();
  let nextDate = addDays(today, 1);
  let daysUntil = 1;

  while (daysUntil < 30) {
    const nextShift = calculateShiftDay(nextDate, cycle);

    if (nextShift.isWorkDay) {
      const nextName = SHIFT_DISPLAY_NAME[nextShift.shiftType];
      const nextShiftTime = findShiftTime(shiftTimes, nextShift.shiftType, data);

      if (nextShiftTime) {
        const nextStartMin = parseTimeToMinutes(nextShiftTime.startTime);
        const minutesUntil = 24 * 60 - nowMinutes + (daysUntil - 1) * 24 * 60 + nextStartMin;
        const display = formatMinutesCountdown(minutesUntil);
        if (display) return `${display} until ${nextName}`;
      }

      if (daysUntil === 1) {
        return `${nextName[0].toUpperCase()}${nextName.slice(1)} tomorrow`;
      }
      return `${daysUntil} days until ${nextName}`;
    }

    nextDate = addDays(nextDate, 1);
    daysUntil++;
  }

  return '';
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Returns the user's current active shift status, recalculating every
 * 60 seconds.  Handles overnight carry-over for both 2-shift and 3-shift
 * systems.
 *
 * @param shiftCycle  The user's shift cycle configuration
 * @param userData    Full onboarding data (for shift times + shift system)
 * @param liveTick   A counter that increments every 60s to trigger recalc
 * @param dateStr    Current date string (triggers recalc on day change)
 */
export function useActiveShift(
  shiftCycle: ShiftCycle | null,
  userData: OnboardingData | null,
  liveTick: number,
  dateStr: string
): ActiveShiftResult | null {
  const todayShift = useMemo(
    () => (shiftCycle ? calculateShiftDay(getToday(), shiftCycle) : null),
    [shiftCycle, dateStr] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const yesterdayShift = useMemo(
    () => (shiftCycle ? calculateShiftDay(addDays(getToday(), -1), shiftCycle) : null),
    [shiftCycle, dateStr] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const effectiveShift = useMemo(() => {
    void liveTick;
    if (!todayShift) return null;
    return getEffectiveShift(todayShift, yesterdayShift, userData);
  }, [todayShift, yesterdayShift, userData, liveTick]);

  const timeDisplay = useMemo(
    () => (effectiveShift && userData ? getTimeDisplay(effectiveShift.shiftType, userData) : ''),
    [effectiveShift, userData]
  );

  const countdown = useMemo(() => {
    void liveTick;
    return effectiveShift && shiftCycle
      ? getCountdownText(effectiveShift.shiftType, shiftCycle, userData)
      : '';
  }, [effectiveShift, shiftCycle, userData, liveTick]);

  if (!effectiveShift || !todayShift) return null;

  const isOvernightCarryOver =
    effectiveShift.isOnShift && effectiveShift.shiftType !== todayShift.shiftType;

  return {
    shiftType: effectiveShift.shiftType,
    scheduledShiftType: todayShift.shiftType,
    isWorkDay: effectiveShift.isWorkDay,
    isOnShift: effectiveShift.isOnShift,
    isOvernightCarryOver,
    timeDisplay,
    countdown,
  };
}
