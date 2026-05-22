/**
 * Universal Shift Schedule Utilities
 *
 * Pure calculation functions for the v3 universal shift model.
 * Calendar-day arithmetic only — never raw millisecond differences.
 * DST-safe because dayjs(tz).diff counts calendar days, not elapsed time.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type {
  UniversalShiftSchedule,
  UniversalShiftDefinition,
  UniversalShiftDayMeta,
  ShiftDay,
  ShiftType,
  UniversalShiftKind,
  Holiday,
  UniversalHolidayException,
  UniversalHolidayExceptionAction,
} from '@/types';

dayjs.extend(utc);
dayjs.extend(timezone);

const HOLIDAY_EXCEPTION_COLOR = '#ea580c';
const HOLIDAY_EXCEPTION_ICON = 'calendar';
const ONE_OFF_EXCEPTION_COLOR = '#0ea5e9';
const ONE_OFF_EXCEPTION_ICON = 'swap-horizontal';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Consistent true-modulo that handles negatives: mod(-1, 12) === 11 */
function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * Convert a Date (or YYYY-MM-DD string) to a calendar-date string in the
 * schedule's timezone, so DST transitions never corrupt the count.
 */
function toLocalDateString(date: Date | string, timezone: string): string {
  const input = typeof date === 'string' ? date : date.toISOString();
  return dayjs(input).tz(timezone).format('YYYY-MM-DD');
}

/**
 * Count calendar days from anchorDate to targetDate in the schedule timezone.
 * Returns a signed integer: positive means target is after anchor.
 */
