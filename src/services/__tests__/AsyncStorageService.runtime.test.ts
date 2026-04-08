import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageService } from '../AsyncStorageService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AsyncStorageService runtime behavior', () => {
  let service: AsyncStorageService;

  beforeEach(async () => {
    await AsyncStorage.clear();
    service = new AsyncStorageService();
  });

  it('preserves numeric-looking strings as strings', async () => {
    await service.set('numeric-string', '123');

    const result = await service.get<string>('numeric-string');

    expect(result).toBe('123');
  });

  it('preserves boolean-looking strings as strings', async () => {
    await service.set('boolean-string', 'true');

    const result = await service.get<string>('boolean-string');

    expect(result).toBe('true');
  });

  it('round-trips dates using metadata type information', async () => {
    const expected = new Date('2026-04-07T12:00:00.000Z');
    await service.set('date-key', expected);

    const result = await service.get<Date>('date-key');

    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(expected.toISOString());
  });

  it('does not expose the storage schema version as an application key', async () => {
    await service.set('demo', { ok: true });

    const keys = await service.getAllKeys();

    expect(keys).toEqual(['demo']);
  });
});
