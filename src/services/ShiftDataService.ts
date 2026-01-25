/**
 * Shift Data Service
 *
 * Provides shift calculations with intelligent caching.
 * Wraps shiftUtils functions and adds caching layer for performance.
 */

import { ShiftCycle, ShiftDay } from '@/types';
import {
  calculateShiftDay,
  getShiftDaysInRange as utilGetShiftDaysInRange,
  getNextShift,
  countWorkDays,
  getShiftStatistics,
} from '@/utils/shiftUtils';
import { logger } from '@/utils/logger';
import { IStorageService } from './StorageService';

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  PREFIX: 'shifts',
  MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * Shift Data Service class
 */
export class ShiftDataService {
  constructor(private storage: IStorageService) {}

  /**
   * Calculate shift for a specific date
   */
  calculateShiftForDate(date: Date, cycle: ShiftCycle): ShiftDay {
    logger.debug('Calculating shift for date', {
      date: date.toISOString(),
      pattern: cycle.patternType,
    });

    return calculateShiftDay(date, cycle);
  }

  /**
   * Get shift days in a date range with caching
   */
  async getShiftDaysInRange(
    start: Date,
    end: Date,
    cycle: ShiftCycle,
    userId?: string
  ): Promise<ShiftDay[]> {
    // Try cache first if userId provided
    if (userId) {
      const cached = await this.getCachedShifts(userId, start, end, cycle);
      if (cached) {
        logger.debug('Shifts retrieved from cache', {
          userId,
          count: cached.length,
        });
        return cached;
      }
    }

    // Calculate shifts
    const shifts = utilGetShiftDaysInRange(start, end, cycle);

    // Cache the results if userId provided
    if (userId) {
      await this.cacheShifts(userId, shifts, cycle);
    }

    logger.debug('Shifts calculated', { count: shifts.length });
    return shifts;
  }

  /**
   * Get next work day from a given date
   */
  getNextWorkDay(fromDate: Date, cycle: ShiftCycle): Date {
    logger.debug('Finding next work day', {
      fromDate: fromDate.toISOString(),
      pattern: cycle.patternType,
    });

    const nextShift = getNextShift(fromDate, cycle);
    if (!nextShift) {
      // If no work day found in next 365 days, return far future date
      const futureDate = new Date(fromDate);
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      return futureDate;
    }
    return nextShift;
  }

  /**
   * Get all work days in a specific month
   */
  async getWorkDaysInMonth(
    year: number,
    month: number,
    cycle: ShiftCycle,
    userId?: string
  ): Promise<ShiftDay[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month

    const allShifts = await this.getShiftDaysInRange(startDate, endDate, cycle, userId);

    return allShifts.filter((shift) => shift.isWorkDay);
  }

  /**
   * Generate shift calendar for multiple months
   */
  async generateShiftCalendar(
    cycle: ShiftCycle,
    months: number,
    userId?: string
  ): Promise<Map<string, ShiftDay>> {
    logger.info('Generating shift calendar', { months, userId });

    const calendar = new Map<string, ShiftDay>();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const shifts = await this.getShiftDaysInRange(startDate, endDate, cycle, userId);

    shifts.forEach((shift) => {
      calendar.set(shift.date, shift);
    });

    logger.info('Calendar generated', { entries: calendar.size });
    return calendar;
  }

