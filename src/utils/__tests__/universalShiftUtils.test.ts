/**
 * Tests for Universal Shift Schedule Utilities
 *
 * Covers sequence index calculation, shift day calculation, validation,
 * fingerprint stability, statistics, and legacy projection.
 */

import {
  getUniversalSequenceIndex,
  calculateUniversalShiftDay,
  validateUniversalSchedule,
  computeScheduleFingerprint,
  getUniversalScheduleStats,
  projectToLegacyShiftType,
  getUniversalActiveShift,
  buildHolidayExceptionsFromHolidays,
} from '../universalShiftUtils';
import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const dayDef: UniversalShiftDefinition = {
  id: 'day1',
  name: 'Day',
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
};

const nightDef: UniversalShiftDefinition = {
  id: 'night1',
  name: 'Night',
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
  id: 'off1',
  name: 'Off',
  kind: 'off',
  timePolicy: 'all_day',
  activePolicy: 'not_active',
  countsAsWork: false,
  countsAsNight: false,
  countsForStats: true,
  color: '#5f7484',
  icon: 'home',
};

/** A 6-slot schedule: day, day, night, night, off, off */
const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Test',
  timezone: 'UTC',
  anchorDate: '2026-01-01',
  phaseOffset: 0,
  shiftDefinitions: [dayDef, nightDef, offDef],
  sequence: [
    { id: 's1', shiftDefinitionId: 'day1' },
    { id: 's2', shiftDefinitionId: 'day1' },
    { id: 's3', shiftDefinitionId: 'night1' },
    { id: 's4', shiftDefinitionId: 'night1' },
    { id: 's5', shiftDefinitionId: 'off1' },
    { id: 's6', shiftDefinitionId: 'off1' },
  ],
  source: 'manual',
};

// ── getUniversalSequenceIndex ─────────────────────────────────────────────────

describe('getUniversalSequenceIndex', () => {
  it('returns 0 when phaseOffset is 0 and target equals anchor', () => {
    expect(getUniversalSequenceIndex('2026-01-01', schedule)).toBe(0);
  });

  it('returns 1 for the day after the anchor', () => {
    expect(getUniversalSequenceIndex('2026-01-02', schedule)).toBe(1);
  });

  it('wraps correctly for a date one day before the anchor (negative diff)', () => {
    // diff = -1, phaseOffset = 0, cycleLen = 6 → mod(-1, 6) = 5
    expect(getUniversalSequenceIndex('2025-12-31', schedule)).toBe(5);
  });

  it('wraps correctly over a large number of days', () => {
    // 6 days after anchor → position 0 again (full cycle)
    expect(getUniversalSequenceIndex('2026-01-07', schedule)).toBe(0);
    // 7 days after anchor → position 1
    expect(getUniversalSequenceIndex('2026-01-08', schedule)).toBe(1);
  });

  it('applies phaseOffset correctly', () => {
    const withOffset: UniversalShiftSchedule = { ...schedule, phaseOffset: 2 };
    // diff = 0, rawIndex = 0 + 2 = 2 → index 2 (night1)
    expect(getUniversalSequenceIndex('2026-01-01', withOffset)).toBe(2);
  });

  it('normalises a phaseOffset larger than cycleLength', () => {
    const withOffset: UniversalShiftSchedule = { ...schedule, phaseOffset: 8 };
    // diff = 0, rawIndex = 8, mod(8, 6) = 2
    expect(getUniversalSequenceIndex('2026-01-01', withOffset)).toBe(2);
  });

  it('handles a negative effective index via true modulo', () => {
    // diff = -3, phaseOffset = 0 → mod(-3, 6) = 3
    expect(getUniversalSequenceIndex('2025-12-29', schedule)).toBe(3);
  });

  it('works correctly with a 32-day cycle', () => {
    const longSeq = Array.from({ length: 32 }, (_, i) => ({
      id: `s${i}`,
      shiftDefinitionId: 'day1',
    }));
    const longSchedule: UniversalShiftSchedule = {
      ...schedule,
      sequence: longSeq,
    };
    expect(getUniversalSequenceIndex('2026-01-01', longSchedule)).toBe(0);
    expect(getUniversalSequenceIndex('2026-01-16', longSchedule)).toBe(15);
    expect(getUniversalSequenceIndex('2026-02-02', longSchedule)).toBe(0); // 32 days later
  });
});

// ── calculateUniversalShiftDay ────────────────────────────────────────────────

