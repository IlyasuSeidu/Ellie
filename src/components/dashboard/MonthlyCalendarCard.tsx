/**
 * MonthlyCalendarCard Component
 *
 * Universal-schedule monthly calendar with swipe navigation, animated rows,
 * per-shift colors/icons, and a dynamic legend sourced from the schedule.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { getDaysInMonth, getFirstDayOfMonth, isToday as checkIsToday } from '@/utils/dateUtils';
import { ShiftCalendarDayCell } from './ShiftCalendarDayCell';
import { PadlockOverlay } from '@/components/subscription/PadlockOverlay';
import { type ShiftDay, type ShiftCycle } from '@/types';
import { normalizeLanguage } from '@/i18n/languageDetector';
import { getShiftDisplayModel } from '@/utils/universalShiftScheduleUtils';

/* eslint-disable @typescript-eslint/no-var-requires */
const DAY_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png');
const MORNING_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-morning.png');
const AFTERNOON_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png');
const OFF_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png');
const NIGHT_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png');
/* eslint-enable @typescript-eslint/no-var-requires */

export interface MonthlyCalendarCardProps {
  year: number;
  month: number;
  shiftDays: ShiftDay[];
  selectedDay?: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onDayPress?: (day: number) => void;
  shiftCycle?: ShiftCycle;
  activeGlowColor?: string;
  lockNonCurrentWeeks?: boolean;
  onLockedWeekPress?: () => void;
  animationDelay?: number;
  testID?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL_WIDTH = 44;
const CELL_HEIGHT = 72;

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

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = getDaysInMonth(year, month + 1);
  const firstDay = getFirstDayOfMonth(new Date(year, month, 1));
  const weeks: (number | null)[][] = [];
  let currentDay = 1;
  let week: (number | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push(null);
  }

