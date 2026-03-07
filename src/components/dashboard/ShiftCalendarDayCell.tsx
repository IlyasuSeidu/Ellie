/**
 * ShiftCalendarDayCell Component
 *
 * Premium calendar day cell with shift type visualization.
 * Color-coded backgrounds, shift type badges (icons or FIFO indicators),
 * 3-layer today indicator with pulsing glow ring,
 * premium bounce press animation, and selected day glow.
 * FIFO mode: transparent bg (ribbon shows through), shift-specific icons,
 * fly-in/fly-out airplane indicators, swing transition bars, enhanced today glow.
 */

import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { RosterType, type ShiftType } from '@/types';
import { fifoBlockColors } from '@/constants/shiftStyles';
import type { FIFODayPosition } from '@/utils/fifoCalendarUtils';

export interface ShiftCalendarDayCellProps {
  /** Day number (1-31) */
  day: number;
  /** Shift type for this day */
  shiftType?: ShiftType;
  /** Roster paradigm for visual treatment */
  rosterType?: RosterType;
  /** FIFO block position metadata (only for FIFO rosters) */
  fifoPosition?: FIFODayPosition;
  /** Whether this day is today */
  isToday?: boolean;
  /** Whether this day is selected */
  selected?: boolean;
  /** Whether this day is in a different month (greyed out) */
  isOtherMonth?: boolean;
  /** Press handler */
  onPress?: (day: number) => void;
  /** Long-press handler (for FIFO tooltip) */
  onLongPress?: (day: number) => void;
  /** Stagger delay for entrance animation (reserved for parent control) */
  animationDelay?: number;
  /** Override glow color for today's cell (e.g. during overnight carry-over) */
  activeGlowColor?: string;
  /** Test ID */
  testID?: string;
}

/* eslint-disable @typescript-eslint/no-var-requires */
/** 3D assets for shift types */
const DAY_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png');
const MORNING_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-morning.png');
const AFTERNOON_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png');
const OFF_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png');
const NIGHT_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png');
/* eslint-enable @typescript-eslint/no-var-requires */

/** Color config per shift type */
const SHIFT_COLORS: Record<
  ShiftType,
  { bg: string; badge: string; text: string; icon?: keyof typeof Ionicons.glyphMap }
> = {
  day: {
    bg: 'rgba(33, 150, 243, 0.15)',
    badge: '#BBDEFB',
    text: '#64B5F6',
  },
  night: {
    bg: 'rgba(101, 31, 255, 0.15)',
    badge: '#fff',
    text: '#B388FF',
  },
  morning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    badge: 'rgba(245, 158, 11, 0.25)',
    text: '#FCD34D',
  },
  afternoon: {
    bg: 'rgba(6, 182, 212, 0.15)',
    badge: 'rgba(6, 182, 212, 0.25)',
    text: '#67E8F9',
  },
  off: {
    bg: 'rgba(120, 113, 108, 0.1)',
    badge: '#78716c',
    text: '#a8a29e',
  },
};

