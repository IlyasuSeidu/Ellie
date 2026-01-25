/**
 * Mock Data Sync Service for Testing
 */

import {
  SyncOperation,
  SyncStatus,
  NetworkStateCallback,
  Unsubscribe,
} from '../DataSyncService';

/**
 * Mock Data Sync Service
 */
export class MockDataSyncService {
  private queue: SyncOperation[] = [];
  private isSyncing = false;
  private isOnlineState = true;
  private networkCallbacks: NetworkStateCallback[] = [];
  private lastSyncTimes: Map<string, Date> = new Map();
  private failedOpsCount = 0;

  async addToQueue(operation: SyncOperation): Promise<void> {
    this.queue.push(operation);

    // Auto-process if online
    if (this.isOnline()) {
      await this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    await Promise.resolve();
    if (this.isSyncing) {
      return;
    }

    if (!this.isOnline()) {
      return;
    }

    this.isSyncing = true;

    const failedOps: SyncOperation[] = [];

    for (const operation of this.queue) {
      try {
        // Simulate processing
        await this.processOperation(operation);
      } catch (error) {
        if (operation.retries < 3) {
          operation.retries++;
          failedOps.push(operation);
        } else {
          this.failedOpsCount++;
        }
      }
    }

    this.queue = failedOps;
    this.isSyncing = false;
  }

  async clearQueue(): Promise<void> {
    await Promise.resolve();
    this.queue = [];
    this.failedOpsCount = 0;
  }

  async getQueueSize(): Promise<number> {
    await Promise.resolve();
    return this.queue.length;
  }

  async syncUser(userId: string): Promise<void> {
    // Simulate sync
    await this.setLastSyncTime(userId, new Date());
  }

  async syncShiftCycle(userId: string): Promise<void> {
    // Simulate sync
    await this.setLastSyncTime(userId, new Date());
  }

  async syncPreferences(userId: string): Promise<void> {
    // Simulate sync
    await this.setLastSyncTime(userId, new Date());
  }

  async getSyncStatus(userId: string): Promise<SyncStatus> {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: await this.getLastSyncTime(userId),
      pendingOperations: this.queue.length,
      failedOperations: this.failedOpsCount,
    };
  }

  async getLastSyncTime(userId: string): Promise<Date | null> {
    await Promise.resolve();
    return this.lastSyncTimes.get(userId) || null;
  }

  async setLastSyncTime(userId: string, time: Date): Promise<void> {
    await Promise.resolve();
    this.lastSyncTimes.set(userId, time);
  }

  subscribeToNetworkState(callback: NetworkStateCallback): Unsubscribe {
    this.networkCallbacks.push(callback);
    callback(this.isOnlineState);

    return () => {
      const index = this.networkCallbacks.indexOf(callback);
      if (index > -1) {
        this.networkCallbacks.splice(index, 1);
      }
    };
  }

  isOnline(): boolean {
    return this.isOnlineState;
  }

  async setOnlineState(isOnline: boolean): Promise<void> {
    const wasOnline = this.isOnlineState;
    this.isOnlineState = isOnline;

    this.networkCallbacks.forEach((callback) => callback(isOnline));

    if (!wasOnline && isOnline) {
      await this.processQueue();
    }
  }

  startAutoSync(_intervalMs: number = 60000): void {
    // Mock - no actual interval needed
  }

  stopAutoSync(): void {
    // Mock - no actual interval to stop
  }

  cleanup(): void {
    this.networkCallbacks = [];
  }

  // Test helpers
  reset(): void {
    this.queue = [];
    this.isSyncing = false;
    this.isOnlineState = true;
    this.networkCallbacks = [];
    this.lastSyncTimes.clear();
    this.failedOpsCount = 0;
  }

  getFailedOpsCount(): number {
    return this.failedOpsCount;
  }

  simulateProcessingError(): void {
    // Next operation will fail
    this.shouldFail = true;
  }

  private shouldFail = false;

  private async processOperation(_operation: SyncOperation): Promise<void> {
    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error('Simulated processing error');
    }
    await Promise.resolve();
    // Simulate successful processing
  }
}

export const DataSyncService = MockDataSyncService;
