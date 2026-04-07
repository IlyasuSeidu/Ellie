import * as Notifications from 'expo-notifications';
import { ExpoNotificationScheduler } from '@/services/ExpoNotificationScheduler';

describe('ExpoNotificationScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules a notification with a date trigger and interruption level', async () => {
    const scheduler = new ExpoNotificationScheduler();
    const triggerDate = new Date('2026-04-03T06:00:00.000Z');
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce(
      'scheduled-notification-id'
    );

    const notificationId = await scheduler.scheduleNotification(
      {
        title: 'Prep',
        body: 'Prep body',
        interruptionLevel: 'timeSensitive',
      },
      triggerDate
    );

    expect(notificationId).toBe('scheduled-notification-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Prep',
          body: 'Prep body',
          interruptionLevel: 'timeSensitive',
        }),
        trigger: expect.objectContaining({
          type: 'date',
          date: triggerDate,
        }),
      })
    );
  });

  it('normalizes permission responses', async () => {
    const scheduler = new ExpoNotificationScheduler();

    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'unknown' });

    await expect(scheduler.requestPermissions()).resolves.toBe(false);
    await expect(scheduler.checkPermissions()).resolves.toBe(true);
    await expect(scheduler.getPermissionStatus()).resolves.toBe('undetermined');
  });
});
