/**
 * StartDatePickerSheet
 *
 * Compact calendar bottom sheet for selecting a new cycle start date.
 * Past dates are disabled. Today is highlighted. Shows up to 12 months ahead.
 * Modeled on PatternSelectorSheet for consistent animation/layout.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

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
const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const SHEET_ICONS = {
  startDate: require('../../../assets/onboarding/icons/consolidated/cycle-preview-calendar-grid.png'),
} as const;

const START_DATE_ICON = SHEET_ICONS.startDate;

// ── Helpers ───────────────────────────────────────────────────────────────────

function datesEqual(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function normalizeSelectedDate(
  value: Date | string | undefined,
  minDate: Date,
  maxDate: Date
): Date {
  if (!value) return minDate;

  const parsed = typeof value === 'string' ? new Date(value) : value;
  if (!isValidDate(parsed)) return minDate;

  const normalized = startOfDay(parsed);
  if (normalized < minDate) return minDate;
  if (normalized > maxDate) return maxDate;
  return normalized;
}

/** Returns the grid cells for a month (Mon-first, includes leading/trailing nulls) */
function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0, Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface StartDatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: Date | string;
  onSelect: (date: Date) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const StartDatePickerSheet: React.FC<StartDatePickerSheetProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelect,
}) => {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }, [today]);
  const minMonthStart = useMemo(() => monthStart(today), [today]);
  const maxMonthStart = useMemo(() => monthStart(maxDate), [maxDate]);
  const normalizedSelectedDate = useMemo(
    () => normalizeSelectedDate(selectedDate, today, maxDate),
    [selectedDate, today, maxDate]
  );

  // Calendar view month (start at selected date's month or today)
  const [viewYear, setViewYear] = useState(() => normalizedSelectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => normalizedSelectedDate.getMonth());

  // Reset view when sheet opens
  useEffect(() => {
    if (visible) {
      setViewYear(normalizedSelectedDate.getFullYear());
      setViewMonth(normalizedSelectedDate.getMonth());
    }
  }, [visible, normalizedSelectedDate]);

  useEffect(() => {
    if (!visible) return;
    // Reset to hidden values before opening animation to avoid stale modal state in native builds.
    backdropOpacity.value = 0;
    translateY.value = SCREEN_HEIGHT;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [visible, backdropOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    const currentMonthStart = new Date(viewYear, viewMonth, 1);
    if (currentMonthStart <= minMonthStart) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const nextMonthStart = new Date(viewYear, viewMonth + 1, 1);
    if (nextMonthStart > maxMonthStart) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayPress = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (date < today || date > maxDate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(date);
    onClose();
  };

  const canGoPrev = new Date(viewYear, viewMonth, 1) > minMonthStart;
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxMonthStart;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <Image source={START_DATE_ICON} style={styles.headerIconImage} resizeMode="contain" />
            </View>
            <Animated.Text style={styles.headerTitle}>Select Start Date</Animated.Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
            accessibilityLabel="Close date picker"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.shadow} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
              hitSlop={8}
              accessibilityLabel="Previous month"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canGoPrev ? theme.colors.paper : theme.colors.shadow}
              />
            </TouchableOpacity>
            <Animated.Text style={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Animated.Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={!canGoNext}
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
              hitSlop={8}
              accessibilityLabel="Next month"
              accessibilityRole="button"
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoNext ? theme.colors.paper : theme.colors.shadow}
              />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayHeaders}>
            {DAY_NAMES.map((d) => (
              <Animated.Text key={d} style={styles.dayHeader}>
                {d}
              </Animated.Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {grid.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }
              const date = new Date(viewYear, viewMonth, day);
              const isToday = datesEqual(date, today);
              const isSelected = datesEqual(date, normalizedSelectedDate);
              const isPast = date < today;
              const isFuture = date > maxDate;
              const isDisabled = isPast || isFuture;

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                    isDisabled && styles.dayCellDisabled,
                  ]}
                  onPress={() => handleDayPress(day)}
                  disabled={isDisabled}
                  activeOpacity={0.7}
                  accessibilityLabel={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}${isToday ? ', today' : ''}${isDisabled ? ', unavailable' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                >
                  <Animated.Text
                    style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isDisabled && styles.dayCellTextDisabled,
                      isToday && !isSelected && styles.dayCellTextToday,
                    ]}
                  >
                    {day}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { borderColor: theme.colors.sacredGold, borderWidth: 1 }]}
              />
              <Animated.Text style={styles.legendText}>Today</Animated.Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.colors.sacredGold + '30' }]}
              />
              <Animated.Text style={styles.legendText}>Selected</Animated.Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.softStone,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6,182,212,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImage: {
    width: 18,
    height: 18,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: {
    padding: theme.spacing.lg,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.shadow,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCellToday: {
    borderColor: theme.colors.sacredGold,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.sacredGold + '30',
    borderColor: theme.colors.sacredGold,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayCellText: {
    fontSize: 14,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
  },
  dayCellTextSelected: {
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.bold,
  },
  dayCellTextDisabled: {
    color: theme.colors.shadow,
  },
  dayCellTextToday: {
    color: theme.colors.sacredGold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
  },
});
