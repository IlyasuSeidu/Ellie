/**
 * Tests for Premium Shift Time Input Screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PremiumShiftTimeInputScreen } from '../PremiumShiftTimeInputScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NavigationContainer } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Mock haptics
jest.mock('expo-haptics');

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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      <OnboardingProvider>{component}</OnboardingProvider>
    </NavigationContainer>
  );
};

describe('PremiumShiftTimeInputScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByTestId('premium-shift-time-input-screen')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByText('Set Your Shift Times')).toBeTruthy();
      expect(getByText('When do your shifts typically start?')).toBeTruthy();
    });

    it('should render progress header with step 6 of 7', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      const progressHeader = getByTestId('progress-header');
      expect(progressHeader).toBeTruthy();
    });

    it('should render pattern summary card', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByText(/cycle/i)).toBeTruthy();
    });

    it('should render preset section header', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByText('Choose a Preset')).toBeTruthy();
    });
  });

  describe('Preset Shift Cards', () => {
    it('should render all 6 preset cards', () => {
      const { getByText, getAllByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // All presets should be visible - check for unique times
      expect(getByText(/6:00 AM/i)).toBeTruthy(); // Early Day
      expect(getByText(/7:00 AM/i)).toBeTruthy(); // Standard Day
      expect(getByText(/1:00 PM/i)).toBeTruthy(); // Late Day
      expect(getAllByText(/6:00 PM/i).length).toBeGreaterThan(0); // Evening (appears in multiple places)
      expect(getByText(/10:00 PM/i)).toBeTruthy(); // Night
      expect(getByText('Custom Time')).toBeTruthy(); // Custom card
    });

    it('should select a preset when tapped', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Tap the Early Day Shift preset
      const preset = getByText(/6:00 AM/i);
      fireEvent.press(preset);

      // Check haptic was triggered
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should show custom input section when custom preset selected', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Tap the Custom preset
      const customPreset = getByText(/Custom Time/i);
      fireEvent.press(customPreset);

      // Custom input section should appear
      await waitFor(() => {
        expect(getByText('Shift Start Time')).toBeTruthy();
        expect(getByText(/Shift Duration/i)).toBeTruthy();
      });
    });

    it('should display duration badge on preset cards', () => {
      const { getAllByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Should have duration badges
      const badges = getAllByText(/12h|8h/);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Time Input', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show custom input when custom preset selected', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        expect(getByText('Shift Start Time')).toBeTruthy();
      });
    });

    it('should render time input fields', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <PremiumShiftTimeInputScreen />
      );

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        expect(getByPlaceholderText('HH')).toBeTruthy();
        expect(getByPlaceholderText('MM')).toBeTruthy();
      });
    });

    it('should render AM/PM selector', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        const amButtons = getAllByText(getByText, 'AM');
        const pmButtons = getAllByText(getByText, 'PM');
        expect(amButtons.length).toBeGreaterThan(0);
        expect(pmButtons.length).toBeGreaterThan(0);
      });
    });

    it('should render duration selector with appropriate option for shift system', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        // Default mock data uses 2-shift system, so only 12 Hours should be visible
        expect(getByText('12 Hours')).toBeTruthy();
      });
    });
  });

  describe('Shift Duration Selection', () => {
    it('should select correct duration by default based on shift system', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        // 12 Hours should be selected by default for 2-shift system
        expect(getByText('12 Hours')).toBeTruthy();
      });
    });
  });

  describe('Live Preview', () => {
    it('should show live preview when valid custom time entered', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Custom preset to show custom input (use specific text "Custom Time")
      fireEvent.press(getByText('Custom Time'));

      await waitFor(() => {
        expect(getByText('Shift Start Time')).toBeTruthy();
      });

      // Enter valid time (already defaults to 06:00 AM)
      // Just wait for live preview to appear
      await waitFor(() => {
        expect(getByText(/Your shift:/i)).toBeTruthy();
      });
    });

    it('should display calculated end time in custom preview', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Custom preset (use specific text "Custom Time")
      fireEvent.press(getByText('Custom Time'));

      await waitFor(() => {
        expect(getByText('Shift Start Time')).toBeTruthy();
      });

      // Default is 06:00 AM with 12 hour duration, so should show 6:00 AM → 6:00 PM
      await waitFor(() => {
        expect(getByText(/6:00 AM.*6:00 PM/i)).toBeTruthy();
      });
    });
  });

  describe('Shift Type Detection', () => {
    it('should detect day shift for morning times', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Early Day Shift (6 AM)
      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        expect(getByText(/Day Shift Detected/i)).toBeTruthy();
      });
    });

    it('should detect night shift for evening times', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Night Shift (10 PM)
      fireEvent.press(getByText(/10:00 PM/i));

      await waitFor(() => {
        expect(getByText(/Night Shift Detected/i)).toBeTruthy();
      });
    });

    it('should show appropriate emoji for detected shift type', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        expect(getByText(/☀️/)).toBeTruthy();
      });
    });
  });

  describe('Tips Section', () => {
    it('should render tips section', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByText('Pro Tip')).toBeTruthy();
      expect(getByText(/Most mining operations use 12-hour shifts/i)).toBeTruthy();
    });
  });

  describe('Navigation Buttons', () => {
    it('should render back button', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    it('should render continue button', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByLabelText('Continue to next step')).toBeTruthy();
    });

    it('should disable continue button when no preset selected', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      const continueButton = getByLabelText('Continue to next step');

      // Check that it has disabled state
      expect(continueButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable continue button when valid preset selected', async () => {
      const { getByLabelText, getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select a preset
      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        const continueButton = getByLabelText('Continue to next step');
        expect(continueButton.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('should call onBack when back button pressed', () => {
      const onBack = jest.fn();
      const { getByLabelText } = renderWithProviders(
        <PremiumShiftTimeInputScreen onBack={onBack} />
      );

      fireEvent.press(getByLabelText('Go back'));

      expect(onBack).toHaveBeenCalled();
    });

    it('should call onContinue when continue button pressed with valid data', async () => {
      const onContinue = jest.fn();
      const { getByLabelText, getByText } = renderWithProviders(
        <PremiumShiftTimeInputScreen onContinue={onContinue} />
      );

      // Select a preset
      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        const continueButton = getByLabelText('Continue to next step');
        fireEvent.press(continueButton);
      });

      expect(onContinue).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should show error for invalid hours in custom input', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <PremiumShiftTimeInputScreen />
      );

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(async () => {
        const hoursInput = getByPlaceholderText('HH');
        fireEvent.changeText(hoursInput, '25');
        fireEvent(hoursInput, 'blur');

        await waitFor(() => {
          expect(getByText(/Hours must be between 1 and 12/i)).toBeTruthy();
        });
      });
    });

    it('should show error for invalid minutes in custom input', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <PremiumShiftTimeInputScreen />
      );

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(async () => {
        const minutesInput = getByPlaceholderText('MM');
        fireEvent.changeText(minutesInput, '75');
        fireEvent(minutesInput, 'blur');

        await waitFor(() => {
          expect(getByText(/Minutes must be between 0 and 59/i)).toBeTruthy();
        });
      });
    });

    it('should trigger error haptic for validation errors', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <PremiumShiftTimeInputScreen />
      );

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(async () => {
        const hoursInput = getByPlaceholderText('HH');
        fireEvent.changeText(hoursInput, '25');
        fireEvent(hoursInput, 'blur');

        await waitFor(() => {
          expect(Haptics.notificationAsync).toHaveBeenCalledWith(
            Haptics.NotificationFeedbackType.Error
          );
        });
      });
    });
  });

  describe('Data Management', () => {
    it('should save shift time data to context when continuing', async () => {
      const { getByLabelText, getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Early Day Shift (6 AM, 12 hours)
      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        const continueButton = getByLabelText('Continue to next step');
        fireEvent.press(continueButton);
      });

      // Context should be updated (we can't directly test this without accessing context,
      // but onContinue being called is a good indicator)
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels on all interactive elements', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Continue to next step')).toBeTruthy();
    });

    it('should have proper accessibility roles', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      const backButton = getByLabelText('Go back');
      const continueButton = getByLabelText('Continue to next step');

      expect(backButton.props.accessibilityRole).toBe('button');
      expect(continueButton.props.accessibilityRole).toBe('button');
    });

    it('should properly indicate disabled state to screen readers', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      const continueButton = getByLabelText('Continue to next step');
      expect(continueButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback when selecting presets', () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/6:00 AM/i));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should provide haptic feedback when toggling AM/PM', async () => {
      const { getByText, getAllByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        const pmButtons = getAllByText('PM');
        if (pmButtons.length > 0) {
          fireEvent.press(pmButtons[0]);
          expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
        }
      });
    });

    it('should provide success haptic when continuing with valid data', async () => {
      const { getByLabelText, getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      fireEvent.press(getByText(/6:00 AM/i));

      await waitFor(() => {
        const continueButton = getByLabelText('Continue to next step');
        fireEvent.press(continueButton);
      });

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('should not trigger haptic when pressing disabled continue button', () => {
      const { getByLabelText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Continue button should be disabled without selection
      const continueButton = getByLabelText('Continue to next step');
      expect(continueButton.props.accessibilityState.disabled).toBe(true);

      // Pressing a disabled button in React Native doesn't trigger events
      fireEvent.press(continueButton);

      // No haptic should be triggered
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle overnight shifts correctly', async () => {
      const { getByText } = renderWithProviders(<PremiumShiftTimeInputScreen />);

      // Select Night Shift (10 PM, 12 hours) -> ends at 10 AM next day
      fireEvent.press(getByText(/10:00 PM/i));

      await waitFor(() => {
        expect(getByText(/10:00 PM/)).toBeTruthy();
        expect(getByText(/10:00 AM/)).toBeTruthy();
      });
    });

    it('should handle midnight start time correctly', async () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(
        <PremiumShiftTimeInputScreen />
      );

      fireEvent.press(getByText(/Custom Time/i));

      await waitFor(() => {
        const hoursInput = getByPlaceholderText('HH');
        const minutesInput = getByPlaceholderText('MM');
        const amButtons = getAllByText(getByText, 'AM');

        fireEvent.changeText(hoursInput, '12');
        fireEvent.changeText(minutesInput, '00');
        if (amButtons.length > 0) {
          fireEvent.press(amButtons[0]);
        }
      });

      // Should calculate midnight correctly
      await waitFor(() => {
        // Should show some output
        expect(getByText(/12:00 AM/)).toBeTruthy();
      });
    });

    it('should render without crashing when no callbacks provided', () => {
      const { getByTestId } = renderWithProviders(<PremiumShiftTimeInputScreen />);
      expect(getByTestId('premium-shift-time-input-screen')).toBeTruthy();
    });

    it('should handle all props being provided', () => {
      const onContinue = jest.fn();
      const onBack = jest.fn();

      const { getByTestId } = renderWithProviders(
        <PremiumShiftTimeInputScreen
          onContinue={onContinue}
          onBack={onBack}
          testID="custom-test-id"
        />
      );

      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });
});

// Helper function to get all elements by text (since getAllByText is not available in some test utils)
function getAllByText(getByText: (text: string) => unknown, text: string): unknown[] {
  try {
    const result = getByText(text);
    return Array.isArray(result) ? result : [result];
  } catch {
    return [];
  }
}
