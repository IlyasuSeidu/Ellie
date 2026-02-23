/**
 * ScheduleScreen
 *
 * Placeholder screen for the Schedule tab.
 * Will contain detailed shift calendar and schedule management.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { theme } from '@/utils/theme';

export const ScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.deepVoid, theme.colors.darkStone, theme.colors.deepVoid]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={48} color={theme.colors.dust} />
          </View>
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.title}>
          Schedule
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.subtitle}>
          Coming Soon
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(300).duration(400)} style={styles.description}>
          Your detailed shift calendar and schedule management will appear here.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 120,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.softStone,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.sacredGold,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
    lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.relaxed,
  },
});
