import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { PaywallScreen } from '../PaywallScreen';
import { ShiftPattern } from '@/types';

const mockOnDismiss = jest.fn();
const mockRestorePurchases = jest.fn().mockResolvedValue(undefined);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    restorePurchases: mockRestorePurchases,
  }),
}));

jest.mock('@/services/RevenueCatRuntime', () => ({
  getRevenueCatRuntime: () => null,
  isRevenueCatAvailable: () => false,
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
    trialStarted: jest.fn(),
  },
}));

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders personalized title and fifo-specific first feature row', () => {
    const { getByText, queryByText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
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
      getByText(
        'Your FIFO cycle is mapped. See every swing, every day off, for your next 3 months.'
      )
    ).toBeTruthy();
    expect(getByText('See your next 3 months — every work block, every R&R')).toBeTruthy();
    expect(queryByText(/Introductory offer ends in/i)).toBeNull();
  });

  it('renders plans and CTA before the supporting feature and testimonial content', () => {
    const { toJSON } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
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
    const ctaIndex = renderedTree.indexOf('Start Free 7-Day Trial');
    const featureIndex = renderedTree.indexOf(
      'See your next 3 months — every work block, every R&R'
    );
    const testimonialIndex = renderedTree.indexOf(
      'Sarah K., Underground miner — 12h rotating shifts'
    );

    expect(annualIndex).toBeGreaterThan(-1);
    expect(ctaIndex).toBeGreaterThan(annualIndex);
    expect(featureIndex).toBeGreaterThan(ctaIndex);
    expect(testimonialIndex).toBeGreaterThan(featureIndex);
  });

  it('tracks restore tap and dismiss metadata', async () => {
    const { getByText, getByLabelText } = render(
      <PaywallScreen
        onDismiss={mockOnDismiss}
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

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    fireEvent.press(getByLabelText('Close paywall'));
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});
