import type {
  UniversalShiftDefinition,
  UniversalShiftSchedule,
  UniversalShiftSequenceItem,
  UniversalOneOffException,
} from '@/types';
import {
  calculateUniversalShiftRange,
  generateShiftId,
  validateUniversalSchedule,
} from '@/utils/universalShiftUtils';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/;
const DATE_VALUE_RE = /^(\d{4})(\d{2})(\d{2})$/;
const EXPORT_DTSTAMP = '20260101T000000Z';

const IMPORT_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#16a34a',
  '#ea580c',
  '#9333ea',
  '#0f766e',
];

export interface CalendarExportOptions {
  startDate: string;
  endDate: string;
  includeOffDays?: boolean;
  productId?: string;
}

export interface CalendarImportOptions {
  replaceExistingDates?: boolean;
  sourceName?: string;
}

export interface CalendarImportEvent {
  date: string;
  summary: string;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  allDay: boolean;
}

export interface CalendarImportResult {
  schedule: UniversalShiftSchedule;
  importedCount: number;
  skippedCount: number;
  warnings: string[];
  events: CalendarImportEvent[];
}

function parseDate(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== (month ?? 1) - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function toIcsDate(date: string): string {
  return date.replace(/-/g, '');
}

function toIcsDateTime(date: string, time: string): string {
  return `${toIcsDate(date)}T${time.replace(':', '')}00`;
}

function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74));
    remaining = ` ${remaining.slice(74)}`;
  }
  chunks.push(remaining);
  return chunks.join('\r\n');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function minutes(time?: string): number | null {
  if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return null;
  const [hours, mins] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

function buildEventDescription(schedule: UniversalShiftSchedule, dayDate: string): string {
  return escapeIcsText(
    `Exported from Ryvro Universal Shift Builder\nSchedule: ${schedule.name}\nDate: ${dayDate}`
  );
}

export function buildUniversalScheduleIcs(
  schedule: UniversalShiftSchedule,
  options: CalendarExportOptions
): string {
  const start = parseDate(options.startDate);
  const end = parseDate(options.endDate);
  if (!start || !end || start > end) {
    throw new Error('Export range must use valid YYYY-MM-DD start and end dates.');
  }

  const validation = validateUniversalSchedule(schedule);
  if (!validation.valid) {
    throw new Error(`Schedule cannot be exported: ${validation.errors.join(' ')}`);
  }

  const includeOffDays = options.includeOffDays ?? true;
  const days = calculateUniversalShiftRange(start, end, schedule).filter(
    (day) => includeOffDays || day.isWorkDay
  );
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.productId ?? '-//Ryvro//Universal Shift Builder//EN'}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(schedule.name)}`,
    `X-WR-TIMEZONE:${escapeIcsText(schedule.timezone)}`,
  ];

  for (const day of days) {
    const universal = day.universal;
    if (!universal) continue;

    const uid = `ryvro-${schedule.name}-${day.date}-${universal.definitionId}@ryvro.app`
      .toLowerCase()
      .replace(/[^a-z0-9@.-]/g, '-');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${EXPORT_DTSTAMP}`);
    lines.push(`SUMMARY:${escapeIcsText(universal.definitionName)}`);
    lines.push(`DESCRIPTION:${buildEventDescription(schedule, day.date)}`);
    lines.push(`CATEGORIES:${escapeIcsText(universal.kind)}`);
    lines.push(`X-ELLIE-SHIFT-ID:${escapeIcsText(universal.definitionId)}`);
    lines.push(`X-ELLIE-SHIFT-COLOR:${escapeIcsText(universal.color)}`);
    lines.push(`X-ELLIE-SHIFT-ICON:${escapeIcsText(universal.icon)}`);

    const parsedDayDate = parseDate(day.date);
    if (!parsedDayDate) continue;

    if (universal.timePolicy === 'timed' && universal.startTime && universal.endTime) {
      const startTime = universal.startTime;
      const endTime = universal.endTime;
      const startMin = minutes(startTime) ?? 0;
      const endMin = minutes(endTime) ?? startMin;
      const endDate =
        universal.crossesMidnight || endMin <= startMin
          ? toDateString(addDays(parsedDayDate, 1))
          : day.date;
      lines.push(`DTSTART;TZID=${schedule.timezone}:${toIcsDateTime(day.date, startTime)}`);
      lines.push(`DTEND;TZID=${schedule.timezone}:${toIcsDateTime(endDate, endTime)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(day.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(toDateString(addDays(parsedDayDate, 1)))}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function unfoldIcsLines(input: string): string[] {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce<string[]>((acc, line) => {
      if (/^[ \t]/.test(line) && acc.length > 0) {
        acc[acc.length - 1] += line.slice(1);
      } else if (line.trim()) {
        acc.push(line.trimEnd());
      }
      return acc;
    }, []);
}

function parseIcsDateValue(value: string): { date: string; time?: string } | null {
  const dateTime = value.match(DATE_TIME_RE);
  if (dateTime) {
    return {
      date: `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`,
      time: `${dateTime[4]}:${dateTime[5]}`,
    };
  }

  const dateValue = value.match(DATE_VALUE_RE);
  if (dateValue) {
    return {
      date: `${dateValue[1]}-${dateValue[2]}-${dateValue[3]}`,
    };
  }

  return null;
}

function lineName(line: string): string {
  const [left] = line.split(':');
  return (left ?? '').split(';')[0]?.toUpperCase() ?? '';
}

function lineValue(line: string): string {
  const separator = line.indexOf(':');
  return separator >= 0 ? line.slice(separator + 1) : '';
}

export function parseUniversalScheduleIcs(input: string): CalendarImportEvent[] {
  const lines = unfoldIcsLines(input);
  const events: CalendarImportEvent[] = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.toUpperCase() === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line.toUpperCase() === 'END:VEVENT') {
      if (current) {
        const summary = unescapeIcsText(current.SUMMARY ?? 'Imported shift');
        const start = current.DTSTART ? parseIcsDateValue(current.DTSTART) : null;
        const end = current.DTEND ? parseIcsDateValue(current.DTEND) : null;
        if (start?.date && parseDate(start.date)) {
          const startMin = minutes(start.time);
          const endMin = minutes(end?.time);
          const endDate = end?.date;
          const allDay = !start.time;
          events.push({
            date: start.date,
            summary,
            startTime: start.time,
            endTime: end?.time,
            crossesMidnight:
              Boolean(start.time && end?.time && endDate && endDate > start.date) ||
              Boolean(startMin !== null && endMin !== null && endMin <= startMin),
            allDay,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const name = lineName(line);
    if (name === 'SUMMARY' || name === 'DTSTART' || name === 'DTEND') {
      current[name] = lineValue(line);
    }
  }

  return events;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'shift'
  );
}

function inferKind(summary: string): UniversalShiftDefinition['kind'] {
  const lower = summary.toLowerCase();
  if (/\b(off|rest|day off|rdo)\b/.test(lower)) return 'off';
  if (/\b(leave|vacation|holiday|pto|annual)\b/.test(lower)) return 'leave';
  if (/\b(on call|standby|call)\b/.test(lower)) return 'on_call';
  if (/\b(training|course|class)\b/.test(lower)) return 'training';
  if (/\b(travel|fly|flight|commute)\b/.test(lower)) return 'travel';
  return 'work';
}

function inferIcon(kind: UniversalShiftDefinition['kind'], summary: string): string {
  const lower = summary.toLowerCase();
  if (kind === 'off') return 'home';
  if (kind === 'leave') return 'umbrella';
  if (kind === 'on_call') return 'phone-portrait';
  if (kind === 'training') return 'school';
  if (kind === 'travel') return 'airplane';
  if (/\bnight\b/.test(lower)) return 'moon';
  if (/\bmorning\b/.test(lower)) return 'sunny';
  return 'briefcase';
}

function buildDefinitionFromEvent(
  event: CalendarImportEvent,
  existingCount: number
): UniversalShiftDefinition {
  const kind = inferKind(event.summary);
  const countsAsWork = !['off', 'leave'].includes(kind);
  const countsAsNight =
    Boolean(event.crossesMidnight) ||
    (event.startTime
      ? (minutes(event.startTime) ?? 0) >= 18 * 60 || (minutes(event.startTime) ?? 0) < 6 * 60
      : false);
  const color = countsAsWork
    ? countsAsNight
      ? '#4f46e5'
      : IMPORT_COLORS[existingCount % IMPORT_COLORS.length]
    : kind === 'leave'
      ? '#16a34a'
      : '#78716c';

  return {
    id: `imported_${slug(event.summary)}_${existingCount}`,
    name: event.summary,
    kind,
    timePolicy: event.allDay ? 'all_day' : 'timed',
    activePolicy: countsAsWork ? (event.allDay ? 'all_day_active' : 'timed_window') : 'not_active',
    startTime: event.allDay ? undefined : event.startTime,
    endTime: event.allDay ? undefined : event.endTime,
    crossesMidnight: event.crossesMidnight || undefined,
    countsAsWork,
    countsAsNight,
    countsForStats: true,
    color,
    icon: inferIcon(kind, event.summary),
  };
}

function definitionKey(
  definition: Pick<UniversalShiftDefinition, 'name' | 'startTime' | 'endTime' | 'kind'>
): string {
  return [
    definition.name.trim().toLowerCase(),
    definition.kind,
    definition.startTime ?? '',
    definition.endTime ?? '',
  ].join('|');
}

export function importUniversalScheduleIcs(
  schedule: UniversalShiftSchedule,
  icsText: string,
  options: CalendarImportOptions = {}
): CalendarImportResult {
  const events = parseUniversalScheduleIcs(icsText);
  const warnings: string[] = [];
  const definitions = [...schedule.shiftDefinitions];
  const definitionByKey = new Map(
    definitions.map((definition) => [definitionKey(definition), definition.id])
  );
  const oneOffsByDate = new Map(
    (schedule.oneOffExceptions ?? []).map((exception) => [exception.date, exception])
  );
  let importedCount = 0;
  let skippedCount = 0;

  for (const event of events) {
    if (!parseDate(event.date)) {
      skippedCount += 1;
      continue;
    }

    const draftDefinition = buildDefinitionFromEvent(event, definitions.length);
    const key = definitionKey(draftDefinition);
    let definitionId = definitionByKey.get(key);
    if (!definitionId) {
      definitionId = draftDefinition.id;
      definitions.push(draftDefinition);
      definitionByKey.set(key, definitionId);
    }

    if (!options.replaceExistingDates && oneOffsByDate.has(event.date)) {
      skippedCount += 1;
      warnings.push(`${event.date} already has a one-off change. It was left unchanged.`);
      continue;
    }

    const oneOff: UniversalOneOffException = {
      id: generateShiftId('calendar_import'),
      date: event.date,
      action: 'use_shift_definition',
      shiftDefinitionId: definitionId,
      label: `Imported: ${event.summary}`,
      reason: options.sourceName ? `Imported from ${options.sourceName}` : 'Imported from calendar',
    };
    oneOffsByDate.set(event.date, oneOff);
    importedCount += 1;
  }

  const importedSequence: UniversalShiftSequenceItem[] =
    schedule.sequence.length > 0
      ? schedule.sequence
      : definitions[0]
        ? [{ id: generateShiftId('seq'), shiftDefinitionId: definitions[0].id }]
        : schedule.sequence;

  const nextSchedule: UniversalShiftSchedule = {
    ...schedule,
    shiftDefinitions: definitions,
    sequence: importedSequence,
    oneOffExceptions: Array.from(oneOffsByDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    updatedAt: new Date().toISOString(),
  };

  const validation = validateUniversalSchedule(nextSchedule);
  if (!validation.valid) {
    warnings.push(...validation.errors);
  }

  return {
    schedule: nextSchedule,
    importedCount,
    skippedCount,
    warnings,
    events,
  };
}
