/**
 * PersonalizedHeader Component
 *
 * Time-aware greeting with animated avatar and user info.
 * Displays personalized greeting based on time of day,
 * user's name initials in an animated avatar circle,
 * and occupation subtitle.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
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

/**
 * Get time-aware greeting message
 */
function getGreeting(): { text: string; icon: keyof typeof Ionicons.glyphMap } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', icon: 'sunny-outline' };
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', icon: 'partly-sunny-outline' };
  } else if (hour >= 17 && hour < 21) {
    return { text: 'Good evening', icon: 'moon-outline' };
  }
  return { text: 'Good night', icon: 'cloudy-night-outline' };
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

export const PersonalizedHeader: React.FC<PersonalizedHeaderProps> = ({
  name,
  occupation,
  animationDelay = 0,
  testID,
}) => {
  const greeting = useMemo(() => getGreeting(), []);
  const initials = useMemo(() => getInitials(name), [name]);

  // Floating animation for avatar
  const floatY = useSharedValue(0);
  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(withTiming(-3, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1,
      true
    );
  }, [floatY]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(600).springify()}
      style={styles.container}
      testID={testID}
    >
      <Animated.View style={[styles.avatarContainer, avatarAnimatedStyle]}>
        <View style={styles.avatar}>
          <Animated.Text style={styles.avatarText}>{initials}</Animated.Text>
        </View>
        <View style={styles.avatarGlow} />
      </Animated.View>

      <View style={styles.textContainer}>
        <View style={styles.greetingRow}>
          <Ionicons
            name={greeting.icon}
            size={20}
            color={theme.colors.sacredGold}
            style={styles.greetingIcon}
          />
          <Animated.Text style={styles.greetingText}>{greeting.text},</Animated.Text>
        </View>
        <Animated.Text style={styles.nameText} numberOfLines={1}>
          {name}
        </Animated.Text>
        {occupation ? (
          <Animated.Text style={styles.occupationText} numberOfLines={1}>
            {occupation}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.softStone,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold10,
  },
  textContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingIcon: {
    marginRight: theme.spacing.xs,
  },
  greetingText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.medium,
  },
  nameText: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginTop: 2,
  },
  occupationText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    marginTop: 2,
  },
});
