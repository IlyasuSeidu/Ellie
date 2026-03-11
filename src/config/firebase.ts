/**
 * Firebase Configuration and Initialization
 *
 * Initializes Firebase services and exports instances for use throughout the app.
 * Handles offline/online state and provides proper error handling.
 */

/* eslint-disable no-console */

import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { initializeAuth, Auth, type Dependencies } from 'firebase/auth';
import * as FirebaseAuthPackage from '@firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { firebaseConfig, isTest } from './env';

/**
 * Firebase instances
 */
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

/**
 * Initialize Firebase App
 *
 * @returns Initialized Firebase app instance
 */
function initializeFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  try {
    const config: FirebaseOptions = {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      measurementId: firebaseConfig.measurementId,
    };

    app = initializeApp(config);

    console.log('Firebase app initialized successfully');
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase app:', error);
    throw new Error('Firebase initialization failed');
  }
}

/**
 * Initialize Firebase Auth
 *
 * @param firebaseApp - Firebase app instance
 * @returns Initialized Auth instance
 */
function initializeFirebaseAuth(firebaseApp: FirebaseApp): Auth {
  if (auth) {
    return auth;
  }

  try {
    // firebase/auth typings in this SDK don't expose getReactNativePersistence,
    // but the RN runtime export is available via @firebase/auth.
    const reactNativeAuth = FirebaseAuthPackage as unknown as {
      getReactNativePersistence?: (
        storage: typeof AsyncStorage
      ) => NonNullable<Dependencies['persistence']>;
    };
    const persistence = reactNativeAuth.getReactNativePersistence?.(AsyncStorage);
    if (!persistence) {
      throw new Error('React Native auth persistence is unavailable');
    }

    // initializeAuth + ReactNativePersistence ensures sessions survive app restarts.
    auth = initializeAuth(firebaseApp, {
      persistence,
    });

    console.log('Firebase Auth initialized successfully (AsyncStorage persistence)');
    return auth;
  } catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    throw new Error('Firebase Auth initialization failed');
  }
}

/**
 * Initialize Firestore
 *
 * @param firebaseApp - Firebase app instance
 * @returns Initialized Firestore instance
 */
function initializeFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  if (firestore) {
    return firestore;
  }

  try {
    // Get Firestore instance for the app
    firestore = getFirestore(firebaseApp);

    console.log('Firestore initialized successfully');
    return firestore;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw new Error('Firestore initialization failed');
  }
}

/**
 * Initialize Firebase Storage
 *
 * @param firebaseApp - Firebase app instance
 * @returns Initialized Storage instance
 */
function initializeFirebaseStorage(firebaseApp: FirebaseApp): FirebaseStorage {
  if (storage) {
    return storage;
  }

  try {
    storage = getStorage(firebaseApp);
    console.log('Firebase Storage initialized successfully');
    return storage;
  } catch (error) {
    console.error('Failed to initialize Firebase Storage:', error);
    throw new Error('Firebase Storage initialization failed');
  }
}

/**
 * Initialize Cloud Functions
 *
 * @param firebaseApp - Firebase app instance
 * @returns Initialized Functions instance
 */
function initializeCloudFunctions(firebaseApp: FirebaseApp): Functions {
  if (functions) {
    return functions;
  }

  try {
    functions = getFunctions(firebaseApp);
    console.log('Cloud Functions initialized successfully');
    return functions;
  } catch (error) {
    console.error('Failed to initialize Cloud Functions:', error);
    throw new Error('Cloud Functions initialization failed');
  }
}

/**
 * Initialize all Firebase services
 *
 * @returns Object containing all initialized Firebase services
 */
export function initializeFirebase(): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
} {
  // Skip initialization in test environment
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
    console.error('Failed to initialize Firebase services:', error);
    throw error;
  }
}

/**
 * Get Firebase instances (lazy initialization)
 */
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

/**
 * Initialize Firebase on module load (eager initialization)
 */
if (!isTest) {
  try {
    initializeFirebase();
  } catch (error) {
    console.error('Failed to eagerly initialize Firebase:', error);
  }
}

/**
 * Export Firebase instances for direct import
 */
export { app, auth, firestore, storage, functions };

/**
 * Export getters for safe access
 */
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

/**
 * Check if Firebase is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!firestore;
};

/**
 * Default export for convenience
 */
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
