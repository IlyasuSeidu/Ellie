/**
 * HolidayService Tests
 *
 * Comprehensive tests for multi-source holiday data service
 */

import { HolidayService } from '@/services/HolidayService';
import { Holiday } from '@/types';
import { logger } from '@/utils/logger';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/services/StorageService');

// Import mock after mocking
import { MockStorageService } from '@/services/__mocks__/StorageService';

/**
 * Sample holiday data for testing
 */
const US_2024_HOLIDAYS: Holiday[] = [
  {
    id: 'us-new-years-2024',
    name: "New Year's Day",
    date: '2024-01-01',
    country: 'US',
    type: 'national',
    description: 'First day of the year',
    isPaid: true,
  },
  {
    id: 'us-mlk-2024',
    name: 'Martin Luther King Jr. Day',
    date: '2024-01-15',
    country: 'US',
    type: 'national',
    description: 'Birthday of Martin Luther King Jr.',
    isPaid: true,
  },
  {
    id: 'us-presidents-2024',
    name: "Presidents' Day",
    date: '2024-02-19',
    country: 'US',
    type: 'national',
    description: "Washington's Birthday",
    isPaid: true,
  },
  {
    id: 'us-memorial-2024',
    name: 'Memorial Day',
    date: '2024-05-27',
    country: 'US',
    type: 'national',
    description: 'Honoring fallen soldiers',
    isPaid: true,
  },
  {
    id: 'us-independence-2024',
    name: 'Independence Day',
    date: '2024-07-04',
    country: 'US',
    type: 'national',
    description: 'Declaration of Independence',
    isPaid: true,
  },
  {
    id: 'us-christmas-2024',
    name: 'Christmas Day',
    date: '2024-12-25',
    country: 'US',
    type: 'religious',
    description: 'Christian celebration',
    isPaid: true,
  },
];

const UK_2024_HOLIDAYS: Holiday[] = [
  {
    id: 'uk-new-years-2024',
    name: "New Year's Day",
    date: '2024-01-01',
    country: 'UK',
    type: 'national',
    description: 'First day of the year',
    isPaid: true,
  },
  {
    id: 'uk-easter-2024',
    name: 'Easter Monday',
    date: '2024-04-01',
    country: 'UK',
    type: 'religious',
    description: 'Day after Easter Sunday',
    isPaid: true,
  },
  {
    id: 'uk-may-2024',
    name: 'Early May Bank Holiday',
    date: '2024-05-06',
    country: 'UK',
    type: 'national',
    description: 'Spring bank holiday',
    isPaid: true,
  },
  {
    id: 'uk-christmas-2024',
    name: 'Christmas Day',
    date: '2024-12-25',
    country: 'UK',
    type: 'religious',
    description: 'Christian celebration',
    isPaid: true,
  },
];

const US_2025_HOLIDAYS: Holiday[] = [
  {
    id: 'us-new-years-2025',
    name: "New Year's Day",
    date: '2025-01-01',
    country: 'US',
    type: 'national',
    description: 'First day of the year',
    isPaid: true,
  },
];

