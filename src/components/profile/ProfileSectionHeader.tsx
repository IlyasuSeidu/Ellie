/**
 * ProfileSectionHeader Component
 *
 * Reusable section divider with icon, title, and animated entrance.
 * Used to visually separate sections within the Profile screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { hexToRGBA } from '@/utils/styleUtils';

interface ProfileSectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  backgroundGradientColors?: readonly [string, string];
  animationDelay?: number;
}

export const ProfileSectionHeader: React.FC<ProfileSectionHeaderProps> = ({
  title,
  icon,
  iconColor = theme.colors.sacredGold,
  backgroundGradientColors,
  animationDelay = 0,
}) => {
  const accentBorderColor = (() => {
    try {
      return hexToRGBA(iconColor, 0.68);
    } catch {
      return 'rgba(255, 255, 255, 0.34)';
    }
  })();

  const rowContent = (
    <View style={[styles.row, backgroundGradientColors ? styles.rowCompact : null]}>
      <View style={[styles.iconBadge, { borderColor: accentBorderColor }]}>
        <Ionicons name={icon} size={17} color={theme.colors.paper} />
      </View>
      <Animated.Text style={styles.title}>{title}</Animated.Text>
    </View>
  );

  return (
    <Animated.View entering={FadeInUp.delay(animationDelay).duration(400)} style={styles.container}>
      {backgroundGradientColors ? (
        <LinearGradient
          colors={[...backgroundGradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {rowContent}
        </LinearGradient>
      ) : (
        rowContent
      )}
      <View style={styles.divider} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rowCompact: {
    marginBottom: 0,
  },
  headerGradient: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(12, 10, 9, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
  },
});
