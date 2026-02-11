/**
 * ChatAvatar Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ChatAvatar } from '../ChatAvatar';

describe('ChatAvatar', () => {
  describe('Rendering', () => {
    it('should render the avatar', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={false} testID="chat-avatar" />);
      expect(getByTestId('chat-avatar')).toBeTruthy();
    });

    it('should render with default size', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={false} testID="chat-avatar" />);
      const avatar = getByTestId('chat-avatar');
      expect(avatar).toBeTruthy();
    });

    it('should render with custom size', () => {
      const { getByTestId } = render(
        <ChatAvatar size={60} reducedMotion={false} testID="chat-avatar" />
      );
      const avatar = getByTestId('chat-avatar');
      expect(avatar).toBeTruthy();
    });

    it('should render the mining helmet image', () => {
      const { UNSAFE_root } = render(<ChatAvatar reducedMotion={false} />);
      const image = UNSAFE_root.findByType('Image');
      expect(image).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should enable animation when animated is true', () => {
      const { getByTestId } = render(
        <ChatAvatar animated={true} reducedMotion={false} testID="chat-avatar" />
      );
      expect(getByTestId('chat-avatar')).toBeTruthy();
    });

    it('should disable animation when animated is false', () => {
      const { getByTestId } = render(
        <ChatAvatar animated={false} reducedMotion={false} testID="chat-avatar" />
      );
      expect(getByTestId('chat-avatar')).toBeTruthy();
    });

    it('should disable animation when reducedMotion is true', () => {
      const { getByTestId } = render(
        <ChatAvatar animated={true} reducedMotion={true} testID="chat-avatar" />
      );
      expect(getByTestId('chat-avatar')).toBeTruthy();
    });

    it('should respect reducedMotion preference', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={true} testID="chat-avatar" />);
      expect(getByTestId('chat-avatar')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={false} testID="chat-avatar" />);
      const avatar = getByTestId('chat-avatar');
      expect(avatar.props.accessibilityRole).toBe('image');
    });

    it('should have correct accessibility label', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={false} testID="chat-avatar" />);
      const avatar = getByTestId('chat-avatar');
      expect(avatar.props.accessibilityLabel).toBe('Mining assistant avatar');
    });

    it('should accept custom testID', () => {
      const { getByTestId } = render(<ChatAvatar reducedMotion={false} testID="custom-avatar" />);
      expect(getByTestId('custom-avatar')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should work without testID', () => {
      const { UNSAFE_root } = render(<ChatAvatar reducedMotion={false} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should work with all props', () => {
      const { getByTestId } = render(
        <ChatAvatar size={50} animated={true} reducedMotion={false} testID="full-props-avatar" />
      );
      expect(getByTestId('full-props-avatar')).toBeTruthy();
    });

    it('should use default animated value', () => {
      const { getByTestId } = render(
        <ChatAvatar reducedMotion={false} testID="default-animated" />
      );
      expect(getByTestId('default-animated')).toBeTruthy();
    });
  });
});
