/**
 * DayCell Component
 *
 * Calendar day cell with selection, disabled, and today states using stone and gold theme
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface DayCellProps {
  /** Day number (1-31) */
  day: number;
  /** Whether this day is selected */
  selected?: boolean;
  /** Whether this day is today */
  isToday?: boolean;
  /** Whether this day is disabled */
  disabled?: boolean;
  /** Whether this day is in a different month */
  isOtherMonth?: boolean;
  /** Press handler */
  onPress?: (day: number) => void;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const DayCell: React.FC<DayCellProps> = ({
  day,
  selected = false,
  isToday = false,
  disabled = false,
  isOtherMonth = false,
  onPress,
  accessibilityLabel,
  testID,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.8, { duration: 100 });
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `DayCell.pressIn:${day}`,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: `DayCell.press:${day}`,
      });
      onPress(day);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const containerStyle = [
    styles.container,
    selected && styles.selectedContainer,
    isToday && !selected && styles.todayContainer,
    disabled && styles.disabledContainer,
  ];

  const textStyle = [
    styles.text,
    selected && styles.selectedText,
    isToday && !selected && styles.todayText,
    disabled && styles.disabledText,
    isOtherMonth && styles.otherMonthText,
  ];

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[animatedStyle, containerStyle]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || `${isToday ? 'Today, ' : ''}${selected ? 'Selected, ' : ''}Day ${day}`
      }
      accessibilityState={{ disabled, selected }}
      testID={testID}
    >
      <Animated.Text style={textStyle}>{day}</Animated.Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedContainer: {
    backgroundColor: theme.colors.sacredGold,
    borderColor: theme.colors.brightGold,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  todayContainer: {
    borderColor: theme.colors.sacredGold,
    borderWidth: 2,
  },
  disabledContainer: {
    opacity: 0.3,
  },
  text: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.paper,
  },
  selectedText: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  todayText: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  disabledText: {
    color: theme.colors.shadow,
  },
  otherMonthText: {
    color: theme.colors.shadow,
    opacity: 0.5,
  },
});
