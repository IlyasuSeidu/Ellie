/**
 * MonthlyCalendarCard Component
 *
 * Premium interactive monthly calendar with shift visualization.
 * Features staggered entrance animations (header → weekdays → rows → legend),
 * spring-bounce nav buttons, gold accent divider, color-coded shift days,
 * today indicator, dynamic legend, and haptic feedback.
 * FIFO mode adds connected block ribbons, enhanced legend with cycle info,
 * and long-press tooltips.
 * Entrance replays on month navigation for a polished transition.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { theme } from '@/utils/theme';
import { getDaysInMonth, getFirstDayOfMonth, isToday as checkIsToday } from '@/utils/dateUtils';
import { ShiftCalendarDayCell } from './ShiftCalendarDayCell';
import { FIFODayTooltip } from './FIFODayTooltip';
import { RosterType, ShiftSystem, type ShiftDay, type ShiftCycle } from '@/types';
import { normalizeLanguage } from '@/i18n/languageDetector';
import {
  computeFIFOBlockPositions,
  getBlockRunsForRow,
  type FIFOPositionMap,
} from '@/utils/fifoCalendarUtils';

/* eslint-disable @typescript-eslint/no-var-requires */
/** 3D assets for shift types */
const DAY_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png');
const MORNING_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-morning.png');
const AFTERNOON_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png');
const OFF_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png');
const NIGHT_SHIFT_ICON = require('../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png');
/* eslint-enable @typescript-eslint/no-var-requires */

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
  /** Shift system (2-shift or 3-shift) — controls which legend items appear */
  shiftSystem?: ShiftSystem;
  /** Roster paradigm (rotating or FIFO) — controls block-focused rendering */
  rosterType?: RosterType;
  /** Shift cycle configuration — needed for FIFO block position computation */
  shiftCycle?: ShiftCycle;
  /** Glow color override for today's cell (e.g. during overnight carry-over) */
  activeGlowColor?: string;
  /** Animation delay in ms */
  animationDelay?: number;
  /** Test ID */
  testID?: string;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

/** Animated FIFO ribbon — animates width on mount for a left-to-right fill effect */
const AnimatedRibbon: React.FC<{
  ribbonColor: { bg: string; border: string };
  leftPos: number;
  targetWidth: number;
  startsBlock: boolean;
  endsBlock: boolean;
  delay: number;
  testID?: string;
}> = ({ ribbonColor, leftPos, targetWidth, startsBlock, endsBlock, delay, testID }) => {
  const ribbonScale = useSharedValue(0);

  React.useEffect(() => {
    ribbonScale.value = 0;
    ribbonScale.value = withDelay(delay, withSpring(1, { damping: 18, stiffness: 160 }));
  }, [ribbonScale, delay]);

  const ribbonAnimStyle = useAnimatedStyle(() => ({
    width: Math.max(targetWidth * ribbonScale.value, 0),
  }));

  return (
    <Animated.View
      style={[
        ribbonStyles.ribbon,
        {
          left: leftPos,
          backgroundColor: ribbonColor.bg,
          borderColor: ribbonColor.border,
          borderTopLeftRadius: startsBlock ? 8 : 0,
          borderBottomLeftRadius: startsBlock ? 8 : 0,
          borderTopRightRadius: endsBlock ? 8 : 0,
          borderBottomRightRadius: endsBlock ? 8 : 0,
        },
        ribbonAnimStyle,
      ]}
      testID={testID}
    />
  );
};

const ribbonStyles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    top: 3,
    bottom: 5,
    borderWidth: 1,
    zIndex: 0,
  },
});

/** FIFO ribbon color config */
const RIBBON_COLORS = {
  work: {
    bg: 'rgba(33, 150, 243, 0.18)',
    border: 'rgba(33, 150, 243, 0.25)',
  },
  rest: {
    bg: 'rgba(120, 113, 108, 0.12)',
    border: 'rgba(120, 113, 108, 0.18)',
  },
} as const;

/** Small inline component for FIFO legend block preview (3 connected rectangles) */
const FIFOLegendBlockPreview: React.FC<{ type: 'work' | 'rest' }> = ({ type }) => {
  const bg = type === 'work' ? RIBBON_COLORS.work.bg : RIBBON_COLORS.rest.bg;
  const border = type === 'work' ? RIBBON_COLORS.work.border : RIBBON_COLORS.rest.border;
  return (
    <View style={legendPreviewStyles.container}>
      <View style={[legendPreviewStyles.left, { backgroundColor: bg, borderColor: border }]} />
      <View
        style={[
          legendPreviewStyles.middle,
          { backgroundColor: bg, borderTopColor: border, borderBottomColor: border },
        ]}
      />
      <View style={[legendPreviewStyles.right, { backgroundColor: bg, borderColor: border }]} />
    </View>
  );
};

