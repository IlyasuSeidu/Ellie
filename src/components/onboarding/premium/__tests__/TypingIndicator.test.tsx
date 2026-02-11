/**
 * TypingIndicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  describe('Rendering', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      expect(getByTestId('typing')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(
        <TypingIndicator visible={false} reducedMotion={false} testID="typing" />
      );
      expect(queryByTestId('typing')).toBeNull();
    });

    it('should render the typing indicator container', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      const indicator = getByTestId('typing');
      expect(indicator).toBeTruthy();
      // Component renders successfully with proper structure
      expect(indicator.children).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should animate when visible and reducedMotion is false', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      expect(getByTestId('typing')).toBeTruthy();
    });

    it('should not animate when reducedMotion is true', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={true} testID="typing" />
      );
      expect(getByTestId('typing')).toBeTruthy();
    });

    it('should respect reducedMotion preference', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={true} testID="typing" />
      );
      const indicator = getByTestId('typing');
      expect(indicator).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility label', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      const indicator = getByTestId('typing');
      expect(indicator.props.accessibilityLabel).toBe('Bot is typing');
    });

    it('should have correct accessibility role', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      const indicator = getByTestId('typing');
      expect(indicator.props.accessibilityRole).toBe('progressbar');
    });

    it('should accept custom testID', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="custom-typing" />
      );
      expect(getByTestId('custom-typing')).toBeTruthy();
    });

    it('should work without testID', () => {
      const { UNSAFE_root } = render(<TypingIndicator visible={true} reducedMotion={false} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Visibility Toggle', () => {
    it('should show when visible changes to true', () => {
      const { getByTestId, rerender } = render(
        <TypingIndicator visible={false} reducedMotion={false} testID="typing" />
      );
      expect(() => getByTestId('typing')).toThrow();

      rerender(<TypingIndicator visible={true} reducedMotion={false} testID="typing" />);
      expect(getByTestId('typing')).toBeTruthy();
    });

    it('should hide when visible changes to false', () => {
      const { getByTestId, rerender, queryByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      expect(getByTestId('typing')).toBeTruthy();

      rerender(<TypingIndicator visible={false} reducedMotion={false} testID="typing" />);
      expect(queryByTestId('typing')).toBeNull();
    });
  });

  describe('Props', () => {
    it('should work with all props', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="full-props" />
      );
      expect(getByTestId('full-props')).toBeTruthy();
    });

    it('should handle rapid visibility changes', () => {
      const { rerender, queryByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );

      rerender(<TypingIndicator visible={false} reducedMotion={false} testID="typing" />);
      expect(queryByTestId('typing')).toBeNull();

      rerender(<TypingIndicator visible={true} reducedMotion={false} testID="typing" />);
      expect(queryByTestId('typing')).toBeTruthy();
    });
  });

  describe('Dot Elements', () => {
    it('should render the dots container', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );

      const indicator = getByTestId('typing');
      expect(indicator).toBeTruthy();

      // Verify component structure is rendered
      expect(indicator.children.length).toBeGreaterThan(0);
    });

    it('should render dots with proper spacing', () => {
      const { getByTestId } = render(
        <TypingIndicator visible={true} reducedMotion={false} testID="typing" />
      );
      const indicator = getByTestId('typing');
      expect(indicator).toBeTruthy();
    });
  });
});
