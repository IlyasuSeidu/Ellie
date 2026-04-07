import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import { notificationService } from '@/services/NotificationService';
import { smartReminderService } from '@/services/SmartReminderService';
import { ShiftPattern, ShiftSystem, RosterType, type ShiftCycle, type ShiftDay } from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';

jest.mock('@/services/NotificationService', () => ({
  notificationService: {
    cancelSmartReminders: jest.fn(),
    scheduleSmartReminder: jest.fn(),
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
    (notificationService.scheduleSmartReminder as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels existing reminders, rebuilds the 14-day window, and schedules each event', async () => {
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

    expect(notificationService.cancelSmartReminders).toHaveBeenCalledWith('user-1');
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

  it('continues scheduling when one reminder fails', async () => {
    (notificationService.scheduleSmartReminder as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

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
    ).resolves.not.toThrow();

    expect(notificationService.scheduleSmartReminder).toHaveBeenCalledTimes(2);
  });
});
