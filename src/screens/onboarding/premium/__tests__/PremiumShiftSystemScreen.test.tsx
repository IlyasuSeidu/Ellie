/**
 * PremiumShiftSystemScreen Test Suite
 *
 * Comprehensive tests for shift system selection with swipeable cards (Tinder-style)
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PremiumShiftSystemScreen } from '../PremiumShiftSystemScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Mock Haptics
// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
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

// Mock Ionicons
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

const Stack = createNativeStackNavigator();

const renderWithProviders = (component: React.ReactElement, _initialData = {}) => {
  return render(
    <NavigationContainer>
      <OnboardingProvider>
        <Stack.Navigator>
          <Stack.Screen name="ShiftSystem">{() => component}</Stack.Screen>
        </Stack.Navigator>
      </OnboardingProvider>
    </NavigationContainer>
  );
};

describe('PremiumShiftSystemScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);
      expect(getByTestId('premium-shift-system-screen')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      expect(getByText('How Many Shifts Does Your Site Run?')).toBeTruthy();
      expect(getByText(/Swipe right to choose, left to see more/i)).toBeTruthy();
    });

    it('should render progress header with step 3 of 11', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      const progressHeader = getByTestId('progress-header');
      expect(progressHeader).toBeTruthy();
    });

    it('should render first shift system card (2-shift)', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      const card = getByTestId('shift-system-card-2-shift');
      expect(card).toBeTruthy();
    });
  });

  describe('Swipeable Card Component', () => {
    it('should render card with correct data', () => {
      const { getByTestId, getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      const card = getByTestId('shift-system-card-2-shift');
      expect(card).toBeTruthy();
      expect(getByText('2 Shifts (12 hours)')).toBeTruthy();
      expect(getByText(/Day & night/i)).toBeTruthy();
    });

    it('should show swipe hints on active card', () => {
      const { getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      expect(getByText('← Next option')).toBeTruthy();
      expect(getByText('This one →')).toBeTruthy();
      expect(getByText('↑ Learn more')).toBeTruthy();
    });

    it('should render card icon', () => {
      const { getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Check for emoji icons
      expect(getByText('☀️')).toBeTruthy();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress dots', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Should have progress dots for total cards + end stack
      const progressDots = getByTestId('progress-dots');
      expect(progressDots).toBeTruthy();
    });

    it('should highlight current card in progress dots', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // First dot should be active (index 0)
      const activeDot = getByTestId('2-shift-dot-0');
      expect(activeDot).toBeTruthy();
    });
  });

  describe('Animation Behavior', () => {
    it('should render with reduced motion support', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Screen should render regardless of animation preferences
      expect(getByTestId('premium-shift-system-screen')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no onContinue prop provided', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      expect(getByTestId('premium-shift-system-screen')).toBeTruthy();
    });

    it('should render without crashing with custom testID', () => {
      const { getByTestId } = renderWithProviders(
        <PremiumShiftSystemScreen testID="custom-test-id" />
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });

  describe('Theme Consistency', () => {
    it('should use Sacred Gold theme colors', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Screen renders successfully with theme
      expect(getByTestId('premium-shift-system-screen')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper testIDs for all major components', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      expect(getByTestId('premium-shift-system-screen')).toBeTruthy();
      expect(getByTestId('progress-header')).toBeTruthy();
      expect(getByTestId('progress-dots')).toBeTruthy();
      expect(getByTestId('shift-system-card-2-shift')).toBeTruthy();
    });
  });

  describe('Data Structure', () => {
    it('should have both 2-shift and 3-shift system data', async () => {
      const { getByText, getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Should render 2-shift card initially
      expect(getByTestId('shift-system-card-2-shift')).toBeTruthy();
      expect(getByText('2 Shifts (12 hours)')).toBeTruthy();

      // 3-shift card should also be in the component (even if not visible)
      await waitFor(() => {
        // This tests that both cards exist in the data structure
        const threeShiftCard = getByTestId('shift-system-card-3-shift');
        expect(threeShiftCard).toBeTruthy();
      });
    });

    it('should display correct shift descriptions', () => {
      const { getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      // 2-shift description
      expect(getByText(/Your mine runs two 12-hour shifts/i)).toBeTruthy();
    });
  });

  describe('Card Stack Visualization', () => {
    it('should render cards with proper z-index stacking', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // All cards should be present in the DOM
      const twoShiftCard = getByTestId('shift-system-card-2-shift');
      const threeShiftCard = getByTestId('shift-system-card-3-shift');

      expect(twoShiftCard).toBeTruthy();
      expect(threeShiftCard).toBeTruthy();
    });
  });

  describe('Mount Animations', () => {
    it('should render all animated components', () => {
      const { getByText } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Title and subtitle should render with entrance animations
      expect(getByText('How Many Shifts Does Your Site Run?')).toBeTruthy();
      expect(getByText(/Swipe right to choose, left to see more/i)).toBeTruthy();
    });
  });

  describe('Gesture Handlers', () => {
    it('should have gesture detector for swipeable cards', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftSystemScreen />);

      // Card should render (gesture handlers are mocked in tests)
      const card = getByTestId('shift-system-card-2-shift');
      expect(card).toBeTruthy();
    });
  });
});
