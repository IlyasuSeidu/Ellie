import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { PaywallScreen } from '../PaywallScreen';
import { ShiftPattern } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getRevenueCatRuntime, isRevenueCatAvailable } from '@/services/RevenueCatRuntime';

const mockOnDismiss = jest.fn();
const mockRestorePurchases = jest.fn().mockResolvedValue({
  entitlements: { active: { pro: {} } },
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatRuntime: jest.fn(() => null),
  isRevenueCatAvailable: jest.fn(() => false),
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

const mockedAnalytics = jest.mocked(Analytics);
const mockedGetRevenueCatRuntime = jest.mocked(getRevenueCatRuntime);
const mockedIsRevenueCatAvailable = jest.mocked(isRevenueCatAvailable);

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-20T00:00:00Z'));
    mockedGetRevenueCatRuntime.mockReturnValue(null);
    mockedIsRevenueCatAvailable.mockReturnValue(false);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders personalized title and fifo-specific first feature row', () => {
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

    expect(getByText('Ilyasu, your roster is ready.')).toBeTruthy();
    expect(
      getByText('Your FIFO cycle is mapped. See every swing, every day off, for your full year.')
    ).toBeTruthy();
    expect(getByText('See your full year — every work block, every R&R')).toBeTruthy();
    expect(
      getByText(
        'Your 7-day free trial ends March 27, 2026. Cancel anytime in Settings before then to avoid charges. Subscriptions renew automatically.'
      )
    ).toBeTruthy();
    expect(queryByText(/Introductory offer ends in/i)).toBeNull();
  });

  it('renders plans and CTA before the supporting feature and testimonial content', () => {
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

  it('keeps the primary CTA label on one line with font fitting enabled', () => {
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

    const ctaLabel = getByText('Start Free Trial');

    expect(ctaLabel.props.numberOfLines).toBe(1);
    expect(ctaLabel.props.adjustsFontSizeToFit).toBe(true);
    expect(ctaLabel.props.minimumFontScale).toBe(0.84);
  });

  it('tracks restore tap and dismiss metadata', async () => {
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({
          current: {
            annual: null,
            monthly: null,
            weekly: null,
          },
        }),
        restorePurchases: mockRestorePurchases,
      },
    } as never);

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
    mockedIsRevenueCatAvailable.mockReturnValue(true);
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({
          current: {
            annual: null,
            monthly: {
              product: {
                price: 6.99,
                priceString: '$6.99',
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

    fireEvent.press(getByText('Start Free Trial'));
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

  it('does not render the weekly option when no weekly package is available', async () => {
    mockedIsRevenueCatAvailable.mockReturnValue(true);
    mockedGetRevenueCatRuntime.mockReturnValue({
      Purchases: {
        getOfferings: jest.fn().mockResolvedValue({
          current: {
            annual: {
              product: {
                price: 49.99,
                priceString: '$49.99',
              },
            },
            monthly: {
              product: {
                price: 6.99,
                priceString: '$6.99',
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
});