describe('calculateUniversalShiftDay', () => {
  it('returns correct definition for sequence position 0 (day shift starting 06:00)', () => {
    // dayDef starts at 06:00 → projectToLegacyShiftType maps it to 'morning'
    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), schedule);
    expect(result.shiftType).toBe('morning');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(false);
  });

  it('returns correct definition for sequence position 2 (night shift)', () => {
    // 2 days after anchor → sequence index 2 → night1
    const result = calculateUniversalShiftDay(new Date('2026-01-03T12:00:00Z'), schedule);
    expect(result.shiftType).toBe('night');
    expect(result.isWorkDay).toBe(true);
    expect(result.isNightShift).toBe(true);
  });

  it('returns correct definition for sequence position 4 (off day)', () => {
    // 4 days after anchor → sequence index 4 → off1
    const result = calculateUniversalShiftDay(new Date('2026-01-05T12:00:00Z'), schedule);
    expect(result.shiftType).toBe('off');
    expect(result.isWorkDay).toBe(false);
    expect(result.isNightShift).toBe(false);
  });

  it('returns safe off-day fallback when definition is missing (corrupted schedule)', () => {
    const corrupted: UniversalShiftSchedule = {
      ...schedule,
      sequence: [{ id: 'sx', shiftDefinitionId: 'does-not-exist' }],
    };
    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), corrupted);
    expect(result.isWorkDay).toBe(false);
    expect(result.isNightShift).toBe(false);
    expect(result.shiftType).toBe('off');
    expect(result.universal).toBeUndefined();
  });

  it('overnight shift (crossesMidnight=true) gets isNightShift=true', () => {
    const result = calculateUniversalShiftDay(new Date('2026-01-03T12:00:00Z'), schedule);
    // night1 has countsAsNight=true and crossesMidnight=true
    expect(result.isNightShift).toBe(true);
    expect(result.universal?.crossesMidnight).toBe(true);
  });

  it('countsAsWork is reflected in isWorkDay', () => {
    const offResult = calculateUniversalShiftDay(new Date('2026-01-05T12:00:00Z'), schedule);
    expect(offResult.isWorkDay).toBe(false);

    const dayResult = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), schedule);
    expect(dayResult.isWorkDay).toBe(true);
  });

  it('sets universal metadata on returned ShiftDay', () => {
    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), schedule);
    expect(result.universal).toBeDefined();
    expect(result.universal?.definitionId).toBe('day1');
    expect(result.universal?.definitionName).toBe('Day');
    expect(result.universal?.kind).toBe('work');
    expect(result.universal?.color).toBe('#2196F3');
    expect(result.universal?.sequenceIndex).toBe(0);
    expect(result.universal?.cycleLength).toBe(6);
  });

  it('date one full cycle ahead returns the same sequence index as anchor date', () => {
    const anchorResult = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), schedule);
    const oneCycleResult = calculateUniversalShiftDay(new Date('2026-01-07T12:00:00Z'), schedule);
    expect(anchorResult.universal?.sequenceIndex).toBe(oneCycleResult.universal?.sequenceIndex);
    expect(anchorResult.shiftType).toBe(oneCycleResult.shiftType);
  });

  it('date string is formatted as YYYY-MM-DD in UTC', () => {
    const result = calculateUniversalShiftDay(new Date('2026-01-15T12:00:00Z'), schedule);
    expect(result.date).toBe('2026-01-15');
  });

  it('marks a matching work day as holiday/off when a holiday exception applies', () => {
    const holidaySchedule: UniversalShiftSchedule = {
      ...schedule,
      holidayExceptions: [
        {
          id: 'holiday-xmas',
          date: '2026-01-01',
          holidayName: 'Founders Day',
          country: 'GH',
          action: 'mark_off',
          paidOverride: true,
        },
      ],
    };

    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), holidaySchedule);

    expect(result.isWorkDay).toBe(false);
    expect(result.shiftType).toBe('off');
    expect(result.universal?.definitionName).toBe('Founders Day');
    expect(result.universal?.color).toBe('#ea580c');
    expect(result.universal?.icon).toBe('calendar');
    expect(result.universal?.holidayException).toMatchObject({
      id: 'holiday-xmas',
      holidayName: 'Founders Day',
      originalDefinitionId: 'day1',
      originalDefinitionName: 'Day',
      paidOverride: true,
    });
  });

  it('uses a replacement shift definition for a holiday exception', () => {
    const standbyDef: UniversalShiftDefinition = {
      id: 'standby1',
      name: 'Paid Holiday Standby',
      kind: 'on_call',
      timePolicy: 'all_day',
      activePolicy: 'all_day_active',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#0F766E',
      icon: 'call',
    };
    const holidaySchedule: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [...schedule.shiftDefinitions, standbyDef],
      holidayExceptions: [
        {
          id: 'holiday-standby',
          date: '2026-01-01',
          holidayName: 'National Holiday',
          country: 'US',
          action: 'use_shift_definition',
          shiftDefinitionId: 'standby1',
        },
      ],
    };

    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), holidaySchedule);

    expect(result.isWorkDay).toBe(true);
    expect(result.universal?.definitionId).toBe('standby1');
    expect(result.universal?.definitionName).toBe('Paid Holiday Standby');
    expect(result.universal?.holidayException?.originalDefinitionName).toBe('Day');
  });

  it('does not alter existing off days unless the exception explicitly applies to all shifts', () => {
    const holidaySchedule: UniversalShiftSchedule = {
      ...schedule,
      holidayExceptions: [
        {
          id: 'holiday-rest',
          date: '2026-01-05',
          holidayName: 'Rest Holiday',
          country: 'US',
          action: 'mark_off',
        },
      ],
    };

    const result = calculateUniversalShiftDay(new Date('2026-01-05T12:00:00Z'), holidaySchedule);

    expect(result.universal?.definitionId).toBe('off1');
    expect(result.universal?.holidayException).toBeUndefined();
  });

  it('uses a one-off replacement shift for one specific date only', () => {
    const oneOffSchedule: UniversalShiftSchedule = {
      ...schedule,
      oneOffExceptions: [
        {
          id: 'swap-next-friday',
          date: '2026-01-03',
          action: 'use_shift_definition',
          shiftDefinitionId: 'day1',
          reason: 'Swapped with Alex',
        },
      ],
    };

    const swapped = calculateUniversalShiftDay(new Date('2026-01-03T12:00:00Z'), oneOffSchedule);
    const followingCycleNight = calculateUniversalShiftDay(
      new Date('2026-01-09T12:00:00Z'),
      oneOffSchedule
    );

    expect(swapped.universal?.definitionId).toBe('day1');
    expect(swapped.isNightShift).toBe(false);
    expect(swapped.universal?.oneOffException).toMatchObject({
      id: 'swap-next-friday',
      originalDefinitionId: 'night1',
      originalDefinitionName: 'Night',
      reason: 'Swapped with Alex',
    });
    expect(followingCycleNight.universal?.definitionId).toBe('night1');
    expect(followingCycleNight.universal?.oneOffException).toBeUndefined();
  });

  it('one-off exceptions take priority over holiday exceptions on the same date', () => {
    const overrideSchedule: UniversalShiftSchedule = {
      ...schedule,
      holidayExceptions: [
        {
          id: 'holiday',
          date: '2026-01-01',
          holidayName: 'Public Holiday',
          country: 'US',
          action: 'mark_off',
        },
      ],
      oneOffExceptions: [
        {
          id: 'work-anyway',
          date: '2026-01-01',
          action: 'use_shift_definition',
          shiftDefinitionId: 'night1',
          reason: 'Covered urgent outage',
        },
      ],
    };

    const result = calculateUniversalShiftDay(new Date('2026-01-01T12:00:00Z'), overrideSchedule);

    expect(result.universal?.definitionId).toBe('night1');
    expect(result.universal?.oneOffException?.reason).toBe('Covered urgent outage');
    expect(result.universal?.holidayException).toBeUndefined();
  });
});

