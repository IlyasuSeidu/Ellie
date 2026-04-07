import dayjs from 'dayjs';
import { notificationService } from './NotificationService';
import { smartReminderService } from './SmartReminderService';
import { ShiftDataService } from './ShiftDataService';
import { logger } from '@/utils/logger';
import type { ShiftCycle } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { ReminderFatigueRiskLevel, SmartReminderSettings } from '@/types/reminders';

interface RescheduleParams {
  userId: string;
  userName: string;
  shiftCycle: ShiftCycle;
  shiftTimes: OnboardingData['shiftTimes'];
  settings: SmartReminderSettings;
  fatigueRisk?: ReminderFatigueRiskLevel;
  language?: string;
}

export class SmartReminderOrchestrator {
  constructor(private readonly shiftDataService: ShiftDataService) {}

  async reschedule(params: RescheduleParams): Promise<void> {
    const { userId, userName, shiftCycle, shiftTimes, settings, fatigueRisk, language } = params;

    logger.info('SmartReminderOrchestrator: rescheduling reminders', {
      userId,
      patternType: shiftCycle.patternType,
    });

    await notificationService.cancelSmartReminders(userId);

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

    logger.info('SmartReminderOrchestrator: scheduling computed events', {
      userId,
      eventCount: events.length,
    });

    for (const event of events) {
      try {
        await notificationService.scheduleSmartReminder(userId, event);
      } catch (error) {
        logger.error(
          'SmartReminderOrchestrator: failed to schedule reminder event',
          error as Error,
          {
            userId,
            type: event.type,
            triggerAt: event.triggerAt.toISOString(),
          }
        );
      }
    }
  }
}
