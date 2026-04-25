/**
 * Notification Service
 *
 * Core notification scheduling and management service.
 * Handles shift reminders, holiday alerts, and notification history.
 */

import { ShiftDay, Holiday, type ShiftType } from '@/types';
import {
  buildSmartReminderKey,
  isSmartReminderType,
  type ReminderEvent,
  type SmartReminderType,
} from '@/types/reminders';
import { logger } from '@/utils/logger';
import { FirebaseService } from './firebase/FirebaseService';
import i18n from '@/i18n';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { where } from '@/services/firebase/firestoreSdk';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import { STORAGE_KEYS } from '@/constants/storageKeys';

/**
 * Notification types
 */
export enum NotificationType {
  SHIFT_REMINDER_24H = 'SHIFT_REMINDER_24H',
  SHIFT_REMINDER_4H = 'SHIFT_REMINDER_4H',
  HOLIDAY_ALERT = 'HOLIDAY_ALERT',
  PATTERN_CHANGE = 'PATTERN_CHANGE',
  ACHIEVEMENT = 'ACHIEVEMENT',
  SHIFT_REMINDER_CUSTOM_EARLY = 'SHIFT_REMINDER_CUSTOM_EARLY',
  SHIFT_PREP_REMINDER = 'SHIFT_PREP_REMINDER',
  COMMUTE_REMINDER = 'COMMUTE_REMINDER',
  SHIFT_START_IMMINENT = 'SHIFT_START_IMMINENT',
  PRE_BRIEFING_REMINDER = 'PRE_BRIEFING_REMINDER',
  BACK_TO_BACK_WARNING = 'BACK_TO_BACK_WARNING',
  SHORT_TURNAROUND_WARNING = 'SHORT_TURNAROUND_WARNING',
  FATIGUE_ALERT = 'FATIGUE_ALERT',
  FIFO_TRAVEL_DAY_TOMORROW = 'FIFO_TRAVEL_DAY_TOMORROW',
  FIFO_FLY_OUT_TODAY = 'FIFO_FLY_OUT_TODAY',
  POST_SHIFT_CHECKIN = 'POST_SHIFT_CHECKIN',
}

/**
 * Notification content
 */
export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  interruptionLevel?: 'active' | 'passive' | 'timeSensitive' | 'critical';
}

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Scheduled notification
 */
export interface ScheduledNotification {
  id: string;
  userId: string;
  type: NotificationType | SmartReminderType;
  scheduledFor: string; // ISO date string
  content: NotificationContent;
  status: 'pending' | 'delivered' | 'cancelled';
  createdAt: string; // ISO date string
  deliveredAt?: string; // ISO date string
}

export interface ScheduledNotificationSnapshot {
  id: string;
  content: NotificationContent;
  triggerDate: Date | null;
}

/**
 * Notification scheduler interface
 */
export interface INotificationScheduler {
  scheduleNotification(content: NotificationContent, triggerDate: Date): Promise<string>;
  cancelNotification(notificationId: string): Promise<void>;
  cancelAllNotifications(): Promise<void>;
  requestPermissions(): Promise<boolean>;
  checkPermissions(): Promise<boolean>;
  getPermissionStatus(): Promise<PermissionStatus>;
  getScheduledNotifications?(): Promise<ScheduledNotificationSnapshot[]>;
}

/**
 * Notification Service class
 */
export class NotificationService extends FirebaseService {
  private readonly NOTIFICATIONS_COLLECTION = 'notifications';
  private scheduler: INotificationScheduler | null = null;
  private pushTokenListenerInitialized = false;

  private translate(key: string, options: Record<string, unknown>, fallback: string): string {
    return String(
      i18n.t(key, {
        ns: 'dashboard',
        defaultValue: fallback,
        ...options,
      })
    );
  }

  /**
   * Set the notification scheduler (injected dependency)
   */
  setScheduler(scheduler: INotificationScheduler): void {
    this.scheduler = scheduler;
    this.ensurePushTokenListener();
  }

