import type { CustomerInfo } from 'react-native-purchases';

type RevenueCatModule = typeof import('react-native-purchases');

interface RevenueCatRuntime {
  Purchases: RevenueCatModule['default'];
  LOG_LEVEL: RevenueCatModule['LOG_LEVEL'];
}

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

export type RevenueCatCustomerInfo = CustomerInfo;
