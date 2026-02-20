/**
 * Offline Fallback Handler
 *
 * Phase 3: Local pattern matching for simple shift queries when offline.
 * Handles basic questions without requiring the Claude API backend.
 * Falls back gracefully when network is unavailable.
 */

import type { ShiftCycle } from '@/types';
import { calculateShiftDay, getNextOccurrence } from './shiftUtils';
import dayjs from 'dayjs';

export interface OfflineFallbackResult {
  /** Whether the query was handled offline */
  handled: boolean;
  /** Response text if handled */
  text?: string;
  /** Tool name that was simulated */
  toolName?: string;
}

/**
 * Attempt to answer a query locally without the backend.
 *
 * Supports:
 * - "What shift today/tomorrow?"
 * - "Am I working today/tomorrow?"
 * - "When is my next day off?"
 * - "When is my next night shift?"
 *
 * @param query - User's transcribed speech
 * @param shiftCycle - User's shift cycle
 * @param userName - User's name for personalized response
 * @returns Result indicating if query was handled and the response
 */
export function tryOfflineFallback(
  query: string,
  shiftCycle: ShiftCycle,
  userName: string
): OfflineFallbackResult {
  const normalized = query.toLowerCase().trim();

  // Am I working today? (check BEFORE generic today, since it's more specific)
  if (matchesAmIWorking(normalized)) {
    const today = new Date();
    const shift = calculateShiftDay(today, shiftCycle);
    const text = shift.isWorkDay
      ? `Yes, you're on a ${shift.shiftType} shift today.`
      : `No, today is your day off.`;
    return { handled: true, text, toolName: 'get_current_status' };
  }

  // Today's shift
  if (matchesToday(normalized)) {
    const today = new Date();
    const shift = calculateShiftDay(today, shiftCycle);
    const text = shift.isWorkDay
      ? `You have a ${shift.shiftType} shift today, ${userName}.`
      : `You have the day off today, ${userName}! Rest and recharge.`;
    return { handled: true, text, toolName: 'get_current_status' };
  }

  // Tomorrow's shift
  if (matchesTomorrow(normalized)) {
    const tomorrow = dayjs().add(1, 'day').toDate();
    const shift = calculateShiftDay(tomorrow, shiftCycle);
    const dateStr = dayjs(tomorrow).format('dddd, MMMM D');
    const text = shift.isWorkDay
      ? `Tomorrow (${dateStr}) you have a ${shift.shiftType} shift.`
      : `Tomorrow (${dateStr}) is your day off!`;
    return { handled: true, text, toolName: 'get_shift_for_date' };
  }

  // Next day off
  if (matchesNextDayOff(normalized)) {
    const result = getNextOccurrence(new Date(), 'off', shiftCycle, 60);
    if (result) {
      const dateStr = dayjs(result.date).format('dddd, MMMM D');
      return {
        handled: true,
        text: `Your next day off is ${dateStr}.`,
        toolName: 'get_next_occurrence',
      };
    }
  }

  // Next night shift
  if (matchesNextNightShift(normalized)) {
    const result = getNextOccurrence(new Date(), 'night', shiftCycle, 60);
    if (result) {
      const dateStr = dayjs(result.date).format('dddd, MMMM D');
      return {
        handled: true,
        text: `Your next night shift is ${dateStr}.`,
        toolName: 'get_next_occurrence',
      };
    }
  }

  // Not handled — needs backend
  return { handled: false };
}

// ── Pattern matchers ──────────────────────────────────────────────

function matchesToday(q: string): boolean {
  return (
    /\b(today|tonight)\b/.test(q) &&
    /\b(shift|work|schedule)\b/.test(q) &&
    !/\b(tomorrow|next|week|month)\b/.test(q)
  );
}

function matchesTomorrow(q: string): boolean {
  return /\btomorrow\b/.test(q) && /\b(shift|work|schedule)\b/.test(q);
}

function matchesAmIWorking(q: string): boolean {
  return /\b(am i|do i)\b/.test(q) && /\b(work|working|on)\b/.test(q) && /\btoday\b/.test(q);
}

function matchesNextDayOff(q: string): boolean {
  return /\bnext\b/.test(q) && /\b(day off|off day|rest day|free day)\b/.test(q);
}

function matchesNextNightShift(q: string): boolean {
  return /\bnext\b/.test(q) && /\bnight\s*(shift)?\b/.test(q);
}
