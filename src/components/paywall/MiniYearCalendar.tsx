import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { buildShiftCycle, getShiftDaysInRange } from '@/utils/shiftUtils';
import { theme } from '@/utils/theme';
import type { OnboardingData } from '@/contexts/OnboardingContext';

interface MiniYearCalendarProps {
  data: OnboardingData;
  blurred?: boolean;
  compact?: boolean;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// Shift type -> dot color
const SHIFT_COLORS: Record<string, string> = {
  day: '#2196F3',
  night: '#651FFF',
  morning: '#F59E0B',
  afternoon: '#F59E0B',
  off: theme.colors.softStone,
};

export const MiniYearCalendar: React.FC<MiniYearCalendarProps> = ({ data, blurred, compact }) => {
  const dotSize = compact ? 3 : 5;
  const dotGap = compact ? 1 : 2;

  const shiftDays = useMemo(() => {
    const shiftCycle = buildShiftCycle(data);
    if (!shiftCycle) return [];

    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return getShiftDaysInRange(start, end, shiftCycle);
  }, [data]);

  const months = useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }).map((_, month) => ({
      month,
      year,
      days: shiftDays.filter((shiftDay) => {
        const date = new Date(shiftDay.date);
        return date.getMonth() === month && date.getFullYear() === year;
      }),
    }));
  }, [shiftDays]);

  return (
    <View style={[styles.container, blurred && styles.blurred]}>
      {months.map(({ month, days }) => (
        <View key={month} style={styles.monthRow}>
          <Text style={styles.monthLabel}>{MONTH_LABELS[month]}</Text>
          <View style={styles.dotWrap}>
            {days.map((day, index) => (
              <View
                key={`${day.date}-${index}`}
                style={[
                  styles.dot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    margin: dotGap / 2,
                    backgroundColor: SHIFT_COLORS[day.shiftType] ?? theme.colors.softStone,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  blurred: {
    opacity: 0.25,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  monthLabel: {
    width: 28,
    fontSize: 10,
    color: theme.colors.shadow,
    marginTop: 1,
  },
  dotWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dot: {
    // size and spacing set inline
  },
});
