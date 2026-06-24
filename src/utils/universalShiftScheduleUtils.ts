import type {
  ShiftCycle,
  ShiftDay,
  UniversalShiftDefinition,
  UniversalHolidayException,
  UniversalShiftKind,
  UniversalOneOffException,
  UniversalShiftSchedule,
  UniversalShiftSequenceItem,
} from '@/types';
import {
  calculateUniversalShiftDay,
  computeScheduleFingerprint,
  generateShiftId,
} from '@/utils/universalShiftUtils';
import { formatTimeForDisplay } from '@/utils/shiftTimeUtils';
import { theme } from '@/utils/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface UniversalScheduleNormalizationResult {
  normalizedSchedule: UniversalShiftSchedule;
  warnings: string[];
  errors: string[];
}

export interface ShiftDisplayModel {
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  timeLabel: string;
  accessibilityLabel: string;
  isWork: boolean;
  isNight: boolean;
  isCarryOver: boolean;
  warnings: string[];
}

export interface UniversalOccurrenceQuery {
  kind?: UniversalShiftKind;
  name?: string;
  countsAsWork?: boolean;
  countsAsNight?: boolean;
}

export interface UniversalShiftStatistics {
  totalDays: number;
  workDays: number;
  restDays: number;
  nightShifts: number;
  definitionCounts: Record<string, number>;
}

function positiveModulo(value: number, divisor: number): number {
  return divisor <= 0 ? 0 : ((value % divisor) + divisor) % divisor;
}

