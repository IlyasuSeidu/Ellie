/**
 * MainDashboardScreen
 *
 * Main screen orchestrator for the dashboard.
 * Fetches onboarding data from AsyncStorage, builds shift cycle,
 * computes current shift, monthly data, statistics, and upcoming shifts.
 * Orchestrates staggered entrance animations for all child components.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { asyncStorageService } from '@/services/AsyncStorageService';
import {
  calculateShiftDay,
  getShiftDaysInRange,
  getShiftStatistics,
  getShiftPattern,
} from '@/utils/shiftUtils';
import { getToday, addDays, toDateString, formatDate, getDaysInMonth } from '@/utils/dateUtils';
import { formatTimeForDisplay, getShiftTimesFromData } from '@/utils/shiftTimeUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem, type ShiftCycle, type ShiftType } from '@/types';
import type { MonthStatistics, UpcomingShift } from '@/types/dashboard';

// Dashboard components
import { PersonalizedHeader } from '@/components/dashboard/PersonalizedHeader';
import { CurrentShiftStatusCard } from '@/components/dashboard/CurrentShiftStatusCard';
import { MonthlyCalendarCard } from '@/components/dashboard/MonthlyCalendarCard';
import { StatisticsRow } from '@/components/dashboard/StatisticsCard';
import { UpcomingShiftsCard } from '@/components/dashboard/UpcomingShiftsCard';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';

/**
 * Build a ShiftCycle from onboarding data
 */
