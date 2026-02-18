/**
 * ShiftCalendarDayCell Component
 *
 * Enhanced calendar day cell with shift type visualization.
 * Color-coded backgrounds, shift type badges (D/N/O/M/A),
 * today indicator with pulsing gold ring, and press animation.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import type { ShiftType } from '@/types';

export interface ShiftCalendarDayCellProps {
  /** Day number (1-31) */
  day: number;
  /** Shift type for this day */
  shiftType?: ShiftType;
  /** Whether this day is today */
  isToday?: boolean;
  /** Whether this day is selected */
  selected?: boolean;
  /** Whether this day is in a different month (greyed out) */
  isOtherMonth?: boolean;
  /** Press handler */
  onPress?: (day: number) => void;
  /** Stagger delay for entrance animation */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

/** Color config per shift type */
const SHIFT_COLORS: Record<ShiftType, { bg: string; badge: string; text: string; abbr: string }> = {
  day: {
    bg: 'rgba(33, 150, 243, 0.15)',
    badge: '#2196F3',
    text: '#64B5F6',
    abbr: 'D',
  },
  night: {
    bg: 'rgba(101, 31, 255, 0.15)',
    badge: '#651FFF',
    text: '#B388FF',
    abbr: 'N',
  },
  morning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    badge: '#F59E0B',
    text: '#FCD34D',
    abbr: 'M',
  },
  afternoon: {
    bg: 'rgba(6, 182, 212, 0.15)',
    badge: '#06B6D4',
    text: '#67E8F9',
    abbr: 'A',
  },
  off: {
    bg: 'rgba(120, 113, 108, 0.1)',
    badge: '#78716c',
    text: '#a8a29e',
    abbr: 'O',
  },
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ShiftCalendarDayCell: React.FC<ShiftCalendarDayCellProps> = ({
  day,
  shiftType,
  isToday = false,
  selected = false,
  isOtherMonth = false,
  onPress,
  animationDelay = 0,
  testID,
}) => {
  const shiftColor = useMemo(() => (shiftType ? SHIFT_COLORS[shiftType] : null), [shiftType]);

  // Press scale animation
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!isOtherMonth) {
      scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (!isOtherMonth) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (!isOtherMonth && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(day);
    }
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Today pulsing ring
  const pulseScale = useSharedValue(1);
  React.useEffect(() => {
    if (isToday) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 1200 }), withTiming(1, { duration: 1200 })),
        -1,
        true
      );
    }
  }, [isToday, pulseScale]);

  const todayRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const containerBg = selected ? theme.colors.sacredGold : (shiftColor?.bg ?? 'transparent');

  const dayTextColor = isOtherMonth
    ? theme.colors.shadow
    : selected
      ? '#fff'
      : isToday
        ? theme.colors.sacredGold
        : theme.colors.paper;

  return (
    <AnimatedTouchable
      entering={FadeIn.delay(animationDelay).duration(300)}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={isOtherMonth}
      style={[styles.container, pressStyle]}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day}${isToday ? ', Today' : ''}${shiftType ? `, ${shiftType} shift` : ''}`}
      accessibilityState={{ disabled: isOtherMonth, selected }}
      testID={testID}
    >
      {/* Today pulsing ring */}
      {isToday && !selected && <Animated.View style={[styles.todayRing, todayRingStyle]} />}

      {/* Background */}
      <View
        style={[
          styles.cellBackground,
          { backgroundColor: containerBg },
          selected && styles.selectedBorder,
        ]}
      >
        {/* Day number */}
        <Animated.Text
          style={[
            styles.dayText,
            { color: dayTextColor },
            isToday && !selected && styles.todayText,
          ]}
        >
          {day}
        </Animated.Text>

        {/* Shift type badge */}
        {shiftColor && !isOtherMonth && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: selected ? 'rgba(255,255,255,0.3)' : shiftColor.badge,
              },
            ]}
          >
            <Animated.Text style={[styles.badgeText, { color: selected ? '#fff' : '#fff' }]}>
              {shiftColor.abbr}
            </Animated.Text>
          </View>
        )}
      </View>
    </AnimatedTouchable>
  );
};

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    borderRadius: theme.borderRadius.sm + 2,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
  },
  cellBackground: {
    width: CELL_SIZE - 4,
    height: CELL_SIZE - 2,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedBorder: {
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
  dayText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  todayText: {
    fontWeight: theme.typography.fontWeights.bold,
  },
  badge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
