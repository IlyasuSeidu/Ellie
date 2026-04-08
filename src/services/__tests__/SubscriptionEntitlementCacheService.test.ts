import * as SecureStore from 'expo-secure-store';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';
import { asyncStorageService } from '@/services/AsyncStorageService';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
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

describe('SubscriptionEntitlementCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(SecureStore.setItemAsync).mockResolvedValue();
    jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue();
    jest.mocked(asyncStorageService.get).mockResolvedValue(null as never);
    jest.mocked(asyncStorageService.set).mockResolvedValue();
    jest.mocked(asyncStorageService.remove).mockResolvedValue();
  });

  it('prefers the secure snapshot and heals the async mirror', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockResolvedValue(JSON.stringify({ isPro: true, updatedAt: 123 }));
    jest.mocked(asyncStorageService.get).mockResolvedValue(false as never);

    const result = await subscriptionEntitlementCacheService.getCachedIsPro();

    expect(result).toBe(true);
    expect(asyncStorageService.set).toHaveBeenCalledWith('subscription:isPro', true);
  });

  it('falls back to the async mirror when the secure snapshot is unavailable', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValue(true as never);

    const result = await subscriptionEntitlementCacheService.getCachedIsPro();

    expect(result).toBe(true);
  });

  it('ignores invalid secure snapshots and uses the mirror instead', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ nope: true }));
    jest.mocked(asyncStorageService.get).mockResolvedValue(false as never);

    const result = await subscriptionEntitlementCacheService.getCachedIsPro();

    expect(result).toBe(false);
  });

  it('persists the cached entitlement to both secure storage and the async mirror', async () => {
    await subscriptionEntitlementCacheService.setCachedIsPro(true);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'subscription:entitlementSnapshot',
      expect.stringContaining('"isPro":true')
    );
    expect(asyncStorageService.set).toHaveBeenCalledWith('subscription:isPro', true);
  });
});
