/**
 * ShiftConfigCard Component
 *
 * Read-only card displaying the user's shift configuration summary.
 * Shows shift system, roster type, pattern, shift times, and FIFO-specific
 * details with gold pill badges and staggered entrance animations.
 *
 * @deprecated Use ShiftSettingsPanel instead. ShiftConfigCard is kept for
 * test compatibility only and is no longer rendered in ProfileScreen.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Image, type ImageSourcePropType } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ShiftPattern, type FIFOConfig } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import {
  getPatternDisplayName,
  getShiftSystemDisplayName,
  getRosterTypeDisplayName,
  getFIFOWorkPatternName,
  formatShiftTime,
} from '@/utils/profileUtils';

interface ShiftConfigCardProps {
  shiftSystem?: '2-shift' | '3-shift';
  rosterType?: 'rotating' | 'fifo';
  patternType?: ShiftPattern;
  customPattern?: OnboardingData['customPattern'];
  fifoConfig?: FIFOConfig;
  shiftTimes?: OnboardingData['shiftTimes'];
  shiftStartTime?: string;
  shiftEndTime?: string;
  animationDelay?: number;
}

interface ConfigRow {
  iconSource?: ImageSourcePropType;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isBadge?: boolean;
}

const SHIFT_TYPE_ICONS = {
  day: require('../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
  night: require('../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
  morning: require('../../../assets/onboarding/icons/consolidated/shift-time-morning.png'),
} as const;

const ROSTER_ICONS = {
  rotating: require('../../../assets/onboarding/icons/consolidated/roster-type-rotating.png'),
  fifo: require('../../../assets/onboarding/icons/consolidated/roster-type-fifo.png'),
} as const;

const PATTERN_ICONS: Record<ShiftPattern, ImageSourcePropType> = {
  [ShiftPattern.STANDARD_3_3_3]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-3-3-3.png'),
  [ShiftPattern.STANDARD_5_5_5]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-5-5-5.png'),
  [ShiftPattern.STANDARD_10_10_10]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-10-10-10.png'),
  [ShiftPattern.STANDARD_2_2_3]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-2-2-3.png'),
  [ShiftPattern.STANDARD_4_4_4]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-4-4-4.png'),
  [ShiftPattern.STANDARD_7_7_7]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-7-7-7.png'),
  [ShiftPattern.CONTINENTAL]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-continental.png'),
  [ShiftPattern.PITMAN]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-pitman.png'),
  [ShiftPattern.CUSTOM]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-custom.png'),
  [ShiftPattern.FIFO_8_6]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-8-6.png'),
  [ShiftPattern.FIFO_7_7]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-7-7.png'),
  [ShiftPattern.FIFO_14_14]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-14-14.png'),
  [ShiftPattern.FIFO_14_7]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-14-7.png'),
  [ShiftPattern.FIFO_21_7]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-21-7.png'),
  [ShiftPattern.FIFO_28_14]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-28-14.png'),
  [ShiftPattern.FIFO_CUSTOM]: require('../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-custom.png'),
};

function getSystemIconSource(shiftSystem?: '2-shift' | '3-shift'): ImageSourcePropType {
  return shiftSystem === '3-shift' ? SHIFT_TYPE_ICONS.morning : SHIFT_TYPE_ICONS.day;
}

export const ShiftConfigCard: React.FC<ShiftConfigCardProps> = ({
  shiftSystem,
  rosterType,
  patternType,
  customPattern,
  fifoConfig,
  shiftTimes,
  shiftStartTime,
  shiftEndTime,
  animationDelay = 0,
}) => {
  const rows = useMemo(() => {
    const result: ConfigRow[] = [];

    if (!patternType) return result;

    // Shift system
    result.push({
      iconSource: getSystemIconSource(shiftSystem),
      label: 'System',
      value: getShiftSystemDisplayName(shiftSystem),
      isBadge: true,
    });

    // Roster type
    result.push({
      iconSource: rosterType === 'fifo' ? ROSTER_ICONS.fifo : ROSTER_ICONS.rotating,
      label: 'Roster',
      value: getRosterTypeDisplayName(rosterType),
      isBadge: true,
    });

    // Pattern
    result.push({
      iconSource: PATTERN_ICONS[patternType],
      label: 'Pattern',
      value: getPatternDisplayName({ patternType, shiftSystem, customPattern, fifoConfig }),
    });

    // Shift times
    const timesText = getShiftTimesText(shiftSystem, shiftTimes, shiftStartTime, shiftEndTime);
    if (timesText) {
      result.push({
        iconSource: shiftSystem === '3-shift' ? SHIFT_TYPE_ICONS.morning : SHIFT_TYPE_ICONS.day,
        label: 'Times',
        value: timesText,
      });
    }

    // FIFO-specific rows
    if (rosterType === 'fifo' && fifoConfig) {
      if (fifoConfig.siteName) {
        result.push({
          icon: 'location-outline',
          label: 'Site',
          value: fifoConfig.siteName,
        });
      }

      result.push({
        icon: 'hammer-outline',
        label: 'Work',
        value: `${fifoConfig.workBlockDays} days on-site`,
      });

      result.push({
        icon: 'home-outline',
        label: 'Rest',
        value: `${fifoConfig.restBlockDays} days at home`,
      });

      result.push({
        icon: 'flash-outline',
        label: 'Shifts',
        value: getFIFOWorkPatternName(fifoConfig),
      });
    }

    return result;
  }, [
    shiftSystem,
    rosterType,
    patternType,
    customPattern,
    fifoConfig,
    shiftTimes,
    shiftStartTime,
    shiftEndTime,
  ]);

  if (rows.length === 0) {
    return (
      <Animated.View
        entering={FadeInUp.delay(animationDelay).duration(400)}
        style={[styles.wrapper, styles.card]}
      >
        <View style={styles.emptyState}>
          <Ionicons name="settings-outline" size={24} color={theme.colors.shadow} />
          <Animated.Text style={styles.emptyText}>No shift configuration set</Animated.Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay).duration(400)}
      style={[styles.wrapper, styles.card]}
    >
      {rows.map((row, index) => (
        <Animated.View
          key={`${row.label}-${index}`}
          entering={FadeInUp.delay(animationDelay + index * 60).duration(350)}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {row.iconSource ? (
                <Image source={row.iconSource} style={styles.rowIconImage} resizeMode="contain" />
              ) : row.icon ? (
                <Ionicons
                  name={row.icon}
                  size={18}
                  color={theme.colors.shadow}
                  style={styles.rowIcon}
                />
              ) : null}
              <Animated.Text style={styles.rowLabel}>{row.label}</Animated.Text>
            </View>
            {row.isBadge ? (
              <View style={styles.badge}>
                <Animated.Text style={styles.badgeText}>{row.value}</Animated.Text>
              </View>
            ) : (
              <Animated.Text style={styles.rowValue} numberOfLines={2}>
                {row.value}
              </Animated.Text>
            )}
          </View>
          {index < rows.length - 1 && <View style={styles.divider} />}
        </Animated.View>
      ))}

      {/* Footer note */}
      <View style={styles.footer}>
        <Animated.Text style={styles.footerText}>
          Shift settings can be updated in Settings
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

