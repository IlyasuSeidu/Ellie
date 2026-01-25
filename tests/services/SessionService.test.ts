/**
 * Session Service Tests
 */

import { MockSessionService } from '@/services/__mocks__/SessionService';
import { SessionEvent } from '@/services/SessionService';

// Mock dependencies
jest.mock('@/utils/logger');

describe('SessionService', () => {
  let service: MockSessionService;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockSessionService();
  });

  afterEach(() => {
    service.cleanup();
    service.reset();
  });

  describe('Session Lifecycle', () => {
    describe('startSession', () => {
      it('should start a new session', async () => {
        const session = await service.startSession(mockUserId);

        expect(session).toBeDefined();
        expect(session.id).toMatch(/^session-/);
        expect(session.userId).toBe(mockUserId);
        expect(session.startTime).toBeInstanceOf(Date);
        expect(session.lastActivityTime).toBeInstanceOf(Date);
        expect(session.events).toEqual([]);
        expect(session.endTime).toBeUndefined();
      });

      it('should include metadata in session', async () => {
        const session = await service.startSession(mockUserId);

        expect(session.metadata).toBeDefined();
        expect(session.metadata.appVersion).toBe('1.0.0');
        expect(session.metadata.platform).toBe('ios');
        expect(session.metadata.deviceId).toBe('test-device-123');
      });

      it('should set session as current', async () => {
        const session = await service.startSession(mockUserId);

        const currentSession = service.getCurrentSession();
        expect(currentSession).toEqual(session);
      });

      it('should end previous session when starting new one', async () => {
        const session1 = await service.startSession(mockUserId);
        const session2 = await service.startSession(mockUserId);

        const loadedSession1 = await service.loadSession(session1.id);
        expect(loadedSession1?.endTime).toBeDefined();
        expect(service.getCurrentSession()?.id).toBe(session2.id);
      });

      it('should generate unique session IDs', async () => {
        const session1 = await service.startSession(mockUserId);
        await service.endSession(session1.id);
        const session2 = await service.startSession(mockUserId);

        expect(session1.id).not.toBe(session2.id);
      });
    });

    describe('endSession', () => {
      it('should end a session', async () => {
        const session = await service.startSession(mockUserId);

        await service.endSession(session.id);

        const loadedSession = await service.loadSession(session.id);
        expect(loadedSession?.endTime).toBeDefined();
        expect(loadedSession?.endTime).toBeInstanceOf(Date);
      });

      it('should clear current session', async () => {
        const session = await service.startSession(mockUserId);

        await service.endSession(session.id);

        expect(service.getCurrentSession()).toBeNull();
      });

      it('should handle ending non-existent session', async () => {
        await expect(service.endSession('non-existent-id')).resolves.not.toThrow();
      });

      it('should not affect other sessions', async () => {
        const session1 = await service.startSession(mockUserId);
        await service.endSession(session1.id);
        const session2 = await service.startSession('user-456');

        expect(service.getCurrentSession()?.id).toBe(session2.id);
      });
    });

    describe('getCurrentSession', () => {
      it('should return null when no session active', () => {
        expect(service.getCurrentSession()).toBeNull();
      });

      it('should return current session', async () => {
        const session = await service.startSession(mockUserId);

        expect(service.getCurrentSession()).toEqual(session);
      });

      it('should return null after session ended', async () => {
        const session = await service.startSession(mockUserId);
        await service.endSession(session.id);

        expect(service.getCurrentSession()).toBeNull();
      });
    });

    describe('extendSession', () => {
      it('should extend current session', async () => {
        const session = await service.startSession(mockUserId);
        const originalActivityTime = session.lastActivityTime.getTime();

        // ExtendSession should update lastActivityTime
        await service.extendSession(session.id);

        const currentSession = service.getCurrentSession();
        expect(currentSession?.lastActivityTime.getTime()).toBeGreaterThanOrEqual(
          originalActivityTime
        );
      });

      it('should throw error for non-current session', async () => {
        const session = await service.startSession(mockUserId);
        await service.endSession(session.id);

        await expect(service.extendSession(session.id)).rejects.toThrow(
          'Session not found or not current'
        );
      });

      it('should reset timeout timer', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Advance time almost to timeout
        jest.advanceTimersByTime(29 * 60 * 1000);

        // Extend session
        await service.extendSession(session.id);

        // Advance time again - should not timeout yet
        jest.advanceTimersByTime(29 * 60 * 1000);

        expect(timeoutCallback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Event Tracking', () => {
    describe('trackEvent', () => {
      it('should track custom event', async () => {
        const session = await service.startSession(mockUserId);

        const event: SessionEvent = {
          type: 'ACTION',
          name: 'button_click',
          timestamp: new Date(),
          data: { buttonId: 'submit' },
        };

        await service.trackEvent(session.id, event);

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(1);
        expect(currentSession?.events[0]).toMatchObject({
          type: 'ACTION',
          name: 'button_click',
        });
      });

      it('should update last activity time', async () => {
        const session = await service.startSession(mockUserId);
        const originalActivityTime = session.lastActivityTime.getTime();

        const event: SessionEvent = {
          type: 'ACTION',
          name: 'test_action',
          timestamp: new Date(),
        };

        await service.trackEvent(session.id, event);

        const currentSession = service.getCurrentSession();
        expect(currentSession?.lastActivityTime.getTime()).toBeGreaterThanOrEqual(
          originalActivityTime
        );
      });

      it('should handle tracking for non-existent session', async () => {
        const event: SessionEvent = {
          type: 'ACTION',
          name: 'test_action',
          timestamp: new Date(),
        };

        await expect(service.trackEvent('non-existent-id', event)).resolves.not.toThrow();
      });

      it('should track multiple events', async () => {
        const session = await service.startSession(mockUserId);

        const events: SessionEvent[] = [
          { type: 'ACTION', name: 'event1', timestamp: new Date() },
          { type: 'ACTION', name: 'event2', timestamp: new Date() },
          { type: 'ACTION', name: 'event3', timestamp: new Date() },
        ];

        for (const event of events) {
          await service.trackEvent(session.id, event);
        }

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(3);
      });
    });

    describe('trackScreenView', () => {
      it('should track screen view', async () => {
        const session = await service.startSession(mockUserId);

        await service.trackScreenView(session.id, 'HomeScreen');

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(1);
        expect(currentSession?.events[0]).toMatchObject({
          type: 'SCREEN_VIEW',
          name: 'HomeScreen',
        });
      });

      it('should track multiple screen views', async () => {
        const session = await service.startSession(mockUserId);

        await service.trackScreenView(session.id, 'HomeScreen');
        await service.trackScreenView(session.id, 'ProfileScreen');
        await service.trackScreenView(session.id, 'SettingsScreen');

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(3);
        expect(currentSession?.events.map((e) => e.name)).toEqual([
          'HomeScreen',
          'ProfileScreen',
          'SettingsScreen',
        ]);
      });
    });

    describe('trackError', () => {
      it('should track error', async () => {
        const session = await service.startSession(mockUserId);
        const error = new Error('Test error');

        await service.trackError(session.id, error);

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(1);
        expect(currentSession?.events[0]).toMatchObject({
          type: 'ERROR',
          name: 'Error',
        });
        expect(currentSession?.events[0].data).toMatchObject({
          message: 'Test error',
        });
      });

      it('should include error stack', async () => {
        const session = await service.startSession(mockUserId);
        const error = new Error('Test error');

        await service.trackError(session.id, error);

        const currentSession = service.getCurrentSession();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((currentSession?.events[0].data as any).stack).toBeDefined();
      });

      it('should track multiple errors', async () => {
        const session = await service.startSession(mockUserId);

        await service.trackError(session.id, new Error('Error 1'));
        await service.trackError(session.id, new TypeError('Error 2'));

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(2);
        expect(currentSession?.events[0].type).toBe('ERROR');
        expect(currentSession?.events[1].type).toBe('ERROR');
      });
    });

    describe('mixed event tracking', () => {
      it('should track events in order', async () => {
        const session = await service.startSession(mockUserId);

        await service.trackScreenView(session.id, 'HomeScreen');
        await service.trackEvent(session.id, {
          type: 'ACTION',
          name: 'button_click',
          timestamp: new Date(),
        });
        await service.trackError(session.id, new Error('Test error'));

        const currentSession = service.getCurrentSession();
        expect(currentSession?.events).toHaveLength(3);
        expect(currentSession?.events[0].type).toBe('SCREEN_VIEW');
        expect(currentSession?.events[1].type).toBe('ACTION');
        expect(currentSession?.events[2].type).toBe('ERROR');
      });
    });
  });

  describe('Session Timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('timeout behavior', () => {
      it('should timeout after inactivity period', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Advance time to trigger timeout
        jest.advanceTimersByTime(30 * 60 * 1000);

        // Wait for async operations to complete
        await Promise.resolve();
        await Promise.resolve();

        expect(timeoutCallback).toHaveBeenCalledWith(session.id);
        expect(service.getCurrentSession()).toBeNull();
      });

      it('should not timeout before inactivity period', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Advance time but not enough for timeout
        jest.advanceTimersByTime(29 * 60 * 1000);

        expect(timeoutCallback).not.toHaveBeenCalled();
        expect(service.getCurrentSession()?.id).toBe(session.id);
      });

      it('should reset timeout on activity', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Advance time
        jest.advanceTimersByTime(20 * 60 * 1000);

        // Track event (activity)
        await service.trackScreenView(session.id, 'TestScreen');

        // Advance time - should not timeout yet
        jest.advanceTimersByTime(20 * 60 * 1000);

        expect(timeoutCallback).not.toHaveBeenCalled();
        expect(service.getCurrentSession()).not.toBeNull();
      });

      it('should support multiple timeout callbacks', async () => {
        const session = await service.startSession(mockUserId);
        const callback1 = jest.fn();
        const callback2 = jest.fn();

        service.onSessionTimeout(callback1);
        service.onSessionTimeout(callback2);

        jest.advanceTimersByTime(30 * 60 * 1000);

        expect(callback1).toHaveBeenCalledWith(session.id);
        expect(callback2).toHaveBeenCalledWith(session.id);
      });

      it('should allow unsubscribe from timeout', async () => {
        await service.startSession(mockUserId);
        const callback = jest.fn();
        const unsubscribe = service.onSessionTimeout(callback);

        unsubscribe();

        jest.advanceTimersByTime(30 * 60 * 1000);

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('timeout extension', () => {
      it('should extend timeout when extending session', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Advance time
        jest.advanceTimersByTime(25 * 60 * 1000);

        // Extend session
        await service.extendSession(session.id);

        // Advance time - should not timeout yet
        jest.advanceTimersByTime(25 * 60 * 1000);

        expect(timeoutCallback).not.toHaveBeenCalled();
      });

      it('should eventually timeout after extension', async () => {
        const session = await service.startSession(mockUserId);
        const timeoutCallback = jest.fn();
        service.onSessionTimeout(timeoutCallback);

        // Extend session
        await service.extendSession(session.id);

        // Advance time to trigger timeout
        jest.advanceTimersByTime(30 * 60 * 1000);

        expect(timeoutCallback).toHaveBeenCalledWith(session.id);
      });
    });
  });

  describe('Session Storage', () => {
    describe('loadSession', () => {
      it('should load existing session', async () => {
        const session = await service.startSession(mockUserId);

        const loadedSession = await service.loadSession(session.id);

        expect(loadedSession).toBeDefined();
        expect(loadedSession?.id).toBe(session.id);
        expect(loadedSession?.userId).toBe(mockUserId);
      });

      it('should return null for non-existent session', async () => {
        const loadedSession = await service.loadSession('non-existent-id');

        expect(loadedSession).toBeNull();
      });

      it('should load ended session', async () => {
        const session = await service.startSession(mockUserId);
        await service.endSession(session.id);

        const loadedSession = await service.loadSession(session.id);

        expect(loadedSession).toBeDefined();
        expect(loadedSession?.endTime).toBeDefined();
      });
    });

    describe('cleanupOldSessions', () => {
      it('should cleanup sessions older than 30 days', async () => {
        const session = await service.startSession(mockUserId);

        // Modify session start time to be old
        const oldSession = await service.loadSession(session.id);
        if (oldSession) {
          oldSession.startTime = new Date();
          oldSession.startTime.setDate(oldSession.startTime.getDate() - 31);
        }

        await service.cleanupOldSessions(mockUserId);

        const totalSessions = await service.getTotalSessions(mockUserId);
        expect(totalSessions).toBe(0);
      });

      it('should not cleanup recent sessions', async () => {
        await service.startSession(mockUserId);

        await service.cleanupOldSessions(mockUserId);

        const totalSessions = await service.getTotalSessions(mockUserId);
        expect(totalSessions).toBe(1);
      });

      it('should only cleanup sessions for specified user', async () => {
        await service.startSession(mockUserId);
        const session1 = service.getCurrentSession();
        if (session1) await service.endSession(session1.id);
        await service.startSession('user-456');

        await service.cleanupOldSessions(mockUserId);

        const totalSessions = await service.getTotalSessions('user-456');
        expect(totalSessions).toBe(1);
      });
    });
  });

  describe('Session Analytics', () => {
    describe('getSessionDuration', () => {
      it('should calculate session duration', async () => {
        const session = await service.startSession(mockUserId);

        await service.endSession(session.id);

        const duration = service.getSessionDuration(session.id);
        expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should calculate duration for active session', async () => {
        const session = await service.startSession(mockUserId);

        const duration = service.getSessionDuration(session.id);
        expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should return 0 for non-existent session', () => {
        const duration = service.getSessionDuration('non-existent-id');
        expect(duration).toBe(0);
      });
    });

    describe('getTotalSessions', () => {
      it('should return 0 for user with no sessions', async () => {
        const total = await service.getTotalSessions('no-sessions-user');
        expect(total).toBe(0);
      });

      it('should return total sessions for user', async () => {
        await service.startSession(mockUserId);
        const s1 = service.getCurrentSession();
        if (s1) await service.endSession(s1.id);
        await service.startSession(mockUserId);
        const s2 = service.getCurrentSession();
        if (s2) await service.endSession(s2.id);
        await service.startSession(mockUserId);

        const total = await service.getTotalSessions(mockUserId);
        expect(total).toBe(3);
      });

      it('should only count sessions for specified user', async () => {
        await service.startSession(mockUserId);
        const s = service.getCurrentSession();
        if (s) await service.endSession(s.id);
        await service.startSession('user-456');

        const total = await service.getTotalSessions(mockUserId);
        expect(total).toBe(1);
      });
    });

    describe('getAverageSessionDuration', () => {
      it('should return 0 for user with no sessions', async () => {
        const average = await service.getAverageSessionDuration('no-sessions-user');
        expect(average).toBe(0);
      });

      it('should calculate average duration', async () => {
        // Session 1
        const session1 = await service.startSession(mockUserId);
        await service.endSession(session1.id);

        // Session 2
        const session2 = await service.startSession(mockUserId);
        await service.endSession(session2.id);

        const average = await service.getAverageSessionDuration(mockUserId);
        expect(average).toBeGreaterThanOrEqual(0);
      });

      it('should only calculate for ended sessions', async () => {
        // Ended session
        const session1 = await service.startSession(mockUserId);
        await service.endSession(session1.id);

        // Get the ended session count
        const averageWithOneSession = await service.getAverageSessionDuration(mockUserId);

        // Active session (should not be counted)
        await service.startSession(mockUserId);

        // Average should be the same since active session is not counted
        const averageStillSame = await service.getAverageSessionDuration(mockUserId);
        expect(averageStillSame).toBe(averageWithOneSession);
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      jest.useFakeTimers();

      await service.startSession(mockUserId);
      const callback = jest.fn();
      service.onSessionTimeout(callback);

      service.cleanup();

      // Timer should be cleared, callback should not fire
      jest.advanceTimersByTime(30 * 60 * 1000);
      expect(callback).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should allow multiple cleanup calls', () => {
      service.cleanup();
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid session starts', async () => {
      const session1 = await service.startSession(mockUserId);
      const session2 = await service.startSession(mockUserId);
      const session3 = await service.startSession(mockUserId);

      expect(service.getCurrentSession()?.id).toBe(session3.id);

      const loadedSession1 = await service.loadSession(session1.id);
      const loadedSession2 = await service.loadSession(session2.id);

      expect(loadedSession1?.endTime).toBeDefined();
      expect(loadedSession2?.endTime).toBeDefined();
    });

    it('should handle events with large data payloads', async () => {
      const session = await service.startSession(mockUserId);

      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
      };

      await service.trackEvent(session.id, {
        type: 'ACTION',
        name: 'large_action',
        timestamp: new Date(),
        data: largeData,
      });

      const currentSession = service.getCurrentSession();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((currentSession?.events[0].data as any).items).toHaveLength(1000);
    });

    it('should handle concurrent event tracking', async () => {
      const session = await service.startSession(mockUserId);

      const promises = Array.from({ length: 10 }, (_, i) =>
        service.trackScreenView(session.id, `Screen${i}`)
      );

      await Promise.all(promises);

      const currentSession = service.getCurrentSession();
      expect(currentSession?.events).toHaveLength(10);
    });
  });
});
