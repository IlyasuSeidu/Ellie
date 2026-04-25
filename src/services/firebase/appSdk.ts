/* eslint-disable @typescript-eslint/no-var-requires */

import type * as FirebaseAppWeb from 'firebase/app';
import { shouldUseFirebaseJsSdk, shouldUseNativeFirebaseFullStack } from './nativeAvailability';

function loadFirebaseJsAppSdk(): typeof FirebaseAppWeb {
  const defaultApp = {
    name: '[DEFAULT]',
    options: {},
  } as FirebaseAppWeb.FirebaseApp;
  const defaults = {
    initializeApp: () => defaultApp,
    getApp: () => defaultApp,
    getApps: () => [defaultApp],
  } as typeof FirebaseAppWeb;

  if (process.env.JEST_WORKER_ID !== undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return {
        ...defaults,
        ...(require('firebase/app') as typeof FirebaseAppWeb),
      };
    } catch {
      return defaults;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('firebase/app') as typeof FirebaseAppWeb;
}

function loadNativeFirebaseAppSdk(): typeof FirebaseAppWeb {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-firebase/app') as typeof FirebaseAppWeb;
  } catch {
    return loadFirebaseJsAppSdk();
  }
}

export type FirebaseApp = FirebaseAppWeb.FirebaseApp;
export type FirebaseOptions = FirebaseAppWeb.FirebaseOptions;

function resolveSdk(): typeof FirebaseAppWeb {
  return shouldUseFirebaseJsSdk() || !shouldUseNativeFirebaseFullStack()
    ? loadFirebaseJsAppSdk()
    : loadNativeFirebaseAppSdk();
}

export function nativeFirebaseAppAvailable(): boolean {
  return shouldUseNativeFirebaseFullStack();
}

export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp {
  const sdk = resolveSdk() as {
    initializeApp: (optionsArg: FirebaseOptions, nameArg?: string) => FirebaseApp;
  };
  return sdk.initializeApp(options, name);
}

export function getApp(name?: string): FirebaseApp {
  const sdk = resolveSdk();
  const getAppImpl =
    sdk.getApp ??
    (() => {
      throw new Error('Firebase app is not initialized');
    });
  return getAppImpl(name);
}

export function getApps(): FirebaseApp[] {
  const sdk = resolveSdk();
  const getAppsImpl = sdk.getApps ?? (() => []);
  return getAppsImpl();
}
