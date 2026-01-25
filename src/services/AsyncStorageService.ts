/**
 * AsyncStorage Service
 *
 * Type-safe AsyncStorage wrapper with TTL support, batch operations,
 * and automatic data type handling for React Native.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

/**
 * Storage metadata for TTL tracking
 */
interface StorageMetadata {
  createdAt: number;
  expiresAt?: number;
}

/**
 * Storage key prefix
 */
const KEY_PREFIX = 'app:';
const META_SUFFIX = ':meta';

/**
 * AsyncStorage Service class
 */
export class AsyncStorageService {
  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);

      await AsyncStorage.setItem(fullKey, serialized);

      // Store metadata
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
      };
      await AsyncStorage.setItem(this.getMetaKey(key), JSON.stringify(metadata));

      logger.debug('Storage: Value set', { key });
    } catch (error) {
      logger.error('Storage: Failed to set value', error as Error, { key });
      throw new Error(`Failed to set storage value for key: ${key}`);
    }
  }

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);

      // Check if expired
      const isExpired = await this.isExpired(key);
      if (isExpired) {
        await this.remove(key);
        return null;
      }

      const serialized = await AsyncStorage.getItem(fullKey);

      if (serialized === null) {
        return null;
      }

      return this.deserialize<T>(serialized);
    } catch (error) {
      logger.error('Storage: Failed to get value', error as Error, { key });
      return null;
    }
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const metaKey = this.getMetaKey(key);

      await AsyncStorage.multiRemove([fullKey, metaKey]);

      logger.debug('Storage: Value removed', { key });
    } catch (error) {
      logger.error('Storage: Failed to remove value', error as Error, { key });
      throw new Error(`Failed to remove storage value for key: ${key}`);
    }
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      await AsyncStorage.multiRemove([...fullKeys, ...metaKeys]);

      logger.info('Storage: All values cleared');
    } catch (error) {
      logger.error('Storage: Failed to clear', error as Error);
      throw new Error('Failed to clear storage');
    }
  }

  /**
   * Get all storage keys (without prefix)
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter((key: string) => key.startsWith(KEY_PREFIX) && !key.endsWith(META_SUFFIX))
        .map((key: string) => key.replace(KEY_PREFIX, ''));
    } catch (error) {
      logger.error('Storage: Failed to get all keys', error as Error);
      return [];
    }
  }

  /**
   * Set multiple values at once
   */
  async setMultiple(items: Record<string, unknown>): Promise<void> {
    try {
      const pairs: [string, string][] = [];
      const metaPairs: [string, string][] = [];

      for (const [key, value] of Object.entries(items)) {
        const fullKey = this.getFullKey(key);
        const serialized = this.serialize(value);
        pairs.push([fullKey, serialized]);

        const metadata: StorageMetadata = {
          createdAt: Date.now(),
        };
        metaPairs.push([this.getMetaKey(key), JSON.stringify(metadata)]);
      }

      await AsyncStorage.multiSet([...pairs, ...metaPairs]);

      logger.debug('Storage: Multiple values set', {
        count: Object.keys(items).length,
      });
    } catch (error) {
      logger.error('Storage: Failed to set multiple values', error as Error);
      throw new Error('Failed to set multiple storage values');
    }
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    try {
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const pairs = await AsyncStorage.multiGet(fullKeys);

      const result: Record<string, T> = {};

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const [, serialized] = pairs[i];

        if (serialized !== null) {
          // Check if expired
          const isExpired = await this.isExpired(key);
          if (!isExpired) {
            result[key] = this.deserialize<T>(serialized);
          }
        }
      }

      logger.debug('Storage: Multiple values retrieved', {
        requested: keys.length,
        found: Object.keys(result).length,
      });

      return result;
    } catch (error) {
      logger.error('Storage: Failed to get multiple values', error as Error);
      return {};
    }
  }

  /**
   * Remove multiple values at once
   */
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      await AsyncStorage.multiRemove([...fullKeys, ...metaKeys]);

      logger.debug('Storage: Multiple values removed', { count: keys.length });
    } catch (error) {
      logger.error('Storage: Failed to remove multiple values', error as Error);
      throw new Error('Failed to remove multiple storage values');
    }
  }

  /**
   * Set a value with TTL (time-to-live)
   */
  async setWithTTL<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);

      await AsyncStorage.setItem(fullKey, serialized);

      // Store metadata with expiration
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      };
      await AsyncStorage.setItem(this.getMetaKey(key), JSON.stringify(metadata));

      logger.debug('Storage: Value set with TTL', { key, ttlSeconds });
    } catch (error) {
      logger.error('Storage: Failed to set value with TTL', error as Error, { key });
      throw new Error(`Failed to set storage value with TTL for key: ${key}`);
    }
  }

  /**
   * Check if a key is expired
   */
  async isExpired(key: string): Promise<boolean> {
    try {
      const metaKey = this.getMetaKey(key);
      const metaStr = await AsyncStorage.getItem(metaKey);

      if (!metaStr) {
        return false;
      }

      const metadata: StorageMetadata = JSON.parse(metaStr);

      if (!metadata.expiresAt) {
        return false;
      }

      return Date.now() > metadata.expiresAt;
    } catch (error) {
      logger.error('Storage: Failed to check expiration', error as Error, { key });
      return false;
    }
  }

  /**
   * Remove all expired items
   */
  async removeExpired(): Promise<void> {
    try {
      const keys = await this.getAllKeys();
      const expiredKeys: string[] = [];

      for (const key of keys) {
        const isExpired = await this.isExpired(key);
        if (isExpired) {
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.removeMultiple(expiredKeys);
        logger.info('Storage: Expired items removed', { count: expiredKeys.length });
      }
    } catch (error) {
      logger.error('Storage: Failed to remove expired items', error as Error);
    }
  }

  /**
   * Get total storage size in bytes
   */
  async getSize(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      const allKeys = [...fullKeys, ...metaKeys];
      const pairs = await AsyncStorage.multiGet(allKeys);

      let totalSize = 0;
      for (const [key, value] of pairs) {
        if (value !== null) {
          // Calculate size: key length + value length (in bytes)
          totalSize += key.length + value.length;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error('Storage: Failed to get size', error as Error);
      return 0;
    }
  }

  /**
   * Get count of stored items
   */
  async getItemCount(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      return keys.length;
    } catch (error) {
      logger.error('Storage: Failed to get item count', error as Error);
      return 0;
    }
  }

  /**
   * Serialize value for storage
   */
  private serialize<T>(value: T): string {
    // Handle special types
    if (value instanceof Date) {
      return JSON.stringify({
        __type: 'Date',
        __value: value.toISOString(),
      });
    }

    // Handle primitives and objects
    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   */
  private deserialize<T>(serialized: string): T {
    try {
      const parsed = JSON.parse(serialized);

      // Handle special types
      if (parsed && typeof parsed === 'object' && parsed.__type === 'Date') {
        return new Date(parsed.__value) as unknown as T;
      }

      return parsed as T;
    } catch {
      // If JSON parse fails, return as string
      return serialized as unknown as T;
    }
  }

  /**
   * Get full storage key with prefix
   */
  private getFullKey(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }

  /**
   * Get metadata key
   */
  private getMetaKey(key: string): string {
    return `${KEY_PREFIX}${key}${META_SUFFIX}`;
  }
}

// Export singleton instance
export const asyncStorageService = new AsyncStorageService();
