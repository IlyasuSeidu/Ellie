/**
 * Storage Service
 *
 * Provides a unified interface for storing and retrieving data
 * with support for expiration and type-safe operations.
 */

import { logger } from '@/utils/logger';

/**
 * Cached item with metadata
 */
interface CachedItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * Storage Service Interface
 */
export interface IStorageService {
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clearPrefix(prefix: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Storage Service class
 */
export class StorageService implements IStorageService {
  private storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  /**
   * Set item in storage with optional expiration
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const item: CachedItem<T> = {
        data: value,
        timestamp: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };

      await this.storage.setItem(key, JSON.stringify(item));
      logger.debug('Storage: Item set', { key, hasTTL: !!ttlMs });
    } catch (error) {
      logger.error('Storage: Failed to set item', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get item from storage
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const itemStr = this.storage.getItem(key);
      if (!itemStr) {
        logger.debug('Storage: Item not found', { key });
        return null;
      }

      const item: CachedItem<T> = JSON.parse(itemStr);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        logger.debug('Storage: Item expired', { key });
        await this.remove(key);
        return null;
      }

      logger.debug('Storage: Item retrieved', { key });
      return item.data;
    } catch (error) {
      logger.error('Storage: Failed to get item', error as Error, { key });
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async remove(key: string): Promise<void> {
    try {
      await this.storage.removeItem(key);
      logger.debug('Storage: Item removed', { key });
    } catch (error) {
      logger.error('Storage: Failed to remove item', error as Error, { key });
    }
  }

  /**
   * Clear all items matching a prefix
   */
  async clearPrefix(prefix: string): Promise<void> {
    try {
      const keys = Object.keys(this.storage).filter((key) =>
        key.startsWith(prefix)
      );

      for (const key of keys) {
        await this.storage.removeItem(key);
      }

      logger.info('Storage: Prefix cleared', { prefix, count: keys.length });
    } catch (error) {
      logger.error('Storage: Failed to clear prefix', error as Error, {
        prefix,
      });
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await this.storage.clear();
      logger.info('Storage: All items cleared');
    } catch (error) {
      logger.error('Storage: Failed to clear', error as Error);
    }
  }

  /**
   * Check if key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}

// Export singleton instance (lazy initialization to avoid localStorage issues in tests)
let _storageServiceInstance: StorageService | null = null;

export const getStorageService = (): StorageService => {
  if (!_storageServiceInstance) {
    _storageServiceInstance = new StorageService();
  }
  return _storageServiceInstance;
};
