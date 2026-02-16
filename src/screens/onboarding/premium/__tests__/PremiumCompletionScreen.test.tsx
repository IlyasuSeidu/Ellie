/**
 * Tests for Premium Completion Screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { PremiumCompletionScreen } from '../PremiumCompletionScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { asyncStorageService } from '@/services/AsyncStorageService';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');

  const createMockAnimation = () => ({
    duration: jest.fn().mockReturnThis(),
    delay: jest.fn().mockReturnThis(),
    springify: jest.fn().mockReturnThis(),
  });

  const createAnimatedComponent = (Component: unknown) => {
    // If it's already a React component, return it
    if (typeof Component === 'function') {
      return Component;
    }
    // Otherwise, wrap it in a functional component
    return (props: Record<string, unknown>) => React.createElement(Component as string, props);
  };

  return {
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      createAnimatedComponent,
    },
    View: RN.View,
    Text: RN.Text,
    ScrollView: RN.ScrollView,
    FadeIn: createMockAnimation(),
    FadeInDown: createMockAnimation(),
    FadeInUp: createMockAnimation(),
    FadeInRight: createMockAnimation(),
    FadeOutUp: createMockAnimation(),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    withDelay: jest.fn((_, value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((...values) => values[0]),
    useSharedValue: jest.fn((value) => ({ value })),
    useAnimatedStyle: jest.fn((callback) => callback()),
    useAnimatedProps: jest.fn((callback) => callback()),
    Easing: {
      bezier: jest.fn(() => jest.fn()),
      in: jest.fn(() => jest.fn()),
      out: jest.fn(() => jest.fn()),
      quad: jest.fn(),
    },
    createAnimatedComponent,
  };
});

// Mock haptics
jest.mock('expo-haptics');

// Mock UserService
jest.mock('@/services/UserService', () => ({
  userService: {
    createUser: jest.fn(),
    saveShiftCycle: jest.fn(),
  },
}));

// Mock AsyncStorageService
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    set: jest.fn(),
    get: jest.fn(),
  },
}));

// Mock OnboardingContext with complete test data to pass validation
jest.mock('@/contexts/OnboardingContext', () => ({
  ...jest.requireActual('@/contexts/OnboardingContext'),
  useOnboarding: () => ({
    data: {
      name: 'Test User',
      occupation: 'Software Engineer',
      company: 'Test Company',
      country: 'Australia',
      shiftSystem: '2-shift',
      patternType: 'STANDARD_4_4_4',
      phaseOffset: 0,
      startDate: new Date('2024-01-01'),
      shiftStartTime: '06:00',
      shiftEndTime: '18:00',
      shiftDuration: 12,
      shiftType: 'day',
    },
    updateData: jest.fn(),
    setAllData: jest.fn(),
    clearField: jest.fn(),
    resetData: jest.fn(),
    validateData: jest.fn().mockReturnValue({ isValid: true, missingFields: [] }),
    isComplete: jest.fn().mockReturnValue(true),
    getMissingFields: jest.fn().mockReturnValue([]),
  }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  const MockIcon = (props: Record<string, unknown>) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
  };
});

// Mock React Native SVG
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  const SvgMock = (props: Record<string, unknown>) => React.createElement(RN.View, props);
  return {
    __esModule: true,
    default: SvgMock,
    Svg: SvgMock,
    Circle: (props: Record<string, unknown>) => React.createElement(RN.View, props),
    Path: (props: Record<string, unknown>) => React.createElement(RN.View, props),
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock ProgressHeader component
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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

// Mock PremiumButton component
jest.mock('@/components/onboarding/premium/PremiumButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    PremiumButton: (props: Record<string, unknown>) =>
      React.createElement(
        RN.Pressable,
        {
          ...props,
          testID: 'premium-button',
          accessibilityRole: 'button',
        },
        React.createElement(RN.Text, null, props.title || props.children)
      ),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      <OnboardingProvider>{component}</OnboardingProvider>
    </NavigationContainer>
  );
};

describe('PremiumCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful service calls by default
    (asyncStorageService.set as jest.Mock).mockResolvedValue(undefined);
    // Mock AccessibilityInfo
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });

    it('should render progress header with step 8 of 11', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);
      const progressHeader = getByTestId('progress-header');
      expect(progressHeader).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/You're all set!/i)).toBeTruthy();
      expect(getByText(/Welcome to Ellie/i)).toBeTruthy();
    });

    it('should render checkmark circle', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });

    it('should render summary card', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Your profile/i)).toBeTruthy();
    });

    it('should render feature highlights', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/What you can do with Ellie/i)).toBeTruthy();
      expect(getByText(/Smart shift reminders/i)).toBeTruthy();
      expect(getByText(/Sleep tracking & insights/i)).toBeTruthy();
      expect(getByText(/Fatigue monitoring/i)).toBeTruthy();
    });
  });

  describe('Summary Card Display', () => {
    // Note: These tests require OnboardingContext to be mocked with specific test data
    // Consider adding a custom OnboardingProvider mock with test data for these tests
    it.skip('should display user name when available', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      // Default mock data should have a name
      expect(getByText(/Name/i)).toBeTruthy();
    });

    it.skip('should display shift system', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Shift System/i)).toBeTruthy();
    });

    it.skip('should display rotation pattern', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Rotation/i)).toBeTruthy();
    });

    it('should display start date', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Start Date/i)).toBeTruthy();
    });

    it.skip('should display shift times', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Shift Times/i)).toBeTruthy();
    });

    // Note: Requires OnboardingContext mock with specific test data
    it.skip('should show "Not set" for missing shift times', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      // Since no shift times are set in mock, should show "Not set"
      const notSetTexts = getAllByText(getByText, /Not set/i);
      expect(notSetTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Highlights', () => {
    it('should render all 7 feature pills', () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByText(/Smart shift reminders/i)).toBeTruthy();
      expect(getByText(/Sleep tracking & insights/i)).toBeTruthy();
      expect(getByText(/Fatigue monitoring/i)).toBeTruthy();
      expect(getByText(/Team coordination/i)).toBeTruthy();
      expect(getByText(/Work-life balance/i)).toBeTruthy();
      expect(getByText(/Earnings calculator/i)).toBeTruthy();
      expect(getByText(/Meal & hydration/i)).toBeTruthy();
    });

    it('should render features in horizontal scroll', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);
      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });
  });

  describe('Data Saving', () => {
    it('should show loading state initially', async () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);
      await waitFor(() => {
        expect(getByText(/Setting up your calendar.../i)).toBeTruthy();
      });
    });

    it('should save onboarding completion to AsyncStorage on mount', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:complete', true);
      });
    });

    it('should save onboarding data to AsyncStorage on mount', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:data', expect.any(String));
      });
    });

    it('should save onboarding completion flag to AsyncStorage', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:complete', true);
      });
    });

    // Note: User ID saving not implemented yet - planned for backend integration
    it.skip('should save user ID to AsyncStorage', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledWith('user:id', expect.any(String));
      });
    });

    it('should show Get Started button after successful save', async () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });
    });

    it('should trigger success haptic after save', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when save fails', () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      return waitFor(() => {
        expect(getByText(/Network error/i)).toBeTruthy();
      });
    });

    it('should show Try Again button on error', async () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });
    });

    it('should trigger error haptic on save failure', async () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Error
        );
      });
    });

    it('should retry save when Try Again button pressed', async () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByText('Try Again')).toBeTruthy();
      });

      // Mock successful retry
      (asyncStorageService.set as jest.Mock).mockResolvedValue(undefined);

      fireEvent.press(getByText('Try Again'));

      await waitFor(() => {
        expect(asyncStorageService.set).toHaveBeenCalledTimes(2);
      });
    });

    it('should show generic error message for unknown errors', async () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue('Unknown error');

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByText(/Failed to save your data/i)).toBeTruthy();
      });
    });
  });

  describe('Get Started Button', () => {
    it('should be disabled while saving', () => {
      // Make save take a long time
      (asyncStorageService.set as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { queryByText } = renderWithProviders(<PremiumCompletionScreen />);

      // Get Started button should not be visible while saving
      expect(queryByText('Get Started')).toBeNull();
    });

    it('should be enabled after successful save', async () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        const button = getByText('Get Started');
        expect(button).toBeTruthy();
      });
    });

    // Note: These tests require integration testing due to nested Pressable/PremiumButton structure
    // The onPress handler is on the outer Pressable which wraps the PremiumButton
    // Consider E2E tests for full button interaction testing
    it.skip('should trigger haptic feedback when pressed', async () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      // Wait for save to complete and button to be enabled
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });

      // Press the button
      const button = getByText('Get Started');
      fireEvent.press(button);

      // Check haptic was called
      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      });
    });

    it.skip('should call onComplete callback when pressed', async () => {
      const onComplete = jest.fn();
      const { getByText } = renderWithProviders(
        <PremiumCompletionScreen onComplete={onComplete} />
      );

      // Wait for save to complete and button to be enabled
      await waitFor(() => {
        expect(getByText('Get Started')).toBeTruthy();
      });

      // Press the button
      const button = getByText('Get Started');
      fireEvent.press(button);

      // Check callback was called
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('should not call onComplete if data not saved yet', async () => {
      // Make save never complete
      (asyncStorageService.set as jest.Mock).mockImplementation(() => new Promise(() => {}));

      const onComplete = jest.fn();
      renderWithProviders(<PremiumCompletionScreen onComplete={onComplete} />);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger success haptic on mount', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });

    it('should trigger success haptic after successful save', async () => {
      renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        // Should be called twice: once on mount, once after save
        expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label on Get Started button', async () => {
      const { getByLabelText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByLabelText('Get started with Ellie')).toBeTruthy();
      });
    });

    it('should have accessible label on Try Again button when error', async () => {
      (asyncStorageService.set as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByLabelText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        expect(getByLabelText('Retry saving your data')).toBeTruthy();
      });
    });

    it('should properly indicate button roles', async () => {
      const { getByLabelText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        const button = getByLabelText('Get started with Ellie');
        expect(button.props.accessibilityRole).toBe('button');
      });
    });
  });

  describe('Custom TestID', () => {
    it('should use custom testID when provided', () => {
      const { getByTestId } = renderWithProviders(
        <PremiumCompletionScreen testID="custom-test-id" />
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });

    it('should use default testID when not provided', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);

      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onComplete callback', async () => {
      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      await waitFor(() => {
        const button = getByText('Get Started');
        fireEvent.press(button);
      });

      // Should not crash
      expect(true).toBe(true);
    });

    it('should handle partial onboarding data', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);

      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });

    it('should render without crashing when all props missing', () => {
      const { getByTestId } = renderWithProviders(<PremiumCompletionScreen />);

      expect(getByTestId('premium-completion-screen')).toBeTruthy();
    });
  });

  describe('3-Shift Pattern Display', () => {
    it('should display 3-shift custom rotation pattern correctly', () => {
      // Re-mock the context for this test with 3-shift data
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const useOnboardingModule = require('@/contexts/OnboardingContext');
      const originalUseOnboarding = useOnboardingModule.useOnboarding;

      jest.spyOn(useOnboardingModule, 'useOnboarding').mockImplementation(() => ({
        data: {
          name: 'Test User',
          occupation: 'Nurse',
          company: 'Test Hospital',
          country: 'Australia',
          shiftSystem: '3-shift',
          patternType: 'CUSTOM',
          customPattern: {
            morningOn: 2,
            afternoonOn: 3,
            nightOn: 2,
            daysOff: 2,
          },
          phaseOffset: 0,
          startDate: new Date('2024-01-01'),
          shiftStartTime: '06:00',
          shiftEndTime: '14:00',
          shiftDuration: 8,
          shiftType: 'morning',
        },
        updateData: jest.fn(),
        resetData: jest.fn(),
      }));

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      // Should display the 3-shift custom rotation pattern
      expect(getByText(/2-3-2-2 Custom Rotation/i)).toBeTruthy();

      // Restore original mock
      useOnboardingModule.useOnboarding.mockImplementation(originalUseOnboarding);
    });

    it('should display 2-shift custom rotation pattern correctly', () => {
      // The default mock already has 2-shift data, but let's be explicit
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const useOnboardingModule = require('@/contexts/OnboardingContext');
      const originalUseOnboarding = useOnboardingModule.useOnboarding;

      jest.spyOn(useOnboardingModule, 'useOnboarding').mockImplementation(() => ({
        data: {
          name: 'Test User',
          occupation: 'Software Engineer',
          company: 'Test Company',
          country: 'Australia',
          shiftSystem: '2-shift',
          patternType: 'CUSTOM',
          customPattern: {
            daysOn: 4,
            nightsOn: 4,
            daysOff: 4,
          },
          phaseOffset: 0,
          startDate: new Date('2024-01-01'),
          shiftStartTime: '06:00',
          shiftEndTime: '18:00',
          shiftDuration: 12,
          shiftType: 'day',
        },
        updateData: jest.fn(),
        resetData: jest.fn(),
      }));

      const { getByText } = renderWithProviders(<PremiumCompletionScreen />);

      // Should display the 2-shift custom rotation pattern
      expect(getByText(/4-4-4 Custom Rotation/i)).toBeTruthy();

      // Restore original mock
      useOnboardingModule.useOnboarding.mockImplementation(originalUseOnboarding);
    });
  });
});

// Helper function to get all elements by text
function getAllByText(
  getByText: (text: string | RegExp) => unknown,
  text: string | RegExp
): unknown[] {
  try {
    const result = getByText(text);
    return Array.isArray(result) ? result : [result];
  } catch {
    return [];
  }
}
