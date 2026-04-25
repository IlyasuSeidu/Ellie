/**
 * Data Sync Service
 *
 * Legacy compatibility service retained for tests and non-runtime experiments.
 *
 * The production app no longer relies on this class as the primary offline
 * synchronization model. Runtime offline behavior is handled by:
 * - local-first storage/context state
 * - FirebaseService document cache fallback
 * - feature-specific persistence paths (subscription cache, onboarding, reminders)
 *
 * This service should not be expanded into the main Firestore offline path again
 * without a clear non-Firestore queueing requirement.
 */

import { asyncStorageService } from './AsyncStorageService';
import { UserService, UserPreferences } from './UserService';
import { networkService } from '@/services/NetworkService';
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

export type SyncFailureReason = 'network' | 'auth' | 'validation' | 'unknown';

export interface FailedSyncOperation extends SyncOperation {
  failedAt: Date;
  lastError: string;
  reason: SyncFailureReason;
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
  DEAD_LETTER: 'sync:deadLetter',
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
 *
 * @deprecated Legacy compatibility/test service. Do not use for production
 * offline or Firestore synchronization paths.
 */
export class DataSyncService {
  private userService: UserService;
  private isSyncing = false;
  private isOnlineState = true;
  private networkCallbacks: NetworkStateCallback[] = [];
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private syncStartedAt: number | null = null;
  private unsubscribeNetwork: (() => void) | null = null;

  constructor(userService: UserService) {
    if (
      process.env.NODE_ENV !== 'test' &&
      process.env.EXPO_PUBLIC_ENABLE_LEGACY_DATA_SYNC !== 'true'
    ) {
      const error = new Error(
        'DataSyncService is legacy-only and must not be used as the production offline sync path.'
      );
      logger.error('DataSyncService construction blocked', error);
      throw error;
    }

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
        await this.processQueue();
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
      const syncAgeMs = this.syncStartedAt ? Date.now() - this.syncStartedAt : 0;
      if (syncAgeMs < 60000) {
        logger.debug('Sync already in progress, skipping');
        return;
      }

      logger.warn('DataSyncService: sync watchdog triggered — resetting stuck sync');
      this.isSyncing = false;
    }

