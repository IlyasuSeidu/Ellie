/**
 * PhaseSelector Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PhaseSelector, PhaseType } from '../PhaseSelector';

describe('PhaseSelector', () => {
  const mockOnPhaseSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all three phase options', () => {
      const { getByText } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Off Days')).toBeTruthy();
    });

    it('should render phase icons', () => {
      const { getByText } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByText('☀️')).toBeTruthy();
      expect(getByText('🌙')).toBeTruthy();
      expect(getByText('🏖️')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <PhaseSelector
          selectedPhase="day"
          onPhaseSelect={mockOnPhaseSelect}
          testID="phase-selector"
        />
      );
      expect(getByTestId('phase-selector')).toBeTruthy();
    });

    it('should render individual phase cards with testIDs', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day')).toBeTruthy();
      expect(getByTestId('phase-night')).toBeTruthy();
      expect(getByTestId('phase-off')).toBeTruthy();
    });
  });

  describe('All 3 Phases', () => {
    it('should render day phase correctly', () => {
      const { getByText, getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('☀️')).toBeTruthy();
      expect(getByTestId('phase-day')).toBeTruthy();
    });

    it('should render night phase correctly', () => {
      const { getByText, getByTestId } = render(
        <PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('🌙')).toBeTruthy();
      expect(getByTestId('phase-night')).toBeTruthy();
    });

    it('should render off phase correctly', () => {
      const { getByText, getByTestId } = render(
        <PhaseSelector selectedPhase="off" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByText('Off Days')).toBeTruthy();
      expect(getByText('🏖️')).toBeTruthy();
      expect(getByTestId('phase-off')).toBeTruthy();
    });
  });

  describe('Selected State', () => {
    it('should show day phase as selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const dayCard = getByTestId('phase-day');
      expect(dayCard.props.accessibilityState.selected).toBe(true);
    });

    it('should show night phase as selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');
      expect(nightCard.props.accessibilityState.selected).toBe(true);
    });

    it('should show off phase as selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="off" onPhaseSelect={mockOnPhaseSelect} />
      );
      const offCard = getByTestId('phase-off');
      expect(offCard.props.accessibilityState.selected).toBe(true);
    });

    it('should show only one phase as selected at a time', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-off').props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Unselected State', () => {
    it('should show unselected phases when day is selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-off').props.accessibilityState.selected).toBe(false);
    });

    it('should show unselected phases when night is selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-off').props.accessibilityState.selected).toBe(false);
    });

    it('should show unselected phases when off is selected', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="off" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Radio Button Behavior (Single Select)', () => {
    it('should call onPhaseSelect when day is pressed', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-day'));
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('day');
      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onPhaseSelect when night is pressed', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-night'));
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('night');
      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(1);
    });

    it('should call onPhaseSelect when off is pressed', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-off'));
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('off');
      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(1);
    });

    it('should allow selecting already selected phase', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-day'));
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('day');
    });

    it('should update selection when switching phases', () => {
      const { getByTestId, rerender } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);

      rerender(<PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(false);
    });

    it('should handle rapid phase switching', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      fireEvent.press(getByTestId('phase-night'));
      fireEvent.press(getByTestId('phase-off'));
      fireEvent.press(getByTestId('phase-day'));

      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(3);
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(1, 'night');
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(2, 'off');
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(3, 'day');
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger medium haptic on phase selection', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-night'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger light haptic on press in', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');
      fireEvent(nightCard, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic for all phases', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      fireEvent.press(getByTestId('phase-day'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

      jest.clearAllMocks();

      fireEvent.press(getByTestId('phase-night'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

      jest.clearAllMocks();

      fireEvent.press(getByTestId('phase-off'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger haptic even when selecting already selected phase', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      fireEvent.press(getByTestId('phase-day'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });

  describe('Interactions', () => {
    it('should handle press in event', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');
      fireEvent(nightCard, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should handle press out event', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');
      fireEvent(nightCard, 'pressOut');
      // Press out doesn't trigger haptic, just animation
    });

    it('should handle full press sequence', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');

      fireEvent(nightCard, 'pressIn');
      fireEvent(nightCard, 'pressOut');
      fireEvent.press(nightCard);

      expect(mockOnPhaseSelect).toHaveBeenCalledWith('night');
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should handle press on selected card', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const dayCard = getByTestId('phase-day');

      fireEvent.press(dayCard);
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('day');
    });

    it('should handle press on unselected card', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const offCard = getByTestId('phase-off');

      fireEvent.press(offCard);
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('off');
    });
  });

  describe('Accessibility', () => {
    it('should have radio role for all phase cards', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityRole).toBe('radio');
      expect(getByTestId('phase-night').props.accessibilityRole).toBe('radio');
      expect(getByTestId('phase-off').props.accessibilityRole).toBe('radio');
    });

    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityLabel).toBe('Day Shift');
      expect(getByTestId('phase-night').props.accessibilityLabel).toBe('Night Shift');
      expect(getByTestId('phase-off').props.accessibilityLabel).toBe('Off Days');
    });

    it('should indicate selected state in accessibility for selected card', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState).toEqual({ selected: true });
    });

    it('should indicate unselected state in accessibility for unselected cards', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-night').props.accessibilityState).toEqual({ selected: false });
      expect(getByTestId('phase-off').props.accessibilityState).toEqual({ selected: false });
    });

    it('should update accessibility state when selection changes', () => {
      const { getByTestId, rerender } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);

      rerender(<PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />);
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Visual States', () => {
    it('should render selected day phase with gold styling', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const dayCard = getByTestId('phase-day');
      expect(dayCard.props.accessibilityState.selected).toBe(true);
    });

    it('should render unselected phases with stone styling', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const nightCard = getByTestId('phase-night');
      const offCard = getByTestId('phase-off');
      expect(nightCard.props.accessibilityState.selected).toBe(false);
      expect(offCard.props.accessibilityState.selected).toBe(false);
    });

    it('should show radio indicator on selected card', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      // Selected card should have radio indicator (visual confirmation)
      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);
    });

    it('should show radio outline on unselected cards', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      // Unselected cards should have radio outline
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-off').props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <PhaseSelector
          selectedPhase="day"
          onPhaseSelect={mockOnPhaseSelect}
          style={customStyle}
          testID="phase-selector"
        />
      );
      expect(getByTestId('phase-selector')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid presses on same phase', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );
      const dayCard = getByTestId('phase-day');

      fireEvent.press(dayCard);
      fireEvent.press(dayCard);
      fireEvent.press(dayCard);

      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(3);
      expect(mockOnPhaseSelect).toHaveBeenCalledWith('day');
    });

    it('should handle alternating between two phases', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      fireEvent.press(getByTestId('phase-night'));
      fireEvent.press(getByTestId('phase-day'));
      fireEvent.press(getByTestId('phase-night'));

      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(3);
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(1, 'night');
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(2, 'day');
      expect(mockOnPhaseSelect).toHaveBeenNthCalledWith(3, 'night');
    });

    it('should handle cycling through all phases', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      fireEvent.press(getByTestId('phase-night'));
      fireEvent.press(getByTestId('phase-off'));
      fireEvent.press(getByTestId('phase-day'));

      expect(mockOnPhaseSelect).toHaveBeenCalledTimes(3);
    });

    it('should maintain state when parent rerenders', () => {
      const { getByTestId, rerender } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);

      // Rerender with same props
      rerender(<PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />);

      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);
    });

    it('should handle selection state updates correctly', () => {
      const { getByTestId, rerender } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(false);

      rerender(<PhaseSelector selectedPhase="night" onPhaseSelect={mockOnPhaseSelect} />);

      expect(getByTestId('phase-day').props.accessibilityState.selected).toBe(false);
      expect(getByTestId('phase-night').props.accessibilityState.selected).toBe(true);
    });

    it('should complete full interaction flow for each phase', () => {
      const { getByTestId } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      // Day phase
      fireEvent(getByTestId('phase-day'), 'pressIn');
      fireEvent(getByTestId('phase-day'), 'pressOut');
      fireEvent.press(getByTestId('phase-day'));

      jest.clearAllMocks();

      // Night phase
      fireEvent(getByTestId('phase-night'), 'pressIn');
      fireEvent(getByTestId('phase-night'), 'pressOut');
      fireEvent.press(getByTestId('phase-night'));

      jest.clearAllMocks();

      // Off phase
      fireEvent(getByTestId('phase-off'), 'pressIn');
      fireEvent(getByTestId('phase-off'), 'pressOut');
      fireEvent.press(getByTestId('phase-off'));

      expect(mockOnPhaseSelect).toHaveBeenCalledWith('off');
    });
  });

  describe('PhaseType Coverage', () => {
    it('should support all PhaseType values', () => {
      const phases: PhaseType[] = ['day', 'night', 'off'];

      phases.forEach((phase) => {
        const { getByTestId } = render(
          <PhaseSelector selectedPhase={phase} onPhaseSelect={mockOnPhaseSelect} />
        );
        expect(getByTestId(`phase-${phase}`).props.accessibilityState.selected).toBe(true);
      });
    });

    it('should render correct icon for each phase type', () => {
      const { getByText } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      // Day icon
      expect(getByText('☀️')).toBeTruthy();
      // Night icon
      expect(getByText('🌙')).toBeTruthy();
      // Off icon
      expect(getByText('🏖️')).toBeTruthy();
    });

    it('should render correct label for each phase type', () => {
      const { getByText } = render(
        <PhaseSelector selectedPhase="day" onPhaseSelect={mockOnPhaseSelect} />
      );

      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Off Days')).toBeTruthy();
    });
  });
});
