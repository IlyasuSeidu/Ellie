import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import {
  getRevenueCatApiKey,
  getRevenueCatAvailability,
  getRevenueCatRuntime,
} from '@/services/RevenueCatRuntime';
import { getRevenueCatUIRuntime } from '@/services/RevenueCatUIRuntime';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import * as SecureStore from 'expo-secure-store';

const mockUseAuth = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        REVENUECAT_IOS_KEY: 'ios-key',
        REVENUECAT_ANDROID_KEY: 'android-key',
      },
    },
  },
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatApiKey: jest.fn(() => 'ios-key'),
  getRevenueCatAvailability: jest.fn(() => ({
    reason: null,
    runtimeAvailable: true,
    apiKeyAvailable: true,
  })),
  getRevenueCatRuntime: jest.fn(),
}));

jest.mock('@/services/RevenueCatUIRuntime', () => ({
  getRevenueCatUIRuntime: jest.fn(() => null),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/services/NetworkService', () => ({
  networkService: {
    refresh: jest.fn(async () => ({ status: 'online' })),
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

const renderWithProvider = () => {
  const Probe = () => {
    const {
      isPro,
      isLoading,
      restorePurchases,
      presentNativePaywall,
      openCustomerCenter,
      canPresentNativePaywall,
      canOpenCustomerCenter,
    } = useSubscription();
    return (
      <>
        <Text testID="is-pro">{String(isPro)}</Text>
        <Text testID="is-loading">{String(isLoading)}</Text>
        <Text testID="can-present-native-paywall">{String(canPresentNativePaywall)}</Text>
        <Text testID="can-open-customer-center">{String(canOpenCustomerCenter)}</Text>
        <Pressable
          testID="restore"
          onPress={() => {
            void restorePurchases();
          }}
        >
          <Text>Restore</Text>
        </Pressable>
        <Pressable
          testID="native-paywall"
          onPress={() => {
            void presentNativePaywall();
          }}
        >
          <Text>Native Paywall</Text>
        </Pressable>
        <Pressable
          testID="customer-center"
          onPress={() => {
            void openCustomerCenter();
          }}
        >
          <Text>Customer Center</Text>
        </Pressable>
      </>
    );
  };

  return render(
    <SubscriptionProvider onOpenPaywall={jest.fn()}>
      <Probe />
    </SubscriptionProvider>
  );
};

describe('SubscriptionContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getRevenueCatApiKey).mockReturnValue('ios-key');
    jest.mocked(getRevenueCatAvailability).mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    } as never);
    jest.mocked(getRevenueCatUIRuntime).mockReturnValue(null);
    mockUseAuth.mockReturnValue({ user: null });
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(asyncStorageService.get).mockResolvedValue(false as never);
    jest.mocked(networkService.refresh).mockResolvedValue({ status: 'online' } as never);
  });

  it('preserves cached entitlement when RevenueCat configure fails', async () => {
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
          ? JSON.stringify({ isPro: true, updatedAt: Date.now() })
          : null
      );
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(() => {
          throw new Error('native bridge unavailable');
        }),
      },
    } as never);

    const { getByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId('is-pro').props.children).toBe('true');
      expect(getByTestId('is-loading').props.children).toBe('false');
    });
  });

  it('persists restored entitlements to the secure cache', async () => {
    const restorePurchases = jest.fn(async () => ({ entitlements: { active: { pro: {} } } }));
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
        getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        restorePurchases,
      },
    } as never);

    const { getByTestId } = renderWithProvider();
    fireEvent.press(getByTestId('restore'));

    await waitFor(() => {
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringMatching(/^subscription\.entitlementSnapshot\./),
        expect.stringContaining('"isPro":true')
      );
    });
  });

  it('uses the authenticated user as the RevenueCat identity and cache scope', async () => {
    const logIn = jest.fn(async () => ({
      customerInfo: { entitlements: { active: { pro: {} } } },
    }));
    mockUseAuth.mockReturnValue({ user: { uid: 'user-123' } });
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
        getCustomerInfo: jest.fn(async () => ({ entitlements: { active: { pro: {} } } })),
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        logIn,
      },
    } as never);

    const { getByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId('is-pro').props.children).toBe('true');
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^subscription\.entitlementSnapshot\./),
      expect.stringContaining('"isPro":true')
    );
  });

  it('does not fetch or cache customer info for a new auth scope when RevenueCat identity switching is unavailable', async () => {
    let authUser: { uid: string } | null = null;
    mockUseAuth.mockImplementation(() => ({ user: authUser }));

    const getCustomerInfo = jest.fn(async () => ({ entitlements: { active: {} } }));
    const purchases = {
      setLogLevel: jest.fn(),
      configure: jest.fn(),
      getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
      getCustomerInfo,
      addCustomerInfoUpdateListener: jest.fn(),
      removeCustomerInfoUpdateListener: jest.fn(),
    };

    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: purchases,
    } as never);

    const Probe = () => {
      const { isLoading } = useSubscription();
      return <Text testID="is-loading">{String(isLoading)}</Text>;
    };

    const view = render(
      <SubscriptionProvider onOpenPaywall={jest.fn()}>
        <Probe />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(getCustomerInfo).toHaveBeenCalledTimes(1);
      expect(view.getByTestId('is-loading').props.children).toBe('false');
    });

    authUser = { uid: 'user-123' };
    view.rerender(
      <SubscriptionProvider onOpenPaywall={jest.fn()}>
        <Probe />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(view.getByTestId('is-loading').props.children).toBe('false');
    });

    expect(getCustomerInfo).toHaveBeenCalledTimes(1);
    expect(asyncStorageService.set).not.toHaveBeenCalledWith('subscription:isPro:user-123', false);
  });

  it('skips restore purchases while offline', async () => {
    const restorePurchases = jest.fn();
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
        getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        restorePurchases,
      },
    } as never);
    jest.mocked(networkService.refresh).mockResolvedValue({ status: 'offline' } as never);

    const { getByTestId } = renderWithProvider();

    fireEvent.press(getByTestId('restore'));

    await waitFor(() => {
      expect(restorePurchases).not.toHaveBeenCalled();
    });
  });

  it('presents the native RevenueCat paywall and syncs entitlements after purchase', async () => {
    const getCustomerInfo = jest.fn(async () => ({ entitlements: { active: { pro: {} } } }));
    const presentPaywallIfNeeded = jest.fn(async () => 'PURCHASED');

    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
        getCustomerInfo,
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        restorePurchases: jest.fn(),
      },
    } as never);
    jest.mocked(getRevenueCatUIRuntime).mockReturnValue({
      PAYWALL_RESULT: {
        PURCHASED: 'PURCHASED',
        RESTORED: 'RESTORED',
        CANCELLED: 'CANCELLED',
        NOT_PRESENTED: 'NOT_PRESENTED',
      },
      RevenueCatUI: {
        presentPaywallIfNeeded,
        presentCustomerCenter: jest.fn(),
      },
    } as never);

    const { getByTestId } = renderWithProvider();

    fireEvent.press(getByTestId('native-paywall'));

    await waitFor(() => {
      expect(presentPaywallIfNeeded).toHaveBeenCalled();
      expect(getCustomerInfo).toHaveBeenCalled();
      expect(getByTestId('is-pro').props.children).toBe('true');
    });
  });

  it('opens customer center when the native UI runtime is available', async () => {
    const getCustomerInfo = jest.fn(async () => ({ entitlements: { active: { pro: {} } } }));
    const presentCustomerCenter = jest.fn(async () => undefined);

    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
        getAppUserID: jest.fn(async () => '$RCAnonymousID:anon-123'),
        getCustomerInfo,
        addCustomerInfoUpdateListener: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        restorePurchases: jest.fn(),
      },
    } as never);
    jest.mocked(getRevenueCatUIRuntime).mockReturnValue({
      PAYWALL_RESULT: {
        PURCHASED: 'PURCHASED',
        RESTORED: 'RESTORED',
        CANCELLED: 'CANCELLED',
        NOT_PRESENTED: 'NOT_PRESENTED',
      },
      RevenueCatUI: {
        presentPaywallIfNeeded: jest.fn(),
        presentCustomerCenter,
      },
    } as never);

    const { getByTestId } = renderWithProvider();

    fireEvent.press(getByTestId('customer-center'));

    await waitFor(() => {
      expect(presentCustomerCenter).toHaveBeenCalled();
      expect(getCustomerInfo).toHaveBeenCalled();
    });
  });

  it('does not advertise native RevenueCat UI actions when the API key is missing', async () => {
    jest.mocked(getRevenueCatApiKey).mockReturnValue('');
    jest.mocked(getRevenueCatAvailability).mockReturnValue({
      reason: 'missing_api_key',
      runtimeAvailable: true,
      apiKeyAvailable: false,
    } as never);
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
      },
    } as never);
    jest.mocked(getRevenueCatUIRuntime).mockReturnValue({
      PAYWALL_RESULT: {
        PURCHASED: 'PURCHASED',
        RESTORED: 'RESTORED',
        CANCELLED: 'CANCELLED',
        NOT_PRESENTED: 'NOT_PRESENTED',
      },
      RevenueCatUI: {
        presentPaywallIfNeeded: jest.fn(),
        presentCustomerCenter: jest.fn(),
      },
    } as never);

    const { getByTestId } = renderWithProvider();

    await waitFor(() => {
      expect(getByTestId('can-present-native-paywall').props.children).toBe('false');
      expect(getByTestId('can-open-customer-center').props.children).toBe('false');
    });
  });
});