function calendarDaysDiff(targetDateStr: string, anchorDateStr: string, tz: string): number {
  const anchor = dayjs.tz(anchorDateStr, tz).startOf('day');
  const target = dayjs.tz(targetDateStr, tz).startOf('day');
  return target.diff(anchor, 'day');
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface UniversalScheduleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a universal schedule draft before saving.
 * Returns errors (block save) and warnings (confirm before save).
 */
export function validateUniversalSchedule(
  schedule: UniversalShiftSchedule
): UniversalScheduleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schedule.name?.trim()) {
    errors.push('Schedule name is required.');
  }
  if (!schedule.timezone) {
    errors.push('Timezone is required.');
  }
  if (!schedule.anchorDate || !/^\d{4}-\d{2}-\d{2}$/.test(schedule.anchorDate)) {
    errors.push('Anchor date must be in YYYY-MM-DD format.');
  }
  if (!schedule.sequence?.length) {
    errors.push('Sequence must have at least one item.');
  }
  if (!schedule.shiftDefinitions?.length) {
    errors.push('At least one shift definition is required.');
  }

  const defMap = new Map(schedule.shiftDefinitions?.map((d) => [d.id, d]) ?? []);

  for (const item of schedule.sequence ?? []) {
    if (!defMap.has(item.shiftDefinitionId)) {
      errors.push(`Sequence item references unknown definition id "${item.shiftDefinitionId}".`);
    }
  }

  const holidayExceptionDates = new Set<string>();
  for (const exception of schedule.holidayExceptions ?? []) {
    if (!exception.id?.trim()) {
      errors.push('Holiday exception is missing an id.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.date)) {
      errors.push(`Holiday exception "${exception.holidayName}" needs a YYYY-MM-DD date.`);
    }
    if (!exception.holidayName?.trim()) {
      errors.push(`Holiday exception on ${exception.date} needs a name.`);
    }
    if (!exception.country || !/^[A-Za-z]{2}$/.test(exception.country)) {
      errors.push(`Holiday exception "${exception.holidayName}" needs a two-letter country code.`);
    }
    if (holidayExceptionDates.has(exception.date)) {
      warnings.push(
        `Multiple holiday exceptions apply to ${exception.date}; the first one will be used.`
      );
    }
    holidayExceptionDates.add(exception.date);
    if (exception.action === 'use_shift_definition') {
      if (!exception.shiftDefinitionId) {
        errors.push(`Holiday exception "${exception.holidayName}" needs a replacement shift type.`);
      } else if (!defMap.has(exception.shiftDefinitionId)) {
        errors.push(
          `Holiday exception "${exception.holidayName}" references unknown definition id "${exception.shiftDefinitionId}".`
        );
      }
    }
  }

  const oneOffExceptionDates = new Set<string>();
  for (const exception of schedule.oneOffExceptions ?? []) {
    if (!exception.id?.trim()) {
      errors.push('One-off exception is missing an id.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.date)) {
      errors.push(`One-off exception needs a YYYY-MM-DD date.`);
    }
    if (oneOffExceptionDates.has(exception.date)) {
      warnings.push(
        `Multiple one-off exceptions apply to ${exception.date}; the first one will be used.`
      );
    }
    oneOffExceptionDates.add(exception.date);
    if (exception.action === 'use_shift_definition') {
      if (!exception.shiftDefinitionId) {
        errors.push(`One-off exception on ${exception.date} needs a replacement shift type.`);
      } else if (!defMap.has(exception.shiftDefinitionId)) {
        errors.push(
          `One-off exception on ${exception.date} references unknown definition id "${exception.shiftDefinitionId}".`
        );
      }
    }
  }

  for (const def of schedule.shiftDefinitions ?? []) {
    if (!def.color || !/^#[0-9A-Fa-f]{6}$/.test(def.color)) {
      errors.push(`Shift "${def.name}" needs a valid hex color.`);
    }
    if (!def.icon) {
      errors.push(`Shift "${def.name}" needs an icon.`);
    }
    if (def.timePolicy === 'timed') {
      if (!def.startTime || !def.endTime) {
        errors.push(`Timed shift "${def.name}" requires start and end times.`);
      } else {
        const startMin = parseTimeMinutes(def.startTime);
        const endMin = parseTimeMinutes(def.endTime);
        if (startMin === endMin && !def.crossesMidnight) {
          errors.push(
            `Shift "${def.name}": matching start and end times mean a 24-hour shift — turn on "crosses midnight" to confirm.`
          );
        }
        if (endMin < startMin && !def.crossesMidnight) {
          errors.push(
            `Shift "${def.name}" ends before it starts — set "crosses midnight" or adjust times.`
          );
        }
      }
    }
    if (def.reminderProfile) {
      const profile = def.reminderProfile;
      if (
        profile.earlyReminderHours !== undefined &&
        (!Number.isInteger(profile.earlyReminderHours) ||
          profile.earlyReminderHours < 0 ||
          profile.earlyReminderHours > 72)
      ) {
        errors.push(`Shift "${def.name}" first reminder must be between 0 and 72 hours before.`);
      }
      for (const [label, value] of [
        ['prep time', profile.prepTimeMinutes],
        ['travel time', profile.commuteTimeMinutes],
      ] as const) {
        if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 720)) {
          errors.push(`Shift "${def.name}" ${label} reminder must be between 0 and 720 minutes.`);
        }
      }
    }
  }

  const aiConfidence = schedule.aiDraftMeta?.confidence;
  if (typeof aiConfidence === 'number' && aiConfidence < 0.55) {
    warnings.push('AI confidence is low — review the schedule before saving.');
  }
  if ((schedule.aiDraftMeta?.unresolvedQuestions?.length ?? 0) > 0) {
    warnings.push('AI left unresolved questions — answer them before relying on this schedule.');
  }

  const hasWork = (schedule.sequence ?? []).some((item) => {
    const def = defMap.get(item.shiftDefinitionId);
    return def?.countsAsWork === true;
  });
  if (!hasWork) {
    warnings.push('No work shifts found in the sequence.');
  }

  const hasOff = (schedule.sequence ?? []).some((item) => {
    const def = defMap.get(item.shiftDefinitionId);
    return def?.countsAsWork === false;
  });
  if (!hasOff) {
    warnings.push('No rest/off shifts found in the sequence.');
  }

  if ((schedule.sequence?.length ?? 0) > 90) {
    warnings.push('Cycle is longer than 90 days — preview may be slow.');
  }

  const colors = schedule.shiftDefinitions?.map((d) => d.color) ?? [];
  const uniqueColors = new Set(colors);
  if (uniqueColors.size < colors.length) {
    warnings.push('Multiple shifts share the same color — consider using different colors.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export interface BuildHolidayExceptionsOptions {
  action?: UniversalHolidayExceptionAction;
  shiftDefinitionId?: string;
  paidOverride?: boolean;
  appliesToWorkShiftsOnly?: boolean;
}

/**
 * Convert HolidayService results into deterministic schedule overrides.
 */
export function buildHolidayExceptionsFromHolidays(
  holidays: Holiday[],
  options: BuildHolidayExceptionsOptions = {}
): UniversalHolidayException[] {
  const action = options.action ?? 'mark_off';
  return holidays.map((holiday) => ({
    id: `holiday:${holiday.country}:${holiday.date}:${holiday.id}`,
    date: holiday.date,
    holidayName: holiday.name,
    country: holiday.country.toUpperCase(),
    action,
    shiftDefinitionId: action === 'use_shift_definition' ? options.shiftDefinitionId : undefined,
    paidOverride: options.paidOverride ?? holiday.isPaid,
    appliesToWorkShiftsOnly: options.appliesToWorkShiftsOnly ?? true,
  }));
}

// ── Sequence Index ─────────────────────────────────────────────────────────────

/**
 * Calculate which sequence slot applies to a given calendar date.
 *
 * @param targetDateStr  YYYY-MM-DD in any timezone (will be normalised to schedule tz)
 * @param schedule       The universal schedule
 * @returns              Zero-based index into schedule.sequence
 */
export function getUniversalSequenceIndex(
  targetDateStr: string,
  schedule: UniversalShiftSchedule
): number {
  const cycleLen = schedule.sequence.length;
  if (cycleLen === 0) return 0;

  const diff = calendarDaysDiff(targetDateStr, schedule.anchorDate, schedule.timezone);
  const rawIndex = diff + (schedule.phaseOffset ?? 0);
  return mod(rawIndex, cycleLen);
}

// ── Shift Day Calculation ─────────────────────────────────────────────────────

/**
 * Calculate the universal shift day for a given date.
 * Returns a fully-populated ShiftDay that is also compatible with legacy consumers.
 */
export function calculateUniversalShiftDay(date: Date, schedule: UniversalShiftSchedule): ShiftDay {
  const dateStr = toLocalDateString(date, schedule.timezone);
  const idx = getUniversalSequenceIndex(dateStr, schedule);
  const item = schedule.sequence[idx];

  const defMap = new Map(schedule.shiftDefinitions.map((d) => [d.id, d]));
  const def = item ? defMap.get(item.shiftDefinitionId) : undefined;

  if (!def) {
    // Corrupted schedule — return a safe off-day
    return {
      date: dateStr,
      isWorkDay: false,
      isNightShift: false,
      shiftType: 'off',
    };
  }

  const baseDay = createShiftDayFromDefinition({
    dateStr,
    definition: def,
    sequenceIndex: idx,
    cycleLength: schedule.sequence.length,
    shiftDefinitionForLegacyProjection: def,
  });

  const oneOffDay = applyOneOffException(baseDay, def, schedule, dateStr, idx);
  if (oneOffDay.universal?.oneOffException) {
    return oneOffDay;
  }

  return applyHolidayException(baseDay, def, schedule, dateStr, idx);
}

function createShiftDayFromDefinition(input: {
  dateStr: string;
  definition: UniversalShiftDefinition;
  sequenceIndex: number;
  cycleLength: number;
  shiftDefinitionForLegacyProjection?: UniversalShiftDefinition;
  oneOffException?: UniversalShiftDayMeta['oneOffException'];
  holidayException?: UniversalShiftDayMeta['holidayException'];
}): ShiftDay {
  const def = input.definition;
  const isNightShift = computeIsNightShift(def);

  const universal: UniversalShiftDayMeta = {
    definitionId: def.id,
    definitionName: def.name,
    kind: def.kind,
    color: def.color,
    icon: def.icon,
    timePolicy: def.timePolicy,
    activePolicy: def.activePolicy,
    startTime: def.startTime,
    endTime: def.endTime,
    crossesMidnight: def.crossesMidnight,
    countsAsWork: def.countsAsWork,
    countsAsNight: def.countsAsNight,
    locationName: def.locationName,
    reminderProfileId: def.reminderProfileId,
    reminderProfile: def.reminderProfile,
    sequenceIndex: input.sequenceIndex,
    cycleLength: input.cycleLength,
    oneOffException: input.oneOffException,
    holidayException: input.holidayException,
  };

  return {
    date: input.dateStr,
    isWorkDay: def.countsAsWork,
    isNightShift,
    shiftType: projectToLegacyShiftType(input.shiftDefinitionForLegacyProjection ?? def),
    universal,
  };
}

function applyOneOffException(
  baseDay: ShiftDay,
  originalDefinition: UniversalShiftDefinition,
  schedule: UniversalShiftSchedule,
  dateStr: string,
  sequenceIndex: number
): ShiftDay {
  const exception = schedule.oneOffExceptions?.find((candidate) => candidate.date === dateStr);
  if (!exception) return baseDay;

  const oneOffException: UniversalShiftDayMeta['oneOffException'] = {
    id: exception.id,
    action: exception.action,
    label: exception.label,
    reason: exception.reason,
    paidOverride: exception.paidOverride,
    originalDefinitionId: originalDefinition.id,
    originalDefinitionName: originalDefinition.name,
    originalKind: originalDefinition.kind,
  };

  if (exception.action === 'use_shift_definition' && exception.shiftDefinitionId) {
    const replacement = schedule.shiftDefinitions.find(
      (definition) => definition.id === exception.shiftDefinitionId
    );
    if (replacement) {
      return createShiftDayFromDefinition({
        dateStr,
        definition: replacement,
        sequenceIndex,
        cycleLength: schedule.sequence.length,
        oneOffException,
      });
    }
  }

  const oneOffOffDefinition: UniversalShiftDefinition = {
    id: `one-off:${exception.id}`,
    name: exception.label?.trim() || 'One-off off day',
    kind: 'off',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
    color: ONE_OFF_EXCEPTION_COLOR,
    icon: ONE_OFF_EXCEPTION_ICON,
  };

  return createShiftDayFromDefinition({
    dateStr,
    definition: oneOffOffDefinition,
    sequenceIndex,
    cycleLength: schedule.sequence.length,
    shiftDefinitionForLegacyProjection: oneOffOffDefinition,
    oneOffException,
  });
}

function applyHolidayException(
  baseDay: ShiftDay,
  originalDefinition: UniversalShiftDefinition,
  schedule: UniversalShiftSchedule,
  dateStr: string,
  sequenceIndex: number
): ShiftDay {
  const exception = schedule.holidayExceptions?.find((candidate) => candidate.date === dateStr);
  if (!exception) return baseDay;

  if ((exception.appliesToWorkShiftsOnly ?? true) && !baseDay.isWorkDay) {
    return baseDay;
  }

  const holidayException: UniversalShiftDayMeta['holidayException'] = {
    id: exception.id,
    holidayName: exception.holidayName,
    country: exception.country,
    action: exception.action,
    paidOverride: exception.paidOverride,
    originalDefinitionId: originalDefinition.id,
    originalDefinitionName: originalDefinition.name,
    originalKind: originalDefinition.kind,
  };

  if (exception.action === 'use_shift_definition' && exception.shiftDefinitionId) {
    const replacement = schedule.shiftDefinitions.find(
      (definition) => definition.id === exception.shiftDefinitionId
    );
    if (replacement) {
      return createShiftDayFromDefinition({
        dateStr,
        definition: replacement,
        sequenceIndex,
        cycleLength: schedule.sequence.length,
        holidayException,
      });
    }
  }

  const holidayOffDefinition: UniversalShiftDefinition = {
    id: `holiday:${exception.id}`,
    name: exception.holidayName,
    kind: 'off',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
    color: HOLIDAY_EXCEPTION_COLOR,
    icon: HOLIDAY_EXCEPTION_ICON,
  };

  return createShiftDayFromDefinition({
    dateStr,
    definition: holidayOffDefinition,
    sequenceIndex,
    cycleLength: schedule.sequence.length,
    shiftDefinitionForLegacyProjection: holidayOffDefinition,
    holidayException,
  });
}

/**
 * Determine if a definition counts as a night shift.
 * Priority: explicit countsAsNight flag, then time-window heuristic.
 */
function computeIsNightShift(def: UniversalShiftDefinition): boolean {
  if (def.countsAsNight) return true;
  if (def.timePolicy !== 'timed' || !def.startTime) return false;
  const startMin = parseTimeMinutes(def.startTime);
  // Night heuristic: starts at or after 18:00 OR before 06:00
  return startMin >= 18 * 60 || startMin < 6 * 60;
}

/**
 * Project a universal definition to the closest legacy ShiftType for UI
 * surfaces that haven't been updated to the universal model yet.
 */
export function projectToLegacyShiftType(def: UniversalShiftDefinition): ShiftType {
  if (!def.countsAsWork) return 'off';
  const isNight = computeIsNightShift(def);
  if (isNight) return 'night';

  if (def.timePolicy === 'timed' && def.startTime) {
    const startMin = parseTimeMinutes(def.startTime);
    if (startMin >= 6 * 60 && startMin < 12 * 60) return 'morning';
    if (startMin >= 12 * 60 && startMin < 18 * 60) return 'afternoon';
  }

  return 'day';
}

// ── Range Calculation ─────────────────────────────────────────────────────────

export function calculateUniversalShiftRange(
  startDate: Date,
  endDate: Date,
  schedule: UniversalShiftSchedule
): ShiftDay[] {
  const results: ShiftDay[] = [];
  const tz = schedule.timezone;

  let current = dayjs.tz(startDate.toISOString(), tz).startOf('day');
  const end = dayjs.tz(endDate.toISOString(), tz).startOf('day');

  while (!current.isAfter(end)) {
    results.push(calculateUniversalShiftDay(current.toDate(), schedule));
    current = current.add(1, 'day');
  }

  return results;
}

// ── Statistics ────────────────────────────────────────────────────────────────

export interface UniversalScheduleStats {
  totalDays: number;
  workDays: number;
  offDays: number;
  nightShifts: number;
  avgWorkDaysPerWeek: number;
  definitionCounts: Record<string, number>;
}

export function getUniversalScheduleStats(
  schedule: UniversalShiftSchedule
): UniversalScheduleStats {
  const seq = schedule.sequence;
  const defMap = new Map(schedule.shiftDefinitions.map((d) => [d.id, d]));
  const definitionCounts: Record<string, number> = {};
  let workDays = 0;
  let offDays = 0;
  let nightShifts = 0;

  for (const item of seq) {
    const def = defMap.get(item.shiftDefinitionId);
    if (!def) continue;
    definitionCounts[def.name] = (definitionCounts[def.name] ?? 0) + 1;
    if (def.countsAsWork) workDays++;
    else offDays++;
    if (computeIsNightShift(def)) nightShifts++;
  }

  const totalDays = seq.length;
  const avgWorkDaysPerWeek = totalDays > 0 ? (workDays / totalDays) * 7 : 0;

  return { totalDays, workDays, offDays, nightShifts, avgWorkDaysPerWeek, definitionCounts };
}

// ── Next Occurrence ────────────────────────────────────────────────────────────

export function getNextUniversalOccurrence(
  fromDate: Date,
  kindFilter: UniversalShiftKind | ((def: UniversalShiftDefinition) => boolean),
  schedule: UniversalShiftSchedule,
  maxDaysAhead = 365
): ShiftDay | null {
  const tz = schedule.timezone;
  const filter =
    typeof kindFilter === 'function'
      ? kindFilter
      : (def: UniversalShiftDefinition) => def.kind === kindFilter;

  for (let i = 1; i <= maxDaysAhead; i++) {
    const candidate = dayjs.tz(fromDate.toISOString(), tz).add(i, 'day').toDate();
    const day = calculateUniversalShiftDay(candidate, schedule);
    if (day.universal) {
      const defMap = new Map(schedule.shiftDefinitions.map((d) => [d.id, d]));
      const def = defMap.get(day.universal.definitionId);
      if (def && filter(def)) return day;
    }
  }
  return null;
}

// ── Schedule Fingerprint ───────────────────────────────────────────────────────

/**
 * A stable string fingerprint for cache invalidation.
 * Changes whenever the schedule content changes.
 */
export function computeScheduleFingerprint(schedule: UniversalShiftSchedule): string {
  const key = JSON.stringify({
    v: schedule.version,
    n: schedule.name,
    tz: schedule.timezone,
    a: schedule.anchorDate,
    p: schedule.phaseOffset,
    defs: schedule.shiftDefinitions.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      tp: d.timePolicy,
      ap: d.activePolicy,
      st: d.startTime,
      et: d.endTime,
      cm: d.crossesMidnight,
      cw: d.countsAsWork,
      cn: d.countsAsNight,
      cfs: d.countsForStats,
      color: d.color,
      icon: d.icon,
      location: d.locationName,
      reminder: d.reminderProfileId,
      reminderProfile: d.reminderProfile,
    })),
    seq: schedule.sequence.map((s) => ({
      id: s.id,
      def: s.shiftDefinitionId,
      label: s.labelOverride,
    })),
    holidays: (schedule.holidayExceptions ?? []).map((exception) => ({
      id: exception.id,
      date: exception.date,
      name: exception.holidayName,
      country: exception.country,
      action: exception.action,
      def: exception.shiftDefinitionId,
      paid: exception.paidOverride,
      workOnly: exception.appliesToWorkShiftsOnly,
    })),
    oneOffs: (schedule.oneOffExceptions ?? []).map((exception) => ({
      id: exception.id,
      date: exception.date,
      action: exception.action,
      def: exception.shiftDefinitionId,
      label: exception.label,
      reason: exception.reason,
      paid: exception.paidOverride,
    })),
  });
  // Simple DJB2-style hash (no crypto needed for fingerprint)
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

