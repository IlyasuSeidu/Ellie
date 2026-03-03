import { RosterType, ShiftPattern, ShiftSystem, type ShiftCycle } from '@/types';
import { getShiftDaysInRange, getShiftStatistics } from '@/utils/shiftUtils';

describe('shiftUtils performance', () => {
  const rotatingCycle: ShiftCycle = {
    patternType: ShiftPattern.STANDARD_4_4_4,
    shiftSystem: ShiftSystem.TWO_SHIFT,
    rosterType: RosterType.ROTATING,
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2026-01-01',
    phaseOffset: 0,
  };

  const fifoCycle: ShiftCycle = {
    patternType: ShiftPattern.FIFO_8_6,
    shiftSystem: ShiftSystem.TWO_SHIFT,
    rosterType: RosterType.FIFO,
    daysOn: 8,
    nightsOn: 0,
    daysOff: 6,
    startDate: '2026-01-01',
    phaseOffset: 0,
    fifoConfig: {
      workBlockDays: 8,
      restBlockDays: 6,
      workBlockPattern: 'straight-days',
    },
  };

  it('generates a 10-year rotating range within acceptable time', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2035-12-31');
    const startedAt = Date.now();

    const days = getShiftDaysInRange(start, end, rotatingCycle);
    const elapsedMs = Date.now() - startedAt;

    expect(days.length).toBeGreaterThan(3600);
    expect(elapsedMs).toBeLessThan(2500);
  });

  it('generates a 10-year FIFO range and stats within acceptable time', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2035-12-31');
    const startedAt = Date.now();

    const days = getShiftDaysInRange(start, end, fifoCycle);
    const stats = getShiftStatistics(start, end, fifoCycle);
    const elapsedMs = Date.now() - startedAt;

    expect(days.length).toBeGreaterThan(3600);
    expect(stats.totalDays).toBe(days.length);
    expect(elapsedMs).toBeLessThan(2500);
  });
});
