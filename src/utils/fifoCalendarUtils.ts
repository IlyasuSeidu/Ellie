/**
 * FIFO Calendar Utilities
 *
 * Pre-computes FIFO block position metadata for every day in a calendar month.
 * This drives connected block ribbons, fly-in/fly-out indicators, swing
 * transition markers, and tooltip content in the calendar visualization.
 */

import type { ShiftDay, ShiftCycle, ShiftType } from '@/types';
import { getFIFOBlockInfo } from './shiftUtils';

export interface FIFODayPosition {
  /** Whether this day is in a work or rest block */
  blockType: 'work' | 'rest';
  /** 1-based day within the current block */
  dayInBlock: number;
  /** Total days in the current block */
  blockLength: number;
  /** True if this is the first day of a block (work or rest) */
  isFirstDayOfBlock: boolean;
  /** True if this is the last day of a block (work or rest) */
  isLastDayOfBlock: boolean;
  /** True if the block continues from the previous calendar row */
  isFirstInRow: boolean;
  /** True if the block continues to the next calendar row */
  isLastInRow: boolean;
  /** Actual shift type (day/night for work, off for rest) */
  shiftType: ShiftType;
  /** True if this work day is the transition from day→night or night→day in a swing pattern */
  isSwingTransitionDay: boolean;
  /** True if this is the first day of a work block (fly-in) */
  isFlyInDay: boolean;
  /** True if this is the last day of a work block (fly-out) */
  isFlyOutDay: boolean;
}

export type FIFOPositionMap = Record<number, FIFODayPosition>;

/**
 * Compute FIFO block position metadata for every day in a calendar month.
 *
 * @param year - Calendar year
 * @param month - Calendar month (0-indexed, 0 = January)
 * @param shiftDays - ShiftDay array for the month (from getShiftDaysInRange)
 * @param shiftCycle - The user's shift cycle configuration
 * @param calendarGrid - The calendar grid (array of week rows, each 7 slots of day|null)
 * @returns Map from day number to FIFODayPosition, or null if not a FIFO roster
 */
