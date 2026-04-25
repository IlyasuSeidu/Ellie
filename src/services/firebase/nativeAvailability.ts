import { NativeModules, Platform } from 'react-native';

const baseUseFirebaseJsSdk = Platform.OS === 'web' || process.env.JEST_WORKER_ID !== undefined;
let forceFirebaseJsSdk = false;

const nativeModules = NativeModules as Record<string, unknown> | undefined;

export const nativeFirebaseAppModuleAvailable =
  !baseUseFirebaseJsSdk && Boolean(nativeModules?.RNFBAppModule);

export const nativeFirebaseAuthModuleAvailable =
  !baseUseFirebaseJsSdk && Boolean(nativeModules?.RNFBAuthModule);

export const nativeFirebaseFirestoreModuleAvailable =
  !baseUseFirebaseJsSdk && Boolean(nativeModules?.RNFBFirestoreModule);

export function shouldUseNativeFirebaseFullStack(): boolean {
  return (
    !baseUseFirebaseJsSdk &&
    !forceFirebaseJsSdk &&
    nativeFirebaseAppModuleAvailable &&
    nativeFirebaseAuthModuleAvailable &&
    nativeFirebaseFirestoreModuleAvailable
  );
}

export function shouldUseFirebaseJsSdk(): boolean {
  return baseUseFirebaseJsSdk || !shouldUseNativeFirebaseFullStack();
}

export function markNativeFirebaseUnavailable(): void {
  forceFirebaseJsSdk = true;
}

export function resetNativeFirebaseAvailabilityForTests(): void {
  forceFirebaseJsSdk = false;
}
