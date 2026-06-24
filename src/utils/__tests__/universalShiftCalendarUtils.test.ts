import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';
import {
  buildUniversalScheduleIcs,
  importUniversalScheduleIcs,
  parseUniversalScheduleIcs,
} from '../universalShiftCalendarUtils';

const dayDef: UniversalShiftDefinition = {
  id: 'day',
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
  locationName: 'Ward 7',
};

const nightDef: UniversalShiftDefinition = {
  id: 'night',
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
};

const offDef: UniversalShiftDefinition = {
  id: 'off',
  name: 'Rest Day',
  kind: 'off',
  timePolicy: 'all_day',
  activePolicy: 'not_active',
  countsAsWork: false,
  countsAsNight: false,
  countsForStats: true,
  color: '#5f7484',
  icon: 'home',
};

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Export Test',
  timezone: 'UTC',
  anchorDate: '2026-01-01',
  phaseOffset: 0,
  shiftDefinitions: [dayDef, nightDef, offDef],
  sequence: [
    { id: 's1', shiftDefinitionId: 'day' },
    { id: 's2', shiftDefinitionId: 'night' },
    { id: 's3', shiftDefinitionId: 'off' },
  ],
  source: 'manual',
};

describe('universalShiftCalendarUtils', () => {
  it('exports timed, overnight, and all-day shifts as RFC-style VEVENT rows', () => {
    const ics = buildUniversalScheduleIcs(schedule, {
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      includeOffDays: true,
    });

    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(3);
    expect(ics).toContain('SUMMARY:Day Shift');
    expect(ics).toContain('LOCATION:Ward 7');
    expect(ics).toContain('Location: Ward 7');
    expect(ics).toContain('X-RYVRO-SHIFT-ID:day');
    expect(ics).not.toContain('X-RYVRO-SHIFT-COLOR');
    expect(ics).toContain('X-RYVRO-SHIFT-ICON:sunny');
    expect(ics).not.toContain('X-ELLIE-SHIFT-ID');
    expect(ics).toContain('DTSTART;TZID=UTC:20260101T060000');
    expect(ics).toContain('DTEND;TZID=UTC:20260101T180000');
    expect(ics).toContain('SUMMARY:Night Shift');
    expect(ics).toContain('DTSTART;TZID=UTC:20260102T180000');
    expect(ics).toContain('DTEND;TZID=UTC:20260103T060000');
    expect(ics).toContain('SUMMARY:Rest Day');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260103');
  });

  it('exports one-off exception notes without changing the repeating sequence', () => {
    const swapSchedule: UniversalShiftSchedule = {
      ...schedule,
      oneOffExceptions: [
        {
          id: 'swap-1',
          date: '2026-01-01',
          action: 'use_shift_definition',
          shiftDefinitionId: 'night',
          reason: 'Swapped with Amina',
        },
      ],
    };

    const ics = buildUniversalScheduleIcs(swapSchedule, {
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      includeOffDays: true,
    });
    const unfoldedIcs = ics.replace(/\r\n /g, '');

    expect(ics).toContain('SUMMARY:Night Shift');
    expect(unfoldedIcs).toContain('Changed just this day');
    expect(unfoldedIcs).toContain('original shift was Day Shift');
    expect(unfoldedIcs).toContain('Reason: Swapped with Amina');
    expect(ics).not.toContain('Mine Site');
  });

  it('can omit off days when exporting only work shifts', () => {
    const ics = buildUniversalScheduleIcs(schedule, {
      startDate: '2026-01-01',
      endDate: '2026-01-03',
      includeOffDays: false,
    });

    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(ics).not.toContain('SUMMARY:Rest Day');
  });

  it('parses calendar events with folded text and escaped summary values', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Night\\, ICU',
      'DTSTART;TZID=UTC:20260104T190000',
      'DTEND;TZID=UTC:20260105T070000',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'SUMMARY:Annual leave',
      'DTSTART;VALUE=DATE:20260106',
      'DTEND;VALUE=DATE:20260107',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    expect(parseUniversalScheduleIcs(ics)).toEqual([
      {
        date: '2026-01-04',
        summary: 'Night, ICU',
        startTime: '19:00',
        endTime: '07:00',
        crossesMidnight: true,
        allDay: false,
      },
      {
        date: '2026-01-06',
        summary: 'Annual leave',
        startTime: undefined,
        endTime: undefined,
        crossesMidnight: false,
        allDay: true,
      },
    ]);
  });

  it('imports calendar events as one-off changes without mutating the repeating sequence', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Training',
      'DTSTART;TZID=UTC:20260108T080000',
      'DTEND;TZID=UTC:20260108T160000',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'SUMMARY:Day Off',
      'DTSTART;VALUE=DATE:20260109',
      'DTEND;VALUE=DATE:20260110',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = importUniversalScheduleIcs(schedule, ics, {
      replaceExistingDates: true,
      sourceName: 'roster.ics',
    });

    expect(result.importedCount).toBe(2);
    expect(result.schedule.sequence).toEqual(schedule.sequence);
    expect(result.schedule.shiftDefinitions.map((definition) => definition.name)).toEqual(
      expect.arrayContaining(['Training', 'Day Off'])
    );
    expect(result.schedule.oneOffExceptions).toHaveLength(2);
    expect(result.schedule.oneOffExceptions?.[0]?.reason).toBe('Imported from roster.ics');
  });

  it('skips an imported date that already has a one-off change when replacement is disabled', () => {
    const existing: UniversalShiftSchedule = {
      ...schedule,
      oneOffExceptions: [
        {
          id: 'existing',
          date: '2026-01-08',
          action: 'use_shift_definition',
          shiftDefinitionId: 'day',
          label: 'Existing swap',
        },
      ],
    };
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Training',
      'DTSTART;TZID=UTC:20260108T080000',
      'DTEND;TZID=UTC:20260108T160000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = importUniversalScheduleIcs(existing, ics, { replaceExistingDates: false });

    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.schedule.oneOffExceptions?.[0]?.id).toBe('existing');
    expect(result.warnings[0]).toContain('already has a one-off change');
  });
});
