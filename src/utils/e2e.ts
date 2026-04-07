import Constants from 'expo-constants';

export const IS_E2E_TEST_MODE =
  (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.E2E_TEST_MODE === '1';