function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, (month ?? 1) - 1, day ?? 1);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== (month ?? 1) - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseMinutes(value?: string): number | null {
  if (!value || !TIME_RE.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function formatTime(value?: string): string {
  if (!value) return '';
  const minutes = parseMinutes(value);
  if (minutes === null) return value;
  return formatTimeForDisplay(value);
}

function normalizeDefinition(
  definition: UniversalShiftDefinition,
  index: number,
  _mode: 'draft' | 'saved',
  errors: string[]
): UniversalShiftDefinition {
  const id = definition.id?.trim() || generateShiftId(`def_${index}`);
  const name = definition.name?.trim() || `Shift ${index + 1}`;
  const start = definition.startTime?.trim();
  const end = definition.endTime?.trim();
  const startMin = parseMinutes(start);
  const endMin = parseMinutes(end);

  if (definition.timePolicy === 'timed') {
    if (startMin === null || endMin === null) {
      errors.push(`Shift "${name}" needs valid HH:mm start and end times.`);
    } else if (startMin === endMin && !definition.crossesMidnight) {
      errors.push(
        `Shift "${name}" has matching start and end times. Turn on overnight to save it as a 24-hour shift.`
      );
    } else if (endMin < startMin && !definition.crossesMidnight) {
      errors.push(`Shift "${name}" ends after midnight. Turn on overnight.`);
    }
  }

  return {
    ...definition,
    id,
    name,
    startTime: definition.timePolicy === 'timed' ? start : undefined,
    endTime: definition.timePolicy === 'timed' ? end : undefined,
    crossesMidnight:
      definition.timePolicy === 'timed' ? Boolean(definition.crossesMidnight) : undefined,
    locationName: definition.locationName?.trim() || undefined,
    reminderProfileId: definition.reminderProfileId?.trim() || undefined,
    reminderProfile: definition.reminderProfile,
    countsForStats: definition.countsForStats ?? true,
  };
}

function normalizeSequenceItem(
  item: UniversalShiftSequenceItem,
  index: number
): UniversalShiftSequenceItem {
  return {
    id: item.id?.trim() || generateShiftId(`seq_${index}`),
    shiftDefinitionId: item.shiftDefinitionId,
    labelOverride: item.labelOverride?.trim() || undefined,
  };
}

function normalizeHolidayException(
  exception: UniversalHolidayException,
  index: number
): UniversalHolidayException {
  return {
    id: exception.id?.trim() || generateShiftId(`holiday_${index}`),
    date: exception.date,
    holidayName: exception.holidayName?.trim() || 'Public holiday',
    country: exception.country?.trim().toUpperCase() || 'US',
    action: exception.action,
    shiftDefinitionId: exception.shiftDefinitionId?.trim() || undefined,
    paidOverride: exception.paidOverride,
    appliesToWorkShiftsOnly: exception.appliesToWorkShiftsOnly ?? true,
  };
}

function normalizeOneOffException(
  exception: UniversalOneOffException,
  index: number
): UniversalOneOffException {
  return {
    id: exception.id?.trim() || generateShiftId(`one_off_${index}`),
    date: exception.date,
    action: exception.action,
    shiftDefinitionId: exception.shiftDefinitionId?.trim() || undefined,
    label: exception.label?.trim() || undefined,
    reason: exception.reason?.trim() || undefined,
    paidOverride: exception.paidOverride,
  };
}

export function normalizeUniversalSchedule(
  schedule: UniversalShiftSchedule,
  mode: 'draft' | 'saved'
): UniversalScheduleNormalizationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!schedule.timezone?.trim()) {
    errors.push('Timezone is required.');
  }
  if (!parseDateOnly(schedule.anchorDate)) {
    errors.push('Anchor date must be a real YYYY-MM-DD date.');
  }

  const definitions = schedule.shiftDefinitions.map((definition, index) =>
    normalizeDefinition(definition, index, mode, errors)
  );
  const definitionIds = new Set(definitions.map((definition) => definition.id));

  let sequence = schedule.sequence.map(normalizeSequenceItem);
  const orphanCount = sequence.filter((item) => !definitionIds.has(item.shiftDefinitionId)).length;
  if (orphanCount > 0) {
    if (mode === 'draft') {
      warnings.push(
        `${orphanCount} orphaned sequence item${orphanCount === 1 ? '' : 's'} removed.`
      );
      sequence = sequence.filter((item) => definitionIds.has(item.shiftDefinitionId));
    } else {
      errors.push('Sequence contains shift blocks that reference deleted shift types.');
    }
  }

  if (definitions.length === 0) errors.push('At least one shift type is required.');
  if (sequence.length === 0) errors.push('At least one sequence item is required.');

  const phaseOffset = positiveModulo(schedule.phaseOffset ?? 0, Math.max(sequence.length, 1));
  if ((schedule.phaseOffset ?? 0) !== phaseOffset) {
    warnings.push('Phase offset was normalized to the cycle length.');
  }

  const normalizedSchedule: UniversalShiftSchedule = {
    ...schedule,
    version: 3,
    name: schedule.name.trim() || 'My Schedule',
    timezone: schedule.timezone.trim() || 'UTC',
    anchorDate: schedule.anchorDate,
    phaseOffset,
    shiftDefinitions: definitions,
    sequence,
    holidayExceptions: schedule.holidayExceptions?.map(normalizeHolidayException),
    oneOffExceptions: schedule.oneOffExceptions?.map(normalizeOneOffException),
    updatedAt: schedule.updatedAt,
  };

  return { normalizedSchedule, warnings, errors };
}

export function getShiftDisplayModel(day: ShiftDay): ShiftDisplayModel {
  if (day.universal) {
    const timeLabel =
      day.universal.timePolicy === 'timed'
        ? `${formatTime(day.universal.startTime)} - ${formatTime(day.universal.endTime)}${
            day.universal.crossesMidnight ? ' +1' : ''
          }`
        : day.universal.timePolicy === 'all_day'
          ? 'All day'
          : '';

    const oneOffException = day.universal.oneOffException;
    const holidayException = day.universal.holidayException;
    const subtitleParts = [
      oneOffException
        ? oneOffException.label || oneOffException.reason || 'One-off change'
        : holidayException
          ? holidayException.holidayName
          : day.universal.kind.replace('_', ' '),
      oneOffException ? 'One-off change' : null,
      holidayException ? 'Holiday exception' : null,
      timeLabel,
    ].filter(Boolean);

    return {
      title: day.universal.definitionName,
      subtitle: subtitleParts.join(' • '),
      color: day.universal.countsAsWork ? theme.colors.sacredGold : theme.colors.dust,
      icon: day.universal.icon,
      timeLabel,
      accessibilityLabel: `${day.date}: ${day.universal.definitionName}${
        oneOffException ? `, one-off change from ${oneOffException.originalDefinitionName}` : ''
      }${
        holidayException ? `, holiday exception for ${holidayException.originalDefinitionName}` : ''
      }${timeLabel ? `, ${timeLabel}` : ''}`,
      isWork: day.universal.countsAsWork,
      isNight: day.isNightShift,
      isCarryOver: false,
      warnings: [],
    };
  }

  return {
    title: day.shiftType === 'off' ? 'Off' : `${day.shiftType} shift`,
    subtitle: day.isWorkDay ? 'Work shift' : 'Rest day',
    color: day.isWorkDay ? '#20f4dc' : '#5f7484',
    icon: day.shiftType === 'night' ? 'moon' : day.shiftType === 'off' ? 'home' : 'sunny',
    timeLabel: '',
    accessibilityLabel: `${day.date}: ${day.shiftType}`,
    isWork: day.isWorkDay,
    isNight: day.isNightShift,
    isCarryOver: false,
    warnings: [],
  };
}

