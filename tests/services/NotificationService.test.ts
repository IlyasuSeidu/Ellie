/**
 * Notification Service Tests
 */

import {
  NotificationService,
  NotificationType,
  type ScheduledNotification,
} from '@/services/NotificationService';
import { MockNotificationScheduler } from '@/services/__mocks__/NotificationService';
import { ShiftDay } from '@/types';
import type { ReminderEvent } from '@/types/reminders';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    easConfig: {
      projectId: 'test-project-id',
    },
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    },
  },
}));

jest.mock('firebase/firestore', () => ({
  where: jest.fn((field: string, operator: string, value: string) => ({
    type: 'where',
    field,
    operator,
    value,
  })),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/services/NetworkService', () => ({
  networkService: {
    refresh: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    isOnline: jest.fn(() => true),
  },
}));

// Mock FirebaseService
jest.mock('@/services/firebase/FirebaseService', () => ({
  FirebaseService: class {
    protected auth = { currentUser: { uid: 'user-123' } };
    protected async create() {
      await Promise.resolve();
      return Promise.resolve('mock-doc-id');
    }
    protected async read() {
      return Promise.resolve(null);
      await Promise.resolve();
    }
    protected async update() {}
    protected async delete() {}
    protected async query() {
      await Promise.resolve();
      return Promise.resolve([]);
    }
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockScheduler: MockNotificationScheduler;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
    mockScheduler = new MockNotificationScheduler();
    service.setScheduler(mockScheduler);
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
    (asyncStorageService.set as jest.Mock).mockResolvedValue(undefined);
    (networkService.refresh as jest.Mock).mockResolvedValue({ status: 'online' });
  });

  afterEach(() => {
    mockScheduler.reset();
  });

  describe('Scheduling', () => {
    const mockShift: ShiftDay = {
      date: '2025-02-01',
      isWorkDay: true,
      isNightShift: true,
      shiftType: 'night',
    };

    const mockHoliday = {
      id: 'holiday-1',
      name: 'Independence Day',
      date: '2025-07-04',
      type: 'national' as const,
      country: 'US',
    };

    describe('scheduleShiftReminder', () => {
      it('should schedule a 24-hour shift reminder', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        expect(notificationId).toBeDefined();
        expect(notificationId).toMatch(/^notification-\d+$/);
        expect(mockScheduler.getScheduledCount()).toBe(1);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled).toBeDefined();
        expect(scheduled?.content.title).toBe('Night Shift Callout');
        expect(scheduled?.content.body).toContain('starts tomorrow');
      });

      it('should schedule a 4-hour shift reminder', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 4);

        expect(notificationId).toBeDefined();
        expect(mockScheduler.getScheduledCount()).toBe(1);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.body).toContain('starts in 4 hours');
      });

      it('should schedule day shift reminder with correct title', async () => {
        const dayShift: ShiftDay = {
          ...mockShift,
          isNightShift: false,
          shiftType: 'day',
        };

        const notificationId = await service.scheduleShiftReminder(mockUserId, dayShift, 24);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.title).toBe('Day Shift Callout');
      });

      it('should calculate correct trigger time for 24-hour reminder', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        const shiftDate = new Date(mockShift.date);
        const expectedTrigger = new Date(shiftDate.getTime() - 24 * 60 * 60 * 1000);

        expect(scheduled?.triggerDate.getTime()).toBe(expectedTrigger.getTime());
      });

      it('should include shift data in notification payload', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.data).toMatchObject({
          shiftDate: mockShift.date,
          shiftType: mockShift.shiftType,
          isNightShift: mockShift.isNightShift,
        });
      });
    });

    describe('scheduleHolidayAlert', () => {
      it('should schedule a holiday alert', async () => {
        const notificationId = await service.scheduleHolidayAlert(mockUserId, mockHoliday, 7);

        expect(notificationId).toBeDefined();
        expect(mockScheduler.getScheduledCount()).toBe(1);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.title).toBe('Upcoming Holiday');
        expect(scheduled?.content.body).toContain('Independence Day');
        expect(scheduled?.content.body).toContain('in 7 days');
      });

      it('should calculate correct trigger time for holiday alert', async () => {
        const notificationId = await service.scheduleHolidayAlert(mockUserId, mockHoliday, 7);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        const holidayDate = new Date(mockHoliday.date);
        const expectedTrigger = new Date(holidayDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        expect(scheduled?.triggerDate.getTime()).toBe(expectedTrigger.getTime());
      });

      it('should include holiday data in notification payload', async () => {
        const notificationId = await service.scheduleHolidayAlert(mockUserId, mockHoliday, 7);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.data).toMatchObject({
          holidayId: mockHoliday.id,
        });
      });
    });

    describe('scheduleSmartReminder', () => {
      it('should schedule a computed smart reminder with time-sensitive priority when critical', async () => {
        const reminderEvent: ReminderEvent = {
          type: 'FATIGUE_ALERT',
          triggerAt: new Date('2026-04-03T17:00:00.000Z'),
          shiftDate: '2026-04-03',
          shiftType: 'night',
          isCritical: true,
          title: 'Critical fatigue alert',
          body: 'Rest now if you can.',
          data: { shiftDate: '2026-04-03' },
        };

        const notificationId = await service.scheduleSmartReminder(mockUserId, reminderEvent);

        const scheduled = mockScheduler.getScheduledNotification(notificationId);
        expect(scheduled?.content.title).toBe('Critical fatigue alert');
        expect(scheduled?.content.interruptionLevel).toBe('timeSensitive');
        expect(scheduled?.triggerDate.toISOString()).toBe('2026-04-03T17:00:00.000Z');
      });
    });

    describe('cancelNotification', () => {
      it('should cancel a scheduled notification', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        expect(mockScheduler.getScheduledCount()).toBe(1);

        await service.cancelNotification(mockUserId, notificationId);

        expect(mockScheduler.getScheduledCount()).toBe(0);
      });

      it('should handle canceling non-existent notification', async () => {
        await expect(
          service.cancelNotification(mockUserId, 'non-existent-id')
        ).resolves.not.toThrow();
      });
    });

    describe('cancelAllNotifications', () => {
      it('should cancel all notifications for a user', async () => {
        const shift24hId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);
        const shift4hId = await service.scheduleShiftReminder(mockUserId, mockShift, 4);
        const holidayId = await service.scheduleHolidayAlert(mockUserId, mockHoliday, 7);
        await service.scheduleShiftReminder('other-user', mockShift, 24);

        jest.spyOn(service, 'getNotificationHistory').mockResolvedValue([
          {
            id: shift24hId,
            userId: mockUserId,
            type: NotificationType.SHIFT_REMINDER_24H,
            scheduledFor: new Date('2025-01-31T00:00:00.000Z').toISOString(),
            content: { title: '24h', body: '24h' },
            status: 'pending',
            createdAt: new Date('2025-01-30T00:00:00.000Z').toISOString(),
          },
          {
            id: shift4hId,
            userId: mockUserId,
            type: NotificationType.SHIFT_REMINDER_4H,
            scheduledFor: new Date('2025-02-01T20:00:00.000Z').toISOString(),
            content: { title: '4h', body: '4h' },
            status: 'pending',
            createdAt: new Date('2025-01-30T00:00:00.000Z').toISOString(),
          },
          {
            id: holidayId,
            userId: mockUserId,
            type: NotificationType.HOLIDAY_ALERT,
            scheduledFor: new Date('2025-06-27T00:00:00.000Z').toISOString(),
            content: { title: 'holiday', body: 'holiday' },
            status: 'pending',
            createdAt: new Date('2025-01-30T00:00:00.000Z').toISOString(),
          },
        ]);

        expect(mockScheduler.getScheduledCount()).toBe(4);

        await service.cancelAllNotifications(mockUserId);

        expect(mockScheduler.getScheduledCount()).toBe(1);
      });
    });

    describe('cancelSmartReminders', () => {
      it('should cancel only smart reminders for the current user', async () => {
        const smartReminderId = await service.scheduleSmartReminder(mockUserId, {
          type: 'SHIFT_PREP_REMINDER',
          triggerAt: new Date('2026-04-03T05:30:00.000Z'),
          shiftDate: '2026-04-03',
          shiftType: 'day',
          isCritical: false,
          title: 'Prep',
          body: 'Prep body',
          data: { shiftDate: '2026-04-03' },
        });
        const shiftReminderId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);
        await service.scheduleSmartReminder('other-user', {
          type: 'SHIFT_START_IMMINENT',
          triggerAt: new Date('2026-04-03T06:45:00.000Z'),
          shiftDate: '2026-04-03',
          shiftType: 'day',
          isCritical: false,
          title: 'Soon',
          body: 'Soon body',
          data: { shiftDate: '2026-04-03' },
        });

        jest.spyOn(service, 'getNotificationHistory').mockResolvedValue([
          {
            id: smartReminderId,
            userId: mockUserId,
            type: 'SHIFT_PREP_REMINDER',
            scheduledFor: new Date('2026-04-03T05:30:00.000Z').toISOString(),
            content: { title: 'Prep', body: 'Prep body' },
            status: 'pending',
            createdAt: new Date('2026-04-01T00:00:00.000Z').toISOString(),
          },
          {
            id: shiftReminderId,
            userId: mockUserId,
            type: NotificationType.SHIFT_REMINDER_24H,
            scheduledFor: new Date('2026-04-02T19:00:00.000Z').toISOString(),
            content: { title: '24h', body: '24h' },
            status: 'pending',
            createdAt: new Date('2026-04-01T00:00:00.000Z').toISOString(),
          },
        ]);

        expect(mockScheduler.getScheduledCount()).toBe(3);

        await service.cancelSmartReminders(mockUserId);

        expect(mockScheduler.getScheduledCount()).toBe(2);
      });

      it('should cancel scheduler-backed smart reminders even when history is incomplete', async () => {
        await service.scheduleSmartReminder(mockUserId, {
          type: 'SHIFT_PREP_REMINDER',
          triggerAt: new Date('2026-04-03T05:30:00.000Z'),
          shiftDate: '2026-04-03',
          shiftType: 'day',
          isCritical: false,
          title: 'Prep',
          body: 'Prep body',
          data: { shiftDate: '2026-04-03', shiftType: 'day' },
        });

        jest.spyOn(service, 'getNotificationHistory').mockResolvedValue([]);

        expect(mockScheduler.getScheduledCount()).toBe(1);

        await service.cancelSmartReminders(mockUserId);

        expect(mockScheduler.getScheduledCount()).toBe(0);
      });
    });
  });

  describe('Content Building', () => {
    const mockShift: ShiftDay = {
      date: '2025-02-01',
      isWorkDay: true,
      isNightShift: true,
      shiftType: 'night',
    };

    const mockHoliday = {
      id: 'holiday-1',
      name: 'Christmas',
      date: '2025-12-25',
      type: 'national' as const,
      country: 'US',
    };

    describe('buildShiftReminderContent', () => {
      it('should build content for 24-hour night shift reminder', () => {
        const content = service.buildShiftReminderContent(mockShift, 24);

        expect(content.title).toBe('Night Shift Callout');
        expect(content.body).toContain('night shift starts tomorrow');
        expect(content.body).toContain(mockShift.date);
        expect(content.data).toMatchObject({
          shiftDate: mockShift.date,
          shiftType: mockShift.shiftType,
        });
        expect(content.sound).toBe('default');
        expect(content.badge).toBe(1);
      });

      it('should build content for 4-hour night shift reminder', () => {
        const content = service.buildShiftReminderContent(mockShift, 4);

        expect(content.title).toBe('Night Shift Callout');
        expect(content.body).toContain('starts in 4 hours');
        expect(content.body).not.toContain('tomorrow');
      });

      it('should build content for day shift reminder', () => {
        const dayShift: ShiftDay = {
          ...mockShift,
          isNightShift: false,
          shiftType: 'day',
        };

        const content = service.buildShiftReminderContent(dayShift, 24);

        expect(content.title).toBe('Day Shift Callout');
        expect(content.body).toContain('day shift starts tomorrow');
      });

      it('should include correct data payload', () => {
        const content = service.buildShiftReminderContent(mockShift, 24);

        expect(content.data).toEqual({
          shiftDate: mockShift.date,
          shiftType: mockShift.shiftType,
          isNightShift: mockShift.isNightShift,
        });
      });
    });

    describe('buildHolidayAlertContent', () => {
      it('should build content for holiday alert', () => {
        const content = service.buildHolidayAlertContent(mockHoliday, 7);

        expect(content.title).toBe('Upcoming Holiday');
        expect(content.body).toContain('Christmas');
        expect(content.body).toContain('in 7 days');
        expect(content.data).toMatchObject({
          holidayId: mockHoliday.id,
        });
        expect(content.sound).toBe('default');
        expect(content.badge).toBe(1);
      });

      it('should handle 1 day before holiday', () => {
        const content = service.buildHolidayAlertContent(mockHoliday, 1);

        expect(content.body).toContain('Tomorrow is');
        expect(content.body).toContain('Christmas');
      });

      it('should include correct data payload', () => {
        const content = service.buildHolidayAlertContent(mockHoliday, 7);

        expect(content.data).toEqual({
          holidayId: mockHoliday.id,
          holidayName: mockHoliday.name,
          holidayDate: mockHoliday.date,
          holidayType: mockHoliday.type,
        });
      });
    });
  });

  describe('Permissions', () => {
    describe('requestPermissions', () => {
      it('should request and grant permissions when undetermined', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('undetermined');

        const granted = await service.requestPermissions();

        expect(granted).toBe(true);
        expect(await mockScheduler.getPermissionStatus()).toBe('granted');
      });

      it('should return true when permissions already granted', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('granted');

        const granted = await service.requestPermissions();

        expect(granted).toBe(true);
      });

      it('should return false when permissions denied', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('denied');

        const granted = await service.requestPermissions();

        expect(granted).toBe(false);
      });
    });

    describe('checkPermissions', () => {
      it('should return true when permissions granted', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('granted');

        const hasPermissions = await service.checkPermissions();

        expect(hasPermissions).toBe(true);
      });

      it('should return false when permissions denied', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('denied');

        const hasPermissions = await service.checkPermissions();

        expect(hasPermissions).toBe(false);
      });

      it('should return false when permissions undetermined', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('undetermined');

        const hasPermissions = await service.checkPermissions();

        expect(hasPermissions).toBe(false);
      });
    });

    describe('getPermissionStatus', () => {
      it('should return current permission status', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('granted');
        expect(await service.getPermissionStatus()).toBe('granted');

        mockScheduler.setPermissionStatus('denied');
        expect(await service.getPermissionStatus()).toBe('denied');

        mockScheduler.setPermissionStatus('undetermined');
        expect(await service.getPermissionStatus()).toBe('undetermined');
      });
    });

    describe('handling denied permissions', () => {
      it('should not throw when scheduling with denied permissions', async () => {
        await Promise.resolve();
        mockScheduler.setPermissionStatus('denied');

        const mockShift: ShiftDay = {
          date: '2025-02-01',
          isWorkDay: true,
          isNightShift: true,
          shiftType: 'night',
        };

        // Should still schedule even if permissions denied
        // (notifications just won't show)
        await expect(
          service.scheduleShiftReminder(mockUserId, mockShift, 24)
        ).resolves.toBeDefined();
      });
    });
  });

  describe('History', () => {
    const mockShift: ShiftDay = {
      date: '2025-02-01',
      isWorkDay: true,
      isNightShift: true,
      shiftType: 'night',
    };

    describe('saveNotification', () => {
      it('should save notification to history', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        // Notification should be saved during scheduling
        expect(notificationId).toBeDefined();
      });
    });

    describe('getNotificationHistory', () => {
      it('should retrieve notification history for user', async () => {
        // Schedule multiple notifications
        await service.scheduleShiftReminder(mockUserId, mockShift, 24);
        await service.scheduleShiftReminder(mockUserId, mockShift, 4);

        const history = await service.getNotificationHistory(mockUserId);

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThanOrEqual(0);
      });

      it('queries Firestore history with a user-scoped constraint', async () => {
        const querySpy = jest.spyOn(
          service as unknown as {
            query: (collection: string, constraints: unknown[]) => Promise<[]>;
          },
          'query'
        );

        await service.getNotificationHistory(mockUserId);

        expect(querySpy).toHaveBeenCalledWith(
          'notifications',
          [
            expect.objectContaining({
              type: 'where',
              field: 'userId',
              operator: '==',
              value: mockUserId,
            }),
          ],
          { logLevel: 'warn' }
        );
      });

      it('should limit history results', async () => {
        // Schedule multiple notifications
        for (let i = 0; i < 60; i++) {
          await service.scheduleShiftReminder(mockUserId, mockShift, 24);
        }

        const history = await service.getNotificationHistory(mockUserId, 10);

        expect(history.length).toBeLessThanOrEqual(10);
      });

      it('should use default limit of 50', async () => {
        const history = await service.getNotificationHistory(mockUserId);

        // Should not throw and should return array
        expect(Array.isArray(history)).toBe(true);
      });

      it('returns cached history when the Firestore query fails', async () => {
        const cachedHistory = [
          {
            id: 'cached-1',
            userId: mockUserId,
            type: NotificationType.SHIFT_REMINDER_24H,
            scheduledFor: new Date('2025-02-02T00:00:00.000Z').toISOString(),
            content: { title: 'Cached', body: 'Cached body' },
            status: 'pending' as const,
            createdAt: new Date('2025-02-01T00:00:00.000Z').toISOString(),
          },
        ];

        jest
          .spyOn(service as unknown as { query: () => Promise<ScheduledNotification[]> }, 'query')
          .mockRejectedValue(new Error('offline'));
        (asyncStorageService.get as jest.Mock).mockImplementation((key: string) => {
          if (key === `${STORAGE_KEYS.notifications.historyPrefix}${mockUserId}`) {
            return Promise.resolve(cachedHistory);
          }
          return Promise.resolve(null);
        });

        const history = await service.getNotificationHistory(mockUserId);

        expect(history).toEqual(cachedHistory);
      });

      it('returns cached history without querying Firestore when auth user does not match', async () => {
        const cachedHistory = [
          {
            id: 'cached-1',
            userId: mockUserId,
            type: NotificationType.SHIFT_REMINDER_24H,
            scheduledFor: new Date('2025-02-02T00:00:00.000Z').toISOString(),
            content: { title: 'Cached', body: 'Cached body' },
            status: 'pending' as const,
            createdAt: new Date('2025-02-01T00:00:00.000Z').toISOString(),
          },
        ];

        (service as unknown as { auth: { currentUser: { uid: string } | null } }).auth = {
          currentUser: null,
        };

        const querySpy = jest.spyOn(
          service as unknown as {
            query: (collection: string, constraints?: unknown[]) => Promise<[]>;
          },
          'query'
        );

        (asyncStorageService.get as jest.Mock).mockImplementation((key: string) => {
          if (key === `${STORAGE_KEYS.notifications.historyPrefix}${mockUserId}`) {
            return Promise.resolve(cachedHistory);
          }
          return Promise.resolve(null);
        });

        const history = await service.getNotificationHistory(mockUserId);

        expect(querySpy).not.toHaveBeenCalled();
        expect(history).toEqual(cachedHistory);
      });

      it('caches scheduled notifications even when remote history persistence fails', async () => {
        const createSpy = jest
          .spyOn(service as unknown as { create: () => Promise<string> }, 'create')
          .mockRejectedValue(new Error('offline'));

        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        expect(notificationId).toBeDefined();
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          `${STORAGE_KEYS.notifications.historyPrefix}${mockUserId}`,
          expect.arrayContaining([
            expect.objectContaining({
              id: notificationId,
              userId: mockUserId,
            }),
          ])
        );

        createSpy.mockRestore();
      });

      it('keeps scheduling local notifications without remote history writes when auth user does not match', async () => {
        (service as unknown as { auth: { currentUser: { uid: string } | null } }).auth = {
          currentUser: null,
        };

        const createSpy = jest.spyOn(
          service as unknown as { create: () => Promise<string> },
          'create'
        );

        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        expect(notificationId).toBeDefined();
        expect(createSpy).not.toHaveBeenCalled();
        expect(asyncStorageService.set).toHaveBeenCalledWith(
          `${STORAGE_KEYS.notifications.historyPrefix}${mockUserId}`,
          expect.arrayContaining([
            expect.objectContaining({
              id: notificationId,
              userId: mockUserId,
            }),
          ])
        );
      });

      it('rolls back a scheduled smart reminder if local history persistence fails', async () => {
        (asyncStorageService.set as jest.Mock).mockRejectedValueOnce(
          new Error('cache write failed')
        );

        await expect(
          service.scheduleSmartReminder(mockUserId, {
            type: 'SHIFT_PREP_REMINDER',
            triggerAt: new Date('2026-04-03T05:30:00.000Z'),
            shiftDate: '2026-04-03',
            shiftType: 'day',
            isCritical: false,
            title: 'Prep',
            body: 'Prep body',
            data: { shiftDate: '2026-04-03', shiftType: 'day' },
          })
        ).rejects.toThrow('cache write failed');

        expect(mockScheduler.getScheduledCount()).toBe(0);
      });
    });

    describe('markAsDelivered', () => {
      it('should mark notification as delivered', async () => {
        const notificationId = await service.scheduleShiftReminder(mockUserId, mockShift, 24);

        await service.markAsDelivered(notificationId);

        // Should not throw
        expect(notificationId).toBeDefined();
      });

      it('should handle marking non-existent notification', async () => {
        await expect(service.markAsDelivered('non-existent-id')).resolves.not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    const mockShift: ShiftDay = {
      date: '2025-02-01',
      isWorkDay: true,
      isNightShift: true,
      shiftType: 'night',
    };

    describe('scheduling failures', () => {
      it('should handle scheduler not set', async () => {
        const serviceWithoutScheduler = new NotificationService();

        await expect(
          serviceWithoutScheduler.scheduleShiftReminder(mockUserId, mockShift, 24)
        ).rejects.toThrow('Notification scheduler not configured');
      });
    });

    describe('invalid notification IDs', () => {
      it('should handle canceling with invalid ID', async () => {
        await expect(service.cancelNotification(mockUserId, '')).resolves.not.toThrow();
      });

      it('should handle marking delivered with invalid ID', async () => {
        await expect(service.markAsDelivered('')).resolves.not.toThrow();
      });
    });

    describe('invalid shift data', () => {
      it('should throw error for invalid shift date', async () => {
        const invalidShift: ShiftDay = {
          ...mockShift,
          date: 'invalid-date',
        };

        await expect(service.scheduleShiftReminder(mockUserId, invalidShift, 24)).rejects.toThrow();
      });
    });

    describe('invalid holiday data', () => {
      it('should throw error for invalid holiday date', async () => {
        const invalidHoliday = {
          id: 'holiday-1',
          name: 'Test Holiday',
          date: 'invalid-date',
          type: 'national' as const,
          country: 'US',
        };

        await expect(service.scheduleHolidayAlert(mockUserId, invalidHoliday, 7)).rejects.toThrow();
      });
    });
  });

  describe('Push token caching', () => {
    it('returns the cached Expo push token without refetching', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue('ExponentPushToken[cached]');

      const token = await service.getOrFetchPushToken();

      expect(token).toBe('ExponentPushToken[cached]');
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('returns null offline when there is no cached push token', async () => {
      (networkService.refresh as jest.Mock).mockResolvedValue({ status: 'offline' });

      const token = await service.getOrFetchPushToken();

      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('fetches and stores the Expo push token when online', async () => {
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[fetched]',
      });

      const token = await service.getOrFetchPushToken();

      expect(token).toBe('ExponentPushToken[fetched]');
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId: 'test-project-id',
      });
      expect(asyncStorageService.set).toHaveBeenCalledWith(
        STORAGE_KEYS.notifications.expoPushToken,
        'ExponentPushToken[fetched]'
      );
    });

    it('prefetches the Expo push token after permission grant', async () => {
      const pushTokenSpy = jest.spyOn(service, 'getOrFetchPushToken').mockResolvedValue(null);

      await service.requestPermissions();

      expect(pushTokenSpy).toHaveBeenCalled();
    });
  });
});
