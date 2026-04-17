import dayjs from 'dayjs';
import { notificationService } from './NotificationService';
import { smartReminderService } from './SmartReminderService';
import { ShiftDataService } from './ShiftDataService';
import { logger } from '@/utils/logger';
import type { ShiftCycle } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import {
  buildSmartReminderKey,
  type ReminderFatigueRiskLevel,
  type SmartReminderSettings,
} from '@/types/reminders';

interface RescheduleParams {
  userId: string;
  userName: string;
  shiftCycle: ShiftCycle;
  shiftTimes: OnboardingData['shiftTimes'];
  settings: SmartReminderSettings;
  fatigueRisk?: ReminderFatigueRiskLevel;
  language?: string;
}

const userRescheduleLocks = new Map<string, Promise<void>>();

async function runExclusiveForUser<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const previous = userRescheduleLocks.get(userId) ?? Promise.resolve();

  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => current);
  userRescheduleLocks.set(userId, queued);

  await previous.catch(() => undefined);

  try {
    return await task();
  } finally {
    releaseCurrent();
    if (userRescheduleLocks.get(userId) === queued) {
      userRescheduleLocks.delete(userId);
    }
  }
}

export class SmartReminderOrchestrator {
  constructor(private readonly shiftDataService: ShiftDataService) {}

  async reschedule(params: RescheduleParams): Promise<void> {
    const { userId, userName, shiftCycle, shiftTimes, settings, fatigueRisk, language } = params;

    await runExclusiveForUser(userId, async () => {
      logger.info('SmartReminderOrchestrator: rescheduling reminders', {
        userId,
        patternType: shiftCycle.patternType,
      });

      const start = dayjs().startOf('day').toDate();
      const end = dayjs().add(13, 'day').endOf('day').toDate();
      const shiftDays = await this.shiftDataService.getShiftDaysInRange(
        start,
        end,
        shiftCycle,
        userId
      );

      const events = smartReminderService.buildSchedule(
        userName,
        shiftDays,
        shiftTimes,
        settings,
        fatigueRisk,
        language
      );

      const existingReminders = await notificationService.getPendingSmartReminders(userId);
      const existingByKey = new Map(
        existingReminders
          .map(
            (notification) =>
              [notificationService.getSmartReminderKey(notification), notification] as const
          )
          .filter((entry): entry is readonly [string, (typeof existingReminders)[number]] =>
            Boolean(entry[0])
          )
      );
      const desiredByKey = new Map(
        events.map((event) => [buildSmartReminderKey(event), event] as const)
      );

      const missingEvents = Array.from(desiredByKey.entries())
        .filter(([key]) => !existingByKey.has(key))
        .map(([, event]) => event);
      const staleReminders = existingReminders.filter((notification) => {
        const key = notificationService.getSmartReminderKey(notification);
        return !key || !desiredByKey.has(key);
      });

      logger.info('SmartReminderOrchestrator: reconciling computed events', {
        userId,
        desiredEventCount: events.length,
        existingEventCount: existingReminders.length,
        missingEventCount: missingEvents.length,
        staleEventCount: staleReminders.length,
      });

      const newlyScheduledIds: string[] = [];

      try {
        for (const event of missingEvents) {
          const notificationId = await notificationService.scheduleSmartReminder(userId, event);
          newlyScheduledIds.push(notificationId);
        }
      } catch (error) {
        await Promise.allSettled(
          newlyScheduledIds.map((notificationId) =>
            notificationService.cancelNotification(userId, notificationId)
          )
        );

        logger.error(
          'SmartReminderOrchestrator: failed while scheduling new reminder set; rolled back partial additions',
          error as Error,
          {
            userId,
            scheduledCountBeforeFailure: newlyScheduledIds.length,
          }
        );
        throw error;
      }

      for (const notification of staleReminders) {
        try {
          await notificationService.cancelNotification(userId, notification.id);
        } catch (error) {
          logger.error(
            'SmartReminderOrchestrator: failed to cancel stale reminder during reconciliation',
            error as Error,
            {
              userId,
              notificationId: notification.id,
            }
          );
        }
      }
    });
  }
}
