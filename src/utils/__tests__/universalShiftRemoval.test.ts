import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { UniversalShiftSchedule } from '@/types';
import { buildShiftCycle, calculateShiftDay, getShiftDaysInRange } from '@/utils/shiftUtils';
import {
  isPersistedOnboardingComplete,
  sanitizePersistedOnboardingData,
} from '@/utils/onboardingPersistence';
import {
  executeGetNextOccurrence,
  executeGetShiftForDate,
  executeGetStatistics,
} from '@/utils/shiftQueryTools';
import { buildSystemPrompt } from '@/utils/voiceAssistantPrompts';

const universalSchedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Universal Refinery Rotation',
  timezone: 'UTC',
  anchorDate: '2026-05-01',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Refinery Day',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '06:00',
      endTime: '18:00',
      durationMinutes: 720,
      crossesMidnight: false,
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#2563EB',
      icon: 'sunny-outline',
    },
    {
      id: 'night',
      name: 'Control Room Night',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '18:00',
      endTime: '06:00',
      durationMinutes: 720,
      crossesMidnight: true,
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#7C3AED',
      icon: 'moon-outline',
    },
    {
      id: 'off',
      name: 'Recovery Day',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#78716C',
      icon: 'home-outline',
    },
  ],
  sequence: [
    { id: 'seq-1', shiftDefinitionId: 'day' },
    { id: 'seq-2', shiftDefinitionId: 'night' },
    { id: 'seq-3', shiftDefinitionId: 'off' },
  ],
};

describe('universal-only shift model', () => {
  it('builds and calculates shifts from only universalSchedule', () => {
    const data: OnboardingData = {
      name: 'Amina',
      universalSchedule,
    };

    const cycle = buildShiftCycle(data);
    expect(cycle).toBe(universalSchedule);

    const dayShift = calculateShiftDay(new Date('2026-05-01T12:00:00Z'), universalSchedule);
    expect(dayShift.isWorkDay).toBe(true);
    expect(dayShift.universal?.definitionName).toBe('Refinery Day');
    expect(dayShift.universal?.color).toBe('#2563EB');
    expect(dayShift.universal?.icon).toBe('sunny-outline');

    const nightShift = calculateShiftDay(new Date('2026-05-02T12:00:00Z'), universalSchedule);
    expect(nightShift.isNightShift).toBe(true);
    expect(nightShift.universal?.crossesMidnight).toBe(true);

    const offShift = calculateShiftDay(new Date('2026-05-03T12:00:00Z'), universalSchedule);
    expect(offShift.isWorkDay).toBe(false);
  });

  it('sanitizes persistence by stripping legacy fields and requiring a complete universal schedule', () => {
    const persisted = sanitizePersistedOnboardingData({
      name: 'Amina',
      unknownScheduleField: 'removed',
      universalSchedule,
    });

    expect(persisted).toEqual({ name: 'Amina', universalSchedule });
    expect(isPersistedOnboardingComplete(persisted)).toBe(true);
    expect(isPersistedOnboardingComplete({ name: 'Amina' })).toBe(false);
  });

  it('answers voice assistant tools using universal shift definitions', () => {
    expect(
      executeGetShiftForDate({ date: '2026-05-02' }, universalSchedule).universal?.definitionName
    ).toBe('Control Room Night');

    const stats = executeGetStatistics(
      { startDate: '2026-05-01', endDate: '2026-05-03' },
      universalSchedule
    );
    expect(stats.totalShifts).toBe(2);
    expect(stats.definitionCounts).toEqual({
      'Refinery Day': 1,
      'Control Room Night': 1,
      'Recovery Day': 1,
    });

    const nextNight = executeGetNextOccurrence(
      { shiftType: 'Control Room Night', fromDate: '2026-05-01' },
      universalSchedule
    );
    expect(nextNight).toMatchObject({ found: true, date: '2026-05-02', daysUntil: 1 });
  });

  it('builds a universal-only voice prompt without legacy roster language', () => {
    const prompt = buildSystemPrompt({
      name: 'Amina',
      occupation: 'Refinery operator',
      currentDate: '2026-05-01',
      currentTime: '08:00',
      shiftCycle: universalSchedule,
      scheduleName: universalSchedule.name,
    });

    expect(prompt).toContain('Universal Refinery Rotation');
    expect(prompt).toContain('Refinery Day (work)');
    expect(prompt).toContain('Control Room Night (work)');
    expect(prompt).toContain('If the user asks about a specific date, use get_shift_for_date.');
    expect(prompt).toContain(
      'If they ask about a range (week, month, next 7 days, next 14 days, last week, end of the month, from June 12 to June 27), use get_shifts_in_range.'
    );
    expect(prompt).toContain('"next two weeks Saturday" mean the Saturday');
    expect(prompt).toContain('"next week Saturday" or "Saturday next week"');
    expect(prompt).toContain('"Next 7 days" means the current date through six days');
    expect(prompt).toContain('"Last week" means the previous Sunday through Saturday');
    expect(prompt).toContain('"first Saturday in August" are exact dates');
    expect(prompt).toContain('For all range questions, call get_shifts_in_range');
    expect(prompt).toContain('If a date phrase can reasonably mean two different things');
    expect(prompt).not.toContain('legacy shift pattern');
  });

  it('generates ranges from arbitrary universal patterns', () => {
    const days = getShiftDaysInRange(
      new Date('2026-05-01T12:00:00Z'),
      new Date('2026-05-06T12:00:00Z'),
      universalSchedule
    );

    expect(days.map((day) => day.universal?.definitionName)).toEqual([
      'Refinery Day',
      'Control Room Night',
      'Recovery Day',
      'Refinery Day',
      'Control Room Night',
      'Recovery Day',
    ]);
  });
});
