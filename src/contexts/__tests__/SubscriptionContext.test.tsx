import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { getRevenueCatRuntime } from '@/services/RevenueCatRuntime';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import * as SecureStore from 'expo-secure-store';

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
  getRevenueCatRuntime: jest.fn(),
}));

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
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
    const { isPro, isLoading, restorePurchases } = useSubscription();
    return (
      <>
        <Text testID="is-pro">{String(isPro)}</Text>
        <Text testID="is-loading">{String(isLoading)}</Text>
        <Pressable
          testID="restore"
          onPress={() => {
            void restorePurchases();
          }}
        >
          <Text>Restore</Text>
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
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    jest.mocked(asyncStorageService.get).mockResolvedValue(false as never);
    jest.mocked(networkService.refresh).mockResolvedValue({ status: 'online' } as never);
  });

  it('preserves cached entitlement when RevenueCat configure fails', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockResolvedValue(JSON.stringify({ isPro: true, updatedAt: Date.now() }));
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
        'subscription:entitlementSnapshot',
        expect.stringContaining('"isPro":true')
      );
    });
  });

  it('skips restore purchases while offline', async () => {
    const restorePurchases = jest.fn();
    jest.mocked(getRevenueCatRuntime).mockReturnValue({
      LOG_LEVEL: { ERROR: 'ERROR' },
      Purchases: {
        setLogLevel: jest.fn(),
        configure: jest.fn(),
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
});
