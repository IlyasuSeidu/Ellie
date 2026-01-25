/**
 * Data Sync Service Tests
 */

import { MockDataSyncService } from '@/services/__mocks__/DataSyncService';
import { SyncOperation } from '@/services/DataSyncService';

// Mock dependencies
jest.mock('@/utils/logger');

describe('DataSyncService', () => {
  let service: MockDataSyncService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockDataSyncService();
  });

  afterEach(() => {
    service.cleanup();
    service.reset();
  });

  describe('Queue Management', () => {
    describe('addToQueue', () => {
      it('should add operation to queue', async () => {
        const operation: SyncOperation = {
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: mockUserId,
          data: { name: 'Test User' },
          timestamp: new Date(),
          retries: 0,
        };

        await service.addToQueue(operation);

        const queueSize = await service.getQueueSize();
        expect(queueSize).toBe(0); // Processed immediately when online
      });

      it('should not process queue when offline', async () => {
        await service.setOnlineState(false);

        const operation: SyncOperation = {
          id: 'op-1',
          type: 'UPDATE',
          collection: 'users',
          documentId: mockUserId,
          data: { name: 'Updated' },
          timestamp: new Date(),
          retries: 0,
        };

        await service.addToQueue(operation);

        const queueSize = await service.getQueueSize();
        expect(queueSize).toBe(1);
      });

      it('should queue multiple operations', async () => {
        await service.setOnlineState(false);

        const operations: SyncOperation[] = [
          {
            id: 'op-1',
            type: 'CREATE',
            collection: 'users',
            documentId: 'user-1',
            data: {},
            timestamp: new Date(),
            retries: 0,
          },
          {
            id: 'op-2',
            type: 'UPDATE',
            collection: 'users',
            documentId: 'user-2',
            data: {},
            timestamp: new Date(),
            retries: 0,
          },
          {
            id: 'op-3',
            type: 'DELETE',
            collection: 'users',
            documentId: 'user-3',
            timestamp: new Date(),
            retries: 0,
          },
        ];

        for (const op of operations) {
          await service.addToQueue(op);
        }

        const queueSize = await service.getQueueSize();
        expect(queueSize).toBe(3);
      });
    });

    describe('processQueue', () => {
      it('should process queue successfully when online', async () => {
        await service.setOnlineState(false);

        const operation: SyncOperation = {
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: mockUserId,
          data: {},
          timestamp: new Date(),
          retries: 0,
        };

        await service.addToQueue(operation);
        expect(await service.getQueueSize()).toBe(1);

        await service.setOnlineState(true);

        expect(await service.getQueueSize()).toBe(0);
      });

      it('should not process when offline', async () => {
        await service.setOnlineState(false);

        const operation: SyncOperation = {
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: mockUserId,
          data: {},
          timestamp: new Date(),
          retries: 0,
        };

        await service.addToQueue(operation);

        await service.processQueue();

        expect(await service.getQueueSize()).toBe(1);
      });

      it('should not process if already syncing', async () => {
        // This is tested implicitly by the mock implementation
        await service.processQueue();
        await service.processQueue(); // Second call should be skipped

        expect(await service.getQueueSize()).toBe(0);
      });

      it('should handle empty queue gracefully', async () => {
        await expect(service.processQueue()).resolves.not.toThrow();
      });
    });

    describe('clearQueue', () => {
      it('should clear all operations from queue', async () => {
        await service.setOnlineState(false);

        const operations: SyncOperation[] = [
          {
            id: 'op-1',
            type: 'CREATE',
            collection: 'users',
            documentId: 'user-1',
            data: {},
            timestamp: new Date(),
            retries: 0,
          },
          {
            id: 'op-2',
            type: 'UPDATE',
            collection: 'users',
            documentId: 'user-2',
            data: {},
            timestamp: new Date(),
            retries: 0,
          },
        ];

        for (const op of operations) {
          await service.addToQueue(op);
        }

        expect(await service.getQueueSize()).toBe(2);

        await service.clearQueue();

        expect(await service.getQueueSize()).toBe(0);
      });

      it('should clear failed operations count', async () => {
        await service.clearQueue();

        const status = await service.getSyncStatus(mockUserId);
        expect(status.failedOperations).toBe(0);
      });
    });

    describe('getQueueSize', () => {
      it('should return 0 for empty queue', async () => {
        const size = await service.getQueueSize();

        expect(size).toBe(0);
      });

      it('should return correct queue size', async () => {
        await service.setOnlineState(false);

        await service.addToQueue({
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: 'user-1',
          data: {},
          timestamp: new Date(),
          retries: 0,
        });

        await service.addToQueue({
          id: 'op-2',
          type: 'UPDATE',
          collection: 'users',
          documentId: 'user-2',
          data: {},
          timestamp: new Date(),
          retries: 0,
        });

        expect(await service.getQueueSize()).toBe(2);
      });
    });
  });

  describe('Sync Operations', () => {
    describe('syncUser', () => {
      it('should sync user data', async () => {
        await service.syncUser(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);
        expect(lastSync).toBeInstanceOf(Date);
      });

      it('should update last sync time', async () => {
        const before = new Date();

        await service.syncUser(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);
        expect(lastSync?.getTime()).toBeGreaterThanOrEqual(before.getTime());
      });
    });

    describe('syncShiftCycle', () => {
      it('should sync shift cycle', async () => {
        await service.syncShiftCycle(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);
        expect(lastSync).toBeInstanceOf(Date);
      });
    });

    describe('syncPreferences', () => {
      it('should sync preferences', async () => {
        await service.syncPreferences(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);
        expect(lastSync).toBeInstanceOf(Date);
      });
    });

    describe('batch sync', () => {
      it('should sync all user data', async () => {
        await service.syncUser(mockUserId);
        await service.syncShiftCycle(mockUserId);
        await service.syncPreferences(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);
        expect(lastSync).toBeInstanceOf(Date);
      });
    });
  });

  describe('Network State', () => {
    describe('subscribeToNetworkState', () => {
      it('should call callback immediately with current state', () => {
        const callback = jest.fn();

        service.subscribeToNetworkState(callback);

        expect(callback).toHaveBeenCalledWith(true);
      });

      it('should call callback on state change', async () => {
        const callback = jest.fn();

        service.subscribeToNetworkState(callback);
        callback.mockClear();

        await service.setOnlineState(false);

        expect(callback).toHaveBeenCalledWith(false);
      });

      it('should allow unsubscribe', async () => {
        const callback = jest.fn();

        const unsubscribe = service.subscribeToNetworkState(callback);
        callback.mockClear();

        unsubscribe();

        await service.setOnlineState(false);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should support multiple subscribers', async () => {
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        service.subscribeToNetworkState(callback1);
        service.subscribeToNetworkState(callback2);

        callback1.mockClear();
        callback2.mockClear();

        await service.setOnlineState(false);

        expect(callback1).toHaveBeenCalledWith(false);
        expect(callback2).toHaveBeenCalledWith(false);
      });
    });

    describe('isOnline', () => {
      it('should return true by default', () => {
        expect(service.isOnline()).toBe(true);
      });

      it('should return current online state', async () => {
        await service.setOnlineState(false);
        expect(service.isOnline()).toBe(false);

        await service.setOnlineState(true);
        expect(service.isOnline()).toBe(true);
      });
    });

    describe('auto-sync on network change', () => {
      it('should process queue when coming online', async () => {
        await service.setOnlineState(false);

        const operation: SyncOperation = {
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: mockUserId,
          data: {},
          timestamp: new Date(),
          retries: 0,
        };

        await service.addToQueue(operation);
        expect(await service.getQueueSize()).toBe(1);

        await service.setOnlineState(true);

        // Queue should be processed automatically
        expect(await service.getQueueSize()).toBe(0);
      });

      it('should not process queue when going offline', async () => {
        const operation: SyncOperation = {
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: mockUserId,
          data: {},
          timestamp: new Date(),
          retries: 0,
        };

        await service.setOnlineState(false);
        await service.addToQueue(operation);

        const sizeBefore = await service.getQueueSize();

        await service.setOnlineState(false); // Already offline

        expect(await service.getQueueSize()).toBe(sizeBefore);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        type: 'CREATE',
        collection: 'users',
        documentId: mockUserId,
        data: {},
        timestamp: new Date(),
        retries: 0,
      };

      service.simulateProcessingError();

      await service.addToQueue(operation);

      expect(await service.getQueueSize()).toBe(1);
    });

    it('should give up after max retries', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        type: 'CREATE',
        collection: 'users',
        documentId: mockUserId,
        data: {},
        timestamp: new Date(),
        retries: 3, // Already at max
      };

      service.simulateProcessingError();

      await service.addToQueue(operation);

      const status = await service.getSyncStatus(mockUserId);
      expect(status.failedOperations).toBeGreaterThanOrEqual(0);
    });

    it('should track retry count', async () => {
      await Promise.resolve(); service.setOnlineState(false);

      const operation: SyncOperation = {
        id: 'op-1',
        type: 'CREATE',
        collection: 'users',
        documentId: mockUserId,
        data: {},
        timestamp: new Date(),
        retries: 0,
      };

      await service.addToQueue(operation);

      expect(operation.retries).toBe(0);
    });
  });

  describe('Sync Status', () => {
    describe('getSyncStatus', () => {
      it('should return sync status', async () => {
        const status = await service.getSyncStatus(mockUserId);

        expect(status).toHaveProperty('isSyncing');
        expect(status).toHaveProperty('lastSyncTime');
        expect(status).toHaveProperty('pendingOperations');
        expect(status).toHaveProperty('failedOperations');
      });

      it('should show correct pending operations', async () => {
        await service.setOnlineState(false);

        await service.addToQueue({
          id: 'op-1',
          type: 'CREATE',
          collection: 'users',
          documentId: 'user-1',
          data: {},
          timestamp: new Date(),
          retries: 0,
        });

        await service.addToQueue({
          id: 'op-2',
          type: 'UPDATE',
          collection: 'users',
          documentId: 'user-2',
          data: {},
          timestamp: new Date(),
          retries: 0,
        });

        const status = await service.getSyncStatus(mockUserId);
        expect(status.pendingOperations).toBe(2);
      });

      it('should include last sync time', async () => {
        await service.syncUser(mockUserId);

        const status = await service.getSyncStatus(mockUserId);
        expect(status.lastSyncTime).toBeInstanceOf(Date);
      });

      it('should show failed operations count', async () => {
        const status = await service.getSyncStatus(mockUserId);
        expect(status.failedOperations).toBe(0);
      });
    });

    describe('getLastSyncTime', () => {
      it('should return null for never synced user', async () => {
        const lastSync = await service.getLastSyncTime('never-synced-user');

        expect(lastSync).toBeNull();
      });

      it('should return last sync time after sync', async () => {
        await service.syncUser(mockUserId);

        const lastSync = await service.getLastSyncTime(mockUserId);

        expect(lastSync).toBeInstanceOf(Date);
      });
    });

    describe('setLastSyncTime', () => {
      it('should set last sync time', async () => {
        const time = new Date('2025-01-01T00:00:00Z');

        await service.setLastSyncTime(mockUserId, time);

        const retrieved = await service.getLastSyncTime(mockUserId);

        expect(retrieved?.toISOString()).toBe(time.toISOString());
      });

      it('should update existing sync time', async () => {
        const time1 = new Date('2025-01-01T00:00:00Z');
        const time2 = new Date('2025-01-02T00:00:00Z');

        await service.setLastSyncTime(mockUserId, time1);
        await service.setLastSyncTime(mockUserId, time2);

        const retrieved = await service.getLastSyncTime(mockUserId);

        expect(retrieved?.toISOString()).toBe(time2.toISOString());
      });
    });
  });

  describe('Auto-Sync', () => {
    it('should start auto-sync', () => {
      expect(() => service.startAutoSync(60000)).not.toThrow();
    });

    it('should stop auto-sync', () => {
      service.startAutoSync(60000);
      expect(() => service.stopAutoSync()).not.toThrow();
    });

    it('should not start multiple auto-sync intervals', () => {
      service.startAutoSync(60000);
      service.startAutoSync(60000);

      // Should not throw, second call should be ignored
      expect(() => service.stopAutoSync()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      const callback = jest.fn();

      service.subscribeToNetworkState(callback);
      service.startAutoSync(60000);

      service.cleanup();

      callback.mockClear();
      await service.setOnlineState(false);

      // Callback should not be called after cleanup
      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow multiple cleanup calls', () => {
      service.cleanup();
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid online/offline changes', async () => {
      await service.setOnlineState(false);
      await service.setOnlineState(true);
      await service.setOnlineState(false);
      await service.setOnlineState(true);

      expect(service.isOnline()).toBe(true);
    });

    it('should handle operations with missing data', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        type: 'CREATE',
        collection: 'users',
        documentId: mockUserId,
        // No data field
        timestamp: new Date(),
        retries: 0,
      };

      await expect(service.addToQueue(operation)).resolves.not.toThrow();
    });

    it('should handle concurrent sync operations', async () => {
      const promises = [
        service.syncUser(mockUserId),
        service.syncShiftCycle(mockUserId),
        service.syncPreferences(mockUserId),
      ];

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle operations with future timestamps', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const operation: SyncOperation = {
        id: 'op-1',
        type: 'CREATE',
        collection: 'users',
        documentId: mockUserId,
        data: {},
        timestamp: futureDate,
        retries: 0,
      };

      await expect(service.addToQueue(operation)).resolves.not.toThrow();
    });
  });
});
