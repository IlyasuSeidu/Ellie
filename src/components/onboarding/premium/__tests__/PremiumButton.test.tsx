/**
 * PremiumButton Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PremiumButton } from '../PremiumButton';

describe('PremiumButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with title', () => {
      const { getByText } = render(<PremiumButton title="Test Button" onPress={mockOnPress} />);
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should render primary variant by default', () => {
      const { getByText } = render(<PremiumButton title="Primary" onPress={mockOnPress} />);
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <PremiumButton title="Secondary" onPress={mockOnPress} variant="secondary" />
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <PremiumButton title="Outline" onPress={mockOnPress} variant="outline" />
      );
      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render with left icon', () => {
      const icon = <Text testID="test-icon">Icon</Text>;
      const { getByTestId } = render(
        <PremiumButton title="With Icon" onPress={mockOnPress} icon={icon} iconPosition="left" />
      );
      expect(getByTestId('test-icon')).toBeTruthy();
    });

    it('should render with right icon', () => {
      const icon = <Text testID="test-icon">Icon</Text>;
      const { getByTestId } = render(
        <PremiumButton title="With Icon" onPress={mockOnPress} icon={icon} iconPosition="right" />
      );
      expect(getByTestId('test-icon')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <PremiumButton title="Small" onPress={mockOnPress} size="small" />
      );
      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size by default', () => {
      const { getByText } = render(<PremiumButton title="Medium" onPress={mockOnPress} />);
      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <PremiumButton title="Large" onPress={mockOnPress} size="large" />
      );
      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should show loading indicator when loading', () => {
      const { getByTestId } = render(
        <PremiumButton title="Loading" onPress={mockOnPress} loading testID="button" />
      );
      expect(getByTestId('button-loader')).toBeTruthy();
    });

    it('should not call onPress when loading', () => {
      const { getByTestId } = render(
        <PremiumButton title="Loading" onPress={mockOnPress} loading testID="button" />
      );
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should apply disabled styles when disabled', () => {
      const { getByTestId } = render(
        <PremiumButton title="Disabled" onPress={mockOnPress} disabled testID="button" />
      );
      const button = getByTestId('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('should not call onPress when disabled', () => {
      const { getByTestId } = render(
        <PremiumButton title="Disabled" onPress={mockOnPress} disabled testID="button" />
      );
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const { getByTestId } = render(
        <PremiumButton title="Press Me" onPress={mockOnPress} testID="button" />
      );
      fireEvent.press(getByTestId('button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should trigger haptic feedback on press', () => {
      const { getByTestId } = render(
        <PremiumButton title="Haptic" onPress={mockOnPress} testID="button" />
      );
      fireEvent.press(getByTestId('button'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger light haptic on press in', () => {
      const { getByTestId } = render(
        <PremiumButton title="Haptic" onPress={mockOnPress} testID="button" />
      );
      const button = getByTestId('button');
      fireEvent(button, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic when disabled', () => {
      const { getByTestId } = render(
        <PremiumButton title="Disabled" onPress={mockOnPress} disabled testID="button" />
      );
      const button = getByTestId('button');
      fireEvent(button, 'pressIn');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByTestId } = render(
        <PremiumButton title="Accessible" onPress={mockOnPress} testID="button" />
      );
      expect(getByTestId('button').props.accessibilityRole).toBe('button');
    });

    it('should use title as accessibility label by default', () => {
      const { getByTestId } = render(
        <PremiumButton title="Button Title" onPress={mockOnPress} testID="button" />
      );
      expect(getByTestId('button').props.accessibilityLabel).toBe('Button Title');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <PremiumButton
          title="Button"
          onPress={mockOnPress}
          accessibilityLabel="Custom Label"
          testID="button"
        />
      );
      expect(getByTestId('button').props.accessibilityLabel).toBe('Custom Label');
    });

    it('should include accessibility hint', () => {
      const { getByTestId } = render(
        <PremiumButton
          title="Button"
          onPress={mockOnPress}
          accessibilityHint="Double tap to activate"
          testID="button"
        />
      );
      expect(getByTestId('button').props.accessibilityHint).toBe('Double tap to activate');
    });

    it('should indicate disabled state in accessibility', () => {
      const { getByTestId } = render(
        <PremiumButton title="Disabled" onPress={mockOnPress} disabled testID="button" />
      );
      expect(getByTestId('button').props.accessibilityState).toEqual({ disabled: true });
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <PremiumButton title="Styled" onPress={mockOnPress} style={customStyle} testID="button" />
      );
      expect(getByTestId('button')).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByText } = render(
        <PremiumButton title="Styled Text" onPress={mockOnPress} textStyle={customTextStyle} />
      );
      expect(getByText('Styled Text')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(
        <PremiumButton title="Sequential" onPress={mockOnPress} testID="button" />
      );
      const button = getByTestId('button');

      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid presses', () => {
      const { getByTestId } = render(
        <PremiumButton title="Rapid" onPress={mockOnPress} testID="button" />
      );
      const button = getByTestId('button');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('should not show loader when disabled but not loading', () => {
      const { queryByTestId } = render(
        <PremiumButton title="Disabled" onPress={mockOnPress} disabled testID="button" />
      );
      expect(queryByTestId('button-loader')).toBeNull();
    });
  });
});
