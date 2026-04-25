/**
 * Firebase Configuration and Initialization
 *
 * Native iOS/Android builds use React Native Firebase for Auth + Firestore so
 * Firestore gets the native SDK's built-in offline persistence and write queue.
 *
 * Web and test environments continue to use the Firebase JS SDK.
 */

/* eslint-disable no-console */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuthPackage from '@firebase/auth';
import { getStorage as getWebStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions as getWebFunctions, type Functions } from 'firebase/functions';
import { firebaseConfig, isTest } from './env';
import {
  initializeApp,
  getApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from '@/services/firebase/appSdk';
import { getAuth, initializeAuth, type Auth, type Dependencies } from '@/services/firebase/authSdk';
import {
  getFirestore,
  getPersistentCacheIndexManager,
  type Firestore,
} from '@/services/firebase/firestoreSdk';
import {
  markNativeFirebaseUnavailable,
  shouldUseNativeFirebaseFullStack,
} from '@/services/firebase/nativeAvailability';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

function canUseNativeFirebase(): boolean {
  return (
    Platform.OS !== 'web' &&
    !isTest &&
    process.env.JEST_WORKER_ID === undefined &&
    shouldUseNativeFirebaseFullStack()
  );
}

function resetFirebaseInstances(): void {
  app = undefined;
  auth = undefined;
  firestore = undefined;
  storage = undefined;
  functions = undefined;
}

function isMissingNativeFirebaseModuleError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message ?? '';
  return (
    message.includes('RNFBAppModule not found') ||
    message.includes('RNFBAuthModule not found') ||
    message.includes('RNFBFirestoreModule not found') ||
    (message.includes("firebase.app('[DEFAULT]')") &&
      message.includes('module could not be found')) ||
    message.includes('@react-native-firebase/auth') ||
    message.includes('@react-native-firebase/firestore')
  );
}

function buildFirebaseOptions(): FirebaseOptions {
  return {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    measurementId: firebaseConfig.measurementId,
  };
}

function initializeFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  try {
    if (canUseNativeFirebase()) {
      app = getApp();
      console.log('Firebase app initialized successfully');
      return app;
    }

    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(buildFirebaseOptions());
    }

    if (Platform.OS !== 'web' && !isTest) {
      console.warn(
        'React Native Firebase native modules are unavailable in this build; falling back to the Firebase JS SDK. Rebuild the native app to enable native Firestore persistence.'
      );
    }
    console.log('Firebase app initialized successfully');
    return app;
  } catch (error) {
    if (isMissingNativeFirebaseModuleError(error)) {
      throw error;
    }
    console.error('Failed to initialize Firebase app:', error);
    throw new Error('Firebase initialization failed');
  }
}

function initializeFirebaseAuth(firebaseApp: FirebaseApp): Auth {
  if (auth) {
    return auth;
  }

  try {
    if (canUseNativeFirebase() || Platform.OS === 'web') {
      auth = getAuth(firebaseApp);
      console.log(
        canUseNativeFirebase()
          ? 'Firebase Auth initialized successfully (native persistence)'
          : 'Firebase Auth initialized successfully'
      );
      return auth;
    }

    const reactNativeAuth = FirebaseAuthPackage as unknown as {
      getReactNativePersistence?: (
        storage: typeof AsyncStorage
      ) => NonNullable<Dependencies['persistence']>;
    };
    const persistence = reactNativeAuth.getReactNativePersistence?.(AsyncStorage);
    if (!persistence) {
      throw new Error('React Native auth persistence is unavailable');
    }

    auth = initializeAuth(firebaseApp, { persistence });
    console.log('Firebase Auth initialized successfully (AsyncStorage persistence)');
    return auth;
  } catch (error) {
    if (isMissingNativeFirebaseModuleError(error)) {
      throw error;
    }
    console.error('Failed to initialize Firebase Auth:', error);
    throw new Error('Firebase Auth initialization failed');
  }
}

function initializeFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  if (firestore) {
    return firestore;
  }

  try {
    firestore = getFirestore(firebaseApp);

    if (canUseNativeFirebase()) {
      const indexManager = getPersistentCacheIndexManager?.(firestore) as
        | { enableIndexAutoCreation?: () => Promise<void> }
        | null
        | undefined;
      if (indexManager?.enableIndexAutoCreation) {
        void indexManager.enableIndexAutoCreation().catch((error: unknown) => {
          console.warn('Failed to enable Firestore offline index auto-creation:', error);
        });
      }
    }

    console.log(
      canUseNativeFirebase()
        ? 'Firestore initialized successfully (native persistent cache)'
        : 'Firestore initialized successfully'
    );
    return firestore;
  } catch (error) {
    if (isMissingNativeFirebaseModuleError(error)) {
      throw error;
    }
    console.error('Failed to initialize Firestore:', error);
    throw new Error('Firestore initialization failed');
  }
}

