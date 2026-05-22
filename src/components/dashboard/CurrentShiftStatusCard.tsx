/**
 * CurrentShiftStatusCard Component
 *
 * Premium hero card displaying today's shift status with staggered entrance
 * animations, pulsing icon glow ring, interactive tap gesture with haptics,
 * animated LIVE badge, shimmer accent, and color-coded gradient background.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { type ShiftType } from '@/types';

export interface CurrentShiftStatusCardProps {
  /** Current shift type */
  shiftType: ShiftType;
  /** Optional live accent shift type for color-only transitions */
  accentShiftType?: ShiftType;
  /** Countdown text (e.g., "6h 32m until next shift") */
  countdown?: string;
  /** Whether the user is currently on shift */
  isOnShift?: boolean;
  /** Universal shift display metadata for label/icon when using the universal builder */
  universalDisplay?: {
    title: string;
    subtitle: string;
    color: string;
    icon: string;
  };
  /** Optional universal accent color. Defaults to universalDisplay.color when omitted. */
  universalAccentColor?: string;
  /** Animation delay in ms */
  animationDelay?: number;
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

const SHIFT_STYLES: Record<
  ShiftType,
  {
    gradient: [string, string];
    icon?: keyof typeof Ionicons.glyphMap;
  }
> = {
  day: {
    gradient: ['#2196F3', '#1565C0'],
  },
  night: {
    gradient: ['#7C4DFF', '#4A148C'],
  },
  morning: {
    gradient: ['#F59E0B', '#D97706'],
  },
  afternoon: {
    gradient: ['#06B6D4', '#0E7490'],
  },
  off: {
    gradient: ['#57534e', '#44403c'],
  },
};

const ICON_SIZE = 44;

function clampColorByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function darkenHex(hex: string, factor = 0.68): string {
  const normalized = /^#[0-9A-F]{6}$/i.test(hex) ? hex.slice(1) : null;
  if (!normalized) return '#44403c';

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `#${clampColorByte(r * factor)
    .toString(16)
    .padStart(2, '0')}${clampColorByte(g * factor)
    .toString(16)
    .padStart(2, '0')}${clampColorByte(b * factor)
    .toString(16)
    .padStart(2, '0')}`;
}

