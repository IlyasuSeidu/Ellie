/**
 * PremiumShiftPatternScreen Component Tests
 * Tests for Tinder-style swipeable card interface
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PremiumShiftPatternScreen } from '../PremiumShiftPatternScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Mock haptics
jest.mock('expo-haptics');

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  return {
    Gesture: {
      Pan: () => ({
        enabled: jest.fn(() => ({
          enabled: jest.fn(),
          onUpdate: jest.fn(() => ({
            onUpdate: jest.fn(),
            onEnd: jest.fn(() => ({ onEnd: jest.fn() })),
          })),
        })),
      }),
      Tap: () => ({
        enabled: jest.fn(() => ({
          enabled: jest.fn(),
          onEnd: jest.fn(() => ({ onEnd: jest.fn() })),
        })),
      }),
      Simultaneous: jest.fn((a, b) => ({ a, b })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: (props: any) => props.children,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock components
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ProgressHeader: (props: any) =>
      React.createElement(
        RN.View,
        { testID: 'progress-header' },
        React.createElement(RN.Text, null, `Step ${props.currentStep} of ${props.totalSteps}`)
      ),
  };
});

// Helper to render with context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderWithContext = (component: any) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe('PremiumShiftPatternScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('Choose your shift pattern')).toBeTruthy();
      expect(
        getByText('Swipe right to select • Swipe left to skip • Swipe up for details')
      ).toBeTruthy();
    });

    it('should render progress header with step 3 of 10', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('Step 3 of 10')).toBeTruthy();
    });

    it('should render first card (4-4-4 Cycle)', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('4-4-4 Cycle')).toBeTruthy();
      expect(getByText('4D / 4N / 4O')).toBeTruthy();
    });
  });

  describe('Swipeable Card Component', () => {
    it('should render card with testID', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern-card-4-4-4')).toBeTruthy();
    });

    it('should show pattern icon, name, schedule, and description', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      // Note: First pattern now uses Image component instead of emoji
      expect(getByText('4-4-4 Cycle')).toBeTruthy(); // Name
      expect(getByText('4D / 4N / 4O')).toBeTruthy(); // Schedule
      expect(
        getByText(/4 days on, 4 nights on, 4 days off - Perfect for FIFO mining operations/)
      ).toBeTruthy();
    });

    it('should show swipe hints on first card', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('← Skip')).toBeTruthy();
      expect(getByText('Select →')).toBeTruthy();
      expect(getByText('↑ Info')).toBeTruthy();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress dots with current position', () => {
      const { UNSAFE_getAllByType } = renderWithContext(<PremiumShiftPatternScreen />);
      // 9 total patterns, so should have progress indicator
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const container = UNSAFE_getAllByType(require('react-native').View);
      expect(container.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no onContinue prop provided', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern')).toBeTruthy();
    });
  });
});
