/**
 * Mock AsyncStorage Service for Testing
 */

interface StorageMetadata {
  createdAt: number;
  expiresAt?: number;
}

const KEY_PREFIX = 'app:';
const META_SUFFIX = ':meta';

/**
 * Mock AsyncStorage Service
 */
export class MockAsyncStorageService {
  private storage: Map<string, string> = new Map();

  async set<T>(key: string, value: T): Promise<void> {
    await Promise.resolve();
    const fullKey = this.getFullKey(key);
    const serialized = this.serialize(value);

    this.storage.set(fullKey, serialized);

    const metadata: StorageMetadata = {
      createdAt: Date.now(),
    };
    this.storage.set(this.getMetaKey(key), JSON.stringify(metadata));
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);

    // Check if expired
    const isExpired = await this.isExpired(key);
    if (isExpired) {
      await this.remove(key);
      return null;
    }

    const serialized = this.storage.get(fullKey);

    if (serialized === undefined) {
      return null;
    }

    return this.deserialize<T>(serialized);
  }

  async remove(key: string): Promise<void> {
    await Promise.resolve();
    const fullKey = this.getFullKey(key);
    const metaKey = this.getMetaKey(key);

    this.storage.delete(fullKey);
    this.storage.delete(metaKey);
  }

  async clear(): Promise<void> {
    await Promise.resolve();
    this.storage.clear();
  }

  async getAllKeys(): Promise<string[]> {
    await Promise.resolve();
    const keys: string[] = [];

    for (const key of this.storage.keys()) {
      if (key.startsWith(KEY_PREFIX) && !key.endsWith(META_SUFFIX)) {
        keys.push(key.replace(KEY_PREFIX, ''));
      }
    }

    return keys;
  }

  async setMultiple(items: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  async removeMultiple(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }

  async setWithTTL<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await Promise.resolve();
    const fullKey = this.getFullKey(key);
    const serialized = this.serialize(value);

    this.storage.set(fullKey, serialized);

    const metadata: StorageMetadata = {
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    this.storage.set(this.getMetaKey(key), JSON.stringify(metadata));
  }

  async isExpired(key: string): Promise<boolean> {
    await Promise.resolve();
    const metaKey = this.getMetaKey(key);
    const metaStr = this.storage.get(metaKey);

    if (!metaStr) {
      return false;
    }

    const metadata: StorageMetadata = JSON.parse(metaStr);

    if (!metadata.expiresAt) {
      return false;
    }

    return Date.now() > metadata.expiresAt;
  }

  async removeExpired(): Promise<void> {
    const keys = await this.getAllKeys();

    for (const key of keys) {
      const isExpired = await this.isExpired(key);
      if (isExpired) {
        await this.remove(key);
      }
    }
  }

  async getSize(): Promise<number> {
    await Promise.resolve();
    let totalSize = 0;

    for (const [key, value] of this.storage.entries()) {
      totalSize += key.length + value.length;
    }

    return totalSize;
  }

  async getItemCount(): Promise<number> {
    const keys = await this.getAllKeys();
    return keys.length;
  }

  // Test helpers
  reset(): void {
    this.storage.clear();
  }

  // Private methods
  private serialize<T>(value: T): string {
    if (value instanceof Date) {
      return JSON.stringify({
        __type: 'Date',
        __value: value.toISOString(),
      });
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }

  private deserialize<T>(serialized: string): T {
    try {
      const parsed = JSON.parse(serialized);

      if (parsed && typeof parsed === 'object' && parsed.__type === 'Date') {
        return new Date(parsed.__value) as unknown as T;
      }

      return parsed as T;
    } catch {
      return serialized as unknown as T;
    }
  }

  private getFullKey(key: string): string {
    return `${KEY_PREFIX}${key}`;
  }

  private getMetaKey(key: string): string {
    return `${KEY_PREFIX}${key}${META_SUFFIX}`;
  }
}

export const AsyncStorageService = MockAsyncStorageService;
export const asyncStorageService = new MockAsyncStorageService();
