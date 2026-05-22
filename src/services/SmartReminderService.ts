import dayjs from 'dayjs';
import i18n from '@/i18n';
import type { ShiftDay, ShiftType } from '@/types';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  formatLocalizedTime,
} from '@/utils/i18nFormat';
import type {
  ReminderEvent,
  ReminderFatigueRiskLevel,
  SmartReminderSettings,
  SmartReminderType,
} from '@/types/reminders';

function parseHHMM(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

function applyTime(date: string, time: string): dayjs.Dayjs {
  const [hours, minutes] = time.split(':').map(Number);
  return dayjs(date).hour(hours).minute(minutes).second(0).millisecond(0);
}

function isInQuietHours(time: dayjs.Dayjs, start: string, end: string): boolean {
  const startMinutes = parseHHMM(start);
  const endMinutes = parseHHMM(end);
  const currentMinutes = time.hour() * 60 + time.minute();

  if (startMinutes === endMinutes) {
    return false;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function getShiftStartTimeForDay(shift: ShiftDay): string | null {
  return shift.universal?.startTime ?? null;
}

function getShiftEndTimeForDay(shift: ShiftDay): string | null {
  return shift.universal?.endTime ?? null;
}

function getReminderSettingsForShift(
  baseSettings: SmartReminderSettings,
  shift: ShiftDay
): SmartReminderSettings {
  const profile = shift.universal?.reminderProfile;
  if (!profile) {
    return baseSettings;
  }

  return {
    ...baseSettings,
    ...profile,
  };
}

function buildShiftEnd(date: string, startTime: string, endTime: string): dayjs.Dayjs {
  const start = applyTime(date, startTime);
  let end = applyTime(date, endTime);

  if (end.isSame(start) || end.isBefore(start)) {
    end = end.add(1, 'day');
  }

  return end;
}

function firstNameOrNull(userName: string): string | null {
  const trimmed = userName.trim();
  if (!trimmed) {
    return null;
  }

  const [firstName] = trimmed.split(/\s+/);
  return firstName || null;
}

function translate(
  key: string,
  options?: Record<string, unknown>,
  defaultValue?: string,
  language: string = i18n.resolvedLanguage ?? i18n.language ?? 'en'
): string {
  return String(
    i18n.t(
      key as never,
      {
        ns: 'dashboard',
        lng: language,
        defaultValue,
        ...options,
      } as never
    )
  );
}

function shiftLabel(shiftType: ShiftType, language: string): string {
  return translate(
    `notifications.smartReminders.shiftType.${shiftType}`,
    undefined,
    shiftType,
    language
  );
}

function shiftDayLabel(shift: ShiftDay, language: string): string {
  return shift.universal?.definitionName ?? shiftLabel(shift.shiftType, language);
}

function formatReminderDate(date: string, language: string): string {
  return formatLocalizedDate(
    new Date(`${date}T12:00:00.000Z`),
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    },
    language
  );
}

function formatGapHours(gapHours: number, language: string): string {
  const rounded = Math.round(gapHours * 10) / 10;
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.001;
  return formatLocalizedNumber(
    isWhole ? Math.round(rounded) : rounded,
    {
      maximumFractionDigits: isWhole ? 0 : 1,
    },
    language
  );
}

export class SmartReminderService {
  buildSchedule(
    userName: string,
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    fatigueRisk?: ReminderFatigueRiskLevel,
    language: string = i18n.resolvedLanguage ?? i18n.language ?? 'en'
  ): ReminderEvent[] {
    const now = dayjs();
    const events: ReminderEvent[] = [];
    const firstName = firstNameOrNull(userName);
    const upcomingWorkDays = workDays.filter((day) => day.isWorkDay);

    for (const shift of upcomingWorkDays) {
      const shiftSettings = getReminderSettingsForShift(settings, shift);
      const startTimeStr = getShiftStartTimeForDay(shift);
      const endTimeStr = getShiftEndTimeForDay(shift);

      if (!startTimeStr) {
        continue;
      }

      const shiftStart = applyTime(shift.date, startTimeStr);
      const localizedShiftType = shiftDayLabel(shift, language);
      const localizedStartTime = formatLocalizedTime(startTimeStr, undefined, language);
      const localizedShiftDate = formatReminderDate(shift.date, language);

      const earlyTrigger = shiftStart.subtract(shiftSettings.earlyReminderHours, 'hour');
      if (earlyTrigger.isAfter(now)) {
        events.push(
          this.buildEvent(
            {
              type: 'SHIFT_REMINDER_CUSTOM_EARLY',
              triggerAt: earlyTrigger.toDate(),
              shift,
              isCritical: false,
              title: translate(
                'notifications.smartReminders.early.title',
                { shiftType: localizedShiftType },
                'Upcoming {{shiftType}}',
                language
              ),
              body: translate(
                'notifications.smartReminders.early.body',
                {
                  shiftType: localizedShiftType,
                  shiftDate: localizedShiftDate,
                  startTime: localizedStartTime,
                },
                'Your {{shiftType}} starts at {{startTime}} on {{shiftDate}}.',
                language
              ),
            },
            shiftSettings
          )
        );
      }

      const totalLeadMinutes = shiftSettings.prepTimeMinutes + shiftSettings.commuteTimeMinutes;
      let prepTrigger = shiftStart.subtract(totalLeadMinutes, 'minute');
      if (
        shiftSettings.fatigueAwareReminders &&
        (fatigueRisk === 'high' || fatigueRisk === 'critical')
      ) {
        prepTrigger = prepTrigger.subtract(30, 'minute');
      }

      if (prepTrigger.isAfter(now)) {
        const fatigueSuffix =
          fatigueRisk === 'critical'
            ? translate(
                'notifications.smartReminders.prep.fatigueCritical',
                undefined,
                ' Fatigue risk is critical. Give yourself extra time.',
                language
              )
            : fatigueRisk === 'high'
              ? translate(
                  'notifications.smartReminders.prep.fatigueHigh',
                  undefined,
                  ' Rest and prepare carefully.',
                  language
                )
              : '';

        events.push(
          this.buildEvent(
            {
              type: 'SHIFT_PREP_REMINDER',
              triggerAt: prepTrigger.toDate(),
              shift,
              isCritical: fatigueRisk === 'critical',
              title: translate(
                firstName
                  ? 'notifications.smartReminders.prep.title'
                  : 'notifications.smartReminders.prep.titleGeneric',
                firstName ? { name: firstName } : undefined,
                firstName ? 'Time to prepare, {{name}}' : 'Time to prepare',
                language
              ),
              body: translate(
                'notifications.smartReminders.prep.body',
                {
                  shiftType: localizedShiftType,
                  startTime: localizedStartTime,
                  fatigueSuffix,
                },
                'Your {{shiftType}} starts at {{startTime}}.{{fatigueSuffix}}',
                language
              ),
            },
            shiftSettings
          )
        );
      }

      if (shiftSettings.commuteTimeMinutes > 0) {
        const commuteTrigger = shiftStart.subtract(shiftSettings.commuteTimeMinutes, 'minute');
        if (commuteTrigger.isAfter(now) && commuteTrigger.isAfter(prepTrigger)) {
          events.push(
            this.buildEvent(
              {
                type: 'COMMUTE_REMINDER',
                triggerAt: commuteTrigger.toDate(),
                shift,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.commute.title',
                  undefined,
                  'Leave now',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.commute.body',
                  {
                    shiftType: localizedShiftType,
                    startTime: localizedStartTime,
                  },
                  'Head out now to reach your {{shiftType}} on time. It starts at {{startTime}}.',
                  language
                ),
              },
              shiftSettings
            )
          );
        }
      }

      if (shiftSettings.imminentReminderEnabled) {
        const imminentTrigger = shiftStart.subtract(15, 'minute');
        if (imminentTrigger.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'SHIFT_START_IMMINENT',
                triggerAt: imminentTrigger.toDate(),
                shift,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.imminent.title',
                  undefined,
                  'Starting in 15 minutes',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.imminent.body',
                  {
                    shiftType: localizedShiftType,
                    startTime: localizedStartTime,
                  },
                  'Your {{shiftType}} begins at {{startTime}}.',
                  language
                ),
              },
              shiftSettings
            )
          );
        }
      }

      if (shiftSettings.preBriefingEnabled) {
        const briefingTrigger = shiftStart.subtract(15, 'minute');
        if (briefingTrigger.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'PRE_BRIEFING_REMINDER',
                triggerAt: briefingTrigger.toDate(),
                shift,
                isCritical: true,
                title: translate(
                  'notifications.smartReminders.briefing.title',
                  undefined,
                  'Briefing soon',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.briefing.body',
                  {
                    shiftType: localizedShiftType,
                    startTime: localizedStartTime,
                  },
                  'Shift briefing is in 15 minutes before your {{shiftType}} at {{startTime}}.',
                  language
                ),
              },
              shiftSettings
            )
          );
        }
      }

      if (shiftSettings.postShiftCheckin && endTimeStr) {
        const shiftEnd = buildShiftEnd(shift.date, startTimeStr, endTimeStr);
        const checkinTrigger = shiftEnd.add(1, 'hour');
        if (checkinTrigger.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'POST_SHIFT_CHECKIN',
                triggerAt: checkinTrigger.toDate(),
                shift,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.postShift.title',
                  undefined,
                  'How did that go?',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.postShift.body',
                  { shiftType: localizedShiftType },
                  'How was your {{shiftType}}? Log your energy level in Ellie.',
                  language
                ),
              },
              shiftSettings
            )
          );
        }
      }

      if (shiftSettings.fatigueAwareReminders && fatigueRisk === 'critical' && shift.isNightShift) {
        const fatigueTrigger = shiftStart.subtract(2, 'hour');
        if (fatigueTrigger.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'FATIGUE_ALERT',
                triggerAt: fatigueTrigger.toDate(),
                shift,
                isCritical: true,
                title: translate(
                  'notifications.smartReminders.fatigue.title',
                  undefined,
                  'Critical fatigue alert',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.fatigue.body',
                  {
                    shiftType: localizedShiftType,
                    startTime: localizedStartTime,
                  },
                  'Your {{shiftType}} starts at {{startTime}}, but your sleep data shows critical fatigue. Rest now if you can.',
                  language
                ),
              },
              shiftSettings
            )
          );
        }
      }
    }

    if (settings.backToBackWarnings) {
      events.push(...this.buildBackToBackWarnings(workDays, settings, now, language));
    }

    if (settings.shortTurnaroundWarnings) {
      events.push(...this.buildShortTurnaroundWarnings(workDays, settings, now, language));
    }

    if (settings.travelReminders) {
      events.push(...this.buildTravelReminders(workDays, settings, now, language));
    }

    return this.deduplicateEvents(events).sort(
      (left, right) => left.triggerAt.getTime() - right.triggerAt.getTime()
    );
  }

  private buildBackToBackWarnings(
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs,
    language: string
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];
    let streak = 0;
    let streakStart: ShiftDay | null = null;

    for (let index = 0; index <= workDays.length; index += 1) {
      const day = workDays[index];
      if (day?.isWorkDay && day.isNightShift) {
        if (streak === 0) {
          streakStart = day;
        }
        streak += 1;
        continue;
      }

      if (streak >= 3 && streakStart) {
        const warningAt = dayjs(streakStart.date).subtract(1, 'day').hour(8).minute(0).second(0);
        if (warningAt.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'BACK_TO_BACK_WARNING',
                triggerAt: warningAt.toDate(),
                shift: streakStart,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.backToBack.title',
                  { count: streak },
                  '{{count}} night shifts coming up',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.backToBack.body',
                  {
                    count: streak,
                    shiftDate: formatReminderDate(streakStart.date, language),
                  },
                  'You have {{count}} consecutive night shifts starting {{shiftDate}}. Prioritize rest.',
                  language
                ),
              },
              settings
            )
          );
        }
      }

      streak = 0;
      streakStart = null;
    }

    return events;
  }

  private buildShortTurnaroundWarnings(
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs,
    language: string
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];
    const upcomingWorkDays = workDays.filter((day) => day.isWorkDay);

    for (let index = 0; index < upcomingWorkDays.length - 1; index += 1) {
      const currentShift = upcomingWorkDays[index];
      const nextShift = upcomingWorkDays[index + 1];
      const currentStart = getShiftStartTimeForDay(currentShift);
      const currentEnd = getShiftEndTimeForDay(currentShift);
      const nextStart = getShiftStartTimeForDay(nextShift);

      if (!currentStart || !currentEnd || !nextStart) {
        continue;
      }

      const currentEndTime = buildShiftEnd(currentShift.date, currentStart, currentEnd);
      const nextStartTime = applyTime(nextShift.date, nextStart);
      const gapHours = nextStartTime.diff(currentEndTime, 'hour', true);

      if (gapHours <= 0 || gapHours >= 10) {
        continue;
      }

      const warningAt = nextStartTime.subtract(1, 'day').hour(9).minute(0).second(0);
      if (!warningAt.isAfter(now)) {
        continue;
      }

      events.push(
        this.buildEvent(
          {
            type: 'SHORT_TURNAROUND_WARNING',
            triggerAt: warningAt.toDate(),
            shift: nextShift,
            isCritical: false,
            title: translate(
              'notifications.smartReminders.shortTurnaround.title',
              undefined,
              'Short turnaround ahead',
              language
            ),
            body: translate(
              'notifications.smartReminders.shortTurnaround.body',
              {
                gapHours: formatGapHours(gapHours, language),
                previousShiftType: shiftDayLabel(currentShift, language),
                nextShiftType: shiftDayLabel(nextShift, language),
                shiftDate: formatReminderDate(nextShift.date, language),
              },
              'Only {{gapHours}}h between your {{previousShiftType}} and next {{nextShiftType}} on {{shiftDate}}. Plan your rest.',
              language
            ),
          },
          settings
        )
      );
    }

    return events;
  }

  private buildTravelReminders(
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs,
    language: string
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];

    for (let index = 0; index < workDays.length - 1; index += 1) {
      const currentDay = workDays[index];
      const nextDay = workDays[index + 1];

      if (currentDay.isWorkDay && !nextDay.isWorkDay) {
        const currentStart = getShiftStartTimeForDay(currentDay);
        const currentEnd = getShiftEndTimeForDay(currentDay);
        const travelOutAt =
          currentStart && currentEnd
            ? buildShiftEnd(currentDay.date, currentStart, currentEnd).subtract(1, 'hour')
            : applyTime(currentDay.date, '07:00');

        if (travelOutAt.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'TRAVEL_OUT_TODAY',
                triggerAt: travelOutAt.toDate(),
                shift: currentDay,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.travel.outToday.title',
                  undefined,
                  'Travel-out day',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.travel.outToday.body',
                  undefined,
                  'Today you head home. Complete your handover, pack your gear, and travel safely.',
                  language
                ),
              },
              settings
            )
          );
        }
      }

      if (!currentDay.isWorkDay && nextDay.isWorkDay) {
        const nextStart = getShiftStartTimeForDay(nextDay);
        const derivedTravelWarning = nextStart
          ? applyTime(nextDay.date, nextStart).subtract(12, 'hour')
          : null;
        const earliestWindow = applyTime(currentDay.date, '16:00');
        const latestWindow = applyTime(currentDay.date, '20:00');
        const travelWarningAt = !derivedTravelWarning
          ? applyTime(currentDay.date, '18:00')
          : derivedTravelWarning.isBefore(earliestWindow)
            ? earliestWindow
            : derivedTravelWarning.isAfter(latestWindow)
              ? latestWindow
              : derivedTravelWarning;

        if (travelWarningAt.isAfter(now)) {
          events.push(
            this.buildEvent(
              {
                type: 'TRAVEL_DAY_TOMORROW',
                triggerAt: travelWarningAt.toDate(),
                shift: nextDay,
                isCritical: false,
                title: translate(
                  'notifications.smartReminders.travel.tomorrow.title',
                  undefined,
                  'Travel day tomorrow',
                  language
                ),
                body: translate(
                  'notifications.smartReminders.travel.tomorrow.body',
                  {
                    shiftType: shiftDayLabel(nextDay, language),
                  },
                  'You travel tomorrow for your {{shiftType}}. Pack your gear and check your documents tonight.',
                  language
                ),
              },
              settings
            )
          );
        }
      }
    }

    return events;
  }

  private buildEvent(
    params: {
      type: SmartReminderType;
      triggerAt: Date;
      shift: ShiftDay;
      isCritical: boolean;
      title: string;
      body: string;
    },
    settings: SmartReminderSettings
  ): ReminderEvent {
    const event: ReminderEvent = {
      type: params.type,
      triggerAt: params.triggerAt,
      shiftDate: params.shift.date,
      shiftType: params.shift.shiftType,
      universalDefinitionId: params.shift.universal?.definitionId,
      reminderProfileId: params.shift.universal?.reminderProfileId,
      isCritical: params.isCritical,
      title: params.title,
      body: params.body,
      data: {
        type: params.type,
        shiftDate: params.shift.date,
        shiftType: params.shift.shiftType,
        universalDefinitionId: params.shift.universal?.definitionId,
        universalDefinitionName: params.shift.universal?.definitionName,
        reminderProfileId: params.shift.universal?.reminderProfileId,
      },
    };

    return this.applyQuietHours(event, settings);
  }

  private applyQuietHours(event: ReminderEvent, settings: SmartReminderSettings): ReminderEvent {
    if (!settings.quietHoursEnabled || event.isCritical) {
      return event;
    }

    const trigger = dayjs(event.triggerAt);
    if (!isInQuietHours(trigger, settings.quietHoursStart, settings.quietHoursEnd)) {
      return event;
    }

    const [hours, minutes] = settings.quietHoursEnd.split(':').map(Number);
    let adjusted = trigger.hour(hours).minute(minutes).second(0).millisecond(0);
    if (adjusted.isBefore(trigger) || adjusted.isSame(trigger)) {
      adjusted = adjusted.add(1, 'day');
    }

    return {
      ...event,
      triggerAt: adjusted.toDate(),
    };
  }

  private deduplicateEvents(events: ReminderEvent[]): ReminderEvent[] {
    const deduplicated: ReminderEvent[] = [];

    for (const event of events) {
      const duplicate = deduplicated.some(
        (existing) =>
          existing.type === event.type &&
          existing.shiftDate === event.shiftDate &&
          Math.abs(existing.triggerAt.getTime() - event.triggerAt.getTime()) < 5 * 60 * 1000
      );

      if (!duplicate) {
        deduplicated.push(event);
      }
    }

    return deduplicated;
  }
}

export const smartReminderService = new SmartReminderService();
