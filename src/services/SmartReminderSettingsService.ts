import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationSettings } from '@/types';
import {
  DEFAULT_SMART_REMINDER_SETTINGS,
  SMART_REMINDER_LOCAL_USER_ID_KEY,
  SMART_REMINDER_SETTINGS_KEY,
  type SmartReminderSettings,
} from '@/types/reminders';
import { logger } from '@/utils/logger';
import { asyncStorageService } from './AsyncStorageService';
import { UserService, userService as sharedUserService } from './UserService';

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
    const stored = await asyncStorageService.get<SmartReminderSettings>(
      SMART_REMINDER_SETTINGS_KEY
    );
    if (stored) {
      return {
        hasStoredValue: true,
        settings: mergeSettings(stored),
      };
    }

    const raw = await AsyncStorage.getItem(SMART_REMINDER_SETTINGS_KEY);
    if (!raw) {
      return {
        hasStoredValue: false,
        settings: DEFAULT_SMART_REMINDER_SETTINGS,
      };
    }

    const migrated = mergeSettings(JSON.parse(raw) as Partial<SmartReminderSettings>);
    await asyncStorageService.set(SMART_REMINDER_SETTINGS_KEY, migrated);
    await AsyncStorage.removeItem(SMART_REMINDER_SETTINGS_KEY);

    return {
      hasStoredValue: true,
      settings: migrated,
    };
  } catch (error) {
    logger.error('SmartReminderSettingsService: failed to read local settings', error as Error);
    return {
      hasStoredValue: false,
      settings: DEFAULT_SMART_REMINDER_SETTINGS,
    };
  }
}

async function persistLocalSettings(settings: SmartReminderSettings): Promise<void> {
  await asyncStorageService.set(SMART_REMINDER_SETTINGS_KEY, settings);
}

export async function resolveReminderUserId(firebaseUid?: string | null): Promise<string> {
  if (firebaseUid) {
    return firebaseUid;
  }

  const generated = `reminder-user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const existing = await asyncStorageService.get<string>(SMART_REMINDER_LOCAL_USER_ID_KEY);
    if (existing) {
      return existing;
    }

    const legacyExisting = await AsyncStorage.getItem(SMART_REMINDER_LOCAL_USER_ID_KEY);
    if (legacyExisting) {
      await asyncStorageService.set(SMART_REMINDER_LOCAL_USER_ID_KEY, legacyExisting);
      await AsyncStorage.removeItem(SMART_REMINDER_LOCAL_USER_ID_KEY);
      return legacyExisting;
    }

    await asyncStorageService.set(SMART_REMINDER_LOCAL_USER_ID_KEY, generated);
  } catch (error) {
    logger.error(
      'SmartReminderSettingsService: failed to resolve local reminder user id',
      error as Error
    );
  }

  return generated;
}

export class SmartReminderSettingsService {
  constructor(private readonly userService: UserService = sharedUserService) {}

  async load(firebaseUid?: string | null): Promise<SmartReminderSettings> {
    const localRecord = await readLocalSettingsRecord();
    if (!firebaseUid) {
      return localRecord.settings;
    }

    try {
      const remoteSettings = await this.userService.getStoredSmartReminderSettings(firebaseUid);

      if (remoteSettings) {
        const normalized = mergeSettings(remoteSettings);
        await asyncStorageService.set(SMART_REMINDER_SETTINGS_KEY, normalized);
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

    if (firebaseUid) {
      await this.persistRemote(firebaseUid, normalized);
    }

    try {
      await persistLocalSettings(normalized);
    } catch (error) {
      if (firebaseUid) {
        logger.warn(
          'SmartReminderSettingsService: remote settings saved but local cache update failed',
          {
            userId: firebaseUid,
            error: error instanceof Error ? error.message : String(error),
          }
        );
        return normalized;
      }

      throw error;
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
