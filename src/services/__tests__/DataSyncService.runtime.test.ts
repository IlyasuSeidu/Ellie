import { asyncStorageService } from '../AsyncStorageService';
import { DataSyncService, type SyncOperation } from '../DataSyncService';

const flushAsyncWork = async (): Promise<void> => {
  const jestWithAsyncTimers = jest as typeof jest & {
    runAllTimersAsync?: () => Promise<void>;
  };

  if (jestWithAsyncTimers.runAllTimersAsync) {
    await jestWithAsyncTimers.runAllTimersAsync();
  } else {
    jest.runAllTimers();
    await Promise.resolve();
    await Promise.resolve();
  }
};

const awaitQueuedSync = async (syncPromise: Promise<void>): Promise<void> => {
  await flushAsyncWork();
  await syncPromise;
  await Promise.resolve();
};

describe('DataSyncService runtime behavior', () => {
  const userService = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    savePreferences: jest.fn(),
    updateShiftCycle: jest.fn(),
    getUser: jest.fn(),
    getShiftCycle: jest.fn(),
    getPreferences: jest.fn(),
  };

  let service: DataSyncService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    await asyncStorageService.clear();
    service = new DataSyncService(userService as never);
    await service.setOnlineState(true);
  });

  afterEach(() => {
    service.cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('moves permanently failing operations to the dead-letter queue', async () => {
    const operation: SyncOperation = {
      id: 'op-dead-letter',
      type: 'CREATE',
      collection: 'users',
      documentId: 'user-1',
      data: { name: 'Test User' },
      timestamp: new Date(),
      retries: 0,
    };

    jest
      .spyOn(
        service as unknown as { processOperation: (operation: SyncOperation) => Promise<void> },
        'processOperation'
      )
      .mockRejectedValue(new Error('network down'));

    await service.setOnlineState(false);
    await service.addToQueue(operation);
    await awaitQueuedSync(service.setOnlineState(true));

    const failedOperations = await service.getFailedOperations();

    expect(await service.getQueueSize()).toBe(0);
    expect(failedOperations).toHaveLength(1);
    expect(failedOperations[0]).toMatchObject({
      id: 'op-dead-letter',
      reason: 'network',
    });
  });

  it('retries dead-letter operations when requested', async () => {
    const operation: SyncOperation = {
      id: 'op-retry',
      type: 'CREATE',
      collection: 'users',
      documentId: 'user-2',
      data: { name: 'Retry User' },
      timestamp: new Date(),
      retries: 0,
    };

    const processSpy = jest.spyOn(
      service as unknown as { processOperation: (operation: SyncOperation) => Promise<void> },
      'processOperation'
    );
    processSpy.mockRejectedValueOnce(new Error('network down'));
    processSpy.mockRejectedValueOnce(new Error('network down'));
    processSpy.mockRejectedValueOnce(new Error('network down'));

    await service.setOnlineState(false);
    await service.addToQueue(operation);
    await awaitQueuedSync(service.setOnlineState(true));

    processSpy.mockResolvedValue(undefined);

    const retryPromise = service.retryFailedOperations();
    await flushAsyncWork();
    await expect(retryPromise).resolves.toBe(1);
    await Promise.resolve();

    expect(await service.getFailedOperations()).toHaveLength(0);
    expect(await service.getQueueSize()).toBe(0);
  });

  it('routes queued preference operations through savePreferences', async () => {
    const operation: SyncOperation = {
      id: 'op-prefs',
      type: 'UPDATE',
      collection: 'preferences',
      documentId: 'user-3',
      data: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          shiftReminders: true,
          shift24HoursBefore: true,
          shift4HoursBefore: true,
          holidayAlerts: false,
          patternChangeAlerts: false,
          soundEnabled: true,
          vibrationEnabled: true,
        },
      },
      timestamp: new Date(),
      retries: 0,
    };

    await service.setOnlineState(false);
    await service.addToQueue(operation);
    await service.setOnlineState(true);

    expect(userService.savePreferences).toHaveBeenCalledWith('user-3', operation.data);
  });
});