export const CurrentShiftStatusCard: React.FC<CurrentShiftStatusCardProps> = ({
  shiftType,
  accentShiftType,
  countdown,
  isOnShift = false,
  universalDisplay,
  universalAccentColor,
  animationDelay = 100,
  testID,
}) => {
  const { t } = useTranslation('dashboard');

  const liveAccentShiftType = accentShiftType ?? shiftType;

  const accentStyle = useMemo(() => {
    const universalColor = universalAccentColor ?? universalDisplay?.color;
    if (universalColor) {
      return {
        gradient: [universalColor, darkenHex(universalColor)] as [string, string],
      };
    }
    return SHIFT_STYLES[liveAccentShiftType];
  }, [liveAccentShiftType, universalAccentColor, universalDisplay?.color]);

  const shiftLabel = useMemo(() => {
    if (universalDisplay) return universalDisplay.title.toUpperCase();
    if (shiftType === 'day') return String(t('shiftLabels.day')).toUpperCase();
    if (shiftType === 'night') return String(t('shiftLabels.night')).toUpperCase();
    if (shiftType === 'morning') return String(t('shiftLabels.morning')).toUpperCase();
    if (shiftType === 'afternoon') return String(t('shiftLabels.afternoon')).toUpperCase();
    return String(t('shiftLabels.off')).toUpperCase();
  }, [shiftType, t, universalDisplay]);

  const shiftSubtitle = useMemo(() => {
    if (universalDisplay) return universalDisplay.subtitle;
    if (shiftType === 'day') return String(t('shiftSubtitles.day'));
    if (shiftType === 'night') return String(t('shiftSubtitles.night'));
    if (shiftType === 'morning') return String(t('shiftSubtitles.morning'));
    if (shiftType === 'afternoon') return String(t('shiftSubtitles.afternoon'));
    return String(t('shiftSubtitles.off'));
  }, [shiftType, t, universalDisplay]);

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
  const showActivePulse = isOnShift;
  const showStatusBadge = isOnShift || shiftType !== 'off' || Boolean(universalDisplay);

  useEffect(() => {
    if (isOnShift) {
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 1500 }), withTiming(0.2, { duration: 1500 })),
        -1,
        true
      );
    }

    if (showActivePulse) {
      liveDotOpacity.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
      return;
    }

    liveDotOpacity.value = withTiming(1, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnShift, showActivePulse]);

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
              style={[styles.glowEffect, { shadowColor: accentStyle.gradient[0] }, glowStyle]}
            />
          )}

          <LinearGradient
            colors={accentStyle.gradient}
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

            {/* Countdown at the very top, centered */}
            {countdown && (
              <Animated.View style={[styles.countdownTopContainer, infoEntranceStyle]}>
                <Ionicons
                  name="hourglass-outline"
                  size={14}
                  color="rgba(255,255,255,0.6)"
                  style={styles.timeIcon}
                />
                <Animated.Text style={styles.countdownText}>{countdown}</Animated.Text>
              </Animated.View>
            )}

            {/* Top Row: Icon + LIVE badge */}
            <View style={styles.topRow}>
              {/* Enhanced icon with pulsing ring */}
              <Animated.View style={[styles.iconOuter, iconEntranceStyle]}>
                <Animated.View
                  style={[
                    styles.iconGlowRing,
                    { backgroundColor: accentStyle.gradient[0] },
                    iconGlowStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.iconOuterRing,
                    { borderColor: accentStyle.gradient[0] + '40' },
                    iconRingPulseStyle,
                  ]}
                />
                <View
                  style={[
                    styles.iconContainer,
                    ...(universalDisplay ? [styles.universalIconContainer] : []),
                    !universalDisplay &&
                      liveAccentShiftType === 'day' &&
                      styles.lightBlueIconContainer,
                    !universalDisplay &&
                      liveAccentShiftType === 'night' &&
                      styles.whiteIconContainer,
                    !universalDisplay &&
                      liveAccentShiftType === 'morning' &&
                      styles.amberIconContainer,
                    !universalDisplay &&
                      liveAccentShiftType === 'afternoon' &&
                      styles.cyanIconContainer,
                  ]}
                >
                  {universalDisplay ? (
                    <Ionicons
                      testID="shift-status-universal-icon"
                      name={universalDisplay.icon as keyof typeof Ionicons.glyphMap}
                      size={26}
                      color={universalDisplay.color}
                    />
                  ) : shiftType === 'day' ? (
                    <Image source={DAY_SHIFT_ICON} style={styles.shiftImage} />
                  ) : shiftType === 'night' ? (
                    <Image source={NIGHT_SHIFT_ICON} style={styles.shiftImage} />
                  ) : shiftType === 'morning' ? (
                    <Image source={MORNING_SHIFT_ICON} style={styles.shiftImageLarge} />
                  ) : shiftType === 'afternoon' ? (
                    <Image source={AFTERNOON_SHIFT_ICON} style={styles.shiftImage} />
                  ) : shiftType === 'off' ? (
                    <Image source={OFF_SHIFT_ICON} style={styles.shiftImage} />
                  ) : null}
                </View>
              </Animated.View>

              {/* LIVE / OFF / HOME / ON-SITE badge */}
              {showStatusBadge && (
                <View
                  style={
                    isOnShift
                      ? styles.activeBadge
                      : shiftType === 'off'
                        ? styles.offBadge
                        : styles.activeBadge
                  }
                  testID="shift-status-badge"
                >
                  {showActivePulse && (
                    <Animated.View
                      testID="active-badge-pulse-dot"
                      style={[styles.liveDot, liveDotStyle]}
                    />
                  )}
                  <Ionicons
                    testID="shift-status-badge-icon"
                    name={
                      universalDisplay
                        ? (universalDisplay.icon as keyof typeof Ionicons.glyphMap)
                        : shiftType === 'off'
                          ? 'moon-outline'
                          : 'calendar'
                    }
                    size={12}
                    color={shiftType === 'off' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.96)'}
                    style={{ marginRight: 5 }}
                  />
                  <Animated.Text
                    style={
                      isOnShift
                        ? [styles.scheduledText, styles.activeText]
                        : shiftType === 'off'
                          ? styles.offText
                          : styles.scheduledText
                    }
                  >
                    {shiftType === 'off'
                      ? String(t('shiftLabels.off')).toUpperCase()
                      : isOnShift
                        ? String(t('badges.active'))
                        : String(t('badges.upNext', { defaultValue: 'UP NEXT' }))}
                  </Animated.Text>
                </View>
              )}
            </View>

            {/* Label, then subtitle + time on same line */}
            <Animated.View style={labelEntranceStyle}>
              <Animated.Text style={styles.shiftLabel}>{shiftLabel}</Animated.Text>
              <View style={[styles.subtitleTimeRow, !isOnShift && styles.subtitleTimeRowCentered]}>
                <Animated.Text style={styles.shiftSubtitle}>{shiftSubtitle}</Animated.Text>
              </View>
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
    marginBottom: theme.spacing.xs,
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
  universalIconContainer: {
    backgroundColor: '#fff',
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
  offBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  offText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.4)',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  scheduledText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'rgba(191,219,254,0.95)',
    letterSpacing: 1,
  },
  activeText: {
    color: 'rgba(255,255,255,0.96)',
  },

  // ── Text ────────────────────────────────────────────────────
  shiftLabel: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.black,
    color: '#fff',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  shiftSubtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    width: '100%',
  },

  // ── Subtitle + Time Row ──────────────────────────────────────
  subtitleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  subtitleTimeRowCentered: {
    justifyContent: 'center',
  },
  // ── Time & Countdown ───────────────────────────────────────
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.md,
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: '#fff',
  },
  countdownTopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  countdownText: {
    fontSize: theme.typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
  },
  lightBlueIconContainer: {
    backgroundColor: '#BBDEFB',
  },
  whiteIconContainer: {
    backgroundColor: '#fff',
  },
  amberIconContainer: {
    backgroundColor: '#fff',
  },
  cyanIconContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  shiftImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  shiftImageLarge: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
});
