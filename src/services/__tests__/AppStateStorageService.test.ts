import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { appStateStorageService } from '@/services/AppStateStorageService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/services/SubscriptionEntitlementCacheService', () => ({
  subscriptionEntitlementCacheService: {
    getActiveAnonymousScope: jest.fn(async () => 'rc_anon:active'),
  },
}));

describe('AppStateStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(asyncStorageService.get).mockResolvedValue(null as never);
    jest.mocked(asyncStorageService.set).mockResolvedValue(undefined);
    jest.mocked(asyncStorageService.remove).mockResolvedValue(undefined);
    jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    jest.mocked(AsyncStorage.removeItem).mockResolvedValue();
    jest
      .mocked(subscriptionEntitlementCacheService.getActiveAnonymousScope)
      .mockResolvedValue('rc_anon:active');
  });

  it('migrates anonymous paywall recovery state into the resolved active anonymous scope', async () => {
    jest
      .mocked(asyncStorageService.get)
      .mockImplementation(async (key: string) =>
        key === 'paywall:declinedAt:anonymous' ? (123456789 as never) : (null as never)
      );

    const declinedAt = await appStateStorageService.getPaywallDeclinedAt();

    expect(declinedAt).toBe(123456789);
    expect(asyncStorageService.set).toHaveBeenCalledWith(
      'paywall:declinedAt:rc_anon:active',
      123456789
    );
    expect(asyncStorageService.remove).toHaveBeenCalledWith('paywall:declinedAt:anonymous');
  });

  it('clears both the resolved scope key and the anonymous fallback key', async () => {
    await appStateStorageService.clearPaywallDeclinedAt('user-123');

    expect(asyncStorageService.remove).toHaveBeenCalledWith('paywall:declinedAt:user-123');
    expect(asyncStorageService.remove).toHaveBeenCalledWith('paywall:declinedAt:anonymous');
  });
});
