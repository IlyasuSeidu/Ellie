/**
 * Basic Service Integration Tests
 *
 * Simpler integration tests that verify services work together
 */

import { MockAuthService } from '@/services/__mocks__/AuthService';
import { MockAsyncStorageService } from '@/services/__mocks__/AsyncStorageService';
import { MockSessionService } from '@/services/__mocks__/SessionService';
import { MockDataSyncService } from '@/services/__mocks__/DataSyncService';

jest.mock('@/utils/logger');

describe('Basic Service Integration', () => {
  let authService: MockAuthService;
  let storageService: MockAsyncStorageService;
  let sessionService: MockSessionService;
  let dataSyncService: MockDataSyncService;

  const testPassword = 'TestPass123!';
  let testEmail: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testEmail = `test-${Date.now()}-${Math.random()}@example.com`;
    authService = new MockAuthService();
    storageService = new MockAsyncStorageService();
    sessionService = new MockSessionService();
    dataSyncService = new MockDataSyncService();
  });

  afterEach(() => {
    authService.cleanup();
    authService.reset();
    storageService.reset();
    sessionService.cleanup();
    sessionService.reset();
    dataSyncService.cleanup();
    dataSyncService.reset();
  });

  describe('Auth + Session + Storage Integration', () => {
    it('should complete user login workflow', async () => {
      // 1. Sign up with auth
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      expect(user.email).toBe(testEmail);

      // 2. Cache user in storage
      await storageService.set(`user:${user.uid}`, {
        uid: user.uid,
        email: testEmail,
      });

      // 3. Start session
      const session = await sessionService.startSession(user.uid);
      expect(session.userId).toBe(user.uid);

      // 4. Verify all services have consistent data
      const currentUser = authService.getCurrentUser();
      const cachedUser = await storageService.get<{ uid: string; email: string }>(
        `user:${user.uid}`
      );
      const currentSession = sessionService.getCurrentSession();

      expect(currentUser?.uid).toBe(user.uid);
      expect(cachedUser?.uid).toBe(user.uid);
      expect(currentSession?.userId).toBe(user.uid);
    });

    it('should handle complete logout workflow', async () => {
      // Setup
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      await storageService.set(`user:${user.uid}`, { uid: user.uid, email: testEmail });
      const session = await sessionService.startSession(user.uid);

      // Logout workflow
      await sessionService.endSession(session.id);
      await storageService.remove(`user:${user.uid}`);
      await authService.signOut();

      // Verify cleanup
      expect(authService.getCurrentUser()).toBeNull();
      expect(sessionService.getCurrentSession()).toBeNull();

      const cachedUser = await storageService.get(`user:${user.uid}`);
      expect(cachedUser).toBeNull();
    });
  });

  describe('Storage + Sync Integration', () => {
    it('should sync cached data when going online', async () => {
      // Setup user
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const userId = user.uid;

      // Go offline
      await dataSyncService.setOnlineState(false);

      // Make changes locally
      await storageService.set(`userData:${userId}`, {
        userId,
        lastUpdate: new Date().toISOString(),
      });

      // Queue sync operation
      await dataSyncService.addToQueue({
        id: 'op-1',
        type: 'UPDATE',
        collection: 'users',
        documentId: userId,
        data: { lastUpdate: new Date().toISOString() },
        timestamp: new Date(),
        retries: 0,
      });

      expect(await dataSyncService.getQueueSize()).toBe(1);

      // Go online - should auto-sync
      await dataSyncService.setOnlineState(true);

      // Verify sync completed
      expect(await dataSyncService.getQueueSize()).toBe(0);
    });
  });

  describe('Session + Storage Integration', () => {
    it('should track events and cache session data', async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const session = await sessionService.startSession(user.uid);

      // Track events
      await sessionService.trackScreenView(session.id, 'HomeScreen');
      await sessionService.trackScreenView(session.id, 'ProfileScreen');

      // Cache session data
      const currentSession = sessionService.getCurrentSession();
      await storageService.set(`session:${session.id}`, currentSession);

      // Verify
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cachedSession = await storageService.get<any>(`session:${session.id}`);
      expect(cachedSession).toBeDefined();
      expect(cachedSession.events).toHaveLength(2);
    });

    it('should handle session timeout with storage cleanup', async () => {
      jest.useFakeTimers();

      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const session = await sessionService.startSession(user.uid);

      // Cache session
      await storageService.set(`session:${session.id}`, session);

      // Setup timeout callback
      const cleanupCallback = jest.fn(async () => {
        await storageService.remove(`session:${session.id}`);
      });
      sessionService.onSessionTimeout(cleanupCallback);

      // Trigger timeout
      jest.advanceTimersByTime(30 * 60 * 1000);

      // Verify cleanup called
      expect(cleanupCallback).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Multi-Service Data Flow', () => {
    it('should maintain data consistency across all services', async () => {
      // 1. Create account
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const userId = user.uid;

      // 2. Start session
      const session = await sessionService.startSession(userId);

      // 3. Cache user data
      await storageService.set(`user:${userId}`, {
        uid: userId,
        email: testEmail,
        createdAt: new Date().toISOString(),
      });

      // 4. Track activity
      await sessionService.trackEvent(session.id, {
        type: 'ACTION',
        name: 'account_created',
        timestamp: new Date(),
      });

      // 5. Queue sync
      await dataSyncService.addToQueue({
        id: 'sync-1',
        type: 'CREATE',
        collection: 'users',
        documentId: userId,
        data: { email: testEmail },
        timestamp: new Date(),
        retries: 0,
      });

      // Verify all services have consistent user ID
      expect(authService.getCurrentUser()?.uid).toBe(userId);
      expect(sessionService.getCurrentSession()?.userId).toBe(userId);

      const cachedUser = await storageService.get<{uid: string}>(`user:${userId}`);
      expect(cachedUser?.uid).toBe(userId);

      const syncStatus = await dataSyncService.getSyncStatus(userId);
      expect(syncStatus).toBeDefined();
    });

    it('should handle complete account deletion across services', async () => {
      // Setup
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const userId = user.uid;
      const session = await sessionService.startSession(userId);

      await storageService.set(`user:${userId}`, { uid: userId });
      await storageService.set(`session:${session.id}`, session);

      // Delete workflow
      await sessionService.endSession(session.id);
      await storageService.remove(`user:${userId}`);
      await storageService.remove(`session:${session.id}`);
      await dataSyncService.clearQueue();
      await authService.deleteAccount();

      // Verify complete cleanup
      expect(authService.getCurrentUser()).toBeNull();
      expect(sessionService.getCurrentSession()).toBeNull();
      expect(await storageService.get(`user:${userId}`)).toBeNull();
      expect(await dataSyncService.getQueueSize()).toBe(0);
    });
  });

  describe('Error Handling Across Services', () => {
    it('should handle auth errors gracefully', async () => {
      // Try invalid registration
      await expect(authService.signUpWithEmail('invalid', 'weak')).rejects.toThrow();

      // Verify no session started
      expect(sessionService.getCurrentSession()).toBeNull();

      // Verify no data cached
      const allKeys = await storageService.getAllKeys();
      expect(allKeys).toHaveLength(0);
    });

    it('should handle sync failures without breaking cache', async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);

      // Cache some data
      await storageService.set(`user:${user.uid}`, { uid: user.uid });

      // Simulate sync error
      dataSyncService.simulateProcessingError();
      await dataSyncService.addToQueue({
        id: 'op-1',
        type: 'CREATE',
        collection: 'test',
        documentId: 'test-1',
        data: {},
        timestamp: new Date(),
        retries: 0,
      });

      // Cache should still work
      const cachedUser = await storageService.get(`user:${user.uid}`);
      expect(cachedUser).toBeDefined();
    });
  });
});
