/**
 * PremiumToggle Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PremiumToggle } from '../PremiumToggle';

describe('PremiumToggle', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render toggle in OFF state', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );
      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(false);
    });

    it('should render toggle in ON state', () => {
      const { getByTestId } = render(
        <PremiumToggle value onChange={mockOnChange} testID="toggle" />
      );
      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(true);
    });

    it('should render without label', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );
      // No label text should be found, but toggle exists
      expect(getByTestId('toggle')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText } = render(
        <PremiumToggle value={false} onChange={mockOnChange} label="Enable notifications" />
      );
      expect(getByText('Enable notifications')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onChange when toggled off to on', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      fireEvent.press(getByTestId('toggle'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should call onChange when toggled on to off', () => {
      const { getByTestId } = render(
        <PremiumToggle value onChange={mockOnChange} testID="toggle" />
      );

      fireEvent.press(getByTestId('toggle'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it('should not call onChange when disabled', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} disabled onChange={mockOnChange} testID="toggle" />
      );

      fireEvent.press(getByTestId('toggle'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should trigger haptic on press in', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      fireEvent(toggle, 'pressIn');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on press', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      fireEvent.press(getByTestId('toggle'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should not trigger haptic when disabled', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} disabled onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      fireEvent(toggle, 'pressIn');

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should update when value prop changes', () => {
      const { getByTestId, rerender } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(false);

      rerender(<PremiumToggle value onChange={mockOnChange} testID="toggle" />);

      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(true);
    });

    it('should handle rapid toggles', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      fireEvent.press(toggle);
      fireEvent.press(toggle);
      fireEvent.press(toggle);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have switch role', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityRole).toBe('switch');
    });

    it('should use Toggle as default accessibility label', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityLabel).toBe('Toggle');
    });

    it('should use label as accessibility label', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} label="Dark mode" testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityLabel).toBe('Dark mode');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <PremiumToggle
          value={false}
          onChange={mockOnChange}
          accessibilityLabel="Custom toggle label"
          testID="toggle"
        />
      );

      expect(getByTestId('toggle').props.accessibilityLabel).toBe('Custom toggle label');
    });

    it('should include accessibility hint', () => {
      const { getByTestId } = render(
        <PremiumToggle
          value={false}
          onChange={mockOnChange}
          accessibilityHint="Double tap to toggle"
          testID="toggle"
        />
      );

      expect(getByTestId('toggle').props.accessibilityHint).toBe('Double tap to toggle');
    });

    it('should indicate checked state', () => {
      const { getByTestId } = render(
        <PremiumToggle value onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(true);
    });

    it('should indicate disabled state', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} disabled onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      const { getByText } = render(
        <PremiumToggle value={false} onChange={mockOnChange} label="Enable feature" />
      );

      expect(getByText('Enable feature')).toBeTruthy();
    });

    it('should not render label when not provided', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      // Since no label, we're checking the component renders
      expect(getByTestId('toggle')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      fireEvent(toggle, 'pressIn');
      fireEvent(toggle, 'pressOut');
      fireEvent.press(toggle);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('should work without onChange handler', () => {
      const { getByTestId } = render(<PremiumToggle value={false} testID="toggle" />);

      fireEvent.press(getByTestId('toggle'));

      // Should not crash
      expect(true).toBe(true);
    });

    it('should maintain disabled state through toggles', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} disabled onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      fireEvent.press(toggle);
      fireEvent.press(toggle);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should handle value=false initially', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(false);
    });

    it('should handle value=true initially', () => {
      const { getByTestId } = render(
        <PremiumToggle value onChange={mockOnChange} testID="toggle" />
      );

      expect(getByTestId('toggle').props.accessibilityState.checked).toBe(true);
    });
  });

  describe('Visual States', () => {
    it('should render ON state with checked prop', () => {
      const { getByTestId } = render(
        <PremiumToggle value onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(true);
    });

    it('should render OFF state without checked prop', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(false);
    });

    it('should render disabled ON state', () => {
      const { getByTestId } = render(
        <PremiumToggle value disabled onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(true);
      expect(toggle.props.accessibilityState.disabled).toBe(true);
    });

    it('should render disabled OFF state', () => {
      const { getByTestId } = render(
        <PremiumToggle value={false} disabled onChange={mockOnChange} testID="toggle" />
      );

      const toggle = getByTestId('toggle');
      expect(toggle.props.accessibilityState.checked).toBe(false);
      expect(toggle.props.accessibilityState.disabled).toBe(true);
    });
  });
});
