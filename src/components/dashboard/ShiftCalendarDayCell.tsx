/**
 * ShiftCalendarDayCell Component
 *
 * Premium calendar day cell with shift type visualization.
 * Color-coded backgrounds, shift type badges (D/N/M/A/O),
 * 3-layer today indicator with pulsing gold glow ring,
 * premium bounce press animation, and selected day glow.
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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
  /** Stagger delay for entrance animation (reserved for parent control) */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

/** Color config per shift type */
const SHIFT_COLORS: Record<
  ShiftType,
  { bg: string; badge: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  day: {
    bg: 'rgba(33, 150, 243, 0.15)',
    badge: '#2196F3',
    text: '#64B5F6',
    icon: 'sunny',
  },
  night: {
    bg: 'rgba(101, 31, 255, 0.15)',
    badge: '#651FFF',
    text: '#B388FF',
    icon: 'moon',
  },
  morning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    badge: '#F59E0B',
    text: '#FCD34D',
    icon: 'sunny-outline',
  },
  afternoon: {
    bg: 'rgba(6, 182, 212, 0.15)',
    badge: '#06B6D4',
    text: '#67E8F9',
    icon: 'partly-sunny',
  },
  off: {
    bg: 'rgba(120, 113, 108, 0.1)',
    badge: '#78716c',
    text: '#a8a29e',
    icon: 'bed-outline',
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
  testID,
}) => {
  const shiftColor = useMemo(() => (shiftType ? SHIFT_COLORS[shiftType] : null), [shiftType]);

  // ── Press scale animation (premium bounce) ──
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!isOtherMonth) {
      scale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (!isOtherMonth) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
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

  // ── Today 3-layer pulsing glow ──
  const pulseScale = useSharedValue(1);
  const todayGlowOpacity = useSharedValue(0.15);

  React.useEffect(() => {
    if (isToday) {
      // Layer 1: glow opacity pulse
      todayGlowOpacity.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 1200 }), withTiming(0.15, { duration: 1200 })),
        -1,
        true
      );
      // Layer 2: ring scale pulse
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 1500 }), withTiming(1.0, { duration: 1500 })),
        -1,
        true
      );
    }
  }, [isToday, pulseScale, todayGlowOpacity]);

  const todayGlowStyle = useAnimatedStyle(() => ({
    opacity: todayGlowOpacity.value,
  }));

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
      {/* Today 3-layer glow: Layer 1 — glow background */}
      {isToday && !selected && <Animated.View style={[styles.todayGlow, todayGlowStyle]} />}

      {/* Today 3-layer glow: Layer 2 — pulsing outer ring */}
      {isToday && !selected && <Animated.View style={[styles.todayRing, todayRingStyle]} />}

      {/* Selected day glow */}
      {selected && <View style={styles.selectedGlow} />}

      {/* Cell content (Layer 3 / main) */}
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

        {/* Shift type icon badge */}
        {shiftColor && !isOtherMonth && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: selected ? 'rgba(255,255,255,0.3)' : shiftColor.badge,
              },
            ]}
          >
            <Ionicons name={shiftColor.icon} size={11} color="#fff" />
          </View>
        )}
      </View>
    </AnimatedTouchable>
  );
};

const CELL_SIZE = 44;
const CELL_HEIGHT = 72;

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: 2,
    borderRadius: theme.borderRadius.sm + 4,
    backgroundColor: theme.colors.sacredGold,
    zIndex: 0,
  },
  todayRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 4,
    borderRadius: theme.borderRadius.sm + 2,
    borderWidth: 1.5,
    borderColor: theme.colors.opacity.gold30,
    zIndex: 1,
  },
  selectedGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: 2,
    borderRadius: theme.borderRadius.sm + 4,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.25,
    zIndex: 0,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
      },
    }),
  },
  cellBackground: {
    width: CELL_SIZE - 4,
    height: CELL_HEIGHT - 6,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
