import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type {
  INotificationScheduler,
  NotificationContent,
  PermissionStatus,
  ScheduledNotificationSnapshot,
} from '@/services/NotificationService';

const DEFAULT_CHANNEL_ID = 'ellie-smart-reminders';

let isNotificationHandlerConfigured = false;
let isAndroidChannelConfigured = false;

function normalizePermissionStatus(status: string | undefined): PermissionStatus {
  if (status === 'granted' || status === 'denied') {
    return status;
  }

  return 'undetermined';
}

export class ExpoNotificationScheduler implements INotificationScheduler {
  constructor() {
    this.ensureNotificationHandler();
  }

  async scheduleNotification(content: NotificationContent, triggerDate: Date): Promise<string> {
    await this.ensureAndroidChannel();

    return Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: content.sound,
        badge: content.badge,
        interruptionLevel: content.interruptionLevel,
        ...(Platform.OS === 'android' ? { channelId: DEFAULT_CHANNEL_ID } : {}),
      },
      trigger: {
        type: 'date' as Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async requestPermissions(): Promise<boolean> {
    await this.ensureAndroidChannel();
    const permissions = await Notifications.requestPermissionsAsync();
    return normalizePermissionStatus(permissions.status) === 'granted';
  }

  async checkPermissions(): Promise<boolean> {
    const permissions = await Notifications.getPermissionsAsync();
    return normalizePermissionStatus(permissions.status) === 'granted';
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    const permissions = await Notifications.getPermissionsAsync();
    return normalizePermissionStatus(permissions.status);
  }

  async getScheduledNotifications(): Promise<ScheduledNotificationSnapshot[]> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();

    return scheduled.map((notification) => ({
      // Expo returns platform-specific notification content types; normalize only the fields
      // the app actually needs for reconciliation.
      id: notification.identifier,
      content: {
        title: notification.content.title ?? '',
        body: notification.content.body ?? '',
        data: (notification.content.data ?? {}) as Record<string, unknown>,
        sound:
          typeof notification.content.sound === 'string' ? notification.content.sound : undefined,
        badge:
          typeof notification.content.badge === 'number' ? notification.content.badge : undefined,
        interruptionLevel: (() => {
          const interruptionLevel = (notification.content as { interruptionLevel?: unknown })
            .interruptionLevel;
          return interruptionLevel === 'active' ||
            interruptionLevel === 'passive' ||
            interruptionLevel === 'timeSensitive' ||
            interruptionLevel === 'critical'
            ? interruptionLevel
            : undefined;
        })(),
      },
      triggerDate:
        notification.trigger && 'date' in notification.trigger && notification.trigger.date
          ? new Date(notification.trigger.date)
          : null,
    }));
  }

  private ensureNotificationHandler(): void {
    if (isNotificationHandlerConfigured) {
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
    });

    isNotificationHandlerConfigured = true;
  }

  private async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android' || isAndroidChannelConfigured) {
      return;
    }

    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: 'Ellie Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    isAndroidChannelConfigured = true;
  }
}

export const expoNotificationScheduler = new ExpoNotificationScheduler();
