/**
 * CurrentShiftStatusCard Component
 *
 * Hero card displaying today's shift status with color-coded background,
 * shift time display, countdown timer, and premium animations.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { ShiftType } from '@/types';

export interface CurrentShiftStatusCardProps {
  /** Current shift type */
  shiftType: ShiftType;
  /** Shift time display (e.g., "7:00 AM - 7:00 PM") */
  timeDisplay?: string;
  /** Countdown text (e.g., "6h 32m until next shift") */
  countdown?: string;
  /** Whether the user is currently on shift */
  isOnShift?: boolean;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

const SHIFT_STYLES: Record<
  ShiftType,
  {
    gradient: [string, string];
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle: string;
  }
> = {
  day: {
    gradient: ['#2196F3', '#1565C0'],
    icon: 'sunny',
    label: 'DAY SHIFT',
    subtitle: 'Stay energized!',
  },
  night: {
    gradient: ['#7C4DFF', '#4A148C'],
    icon: 'moon',
    label: 'NIGHT SHIFT',
    subtitle: 'Stay alert!',
  },
  morning: {
    gradient: ['#FF9800', '#E65100'],
    icon: 'sunny-outline',
    label: 'MORNING SHIFT',
    subtitle: 'Rise and shine!',
  },
  afternoon: {
    gradient: ['#26A69A', '#00695C'],
    icon: 'partly-sunny',
    label: 'AFTERNOON SHIFT',
    subtitle: 'Keep it going!',
  },
  off: {
    gradient: ['#FF9800', '#F57C00'],
    icon: 'bed-outline',
    label: 'DAY OFF',
    subtitle: 'Rest and recharge!',
  },
};

export const CurrentShiftStatusCard: React.FC<CurrentShiftStatusCardProps> = ({
  shiftType,
  timeDisplay,
  countdown,
  isOnShift = false,
  animationDelay = 100,
  testID,
}) => {
  const style = useMemo(() => SHIFT_STYLES[shiftType], [shiftType]);

  // Floating animation
  const floatY = useSharedValue(0);
  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-4, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1,
      true
    );
  }, [floatY]);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  // Pulsing glow for active shifts
  const glowOpacity = useSharedValue(0);
  React.useEffect(() => {
    if (isOnShift) {
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 1500 }), withTiming(0.2, { duration: 1500 })),
        -1,
        true
      );
    }
  }, [isOnShift, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay).duration(600).springify()}
      style={styles.wrapper}
      testID={testID}
    >
      <Animated.View style={[styles.cardContainer, floatingStyle]}>
        {isOnShift && (
          <Animated.View
            style={[styles.glowEffect, { shadowColor: style.gradient[0] }, glowStyle]}
          />
        )}
        <LinearGradient
          colors={style.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.topRow}>
            <View style={styles.iconContainer}>
              <Ionicons name={style.icon} size={32} color="rgba(255,255,255,0.9)" />
            </View>
            {isOnShift && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Animated.Text style={styles.liveText}>LIVE</Animated.Text>
              </View>
            )}
          </View>

          <Animated.Text style={styles.shiftLabel}>{style.label}</Animated.Text>
          <Animated.Text style={styles.shiftSubtitle}>{style.subtitle}</Animated.Text>

          {timeDisplay && (
            <View style={styles.timeContainer}>
              <Ionicons
                name="time-outline"
                size={16}
                color="rgba(255,255,255,0.7)"
                style={styles.timeIcon}
              />
              <Animated.Text style={styles.timeText}>{timeDisplay}</Animated.Text>
            </View>
          )}

          {countdown && (
            <View style={styles.countdownContainer}>
              <Ionicons
                name="hourglass-outline"
                size={14}
                color="rgba(255,255,255,0.6)"
                style={styles.timeIcon}
              />
              <Animated.Text style={styles.countdownText}>{countdown}</Animated.Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  cardContainer: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glowEffect: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: theme.borderRadius.xl + 8,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
    }),
  },
  gradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#fff',
    letterSpacing: 1,
  },
  shiftLabel: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: '#fff',
    letterSpacing: 1,
  },
  shiftSubtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: '#fff',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  countdownText: {
    fontSize: theme.typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
  },
});
