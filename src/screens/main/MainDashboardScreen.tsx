/**
 * MainDashboardScreen
 *
 * Main screen orchestrator for the dashboard.
 * Fetches onboarding data from AsyncStorage, builds shift cycle,
 * computes current shift, monthly data, statistics, and upcoming shifts.
 * Orchestrates staggered entrance animations for all child components.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { getShiftDaysInRange, getShiftStatistics, getShiftPattern } from '@/utils/shiftUtils';
import { toDateString, getDaysInMonth } from '@/utils/dateUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem, type ShiftCycle } from '@/types';
import { useActiveShift } from '@/hooks/useActiveShift';
import type { MonthStatistics } from '@/types/dashboard';

// Dashboard components
import { PersonalizedHeader } from '@/components/dashboard/PersonalizedHeader';
import { CurrentShiftStatusCard } from '@/components/dashboard/CurrentShiftStatusCard';
import { MonthlyCalendarCard } from '@/components/dashboard/MonthlyCalendarCard';
import { StatisticsRow } from '@/components/dashboard/StatisticsCard';

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

  // If pattern already has 3-shift fields (e.g. Continental), use them directly
  if (
    config.morningOn !== undefined ||
    config.afternoonOn !== undefined ||
    config.nightOn !== undefined
  ) {
    return {
      patternType: data.patternType,
      shiftSystem: ShiftSystem.THREE_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      morningOn: config.morningOn ?? 0,
      afternoonOn: config.afternoonOn ?? 0,
      nightOn: config.nightOn ?? 0,
      daysOff: config.daysOff,
      startDate: startDateStr,
      phaseOffset: data.phaseOffset || 0,
    };
  }

  const daysOn = config.daysOn ?? 0;
  const nightsOn = config.nightsOn ?? 0;

  // For 2-shift patterns selected with 3-shift system, convert:
  // morningOn = daysOn, afternoonOn = daysOn, nightOn = nightsOn
  if (shiftSystem === ShiftSystem.THREE_SHIFT) {
    return {
      patternType: data.patternType,
      shiftSystem,
      daysOn: 0,
      nightsOn: 0,
      morningOn: daysOn,
      afternoonOn: daysOn,
      nightOn: nightsOn,
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
    workDays: stats.dayShifts + stats.nightShifts + stats.morningShifts + stats.afternoonShifts,
    offDays: stats.daysOff,
    totalDays,
    dayShifts: stats.dayShifts + stats.morningShifts + stats.afternoonShifts,
    nightShifts: stats.nightShifts,
    workLifeBalance: totalDays > 0 ? (stats.daysOff / totalDays) * 100 : 0,
  };
}

/** Glow colors per shift type — used for overnight carry-over on the calendar */
const SHIFT_GLOW_COLORS: Record<string, string> = {
  day: '#64B5F6',
  night: '#B388FF',
  morning: '#FCD34D',
  afternoon: '#67E8F9',
};

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

  // Refresh animation state
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedTick, setLastUpdatedTick] = useState(0);
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const refreshSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdatedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh success animation values
  const successBannerOpacity = useSharedValue(0);
  const successBannerTranslateY = useSharedValue(-40);
  const successIconScale = useSharedValue(0);

  const successBannerStyle = useAnimatedStyle(() => ({
    opacity: successBannerOpacity.value,
    transform: [{ translateY: successBannerTranslateY.value }],
  }));

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successIconScale.value }],
  }));

  /**
   * Load onboarding data from AsyncStorage
   */
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      // asyncStorageService.get() auto-deserializes JSON, returns object directly
      const savedData = await asyncStorageService.get<OnboardingData>('onboarding:data');
      if (savedData && typeof savedData === 'object') {
        setUserData(savedData);
      }

      if (isRefresh) {
        // Update timestamp
        setLastUpdated(new Date());

        // Trigger re-entrance animations by incrementing key
        setRefreshKey((prev) => prev + 1);

        // Show success feedback
        triggerRefreshSuccess();

        // Success haptic
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.warn('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Trigger the refresh success animation sequence
   */
  const triggerRefreshSuccess = useCallback(() => {
    setShowRefreshSuccess(true);

    // Animate banner in
    successBannerOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
    successBannerTranslateY.value = withSpring(0, { damping: 14, stiffness: 160 });

    // Animate checkmark icon with bounce
    successIconScale.value = withDelay(
      100,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      )
    );

    // Auto-dismiss after 2 seconds
    if (refreshSuccessTimeout.current) {
      clearTimeout(refreshSuccessTimeout.current);
    }
    refreshSuccessTimeout.current = setTimeout(() => {
      successBannerOpacity.value = withTiming(0, { duration: 300 });
      successBannerTranslateY.value = withTiming(-40, { duration: 300 });
      setTimeout(() => setShowRefreshSuccess(false), 350);
    }, 2000);
  }, [successBannerOpacity, successBannerTranslateY, successIconScale]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshSuccessTimeout.current) {
        clearTimeout(refreshSuccessTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadData(true);
  }, [loadData]);

  /**
   * Live-updating "last updated" timer
   * Ticks every 10s for the first minute, then every 60s after
   */
  useEffect(() => {
    if (lastUpdatedTimerRef.current) clearInterval(lastUpdatedTimerRef.current);

    if (lastUpdated) {
      lastUpdatedTimerRef.current = setInterval(() => {
        const diffSec = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        setLastUpdatedTick((t) => t + 1);
        // Switch to 60s interval once past the first minute
        if (diffSec >= 60 && lastUpdatedTimerRef.current) {
          clearInterval(lastUpdatedTimerRef.current);
          lastUpdatedTimerRef.current = setInterval(() => {
            setLastUpdatedTick((t) => t + 1);
          }, 60000);
        }
      }, 10000);
    }

    return () => {
      if (lastUpdatedTimerRef.current) clearInterval(lastUpdatedTimerRef.current);
    };
  }, [lastUpdated]);

  /**
   * Format last updated time for display
   */
  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return null;
    // lastUpdatedTick forces re-computation
    void lastUpdatedTick;
    const diffMs = Date.now() - lastUpdated.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastUpdated, lastUpdatedTick]);

  // Live tick: updates every 60s for active shift + countdown, detects day
  // change at midnight so calendar "today" highlight and stats refresh.
  const [liveTick, setLiveTick] = useState(0);
  const [currentDateStr, setCurrentDateStr] = useState(() => toDateString(new Date()));
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((t) => t + 1);
      const nowStr = toDateString(new Date());
      setCurrentDateStr((prev) => {
        if (prev !== nowStr) {
          // Day changed — also switch calendar to new month if needed
          const now = new Date();
          setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
        }
        return nowStr;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Build shift cycle from user data
  const shiftCycle = useMemo(() => (userData ? buildShiftCycle(userData) : null), [userData]);

  // Active shift: time-aware status with overnight carry-over support
  const activeShift = useActiveShift(shiftCycle, userData, liveTick, currentDateStr);

  // Current month shift days (recalculates on day change for today highlight)
  const monthShifts = useMemo(() => {
    if (!shiftCycle) return [];
    void currentDateStr; // recalc on day change for today indicator
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return getShiftDaysInRange(firstDay, lastDay, shiftCycle);
  }, [shiftCycle, currentMonth, currentDateStr]);

  // Monthly statistics (recalculates on day change)
  const monthStats = useMemo(() => {
    if (!shiftCycle) return null;
    void currentDateStr;
    const { year, month } = currentMonth;
    return calculateMonthStats(year, month, shiftCycle);
  }, [shiftCycle, currentMonth, currentDateStr]);

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

  // Avatar change handler — persists new URI to AsyncStorage
  const handleAvatarChange = useCallback(
    async (newUri: string | null) => {
      if (!userData) return;
      const updatedData = { ...userData, avatarUri: newUri ?? undefined };
      setUserData(updatedData);
      try {
        await asyncStorageService.set('onboarding:data', updatedData);
      } catch (error) {
        console.warn('Failed to save avatar URI:', error);
      }
    },
    [userData]
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  // No data state
  if (!userData || !shiftCycle || !activeShift || !monthStats) {
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

      {/* Refresh Success Banner */}
      {showRefreshSuccess && (
        <Animated.View
          style={[styles.refreshSuccessBanner, { top: insets.top + 8 }, successBannerStyle]}
        >
          <View style={styles.refreshSuccessContent}>
            <Animated.View style={successIconStyle}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            </Animated.View>
            <Text style={styles.refreshSuccessText}>Schedule updated</Text>
          </View>
        </Animated.View>
      )}

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
            progressBackgroundColor={theme.colors.darkStone}
            title={refreshing ? 'Refreshing schedule...' : 'Pull to refresh'}
            titleColor={theme.colors.dust}
          />
        }
      >
        {/* Last Updated Indicator */}
        {lastUpdatedText && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.lastUpdatedContainer}
          >
            <Ionicons name="time-outline" size={12} color={theme.colors.shadow} />
            <Text style={styles.lastUpdatedText}>Updated {lastUpdatedText}</Text>
          </Animated.View>
        )}

        {/* Personalized Header - keyed for re-entrance animation */}
        <PersonalizedHeader
          key={`header-${refreshKey}`}
          name={userData.name || 'User'}
          occupation={userData.occupation}
          avatarUri={userData.avatarUri}
          onAvatarChange={handleAvatarChange}
          animationDelay={0}
          liveTick={liveTick}
          testID="dashboard-header"
        />

        {/* Current Shift Status Card (HERO) */}
        <CurrentShiftStatusCard
          key={`status-${refreshKey}`}
          shiftType={activeShift.shiftType}
          timeDisplay={activeShift.timeDisplay || undefined}
          countdown={activeShift.countdown || undefined}
          isOnShift={activeShift.isOnShift}
          animationDelay={100}
          testID="dashboard-shift-status"
        />

        {/* Monthly Calendar */}
        <MonthlyCalendarCard
          key={`calendar-${refreshKey}`}
          year={currentMonth.year}
          month={currentMonth.month}
          shiftDays={monthShifts}
          selectedDay={selectedDay}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onDayPress={handleDayPress}
          shiftSystem={shiftCycle?.shiftSystem}
          activeGlowColor={
            activeShift?.isOvernightCarryOver ? SHIFT_GLOW_COLORS[activeShift.shiftType] : undefined
          }
          animationDelay={200}
          testID="dashboard-calendar"
        />

        {/* Statistics Row */}
        <StatisticsRow
          key={`stats-${refreshKey}`}
          workDays={monthStats.workDays}
          offDays={monthStats.offDays}
          workLifeBalance={monthStats.workLifeBalance}
          animationDelay={300}
          testID="dashboard-stats"
        />

        {/* Quick Actions */}
        <QuickActionsBar
          key={`actions-${refreshKey}`}
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
  // Refresh Success Banner
  refreshSuccessBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  refreshSuccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.success,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshSuccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
  // Last Updated Indicator
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: theme.colors.shadow,
  },
});