// ── Active Shift Detection ────────────────────────────────────────────────────

export interface UniversalActiveShiftResult {
  isOnShift: boolean;
  isOvernightCarryOver: boolean;
  shiftDef: UniversalShiftDefinition | null;
  startTime?: string;
  endTime?: string;
}

/** Parse "HH:MM" into total minutes since midnight */
export function parseTimeMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Determine if the user is currently on shift according to a universal schedule.
 * Handles overnight carry-over correctly.
 */
export function getUniversalActiveShift(
  schedule: UniversalShiftSchedule,
  now: Date = new Date()
): UniversalActiveShiftResult {
  const tz = schedule.timezone;
  const defMap = new Map(schedule.shiftDefinitions.map((d) => [d.id, d]));

  const yesterdayStr = dayjs.tz(now.toISOString(), tz).subtract(1, 'day').format('YYYY-MM-DD');

  const nowMin = dayjs(now).tz(tz).hour() * 60 + dayjs(now).tz(tz).minute();

  const todayDay = calculateUniversalShiftDay(now, schedule);
  const todayDef = todayDay.universal ? defMap.get(todayDay.universal.definitionId) : null;

  // Check overnight carry-over from yesterday
  const yesterdayDate = dayjs.tz(yesterdayStr, tz).toDate();
  const yesterdayDay = calculateUniversalShiftDay(yesterdayDate, schedule);
  const yesterdayDef = yesterdayDay.universal
    ? defMap.get(yesterdayDay.universal.definitionId)
    : null;

  if (
    yesterdayDef?.activePolicy === 'timed_window' &&
    yesterdayDef.timePolicy === 'timed' &&
    yesterdayDef.crossesMidnight &&
    yesterdayDef.endTime
  ) {
    const endMin = parseTimeMinutes(yesterdayDef.endTime);
    if (nowMin < endMin) {
      return {
        isOnShift: true,
        isOvernightCarryOver: true,
        shiftDef: yesterdayDef,
        startTime: yesterdayDef.startTime,
        endTime: yesterdayDef.endTime,
      };
    }
  }

  if (!todayDef) {
    return { isOnShift: false, isOvernightCarryOver: false, shiftDef: null };
  }

  if (todayDef.activePolicy === 'not_active') {
    return { isOnShift: false, isOvernightCarryOver: false, shiftDef: todayDef };
  }

  if (todayDef.activePolicy === 'all_day_active') {
    return { isOnShift: true, isOvernightCarryOver: false, shiftDef: todayDef };
  }

  // timed_window
  if (todayDef.timePolicy === 'timed' && todayDef.startTime && todayDef.endTime) {
    const startMin = parseTimeMinutes(todayDef.startTime);
    const endMin = parseTimeMinutes(todayDef.endTime);

    let isOnShift: boolean;
    if (todayDef.crossesMidnight) {
      isOnShift = nowMin >= startMin || nowMin < endMin;
    } else {
      isOnShift = nowMin >= startMin && nowMin < endMin;
    }

    return {
      isOnShift,
      isOvernightCarryOver: false,
      shiftDef: todayDef,
      startTime: todayDef.startTime,
      endTime: todayDef.endTime,
    };
  }

  // Fallback for timed without complete times
  return { isOnShift: todayDef.countsAsWork, isOvernightCarryOver: false, shiftDef: todayDef };
}

