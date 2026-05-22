import type { UniversalShiftSchedule } from '@/types';
import {
  getNextUniversalOccurrence,
  getShiftDisplayModel,
  getShiftScheduleFingerprint,
  getUniversalStatistics,
  normalizeUniversalSchedule,
} from '../universalShiftScheduleUtils';
import { calculateUniversalShiftDay } from '../universalShiftUtils';

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Relief Rotation',
  timezone: 'UTC',
  anchorDate: '2024-01-01',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '06:00',
      endTime: '18:00',
      crossesMidnight: false,
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#2196F3',
      icon: 'sunny',
      locationName: 'Plant A',
      reminderProfileId: 'default',
    },
    {
      id: 'night',
      name: 'Night Relief',
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
      locationName: 'Plant A',
      reminderProfileId: 'night',
    },
    {
      id: 'off',
      name: 'Family Day',
      kind: 'off',
      timePolicy: 'all_day',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#78716c',
      icon: 'home',
    },
  ],
  sequence: [
    { id: 's1', shiftDefinitionId: 'day' },
    { id: 's2', shiftDefinitionId: 'night', labelOverride: 'Cover team B' },
    { id: 's3', shiftDefinitionId: 'off' },
  ],
};

describe('universalShiftScheduleUtils', () => {
  it('normalizes draft schedules by repairing phase offset and removing orphaned sequence items', () => {
    const result = normalizeUniversalSchedule(
      {
        ...schedule,
        name: '  Relief Rotation  ',
        phaseOffset: 99,
        sequence: [...schedule.sequence, { id: 'orphan', shiftDefinitionId: 'missing' }],
      },
      'draft'
    );

    expect(result.errors).toEqual([]);
    expect(result.normalizedSchedule.name).toBe('Relief Rotation');
    expect(result.normalizedSchedule.phaseOffset).toBe(0);
    expect(result.normalizedSchedule.sequence).toHaveLength(3);
    expect(result.warnings).toContain('1 orphaned sequence item removed.');
  });

  it('blocks saved schedules with orphaned sequence items', () => {
    const result = normalizeUniversalSchedule(
      {
        ...schedule,
        sequence: [...schedule.sequence, { id: 'orphan', shiftDefinitionId: 'missing' }],
      },
      'saved'
    );

    expect(result.errors).toContain(
      'Sequence contains shift blocks that reference deleted shift types.'
    );
  });

  it('builds display metadata from universal shift days', () => {
    const day = calculateUniversalShiftDay(new Date('2024-01-02T12:00:00Z'), schedule);
    const display = getShiftDisplayModel(day);

    expect(display.title).toBe('Night Relief');
    expect(display.icon).toBe('moon');
    expect(display.color).toBe('#651FFF');
    expect(display.timeLabel).toBe('6 PM - 6 AM +1');
    expect(display.isNight).toBe(true);
  });

  it('normalizes 24-hour shifts when overnight is explicitly enabled', () => {
    const result = normalizeUniversalSchedule(
      {
        ...schedule,
        shiftDefinitions: [
          {
            ...schedule.shiftDefinitions[0],
            id: 'fire24',
            name: 'Station Duty',
            startTime: '08:00',
            endTime: '08:00',
            crossesMidnight: true,
          },
          schedule.shiftDefinitions[2],
        ],
        sequence: [
          { id: 's1', shiftDefinitionId: 'fire24' },
          { id: 's2', shiftDefinitionId: 'off' },
        ],
      },
      'saved'
    );

    expect(result.errors).toEqual([]);
    expect(result.normalizedSchedule.shiftDefinitions[0]?.crossesMidnight).toBe(true);
  });

  it('finds next occurrences by work/rest/night/custom name semantics', () => {
    expect(
      getNextUniversalOccurrence({
        schedule,
        query: { countsAsWork: false },
        fromDate: '2024-01-01',
      })?.date
    ).toBe('2024-01-03');

    expect(
      getNextUniversalOccurrence({
        schedule,
        query: { countsAsNight: true },
        fromDate: '2024-01-01',
      })?.date
    ).toBe('2024-01-02');

    expect(
      getNextUniversalOccurrence({
        schedule,
        query: { name: 'family' },
        fromDate: '2024-01-01',
      })?.universal?.definitionName
    ).toBe('Family Day');
  });

  it('finds holiday exception rest days even when they are synthetic definitions', () => {
    const holidaySchedule: UniversalShiftSchedule = {
      ...schedule,
      holidayExceptions: [
        {
          id: 'holiday-jan1',
          date: '2024-01-01',
          holidayName: 'New Year Holiday',
          country: 'US',
          action: 'mark_off',
        },
      ],
    };

    const result = getNextUniversalOccurrence({
      schedule: holidaySchedule,
      query: { countsAsWork: false },
      fromDate: '2024-01-01',
    });

    expect(result?.date).toBe('2024-01-01');
    expect(result?.universal?.definitionName).toBe('New Year Holiday');
    expect(result?.universal?.holidayException?.originalDefinitionName).toBe('Day Shift');
  });

  it('displays and finds one-off replacement days', () => {
    const oneOffSchedule: UniversalShiftSchedule = {
      ...schedule,
      oneOffExceptions: [
        {
          id: 'swap',
          date: '2024-01-02',
          action: 'use_shift_definition',
          shiftDefinitionId: 'day',
          reason: 'Swapped with Jordan',
        },
      ],
    };
    const day = calculateUniversalShiftDay(new Date('2024-01-02T12:00:00Z'), oneOffSchedule);
    const display = getShiftDisplayModel(day);

    expect(day.universal?.definitionId).toBe('day');
    expect(display.subtitle).toContain('One-off change');
    expect(display.accessibilityLabel).toContain('one-off change from Night Relief');

    expect(
      getNextUniversalOccurrence({
        schedule: oneOffSchedule,
        query: { name: 'Jordan' },
        fromDate: '2024-01-01',
      })?.date
    ).toBe('2024-01-02');
  });

  it('returns range statistics with definition-level counts', () => {
    const stats = getUniversalStatistics(schedule, '2024-01-01', '2024-01-06');

    expect(stats.totalDays).toBe(6);
    expect(stats.workDays).toBe(4);
    expect(stats.restDays).toBe(2);
    expect(stats.nightShifts).toBe(2);
    expect(stats.definitionCounts).toEqual({
      'Day Shift': 2,
      'Night Relief': 2,
      'Family Day': 2,
    });
  });

  it('fingerprints universal schedules using sequence labels, colors, and reminder profiles', () => {
    const base = getShiftScheduleFingerprint({ universalSchedule: schedule });
    const changedLabel = getShiftScheduleFingerprint({
      universalSchedule: {
        ...schedule,
        sequence: [
          { id: 's1', shiftDefinitionId: 'day', labelOverride: 'Different' },
          ...schedule.sequence.slice(1),
        ],
      },
    });
    const changedReminder = getShiftScheduleFingerprint({
      universalSchedule: {
        ...schedule,
        shiftDefinitions: [
          { ...schedule.shiftDefinitions[0], reminderProfileId: 'early' },
          ...schedule.shiftDefinitions.slice(1),
        ],
      },
    });

    expect(changedLabel).not.toBe(base);
    expect(changedReminder).not.toBe(base);
  });
});
