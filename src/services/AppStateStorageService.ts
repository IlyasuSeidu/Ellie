import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const INSTALL_STARTED_AT_KEY = STORAGE_KEYS.appState.installStartedAt;
const PAYWALL_DECLINED_AT_KEY = STORAGE_KEYS.appState.paywallDeclinedAt;
const NOTIFICATION_SOFT_DECLINED_KEY = STORAGE_KEYS.appState.notificationSoftDeclined;

const LEGACY_INSTALL_TIME_KEY = STORAGE_KEYS.appState.legacyInstallStartedAt;
const LEGACY_PAYWALL_DECLINED_KEY = STORAGE_KEYS.appState.legacyPaywallDeclinedAt;
const LEGACY_NOTIFICATION_SOFT_DECLINED_KEY = STORAGE_KEYS.appState.legacyNotificationSoftDeclined;
const LEGACY_CHECKLIST_ASK_ELLIE_DONE_KEY = STORAGE_KEYS.appState.legacyAskEllieDone;

async function migrateRawNumberKey(legacyKey: string, newKey: string): Promise<number | null> {
  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (!legacyValue) {
    return null;
  }

  const numeric = Number(legacyValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    await AsyncStorage.removeItem(legacyKey);
    return null;
  }

  await asyncStorageService.set(newKey, numeric);
  await AsyncStorage.removeItem(legacyKey);
  return numeric;
}

async function migrateRawBooleanKey(legacyKey: string, newKey: string): Promise<boolean | null> {
  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue === null) {
    return null;
  }

  const parsed = legacyValue === 'true';
  await asyncStorageService.set(newKey, parsed);
  await AsyncStorage.removeItem(legacyKey);
  return parsed;
}

export const appStateStorageService = {
  async cleanupObsoleteKeys(): Promise<void> {
    await AsyncStorage.removeItem(LEGACY_CHECKLIST_ASK_ELLIE_DONE_KEY);
  },

  async ensureInstallStartedAt(): Promise<number> {
    const existing = await this.getInstallStartedAt();
    if (existing) {
      return existing;
    }

    const now = Date.now();
    await asyncStorageService.set(INSTALL_STARTED_AT_KEY, now);
    return now;
  },

  async getInstallStartedAt(): Promise<number | null> {
    const stored = await asyncStorageService.get<number>(INSTALL_STARTED_AT_KEY);
    if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
      return stored;
    }

    return migrateRawNumberKey(LEGACY_INSTALL_TIME_KEY, INSTALL_STARTED_AT_KEY);
  },

  async getPaywallDeclinedAt(): Promise<number | null> {
    const stored = await asyncStorageService.get<number>(PAYWALL_DECLINED_AT_KEY);
    if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
      return stored;
    }

    return migrateRawNumberKey(LEGACY_PAYWALL_DECLINED_KEY, PAYWALL_DECLINED_AT_KEY);
  },

  async setPaywallDeclinedAt(timestamp: number): Promise<void> {
    await asyncStorageService.set(PAYWALL_DECLINED_AT_KEY, timestamp);
    await AsyncStorage.removeItem(LEGACY_PAYWALL_DECLINED_KEY);
  },

  async clearPaywallDeclinedAt(): Promise<void> {
    await asyncStorageService.remove(PAYWALL_DECLINED_AT_KEY);
    await AsyncStorage.removeItem(LEGACY_PAYWALL_DECLINED_KEY);
  },

  async getNotificationSoftDeclined(): Promise<boolean> {
    const stored = await asyncStorageService.get<boolean>(NOTIFICATION_SOFT_DECLINED_KEY);
    if (typeof stored === 'boolean') {
      return stored;
    }

    return (
      (await migrateRawBooleanKey(
        LEGACY_NOTIFICATION_SOFT_DECLINED_KEY,
        NOTIFICATION_SOFT_DECLINED_KEY
      )) ?? false
    );
  },

  async setNotificationSoftDeclined(value: boolean): Promise<void> {
    await asyncStorageService.set(NOTIFICATION_SOFT_DECLINED_KEY, value);
    await AsyncStorage.removeItem(LEGACY_NOTIFICATION_SOFT_DECLINED_KEY);
  },
};