// ── Display Model ─────────────────────────────────────────────────────────────

export interface UniversalShiftDisplayModel {
  name: string;
  color: string;
  icon: string;
  timeDisplay: string;
  isWork: boolean;
  isNight: boolean;
  kind: UniversalShiftKind;
}

export function getUniversalShiftDisplayModel(
  def: UniversalShiftDefinition
): UniversalShiftDisplayModel {
  let timeDisplay = '';
  if (def.timePolicy === 'timed' && def.startTime && def.endTime) {
    timeDisplay = `${formatDisplayTime(def.startTime)} – ${formatDisplayTime(def.endTime)}`;
    if (def.crossesMidnight) timeDisplay += '+1';
  } else if (def.timePolicy === 'all_day') {
    timeDisplay = 'All day';
  }

  return {
    name: def.name,
    color: def.color,
    icon: def.icon,
    timeDisplay,
    isWork: def.countsAsWork,
    isNight: computeIsNightShift(def),
    kind: def.kind,
  };
}

/** Format HH:mm to 12h display string */
function formatDisplayTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${mStr} ${suffix}`;
}

// ── ID Generation ─────────────────────────────────────────────────────────────

let _idCounter = 0;
export function generateShiftId(prefix = 'def'): string {
  _idCounter++;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter}`;
}

