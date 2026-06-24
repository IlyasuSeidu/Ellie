import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';
import { getShiftDaysInRange } from '@/utils/shiftUtils';
import {
  executeGetNextOccurrence,
  executeGetShiftForDate,
  executeGetShiftsInRange,
} from '@/utils/shiftQueryTools';

const dayDefinition: UniversalShiftDefinition = {
  id: 'day',
  name: 'Day',
  kind: 'work',
  timePolicy: 'timed',
  activePolicy: 'timed_window',
  startTime: '07:00',
  endTime: '19:00',
  crossesMidnight: false,
  countsAsWork: true,
  countsAsNight: false,
  countsForStats: true,
  color: '#147cff',
  icon: 'sunny-outline',
};

const nightDefinition: UniversalShiftDefinition = {
  id: 'night',
  name: 'Night',
  kind: 'work',
  timePolicy: 'timed',
  activePolicy: 'timed_window',
  startTime: '19:00',
  endTime: '07:00',
  crossesMidnight: true,
  countsAsWork: true,
  countsAsNight: true,
  countsForStats: true,
  color: '#20f4dc',
  icon: 'moon-outline',
};

const offDefinition: UniversalShiftDefinition = {
  id: 'off',
  name: 'Off',
  kind: 'off',
  timePolicy: 'none',
  activePolicy: 'not_active',
  countsAsWork: false,
  countsAsNight: false,
  countsForStats: true,
  color: '#5f7484',
  icon: 'home-outline',
};

function buildSchedule(sequenceIds: string[]): UniversalShiftSchedule {
  return {
    version: 3,
    name: 'Range behavior test schedule',
    timezone: 'UTC',
    anchorDate: '2026-01-01',
    phaseOffset: 0,
    source: 'manual',
    shiftDefinitions: [dayDefinition, nightDefinition, offDefinition],
    sequence: sequenceIds.map((shiftDefinitionId, index) => ({
      id: `sequence-${index}`,
      shiftDefinitionId,
    })),
  };
}

describe('voice shift query date range behavior', () => {
  it('calculates exact-date answers far before and far after the anchor date', () => {
    const schedule = buildSchedule(['day', 'night', 'off']);
    const knownNames = new Set(['Day', 'Night', 'Off']);

    expect(
      knownNames.has(
        executeGetShiftForDate({ date: '1926-01-01' }, schedule).universal?.definitionName ?? ''
      )
    ).toBe(true);
    expect(
      knownNames.has(
        executeGetShiftForDate({ date: '2126-01-01' }, schedule).universal?.definitionName ?? ''
      )
    ).toBe(true);
  });

  it('stops next-occurrence searches after 730 days even if the exact later date is calculable', () => {
    const schedule = buildSchedule([...Array.from({ length: 731 }, () => 'off'), 'night']);

    expect(
      executeGetNextOccurrence({ shiftType: 'night', fromDate: '2026-01-01' }, schedule)
    ).toEqual({ found: false });
    expect(executeGetShiftForDate({ date: '2028-01-02' }, schedule).universal?.definitionName).toBe(
      'Night'
    );
  });

  it('does not cap range queries in the local tool layer today', () => {
    const schedule = buildSchedule(['day', 'night', 'off']);

    const oneYear = executeGetShiftsInRange(
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      schedule
    );
    const tenYears = getShiftDaysInRange(
      new Date('2026-01-01T12:00:00Z'),
      new Date('2035-12-31T12:00:00Z'),
      schedule
    );

    expect(oneYear).toHaveLength(365);
    expect(tenYears).toHaveLength(3652);
  });
});
