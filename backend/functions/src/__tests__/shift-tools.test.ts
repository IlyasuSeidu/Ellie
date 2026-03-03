import { calculateShiftDay, executeTool } from '../shift-tools';
import { ShiftCycle } from '../types';

describe('shift-tools', () => {
  const fifoCycle: ShiftCycle = {
    patternType: 'FIFO_8_6',
    rosterType: 'fifo',
    shiftSystem: '2-shift',
    daysOn: 8,
    nightsOn: 0,
    daysOff: 6,
    startDate: '2024-01-01',
    phaseOffset: 0,
    fifoConfig: {
      workBlockDays: 8,
      restBlockDays: 6,
      workBlockPattern: 'straight-days',
    },
  };

  const rotatingCycle: ShiftCycle = {
    patternType: 'STANDARD_4_4_4',
    rosterType: 'rotating',
    shiftSystem: '2-shift',
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2024-01-01',
    phaseOffset: 0,
  };

  it('calculates FIFO work and rest days correctly', () => {
    const workDay = calculateShiftDay(new Date('2024-01-03'), fifoCycle);
    const restDay = calculateShiftDay(new Date('2024-01-10'), fifoCycle);

    expect(workDay.shiftType).toBe('day');
    expect(workDay.isWorkDay).toBe(true);
    expect(restDay.shiftType).toBe('off');
    expect(restDay.isWorkDay).toBe(false);
  });

  it('dispatches get_next_rest_block', () => {
    const result = executeTool('get_next_rest_block', { fromDate: '2024-01-05' }, fifoCycle) as {
      found: boolean;
      blockType: string;
      startDate: string;
      daysUntilStart: number;
    };

    expect(result.found).toBe(true);
    expect(result.blockType).toBe('rest');
    expect(result.startDate).toBe('2024-01-09');
    expect(result.daysUntilStart).toBe(4);
  });

  it('dispatches days_until_work', () => {
    const result = executeTool('days_until_work', { fromDate: '2024-01-11' }, fifoCycle) as {
      found: boolean;
      daysUntil: number;
      targetDate: string;
    };

    expect(result.found).toBe(true);
    expect(result.daysUntil).toBe(4);
    expect(result.targetDate).toBe('2024-01-15');
  });

  it('dispatches current_block_info for rotating cycle', () => {
    const result = executeTool('current_block_info', { date: '2024-01-06' }, rotatingCycle) as {
      rosterType: string;
      blockType: string;
      shiftType: string;
      dayInBlock: number;
    };

    expect(result.rosterType).toBe('rotating');
    expect(result.blockType).toBe('work');
    expect(result.shiftType).toBe('night');
    expect(result.dayInBlock).toBeGreaterThan(0);
  });

  it('keeps existing tools working', () => {
    const result = executeTool(
      'get_next_occurrence',
      { shiftType: 'off', fromDate: '2024-01-01' },
      rotatingCycle
    ) as { found: boolean; shiftDay?: { date: string; shiftType: string } };

    expect(result.found).toBe(true);
    expect(result.shiftDay?.date).toBe('2024-01-09');
    expect(result.shiftDay?.shiftType).toBe('off');
  });
});