// ── Default Shift Definitions ─────────────────────────────────────────────────

export const PRESET_SHIFT_DEFINITIONS: Omit<UniversalShiftDefinition, 'id'>[] = [
  {
    name: 'Day Shift',
    kind: 'work',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '06:00',
    endTime: '18:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
    color: '#2196F3',
    icon: 'sunny',
  },
  {
    name: 'Night Shift',
    kind: 'work',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '18:00',
    endTime: '06:00',
    crossesMidnight: true,
    countsAsWork: true,
    countsAsNight: true,
    countsForStats: true,
    color: '#651FFF',
    icon: 'moon',
  },
  {
    name: 'Rest Day',
    kind: 'off',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
    color: '#78716c',
    icon: 'home',
  },
  {
    name: 'Travel',
    kind: 'travel',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
    color: '#FF7043',
    icon: 'airplane',
  },
  {
    name: 'Training',
    kind: 'training',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '08:00',
    endTime: '16:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
    color: '#00BCD4',
    icon: 'school',
  },
  {
    name: 'On Call',
    kind: 'on_call',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
    color: '#FF9800',
    icon: 'phone-portrait',
  },
  {
    name: 'Leave',
    kind: 'leave',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: false,
    color: '#4CAF50',
    icon: 'umbrella',
  },
];
