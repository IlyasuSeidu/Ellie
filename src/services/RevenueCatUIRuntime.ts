type RevenueCatUIModule = typeof import('react-native-purchases-ui');

interface RevenueCatUIRuntime {
  RevenueCatUI: RevenueCatUIModule['default'];
  PAYWALL_RESULT: RevenueCatUIModule['PAYWALL_RESULT'];
}

type RevenueCatUIUnavailableReason = 'missing_native_module';

let cachedRuntime: RevenueCatUIRuntime | null | undefined;

const getNativeMissingHint = (error: unknown): string | null => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('revenuecatui') ||
    normalized.includes('native module') ||
    normalized.includes('nativeeventemitter') ||
    normalized.includes('not found') ||
    normalized.includes('not linked')
  ) {
    return message;
  }

  return null;
};

export const getRevenueCatUIRuntime = (): RevenueCatUIRuntime | null => {
  if (cachedRuntime !== undefined) {
    return cachedRuntime;
  }

  try {
    // Runtime-safe require so JS still boots when the native UI module is missing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const revenueCatUIModule = require('react-native-purchases-ui') as RevenueCatUIModule;
    if (!revenueCatUIModule?.default || !revenueCatUIModule?.PAYWALL_RESULT) {
      cachedRuntime = null;
      return cachedRuntime;
    }

    cachedRuntime = {
      RevenueCatUI: revenueCatUIModule.default,
      PAYWALL_RESULT: revenueCatUIModule.PAYWALL_RESULT,
    };
    return cachedRuntime;
  } catch (error) {
    cachedRuntime = null;

    const nativeMissingHint = getNativeMissingHint(error);
    if (__DEV__ && nativeMissingHint) {
      console.warn(
        `[RevenueCatUI] Native module unavailable (${nativeMissingHint}). Rebuild and reinstall a development/production client that includes react-native-purchases-ui.`
      );
    }

    return cachedRuntime;
  }
};

export const getRevenueCatUIAvailability = (): {
  reason: RevenueCatUIUnavailableReason | null;
  runtimeAvailable: boolean;
} => {
  const runtime = getRevenueCatUIRuntime();

  if (!runtime) {
    return {
      reason: 'missing_native_module',
      runtimeAvailable: false,
    };
  }

  return {
    reason: null,
    runtimeAvailable: true,
  };
};

export const isRevenueCatUIAvailable = (): boolean => getRevenueCatUIRuntime() !== null;
