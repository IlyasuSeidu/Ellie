import { RosterType, ShiftPattern, ShiftSystem, type ShiftCycle, type ShiftDay } from '@/types';
import { computeFIFOBlockPositions, getBlockRunsForRow } from '../fifoCalendarUtils';

const buildFIFOCycle = (): ShiftCycle => ({
  patternType: ShiftPattern.FIFO_8_6,
  shiftSystem: ShiftSystem.TWO_SHIFT,
  rosterType: RosterType.FIFO,
  daysOn: 8,
  nightsOn: 0,
  daysOff: 6,
  startDate: '2026-02-01',
  phaseOffset: 0,
  fifoConfig: {
    workBlockDays: 8,
    restBlockDays: 6,
    workBlockPattern: 'straight-days',
  },
});

const buildShiftDays = (): ShiftDay[] => {
  const days: ShiftDay[] = [];
  for (let day = 1; day <= 14; day += 1) {
    let shiftType: ShiftDay['shiftType'] = 'off';
    if (day <= 4) {
      shiftType = 'day';
    } else if (day <= 8) {
      shiftType = 'night';
    }
    days.push({
      date: `2026-02-${String(day).padStart(2, '0')}`,
      isWorkDay: shiftType !== 'off',
      isNightShift: shiftType === 'night',
      shiftType,
    });
  }
  return days;
};

describe('fifoCalendarUtils', () => {
  it('computes FIFO block positions including row wrap, fly markers, and swing transition', () => {
    const shiftCycle = buildFIFOCycle();
    const shiftDays = buildShiftDays();
    const calendarGrid: (number | null)[][] = [
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14],
    ];

    const positions = computeFIFOBlockPositions(2026, 1, shiftDays, shiftCycle, calendarGrid);
    expect(positions).not.toBeNull();
    if (!positions) return;

    expect(positions[1]).toMatchObject({
      blockType: 'work',
      dayInBlock: 1,
      blockLength: 8,
      isFirstDayOfBlock: true,
      isFlyInDay: true,
      isFlyOutDay: false,
    });

    expect(positions[7]).toMatchObject({
      blockType: 'work',
      isLastInRow: true,
      isLastDayOfBlock: false,
    });

    expect(positions[8]).toMatchObject({
      blockType: 'work',
      dayInBlock: 8,
      isFirstInRow: true,
      isLastDayOfBlock: true,
      isFlyOutDay: true,
    });

    expect(positions[9]).toMatchObject({
      blockType: 'rest',
      dayInBlock: 1,
      blockLength: 6,
      isFirstDayOfBlock: true,
      shiftType: 'off',
    });

    expect(positions[5].isSwingTransitionDay).toBe(true);
    expect(positions[4].isSwingTransitionDay).toBe(false);
  });

  it('returns null when cycle is not FIFO-configured', () => {
    const nonFIFO: ShiftCycle = {
      ...buildFIFOCycle(),
      fifoConfig: undefined,
      rosterType: RosterType.ROTATING,
    };
    const result = computeFIFOBlockPositions(2026, 1, buildShiftDays(), nonFIFO, []);
    expect(result).toBeNull();
  });

  it('extracts contiguous block runs per row for ribbon rendering', () => {
    const shiftCycle = buildFIFOCycle();
    const shiftDays = buildShiftDays();
    const week1: (number | null)[] = [1, 2, 3, 4, 5, 6, 7];
    const week2: (number | null)[] = [8, 9, 10, 11, 12, 13, 14];
    const calendarGrid = [week1, week2];

    const positions = computeFIFOBlockPositions(2026, 1, shiftDays, shiftCycle, calendarGrid);
    expect(positions).not.toBeNull();
    if (!positions) return;

    const runs1 = getBlockRunsForRow(week1, positions);
    expect(runs1).toEqual([
      {
        blockType: 'work',
        startCol: 0,
        length: 7,
        startsBlock: true,
        endsBlock: false,
      },
    ]);

    const runs2 = getBlockRunsForRow(week2, positions);
    expect(runs2).toEqual([
      {
        blockType: 'work',
        startCol: 0,
        length: 1,
        startsBlock: false,
        endsBlock: true,
      },
      {
        blockType: 'rest',
        startCol: 1,
        length: 6,
        startsBlock: true,
        endsBlock: true,
      },
    ]);
  });
});
