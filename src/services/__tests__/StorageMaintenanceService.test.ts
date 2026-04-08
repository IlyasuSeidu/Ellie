import { storageMaintenanceService } from '@/services/StorageMaintenanceService';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { AppState } from 'react-native';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    removeExpired: jest.fn(),
    getSize: jest.fn(),
    getItemCount: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('StorageMaintenanceService', () => {
  const mockRemove = jest.fn();
  const addEventListener = jest.spyOn(AppState, 'addEventListener');

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListener.mockReturnValue({ remove: mockRemove } as never);
    jest.mocked(asyncStorageService.get).mockResolvedValue(null);
    jest.mocked(asyncStorageService.set).mockResolvedValue(undefined);
    jest.mocked(asyncStorageService.removeExpired).mockResolvedValue(undefined);
    jest.mocked(asyncStorageService.getSize).mockResolvedValue(128);
    jest.mocked(asyncStorageService.getItemCount).mockResolvedValue(4);
  });

  afterEach(() => {
    storageMaintenanceService.destroy();
  });

  it('runs cleanup when due', async () => {
    await storageMaintenanceService.runIfDue(1000);

    expect(asyncStorageService.removeExpired).toHaveBeenCalled();
    expect(asyncStorageService.set).toHaveBeenCalledWith('maintenance:lastStorageCleanupAt', 1000);
  });

  it('skips cleanup when it already ran recently', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValueOnce(1000);

    await storageMaintenanceService.runIfDue(1000 + 60 * 1000);

    expect(asyncStorageService.removeExpired).not.toHaveBeenCalled();
  });

  it('subscribes once and cleans up its app-state listener', () => {
    storageMaintenanceService.initialize();
    storageMaintenanceService.initialize();

    expect(addEventListener).toHaveBeenCalledTimes(1);

    storageMaintenanceService.destroy();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
