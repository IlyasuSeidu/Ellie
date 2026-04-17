import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { CustomerInfo } from 'react-native-purchases';

type RevenueCatModule = typeof import('react-native-purchases');

interface RevenueCatRuntime {
  Purchases: RevenueCatModule['default'];
  LOG_LEVEL: RevenueCatModule['LOG_LEVEL'];
}

type RevenueCatUnavailableReason = 'missing_native_module' | 'missing_api_key';

let cachedRuntime: RevenueCatRuntime | null | undefined;

const getNativeMissingHint = (error: unknown): string | null => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('rnpurchases') ||
    normalized.includes('native module') ||
    normalized.includes('nativeeventemitter') ||
    normalized.includes('not found')
  ) {
    return message;
  }

  return null;
};

const getExpoExtraConfig = (): Record<string, unknown> => {
  const constantsAny = Constants as unknown as {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: {
      extra?: {
        expoClient?: {
          extra?: Record<string, unknown>;
        };
      };
    };
  };
  const expoExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const manifest2ExpoClientExtra = (constantsAny.manifest2?.extra?.expoClient?.extra ??
    {}) as Record<string, unknown>;
  const manifestExtra = (constantsAny.manifest?.extra ?? {}) as Record<string, unknown>;

  return {
    ...manifestExtra,
    ...manifest2ExpoClientExtra,
    ...expoExtra,
  };
};

const firstNonEmptyString = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return '';
};

const isPlaceholderRevenueCatKey = (candidate: string): boolean => {
  const normalized = candidate.trim();

  if (normalized.length === 0) {
    return true;
  }

  if (/^(appl|goog|test|amaz|stripe)_[xX]+$/.test(normalized)) {
    return true;
  }

  if (normalized.includes('<public_') || normalized.includes('xxxxxxxx')) {
    return true;
  }

  return false;
};

const getUsableRevenueCatKey = (...candidates: unknown[]): string => {
  const key = firstNonEmptyString(...candidates);
  if (!key || isPlaceholderRevenueCatKey(key)) {
    return '';
  }

  return key;
};

export const getRevenueCatRuntime = (): RevenueCatRuntime | null => {
  if (cachedRuntime !== undefined) {
    return cachedRuntime;
  }

  try {
    // Use a runtime require so the app does not crash when the native module is unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const revenueCatModule = require('react-native-purchases') as RevenueCatModule;
    if (!revenueCatModule?.default) {
      cachedRuntime = null;
      return cachedRuntime;
    }

    cachedRuntime = {
      Purchases: revenueCatModule.default,
      LOG_LEVEL: revenueCatModule.LOG_LEVEL,
    };
    return cachedRuntime;
  } catch (error) {
    cachedRuntime = null;

    const nativeMissingHint = getNativeMissingHint(error);
    if (__DEV__ && nativeMissingHint) {
      // Keep development guidance explicit while preventing runtime crashes.
      console.warn(
        `[RevenueCat] Native module unavailable (${nativeMissingHint}). Rebuild and reinstall a development/production client that includes react-native-purchases.`
      );
    }

    return cachedRuntime;
  }
};

export const isRevenueCatAvailable = (): boolean => getRevenueCatRuntime() !== null;

export const getRevenueCatApiKey = (): string => {
  const extras = getExpoExtraConfig();

  if (Platform.OS === 'ios') {
    return getUsableRevenueCatKey(
      extras.REVENUECAT_IOS_KEY,
      extras.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      extras.REVENUECAT_API_KEY,
      extras.EXPO_PUBLIC_REVENUECAT_API_KEY,
      process.env.REVENUECAT_IOS_KEY,
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      process.env.REVENUECAT_API_KEY,
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
    );
  }

  return getUsableRevenueCatKey(
    extras.REVENUECAT_ANDROID_KEY,
    extras.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    extras.REVENUECAT_API_KEY,
    extras.EXPO_PUBLIC_REVENUECAT_API_KEY,
    process.env.REVENUECAT_ANDROID_KEY,
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    process.env.REVENUECAT_API_KEY,
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
  );
};

export const getRevenueCatAvailability = (): {
  reason: RevenueCatUnavailableReason | null;
  runtimeAvailable: boolean;
  apiKeyAvailable: boolean;
} => {
  const runtime = getRevenueCatRuntime();
  const apiKey = getRevenueCatApiKey();

  if (!runtime) {
    return {
      reason: 'missing_native_module',
      runtimeAvailable: false,
      apiKeyAvailable: apiKey.length > 0,
    };
  }

  if (!apiKey) {
    return {
      reason: 'missing_api_key',
      runtimeAvailable: true,
      apiKeyAvailable: false,
    };
  }

  return {
    reason: null,
    runtimeAvailable: true,
    apiKeyAvailable: true,
  };
};

export const isRevenueCatConfigured = (): boolean => getRevenueCatAvailability().reason === null;

export type RevenueCatCustomerInfo = CustomerInfo;
