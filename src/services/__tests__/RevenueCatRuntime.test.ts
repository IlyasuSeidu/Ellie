describe('RevenueCatRuntime', () => {
  it('exposes runtime when react-native-purchases is available', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-purchases', () => ({
        __esModule: true,
        LOG_LEVEL: { ERROR: 'ERROR' },
        default: {
          configure: jest.fn(),
        },
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatRuntime, isRevenueCatAvailable } = require('../RevenueCatRuntime');
      const runtime = getRevenueCatRuntime();

      expect(runtime).not.toBeNull();
      expect(isRevenueCatAvailable()).toBe(true);
      expect(runtime).toHaveProperty('Purchases');
      expect(runtime).toHaveProperty('LOG_LEVEL');
    });
  });

  it('returns null when native module is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.isolateModules(() => {
      jest.doMock('react-native-purchases', () => {
        throw new Error(
          '[RevenueCat] Native module (RNPurchases) not found. The package is not properly linked.'
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRevenueCatRuntime, isRevenueCatAvailable } = require('../RevenueCatRuntime');
      expect(getRevenueCatRuntime()).toBeNull();
      expect(isRevenueCatAvailable()).toBe(false);
    });

    warnSpy.mockRestore();
  });
});
