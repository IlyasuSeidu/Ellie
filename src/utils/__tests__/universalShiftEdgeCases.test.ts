import {
  calculateUniversalShiftDay,
  getUniversalScheduleStats,
  getUniversalSequenceIndex,
  getUniversalActiveShift,
  validateUniversalSchedule,
} from '../universalShiftUtils';
import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';

const makeDefinition = (
  overrides: Partial<UniversalShiftDefinition> & Pick<UniversalShiftDefinition, 'id' | 'name'>
): UniversalShiftDefinition => ({
  id: overrides.id,
  name: overrides.name,
  kind: overrides.kind ?? 'work',
  timePolicy: overrides.timePolicy ?? 'timed',
  activePolicy: overrides.activePolicy ?? 'timed_window',
  startTime: overrides.startTime ?? '06:00',
  endTime: overrides.endTime ?? '18:00',
  crossesMidnight: overrides.crossesMidnight,
  countsAsWork: overrides.countsAsWork ?? true,
  countsAsNight: overrides.countsAsNight ?? false,
  countsForStats: overrides.countsForStats ?? true,
  color: overrides.color ?? '#2563EB',
  icon: overrides.icon ?? 'briefcase',
  reminderProfileId: overrides.reminderProfileId,
  reminderProfile: overrides.reminderProfile,
});

const dayShift = makeDefinition({
  id: 'day',
  name: 'Day Shift',
  startTime: '06:00',
  endTime: '18:00',
  color: '#2563EB',
  icon: 'sunny',
  reminderProfileId: 'day-reminders',
  reminderProfile: { earlyReminderHours: 4, prepTimeMinutes: 60 },
});

const nightShift = makeDefinition({
  id: 'night',
  name: 'Night Shift',
  startTime: '18:00',
  endTime: '06:00',
  crossesMidnight: true,
  countsAsNight: true,
  color: '#6D28D9',
  icon: 'moon',
  reminderProfileId: 'night-reminders',
  reminderProfile: { earlyReminderHours: 8, prepTimeMinutes: 90 },
});

const afternoonShift = makeDefinition({
  id: 'afternoon',
  name: 'Afternoon Shift',
  startTime: '14:00',
  endTime: '22:00',
  color: '#0891B2',
  icon: 'partly-sunny',
});

const offShift = makeDefinition({
  id: 'off',
  name: 'Off Day',
  kind: 'off',
  timePolicy: 'all_day',
  activePolicy: 'not_active',
  countsAsWork: false,
  countsAsNight: false,
  color: '#78716C',
  icon: 'home',
});

const onCallShift = makeDefinition({
  id: 'on-call',
  name: 'On Call',
  kind: 'on_call',
  timePolicy: 'all_day',
  activePolicy: 'all_day_active',
  color: '#059669',
  icon: 'call',
});

const travelShift = makeDefinition({
  id: 'travel',
  name: 'Travel Day',
  kind: 'travel',
  timePolicy: 'all_day',
  activePolicy: 'all_day_active',
  color: '#EA580C',
  icon: 'airplane',
  reminderProfileId: 'travel-reminders',
  reminderProfile: { earlyReminderHours: 24, travelReminders: true },
});

const trainingShift = makeDefinition({
  id: 'training',
  name: 'Training',
  kind: 'training',
  startTime: '09:00',
  endTime: '12:00',
  color: '#7C3AED',
  icon: 'school',
  reminderProfileId: 'training-reminders',
  reminderProfile: { earlyReminderHours: 1 },
});

const fourFourFourSchedule: UniversalShiftSchedule = {
  version: 3,
  name: '4 Days 4 Nights 4 Off',
  timezone: 'America/New_York',
  anchorDate: '2026-05-16',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [dayShift, nightShift, offShift],
  sequence: [
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `day-${index + 1}`,
      shiftDefinitionId: 'day',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `night-${index + 1}`,
      shiftDefinitionId: 'night',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `off-${index + 1}`,
      shiftDefinitionId: 'off',
    })),
  ],
};

const expectValid = (schedule: UniversalShiftSchedule) => {
  const validation = validateUniversalSchedule(schedule);
  expect(validation.errors).toEqual([]);
  return validation;
};

