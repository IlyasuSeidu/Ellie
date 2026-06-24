/**
 * PremiumTextInput Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PremiumTextInput } from '../PremiumTextInput';

describe('PremiumTextInput', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with label and value', () => {
      const { getByText, getByDisplayValue } = render(
        <PremiumTextInput label="Name" value="John Doe" onChangeText={mockOnChangeText} />
      );
      expect(getByText('Name')).toBeTruthy();
      expect(getByDisplayValue('John Doe')).toBeTruthy();
    });

    it('should render with empty value', () => {
      const { getByText } = render(
        <PremiumTextInput label="Email" value="" onChangeText={mockOnChangeText} />
      );
      expect(getByText('Email')).toBeTruthy();
    });

    it('should render with left icon', () => {
      const icon = <Text testID="left-icon">L</Text>;
      const { getByTestId } = render(
        <PremiumTextInput label="Search" value="" onChangeText={mockOnChangeText} leftIcon={icon} />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
    });

    it('should render with right icon', () => {
      const icon = <Text testID="right-icon">R</Text>;
      const { getByTestId } = render(
        <PremiumTextInput
          label="Password"
          value=""
          onChangeText={mockOnChangeText}
          rightIcon={icon}
        />
      );
      expect(getByTestId('right-icon')).toBeTruthy();
    });

    it('should render in multiline mode', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Description"
          value=""
          onChangeText={mockOnChangeText}
          multiline
          numberOfLines={4}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(4);
    });
  });

  describe('Floating Label Animation', () => {
    it('should animate label on focus', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Username"
          value=""
          onChangeText={mockOnChangeText}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      fireEvent(input, 'focus');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should animate label on blur with value', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Username"
          value="testuser"
          onChangeText={mockOnChangeText}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      fireEvent(input, 'blur');

      // Label should stay elevated when value exists
      expect(input.props.value).toBe('testuser');
    });

    it('should animate label on blur without value', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Username"
          value=""
          onChangeText={mockOnChangeText}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      fireEvent(input, 'blur');

      // Label should return to default position
      expect(input.props.value).toBe('');
    });
  });

  describe('Text Input Changes', () => {
    it('should call onChangeText when text changes', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Email" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');
      fireEvent.changeText(input, 'test@example.com');

      expect(mockOnChangeText).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle multiple text changes', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Name" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');

      fireEvent.changeText(input, 'J');
      fireEvent.changeText(input, 'Jo');
      fireEvent.changeText(input, 'John');

      expect(mockOnChangeText).toHaveBeenCalledTimes(3);
      expect(mockOnChangeText).toHaveBeenLastCalledWith('John');
    });
  });

  describe('Clear Button Functionality', () => {
    it('should show clear button when value exists and showClearButton is true', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Search"
          value="search term"
          onChangeText={mockOnChangeText}
          showClearButton
          testID="input"
        />
      );
      expect(getByTestId('input-clear')).toBeTruthy();
    });

    it('should not show clear button when value is empty', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Search"
          value=""
          onChangeText={mockOnChangeText}
          showClearButton
          testID="input"
        />
      );
      expect(queryByTestId('input-clear')).toBeNull();
    });

    it('should not show clear button when showClearButton is false', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Search"
          value="search term"
          onChangeText={mockOnChangeText}
          showClearButton={false}
          testID="input"
        />
      );
      expect(queryByTestId('input-clear')).toBeNull();
    });

    it('should clear input when clear button is pressed', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Search"
          value="search term"
          onChangeText={mockOnChangeText}
          showClearButton
          testID="input"
        />
      );
      const clearButton = getByTestId('input-clear');
      fireEvent.press(clearButton);

      expect(mockOnChangeText).toHaveBeenCalledWith('');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not show clear button when right icon is present', () => {
      const icon = <Text testID="right-icon">R</Text>;
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Password"
          value="password"
          onChangeText={mockOnChangeText}
          showClearButton
          rightIcon={icon}
          testID="input"
        />
      );
      expect(queryByTestId('input-clear')).toBeNull();
      expect(queryByTestId('right-icon')).toBeTruthy();
    });
  });

  describe('Error and Success States', () => {
    it('should display error message when error prop is provided', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Email"
          value="invalid"
          onChangeText={mockOnChangeText}
          error="Invalid email address"
          testID="input"
        />
      );
      expect(getByTestId('input-error')).toBeTruthy();
      expect(getByTestId('input-error').props.children).toBe('Invalid email address');
    });

    it('should not display error when error prop is undefined', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Email"
          value="valid@example.com"
          onChangeText={mockOnChangeText}
          testID="input"
        />
      );
      expect(queryByTestId('input-error')).toBeNull();
    });

    it('should apply success state styling', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Email"
          value="valid@example.com"
          onChangeText={mockOnChangeText}
          success
          testID="input"
        />
      );
      expect(getByTestId('input')).toBeTruthy();
    });

    it('should prioritize error over success', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Email"
          value="test"
          onChangeText={mockOnChangeText}
          error="Error message"
          success
          testID="input"
        />
      );
      expect(getByTestId('input-error')).toBeTruthy();
    });
  });

  describe('Character Counter', () => {
    it('should display character counter when showCharacterCounter is true', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Bio"
          value="Hello"
          onChangeText={mockOnChangeText}
          showCharacterCounter
          maxLength={100}
          testID="input"
        />
      );
      expect(getByTestId('input-counter')).toBeTruthy();
      expect(getByTestId('input-counter').props.children).toBe('5/100');
    });

    it('should update character counter as text changes', () => {
      const { getByTestId, rerender } = render(
        <PremiumTextInput
          label="Bio"
          value="Hello"
          onChangeText={mockOnChangeText}
          showCharacterCounter
          maxLength={100}
          testID="input"
        />
      );
      expect(getByTestId('input-counter').props.children).toBe('5/100');

      rerender(
        <PremiumTextInput
          label="Bio"
          value="Hello World"
          onChangeText={mockOnChangeText}
          showCharacterCounter
          maxLength={100}
          testID="input"
        />
      );
      expect(getByTestId('input-counter').props.children).toBe('11/100');
    });

    it('should not display counter when showCharacterCounter is false', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Bio"
          value="Hello"
          onChangeText={mockOnChangeText}
          showCharacterCounter={false}
          maxLength={100}
          testID="input"
        />
      );
      expect(queryByTestId('input-counter')).toBeNull();
    });

    it('should not display counter when error is shown', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Bio"
          value="Hello"
          onChangeText={mockOnChangeText}
          showCharacterCounter
          maxLength={100}
          error="Error message"
          testID="input"
        />
      );
      expect(queryByTestId('input-counter')).toBeNull();
    });

    it('should not display counter without maxLength', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Bio"
          value="Hello"
          onChangeText={mockOnChangeText}
          showCharacterCounter
          testID="input"
        />
      );
      expect(queryByTestId('input-counter')).toBeNull();
    });
  });

  describe('Multiline Mode', () => {
    it('should render multiline input with correct props', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Comments"
          value=""
          onChangeText={mockOnChangeText}
          multiline
          numberOfLines={5}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      expect(input.props.multiline).toBe(true);
      expect(input.props.numberOfLines).toBe(5);
      expect(input.props.textAlignVertical).toBe('top');
    });

    it('should use default numberOfLines when not specified', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Comments"
          value=""
          onChangeText={mockOnChangeText}
          multiline
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      expect(input.props.numberOfLines).toBe(1);
    });

    it('should set textAlignVertical to center for single line', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Name" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');
      expect(input.props.textAlignVertical).toBe('center');
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger haptic feedback on focus', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Email" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');
      fireEvent(input, 'focus');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic feedback on clear', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Search"
          value="search term"
          onChangeText={mockOnChangeText}
          showClearButton
          testID="input"
        />
      );
      const clearButton = getByTestId('input-clear');
      fireEvent.press(clearButton);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have correct testID structure', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Username"
          value=""
          onChangeText={mockOnChangeText}
          testID="username-input"
        />
      );
      expect(getByTestId('username-input')).toBeTruthy();
      expect(getByTestId('username-input-input')).toBeTruthy();
    });

    it('should pass through TextInput props', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Email"
          value=""
          onChangeText={mockOnChangeText}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      expect(input.props.placeholder).toBe('Enter email');
      expect(input.props.keyboardType).toBe('email-address');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('should enforce maxLength', () => {
      const { getByTestId } = render(
        <PremiumTextInput
          label="Code"
          value=""
          onChangeText={mockOnChangeText}
          maxLength={6}
          testID="input"
        />
      );
      const input = getByTestId('input-input');
      expect(input.props.maxLength).toBe(6);
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <PremiumTextInput
          label="Name"
          value=""
          onChangeText={mockOnChangeText}
          containerStyle={customStyle}
          testID="input"
        />
      );
      expect(getByTestId('input')).toBeTruthy();
    });

    it('should apply custom input style', () => {
      const customInputStyle = { fontSize: 18 };
      const { getByTestId } = render(
        <PremiumTextInput
          label="Name"
          value=""
          onChangeText={mockOnChangeText}
          inputStyle={customInputStyle}
          testID="input"
        />
      );
      expect(getByTestId('input-input')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle focus and blur sequence', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Email" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');

      fireEvent(input, 'focus');
      fireEvent.changeText(input, 'test@example.com');
      fireEvent(input, 'blur');

      expect(mockOnChangeText).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle rapid text changes', () => {
      const { getByTestId } = render(
        <PremiumTextInput label="Search" value="" onChangeText={mockOnChangeText} testID="input" />
      );
      const input = getByTestId('input-input');

      fireEvent.changeText(input, 't');
      fireEvent.changeText(input, 'te');
      fireEvent.changeText(input, 'tes');
      fireEvent.changeText(input, 'test');

      expect(mockOnChangeText).toHaveBeenCalledTimes(4);
    });

    it('should handle empty string after having value', () => {
      const { getByTestId, rerender } = render(
        <PremiumTextInput
          label="Name"
          value="John"
          onChangeText={mockOnChangeText}
          testID="input"
        />
      );

      rerender(
        <PremiumTextInput label="Name" value="" onChangeText={mockOnChangeText} testID="input" />
      );

      const input = getByTestId('input-input');
      expect(input.props.value).toBe('');
    });

    it('should show both left icon and clear button', () => {
      const icon = <Text testID="left-icon">L</Text>;
      const { getByTestId } = render(
        <PremiumTextInput
          label="Search"
          value="search term"
          onChangeText={mockOnChangeText}
          leftIcon={icon}
          showClearButton
          testID="input"
        />
      );
      expect(getByTestId('left-icon')).toBeTruthy();
      expect(getByTestId('input-clear')).toBeTruthy();
    });

    it('should handle maxLength of 0', () => {
      const { queryByTestId } = render(
        <PremiumTextInput
          label="Code"
          value=""
          onChangeText={mockOnChangeText}
          maxLength={0}
          showCharacterCounter
          testID="input"
        />
      );
      // Counter should not render when maxLength is 0 (falsy)
      expect(queryByTestId('input-counter')).toBeNull();
    });
  });
});
