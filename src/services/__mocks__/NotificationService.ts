/**
 * Mock Notification Service for Testing
 */

import {
  NotificationContent,
  INotificationScheduler,
  PermissionStatus,
  ScheduledNotification,
  NotificationType,
} from '../NotificationService';

/**
 * Mock Notification Scheduler
 */
export class MockNotificationScheduler implements INotificationScheduler {
  private scheduledNotifications: Map<string, { content: NotificationContent; triggerDate: Date }> =
    new Map();
  private permissionStatus: PermissionStatus = 'undetermined';
  private nextId = 1;

  async scheduleNotification(content: NotificationContent, triggerDate: Date): Promise<string> {
    await Promise.resolve();
    const id = `notification-${this.nextId++}`;
    this.scheduledNotifications.set(id, { content, triggerDate });
    return id;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Promise.resolve();
    this.scheduledNotifications.delete(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Promise.resolve();
    this.scheduledNotifications.clear();
  }

  async requestPermissions(): Promise<boolean> {
    await Promise.resolve();
    if (this.permissionStatus === 'undetermined') {
      this.permissionStatus = 'granted';
    }
    return this.permissionStatus === 'granted';
  }

  async checkPermissions(): Promise<boolean> {
    await Promise.resolve();
    return this.permissionStatus === 'granted';
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    await Promise.resolve();
    return this.permissionStatus;
  }

  // Test helpers
  setPermissionStatus(status: PermissionStatus): void {
    this.permissionStatus = status;
  }

  getScheduledCount(): number {
    return this.scheduledNotifications.size;
  }

  getScheduledNotification(id: string) {
    return this.scheduledNotifications.get(id);
  }

  reset(): void {
    this.scheduledNotifications.clear();
    this.permissionStatus = 'undetermined';
    this.nextId = 1;
  }
}

/**
 * Mock Notification Service
 */
export class MockNotificationService {
  private notifications: Map<string, ScheduledNotification> = new Map();
  private scheduler: MockNotificationScheduler;

  constructor() {
    this.scheduler = new MockNotificationScheduler();
  }

  setScheduler(_scheduler: INotificationScheduler): void {
    // For testing, we ignore and use our mock
  }

  getScheduler(): MockNotificationScheduler {
    return this.scheduler;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async scheduleShiftReminder(
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shift: any,
    hoursBefore: number
  ): Promise<string> {
    const shiftDate = new Date(shift.date);
    const triggerDate = new Date(shiftDate.getTime() - hoursBefore * 60 * 60 * 1000);

    const content = {
      title: shift.isNightShift ? 'Night Shift Reminder' : 'Day Shift Reminder',
      body: `Your shift starts in ${hoursBefore} hours`,
      data: { shiftDate: shift.date },
      sound: 'default',
      badge: 1,
    };

    const id = await this.scheduler.scheduleNotification(content, triggerDate);

    const notification: ScheduledNotification = {
      id,
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

    this.notifications.set(id, notification);

    return id;
  }

  async scheduleHolidayAlert(
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    holiday: any,
    daysBefore: number
  ): Promise<string> {
    const holidayDate = new Date(holiday.date);
    const triggerDate = new Date(holidayDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    const content = {
      title: 'Upcoming Holiday',
      body: `${holiday.name} is in ${daysBefore} days`,
      data: { holidayId: holiday.id },
      sound: 'default',
      badge: 1,
    };

    const id = await this.scheduler.scheduleNotification(content, triggerDate);

    const notification: ScheduledNotification = {
      id,
      userId,
      type: NotificationType.HOLIDAY_ALERT,
      scheduledFor: triggerDate.toISOString(),
      content,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(id, notification);

    return id;
  }

  async cancelNotification(_userId: string, notificationId: string): Promise<void> {
    await this.scheduler.cancelNotification(notificationId);
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'cancelled';
    }
  }

  async cancelAllNotifications(userId: string): Promise<void> {
    await this.scheduler.cancelAllNotifications();
    this.notifications.forEach((n) => {
      if (n.userId === userId && n.status === 'pending') {
        n.status = 'cancelled';
      }
    });
  }

  async requestPermissions(): Promise<boolean> {
    await Promise.resolve();
    return this.scheduler.requestPermissions();
  }

  async checkPermissions(): Promise<boolean> {
    await Promise.resolve();
    return this.scheduler.checkPermissions();
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    await Promise.resolve();
    return this.scheduler.getPermissionStatus();
  }

  async scheduleDaily(hour: number, title: string, body: string): Promise<void> {
    const triggerDate = new Date();
    triggerDate.setHours(hour, 0, 0, 0);
    if (triggerDate <= new Date()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    await this.scheduler.scheduleNotification({ title, body }, triggerDate);
  }

  async scheduleOnboardingEngagementSequence(userName: string): Promise<void> {
    const now = new Date();
    const firstName = userName.trim() || 'there';
    const checkpoints = [0, 1, 2, 6, 13, 29];

    for (const daysToAdd of checkpoints) {
      const triggerDate = new Date(now);
      triggerDate.setDate(triggerDate.getDate() + daysToAdd);
      triggerDate.setHours(daysToAdd === 0 ? 18 : 9, 0, 0, 0);
      await this.scheduler.scheduleNotification(
        {
          title: daysToAdd === 1 ? `Morning, ${firstName}! 👋` : 'Roster reminder',
          body: 'Check your upcoming shifts in Ellie.',
        },
        triggerDate
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildShiftReminderContent(shift: any, hoursBefore: number): NotificationContent {
    return {
      title: shift.isNightShift ? 'Night Shift Reminder' : 'Day Shift Reminder',
      body: `Your shift starts in ${hoursBefore} hours`,
      data: { shiftDate: shift.date },
      sound: 'default',
      badge: 1,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildHolidayAlertContent(holiday: any, daysBefore: number): NotificationContent {
    return {
      title: 'Upcoming Holiday',
      body: `${holiday.name} is in ${daysBefore} days`,
      data: { holidayId: holiday.id },
      sound: 'default',
      badge: 1,
    };
  }

  async saveNotification(_userId: string, notification: ScheduledNotification): Promise<void> {
    await Promise.resolve();
    this.notifications.set(notification.id, notification);
  }

  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ScheduledNotification[]> {
    await Promise.resolve();
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())
      .slice(0, limit);
  }

  async markAsDelivered(notificationId: string): Promise<void> {
    await Promise.resolve();
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'delivered';
      notification.deliveredAt = new Date().toISOString();
    }
  }

  // Test helpers
  reset(): void {
    this.notifications.clear();
    this.scheduler.reset();
  }

  getNotificationCount(): number {
    return this.notifications.size;
  }
}

export const NotificationService = MockNotificationService;
export const notificationService = new MockNotificationService();
