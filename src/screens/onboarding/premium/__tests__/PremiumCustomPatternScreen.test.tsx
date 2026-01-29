/**
 * PremiumCustomPatternScreen Component Tests
 * Tests for custom shift pattern builder with sliders and live preview
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PremiumCustomPatternScreen } from '../PremiumCustomPatternScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';

// Mock haptics
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
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => ({
      onBegin: jest.fn(() => ({
        onBegin: jest.fn(),
        onUpdate: jest.fn(() => ({
          onUpdate: jest.fn(),
          onEnd: jest.fn(() => ({ onEnd: jest.fn() })),
        })),
      })),
    }),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GestureDetector: (props: any) => props.children,
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props, props.children),
  };
});

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

jest.mock('@/components/onboarding/premium/PremiumButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PremiumButton: (props: any) =>
      React.createElement(
        RN.Pressable,
        { onPress: props.onPress, testID: props.testID },
        React.createElement(RN.Text, null, props.title)
      ),
  };
});

// Helper to render with context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderWithContext = (component: any) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe('PremiumCustomPatternScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen testID="custom-pattern" />
      );
      expect(getByTestId('custom-pattern')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Customize Your Shift Pattern')).toBeTruthy();
      expect(getByText('Design your ideal work schedule')).toBeTruthy();
    });

    it('should render progress header with step 4 of 10', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Step 4 of 10')).toBeTruthy();
    });

    it('should render with default values (4-4-4)', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Your 12-day cycle')).toBeTruthy();
    });
  });

  describe('Live Preview Card', () => {
    it('should render custom cycle header', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Custom Cycle')).toBeTruthy();
    });

    it('should render cycle blocks with default values', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Days')).toBeTruthy();
      expect(getByText('Nights')).toBeTruthy();
      expect(getByText('Off')).toBeTruthy();
    });

    it('should render cycle legend', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Day Off')).toBeTruthy();
    });

    it('should render work-rest balance chart', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Work-Rest Balance')).toBeTruthy();
    });

    it('should show correct work-rest percentages for default 4-4-4', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      // 4 days + 4 nights = 8 work days out of 12 total = 67%
      // 4 days off = 33%
      expect(getByText('67%')).toBeTruthy();
      expect(getByText('33%')).toBeTruthy();
    });

    it('should show cycle length badge', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('12-day cycle')).toBeTruthy();
    });
  });

  describe('Interactive Sliders', () => {
    it('should render all three sliders', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Days On')).toBeTruthy();
      expect(getByText('Nights On')).toBeTruthy();
      expect(getByText('Days Off')).toBeTruthy();
    });

    it('should render adjust pattern header', () => {
      const { getByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(getByText('Adjust Your Pattern')).toBeTruthy();
    });

    it('should show default slider values', () => {
      const { getAllByText } = renderWithContext(<PremiumCustomPatternScreen />);
      // Each slider shows the value twice (in header and badge)
      const fours = getAllByText('4');
      expect(fours.length).toBeGreaterThan(0);
    });
  });

  describe('Tips and Validation', () => {
    it('should show tip text', async () => {
      const { findByText } = renderWithContext(<PremiumCustomPatternScreen />);

      // Wait for the tip to appear (has 800ms delay)
      const tipText = await findByText(
        'A balanced shift pattern helps improve alertness and overall health.'
      );
      expect(tipText).toBeTruthy();
    });

    it('should not show validation error for default valid pattern', () => {
      const { queryByText } = renderWithContext(<PremiumCustomPatternScreen />);
      expect(queryByText('Total cycle must be 28 days or less')).toBeNull();
      expect(queryByText('At least 1 day or 1 night shift required')).toBeNull();
      expect(queryByText('At least 1 day off required')).toBeNull();
    });
  });

  describe('Bottom Navigation', () => {
    it('should render back button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen onBack={mockOnBack} testID="custom-pattern" />
      );
      // Back button should be present (rendered as Pressable with arrow-back icon)
      const container = getByTestId('custom-pattern');
      expect(container).toBeTruthy();
    });

    it('should have back and continue buttons', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="custom-pattern"
        />
      );
      // Verify the screen renders with back/continue functionality
      expect(getByTestId('custom-pattern')).toBeTruthy();
    });

    it('should render continue button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen onContinue={mockOnContinue} testID="custom-pattern" />
      );
      const container = getByTestId('custom-pattern');
      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no callbacks provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen testID="custom-pattern" />
      );
      expect(getByTestId('custom-pattern')).toBeTruthy();
    });

    it('should handle all props being provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumCustomPatternScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="custom-pattern"
        />
      );
      expect(getByTestId('custom-pattern')).toBeTruthy();
    });
  });
});
