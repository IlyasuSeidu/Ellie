/**
 * PremiumCalendar Component
 *
 * Calendar with month navigation using stone and gold theme
 */

import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { normalizeLanguage } from '@/i18n/languageDetector';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';
import { DayCell } from './DayCell';

export interface PremiumCalendarProps {
  /** Selected date */
  selectedDate?: Date;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Date selection handler */
  onDateSelect?: (date: Date) => void;
  /** Disabled dates */
  disabledDates?: Date[];
  /** Test ID */
  testID?: string;
}

const getDateLocaleTag = (language: string): string => {
  const normalized = normalizeLanguage(language);
  if (normalized === 'es') return 'es-ES';
  if (normalized === 'pt-BR') return 'pt-BR';
  if (normalized === 'fr') return 'fr-FR';
  if (normalized === 'ar') return 'ar';
  if (normalized === 'zh-CN') return 'zh-CN';
  if (normalized === 'ru') return 'ru-RU';
  if (normalized === 'hi') return 'hi-IN';
  if (normalized === 'af') return 'af-ZA';
  if (normalized === 'zu') return 'zu-ZA';
  if (normalized === 'id') return 'id-ID';
  return 'en-US';
};

export const PremiumCalendar: React.FC<PremiumCalendarProps> = ({
  selectedDate,
  minDate,
  maxDate,
  onDateSelect,
  disabledDates = [],
  testID,
}) => {
  const { t, i18n } = useTranslation('onboarding');
  const localeTag = useMemo(() => getDateLocaleTag(i18n.language), [i18n.language]);
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const weekdayLabels = useMemo(() => {
    const sunday = new Date(Date.UTC(2026, 0, 4)); // Sunday baseline
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sunday);
      date.setUTCDate(sunday.getUTCDate() + index);
      return date.toLocaleDateString(localeTag, { weekday: 'narrow' });
    });
  }, [localeTag]);

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString(localeTag, {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonth, localeTag]
  );

  const handlePrevMonth = () => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumCalendar.prevMonth',
    });
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumCalendar.nextMonth',
    });
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleDayPress = (day: number) => {
    if (onDateSelect) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      onDateSelect(date);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month (0 = Sunday, 6 = Saturday)
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Number of days in previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      date: Date;
    }> = [];

    // Previous month's days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Next month's days to complete the grid
    const remainingCells = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [currentMonth]);

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(
      (disabledDate) =>
        disabledDate.getFullYear() === date.getFullYear() &&
        disabledDate.getMonth() === date.getMonth() &&
        disabledDate.getDate() === date.getDate()
    );
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === date.getFullYear() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getDate() === date.getDate()
    );
  };

  const isDateToday = (date: Date): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('premiumCalendar.previousMonthA11y', {
            defaultValue: 'Previous month',
          })}
          testID={`${testID}-prev-month`}
        >
          <Animated.Text style={styles.navText}>‹</Animated.Text>
        </TouchableOpacity>

        <Animated.Text style={styles.monthText}>{monthLabel}</Animated.Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel={t('premiumCalendar.nextMonthA11y', {
            defaultValue: 'Next month',
          })}
          testID={`${testID}-next-month`}
        >
          <Animated.Text style={styles.navText}>›</Animated.Text>
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekdaysContainer}>
        {weekdayLabels.map((weekday, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Animated.Text style={styles.weekdayText}>{weekday}</Animated.Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.gridContainer}>
        {calendarDays.map((dayInfo, index) => (
          <DayCell
            key={index}
            day={dayInfo.day}
            selected={isDateSelected(dayInfo.date)}
            isToday={isDateToday(dayInfo.date)}
            disabled={!dayInfo.isCurrentMonth || isDateDisabled(dayInfo.date)}
            isOtherMonth={!dayInfo.isCurrentMonth}
            onPress={dayInfo.isCurrentMonth ? handleDayPress : undefined}
            testID={`${testID}-day-${index}`}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.softStone,
  },
  navText: {
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  monthText: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  weekdayText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.dust,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
});