function initializeFirebaseStorage(firebaseApp: FirebaseApp): FirebaseStorage {
  if (storage) {
    return storage;
  }

  try {
    if (canUseNativeFirebase()) {
      storage = { app: firebaseApp } as FirebaseStorage;
      console.log('Firebase Storage initialized successfully (stub)');
      return storage;
    }

    storage = getWebStorage(firebaseApp);
    console.log('Firebase Storage initialized successfully');
    return storage;
  } catch (error) {
    console.error('Failed to initialize Firebase Storage:', error);
    throw new Error('Firebase Storage initialization failed');
  }
}

function initializeCloudFunctions(firebaseApp: FirebaseApp): Functions {
  if (functions) {
    return functions;
  }

  try {
    if (canUseNativeFirebase()) {
      functions = { app: firebaseApp } as Functions;
      console.log('Cloud Functions initialized successfully (stub)');
      return functions;
    }

    functions = getWebFunctions(firebaseApp);
    console.log('Cloud Functions initialized successfully');
    return functions;
  } catch (error) {
    console.error('Failed to initialize Cloud Functions:', error);
    throw new Error('Cloud Functions initialization failed');
  }
}

export function initializeFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
} {
  if (isTest) {
    console.log('Skipping Firebase initialization in test environment');
    return {
      app: {} as FirebaseApp,
      auth: {} as Auth,
      firestore: {} as Firestore,
      storage: {} as FirebaseStorage,
      functions: {} as Functions,
    };
  }

  try {
    const firebaseApp = initializeFirebaseApp();
    const firebaseAuth = initializeFirebaseAuth(firebaseApp);
    const firebaseFirestore = initializeFirebaseFirestore(firebaseApp);
    const firebaseStorage = initializeFirebaseStorage(firebaseApp);
    const cloudFunctions = initializeCloudFunctions(firebaseApp);

    return {
      app: firebaseApp,
      auth: firebaseAuth,
      firestore: firebaseFirestore,
      storage: firebaseStorage,
      functions: cloudFunctions,
    };
  } catch (error) {
    if (canUseNativeFirebase() && isMissingNativeFirebaseModuleError(error)) {
      console.warn(
        'React Native Firebase native modules were detected but are not functional in this build; falling back to the Firebase JS SDK for this runtime. Rebuild and reinstall the native app to enable native Firestore persistence.'
      );
      markNativeFirebaseUnavailable();
      resetFirebaseInstances();
      return initializeFirebase();
    }
    console.error('Failed to initialize Firebase services:', error);
    throw error;
  }
}

export function getFirebaseInstances(): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
} {
  if (!app) {
    return initializeFirebase();
  }

  return {
    app: app as FirebaseApp,
    auth: auth as Auth,
    firestore: firestore as Firestore,
    storage: storage as FirebaseStorage,
    functions: functions as Functions,
  };
}

if (!isTest) {
  try {
    initializeFirebase();
  } catch (error) {
    if (!isMissingNativeFirebaseModuleError(error)) {
      console.error('Failed to eagerly initialize Firebase:', error);
    }
  }
}

export { app, auth, firestore, storage, functions };

export const getFirebaseApp = (): FirebaseApp => {
  if (!app && !isTest) {
    throw new Error('Firebase app not initialized');
  }
  return app as FirebaseApp;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth && !isTest) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth as Auth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestore && !isTest) {
    throw new Error('Firestore not initialized');
  }
  return firestore as Firestore;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage && !isTest) {
    throw new Error('Firebase Storage not initialized');
  }
  return storage as FirebaseStorage;
};

export const getCloudFunctions = (): Functions => {
  if (!functions && !isTest) {
    throw new Error('Cloud Functions not initialized');
  }
  return functions as Functions;
};

export const isFirebaseInitialized = (): boolean => !!app && !!auth && !!firestore;

export default {
  app,
  auth,
  firestore,
  storage,
  functions,
  initializeFirebase,
  getFirebaseInstances,
  isInitialized: isFirebaseInitialized,
};
