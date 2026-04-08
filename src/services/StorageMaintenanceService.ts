import { AppState, type AppStateStatus } from 'react-native';
import { asyncStorageService, type AsyncStorageService } from '@/services/AsyncStorageService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/utils/logger';

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

class StorageMaintenanceService {
  private appStateSubscription: { remove: () => void } | null = null;

  constructor(private readonly storage: AsyncStorageService = asyncStorageService) {}

  async runIfDue(now = Date.now()): Promise<void> {
    try {
      const lastRun = await this.storage.get<number>(STORAGE_KEYS.maintenance.lastStorageCleanupAt);
      if (typeof lastRun === 'number' && now - lastRun < CLEANUP_INTERVAL_MS) {
        return;
      }

      await this.storage.removeExpired();
      await this.storage.set(STORAGE_KEYS.maintenance.lastStorageCleanupAt, now);

      if (__DEV__) {
        const [size, itemCount] = await Promise.all([
          this.storage.getSize(),
          this.storage.getItemCount(),
        ]);
        logger.debug('Storage maintenance completed', { size, itemCount });
      }
    } catch (error) {
      logger.warn('Storage maintenance failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  initialize(): void {
    if (this.appStateSubscription) {
      return;
    }

    void this.runIfDue();
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  destroy(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active') {
      void this.runIfDue();
    }
  };
}

export const storageMaintenanceService = new StorageMaintenanceService();
