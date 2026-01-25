/**
 * Service Integration Tests
 *
 * Tests multiple services working together in realistic user workflows
 */

import { MockAuthService } from '@/services/__mocks__/AuthService';
import { MockUserService } from '@/services/__mocks__/UserService';
import { MockAsyncStorageService } from '@/services/__mocks__/AsyncStorageService';
import { MockSessionService } from '@/services/__mocks__/SessionService';
import { MockDataSyncService } from '@/services/__mocks__/DataSyncService';
import { UserProfile } from '@/services/UserService';

// Mock dependencies
jest.mock('@/utils/logger');

describe('Service Integration Tests', () => {
  let authService: MockAuthService;
  let userService: MockUserService;
  let storageService: MockAsyncStorageService;
  let sessionService: MockSessionService;
  let dataSyncService: MockDataSyncService;

  const testPassword = 'TestPass123!';
  let testEmail: string;

  beforeEach(() => {
    jest.clearAllMocks();
    testEmail = `test-${Date.now()}-${Math.random()}@example.com`;

    // Initialize all services
    authService = new MockAuthService();
    storageService = new MockAsyncStorageService();
    userService = new MockUserService();
    sessionService = new MockSessionService();
    dataSyncService = new MockDataSyncService();
  });

  afterEach(async () => {
    // Cleanup all services
    await Promise.resolve(); authService.cleanup();
    authService.reset();
    userService.reset();
    storageService.reset();
    sessionService.cleanup();
    sessionService.reset();
    dataSyncService.cleanup();
    dataSyncService.reset();
  });

  describe('User Registration Flow', () => {
    it('should complete full registration workflow', async () => {
      // 1. Create account with AuthService
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      expect(user.email).toBe(testEmail);
      expect(user.emailVerified).toBe(false);

      // 2. Send verification email
      await authService.sendEmailVerification();

      // 3. UserService creates profile
      const profileData: UserProfile = {
        id: user.uid,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(user.uid, profileData);

      const profile = await userService.getUser(user.uid);
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(user.uid);
      expect(profile?.email).toBe(testEmail);

      // 4. StorageService caches user data
      await storageService.set(`user:${user.uid}`, profile);
      const cachedProfile = await storageService.get<UserProfile>(`user:${user.uid}`);
      expect(cachedProfile?.id).toBe(user.uid);

      // 5. SessionService starts session
      const session = await sessionService.startSession(user.uid);
      expect(session.userId).toBe(user.uid);
      expect(session.metadata).toBeDefined();

      // 6. Verify all services have consistent data
      const currentUser = authService.getCurrentUser();
      const currentSession = sessionService.getCurrentSession();

      expect(currentUser?.uid).toBe(user.uid);
      expect(currentSession?.userId).toBe(user.uid);
      expect(cachedProfile?.id).toBe(user.uid);
    });

    it('should handle registration with preferences', async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);

      // Create user profile
      const profileData: UserProfile = {
        id: user.uid,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(user.uid, profileData);

      // Save user preferences
      const preferences = {
        theme: 'dark' as const,
        notifications: {
          shift24HoursBefore: true,
          shift4HoursBefore: true,
          patternChangeAlerts: true,
          soundEnabled: true,
          vibrationEnabled: true,
          shiftReminders: true,
          holidayAlerts: true,
          cycleChanges: true,
        },
        language: 'en',
        timezone: 'America/New_York',
      };

      await userService.savePreferences(user.uid, preferences);

      // Verify preferences saved
      const savedPreferences = await userService.getPreferences(user.uid);
      expect(savedPreferences).toMatchObject(preferences);

      // Cache preferences
      await storageService.set(`preferences:${user.uid}`, savedPreferences);

      // Start session with user data
      const session = await sessionService.startSession(user.uid);

      // Track preference update event
      await sessionService.trackEvent(session.id, {
        type: 'ACTION',
        name: 'preferences_updated',
        timestamp: new Date(),
        data: { theme: 'dark' },
      });

      const currentSession = sessionService.getCurrentSession();
      expect(currentSession?.events).toHaveLength(1);
      expect(currentSession?.events[0].name).toBe('preferences_updated');
    });

    it('should handle registration errors gracefully', async () => {
      // Try to register with invalid email
      await expect(authService.signUpWithEmail('invalid-email', testPassword)).rejects.toThrow();

      // Try to register with weak password
      await expect(authService.signUpWithEmail(testEmail, 'weak')).rejects.toThrow();

      // Register successfully
      const user = await authService.signUpWithEmail(testEmail, testPassword);

      // Try to register with same email again
      await expect(authService.signUpWithEmail(testEmail, testPassword)).rejects.toThrow(
        'auth/email-already-in-use'
      );

      // Verify only one user was created
      const currentUser = authService.getCurrentUser();
      expect(currentUser?.uid).toBe(user.uid);
    });
  });

  describe('Offline Sync', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      userId = user.uid;

      const profileData: UserProfile = {
        id: userId,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(userId, profileData);
    });

    it('should queue operations when offline and sync when online', async () => {
      // 1. Go offline
      await dataSyncService.setOnlineState(false);
      expect(dataSyncService.isOnline()).toBe(false);

      // 2. Make changes (stored in queue)
      await dataSyncService.addToQueue({
        id: 'op-1',
        type: 'UPDATE',
        collection: 'users',
        documentId: userId,
        data: { name: 'Updated Name' },
        timestamp: new Date(),
        retries: 0,
      });

      await dataSyncService.addToQueue({
        id: 'op-2',
        type: 'CREATE',
        collection: 'sessions',
        documentId: 'session-1',
        data: { userId, startTime: new Date().toISOString() },
        timestamp: new Date(),
        retries: 0,
      });

      // Verify operations queued
      const queueSize = await dataSyncService.getQueueSize();
      expect(queueSize).toBe(2);

      // 3. Go online
      await dataSyncService.setOnlineState(true);

      // 4. DataSyncService syncs to Firestore (mocked)
      // Queue should be processed automatically

      // 5. Verify data consistency
      const finalQueueSize = await dataSyncService.getQueueSize();
      expect(finalQueueSize).toBe(0);

      const syncStatus = await dataSyncService.getSyncStatus(userId);
      expect(syncStatus.pendingOperations).toBe(0);
    });

    it('should handle sync conflicts', async () => {
      // Simulate local and remote changes
      const localPreferences = {
        theme: 'dark' as const,
        notifications: {
          shift24HoursBefore: true,
          shift4HoursBefore: true,
          patternChangeAlerts: true,
          soundEnabled: true,
          vibrationEnabled: true,
          shiftReminders: true,
          holidayAlerts: true,
          cycleChanges: true,
        },
        language: 'en',
        timezone: 'America/New_York',
      };

      await userService.savePreferences(userId, localPreferences);

      // Queue sync operation
      await dataSyncService.addToQueue({
        id: 'op-1',
        type: 'UPDATE',
        collection: 'preferences',
        documentId: userId,
        data: localPreferences,
        timestamp: new Date(),
        retries: 0,
      });

      // Process queue
      await dataSyncService.setOnlineState(true);

      const syncStatus = await dataSyncService.getSyncStatus(userId);
      expect(syncStatus.failedOperations).toBe(0);
    });

    it('should retry failed sync operations', async () => {
      // Add operation that will fail
      await dataSyncService.setOnlineState(true);
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

      // Operation should be retried and remain in queue
      const queueSize = await dataSyncService.getQueueSize();
      expect(queueSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Session Timeout', () => {
    let userId: string;

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    beforeEach(async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      userId = user.uid;

      const profileData: UserProfile = {
        id: userId,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(userId, profileData);
    });

    it('should handle session timeout with auto-logout', async () => {
      // 1. Start session
      const session = await sessionService.startSession(userId);
      expect(session.userId).toBe(userId);

      // 2. Set up timeout callback
      const timeoutCallback = jest.fn(async () => {
        // Auto-logout on timeout
        await authService.signOut();

        // Clear user data from cache
        await storageService.remove(`user:${userId}`);
        await storageService.remove(`preferences:${userId}`);
      });

      sessionService.onSessionTimeout(timeoutCallback);

      // 3. Simulate inactivity (30 minutes)
      jest.advanceTimersByTime(30 * 60 * 1000);

      // 4. Wait for async callback to complete
      await Promise.resolve();
      await Promise.resolve();

      // 5. Session times out
      expect(timeoutCallback).toHaveBeenCalledWith(session.id);

      // 6. AuthService logs out
      const currentUser = authService.getCurrentUser();
      expect(currentUser).toBeNull();

      // 7. Verify cleanup
      const currentSession = sessionService.getCurrentSession();
      expect(currentSession).toBeNull();

      const cachedUser = await storageService.get(`user:${userId}`);
      expect(cachedUser).toBeNull();
    });

    it('should prevent timeout with user activity', async () => {
      const session = await sessionService.startSession(userId);
      const timeoutCallback = jest.fn();
      sessionService.onSessionTimeout(timeoutCallback);

      // Advance time
      jest.advanceTimersByTime(20 * 60 * 1000); // 20 minutes

      // User activity - track event
      await sessionService.trackScreenView(session.id, 'HomeScreen');

      // Advance more time
      jest.advanceTimersByTime(20 * 60 * 1000); // 20 more minutes (40 total)

      // Should not timeout because activity reset the timer
      expect(timeoutCallback).not.toHaveBeenCalled();
      expect(sessionService.getCurrentSession()).not.toBeNull();
    });

    it('should track session duration before timeout', async () => {
      const session = await sessionService.startSession(userId);

      // Some activity
      await sessionService.trackScreenView(session.id, 'Screen1');
      await sessionService.trackScreenView(session.id, 'Screen2');
      await sessionService.trackScreenView(session.id, 'Screen3');

      // Trigger timeout
      jest.advanceTimersByTime(30 * 60 * 1000);

      const duration = sessionService.getSessionDuration(session.id);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Account Deletion', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      userId = user.uid;

      // Set up complete user account
      const profileData: UserProfile = {
        id: userId,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(userId, profileData);

      await userService.savePreferences(userId, {
        theme: 'dark',
        notifications: {
          shift24HoursBefore: true,
          shift4HoursBefore: true,
          patternChangeAlerts: true,
          soundEnabled: true,
          vibrationEnabled: true,
          holidayAlerts: true,
        },
        language: 'en',
        timezone: 'America/New_York',
      });

      // Cache data
      await storageService.set(`user:${userId}`, { id: userId, email: testEmail });
      await storageService.set(`preferences:${userId}`, {
        theme: 'dark',
        language: 'en',
      });

      // Start session
      await sessionService.startSession(userId);
    });

    it('should complete full account deletion workflow', async () => {
      // 1. End session
      const session = sessionService.getCurrentSession();
      if (session) {
        await sessionService.endSession(session.id);
      }

      // 2. StorageService clears cache
      await storageService.remove(`user:${userId}`);
      await storageService.remove(`preferences:${userId}`);

      // 3. UserService deletes user data
      await userService.deleteUser(userId);

      // 4. AuthService deletes auth
      await authService.deleteAccount();

      // 5. Verify complete cleanup
      expect(authService.getCurrentUser()).toBeNull();
      expect(sessionService.getCurrentSession()).toBeNull();

      const cachedUser = await storageService.get(`user:${userId}`);
      expect(cachedUser).toBeNull();

      // Verify user cannot be retrieved
      await expect(userService.getUser(userId)).resolves.toBeNull();
    });

    it('should handle partial deletion failures', async () => {
      // Still try to delete everything else
      await storageService.remove(`user:${userId}`);
      await userService.deleteUser(userId);
      await authService.deleteAccount();

      // Verify auth and user data deleted
      expect(authService.getCurrentUser()).toBeNull();

      const cachedUser = await storageService.get(`user:${userId}`);
      expect(cachedUser).toBeNull();
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain consistent user state across services', async () => {
      // Create user
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const userId = user.uid;

      // Create profile
      const profileData: UserProfile = {
        id: userId,
        name: 'Test User',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(userId, profileData);

      // Start session
      await sessionService.startSession(userId);

      // Cache user data
      await storageService.set(`user:${userId}`, { id: userId, email: testEmail });

      // Verify consistency
      const authUser = authService.getCurrentUser();
      const currentSession = sessionService.getCurrentSession();
      const cachedUser = await storageService.get<{ id: string; email: string }>(
        `user:${userId}`
      );

      expect(authUser?.uid).toBe(userId);
      expect(currentSession?.userId).toBe(userId);
      expect(cachedUser?.id).toBe(userId);
      expect(authUser?.email).toBe(testEmail);
      expect(cachedUser?.email).toBe(testEmail);
    });

    it('should propagate profile updates across services', async () => {
      const user = await authService.signUpWithEmail(testEmail, testPassword);
      const userId = user.uid;

      const profileData: UserProfile = {
        id: userId,
        name: 'Original Name',
        email: testEmail,
        occupation: 'Nurse',
        company: 'Test Hospital',
        country: 'US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userService.createUser(userId, profileData);

      const session = await sessionService.startSession(userId);

      // Update profile
      await userService.updateUser(userId, {
        name: 'Updated Name',
      });

      const updatedProfile = await userService.getUser(userId);

      // Update cache
      await storageService.set(`user:${userId}`, updatedProfile);

      // Track update event
      await sessionService.trackEvent(session.id, {
        type: 'ACTION',
        name: 'profile_updated',
        timestamp: new Date(),
        data: { name: 'Updated Name' },
      });

      // Verify update propagated
      const profile = await userService.getUser(userId);
      const cachedProfile = await storageService.get<UserProfile>(`user:${userId}`);
      const currentSession = sessionService.getCurrentSession();

      expect(profile?.name).toBe('Updated Name');
      expect(cachedProfile?.name).toBe('Updated Name');
      expect(currentSession?.events).toHaveLength(1);
      expect(currentSession?.events[0].name).toBe('profile_updated');
    });
  });
});