const FIFO_BLOCK_COLORS = {
  work: {
    bg: fifoBlockColors.work.background,
    badge: '#BBDEFB',
    text: fifoBlockColors.work.text,
  },
  home: {
    bg: fifoBlockColors.rest.background,
    badge: fifoBlockColors.rest.primary,
    text: fifoBlockColors.rest.text,
  },
} as const;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ShiftCalendarDayCell: React.FC<ShiftCalendarDayCellProps> = ({
  day,
  shiftType,
  rosterType = RosterType.ROTATING,
  fifoPosition,
  isToday = false,
  selected = false,
  isOtherMonth = false,
  activeGlowColor,
  onPress,
  onLongPress,
  testID,
}) => {
  const fifoBlockType = useMemo(() => {
    if (rosterType !== RosterType.FIFO || !shiftType) {
      return null;
    }
    return shiftType === 'off' ? 'home' : 'work';
  }, [rosterType, shiftType]);

  const shiftColor = useMemo(() => {
    if (fifoBlockType) {
      return FIFO_BLOCK_COLORS[fifoBlockType];
    }
    return shiftType ? SHIFT_COLORS[shiftType] : null;
  }, [fifoBlockType, shiftType]);

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

  const handleLongPress = () => {
    if (!isOtherMonth && onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onLongPress(day);
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
      // Enhanced glow range for FIFO
      const minOpacity = fifoPosition ? 0.2 : 0.15;
      const maxOpacity = fifoPosition ? 0.5 : 0.35;

      // Layer 1: glow opacity pulse
      todayGlowOpacity.value = withRepeat(
        withSequence(
          withTiming(maxOpacity, { duration: 1200 }),
          withTiming(minOpacity, { duration: 1200 })
        ),
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
  }, [isToday, pulseScale, todayGlowOpacity, fifoPosition]);

  const todayGlowStyle = useAnimatedStyle(() => ({
    opacity: todayGlowOpacity.value,
  }));

  const todayRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Resolve glow color: FIFO block-colored, carry-over color, or default gold
  const glowColor = useMemo(() => {
    if (activeGlowColor) return activeGlowColor;
    if (fifoPosition) {
      return fifoPosition.blockType === 'work' ? '#2196F3' : '#a8a29e';
    }
    return theme.colors.sacredGold;
  }, [activeGlowColor, fifoPosition]);

  const glowColor30 = useMemo(() => {
    if (activeGlowColor) return `${activeGlowColor}4D`;
    if (fifoPosition) {
      return fifoPosition.blockType === 'work' ? 'rgba(33,150,243,0.3)' : 'rgba(168,162,158,0.3)';
    }
    return theme.colors.opacity.gold30;
  }, [activeGlowColor, fifoPosition]);

  // In FIFO mode with ribbons, make cell background transparent so ribbon shows through
  const containerBg = selected
    ? theme.colors.sacredGold
    : fifoPosition
      ? 'transparent'
      : (shiftColor?.bg ?? 'transparent');

  const dayTextColor = isOtherMonth
    ? theme.colors.shadow
    : selected
      ? '#fff'
      : isToday
        ? glowColor
        : theme.colors.paper;

  // Determine badge content for FIFO mode
  const fifoBadgeIcon = useMemo(() => {
    if (!fifoPosition) return null;
    if (fifoPosition.blockType === 'rest') return 'rest';
    // Work block: show shift-specific icon
    if (fifoPosition.shiftType === 'night') return 'night';
    return 'day'; // default for day/morning/afternoon in work block
  }, [fifoPosition]);

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      delayLongPress={400}
      activeOpacity={1}
      disabled={isOtherMonth}
      style={[styles.container, pressStyle]}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day}${isToday ? ', Today' : ''}${
        shiftType ? `, ${fifoBlockType ? `${fifoBlockType} block` : `${shiftType} shift`}` : ''
      }`}
      accessibilityState={{ disabled: isOtherMonth, selected }}
      testID={testID}
    >
      {/* Today 3-layer glow: Layer 1 — glow background */}
      {isToday && !selected && (
        <Animated.View style={[styles.todayGlow, { backgroundColor: glowColor }, todayGlowStyle]} />
      )}

      {/* Today 3-layer glow: Layer 2 — pulsing outer ring */}
      {isToday && !selected && (
        <Animated.View style={[styles.todayRing, { borderColor: glowColor30 }, todayRingStyle]} />
      )}

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

        {/* Fly-in/fly-out airplane indicator (FIFO only) */}
        {fifoPosition?.isFlyInDay && !isOtherMonth && (
          <View style={styles.flyIndicator} testID={`fifo-fly-in-${day}`}>
            <Ionicons name="airplane" size={10} color="#64B5F6" />
          </View>
        )}
        {fifoPosition?.isFlyOutDay && !fifoPosition?.isFlyInDay && !isOtherMonth && (
          <View style={styles.flyIndicator} testID={`fifo-fly-out-${day}`}>
            <Ionicons
              name="airplane"
              size={10}
              color="#64B5F6"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </View>
        )}

        {/* Shift type badge */}
        {shiftColor && !isOtherMonth && (
          <View
            style={[
              styles.badge,
              styles.badgeLarge,
              {
                backgroundColor: selected ? 'rgba(255,255,255,0.3)' : shiftColor.badge,
              },
            ]}
          >
            {fifoBadgeIcon === 'day' ? (
              <Image source={DAY_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : fifoBadgeIcon === 'night' ? (
              <Image source={NIGHT_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : fifoBadgeIcon === 'rest' ? (
              <Image source={OFF_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : shiftType === 'day' ? (
              <Image source={DAY_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : shiftType === 'night' ? (
              <Image source={NIGHT_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : shiftType === 'morning' ? (
              <Image source={MORNING_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : shiftType === 'afternoon' ? (
              <Image source={AFTERNOON_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : shiftType === 'off' ? (
              <Image source={OFF_SHIFT_ICON} style={styles.badgeImageLarge} />
            ) : null}
          </View>
        )}

        {/* Swing transition gradient bar (FIFO only) */}
        {fifoPosition?.isSwingTransitionDay && !isOtherMonth && (
          <LinearGradient
            colors={['#2196F3', '#651FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.swingTransitionBar}
            testID={`fifo-swing-transition-${day}`}
          />
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
    zIndex: 1,
  },
  todayGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: 2,
    borderRadius: theme.borderRadius.sm + 4,
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
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    position: 'absolute',
    top: 4,
    left: 6,
  },
  todayText: {
    fontWeight: theme.typography.fontWeights.bold,
  },
  badge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
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
  badgeImage: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  badgeLarge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  badgeImageLarge: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  fifoBadgeText: {
    color: theme.colors.deepVoid,
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold,
  },
  flyIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  swingTransitionBar: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 1,
  },
});
