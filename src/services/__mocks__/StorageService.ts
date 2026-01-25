/**
 * Mock Storage Service for Testing
 */

export interface IStorageService {
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clearPrefix(prefix: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export class MockStorageService implements IStorageService {
  private data: Map<string, string> = new Map();

  async set<T>(key: string, value: T, _ttlMs?: number): Promise<void> {
    await Promise.resolve();
    const item = {
      data: value,
      timestamp: Date.now(),
      expiresAt: _ttlMs ? Date.now() + _ttlMs : undefined,
    };
    this.data.set(key, JSON.stringify(item));
  }

  async get<T>(key: string): Promise<T | null> {
    await Promise.resolve();
    const itemStr = this.data.get(key);
    if (!itemStr) {
      return null;
    }

    const item = JSON.parse(itemStr);

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.data.delete(key);
      return null;
    }

    return item.data;
  }

  async remove(key: string): Promise<void> {
    await Promise.resolve();
    this.data.delete(key);
  }

  async clearPrefix(prefix: string): Promise<void> {
    await Promise.resolve();
    const keys = Array.from(this.data.keys()).filter((key) =>
      key.startsWith(prefix)
    );
    keys.forEach((key) => this.data.delete(key));
  }

  async clear(): Promise<void> {
    await Promise.resolve();
    this.data.clear();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // Test helper
  reset(): void {
    this.data.clear();
  }
}

export const StorageService = MockStorageService;

let _storageServiceInstance: MockStorageService | null = null;

export const getStorageService = (): MockStorageService => {
  if (!_storageServiceInstance) {
    _storageServiceInstance = new MockStorageService();
  }
  return _storageServiceInstance;
};
