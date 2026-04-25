/* eslint-disable @typescript-eslint/no-var-requires, require-await */

import type * as FirebaseAuthWeb from 'firebase/auth';
import { shouldUseFirebaseJsSdk, shouldUseNativeFirebaseFullStack } from './nativeAvailability';

function loadFirebaseJsAuthSdk(): typeof FirebaseAuthWeb {
  const mockUser = {
    uid: 'mock-user-id',
    emailVerified: false,
    reload: async () => undefined,
  } as unknown as FirebaseAuthWeb.User;
  const mockAuth = { currentUser: null } as FirebaseAuthWeb.Auth;
  const mockCredential = {} as FirebaseAuthWeb.UserCredential;
  const defaults = {
    getAuth: () => mockAuth,
    initializeAuth: () => mockAuth,
    createUserWithEmailAndPassword: async () => ({
      ...mockCredential,
      user: mockUser,
    }),
    signInWithEmailAndPassword: async () => ({
      ...mockCredential,
      user: mockUser,
    }),
    signOut: async () => undefined,
    sendPasswordResetEmail: async () => undefined,
    sendEmailVerification: async () => undefined,
    updateEmail: async () => undefined,
    updatePassword: async () => undefined,
    deleteUser: async () => undefined,
    reauthenticateWithCredential: async () => ({
      ...mockCredential,
      user: mockUser,
    }),
    onAuthStateChanged: (
      _auth: FirebaseAuthWeb.Auth,
      callback: (user: FirebaseAuthWeb.User | null) => void
    ) => {
      callback(null);
      return () => undefined;
    },
    signInWithCredential: async () => ({
      ...mockCredential,
      user: mockUser,
    }),
    GoogleAuthProvider: {
      credential: () => ({}),
    },
    OAuthProvider: class {
      credential() {
        return {};
      }
    },
    EmailAuthProvider: {
      credential: () => ({}),
    },
  } as unknown as typeof FirebaseAuthWeb;

  if (process.env.JEST_WORKER_ID !== undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return {
        ...defaults,
        ...(require('firebase/auth') as typeof FirebaseAuthWeb),
      };
    } catch {
      return defaults;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('firebase/auth') as typeof FirebaseAuthWeb;
}

function loadNativeFirebaseAuthSdk(): typeof FirebaseAuthWeb {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-firebase/auth/lib/modular') as typeof FirebaseAuthWeb;
  } catch {
    return loadFirebaseJsAuthSdk();
  }
}

export type Auth = FirebaseAuthWeb.Auth;
export type User = FirebaseAuthWeb.User;
export type UserCredential = FirebaseAuthWeb.UserCredential;
export type Dependencies = FirebaseAuthWeb.Dependencies;
export type ActionCodeSettings = FirebaseAuthWeb.ActionCodeSettings;

function resolveSdk(): typeof FirebaseAuthWeb {
  return shouldUseFirebaseJsSdk() || !shouldUseNativeFirebaseFullStack()
    ? loadFirebaseJsAuthSdk()
    : loadNativeFirebaseAuthSdk();
}

export function nativeFirebaseAuthAvailable(): boolean {
  return shouldUseNativeFirebaseFullStack();
}

export function getAuth(app?: unknown): Auth {
  const sdk = resolveSdk() as {
    getAuth: (appArg?: unknown) => Auth;
  };
  return sdk.getAuth(app);
}

export function initializeAuth(
  app: unknown,
  deps?: { persistence?: NonNullable<Dependencies['persistence']> }
): Auth {
  const sdk = resolveSdk() as {
    initializeAuth: (
      appArg: unknown,
      depsArg?: { persistence?: NonNullable<Dependencies['persistence']> }
    ) => Auth;
  };
  return sdk.initializeAuth(app, deps);
}

export function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const sdk = resolveSdk() as {
    signInWithEmailAndPassword: (
      authArg: Auth,
      emailArg: string,
      passwordArg: string
    ) => Promise<UserCredential>;
  };
  return sdk.signInWithEmailAndPassword(auth, email, password);
}

export function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const sdk = resolveSdk() as {
    createUserWithEmailAndPassword: (
      authArg: Auth,
      emailArg: string,
      passwordArg: string
    ) => Promise<UserCredential>;
  };
  return sdk.createUserWithEmailAndPassword(auth, email, password);
}

export function signOut(auth: Auth): Promise<void> {
  const sdk = resolveSdk() as {
    signOut: (authArg: Auth) => Promise<void>;
  };
  return sdk.signOut(auth);
}

export function sendPasswordResetEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const sdk = resolveSdk() as {
    sendPasswordResetEmail: (
      authArg: Auth,
      emailArg: string,
      settingsArg?: ActionCodeSettings
    ) => Promise<void>;
  };
  return sdk.sendPasswordResetEmail(auth, email, actionCodeSettings);
}

export function sendEmailVerification(
  user: User,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const sdk = resolveSdk() as {
    sendEmailVerification: (userArg: User, settingsArg?: ActionCodeSettings) => Promise<void>;
  };
  return sdk.sendEmailVerification(user, actionCodeSettings);
}

export function updateEmail(user: User, newEmail: string): Promise<void> {
  const sdk = resolveSdk() as {
    updateEmail: (userArg: User, emailArg: string) => Promise<void>;
  };
  return sdk.updateEmail(user, newEmail);
}

export function updatePassword(user: User, newPassword: string): Promise<void> {
  const sdk = resolveSdk() as {
    updatePassword: (userArg: User, passwordArg: string) => Promise<void>;
  };
  return sdk.updatePassword(user, newPassword);
}

export function deleteUser(user: User): Promise<void> {
  const sdk = resolveSdk() as {
    deleteUser: (userArg: User) => Promise<void>;
  };
  return sdk.deleteUser(user);
}

export function reauthenticateWithCredential(
  user: User,
  credential: unknown
): Promise<UserCredential> {
  const sdk = resolveSdk() as {
    reauthenticateWithCredential: (
      userArg: User,
      credentialArg: unknown
    ) => Promise<UserCredential>;
  };
  return sdk.reauthenticateWithCredential(user, credential);
}

export function onAuthStateChanged(
  auth: Auth,
  callback: (user: User | null) => void
): FirebaseAuthWeb.Unsubscribe {
  const sdk = resolveSdk() as {
    onAuthStateChanged: (
      authArg: Auth,
      callbackArg: (user: User | null) => void
    ) => FirebaseAuthWeb.Unsubscribe;
  };
  return sdk.onAuthStateChanged(auth, callback);
}

export function signInWithCredential(auth: Auth, credential: unknown): Promise<UserCredential> {
  const sdk = resolveSdk() as {
    signInWithCredential: (authArg: Auth, credentialArg: unknown) => Promise<UserCredential>;
  };
  return sdk.signInWithCredential(auth, credential);
}

export const GoogleAuthProvider = loadFirebaseJsAuthSdk().GoogleAuthProvider;
export const OAuthProvider = loadFirebaseJsAuthSdk().OAuthProvider;
export const EmailAuthProvider = loadFirebaseJsAuthSdk().EmailAuthProvider;
