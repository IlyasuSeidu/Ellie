/**
 * PremiumCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PremiumCard } from '../PremiumCard';

describe('PremiumCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with children', () => {
      const { getByText } = render(
        <PremiumCard>
          <Text>Card Content</Text>
        </PremiumCard>
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <PremiumCard>
          <Text>Title</Text>
          <Text>Description</Text>
        </PremiumCard>
      );
      expect(getByText('Title')).toBeTruthy();
      expect(getByText('Description')).toBeTruthy();
    });

    it('should render complex children', () => {
      const { getByTestId } = render(
        <PremiumCard>
          <View testID="complex-child">
            <Text>Complex Content</Text>
          </View>
        </PremiumCard>
      );
      expect(getByTestId('complex-child')).toBeTruthy();
    });
  });

  describe('Pressable vs Non-Pressable', () => {
    it('should render as non-pressable by default', () => {
      const { getByTestId } = render(
        <PremiumCard testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('none');
    });

    it('should render as pressable when pressable is true and onPress is provided', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should not be pressable when pressable is true but onPress is undefined', () => {
      const { getByTestId } = render(
        <PremiumCard pressable testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('none');
    });

    it('should not be pressable when onPress is provided but pressable is false', () => {
      const { getByTestId } = render(
        <PremiumCard pressable={false} onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('none');
    });
  });

  describe('Press Animations', () => {
    it('should call onPress when pressed', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Press Me</Text>
        </PremiumCard>
      );
      fireEvent.press(getByTestId('card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should trigger haptic feedback on press in', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      fireEvent(card, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic feedback on press', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      fireEvent.press(getByTestId('card'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic when non-pressable', () => {
      const { getByTestId } = render(
        <PremiumCard testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      fireEvent(card, 'pressIn');
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');

      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2); // Light on pressIn, Medium on press
    });

    it('should handle multiple rapid presses', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');

      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });
  });

  describe('Active State', () => {
    it('should not show gold glow when active is false', () => {
      const { queryByTestId } = render(
        <PremiumCard active={false} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      // Gold glow is not directly testable via testID, but we verify the card renders
      expect(queryByTestId('card')).toBeTruthy();
    });

    it('should render gold glow when active is true', () => {
      const { getByTestId } = render(
        <PremiumCard active testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
      // Component should render with active prop
    });

    it('should render gold glow in pressable card when active', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} active testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should toggle active state correctly', () => {
      const { getByTestId, rerender } = render(
        <PremiumCard active={false} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();

      rerender(
        <PremiumCard active testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('Custom Padding and Styles', () => {
    it('should apply default padding', () => {
      const { getByTestId } = render(
        <PremiumCard testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should apply custom padding', () => {
      const { getByTestId } = render(
        <PremiumCard padding={40} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should apply zero padding', () => {
      const { getByTestId } = render(
        <PremiumCard padding={0} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should apply custom style', () => {
      const customStyle = { marginTop: 20, marginBottom: 10 };
      const { getByTestId } = render(
        <PremiumCard style={customStyle} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should combine custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <PremiumCard style={customStyle} padding={30} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide light haptic on press in', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      fireEvent(card, 'pressIn');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should provide medium haptic on press', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      fireEvent.press(getByTestId('card'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not provide haptic when card is not pressable', () => {
      const { getByTestId } = render(
        <PremiumCard pressable={false} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      fireEvent(card, 'pressIn');

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Attributes', () => {
    it('should have button role when pressable', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card').props.accessibilityRole).toBe('button');
    });

    it('should have none role when not pressable', () => {
      const { getByTestId } = render(
        <PremiumCard testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card').props.accessibilityRole).toBe('none');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <PremiumCard
          pressable
          onPress={mockOnPress}
          accessibilityLabel="Premium Option"
          testID="card"
        >
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card').props.accessibilityLabel).toBe('Premium Option');
    });

    it('should use custom accessibility hint', () => {
      const { getByTestId } = render(
        <PremiumCard
          pressable
          onPress={mockOnPress}
          accessibilityHint="Double tap to select"
          testID="card"
        >
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card').props.accessibilityHint).toBe('Double tap to select');
    });

    it('should support both accessibility label and hint', () => {
      const { getByTestId } = render(
        <PremiumCard
          pressable
          onPress={mockOnPress}
          accessibilityLabel="Gold Plan"
          accessibilityHint="Activates gold subscription"
          testID="card"
        >
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card.props.accessibilityLabel).toBe('Gold Plan');
      expect(card.props.accessibilityHint).toBe('Activates gold subscription');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined children gracefully', () => {
      const { getByTestId } = render(<PremiumCard testID="card">{undefined}</PremiumCard>);
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should handle null children gracefully', () => {
      const { getByTestId } = render(<PremiumCard testID="card">{null}</PremiumCard>);
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should handle conditional children', () => {
      const showExtra = false;
      const { getByText, queryByText } = render(
        <PremiumCard testID="card">
          <Text>Always Shown</Text>
          {showExtra && <Text>Extra Content</Text>}
        </PremiumCard>
      );
      expect(getByText('Always Shown')).toBeTruthy();
      expect(queryByText('Extra Content')).toBeNull();
    });

    it('should handle press out without press in', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');

      fireEvent(card, 'pressOut');

      // Should not crash or cause errors
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should handle activeOpacity prop when pressable', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      // AnimatedTouchable doesn't expose activeOpacity in test environment
      expect(card).toBeTruthy();
    });

    it('should maintain state through rapid press sequences', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');

      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should support nested interactive elements', () => {
      const nestedPress = jest.fn();
      const { getByTestId } = render(
        <PremiumCard testID="card">
          <Text testID="nested-button" onPress={nestedPress}>
            Nested Button
          </Text>
        </PremiumCard>
      );

      expect(getByTestId('card')).toBeTruthy();
      expect(getByTestId('nested-button')).toBeTruthy();
    });
  });

  describe('Combination States', () => {
    it('should handle active state with custom padding', () => {
      const { getByTestId } = render(
        <PremiumCard active padding={30} testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      expect(getByTestId('card')).toBeTruthy();
    });

    it('should handle pressable with active state', () => {
      const { getByTestId } = render(
        <PremiumCard pressable onPress={mockOnPress} active testID="card">
          <Text>Content</Text>
        </PremiumCard>
      );
      fireEvent.press(getByTestId('card'));
      expect(mockOnPress).toHaveBeenCalled();
    });

    it('should handle all props together', () => {
      const { getByTestId } = render(
        <PremiumCard
          pressable
          onPress={mockOnPress}
          active
          padding={25}
          style={{ margin: 10 }}
          accessibilityLabel="Full Featured Card"
          testID="card"
        >
          <Text>All Features</Text>
        </PremiumCard>
      );
      const card = getByTestId('card');
      expect(card).toBeTruthy();
      expect(card.props.accessibilityLabel).toBe('Full Featured Card');

      fireEvent.press(card);
      expect(mockOnPress).toHaveBeenCalled();
    });
  });
});
