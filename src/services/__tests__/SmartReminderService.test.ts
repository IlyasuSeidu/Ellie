import { smartReminderService } from '@/services/SmartReminderService';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import type { ShiftDay } from '@/types';

const baseShiftTimes = {
  dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 as const },
  nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 as const },
};

describe('SmartReminderService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds the core per-shift reminder sequence for a work day', () => {
    const workDays: ShiftDay[] = [
      {
        date: '2026-04-03',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu Seidu',
      workDays,
      baseShiftTimes,
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 8,
        prepTimeMinutes: 60,
        commuteTimeMinutes: 30,
        imminentReminderEnabled: true,
        preBriefingEnabled: true,
        postShiftCheckin: true,
      },
      undefined,
      'en'
    );

    expect(events.map((event) => event.type)).toEqual([
      'SHIFT_REMINDER_CUSTOM_EARLY',
      'SHIFT_PREP_REMINDER',
      'COMMUTE_REMINDER',
      'SHIFT_START_IMMINENT',
      'PRE_BRIEFING_REMINDER',
      'POST_SHIFT_CHECKIN',
    ]);
    expect(events[0].triggerAt.toISOString()).toBe('2026-04-02T23:00:00.000Z');
    expect(events[5].triggerAt.toISOString()).toBe('2026-04-03T20:00:00.000Z');
  });

  it('applies quiet hours only to non-critical reminders', () => {
    const workDays: ShiftDay[] = [
      {
        date: '2026-04-03',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu Seidu',
      workDays,
      {
        dayShift: { startTime: '06:00', endTime: '18:00', duration: 12 },
      },
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 1,
        prepTimeMinutes: 30,
        commuteTimeMinutes: 0,
        preBriefingEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
      },
      undefined,
      'en'
    );

    const earlyReminder = events.find((event) => event.type === 'SHIFT_REMINDER_CUSTOM_EARLY');
    const briefingReminder = events.find((event) => event.type === 'PRE_BRIEFING_REMINDER');

    expect(earlyReminder?.triggerAt.toISOString()).toBe('2026-04-03T06:00:00.000Z');
    expect(briefingReminder?.triggerAt.toISOString()).toBe('2026-04-03T05:45:00.000Z');
  });

  it('treats identical quiet-hour boundaries as disabled instead of silencing the full day', () => {
    const workDays: ShiftDay[] = [
      {
        date: '2026-04-03',
        isWorkDay: true,
        isNightShift: false,
        shiftType: 'day',
      },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu Seidu',
      workDays,
      baseShiftTimes,
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 1,
        prepTimeMinutes: 0,
        commuteTimeMinutes: 0,
        imminentReminderEnabled: false,
        preBriefingEnabled: false,
        quietHoursEnabled: true,
        quietHoursStart: '06:00',
        quietHoursEnd: '06:00',
      },
      undefined,
      'en'
    );

    const earlyReminder = events.find((event) => event.type === 'SHIFT_REMINDER_CUSTOM_EARLY');
    expect(earlyReminder?.triggerAt.toISOString()).toBe('2026-04-03T06:00:00.000Z');
  });

  it('fires back-to-back warnings for three or more consecutive night shifts', () => {
    const workDays: ShiftDay[] = [
      { date: '2026-04-04', isWorkDay: true, isNightShift: true, shiftType: 'night' },
      { date: '2026-04-05', isWorkDay: true, isNightShift: true, shiftType: 'night' },
      { date: '2026-04-06', isWorkDay: true, isNightShift: true, shiftType: 'night' },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu',
      workDays,
      baseShiftTimes,
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 0,
        prepTimeMinutes: 0,
        commuteTimeMinutes: 0,
        imminentReminderEnabled: false,
        preBriefingEnabled: false,
        backToBackWarnings: true,
        shortTurnaroundWarnings: false,
        fifoTravelReminders: false,
      },
      undefined,
      'en'
    );

    const warning = events.find((event) => event.type === 'BACK_TO_BACK_WARNING');
    expect(warning).toBeDefined();
    expect(warning?.triggerAt.toISOString()).toBe('2026-04-03T08:00:00.000Z');
  });

  it('fires short turnaround warnings when rest gap is under ten hours', () => {
    const workDays: ShiftDay[] = [
      { date: '2026-04-03', isWorkDay: true, isNightShift: true, shiftType: 'night' },
      { date: '2026-04-04', isWorkDay: true, isNightShift: false, shiftType: 'day' },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu',
      workDays,
      {
        dayShift: { startTime: '14:00', endTime: '22:00', duration: 8 },
        nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
      },
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 0,
        prepTimeMinutes: 0,
        commuteTimeMinutes: 0,
        imminentReminderEnabled: false,
        preBriefingEnabled: false,
        backToBackWarnings: false,
        shortTurnaroundWarnings: true,
        fifoTravelReminders: false,
      },
      undefined,
      'en'
    );

    const warning = events.find((event) => event.type === 'SHORT_TURNAROUND_WARNING');
    expect(warning).toBeDefined();
    expect(warning?.body).toContain('7h');
  });

  it('fires FIFO travel reminders at work/off transitions', () => {
    const workDays: ShiftDay[] = [
      { date: '2026-04-02', isWorkDay: true, isNightShift: false, shiftType: 'day' },
      { date: '2026-04-03', isWorkDay: false, isNightShift: false, shiftType: 'off' },
      { date: '2026-04-04', isWorkDay: false, isNightShift: false, shiftType: 'off' },
      { date: '2026-04-05', isWorkDay: true, isNightShift: false, shiftType: 'day' },
    ];

    const events = smartReminderService.buildSchedule(
      'Ilyasu',
      workDays,
      baseShiftTimes,
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 0,
        prepTimeMinutes: 0,
        commuteTimeMinutes: 0,
        imminentReminderEnabled: false,
        preBriefingEnabled: false,
        backToBackWarnings: false,
        shortTurnaroundWarnings: false,
        fifoTravelReminders: true,
      },
      undefined,
      'en'
    );

    expect(events.some((event) => event.type === 'FIFO_FLY_OUT_TODAY')).toBe(true);
    expect(events.some((event) => event.type === 'FIFO_TRAVEL_DAY_TOMORROW')).toBe(true);
  });

  it('deduplicates duplicate events of the same type within five minutes', () => {
    const duplicateShift: ShiftDay = {
      date: '2026-04-03',
      isWorkDay: true,
      isNightShift: false,
      shiftType: 'day',
    };

    const events = smartReminderService.buildSchedule(
      'Ilyasu',
      [duplicateShift, { ...duplicateShift }],
      baseShiftTimes,
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 8,
        prepTimeMinutes: 60,
        commuteTimeMinutes: 30,
      },
      undefined,
      'en'
    );

    expect(events.filter((event) => event.type === 'SHIFT_REMINDER_CUSTOM_EARLY')).toHaveLength(1);
    expect(events.filter((event) => event.type === 'SHIFT_PREP_REMINDER')).toHaveLength(1);
  });
});
