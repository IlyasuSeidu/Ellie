describe('firebase native module fallback', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJestWorkerId = process.env.JEST_WORKER_ID;
  const originalEnvSnapshot = { ...process.env };

  function seedRequiredConfigEnv(): void {
    process.env.FIREBASE_API_KEY = 'test-api-key';
    process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
    process.env.FIREBASE_MESSAGING_SENDER_ID = '123456789';
    process.env.FIREBASE_APP_ID = '1:123456789:web:test';
    process.env.GOOGLE_WEB_CLIENT_ID = 'test-google-web-client-id';
  }

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JEST_WORKER_ID = originalJestWorkerId;
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnvSnapshot)) {
        delete process.env[key];
      }
    });
    Object.entries(originalEnvSnapshot).forEach(([key, value]) => {
      process.env[key] = value;
    });
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('falls back to the Firebase JS SDK when native RNFirebase modules are missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JEST_WORKER_ID;
    seedRequiredConfigEnv();

    const mockApp = { name: '[DEFAULT]', options: {} };
    const mockAuth = { currentUser: null };
    const mockFirestore = {};
    const mockStorage = {};
    const mockFunctions = {};

    const initializeApp = jest.fn(() => mockApp);
    const getApp = jest.fn(() => mockApp);
    const getApps = jest.fn(() => []);
    const initializeAuth = jest.fn(() => mockAuth);
    const getAuth = jest.fn(() => mockAuth);
    const getReactNativePersistence = jest.fn(() => 'mock-rn-persistence');
    const getFirestore = jest.fn(() => mockFirestore);
    const getStorage = jest.fn(() => mockStorage);
    const getFunctions = jest.fn(() => mockFunctions);

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
        select: (config: Record<string, unknown>) => config.ios ?? config.default,
      },
      NativeModules: {},
    }));

    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApp,
      getApps,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
      getAuth,
    }));
    jest.doMock('@firebase/auth', () => ({
      getReactNativePersistence,
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore,
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage,
    }));
    jest.doMock('firebase/functions', () => ({
      getFunctions,
    }));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('@/config/firebase');
    const instances = firebaseConfig.initializeFirebase();

    expect(instances.app).toBe(mockApp);
    expect(instances.auth).toBe(mockAuth);
    expect(instances.firestore).toBe(mockFirestore);
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-api-key',
        projectId: 'test-project',
      }),
      undefined
    );
    expect(getReactNativePersistence).toHaveBeenCalledTimes(1);
    expect(initializeAuth).toHaveBeenCalledWith(mockApp, {
      persistence: 'mock-rn-persistence',
    });
    expect(getFirestore).toHaveBeenCalledWith(mockApp);
    expect(getStorage).toHaveBeenCalledWith(mockApp);
    expect(getFunctions).toHaveBeenCalledWith(mockApp);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to the Firebase JS SDK')
    );
  });

  it('falls back to the Firebase JS SDK when only RNFBAppModule exists but auth/firestore modules are missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JEST_WORKER_ID;
    seedRequiredConfigEnv();

    const mockApp = { name: '[DEFAULT]', options: {} };
    const mockAuth = { currentUser: null };
    const mockFirestore = {};
    const mockStorage = {};
    const mockFunctions = {};

    const initializeApp = jest.fn(() => mockApp);
    const getApp = jest.fn(() => mockApp);
    const getApps = jest.fn(() => []);
    const initializeAuth = jest.fn(() => mockAuth);
    const getAuth = jest.fn(() => mockAuth);
    const getReactNativePersistence = jest.fn(() => 'mock-rn-persistence');
    const getFirestore = jest.fn(() => mockFirestore);
    const getStorage = jest.fn(() => mockStorage);
    const getFunctions = jest.fn(() => mockFunctions);

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
        select: (config: Record<string, unknown>) => config.ios ?? config.default,
      },
      NativeModules: {
        RNFBAppModule: {},
      },
    }));

    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApp,
      getApps,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
      getAuth,
    }));
    jest.doMock('@firebase/auth', () => ({
      getReactNativePersistence,
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore,
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage,
    }));
    jest.doMock('firebase/functions', () => ({
      getFunctions,
    }));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('@/config/firebase');
    const instances = firebaseConfig.initializeFirebase();

    expect(instances.app).toBe(mockApp);
    expect(instances.auth).toBe(mockAuth);
    expect(instances.firestore).toBe(mockFirestore);
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeAuth).toHaveBeenCalledWith(mockApp, {
      persistence: 'mock-rn-persistence',
    });
    expect(getFirestore).toHaveBeenCalledWith(mockApp);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to the Firebase JS SDK')
    );
  });

  it('falls back to the Firebase JS SDK when native auth throws a missing-module runtime error', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JEST_WORKER_ID;
    seedRequiredConfigEnv();

    const mockNativeApp = { name: '[DEFAULT]', options: {} };
    const mockJsApp = { name: '[DEFAULT]', options: { source: 'js' } };
    const mockJsAuth = { currentUser: null };
    const mockJsFirestore = {};
    const mockStorage = {};
    const mockFunctions = {};

    const initializeApp = jest.fn(() => mockJsApp);
    const getJsApp = jest.fn(() => mockJsApp);
    const getJsApps = jest.fn(() => []);
    const initializeAuth = jest.fn(() => mockJsAuth);
    const getJsAuth = jest.fn(() => mockJsAuth);
    const getReactNativePersistence = jest.fn(() => 'mock-rn-persistence');
    const getJsFirestore = jest.fn(() => mockJsFirestore);
    const getStorage = jest.fn(() => mockStorage);
    const getFunctions = jest.fn(() => mockFunctions);

    const nativeGetAuth = jest.fn(() => {
      throw new Error(
        `You attempted to use "firebase.app('[DEFAULT]').auth" but this module could not be found.\n\nEnsure you have installed and imported the '@react-native-firebase/auth' package.`
      );
    });

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
        select: (config: Record<string, unknown>) => config.ios ?? config.default,
      },
      NativeModules: {
        RNFBAppModule: {},
        RNFBAuthModule: {},
        RNFBFirestoreModule: {},
      },
    }));

    jest.doMock('firebase/app', () => ({
      initializeApp,
      getApp: getJsApp,
      getApps: getJsApps,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
      getAuth: getJsAuth,
    }));
    jest.doMock('@firebase/auth', () => ({
      getReactNativePersistence,
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: getJsFirestore,
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage,
    }));
    jest.doMock('firebase/functions', () => ({
      getFunctions,
    }));
    jest.doMock('@react-native-firebase/app', () => ({
      getApps: () => [mockNativeApp],
      getApp: () => mockNativeApp,
      initializeApp: () => mockNativeApp,
    }));
    jest.doMock('@react-native-firebase/auth/lib/modular', () => ({
      getAuth: nativeGetAuth,
    }));
    jest.doMock('@react-native-firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      getPersistentCacheIndexManager: jest.fn(() => null),
    }));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('@/config/firebase');
    const instances = firebaseConfig.initializeFirebase();

    expect(nativeGetAuth).toHaveBeenCalled();
    expect(instances.app).toBe(mockJsApp);
    expect(instances.auth).toBe(mockJsAuth);
    expect(instances.firestore).toBe(mockJsFirestore);
    expect(initializeApp).toHaveBeenCalled();
    expect(initializeAuth).toHaveBeenCalledWith(mockJsApp, {
      persistence: 'mock-rn-persistence',
    });
    expect(getJsFirestore).toHaveBeenCalledWith(mockJsApp);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not functional in this build; falling back to the Firebase JS SDK')
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      'Failed to initialize Firebase Auth:',
      expect.anything()
    );
  });
});
