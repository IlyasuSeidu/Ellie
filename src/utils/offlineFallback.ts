/**
 * Universal offline fallback for common Ellie shift queries.
 */

import type { ShiftCycle, ShiftDay } from '@/types';
import { calculateShiftDay, getShiftDaysInRange, getShiftStatistics } from './shiftUtils';
import { addDays } from './dateUtils';
import { executeGetDaysUntilRest, executeGetDaysUntilWork } from './shiftQueryTools';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';

export interface OfflineFallbackResult {
  handled: boolean;
  text?: string;
  toolName?: string;
}

export type OfflineIntentGuess =
  | 'current_status'
  | 'tomorrow_shift'
  | 'next_day_off'
  | 'next_night_shift'
  | 'week_summary'
  | 'month_days_off'
  | 'month_night_shifts'
  | 'pattern_summary'
  | 'next_fly_out'
  | 'start_back'
  | 'current_block'
  | 'next_work_block'
  | 'next_rest_block'
  | 'days_until_work'
  | 'days_until_rest'
  | 'holiday_date'
  | 'calendar_date'
  | 'unknown';

export interface OfflineIntentClassification {
  language: SupportedLanguage;
  intent: OfflineIntentGuess;
}

function userFirstName(userName: string): string {
  return userName.trim().split(/\s+/)[0] || 'there';
}

