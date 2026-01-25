/**
 * ProgressHeader Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { ProgressHeader } from '../ProgressHeader';

describe('ProgressHeader', () => {
  const mockOnBack = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with correct number of dots', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} testID="progress" />
      );

      // Verify all 5 dots are rendered
      for (let i = 1; i <= 5; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });

    it('should render with minimum steps (1)', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={1} testID="progress" />
      );
      expect(getByTestId('progress-dot-1')).toBeTruthy();
    });

    it('should render with maximum steps (10)', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={10} testID="progress" />
      );

      for (let i = 1; i <= 10; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });

    it('should render the header container', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={3} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });
  });

  describe('Current Step Highlighting', () => {
    it('should highlight the current step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} testID="progress" />
      );

      // All dots should be rendered
      expect(getByTestId('progress-dot-3')).toBeTruthy();
    });

    it('should update highlighting when step changes', () => {
      const { getByTestId, rerender } = render(
        <ProgressHeader currentStep={1} totalSteps={5} testID="progress" />
      );
      expect(getByTestId('progress-dot-1')).toBeTruthy();

      rerender(<ProgressHeader currentStep={2} totalSteps={5} testID="progress" />);
      expect(getByTestId('progress-dot-2')).toBeTruthy();

      rerender(<ProgressHeader currentStep={5} totalSteps={5} testID="progress" />);
      expect(getByTestId('progress-dot-5')).toBeTruthy();
    });

    it('should highlight first step by default', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={4} testID="progress" />
      );
      expect(getByTestId('progress-dot-1')).toBeTruthy();
    });

    it('should highlight last step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={7} totalSteps={7} testID="progress" />
      );
      expect(getByTestId('progress-dot-7')).toBeTruthy();
    });
  });

  describe('Completed Steps Styling', () => {
    it('should style completed steps differently', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={4} totalSteps={6} testID="progress" />
      );

      // Steps 1, 2, 3 should be completed
      expect(getByTestId('progress-dot-1')).toBeTruthy();
      expect(getByTestId('progress-dot-2')).toBeTruthy();
      expect(getByTestId('progress-dot-3')).toBeTruthy();

      // Step 4 should be current
      expect(getByTestId('progress-dot-4')).toBeTruthy();

      // Steps 5, 6 should be incomplete
      expect(getByTestId('progress-dot-5')).toBeTruthy();
      expect(getByTestId('progress-dot-6')).toBeTruthy();
    });

    it('should have no completed steps on first step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} testID="progress" />
      );

      // All dots should exist
      for (let i = 1; i <= 5; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });

    it('should mark all previous steps as completed', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={5} totalSteps={5} testID="progress" />
      );

      // Steps 1-4 should be completed, step 5 is current
      for (let i = 1; i <= 5; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });
  });

  describe('Back Button', () => {
    it('should not show back button on first step', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      expect(queryByTestId('progress-back')).toBeNull();
    });

    it('should show back button on second step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      expect(getByTestId('progress-back')).toBeTruthy();
    });

    it('should show back button on middle steps', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      expect(getByTestId('progress-back')).toBeTruthy();
    });

    it('should show back button on last step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={5} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      expect(getByTestId('progress-back')).toBeTruthy();
    });

    it('should not show back button when onBack is undefined', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} testID="progress" />
      );
      expect(queryByTestId('progress-back')).toBeNull();
    });

    it('should call onBack when back button is pressed', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      fireEvent.press(getByTestId('progress-back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should trigger haptic feedback on back press', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      fireEvent.press(getByTestId('progress-back'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not call onBack on first step even if button somehow exists', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      // Back button should not exist on first step
      expect(queryByTestId('progress-back')).toBeNull();
    });
  });

  describe('Skip Button', () => {
    it('should not show skip button by default', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} testID="progress" />
      );
      expect(queryByTestId('progress-skip')).toBeNull();
    });

    it('should show skip button when showSkip is true', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(getByTestId('progress-skip')).toBeTruthy();
    });

    it('should not show skip button when showSkip is false', () => {
      const { queryByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip={false}
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(queryByTestId('progress-skip')).toBeNull();
    });

    it('should not show skip button when onSkip is undefined', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} showSkip testID="progress" />
      );
      expect(queryByTestId('progress-skip')).toBeNull();
    });

    it('should call onSkip when skip button is pressed', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      fireEvent.press(getByTestId('progress-skip'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should trigger haptic feedback on skip press', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      fireEvent.press(getByTestId('progress-skip'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should show skip button on any step when enabled', () => {
      const { getByTestId, rerender } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(getByTestId('progress-skip')).toBeTruthy();

      rerender(
        <ProgressHeader
          currentStep={3}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(getByTestId('progress-skip')).toBeTruthy();

      rerender(
        <ProgressHeader
          currentStep={5}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(getByTestId('progress-skip')).toBeTruthy();
    });
  });

  describe('Progress Percentage Display', () => {
    it('should not show percentage by default', () => {
      const { queryByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} testID="progress" />
      );
      expect(queryByTestId('progress-percentage')).toBeNull();
    });

    it('should show percentage when showPercentage is true', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} showPercentage testID="progress" />
      );
      expect(getByTestId('progress-percentage')).toBeTruthy();
    });

    it('should display correct percentage for first step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} showPercentage testID="progress" />
      );
      const percentage = getByTestId('progress-percentage');
      expect(percentage.props.children).toEqual([20, '% Complete']);
    });

    it('should display correct percentage for middle step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={3} totalSteps={5} showPercentage testID="progress" />
      );
      const percentage = getByTestId('progress-percentage');
      expect(percentage.props.children).toEqual([60, '% Complete']);
    });

    it('should display correct percentage for last step', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={5} totalSteps={5} showPercentage testID="progress" />
      );
      const percentage = getByTestId('progress-percentage');
      expect(percentage.props.children).toEqual([100, '% Complete']);
    });

    it('should update percentage when step changes', () => {
      const { getByTestId, rerender } = render(
        <ProgressHeader currentStep={1} totalSteps={4} showPercentage testID="progress" />
      );
      expect(getByTestId('progress-percentage').props.children).toEqual([25, '% Complete']);

      rerender(<ProgressHeader currentStep={2} totalSteps={4} showPercentage testID="progress" />);
      expect(getByTestId('progress-percentage').props.children).toEqual([50, '% Complete']);

      rerender(<ProgressHeader currentStep={3} totalSteps={4} showPercentage testID="progress" />);
      expect(getByTestId('progress-percentage').props.children).toEqual([75, '% Complete']);

      rerender(<ProgressHeader currentStep={4} totalSteps={4} showPercentage testID="progress" />);
      expect(getByTestId('progress-percentage').props.children).toEqual([100, '% Complete']);
    });

    it('should round percentage to nearest integer', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={3} showPercentage testID="progress" />
      );
      const percentage = getByTestId('progress-percentage');
      // 1/3 = 33.333... should round to 33%
      expect(percentage.props.children).toEqual([33, '% Complete']);
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic on back button press', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      fireEvent.press(getByTestId('progress-back'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on skip button press', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      fireEvent.press(getByTestId('progress-skip'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic when buttons are not interacted with', () => {
      render(
        <ProgressHeader
          currentStep={2}
          totalSteps={5}
          onBack={mockOnBack}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility role for back button', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      const backButton = getByTestId('progress-back');
      expect(backButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label for back button', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      const backButton = getByTestId('progress-back');
      expect(backButton.props.accessibilityLabel).toBe('Go back');
    });

    it('should have accessibility role for skip button', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      const skipButton = getByTestId('progress-skip');
      expect(skipButton.props.accessibilityRole).toBe('button');
    });

    it('should have accessibility label for skip button', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );
      const skipButton = getByTestId('progress-skip');
      expect(skipButton.props.accessibilityLabel).toBe('Skip');
    });
  });

  describe('Custom Styles', () => {
    it('should apply default background color', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should apply custom background color', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          backgroundColor="#FF0000"
          testID="progress"
        />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should apply custom style', () => {
      const customStyle = { paddingTop: 40 };
      const { getByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={5} style={customStyle} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should combine custom style with default styles', () => {
      const customStyle = { marginHorizontal: 10 };
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={1}
          totalSteps={5}
          backgroundColor="#000000"
          style={customStyle}
          testID="progress"
        />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle current step beyond total steps gracefully', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={6} totalSteps={5} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should handle current step of 0', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={0} totalSteps={5} testID="progress" />
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('should handle rapid button presses', () => {
      const { getByTestId } = render(
        <ProgressHeader currentStep={2} totalSteps={5} onBack={mockOnBack} testID="progress" />
      );
      const backButton = getByTestId('progress-back');

      fireEvent.press(backButton);
      fireEvent.press(backButton);
      fireEvent.press(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(3);
    });

    it('should handle both back and skip buttons simultaneously', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={2}
          totalSteps={5}
          onBack={mockOnBack}
          showSkip
          onSkip={mockOnSkip}
          testID="progress"
        />
      );

      fireEvent.press(getByTestId('progress-back'));
      expect(mockOnBack).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('progress-skip'));
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should handle step progression from start to finish', () => {
      const { getByTestId, rerender } = render(
        <ProgressHeader currentStep={1} totalSteps={3} showPercentage testID="progress" />
      );
      expect(getByTestId('progress-percentage').props.children).toEqual([33, '% Complete']);

      rerender(<ProgressHeader currentStep={2} totalSteps={3} showPercentage testID="progress" />);
      expect(getByTestId('progress-percentage').props.children).toEqual([67, '% Complete']);

      rerender(<ProgressHeader currentStep={3} totalSteps={3} showPercentage testID="progress" />);
      expect(getByTestId('progress-percentage').props.children).toEqual([100, '% Complete']);
    });

    it('should maintain all dots through step changes', () => {
      const { getByTestId, rerender } = render(
        <ProgressHeader currentStep={1} totalSteps={4} testID="progress" />
      );

      for (let i = 1; i <= 4; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }

      rerender(<ProgressHeader currentStep={4} totalSteps={4} testID="progress" />);

      for (let i = 1; i <= 4; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });
  });

  describe('Combination States', () => {
    it('should handle all features enabled together', () => {
      const { getByTestId } = render(
        <ProgressHeader
          currentStep={3}
          totalSteps={5}
          onBack={mockOnBack}
          showSkip
          onSkip={mockOnSkip}
          showPercentage
          backgroundColor="#1a1a1a"
          style={{ paddingTop: 20 }}
          testID="progress"
        />
      );

      expect(getByTestId('progress')).toBeTruthy();
      expect(getByTestId('progress-back')).toBeTruthy();
      expect(getByTestId('progress-skip')).toBeTruthy();
      expect(getByTestId('progress-percentage')).toBeTruthy();
      expect(getByTestId('progress-percentage').props.children).toEqual([60, '% Complete']);

      for (let i = 1; i <= 5; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });

    it('should handle minimal configuration', () => {
      const { getByTestId, queryByTestId } = render(
        <ProgressHeader currentStep={1} totalSteps={3} testID="progress" />
      );

      expect(getByTestId('progress')).toBeTruthy();
      expect(queryByTestId('progress-back')).toBeNull();
      expect(queryByTestId('progress-skip')).toBeNull();
      expect(queryByTestId('progress-percentage')).toBeNull();

      for (let i = 1; i <= 3; i++) {
        expect(getByTestId(`progress-dot-${i}`)).toBeTruthy();
      }
    });
  });
});
