describe('firebase auth persistence (react native)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
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
  });

  it('initializes auth with React Native AsyncStorage persistence only once', () => {
    process.env.NODE_ENV = 'development';
    seedRequiredConfigEnv();

    const initializeApp = jest.fn(() => ({ name: '[DEFAULT]' }));
    const initializeAuth = jest.fn(() => ({ currentUser: null }));
    const getReactNativePersistence = jest.fn(() => 'mock-rn-persistence');
    const getFirestore = jest.fn(() => ({}));
    const getStorage = jest.fn(() => ({}));
    const getFunctions = jest.fn(() => ({}));

    jest.doMock('firebase/app', () => ({
      initializeApp,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
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

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('@/config/firebase');

    const callsAfterModuleLoad = initializeAuth.mock.calls.length;
    firebaseConfig.initializeFirebase();
    const callsAfterExplicitInit = initializeAuth.mock.calls.length;
    firebaseConfig.initializeFirebase();

    expect(getReactNativePersistence).toHaveBeenCalledTimes(1);
    expect(initializeAuth).toHaveBeenCalledWith(expect.any(Object), {
      persistence: 'mock-rn-persistence',
    });
    expect(callsAfterExplicitInit).toBeGreaterThanOrEqual(callsAfterModuleLoad);
    expect(initializeAuth.mock.calls.length).toBe(callsAfterExplicitInit);
  });

  it('throws when react native auth persistence helper is unavailable', () => {
    process.env.NODE_ENV = 'development';
    seedRequiredConfigEnv();

    const initializeApp = jest.fn(() => ({ name: '[DEFAULT]' }));
    const initializeAuth = jest.fn(() => ({ currentUser: null }));
    const getReactNativePersistence = jest.fn(() => undefined);

    jest.doMock('firebase/app', () => ({
      initializeApp,
    }));
    jest.doMock('firebase/auth', () => ({
      initializeAuth,
    }));
    jest.doMock('@firebase/auth', () => ({
      getReactNativePersistence,
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
    }));
    jest.doMock('firebase/storage', () => ({
      getStorage: jest.fn(() => ({})),
    }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => ({})),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const firebaseConfig = require('@/config/firebase');
    expect(() => firebaseConfig.initializeFirebase()).toThrow(
      'Firebase Auth initialization failed'
    );
    expect(initializeAuth).not.toHaveBeenCalled();
  });
});