export function computeFIFOBlockPositions(
  year: number,
  month: number,
  shiftDays: ShiftDay[],
  shiftCycle: ShiftCycle,
  calendarGrid: (number | null)[][]
): FIFOPositionMap | null {
  if (!shiftCycle.fifoConfig) return null;

  const positionMap: FIFOPositionMap = {};

  // Step 1: Build per-day block info from shiftUtils
  const dayInfoMap: Record<
    number,
    { blockType: 'work' | 'rest'; dayInBlock: number; blockLength: number }
  > = {};
  const dayShiftTypeMap: Record<number, ShiftType> = {};

  for (const sd of shiftDays) {
    const dayNum = parseInt(sd.date.split('-')[2], 10);
    const date = new Date(year, month, dayNum);
    const blockInfo = getFIFOBlockInfo(date, shiftCycle);

    if (blockInfo) {
      dayInfoMap[dayNum] = {
        blockType: blockInfo.inWorkBlock ? 'work' : 'rest',
        dayInBlock: blockInfo.dayInBlock,
        blockLength: blockInfo.blockLength,
      };
    }

    dayShiftTypeMap[dayNum] = sd.shiftType;
  }

  // Step 2: Build a row lookup — which row/column is each day in?
  const dayRowCol: Record<number, { row: number; col: number }> = {};
  for (let rowIdx = 0; rowIdx < calendarGrid.length; rowIdx++) {
    const week = calendarGrid[rowIdx];
    for (let colIdx = 0; colIdx < week.length; colIdx++) {
      const day = week[colIdx];
      if (day !== null) {
        dayRowCol[day] = { row: rowIdx, col: colIdx };
      }
    }
  }

  // Step 3: Get sorted list of valid days
  const daysInMonth = Object.keys(dayInfoMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Step 4: Build FIFODayPosition for each day
  for (const dayNum of daysInMonth) {
    const info = dayInfoMap[dayNum];
    if (!info) continue;

    const shiftType = dayShiftTypeMap[dayNum] ?? 'off';
    const { row } = dayRowCol[dayNum] ?? { row: 0, col: 0 };

    // Block boundary detection
    const isFirstDayOfBlock = info.dayInBlock === 1;
    const isLastDayOfBlock = info.dayInBlock === info.blockLength;

    // Row boundary detection: check if next/prev day in same block is in a different row
    const prevDay = dayNum - 1;
    const nextDay = dayNum + 1;

    const prevInSameBlock = dayInfoMap[prevDay]?.blockType === info.blockType && !isFirstDayOfBlock;
    const nextInSameBlock = dayInfoMap[nextDay]?.blockType === info.blockType && !isLastDayOfBlock;

    const prevInSameRow = dayRowCol[prevDay]?.row === row;
    const nextInSameRow = dayRowCol[nextDay]?.row === row;

    // isFirstInRow: block continues from prev row (prev day exists in same block but different row)
    const isFirstInRow = prevInSameBlock && !prevInSameRow;

    // isLastInRow: block continues to next row (next day exists in same block but different row)
    const isLastInRow = nextInSameBlock && !nextInSameRow;

    // Swing transition detection: work day where shift type differs from previous work day
    let isSwingTransitionDay = false;
    if (info.blockType === 'work' && info.dayInBlock > 1) {
      const prevShiftType = dayShiftTypeMap[prevDay];
      if (prevShiftType && prevShiftType !== shiftType && prevShiftType !== 'off') {
        isSwingTransitionDay = true;
      }
    }

    // Fly-in/fly-out: first and last days of work blocks
    const isFlyInDay = info.blockType === 'work' && isFirstDayOfBlock;
    const isFlyOutDay = info.blockType === 'work' && isLastDayOfBlock;

    positionMap[dayNum] = {
      blockType: info.blockType,
      dayInBlock: info.dayInBlock,
      blockLength: info.blockLength,
      isFirstDayOfBlock,
      isLastDayOfBlock,
      isFirstInRow,
      isLastInRow,
      shiftType,
      isSwingTransitionDay,
      isFlyInDay,
      isFlyOutDay,
    };
  }

  return positionMap;
}

/**
 * Extract contiguous runs of same block type within a calendar row.
 * Used by MonthlyCalendarCard to render connected ribbon backgrounds.
 */
export interface BlockRun {
  blockType: 'work' | 'rest';
  startCol: number;
  length: number;
  /** Whether the first cell in this run is the first day of the overall block */
  startsBlock: boolean;
  /** Whether the last cell in this run is the last day of the overall block */
  endsBlock: boolean;
}

export function getBlockRunsForRow(
  week: (number | null)[],
  positionMap: FIFOPositionMap
): BlockRun[] {
  const runs: BlockRun[] = [];
  let currentRun: BlockRun | null = null;

  for (let col = 0; col < week.length; col++) {
    const day = week[col];
    const pos = day !== null ? positionMap[day] : undefined;

    if (pos) {
      if (currentRun && currentRun.blockType === pos.blockType) {
        // Continue the run
        currentRun.length++;
        currentRun.endsBlock = pos.isLastDayOfBlock;
      } else {
        // Start a new run
        if (currentRun) runs.push(currentRun);
        currentRun = {
          blockType: pos.blockType,
          startCol: col,
          length: 1,
          // Row-wrap continuation should keep square edges; only true block starts get radius.
          startsBlock: pos.isFirstDayOfBlock,
          endsBlock: pos.isLastDayOfBlock,
        };
      }
    } else {
      // Null cell (empty slot) — end current run
      if (currentRun) {
        runs.push(currentRun);
        currentRun = null;
      }
    }
  }

  if (currentRun) runs.push(currentRun);

  return runs;
}
