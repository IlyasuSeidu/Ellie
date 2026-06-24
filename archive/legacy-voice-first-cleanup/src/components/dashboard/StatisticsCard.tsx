/**
 * StatisticsCard Component
 *
 * Displays a single metric in a compact card format.
 * Used in a row of 3: Work Days, Off Days, Work-Life Balance.
 * Features animated value changes and color-coded indicators.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';

export interface StatisticsCardProps {
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon color */
  iconColor: string;
  /** Main value to display */
  value: string | number;
  /** Label below the value */
  label: string;
  /** Optional suffix (e.g., "%") */
  suffix?: string;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  icon,
  iconColor,
  value,
  label,
  suffix,
  animationDelay = 300,
  testID,
}) => {
  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay).duration(500).springify()}
      style={styles.container}
      testID={testID}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Animated.Text style={styles.value}>
        {value}
        {suffix && <Animated.Text style={styles.suffix}>{suffix}</Animated.Text>}
      </Animated.Text>
      <Animated.Text style={styles.label} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Animated.View>
  );
};

/**
 * StatisticsRow Component
 *
 * Row of 3 StatisticsCards showing monthly metrics.
 */
export interface StatisticsRowProps {
  /** Total work days this month */
  workDays: number;
  /** Total off days this month */
  offDays: number;
  /** Work-life balance percentage */
  workLifeBalance: number;
  /** Base animation delay */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

/**
 * Get balance color based on percentage
 * Green >= 40%, Amber 25-39%, Red < 25%
 */
function getBalanceColor(percentage: number): string {
  if (percentage >= 40) return '#4CAF50';
  if (percentage >= 25) return '#FF9800';
  return '#EF4444';
}

export const StatisticsRow: React.FC<StatisticsRowProps> = ({
  workDays,
  offDays,
  workLifeBalance,
  animationDelay = 300,
  testID,
}) => {
  const { t } = useTranslation('dashboard');
  const balanceColor = getBalanceColor(workLifeBalance);

  return (
    <View style={styles.row} testID={testID}>
      <StatisticsCard
        icon="briefcase-outline"
        iconColor="#2196F3"
        value={workDays}
        label={t('stats.workDays')}
        animationDelay={animationDelay}
        testID="stat-work-days"
      />
      <StatisticsCard
        icon="sunny-outline"
        iconColor="#FF9800"
        value={offDays}
        label={t('stats.offDays')}
        animationDelay={animationDelay + 50}
        testID="stat-off-days"
      />
      <StatisticsCard
        icon="heart-outline"
        iconColor={balanceColor}
        value={workLifeBalance.toFixed(0)}
        label={t('stats.balance')}
        suffix="%"
        animationDelay={animationDelay + 100}
        testID="stat-balance"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  value: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  suffix: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.dust,
  },
  label: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 2,
  },
});
