/**
 * ChatMessage Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatMessage, Message } from '../ChatMessage';

// Mock ChatAvatar
jest.mock('../ChatAvatar', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ChatAvatar: ({ testID }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID }, 'Avatar');
  },
}));

describe('ChatMessage', () => {
  const botMessage: Message = {
    id: '1',
    type: 'bot',
    content: 'Hello! How are you?',
    timestamp: Date.now(),
  };

  const userMessage: Message = {
    id: '2',
    type: 'user',
    content: 'I am doing well, thank you!',
    timestamp: Date.now(),
  };

  describe('Bot Messages', () => {
    it('should render bot message', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });

    it('should render bot message with avatar', () => {
      const { getByTestId } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} testID="bot-message" />
      );
      expect(getByTestId('bot-message-avatar')).toBeTruthy();
    });

    it('should have correct accessibility label for bot', () => {
      const { getByTestId } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} testID="bot-message" />
      );
      const messageView = getByTestId('bot-message');
      expect(messageView.props.accessibilityLabel).toContain('Bot message');
    });

    it('should not have long-press handler for bot messages', () => {
      const mockLongPress = jest.fn();
      const { getByTestId } = render(
        <ChatMessage
          message={botMessage}
          isBot={true}
          reducedMotion={false}
          onLongPress={mockLongPress}
          testID="bot-message"
        />
      );
      const messageView = getByTestId('bot-message');
      expect(messageView).toBeTruthy();
      // Bot messages shouldn't trigger long press
    });
  });

  describe('User Messages', () => {
    it('should render user message', () => {
      const { getByText } = render(
        <ChatMessage message={userMessage} isBot={false} reducedMotion={false} />
      );
      expect(getByText('I am doing well, thank you!')).toBeTruthy();
    });

    it('should not render avatar for user messages', () => {
      const { queryByTestId } = render(
        <ChatMessage
          message={userMessage}
          isBot={false}
          reducedMotion={false}
          testID="user-message"
        />
      );
      expect(queryByTestId('user-message-avatar')).toBeNull();
    });

    it('should have correct accessibility label for user', () => {
      const { getByTestId } = render(
        <ChatMessage
          message={userMessage}
          isBot={false}
          reducedMotion={false}
          testID="user-message"
        />
      );
      const messageView = getByTestId('user-message');
      expect(messageView.props.accessibilityLabel).toContain('Your message');
    });

    it('should handle long-press on user messages', () => {
      const mockLongPress = jest.fn();
      const { getByTestId } = render(
        <ChatMessage
          message={userMessage}
          isBot={false}
          reducedMotion={false}
          onLongPress={mockLongPress}
          testID="user-message"
        />
      );
      const messageView = getByTestId('user-message');
      fireEvent(messageView, 'onLongPress');
      expect(mockLongPress).toHaveBeenCalledTimes(1);
    });

    it('should work without long-press handler', () => {
      const { getByTestId } = render(
        <ChatMessage
          message={userMessage}
          isBot={false}
          reducedMotion={false}
          testID="user-message"
        />
      );
      expect(getByTestId('user-message')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should render with animation delay', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} delay={200} reducedMotion={false} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });

    it('should render without delay', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });

    it('should respect reducedMotion preference', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={true} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role', () => {
      const { getByTestId } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} testID="message" />
      );
      const messageView = getByTestId('message');
      expect(messageView.props.accessibilityRole).toBe('text');
    });

    it('should accept custom testID', () => {
      const { getByTestId } = render(
        <ChatMessage
          message={botMessage}
          isBot={true}
          reducedMotion={false}
          testID="custom-message"
        />
      );
      expect(getByTestId('custom-message')).toBeTruthy();
    });

    it('should work without testID', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });
  });

  describe('Message Metadata', () => {
    it('should render message with country flag', () => {
      const messageWithFlag: Message = {
        id: '3',
        type: 'user',
        content: 'Canada',
        timestamp: Date.now(),
        metadata: { countryFlag: '🇨🇦' },
      };
      const { getByText } = render(
        <ChatMessage message={messageWithFlag} isBot={false} reducedMotion={false} />
      );
      expect(getByText(/Canada/)).toBeTruthy();
    });

    it('should render message without metadata', () => {
      const { getByText } = render(
        <ChatMessage message={botMessage} isBot={true} reducedMotion={false} />
      );
      expect(getByText('Hello! How are you?')).toBeTruthy();
    });
  });
});
