/**
 * ProfileSectionHeader Component
 *
 * Reusable section divider with icon, title, and animated entrance.
 * Used to visually separate sections within the Profile screen.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

interface ProfileSectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  animationDelay?: number;
}

export const ProfileSectionHeader: React.FC<ProfileSectionHeaderProps> = ({
  title,
  icon,
  animationDelay = 0,
}) => {
  return (
    <Animated.View entering={FadeInUp.delay(animationDelay).duration(400)} style={styles.container}>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={theme.colors.sacredGold} style={styles.icon} />
        <Animated.Text style={styles.title}>{title}</Animated.Text>
      </View>
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
  icon: {
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