// ── getUniversalActiveShift ───────────────────────────────────────────────────

describe('getUniversalActiveShift', () => {
  it('does not treat overnight carry-over as active when activePolicy is not_active', () => {
    const inactiveNight: UniversalShiftDefinition = {
      ...nightDef,
      id: 'inactive-night',
      activePolicy: 'not_active',
    };
    const inactiveSchedule: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [inactiveNight, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'inactive-night' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };

    const result = getUniversalActiveShift(inactiveSchedule, new Date('2026-01-02T03:00:00Z'));

    expect(result.isOnShift).toBe(false);
    expect(result.isOvernightCarryOver).toBe(false);
  });
});

// ── validateUniversalSchedule ─────────────────────────────────────────────────

describe('validateUniversalSchedule', () => {
  it('passes a valid schedule with no errors or warnings', () => {
    const result = validateUniversalSchedule(schedule);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when name is missing', () => {
    const s = { ...schedule, name: '' };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('name'))).toBe(true);
  });

  it('errors when a holiday replacement references a missing shift definition', () => {
    const result = validateUniversalSchedule({
      ...schedule,
      holidayExceptions: [
        {
          id: 'missing-replacement',
          date: '2026-01-01',
          holidayName: 'Holiday',
          country: 'US',
          action: 'use_shift_definition',
          shiftDefinitionId: 'missing',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('unknown definition'))).toBe(true);
  });

  it('errors when a one-off replacement references a missing shift definition', () => {
    const result = validateUniversalSchedule({
      ...schedule,
      oneOffExceptions: [
        {
          id: 'missing-one-off',
          date: '2026-01-01',
          action: 'use_shift_definition',
          shiftDefinitionId: 'missing',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('One-off exception'))).toBe(true);
  });

  it('errors when anchorDate is missing', () => {
    const s = { ...schedule, anchorDate: '' };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('anchor date'))).toBe(true);
  });

  it('errors when anchorDate has wrong format', () => {
    const s = { ...schedule, anchorDate: '01-01-2026' };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('anchor date'))).toBe(true);
  });

  it('errors when sequence is empty', () => {
    const s = { ...schedule, sequence: [] };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('sequence'))).toBe(true);
  });

  it('errors when shiftDefinitions is empty', () => {
    const s = { ...schedule, shiftDefinitions: [] };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('definition'))).toBe(true);
  });

  it('errors when sequence item references unknown definition id', () => {
    const s = {
      ...schedule,
      sequence: [{ id: 'sx', shiftDefinitionId: 'unknown-def' }],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown-def'))).toBe(true);
  });

  it('errors when timed shift is missing startTime', () => {
    const badDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'bad1',
      startTime: undefined,
      endTime: '18:00',
    };
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [badDef, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'bad1' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.toLowerCase().includes('start') || e.toLowerCase().includes('end')
      )
    ).toBe(true);
  });

  it('errors when timed shift is missing endTime', () => {
    const badDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'bad2',
      startTime: '06:00',
      endTime: undefined,
    };
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [badDef, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'bad2' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.toLowerCase().includes('start') || e.toLowerCase().includes('end')
      )
    ).toBe(true);
  });

  it('errors when endTime < startTime and crossesMidnight is not set', () => {
    const badDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'bad3',
      startTime: '18:00',
      endTime: '06:00',
      crossesMidnight: false,
    };
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [badDef, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'bad3' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) =>
          e.toLowerCase().includes('crosses midnight') || e.toLowerCase().includes('ends before')
      )
    ).toBe(true);
  });

  it('errors when endTime equals startTime without overnight confirmation', () => {
    const badDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'bad4',
      startTime: '12:00',
      endTime: '12:00',
    };
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [badDef, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'bad4' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('24-hour'))).toBe(true);
  });

  it('allows a 24-hour timed shift when crossesMidnight confirms it', () => {
    const twentyFourHourDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'fire24',
      name: 'Station Duty',
      startTime: '08:00',
      endTime: '08:00',
      crossesMidnight: true,
      color: '#F44336',
      icon: 'flash',
    };
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [twentyFourHourDef, offDef],
      sequence: [
        { id: 's1', shiftDefinitionId: 'fire24' },
        { id: 's2', shiftDefinitionId: 'off1' },
        { id: 's3', shiftDefinitionId: 'off1' },
      ],
    };

    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when a shift reminder profile has unsupported lead times', () => {
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [
        {
          ...dayDef,
          reminderProfileId: 'day-reminders',
          reminderProfile: {
            earlyReminderHours: 80,
            prepTimeMinutes: 800,
          },
        },
        nightDef,
        offDef,
      ],
    };

    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('first reminder'))).toBe(true);
    expect(result.errors.some((error) => error.includes('prep time'))).toBe(true);
  });

  it('warns when no work shifts are in the sequence', () => {
    const allOffSchedule: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        { id: 's1', shiftDefinitionId: 'off1' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(allOffSchedule);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.toLowerCase().includes('no work'))).toBe(true);
  });

  it('warns when no off/rest shifts are in the sequence', () => {
    const allWorkSchedule: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        { id: 's1', shiftDefinitionId: 'day1' },
        { id: 's2', shiftDefinitionId: 'day1' },
      ],
    };
    const result = validateUniversalSchedule(allWorkSchedule);
    expect(result.valid).toBe(true);
    expect(
      result.warnings.some(
        (w) => w.toLowerCase().includes('rest') || w.toLowerCase().includes('off')
      )
    ).toBe(true);
  });

  it('warns when sequence length exceeds 90 days', () => {
    const longSeq = Array.from({ length: 91 }, (_, i) => ({
      id: `s${i}`,
      shiftDefinitionId: i % 2 === 0 ? 'day1' : 'off1',
    }));
    const s = { ...schedule, sequence: longSeq };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.toLowerCase().includes('90'))).toBe(true);
  });

  it('warns when multiple shifts share the same color', () => {
    // Clone dayDef and give it a different id/name but the same color
    const sameColorDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'day2',
      name: 'Day 2',
      color: '#2196F3', // same as dayDef — triggers duplicate color warning
    };
    // Include all defs referenced by the sequence, plus sameColorDef
    const s: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [dayDef, nightDef, offDef, sameColorDef],
    };
    const result = validateUniversalSchedule(s);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.toLowerCase().includes('color'))).toBe(true);
  });

  it('returns valid=true even when there are only warnings', () => {
    const allOffSchedule: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        { id: 's1', shiftDefinitionId: 'off1' },
        { id: 's2', shiftDefinitionId: 'off1' },
      ],
    };
    const result = validateUniversalSchedule(allOffSchedule);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});

