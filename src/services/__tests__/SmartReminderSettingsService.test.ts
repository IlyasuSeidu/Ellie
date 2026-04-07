import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
const mockGetPreferences = jest.fn();
const mockUpdateNotificationSettings = jest.fn();

jest.mock('@/services/UserService', () => ({
  UserService: class {
    getPreferences(...args: unknown[]) {
      return mockGetPreferences(...args);
    }

    updateNotificationSettings(...args: unknown[]) {
      return mockUpdateNotificationSettings(...args);
    }
  },
}));

import {
  resolveReminderUserId,
  SmartReminderSettingsService,
} from '@/services/SmartReminderSettingsService';

describe('SmartReminderSettingsService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  function createService() {
    return new SmartReminderSettingsService({
      getPreferences: mockGetPreferences,
      updateNotificationSettings: mockUpdateNotificationSettings,
    } as never);
  }

  it('loads local settings when there is no authenticated user', async () => {
    await AsyncStorage.setItem(
      'reminders:settings',
      JSON.stringify({
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        earlyReminderHours: 12,
      })
    );

    const service = createService();
    const result = await service.load();

    expect(result.earlyReminderHours).toBe(12);
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it('prefers remote settings and syncs them locally for authenticated users', async () => {
    mockGetPreferences.mockResolvedValue({
      theme: 'auto',
      notifications: {
        shift24HoursBefore: true,
        shift4HoursBefore: true,
        holidayAlerts: true,
        patternChangeAlerts: true,
        soundEnabled: true,
        vibrationEnabled: true,
        smartReminders: {
          ...DEFAULT_SMART_REMINDER_SETTINGS,
          prepTimeMinutes: 90,
        },
      },
      language: 'en',
      timezone: 'UTC',
    });

    const service = createService();
    const result = await service.load('firebase-user-1');

    expect(result.prepTimeMinutes).toBe(90);
    expect(JSON.parse((await AsyncStorage.getItem('reminders:settings')) ?? '{}')).toMatchObject({
      prepTimeMinutes: 90,
    });
  });

  it('backfills local settings to remote preferences when remote settings are missing', async () => {
    const localSettings = {
      ...DEFAULT_SMART_REMINDER_SETTINGS,
      commuteTimeMinutes: 45,
    };
    await AsyncStorage.setItem('reminders:settings', JSON.stringify(localSettings));
    mockGetPreferences.mockResolvedValue({
      theme: 'auto',
      notifications: {
        shift24HoursBefore: true,
        shift4HoursBefore: true,
        holidayAlerts: true,
        patternChangeAlerts: true,
        soundEnabled: true,
        vibrationEnabled: true,
      },
      language: 'en',
      timezone: 'UTC',
    });

    const service = createService();
    const result = await service.load('firebase-user-2');

    expect(result.commuteTimeMinutes).toBe(45);
    expect(mockUpdateNotificationSettings).toHaveBeenCalledWith(
      'firebase-user-2',
      expect.objectContaining({
        smartReminders: expect.objectContaining({
          commuteTimeMinutes: 45,
        }),
      })
    );
  });

  it('saves settings locally and remotely when authenticated', async () => {
    mockGetPreferences.mockResolvedValue({
      theme: 'auto',
      notifications: {
        shift24HoursBefore: true,
        shift4HoursBefore: true,
        holidayAlerts: true,
        patternChangeAlerts: true,
        soundEnabled: true,
        vibrationEnabled: true,
        smartReminders: DEFAULT_SMART_REMINDER_SETTINGS,
      },
      language: 'en',
      timezone: 'UTC',
    });

    const service = createService();
    await service.save(
      {
        ...DEFAULT_SMART_REMINDER_SETTINGS,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
      },
      'firebase-user-3'
    );

    expect(JSON.parse((await AsyncStorage.getItem('reminders:settings')) ?? '{}')).toMatchObject({
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
    });
    expect(mockUpdateNotificationSettings).toHaveBeenCalledWith(
      'firebase-user-3',
      expect.objectContaining({
        smartReminders: expect.objectContaining({
          quietHoursEnabled: true,
          quietHoursStart: '21:00',
        }),
      })
    );
  });

  it('uses a stable stored anonymous reminder id when no auth user exists', async () => {
    const first = await resolveReminderUserId();
    const second = await resolveReminderUserId();

    expect(first).toMatch(/^reminder-user-/);
    expect(second).toBe(first);
  });

  it('returns the firebase user id when authenticated', async () => {
    await expect(resolveReminderUserId('firebase-user-4')).resolves.toBe('firebase-user-4');
  });

  it('falls back to an ephemeral anonymous id when storage resolution fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage-failed'));

    await expect(resolveReminderUserId()).resolves.toMatch(/^reminder-user-/);
  });
});
