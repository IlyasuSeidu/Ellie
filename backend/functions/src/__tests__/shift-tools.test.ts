import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateShiftDay, executeTool } from '../shift-tools';
import { ShiftCycle } from '../types';

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

test('calculates FIFO work and rest days correctly', () => {
  const workDay = calculateShiftDay(new Date('2024-01-03'), fifoCycle);
  const restDay = calculateShiftDay(new Date('2024-01-10'), fifoCycle);

  assert.equal(workDay.shiftType, 'day');
  assert.equal(workDay.isWorkDay, true);
  assert.equal(restDay.shiftType, 'off');
  assert.equal(restDay.isWorkDay, false);
});

test('dispatches get_next_rest_block', () => {
  const result = executeTool('get_next_rest_block', { fromDate: '2024-01-05' }, fifoCycle) as {
    found: boolean;
    blockType: string;
    startDate: string;
    daysUntilStart: number;
  };

  assert.equal(result.found, true);
  assert.equal(result.blockType, 'rest');
  assert.equal(result.startDate, '2024-01-09');
  assert.equal(result.daysUntilStart, 4);
});

test('dispatches days_until_work', () => {
  const result = executeTool('days_until_work', { fromDate: '2024-01-11' }, fifoCycle) as {
    found: boolean;
    daysUntil: number;
    targetDate: string;
  };

  assert.equal(result.found, true);
  assert.equal(result.daysUntil, 4);
  assert.equal(result.targetDate, '2024-01-15');
});

test('dispatches current_block_info for rotating cycle', () => {
  const result = executeTool('current_block_info', { date: '2024-01-06' }, rotatingCycle) as {
    rosterType: string;
    blockType: string;
    shiftType: string;
    dayInBlock: number;
  };

  assert.equal(result.rosterType, 'rotating');
  assert.equal(result.blockType, 'work');
  assert.equal(result.shiftType, 'night');
  assert.ok(result.dayInBlock > 0);
});

test('keeps existing tools working', () => {
  const result = executeTool(
    'get_next_occurrence',
    { shiftType: 'off', fromDate: '2024-01-01' },
    rotatingCycle
  ) as { found: boolean; shiftDay?: { date: string; shiftType: string } };

  assert.equal(result.found, true);
  assert.equal(result.shiftDay?.date, '2024-01-09');
  assert.equal(result.shiftDay?.shiftType, 'off');
});
