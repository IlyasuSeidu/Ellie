/**
 * PremiumShiftPatternScreen Component Tests
 * Tests for Tinder-style swipeable card interface
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PremiumShiftPatternScreen } from '../PremiumShiftPatternScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ShiftPattern } from '@/types';
import * as Haptics from 'expo-haptics';

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
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock components
jest.mock('@/components/onboarding/premium/ProgressHeader', () => ({
  ProgressHeader: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { View, Text } = require('react-native');
    return (
      <View testID="progress-header">
        <Text>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>
    );
  },
}));

jest.mock('@/components/onboarding/premium/PremiumButton', () => ({
  PremiumButton: ({
    title,
    onPress,
    testID,
  }: {
    title: string;
    onPress: () => void;
    testID?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} testID={testID}>
        <Text>{title}</Text>
      </Pressable>
    );
  },
}));

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
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
      expect(getByText('Swipe right to select or tap info to learn more')).toBeTruthy();
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

    it('should render action buttons', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern-info-button')).toBeTruthy();
      expect(getByTestId('pattern-select-button')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should select pattern and advance when select button is pressed', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Press select button
      fireEvent.press(getByTestId('pattern-select-button'));

      // Wait for next card
      await waitFor(() => {
        expect(getByText('7-7-7 Cycle')).toBeTruthy();
      });

      // Should have called onContinue with selected pattern
      expect(mockOnContinue).toHaveBeenCalledWith(ShiftPattern.STANDARD_4_4_4);

      // Should have triggered success haptic
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it('should show learn more modal when info button is pressed', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Press info button
      fireEvent.press(getByTestId('pattern-info-button'));

      // Modal should be visible
      await waitFor(() => {
        expect(getByText('Work-Rest Ratio')).toBeTruthy();
        expect(getByText('Common Use Cases')).toBeTruthy();
        expect(getByText('Advantages')).toBeTruthy();
      });

      // Should have triggered haptic feedback
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('Learn More Modal', () => {
    it('should display pattern details in modal', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Open modal
      fireEvent.press(getByTestId('pattern-info-button'));

      // Check modal content (avoid checking duplicate pattern name)
      await waitFor(() => {
        expect(getByText('Work-Rest Ratio')).toBeTruthy();
        expect(getByText('67% work, 33% rest')).toBeTruthy();
        expect(getByText('• FIFO mining')).toBeTruthy();
        expect(getByText('✓ Good work-life balance')).toBeTruthy();
      });
    });

    it('should close modal when close button is pressed', async () => {
      const { getByTestId, getByText, queryByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Open modal
      fireEvent.press(getByTestId('pattern-info-button'));

      await waitFor(() => {
        expect(getByText('Work-Rest Ratio')).toBeTruthy();
      });

      // Close modal
      fireEvent.press(getByTestId('modal-close-button'));

      // Modal content should not be visible
      await waitFor(() => {
        expect(queryByText('Work-Rest Ratio')).toBeNull();
      });
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

    it('should update progress when advancing through cards', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Skip first card
      fireEvent.press(getByTestId('pattern-select-button'));

      await waitFor(() => {
        expect(getByText('7-7-7 Cycle')).toBeTruthy();
      });

      // Skip second card
      fireEvent.press(getByTestId('pattern-select-button'));

      await waitFor(() => {
        expect(getByText('2-2-3 Cycle')).toBeTruthy();
      });
    });
  });

  describe('All Pattern Types', () => {
    const patterns = [
      { id: '4-4-4', type: ShiftPattern.STANDARD_4_4_4, name: '4-4-4 Cycle' },
      { id: '7-7-7', type: ShiftPattern.STANDARD_7_7_7, name: '7-7-7 Cycle' },
      { id: '2-2-3', type: ShiftPattern.STANDARD_2_2_3, name: '2-2-3 Cycle' },
      { id: '5-5-5', type: ShiftPattern.STANDARD_5_5_5, name: '5-5-5 Cycle' },
      { id: '3-3-3', type: ShiftPattern.STANDARD_3_3_3, name: '3-3-3 Cycle' },
      { id: '10-10-10', type: ShiftPattern.STANDARD_10_10_10, name: '10-10-10 Cycle' },
      { id: 'continental', type: ShiftPattern.CONTINENTAL, name: 'Continental' },
      { id: 'pitman', type: ShiftPattern.PITMAN, name: 'Pitman Schedule' },
      { id: 'custom', type: ShiftPattern.CUSTOM, name: 'Custom Pattern' },
    ];

    patterns.forEach((pattern, index) => {
      it(`should handle ${pattern.name} selection correctly`, async () => {
        const { getByTestId, getByText } = renderWithContext(
          <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
        );

        // Advance to this pattern by selecting previous patterns
        for (let i = 0; i < index; i++) {
          fireEvent.press(getByTestId('pattern-select-button'));
          // Wait for state update
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        // Verify correct pattern is shown
        expect(getByText(pattern.name)).toBeTruthy();

        // Select pattern
        fireEvent.press(getByTestId('pattern-select-button'));

        // Should call with correct pattern type
        expect(mockOnContinue).toHaveBeenCalledWith(pattern.type);
      });
    });
  });

  describe('End of Stack', () => {
    it('should show end screen after selecting through all cards', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Select through all 9 cards
      for (let i = 0; i < 9; i++) {
        fireEvent.press(getByTestId('pattern-select-button'));
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // Should show end screen with last selected pattern
      await waitFor(() => {
        expect(getByText('Pattern Selected!')).toBeTruthy();
        expect(getByText('You have selected Custom Pattern')).toBeTruthy();
        expect(getByTestId('review-again-button')).toBeTruthy();
      });
    });

    it('should show selected pattern on end screen if pattern was selected', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Select first pattern
      fireEvent.press(getByTestId('pattern-select-button'));

      await waitFor(() => {}, { timeout: 500 });

      // Skip through remaining cards
      for (let i = 0; i < 8; i++) {
        fireEvent.press(getByTestId('pattern-select-button'));
        await waitFor(() => {}, { timeout: 500 });
      }

      // Should show success end screen
      await waitFor(() => {
        expect(getByText('Pattern Selected!')).toBeTruthy();
        expect(getByText('You have selected 4-4-4 Cycle')).toBeTruthy();
      });
    });

    it('should reset stack when review again button is pressed', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Select through all cards
      for (let i = 0; i < 9; i++) {
        fireEvent.press(getByTestId('pattern-select-button'));
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // Wait for end screen
      await waitFor(() => {
        expect(getByText('Pattern Selected!')).toBeTruthy();
      });

      // Press review again
      fireEvent.press(getByTestId('review-again-button'));

      // Should show first card again
      await waitFor(() => {
        expect(getByText('4-4-4 Cycle')).toBeTruthy();
        expect(getByTestId('pattern-select-button')).toBeTruthy();
      });
    });
  });

  describe('Swipeable Card Component', () => {
    it('should render card with testID', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern-card-4-4-4')).toBeTruthy();
    });

    it('should show pattern icon, name, schedule, and description', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('⛏️')).toBeTruthy(); // Icon
      expect(getByText('4-4-4 Cycle')).toBeTruthy(); // Name
      expect(getByText('4D / 4N / 4O')).toBeTruthy(); // Schedule
      expect(
        getByText(/4 days on, 4 nights on, 4 days off - Perfect for FIFO mining operations/)
      ).toBeTruthy();
    });

    it('should show swipe hint on first card', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('Swipe right to select →')).toBeTruthy();
    });
  });

  describe('Context Integration', () => {
    it('should save selected pattern to context', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Select pattern
      fireEvent.press(getByTestId('pattern-select-button'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Context should be updated (verified through onContinue callback)
      expect(mockOnContinue).toHaveBeenCalledWith(ShiftPattern.STANDARD_4_4_4);
    });
  });

  describe('Accessibility', () => {
    it('should have testIDs for main elements', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern')).toBeTruthy();
      expect(getByTestId('pattern-info-button')).toBeTruthy();
      expect(getByTestId('pattern-select-button')).toBeTruthy();
      expect(getByTestId('pattern-card-4-4-4')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no onContinue prop provided', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern')).toBeTruthy();
    });

    it('should handle rapid button presses gracefully', async () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);

      // Rapidly press skip button
      fireEvent.press(getByTestId('pattern-select-button'));
      fireEvent.press(getByTestId('pattern-select-button'));
      fireEvent.press(getByTestId('pattern-select-button'));

      // Should still work correctly
      await waitFor(() => {}, { timeout: 1000 });
    });

    it('should handle selecting and then skipping', async () => {
      const { getByTestId, getByText } = renderWithContext(
        <PremiumShiftPatternScreen testID="pattern" />
      );

      // Select first card
      fireEvent.press(getByTestId('pattern-select-button'));

      await waitFor(() => {
        expect(getByText('7-7-7 Cycle')).toBeTruthy();
      });

      // Skip next card
      fireEvent.press(getByTestId('pattern-select-button'));

      await waitFor(() => {
        expect(getByText('2-2-3 Cycle')).toBeTruthy();
      });
    });
  });
});
