/**
 * PremiumPainHookScreen Component Tests
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PremiumPainHookScreen } from '../PremiumPainHookScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockGoBack = jest.fn();
const mockGoToNextScreen = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

jest.mock('@/utils/onboardingNavigation', () => ({
  goToNextScreen: (...args: unknown[]) => mockGoToNextScreen(...args),
}));

jest.mock('@/utils/analytics', () => ({
  Analytics: {
    onboardingStepViewed: jest.fn(),
    onboardingQuestionAnswered: jest.fn(),
    onboardingStepCompleted: jest.fn(),
  },
}));

const renderWithProviders = () =>
  render(
    <OnboardingProvider>
      <PremiumPainHookScreen />
    </OnboardingProvider>
  );

describe('PremiumPainHookScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the pain-hook step content', () => {
    const { getByTestId, getByText } = renderWithProviders();

    expect(getByTestId('pain-hook-screen')).toBeTruthy();
    expect(getByText("What's the hardest part of your roster right now?")).toBeTruthy();
    expect(getByTestId('pain-hook-card-cycle_lost')).toBeTruthy();
  });

  it('allows selecting a pain point and continuing', () => {
    const { getByTestId } = renderWithProviders();

    fireEvent.press(getByTestId('pain-hook-card-cycle_lost'));
    fireEvent.press(getByTestId('pain-hook-continue-button'));

    expect(mockGoToNextScreen).toHaveBeenCalledWith(
      expect.objectContaining({ goBack: mockGoBack }),
      'PainHook'
    );
  });
});
