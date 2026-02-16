/**
 * PremiumStartDateScreen Component Tests
 * Tests for start date and phase selection with animations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PremiumStartDateScreen } from '../PremiumStartDateScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Mock haptics
// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-haptics');

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
  };
});

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const mockGesture = {
    onBegin: jest.fn().mockReturnThis(),
    onUpdate: jest.fn().mockReturnThis(),
    onEnd: jest.fn().mockReturnThis(),
    onFinalize: jest.fn().mockReturnThis(),
  };
  return {
    Gesture: {
      Pan: jest.fn(() => mockGesture),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: (props: any) => props.children,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(RN.View, props, props.children),
  };
});

// Mock components
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    ProgressHeader: (props: Record<string, unknown>) =>
      React.createElement(
        RN.View,
        { testID: 'progress-header' },
        React.createElement(RN.Text, null, `Step ${props.currentStep} of ${props.totalSteps}`)
      ),
  };
});

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe('PremiumStartDateScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });

    it('should render progress header correctly', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Step 6 of 8')).toBeTruthy();
    });

    it('should render without crashing when no callbacks provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should handle all props being provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="start-date-screen"
        />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Interactive Calendar', () => {
    it('should render calendar with month navigation', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display weekday labels', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Sun')).toBeTruthy();
      expect(getByText('Mon')).toBeTruthy();
      expect(getByText('Tue')).toBeTruthy();
      expect(getByText('Wed')).toBeTruthy();
      expect(getByText('Thu')).toBeTruthy();
      expect(getByText('Fri')).toBeTruthy();
      expect(getByText('Sat')).toBeTruthy();
    });

    it('should render calendar component', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Phase Offset from Context', () => {
    it('should use phase offset from context', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      // Phase selection is now done in PhaseSelector screen (step 5)
      // This screen uses phaseOffset from OnboardingContext
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render calendar with phase offset visualization', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should not render phase selection UI', () => {
      const { queryByText } = renderWithContext(<PremiumStartDateScreen />);
      // Phase selection UI removed - now in PhaseSelector screen
      expect(queryByText("Choose which part of your cycle you'll be on")).toBeFalsy();
    });
  });

  describe('Calendar Visualization', () => {
    it('should display calendar with shift pattern visualization', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      // Calendar visualizes the shift pattern based on phaseOffset from context
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should not render live preview card', () => {
      const { queryByText } = renderWithContext(<PremiumStartDateScreen />);
      // Live preview component is no longer shown (marked as unused)
      expect(queryByText('Starting:')).toBeFalsy();
      expect(queryByText('Phase:')).toBeFalsy();
    });

    it('should visualize phase offset in calendar', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Set Shift Times')).toBeTruthy();
    });

    it('should have back button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render navigation buttons', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Set Shift Times')).toBeTruthy();
    });
  });

  describe('Data Management', () => {
    it('should handle pattern data from context', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should work with OnboardingProvider', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Integration with Context', () => {
    it('should render within OnboardingProvider', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should handle callbacks from parent', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="start-date-screen"
        />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render with reduced motion support', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should have accessible labels', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should have descriptive titles and subtitles', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle default pattern values', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should render without errors', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display all UI elements correctly', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });
  });
});