const atUtcNoon = (date: string): Date => new Date(`${date}T12:00:00Z`);

describe('universal shift edge cases across worker patterns', () => {
  it('supports a 4 day, 4 night, 4 off cycle with the user on the second night', () => {
    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-21'), fourFourFourSchedule);

    expect(getUniversalSequenceIndex('2026-05-21', fourFourFourSchedule)).toBe(5);
    expect(result.universal?.definitionName).toBe('Night Shift');
    expect(result.universal?.sequenceIndex).toBe(5);
    expect(result.universal?.color).toBe('#6D28D9');
    expect(result.universal?.icon).toBe('moon');
    expect(result.universal?.reminderProfile?.earlyReminderHours).toBe(8);
    expect(result.isNightShift).toBe(true);
  });

  it('keeps overnight night shifts active after midnight until their end time', () => {
    const active = getUniversalActiveShift(
      fourFourFourSchedule,
      new Date('2026-05-21T02:30:00-04:00')
    );

    expect(active.shiftDef?.name).toBe('Night Shift');
    expect(active.shiftDef?.color).toBe('#6D28D9');
  });

  it('supports 4 days, 4 nights, and 4 afternoon shifts without fixed categories', () => {
    const schedule: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      name: '4 Days 4 Nights 4 Afternoons',
      shiftDefinitions: [dayShift, nightShift, afternoonShift],
      sequence: [
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `d-${index}`,
          shiftDefinitionId: 'day',
        })),
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `n-${index}`,
          shiftDefinitionId: 'night',
        })),
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `a-${index}`,
          shiftDefinitionId: 'afternoon',
        })),
      ],
    };

    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-24'), schedule);

    expect(result.universal?.definitionName).toBe('Afternoon Shift');
    expect(result.universal?.color).toBe('#0891B2');
    expect(validateUniversalSchedule(schedule).warnings).toContain(
      'No rest/off shifts found in the sequence.'
    );
  });

  it('supports firefighter-style 24-hour shifts when same start/end is explicitly overnight', () => {
    const firefighter = makeDefinition({
      id: 'fire-24',
      name: 'Firefighter 24',
      startTime: '08:00',
      endTime: '08:00',
      crossesMidnight: true,
      color: '#DC2626',
      icon: 'flame',
    });
    const schedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [firefighter, offShift],
      sequence: [
        { id: 's1', shiftDefinitionId: 'fire-24' },
        { id: 's2', shiftDefinitionId: 'off' },
        { id: 's3', shiftDefinitionId: 'off' },
      ],
    };

    expectValid(schedule);
    expect(calculateUniversalShiftDay(atUtcNoon('2026-05-16'), schedule).universal?.icon).toBe(
      'flame'
    );
  });

  it('blocks ambiguous 24-hour shifts unless crosses-midnight is confirmed', () => {
    const invalid = makeDefinition({
      id: 'ambiguous-24',
      name: 'Ambiguous 24',
      startTime: '08:00',
      endTime: '08:00',
      crossesMidnight: false,
    });
    const validation = validateUniversalSchedule({
      ...fourFourFourSchedule,
      shiftDefinitions: [invalid],
      sequence: [{ id: 's1', shiftDefinitionId: 'ambiguous-24' }],
    });

    expect(validation.errors.join(' ')).toContain(
      'matching start and end times mean a 24-hour shift'
    );
  });

  it('blocks end-before-start timed shifts unless crosses-midnight is enabled', () => {
    const invalid = makeDefinition({
      id: 'bad-time',
      name: 'Bad Time',
      startTime: '22:00',
      endTime: '06:00',
      crossesMidnight: false,
    });
    const validation = validateUniversalSchedule({
      ...fourFourFourSchedule,
      shiftDefinitions: [invalid],
      sequence: [{ id: 's1', shiftDefinitionId: 'bad-time' }],
    });

    expect(validation.errors.join(' ')).toContain('ends before it starts');
  });

  it('supports all-day on-call shifts as active work days', () => {
    const schedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [onCallShift],
      sequence: [{ id: 's1', shiftDefinitionId: 'on-call' }],
    };
    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-16'), schedule);

    expect(result.isWorkDay).toBe(true);
    expect(result.universal?.kind).toBe('on_call');
    expect(result.universal?.color).toBe('#059669');
  });

  it('supports leave/off days without making them work shifts', () => {
    const leave = makeDefinition({
      id: 'leave',
      name: 'Annual Leave',
      kind: 'leave',
      timePolicy: 'all_day',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsForStats: true,
      color: '#A16207',
      icon: 'umbrella',
    });
    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-16'), {
      ...fourFourFourSchedule,
      shiftDefinitions: [leave],
      sequence: [{ id: 's1', shiftDefinitionId: 'leave' }],
    });

    expect(result.isWorkDay).toBe(false);
    expect(result.universal?.kind).toBe('leave');
  });

  it('supports travel shifts with travel reminder profiles', () => {
    const schedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [travelShift, dayShift],
      sequence: [
        { id: 'travel-in', shiftDefinitionId: 'travel' },
        { id: 'work', shiftDefinitionId: 'day' },
      ],
    };

    expect(
      calculateUniversalShiftDay(atUtcNoon('2026-05-16'), schedule).universal?.reminderProfile
    ).toMatchObject({
      earlyReminderHours: 24,
      travelReminders: true,
    });
  });

  it('supports training shifts with one-hour reminder profiles', () => {
    const schedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [trainingShift],
      sequence: [{ id: 'training-day', shiftDefinitionId: 'training' }],
    };

    expect(
      calculateUniversalShiftDay(atUtcNoon('2026-05-16'), schedule).universal?.reminderProfile
    ).toMatchObject({
      earlyReminderHours: 1,
    });
  });

  it('warns when two visible shift types share the same color', () => {
    const duplicateColor = makeDefinition({
      id: 'duplicate',
      name: 'Duplicate Color',
      color: dayShift.color,
    });
    const validation = validateUniversalSchedule({
      ...fourFourFourSchedule,
      shiftDefinitions: [dayShift, duplicateColor, offShift],
      sequence: [
        { id: 's1', shiftDefinitionId: 'day' },
        { id: 's2', shiftDefinitionId: 'duplicate' },
        { id: 's3', shiftDefinitionId: 'off' },
      ],
    });

    expect(validation.warnings).toContain(
      'Multiple shifts share the same color — consider using different colors.'
    );
  });

  it('blocks sequence items that reference deleted shift definitions', () => {
    const validation = validateUniversalSchedule({
      ...fourFourFourSchedule,
      sequence: [{ id: 'missing', shiftDefinitionId: 'missing-def' }],
    });

    expect(validation.errors.join(' ')).toContain('unknown definition id "missing-def"');
  });

  it('supports one-off swaps without changing the repeating cycle', () => {
    const swapped: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      oneOffExceptions: [
        {
          id: 'swap-1',
          date: '2026-05-21',
          action: 'use_shift_definition',
          shiftDefinitionId: 'day',
          label: 'Swap to day',
        },
      ],
    };

    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-21'), swapped);

    expect(result.universal?.definitionName).toBe('Day Shift');
    expect(result.universal?.oneOffException?.originalDefinitionName).toBe('Night Shift');
    expect(
      calculateUniversalShiftDay(atUtcNoon('2026-05-22'), swapped).universal?.definitionName
    ).toBe('Night Shift');
  });

  it('supports one-off mark-off exceptions for a single work day', () => {
    const markedOff: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      oneOffExceptions: [
        {
          id: 'swap-off',
          date: '2026-05-21',
          action: 'mark_off',
          label: 'Personal day',
        },
      ],
    };

    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-21'), markedOff);

    expect(result.isWorkDay).toBe(false);
    expect(result.shiftType).toBe('off');
    expect(result.universal?.oneOffException?.label).toBe('Personal day');
  });

  it('supports holiday exceptions that mark normal work days off', () => {
    const holiday: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      holidayExceptions: [
        {
          id: 'holiday-1',
          date: '2026-05-18',
          holidayName: 'Founders Day',
          country: 'GH',
          action: 'mark_off',
          paidOverride: true,
        },
      ],
    };

    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-18'), holiday);

    expect(result.isWorkDay).toBe(false);
    expect(result.universal?.holidayException?.paidOverride).toBe(true);
    expect(result.universal?.color).toBe('#ea580c');
  });

  it('supports holiday exceptions that replace the day with standby', () => {
    const standby = makeDefinition({
      id: 'standby',
      name: 'Paid Standby',
      kind: 'on_call',
      timePolicy: 'all_day',
      activePolicy: 'all_day_active',
      color: '#0F766E',
      icon: 'call',
    });
    const holiday: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [...fourFourFourSchedule.shiftDefinitions, standby],
      holidayExceptions: [
        {
          id: 'holiday-standby',
          date: '2026-05-18',
          holidayName: 'Public Holiday',
          country: 'US',
          action: 'use_shift_definition',
          shiftDefinitionId: 'standby',
        },
      ],
    };

    const result = calculateUniversalShiftDay(atUtcNoon('2026-05-18'), holiday);

    expect(result.universal?.definitionName).toBe('Paid Standby');
    expect(result.universal?.color).toBe('#0F766E');
    expect(result.universal?.holidayException?.originalDefinitionName).toBe('Day Shift');
  });

  it('warns on very long cycles but still calculates them', () => {
    const longSchedule: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      sequence: Array.from({ length: 91 }, (_, index) => ({
        id: `seq-${index}`,
        shiftDefinitionId: index % 2 === 0 ? 'day' : 'off',
      })),
    };

    expect(validateUniversalSchedule(longSchedule).warnings).toContain(
      'Cycle is longer than 90 days — preview may be slow.'
    );
    expect(
      calculateUniversalShiftDay(atUtcNoon('2026-08-15'), longSchedule).universal?.cycleLength
    ).toBe(91);
  });

  it('blocks reminder profiles outside supported lead-time ranges', () => {
    const invalidReminder = makeDefinition({
      id: 'invalid-reminder',
      name: 'Invalid Reminder',
      reminderProfile: { earlyReminderHours: 96, commuteTimeMinutes: 900 },
    });
    const validation = validateUniversalSchedule({
      ...fourFourFourSchedule,
      shiftDefinitions: [invalidReminder],
      sequence: [{ id: 's1', shiftDefinitionId: 'invalid-reminder' }],
    });

    expect(validation.errors.join(' ')).toContain('first reminder must be between 0 and 72 hours');
    expect(validation.errors.join(' ')).toContain(
      'travel time reminder must be between 0 and 720 minutes'
    );
  });

  it('keeps cycle position stable across timezone calendar-day math', () => {
    const schedule: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      timezone: 'America/New_York',
      anchorDate: '2026-03-07',
    };

    expect(getUniversalSequenceIndex('2026-03-08', schedule)).toBe(1);
    expect(getUniversalSequenceIndex('2026-03-09', schedule)).toBe(2);
  });

  it('wraps dates before the anchor instead of failing negative offsets', () => {
    expect(getUniversalSequenceIndex('2026-05-15', fourFourFourSchedule)).toBe(11);
    expect(
      calculateUniversalShiftDay(atUtcNoon('2026-05-15'), fourFourFourSchedule).universal
        ?.definitionName
    ).toBe('Off Day');
  });

  it('calculates stats for mixed work, night, off, travel, and training definitions', () => {
    const schedule: UniversalShiftSchedule = {
      ...fourFourFourSchedule,
      shiftDefinitions: [dayShift, nightShift, offShift, travelShift, trainingShift],
      sequence: [
        { id: 's1', shiftDefinitionId: 'day' },
        { id: 's2', shiftDefinitionId: 'night' },
        { id: 's3', shiftDefinitionId: 'off' },
        { id: 's4', shiftDefinitionId: 'travel' },
        { id: 's5', shiftDefinitionId: 'training' },
      ],
    };

    const stats = getUniversalScheduleStats(schedule);

    expect(stats.totalDays).toBe(5);
    expect(stats.workDays).toBe(4);
    expect(stats.offDays).toBe(1);
    expect(stats.nightShifts).toBe(1);
    expect(stats.definitionCounts).toMatchObject({
      'Day Shift': 1,
      'Night Shift': 1,
      'Off Day': 1,
      'Travel Day': 1,
      Training: 1,
    });
  });
});
