/**
 * WorkStatsSummary Component
 *
 * Horizontal row of 3 mini stat cards showing cycle length, work:rest ratio,
 * and shift duration. Each card has a scale entrance animation with stagger.
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { getCycleLengthDays, getWorkRestRatio } from '@/utils/profileUtils';

interface WorkStatsSummaryProps {
  data: OnboardingData;
  animationDelay?: number;
}

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}

const MiniStatCard: React.FC<{
  stat: StatItem;
  delay: number;
}> = ({ stat, delay }) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 180 }));
  }, [delay, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.statCard, animStyle]}>
      <Ionicons name={stat.icon} size={16} color={theme.colors.shadow} />
      <Animated.Text style={styles.statValue}>{stat.value}</Animated.Text>
      <Animated.Text style={styles.statLabel}>{stat.label}</Animated.Text>
    </Animated.View>
  );
};

export const WorkStatsSummary: React.FC<WorkStatsSummaryProps> = ({ data, animationDelay = 0 }) => {
  const { t } = useTranslation('profile');
  const stats = useMemo((): StatItem[] => {
    const cycleDays = getCycleLengthDays(data);
    const ratio = getWorkRestRatio(data);
    const duration = data.shiftSystem === '3-shift' ? '8h' : '12h';

    return [
      {
        icon: 'repeat-outline',
        value: cycleDays !== null ? String(cycleDays) : '-',
        label: t('stats.dayCycle'),
      },
      {
        icon: 'scale-outline',
        value: ratio,
        label: t('stats.workRest'),
      },
      {
        icon: 'hourglass-outline',
        value: duration,
        label: t('stats.perShift'),
      },
    ];
  }, [data, t]);

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <MiniStatCard key={stat.label} stat={stat} delay={animationDelay + index * 100} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    gap: 4,
  },
  statValue: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  statLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
    textAlign: 'center',
  },
});
