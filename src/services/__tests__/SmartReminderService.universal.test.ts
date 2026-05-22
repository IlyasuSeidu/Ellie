import { SmartReminderService } from '@/services/SmartReminderService';
import type { ShiftDay } from '@/types';
import type { SmartReminderSettings } from '@/types/reminders';

const settings: SmartReminderSettings = {
  earlyReminderHours: 8,
  prepTimeMinutes: 60,
  commuteTimeMinutes: 0,
  imminentReminderEnabled: false,
  preBriefingEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  fatigueAwareReminders: false,
  backToBackWarnings: false,
  shortTurnaroundWarnings: false,
  postShiftCheckin: false,
  travelReminders: false,
};

const universalNightShift: ShiftDay = {
  date: '2026-05-22',
  isWorkDay: true,
  isNightShift: true,
  shiftType: 'night',
  universal: {
    definitionId: 'night-def',
    definitionName: 'Plant Night Shift',
    kind: 'work',
    color: '#4338ca',
    icon: 'moon',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '18:00',
    endTime: '06:00',
    crossesMidnight: true,
    countsAsWork: true,
    countsAsNight: true,
    reminderProfileId: 'night-profile',
    sequenceIndex: 1,
    cycleLength: 3,
  },
};

describe('SmartReminderService universal schedules', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-21T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses universal start times and identity metadata when building reminders', () => {
    const service = new SmartReminderService();

    const events = service.buildSchedule('Amina Mensah', [universalNightShift], settings);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SHIFT_REMINDER_CUSTOM_EARLY',
          triggerAt: new Date('2026-05-22T10:00:00.000Z'),
          shiftDate: '2026-05-22',
          universalDefinitionId: 'night-def',
          reminderProfileId: 'night-profile',
          data: expect.objectContaining({
            universalDefinitionName: 'Plant Night Shift',
          }),
        }),
        expect.objectContaining({
          type: 'SHIFT_PREP_REMINDER',
          triggerAt: new Date('2026-05-22T17:00:00.000Z'),
          universalDefinitionId: 'night-def',
          reminderProfileId: 'night-profile',
        }),
      ])
    );
  });

  it('uses reminder rules stored on a universal shift definition before global defaults', () => {
    const service = new SmartReminderService();
    const shiftWithProfile: ShiftDay = {
      ...universalNightShift,
      universal: {
        ...universalNightShift.universal!,
        reminderProfile: {
          earlyReminderHours: 1,
          prepTimeMinutes: 30,
          commuteTimeMinutes: 15,
          imminentReminderEnabled: true,
        },
      },
    };

    const events = service.buildSchedule('Amina Mensah', [shiftWithProfile], {
      ...settings,
      earlyReminderHours: 12,
      prepTimeMinutes: 120,
      commuteTimeMinutes: 0,
      imminentReminderEnabled: false,
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'SHIFT_REMINDER_CUSTOM_EARLY',
          triggerAt: new Date('2026-05-22T17:00:00.000Z'),
          reminderProfileId: 'night-profile',
        }),
        expect.objectContaining({
          type: 'SHIFT_PREP_REMINDER',
          triggerAt: new Date('2026-05-22T17:15:00.000Z'),
          reminderProfileId: 'night-profile',
        }),
        expect.objectContaining({
          type: 'SHIFT_START_IMMINENT',
          triggerAt: new Date('2026-05-22T17:45:00.000Z'),
          reminderProfileId: 'night-profile',
        }),
      ])
    );
  });
});
