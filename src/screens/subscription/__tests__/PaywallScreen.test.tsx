import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { PaywallScreen } from '../PaywallScreen';
import { ShiftPattern } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getRevenueCatAvailability, getRevenueCatRuntime } from '@/services/RevenueCatRuntime';
import { revenueCatOfferingsCacheService } from '@/services/RevenueCatOfferingsCacheService';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSubscription } from '@/hooks/useSubscription';

const mockOnDismiss = jest.fn();
const mockRestorePurchases = jest.fn().mockResolvedValue('success');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatAvailability: jest.fn(() => ({
    reason: 'missing_native_module',
    runtimeAvailable: false,
    apiKeyAvailable: false,
  })),
  getRevenueCatRuntime: jest.fn(() => null),
}));

jest.mock('@/services/RevenueCatOfferingsCacheService', () => ({
  revenueCatOfferingsCacheService: {
    getCachedSnapshot: jest.fn(async () => null),
    cacheCurrentOfferings: jest.fn(async () => null),
  },
}));

jest.mock('@/components/paywall/MiniYearCalendar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MiniYearCalendar: () => <Text>MiniYearCalendar</Text>,
  };
});

jest.mock('@/utils/analytics', () => ({
  Analytics: {
    paywallViewed: jest.fn(),
    paywallPlanSelected: jest.fn(),
    paywallDismissed: jest.fn(),
    paywallSubscribeTapped: jest.fn(),
    paywallRestoreTapped: jest.fn(),
    paywallCTAClicked: jest.fn(),
    trialStarted: jest.fn(),
    purchaseCompleted: jest.fn(),
  },
}));

jest.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({
    status: 'online',
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    updatedAt: Date.now(),
  })),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    isPro: false,
    isLoading: false,
    openPaywall: jest.fn(),
    canPresentNativePaywall: false,
    canOpenCustomerCenter: false,
    restorePurchases: jest.fn(),
    presentNativePaywall: jest.fn(),
    openCustomerCenter: jest.fn(),
    syncCustomerInfo: jest.fn(),
  })),
}));

const mockedAnalytics = jest.mocked(Analytics);
const mockedGetRevenueCatAvailability = jest.mocked(getRevenueCatAvailability);
const mockedGetRevenueCatRuntime = jest.mocked(getRevenueCatRuntime);
const mockedUseNetworkStatus = jest.mocked(useNetworkStatus);
const mockedUseSubscription = jest.mocked(useSubscription);
const mockedRevenueCatOfferingsCacheService = jest.mocked(revenueCatOfferingsCacheService);
const networkType = (value: string): ReturnType<typeof useNetworkStatus>['type'] =>
  value as ReturnType<typeof useNetworkStatus>['type'];

const createSubscriptionMock = (
  overrides: Partial<ReturnType<typeof useSubscription>> = {}
): ReturnType<typeof useSubscription> => ({
  isPro: false,
  isLoading: false,
  openPaywall: jest.fn(),
  canPresentNativePaywall: false,
  canOpenCustomerCenter: false,
  restorePurchases: jest.fn(),
  presentNativePaywall: jest.fn(),
  openCustomerCenter: jest.fn(),
  syncCustomerInfo: jest.fn(),
  ...overrides,
});

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

