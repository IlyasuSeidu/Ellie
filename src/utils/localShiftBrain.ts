/**
 * Local Shift Brain for Ryvro voice schedule questions.
 *
 * This is the primary deterministic schedule-answer engine. It uses the saved
 * repeating shift schedule on the device before the backend is needed.
 */

import type { ShiftCycle, ShiftDay } from '@/types';
import { calculateShiftDay, getShiftDaysInRange, getShiftStatistics } from './shiftUtils';
import { addDays } from './dateUtils';
import {
  executeGetCurrentBlockInfo,
  executeGetDaysUntilRest,
  executeGetDaysUntilWork,
  executeGetNextRestBlock,
  executeGetNextWorkBlock,
} from './shiftQueryTools';
import { formatTimeForDisplay } from './shiftTimeUtils';
import { normalizeLanguage, type SupportedLanguage } from '@/i18n/languageDetector';

export interface LocalShiftBrainResult {
  handled: boolean;
  text?: string;
  toolName?: string;
  data?: unknown;
}

type DateResolution =
  | { kind: 'exact'; date: Date }
  | { kind: 'range'; startDate: Date; endDate: Date }
  | { kind: 'multiple'; dates: Date[] };

export type LocalShiftBrainIntentGuess =
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

export interface LocalShiftBrainIntentClassification {
  language: SupportedLanguage;
  intent: LocalShiftBrainIntentGuess;
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

function formatDateWithYear(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const WEEKDAY_INDEX_BY_NAME: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTH_INDEX_BY_NAME: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const NUMBER_BY_WORD: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const ORDINAL_INDEX_BY_WORD: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

function buildLocalDate(year: number, monthIndex: number, day: number): Date | null {
  const parsed = new Date(year, monthIndex, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function dateFromCalendarKey(date: string | undefined): Date | null {
  if (!date) return null;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return buildLocalDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toCalendarKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextWeekdayDate(targetWeekday: number, today: Date): Date {
  const offset = (targetWeekday - today.getDay() + 7) % 7;
  return addDays(today, offset);
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfEndOfMonthWindow(date: Date): Date {
  return addDays(endOfMonth(date), -6);
}

function parseSmallNumber(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  return NUMBER_BY_WORD[value] ?? null;
}

function buildDateResolution(query: string, today: Date = new Date()): DateResolution | null {
  const text = query.trim().toLowerCase();
  if (!text) return null;

  const weekdayAlternation = Object.keys(WEEKDAY_INDEX_BY_NAME).join('|');
  const numberAlternation = `\\d+|${Object.keys(NUMBER_BY_WORD).join('|')}`;
  const ordinal = '(?:st|nd|rd|th)?';
  const monthAlternation = Object.keys(MONTH_INDEX_BY_NAME).join('|');

  const resolveRangeMonth = (monthText: string | undefined): number => {
    if (!monthText || monthText === 'this month') return today.getMonth();
    if (monthText === 'next month') return today.getMonth() + 1;
    return MONTH_INDEX_BY_NAME[monthText] ?? today.getMonth();
  };

  const buildDayRange = (
    rawStartDay: string | undefined,
    rawEndDay: string | undefined,
    rawMonth: string | undefined,
    rawYear: string | undefined,
    rawEndMonth?: string | undefined
  ): DateResolution | null => {
    if (!rawStartDay || !rawEndDay) return null;
    const startDay = Number(rawStartDay);
    const endDay = Number(rawEndDay);
    if (!Number.isInteger(startDay) || !Number.isInteger(endDay)) return null;

    const startMonthIndex = resolveRangeMonth(rawMonth);
    const endMonthIndex = resolveRangeMonth(rawEndMonth ?? rawMonth);
    const startMonthYearOffset = Math.floor(startMonthIndex / 12);
    const endMonthYearOffset = Math.floor(endMonthIndex / 12);
    const normalizedStartMonth = ((startMonthIndex % 12) + 12) % 12;
    const normalizedEndMonth = ((endMonthIndex % 12) + 12) % 12;
    const baseYear = rawYear ? Number(rawYear) : today.getFullYear();
    const startDate = buildLocalDate(
      baseYear + startMonthYearOffset,
      normalizedStartMonth,
      startDay
    );
    const endDate = buildLocalDate(baseYear + endMonthYearOffset, normalizedEndMonth, endDay);
    if (!startDate || !endDate || endDate < startDate) return null;
    return { kind: 'range', startDate, endDate };
  };

  const buildExactDateRange = (rawStart: string | undefined, rawEnd: string | undefined) => {
    const startDate = resolveCalendarDateFromQuery(rawStart ?? '', today);
    const endDate = resolveCalendarDateFromQuery(rawEnd ?? '', today);
    if (!startDate || !endDate || endDate < startDate) return null;
    return { kind: 'range' as const, startDate, endDate };
  };

  const nextNDays = text.match(new RegExp(`\\bnext\\s+(${numberAlternation})\\s+days?\\b`));
  if (nextNDays) {
    const days = parseSmallNumber(nextNDays[1]);
    if (days) {
      return { kind: 'range', startDate: today, endDate: addDays(today, days - 1) };
    }
  }

  if (
    /\b(?:from\s+)?(?:today|now)\s+(?:through|to|until|till)\s+(?:the\s+)?end\s+of\s+(?:the\s+)?month\b/.test(
      text
    )
  ) {
    return { kind: 'range', startDate: today, endDate: endOfMonth(today) };
  }

  if (/\bend\s+of\s+next\s+month\b/.test(text)) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return {
      kind: 'range',
      startDate: startOfEndOfMonthWindow(nextMonth),
      endDate: endOfMonth(nextMonth),
    };
  }

  if (/\bend\s+of\s+(?:the\s+)?month\b/.test(text)) {
    return {
      kind: 'range',
      startDate: startOfEndOfMonthWindow(today),
      endDate: endOfMonth(today),
    };
  }

  const nextNWeeks = text.match(new RegExp(`\\bnext\\s+(${numberAlternation})\\s+weeks?\\b`));
  if (
    nextNWeeks &&
    !new RegExp(`\\bnext\\s+(${numberAlternation})\\s+weeks?\\s+(${weekdayAlternation})\\b`).test(
      text
    )
  ) {
    const weeks = parseSmallNumber(nextNWeeks[1]);
    if (weeks) {
      return { kind: 'range', startDate: today, endDate: addDays(today, weeks * 7 - 1) };
    }
  }

  const ordinalWeekdayOfMonth = text.match(
    new RegExp(
      `\\b(${Object.keys(ORDINAL_INDEX_BY_WORD).join('|')})\\s+(${weekdayAlternation})\\s+(?:in|of)\\s+(${monthAlternation})(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (ordinalWeekdayOfMonth) {
    const occurrence = ORDINAL_INDEX_BY_WORD[ordinalWeekdayOfMonth[1]];
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[ordinalWeekdayOfMonth[2]];
    const monthIndex = MONTH_INDEX_BY_NAME[ordinalWeekdayOfMonth[3]];
    const year = ordinalWeekdayOfMonth[4] ? Number(ordinalWeekdayOfMonth[4]) : today.getFullYear();
    if (occurrence && targetWeekday !== undefined && monthIndex !== undefined) {
      const firstOfMonth = new Date(year, monthIndex, 1);
      const firstTarget = nextWeekdayDate(targetWeekday, firstOfMonth);
      const date = addDays(firstTarget, (occurrence - 1) * 7);
      if (date.getMonth() === monthIndex) {
        return { kind: 'exact', date };
      }
    }
  }

  const isoDateRange = text.match(
    /\bfrom\s+(\d{4}-\d{1,2}-\d{1,2})\s+(?:through|to|until|till)\s+(\d{4}-\d{1,2}-\d{1,2})\b/
  );
  if (isoDateRange) {
    const range = buildExactDateRange(isoDateRange[1], isoDateRange[2]);
    if (range) return range;
  }

  const slashDateRange = text.match(
    /\bfrom\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(?:through|to|until|till)\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/
  );
  if (slashDateRange) {
    const range = buildExactDateRange(slashDateRange[1], slashDateRange[2]);
    if (range) return range;
  }

  const monthDayToMonthDay = text.match(
    new RegExp(
      `\\b(?:(?:from|between)\\s+)?(${monthAlternation})\\s+(\\d{1,2})${ordinal}\\s+(?:through|to|until|till|and)\\s+(${monthAlternation})\\s+(\\d{1,2})${ordinal}(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (monthDayToMonthDay) {
    const range = buildDayRange(
      monthDayToMonthDay[2],
      monthDayToMonthDay[4],
      monthDayToMonthDay[1],
      monthDayToMonthDay[5],
      monthDayToMonthDay[3]
    );
    if (range) return range;
  }

  const dayMonthToDayMonth = text.match(
    new RegExp(
      `\\b(?:(?:from|between)\\s+)?(?:the\\s+)?(\\d{1,2})${ordinal}\\s+(?:of\\s+)?(${monthAlternation})\\s+(?:through|to|until|till|and)\\s+(?:the\\s+)?(\\d{1,2})${ordinal}\\s+(?:of\\s+)?(${monthAlternation})(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (dayMonthToDayMonth) {
    const range = buildDayRange(
      dayMonthToDayMonth[1],
      dayMonthToDayMonth[3],
      dayMonthToDayMonth[2],
      dayMonthToDayMonth[5],
      dayMonthToDayMonth[4]
    );
    if (range) return range;
  }

  const fromDayToDay = text.match(
    new RegExp(
      `\\bfrom\\s+(?:the\\s+)?(\\d{1,2})${ordinal}\\s+(?:through|to|until|till)\\s+(?:the\\s+)?(\\d{1,2})${ordinal}(?:\\s+(?:of\\s+)?((?:this|next)\\s+month|${monthAlternation}))?(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (fromDayToDay) {
    const range = buildDayRange(fromDayToDay[1], fromDayToDay[2], fromDayToDay[3], fromDayToDay[4]);
    if (range) return range;
  }

  const dayToDay = text.match(
    new RegExp(
      `\\b(?:the\\s+)?(\\d{1,2})${ordinal}\\s+(?:through|to|until|till)\\s+(?:the\\s+)?(\\d{1,2})${ordinal}(?:\\s+(?:of\\s+)?((?:this|next)\\s+month|${monthAlternation}))?(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (dayToDay) {
    const range = buildDayRange(dayToDay[1], dayToDay[2], dayToDay[3], dayToDay[4]);
    if (range) return range;
  }

  const betweenDayAndDay = text.match(
    new RegExp(
      `\\bbetween\\s+(?:the\\s+)?(\\d{1,2})${ordinal}\\s+and\\s+(?:the\\s+)?(\\d{1,2})${ordinal}(?:\\s+(?:of\\s+)?((?:this|next)\\s+month|${monthAlternation}))?(?:,?\\s+(\\d{4}))?\\b`
    )
  );
  if (betweenDayAndDay) {
    const range = buildDayRange(
      betweenDayAndDay[1],
      betweenDayAndDay[2],
      betweenDayAndDay[3],
      betweenDayAndDay[4]
    );
    if (range) return range;
  }

  const nextNWeeksWeekday = text.match(
    new RegExp(`\\bnext\\s+(${numberAlternation})\\s+weeks?\\s+(${weekdayAlternation})\\b`)
  );
  if (nextNWeeksWeekday) {
    const weeks = parseSmallNumber(nextNWeeksWeekday[1]);
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[nextNWeeksWeekday[2]];
    if (weeks && targetWeekday !== undefined) {
      return { kind: 'exact', date: nextWeekdayDate(targetWeekday, addDays(today, weeks * 7)) };
    }
  }

  const nextWeekWeekday = text.match(new RegExp(`\\bnext\\s+week\\s+(${weekdayAlternation})\\b`));
  if (nextWeekWeekday) {
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[nextWeekWeekday[1]];
    if (targetWeekday !== undefined) {
      return { kind: 'exact', date: addDays(startOfWeek(today), 7 + targetWeekday) };
    }
  }

  const weekdayNextWeek = text.match(new RegExp(`\\b(${weekdayAlternation})\\s+next\\s+week\\b`));
  if (weekdayNextWeek) {
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[weekdayNextWeek[1]];
    if (targetWeekday !== undefined) {
      return { kind: 'exact', date: addDays(startOfWeek(today), 7 + targetWeekday) };
    }
  }

  const weekdayNWeeksFromNow = text.match(
    new RegExp(`\\b(${weekdayAlternation})\\s+(${numberAlternation})\\s+weeks?\\s+from\\s+now\\b`)
  );
  if (weekdayNWeeksFromNow) {
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[weekdayNWeeksFromNow[1]];
    const weeks = parseSmallNumber(weekdayNWeeksFromNow[2]);
    if (weeks && targetWeekday !== undefined) {
      return { kind: 'exact', date: nextWeekdayDate(targetWeekday, addDays(today, weeks * 7)) };
    }
  }

  const nextNSpecificWeekdays = text.match(
    new RegExp(`\\bnext\\s+(${numberAlternation})\\s+(${weekdayAlternation})s\\b`)
  );
  if (nextNSpecificWeekdays) {
    const count = parseSmallNumber(nextNSpecificWeekdays[1]);
    const targetWeekday = WEEKDAY_INDEX_BY_NAME[nextNSpecificWeekdays[2]];
    if (count && targetWeekday !== undefined) {
      const dates: Date[] = [];
      let cursor = nextWeekdayDate(targetWeekday, today);
      for (let index = 0; index < count; index += 1) {
        dates.push(cursor);
        cursor = addDays(cursor, 7);
      }
      return { kind: 'multiple', dates };
    }
  }

  if (/\bthis\s+weekend\b/.test(text)) {
    const weekStart = startOfWeek(today);
    return { kind: 'range', startDate: addDays(weekStart, 6), endDate: addDays(weekStart, 7) };
  }

  if (/\bnext\s+weekend\b/.test(text)) {
    const nextWeekStart = addDays(startOfWeek(today), 7);
    return {
      kind: 'range',
      startDate: addDays(nextWeekStart, 6),
      endDate: addDays(nextWeekStart, 7),
    };
  }

  if (/\bnext\s+week\b/.test(text)) {
    const nextWeekStart = addDays(startOfWeek(today), 7);
    return { kind: 'range', startDate: nextWeekStart, endDate: addDays(nextWeekStart, 6) };
  }

  if (/\blast\s+week\b|\bprevious\s+week\b/.test(text)) {
    const lastWeekStart = addDays(startOfWeek(today), -7);
    return { kind: 'range', startDate: lastWeekStart, endDate: addDays(lastWeekStart, 6) };
  }

  if (/\bthis\s+week\b|\bweek\b/.test(text)) {
    return { kind: 'range', startDate: startOfWeek(today), endDate: endOfWeek(today) };
  }

  if (/\bnext\s+month\b/.test(text)) {
    const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return { kind: 'range', startDate, endDate };
  }

  if (/\bthis\s+month\b|\bmonth\b/.test(text)) {
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { kind: 'range', startDate, endDate };
  }

  const exactDate = resolveCalendarDateFromQuery(query, today);
  return exactDate ? { kind: 'exact', date: exactDate } : null;
}

function resolveCalendarDateFromQuery(query: string, today: Date = new Date()): Date | null {
  const text = query.trim().toLowerCase();
  if (!text) return null;

  if (/\btoday\b|\btonight\b|\bnow\b/.test(text)) {
    return today;
  }

  if (/\btomorrow\b/.test(text)) {
    return addDays(today, 1);
  }

  if (/\byesterday\b/.test(text)) {
    return addDays(today, -1);
  }

  if (/\bchristmas(?:\s+day)?\b/.test(text)) {
    return buildLocalDate(today.getFullYear(), 11, 25);
  }

  if (/\bnew\s+year(?:'s)?(?:\s+day)?\b/.test(text)) {
    return buildLocalDate(today.getFullYear() + 1, 0, 1);
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return buildLocalDate(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const rawYear = slashMatch[3] ? Number(slashMatch[3]) : today.getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const monthFirst = buildLocalDate(year, first - 1, second);
    if (monthFirst) return monthFirst;
    return buildLocalDate(year, second - 1, first);
  }

  const ordinal = '(?:st|nd|rd|th)?';
  const monthAlternation = Object.keys(MONTH_INDEX_BY_NAME).join('|');
  const monthDayMatch = text.match(
    new RegExp(`\\b(${monthAlternation})\\s+(\\d{1,2})${ordinal}(?:,?\\s+(\\d{4}))?\\b`)
  );
  if (monthDayMatch) {
    const monthIndex = MONTH_INDEX_BY_NAME[monthDayMatch[1]];
    const day = Number(monthDayMatch[2]);
    const year = monthDayMatch[3] ? Number(monthDayMatch[3]) : today.getFullYear();
    return buildLocalDate(year, monthIndex, day);
  }

  const dayMonthMatch = text.match(
    new RegExp(`\\b(\\d{1,2})${ordinal}\\s+(?:of\\s+)?(${monthAlternation})(?:,?\\s+(\\d{4}))?\\b`)
  );
  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const monthIndex = MONTH_INDEX_BY_NAME[dayMonthMatch[2]];
    const year = dayMonthMatch[3] ? Number(dayMonthMatch[3]) : today.getFullYear();
    return buildLocalDate(year, monthIndex, day);
  }

  const weekdayAlternation = Object.keys(WEEKDAY_INDEX_BY_NAME).join('|');
  const weekdayMatch = text.match(
    new RegExp(`\\b(?:this\\s+|next\\s+)?(${weekdayAlternation})\\b`)
  );
  if (weekdayMatch) {
    return nextWeekdayDate(WEEKDAY_INDEX_BY_NAME[weekdayMatch[1]], today);
  }

  return null;
}

function describeShift(day: ShiftDay, date: Date, userName: string): string {
  const name = userFirstName(userName);
  const label = shiftName(day);
  if (!day.isWorkDay) {
    return `${name}, you are off on ${formatDate(date)}. Enjoy the rest.`;
  }
  const time =
    day.universal?.startTime && day.universal?.endTime
      ? ` from ${formatTimeForDisplay(day.universal.startTime)} to ${formatTimeForDisplay(
          day.universal.endTime
        )}`
      : '';
  return `${name}, you have ${label}${time} on ${formatDate(date)}.`;
}

function describeRange(startDate: Date, endDate: Date, shiftCycle: ShiftCycle): string {
  const days = getShiftDaysInRange(startDate, endDate, shiftCycle);
  const workDays = days.filter((day) => day.isWorkDay).length;
  const offDays = days.length - workDays;
  const summary = `${formatDate(startDate)} to ${formatDate(endDate)} has ${workDays} work day${workDays === 1 ? '' : 's'} and ${offDays} day${offDays === 1 ? '' : 's'} off.`;

  if (days.length <= 3) {
    const dayLines = days
      .map((day, index) => `${formatDate(addDays(startDate, index))}: ${shiftName(day)}`)
      .join('. ');
    return `${summary} ${dayLines}.`;
  }

  return summary;
}

function describeStatistics(
  startDate: Date,
  endDate: Date,
  shiftCycle: ShiftCycle,
  metric: 'off' | 'night'
): string {
  const stats = getShiftStatistics(startDate, endDate, shiftCycle);
  if (metric === 'night') {
    return `${formatDate(startDate)} to ${formatDate(endDate)} has ${stats.nightShifts} night shift${stats.nightShifts === 1 ? '' : 's'}.`;
  }
  return `${formatDate(startDate)} to ${formatDate(endDate)} has ${stats.daysOff} day${stats.daysOff === 1 ? '' : 's'} off.`;
}

function describeNextBlock(
  result: ReturnType<typeof executeGetNextWorkBlock>,
  target: 'work' | 'rest'
): string {
  if (!result.found) {
    return `I could not find your next ${target === 'work' ? 'work' : 'rest'} block in this schedule window.`;
  }

  const date = dateFromCalendarKey(result.date);
  const label = target === 'work' ? 'work block' : 'rest block';
  const length =
    result.blockLengthDays && result.blockLengthDays > 1
      ? ` It lasts ${result.blockLengthDays} days.`
      : '';
  return `Your next ${label} starts ${date ? formatDateWithYear(date) : result.date}.${length}`;
}

function describeCurrentBlock(shiftCycle: ShiftCycle, userName: string): string {
  const result = executeGetCurrentBlockInfo({}, shiftCycle);
  const name = userFirstName(userName);
  const blockLabel = result.isWorkBlock ? 'work block' : 'rest block';
  return `${name}, you are in a ${blockLabel}. This is day ${result.dayInBlock} of ${result.blockLengthDays}.`;
}

export function buildLocalShiftBrainUnsupportedResponse(
  _shiftCycle: ShiftCycle,
  userName: string
): string {
  return `${userFirstName(userName)}, I can answer saved schedule questions offline. Try asking about today, tomorrow, next weekend, Christmas, your next day off, or this month.`;
}

function classifyLocalShiftBrainIntentWithDate(
  query: string,
  today: Date = new Date()
): LocalShiftBrainIntentClassification {
  const text = query.trim().toLowerCase();
  const language = normalizeLanguage(undefined);

  if (!text) return { language, intent: 'unknown' };
  const dateResolution = buildDateResolution(text, today);
  if (dateResolution?.kind === 'exact') {
    return { language, intent: 'calendar_date' };
  }
  if (text.includes('month') && text.includes('night'))
    return { language, intent: 'month_night_shifts' };
  if (text.includes('month') && (text.includes('off') || text.includes('rest'))) {
    return { language, intent: 'month_days_off' };
  }
  if (dateResolution?.kind === 'range' || dateResolution?.kind === 'multiple') {
    return { language, intent: 'week_summary' };
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
  if (
    /next\s+(work|working)\s+block|next\s+swing|swing\s+back|back\s+to\s+work|start\s+back/.test(
      text
    )
  ) {
    return { language, intent: 'next_work_block' };
  }
  if (/next\s+(rest|off|home)\s+block|next\s+break|break\s+start|home\s+block/.test(text)) {
    return { language, intent: 'next_rest_block' };
  }
  if (/what\s+block|which\s+block|current\s+block|block\s+am\s+i|day\s+.*\bof\b/.test(text)) {
    return { language, intent: 'current_block' };
  }
  if (text.includes('week')) return { language, intent: 'week_summary' };
  if (text.includes('pattern') || text.includes('repeat') || text.includes('rotation')) {
    return { language, intent: 'pattern_summary' };
  }
  if (text.includes('until') && text.includes('work'))
    return { language, intent: 'days_until_work' };
  if (text.includes('until') && (text.includes('rest') || text.includes('off'))) {
    return { language, intent: 'days_until_rest' };
  }

  return { language, intent: 'unknown' };
}

export function classifyLocalShiftBrainIntent(query: string): LocalShiftBrainIntentClassification {
  return classifyLocalShiftBrainIntentWithDate(query);
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

function describeMultipleDates(dates: Date[], shiftCycle: ShiftCycle): string {
  return dates
    .map((date) => {
      const day = calculateShiftDay(date, shiftCycle);
      return `${formatDate(date)}: ${shiftName(day)}`;
    })
    .join('. ');
}

export function answerWithLocalShiftBrain(
  query: string,
  shiftCycle: ShiftCycle,
  userName: string
): LocalShiftBrainResult {
  const today = new Date();
  const { intent } = classifyLocalShiftBrainIntentWithDate(query, today);
  const dateResolution = buildDateResolution(query, today);

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

  if (intent === 'calendar_date') {
    if (dateResolution?.kind === 'exact') {
      return {
        handled: true,
        toolName: 'get_shift_for_date',
        text: describeShift(
          calculateShiftDay(dateResolution.date, shiftCycle),
          dateResolution.date,
          userName
        ),
      };
    }
  }

  if (intent === 'next_day_off') {
    const next = findNext(shiftCycle, (day) => !day.isWorkDay);
    return next
      ? {
          handled: true,
          toolName: 'get_next_occurrence',
          text: `${userFirstName(userName)}, your next day off is ${formatDate(next.date)}.`,
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
          text: `${userFirstName(userName)}, your next night shift is ${formatDate(next.date)}.`,
        }
      : {
          handled: true,
          toolName: 'get_next_occurrence',
          text: 'I could not find a night shift in this schedule window.',
        };
  }

  if (intent === 'week_summary') {
    if (dateResolution?.kind === 'range') {
      const days = getShiftDaysInRange(
        dateResolution.startDate,
        dateResolution.endDate,
        shiftCycle
      );
      return {
        handled: true,
        toolName: 'get_shifts_in_range',
        data: days,
        text: describeRange(dateResolution.startDate, dateResolution.endDate, shiftCycle),
      };
    }
    if (dateResolution?.kind === 'multiple') {
      return {
        handled: true,
        toolName: 'get_shift_for_date',
        text: describeMultipleDates(dateResolution.dates, shiftCycle),
      };
    }
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const week = getShiftDaysInRange(weekStart, weekEnd, shiftCycle);
    const workDays = week.filter((day) => day.isWorkDay).length;
    return {
      handled: true,
      toolName: 'get_shifts_in_range',
      data: week,
      text: `${formatDate(weekStart)} to ${formatDate(weekEnd)} has ${workDays} work day${workDays === 1 ? '' : 's'} and ${7 - workDays} day${7 - workDays === 1 ? '' : 's'} off.`,
    };
  }

  if (intent === 'month_days_off' || intent === 'month_night_shifts') {
    const start =
      dateResolution?.kind === 'range'
        ? dateResolution.startDate
        : new Date(today.getFullYear(), today.getMonth(), 1);
    const end =
      dateResolution?.kind === 'range'
        ? dateResolution.endDate
        : new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      handled: true,
      toolName: 'get_statistics',
      text: describeStatistics(
        start,
        end,
        shiftCycle,
        intent === 'month_days_off' ? 'off' : 'night'
      ),
    };
  }

  if (intent === 'next_work_block') {
    return {
      handled: true,
      toolName: 'get_next_work_block',
      text: describeNextBlock(
        executeGetNextWorkBlock({ fromDate: toCalendarKey(today) }, shiftCycle),
        'work'
      ),
    };
  }

  if (intent === 'next_rest_block') {
    return {
      handled: true,
      toolName: 'get_next_rest_block',
      text: describeNextBlock(
        executeGetNextRestBlock({ fromDate: toCalendarKey(today) }, shiftCycle),
        'rest'
      ),
    };
  }

  if (intent === 'current_block') {
    return {
      handled: true,
      toolName: 'current_block_info',
      text: describeCurrentBlock(shiftCycle, userName),
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
