/**
 * Data Sync Service
 *
 * Bidirectional synchronization between local storage and Firestore
 * with offline queue, conflict resolution, and network-aware syncing.
 */

import { asyncStorageService } from './AsyncStorageService';
import { UserService, UserPreferences } from './UserService';
import { logger } from '@/utils/logger';
import { UserProfile, ShiftCycle } from '@/types';

/**
 * Sync operation type
 */
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Sync operation
 */
export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  collection: string;
  documentId: string;
  data?: unknown;
  timestamp: Date;
  retries: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  failedOperations: number;
}

/**
 * Network state callback
 */
export type NetworkStateCallback = (isOnline: boolean) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  SYNC_QUEUE: 'sync:queue',
  LAST_SYNC_TIME: 'sync:lastSyncTime:',
  FAILED_OPS: 'sync:failedOps',
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
};

/**
 * Data Sync Service
 */
export class DataSyncService {
  private userService: UserService;
  private isSyncing = false;
  private isOnlineState = true;
  private networkCallbacks: NetworkStateCallback[] = [];
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor(userService: UserService) {
    this.userService = userService;
    this.initializeNetworkListener();
  }

  /**
   * Add operation to sync queue
   */
  async addToQueue(operation: SyncOperation): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push(operation);
      await asyncStorageService.set(STORAGE_KEYS.SYNC_QUEUE, queue);

      logger.debug('Operation added to sync queue', {
        operationId: operation.id,
        type: operation.type,
      });

