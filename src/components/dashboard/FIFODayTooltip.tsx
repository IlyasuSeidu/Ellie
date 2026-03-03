/**
 * FIFODayTooltip Component
 *
 * Floating tooltip shown on long-press of a FIFO calendar day cell.
 * Displays block info (type, day/total, shift type) with animated entrance.
 * Rendered as an absolute overlay within the calendar grid container.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { FIFODayPosition } from '@/utils/fifoCalendarUtils';

interface FIFODayTooltipProps {
  /** The day number being inspected */
  day: number;
  /** FIFO position metadata for this day */
  position: FIFODayPosition;
  /** X position (center of cell, relative to grid container) */
  x: number;
  /** Y position (top or bottom of cell, relative to grid container) */
  y: number;
  /** Whether tooltip should appear above (true) or below (false) the cell */
  showAbove: boolean;
  /** Whether tooltip is currently dismissing (plays fade-out animation) */
  isDismissing?: boolean;
  /** Dismiss handler */
  onDismiss: () => void;
}

const TOOLTIP_WIDTH = 180;

export const FIFODayTooltip: React.FC<FIFODayTooltipProps> = ({
  day: _day,
  position,
  x,
  y,
  showAbove,
  isDismissing = false,
  onDismiss,
}) => {
  const tooltipScale = useSharedValue(0.8);
  const tooltipOpacity = useSharedValue(0);

  useEffect(() => {
    if (isDismissing) {
      tooltipScale.value = withTiming(0.96, { duration: 200 });
      tooltipOpacity.value = withTiming(0, { duration: 200 });
      return;
    }

    tooltipScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    tooltipOpacity.value = withTiming(1, { duration: 200 });
  }, [isDismissing, tooltipScale, tooltipOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tooltipScale.value }],
    opacity: tooltipOpacity.value,
  }));

  // Build tooltip content
  const blockName = position.blockType === 'work' ? 'Work' : 'Rest';
  const shiftLabel =
    position.blockType === 'work'
      ? position.shiftType === 'night'
        ? 'Night Shift'
        : 'Day Shift'
      : 'Home';

  const flyStatus = position.isFlyInDay ? ' — Fly In' : position.isFlyOutDay ? ' — Fly Out' : '';

  // Position tooltip centered on the cell X, above or below
  const tooltipLeft = Math.max(4, Math.min(x - TOOLTIP_WIDTH / 2, 300)); // clamp to prevent overflow

  return (
    <Animated.View
      style={[
        styles.tooltip,
        animatedStyle,
        {
          left: tooltipLeft,
          ...(showAbove ? { bottom: undefined, top: y - 52 } : { top: y, bottom: undefined }),
        },
      ]}
      onTouchEnd={onDismiss}
      testID="fifo-day-tooltip"
    >
      <Animated.Text style={styles.tooltipTitle}>
        {blockName} Block Day {position.dayInBlock}/{position.blockLength}
      </Animated.Text>
      <Animated.Text style={styles.tooltipSubtitle}>
        {shiftLabel}
        {flyStatus}
      </Animated.Text>
      {position.isSwingTransitionDay && (
        <Animated.Text style={styles.tooltipDetail}>
          <Ionicons name="swap-horizontal" size={10} color={theme.colors.dust} /> Shift transition
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: theme.colors.softStone,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: theme.colors.sacredGold,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginBottom: 2,
  },
  tooltipSubtitle: {
    fontSize: 11,
    color: theme.colors.dust,
  },
  tooltipDetail: {
    fontSize: 10,
    color: theme.colors.shadow,
    marginTop: 2,
  },
});