export function getNextUniversalOccurrence(input: {
  schedule: UniversalShiftSchedule;
  query: UniversalOccurrenceQuery;
  fromDate: string;
  maxDays?: number;
}): ShiftDay | null {
  const start = parseDateOnly(input.fromDate) ?? new Date(input.fromDate);
  const maxDays = Math.max(
    input.maxDays ?? input.schedule.sequence.length * 2,
    input.schedule.sequence.length
  );

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    const day = calculateUniversalShiftDay(candidate, input.schedule);
    const universal = day.universal;
    if (!universal) continue;

    const nameMatches =
      !input.query.name ||
      universal.definitionName.toLowerCase().includes(input.query.name.toLowerCase()) ||
      universal.kind.toLowerCase().includes(input.query.name.toLowerCase()) ||
      universal.oneOffException?.label?.toLowerCase().includes(input.query.name.toLowerCase()) ||
      universal.oneOffException?.reason?.toLowerCase().includes(input.query.name.toLowerCase()) ||
      universal.holidayException?.holidayName
        .toLowerCase()
        .includes(input.query.name.toLowerCase());
    const kindMatches = !input.query.kind || universal.kind === input.query.kind;
    const workMatches =
      input.query.countsAsWork === undefined || universal.countsAsWork === input.query.countsAsWork;
    const nightMatches =
      input.query.countsAsNight === undefined ||
      universal.countsAsNight === input.query.countsAsNight ||
      day.isNightShift === input.query.countsAsNight;

    if (nameMatches && kindMatches && workMatches && nightMatches) {
      return day;
    }
  }

  return null;
}

export function getUniversalStatistics(
  schedule: UniversalShiftSchedule,
  startDate: string,
  endDate: string
): UniversalShiftStatistics {
  const start = parseDateOnly(startDate) ?? new Date(startDate);
  const end = parseDateOnly(endDate) ?? new Date(endDate);
  const definitionCounts: Record<string, number> = {};
  let workDays = 0;
  let nightShifts = 0;
  let totalDays = 0;

  const cursor = new Date(start);
  while (cursor <= end) {
    const day = calculateUniversalShiftDay(cursor, schedule);
    totalDays += 1;
    if (day.isWorkDay) workDays += 1;
    if (day.isNightShift) nightShifts += 1;
    if (day.universal) {
      definitionCounts[day.universal.definitionName] =
        (definitionCounts[day.universal.definitionName] ?? 0) + 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalDays,
    workDays,
    restDays: totalDays - workDays,
    nightShifts,
    definitionCounts,
  };
}

export function getShiftScheduleFingerprint(input: {
  shiftCycle?: ShiftCycle;
  universalSchedule?: UniversalShiftSchedule;
}): string {
  if (input.universalSchedule) {
    return `universal:${computeScheduleFingerprint(input.universalSchedule)}`;
  }

  const cycle = input.shiftCycle;
  if (!cycle) return 'none';

  return `universal:${computeScheduleFingerprint(cycle)}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}
