/**
 * MonthlyCalendarCard Component
 *
 * Interactive monthly calendar with shift visualization.
 * Features month navigation with swipe gestures, color-coded shift days,
 * today indicator, legend, and haptic feedback.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { getDaysInMonth, getFirstDayOfMonth, isToday as checkIsToday } from '@/utils/dateUtils';
import { ShiftCalendarDayCell } from './ShiftCalendarDayCell';
import type { ShiftDay } from '@/types';

export interface MonthlyCalendarCardProps {
  /** Current year */
  year: number;
  /** Current month (0-indexed, 0 = January) */
  month: number;
  /** Shift days for the current month */
  shiftDays: ShiftDay[];
  /** Selected day (1-31) */
  selectedDay?: number;
  /** Called when user navigates to previous month */
  onPreviousMonth: () => void;
  /** Called when user navigates to next month */
  onNextMonth: () => void;
  /** Called when a day is pressed */
  onDayPress?: (day: number) => void;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Build the calendar grid for a given month.
 * Returns an array of weeks, each containing 7 day slots.
 * Days from other months are null.
 */
function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month + 1); // getDaysInMonth expects 1-12
  const firstDay = getFirstDayOfMonth(new Date(year, month, 1));
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const weeks: (number | null)[][] = [];
  let currentDay = 1;
  let week: (number | null)[] = [];

  // Fill empty slots before the first day
  for (let i = 0; i < startDayOfWeek; i++) {
    week.push(null);
  }

  // Fill the days
  while (currentDay <= daysInMonth) {
    week.push(currentDay);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    currentDay++;
  }

  // Fill remaining slots in the last week
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }

  return weeks;
}

export const MonthlyCalendarCard: React.FC<MonthlyCalendarCardProps> = ({
  year,
  month,
  shiftDays,
  selectedDay,
  onPreviousMonth,
  onNextMonth,
  onDayPress,
  animationDelay = 200,
  testID,
}) => {
  const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  // Create a lookup from day number to ShiftDay
  const shiftDayMap = useMemo(() => {
    const map: Record<number, ShiftDay> = {};
    for (const sd of shiftDays) {
      const dayNum = parseInt(sd.date.split('-')[2], 10);
      map[dayNum] = sd;
    }
    return map;
  }, [shiftDays]);

  const handlePrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPreviousMonth();
  }, [onPreviousMonth]);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextMonth();
  }, [onNextMonth]);

  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(600)}
      style={styles.container}
      testID={testID}
    >
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navButton}
          accessibilityLabel="Previous month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.paper} />
        </TouchableOpacity>

        <Animated.Text style={styles.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </Animated.Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navButton}
          accessibilityLabel="Next month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.paper} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={`weekday-${index}`} style={styles.weekdayCell}>
            <Animated.Text style={styles.weekdayText}>{label}</Animated.Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.gridContainer}>
        {calendarGrid.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.emptyCell} />;
              }

              const shiftDay = shiftDayMap[day];
              const dayDate = new Date(year, month, day);
              const isTodayDate = checkIsToday(dayDate);

              return (
                <ShiftCalendarDayCell
                  key={`day-${day}`}
                  day={day}
                  shiftType={shiftDay?.shiftType}
                  isToday={isTodayDate}
                  selected={selectedDay === day}
                  onPress={onDayPress}
                  testID={`calendar-day-${day}`}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color="#2196F3" label="Day" />
        <LegendItem color="#F59E0B" label="Morning" />
        <LegendItem color="#06B6D4" label="Afternoon" />
        <LegendItem color="#651FFF" label="Night" />
        <LegendItem color="#78716c" label="Off" />
      </View>
    </Animated.View>
  );
};

interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Animated.Text style={styles.legendText}>{label}</Animated.Text>
  </View>
);

const CELL_WIDTH = 44;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  weekdayCell: {
    width: CELL_WIDTH,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
  },
  gridContainer: {
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 2,
  },
  emptyCell: {
    width: CELL_WIDTH,
    height: CELL_WIDTH + 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
    gap: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
  },
});
