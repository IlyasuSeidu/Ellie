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

    const result = await subscriptionEntitlementCacheService.getCachedIsPro('user-123');

    expect(result).toBe(true);
    expect(asyncStorageService.set).toHaveBeenCalledWith('subscription:isPro:user-123', true);
  });

  it('falls back to the async mirror when the secure snapshot is unavailable', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValue(true as never);

    const result = await subscriptionEntitlementCacheService.getCachedIsPro('user-123');

    expect(result).toBe(true);
  });

  it('ignores invalid secure snapshots and uses the mirror instead', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ nope: true }));
    jest.mocked(asyncStorageService.get).mockResolvedValue(false as never);

    const result = await subscriptionEntitlementCacheService.getCachedIsPro('user-123');

    expect(result).toBe(false);
  });

  it('persists the cached entitlement to both secure storage and the async mirror', async () => {
    await subscriptionEntitlementCacheService.setCachedIsPro(true, 'user-123');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^subscription\.entitlementSnapshot\./),
      expect.stringContaining('"isPro":true')
    );
    expect(asyncStorageService.set).toHaveBeenCalledWith('subscription:isPro:user-123', true);
  });

  it('migrates a legacy global secure snapshot into an authenticated scope', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key: string) =>
        key === 'subscription:entitlementSnapshot'
          ? JSON.stringify({ isPro: true, updatedAt: 456 })
          : null
      );

    const result = await subscriptionEntitlementCacheService.getCachedIsPro('user-456');

    expect(result).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^subscription\.entitlementSnapshot\./),
      expect.stringContaining('"isPro":true')
    );
  });

  it('does not reuse legacy global entitlement cache for anonymous scope', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key: string) =>
        key === 'subscription:entitlementSnapshot'
          ? JSON.stringify({ isPro: true, updatedAt: 456 })
          : null
      );

    const result = await subscriptionEntitlementCacheService.getCachedIsPro(null);

    expect(result).toBeNull();
  });

  it('resolves anonymous cache reads through the active anonymous scope', async () => {
    jest.mocked(asyncStorageService.get).mockImplementation(async (key: string) => {
      if (key === 'subscription:activeAnonymousScope') {
        return 'rc_anon:$RCAnonymousID:anon-123' as never;
      }

      return null as never;
    });
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key: string) =>
        key.startsWith('subscription.entitlementSnapshot.')
          ? JSON.stringify({ isPro: true, updatedAt: 123 })
          : null
      );

    const result = await subscriptionEntitlementCacheService.getCachedIsPro(null);

    expect(result).toBe(true);
  });
});
