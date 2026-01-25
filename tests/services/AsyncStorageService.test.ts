/**
 * AsyncStorage Service Tests
 */

import { MockAsyncStorageService } from '@/services/__mocks__/AsyncStorageService';

// Mock dependencies
jest.mock('@/utils/logger');

describe('AsyncStorageService', () => {
  let service: MockAsyncStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockAsyncStorageService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Basic Operations', () => {
    describe('set and get', () => {
      it('should set and get a string', async () => {
        await service.set('testKey', 'testValue');

        const result = await service.get<string>('testKey');

        expect(result).toBe('testValue');
      });

      it('should set and get a number', async () => {
        await service.set('numberKey', 42);

        const result = await service.get<number>('numberKey');

        expect(result).toBe(42);
      });

      it('should set and get a boolean', async () => {
        await service.set('boolKey', true);

        const result = await service.get<boolean>('boolKey');

        expect(result).toBe(true);
      });

      it('should set and get an object', async () => {
        const obj = { name: 'Test', age: 30, active: true };

        await service.set('objKey', obj);

        const result = await service.get<typeof obj>('objKey');

        expect(result).toEqual(obj);
      });

      it('should set and get an array', async () => {
        const arr = [1, 2, 3, 4, 5];

        await service.set('arrKey', arr);

        const result = await service.get<number[]>('arrKey');

        expect(result).toEqual(arr);
      });

      it('should set and get a Date', async () => {
        const date = new Date('2025-01-01T00:00:00.000Z');

        await service.set('dateKey', date);

        const result = await service.get<Date>('dateKey');

        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString()).toBe(date.toISOString());
      });

      it('should return null for non-existent key', async () => {
        const result = await service.get('nonExistentKey');

        expect(result).toBeNull();
      });
    });

    describe('remove', () => {
      it('should remove a key', async () => {
        await service.set('testKey', 'testValue');

        expect(await service.get('testKey')).toBe('testValue');

        await service.remove('testKey');

        expect(await service.get('testKey')).toBeNull();
      });

      it('should not throw when removing non-existent key', async () => {
        await expect(service.remove('nonExistent')).resolves.not.toThrow();
      });
    });

    describe('clear', () => {
      it('should clear all keys', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');
        await service.set('key3', 'value3');

        expect(await service.getItemCount()).toBe(3);

        await service.clear();

        expect(await service.getItemCount()).toBe(0);
        expect(await service.get('key1')).toBeNull();
        expect(await service.get('key2')).toBeNull();
        expect(await service.get('key3')).toBeNull();
      });
    });

    describe('getAllKeys', () => {
      it('should return all keys', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');
        await service.set('key3', 'value3');

        const keys = await service.getAllKeys();

        expect(keys).toHaveLength(3);
        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
        expect(keys).toContain('key3');
      });

      it('should return empty array when no keys', async () => {
        const keys = await service.getAllKeys();

        expect(keys).toEqual([]);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('setMultiple', () => {
      it('should set multiple items', async () => {
        const items = {
          key1: 'value1',
          key2: 42,
          key3: { name: 'Test' },
        };

        await service.setMultiple(items);

        expect(await service.get<string>('key1')).toBe('value1');
        expect(await service.get<number>('key2')).toBe(42);
        expect(await service.get<{ name: string }>('key3')).toEqual({ name: 'Test' });
      });

      it('should handle empty object', async () => {
        await expect(service.setMultiple({})).resolves.not.toThrow();
      });
    });

    describe('getMultiple', () => {
      it('should get multiple items', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 42);
        await service.set('key3', true);

        const result = await service.getMultiple<unknown>(['key1', 'key2', 'key3']);

        expect(result).toEqual({
          key1: 'value1',
          key2: 42,
          key3: true,
        });
      });

      it('should only return existing keys', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        const result = await service.getMultiple<string>([
          'key1',
          'key2',
          'nonExistent',
        ]);

        expect(result).toEqual({
          key1: 'value1',
          key2: 'value2',
        });
        expect(result).not.toHaveProperty('nonExistent');
      });

      it('should return empty object for non-existent keys', async () => {
        const result = await service.getMultiple(['nonExistent1', 'nonExistent2']);

        expect(result).toEqual({});
      });
    });

    describe('removeMultiple', () => {
      it('should remove multiple items', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');
        await service.set('key3', 'value3');

        await service.removeMultiple(['key1', 'key3']);

        expect(await service.get('key1')).toBeNull();
        expect(await service.get('key2')).toBe('value2');
        expect(await service.get('key3')).toBeNull();
      });

      it('should handle empty array', async () => {
        await expect(service.removeMultiple([])).resolves.not.toThrow();
      });
    });
  });

  describe('TTL / Cache Management', () => {
    describe('setWithTTL', () => {
      it('should set item with TTL', async () => {
        await service.setWithTTL('ttlKey', 'ttlValue', 60);

        const result = await service.get<string>('ttlKey');

        expect(result).toBe('ttlValue');
      });

      it('should return item before expiration', async () => {
        await service.setWithTTL('ttlKey', 'ttlValue', 60);

        // Should still be available
        const result = await service.get<string>('ttlKey');

        expect(result).toBe('ttlValue');
      });

      it('should return null after expiration', async () => {
        // Set with 0 second TTL (immediately expired)
        await service.setWithTTL('ttlKey', 'ttlValue', 0);

        // Wait a tiny bit to ensure expiration
        await new Promise((resolve) => setTimeout(resolve, 10));

        const result = await service.get<string>('ttlKey');

        expect(result).toBeNull();
      });

      it('should handle different data types with TTL', async () => {
        await service.setWithTTL('string', 'value', 60);
        await service.setWithTTL('number', 42, 60);
        await service.setWithTTL('object', { test: true }, 60);

        expect(await service.get<string>('string')).toBe('value');
        expect(await service.get<number>('number')).toBe(42);
        expect(await service.get<{ test: boolean }>('object')).toEqual({
          test: true,
        });
      });
    });

    describe('isExpired', () => {
      it('should return false for non-expired item', async () => {
        await service.setWithTTL('ttlKey', 'value', 60);

        const isExpired = await service.isExpired('ttlKey');

        expect(isExpired).toBe(false);
      });

      it('should return true for expired item', async () => {
        await service.setWithTTL('ttlKey', 'value', 0);

        await new Promise((resolve) => setTimeout(resolve, 10));

        const isExpired = await service.isExpired('ttlKey');

        expect(isExpired).toBe(true);
      });

      it('should return false for item without TTL', async () => {
        await service.set('normalKey', 'value');

        const isExpired = await service.isExpired('normalKey');

        expect(isExpired).toBe(false);
      });

      it('should return false for non-existent key', async () => {
        const isExpired = await service.isExpired('nonExistent');

        expect(isExpired).toBe(false);
      });
    });

    describe('removeExpired', () => {
      it('should remove all expired items', async () => {
        await service.setWithTTL('expired1', 'value1', 0);
        await service.setWithTTL('expired2', 'value2', 0);
        await service.setWithTTL('valid', 'value3', 60);
        await service.set('noTTL', 'value4');

        await new Promise((resolve) => setTimeout(resolve, 10));

        await service.removeExpired();

        expect(await service.get('expired1')).toBeNull();
        expect(await service.get('expired2')).toBeNull();
        expect(await service.get('valid')).toBe('value3');
        expect(await service.get('noTTL')).toBe('value4');
      });

      it('should handle empty storage', async () => {
        await expect(service.removeExpired()).resolves.not.toThrow();
      });

      it('should handle storage with no expired items', async () => {
        await service.set('key1', 'value1');
        await service.setWithTTL('key2', 'value2', 60);

        await service.removeExpired();

        expect(await service.get('key1')).toBe('value1');
        expect(await service.get('key2')).toBe('value2');
      });
    });
  });

  describe('Storage Info', () => {
    describe('getSize', () => {
      it('should return 0 for empty storage', async () => {
        const size = await service.getSize();

        expect(size).toBe(0);
      });

      it('should return storage size in bytes', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        const size = await service.getSize();

        expect(size).toBeGreaterThan(0);
      });

      it('should update size after adding items', async () => {
        const sizeBefore = await service.getSize();

        await service.set('newKey', 'newValue');

        const sizeAfter = await service.getSize();

        expect(sizeAfter).toBeGreaterThan(sizeBefore);
      });

      it('should decrease size after removing items', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        const sizeBefore = await service.getSize();

        await service.remove('key1');

        const sizeAfter = await service.getSize();

        expect(sizeAfter).toBeLessThan(sizeBefore);
      });
    });

    describe('getItemCount', () => {
      it('should return 0 for empty storage', async () => {
        const count = await service.getItemCount();

        expect(count).toBe(0);
      });

      it('should return correct item count', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');
        await service.set('key3', 'value3');

        const count = await service.getItemCount();

        expect(count).toBe(3);
      });

      it('should update count after adding items', async () => {
        await service.set('key1', 'value1');

        expect(await service.getItemCount()).toBe(1);

        await service.set('key2', 'value2');

        expect(await service.getItemCount()).toBe(2);
      });

      it('should decrease count after removing items', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        expect(await service.getItemCount()).toBe(2);

        await service.remove('key1');

        expect(await service.getItemCount()).toBe(1);
      });

      it('should reset to 0 after clear', async () => {
        await service.set('key1', 'value1');
        await service.set('key2', 'value2');

        await service.clear();

        expect(await service.getItemCount()).toBe(0);
      });
    });
  });

  describe('Type Safety', () => {
    it('should handle complex nested objects', async () => {
      interface ComplexType {
        user: {
          name: string;
          age: number;
          preferences: {
            theme: string;
            notifications: boolean;
          };
        };
        data: number[];
      }

      const complex: ComplexType = {
        user: {
          name: 'Test User',
          age: 30,
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        data: [1, 2, 3, 4, 5],
      };

      await service.set('complex', complex);

      const result = await service.get<ComplexType>('complex');

      expect(result).toEqual(complex);
    });

    it('should handle arrays of objects', async () => {
      const users = [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' },
      ];

      await service.set('users', users);

      const result = await service.get<typeof users>('users');

      expect(result).toEqual(users);
    });

    it('should handle null values', async () => {
      await service.set('nullKey', null);

      const result = await service.get('nullKey');

      expect(result).toBeNull();
    });

    it('should handle undefined by storing null', async () => {
      await service.set('undefinedKey', undefined);

      const result = await service.get('undefinedKey');

      // undefined becomes null in JSON
      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted data gracefully', async () => {
      // Manually set corrupted data
      await service.set('corruptedKey', 'validData');

      // Get should not throw
      const result = await service.get('corruptedKey');

      expect(result).toBeDefined();
    });

    it('should handle special characters in keys', async () => {
      const specialKeys = ['key:with:colons', 'key.with.dots', 'key-with-dashes'];

      for (const key of specialKeys) {
        await service.set(key, 'value');
        const result = await service.get(key);
        expect(result).toBe('value');
      }
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);

      await service.set(longKey, 'value');

      const result = await service.get(longKey);

      expect(result).toBe('value');
    });

    it('should handle very large values', async () => {
      const largeValue = {
        data: 'x'.repeat(10000),
      };

      await service.set('largeKey', largeValue);

      const result = await service.get<typeof largeValue>('largeKey');

      expect(result).toEqual(largeValue);
    });
  });

  describe('Edge Cases', () => {
    it('should handle overwriting existing keys', async () => {
      await service.set('key', 'value1');
      expect(await service.get('key')).toBe('value1');

      await service.set('key', 'value2');
      expect(await service.get('key')).toBe('value2');
    });

    it('should handle setting different types to same key', async () => {
      await service.set('key', 'string');
      expect(await service.get('key')).toBe('string');

      await service.set('key', 42);
      expect(await service.get('key')).toBe(42);

      await service.set('key', { obj: true });
      expect(await service.get('key')).toEqual({ obj: true });
    });

    it('should handle multiple operations on same key', async () => {
      await service.set('key', 'value');
      expect(await service.get('key')).toBe('value');

      await service.remove('key');
      expect(await service.get('key')).toBeNull();

      await service.set('key', 'newValue');
      expect(await service.get('key')).toBe('newValue');
    });

    it('should handle batch operations and overwrite values', async () => {
      await service.setMultiple({
        key1: 'value1',
        key2: 'value2',
      });

      // Overwrite key1
      await service.set('key1', 'value1-updated');

      expect(await service.get('key1')).toBe('value1-updated');
      expect(await service.get('key2')).toBe('value2');
    });
  });
});