function buildShiftCycle(data: OnboardingData): ShiftCycle | null {
  if (!data.patternType || !data.startDate) return null;

  const startDateStr = toDateString(
    typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
  );

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    return {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: data.shiftSystem === '3-shift' ? ShiftSystem.THREE_SHIFT : ShiftSystem.TWO_SHIFT,
      daysOn: data.customPattern.daysOn,
      nightsOn: data.customPattern.nightsOn,
      morningOn: data.customPattern.morningOn,
      afternoonOn: data.customPattern.afternoonOn,
      nightOn: data.customPattern.nightOn,
      daysOff: data.customPattern.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  // Standard pattern
  const pattern = getShiftPattern(data.patternType);
  const config = pattern.config;

  const shiftSystem =
    data.shiftSystem === '3-shift' ? ShiftSystem.THREE_SHIFT : ShiftSystem.TWO_SHIFT;

  const daysOn = config.daysOn ?? 0;
  const nightsOn = config.nightsOn ?? 0;

  // For 3-shift standard patterns, distribute evenly
  if (shiftSystem === ShiftSystem.THREE_SHIFT) {
    const totalWork = daysOn + nightsOn;
    const perPhase = Math.ceil(totalWork / 3);
    return {
      patternType: data.patternType,
      shiftSystem,
      daysOn,
      nightsOn,
      morningOn: perPhase,
      afternoonOn: perPhase,
      nightOn: totalWork - perPhase * 2 > 0 ? totalWork - perPhase * 2 : perPhase,
      daysOff: config.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  return {
    patternType: data.patternType,
    shiftSystem,
    daysOn,
    nightsOn,
    daysOff: config.daysOff,
    startDate: startDateStr,
    phaseOffset: data.phaseOffset || 0,
  };
}

/**
 * Calculate monthly statistics
 */
function calculateMonthStats(year: number, month: number, cycle: ShiftCycle): MonthStatistics {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const stats = getShiftStatistics(firstDay, lastDay, cycle);
  const totalDays = getDaysInMonth(year, month + 1);

  return {
    workDays: stats.dayShifts + stats.nightShifts,
    offDays: stats.daysOff,
    totalDays,
    dayShifts: stats.dayShifts,
    nightShifts: stats.nightShifts,
    workLifeBalance: totalDays > 0 ? (stats.daysOff / totalDays) * 100 : 0,
  };
}

/**
 * Get next N upcoming shift changes (work days only)
 */
function getUpcomingShifts(
  cycle: ShiftCycle,
  shiftTimesData: OnboardingData | null,
  count: number = 5
): UpcomingShift[] {
  const upcoming: UpcomingShift[] = [];
  const today = getToday();
  let checkDate = addDays(today, 1);
  let checked = 0;

  const shiftTimes = shiftTimesData ? getShiftTimesFromData(shiftTimesData) : [];

  while (upcoming.length < count && checked < 60) {
    const shiftDay = calculateShiftDay(checkDate, cycle);

    // Get time display for this shift type
    const matchingTime = shiftTimes.find((st) => st.type === shiftDay.shiftType);
    const timeDisplay = matchingTime
      ? `${formatTimeForDisplay(matchingTime.startTime)} - ${formatTimeForDisplay(matchingTime.endTime)}`
      : undefined;

    upcoming.push({
      date: shiftDay.date,
      shiftType: shiftDay.shiftType,
      isWorkDay: shiftDay.isWorkDay,
      displayDate: formatDate(checkDate, 'ddd, MMM D'),
      timeDisplay: shiftDay.isWorkDay ? timeDisplay : undefined,
    });

    checkDate = addDays(checkDate, 1);
    checked++;
  }

  return upcoming;
}

/**
 * Get time display string for current shift
 */
function getCurrentShiftTimeDisplay(shiftType: ShiftType, data: OnboardingData): string {
  const shiftTimes = getShiftTimesFromData(data);
  const matching = shiftTimes.find((st) => st.type === shiftType);
  if (matching) {
    return `${formatTimeForDisplay(matching.startTime)} - ${formatTimeForDisplay(matching.endTime)}`;
  }
  return '';
}

/**
 * Calculate countdown text to next shift change
 */
function getCountdownText(currentShiftType: ShiftType, cycle: ShiftCycle): string {
  const today = getToday();
  let nextDate = addDays(today, 1);
  let daysUntil = 1;

  // Find next day with a different shift type
  while (daysUntil < 30) {
    const nextShift = calculateShiftDay(nextDate, cycle);
    if (nextShift.shiftType !== currentShiftType) {
      if (daysUntil === 1) return 'Tomorrow';
      return `${daysUntil} days until ${nextShift.isWorkDay ? 'next shift' : 'day off'}`;
    }
    nextDate = addDays(nextDate, 1);
    daysUntil++;
  }

  return '';
}

export const MainDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);

  /**
   * Load onboarding data from AsyncStorage
   */
  const loadData = useCallback(async () => {
    try {
      const savedData = await asyncStorageService.get<string>('onboarding:data');
      if (savedData) {
        const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        setUserData(parsed);
      }
    } catch (error) {
      console.warn('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Build shift cycle from user data
  const shiftCycle = useMemo(() => (userData ? buildShiftCycle(userData) : null), [userData]);

  // Today's shift
  const todayShift = useMemo(
    () => (shiftCycle ? calculateShiftDay(getToday(), shiftCycle) : null),
    [shiftCycle]
  );

  // Current month shift days
  const monthShifts = useMemo(() => {
    if (!shiftCycle) return [];
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return getShiftDaysInRange(firstDay, lastDay, shiftCycle);
  }, [shiftCycle, currentMonth]);

  // Monthly statistics
  const monthStats = useMemo(() => {
    if (!shiftCycle) return null;
    const { year, month } = currentMonth;
    return calculateMonthStats(year, month, shiftCycle);
  }, [shiftCycle, currentMonth]);

  // Upcoming shifts
  const upcomingShifts = useMemo(
    () => (shiftCycle ? getUpcomingShifts(shiftCycle, userData, 5) : []),
    [shiftCycle, userData]
  );

  // Current shift time display
  const timeDisplay = useMemo(
    () =>
      todayShift && userData ? getCurrentShiftTimeDisplay(todayShift.shiftType, userData) : '',
    [todayShift, userData]
  );

  // Countdown text
  const countdown = useMemo(
    () => (todayShift && shiftCycle ? getCountdownText(todayShift.shiftType, shiftCycle) : ''),
    [todayShift, shiftCycle]
  );

  // Month navigation
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newMonth = prev.month - 1;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: newMonth };
    });
    setSelectedDay(undefined);
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      const newMonth = prev.month + 1;
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: newMonth };
    });
    setSelectedDay(undefined);
  }, []);

  const handleDayPress = useCallback((day: number) => {
    setSelectedDay((prev) => (prev === day ? undefined : day));
  }, []);

  const handleActionPress = useCallback((_key: string) => {
    // Placeholder for future navigation
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  // No data state
  if (!userData || !shiftCycle || !todayShift || !monthStats) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Animated.Text style={styles.errorText}>Unable to load shift data</Animated.Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.deepVoid, theme.colors.darkStone, theme.colors.deepVoid]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={[styles.scrollView, { paddingTop: insets.top }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.sacredGold}
            colors={[theme.colors.sacredGold]}
          />
        }
      >
        {/* Personalized Header */}
        <PersonalizedHeader
          name={userData.name || 'User'}
          occupation={userData.occupation}
          animationDelay={0}
          testID="dashboard-header"
        />

        {/* Current Shift Status Card (HERO) */}
        <CurrentShiftStatusCard
          shiftType={todayShift.shiftType}
          timeDisplay={timeDisplay || undefined}
          countdown={countdown || undefined}
          isOnShift={todayShift.isWorkDay}
          animationDelay={100}
          testID="dashboard-shift-status"
        />

        {/* Monthly Calendar */}
        <MonthlyCalendarCard
          year={currentMonth.year}
          month={currentMonth.month}
          shiftDays={monthShifts}
          selectedDay={selectedDay}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onDayPress={handleDayPress}
          animationDelay={200}
          testID="dashboard-calendar"
        />

        {/* Statistics Row */}
        <StatisticsRow
          workDays={monthStats.workDays}
          offDays={monthStats.offDays}
          workLifeBalance={monthStats.workLifeBalance}
          animationDelay={300}
          testID="dashboard-stats"
        />

        {/* Upcoming Shifts */}
        <UpcomingShiftsCard
          shifts={upcomingShifts}
          animationDelay={500}
          testID="dashboard-upcoming"
        />

        {/* Quick Actions */}
        <QuickActionsBar
          onActionPress={handleActionPress}
          animationDelay={600}
          testID="dashboard-actions"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
  },
});