  /**
   * Export shifts in a date range
   */
  // eslint-disable-next-line require-await
  async exportShifts(
    startDate: Date,
    endDate: Date,
    cycle: ShiftCycle,
    userId?: string
  ): Promise<ShiftDay[]> {
    logger.info('Exporting shifts', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return this.getShiftDaysInRange(startDate, endDate, cycle, userId);
  }

  /**
   * Count work days in a date range
   */
  countWorkDaysInRange(start: Date, end: Date, cycle: ShiftCycle): number {
    logger.debug('Counting work days', {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    return countWorkDays(start, end, cycle);
  }

  /**
   * Count night shifts in a date range
   */
  async countNightShiftsInRange(
    start: Date,
    end: Date,
    cycle: ShiftCycle,
    userId?: string
  ): Promise<number> {
    const shifts = await this.getShiftDaysInRange(start, end, cycle, userId);
    const nightShifts = shifts.filter((shift) => shift.isNightShift).length;

    logger.debug('Night shifts counted', { count: nightShifts });
    return nightShifts;
  }

  /**
   * Calculate working hours in a date range
   */
  calculateWorkingHours(
    start: Date,
    end: Date,
    cycle: ShiftCycle,
    hoursPerShift: number = 12
  ): number {
    logger.debug('Calculating working hours', {
      start: start.toISOString(),
      end: end.toISOString(),
      hoursPerShift,
    });

    const stats = getShiftStatistics(start, end, cycle);
    const totalShifts = stats.dayShifts + stats.nightShifts;
    const totalHours = totalShifts * hoursPerShift;

    logger.debug('Working hours calculated', { totalHours, totalShifts });
    return totalHours;
  }

  /**
   * Invalidate cached shifts for a user
   */
  async invalidateCache(userId: string): Promise<void> {
    const prefix = `${CACHE_CONFIG.PREFIX}:${userId}:`;
    await this.storage.clearPrefix(prefix);
    logger.info('Cache invalidated for user', { userId });
  }

  /**
   * Get cached shifts for a date range
   */
  private async getCachedShifts(
    userId: string,
    start: Date,
    end: Date,
    cycle: ShiftCycle
  ): Promise<ShiftDay[] | null> {
    try {
      // Get all months in the range
      const months = this.getMonthsInRange(start, end);

      const allShifts: ShiftDay[] = [];
      for (const { year, month } of months) {
        const cacheKey = this.getCacheKey(userId, year, month);
        const cached = await this.storage.get<{
          shifts: ShiftDay[];
          cycle: ShiftCycle;
        }>(cacheKey);

        // If any month is not cached or cycle changed, return null to recalculate
        if (!cached || !this.isSameCycle(cached.cycle, cycle)) {
          return null;
        }

        allShifts.push(...cached.shifts);
      }

      // Filter to exact date range
      const filtered = allShifts.filter((shift) => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= start && shiftDate <= end;
      });

      return filtered.length > 0 ? filtered : null;
    } catch (error) {
      logger.error('Failed to get cached shifts', error as Error, { userId });
      return null;
    }
  }

  /**
   * Cache shifts by month
   */
  private async cacheShifts(userId: string, shifts: ShiftDay[], cycle: ShiftCycle): Promise<void> {
    try {
      // Group shifts by month
      const shiftsByMonth = new Map<string, ShiftDay[]>();

      shifts.forEach((shift) => {
        const date = new Date(shift.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;

        const monthShifts = shiftsByMonth.get(key);
        if (monthShifts) {
          monthShifts.push(shift);
        } else {
          shiftsByMonth.set(key, [shift]);
        }
      });

      // Cache each month
      for (const [monthKey, monthShifts] of shiftsByMonth) {
        const [year, month] = monthKey.split('-').map(Number);
        const cacheKey = this.getCacheKey(userId, year, month);

        await this.storage.set(cacheKey, { shifts: monthShifts, cycle }, CACHE_CONFIG.MAX_AGE_MS);
      }

      logger.debug('Shifts cached', {
        userId,
        months: shiftsByMonth.size,
      });
    } catch (error) {
      logger.error('Failed to cache shifts', error as Error, { userId });
      // Don't throw - caching failure shouldn't break the operation
    }
  }

  /**
   * Generate cache key for a month
   */
  private getCacheKey(userId: string, year: number, month: number): string {
    return `${CACHE_CONFIG.PREFIX}:${userId}:${year}-${month}`;
  }

  /**
   * Get all months in a date range
   */
  private getMonthsInRange(start: Date, end: Date): Array<{ year: number; month: number }> {
    const months: Array<{ year: number; month: number }> = [];
    const current = new Date(start);

    while (current <= end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Check if two shift cycles are the same
   */
  private isSameCycle(cycle1: ShiftCycle, cycle2: ShiftCycle): boolean {
    return (
      cycle1.patternType === cycle2.patternType &&
      cycle1.daysOn === cycle2.daysOn &&
      cycle1.nightsOn === cycle2.nightsOn &&
      cycle1.daysOff === cycle2.daysOff &&
      cycle1.startDate === cycle2.startDate &&
      cycle1.phaseOffset === cycle2.phaseOffset
    );
  }
}

// Note: Singleton instance should be created at runtime with proper storage
// For testing, create instances directly with mock storage
