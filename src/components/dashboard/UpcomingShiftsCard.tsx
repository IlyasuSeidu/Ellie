/**
 * UpcomingShiftsCard Component
 *
 * Shows the next 3 upcoming shifts with date, type, and time info.
 * Features staggered entrance animations and shift type color coding.
 */

import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInRight, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type { ShiftType } from '@/types';
import type { UpcomingShift } from '@/types/dashboard';

export interface UpcomingShiftsCardProps {
  /** Array of upcoming shifts to display */
  shifts: UpcomingShift[];
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

const SHIFT_CONFIG: Record<
  ShiftType,
  {
    color: string;
    icon?: keyof typeof Ionicons.glyphMap;
    key: 'day' | 'night' | 'morning' | 'afternoon' | 'off';
  }
> = {
  day: { color: '#2196F3', key: 'day' },
  night: { color: '#651FFF', key: 'night' },
  morning: { color: '#F59E0B', key: 'morning' },
  afternoon: { color: '#06B6D4', key: 'afternoon' },
  off: { color: '#78716c', key: 'off' },
};

const SHIFT_LABEL_KEYS: Record<
  ShiftType,
  | 'shiftLabels.day'
  | 'shiftLabels.night'
  | 'shiftLabels.morning'
  | 'shiftLabels.afternoon'
  | 'shiftLabels.off'
> = {
  day: 'shiftLabels.day',
  night: 'shiftLabels.night',
  morning: 'shiftLabels.morning',
  afternoon: 'shiftLabels.afternoon',
  off: 'shiftLabels.off',
};

export const UpcomingShiftsCard: React.FC<UpcomingShiftsCardProps> = ({
  shifts,
  animationDelay = 500,
  testID,
}) => {
  const { t } = useTranslation('dashboard');
  if (shifts.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInRight.delay(animationDelay).duration(600).springify()}
      style={styles.container}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="calendar-outline"
          size={18}
          color={theme.colors.sacredGold}
          style={styles.headerIcon}
        />
        <Animated.Text style={styles.headerTitle}>{t('upcoming.title')}</Animated.Text>
      </View>

      {/* Shift List */}
      {shifts.map((shift, index) => {
        const config = SHIFT_CONFIG[shift.shiftType];
        const isLast = index === shifts.length - 1;

        return (
          <Animated.View
            key={shift.date}
            entering={FadeIn.delay(animationDelay + (index + 1) * 80).duration(400)}
            style={[styles.shiftRow, !isLast && styles.shiftRowBorder]}
          >
            {/* Color indicator */}
            <View style={[styles.colorBar, { backgroundColor: config.color }]} />

            {/* Shift icon */}
            <View style={[styles.shiftIconContainer, { backgroundColor: `${config.color}20` }]}>
              {shift.shiftType === 'day' ? (
                <Image source={DAY_SHIFT_ICON} style={styles.shiftImage} />
              ) : shift.shiftType === 'night' ? (
                <Image source={NIGHT_SHIFT_ICON} style={styles.shiftImage} />
              ) : shift.shiftType === 'morning' ? (
                <Image source={MORNING_SHIFT_ICON} style={styles.shiftImage} />
              ) : shift.shiftType === 'afternoon' ? (
                <Image source={AFTERNOON_SHIFT_ICON} style={styles.shiftImage} />
              ) : shift.shiftType === 'off' ? (
                <Image source={OFF_SHIFT_ICON} style={styles.shiftImage} />
              ) : null}
            </View>

            {/* Shift info */}
            <View style={styles.shiftInfo}>
              <Animated.Text style={styles.shiftDate}>{shift.displayDate}</Animated.Text>
              <Animated.Text style={[styles.shiftType, { color: config.color }]}>
                {t(SHIFT_LABEL_KEYS[shift.shiftType])}
              </Animated.Text>
            </View>

            {/* Time display */}
            {shift.timeDisplay && (
              <View style={styles.timeContainer}>
                <Animated.Text style={styles.timeText}>{shift.timeDisplay}</Animated.Text>
              </View>
            )}
          </Animated.View>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerIcon: {
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    position: 'relative',
  },
  shiftRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: theme.spacing.sm,
    bottom: theme.spacing.sm,
    width: 3,
    borderRadius: 2,
  },
  shiftIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftDate: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  shiftType: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
    marginTop: 2,
  },
  timeContainer: {
    backgroundColor: theme.colors.softStone,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  timeText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.medium,
  },
  shiftImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});
