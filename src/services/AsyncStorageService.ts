/**
 * AsyncStorage Service
 *
 * Type-safe AsyncStorage wrapper with TTL support, batch operations,
 * and automatic data type handling for React Native.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

/**
 * Storage metadata for TTL tracking
 */
interface StorageMetadata {
  createdAt: number;
  expiresAt?: number;
  valueType?: 'string' | 'date' | 'json';
}

interface StorageBackend {
  readonly kind: 'async-storage' | 'mmkv';
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  multiSet(entries: [string, string][]): Promise<void>;
  multiGet(keys: string[]): Promise<[string, string | null][]>;
  multiRemove(keys: string[]): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Storage key prefix
 */
const KEY_PREFIX = 'app:';
const META_SUFFIX = ':meta';
const STORAGE_SCHEMA_VERSION_KEY = 'storage:schemaVersion';
const CURRENT_STORAGE_SCHEMA_VERSION = 1;
const MMKV_MIGRATION_MARKER_KEY = `${KEY_PREFIX}storage:mmkvMigrated:v1`;

class AsyncStorageBackend implements StorageBackend {
  readonly kind = 'async-storage' as const;

  setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }

  getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }

  removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }

  multiSet(entries: [string, string][]): Promise<void> {
    return AsyncStorage.multiSet(entries);
  }

  multiGet(keys: string[]): Promise<[string, string | null][]> {
    return AsyncStorage.multiGet(keys);
  }

  multiRemove(keys: string[]): Promise<void> {
    return AsyncStorage.multiRemove(keys);
  }

  getAllKeys(): Promise<string[]> {
    return AsyncStorage.getAllKeys();
  }

  clear(): Promise<void> {
    return AsyncStorage.clear();
  }
}

class MMKVBackend implements StorageBackend {
  readonly kind = 'mmkv' as const;

  constructor(
    private readonly mmkv: {
      set: (key: string, value: string) => void;
      getString: (key: string) => string | undefined;
      remove: (key: string) => void;
      getAllKeys: () => string[];
      clearAll: () => void;
    }
  ) {}

  setItem(key: string, value: string): Promise<void> {
    this.mmkv.set(key, value);
    return Promise.resolve();
  }

  getItem(key: string): Promise<string | null> {
    return Promise.resolve(this.mmkv.getString(key) ?? null);
  }

  removeItem(key: string): Promise<void> {
    this.mmkv.remove(key);
    return Promise.resolve();
  }

  multiSet(entries: [string, string][]): Promise<void> {
    entries.forEach(([key, value]) => {
      this.mmkv.set(key, value);
    });
    return Promise.resolve();
  }

  multiGet(keys: string[]): Promise<[string, string | null][]> {
    return Promise.resolve(keys.map((key) => [key, this.mmkv.getString(key) ?? null]));
  }

  multiRemove(keys: string[]): Promise<void> {
    keys.forEach((key) => {
      this.mmkv.remove(key);
    });
    return Promise.resolve();
  }

  getAllKeys(): Promise<string[]> {
    return Promise.resolve(this.mmkv.getAllKeys());
  }

  clear(): Promise<void> {
    this.mmkv.clearAll();
    return Promise.resolve();
  }
}

