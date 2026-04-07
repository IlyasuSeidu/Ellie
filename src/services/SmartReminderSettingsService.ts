import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationSettings } from '@/types';
import {
  DEFAULT_SMART_REMINDER_SETTINGS,
  SMART_REMINDER_LOCAL_USER_ID_KEY,
  SMART_REMINDER_SETTINGS_KEY,
  type SmartReminderSettings,
} from '@/types/reminders';
import { logger } from '@/utils/logger';
import { UserService } from './UserService';

function mergeSettings(
  settings: Partial<SmartReminderSettings> | SmartReminderSettings | null | undefined
): SmartReminderSettings {
  return {
    ...DEFAULT_SMART_REMINDER_SETTINGS,
    ...(settings ?? {}),
  };
}

async function readLocalSettingsRecord(): Promise<{
  hasStoredValue: boolean;
  settings: SmartReminderSettings;
}> {
  try {
    const raw = await AsyncStorage.getItem(SMART_REMINDER_SETTINGS_KEY);
    if (!raw) {
      return {
        hasStoredValue: false,
        settings: DEFAULT_SMART_REMINDER_SETTINGS,
      };
    }

    return {
      hasStoredValue: true,
      settings: mergeSettings(JSON.parse(raw) as Partial<SmartReminderSettings>),
    };
  } catch (error) {
    logger.error('SmartReminderSettingsService: failed to read local settings', error as Error);
    return {
      hasStoredValue: false,
      settings: DEFAULT_SMART_REMINDER_SETTINGS,
    };
  }
}

export async function resolveReminderUserId(firebaseUid?: string | null): Promise<string> {
  if (firebaseUid) {
    return firebaseUid;
  }

  const generated = `reminder-user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const existing = await AsyncStorage.getItem(SMART_REMINDER_LOCAL_USER_ID_KEY);
    if (existing) {
      return existing;
    }

    await AsyncStorage.setItem(SMART_REMINDER_LOCAL_USER_ID_KEY, generated);
  } catch (error) {
    logger.error(
      'SmartReminderSettingsService: failed to resolve local reminder user id',
      error as Error
    );
  }

  return generated;
}

export class SmartReminderSettingsService {
  constructor(private readonly userService: UserService = new UserService()) {}

  async load(firebaseUid?: string | null): Promise<SmartReminderSettings> {
    const localRecord = await readLocalSettingsRecord();
    if (!firebaseUid) {
      return localRecord.settings;
    }

    try {
      const remoteSettings = await this.userService.getStoredSmartReminderSettings(firebaseUid);

      if (remoteSettings) {
        const normalized = mergeSettings(remoteSettings);
        await AsyncStorage.setItem(SMART_REMINDER_SETTINGS_KEY, JSON.stringify(normalized));
        return normalized;
      }

      if (localRecord.hasStoredValue) {
        await this.persistRemote(firebaseUid, localRecord.settings);
      }
    } catch (error) {
      logger.error('SmartReminderSettingsService: failed to load remote settings', error as Error, {
        userId: firebaseUid,
      });
    }

    return localRecord.settings;
  }

  async save(
    settings: Partial<SmartReminderSettings> | SmartReminderSettings,
    firebaseUid?: string | null
  ): Promise<SmartReminderSettings> {
    const normalized = mergeSettings(settings);

    await AsyncStorage.setItem(SMART_REMINDER_SETTINGS_KEY, JSON.stringify(normalized));

    if (firebaseUid) {
      await this.persistRemote(firebaseUid, normalized);
    }

    return normalized;
  }

  private async persistRemote(userId: string, settings: SmartReminderSettings): Promise<void> {
    const prefs = await this.userService.getPreferences(userId);
    const notifications: NotificationSettings = {
      ...prefs.notifications,
      smartReminders: settings,
    };

    await this.userService.updateNotificationSettings(userId, notifications);
  }
}

export const smartReminderSettingsService = new SmartReminderSettingsService();
