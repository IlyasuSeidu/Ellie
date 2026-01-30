/**
 * PremiumStartDateScreen Component
 *
 * Start date and phase selection screen with interactive calendar (Step 5 of 10)
 * Features cascade entrance animations, floating effects, and celebration micro-interactions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ShiftPattern } from '@/types';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

// Color Palette
const COLORS = {
  sacredGold: '#B45309',
  brightGold: '#D97706',
  paleGold: '#F59E0B',
  deepVoid: '#0C0A09',
  darkStone: '#1C1917',
  softStone: '#292524',
  lightStone: '#78716C',
  warmStone: '#A8A29E',
  paper: '#E7E5E4',
  dayShift: '#2196F3',
  nightShift: '#651FFF',
  daysOff: '#FF9800',
  success: '#10B981',
} as const;

// Spring Configurations
const SPRING_CONFIGS = {
  fast: { damping: 25, stiffness: 300, mass: 0.5 },
  bouncy: { damping: 20, stiffness: 400, mass: 0.8 },
  smooth: { damping: 30, stiffness: 300, mass: 1 },
} as const;

// Haptic Patterns
const HAPTIC_PATTERNS = {
  LIGHT: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  MEDIUM: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  SUCCESS: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  ERROR: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
} as const;

// Rotating Tips
const TIPS = [
  '💡 Choose tomorrow if starting a new roster',
  "💡 Select today's date if already mid-cycle",
  '💡 Your calendar will sync from this date forward',
] as const;

// TypeScript Interfaces
interface PatternSummaryCardProps {
  pattern: ShiftPattern;
  customPattern: { daysOn: number; nightsOn: number; daysOff: number };
  reducedMotion: boolean;
  patternIcon?: ImageSourcePropType;
}

interface CalendarProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  reducedMotion: boolean;
  customPattern: { daysOn: number; nightsOn: number; daysOff: number };
  phaseOffset: number;
}

interface PhaseSelectorProps {
  selectedPhase: 'day' | 'night' | 'off' | null;
  onPhaseSelect: (phase: 'day' | 'night' | 'off') => void;
  pattern: { daysOn: number; nightsOn: number; daysOff: number };
  reducedMotion: boolean;
}

interface SelectedDateCardProps {
  selectedDate: string | null;
  reducedMotion: boolean;
}

interface LivePreviewCardProps {
  selectedDate: string | null;
  selectedPhase: 'day' | 'night' | 'off' | null;
  reducedMotion: boolean;
  customPattern: { daysOn: number; nightsOn: number; daysOff: number };
  phaseOffset: number;
}

// Helper Functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const isDateValid = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);

  return date >= today && date <= maxDate;
};

const calculatePhaseOffset = (
  phase: 'day' | 'night' | 'off',
  pattern: { daysOn: number; nightsOn: number; daysOff: number }
): number => {
  switch (phase) {
    case 'day':
      return 0;
    case 'night':
      return pattern.daysOn;
    case 'off':
      return pattern.daysOn + pattern.nightsOn;
    default:
      return 0;
  }
};

const getPhaseColor = (phase: 'day' | 'night' | 'off'): string => {
  switch (phase) {
    case 'day':
      return COLORS.dayShift;
    case 'night':
      return COLORS.nightShift;
    case 'off':
      return COLORS.daysOff;
    default:
      return COLORS.dayShift;
  }
};

const getPhaseEmoji = (phase: 'day' | 'night' | 'off'): string => {
  switch (phase) {
    case 'day':
      return '☀️';
    case 'night':
      return '🌙';
    case 'off':
      return '🏖️';
    default:
      return '☀️';
  }
};

// Calculate which shift type for a given date
const getShiftTypeForDate = (
  date: Date,
  startDate: Date,
  phaseOffset: number,
  pattern: { daysOn: number; nightsOn: number; daysOff: number }
): 'day' | 'night' | 'off' | null => {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return null; // Before start date

  const cycleLength = pattern.daysOn + pattern.nightsOn + pattern.daysOff;
  if (cycleLength === 0) return null;

  const positionInCycle = (daysDiff + phaseOffset) % cycleLength;

  if (positionInCycle < pattern.daysOn) {
    return 'day';
  } else if (positionInCycle < pattern.daysOn + pattern.nightsOn) {
    return 'night';
  }
  return 'off';
};

// Get pattern icon
const getPatternIcon = (patternType: ShiftPattern): ImageSourcePropType | undefined => {
  try {
    switch (patternType) {
      case ShiftPattern.STANDARD_4_4_4:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-4-4-4.png');
      case ShiftPattern.STANDARD_7_7_7:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-7-7-7.png');
      case ShiftPattern.STANDARD_2_2_3:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-2-2-3.png');
      case ShiftPattern.STANDARD_5_5_5:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-5-5-5.png');
      case ShiftPattern.STANDARD_3_3_3:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-3-3-3.png');
      case ShiftPattern.STANDARD_10_10_10:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-10-10-10.png');
      case ShiftPattern.CONTINENTAL:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-continental.png');
      case ShiftPattern.PITMAN:
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-pitman.png');
      case ShiftPattern.CUSTOM:
        return require('../../../../assets/onboarding/icons/consolidated/custom-pattern-builder-hero.png');
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
};

// Get tomorrow's date as default
const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString().split('T')[0];
};

// Pattern Summary Card Component
const PatternSummaryCard: React.FC<PatternSummaryCardProps> = ({
  pattern,
  customPattern,
  reducedMotion,
  patternIcon,
}) => {
  const floatY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(-50);

  useEffect(() => {
    // Entrance animation
    opacity.value = withTiming(1, { duration: 400 });
    slideY.value = withSpring(0, SPRING_CONFIGS.bouncy);

    // Idle floating animation
    if (!reducedMotion) {
      floatY.value = withRepeat(
        withSequence(withTiming(-2, { duration: 2000 }), withTiming(2, { duration: 2000 })),
        -1,
        true
      );
    }
  }, [reducedMotion, floatY, opacity, slideY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value + floatY.value }],
  }));

  const patternName = pattern === ShiftPattern.CUSTOM ? 'Custom Pattern' : pattern;

  // Timeline track - max 6 blocks per type with "+N more" indicator
  const renderTimelineTrack = () => {
    const MAX_BLOCKS = 6;
    const dayBlocks = Math.min(customPattern.daysOn, MAX_BLOCKS);
    const nightBlocks = Math.min(customPattern.nightsOn, MAX_BLOCKS);
    const offBlocks = Math.min(customPattern.daysOff, MAX_BLOCKS);

    const extraDays = Math.max(0, customPattern.daysOn - MAX_BLOCKS);
    const extraNights = Math.max(0, customPattern.nightsOn - MAX_BLOCKS);
    const extraOffs = Math.max(0, customPattern.daysOff - MAX_BLOCKS);

    return (
      <View style={styles.timelineTrack}>
        {/* Day blocks */}
        {Array(dayBlocks)
          .fill(null)
          .map((_, i) => (
            <View
              key={`day-${i}`}
              style={[styles.timelineBlock, { backgroundColor: COLORS.dayShift }]}
            />
          ))}
        {extraDays > 0 && <Text style={styles.timelineExtra}>+{extraDays}</Text>}

        {/* Night blocks */}
        {Array(nightBlocks)
          .fill(null)
          .map((_, i) => (
            <View
              key={`night-${i}`}
              style={[styles.timelineBlock, { backgroundColor: COLORS.nightShift }]}
            />
          ))}
        {extraNights > 0 && <Text style={styles.timelineExtra}>+{extraNights}</Text>}

        {/* Off blocks */}
        {Array(offBlocks)
          .fill(null)
          .map((_, i) => (
            <View
              key={`off-${i}`}
              style={[styles.timelineBlock, { backgroundColor: COLORS.daysOff }]}
            />
          ))}
        {extraOffs > 0 && <Text style={styles.timelineExtra}>+{extraOffs}</Text>}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.patternCard, animatedStyle]}>
      <LinearGradient colors={[COLORS.softStone, COLORS.darkStone]} style={styles.patternGradient}>
        <Text style={styles.patternCardTitle}>Your Shift Pattern</Text>

        {/* Pattern icon - either loaded image or fallback */}
        <View style={styles.patternIconContainer}>
          {patternIcon ? (
            <Image source={patternIcon} style={styles.patternIcon} resizeMode="contain" />
          ) : (
            <Ionicons name="calendar" size={64} color={COLORS.paleGold} />
          )}
        </View>

        <Text style={styles.patternName}>{patternName}</Text>

        {customPattern && (
          <>
            {/* Cycle items with icons */}
            <View style={styles.cycleItems}>
              {customPattern.daysOn > 0 && (
                <View style={styles.cycleItem}>
                  <View style={[styles.cycleIconCircle, { backgroundColor: COLORS.dayShift }]}>
                    <Text style={styles.cycleIconEmoji}>☀️</Text>
                  </View>
                  <Text style={styles.cycleItemText}>{customPattern.daysOn} day shifts</Text>
                </View>
              )}
              {customPattern.nightsOn > 0 && (
                <View style={styles.cycleItem}>
                  <View style={[styles.cycleIconCircle, { backgroundColor: COLORS.nightShift }]}>
                    <Text style={styles.cycleIconEmoji}>🌙</Text>
                  </View>
                  <Text style={styles.cycleItemText}>{customPattern.nightsOn} night shifts</Text>
                </View>
              )}
              {customPattern.daysOff > 0 && (
                <View style={styles.cycleItem}>
                  <View style={[styles.cycleIconCircle, { backgroundColor: COLORS.daysOff }]}>
                    <Text style={styles.cycleIconEmoji}>🏠</Text>
                  </View>
                  <Text style={styles.cycleItemText}>{customPattern.daysOff} days off</Text>
                </View>
              )}
            </View>

            {/* Timeline Track */}
            {renderTimelineTrack()}

            {/* Start date prompt */}
            <View style={styles.startDatePrompt}>
              <Text style={styles.startDatePromptIcon}>🚩</Text>
              <Text style={styles.startDatePromptText}>Set your start date below</Text>
            </View>
          </>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

// Interactive Calendar Component
const InteractiveCalendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  reducedMotion: _reducedMotion,
  customPattern,
  phaseOffset,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(50);
  const translateX = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    slideY.value = withDelay(200, withSpring(0, SPRING_CONFIGS.bouncy));
  }, [opacity, slideY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }, { translateX: translateX.value }],
  }));

  const goToPreviousMonth = useCallback(() => {
    HAPTIC_PATTERNS.LIGHT();
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    HAPTIC_PATTERNS.LIGHT();
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (isDateValid(date)) {
        HAPTIC_PATTERNS.MEDIUM();
        onDateSelect(date.toISOString().split('T')[0]);
      } else {
        HAPTIC_PATTERNS.ERROR();
      }
    },
    [onDateSelect]
  );

  // Swipe gesture for month navigation
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -50) {
        runOnJS(goToNextMonth)();
      } else if (event.translationX > 50) {
        runOnJS(goToPreviousMonth)();
      }
      translateX.value = withSpring(0);
    });

  // Generate calendar days
  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const monthDays: Date[] = [];

    // Add previous month's trailing days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const date = new Date(year, month, -startingDayOfWeek + i + 1);
      monthDays.push(date);
    }

    // Add current month's days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      monthDays.push(new Date(year, month, i));
    }

    return monthDays;
  }, [currentMonth]);

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Animated.View style={[styles.calendarContainer, animatedStyle]}>
      {/* Month Header */}
      <View style={styles.calendarHeader}>
        <Pressable onPress={goToPreviousMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={24} color={COLORS.paleGold} />
        </Pressable>

        <Text style={styles.monthName}>{monthName}</Text>

        <Pressable onPress={goToNextMonth} style={styles.monthArrow}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.paleGold} />
        </Pressable>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdayRow}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={styles.weekdayLabel}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid with Gesture */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.calendarGrid}>
          {days.map((date, index) => {
            const dateString = date.toISOString().split('T')[0];
            const isSelected = selectedDate === dateString;
            const isToday =
              date.toDateString() === new Date().toDateString() &&
              date.getMonth() === currentMonth.getMonth();
            const isValid = isDateValid(date);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

            // Calculate shift type for this date if selected date exists
            let shiftType: 'day' | 'night' | 'off' | null = null;
            if (selectedDate && isValid && isCurrentMonth) {
              const startDate = new Date(selectedDate);
              shiftType = getShiftTypeForDate(date, startDate, phaseOffset, customPattern);
            }

            return (
              <Pressable
                key={index}
                onPress={() => handleDateSelect(date)}
                disabled={!isValid}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && styles.dayCellToday,
                  !isValid && styles.dayCellDisabled,
                  !isCurrentMonth && styles.dayCellOtherMonth,
                ]}
              >
                {/* Shift icon above date */}
                {shiftType && (
                  <Text
                    style={[
                      styles.shiftIcon,
                      {
                        color:
                          shiftType === 'day'
                            ? COLORS.dayShift
                            : shiftType === 'night'
                              ? COLORS.nightShift
                              : COLORS.daysOff,
                      },
                    ]}
                  >
                    {shiftType === 'day' ? '☀️' : shiftType === 'night' ? '🌙' : '🏠'}
                  </Text>
                )}

                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    !isValid && styles.dayTextDisabled,
                    !isCurrentMonth && styles.dayTextOtherMonth,
                    shiftType && styles.dayTextWithIcon,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>

      {/* Calendar Legend */}
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <Text style={[styles.legendIcon, { color: COLORS.dayShift }]}>☀️</Text>
          <Text style={styles.legendText}>Day Shift</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendIcon, { color: COLORS.nightShift }]}>🌙</Text>
          <Text style={styles.legendText}>Night Shift</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendIcon, { color: COLORS.daysOff }]}>🏠</Text>
          <Text style={styles.legendText}>Day Off</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Selected Date Display Card Component