  /**
   * Schedule a shift reminder
   */
  async scheduleShiftReminder(
    userId: string,
    shift: ShiftDay,
    hoursBefore: number
  ): Promise<string> {
    logger.debug('Scheduling shift reminder', {
      userId,
      shiftDate: shift.date,
      hoursBefore,
    });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    // Calculate trigger time
    const shiftDate = new Date(shift.date);
    const triggerDate = new Date(shiftDate.getTime() - hoursBefore * 60 * 60 * 1000);

    // Build content
    const content = this.buildShiftReminderContent(shift, hoursBefore);

    // Schedule notification
    const notificationId = await this.scheduler.scheduleNotification(content, triggerDate);

    const notification: ScheduledNotification = {
      id: notificationId,
      userId,
      type:
        hoursBefore === 24
          ? NotificationType.SHIFT_REMINDER_24H
          : NotificationType.SHIFT_REMINDER_4H,
      scheduledFor: triggerDate.toISOString(),
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.persistNotificationHistory(userId, notification);
    } catch (error) {
      await this.rollbackScheduledNotification(notificationId);
      throw error;
    }

    logger.info('Shift reminder scheduled', {
      userId,
      notificationId,
      scheduledFor: triggerDate.toISOString(),
    });

    return notificationId;
  }

  /**
   * Schedule a holiday alert
   */
  async scheduleHolidayAlert(
    userId: string,
    holiday: Holiday,
    daysBefore: number
  ): Promise<string> {
    logger.debug('Scheduling holiday alert', {
      userId,
      holiday: holiday.name,
      daysBefore,
    });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    // Calculate trigger time
    const holidayDate = new Date(holiday.date);
    const triggerDate = new Date(holidayDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    // Build content
    const content = this.buildHolidayAlertContent(holiday, daysBefore);

    // Schedule notification
    const notificationId = await this.scheduler.scheduleNotification(content, triggerDate);

    const notification: ScheduledNotification = {
      id: notificationId,
      userId,
      type: NotificationType.HOLIDAY_ALERT,
      scheduledFor: triggerDate.toISOString(),
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.persistNotificationHistory(userId, notification);
    } catch (error) {
      await this.rollbackScheduledNotification(notificationId);
      throw error;
    }

    logger.info('Holiday alert scheduled', {
      userId,
      notificationId,
      scheduledFor: triggerDate.toISOString(),
    });

    return notificationId;
  }

  /**
   * Schedule a computed smart reminder event.
   */
  async scheduleSmartReminder(userId: string, event: ReminderEvent): Promise<string> {
    const smartReminderKey = buildSmartReminderKey(event);
    logger.debug('Scheduling smart reminder', {
      userId,
      type: event.type,
      shiftDate: event.shiftDate,
      triggerAt: event.triggerAt.toISOString(),
      smartReminderKey,
    });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    const content: NotificationContent = {
      title: event.title,
      body: event.body,
      data: {
        ...(event.data ?? {}),
        reminderType: event.type,
        shiftDate: event.shiftDate,
        shiftType: event.shiftType,
        smartReminderKey,
        userId,
      },
      sound: 'default',
      badge: 1,
      interruptionLevel: event.isCritical ? 'timeSensitive' : 'active',
    };

    const notificationId = await this.scheduler.scheduleNotification(content, event.triggerAt);

    const notification: ScheduledNotification = {
      id: notificationId,
      userId,
      type: event.type,
      scheduledFor: event.triggerAt.toISOString(),
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      await this.persistNotificationHistory(userId, notification);
    } catch (error) {
      await this.rollbackScheduledNotification(notificationId);
      throw error;
    }

    logger.info('Smart reminder scheduled', {
      userId,
      notificationId,
      type: event.type,
      shiftDate: event.shiftDate,
      triggerAt: event.triggerAt.toISOString(),
    });

    return notificationId;
  }

  /**
   * Cancel only smart reminders for a specific user without touching other notification types.
   */
  async cancelSmartReminders(userId: string): Promise<void> {
    logger.debug('Cancelling smart reminders', { userId });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    const pendingSmartReminders = await this.getPendingSmartReminders(userId);

    const canSyncRemotely = this.canSyncNotificationsRemotely(userId);

    await Promise.all(
      pendingSmartReminders.map(async (notification) => {
        try {
          await this.scheduler?.cancelNotification(notification.id);
          await this.cacheNotificationStatus(userId, notification.id, {
            status: 'cancelled',
          });
          if (canSyncRemotely) {
            await this.update(
              this.NOTIFICATIONS_COLLECTION,
              notification.id,
              {
                status: 'cancelled',
              },
              { logLevel: 'warn' }
            );
          }
        } catch (error) {
          logger.warn('NotificationService: failed to sync cancelled smart reminder remotely', {
            userId,
            notificationId: notification.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    logger.info('Smart reminders cancelled', {
      userId,
      count: pendingSmartReminders.length,
    });
  }

  async getPendingSmartReminders(userId: string): Promise<ScheduledNotification[]> {
    const history = await this.getNotificationHistory(userId, 500);
    const historyPending = history.filter(
      (notification) => notification.status === 'pending' && isSmartReminderType(notification.type)
    );
    const schedulerPending = await this.getScheduledSmartRemindersFromScheduler(userId);

    if (schedulerPending.length > 0) {
      const mergedCache = this.mergeNotificationHistory(schedulerPending, history);
      await this.replaceCachedNotificationHistory(userId, mergedCache);
    }

    return this.mergeNotificationHistory(schedulerPending, historyPending).filter(
      (notification) => notification.status === 'pending' && isSmartReminderType(notification.type)
    );
  }

  /**
   * Cancel a notification
   */
  async cancelNotification(userId: string, notificationId: string): Promise<void> {
    logger.debug('Cancelling notification', { userId, notificationId });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    // Cancel the scheduled notification
    await this.scheduler.cancelNotification(notificationId);
    await this.cacheNotificationStatus(userId, notificationId, {
      status: 'cancelled',
    });

    if (this.canSyncNotificationsRemotely(userId)) {
      // Update status in history
      try {
        await this.update(
          this.NOTIFICATIONS_COLLECTION,
          notificationId,
          {
            status: 'cancelled',
          },
          { logLevel: 'warn' }
        );
      } catch (error) {
        logger.warn('NotificationService: failed to sync cancelled notification status remotely', {
          userId,
          notificationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Notification cancelled', { userId, notificationId });
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(userId: string): Promise<void> {
    logger.debug('Cancelling all notifications', { userId });

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    const pendingNotifications = await this.getNotificationHistory(userId, 500);

    const canSyncRemotely = this.canSyncNotificationsRemotely(userId);

    await Promise.all(
      pendingNotifications
        .filter((notification) => notification.status === 'pending')
        .map(async (notification) => {
          try {
            await this.scheduler?.cancelNotification(notification.id);
            await this.cacheNotificationStatus(userId, notification.id, {
              status: 'cancelled',
            });
            if (canSyncRemotely) {
              await this.update(
                this.NOTIFICATIONS_COLLECTION,
                notification.id,
                {
                  status: 'cancelled',
                },
                { logLevel: 'warn' }
              );
            }
          } catch (error) {
            logger.warn('NotificationService: failed to sync cancelled notification remotely', {
              userId,
              notificationId: notification.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
    );

    logger.info('All notifications cancelled', { userId });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    logger.debug('Requesting notification permissions');

    if (!this.scheduler) {
      return false;
    }

    const granted = await this.scheduler.requestPermissions();

    logger.info('Notification permissions requested', { granted });

    if (granted) {
      void this.getOrFetchPushToken();
    }

    return granted;
  }

  /**
   * Check notification permissions
   */
  // eslint-disable-next-line require-await
  async checkPermissions(): Promise<boolean> {
    if (!this.scheduler) {
      return false;
    }

    return this.scheduler.checkPermissions();
  }

  /**
   * Get permission status
   */
  // eslint-disable-next-line require-await
  async getPermissionStatus(): Promise<PermissionStatus> {
    if (!this.scheduler) {
      return 'undetermined';
    }

    return this.scheduler.getPermissionStatus();
  }

  async getCachedPushToken(): Promise<string | null> {
    const cached = await asyncStorageService.get<string>(STORAGE_KEYS.notifications.expoPushToken);
    return typeof cached === 'string' && cached.trim().length > 0 ? cached.trim() : null;
  }

  async getOrFetchPushToken(): Promise<string | null> {
    this.ensurePushTokenListener();

    const cached = await this.getCachedPushToken();
    if (cached) {
      return cached;
    }

    const snapshot = await networkService.refresh();
    if (snapshot.status !== 'online') {
      logger.debug('NotificationService: push token fetch skipped while offline');
      return null;
    }

    const projectId = this.getExpoProjectId();
    if (!projectId) {
      logger.warn('NotificationService: push token fetch skipped because projectId is missing');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      const normalized = token.data?.trim();
      if (!normalized) {
        return null;
      }

      await asyncStorageService.set(STORAGE_KEYS.notifications.expoPushToken, normalized);
      return normalized;
    } catch (error) {
      logger.warn('NotificationService: failed to fetch Expo push token', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Schedule a recurring daily notification at a specific hour.
   * Used by onboarding completion check-in preferences.
   */
  async scheduleDaily(hour: number, title: string, body: string): Promise<void> {
    if (!this.scheduler) return;
    const triggerDate = new Date();
    triggerDate.setHours(hour, 0, 0, 0);
    if (triggerDate <= new Date()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    await this.scheduler.scheduleNotification({ title, body }, triggerDate);
  }

  private addDays(base: Date, days: number, hour: number): Date {
    const nextDate = new Date(base);
    nextDate.setDate(nextDate.getDate() + days);
    nextDate.setHours(hour, 0, 0, 0);
    return nextDate;
  }

  /**
   * Schedule first-month engagement nudges after onboarding completion.
   */
  async scheduleOnboardingEngagementSequence(userName: string): Promise<void> {
    if (!this.scheduler) return;

    const now = new Date();
    const firstName = userName.trim().length > 0 ? userName : 'there';
    const dayOneAtSixPm = new Date(now);
    dayOneAtSixPm.setHours(18, 0, 0, 0);
    if (dayOneAtSixPm <= now) {
      dayOneAtSixPm.setDate(dayOneAtSixPm.getDate() + 1);
    }

    const notifications = [
      {
        trigger: dayOneAtSixPm,
        title: 'Your roster is live',
        body: 'See what shifts are coming up this week. Tap to open your calendar.',
      },
      {
        trigger: this.addDays(now, 1, 8),
        title: `Morning, ${firstName}! 👋`,
        body: 'Did you know you can ask Ellie "When am I next off?" — try it now.',
      },
      {
        trigger: this.addDays(now, 2, 18),
        title: 'Your month at a glance',
        body: 'Check your shift balance for this month. Open Ellie to see.',
      },
      {
        trigger: this.addDays(now, 6, 9),
        title: 'One week with Ellie 🎉',
        body: "You've mapped your shifts for the entire year. Keep it up.",
      },
      {
        trigger: this.addDays(now, 13, 9),
        title: 'Pattern cycle update',
        body: 'Your roster cycle changes soon. Ellie has already updated your calendar.',
      },
      {
        trigger: this.addDays(now, 29, 9),
        title: '30 days of shift certainty',
        body: "Your next month is mapped. Tap to see what's coming.",
      },
    ];

    for (const notification of notifications) {
      if (notification.trigger > now) {
        await this.scheduler.scheduleNotification(
          { title: notification.title, body: notification.body },
          notification.trigger
        );
      }
    }
  }

  /**
   * Build shift reminder content
   */
  buildShiftReminderContent(shift: ShiftDay, hoursBefore: number): NotificationContent {
    const shiftType = shift.isNightShift
      ? this.translate('notifications.shiftType.night', {}, 'Night Shift')
      : this.translate('notifications.shiftType.day', {}, 'Day Shift');
    const title = shift.isNightShift
      ? this.translate('notifications.shiftCalloutTitle.night', {}, 'Night Shift Callout')
      : this.translate('notifications.shiftCalloutTitle.day', {}, 'Day Shift Callout');
    const body =
      hoursBefore === 24
        ? this.translate(
            'notifications.shiftBody.tomorrow',
            { shiftType, date: shift.date },
            'Your {{shiftType}} starts tomorrow ({{date}})'
          )
        : this.translate(
            'notifications.shiftBody.inHours',
            { shiftType, hoursBefore },
            'Your {{shiftType}} starts in {{hoursBefore}} hours'
          );

    return {
      title,
      body,
      data: {
        shiftDate: shift.date,
        shiftType: shift.shiftType,
        isNightShift: shift.isNightShift,
      },
      sound: 'default',
      badge: 1,
    };
  }

  /**
   * Build holiday alert content
   */
  buildHolidayAlertContent(holiday: Holiday, daysBefore: number): NotificationContent {
    const title = this.translate('notifications.holiday.title', {}, 'Upcoming Holiday');
    const body =
      daysBefore === 0
        ? this.translate(
            'notifications.holiday.today',
            { holidayName: holiday.name },
            'Today is {{holidayName}}!'
          )
        : daysBefore === 1
          ? this.translate(
              'notifications.holiday.tomorrow',
              { holidayName: holiday.name },
              'Tomorrow is {{holidayName}}'
            )
          : this.translate(
              'notifications.holiday.inDays',
              { holidayName: holiday.name, daysBefore, holidayDate: holiday.date },
              '{{holidayName}} is in {{daysBefore}} days ({{holidayDate}})'
            );

    return {
      title,
      body,
      data: {
        holidayId: holiday.id,
        holidayName: holiday.name,
        holidayDate: holiday.date,
        holidayType: holiday.type,
      },
      sound: 'default',
      badge: 1,
    };
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ScheduledNotification[]> {
    const cachedNotifications = await this.getCachedNotificationHistory(userId);

    if (!this.canSyncNotificationsRemotely(userId)) {
      logger.debug('NotificationService: serving notification history from local cache', {
        userId,
        count: cachedNotifications.length,
      });
      return cachedNotifications.slice(0, limit);
    }

    try {
      const remoteNotifications = await this.query<ScheduledNotification>(
        this.NOTIFICATIONS_COLLECTION,
        [where('userId', '==', userId)],
        { logLevel: 'warn' }
      );

      const userNotifications = this.mergeNotificationHistory(
        remoteNotifications,
        cachedNotifications
      ).slice(0, limit);

      await this.replaceCachedNotificationHistory(userId, userNotifications);

      logger.debug('Notification history retrieved', {
        userId,
        count: userNotifications.length,
      });

      return userNotifications;
    } catch (error) {
      logger.warn('NotificationService: failed to load remote notification history, using cache', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return cachedNotifications.slice(0, limit);
    }
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(notificationId: string): Promise<void> {
    try {
      await this.cacheNotificationStatus(undefined, notificationId, {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
      });

      const userId = await asyncStorageService.get<string>(
        this.getHistoryLookupKey(notificationId)
      );
      if (!this.canSyncNotificationsRemotely(userId)) {
        logger.debug('NotificationService: skipping remote delivered sync', { notificationId });
        return;
      }

      await this.update(
        this.NOTIFICATIONS_COLLECTION,
        notificationId,
        {
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
        },
        { logLevel: 'warn' }
      );

      logger.debug('Notification marked as delivered', { notificationId });
    } catch (error) {
      logger.warn('NotificationService: failed to sync delivered notification status remotely', {
        notificationId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - delivery tracking failure shouldn't break the app
    }
  }

  private getExpoProjectId(): string | null {
    const easProjectId = Constants.easConfig?.projectId;
    if (typeof easProjectId === 'string' && easProjectId.trim().length > 0) {
      return easProjectId.trim();
    }

    const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
    const extraProjectId = extra.eas && typeof extra.eas === 'object' ? extra.eas : null;
    const nestedProjectId =
      extraProjectId && 'projectId' in extraProjectId ? extraProjectId.projectId : undefined;
    if (typeof nestedProjectId === 'string' && nestedProjectId.trim().length > 0) {
      return nestedProjectId.trim();
    }

    const directProjectId = extra.projectId;
    if (typeof directProjectId === 'string' && directProjectId.trim().length > 0) {
      return directProjectId.trim();
    }

    return null;
  }

  private ensurePushTokenListener(): void {
    if (this.pushTokenListenerInitialized) {
      return;
    }

    this.pushTokenListenerInitialized = true;

    if (typeof Notifications.addPushTokenListener !== 'function') {
      return;
    }

    Notifications.addPushTokenListener((token) => {
      const normalized = token.data?.trim();
      if (!normalized) {
        return;
      }

      void asyncStorageService
        .set(STORAGE_KEYS.notifications.expoPushToken, normalized)
        .catch((error) => {
          logger.warn('NotificationService: failed to cache refreshed push token', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }

  private getHistoryCacheKey(userId: string): string {
    return `${STORAGE_KEYS.notifications.historyPrefix}${userId}`;
  }

  private getHistoryLookupKey(notificationId: string): string {
    return `${STORAGE_KEYS.notifications.lookupPrefix}${notificationId}`;
  }

  private async getCachedNotificationHistory(userId: string): Promise<ScheduledNotification[]> {
    const cached = await asyncStorageService.get<ScheduledNotification[]>(
      this.getHistoryCacheKey(userId)
    );
    return Array.isArray(cached)
      ? cached.sort(
          (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
        )
      : [];
  }

  private mergeNotificationHistory(
    primary: ScheduledNotification[],
    secondary: ScheduledNotification[]
  ): ScheduledNotification[] {
    const byId = new Map<string, ScheduledNotification>();

    [...secondary, ...primary].forEach((notification) => {
      byId.set(notification.id, notification);
    });

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
    );
  }

  private async persistNotificationHistory(
    userId: string,
    notification: ScheduledNotification
  ): Promise<void> {
    await this.cacheNotification(userId, notification);

    if (!this.canSyncNotificationsRemotely(userId)) {
      logger.debug('NotificationService: skipping remote notification history save', {
        userId,
        notificationId: notification.id,
      });
      return;
    }

    try {
      await this.create(
        this.NOTIFICATIONS_COLLECTION,
        {
          ...notification,
          userId,
        },
        notification.id,
        { logLevel: 'warn' }
      );

      logger.debug('Notification saved to history', {
        userId,
        notificationId: notification.id,
      });
    } catch (error) {
      logger.warn('NotificationService: failed to sync notification history remotely', {
        userId,
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async rollbackScheduledNotification(notificationId: string): Promise<void> {
    try {
      await this.scheduler?.cancelNotification(notificationId);
    } catch (rollbackError) {
      logger.error(
        'NotificationService: failed to roll back scheduled notification after history persistence error',
        rollbackError as Error,
        { notificationId }
      );
    }
  }

  private async replaceCachedNotificationHistory(
    userId: string,
    notifications: ScheduledNotification[]
  ): Promise<void> {
    await asyncStorageService.set(this.getHistoryCacheKey(userId), notifications);
    await Promise.all(
      notifications.map((notification) =>
        asyncStorageService.set(this.getHistoryLookupKey(notification.id), userId)
      )
    );
  }

  private async cacheNotification(
    userId: string,
    notification: ScheduledNotification
  ): Promise<void> {
    const cached = await this.getCachedNotificationHistory(userId);
    const merged = this.mergeNotificationHistory([notification], cached);
    await this.replaceCachedNotificationHistory(userId, merged);
  }

  private async cacheNotificationStatus(
    userId: string | undefined,
    notificationId: string,
    patch: Partial<ScheduledNotification>
  ): Promise<void> {
    const resolvedUserId =
      userId ??
      (await asyncStorageService.get<string>(this.getHistoryLookupKey(notificationId))) ??
      null;

    if (!resolvedUserId) {
      return;
    }

    const cached = await this.getCachedNotificationHistory(resolvedUserId);
    const updated = cached.map((notification) =>
      notification.id === notificationId ? { ...notification, ...patch } : notification
    );

    await this.replaceCachedNotificationHistory(resolvedUserId, updated);
  }

  private async getScheduledSmartRemindersFromScheduler(
    userId: string
  ): Promise<ScheduledNotification[]> {
    if (!this.scheduler?.getScheduledNotifications) {
      return [];
    }

    try {
      const scheduled = await this.scheduler.getScheduledNotifications();

      return scheduled
        .map((notification) => this.toScheduledSmartReminder(userId, notification))
        .filter((notification): notification is ScheduledNotification => notification !== null);
    } catch (error) {
      logger.warn('NotificationService: failed to read scheduled smart reminders from scheduler', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private toScheduledSmartReminder(
    userId: string,
    notification: ScheduledNotificationSnapshot
  ): ScheduledNotification | null {
    const data = notification.content.data ?? {};
    const reminderType = data.reminderType;
    const notificationUserId = data.userId;
    const shiftDate = data.shiftDate;
    const shiftType = data.shiftType;

    if (
      !isSmartReminderType(reminderType) ||
      notificationUserId !== userId ||
      typeof shiftDate !== 'string' ||
      typeof shiftType !== 'string' ||
      !notification.triggerDate
    ) {
      return null;
    }

    return {
      id: notification.id,
      userId,
      type: reminderType,
      scheduledFor: notification.triggerDate.toISOString(),
      content: notification.content,
      status: 'pending',
      createdAt: notification.triggerDate.toISOString(),
    };
  }

  getSmartReminderKey(notification: ScheduledNotification): string | null {
    if (!isSmartReminderType(notification.type)) {
      return null;
    }

    const data = notification.content.data ?? {};
    const smartReminderKey = data.smartReminderKey;
    if (typeof smartReminderKey === 'string' && smartReminderKey.length > 0) {
      return smartReminderKey;
    }

    const shiftDate = data.shiftDate;
    const shiftType = data.shiftType;
    if (typeof shiftDate !== 'string' || typeof shiftType !== 'string') {
      return null;
    }

    return buildSmartReminderKey({
      type: notification.type,
      shiftDate,
      shiftType: shiftType as ShiftType,
      triggerAt: notification.scheduledFor,
    });
  }

  private canSyncNotificationsRemotely(userId: string | null | undefined): userId is string {
    const authenticatedUserId = this.auth.currentUser?.uid ?? null;
    return Boolean(userId && authenticatedUserId && authenticatedUserId === userId);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
