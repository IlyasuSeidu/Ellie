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
import { hexToRGBA } from '@/utils/styleUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import {
  getCycleLengthDays,
  getShiftDurationSummary,
  getWorkRestRatio,
} from '@/utils/profileUtils';

interface WorkStatsSummaryProps {
  data: OnboardingData;
  animationDelay?: number;
  accentColor?: string;
}

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}

const MiniStatCard: React.FC<{
  stat: StatItem;
  delay: number;
  accentColor: string;
}> = ({ stat, delay, accentColor }) => {
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
    <Animated.View
      style={[
        styles.statCard,
        {
          borderColor: hexToRGBA(accentColor, 0.26),
          backgroundColor: hexToRGBA(accentColor, 0.08),
        },
        animStyle,
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: hexToRGBA(accentColor, 0.14) }]}>
        <Ionicons name={stat.icon} size={16} color={accentColor} />
      </View>
      <Animated.Text style={[styles.statValue, { color: accentColor }]}>{stat.value}</Animated.Text>
      <Animated.Text style={styles.statLabel}>{stat.label}</Animated.Text>
    </Animated.View>
  );
};

export const WorkStatsSummary: React.FC<WorkStatsSummaryProps> = ({
  data,
  animationDelay = 0,
  accentColor = theme.colors.sacredGold,
}) => {
  const { t } = useTranslation('profile');
  const stats = useMemo((): StatItem[] => {
    const cycleDays = getCycleLengthDays(data);
    const ratio = getWorkRestRatio(data);
    const duration = getShiftDurationSummary(data);

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
        <MiniStatCard
          key={stat.label}
          stat={stat}
          delay={animationDelay + index * 100}
          accentColor={accentColor}
        />
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
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
    textAlign: 'center',
  },
});
