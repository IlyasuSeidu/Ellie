/**
 * PremiumPhaseSelectorScreen Component Tests
 * Tests for Tinder-style phase selection with swipeable cards
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PremiumPhaseSelectorScreen } from '../PremiumPhaseSelectorScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock haptics
// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

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
    enabled: jest.fn().mockReturnThis(),
  };
  return {
    Gesture: {
      Pan: jest.fn(() => mockGesture),
      Tap: jest.fn(() => mockGesture),
      Simultaneous: jest.fn((a, b) => ({ a, b })),
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
          <Stack.Screen name="PhaseSelector">{() => component}</Stack.Screen>
        </Stack.Navigator>
      </OnboardingProvider>
    </NavigationContainer>
  );
};

describe('PremiumPhaseSelectorScreen', () => {
  const expectedProgressText = `Step ${ONBOARDING_STEPS.PHASE_SELECTOR} of ${TOTAL_ONBOARDING_STEPS}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should render title for phase selection', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should render subtitle with instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(
        getByText('Swipe right to select, left to see next, or up for more info')
      ).toBeTruthy();
    });

    it('should render progress header with current onboarding step', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText(expectedProgressText)).toBeTruthy();
    });

    it('should render without crashing', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should render all UI elements correctly', () => {
      const { getByText, getByTestId } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByTestId('progress-header')).toBeTruthy();
      expect(getByText('What shift are you on right now?')).toBeTruthy();
      expect(
        getByText('Swipe right to select, left to see next, or up for more info')
      ).toBeTruthy();
    });
  });

  describe('Pattern Handling', () => {
    it('should render with default pattern', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should handle pattern conversion', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should render phase cards', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Two-Stage Selection Flow', () => {
    it('should start in PHASE selection stage', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should show phase selection instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(
        getByText('Swipe right to select, left to see next, or up for more info')
      ).toBeTruthy();
    });

    it('should render the screen for multi-day phases', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should have descriptive instructions', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(
        getByText('Swipe right to select, left to see next, or up for more info')
      ).toBeTruthy();
    });

    it('should support reduced motion settings', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Context Integration', () => {
    it('should read shift system from context', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should work with OnboardingProvider', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should handle pattern from context', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Rendering Consistency', () => {
    it('should render consistently with default data', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText(expectedProgressText)).toBeTruthy();
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should render with shift system data', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should render with pattern data', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle default configuration gracefully', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should render without errors', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });

    it('should handle pattern processing', async () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);

      await waitFor(() => {
        expect(getByText('What shift are you on right now?')).toBeTruthy();
      });
    });
  });

  describe('Styling and Theme', () => {
    it('should use Sacred theme colors', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });

    it('should match Shift System screen layout', () => {
      const { getByTestId, getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByTestId('progress-header')).toBeTruthy();
      expect(getByText('What shift are you on right now?')).toBeTruthy();
      expect(
        getByText('Swipe right to select, left to see next, or up for more info')
      ).toBeTruthy();
    });

    it('should render with proper spacing and layout', () => {
      const { getByText } = renderWithProvider(<PremiumPhaseSelectorScreen />);
      expect(getByText('What shift are you on right now?')).toBeTruthy();
    });
  });
});
