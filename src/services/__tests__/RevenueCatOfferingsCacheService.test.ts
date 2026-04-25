import { revenueCatOfferingsCacheService } from '@/services/RevenueCatOfferingsCacheService';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatApiKey: jest.fn(() => 'test_api_key'),
}));

jest.mock('@/services/SubscriptionEntitlementCacheService', () => ({
  subscriptionEntitlementCacheService: {
    getActiveAnonymousScope: jest.fn(async () => 'rc_anon:test-scope'),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const createPackage = (price: number, priceString: string, withTrial = true) =>
  ({
    identifier: `${priceString}-package`,
    product: {
      price,
      priceString,
      introPrice: withTrial
        ? {
            price: 0,
            cycles: 1,
            periodUnit: 'DAY',
            periodNumberOfUnits: 7,
          }
        : null,
    },
  }) as never;

describe('RevenueCatOfferingsCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(asyncStorageService.get).mockResolvedValue(null as never);
    jest.mocked(asyncStorageService.set).mockResolvedValue(undefined);
    jest
      .mocked(subscriptionEntitlementCacheService.getActiveAnonymousScope)
      .mockResolvedValue('rc_anon:test-scope');
  });

  it('caches a serializable offerings snapshot', async () => {
    const snapshot = await revenueCatOfferingsCacheService.cacheCurrentOfferings({
      annual: createPackage(49.99, '$49.99'),
      monthly: createPackage(6.99, '$6.99', false),
      weekly: null,
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        annual: expect.objectContaining({
          identifier: '$49.99-package',
          price: 49.99,
          priceString: '$49.99',
          hasTrial: true,
          trialCycles: 1,
          trialPeriodUnit: 'DAY',
          trialPeriodNumberOfUnits: 7,
        }),
        monthly: expect.objectContaining({
          identifier: '$6.99-package',
          price: 6.99,
          priceString: '$6.99',
          hasTrial: false,
          trialCycles: null,
          trialPeriodUnit: null,
          trialPeriodNumberOfUnits: null,
        }),
        weekly: null,
      })
    );
    expect(asyncStorageService.set).toHaveBeenCalledWith(
      expect.stringContaining('subscription:offeringsSnapshot:'),
      expect.objectContaining({
        annual: expect.objectContaining({
          priceString: '$49.99',
        }),
      })
    );
  });

  it('returns a valid cached snapshot when present', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValue({
      updatedAt: Date.now(),
      annual: {
        identifier: '$49.99-package',
        price: 49.99,
        priceString: '$49.99',
        hasTrial: true,
        trialCycles: 1,
        trialPeriodUnit: 'DAY',
        trialPeriodNumberOfUnits: 7,
      },
      monthly: null,
      weekly: null,
    } as never);

    const snapshot = await revenueCatOfferingsCacheService.getCachedSnapshot();

    expect(snapshot).toEqual(
      expect.objectContaining({
        annual: expect.objectContaining({
          identifier: '$49.99-package',
          priceString: '$49.99',
          hasTrial: true,
        }),
      })
    );
  });

  it('expires stale cached snapshots', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValue({
      updatedAt: Date.now() - 25 * 60 * 60 * 1000,
      annual: {
        identifier: '$49.99-package',
        price: 49.99,
        priceString: '$49.99',
        hasTrial: true,
        trialCycles: 1,
        trialPeriodUnit: 'DAY',
        trialPeriodNumberOfUnits: 7,
      },
      monthly: null,
      weekly: null,
    } as never);

    const snapshot = await revenueCatOfferingsCacheService.getCachedSnapshot();

    expect(snapshot).toBeNull();
  });

  it('ignores invalid cached snapshots', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValue({
      updatedAt: 'nope',
      annual: { price: 49.99, priceString: '$49.99', hasTrial: true },
      monthly: null,
      weekly: null,
    } as never);

    const snapshot = await revenueCatOfferingsCacheService.getCachedSnapshot();

    expect(snapshot).toBeNull();
  });
});
