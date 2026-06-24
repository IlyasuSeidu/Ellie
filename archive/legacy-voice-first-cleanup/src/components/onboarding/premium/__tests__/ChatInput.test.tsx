/**
 * ChatInput Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatInput, QuickReply } from '../ChatInput';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const MockIcon = (props: { name?: string; testID?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
  };
});

describe('ChatInput', () => {
  const mockOnChangeText = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnQuickReply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the input', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type a message"
          testID="chat-input"
        />
      );
      expect(getByTestId('chat-input')).toBeTruthy();
    });

    it('should render with placeholder', () => {
      const { getByPlaceholderText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Enter your name"
          testID="chat-input"
        />
      );
      expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    });

    it('should render input field', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      expect(getByTestId('chat-input-input')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      expect(getByTestId('chat-input-submit')).toBeTruthy();
    });
  });

  describe('Input Interaction', () => {
    it('should call onChangeText when text changes', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const input = getByTestId('chat-input-input');
      fireEvent.changeText(input, 'Hello');
      expect(mockOnChangeText).toHaveBeenCalledWith('Hello');
    });

    it('should display the current value', () => {
      const { getByTestId } = render(
        <ChatInput
          value="Test value"
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const input = getByTestId('chat-input-input');
      expect(input.props.value).toBe('Test value');
    });

    it('should handle empty value', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const input = getByTestId('chat-input-input');
      expect(input.props.value).toBe('');
    });
  });

  describe('Submit Button', () => {
    it('should call onSubmit when submit button is pressed', () => {
      const { getByTestId } = render(
        <ChatInput
          value="Message"
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const submitButton = getByTestId('chat-input-submit');
      fireEvent.press(submitButton);
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable submit button when disabled prop is true', () => {
      const { getByTestId } = render(
        <ChatInput
          value="Message"
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          disabled={true}
          testID="chat-input"
        />
      );
      const submitButton = getByTestId('chat-input-submit');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable submit button when value is not empty', () => {
      const { getByTestId } = render(
        <ChatInput
          value="Message"
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const submitButton = getByTestId('chat-input-submit');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    it('should disable submit button when value is empty', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const submitButton = getByTestId('chat-input-submit');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should display error message', () => {
      const { getByText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          error="Name is required"
          testID="chat-input"
        />
      );
      expect(getByText('Name is required')).toBeTruthy();
    });

    it('should not display error when error is null', () => {
      const { queryByText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      expect(queryByText('Name is required')).toBeNull();
    });

    it('should not display error when error is undefined', () => {
      const { queryByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          error={undefined}
          testID="chat-input"
        />
      );
      expect(queryByTestId('chat-input-error')).toBeNull();
    });
  });

  describe('Quick Replies', () => {
    const quickReplies: QuickReply[] = [
      { id: 'skip', label: 'Skip', value: 'skip' },
      { id: 'help', label: 'Help', value: 'help' },
    ];

    it('should render quick replies when provided', () => {
      const { getByText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          showQuickReplies={true}
          quickReplies={quickReplies}
          onQuickReply={mockOnQuickReply}
          testID="chat-input"
        />
      );
      expect(getByText('Skip')).toBeTruthy();
      expect(getByText('Help')).toBeTruthy();
    });

    it('should call onQuickReply when quick reply is pressed', () => {
      const { getByText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          showQuickReplies={true}
          quickReplies={quickReplies}
          onQuickReply={mockOnQuickReply}
          testID="chat-input"
        />
      );
      const skipButton = getByText('Skip');
      fireEvent.press(skipButton);
      expect(mockOnQuickReply).toHaveBeenCalledWith(quickReplies[0]);
    });

    it('should not render quick replies when showQuickReplies is false', () => {
      const { queryByText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          showQuickReplies={false}
          quickReplies={quickReplies}
          onQuickReply={mockOnQuickReply}
          testID="chat-input"
        />
      );
      expect(queryByText('Skip')).toBeNull();
    });

    it('should not render quick replies when array is empty', () => {
      const { queryByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          showQuickReplies={true}
          quickReplies={[]}
          onQuickReply={mockOnQuickReply}
          testID="chat-input"
        />
      );
      expect(queryByTestId('chat-input-quick-replies')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility labels', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Enter your name"
          testID="chat-input"
        />
      );
      const input = getByTestId('chat-input-input');
      const submit = getByTestId('chat-input-submit');

      expect(input.props.accessibilityLabel).toBe('Enter your name');
      expect(submit.props.accessibilityLabel).toBe('Submit response');
    });

    it('should have correct accessibility role for submit button', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      const submit = getByTestId('chat-input-submit');
      expect(submit.props.accessibilityRole).toBe('button');
    });
  });

  describe('Props', () => {
    it('should work with all optional props undefined', () => {
      const { getByTestId } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Type..."
          testID="chat-input"
        />
      );
      expect(getByTestId('chat-input')).toBeTruthy();
    });

    it('should work without testID', () => {
      const { getByPlaceholderText } = render(
        <ChatInput
          value=""
          onChangeText={mockOnChangeText}
          onSubmit={mockOnSubmit}
          placeholder="Enter text"
        />
      );
      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });
  });
});
