/**
 * PersonalizedHeader Component
 *
 * Premium time-aware greeting with animated avatar and user info.
 * Features staggered entrance animations, pulsing avatar glow,
 * interactive tap gesture with haptic feedback, and time-aware
 * icon colors for a polished, engaging experience.
 */

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

export interface PersonalizedHeaderProps {
  /** User's full name */
  name: string;
  /** User's occupation */
  occupation?: string;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

interface GreetingData {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

/**
 * Get time-aware greeting with personality and icon color
 * Uses hour-based deterministic selection for stable rendering
 */
function getGreeting(): GreetingData {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    const greetings = [
      'Good morning',
      'Rise and shine',
      'Top of the morning',
      'Ready to conquer the day',
    ];
    return {
      text: greetings[hour % greetings.length],
      icon: 'sunny-outline',
      iconColor: '#f97316',
    };
  }

  if (hour >= 12 && hour < 17) {
    const greetings = ['Good afternoon', 'Keep it going', 'Halfway through', 'Powering through'];
    return {
      text: greetings[(hour - 12) % greetings.length],
      icon: 'partly-sunny-outline',
      iconColor: '#d97706',
    };
  }

  if (hour >= 17 && hour < 21) {
    const greetings = ['Good evening', 'Winding down', 'Almost there', 'Evening check-in'];
    return {
      text: greetings[(hour - 17) % greetings.length],
      icon: 'moon-outline',
      iconColor: '#8b5cf6',
    };
  }

  const greetings = [
    'Good night',
    'Burning the midnight oil',
    'Night owl mode',
    'Late night shift',
  ];
  return {
    text: greetings[(hour >= 21 ? hour - 21 : hour + 3) % greetings.length],
    icon: 'cloudy-night-outline',
    iconColor: '#6366f1',
  };
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_SIZE = 66;
const AVATAR_RADIUS = AVATAR_SIZE / 2;

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = ({
  name,
  occupation,
  animationDelay = 0,
  testID,
}) => {
  const greeting = useMemo(() => getGreeting(), []);
  const initials = useMemo(() => getInitials(name), [name]);

  // ── Staggered Entrance Shared Values ──────────────────────────
  const avatarEntranceScale = useSharedValue(0.3);
  const avatarEntranceOpacity = useSharedValue(0);
  const greetingTranslateX = useSharedValue(-20);
  const greetingOpacity = useSharedValue(0);
  const occupationTranslateY = useSharedValue(8);
  const occupationOpacity = useSharedValue(0);

  useEffect(() => {
    const D = animationDelay;

    // Avatar: scale up + fade in
    avatarEntranceScale.value = withDelay(D, withSpring(1, { damping: 14, stiffness: 200 }));
    avatarEntranceOpacity.value = withDelay(D, withTiming(1, { duration: 400 }));

    // Greeting + Name: slide from left + fade in
    greetingTranslateX.value = withDelay(D + 150, withSpring(0, { damping: 16, stiffness: 180 }));
    greetingOpacity.value = withDelay(D + 150, withTiming(1, { duration: 350 }));

    // Occupation: slide up + fade in
    occupationTranslateY.value = withDelay(D + 350, withSpring(0, { damping: 16, stiffness: 180 }));
    occupationOpacity.value = withDelay(D + 350, withTiming(1, { duration: 350 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDelay]);

  // ── Continuous Avatar Animations ──────────────────────────────

  // Float
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-3, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1,
      true
    );
  }, [floatY]);

  // Glow ring opacity pulse
  const glowOpacity = useSharedValue(0.15);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 1200 }), withTiming(0.15, { duration: 1200 })),
      -1,
      true
    );
  }, [glowOpacity]);

  // Outer ring scale pulse
  const ringScale = useSharedValue(1.0);
  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(withTiming(1.06, { duration: 1500 }), withTiming(1.0, { duration: 1500 })),
      -1,
      true
    );
  }, [ringScale]);

  // ── Interactive Avatar Tap ────────────────────────────────────
  const avatarTapScale = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      avatarTapScale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      avatarTapScale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 300 })
      );
      runOnJS(triggerHaptic)();
    })
    .onFinalize(() => {
      avatarTapScale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
    });

  // ── Animated Styles ───────────────────────────────────────────
  const avatarEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarEntranceScale.value }],
    opacity: avatarEntranceOpacity.value,
  }));

  const avatarFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const avatarInteractionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarTapScale.value }],
  }));

  const glowPulseStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const greetingEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: greetingTranslateX.value }],
    opacity: greetingOpacity.value,
  }));

  const occupationEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: occupationTranslateY.value }],
    opacity: occupationOpacity.value,
  }));

  return (
    <View style={styles.container} testID={testID}>
      {/* Text Section */}
      <View style={styles.textContainer}>
        {/* Greeting + Name row */}
        <Animated.View style={[styles.greetingRow, greetingEntranceStyle]}>
          <Ionicons
            name={greeting.icon}
            size={18}
            color={greeting.iconColor}
            style={styles.greetingIcon}
          />
          <Animated.Text style={styles.greetingText} numberOfLines={1}>
            {greeting.text}, <Animated.Text style={styles.nameText}>{name}!</Animated.Text>
          </Animated.Text>
        </Animated.View>
      </View>

      {/* Avatar Section with occupation underneath */}
      <View style={styles.avatarColumn}>
        <GestureDetector gesture={tapGesture}>
          <Animated.View style={[styles.avatarOuter, avatarEntranceStyle, avatarFloatStyle]}>
            {/* Pulsing glow ring (behind) */}
            <Animated.View style={[styles.avatarGlowRing, glowPulseStyle]} />

            {/* Breathing outer ring */}
            <Animated.View style={[styles.avatarOuterRing, ringPulseStyle]} />

            {/* Main avatar circle (interactive) */}
            <Animated.View style={[styles.avatar, avatarInteractionStyle]}>
              <Animated.Text style={styles.avatarText}>{initials}</Animated.Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Occupation */}
        {occupation ? (
          <Animated.View style={occupationEntranceStyle}>
            <Animated.Text style={styles.occupationText} numberOfLines={1}>
              {occupation}
            </Animated.Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },

  // ── Avatar Styles ─────────────────────────────────────────────
  avatarColumn: {
    alignItems: 'center',
    marginLeft: theme.spacing.md + 4,
  },
  avatarOuter: {
    position: 'relative',
    width: AVATAR_SIZE + 16,
    height: AVATAR_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    backgroundColor: theme.colors.softStone,
    borderWidth: 2.5,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  avatarGlowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: (AVATAR_SIZE + 16) / 2,
    backgroundColor: theme.colors.sacredGold,
    zIndex: 0,
  },
  avatarOuterRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    zIndex: 1,
  },

  // ── Text Styles ───────────────────────────────────────────────
  textContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingIcon: {
    marginRight: theme.spacing.xs + 2,
  },
  greetingText: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.medium,
    flexShrink: 1,
  },
  nameText: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  occupationText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 4,
    textAlign: 'center',
  },
});
