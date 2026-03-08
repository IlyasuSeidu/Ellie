/**
 * Regression tests for stage detection on standard patterns.
 *
 * Ensures stale customPattern data does not reduce required stages
 * when the user selected a standard (non-custom) pattern.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { PremiumShiftTimeInputScreen } from '../PremiumShiftTimeInputScreen';
import { ShiftPattern } from '@/types';

// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock haptics
jest.mock('expo-haptics');

// Mock icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const MockIcon = (props: Record<string, unknown>) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
  };
});

// Mock navigation
let mockRouteParams: Record<string, unknown> | undefined;
const mockNavigationGoBack = jest.fn();
const mockNavigationNavigate = jest.fn();
const mockNavigationAddListener = jest.fn(() => jest.fn());
const mockRootGoBack = jest.fn();
const mockRootReset = jest.fn();
const mockGetParent = jest.fn(() => ({
  canGoBack: () => true,
  goBack: mockRootGoBack,
  reset: mockRootReset,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigationNavigate,
    goBack: mockNavigationGoBack,
    addListener: mockNavigationAddListener,
    getParent: mockGetParent,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock progress header
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    ProgressHeader: (props: { currentStep: number; totalSteps: number }) =>
      React.createElement(
        RN.View,
        { testID: 'progress-header' },
        React.createElement(RN.Text, null, `Step ${props.currentStep} of ${props.totalSteps}`)
      ),
  };
});

let mockOnboardingData: Record<string, unknown> = {
  shiftSystem: '2-shift',
  rosterType: 'rotating',
  patternType: ShiftPattern.STANDARD_4_4_4,
  // Stale data from a prior custom run; should be ignored for standard patterns
  customPattern: {
    daysOn: 4,
    nightsOn: 0,
    daysOff: 3,
  },
};

jest.mock('@/contexts/OnboardingContext', () => ({
  ...jest.requireActual('@/contexts/OnboardingContext'),
  useOnboarding: () => ({
    data: mockOnboardingData,
    updateData: jest.fn(),
    resetData: jest.fn(),
  }),
}));

const renderScreen = () =>
  render(
    <NavigationContainer>
      <PremiumShiftTimeInputScreen />
    </NavigationContainer>
  );

describe('PremiumShiftTimeInputScreen - Standard Pattern Stages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockGetParent.mockReturnValue({
      canGoBack: () => true,
      goBack: mockRootGoBack,
      reset: mockRootReset,
    });
  });

  it('uses 2 stages for standard 2-shift patterns even with stale customPattern', async () => {
    mockOnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
      customPattern: {
        daysOn: 4,
        nightsOn: 0,
        daysOff: 3,
      },
    };

    const { getByText, getAllByText } = renderScreen();

    expect(getByText('Step 1 of 2')).toBeTruthy();
    fireEvent.press(getAllByText(/6:00 AM/i)[0]);
    fireEvent.press(getByText('Next Shift Type'));

    await waitFor(() => {
      expect(getByText('Step 2 of 2')).toBeTruthy();
      expect(getByText('Night Shift Times')).toBeTruthy();
    });
  });

  it('uses 3 stages for standard 3-shift patterns even with stale customPattern', () => {
    mockOnboardingData = {
      shiftSystem: '3-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.CONTINENTAL,
      customPattern: {
        daysOn: 0,
        nightsOn: 0,
        morningOn: 5,
        afternoonOn: 0,
        nightOn: 0,
        daysOff: 2,
      },
    };

    const { getByText } = renderScreen();
    expect(getByText('Step 1 of 3')).toBeTruthy();
    expect(getByText('Morning Shift Times')).toBeTruthy();
  });

  it('opens at the requested stage when initialShiftType is provided', () => {
    mockRouteParams = { initialShiftType: 'night' };
    mockOnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
    };

    const { getByText } = renderScreen();
    expect(getByText('Step 2 of 2')).toBeTruthy();
    expect(getByText('Night Shift Times')).toBeTruthy();
  });

  it('returns to settings from first stage when entered from settings', () => {
    mockRouteParams = {
      entryPoint: 'settings',
      returnToMainOnSelect: true,
      initialShiftType: 'day',
    };
    mockOnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
    };

    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Go back'));

    expect(mockRootGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows morning detection for 5:00 AM early morning preset in 3-shift mode', () => {
    mockOnboardingData = {
      shiftSystem: '3-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.CONTINENTAL,
    };

    const { getAllByText, getByText, queryByText } = renderScreen();

    fireEvent.press(getAllByText(/5:00 AM/i)[0]);

    expect(getByText('Morning start')).toBeTruthy();
    expect(queryByText('Night start')).toBeNull();
  });

  it('uses the standard FIFO preset work pattern instead of stale fifoConfig work pattern', () => {
    mockOnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'fifo',
      patternType: ShiftPattern.FIFO_8_6,
      // Stale from a prior custom FIFO setup; should be ignored for standard FIFO patterns
      fifoConfig: {
        workBlockDays: 10,
        restBlockDays: 10,
        workBlockPattern: 'straight-days',
      },
    };

    const { getByText, queryByText } = renderScreen();
    expect(queryByText('Step 1 of 2')).toBeNull();
    expect(getByText(/Single shift profile/i)).toBeTruthy();
    expect(queryByText('Night Shift Times')).toBeNull();
    expect(getByText(/6:00 AM/i)).toBeTruthy();
    expect(queryByText(/Ends at 6:00 AM/i)).toBeNull();
  });

  it('keeps custom FIFO work pattern behavior for FIFO custom patterns', () => {
    mockOnboardingData = {
      shiftSystem: '2-shift',
      rosterType: 'fifo',
      patternType: ShiftPattern.FIFO_CUSTOM,
      fifoConfig: {
        workBlockDays: 14,
        restBlockDays: 14,
        workBlockPattern: 'straight-days',
      },
    };

    const { queryByText } = renderScreen();
    expect(queryByText('Step 1 of 2')).toBeNull();
  });
});
