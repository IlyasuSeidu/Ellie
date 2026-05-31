import { readPendingSyncStatus } from '@/hooks/usePendingSyncStatus';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    getAllKeys: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('@/services/NetworkService', () => ({
  networkService: {
    getSnapshot: jest.fn(),
  },
}));

describe('readPendingSyncStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(networkService.getSnapshot).mockReturnValue({
      status: 'offline',
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
      updatedAt: Date.now(),
    });
  });

  it('counts launch-critical local sync queues', async () => {
    jest
      .mocked(asyncStorageService.getAllKeys)
      .mockResolvedValue([
        'users:pending:user-1',
        'shift-logs:pending:log-1',
        'sessions:pending:session-1',
        'users:failed:user-2',
        'shift-logs:failed:log-2',
        'onboarding:data',
      ]);
    jest.mocked(asyncStorageService.get).mockResolvedValue([{ name: 'analytics_event' }]);

    await expect(readPendingSyncStatus()).resolves.toEqual({
      pendingCount: 4,
      failedCount: 2,
      isOnline: false,
    });
  });

  it('treats a missing analytics queue as empty', async () => {
    jest.mocked(asyncStorageService.getAllKeys).mockResolvedValue([]);
    jest.mocked(asyncStorageService.get).mockResolvedValue(null);
    jest.mocked(networkService.getSnapshot).mockReturnValue({
      status: 'online',
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
      updatedAt: Date.now(),
    });

    await expect(readPendingSyncStatus()).resolves.toEqual({
      pendingCount: 0,
      failedCount: 0,
      isOnline: true,
    });
  });
});
