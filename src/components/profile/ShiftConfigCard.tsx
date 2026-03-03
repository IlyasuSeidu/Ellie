/**
 * ShiftConfigCard Component
 *
 * Read-only card displaying the user's shift configuration summary.
 * Shows shift system, roster type, pattern, shift times, and FIFO-specific
 * details with gold pill badges and staggered entrance animations.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { ShiftPattern, FIFOConfig } from '@/types';
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
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isBadge?: boolean;
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
      icon: 'time-outline',
      label: 'System',
      value: getShiftSystemDisplayName(shiftSystem),
      isBadge: true,
    });

    // Roster type
    result.push({
      icon: 'swap-horizontal-outline',
      label: 'Roster',
      value: getRosterTypeDisplayName(rosterType),
      isBadge: true,
    });

    // Pattern
    result.push({
      icon: 'refresh-outline',
      label: 'Pattern',
      value: getPatternDisplayName({ patternType, shiftSystem, customPattern, fifoConfig }),
    });

    // Shift times
    const timesText = getShiftTimesText(shiftSystem, shiftTimes, shiftStartTime, shiftEndTime);
    if (timesText) {
      result.push({
        icon: 'sunny-outline',
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
              <Ionicons
                name={row.icon}
                size={18}
                color={theme.colors.shadow}
                style={styles.rowIcon}
              />
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
