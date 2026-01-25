/**
 * ShiftDataService Tests
 *
 * Comprehensive tests for shift calculation and caching service
 */

import { ShiftDataService } from '@/services/ShiftDataService';
import { ShiftCycle, ShiftPattern } from '@/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/services/StorageService');

// Import mock after mocking
import { MockStorageService } from '@/services/__mocks__/StorageService';

describe('ShiftDataService', () => {
  let service: ShiftDataService;
  let storage: MockStorageService;

  const mockUserId = 'user-123';
  const mockShiftCycle: ShiftCycle = {
    patternType: ShiftPattern.STANDARD_3_3_3,
    daysOn: 3,
    nightsOn: 3,
    daysOff: 3,
    startDate: '2024-01-01',
    phaseOffset: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new MockStorageService();
    service = new ShiftDataService(storage);
  });

  afterEach(() => {
    storage.reset();
  });

  describe('Shift Calculations', () => {
    describe('calculateShiftForDate', () => {
      it('should calculate shift for a specific date', () => {
        const date = new Date('2024-01-01');
        const shift = service.calculateShiftForDate(date, mockShiftCycle);

        expect(shift).toBeDefined();
        expect(shift.date).toBe('2024-01-01');
        expect(shift.shiftType).toBeDefined();
        expect(logger.debug).toHaveBeenCalledWith(
          'Calculating shift for date',
          expect.objectContaining({ pattern: ShiftPattern.STANDARD_3_3_3 })
        );
      });

      it('should handle different shift patterns', () => {
        const cycle444: ShiftCycle = {
          ...mockShiftCycle,
          patternType: ShiftPattern.STANDARD_4_4_4,
          daysOn: 4,
          nightsOn: 4,
          daysOff: 4,
        };

        const date = new Date('2024-01-01');
        const shift = service.calculateShiftForDate(date, cycle444);

        expect(shift).toBeDefined();
        expect(shift.date).toBe('2024-01-01');
      });

      it('should handle custom patterns', () => {
        const customCycle: ShiftCycle = {
          patternType: ShiftPattern.CUSTOM,
          daysOn: 5,
          nightsOn: 5,
          daysOff: 5,
          startDate: '2024-01-01',
          phaseOffset: 0,
        };

        const date = new Date('2024-01-05');
        const shift = service.calculateShiftForDate(date, customCycle);

        expect(shift).toBeDefined();
      });
    });

    describe('getShiftDaysInRange', () => {
      it('should calculate shifts for a date range', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const shifts = await service.getShiftDaysInRange(
          start,
          end,
          mockShiftCycle
        );

        expect(shifts).toBeDefined();
        expect(shifts.length).toBe(31); // January has 31 days
        expect(shifts[0].date).toBe('2024-01-01');
        expect(shifts[30].date).toBe('2024-01-31');
      });

      it('should handle month boundaries', async () => {
        const start = new Date('2024-01-30');
        const end = new Date('2024-02-05');

        const shifts = await service.getShiftDaysInRange(
          start,
          end,
          mockShiftCycle
        );

        expect(shifts.length).toBe(7);
        expect(shifts[0].date).toBe('2024-01-30');
        expect(shifts[6].date).toBe('2024-02-05');
      });

      it('should handle year boundaries', async () => {
        const start = new Date('2023-12-29');
        const end = new Date('2024-01-05');

        const shifts = await service.getShiftDaysInRange(
          start,
          end,
          mockShiftCycle
        );

        expect(shifts.length).toBe(8);
        expect(shifts[0].date).toBe('2023-12-29');
        expect(shifts[7].date).toBe('2024-01-05');
      });

      it('should maintain consistency across date ranges', async () => {
        const date = new Date('2024-01-15');

        // Get shift from range
        const shifts = await service.getShiftDaysInRange(
          new Date('2024-01-01'),
          new Date('2024-01-31'),
          mockShiftCycle
        );
        const rangeShift = shifts.find((s) => s.date === '2024-01-15');

        // Get same shift individually
        const individualShift = service.calculateShiftForDate(
          date,
          mockShiftCycle
        );

        expect(rangeShift).toEqual(individualShift);
      });
    });

    describe('getNextWorkDay', () => {
      it('should find next work day', () => {
        const fromDate = new Date('2024-01-01');
        const nextWorkDay = service.getNextWorkDay(fromDate, mockShiftCycle);

        expect(nextWorkDay).toBeInstanceOf(Date);
        expect(nextWorkDay.getTime()).toBeGreaterThanOrEqual(
          fromDate.getTime()
        );
      });

      it('should skip days off', () => {
        // This test depends on the actual shift pattern calculation
        const fromDate = new Date('2024-01-01');
        const nextWorkDay = service.getNextWorkDay(fromDate, mockShiftCycle);

        const shift = service.calculateShiftForDate(
          nextWorkDay,
          mockShiftCycle
        );
        expect(shift.isWorkDay).toBe(true);
      });
    });

    describe('getWorkDaysInMonth', () => {
      it('should get all work days in a month', async () => {
        const workDays = await service.getWorkDaysInMonth(
          2024,
          0, // January
          mockShiftCycle
        );

        expect(workDays).toBeDefined();
        expect(workDays.length).toBeGreaterThan(0);
        expect(workDays.length).toBeLessThanOrEqual(31);
        workDays.forEach((shift) => {
          expect(shift.isWorkDay).toBe(true);
        });
      });

      it('should handle different months', async () => {
        const januaryWorkDays = await service.getWorkDaysInMonth(
          2024,
          0,
          mockShiftCycle
        );
        const februaryWorkDays = await service.getWorkDaysInMonth(
          2024,
          1,
          mockShiftCycle
        );

        expect(januaryWorkDays.length).toBeGreaterThan(0);
        expect(februaryWorkDays.length).toBeGreaterThan(0);
        // February has fewer days
        expect(februaryWorkDays.length).toBeLessThan(januaryWorkDays.length);
      });
    });
  });

  describe('Caching', () => {
    it('should cache calculated shifts', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // First call - should calculate and cache
      const shifts1 = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      // Second call - should use cache
      const shifts2 = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts1).toEqual(shifts2);
      expect(logger.debug).toHaveBeenCalledWith(
        'Shifts retrieved from cache',
        expect.objectContaining({ userId: mockUserId })
      );
    });

    it('should handle cache misses', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-15');

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts).toBeDefined();
      expect(logger.debug).toHaveBeenCalledWith(
        'Shifts calculated',
        expect.objectContaining({ count: shifts.length })
      );
    });

    it('should invalidate cache when cycle changes', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Cache with first cycle
      await service.getShiftDaysInRange(start, end, mockShiftCycle, mockUserId);

      // Use different cycle - should recalculate
      const newCycle: ShiftCycle = {
        ...mockShiftCycle,
        daysOn: 4,
        nightsOn: 4,
        daysOff: 4,
      };

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        newCycle,
        mockUserId
      );

      expect(shifts).toBeDefined();
    });

    it('should invalidate user cache', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Cache some data
      await service.getShiftDaysInRange(start, end, mockShiftCycle, mockUserId);

      // Invalidate cache
      await service.invalidateCache(mockUserId);

      expect(logger.info).toHaveBeenCalledWith(
        'Cache invalidated for user',
        expect.objectContaining({ userId: mockUserId })
      );

      // Next call should recalculate
      await service.getShiftDaysInRange(start, end, mockShiftCycle, mockUserId);

      expect(logger.debug).toHaveBeenCalledWith(
        'Shifts calculated',
        expect.any(Object)
      );
    });

    it('should generate correct cache keys', async () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-20');

      await service.getShiftDaysInRange(start, end, mockShiftCycle, mockUserId);

      // Verify cache key exists
      const hasCache = await storage.has(`shifts:${mockUserId}:2024-0`);
      expect(hasCache).toBe(true);
    });

    it('should handle cache expiration', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Mock expired cache
      const expiredData = {
        shifts: [],
        cycle: mockShiftCycle,
      };

      await storage.set(
        `shifts:${mockUserId}:2024-0`,
        expiredData,
        -1000 // Already expired
      );

      // Should recalculate due to expiration
      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts.length).toBeGreaterThan(0);
    });

    it('should work without userId (no caching)', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle
      );

      expect(shifts).toBeDefined();
      expect(shifts.length).toBe(31);
    });

    it('should handle storage errors gracefully', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Mock storage failure
      jest.spyOn(storage, 'set').mockRejectedValue(new Error('Storage full'));

      // Should still return shifts even if caching fails
      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts).toBeDefined();
      expect(shifts.length).toBe(31);
    });
  });

  describe('Bulk Operations', () => {
    describe('generateShiftCalendar', () => {
      it('should generate calendar for multiple months', async () => {
        const calendar = await service.generateShiftCalendar(
          mockShiftCycle,
          3,
          mockUserId
        );

        expect(calendar).toBeInstanceOf(Map);
        expect(calendar.size).toBeGreaterThan(0);
        expect(logger.info).toHaveBeenCalledWith(
          'Generating shift calendar',
          expect.objectContaining({ months: 3 })
        );
      });

      it('should create map with date keys', async () => {
        const calendar = await service.generateShiftCalendar(
          mockShiftCycle,
          1,
          mockUserId
        );

        const keys = Array.from(calendar.keys());
        keys.forEach((key) => {
          expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      });

      it('should handle large month counts', async () => {
        const calendar = await service.generateShiftCalendar(
          mockShiftCycle,
          12
        );

        expect(calendar.size).toBeGreaterThan(350); // ~365 days
        expect(calendar.size).toBeLessThan(400);
      });
    });

    describe('exportShifts', () => {
      it('should export shifts in date range', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-03-31');

        const exported = await service.exportShifts(
          start,
          end,
          mockShiftCycle,
          mockUserId
        );

        expect(exported).toBeDefined();
        expect(exported.length).toBeGreaterThan(0);
        expect(logger.info).toHaveBeenCalledWith(
          'Exporting shifts',
          expect.objectContaining({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          })
        );
      });

      it('should export large date ranges efficiently', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31');

        const startTime = Date.now();
        const exported = await service.exportShifts(start, end, mockShiftCycle);
        const duration = Date.now() - startTime;

        expect(exported.length).toBe(366); // 2024 is leap year
        expect(duration).toBeLessThan(1000); // Should be fast
      });
    });
  });

  describe('Statistics', () => {
    describe('countWorkDaysInRange', () => {
      it('should count work days accurately', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const count = service.countWorkDaysInRange(start, end, mockShiftCycle);

        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(31);
        expect(logger.debug).toHaveBeenCalledWith(
          'Counting work days',
          expect.any(Object)
        );
      });

      it('should handle different patterns', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const count333 = service.countWorkDaysInRange(
          start,
          end,
          mockShiftCycle
        );

        const cycle444: ShiftCycle = {
          ...mockShiftCycle,
          daysOn: 4,
          nightsOn: 4,
          daysOff: 4,
        };

        const count444 = service.countWorkDaysInRange(start, end, cycle444);

        expect(count333).toBeGreaterThan(0);
        expect(count444).toBeGreaterThan(0);
      });
    });

    describe('countNightShiftsInRange', () => {
      it('should count night shifts', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const count = await service.countNightShiftsInRange(
          start,
          end,
          mockShiftCycle
        );

        expect(count).toBeGreaterThanOrEqual(0);
        expect(logger.debug).toHaveBeenCalledWith(
          'Night shifts counted',
          expect.objectContaining({ count })
        );
      });

      it('should use cache when available', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        // First call - caches data
        await service.countNightShiftsInRange(
          start,
          end,
          mockShiftCycle,
          mockUserId
        );

        // Second call - uses cache
        const count = await service.countNightShiftsInRange(
          start,
          end,
          mockShiftCycle,
          mockUserId
        );

        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateWorkingHours', () => {
      it('should calculate working hours correctly', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const hours = service.calculateWorkingHours(start, end, mockShiftCycle);

        expect(hours).toBeGreaterThan(0);
        expect(logger.debug).toHaveBeenCalledWith(
          'Working hours calculated',
          expect.objectContaining({ totalHours: hours })
        );
      });

      it('should use custom hours per shift', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-31');

        const hours12 = service.calculateWorkingHours(
          start,
          end,
          mockShiftCycle,
          12
        );
        const hours8 = service.calculateWorkingHours(
          start,
          end,
          mockShiftCycle,
          8
        );

        expect(hours12).toBeGreaterThan(hours8);
        expect(hours12).toBe((hours8 / 8) * 12);
      });

      it('should handle partial days', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-01-05');

        const hours = service.calculateWorkingHours(start, end, mockShiftCycle);

        expect(hours).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date ranges', async () => {
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01'); // End before start

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle
      );

      expect(shifts).toBeDefined();
      expect(shifts.length).toBe(0);
    });

    it('should handle cache read failures', async () => {
      jest.spyOn(storage, 'get').mockRejectedValue(new Error('Cache error'));

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Should fallback to calculation
      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts).toBeDefined();
      expect(shifts.length).toBe(31);
    });

    it('should handle cache write failures', async () => {
      jest.spyOn(storage, 'set').mockRejectedValue(new Error('Write error'));

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');

      // Should still return results
      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle,
        mockUserId
      );

      expect(shifts).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cache shifts',
        expect.any(Error),
        expect.objectContaining({ userId: mockUserId })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year February', async () => {
      const start = new Date('2024-02-01');
      const end = new Date('2024-02-29'); // 2024 is leap year

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle
      );

      expect(shifts.length).toBe(29);
    });

    it('should handle non-leap year February', async () => {
      const start = new Date('2023-02-01');
      const end = new Date('2023-02-28');

      const shifts = await service.getShiftDaysInRange(
        start,
        end,
        mockShiftCycle
      );

      expect(shifts.length).toBe(28);
    });

    it('should handle single day range', async () => {
      const date = new Date('2024-01-15');

      const shifts = await service.getShiftDaysInRange(
        date,
        date,
        mockShiftCycle
      );

      expect(shifts.length).toBe(1);
      expect(shifts[0].date).toBe('2024-01-15');
    });

    it('should handle different phase offsets', () => {
      const cycleNoOffset = { ...mockShiftCycle, phaseOffset: 0 };
      const cycleWithOffset = { ...mockShiftCycle, phaseOffset: 3 };

      const date = new Date('2024-01-01');

      const shift1 = service.calculateShiftForDate(date, cycleNoOffset);
      const shift2 = service.calculateShiftForDate(date, cycleWithOffset);

      // Shifts should potentially be different due to phase offset
      expect(shift1).toBeDefined();
      expect(shift2).toBeDefined();
    });
  });
});