const createRevenueCatRuntime = ({
  annual = createPackage(49.99, '$49.99'),
  monthly = createPackage(6.99, '$6.99'),
  weekly = null,
  purchasePackage = jest.fn(),
  restorePurchases = mockRestorePurchases,
}: {
  annual?: unknown;
  monthly?: unknown;
  weekly?: unknown;
  purchasePackage?: jest.Mock;
  restorePurchases?: jest.Mock;
} = {}) =>
  ({
    Purchases: {
      getOfferings: jest.fn().mockResolvedValue({
        current: {
          annual,
          monthly,
          weekly,
        },
      }),
      purchasePackage,
      restorePurchases,
    },
  }) as never;

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T00:00:00Z'));
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: 'missing_native_module',
      runtimeAvailable: false,
      apiKeyAvailable: false,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(null);
    mockedUseNetworkStatus.mockReturnValue({
      status: 'online',
      isConnected: true,
      isInternetReachable: true,
      type: networkType('wifi'),
      updatedAt: Date.now(),
    });
    mockedUseSubscription.mockReturnValue(createSubscriptionMock());
    mockedRevenueCatOfferingsCacheService.getCachedSnapshot.mockResolvedValue(null);
    mockedRevenueCatOfferingsCacheService.cacheCurrentOfferings.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders personalized title and fifo-specific first feature row', () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(createRevenueCatRuntime());

    const { getByText, queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          name: 'Ilyasu',
          country: 'Ghana',
          rosterType: 'fifo',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    return waitFor(() => {
      expect(getByText('Ilyasu, your roster is ready.')).toBeTruthy();
      expect(
        getByText('Your FIFO cycle is mapped. See every swing, every day off, for your full year.')
      ).toBeTruthy();
      expect(getByText('See your full year — every work block, every R&R')).toBeTruthy();
      expect(
        getByText(
          'Your free trial ends March 27, 2026. Cancel anytime in Settings before then to avoid charges. Subscriptions renew automatically.'
        )
      ).toBeTruthy();
      expect(queryByText(/Introductory offer ends in/i)).toBeNull();
    });
  });

  it('renders plans and CTA before the supporting feature and testimonial content', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(createRevenueCatRuntime());

    const { toJSON } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          name: 'Ilyasu',
          country: 'Ghana',
          rosterType: 'fifo',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    await waitFor(() => {
      expect(JSON.stringify(toJSON())).toContain('Annual');
    });

    const renderedTree = JSON.stringify(toJSON());
    const annualIndex = renderedTree.indexOf('Annual');
    const ctaIndex = renderedTree.indexOf('Start Free Trial');
    const featureIndex = renderedTree.indexOf('See your full year — every work block, every R&R');
    const testimonialIndex = renderedTree.indexOf(
      'Sarah K., Underground miner — 12h rotating shifts'
    );

    expect(annualIndex).toBeGreaterThan(-1);
    expect(ctaIndex).toBeGreaterThan(annualIndex);
    expect(featureIndex).toBeGreaterThan(ctaIndex);
    expect(testimonialIndex).toBeGreaterThan(featureIndex);
  });

  it('keeps the primary CTA label on one line with font fitting enabled', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(createRevenueCatRuntime());

    const { getByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          name: 'Ilyasu',
          country: 'Ghana',
          rosterType: 'fifo',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    const ctaLabel = await waitFor(() => getByText('Start Free Trial'));

    expect(ctaLabel.props.numberOfLines).toBe(1);
    expect(ctaLabel.props.adjustsFontSizeToFit).toBe(true);
    expect(ctaLabel.props.minimumFontScale).toBe(0.84);
  });

  it('tracks restore tap and dismiss metadata', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(createRevenueCatRuntime());
    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        restorePurchases: mockRestorePurchases,
      })
    );

    const { getByText, getByLabelText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    fireEvent.press(getByText('Restore'));
    await waitFor(() => {
      expect(mockRestorePurchases).toHaveBeenCalled();
    });
    expect(mockedAnalytics.paywallViewed).toHaveBeenCalledWith(
      'feature_gate',
      expect.objectContaining({
        platform: Platform.OS,
        country: 'Australia',
        roster_type: 'rotating',
        pain_point: 'family',
      })
    );
    expect(mockedAnalytics.paywallRestoreTapped).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: Platform.OS,
        source: 'feature_gate',
        trigger_source: 'feature_gate',
      })
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockOnDismiss).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(8000);
    });

    fireEvent.press(getByLabelText('Close paywall'));
    expect(mockedAnalytics.paywallDismissed).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: Platform.OS,
        source: 'feature_gate',
        trigger_source: 'feature_gate',
      })
    );
  });

  it('passes entry point through plan and subscribe analytics', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({
          current: {
            annual: null,
            monthly: {
              identifier: '$6.99-package',
              product: {
                price: 6.99,
                priceString: '$6.99',
                introPrice: null,
              },
            },
          },
        }),
        purchasePackage: jest.fn().mockResolvedValue({
          customerInfo: {
            entitlements: {
              active: {
                pro: { periodType: 'TRIAL' },
              },
            },
          },
        }),
      },
    } as never);

    const { getByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="settings"
        onboardingData={{
          rosterType: 'fifo',
          country: 'Ghana',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Monthly')).toBeTruthy();
    });

    fireEvent.press(getByText('Monthly'));
    expect(mockedAnalytics.paywallPlanSelected).toHaveBeenCalledWith(
      'monthly',
      expect.objectContaining({
        platform: Platform.OS,
        source: 'settings',
        trigger_source: 'settings',
      })
    );

    fireEvent.press(getByText('Subscribe Now'));
    await waitFor(() => {
      expect(mockedAnalytics.paywallSubscribeTapped).toHaveBeenCalledWith(
        'monthly',
        expect.objectContaining({
          platform: Platform.OS,
          source: 'settings',
          trigger_source: 'settings',
        })
      );
    });
  });

  it('selects the first available plan when annual is missing and still renders the CTA', async () => {
    const syncCustomerInfo = jest.fn();
    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        syncCustomerInfo,
      })
    );
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(
      createRevenueCatRuntime({
        annual: null,
        monthly: createPackage(6.99, '$6.99'),
        purchasePackage: jest.fn().mockResolvedValue({
          customerInfo: {
            entitlements: {
              active: {
                pro: { periodType: 'TRIAL' },
              },
            },
          },
        }),
      })
    );

    const { getByText, queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Monthly')).toBeTruthy();
      expect(getByText('Start Free Trial')).toBeTruthy();
    });

    expect(queryByText('Annual')).toBeNull();

    fireEvent.press(getByText('Start Free Trial'));

    await waitFor(() => {
      expect(syncCustomerInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: expect.objectContaining({
            active: expect.objectContaining({
              pro: expect.any(Object),
            }),
          }),
        })
      );
    });
  });

  it('switches badge and CTA copy when the selected plan does not include a trial', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(
      createRevenueCatRuntime({
        annual: null,
        monthly: createPackage(6.99, '$6.99', false),
      })
    );

    const { getByText, queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Subscribe Now')).toBeTruthy();
    });

    expect(getByText('SUBSCRIBE TODAY · CANCEL ANYTIME')).toBeTruthy();
    expect(getByText('Starts today')).toBeTruthy();
    expect(getByText('Charged today')).toBeTruthy();
    expect(
      getByText('You will be charged $6.99 today. Renews monthly. Cancel anytime in Settings.')
    ).toBeTruthy();
    expect(queryByText('FREE TRIAL · NO CHARGE TODAY')).toBeNull();
  });

  it('shows paid success copy when the purchase is not a trial', async () => {
    const syncCustomerInfo = jest.fn();
    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        syncCustomerInfo,
      })
    );
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(
      createRevenueCatRuntime({
        purchasePackage: jest.fn().mockResolvedValue({
          customerInfo: {
            entitlements: {
              active: {
                pro: { periodType: 'NORMAL' },
              },
            },
          },
        }),
      })
    );

    const { getByText, queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Start Free Trial')).toBeTruthy();
    });

    fireEvent.press(getByText('Start Free Trial'));

    await waitFor(() => {
      expect(getByText('Your subscription is active')).toBeTruthy();
    });

    expect(queryByText('Your free trial has started')).toBeNull();
  });

  it('shows a network error and renders a disabled offline CTA when offline', async () => {
    mockedUseNetworkStatus.mockReturnValue({
      status: 'offline',
      isConnected: false,
      isInternetReachable: false,
      type: networkType('none'),
      updatedAt: Date.now(),
    });

    const getOfferings = jest.fn();
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings,
      },
    } as never);

    const { getAllByText, getByTestId, getByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          rosterType: 'fifo',
          country: 'Ghana',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    await waitFor(() => {
      expect(
        getAllByText('Network error. Please check your connection and try again.').length
      ).toBeGreaterThan(0);
    });

    expect(getOfferings).not.toHaveBeenCalled();
    expect(getByTestId('paywall-plans-fallback')).toBeTruthy();
    expect(getByText('Connect to subscribe')).toBeTruthy();
    fireEvent.press(getByTestId('paywall-cta'));
    expect(mockedAnalytics.paywallSubscribeTapped).not.toHaveBeenCalled();
  });

  it('uses cached offerings to render pricing when offline', async () => {
    mockedUseNetworkStatus.mockReturnValue({
      status: 'offline',
      isConnected: false,
      isInternetReachable: false,
      type: networkType('none'),
      updatedAt: Date.now(),
    });
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedRevenueCatOfferingsCacheService.getCachedSnapshot.mockResolvedValue({
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
      monthly: {
        identifier: '$6.99-package',
        price: 6.99,
        priceString: '$6.99',
        hasTrial: false,
        trialCycles: null,
        trialPeriodUnit: null,
        trialPeriodNumberOfUnits: null,
      },
      weekly: null,
    });

    const { getByText, queryByTestId } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          rosterType: 'fifo',
          country: 'Ghana',
          painPoint: 'cycle_lost',
          patternType: ShiftPattern.FIFO_8_6,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Annual')).toBeTruthy();
      expect(getByText('Monthly')).toBeTruthy();
      expect(getByText('Connect to subscribe')).toBeTruthy();
    });

    expect(queryByTestId('paywall-plans-fallback')).toBeNull();
  });

  it('retries live offerings from cached plan metadata before purchasing', async () => {
    const syncCustomerInfo = jest.fn();
    const purchasePackage = jest.fn().mockResolvedValue({
      customerInfo: {
        entitlements: {
          active: {
            pro: { periodType: 'TRIAL' },
          },
        },
      },
    });

    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        syncCustomerInfo,
      })
    );
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedRevenueCatOfferingsCacheService.getCachedSnapshot.mockResolvedValue({
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
    });

    const getOfferings = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        current: {
          annual: createPackage(49.99, '$49.99'),
          monthly: null,
          weekly: null,
        },
      });

    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings,
        purchasePackage,
      },
    } as never);

    const { getByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Annual')).toBeTruthy();
      expect(getByText('Start Free Trial')).toBeTruthy();
    });

    fireEvent.press(getByText('Start Free Trial'));

    await waitFor(() => {
      expect(getOfferings).toHaveBeenCalledTimes(2);
      expect(purchasePackage).toHaveBeenCalledTimes(1);
      expect(syncCustomerInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlements: expect.objectContaining({
            active: expect.objectContaining({
              pro: expect.any(Object),
            }),
          }),
        })
      );
    });
  });

  it('does not render the weekly option when no weekly package is available', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({
          current: {
            annual: {
              identifier: '$49.99-package',
              product: {
                price: 49.99,
                priceString: '$49.99',
                introPrice: null,
              },
            },
            monthly: {
              identifier: '$6.99-package',
              product: {
                price: 6.99,
                priceString: '$6.99',
                introPrice: null,
              },
            },
            weekly: null,
          },
        }),
        purchasePackage: jest.fn(),
      },
    } as never);

    const { queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(queryByText('Annual')).toBeTruthy();
    });

    expect(queryByText('Weekly')).toBeNull();
  });

  it('shows a build configuration message when the RevenueCat SDK key is missing', async () => {
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: 'missing_api_key',
      runtimeAvailable: true,
      apiKeyAvailable: false,
    });
    mockedGetRevenueCatRuntime.mockReturnValue(createRevenueCatRuntime());

    const { getAllByText, getByTestId } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="aha_moment"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('paywall-plans-fallback')).toBeTruthy();
    });

    expect(
      getAllByText(
        'Subscriptions are not configured in this build. Add the RevenueCat SDK key to the build environment and rebuild.'
      ).length
    ).toBeGreaterThan(0);
  });

  it('offers the native RevenueCat paywall fallback when package metadata cannot be loaded', async () => {
    const presentNativePaywall = jest.fn().mockResolvedValue('cancelled');
    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        canPresentNativePaywall: true,
        presentNativePaywall,
      })
    );
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockRejectedValue(new Error('network')),
        purchasePackage: jest.fn(),
      },
    } as never);

    const { getByTestId } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('paywall-native-fallback')).toBeTruthy();
    });

    fireEvent.press(getByTestId('paywall-native-fallback'));

    await waitFor(() => {
      expect(presentNativePaywall).toHaveBeenCalled();
    });
  });

  it('falls back to the native RevenueCat paywall when only cached plan metadata is available', async () => {
    const presentNativePaywall = jest.fn().mockResolvedValue('purchased');
    const syncCustomerInfo = jest.fn();
    mockedUseSubscription.mockReturnValue(
      createSubscriptionMock({
        canPresentNativePaywall: true,
        presentNativePaywall,
        syncCustomerInfo,
      })
    );
    mockedGetRevenueCatAvailability.mockReturnValue({
      reason: null,
      runtimeAvailable: true,
      apiKeyAvailable: true,
    });
    mockedRevenueCatOfferingsCacheService.getCachedSnapshot.mockResolvedValue({
      annual: {
        identifier: 'annual-cached',
        price: 49.99,
        priceString: '$49.99',
        hasTrial: false,
        trialCycles: null,
        trialPeriodUnit: null,
        trialPeriodNumberOfUnits: null,
      },
      monthly: null,
      weekly: null,
      updatedAt: Date.now(),
    });

    const getCustomerInfo = jest.fn().mockResolvedValue({
      entitlements: { active: { pro: { periodType: 'NORMAL' } } },
    });
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({ current: null }),
        getCustomerInfo,
        purchasePackage: jest.fn(),
      },
    } as never);

    const { getByTestId, getByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
        entryPoint="feature_gate"
        onboardingData={{
          rosterType: 'rotating',
          country: 'Australia',
          painPoint: 'family',
          patternType: ShiftPattern.STANDARD_4_4_4,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Annual')).toBeTruthy();
    });

    fireEvent.press(getByTestId('paywall-cta'));

    await waitFor(() => {
      expect(presentNativePaywall).toHaveBeenCalled();
      expect(getCustomerInfo).toHaveBeenCalled();
      expect(getByText('Your subscription is active')).toBeTruthy();
    });
  });
});
