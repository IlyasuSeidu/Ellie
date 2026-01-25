/**
 * Notification Service
 *
 * Core notification scheduling and management service.
 * Handles shift reminders, holiday alerts, and notification history.
 */

import { ShiftDay, Holiday } from '@/types';
import { logger } from '@/utils/logger';
import { FirebaseService } from './firebase/FirebaseService';

/**
 * Notification types
 */
export enum NotificationType {
  SHIFT_REMINDER_24H = 'SHIFT_REMINDER_24H',
  SHIFT_REMINDER_4H = 'SHIFT_REMINDER_4H',
  HOLIDAY_ALERT = 'HOLIDAY_ALERT',
  PATTERN_CHANGE = 'PATTERN_CHANGE',
  ACHIEVEMENT = 'ACHIEVEMENT',
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
  type: NotificationType;
  scheduledFor: string; // ISO date string
  content: NotificationContent;
  status: 'pending' | 'delivered' | 'cancelled';
  createdAt: string; // ISO date string
  deliveredAt?: string; // ISO date string
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
}

/**
 * Notification Service class
 */
export class NotificationService extends FirebaseService {
  private readonly NOTIFICATIONS_COLLECTION = 'notifications';
  private scheduler: INotificationScheduler | null = null;

  /**
   * Set the notification scheduler (injected dependency)
   */
  setScheduler(scheduler: INotificationScheduler): void {
    this.scheduler = scheduler;
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

    // Save to history
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

    await this.saveNotification(userId, notification);

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

    // Save to history
    const notification: ScheduledNotification = {
      id: notificationId,
      userId,
      type: NotificationType.HOLIDAY_ALERT,
      scheduledFor: triggerDate.toISOString(),
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await this.saveNotification(userId, notification);

    logger.info('Holiday alert scheduled', {
      userId,
      notificationId,
      scheduledFor: triggerDate.toISOString(),
    });

    return notificationId;
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

    // Update status in history
    await this.update(this.NOTIFICATIONS_COLLECTION, notificationId, {
      status: 'cancelled',
    });

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

    // Cancel all scheduled notifications
    await this.scheduler.cancelAllNotifications();

    // Update all pending notifications to cancelled
    const pendingNotifications = await this.getNotificationHistory(userId, 100);
    const cancelPromises = pendingNotifications
      .filter((n) => n.status === 'pending')
      .map((n) =>
        this.update(this.NOTIFICATIONS_COLLECTION, n.id, {
          status: 'cancelled',
        })
      );

    await Promise.all(cancelPromises);

    logger.info('All notifications cancelled', { userId });
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    logger.debug('Requesting notification permissions');

    if (!this.scheduler) {
      throw new Error('Notification scheduler not configured');
    }

    const granted = await this.scheduler.requestPermissions();

    logger.info('Notification permissions requested', { granted });

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

  /**
   * Build shift reminder content
   */
  buildShiftReminderContent(shift: ShiftDay, hoursBefore: number): NotificationContent {
    const shiftType = shift.isNightShift ? 'Night Shift' : 'Day Shift';
    const title = `${shiftType} Reminder`;
    const body =
      hoursBefore === 24
        ? `Your ${shiftType.toLowerCase()} starts tomorrow (${shift.date})`
        : `Your ${shiftType.toLowerCase()} starts in ${hoursBefore} hours`;

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
    const title = 'Upcoming Holiday';
    const body =
      daysBefore === 0
        ? `Today is ${holiday.name}!`
        : daysBefore === 1
          ? `Tomorrow is ${holiday.name}`
          : `${holiday.name} is in ${daysBefore} days (${holiday.date})`;

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
   * Save notification to history
   */
  async saveNotification(userId: string, notification: ScheduledNotification): Promise<void> {
    try {
      await this.create(
        this.NOTIFICATIONS_COLLECTION,
        {
          ...notification,
          userId,
        },
        notification.id
      );

      logger.debug('Notification saved to history', {
        userId,
        notificationId: notification.id,
      });
    } catch (error) {
      logger.error('Failed to save notification', error as Error, {
        userId,
        notificationId: notification.id,
      });
      // Don't throw - history failure shouldn't break notification scheduling
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ScheduledNotification[]> {
    try {
      const notifications = await this.query<ScheduledNotification>(this.NOTIFICATIONS_COLLECTION);

      // Filter by userId and sort by scheduledFor (most recent first)
      const userNotifications = notifications
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
        .slice(0, limit);

      logger.debug('Notification history retrieved', {
        userId,
        count: userNotifications.length,
      });

      return userNotifications;
    } catch (error) {
      logger.error('Failed to get notification history', error as Error, {
        userId,
      });
      return [];
    }
  }

  /**
   * Mark notification as delivered
   */
  async markAsDelivered(notificationId: string): Promise<void> {
    try {
      await this.update(this.NOTIFICATIONS_COLLECTION, notificationId, {
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
      });

      logger.debug('Notification marked as delivered', { notificationId });
    } catch (error) {
      logger.error('Failed to mark notification as delivered', error as Error, {
        notificationId,
      });
      // Don't throw - delivery tracking failure shouldn't break the app
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