describe('HolidayService', () => {
  let service: HolidayService;
  let storage: MockStorageService;
  let mockDataLoader: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new MockStorageService();
    service = new HolidayService(storage);

    // Create mock data loader
    mockDataLoader = jest.fn(async (country: string, year: number) => { await Promise.resolve();
      if (country === 'US' && year === 2024) {
        return {
          country: 'US',
          year: 2024,
          holidays: US_2024_HOLIDAYS.map(({ country: _, ...rest }) => rest),
        };
      }
      if (country === 'US' && year === 2025) {
        return {
          country: 'US',
          year: 2025,
          holidays: US_2025_HOLIDAYS.map(({ country: _, ...rest }) => rest),
        };
      }
      if (country === 'UK' && year === 2024) {
        return {
          country: 'UK',
          year: 2024,
          holidays: UK_2024_HOLIDAYS.map(({ country: _, ...rest }) => rest),
        };
      }
      return null;
    });

    service.setDataLoader(mockDataLoader);
  });

  afterEach(() => {
    storage.reset();
  });

  describe('Data Loading', () => {
    describe('getHolidaysForCountry', () => {
      it('should load holidays from data file', async () => {
        const holidays = await service.getHolidaysForCountry('US', 2024);

        expect(holidays).toHaveLength(6);
        expect(holidays[0].name).toBe("New Year's Day");
        expect(mockDataLoader).toHaveBeenCalledWith('US', 2024);
        expect(logger.debug).toHaveBeenCalledWith(
          'Holidays loaded from file',
          expect.objectContaining({ country: 'US', year: 2024, count: 6 })
        );
      });

      it('should load holidays from cache on second call', async () => {
        // First call - loads from file
        await service.getHolidaysForCountry('US', 2024);

        // Second call - should use cache
        const holidays = await service.getHolidaysForCountry('US', 2024);

        expect(holidays).toHaveLength(6);
        expect(mockDataLoader).toHaveBeenCalledTimes(1); // Only called once
        expect(logger.debug).toHaveBeenCalledWith(
          'Holidays retrieved from cache',
          expect.objectContaining({ country: 'US', year: 2024, count: 6 })
        );
      });

      it('should handle missing country files', async () => {
        const holidays = await service.getHolidaysForCountry('ZZ', 2024);

        expect(holidays).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'No holidays found',
          expect.objectContaining({ country: 'ZZ', year: 2024 })
        );
      });

      it('should handle data loader errors', async () => {
        await Promise.resolve(); mockDataLoader.mockRejectedValue(new Error('File read error'));

        const holidays = await service.getHolidaysForCountry('US', 2024);

        expect(holidays).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to load from data file',
          expect.any(Error),
          expect.objectContaining({ country: 'US', year: 2024 })
        );
      });

      it('should work without data loader', async () => {
        const serviceWithoutLoader = new HolidayService(storage);

        const holidays = await serviceWithoutLoader.getHolidaysForCountry('US', 2024);

        expect(holidays).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith('No data loader configured');
      });

      it('should load different countries', async () => {
        const usHolidays = await service.getHolidaysForCountry('US', 2024);
        const ukHolidays = await service.getHolidaysForCountry('UK', 2024);

        expect(usHolidays).toHaveLength(6);
        expect(ukHolidays).toHaveLength(4);
        expect(usHolidays[0].country).toBe('US');
        expect(ukHolidays[0].country).toBe('UK');
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache loaded holidays', async () => {
      await service.getHolidaysForCountry('US', 2024);

      const cacheKey = 'holidays:US:2024';
      const cached = await storage.get(cacheKey);

      expect(cached).toBeDefined();
      expect(cached).toHaveLength(6);
    });

    it('should use cache on subsequent calls', async () => {
      // First call
      await service.getHolidaysForCountry('US', 2024);

      // Reset mock to verify cache is used
      mockDataLoader.mockClear();

      // Second call
      await service.getHolidaysForCountry('US', 2024);

      expect(mockDataLoader).not.toHaveBeenCalled();
    });

    it('should handle cache read errors', async () => {
      jest.spyOn(storage, 'get').mockRejectedValue(new Error('Cache error'));

      // Should fall back to loading from file
      const holidays = await service.getHolidaysForCountry('US', 2024);

      expect(holidays).toHaveLength(6);
      expect(mockDataLoader).toHaveBeenCalled();
    });

    it('should handle cache write errors', async () => {
      jest.spyOn(storage, 'set').mockRejectedValue(new Error('Write error'));

      // Should still return holidays even if caching fails
      const holidays = await service.getHolidaysForCountry('US', 2024);

      expect(holidays).toHaveLength(6);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save to cache',
        expect.any(Error),
        expect.objectContaining({ country: 'US', year: 2024 })
      );
    });

    it('should invalidate cache for country', async () => {
      // Load and cache holidays
      await service.getHolidaysForCountry('US', 2024);
      await service.getHolidaysForCountry('US', 2025);

      // Invalidate cache
      await service.invalidateCache('US');

      // Should reload from file
      mockDataLoader.mockClear();
      await service.getHolidaysForCountry('US', 2024);

      expect(mockDataLoader).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Holiday cache invalidated',
        expect.objectContaining({ country: 'US' })
      );
    });
  });

  describe('Holiday Queries', () => {
    describe('getHolidaysInRange', () => {
      it('should get holidays in date range within one year', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-07-31');

        const holidays = await service.getHolidaysInRange('US', start, end);

        expect(holidays).toHaveLength(5); // Jan, Jan, Feb, May, Jul
        expect(holidays[0].date).toBe('2024-01-01');
        expect(holidays[4].date).toBe('2024-07-04');
      });

      it('should get holidays across multiple years', async () => {
        const start = new Date('2024-12-01');
        const end = new Date('2025-01-31');

        const holidays = await service.getHolidaysInRange('US', start, end);

        expect(holidays).toHaveLength(2); // Christmas 2024, New Year 2025
        expect(holidays[0].date).toBe('2024-12-25');
        expect(holidays[1].date).toBe('2025-01-01');
      });

      it('should handle empty results', async () => {
        const start = new Date('2024-03-01');
        const end = new Date('2024-03-31');

        const holidays = await service.getHolidaysInRange('US', start, end);

        expect(holidays).toEqual([]);
      });

      it('should handle single day range', async () => {
        const date = new Date('2024-07-04');

        const holidays = await service.getHolidaysInRange('US', date, date);

        expect(holidays).toHaveLength(1);
        expect(holidays[0].name).toBe('Independence Day');
      });

      it('should handle large date ranges', async () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31');

        const holidays = await service.getHolidaysInRange('US', start, end);

        expect(holidays).toHaveLength(6);
      });
    });

    describe('isHoliday', () => {
      it('should return true for holiday dates', async () => {
        const date = new Date('2024-07-04');

        const result = await service.isHoliday(date, 'US');

        expect(result).toBe(true);
      });

      it('should return false for non-holiday dates', async () => {
        const date = new Date('2024-03-15');

        const result = await service.isHoliday(date, 'US');

        expect(result).toBe(false);
      });
    });

    describe('getHolidayForDate', () => {
      it('should return holiday for specific date', async () => {
        const date = new Date('2024-07-04');

        const holiday = await service.getHolidayForDate(date, 'US');

        expect(holiday).toBeDefined();
        expect(holiday?.name).toBe('Independence Day');
        expect(holiday?.type).toBe('national');
      });

      it('should return null for non-holiday dates', async () => {
        const date = new Date('2024-03-15');

        const holiday = await service.getHolidayForDate(date, 'US');

        expect(holiday).toBeNull();
      });

      it('should handle different countries', async () => {
        const date = new Date('2024-05-06');

        const usHoliday = await service.getHolidayForDate(date, 'US');
        const ukHoliday = await service.getHolidayForDate(date, 'UK');

        expect(usHoliday).toBeNull();
        expect(ukHoliday).toBeDefined();
        expect(ukHoliday?.name).toBe('Early May Bank Holiday');
      });
    });
  });

  describe('Filtering', () => {
    let usHolidays: Holiday[];

    beforeEach(async () => {
      usHolidays = await service.getHolidaysForCountry('US', 2024);
    });

    describe('filterByType', () => {
      it('should filter national holidays', () => {
        const national = service.filterByType(usHolidays, 'national');

        expect(national).toHaveLength(5);
        national.forEach((h) => expect(h.type).toBe('national'));
      });

      it('should filter religious holidays', () => {
        const religious = service.filterByType(usHolidays, 'religious');

        expect(religious).toHaveLength(1);
        expect(religious[0].name).toBe('Christmas Day');
      });

      it('should handle empty results', () => {
        const cultural = service.filterByType(usHolidays, 'cultural');

        expect(cultural).toEqual([]);
      });
    });

    describe('searchHolidays', () => {
      it('should search by name (case-insensitive)', () => {
        const results = service.searchHolidays(usHolidays, 'day');

        expect(results.length).toBeGreaterThan(0);
        results.forEach((h) => expect(h.name.toLowerCase()).toContain('day'));
      });

      it('should search by description', () => {
        const results = service.searchHolidays(usHolidays, 'independence');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Independence Day');
      });

      it('should handle case-insensitive search', () => {
        const results = service.searchHolidays(usHolidays, 'CHRISTMAS');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Christmas Day');
      });

      it('should handle no matches', () => {
        const results = service.searchHolidays(usHolidays, 'xyz123');

        expect(results).toEqual([]);
      });

      it('should handle partial matches', () => {
        const results = service.searchHolidays(usHolidays, 'pres');

        expect(results).toHaveLength(1);
        expect(results[0].name).toBe("Presidents' Day");
      });
    });

    it('should combine filtering and searching', () => {
      const national = service.filterByType(usHolidays, 'national');
      const searched = service.searchHolidays(national, 'day');

      expect(searched.length).toBeGreaterThan(0);
      searched.forEach((h) => {
        expect(h.type).toBe('national');
        expect(h.name.toLowerCase()).toContain('day');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle unsupported country gracefully', async () => {
      const holidays = await service.getHolidaysForCountry('INVALID', 2024);

      expect(holidays).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle invalid year', async () => {
      const holidays = await service.getHolidaysForCountry('US', 1900);

      expect(holidays).toEqual([]);
    });

    it('should handle empty results from data loader', async () => {
      mockDataLoader.mockResolvedValue({
        country: 'TEST',
        year: 2024,
        holidays: [],
      });

      const holidays = await service.getHolidaysForCountry('TEST', 2024);

      expect(holidays).toEqual([]);
    });

    it('should handle malformed data from loader', async () => {
      mockDataLoader.mockResolvedValue({
        country: 'TEST',
        year: 2024,
        // Missing holidays field
      } as unknown);

      const holidays = await service.getHolidaysForCountry('TEST', 2024);

      // Should handle gracefully and return empty
      expect(holidays).toBeDefined();
    });

    it('should handle date range with end before start', async () => {
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');

      const holidays = await service.getHolidaysInRange('US', start, end);

      expect(holidays).toEqual([]);
    });
  });

  describe('Preloading', () => {
    it('should preload current and next year', async () => {
      // Mock current year as 2024 for consistent testing
      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024);

      await service.preloadHolidays('US');

      expect(mockDataLoader).toHaveBeenCalledWith('US', 2024);
      expect(mockDataLoader).toHaveBeenCalledWith('US', 2025);
      expect(logger.info).toHaveBeenCalledWith(
        'Preloading holidays',
        expect.objectContaining({ country: 'US' })
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Holidays preloaded',
        expect.objectContaining({ country: 'US' })
      );
    });

    it('should cache preloaded holidays', async () => {
      jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2024);

      await service.preloadHolidays('US');

      // Reset mock
      mockDataLoader.mockClear();

      // Should use cache
      await service.getHolidaysForCountry('US', 2024);

      expect(mockDataLoader).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should be fast with cached data', async () => {
      // First load
      await service.getHolidaysForCountry('US', 2024);

      // Measure cached load
      const start = Date.now();
      await service.getHolidaysForCountry('US', 2024);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = [
        service.getHolidaysForCountry('US', 2024),
        service.getHolidaysForCountry('UK', 2024),
        service.getHolidaysForCountry('US', 2025),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toHaveLength(6); // US 2024
      expect(results[1]).toHaveLength(4); // UK 2024
      expect(results[2]).toHaveLength(1); // US 2025
    });

    it('should handle large date ranges efficiently', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2025-12-31'); // 2 years

      const startTime = Date.now();
      await service.getHolidaysInRange('US', start, end);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in reasonable time
    });
  });
});
