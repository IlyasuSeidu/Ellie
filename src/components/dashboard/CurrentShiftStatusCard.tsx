/**
 * CurrentShiftStatusCard Component
 *
 * Premium hero card displaying today's shift status with staggered entrance
 * animations, pulsing icon glow ring, interactive tap gesture with haptics,
 * animated LIVE badge, shimmer accent, and color-coded gradient background.
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
    gradient: ['#F59E0B', '#D97706'],
    icon: 'sunny-outline',
    label: 'MORNING SHIFT',
    subtitle: 'Rise and shine!',
  },
  afternoon: {
    gradient: ['#06B6D4', '#0E7490'],
    icon: 'partly-sunny',
    label: 'AFTERNOON SHIFT',
    subtitle: 'Keep it going!',
  },
  off: {
    gradient: ['#57534e', '#44403c'],
    icon: 'bed-outline',
    label: 'DAY OFF',
    subtitle: 'Rest and recharge!',
  },
};

const ICON_SIZE = 56;

export const CurrentShiftStatusCard: React.FC<CurrentShiftStatusCardProps> = ({
  shiftType,
  timeDisplay,
  countdown,
  isOnShift = false,
  animationDelay = 100,
  testID,
}) => {
  const style = useMemo(() => SHIFT_STYLES[shiftType], [shiftType]);

  // ── Staggered Entrance ────────────────────────────────────────
  const iconEntranceScale = useSharedValue(0.3);
  const iconEntranceOpacity = useSharedValue(0);
  const labelEntranceY = useSharedValue(12);
  const labelEntranceOpacity = useSharedValue(0);
  const infoEntranceY = useSharedValue(10);
  const infoEntranceOpacity = useSharedValue(0);

  useEffect(() => {
    const D = animationDelay;

    // Icon: scale up + fade in
    iconEntranceScale.value = withDelay(D, withSpring(1, { damping: 14, stiffness: 200 }));
    iconEntranceOpacity.value = withDelay(D, withTiming(1, { duration: 400 }));

    // Label + subtitle: slide up + fade in
    labelEntranceY.value = withDelay(D + 150, withSpring(0, { damping: 16, stiffness: 180 }));
    labelEntranceOpacity.value = withDelay(D + 150, withTiming(1, { duration: 350 }));

    // Time + countdown: slide up + fade in
    infoEntranceY.value = withDelay(D + 350, withSpring(0, { damping: 16, stiffness: 180 }));
    infoEntranceOpacity.value = withDelay(D + 350, withTiming(1, { duration: 350 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDelay]);

  // ── Continuous Animations ─────────────────────────────────────
  const floatY = useSharedValue(0);
  const iconGlowOpacity = useSharedValue(0.15);
  const iconRingScale = useSharedValue(1.0);
  const shimmerTranslate = useSharedValue(-1);

  useEffect(() => {
    // Floating
    floatY.value = withRepeat(
      withSequence(withTiming(-3, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1,
      true
    );

    // Icon glow pulse
    iconGlowOpacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 1200 }), withTiming(0.15, { duration: 1200 })),
      -1,
      true
    );

    // Icon ring scale
    iconRingScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1500 }), withTiming(1.0, { duration: 1500 })),
      -1,
      true
    );

    // Shimmer sweep
    shimmerTranslate.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 0 }),
        withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2000 })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Interactive Tap ───────────────────────────────────────────
  const cardTapScale = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      cardTapScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      cardTapScale.value = withSequence(
        withSpring(1.02, { damping: 8, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
      runOnJS(triggerHaptic)();
    })
    .onFinalize(() => {
      cardTapScale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
    });

  // ── On-Shift Animations ───────────────────────────────────────
  const glowOpacity = useSharedValue(0);
  const liveDotOpacity = useSharedValue(1);

  useEffect(() => {
    if (isOnShift) {
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 1500 }), withTiming(0.2, { duration: 1500 })),
        -1,
        true
      );
      liveDotOpacity.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnShift]);

  // ── Animated Styles ───────────────────────────────────────────
  const iconEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconEntranceScale.value }],
    opacity: iconEntranceOpacity.value,
  }));

  const labelEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: labelEntranceY.value }],
    opacity: labelEntranceOpacity.value,
  }));

  const infoEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: infoEntranceY.value }],
    opacity: infoEntranceOpacity.value,
  }));

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const cardInteractionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardTapScale.value }],
  }));

  const iconGlowStyle = useAnimatedStyle(() => ({
    opacity: iconGlowOpacity.value,
  }));

  const iconRingPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconRingScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const liveDotStyle = useAnimatedStyle(() => ({
    opacity: liveDotOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerTranslate.value, [-1, 2], [-200, 600], Extrapolate.CLAMP);
    const shimmerOpacity = interpolate(
      shimmerTranslate.value,
      [-1, 0, 1, 2],
      [0, 0.4, 0.4, 0],
      Extrapolate.CLAMP
    );
    return { transform: [{ translateX }], opacity: shimmerOpacity };
  });

  // ── Render ────────────────────────────────────────────────────
  return (
    <Animated.View style={styles.wrapper} testID={testID}>
      <GestureDetector gesture={tapGesture}>
        <Animated.View style={[styles.cardContainer, floatingStyle, cardInteractionStyle]}>
          {/* Pulsing glow behind card (on-shift only) */}
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
            {/* Shimmer accent line */}
            <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>

            {/* Top Row: Icon + LIVE badge */}
            <View style={styles.topRow}>
              {/* Enhanced icon with pulsing ring */}
              <Animated.View style={[styles.iconOuter, iconEntranceStyle]}>
                <Animated.View
                  style={[
                    styles.iconGlowRing,
                    { backgroundColor: style.gradient[0] },
                    iconGlowStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.iconOuterRing,
                    { borderColor: style.gradient[0] + '40' },
                    iconRingPulseStyle,
                  ]}
                />
                <View style={styles.iconContainer}>
                  <Ionicons name={style.icon} size={32} color="rgba(255,255,255,0.9)" />
                </View>
              </Animated.View>

              {/* LIVE badge with pulsing dot */}
              {isOnShift && (
                <View style={styles.liveBadge}>
                  <Animated.View style={[styles.liveDot, liveDotStyle]} />
                  <Animated.Text style={styles.liveText}>LIVE</Animated.Text>
                </View>
              )}
            </View>

            {/* Label + subtitle (staggered entrance) */}
            <Animated.View style={labelEntranceStyle}>
              <Animated.Text style={styles.shiftLabel}>{style.label}</Animated.Text>
              <Animated.Text style={styles.shiftSubtitle}>{style.subtitle}</Animated.Text>
            </Animated.View>

            {/* Time + countdown (staggered entrance) */}
            <Animated.View style={infoEntranceStyle}>
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
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
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
    paddingTop: theme.spacing.lg + 4,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },

  // ── Shimmer ─────────────────────────────────────────────────
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: -100,
    bottom: 0,
    zIndex: 1,
  },
  shimmerGradient: {
    flex: 1,
    width: 120,
  },

  // ── Top Row ─────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },

  // ── Icon Pulsing Ring ───────────────────────────────────────
  iconOuter: {
    position: 'relative',
    width: ICON_SIZE + 16,
    height: ICON_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: (ICON_SIZE + 16) / 2,
    zIndex: 0,
  },
  iconOuterRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: (ICON_SIZE + 12) / 2,
    borderWidth: 1.5,
    zIndex: 1,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  // ── LIVE Badge ──────────────────────────────────────────────
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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

  // ── Text ────────────────────────────────────────────────────
  shiftLabel: {
    fontSize: theme.typography.fontSizes.xxxl,
    fontWeight: theme.typography.fontWeights.black,
    color: '#fff',
    letterSpacing: 2,
  },
  shiftSubtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // ── Time & Countdown ───────────────────────────────────────
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
