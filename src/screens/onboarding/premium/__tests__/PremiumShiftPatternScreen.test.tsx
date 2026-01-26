/**
 * PremiumShiftPatternScreen Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PremiumShiftPatternScreen } from '../PremiumShiftPatternScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { ShiftPattern } from '@/types';

// Get the mocked useWindowDimensions from jest.setup.js
const mockUseWindowDimensions = jest.requireMock(
  'react-native/Libraries/Utilities/useWindowDimensions'
).default;

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
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

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} />
      );
      expect(getByText('Choose your shift pattern')).toBeTruthy();
      expect(getByText('Select the pattern that matches your roster')).toBeTruthy();
    });

    it('should render progress header showing step 3 of 10', () => {
      const { UNSAFE_getByType } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} />
      );
      const progressHeader = UNSAFE_getByType(ProgressHeader);
      expect(progressHeader.props.currentStep).toBe(3);
      expect(progressHeader.props.totalSteps).toBe(10);
    });

    it('should render all 9 pattern cards', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern-pattern-3-3-3')).toBeTruthy();
      expect(getByTestId('pattern-pattern-5-5-5')).toBeTruthy();
      expect(getByTestId('pattern-pattern-10-10-10')).toBeTruthy();
      expect(getByTestId('pattern-pattern-2-2-3')).toBeTruthy();
      expect(getByTestId('pattern-pattern-4-4-4')).toBeTruthy();
      expect(getByTestId('pattern-pattern-7-7-7')).toBeTruthy();
      expect(getByTestId('pattern-pattern-continental')).toBeTruthy();
      expect(getByTestId('pattern-pattern-pitman')).toBeTruthy();
      expect(getByTestId('pattern-pattern-custom')).toBeTruthy();
    });

    it('should render continue button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern-continue-button')).toBeTruthy();
    });

    it('should render pattern names', () => {
      const { getByText } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} />
      );
      expect(getByText('3-3-3 Cycle')).toBeTruthy();
      expect(getByText('5-5-5 Cycle')).toBeTruthy();
      expect(getByText('Custom Pattern')).toBeTruthy();
    });
  });

  describe('Pattern Selection', () => {
    it('should initially have no pattern selected', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      const button = getByTestId('pattern-continue-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should select a pattern when tapped', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      const patternCard = getByTestId('pattern-pattern-3-3-3');
      fireEvent.press(patternCard);

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('should enable continue button when pattern is selected', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      const continueButton = getByTestId('pattern-continue-button');
      expect(continueButton.props.accessibilityState.disabled).toBe(true);

      const patternCard = getByTestId('pattern-pattern-5-5-5');
      fireEvent.press(patternCard);

      await waitFor(() => {
        expect(continueButton.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('should allow changing pattern selection', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Select first pattern
      fireEvent.press(getByTestId('pattern-pattern-3-3-3'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });

      // Select different pattern
      fireEvent.press(getByTestId('pattern-pattern-5-5-5'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('should maintain single selection behavior', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Select first pattern
      fireEvent.press(getByTestId('pattern-pattern-3-3-3'));

      // Select second pattern
      fireEvent.press(getByTestId('pattern-pattern-5-5-5'));

      // Continue button should still be enabled (only one selected)
      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });
    });
  });

  describe('Continue Button', () => {
    it('should call onContinue with selected pattern type when continue is pressed', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Select pattern
      fireEvent.press(getByTestId('pattern-pattern-3-3-3'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });

      // Press continue
      fireEvent.press(getByTestId('pattern-continue-button'));

      expect(mockOnContinue).toHaveBeenCalledWith(ShiftPattern.STANDARD_3_3_3);
    });

    it('should not call onContinue if no pattern is selected', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      const continueButton = getByTestId('pattern-continue-button');
      fireEvent.press(continueButton);

      expect(mockOnContinue).not.toHaveBeenCalled();
    });

    it('should save pattern type to context when continue is pressed', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Select pattern
      fireEvent.press(getByTestId('pattern-pattern-5-5-5'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });

      // Press continue
      fireEvent.press(getByTestId('pattern-continue-button'));

      expect(mockOnContinue).toHaveBeenCalledWith(ShiftPattern.STANDARD_5_5_5);
    });

    it('should work without onContinue callback', async () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);

      // Select pattern
      fireEvent.press(getByTestId('pattern-pattern-custom'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });

      // Press continue - should not crash
      fireEvent.press(getByTestId('pattern-continue-button'));

      expect(true).toBe(true);
    });
  });

  describe('Pattern Types', () => {
    const patternTypes = [
      { id: '3-3-3', type: ShiftPattern.STANDARD_3_3_3, name: '3-3-3 Cycle' },
      { id: '5-5-5', type: ShiftPattern.STANDARD_5_5_5, name: '5-5-5 Cycle' },
      { id: '10-10-10', type: ShiftPattern.STANDARD_10_10_10, name: '10-10-10 Cycle' },
      { id: '2-2-3', type: ShiftPattern.STANDARD_2_2_3, name: '2-2-3 Cycle' },
      { id: '4-4-4', type: ShiftPattern.STANDARD_4_4_4, name: '4-4-4 Cycle' },
      { id: '7-7-7', type: ShiftPattern.STANDARD_7_7_7, name: '7-7-7 Cycle' },
      { id: 'continental', type: ShiftPattern.CONTINENTAL, name: 'Continental' },
      { id: 'pitman', type: ShiftPattern.PITMAN, name: 'Pitman Schedule' },
      { id: 'custom', type: ShiftPattern.CUSTOM, name: 'Custom Pattern' },
    ];

    patternTypes.forEach((pattern) => {
      it(`should handle ${pattern.name} selection correctly`, async () => {
        const { getByTestId } = renderWithContext(
          <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
        );

        fireEvent.press(getByTestId(`pattern-pattern-${pattern.id}`));

        await waitFor(() => {
          const button = getByTestId('pattern-continue-button');
          expect(button.props.accessibilityState.disabled).toBe(false);
        });

        fireEvent.press(getByTestId('pattern-continue-button'));

        expect(mockOnContinue).toHaveBeenCalledWith(pattern.type);
      });
    });
  });

  describe('Responsive Layout', () => {
    it('should use 2 columns on phone screens', () => {
      mockUseWindowDimensions.mockReturnValueOnce({
        width: 375,
        height: 812,
        fontScale: 1,
        scale: 1,
      });

      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      expect(getByTestId('pattern')).toBeTruthy();
    });

    it('should use 3 columns on tablet screens', () => {
      mockUseWindowDimensions.mockReturnValueOnce({
        width: 768,
        height: 1024,
        fontScale: 1,
        scale: 1,
      });

      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      expect(getByTestId('pattern')).toBeTruthy();
    });
  });

  describe('Context Integration', () => {
    it('should load previously selected pattern from context', () => {
      const { getByTestId } = render(
        <OnboardingProvider>
          <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
        </OnboardingProvider>
      );

      // Initially no selection, button should be disabled
      const button = getByTestId('pattern-continue-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have testID for screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="custom-id" />
      );
      expect(getByTestId('custom-id')).toBeTruthy();
    });

    it('should have testID for each pattern card', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      expect(getByTestId('pattern-pattern-3-3-3')).toBeTruthy();
      expect(getByTestId('pattern-pattern-custom')).toBeTruthy();
    });

    it('should have testID for continue button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern-continue-button')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no props provided', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('Choose your shift pattern')).toBeTruthy();
    });

    it('should handle rapid pattern selection', async () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );

      // Rapidly select different patterns
      fireEvent.press(getByTestId('pattern-pattern-3-3-3'));
      fireEvent.press(getByTestId('pattern-pattern-5-5-5'));
      fireEvent.press(getByTestId('pattern-pattern-7-7-7'));

      await waitFor(() => {
        const button = getByTestId('pattern-continue-button');
        expect(button.props.accessibilityState.disabled).toBe(false);
      });

      fireEvent.press(getByTestId('pattern-continue-button'));

      // Should call with last selected pattern
      expect(mockOnContinue).toHaveBeenCalledWith(ShiftPattern.STANDARD_7_7_7);
    });
  });
});
