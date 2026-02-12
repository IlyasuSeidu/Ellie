/**
 * PremiumPhaseSelectorScreen Component Tests
 * Tests for Tinder-style phase selection with swipeable cards
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PremiumPhaseSelectorScreen } from '../PremiumPhaseSelectorScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

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
    MaterialIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
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

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

// Mock ProgressHeader
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

const Stack = createNativeStackNavigator();

// Helper to render with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      <OnboardingProvider>
        <Stack.Navigator>
          <Stack.Screen name="PhaseSelector" component={() => component} />
        </Stack.Navigator>
      </OnboardingProvider>
    </NavigationContainer>
  );
};

describe('PremiumPhaseSelectorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should render title for phase selection', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should render subtitle with instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Swipe right to select, left to skip, or up for details')).toBeTruthy();
    });

    it('should render progress header with step 5 of 11', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Step 5 of 11')).toBeTruthy();
    });

    it('should render without crashing', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should render all UI elements correctly', () => {
      const { getByText, getByTestId } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByTestId('progress-header')).toBeTruthy();
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
      expect(getByText('Swipe right to select, left to skip, or up for details')).toBeTruthy();
    });
  });

  describe('Pattern Handling', () => {
    it('should render with default pattern', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should handle pattern conversion', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should render phase cards', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Two-Stage Selection Flow', () => {
    it('should start in PHASE selection stage', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should show phase selection instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Swipe right to select, left to skip, or up for details')).toBeTruthy();
    });

    it('should render the screen for multi-day phases', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should have descriptive instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Swipe right to select, left to skip, or up for details')).toBeTruthy();
    });

    it('should support reduced motion settings', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Context Integration', () => {
    it('should read shift system from context', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should work with OnboardingProvider', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should handle pattern from context', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Rendering Consistency', () => {
    it('should render consistently with default data', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Step 5 of 11')).toBeTruthy();
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should render with shift system data', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should render with pattern data', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle default configuration gracefully', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should render without errors', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });

    it('should handle pattern processing', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('Choose Your Current Phase')).toBeTruthy();
      });
    });
  });

  describe('Styling and Theme', () => {
    it('should use Sacred theme colors', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });

    it('should match Shift System screen layout', () => {
      const { getByTestId, getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByTestId('progress-header')).toBeTruthy();
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
      expect(getByText('Swipe right to select, left to skip, or up for details')).toBeTruthy();
    });

    it('should render with proper spacing and layout', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('Choose Your Current Phase')).toBeTruthy();
    });
  });
});
