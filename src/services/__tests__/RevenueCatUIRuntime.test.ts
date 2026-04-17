describe('RevenueCatUIRuntime', () => {
  it('exposes runtime when react-native-purchases-ui is available', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-purchases-ui', () => ({
        __esModule: true,
        PAYWALL_RESULT: {
          PURCHASED: 'PURCHASED',
        },
        default: {
          presentPaywallIfNeeded: jest.fn(),
          presentCustomerCenter: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatUIRuntime, isRevenueCatUIAvailable } = require('../RevenueCatUIRuntime');
      const runtime = getRevenueCatUIRuntime();

      expect(runtime).not.toBeNull();
      expect(runtime).toHaveProperty('RevenueCatUI');
      expect(runtime).toHaveProperty('PAYWALL_RESULT');
      expect(isRevenueCatUIAvailable()).toBe(true);
    });
  });

  it('returns null when the native UI module is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.isolateModules(() => {
      jest.doMock('react-native-purchases-ui', () => {
        throw new Error(
          '[RevenueCatUI] Native module not found. The package is not properly linked.'
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {
        getRevenueCatUIAvailability,
        getRevenueCatUIRuntime,
      } = require('../RevenueCatUIRuntime');

      expect(getRevenueCatUIRuntime()).toBeNull();
      expect(getRevenueCatUIAvailability().reason).toBe('missing_native_module');
    });

    warnSpy.mockRestore();
  });
});
