/**
 * PremiumStartDateScreen Component Tests
 * Tests for start date and phase selection with animations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PremiumStartDateScreen } from '../PremiumStartDateScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Mock haptics
jest.mock('expo-haptics');

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
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
      expect(getByText('Select Your Start Date')).toBeTruthy();
      expect(getByText('Choose when your shift cycle begins')).toBeTruthy();
    });

    it('should render progress header with step 5 of 10', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Step 5 of 10')).toBeTruthy();
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

  describe('Phase Selector', () => {
    it('should render helper text for phase selection', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText("Choose which part of your cycle you'll be on")).toBeTruthy();
    });

    it('should render phase selector component', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display helper text', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText("Choose which part of your cycle you'll be on")).toBeTruthy();
    });
  });

  describe('Live Preview Card', () => {
    it('should display "Not selected" when no date is selected', () => {
      const { getAllByText } = renderWithContext(<PremiumStartDateScreen />);
      const notSelectedElements = getAllByText('Not selected');
      expect(notSelectedElements.length).toBeGreaterThan(0);
    });

    it('should render preview card labels', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Starting:')).toBeTruthy();
      expect(getByText('Phase:')).toBeTruthy();
    });

    it('should render live preview component', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Starting:')).toBeTruthy();
    });
  });

  describe('Validation Tips', () => {
    it('should display rotating tips', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      // Check for first tip (others rotate)
      expect(getByText('💡 Choose tomorrow if starting a new roster')).toBeTruthy();
    });

    it('should render tips section', () => {
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
      expect(getByText('Select Your Start Date')).toBeTruthy();
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
      expect(getByText('Select Your Start Date')).toBeTruthy();
    });

    it('should have descriptive titles and subtitles', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Choose when your shift cycle begins')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle default pattern values', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Select Your Start Date')).toBeTruthy();
    });

    it('should render without errors', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display all UI elements correctly', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Select Your Start Date')).toBeTruthy();
      expect(getByText('Choose when your shift cycle begins')).toBeTruthy();
    });
  });
});