function resolveStorageBackend(): StorageBackend {
  if (Platform.OS === 'web' || process.env.NODE_ENV === 'test') {
    return new AsyncStorageBackend();
  }

  try {
    // Lazy require so stale native builds can fall back to AsyncStorage instead of crashing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const module = require('react-native-mmkv');
    const createMMKV = module?.createMMKV;

    if (typeof createMMKV === 'function') {
      const instance = createMMKV({ id: 'ellie-main' });
      return new MMKVBackend(instance);
    }
  } catch (error) {
    logger.warn('Storage: MMKV unavailable, falling back to AsyncStorage', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return new AsyncStorageBackend();
}

/**
 * AsyncStorage Service class
 */
export class AsyncStorageService {
  private initializationPromise: Promise<void> | null = null;
  private readonly backend: StorageBackend;

  constructor(backend: StorageBackend = resolveStorageBackend()) {
    this.backend = backend;
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.ensureInitialized();
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);

      await this.backend.setItem(fullKey, serialized);

      // Store metadata
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        valueType: this.getValueType(value),
      };
      await this.backend.setItem(this.getMetaKey(key), JSON.stringify(metadata));

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
      await this.ensureInitialized();
      const fullKey = this.getFullKey(key);

      const metadata = await this.getMetadata(key);
      const isExpired = typeof metadata?.expiresAt === 'number' && Date.now() > metadata.expiresAt;
      if (isExpired) {
        await this.remove(key);
        return null;
      }

      const serialized = await this.backend.getItem(fullKey);

      if (serialized === null) {
        return null;
      }

      return this.deserialize<T>(serialized, metadata?.valueType);
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
      await this.ensureInitialized();
      const fullKey = this.getFullKey(key);
      const metaKey = this.getMetaKey(key);

      await this.backend.multiRemove([fullKey, metaKey]);

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
      await this.ensureInitialized();
      const keys = await this.getAllKeys();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      await this.backend.multiRemove([...fullKeys, ...metaKeys]);

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
      await this.ensureInitialized();
      const allKeys = await this.backend.getAllKeys();
      return allKeys
        .filter(
          (key: string) =>
            key.startsWith(KEY_PREFIX) &&
            !key.endsWith(META_SUFFIX) &&
            key !== this.getFullKey(STORAGE_SCHEMA_VERSION_KEY)
        )
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
      await this.ensureInitialized();
      const pairs: [string, string][] = [];
      const metaPairs: [string, string][] = [];

      for (const [key, value] of Object.entries(items)) {
        const fullKey = this.getFullKey(key);
        const serialized = this.serialize(value);
        pairs.push([fullKey, serialized]);

        const metadata: StorageMetadata = {
          createdAt: Date.now(),
          valueType: this.getValueType(value),
        };
        metaPairs.push([this.getMetaKey(key), JSON.stringify(metadata)]);
      }

      await this.backend.multiSet([...pairs, ...metaPairs]);

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
      await this.ensureInitialized();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const pairs = await this.backend.multiGet(fullKeys);

      const result: Record<string, T> = {};

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const [, serialized] = pairs[i];

        if (serialized !== null) {
          const metadata = await this.getMetadata(key);
          const isExpired =
            typeof metadata?.expiresAt === 'number' && Date.now() > metadata.expiresAt;
          if (!isExpired) {
            result[key] = this.deserialize<T>(serialized, metadata?.valueType);
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
      await this.ensureInitialized();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      await this.backend.multiRemove([...fullKeys, ...metaKeys]);

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
      await this.ensureInitialized();
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);

      await this.backend.setItem(fullKey, serialized);

      // Store metadata with expiration
      const metadata: StorageMetadata = {
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
        valueType: this.getValueType(value),
      };
      await this.backend.setItem(this.getMetaKey(key), JSON.stringify(metadata));

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
      await this.ensureInitialized();
      const metadata = await this.getMetadata(key);

      if (!metadata?.expiresAt) {
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
      await this.ensureInitialized();
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
      await this.ensureInitialized();
      const keys = await this.getAllKeys();
      const fullKeys = keys.map((key) => this.getFullKey(key));
      const metaKeys = keys.map((key) => this.getMetaKey(key));

      const allKeys = [...fullKeys, ...metaKeys];
      const pairs = await this.backend.multiGet(allKeys);

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
      await this.ensureInitialized();
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
      return value.toISOString();
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
  private deserialize<T>(serialized: string, valueType?: StorageMetadata['valueType']): T {
    if (valueType === 'string') {
      return serialized as unknown as T;
    }

    if (valueType === 'date') {
      return new Date(serialized) as unknown as T;
    }

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

  private getValueType(value: unknown): StorageMetadata['valueType'] {
    if (value instanceof Date) {
      return 'date';
    }

    if (typeof value === 'string') {
      return 'string';
    }

    return 'json';
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeSchemaVersion();
    }

    await this.initializationPromise;
  }

  private async initializeSchemaVersion(): Promise<void> {
    try {
      await this.migrateAsyncStorageToMMKVIfNeeded();
      const schemaKey = this.getFullKey(STORAGE_SCHEMA_VERSION_KEY);
      const storedVersion = await this.backend.getItem(schemaKey);
      const numericVersion = storedVersion === null ? null : Number(storedVersion);

      if (numericVersion === CURRENT_STORAGE_SCHEMA_VERSION) {
        return;
      }

      await this.backend.setItem(schemaKey, String(CURRENT_STORAGE_SCHEMA_VERSION));
    } catch (error) {
      logger.warn('Storage: Failed to initialize schema version', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getMetadata(key: string): Promise<StorageMetadata | null> {
    try {
      const metaStr = await this.backend.getItem(this.getMetaKey(key));
      if (!metaStr) {
        return null;
      }

      return JSON.parse(metaStr) as StorageMetadata;
    } catch (error) {
      logger.error('Storage: Failed to parse metadata', error as Error, { key });
      return null;
    }
  }

  private async migrateAsyncStorageToMMKVIfNeeded(): Promise<void> {
    if (this.backend.kind !== 'mmkv') {
      return;
    }

    const migrated = await this.backend.getItem(MMKV_MIGRATION_MARKER_KEY);
    if (migrated) {
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter((key) => key.startsWith(KEY_PREFIX));
    if (appKeys.length > 0) {
      const entries = await AsyncStorage.multiGet(appKeys);
      const validEntries = entries.filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      );
      if (validEntries.length > 0) {
        await this.backend.multiSet(validEntries);
      }
    }

    await this.backend.setItem(MMKV_MIGRATION_MARKER_KEY, String(Date.now()));
  }
}

// Export singleton instance
export const asyncStorageService = new AsyncStorageService();
