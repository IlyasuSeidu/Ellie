describe('NetworkService runtime fallback', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not crash when the NetInfo native module is unavailable', () => {
    const warn = jest.fn();

    jest.doMock('@react-native-community/netinfo', () => {
      throw new Error("Property 'RNCNetInfo' doesn't exist");
    });

    jest.doMock('@/utils/logger', () => ({
      logger: {
        warn,
        debug: jest.fn(),
        error: jest.fn(),
      },
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NetworkService } = require('../NetworkService');
      const service = new NetworkService();

      expect(() => service.start()).not.toThrow();
      expect(service.getSnapshot().status).toBe('unknown');

      service.stop();
    });

    expect(warn).toHaveBeenCalledWith(
      'NetworkService: NetInfo native module unavailable; falling back to unknown state',
      expect.objectContaining({
        error: expect.stringContaining('RNCNetInfo'),
      })
    );
  });
});
