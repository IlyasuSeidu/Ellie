import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { StorageService } from '@/services/StorageService';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    service = new StorageService();
    await AsyncStorage.clear();
  });

  it('round-trips values through the unified native storage wrapper', async () => {
    await service.set('storage:test', { value: 42 });

    await expect(service.get<{ value: number }>('storage:test')).resolves.toEqual({ value: 42 });
    await expect(asyncStorageService.get<string>('storage:test')).resolves.toContain('"value":42');
  });

  it('migrates legacy raw AsyncStorage entries on first read', async () => {
    await AsyncStorage.setItem(
      'legacy:storage:test',
      JSON.stringify({
        data: { value: 'legacy' },
        timestamp: Date.now(),
      })
    );

    await expect(service.get<{ value: string }>('legacy:storage:test')).resolves.toEqual({
      value: 'legacy',
    });
    await expect(AsyncStorage.getItem('legacy:storage:test')).resolves.toBeNull();
    await expect(asyncStorageService.get<string>('legacy:storage:test')).resolves.toContain(
      '"legacy"'
    );
  });
});
