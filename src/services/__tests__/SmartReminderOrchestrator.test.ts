import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import { notificationService } from '@/services/NotificationService';
import { smartReminderService } from '@/services/SmartReminderService';
import { ShiftPattern, ShiftSystem, RosterType, type ShiftCycle, type ShiftDay } from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';

jest.mock('@/services/NotificationService', () => ({
  notificationService: {
    getPendingSmartReminders: jest.fn(),
    scheduleSmartReminder: jest.fn(),
    cancelNotification: jest.fn(),
    getSmartReminderKey: jest.fn(),
  },
}));

jest.mock('@/services/SmartReminderService', () => ({
  smartReminderService: {
    buildSchedule: jest.fn(),
  },
}));

describe('SmartReminderOrchestrator', () => {
  const mockShiftCycle: ShiftCycle = {
    patternType: ShiftPattern.STANDARD_4_4_4,
    shiftSystem: ShiftSystem.TWO_SHIFT,
    rosterType: RosterType.ROTATING,
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2026-04-01',
    phaseOffset: 0,
  };

  const mockShiftDays: ShiftDay[] = [
    {
      date: '2026-04-03',
      isWorkDay: true,
      isNightShift: false,
      shiftType: 'day',
    },
  ];

  const mockEvents = [
    {
      type: 'SHIFT_PREP_REMINDER' as const,
      triggerAt: new Date('2026-04-03T05:30:00.000Z'),
      shiftDate: '2026-04-03',
      shiftType: 'day' as const,
      isCritical: false,
      title: 'Prep',
      body: 'Prep body',
      data: { type: 'SHIFT_PREP_REMINDER' },
    },
    {
      type: 'SHIFT_START_IMMINENT' as const,
      triggerAt: new Date('2026-04-03T06:45:00.000Z'),
      shiftDate: '2026-04-03',
      shiftType: 'day' as const,
      isCritical: false,
      title: 'Soon',
      body: 'Soon body',
      data: { type: 'SHIFT_START_IMMINENT' },
    },
  ];

  const shiftDataService = {
    getShiftDaysInRange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T09:30:00.000Z'));
    shiftDataService.getShiftDaysInRange.mockResolvedValue(mockShiftDays);
    (smartReminderService.buildSchedule as jest.Mock).mockReturnValue(mockEvents);
    (notificationService.getPendingSmartReminders as jest.Mock).mockResolvedValue([]);
    (notificationService.scheduleSmartReminder as jest.Mock).mockResolvedValue(undefined);
    (notificationService.cancelNotification as jest.Mock).mockResolvedValue(undefined);
    (notificationService.getSmartReminderKey as jest.Mock).mockImplementation(
      (notification: { content?: { data?: { smartReminderKey?: string } } }) =>
        notification.content?.data?.smartReminderKey ?? null
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconciles the 14-day window and schedules each missing event', async () => {
    const orchestrator = new SmartReminderOrchestrator(shiftDataService as never);

    await orchestrator.reschedule({
      userId: 'user-1',
      userName: 'Ilyasu',
      shiftCycle: mockShiftCycle,
      shiftTimes: {
        dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
      },
      settings: DEFAULT_SMART_REMINDER_SETTINGS,
      language: 'en',
    });

    expect(shiftDataService.getShiftDaysInRange).toHaveBeenCalledWith(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-14T23:59:59.999Z'),
      mockShiftCycle,
      'user-1'
    );
    expect(smartReminderService.buildSchedule).toHaveBeenCalledWith(
      'Ilyasu',
      mockShiftDays,
      { dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 } },
      DEFAULT_SMART_REMINDER_SETTINGS,
      undefined,
      'en'
    );
    expect(notificationService.scheduleSmartReminder).toHaveBeenCalledTimes(2);
  });

  it('rolls back newly scheduled reminders when scheduling a missing event fails', async () => {
    (notificationService.scheduleSmartReminder as jest.Mock)
      .mockResolvedValueOnce('notification-1')
      .mockRejectedValueOnce(new Error('boom'));

    const orchestrator = new SmartReminderOrchestrator(shiftDataService as never);

    await expect(
      orchestrator.reschedule({
        userId: 'user-1',
        userName: 'Ilyasu',
        shiftCycle: mockShiftCycle,
        shiftTimes: {
          dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
        },
        settings: DEFAULT_SMART_REMINDER_SETTINGS,
        language: 'en',
      })
    ).rejects.toThrow('boom');

    expect(notificationService.scheduleSmartReminder).toHaveBeenCalledTimes(2);
    expect(notificationService.cancelNotification).toHaveBeenCalledWith('user-1', 'notification-1');
  });

  it('does not cancel the existing reminder set when shift lookup fails before reconciliation', async () => {
    shiftDataService.getShiftDaysInRange.mockRejectedValueOnce(new Error('shift lookup failed'));

    const orchestrator = new SmartReminderOrchestrator(shiftDataService as never);

    await expect(
      orchestrator.reschedule({
        userId: 'user-1',
        userName: 'Ilyasu',
        shiftCycle: mockShiftCycle,
        shiftTimes: {
          dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
        },
        settings: DEFAULT_SMART_REMINDER_SETTINGS,
        language: 'en',
      })
    ).rejects.toThrow('shift lookup failed');

    expect(notificationService.scheduleSmartReminder).not.toHaveBeenCalled();
    expect(notificationService.cancelNotification).not.toHaveBeenCalled();
  });

  it('serializes concurrent reschedules for the same user', async () => {
    let releaseFirstLookup!: () => void;
    const firstLookupGate = new Promise<void>((resolve) => {
      releaseFirstLookup = resolve;
    });
    const callOrder: string[] = [];

    shiftDataService.getShiftDaysInRange
      .mockImplementationOnce(async () => {
        callOrder.push('lookup-1-start');
        await firstLookupGate;
        callOrder.push('lookup-1-end');
        return mockShiftDays;
      })
      .mockImplementationOnce(async () => {
        callOrder.push('lookup-2-start');
        return mockShiftDays;
      });

    (notificationService.scheduleSmartReminder as jest.Mock).mockImplementation(async () => {
      callOrder.push('schedule');
      return 'notification-id';
    });

    const orchestrator = new SmartReminderOrchestrator(shiftDataService as never);

    const firstRun = orchestrator.reschedule({
      userId: 'user-1',
      userName: 'Ilyasu',
      shiftCycle: mockShiftCycle,
      shiftTimes: {
        dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
      },
      settings: DEFAULT_SMART_REMINDER_SETTINGS,
      language: 'en',
    });
    const secondRun = orchestrator.reschedule({
      userId: 'user-1',
      userName: 'Ilyasu',
      shiftCycle: mockShiftCycle,
      shiftTimes: {
        dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
      },
      settings: DEFAULT_SMART_REMINDER_SETTINGS,
      language: 'en',
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(callOrder).toEqual(['lookup-1-start']);

    releaseFirstLookup();
    await Promise.all([firstRun, secondRun]);

    expect(callOrder.indexOf('lookup-2-start')).toBeGreaterThan(callOrder.indexOf('lookup-1-end'));
  });
});