const SelectedDateCard: React.FC<SelectedDateCardProps> = ({ selectedDate, reducedMotion }) => {
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(20);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    slideY.value = withDelay(700, withSpring(0, SPRING_CONFIGS.smooth));
  }, [opacity, slideY]);

  // Crossfade content when date changes
  useEffect(() => {
    if (!reducedMotion) {
      contentOpacity.value = withSequence(
        withTiming(0, { duration: 100 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [selectedDate, reducedMotion, contentOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!selectedDate) return null;

  const date = new Date(selectedDate);
  const formattedDate = formatDate(date);

  return (
    <Animated.View style={[styles.selectedDateCard, animatedStyle]}>
      <LinearGradient colors={['#E5E5E5', '#F5F5F5']} style={styles.selectedDateGradient}>
        <Text style={styles.selectedDateIcon}>🏁</Text>
        <Animated.View style={contentAnimatedStyle}>
          <Text style={styles.selectedDateLabel}>Your cycle will start on:</Text>
          <Text style={styles.selectedDateText}>{formattedDate}</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

// Phase Selector Component
const PhaseSelector: React.FC<PhaseSelectorProps> = ({
  selectedPhase,
  onPhaseSelect,
  pattern,
  reducedMotion: _reducedMotion,
}) => {
  const dayOpacity = useSharedValue(0);
  const nightOpacity = useSharedValue(0);
  const offOpacity = useSharedValue(0);
  const daySlideY = useSharedValue(50);
  const nightSlideY = useSharedValue(50);
  const offSlideY = useSharedValue(50);

  useEffect(() => {
    // Staggered entrance
    dayOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    daySlideY.value = withDelay(400, withSpring(0, SPRING_CONFIGS.bouncy));

    nightOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    nightSlideY.value = withDelay(500, withSpring(0, SPRING_CONFIGS.bouncy));

    offOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    offSlideY.value = withDelay(600, withSpring(0, SPRING_CONFIGS.bouncy));
  }, [dayOpacity, nightOpacity, offOpacity, daySlideY, nightSlideY, offSlideY]);

  const dayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dayOpacity.value,
    transform: [{ translateY: daySlideY.value }],
  }));

  const nightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nightOpacity.value,
    transform: [{ translateY: nightSlideY.value }],
  }));

  const offAnimatedStyle = useAnimatedStyle(() => ({
    opacity: offOpacity.value,
    transform: [{ translateY: offSlideY.value }],
  }));

  const handlePhaseSelect = useCallback(
    (phase: 'day' | 'night' | 'off') => {
      HAPTIC_PATTERNS.MEDIUM();
      onPhaseSelect(phase);
    },
    [onPhaseSelect]
  );

  const hasDay = pattern.daysOn > 0;
  const hasNight = pattern.nightsOn > 0;
  const hasOff = pattern.daysOff > 0;

  return (
    <View style={styles.phaseSelectorContainer}>
      <View style={styles.phaseCardsRow}>
        {/* Day Shift Card */}
        {hasDay && (
          <Animated.View style={[styles.phaseCardWrapper, dayAnimatedStyle]}>
            <Pressable
              onPress={() => handlePhaseSelect('day')}
              style={[
                styles.phaseCard,
                selectedPhase === 'day' && styles.phaseCardSelected,
                selectedPhase === 'day' && { borderColor: COLORS.dayShift },
              ]}
            >
              <LinearGradient
                colors={
                  selectedPhase === 'day'
                    ? [COLORS.dayShift, COLORS.darkStone]
                    : [COLORS.darkStone, COLORS.darkStone]
                }
                style={styles.phaseCardGradient}
              >
                {/* Placeholder for 3D icon */}
                <View style={styles.phaseIconContainer}>
                  <Text style={styles.phaseEmoji}>{getPhaseEmoji('day')}</Text>
                </View>
                <Text style={styles.phaseLabel}>Day Shift</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Night Shift Card */}
        {hasNight && (
          <Animated.View style={[styles.phaseCardWrapper, nightAnimatedStyle]}>
            <Pressable
              onPress={() => handlePhaseSelect('night')}
              style={[
                styles.phaseCard,
                selectedPhase === 'night' && styles.phaseCardSelected,
                selectedPhase === 'night' && { borderColor: COLORS.nightShift },
              ]}
            >
              <LinearGradient
                colors={
                  selectedPhase === 'night'
                    ? [COLORS.nightShift, COLORS.darkStone]
                    : [COLORS.darkStone, COLORS.darkStone]
                }
                style={styles.phaseCardGradient}
              >
                {/* Placeholder for 3D icon */}
                <View style={styles.phaseIconContainer}>
                  <Text style={styles.phaseEmoji}>{getPhaseEmoji('night')}</Text>
                </View>
                <Text style={styles.phaseLabel}>Night Shift</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Days Off Card */}
        {hasOff && (
          <Animated.View style={[styles.phaseCardWrapper, offAnimatedStyle]}>
            <Pressable
              onPress={() => handlePhaseSelect('off')}
              style={[
                styles.phaseCard,
                selectedPhase === 'off' && styles.phaseCardSelected,
                selectedPhase === 'off' && { borderColor: COLORS.daysOff },
              ]}
            >
              <LinearGradient
                colors={
                  selectedPhase === 'off'
                    ? [COLORS.daysOff, COLORS.darkStone]
                    : [COLORS.darkStone, COLORS.darkStone]
                }
                style={styles.phaseCardGradient}
              >
                {/* Placeholder for 3D icon */}
                <View style={styles.phaseIconContainer}>
                  <Text style={styles.phaseEmoji}>{getPhaseEmoji('off')}</Text>
                </View>
                <Text style={styles.phaseLabel}>Days Off</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </View>

      {/* Helper Text */}
      <View style={styles.helperTextContainer}>
        <Ionicons name="information-circle" size={24} color={COLORS.paleGold} />
        <Text style={styles.helperText}>Choose which part of your cycle you&apos;ll be on</Text>
      </View>
    </View>
  );
};

// Live Preview Card Component
const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  selectedDate,
  selectedPhase,
  reducedMotion,
  customPattern,
  phaseOffset,
}) => {
  const floatY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(50);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    slideY.value = withDelay(600, withSpring(0, SPRING_CONFIGS.bouncy));

    // Idle floating (offset from pattern card)
    if (!reducedMotion) {
      floatY.value = withDelay(
        2000,
        withRepeat(
          withSequence(withTiming(-2, { duration: 2000 }), withTiming(2, { duration: 2000 })),
          -1,
          true
        )
      );
    }
  }, [reducedMotion, floatY, opacity, slideY]);

  // Crossfade content when selections change
  useEffect(() => {
    contentOpacity.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 300 })
    );
  }, [selectedDate, selectedPhase, contentOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value + floatY.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const formattedDate = selectedDate ? formatDate(new Date(selectedDate)) : 'Not selected';
  const phaseLabel = selectedPhase
    ? selectedPhase === 'day'
      ? 'Day Shift'
      : selectedPhase === 'night'
        ? 'Night Shift'
        : 'Days Off'
    : 'Not selected';

  return (
    <Animated.View style={[styles.previewCard, animatedStyle]}>
      <LinearGradient colors={[COLORS.darkStone, COLORS.deepVoid]} style={styles.previewGradient}>
        <Animated.View style={contentAnimatedStyle}>
          {/* Row 1: Start Date */}
          <View style={styles.previewRow}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.paleGold} />
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewLabel}>Starting:</Text>
              <Text style={styles.previewValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* Row 2: Phase */}
          <View style={styles.previewRow}>
            <Ionicons
              name={selectedPhase === 'day' ? 'sunny' : selectedPhase === 'night' ? 'moon' : 'beer'}
              size={32}
              color={selectedPhase ? getPhaseColor(selectedPhase) : COLORS.warmStone}
            />
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewLabel}>Phase:</Text>
              <Text
                style={[
                  styles.previewValue,
                  selectedPhase && { color: getPhaseColor(selectedPhase) },
                ]}
              >
                {phaseLabel}
              </Text>
            </View>
          </View>

          {/* Row 3: 7-Day Visual Timeline */}
          {selectedDate && selectedPhase && (
            <View style={styles.previewTimelineContainer}>
              <View style={styles.previewTimelineDays}>
                {Array(7)
                  .fill(null)
                  .map((_, dayIndex) => {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() + dayIndex);
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                    const shiftType = getShiftTypeForDate(
                      date,
                      new Date(selectedDate),
                      phaseOffset,
                      customPattern
                    );
                    const bgColor =
                      shiftType === 'day'
                        ? COLORS.dayShift
                        : shiftType === 'night'
                          ? COLORS.nightShift
                          : COLORS.daysOff;

                    return (
                      <View key={dayIndex} style={styles.previewTimelineDay}>
                        <View
                          style={[
                            styles.previewTimelineBlock,
                            { backgroundColor: bgColor },
                            dayIndex === 0 && styles.previewTimelineBlockFirst,
                          ]}
                        >
                          <Text style={styles.previewTimelineDayLabel}>{dayLabel}</Text>
                          <Text style={styles.previewTimelineShiftLabel}>
                            {shiftType === 'day' ? 'D' : shiftType === 'night' ? 'N' : 'O'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={COLORS.paleGold}
                style={styles.previewTimelineArrow}
              />
            </View>
          )}

          {/* Row 4: Confirmation */}
          {selectedDate && selectedPhase && (
            <View style={styles.previewConfirmation}>
              <Ionicons name="rocket" size={24} color={COLORS.success} />
              <Text style={styles.previewConfirmationText}>Your first cycle begins here</Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

// Validation Tips Component
const ValidationTips: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const opacity = useSharedValue(0);
  const tipOpacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(800, withTiming(1, { duration: 300 }));
  }, [opacity]);

  useEffect(() => {
    if (reducedMotion) {
      return () => {}; // no-op cleanup
    }

    const interval = setInterval(() => {
      tipOpacity.value = withSequence(
        withTiming(0, { duration: 300 }),
        withTiming(1, { duration: 300 })
      );

      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [reducedMotion, tipOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  return (
    <Animated.View style={[styles.tipsContainer, animatedStyle]}>
      <Ionicons name="bulb" size={32} color={COLORS.paleGold} />
      <Animated.Text style={[styles.tipText, tipAnimatedStyle]}>
        {TIPS[currentTipIndex]}
      </Animated.Text>
    </Animated.View>
  );
};

// Continue Button Component
const ContinueButton: React.FC<{
  enabled: boolean;
  onPress: () => void;
  reducedMotion: boolean;
}> = ({ enabled, onPress, reducedMotion }) => {
  const slideY = useSharedValue(100);
  const scale = useSharedValue(1);

  useEffect(() => {
    slideY.value = withDelay(800, withSpring(0, SPRING_CONFIGS.bouncy));

    // Idle pulse when enabled
    if (enabled && !reducedMotion) {
      scale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1500 }), withTiming(1.02, { duration: 1500 })),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [enabled, reducedMotion, slideY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }, { scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (!enabled) return;
    HAPTIC_PATTERNS.SUCCESS();
    onPress();
  }, [enabled, onPress]);

  return (
    <Animated.View style={[styles.continueButtonContainer, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={!enabled}
        style={[styles.continueButton, !enabled && styles.continueButtonDisabled]}
      >
        <LinearGradient
          colors={
            enabled
              ? [COLORS.sacredGold, COLORS.brightGold]
              : [COLORS.lightStone, COLORS.lightStone]
          }
          style={styles.continueGradient}
        >
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={styles.continueButtonText}>Continue to Energy Level</Text>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// Main Screen Component
export interface PremiumStartDateScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
  testID?: string;
}

export const PremiumStartDateScreen: React.FC<PremiumStartDateScreenProps> = ({
  onBack,
  onContinue,
  testID = 'premium-start-date-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();
  // Smart default: tomorrow
  const [selectedDate, setSelectedDate] = useState<string | null>(getTomorrowDate());
  const [selectedPhase, setSelectedPhase] = useState<'day' | 'night' | 'off' | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReducedMotion(enabled);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Get pattern data from context
  const pattern = data.patternType || ShiftPattern.CUSTOM;

  // Convert predefined patterns to numeric values
  const getPatternValues = useCallback(
    (patternType: ShiftPattern) => {
      switch (patternType) {
        case ShiftPattern.STANDARD_4_4_4:
          return { daysOn: 4, nightsOn: 4, daysOff: 4 };
        case ShiftPattern.STANDARD_7_7_7:
          return { daysOn: 7, nightsOn: 7, daysOff: 7 };
        case ShiftPattern.STANDARD_2_2_3:
          return { daysOn: 2, nightsOn: 2, daysOff: 3 };
        case ShiftPattern.STANDARD_5_5_5:
          return { daysOn: 5, nightsOn: 5, daysOff: 5 };
        case ShiftPattern.STANDARD_3_3_3:
          return { daysOn: 3, nightsOn: 3, daysOff: 3 };
        case ShiftPattern.STANDARD_10_10_10:
          return { daysOn: 10, nightsOn: 10, daysOff: 10 };
        case ShiftPattern.CONTINENTAL:
          return { daysOn: 2, nightsOn: 2, daysOff: 4 };
        case ShiftPattern.PITMAN:
          return { daysOn: 2, nightsOn: 2, daysOff: 3 };
        case ShiftPattern.CUSTOM:
        default:
          return data.customPattern || { daysOn: 0, nightsOn: 0, daysOff: 0 };
      }
    },
    [data.customPattern]
  );

  const customPattern = useMemo(() => getPatternValues(pattern), [pattern, getPatternValues]);

  // Get pattern icon
  const patternIcon = useMemo(() => getPatternIcon(pattern), [pattern]);

  // Calculate phase offset for preview
  const previewPhaseOffset = selectedPhase ? calculatePhaseOffset(selectedPhase, customPattern) : 0;

  const canContinue = selectedDate !== null && selectedPhase !== null;

  const handleContinue = useCallback(() => {
    if (!canContinue || !selectedDate || !selectedPhase) return;

    const phaseOffset = calculatePhaseOffset(selectedPhase, customPattern);

    updateData({
      startDate: new Date(selectedDate),
      phaseOffset,
    });

    if (onContinue) {
      onContinue();
    } else {
      navigation.navigate('EnergyLevel' as never);
    }
  }, [canContinue, selectedDate, selectedPhase, customPattern, updateData, onContinue, navigation]);

  const handleBack = useCallback(() => {
    HAPTIC_PATTERNS.LIGHT();
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [onBack, navigation]);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader currentStep={5} totalSteps={10} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>Select Your Start Date</Text>
        <Text style={styles.subtitle}>Choose when your shift cycle begins</Text>

        {/* Pattern Summary Card */}
        <PatternSummaryCard
          pattern={pattern}
          customPattern={customPattern}
          reducedMotion={reducedMotion}
          patternIcon={patternIcon}
        />

        {/* Interactive Calendar */}
        <InteractiveCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          reducedMotion={reducedMotion}
          customPattern={customPattern}
          phaseOffset={previewPhaseOffset}
        />

        {/* Selected Date Card */}
        <SelectedDateCard selectedDate={selectedDate} reducedMotion={reducedMotion} />

        {/* Phase Selector */}
        <PhaseSelector
          selectedPhase={selectedPhase}
          onPhaseSelect={setSelectedPhase}
          pattern={customPattern}
          reducedMotion={reducedMotion}
        />

        {/* Live Preview Card */}
        <LivePreviewCard
          selectedDate={selectedDate}
          selectedPhase={selectedPhase}
          reducedMotion={reducedMotion}
          customPattern={customPattern}
          phaseOffset={previewPhaseOffset}
        />

        {/* Validation Tips */}
        <ValidationTips reducedMotion={reducedMotion} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
        </Pressable>

        <ContinueButton
          enabled={canContinue}
          onPress={handleContinue}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepVoid,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.sacredGold,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.warmStone,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },

  // Pattern Summary Card
  patternCard: {
    marginBottom: theme.spacing.xl,
  },
  patternGradient: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.softStone,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  patternIconContainer: {
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  patternName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.paleGold,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  patternDetails: {
    fontSize: 14,
    color: COLORS.warmStone,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  miniCyclePreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  miniCycleBlock: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },

  // Calendar
  calendarContainer: {
    marginBottom: theme.spacing.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  monthArrow: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.paleGold,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  weekdayLabel: {
    fontSize: 12,
    color: COLORS.warmStone,
    textTransform: 'uppercase',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: COLORS.sacredGold,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: COLORS.paleGold,
  },
  dayCellDisabled: {
    opacity: 0.4,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.paper,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextDisabled: {
    color: COLORS.lightStone,
  },
  dayTextOtherMonth: {
    color: COLORS.warmStone,
  },

  // Phase Selector
  phaseSelectorContainer: {
    marginBottom: theme.spacing.xl,
  },
  phaseCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  phaseCardWrapper: {
    flex: 1,
  },
  phaseCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.softStone,
    overflow: 'hidden',
  },
  phaseCardSelected: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.sacredGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  phaseCardGradient: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  phaseIconContainer: {
    marginBottom: theme.spacing.sm,
  },
  phaseEmoji: {
    fontSize: 40,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.paper,
    textAlign: 'center',
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.warmStone,
  },

  // Live Preview Card
  previewCard: {
    marginBottom: theme.spacing.xl,
  },
  previewGradient: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: `rgba(${parseInt(COLORS.sacredGold.slice(1, 3), 16)}, ${parseInt(COLORS.sacredGold.slice(3, 5), 16)}, ${parseInt(COLORS.sacredGold.slice(5, 7), 16)}, 0.4)`,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    color: COLORS.warmStone,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    color: COLORS.paleGold,
    fontWeight: '600',
  },
  previewConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.softStone,
  },
  previewConfirmationText: {
    fontSize: 14,
    color: COLORS.warmStone,
    fontStyle: 'italic',
  },

  // Tips
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: COLORS.softStone,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.paper,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xxl : theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    backgroundColor: COLORS.deepVoid,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonContainer: {
    flex: 1,
  },
  continueButton: {
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Pattern Summary Card - Enhanced
  patternCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  patternIcon: {
    width: 80,
    height: 80,
  },
  cycleItems: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cycleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cycleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cycleIconEmoji: {
    fontSize: 16,
  },
  cycleItemText: {
    fontSize: 14,
    color: COLORS.paper,
  },
  timelineTrack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  timelineBlock: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  timelineExtra: {
    fontSize: 10,
    color: COLORS.warmStone,
    marginLeft: 2,
  },
  startDatePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
  },
  startDatePromptIcon: {
    fontSize: 20,
  },
  startDatePromptText: {
    fontSize: 14,
    color: COLORS.paleGold,
  },
  // Calendar - Enhanced
  shiftIcon: {
    fontSize: 12,
    position: 'absolute',
    top: 2,
  },
  dayTextWithIcon: {
    marginTop: 10,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.softStone,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIcon: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.warmStone,
  },
  // Selected Date Card
  selectedDateCard: {
    marginVertical: theme.spacing.md,
  },
  selectedDateGradient: {
    borderRadius: 12,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  selectedDateIcon: {
    fontSize: 24,
  },
  selectedDateLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#0369A1',
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Live Preview - Enhanced with 7-day timeline
  previewTimelineContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTimelineDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  previewTimelineDay: {
    flex: 1,
  },
  previewTimelineBlock: {
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  previewTimelineBlockFirst: {
    borderWidth: 2,
    borderColor: COLORS.paleGold,
  },
  previewTimelineDayLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewTimelineShiftLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
  previewTimelineArrow: {
    marginTop: theme.spacing.sm,
    alignSelf: 'center',
  },
});