/**
 * Build shift times display text from the various time formats
 */
function getShiftTimesText(
  shiftSystem?: string,
  shiftTimes?: OnboardingData['shiftTimes'],
  shiftStartTime?: string,
  shiftEndTime?: string
): string | null {
  if (shiftTimes) {
    if (shiftSystem === '3-shift') {
      const parts: string[] = [];
      if (shiftTimes.morningShift) {
        parts.push(`M: ${formatShiftTime(shiftTimes.morningShift.startTime)}`);
      }
      if (shiftTimes.afternoonShift) {
        parts.push(`A: ${formatShiftTime(shiftTimes.afternoonShift.startTime)}`);
      }
      if (shiftTimes.nightShift3) {
        parts.push(`N: ${formatShiftTime(shiftTimes.nightShift3.startTime)}`);
      }
      return parts.join('  ');
    }

    const parts: string[] = [];
    if (shiftTimes.dayShift) {
      parts.push(
        `Day: ${formatShiftTime(shiftTimes.dayShift.startTime)} - ${formatShiftTime(shiftTimes.dayShift.endTime)}`
      );
    }
    if (shiftTimes.nightShift) {
      parts.push(
        `Night: ${formatShiftTime(shiftTimes.nightShift.startTime)} - ${formatShiftTime(shiftTimes.nightShift.endTime)}`
      );
    }
    return parts.join('\n');
  }

  // Legacy format
  if (shiftStartTime && shiftEndTime) {
    return `${formatShiftTime(shiftStartTime)} - ${formatShiftTime(shiftEndTime)}`;
  }

  return null;
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: theme.spacing.sm,
  },
  rowIconImage: {
    width: 18,
    height: 18,
    marginRight: theme.spacing.sm,
  },
  rowLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
  },

  // Badge
  badge: {
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.3)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  // Footer
  footer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  footerText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
  },
});