const legendPreviewStyles = StyleSheet.create({
  container: { flexDirection: 'row', marginRight: 6 },
  left: {
    width: 12,
    height: 8,
    borderWidth: 0.5,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderRightWidth: 0,
  },
  middle: {
    width: 12,
    height: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
  },
  right: {
    width: 12,
    height: 8,
    borderWidth: 0.5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    borderLeftWidth: 0,
  },
});

export const MonthlyCalendarCard: React.FC<MonthlyCalendarCardProps> = ({
  year,
  month,
  shiftDays,
  selectedDay,
  onPreviousMonth,
  onNextMonth,
  onDayPress,
  shiftSystem,
  rosterType = RosterType.ROTATING,
  shiftCycle,
  activeGlowColor,
  animationDelay = 200,
  testID,
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);
  const dayjsLocale = useMemo(() => {
    const normalizedLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
    return normalizedLanguage === 'pt-BR' ? 'pt-br' : normalizedLanguage;
  }, [i18n.resolvedLanguage, i18n.language]);
  const monthLabel = useMemo(
    () =>
      dayjs(new Date(year, month, 1))
        .locale(dayjsLocale)
        .format('MMMM'),
    [year, month, dayjsLocale]
  );

  // Create a lookup from day number to ShiftDay
  const shiftDayMap = useMemo(() => {
    const map: Record<number, ShiftDay> = {};
    for (const sd of shiftDays) {
      const dayNum = parseInt(sd.date.split('-')[2], 10);
      map[dayNum] = sd;
    }
    return map;
  }, [shiftDays]);

  // ── FIFO Block Positions ──
  const fifoPositionMap: FIFOPositionMap | null = useMemo(() => {
    if (rosterType !== RosterType.FIFO || !shiftCycle) return null;
    return computeFIFOBlockPositions(year, month, shiftDays, shiftCycle, calendarGrid);
  }, [rosterType, shiftCycle, year, month, shiftDays, calendarGrid]);

  // ── FIFO Tooltip State ──
  const [tooltipDay, setTooltipDay] = useState<number | null>(null);
  const [isTooltipDismissing, setIsTooltipDismissing] = useState(false);
  const tooltipDayRef = useRef<number | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipDismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    tooltipDayRef.current = tooltipDay;
  }, [tooltipDay]);

  const dismissTooltip = useCallback(() => {
    if (tooltipDayRef.current === null) return;
    if (isTooltipDismissing) return;
    setIsTooltipDismissing(true);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    if (tooltipDismissTimeout.current) clearTimeout(tooltipDismissTimeout.current);
    tooltipDismissTimeout.current = setTimeout(() => {
      setTooltipDay(null);
      setIsTooltipDismissing(false);
      tooltipDismissTimeout.current = null;
    }, 200);
  }, [isTooltipDismissing]);

  const handleLongPress = useCallback(
    (day: number) => {
      if (!fifoPositionMap?.[day]) return;
      if (tooltipDismissTimeout.current) {
        clearTimeout(tooltipDismissTimeout.current);
        tooltipDismissTimeout.current = null;
      }
      setIsTooltipDismissing(false);
      setTooltipDay(day);
      // Auto-dismiss after 2500ms
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      tooltipTimeout.current = setTimeout(() => dismissTooltip(), 2500);
    },
    [fifoPositionMap, dismissTooltip]
  );

  // Clean up tooltip timeout
  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
      if (tooltipDismissTimeout.current) clearTimeout(tooltipDismissTimeout.current);
    };
  }, []);

  // Dismiss tooltip on month change
  useEffect(() => {
    setTooltipDay(null);
    setIsTooltipDismissing(false);
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    if (tooltipDismissTimeout.current) {
      clearTimeout(tooltipDismissTimeout.current);
      tooltipDismissTimeout.current = null;
    }
  }, [year, month]);

  const handleDayPress = useCallback(
    (day: number) => {
      dismissTooltip();
      onDayPress?.(day);
    },
    [onDayPress, dismissTooltip]
  );

  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  }, []);

  // ── Staggered Entrance Shared Values (20 total) ──

  // Stage 1: Header
  const headerTranslateY = useSharedValue(10);
  const headerOpacity = useSharedValue(0);

  // Stage 2: Weekday labels
  const weekdayTranslateY = useSharedValue(8);
  const weekdayOpacity = useSharedValue(0);

  // Stage 3: Calendar grid rows (6 max rows, declared individually for hooks rules)
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

  // Stage 4: Legend
  const legendTranslateY = useSharedValue(8);
  const legendOpacity = useSharedValue(0);

  // Nav button tap scale
  const prevBtnScale = useSharedValue(1);
  const nextBtnScale = useSharedValue(1);

  // Collect row shared values into arrays for indexed access
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

  // ── Staggered Entrance Trigger (replays on month change) ──
  useEffect(() => {
    const D = animationDelay;
    const springConfig = { damping: 16, stiffness: 180 };

    // Reset all to initial state
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

    // Stage 1: Header
    headerTranslateY.value = withDelay(D, withSpring(0, springConfig));
    headerOpacity.value = withDelay(D, withTiming(1, { duration: 350 }));

    // Stage 2: Weekday labels
    weekdayTranslateY.value = withDelay(D + 120, withSpring(0, springConfig));
    weekdayOpacity.value = withDelay(D + 120, withTiming(1, { duration: 350 }));

    // Stage 3: Calendar grid rows (staggered at 80ms intervals)
    const rowCount = calendarGrid.length;
    for (let i = 0; i < rowCount; i++) {
      const rowDelay = D + 240 + i * 80;
      rowTranslateYs[i].value = withDelay(rowDelay, withSpring(0, springConfig));
      rowOpacities[i].value = withDelay(rowDelay, withTiming(1, { duration: 300 }));
    }

    // Stage 4: Legend
    const legendDelay = D + 240 + rowCount * 80 + 100;
    legendTranslateY.value = withDelay(legendDelay, withSpring(0, springConfig));
    legendOpacity.value = withDelay(legendDelay, withTiming(1, { duration: 350 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDelay, year, month]);

  // ── Animated Styles ──

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

  // ── Nav Button Handlers ──

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

  // ── Swipe Gesture for Month Navigation ──
  // activeOffsetX: only activate after 30px horizontal movement
  // failOffsetY: fail (let ScrollView handle) if 15px vertical movement happens first
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .onEnd((event) => {
          if (event.translationX < -50) {
            // Swiped left → next month
            runOnJS(handleNextMonth)();
          } else if (event.translationX > 50) {
            // Swiped right → previous month
            runOnJS(handlePrevMonth)();
          }
        }),
    [handleNextMonth, handlePrevMonth]
  );

  // ── Compute per-row cell width for ribbon positioning ──
  // The grid uses `justifyContent: 'space-around'`, so we need actual cell positions.
  // Since all cells are CELL_WIDTH wide and evenly spaced, calculate the gap.
  const cellSpacing = useMemo(() => {
    if (!gridWidth || gridWidth === 0) return { gap: 0, offset: 0 };
    // space-around: gap between cells = (totalWidth - 7 * CELL_WIDTH) / 7
    // and half-gap on each side
    const totalCellWidth = 7 * CELL_WIDTH;
    const totalGap = gridWidth - totalCellWidth;
    const gap = totalGap / 7; // space-around distributes equally
    const offset = gap / 2; // half-gap before first cell
    return { gap, offset };
  }, [gridWidth]);

  // ── Tooltip position computation ──
  const tooltipPosition = useMemo(() => {
    if (tooltipDay === null || !fifoPositionMap) return null;

    // Find which row/col the tooltip day is in
    for (let rowIdx = 0; rowIdx < calendarGrid.length; rowIdx++) {
      const colIdx = calendarGrid[rowIdx].indexOf(tooltipDay);
      if (colIdx !== -1) {
        const cellCenterX =
          cellSpacing.offset + colIdx * (CELL_WIDTH + cellSpacing.gap) + CELL_WIDTH / 2;
        const cellTop = rowIdx * (CELL_HEIGHT + 2); // 2px marginBottom per row
        const showAbove = rowIdx > 0;
        return {
          x: cellCenterX,
          y: showAbove ? cellTop - 4 : cellTop + CELL_HEIGHT + 4,
          showAbove,
        };
      }
    }
    return null;
  }, [tooltipDay, fifoPositionMap, calendarGrid, cellSpacing]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container} testID={testID}>
        {/* Month Navigation Header — with entrance animation */}
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

        {/* Gold accent divider */}
        <View style={styles.goldDivider} />

        {/* Weekday Headers — with entrance animation */}
        <Animated.View style={[styles.weekdayRow, weekdayEntranceStyle]}>
          {WEEKDAY_LABELS.map((label, index) => (
            <View key={`weekday-${index}`} style={styles.weekdayCell}>
              <Animated.Text style={styles.weekdayText}>{label}</Animated.Text>
            </View>
          ))}
        </Animated.View>

        {/* Calendar Grid — row-level staggered entrance */}
        <View
          style={styles.gridContainer}
          onLayout={handleGridLayout}
          testID="calendar-grid-container"
        >
          {tooltipDay !== null && (
            <Pressable
              onPress={dismissTooltip}
              style={styles.tooltipDismissOverlay}
              testID="fifo-tooltip-dismiss-overlay"
            />
          )}
          {calendarGrid.map((week, weekIndex) => (
            <Animated.View
              key={`week-${weekIndex}`}
              style={[styles.weekRow, rowEntranceStyles[weekIndex]]}
            >
              {/* FIFO Connected Block Ribbons (rendered behind cells, animated fill) */}
              {fifoPositionMap && gridWidth > 0 && (
                <>
                  {getBlockRunsForRow(week, fifoPositionMap).map((run, runIdx) => {
                    const ribbonColor = RIBBON_COLORS[run.blockType];
                    const leftPos =
                      cellSpacing.offset + run.startCol * (CELL_WIDTH + cellSpacing.gap) + 2;
                    const ribbonWidth =
                      run.length * (CELL_WIDTH + cellSpacing.gap) - cellSpacing.gap - 4;
                    // Stagger: row delay + 30ms per ribbon within the row
                    const rowDelay = animationDelay + 240 + weekIndex * 80;
                    const ribbonDelay = rowDelay + runIdx * 30;

                    return (
                      <AnimatedRibbon
                        key={`ribbon-${weekIndex}-${runIdx}-${year}-${month}`}
                        ribbonColor={ribbonColor}
                        leftPos={leftPos}
                        targetWidth={Math.max(ribbonWidth, 0)}
                        startsBlock={run.startsBlock}
                        endsBlock={run.endsBlock}
                        delay={ribbonDelay}
                        testID={`fifo-ribbon-${weekIndex}-${runIdx}`}
                      />
                    );
                  })}
                </>
              )}

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
                    rosterType={rosterType}
                    fifoPosition={fifoPositionMap?.[day]}
                    isToday={isTodayDate}
                    selected={selectedDay === day}
                    activeGlowColor={isTodayDate ? activeGlowColor : undefined}
                    onPress={handleDayPress}
                    onLongPress={fifoPositionMap ? handleLongPress : undefined}
                    testID={`calendar-day-${day}`}
                  />
                );
              })}
            </Animated.View>
          ))}

          {/* FIFO Day Tooltip */}
          {tooltipDay !== null && fifoPositionMap?.[tooltipDay] && tooltipPosition && (
            <FIFODayTooltip
              day={tooltipDay}
              position={fifoPositionMap[tooltipDay]}
              x={tooltipPosition.x}
              y={tooltipPosition.y}
              showAbove={tooltipPosition.showAbove}
              isDismissing={isTooltipDismissing}
              onDismiss={dismissTooltip}
            />
          )}
        </View>

        {/* Legend — filtered by shift system, with entrance animation */}
        <Animated.View style={[styles.legend, legendEntranceStyle]}>
          {rosterType === RosterType.FIFO ? (
            <>
              {/* Connected block previews for FIFO legend */}
              <View style={styles.legendItem}>
                <FIFOLegendBlockPreview type="work" />
                <Animated.Text style={styles.legendText}>
                  {t('calendar.legendWorkBlock')}
                </Animated.Text>
              </View>
              <View style={styles.legendItem}>
                <FIFOLegendBlockPreview type="rest" />
                <Animated.Text style={styles.legendText}>
                  {t('calendar.legendRestBlock')}
                </Animated.Text>
              </View>
              {/* Cycle info label */}
              {shiftCycle?.fifoConfig && (
                <View style={styles.legendItem}>
                  <View style={styles.cycleBadge}>
                    <Animated.Text style={styles.cycleBadgeText}>
                      {shiftCycle.fifoConfig.workBlockDays}/{shiftCycle.fifoConfig.restBlockDays}
                    </Animated.Text>
                  </View>
                  <Animated.Text style={styles.legendText}>{t('calendar.cycle')}</Animated.Text>
                </View>
              )}
            </>
          ) : (
            <>
              {shiftSystem !== ShiftSystem.THREE_SHIFT && (
                <LegendItem
                  color="#BBDEFB"
                  imageSource={DAY_SHIFT_ICON}
                  label={t('calendar.legendDay')}
                />
              )}
              {shiftSystem !== ShiftSystem.TWO_SHIFT && (
                <>
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
                </>
              )}
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

const CELL_WIDTH = 44;
const CELL_HEIGHT = 72;

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
      android: {
        elevation: 8,
      },
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
  tooltipDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 2,
    position: 'relative',
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
  cycleBadge: {
    backgroundColor: theme.colors.softStone,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  cycleBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
});
