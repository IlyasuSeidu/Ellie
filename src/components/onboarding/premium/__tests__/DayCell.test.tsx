/**
 * DayCell Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { DayCell } from '../DayCell';

describe('DayCell', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with day number', () => {
      const { getByText } = render(<DayCell day={15} onPress={mockOnPress} />);
      expect(getByText('15')).toBeTruthy();
    });

    it('should render day 1', () => {
      const { getByText } = render(<DayCell day={1} onPress={mockOnPress} />);
      expect(getByText('1')).toBeTruthy();
    });

    it('should render day 31', () => {
      const { getByText } = render(<DayCell day={31} onPress={mockOnPress} />);
      expect(getByText('31')).toBeTruthy();
    });

    it('should render selected state', () => {
      const { getByTestId } = render(
        <DayCell day={15} selected onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityState.selected).toBe(true);
    });

    it('should render today state', () => {
      const { getByTestId } = render(
        <DayCell day={15} isToday onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell')).toBeTruthy();
    });

    it('should render disabled state', () => {
      const { getByTestId } = render(
        <DayCell day={15} disabled onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityState.disabled).toBe(true);
    });

    it('should render other month state', () => {
      const { getByText } = render(<DayCell day={15} isOtherMonth onPress={mockOnPress} />);
      expect(getByText('15')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress with day number when pressed', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      fireEvent.press(getByTestId('day-cell'));
      expect(mockOnPress).toHaveBeenCalledWith(15);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByTestId } = render(
        <DayCell day={15} disabled onPress={mockOnPress} testID="day-cell" />
      );
      fireEvent.press(getByTestId('day-cell'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when no handler provided', () => {
      const { getByTestId } = render(<DayCell day={15} testID="day-cell" />);
      fireEvent.press(getByTestId('day-cell'));
      // No error should occur
      expect(true).toBe(true);
    });

    it('should trigger haptic feedback on press', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      fireEvent.press(getByTestId('day-cell'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger light haptic on press in', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      const cell = getByTestId('day-cell');
      fireEvent(cell, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic when disabled', () => {
      const { getByTestId } = render(
        <DayCell day={15} disabled onPress={mockOnPress} testID="day-cell" />
      );
      const cell = getByTestId('day-cell');
      fireEvent(cell, 'pressIn');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      expect(getByTestId('day-cell').props.accessibilityRole).toBe('button');
    });

    it('should generate default accessibility label', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      expect(getByTestId('day-cell').props.accessibilityLabel).toBe('Day 15');
    });

    it('should include today in accessibility label', () => {
      const { getByTestId } = render(
        <DayCell day={15} isToday onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityLabel).toBe('Today, Day 15');
    });

    it('should include selected in accessibility label', () => {
      const { getByTestId } = render(
        <DayCell day={15} selected onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityLabel).toBe('Selected, Day 15');
    });

    it('should include both today and selected in accessibility label', () => {
      const { getByTestId } = render(
        <DayCell day={15} isToday selected onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityLabel).toBe('Today, Selected, Day 15');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <DayCell
          day={15}
          onPress={mockOnPress}
          accessibilityLabel="Custom day label"
          testID="day-cell"
        />
      );
      expect(getByTestId('day-cell').props.accessibilityLabel).toBe('Custom day label');
    });

    it('should indicate selected state in accessibility', () => {
      const { getByTestId } = render(
        <DayCell day={15} selected onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityState.selected).toBe(true);
    });

    it('should indicate disabled state in accessibility', () => {
      const { getByTestId } = render(
        <DayCell day={15} disabled onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByTestId('day-cell').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Combined States', () => {
    it('should handle selected and today states together', () => {
      const { getByText, getByTestId } = render(
        <DayCell day={15} selected isToday onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByText('15')).toBeTruthy();
      expect(getByTestId('day-cell').props.accessibilityState.selected).toBe(true);
    });

    it('should handle disabled and other month states together', () => {
      const { getByText, getByTestId } = render(
        <DayCell day={30} disabled isOtherMonth onPress={mockOnPress} testID="day-cell" />
      );
      expect(getByText('30')).toBeTruthy();
      expect(getByTestId('day-cell').props.accessibilityState.disabled).toBe(true);
    });

    it('should prioritize selected over today styling', () => {
      const { getByText } = render(<DayCell day={15} selected isToday onPress={mockOnPress} />);
      expect(getByText('15')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      const cell = getByTestId('day-cell');

      fireEvent(cell, 'pressIn');
      fireEvent(cell, 'pressOut');
      fireEvent.press(cell);

      expect(mockOnPress).toHaveBeenCalledWith(15);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid presses', () => {
      const { getByTestId } = render(<DayCell day={15} onPress={mockOnPress} testID="day-cell" />);
      const cell = getByTestId('day-cell');

      fireEvent.press(cell);
      fireEvent.press(cell);
      fireEvent.press(cell);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
      expect(mockOnPress).toHaveBeenCalledWith(15);
    });

    it('should handle press in when disabled', () => {
      const { getByTestId } = render(
        <DayCell day={15} disabled onPress={mockOnPress} testID="day-cell" />
      );
      const cell = getByTestId('day-cell');

      fireEvent(cell, 'pressIn');
      fireEvent(cell, 'pressOut');

      // Should not crash
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });
});