function shiftName(day: ShiftDay): string {
  return day.universal?.definitionName ?? `${day.shiftType} shift`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function describeShift(day: ShiftDay, date: Date, userName: string): string {
  const name = userFirstName(userName);
  const label = shiftName(day);
  if (!day.isWorkDay) {
    return `${name}, ${formatDate(date)} is ${label}.`;
  }
  const time =
    day.universal?.startTime && day.universal?.endTime
      ? ` from ${day.universal.startTime} to ${day.universal.endTime}`
      : '';
  return `${name}, you have ${label}${time} on ${formatDate(date)}.`;
}

export function buildOfflineUnsupportedResponse(shiftCycle: ShiftCycle, userName: string): string {
  return `${userFirstName(userName)}, I can still answer basic schedule questions offline for ${shiftCycle.name}. Try asking about today, tomorrow, your next day off, or this month.`;
}

export function classifyOfflineIntent(query: string): OfflineIntentClassification {
  const text = query.trim().toLowerCase();
  const language = normalizeLanguage(undefined);

  if (!text) return { language, intent: 'unknown' };
  if (/\d{4}-\d{2}-\d{2}|christmas|new year|holiday/.test(text)) {
    return { language, intent: 'calendar_date' };
  }
  if (text.includes('tomorrow')) return { language, intent: 'tomorrow_shift' };
  if (text.includes('today') || text.includes('tonight') || text.includes('working now')) {
    return { language, intent: 'current_status' };
  }
  if (
    text.includes('next') &&
    (text.includes('day off') || text.includes('rest') || text.includes('free'))
  ) {
    return { language, intent: 'next_day_off' };
  }
  if (text.includes('next') && text.includes('night'))
    return { language, intent: 'next_night_shift' };
  if (text.includes('week')) return { language, intent: 'week_summary' };
  if (text.includes('month') && text.includes('night'))
    return { language, intent: 'month_night_shifts' };
  if (text.includes('month') && (text.includes('off') || text.includes('rest'))) {
    return { language, intent: 'month_days_off' };
  }
  if (text.includes('pattern') || text.includes('schedule'))
    return { language, intent: 'pattern_summary' };
  if (text.includes('until') && text.includes('work'))
    return { language, intent: 'days_until_work' };
  if (text.includes('until') && (text.includes('rest') || text.includes('off'))) {
    return { language, intent: 'days_until_rest' };
  }

  return { language, intent: 'unknown' };
}

function findNext(
  shiftCycle: ShiftCycle,
  predicate: (day: ShiftDay) => boolean
): { date: Date; day: ShiftDay; offset: number } | null {
  const today = new Date();
  for (let offset = 0; offset <= 730; offset += 1) {
    const date = addDays(today, offset);
    const day = calculateShiftDay(date, shiftCycle);
    if (predicate(day)) return { date, day, offset };
  }
  return null;
}

export function tryOfflineFallback(
  query: string,
  shiftCycle: ShiftCycle,
  userName: string
): OfflineFallbackResult {
  const { intent } = classifyOfflineIntent(query);
  const today = new Date();

  if (intent === 'current_status') {
    return {
      handled: true,
      toolName: 'get_current_status',
      text: describeShift(calculateShiftDay(today, shiftCycle), today, userName),
    };
  }

  if (intent === 'tomorrow_shift') {
    const tomorrow = addDays(today, 1);
    return {
      handled: true,
      toolName: 'get_shift_for_date',
      text: describeShift(calculateShiftDay(tomorrow, shiftCycle), tomorrow, userName),
    };
  }

  if (intent === 'next_day_off') {
    const next = findNext(shiftCycle, (day) => !day.isWorkDay);
    return next
      ? {
          handled: true,
          toolName: 'get_next_occurrence',
          text: `Your next day off is ${formatDate(next.date)} (${shiftName(next.day)}).`,
        }
      : {
          handled: true,
          toolName: 'get_next_occurrence',
          text: 'I could not find a day off in this schedule window.',
        };
  }

  if (intent === 'next_night_shift') {
    const next = findNext(
      shiftCycle,
      (day) => day.isNightShift || Boolean(day.universal?.countsAsNight)
    );
    return next
      ? {
          handled: true,
          toolName: 'get_next_occurrence',
          text: `Your next night shift is ${formatDate(next.date)} (${shiftName(next.day)}).`,
        }
      : {
          handled: true,
          toolName: 'get_next_occurrence',
          text: 'I could not find a night shift in this schedule window.',
        };
  }

  if (intent === 'week_summary') {
    const week = getShiftDaysInRange(today, addDays(today, 6), shiftCycle);
    const workDays = week.filter((day) => day.isWorkDay).length;
    return {
      handled: true,
      toolName: 'get_shifts_in_range',
      text: `This week has ${workDays} work day${workDays === 1 ? '' : 's'} and ${7 - workDays} day${7 - workDays === 1 ? '' : 's'} off.`,
    };
  }

  if (intent === 'month_days_off' || intent === 'month_night_shifts') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const stats = getShiftStatistics(start, end, shiftCycle);
    return {
      handled: true,
      toolName: 'get_statistics',
      text:
        intent === 'month_days_off'
          ? `This month has ${stats.daysOff} day${stats.daysOff === 1 ? '' : 's'} off.`
          : `This month has ${stats.nightShifts} night shift${stats.nightShifts === 1 ? '' : 's'}.`,
    };
  }

  if (intent === 'days_until_work') {
    const result = executeGetDaysUntilWork({}, shiftCycle);
    return {
      handled: true,
      toolName: 'days_until_work',
      text: result.found
        ? `You ${result.daysUntil === 0 ? 'are working today' : `work again in ${result.daysUntil} day${result.daysUntil === 1 ? '' : 's'}`}.`
        : 'I could not find your next work day in this schedule window.',
    };
  }

  if (intent === 'days_until_rest') {
    const result = executeGetDaysUntilRest({}, shiftCycle);
    return {
      handled: true,
      toolName: 'days_until_rest',
      text: result.found
        ? `You ${result.daysUntil === 0 ? 'are off today' : `are off again in ${result.daysUntil} day${result.daysUntil === 1 ? '' : 's'}`}.`
        : 'I could not find your next day off in this schedule window.',
    };
  }

  if (intent === 'pattern_summary') {
    const cycleDays = shiftCycle.sequence.length;
    const types = shiftCycle.shiftDefinitions.map((definition) => definition.name).join(', ');
    return {
      handled: true,
      toolName: 'get_statistics',
      text: `${shiftCycle.name} repeats every ${cycleDays} day${cycleDays === 1 ? '' : 's'} and includes ${types}.`,
    };
  }

  return { handled: false };
}