    if (!this.isOnline()) {
      logger.debug('Device is offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.syncStartedAt = Date.now();

    try {
      const queue = await this.getQueue();

      if (queue.length === 0) {
        logger.debug('Sync queue is empty');
        this.isSyncing = false;
        return;
      }

      logger.info('Processing sync queue', { operations: queue.length });

      const deadLetter = await this.getFailedOperations();
      let succeededCount = 0;

      for (const operation of queue) {
        const result = await this.processOperationWithRetries(operation);

        if (result.status === 'success') {
          succeededCount += 1;
          logger.debug('Operation processed successfully', {
            operationId: operation.id,
          });
        } else {
          deadLetter.push(result.operation);
        }
      }

      await asyncStorageService.set(STORAGE_KEYS.SYNC_QUEUE, []);
      await asyncStorageService.set(STORAGE_KEYS.DEAD_LETTER, deadLetter);

      await asyncStorageService.set(STORAGE_KEYS.FAILED_OPS, deadLetter.length);

      logger.info('Sync queue processed', {
        succeeded: succeededCount,
        retrying: 0,
        failed: deadLetter.length,
      });
    } catch (error) {
      logger.error('Failed to process sync queue', error as Error);
    } finally {
      this.isSyncing = false;
      this.syncStartedAt = null;
    }
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    try {
      await asyncStorageService.remove(STORAGE_KEYS.SYNC_QUEUE);
      await asyncStorageService.remove(STORAGE_KEYS.FAILED_OPS);
      await asyncStorageService.remove(STORAGE_KEYS.DEAD_LETTER);

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
      const failedOperations = (await this.getFailedOperations()).length;

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

  async getFailedOperations(): Promise<FailedSyncOperation[]> {
    try {
      const failedOps = await asyncStorageService.get<FailedSyncOperation[]>(
        STORAGE_KEYS.DEAD_LETTER
      );
      return failedOps ?? [];
    } catch (error) {
      logger.error('Failed to get dead-letter operations', error as Error);
      return [];
    }
  }

  async retryFailedOperations(): Promise<number> {
    const failedOperations = await this.getFailedOperations();
    if (failedOperations.length === 0) {
      return 0;
    }

    const queue = await this.getQueue();
    const retriableOperations = failedOperations.map<SyncOperation>(
      ({ failedAt: _failedAt, lastError: _lastError, reason: _reason, ...operation }) => ({
        ...operation,
        retries: 0,
      })
    );

    await asyncStorageService.set(STORAGE_KEYS.SYNC_QUEUE, [...queue, ...retriableOperations]);
    await asyncStorageService.remove(STORAGE_KEYS.DEAD_LETTER);
    await asyncStorageService.set(STORAGE_KEYS.FAILED_OPS, 0);

    if (this.isOnline()) {
      await this.processQueue();
    }

    return retriableOperations.length;
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
  async setOnlineState(isOnline: boolean): Promise<void> {
    const wasOnline = this.isOnlineState;
    this.isOnlineState = isOnline;

    // Notify callbacks
    this.networkCallbacks.forEach((callback) => callback(isOnline));

    // Auto-sync when coming online
    if (!wasOnline && isOnline) {
      logger.info('Device came online, processing sync queue');
      await this.processQueue();
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
        void this.processQueue();
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
        } else if ((collection === 'preferences' || collection === 'userPreferences') && data) {
          await this.userService.savePreferences(documentId, data as UserPreferences);
        } else if ((collection === 'shiftCycles' || collection === 'shiftCycle') && data) {
          await this.userService.updateShiftCycle(documentId, data as ShiftCycle);
        }
        break;

      case 'UPDATE':
        if (collection === 'users' && data) {
          await this.userService.updateUser(documentId, data as Partial<UserProfile>);
        } else if ((collection === 'preferences' || collection === 'userPreferences') && data) {
          await this.userService.savePreferences(documentId, data as UserPreferences);
        } else if ((collection === 'shiftCycles' || collection === 'shiftCycle') && data) {
          await this.userService.updateShiftCycle(documentId, data as ShiftCycle);
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
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = networkService.subscribe((snapshot) => {
      const nextIsOnline = snapshot.status === 'online';
      void this.setOnlineState(nextIsOnline);
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAutoSync();
    this.unsubscribeNetwork?.();
    this.unsubscribeNetwork = null;
    this.networkCallbacks = [];
  }

  private async processOperationWithRetries(
    operation: SyncOperation
  ): Promise<{ status: 'success' } | { status: 'failed'; operation: FailedSyncOperation }> {
    let attemptOperation: SyncOperation = { ...operation };
    let lastError: Error | null = null;

    while (attemptOperation.retries < RETRY_CONFIG.MAX_RETRIES) {
      try {
        await this.processOperation(attemptOperation);
        return { status: 'success' };
      } catch (error) {
        lastError = error as Error;
        logger.error('Operation failed', lastError, {
          operationId: attemptOperation.id,
          retries: attemptOperation.retries,
        });

        attemptOperation = {
          ...attemptOperation,
          retries: attemptOperation.retries + 1,
        };

        if (attemptOperation.retries >= RETRY_CONFIG.MAX_RETRIES) {
          break;
        }

        const delay = Math.min(
          RETRY_CONFIG.INITIAL_DELAY_MS * Math.pow(2, Math.max(0, attemptOperation.retries - 1)),
          RETRY_CONFIG.MAX_DELAY_MS
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      status: 'failed',
      operation: {
        ...attemptOperation,
        failedAt: new Date(),
        lastError: lastError?.message ?? 'Unknown sync failure',
        reason: this.classifyFailureReason(lastError),
      },
    };
  }

  private classifyFailureReason(error: Error | null): SyncFailureReason {
    const message = error?.message?.toLowerCase() ?? '';
    if (message.includes('network') || message.includes('offline') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('permission') || message.includes('token')) {
      return 'auth';
    }
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'validation';
    }
    return 'unknown';
  }
}
