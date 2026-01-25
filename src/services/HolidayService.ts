/**
 * Holiday Service
 *
 * Multi-source holiday data service with fallback layers:
 * 1. AsyncStorage cache (fastest)
 * 2. Static JSON files from data/holidays/
 * 3. Default empty array
 */

import { Holiday, HolidayType } from '@/types';
import { logger } from '@/utils/logger';
import { IStorageService } from './StorageService';

/**
 * Holiday data file format
 */
interface HolidayDataFile {
  country: string;
  year: number;
  holidays: Omit<Holiday, 'country'>[];
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  PREFIX: 'holidays',
  TTL_MS: 90 * 24 * 60 * 60 * 1000, // 90 days
};

/**
 * Holiday Service class
 */
export class HolidayService {
  private dataLoader: ((country: string, year: number) => Promise<HolidayDataFile | null>) | null = null;

  constructor(private storage: IStorageService) {}

  /**
   * Set the data loader function for loading JSON files
   * This is injected to avoid file system dependencies in core service
   */
  setDataLoader(
    loader: (country: string, year: number) => Promise<HolidayDataFile | null>
  ): void {
    this.dataLoader = loader;
  }

  /**
   * Get holidays for a specific country and year
   */
  async getHolidaysForCountry(
    country: string,
    year: number
  ): Promise<Holiday[]> {
    logger.debug('Getting holidays for country', { country, year });

    // Try cache first
    const cached = await this.getFromCache(country, year);
    if (cached) {
      logger.debug('Holidays retrieved from cache', {
        country,
        year,
        count: cached.length,
      });
      return cached;
    }

    // Try loading from data files
    const loaded = await this.loadFromDataFile(country, year);
    if (loaded.length > 0) {
      // Cache the loaded data
      await this.saveToCache(country, year, loaded);
      logger.debug('Holidays loaded from file', {
        country,
        year,
        count: loaded.length,
      });
      return loaded;
    }

    // Return empty array if all sources fail
    logger.warn('No holidays found', { country, year });
    return [];
  }

  /**
   * Get holidays in a date range
   */
  async getHolidaysInRange(
    country: string,
    start: Date,
    end: Date
  ): Promise<Holiday[]> {
    logger.debug('Getting holidays in range', {
      country,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    // Get unique years in the range
    const years = this.getYearsInRange(start, end);

    // Load holidays for all years
    const allHolidays: Holiday[] = [];
    for (const year of years) {
      const yearHolidays = await this.getHolidaysForCountry(country, year);
      allHolidays.push(...yearHolidays);
    }

    // Filter to date range
    const filtered = allHolidays.filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= start && holidayDate <= end;
    });

    logger.debug('Holidays filtered to range', {
      country,
      count: filtered.length,
    });

    return filtered;
  }

  /**
   * Check if a date is a holiday
   */
  async isHoliday(date: Date, country: string): Promise<boolean> {
    const holiday = await this.getHolidayForDate(date, country);
    return holiday !== null;
  }

  /**
   * Get holiday for a specific date
   */
  async getHolidayForDate(
    date: Date,
    country: string
  ): Promise<Holiday | null> {
    const year = date.getFullYear();
    const dateStr = this.formatDate(date);

    const holidays = await this.getHolidaysForCountry(country, year);
    const holiday = holidays.find((h) => h.date === dateStr);

    logger.debug('Holiday check for date', {
      date: dateStr,
      country,
      found: !!holiday,
    });

    return holiday || null;
  }

  /**
   * Filter holidays by type
   */
  filterByType(holidays: Holiday[], type: HolidayType): Holiday[] {
    return holidays.filter((h) => h.type === type);
  }

  /**
   * Search holidays by name (case-insensitive)
   */
  searchHolidays(holidays: Holiday[], query: string): Holiday[] {
    const lowerQuery = query.toLowerCase();
    return holidays.filter((h) =>
      h.name.toLowerCase().includes(lowerQuery) ||
      h.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Preload holidays for current year and next year
   */
  async preloadHolidays(country: string): Promise<void> {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    logger.info('Preloading holidays', { country, years: [currentYear, nextYear] });

    await Promise.all([
      this.getHolidaysForCountry(country, currentYear),
      this.getHolidaysForCountry(country, nextYear),
    ]);

    logger.info('Holidays preloaded', { country });
  }

  /**
   * Invalidate cache for a country
   */
  async invalidateCache(country: string): Promise<void> {
    const prefix = `${CACHE_CONFIG.PREFIX}:${country}:`;
    await this.storage.clearPrefix(prefix);
    logger.info('Holiday cache invalidated', { country });
  }

  /**
   * Get holidays from cache
   */
  private async getFromCache(
    country: string,
    year: number
  ): Promise<Holiday[] | null> {
    try {
      const cacheKey = this.getCacheKey(country, year);
      const cached = await this.storage.get<Holiday[]>(cacheKey);
      return cached;
    } catch (error) {
      logger.error('Failed to get from cache', error as Error, {
        country,
        year,
      });
      return null;
    }
  }

  /**
   * Save holidays to cache
   */
  private async saveToCache(
    country: string,
    year: number,
    holidays: Holiday[]
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(country, year);
      await this.storage.set(cacheKey, holidays, CACHE_CONFIG.TTL_MS);
      logger.debug('Holidays saved to cache', { country, year });
    } catch (error) {
      logger.error('Failed to save to cache', error as Error, {
        country,
        year,
      });
      // Don't throw - caching failure shouldn't break the service
    }
  }

  /**
   * Load holidays from data file
   */
  private async loadFromDataFile(
    country: string,
    year: number
  ): Promise<Holiday[]> {
    try {
      if (!this.dataLoader) {
        logger.warn('No data loader configured');
        return [];
      }

      const data = await this.dataLoader(country, year);
      if (!data) {
        logger.debug('No data file found', { country, year });
        return [];
      }

      // Transform to Holiday objects
      const holidays: Holiday[] = data.holidays.map((h) => ({
        ...h,
        country: data.country,
      }));

      return holidays;
    } catch (error) {
      logger.error('Failed to load from data file', error as Error, {
        country,
        year,
      });
      return [];
    }
  }

  /**
   * Get cache key for country and year
   */
  private getCacheKey(country: string, year: number): string {
    return `${CACHE_CONFIG.PREFIX}:${country}:${year}`;
  }

  /**
   * Get all years in a date range
   */
  private getYearsInRange(start: Date, end: Date): number[] {
    const years: number[] = [];
    let currentYear = start.getFullYear();
    const endYear = end.getFullYear();

    while (currentYear <= endYear) {
      years.push(currentYear);
      currentYear++;
    }

    return years;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
