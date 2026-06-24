import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const INLINE_EXPO_PUBLIC_E2E_TEST_MODE = process.env.EXPO_PUBLIC_E2E_TEST_MODE;
const NATIVE_E2E_TEST_MODE = (
  NativeModules.RyvroE2EConfig as { isE2ETestMode?: boolean } | undefined
)?.isE2ETestMode;

function getExpoExtraConfig(): Record<string, unknown> {
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
}

function getProcessE2EFlag(): unknown {
  if (typeof process === 'undefined') {
    return undefined;
  }

  return INLINE_EXPO_PUBLIC_E2E_TEST_MODE ?? process.env.E2E_TEST_MODE;
}

function isEnabledFlag(value: unknown): boolean {
  return value === true || value === '1' || value === 'true';
}

export const IS_E2E_TEST_MODE = isEnabledFlag(
  NATIVE_E2E_TEST_MODE ??
    getExpoExtraConfig().E2E_TEST_MODE ??
    getExpoExtraConfig().EXPO_PUBLIC_E2E_TEST_MODE ??
    getProcessE2EFlag()
);