// ── computeScheduleFingerprint ────────────────────────────────────────────────

describe('computeScheduleFingerprint', () => {
  it('produces the same fingerprint for the same schedule', () => {
    expect(computeScheduleFingerprint(schedule)).toBe(computeScheduleFingerprint(schedule));
  });

  it('produces a different fingerprint when the name changes', () => {
    const modified = { ...schedule, name: 'Different Name' };
    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('produces a different fingerprint when the sequence changes', () => {
    const modified: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        { id: 's1', shiftDefinitionId: 'night1' }, // was day1
        ...schedule.sequence.slice(1),
      ],
    };
    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('produces a different fingerprint when phaseOffset changes', () => {
    const modified = { ...schedule, phaseOffset: 3 };
    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('produces a different fingerprint when a definition is modified', () => {
    const modifiedDef: UniversalShiftDefinition = { ...dayDef, startTime: '07:00' };
    const modified: UniversalShiftSchedule = {
      ...schedule,
      shiftDefinitions: [modifiedDef, nightDef, offDef],
    };
    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('produces a different fingerprint when holiday exceptions change', () => {
    const modified: UniversalShiftSchedule = {
      ...schedule,
      holidayExceptions: [
        {
          id: 'holiday-xmas',
          date: '2026-01-01',
          holidayName: 'Holiday',
          country: 'US',
          action: 'mark_off',
        },
      ],
    };

    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('produces a different fingerprint when one-off exceptions change', () => {
    const modified: UniversalShiftSchedule = {
      ...schedule,
      oneOffExceptions: [
        {
          id: 'swap',
          date: '2026-01-03',
          action: 'use_shift_definition',
          shiftDefinitionId: 'day1',
        },
      ],
    };

    expect(computeScheduleFingerprint(schedule)).not.toBe(computeScheduleFingerprint(modified));
  });

  it('returns a non-empty hex string', () => {
    const fp = computeScheduleFingerprint(schedule);
    expect(fp).toMatch(/^[0-9a-f]+$/);
    expect(fp.length).toBeGreaterThan(0);
  });
});

// ── getUniversalScheduleStats ─────────────────────────────────────────────────

describe('getUniversalScheduleStats', () => {
  it('correctly counts work days and off days', () => {
    // schedule: 2 day + 2 night (work) + 2 off
    const stats = getUniversalScheduleStats(schedule);
    expect(stats.workDays).toBe(4);
    expect(stats.offDays).toBe(2);
    expect(stats.totalDays).toBe(6);
  });

  it('correctly counts night shifts', () => {
    const stats = getUniversalScheduleStats(schedule);
    // nightDef has countsAsNight=true; dayDef does not
    expect(stats.nightShifts).toBe(2);
  });

  it('returns correct avgWorkDaysPerWeek for 4-on 4-off', () => {
    const fourOnFourOff: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        { id: 's1', shiftDefinitionId: 'day1' },
        { id: 's2', shiftDefinitionId: 'day1' },
        { id: 's3', shiftDefinitionId: 'day1' },
        { id: 's4', shiftDefinitionId: 'day1' },
        { id: 's5', shiftDefinitionId: 'off1' },
        { id: 's6', shiftDefinitionId: 'off1' },
        { id: 's7', shiftDefinitionId: 'off1' },
        { id: 's8', shiftDefinitionId: 'off1' },
      ],
    };
    const stats = getUniversalScheduleStats(fourOnFourOff);
    // 4 work out of 8 total → (4/8) * 7 = 3.5
    expect(stats.avgWorkDaysPerWeek).toBeCloseTo(3.5);
  });

  it('tracks definition counts by name', () => {
    const stats = getUniversalScheduleStats(schedule);
    expect(stats.definitionCounts['Day']).toBe(2);
    expect(stats.definitionCounts['Night']).toBe(2);
    expect(stats.definitionCounts['Off']).toBe(2);
  });

  it('returns zero averages for an empty sequence', () => {
    const empty: UniversalShiftSchedule = { ...schedule, sequence: [] };
    const stats = getUniversalScheduleStats(empty);
    expect(stats.totalDays).toBe(0);
    expect(stats.workDays).toBe(0);
    expect(stats.avgWorkDaysPerWeek).toBe(0);
  });
});

describe('buildHolidayExceptionsFromHolidays', () => {
  it('materializes HolidayService holidays into schedule exceptions', () => {
    const exceptions = buildHolidayExceptionsFromHolidays(
      [
        {
          id: 'christmas',
          name: 'Christmas Day',
          date: '2026-12-25',
          country: 'gb',
          type: 'national',
          isPaid: true,
        },
      ],
      { action: 'mark_off' }
    );

    expect(exceptions).toEqual([
      {
        id: 'holiday:gb:2026-12-25:christmas',
        date: '2026-12-25',
        holidayName: 'Christmas Day',
        country: 'GB',
        action: 'mark_off',
        shiftDefinitionId: undefined,
        paidOverride: true,
        appliesToWorkShiftsOnly: true,
      },
    ]);
  });
});

// ── projectToLegacyShiftType ──────────────────────────────────────────────────

describe('projectToLegacyShiftType', () => {
  it('returns "off" for a non-work definition', () => {
    expect(projectToLegacyShiftType(offDef)).toBe('off');
  });

  it('returns "night" for a definition with countsAsNight=true', () => {
    expect(projectToLegacyShiftType(nightDef)).toBe('night');
  });

  it('returns "night" for a work def starting at or after 18:00', () => {
    const lateDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'late1',
      countsAsNight: false,
      startTime: '18:00',
      endTime: '22:00',
    };
    expect(projectToLegacyShiftType(lateDef)).toBe('night');
  });

  it('returns "night" for a work def starting before 06:00', () => {
    const earlyDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'early1',
      countsAsNight: false,
      startTime: '04:00',
      endTime: '12:00',
    };
    expect(projectToLegacyShiftType(earlyDef)).toBe('night');
  });

  it('returns "morning" for a work def starting 06:00', () => {
    expect(projectToLegacyShiftType(dayDef)).toBe('morning');
  });

  it('returns "morning" for a work def starting at 08:00', () => {
    const mornDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'morn1',
      startTime: '08:00',
      endTime: '16:00',
    };
    expect(projectToLegacyShiftType(mornDef)).toBe('morning');
  });

  it('returns "afternoon" for a work def starting at 12:00', () => {
    const aftDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'aft1',
      startTime: '12:00',
      endTime: '20:00',
    };
    expect(projectToLegacyShiftType(aftDef)).toBe('afternoon');
  });

  it('returns "afternoon" for a work def starting at 14:00', () => {
    const aftDef: UniversalShiftDefinition = {
      ...dayDef,
      id: 'aft2',
      startTime: '14:00',
      endTime: '22:00',
    };
    expect(projectToLegacyShiftType(aftDef)).toBe('afternoon');
  });

  it('returns "day" for an all_day work definition', () => {
    const allDayWorkDef: UniversalShiftDefinition = {
      id: 'travel1',
      name: 'Travel',
      kind: 'travel',
      timePolicy: 'all_day',
      activePolicy: 'all_day_active',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#FF7043',
      icon: 'airplane',
    };
    expect(projectToLegacyShiftType(allDayWorkDef)).toBe('day');
  });
});
