/**
 * SchedulePreviewCalendar
 *
 * A 30/60/90-day preview grid showing what the schedule looks like in practice.
 * Uses calculateUniversalShiftDay for each day. Shows month labels, today marker,
 * and anchor date indicator.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type { UniversalShiftSchedule } from '@/types';
import { calculateUniversalShiftDay } from '@/utils/universalShiftUtils';
import { getShiftDisplayModel } from '@/utils/universalShiftScheduleUtils';

export interface SchedulePreviewCalendarProps {
  schedule: Partial<UniversalShiftSchedule>;
  hasErrors: boolean;
  errors?: string[];
}

type PreviewRange = 30 | 60 | 90;

const RANGE_OPTIONS: PreviewRange[] = [30, 60, 90];

const MONTH_NAMES = [
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

const DAY_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DayData {
  dateStr: string;
  dayNum: number;
  weekday: number;
  color: string;
  icon: string;
  label: string;
  isToday: boolean;
  isAnchor: boolean;
  countsAsWork: boolean;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const SchedulePreviewCalendar: React.FC<SchedulePreviewCalendarProps> = ({
  schedule,
  hasErrors,
  errors = [],
}) => {
  const { t } = useTranslation('onboarding');
  const [range, setRange] = useState<PreviewRange>(30);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);

  const isScheduleComplete = useMemo(() => {
    return (
      !hasErrors &&
      schedule.version === 3 &&
      schedule.anchorDate &&
      (schedule.sequence?.length ?? 0) > 0 &&
      (schedule.shiftDefinitions?.length ?? 0) > 0 &&
      schedule.timezone
    );
  }, [hasErrors, schedule]);

  const days = useMemo<DayData[]>(() => {
    if (!isScheduleComplete) return [];
    const completeSchedule = schedule as UniversalShiftSchedule;
    const result: DayData[] = [];

    for (let i = 0; i < range; i++) {
      const date = addDays(today, i);
      const dateStr = toDateStr(date);
      let color: string = theme.colors.softStone;
      let icon = 'ellipse';
      let label = '';
      let countsAsWork = false;

      try {
        const shiftDay = calculateUniversalShiftDay(date, completeSchedule);
        const display = getShiftDisplayModel(shiftDay);
        color = display.color;
        icon = display.icon;
        label = display.title;
        countsAsWork = display.isWork;
      } catch {
        // Silently handle calculation errors
      }

      result.push({
        dateStr,
        dayNum: date.getDate(),
        weekday: date.getDay(),
        color,
        icon,
        label,
        isToday: dateStr === todayStr,
        isAnchor: dateStr === completeSchedule.anchorDate,
        countsAsWork,
      });
    }
    return result;
  }, [isScheduleComplete, schedule, range, today, todayStr]);

  // Group days by month-year key for month labels
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; days: DayData[] }[] = [];
    let current: (typeof groups)[0] | null = null;

    for (const day of days) {
      const d = new Date(day.dateStr + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      if (!current || current.key !== key) {
        current = { key, label, days: [] };
        groups.push(current);
      }
      current.days.push(day);
    }
    return groups;
  }, [days]);

  const renderDayCell = useCallback((day: DayData) => {
    return (
      <View
        key={day.dateStr}
        style={[
          styles.dayCell,
          { backgroundColor: day.color + '33' },
          day.isToday && styles.dayCellToday,
          day.isAnchor && styles.dayCellAnchor,
        ]}
        accessibilityLabel={`${day.dateStr}: ${day.label || 'unknown'}`}
      >
        {/* Colored dot indicator */}
        <View style={[styles.dayColorDot, { backgroundColor: day.color }]} />
        <Text style={[styles.dayNumber, day.isToday && styles.dayNumberToday]}>{day.dayNum}</Text>
        <Text style={styles.weekdayText}>{DAY_ABBREV[day.weekday]}</Text>
        {day.isToday && <View style={styles.todayRing} />}
        {day.isAnchor && (
          <View style={styles.anchorBadge}>
            <Ionicons name="flag" size={8} color={theme.colors.sacredGold} />
          </View>
        )}
      </View>
    );
  }, []);

  if (hasErrors) {
    const firstError = errors[0];
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{t('shiftBuilder.preview.title')}</Text>
        <View style={styles.errorState}>
          <Ionicons name="warning-outline" size={32} color={theme.colors.warning} />
          <Text style={styles.errorText}>{firstError ?? t('shiftBuilder.preview.errors')}</Text>
          <Text style={styles.errorHint}>{t('shiftBuilder.preview.errorHint')}</Text>
        </View>
      </View>
    );
  }

  if (!isScheduleComplete) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{t('shiftBuilder.preview.title')}</Text>
        <View style={styles.emptyState}>
          <Ionicons name="eye-outline" size={32} color={theme.colors.shadow} />
          <Text style={styles.emptyText}>{t('shiftBuilder.preview.empty')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header + toggle */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t('shiftBuilder.preview.title')}</Text>
        <View style={styles.rangeToggle}>
          {RANGE_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangePill, range === r && styles.rangePillActive]}
              onPress={() => setRange(r)}
              accessibilityLabel={t(`shiftBuilder.preview.range${r}`)}
              accessibilityState={{ selected: range === r }}
              accessibilityRole="radio"
            >
              <Text style={[styles.rangePillText, range === r && styles.rangePillTextActive]}>
                {r}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                borderWidth: 2,
                borderColor: theme.colors.sacredGold,
                backgroundColor: 'transparent',
              },
            ]}
          />
          <Text style={styles.legendText}>{t('shiftBuilder.preview.today')}</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="flag" size={10} color={theme.colors.sacredGold} />
          <Text style={styles.legendText}>{t('shiftBuilder.preview.anchor')}</Text>
        </View>
      </View>

      {/* Calendar grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {monthGroups.map((group) => (
          <View key={group.key} style={styles.monthGroup}>
            <Text style={styles.monthLabel}>{group.label}</Text>
            <View style={styles.dayGrid}>{group.days.map(renderDayCell)}</View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.full,
    padding: 3,
    gap: 2,
  },
  rangePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  rangePillActive: {
    backgroundColor: theme.colors.sacredGold,
  },
  rangePillText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  rangePillTextActive: {
    color: theme.colors.deepVoid,
    fontWeight: theme.typography.fontWeights.bold,
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
  },
  monthGroup: {
    marginBottom: theme.spacing.md,
  },
  monthLabel: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: 44,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
  },
  dayCellAnchor: {
    borderWidth: 2,
    borderColor: theme.colors.brightGold,
    borderStyle: 'dashed',
  },
  dayColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 5,
  },
  dayNumber: {
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: theme.typography.fontWeights.semibold,
    marginTop: 6,
  },
  dayNumberToday: {
    color: theme.colors.sacredGold,
  },
  weekdayText: {
    color: theme.colors.shadow,
    fontSize: 9,
    marginTop: 1,
  },
  todayRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
  },
  anchorBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  errorHint: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.sm,
    textAlign: 'center',
  },
});
