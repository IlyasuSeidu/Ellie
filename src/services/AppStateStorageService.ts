import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';
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

  async getPaywallDeclinedAt(scope?: string | null): Promise<number | null> {
    const scopedKey = await this.getScopedAppStateKey(PAYWALL_DECLINED_AT_KEY, scope);
    const stored = await asyncStorageService.get<number>(scopedKey);
    if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) {
      return stored;
    }

    const anonymousKey = this.getAnonymousFallbackKey(PAYWALL_DECLINED_AT_KEY);
    if (scopedKey !== anonymousKey) {
      const anonymousStored = await asyncStorageService.get<number>(anonymousKey);
      if (
        typeof anonymousStored === 'number' &&
        Number.isFinite(anonymousStored) &&
        anonymousStored > 0
      ) {
        await asyncStorageService.set(scopedKey, anonymousStored);
        await asyncStorageService.remove(anonymousKey);
        return anonymousStored;
      }
    }

    return migrateRawNumberKey(LEGACY_PAYWALL_DECLINED_KEY, scopedKey);
  },

  async setPaywallDeclinedAt(timestamp: number, scope?: string | null): Promise<void> {
    await asyncStorageService.set(
      await this.getScopedAppStateKey(PAYWALL_DECLINED_AT_KEY, scope),
      timestamp
    );
    await AsyncStorage.removeItem(LEGACY_PAYWALL_DECLINED_KEY);
  },

  async clearPaywallDeclinedAt(scope?: string | null): Promise<void> {
    const scopedKey = await this.getScopedAppStateKey(PAYWALL_DECLINED_AT_KEY, scope);
    await asyncStorageService.remove(scopedKey);
    const anonymousKey = this.getAnonymousFallbackKey(PAYWALL_DECLINED_AT_KEY);
    if (scopedKey !== anonymousKey) {
      await asyncStorageService.remove(anonymousKey);
    }
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

  async getScopedAppStateKey(baseKey: string, scope?: string | null): Promise<string> {
    const explicitScope =
      typeof scope === 'string' && scope.trim().length > 0 ? scope.trim() : null;
    const resolvedScope =
      explicitScope ??
      (await subscriptionEntitlementCacheService.getActiveAnonymousScope()) ??
      'anonymous';
    return `${baseKey}:${resolvedScope}`;
  },

  getAnonymousFallbackKey(baseKey: string): string {
    return `${baseKey}:anonymous`;
  },
};
