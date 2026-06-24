/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PaywallScreen } from '../PaywallScreen';

const mockGetOfferings = jest.fn();
const mockCacheCurrentOfferings = jest.fn();

const annualPackage = {
  identifier: 'annual',
  product: {
    price: 29.99,
    priceString: '$29.99',
    introPrice: {
      price: 0,
      cycles: 1,
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
    },
  },
};

const monthlyPackage = {
  identifier: 'monthly',
  product: {
    price: 4.99,
    priceString: '$4.99',
    introPrice: null,
  },
};

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    mic: 1,
    'mic-outline': 2,
    'calendar-clear-outline': 3,
    'notifications-outline': 4,
    'arrow-forward-circle': 5,
    checkmark: 6,
    close: 7,
  };
  const MockIcon = (props: { name?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    syncCustomerInfo: jest.fn(async () => undefined),
    restorePurchases: jest.fn(async () => 'not_found'),
    presentNativePaywall: jest.fn(async () => 'not_presented'),
    canPresentNativePaywall: false,
  }),
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ status: 'online' }),
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatAvailability: jest.fn(() => ({
    reason: null,
    runtimeAvailable: true,
    apiKeyAvailable: true,
  })),
  getRevenueCatRuntime: jest.fn(() => ({
    Purchases: {
      getOfferings: mockGetOfferings,
      purchasePackage: jest.fn(),
      getCustomerInfo: jest.fn(),
    },
  })),
}));

jest.mock('@/services/RevenueCatOfferingsCacheService', () => ({
  revenueCatOfferingsCacheService: {
    getCachedSnapshot: jest.fn(async () => null),
    cacheCurrentOfferings: (...args: unknown[]) => mockCacheCurrentOfferings(...args),
  },
}));

jest.mock('@/config/env', () => ({
  legalConfig: {
    privacyPolicyUrl: 'https://getryvro.com/privacy',
    termsOfServiceUrl: 'https://getryvro.com/terms',
  },
}));

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOfferings.mockResolvedValue({
      current: {
        annual: annualPackage,
        monthly: monthlyPackage,
        weekly: null,
      },
    });
    mockCacheCurrentOfferings.mockResolvedValue({
      annual: {
        identifier: 'annual',
        price: 29.99,
        priceString: '$29.99',
        hasTrial: true,
      },
      monthly: {
        identifier: 'monthly',
        price: 4.99,
        priceString: '$4.99',
        hasTrial: false,
      },
      weekly: null,
    });
  });

  it('shows a focused Ryvro Pro paywall', async () => {
    const { getByText, getByTestId } = render(
      <PaywallScreen onDismiss={jest.fn()} entryPoint="aha_moment" />
    );

    expect(getByText('Ask Ryvro every day.')).toBeTruthy();
    expect(getByText('Unlock voice answers for your full shift schedule.')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Yearly')).toBeTruthy();
      expect(getByText('$29.99')).toBeTruthy();
      expect(getByText('Monthly')).toBeTruthy();
    });

    expect(getByText('Ask by voice anytime')).toBeTruthy();
    expect(getByTestId('paywall-cta')).toBeTruthy();
    expect(getByTestId('paywall-restore')).toBeTruthy();
  });

  it('does not show the RevenueCat Test Store monthly fallback price', async () => {
    mockGetOfferings.mockResolvedValueOnce({
      current: {
        annual: {
          identifier: 'annual',
          product: {
            price: 49.99,
            priceString: 'US$49.99',
            introPrice: null,
          },
        },
        monthly: {
          identifier: 'monthly',
          product: {
            price: 0.99,
            priceString: 'US$0.99',
            introPrice: null,
          },
        },
        weekly: null,
      },
    });
    mockCacheCurrentOfferings.mockResolvedValueOnce({
      annual: {
        identifier: 'annual',
        price: 49.99,
        priceString: 'US$49.99',
        hasTrial: false,
      },
      monthly: {
        identifier: 'monthly',
        price: 0.99,
        priceString: 'US$0.99',
        hasTrial: false,
      },
      weekly: null,
    });

    const { getByText, queryByText } = render(
      <PaywallScreen onDismiss={jest.fn()} entryPoint="aha_moment" />
    );

    await waitFor(() => {
      expect(getByText('US$6.99')).toBeTruthy();
    });

    expect(queryByText('US$0.99')).toBeNull();
  });
});
