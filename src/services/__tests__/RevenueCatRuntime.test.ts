describe('RevenueCatRuntime', () => {
  it('exposes runtime when react-native-purchases is available', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              REVENUECAT_IOS_KEY: 'ios-key',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatApiKey,
        getRevenueCatRuntime,
        isRevenueCatConfigured,
      } = require('../RevenueCatRuntime');
      const runtime = getRevenueCatRuntime();

      expect(runtime).not.toBeNull();
      expect(getRevenueCatApiKey()).toBe('ios-key');
      expect(isRevenueCatConfigured()).toBe(true);
      expect(runtime).toHaveProperty('Purchases');
      expect(runtime).toHaveProperty('LOG_LEVEL');
    });
  });

  it('returns null when native module is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              REVENUECAT_IOS_KEY: 'ios-key',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => {
        throw new Error(
          '[RevenueCat] Native module (RNPurchases) not found. The package is not properly linked.'
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatAvailability,
        getRevenueCatRuntime,
        isRevenueCatConfigured,
      } = require('../RevenueCatRuntime');
      expect(getRevenueCatRuntime()).toBeNull();
      expect(getRevenueCatAvailability().reason).toBe('missing_native_module');
      expect(isRevenueCatConfigured()).toBe(false);
    });

    warnSpy.mockRestore();
  });

  it('accepts Expo public RevenueCat keys in app config', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'ios-public-key',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatApiKey, getRevenueCatAvailability } = require('../RevenueCatRuntime');
      expect(getRevenueCatApiKey()).toBe('ios-public-key');
      expect(getRevenueCatAvailability().reason).toBeNull();
    });
  });

  it('accepts a generic public/test RevenueCat key when platform-specific keys are absent', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              REVENUECAT_API_KEY: 'test_public_key',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatApiKey, getRevenueCatAvailability } = require('../RevenueCatRuntime');
      expect(getRevenueCatApiKey()).toBe('test_public_key');
      expect(getRevenueCatAvailability().reason).toBeNull();
    });
  });

  it('treats placeholder RevenueCat keys as missing', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {
              REVENUECAT_IOS_KEY: 'appl_xxxxxxxxxxxxx',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatApiKey, getRevenueCatAvailability } = require('../RevenueCatRuntime');
      expect(getRevenueCatApiKey()).toBe('');
      expect(getRevenueCatAvailability().reason).toBe('missing_api_key');
    });
  });

  it('marks RevenueCat as unconfigured when the native module exists but the SDK key is missing', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {
            extra: {},
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatAvailability, isRevenueCatConfigured } = require('../RevenueCatRuntime');
      expect(getRevenueCatAvailability().reason).toBe('missing_api_key');
      expect(isRevenueCatConfigured()).toBe(false);
    });
  });

  it('reads RevenueCat keys from manifest2 expoClient extra in native builds', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {},
          manifest2: {
            extra: {
              expoClient: {
                extra: {
                  REVENUECAT_IOS_KEY: 'test_manifest2_key',
                },
              },
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatApiKey, getRevenueCatAvailability } = require('../RevenueCatRuntime');
      expect(getRevenueCatApiKey()).toBe('test_manifest2_key');
      expect(getRevenueCatAvailability().reason).toBeNull();
    });
  });

  it('reads RevenueCat keys from classic manifest extra when expoConfig is unavailable', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: {
          expoConfig: {},
          manifest: {
            extra: {
              REVENUECAT_IOS_KEY: 'test_manifest_key',
            },
          },
        },
      }));
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatApiKey, getRevenueCatAvailability } = require('../RevenueCatRuntime');
      expect(getRevenueCatApiKey()).toBe('test_manifest_key');
      expect(getRevenueCatAvailability().reason).toBeNull();
    });
  });
});