  while (currentDay <= daysInMonth) {
    week.push(currentDay);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    currentDay++;
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
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
  shiftCycle,
  activeGlowColor,
  lockNonCurrentWeeks = false,
  onLockedWeekPress,
  animationDelay = 200,
  testID,
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const localeTag = useMemo(
    () => getDateLocaleTag(i18n.resolvedLanguage ?? i18n.language ?? 'en'),
    [i18n.language, i18n.resolvedLanguage]
  );
  const monthLabel = useMemo(
    () => new Date(year, month, 1).toLocaleDateString(localeTag, { month: 'long' }),
    [localeTag, month, year]
  );
  const currentDate = useMemo(() => new Date(), []);

  const shiftDayMap = useMemo(() => {
    const map: Record<number, ShiftDay> = {};
    for (const shiftDay of shiftDays) {
      const dayNum = parseInt(shiftDay.date.split('-')[2], 10);
      map[dayNum] = shiftDay;
    }
    return map;
  }, [shiftDays]);

  const universalLegendItems = useMemo(() => {
    const seen = new Set<string>();
    return (shiftCycle?.shiftDefinitions ?? []).filter((definition) => {
      if (seen.has(definition.id)) return false;
      seen.add(definition.id);
      return true;
    });
  }, [shiftCycle?.shiftDefinitions]);

  const headerTranslateY = useSharedValue(10);
  const headerOpacity = useSharedValue(0);
  const weekdayTranslateY = useSharedValue(8);
  const weekdayOpacity = useSharedValue(0);
  const row0TranslateY = useSharedValue(10);
  const row0Opacity = useSharedValue(0);
  const row1TranslateY = useSharedValue(10);
  const row1Opacity = useSharedValue(0);
  const row2TranslateY = useSharedValue(10);
  const row2Opacity = useSharedValue(0);
  const row3TranslateY = useSharedValue(10);
  const row3Opacity = useSharedValue(0);
  const row4TranslateY = useSharedValue(10);
  const row4Opacity = useSharedValue(0);
  const row5TranslateY = useSharedValue(10);
  const row5Opacity = useSharedValue(0);
  const legendTranslateY = useSharedValue(8);
  const legendOpacity = useSharedValue(0);
  const prevBtnScale = useSharedValue(1);
  const nextBtnScale = useSharedValue(1);

  const rowTranslateYs = useMemo(
    () => [
      row0TranslateY,
      row1TranslateY,
      row2TranslateY,
      row3TranslateY,
      row4TranslateY,
      row5TranslateY,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const rowOpacities = useMemo(
    () => [row0Opacity, row1Opacity, row2Opacity, row3Opacity, row4Opacity, row5Opacity],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const springConfig = { damping: 16, stiffness: 180 };
    headerTranslateY.value = 10;
    headerOpacity.value = 0;
    weekdayTranslateY.value = 8;
    weekdayOpacity.value = 0;
    for (let i = 0; i < 6; i++) {
      rowTranslateYs[i].value = 10;
      rowOpacities[i].value = 0;
    }
    legendTranslateY.value = 8;
    legendOpacity.value = 0;

    headerTranslateY.value = withDelay(animationDelay, withSpring(0, springConfig));
    headerOpacity.value = withDelay(animationDelay, withTiming(1, { duration: 350 }));
    weekdayTranslateY.value = withDelay(animationDelay + 120, withSpring(0, springConfig));
    weekdayOpacity.value = withDelay(animationDelay + 120, withTiming(1, { duration: 350 }));

    for (let i = 0; i < calendarGrid.length; i++) {
      const rowDelay = animationDelay + 240 + i * 80;
      rowTranslateYs[i].value = withDelay(rowDelay, withSpring(0, springConfig));
      rowOpacities[i].value = withDelay(rowDelay, withTiming(1, { duration: 300 }));
    }

    const legendDelay = animationDelay + 240 + calendarGrid.length * 80 + 100;
    legendTranslateY.value = withDelay(legendDelay, withSpring(0, springConfig));
    legendOpacity.value = withDelay(legendDelay, withTiming(1, { duration: 350 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDelay, month, year]);

  const headerEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: headerOpacity.value,
  }));
  const weekdayEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: weekdayTranslateY.value }],
    opacity: weekdayOpacity.value,
  }));
  const row0Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row0TranslateY.value }],
    opacity: row0Opacity.value,
  }));
  const row1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row1TranslateY.value }],
    opacity: row1Opacity.value,
  }));
  const row2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row2TranslateY.value }],
    opacity: row2Opacity.value,
  }));
  const row3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row3TranslateY.value }],
    opacity: row3Opacity.value,
  }));
  const row4Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row4TranslateY.value }],
    opacity: row4Opacity.value,
  }));
  const row5Style = useAnimatedStyle(() => ({
    transform: [{ translateY: row5TranslateY.value }],
    opacity: row5Opacity.value,
  }));
  const rowEntranceStyles = useMemo(
    () => [row0Style, row1Style, row2Style, row3Style, row4Style, row5Style],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const legendEntranceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: legendTranslateY.value }],
    opacity: legendOpacity.value,
  }));
  const prevBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: prevBtnScale.value }],
  }));
  const nextBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextBtnScale.value }],
  }));

  const handlePrevMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPreviousMonth();
  }, [onPreviousMonth]);

  const handleNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNextMonth();
  }, [onNextMonth]);

  const handlePrevPressIn = useCallback(() => {
    prevBtnScale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  }, [prevBtnScale]);

  const handlePrevPressOut = useCallback(() => {
    prevBtnScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 350 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );
  }, [prevBtnScale]);

  const handleNextPressIn = useCallback(() => {
    nextBtnScale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
  }, [nextBtnScale]);

  const handleNextPressOut = useCallback(() => {
    nextBtnScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 350 }),
      withSpring(1.0, { damping: 12, stiffness: 300 })
    );
  }, [nextBtnScale]);

  const handleDayPress = useCallback((day: number) => onDayPress?.(day), [onDayPress]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .onEnd((event) => {
          if (event.translationX < -50) {
            runOnJS(handleNextMonth)();
          } else if (event.translationX > 50) {
            runOnJS(handlePrevMonth)();
          }
        }),
    [handleNextMonth, handlePrevMonth]
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container} testID={testID}>
        <Animated.View style={[styles.header, headerEntranceStyle]}>
          <Animated.View style={prevBtnAnimatedStyle}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              onPressIn={handlePrevPressIn}
              onPressOut={handlePrevPressOut}
              style={styles.navButton}
              activeOpacity={1}
              accessibilityLabel={t('calendar.previousMonth')}
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={22} color={theme.colors.paper} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.Text style={styles.monthTitle}>
            {monthLabel} {year}
          </Animated.Text>

          <Animated.View style={nextBtnAnimatedStyle}>
            <TouchableOpacity
              onPress={handleNextMonth}
              onPressIn={handleNextPressIn}
              onPressOut={handleNextPressOut}
              style={styles.navButton}
              activeOpacity={1}
              accessibilityLabel={t('calendar.nextMonth')}
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={22} color={theme.colors.paper} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <View style={styles.goldDivider} />

        <Animated.View style={[styles.weekdayRow, weekdayEntranceStyle]}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={`weekday-${index}`} style={styles.weekdayCell}>
              <Animated.Text style={styles.weekdayText}>{label}</Animated.Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.gridContainer} testID="calendar-grid-container">
          {calendarGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRowWrapper}>
              <Animated.View style={[styles.weekRow, rowEntranceStyles[weekIndex]]}>
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
                      universalDisplay={
                        shiftDay?.universal ? getShiftDisplayModel(shiftDay) : undefined
                      }
                      isToday={isTodayDate}
                      selected={selectedDay === day}
                      activeGlowColor={isTodayDate ? activeGlowColor : undefined}
                      onPress={handleDayPress}
                      testID={`calendar-day-${day}`}
                    />
                  );
                })}
              </Animated.View>
              {lockNonCurrentWeeks &&
                !week.some(
                  (day) =>
                    day !== null &&
                    currentDate.getFullYear() === year &&
                    currentDate.getMonth() === month &&
                    currentDate.getDate() === day
                ) && (
                  <PadlockOverlay
                    onPress={onLockedWeekPress ?? onNextMonth}
                    testID={`calendar-week-${weekIndex}-locked`}
                  />
                )}
            </View>
          ))}
        </View>

        <Animated.View style={[styles.legend, legendEntranceStyle]}>
          {universalLegendItems.length > 0 ? (
            universalLegendItems.map((definition) => (
              <LegendItem
                key={definition.id}
                color={definition.color}
                icon={definition.icon as keyof typeof Ionicons.glyphMap}
                label={definition.name}
              />
            ))
          ) : (
            <>
              <LegendItem
                color="#BBDEFB"
                imageSource={DAY_SHIFT_ICON}
                label={t('calendar.legendDay')}
              />
              <LegendItem
                color="rgba(245, 158, 11, 0.25)"
                imageSource={MORNING_SHIFT_ICON}
                label={t('calendar.legendMorning')}
              />
              <LegendItem
                color="rgba(6, 182, 212, 0.25)"
                imageSource={AFTERNOON_SHIFT_ICON}
                label={t('calendar.legendAfternoon')}
              />
              <LegendItem
                color="#fff"
                imageSource={NIGHT_SHIFT_ICON}
                label={t('calendar.legendNight')}
              />
              <LegendItem
                color="#78716c"
                imageSource={OFF_SHIFT_ICON}
                label={t('calendar.legendOff')}
              />
            </>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

interface LegendItemProps {
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  imageSource?: ReturnType<typeof require>;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, icon, imageSource, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]}>
      {imageSource ? (
        <Image source={imageSource} style={styles.legendImage} />
      ) : icon ? (
        <Ionicons name={icon} size={8} color="#fff" />
      ) : null}
    </View>
    <Animated.Text style={styles.legendText}>{label}</Animated.Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.opacity.gold20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
  goldDivider: {
    height: 1,
    backgroundColor: theme.colors.opacity.gold20,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
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
    position: 'relative',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 2,
    position: 'relative',
  },
  weekRowWrapper: {
    position: 'relative',
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  emptyCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
    }),
  },
  legendText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
  },
  legendImage: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },
});