      // Process queue if online
      if (this.isOnline()) {
        this.processQueue();
      }
    } catch (error) {
      logger.error('Failed to add operation to queue', error as Error, {
        operationId: operation.id,
      });
      throw error;
    }
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    if (!this.isOnline()) {
      logger.debug('Device is offline, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      const queue = await this.getQueue();

      if (queue.length === 0) {
        logger.debug('Sync queue is empty');
        this.isSyncing = false;
        return;
      }

      logger.info('Processing sync queue', { operations: queue.length });

      const failedOps: SyncOperation[] = [];

      for (const operation of queue) {
        try {
          await this.processOperation(operation);
          logger.debug('Operation processed successfully', {
            operationId: operation.id,
          });
        } catch (error) {
          logger.error('Operation failed', error as Error, {
            operationId: operation.id,
            retries: operation.retries,
          });

          // Retry with exponential backoff
          if (operation.retries < RETRY_CONFIG.MAX_RETRIES) {
            operation.retries++;
            const delay = Math.min(
              RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(2, operation.retries),
              RETRY_CONFIG.MAX_DELAY_MS
            );
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Retry
            try {
              await this.processOperation(operation);
            } catch (retryError) {
              failedOps.push(operation);
            }
          } else {
            failedOps.push(operation);
          }
        }
      }

      // Update queue with failed operations
      await asyncStorageService.set(STORAGE_KEYS.SYNC_QUEUE, failedOps);

      // Store failed operations count
      await asyncStorageService.set(STORAGE_KEYS.FAILED_OPS, failedOps.length);

      logger.info('Sync queue processed', {
        succeeded: queue.length - failedOps.length,
        failed: failedOps.length,
      });
    } catch (error) {
      logger.error('Failed to process sync queue', error as Error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    try {
      await asyncStorageService.remove(STORAGE_KEYS.SYNC_QUEUE);
      await asyncStorageService.remove(STORAGE_KEYS.FAILED_OPS);

      logger.info('Sync queue cleared');
    } catch (error) {
      logger.error('Failed to clear sync queue', error as Error);
      throw error;
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    try {
      const queue = await this.getQueue();
      return queue.length;
    } catch (error) {
      logger.error('Failed to get queue size', error as Error);
      return 0;
    }
  }

  /**
   * Sync user data
   */
  async syncUser(userId: string): Promise<void> {
    logger.info('Syncing user data', { userId });

    try {
      // Get local and remote data
      const localUser = await asyncStorageService.get<UserProfile>(`user:${userId}`);
      const remoteUser = await this.userService.getUser(userId);

      if (!remoteUser && localUser) {
        // Local exists, remote doesn't - push to remote
        await this.userService.createUser(userId, localUser);
        logger.debug('User created on remote', { userId });
      } else if (remoteUser && !localUser) {
        // Remote exists, local doesn't - pull from remote
        await asyncStorageService.set(`user:${userId}`, remoteUser);
        logger.debug('User pulled from remote', { userId });
      } else if (remoteUser && localUser) {
        // Both exist - resolve conflict
        const resolved = this.resolveUserConflict(localUser, remoteUser);
        await this.userService.updateUser(userId, resolved);
        await asyncStorageService.set(`user:${userId}`, resolved);
        logger.debug('User conflict resolved', { userId });
      }

      await this.setLastSyncTime(userId, new Date());
    } catch (error) {
      logger.error('Failed to sync user', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Sync shift cycle
   */
  async syncShiftCycle(userId: string): Promise<void> {
    logger.info('Syncing shift cycle', { userId });

    try {
      const localCycle = await asyncStorageService.get<ShiftCycle>(`shiftCycle:${userId}`);
      const remoteCycle = await this.userService.getShiftCycle(userId);

      if (!remoteCycle && localCycle) {
        await this.userService.updateShiftCycle(userId, localCycle);
        logger.debug('Shift cycle pushed to remote', { userId });
      } else if (remoteCycle && !localCycle) {
        await asyncStorageService.set(`shiftCycle:${userId}`, remoteCycle);
        logger.debug('Shift cycle pulled from remote', { userId });
      } else if (remoteCycle && localCycle) {
        // Use remote as source of truth for shift cycles
        await asyncStorageService.set(`shiftCycle:${userId}`, remoteCycle);
        logger.debug('Shift cycle synced from remote', { userId });
      }
    } catch (error) {
      logger.error('Failed to sync shift cycle', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Sync preferences
   */
  async syncPreferences(userId: string): Promise<void> {
    logger.info('Syncing preferences', { userId });

    try {
      const localPrefs = await asyncStorageService.get<UserPreferences>(`preferences:${userId}`);
      const remotePrefs = await this.userService.getPreferences(userId);

      if (!remotePrefs && localPrefs) {
        await this.userService.savePreferences(userId, localPrefs);
        logger.debug('Preferences pushed to remote', { userId });
      } else if (remotePrefs && !localPrefs) {
        await asyncStorageService.set(`preferences:${userId}`, remotePrefs);
        logger.debug('Preferences pulled from remote', { userId });
      } else if (remotePrefs && localPrefs) {
        // Merge preferences intelligently
        const merged = this.mergePreferences(localPrefs, remotePrefs);
        await this.userService.savePreferences(userId, merged);
        await asyncStorageService.set(`preferences:${userId}`, merged);
        logger.debug('Preferences merged', { userId });
      }
    } catch (error) {
      logger.error('Failed to sync preferences', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    try {
      const lastSyncTime = await this.getLastSyncTime(userId);
      const pendingOperations = await this.getQueueSize();
      const failedOperations =
        (await asyncStorageService.get<number>(STORAGE_KEYS.FAILED_OPS)) || 0;

      return {
        isSyncing: this.isSyncing,
        lastSyncTime,
        pendingOperations,
        failedOperations,
      };
    } catch (error) {
      logger.error('Failed to get sync status', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(userId: string): Promise<Date | null> {
    try {
      const timestamp = await asyncStorageService.get<string>(
        `${STORAGE_KEYS.LAST_SYNC_TIME}${userId}`
      );
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      logger.error('Failed to get last sync time', error as Error, { userId });
      return null;
    }
  }

  /**
   * Set last sync time
   */
  async setLastSyncTime(userId: string, time: Date): Promise<void> {
    try {
      await asyncStorageService.set(`${STORAGE_KEYS.LAST_SYNC_TIME}${userId}`, time.toISOString());
    } catch (error) {
      logger.error('Failed to set last sync time', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Subscribe to network state changes
   */
  subscribeToNetworkState(callback: NetworkStateCallback): Unsubscribe {
    this.networkCallbacks.push(callback);

    // Immediately call with current state
    callback(this.isOnlineState);

    return () => {
      const index = this.networkCallbacks.indexOf(callback);
      if (index > -1) {
        this.networkCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.isOnlineState;
  }

  /**
   * Set online state (for testing)
   */
  setOnlineState(isOnline: boolean): void {
    const wasOnline = this.isOnlineState;
    this.isOnlineState = isOnline;

    // Notify callbacks
    this.networkCallbacks.forEach((callback) => callback(isOnline));

    // Auto-sync when coming online
    if (!wasOnline && isOnline) {
      logger.info('Device came online, processing sync queue');
      this.processQueue();
    }
  }

  /**
   * Start auto-sync
   */
  startAutoSync(intervalMs: number = 60000): void {
    if (this.autoSyncInterval) {
      return;
    }

    this.autoSyncInterval = setInterval(() => {
      if (this.isOnline()) {
        this.processQueue();
      }
    }, intervalMs);

    logger.info('Auto-sync started', { intervalMs });
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      logger.info('Auto-sync stopped');
    }
  }

  /**
   * Get sync queue
   */
  private async getQueue(): Promise<SyncOperation[]> {
    const queue = await asyncStorageService.get<SyncOperation[]>(STORAGE_KEYS.SYNC_QUEUE);
    return queue || [];
  }

  /**
   * Process a single sync operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    const { type, collection, documentId, data } = operation;

    switch (type) {
      case 'CREATE':
        if (collection === 'users' && data) {
          await this.userService.createUser(documentId, data as UserProfile);
        }
        break;

      case 'UPDATE':
        if (collection === 'users' && data) {
          await this.userService.updateUser(documentId, data as Partial<UserProfile>);
        }
        break;

      case 'DELETE':
        if (collection === 'users') {
          await this.userService.deleteUser(documentId);
        }
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Resolve user data conflict (last-write-wins)
   */
  private resolveUserConflict(local: UserProfile, remote: UserProfile): UserProfile {
    // Compare timestamps - use server timestamp as source of truth
    const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;

    if (remoteTime >= localTime) {
      logger.debug('Using remote data (newer)', { localTime, remoteTime });
      return remote;
    }

    logger.debug('Using local data (newer)', { localTime, remoteTime });
    return local;
  }

  /**
   * Merge user preferences intelligently
   */
  private mergePreferences(local: UserPreferences, remote: UserPreferences): UserPreferences {
    // Merge preferences, preferring local for UI settings
    // and remote for sync-critical settings
    return {
      theme: local.theme || remote.theme,
      language: local.language || remote.language,
      timezone: local.timezone || remote.timezone,
      notifications: {
        ...remote.notifications,
        ...local.notifications,
      },
    };
  }

  /**
   * Initialize network listener
   */
  private initializeNetworkListener(): void {
    // In a real app, this would use NetInfo
    // For now, we assume online by default
    this.isOnlineState = true;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAutoSync();
    this.networkCallbacks = [];
  }
}
