/**
 * PremiumStartDateScreen Component
 *
 * Start date selection screen with interactive calendar (Step 6 of 11)
 * Phase selection now handled by PremiumPhaseSelectorScreen (Step 5)
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
  InteractionManager,
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
import { ShiftPattern, ShiftSystem, Phase } from '@/types';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

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

// Shift visualization colors (RGB values from theme for use with opacity)
const SHIFT_COLORS = {
  day: { r: 33, g: 150, b: 243 }, // #2196F3 - Blue
  night: { r: 101, g: 31, b: 255 }, // #651FFF - Purple
  morning: { r: 252, g: 211, b: 77 }, // #FCD34D - Yellow
  afternoon: { r: 251, g: 146, b: 60 }, // #FB923C - Orange
  off: { r: 255, g: 152, b: 0 }, // #FF9800 - Orange/Amber
  default: { r: 180, g: 83, b: 9 }, // #b45309 - sacredGold fallback
} as const;

// TypeScript Interfaces
interface CalendarProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  reducedMotion: boolean;
  customPattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  };
  phaseOffset: number;
  shiftSystem: ShiftSystem;
}

interface PhaseSelectorProps {
  selectedPhase: Phase | null;
  onPhaseSelect: (phase: Phase) => void;
  pattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  };
  shiftSystem: ShiftSystem;
  reducedMotion: boolean;
}

interface DayWithinPhaseSelectorProps {
  selectedPhase: Phase | null;
  pattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  };
  shiftSystem: ShiftSystem;
  selectedDay: number | null;
  onDaySelect: (day: number) => void;
  reducedMotion: boolean;
}

interface SelectedDateCardProps {
  selectedDate: string | null;
  reducedMotion: boolean;
}

interface LivePreviewCardProps {
  selectedDate: string | null;
  selectedPhase: Phase | null;
  reducedMotion: boolean;
  customPattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  };
  shiftSystem: ShiftSystem;
  phaseOffset: number;
}

// Animated Day Cell Component
interface DayCellProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isValid: boolean;
  isCurrentMonth: boolean;
  shiftType: 'day' | 'night' | 'morning' | 'afternoon' | 'off' | null;
  onPress: () => void;
  reducedMotion: boolean;
}

const AnimatedDayCell: React.FC<DayCellProps> = React.memo(
  ({ date, isSelected, isToday, isValid, isCurrentMonth, shiftType, onPress, reducedMotion }) => {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);
    const ringScale = useSharedValue(0);
    const ringOpacity = useSharedValue(0);
    const bgOpacity = useSharedValue(isSelected ? 1 : 0);

    useEffect(() => {
      if (isSelected) {
        // Selection animation sequence
        if (!reducedMotion) {
          // Scale animation (0-50ms)
          scale.value = withTiming(1.05, { duration: 50 });

          // Glow pulse (50-250ms)
          glowOpacity.value = withDelay(
            50,
            withSequence(withTiming(0.6, { duration: 100 }), withTiming(0, { duration: 100 }))
          );

          // Golden ring expansion (100-500ms)
          ringScale.value = withDelay(100, withTiming(2, { duration: 400 }));
          ringOpacity.value = withDelay(
            100,
            withSequence(withTiming(0.8, { duration: 200 }), withTiming(0, { duration: 200 }))
          );

          // Final scale to 1.15
          scale.value = withDelay(100, withSpring(1.15, SPRING_CONFIGS.bouncy));
        }

        // Background fade in
        bgOpacity.value = withDelay(100, withSpring(1, SPRING_CONFIGS.smooth));
      } else {
        // Deselection: fade out and reset scale
        if (!reducedMotion) {
          scale.value = withTiming(1, { duration: 200 });
        }
        bgOpacity.value = withTiming(0, { duration: 200 });
        ringScale.value = 0;
        ringOpacity.value = 0;
        glowOpacity.value = 0;
      }
    }, [isSelected, reducedMotion, scale, glowOpacity, ringScale, ringOpacity, bgOpacity]);

    const cellAnimatedStyle = useAnimatedStyle(() => {
      const getBorderColor = () => {
        if (!shiftType) return 'transparent';

        const color =
          shiftType === 'day'
            ? SHIFT_COLORS.day
            : shiftType === 'night'
              ? SHIFT_COLORS.night
              : shiftType === 'morning'
                ? SHIFT_COLORS.morning
                : shiftType === 'afternoon'
                  ? SHIFT_COLORS.afternoon
                  : SHIFT_COLORS.off;

        return `rgba(${color.r}, ${color.g}, ${color.b}, ${bgOpacity.value})`;
      };

      return {
        transform: [{ scale: reducedMotion ? 1 : scale.value }],
        borderWidth: bgOpacity.value > 0 ? 2 : 0,
        borderColor: getBorderColor(),
      };
    });

    const glowAnimatedStyle = useAnimatedStyle(() => {
      const getGlowColor = () => {
        if (!shiftType)
          return `rgba(${SHIFT_COLORS.default.r}, ${SHIFT_COLORS.default.g}, ${SHIFT_COLORS.default.b}, ${glowOpacity.value * 0.3})`;

        const color =
          shiftType === 'day'
            ? SHIFT_COLORS.day
            : shiftType === 'night'
              ? SHIFT_COLORS.night
              : shiftType === 'morning'
                ? SHIFT_COLORS.morning
                : shiftType === 'afternoon'
                  ? SHIFT_COLORS.afternoon
                  : SHIFT_COLORS.off;

        return `rgba(${color.r}, ${color.g}, ${color.b}, ${glowOpacity.value * 0.3})`;
      };

      return {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: getGlowColor(),
        opacity: glowOpacity.value,
      };
    });

    const ringAnimatedStyle = useAnimatedStyle(() => {
      const getRingColor = () => {
        if (!shiftType)
          return `rgba(${SHIFT_COLORS.default.r}, ${SHIFT_COLORS.default.g}, ${SHIFT_COLORS.default.b}, ${ringOpacity.value})`;

        const color =
          shiftType === 'day'
            ? SHIFT_COLORS.day
            : shiftType === 'night'
              ? SHIFT_COLORS.night
              : shiftType === 'morning'
                ? SHIFT_COLORS.morning
                : shiftType === 'afternoon'
                  ? SHIFT_COLORS.afternoon
                  : SHIFT_COLORS.off;

        return `rgba(${color.r}, ${color.g}, ${color.b}, ${ringOpacity.value})`;
      };

      return {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: getRingColor(),
        transform: [{ scale: ringScale.value }],
        opacity: ringOpacity.value,
      };
    });

    return (
      <Pressable
        onPress={onPress}
        disabled={!isValid}
        style={[
          styles.dayCell,
          isToday && styles.dayCellToday,
          !isValid && styles.dayCellDisabled,
          !isCurrentMonth && styles.dayCellOtherMonth,
        ]}
      >
        {/* Glow effect */}
        {isSelected && !reducedMotion && <Animated.View style={glowAnimatedStyle} />}

        {/* Golden ring expansion */}
        {isSelected && !reducedMotion && <Animated.View style={ringAnimatedStyle} />}

        {/* Main cell */}
        <Animated.View
          style={[
            {
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
            },
            cellAnimatedStyle,
          ]}
        >
          {/* Shift icon above date */}
          {shiftType && (
            <>
              {getCalendarShiftIcon(shiftType) === 'iconicon' ? (
                <View style={styles.shiftIcon}>
                  <Ionicons name="partly-sunny" size={18} color={theme.colors.sacredGold} />
                </View>
              ) : (
                <Image
                  source={getCalendarShiftIcon(shiftType) as ImageSourcePropType}
                  style={styles.shiftIcon}
                  resizeMode="contain"
                />
              )}
            </>
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
        </Animated.View>
      </Pressable>
    );
  }
);

AnimatedDayCell.displayName = 'AnimatedDayCell';

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

const getBasePhaseOffset = (
  phase: Phase,
  pattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  },
  shiftSystem: ShiftSystem
): number => {
  if (shiftSystem === ShiftSystem.TWO_SHIFT) {
    switch (phase) {
      case 'day':
        return 0;
      case 'night':
        return pattern.daysOn ?? 0;
      case 'off':
        return (pattern.daysOn ?? 0) + (pattern.nightsOn ?? 0);
      default:
        return 0;
    }
  } else {
    // 3-shift system
    switch (phase) {
      case 'morning':
        return 0;
      case 'afternoon':
        return pattern.morningOn ?? 0;
      case 'night':
        return (pattern.morningOn ?? 0) + (pattern.afternoonOn ?? 0);
      case 'off':
        return (pattern.morningOn ?? 0) + (pattern.afternoonOn ?? 0) + (pattern.nightOn ?? 0);
      default:
        return 0;
    }
  }
};

/**
 * Calculate enhanced phase offset that includes the specific day within the phase
 * @param phase - The selected phase
 * @param dayWithinPhase - The specific day number within the phase (1-indexed)
 * @param pattern - The shift pattern configuration
 * @param shiftSystem - The shift system (2-shift or 3-shift)
 * @returns Enhanced phase offset
 */
export const _calculateEnhancedPhaseOffset = (
  phase: Phase,
  dayWithinPhase: number,
  pattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  },
  shiftSystem: ShiftSystem
): number => {
  // Get base offset (start of phase)
  const baseOffset = getBasePhaseOffset(phase, pattern, shiftSystem);

  // Add days within phase (subtract 1 since dayWithinPhase is 1-indexed)
  return baseOffset + (dayWithinPhase - 1);
};

const getPhaseColor = (phase: Phase): string => {
  switch (phase) {
    case 'day':
      return theme.colors.shiftVisualization.dayShift;
    case 'night':
      return theme.colors.shiftVisualization.nightShift;
    case 'morning':
      return '#FCD34D'; // Yellow
    case 'afternoon':
      return '#FB923C'; // Orange
    case 'off':
      return theme.colors.shiftVisualization.daysOff;
    default:
      return theme.colors.shiftVisualization.dayShift;
  }
};

const getPhaseIcon = (phase: Phase): ImageSourcePropType | 'iconicon' => {
  switch (phase) {
    case 'day':
      return require('../../../../assets/onboarding/icons/consolidated/phase-day-shift-sun.png');
    case 'night':
      return require('../../../../assets/onboarding/icons/consolidated/phase-night-shift-moon.png');
    case 'morning':
      return require('../../../../assets/onboarding/icons/consolidated/phase-day-shift-sun.png'); // Reuse sun icon
    case 'afternoon':
      return 'iconicon'; // Use Ionicon partly-sunny
    case 'off':
      return require('../../../../assets/onboarding/icons/consolidated/phase-days-off-rest.png');
    default:
      return require('../../../../assets/onboarding/icons/consolidated/phase-day-shift-sun.png');
  }
};

// Get calendar cell icon for shift type
const getCalendarShiftIcon = (
  shiftType: 'day' | 'night' | 'morning' | 'afternoon' | 'off'
): ImageSourcePropType | 'iconicon' => {
  switch (shiftType) {
    case 'day':
      return require('../../../../assets/onboarding/icons/consolidated/calendar-day-shift-sun.png');
    case 'night':
      return require('../../../../assets/onboarding/icons/consolidated/calendar-night-shift-moon.png');
    case 'morning':
      return require('../../../../assets/onboarding/icons/consolidated/calendar-day-shift-sun.png'); // Reuse sun for morning
    case 'afternoon':
      return 'iconicon'; // Use Ionicon partly-sunny
    case 'off':
      return require('../../../../assets/onboarding/icons/consolidated/calendar-days-off-rest.png');
    default:
      return require('../../../../assets/onboarding/icons/consolidated/calendar-day-shift-sun.png');
  }
};

// Calculate which shift type for a given date
const getShiftTypeForDate = (
  date: Date,
  startDate: Date,
  phaseOffset: number,
  pattern: {
    daysOn?: number;
    nightsOn?: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  },
  shiftSystem: ShiftSystem
): 'day' | 'night' | 'morning' | 'afternoon' | 'off' | null => {
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return null; // Before start date

  // Handle 3-shift system
  if (shiftSystem === ShiftSystem.THREE_SHIFT) {
    const morningOn = pattern.morningOn || 0;
    const afternoonOn = pattern.afternoonOn || 0;
    const nightOn = pattern.nightOn || 0;
    const daysOff = pattern.daysOff || 0;

    const cycleLength = morningOn + afternoonOn + nightOn + daysOff;
    if (cycleLength === 0) return null;

    const positionInCycle = (daysDiff + phaseOffset) % cycleLength;

    if (positionInCycle < morningOn) {
      return 'morning';
    } else if (positionInCycle < morningOn + afternoonOn) {
      return 'afternoon';
    } else if (positionInCycle < morningOn + afternoonOn + nightOn) {
      return 'night';
    }
    return 'off';
  }

  // Handle 2-shift system
  const daysOn = pattern.daysOn || 0;
  const nightsOn = pattern.nightsOn || 0;
  const daysOff = pattern.daysOff || 0;

  const cycleLength = daysOn + nightsOn + daysOff;
  if (cycleLength === 0) return null;

  const positionInCycle = (daysDiff + phaseOffset) % cycleLength;

  if (positionInCycle < daysOn) {
    return 'day';
  } else if (positionInCycle < daysOn + nightsOn) {
    return 'night';
  }
  return 'off';
};

// Get today's date as default
const getTodayDate = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
};

// Get user-friendly phase label
const getPhaseLabel = (
  currentPhase: Phase | null | undefined,
  selectedDay: number | null | undefined
): string => {
  if (!currentPhase) return 'your current shift';

  // Single-day phases or no specific day selected
  const labels: Record<Phase, string> = {
    day: 'Day Shift',
    night: 'Night Shift',
    morning: 'Morning Shift',
    afternoon: 'Afternoon Shift',
    off: 'Days Off',
  };

  // If no specific day, return simple label
  if (!selectedDay) return labels[currentPhase];

  // Multi-day phases with specific day: "Day 3 of Night Shifts"
  const pluralLabels: Record<Phase, string> = {
    day: 'Day Shifts',
    night: 'Night Shifts',
    morning: 'Morning Shifts',
    afternoon: 'Afternoon Shifts',
    off: 'Days Off',
  };

  return `Day ${selectedDay} of ${pluralLabels[currentPhase]}`;
};

// Interactive Calendar Component
const InteractiveCalendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  reducedMotion: _reducedMotion,
  customPattern,
  phaseOffset,
  shiftSystem,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(50);
  const translateX = useSharedValue(0);
  const gridOpacity = useSharedValue(1);
  const gridSlideX = useSharedValue(0);
  const leftArrowScale = useSharedValue(1);
  const rightArrowScale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    slideY.value = withDelay(400, withSpring(0, SPRING_CONFIGS.bouncy));
  }, [opacity, slideY]);

  // Grid slide animation on month change
  useEffect(() => {
    if (!_reducedMotion) {
      // Slide in animation for new month
      gridOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
      gridSlideX.value = withSequence(
        withTiming(20, { duration: 0 }),
        withTiming(0, { duration: 300 })
      );
    }
  }, [currentMonth, _reducedMotion, gridOpacity, gridSlideX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }, { translateX: translateX.value }],
  }));

  const gridAnimatedStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
    transform: [{ translateX: gridSlideX.value }],
  }));

  const leftArrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftArrowScale.value }],
  }));

  const rightArrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightArrowScale.value }],
  }));

  const goToPreviousMonth = useCallback(() => {
    HAPTIC_PATTERNS.LIGHT();

    // Arrow animation
    if (!_reducedMotion) {
      leftArrowScale.value = withSequence(
        withTiming(1.1, { duration: 50 }),
        withTiming(1.0, { duration: 100 })
      );
    }

    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, [_reducedMotion, leftArrowScale]);

  const goToNextMonth = useCallback(() => {
    HAPTIC_PATTERNS.LIGHT();

    // Arrow animation
    if (!_reducedMotion) {
      rightArrowScale.value = withSequence(
        withTiming(1.1, { duration: 50 }),
        withTiming(1.0, { duration: 100 })
      );
    }

    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, [_reducedMotion, rightArrowScale]);

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
          <Animated.View style={leftArrowAnimatedStyle}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.paleGold} />
          </Animated.View>
        </Pressable>

        <Text style={styles.monthName}>{monthName}</Text>

        <Pressable onPress={goToNextMonth} style={styles.monthArrow}>
          <Animated.View style={rightArrowAnimatedStyle}>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.paleGold} />
          </Animated.View>
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
        <Animated.View style={[styles.calendarGrid, gridAnimatedStyle]}>
          {days.map((date, index) => {
            const dateString = date.toISOString().split('T')[0];
            const isSelected = selectedDate === dateString;
            const isToday =
              date.toDateString() === new Date().toDateString() &&
              date.getMonth() === currentMonth.getMonth();
            const isValid = isDateValid(date);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

            // Calculate shift type for this date if selected date exists
            let shiftType: 'day' | 'night' | 'morning' | 'afternoon' | 'off' | null = null;
            if (selectedDate && isValid && isCurrentMonth) {
              const startDate = new Date(selectedDate);
              shiftType = getShiftTypeForDate(
                date,
                startDate,
                phaseOffset,
                customPattern,
                shiftSystem
              );
            }

            return (
              <AnimatedDayCell
                key={index}
                date={date}
                isSelected={isSelected}
                isToday={isToday}
                isValid={isValid}
                isCurrentMonth={isCurrentMonth}
                shiftType={shiftType}
                onPress={() => handleDateSelect(date)}
                reducedMotion={_reducedMotion}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>

      {/* Calendar Legend */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarLegendContent}
        style={styles.calendarLegend}
      >
        {shiftSystem === ShiftSystem.TWO_SHIFT ? (
          <>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-day-shift-sun.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Day Shift</Text>
            </View>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-night-shift-moon.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Night Shift</Text>
            </View>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-days-off-rest.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Day Off</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-day-shift-sun.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Morning</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="partly-sunny" size={20} color={theme.colors.dust} />
              <Text style={styles.legendText}>Afternoon</Text>
            </View>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-night-shift-moon.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Night</Text>
            </View>
            <View style={styles.legendItem}>
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/cycle-days-off-rest.png')}
                style={styles.legendIconImage}
                resizeMode="contain"
              />
              <Text style={styles.legendText}>Off</Text>
            </View>
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};

// Selected Date Display Card Component (currently unused)
export const _SelectedDateCard: React.FC<SelectedDateCardProps> = ({
  selectedDate,
  reducedMotion,
}) => {
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
      <LinearGradient
        colors={[theme.colors.softStone, theme.colors.darkStone]}
        style={styles.selectedDateGradient}
      >
        <Text style={styles.selectedDateIcon}>🏁</Text>
        <Animated.View style={contentAnimatedStyle}>
          <Text style={styles.selectedDateLabel}>Your cycle will start on:</Text>
          <Text style={styles.selectedDateText}>{formattedDate}</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

// Animated Phase Card Component
interface AnimatedPhaseCardProps {
  phase: 'day' | 'night' | 'off' | 'morning' | 'afternoon';
  isSelected: boolean;
  onPress: () => void;
  label: string;
  icon: ImageSourcePropType | 'iconicon'; // 'iconicon' marker for using Ionicon instead
  entranceDelay: number;
  reducedMotion: boolean;
  disabled?: boolean;
}

const AnimatedPhaseCard: React.FC<AnimatedPhaseCardProps> = React.memo(
  ({ phase, isSelected, onPress, label, icon, entranceDelay, reducedMotion, disabled = false }) => {
    const opacity = useSharedValue(0);
    const slideY = useSharedValue(50);
    const scale = useSharedValue(1);
    const borderOpacity = useSharedValue(0);
    const iconScale = useSharedValue(1);
    const pressScale = useSharedValue(1);
    const iconFloatY = useSharedValue(0);
    const borderGlow = useSharedValue(0.8);

    // Track touch position to differentiate tap from scroll
    const touchStartX = React.useRef<number>(0);
    const touchStartY = React.useRef<number>(0);

    // Entrance animation
    useEffect(() => {
      opacity.value = withDelay(entranceDelay, withTiming(1, { duration: 400 }));
      slideY.value = withDelay(entranceDelay, withSpring(0, SPRING_CONFIGS.bouncy));
    }, [entranceDelay, opacity, slideY]);

    // Selection animations + Idle animations
    useEffect(() => {
      if (isSelected) {
        if (!reducedMotion) {
          // Scale to 1.05×
          scale.value = withDelay(100, withSpring(1.05, SPRING_CONFIGS.bouncy));

          // Icon bounce animation (on selection)
          iconScale.value = withDelay(
            100,
            withSequence(
              withSpring(1.3, SPRING_CONFIGS.bouncy),
              withSpring(1, SPRING_CONFIGS.bouncy)
            )
          );

          // Start idle animations
          // Icon float: ±3px vertical, 3-second loop
          iconFloatY.value = withRepeat(
            withSequence(withTiming(-3, { duration: 1500 }), withTiming(3, { duration: 1500 })),
            -1,
            true
          );

          // Border glow pulse: 0.8→1.0, 2-second loop
          borderGlow.value = withRepeat(
            withSequence(withTiming(1.0, { duration: 1000 }), withTiming(0.8, { duration: 1000 })),
            -1,
            true
          );
        }

        // Border animate in
        borderOpacity.value = withDelay(100, withSpring(1, SPRING_CONFIGS.smooth));
      } else {
        // Deselection: stop idle animations
        if (!reducedMotion) {
          scale.value = withTiming(1, { duration: 200 });
          iconScale.value = 1;
          iconFloatY.value = 0;
          borderGlow.value = 0.8;
        }
        borderOpacity.value = withTiming(0, { duration: 200 });
      }
    }, [isSelected, reducedMotion, scale, borderOpacity, iconScale, iconFloatY, borderGlow]);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
      opacity: disabled ? opacity.value * 0.5 : opacity.value,
      transform: [
        { translateY: slideY.value },
        { scale: reducedMotion ? 1 : scale.value * pressScale.value },
      ],
    }));

    const iconAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: reducedMotion ? 1 : iconScale.value },
        { translateY: reducedMotion ? 0 : iconFloatY.value },
      ],
    }));

    const handleTouchStart = useCallback(
      (event: { nativeEvent: { pageX: number; pageY: number } }) => {
        touchStartX.current = event.nativeEvent.pageX;
        touchStartY.current = event.nativeEvent.pageY;
        if (!reducedMotion && !disabled) {
          pressScale.value = withTiming(0.95, { duration: 100 });
        }
      },
      [reducedMotion, pressScale, disabled]
    );

    const handleTouchEnd = useCallback(
      (event: { nativeEvent: { pageX: number; pageY: number } }) => {
        if (!disabled) {
          if (!reducedMotion) {
            pressScale.value = withTiming(1, { duration: 100 });
          }

          // Calculate movement distance
          const deltaX = Math.abs(event.nativeEvent.pageX - touchStartX.current);
          const deltaY = Math.abs(event.nativeEvent.pageY - touchStartY.current);
          const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          // Only trigger onPress if movement was minimal (< 10px = tap, not scroll)
          if (totalMovement < 10) {
            onPress();
          }
        }
      },
      [reducedMotion, pressScale, onPress, disabled]
    );

    const getPhaseIconBgColor = () => {
      switch (phase) {
        case 'day':
          return 'rgba(33, 150, 243, 0.2)'; // Blue tint
        case 'night':
          return 'rgba(101, 31, 255, 0.2)'; // Purple tint
        case 'morning':
          return 'rgba(33, 150, 243, 0.2)'; // Blue tint
        case 'afternoon':
          return 'rgba(255, 152, 0, 0.2)'; // Orange tint
        case 'off':
          return theme.colors.opacity.gold20;
        default:
          return 'rgba(33, 150, 243, 0.2)';
      }
    };

    const getPhaseGradientColors = (): [string, string] => {
      switch (phase) {
        case 'day':
          return ['rgba(33, 150, 243, 0.25)', 'rgba(33, 150, 243, 0.05)']; // Blue gradient
        case 'night':
          return ['rgba(101, 31, 255, 0.25)', 'rgba(101, 31, 255, 0.05)']; // Purple gradient
        case 'morning':
          return ['rgba(252, 211, 77, 0.25)', 'rgba(252, 211, 77, 0.05)']; // Yellow gradient
        case 'afternoon':
          return ['rgba(251, 146, 60, 0.25)', 'rgba(251, 146, 60, 0.05)']; // Orange gradient
        case 'off':
          return ['rgba(255, 152, 0, 0.25)', 'rgba(255, 152, 0, 0.05)']; // Amber gradient
        default:
          return ['rgba(33, 150, 243, 0.25)', 'rgba(33, 150, 243, 0.05)'];
      }
    };

    const getPhaseBorderColor = (): string => {
      switch (phase) {
        case 'day':
          return 'rgb(33, 150, 243)'; // Blue
        case 'night':
          return 'rgb(101, 31, 255)'; // Purple
        case 'morning':
          return 'rgb(252, 211, 77)'; // Yellow
        case 'afternoon':
          return 'rgb(251, 146, 60)'; // Orange
        case 'off':
          return 'rgb(255, 152, 0)'; // Amber
        default:
          return theme.colors.sacredGold;
      }
    };

    const getPhaseShadowColor = (): string => {
      switch (phase) {
        case 'day':
          return '#2196F3'; // Blue
        case 'night':
          return '#651FFF'; // Purple
        case 'morning':
          return '#FCD34D'; // Yellow
        case 'afternoon':
          return '#FB923C'; // Orange
        case 'off':
          return '#FF9800'; // Amber
        default:
          return theme.colors.sacredGold;
      }
    };

    return (
      <Animated.View style={[styles.phaseCardWrapper, cardAnimatedStyle]}>
        <Pressable
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          disabled={disabled}
          style={[
            styles.phaseCard,
            isSelected && {
              borderWidth: 2,
              borderColor: getPhaseBorderColor(),
              backgroundColor: 'transparent',
              ...Platform.select({
                ios: {
                  shadowColor: getPhaseShadowColor(),
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 8,
                },
              }),
            },
            disabled && { opacity: 0.5 },
          ]}
        >
          {isSelected ? (
            <LinearGradient
              colors={getPhaseGradientColors()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.phaseCardGradient}
            >
              {/* Icon with bounce and float animation */}
              <Animated.View
                style={[
                  styles.phaseIconContainer,
                  { backgroundColor: getPhaseIconBgColor() },
                  iconAnimatedStyle,
                ]}
              >
                {icon === 'iconicon' ? (
                  <Ionicons name="partly-sunny" size={48} color={theme.colors.paper} />
                ) : (
                  <Image
                    source={icon as ImageSourcePropType}
                    style={styles.phaseIcon}
                    resizeMode="contain"
                  />
                )}
              </Animated.View>
              <Text style={styles.phaseLabel}>{label}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.phaseCardGradient}>
              {/* Icon with bounce and float animation */}
              <Animated.View
                style={[
                  styles.phaseIconContainer,
                  { backgroundColor: getPhaseIconBgColor() },
                  iconAnimatedStyle,
                ]}
              >
                {icon === 'iconicon' ? (
                  <Ionicons name="partly-sunny" size={48} color={theme.colors.paper} />
                ) : (
                  <Image
                    source={icon as ImageSourcePropType}
                    style={styles.phaseIcon}
                    resizeMode="contain"
                  />
                )}
              </Animated.View>
              <Text style={styles.phaseLabel}>{label}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }
);

AnimatedPhaseCard.displayName = 'AnimatedPhaseCard';

// Phase Selector Component (unused - now handled by dedicated PremiumPhaseSelectorScreen)
export const _PhaseSelector: React.FC<PhaseSelectorProps> = ({
  selectedPhase,
  onPhaseSelect,
  pattern,
  shiftSystem,
  reducedMotion,
}) => {
  const handlePhaseSelect = useCallback(
    (phase: Phase) => {
      HAPTIC_PATTERNS.MEDIUM();
      onPhaseSelect(phase);
    },
    [onPhaseSelect]
  );

  if (shiftSystem === ShiftSystem.TWO_SHIFT) {
    // 2-Shift System: Day / Night / Off
    const hasDay = (pattern.daysOn ?? 0) > 0;
    const hasNight = (pattern.nightsOn ?? 0) > 0;
    const hasOff = pattern.daysOff > 0;

    return (
      <View style={styles.phaseSelectorContainer}>
        <Text style={styles.phaseSelectorTitle}>
          Choose which part of your cycle you&apos;ll be on
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseCardsScrollContent}
          snapToInterval={152} // 140px card + 12px gap
          decelerationRate="fast"
        >
          <AnimatedPhaseCard
            phase="day"
            isSelected={selectedPhase === 'day'}
            onPress={() => handlePhaseSelect('day')}
            label="Day Shift"
            icon={getPhaseIcon('day')}
            entranceDelay={0}
            reducedMotion={reducedMotion}
            disabled={!hasDay}
          />

          <AnimatedPhaseCard
            phase="night"
            isSelected={selectedPhase === 'night'}
            onPress={() => handlePhaseSelect('night')}
            label="Night Shift"
            icon={getPhaseIcon('night')}
            entranceDelay={100}
            reducedMotion={reducedMotion}
            disabled={!hasNight}
          />

          <AnimatedPhaseCard
            phase="off"
            isSelected={selectedPhase === 'off'}
            onPress={() => handlePhaseSelect('off')}
            label="Days Off"
            icon={getPhaseIcon('off')}
            entranceDelay={200}
            reducedMotion={reducedMotion}
            disabled={!hasOff}
          />
        </ScrollView>
      </View>
    );
  }
  // 3-Shift System: Morning / Afternoon / Night / Off
  const hasMorning = (pattern.morningOn ?? 0) > 0;
  const hasAfternoon = (pattern.afternoonOn ?? 0) > 0;
  const hasNight = (pattern.nightOn ?? 0) > 0;
  const hasOff = pattern.daysOff > 0;

  return (
    <View style={styles.phaseSelectorContainer}>
      <Text style={styles.phaseSelectorTitle}>
        Choose which part of your cycle you&apos;ll be on
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.phaseCardsScrollContent}
        snapToInterval={152} // 140px card + 12px gap
        decelerationRate="fast"
      >
        <AnimatedPhaseCard
          phase="morning"
          isSelected={selectedPhase === 'morning'}
          onPress={() => handlePhaseSelect('morning')}
          label="Morning"
          icon={getPhaseIcon('morning')}
          entranceDelay={0}
          reducedMotion={reducedMotion}
          disabled={!hasMorning}
        />

        <AnimatedPhaseCard
          phase="afternoon"
          isSelected={selectedPhase === 'afternoon'}
          onPress={() => handlePhaseSelect('afternoon')}
          label="Afternoon"
          icon={getPhaseIcon('afternoon')}
          entranceDelay={100}
          reducedMotion={reducedMotion}
          disabled={!hasAfternoon}
        />

        <AnimatedPhaseCard
          phase="night"
          isSelected={selectedPhase === 'night'}
          onPress={() => handlePhaseSelect('night')}
          label="Night"
          icon={getPhaseIcon('night')}
          entranceDelay={200}
          reducedMotion={reducedMotion}
          disabled={!hasNight}
        />

        <AnimatedPhaseCard
          phase="off"
          isSelected={selectedPhase === 'off'}
          onPress={() => handlePhaseSelect('off')}
          label="Days Off"
          icon={getPhaseIcon('off')}
          entranceDelay={300}
          reducedMotion={reducedMotion}
          disabled={!hasOff}
        />
      </ScrollView>
    </View>
  );
};

// Day Within Phase Selector Component (unused - now handled by dedicated PremiumPhaseSelectorScreen)
export const _DayWithinPhaseSelector: React.FC<DayWithinPhaseSelectorProps> = ({
  selectedPhase,
  pattern,
  shiftSystem,
  selectedDay,
  onDaySelect,
  reducedMotion,
}) => {
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(20);

  // Calculate phase length based on selected phase and shift system
  const getPhaseLength = (): number => {
    if (!selectedPhase) return 0;

    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      switch (selectedPhase) {
        case 'day':
          return pattern.daysOn ?? 0;
        case 'night':
          return pattern.nightsOn ?? 0;
        case 'off':
          return pattern.daysOff;
        default:
          return 0;
      }
    } else {
      // 3-shift system
      switch (selectedPhase) {
        case 'morning':
          return pattern.morningOn ?? 0;
        case 'afternoon':
          return pattern.afternoonOn ?? 0;
        case 'night':
          return pattern.nightOn ?? 0;
        case 'off':
          return pattern.daysOff;
        default:
          return 0;
      }
    }
  };

  const phaseLength = getPhaseLength();

  // Slide-up entrance animation
  useEffect(() => {
    if (selectedPhase) {
      opacity.value = withTiming(1, { duration: 300 });
      slideY.value = withSpring(0, SPRING_CONFIGS.smooth);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      slideY.value = 20;
    }
  }, [selectedPhase, opacity, slideY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }],
  }));

  // Get phase label for helper text
  const getPhaseLabel = (): string => {
    switch (selectedPhase) {
      case 'day':
        return 'Day Shifts';
      case 'night':
        return 'Night Shifts';
      case 'morning':
        return 'Morning Shifts';
      case 'afternoon':
        return 'Afternoon Shifts';
      case 'off':
        return 'Days Off';
      default:
        return '';
    }
  };

  // Don't render if no phase selected or phase is only 1 day
  if (!selectedPhase || phaseLength <= 1) {
    return null;
  }

  return (
    <Animated.View style={[styles.dayWithinPhaseSelectorContainer, animatedStyle]}>
      <Text style={styles.dayWithinPhaseHeader}>Which day of your {getPhaseLabel()}?</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayCardsScrollContent}
        style={styles.dayCardsScroll}
        snapToInterval={120}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {Array.from({ length: phaseLength }, (_, index) => {
          const dayNumber = index + 1;
          const isSelected = selectedDay === dayNumber;

          return (
            <DayCard
              key={dayNumber}
              dayNumber={dayNumber}
              isSelected={isSelected}
              phase={selectedPhase}
              onPress={() => {
                HAPTIC_PATTERNS.LIGHT();
                onDaySelect(dayNumber);
              }}
              reducedMotion={reducedMotion}
              entranceDelay={index * 50}
            />
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

// Day Card Component (for DayWithinPhaseSelector)
interface DayCardProps {
  dayNumber: number;
  isSelected: boolean;
  phase: Phase | null;
  onPress: () => void;
  reducedMotion: boolean;
  entranceDelay: number;
}

const DayCard: React.FC<DayCardProps> = ({
  dayNumber,
  isSelected,
  phase,
  onPress,
  reducedMotion,
  entranceDelay,
}) => {
  const scale = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  useEffect(() => {
    scale.value = withDelay(entranceDelay, withSpring(1, SPRING_CONFIGS.bouncy));
  }, [entranceDelay, scale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reducedMotion ? 1 : scale.value * pressScale.value }],
  }));

  const handleTouchStart = useCallback(
    (event: { nativeEvent: { pageX: number; pageY: number } }) => {
      touchStartX.current = event.nativeEvent.pageX;
      touchStartY.current = event.nativeEvent.pageY;
      if (!reducedMotion) {
        pressScale.value = withTiming(0.9, { duration: 100 });
      }
    },
    [reducedMotion, pressScale]
  );

  const handleTouchEnd = useCallback(
    (event: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (!reducedMotion) {
        pressScale.value = withTiming(1, { duration: 100 });
      }

      // Calculate movement distance
      const deltaX = Math.abs(event.nativeEvent.pageX - touchStartX.current);
      const deltaY = Math.abs(event.nativeEvent.pageY - touchStartY.current);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only trigger onPress if movement was minimal (< 10px = tap, not scroll)
      if (totalMovement < 10) {
        onPress();
      }
    },
    [reducedMotion, pressScale, onPress]
  );

  return (
    <Animated.View style={[styles.dayCardWrapper, cardAnimatedStyle]}>
      <Pressable
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Day ${dayNumber}`}
        accessibilityHint={`Select day ${dayNumber} of phase`}
        style={[
          styles.dayCard,
          isSelected && {
            borderWidth: 3,
            borderColor: theme.colors.sacredGold,
            backgroundColor: 'transparent',
            ...Platform.select({
              ios: {
                shadowColor: theme.colors.sacredGold,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.6,
                shadowRadius: 12,
              },
              android: {
                elevation: 12,
              },
            }),
          },
        ]}
      >
        {isSelected ? (
          <LinearGradient
            colors={[theme.colors.opacity.gold20, theme.colors.opacity.gold10]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayCardGradient}
          >
            {phase &&
              (() => {
                const icon = getPhaseIcon(phase);
                return icon === 'iconicon' ? (
                  <Ionicons
                    name="partly-sunny"
                    size={24}
                    color={theme.colors.sacredGold}
                    style={styles.dayCardIcon}
                  />
                ) : (
                  <Image source={icon} style={styles.dayCardIcon} />
                );
              })()}
            <Text style={[styles.dayCardNumber, styles.dayCardNumberSelected]}>{dayNumber}</Text>
          </LinearGradient>
        ) : (
          <>
            {phase &&
              (() => {
                const icon = getPhaseIcon(phase);
                return icon === 'iconicon' ? (
                  <Ionicons
                    name="partly-sunny"
                    size={24}
                    color={theme.colors.dust}
                    style={styles.dayCardIcon}
                  />
                ) : (
                  <Image source={icon} style={styles.dayCardIcon} />
                );
              })()}
            <Text style={styles.dayCardNumber}>{dayNumber}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

// Live Preview Card Component (currently unused)
export const _LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  selectedDate,
  selectedPhase,
  reducedMotion,
  customPattern,
  shiftSystem,
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
        : selectedPhase === 'morning'
          ? 'Morning Shift'
          : selectedPhase === 'afternoon'
            ? 'Afternoon Shift'
            : 'Days Off'
    : 'Not selected';

  return (
    <Animated.View style={[styles.previewCard, animatedStyle]}>
      <LinearGradient
        colors={[theme.colors.darkStone, theme.colors.deepVoid]}
        style={styles.previewGradient}
      >
        <Animated.View style={contentAnimatedStyle}>
          {/* Row 1: Start Date */}
          <View style={styles.previewRow}>
            <Ionicons name="calendar-outline" size={32} color={theme.colors.paleGold} />
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewLabel}>Starting:</Text>
              <Text style={styles.previewValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* Row 2: Phase */}
          <View style={styles.previewRow}>
            <Ionicons
              name={
                selectedPhase === 'day'
                  ? 'sunny'
                  : selectedPhase === 'night'
                    ? 'moon'
                    : selectedPhase === 'morning'
                      ? 'sunny-outline'
                      : selectedPhase === 'afternoon'
                        ? 'partly-sunny'
                        : 'beer'
              }
              size={32}
              color={selectedPhase ? getPhaseColor(selectedPhase) : theme.colors.dust}
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
                      customPattern,
                      shiftSystem
                    );
                    const bgColor =
                      shiftType === 'day'
                        ? theme.colors.shiftVisualization.dayShift
                        : shiftType === 'night'
                          ? theme.colors.shiftVisualization.nightShift
                          : shiftType === 'morning'
                            ? '#FCD34D'
                            : shiftType === 'afternoon'
                              ? '#FB923C'
                              : theme.colors.shiftVisualization.daysOff;

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
                            {shiftType === 'day'
                              ? 'D'
                              : shiftType === 'night'
                                ? 'N'
                                : shiftType === 'morning'
                                  ? 'M'
                                  : shiftType === 'afternoon'
                                    ? 'A'
                                    : 'O'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Row 4: Confirmation */}
          {selectedDate && selectedPhase && (
            <View style={styles.previewConfirmation}>
              <Ionicons name="rocket" size={24} color={theme.colors.success} />
              <Text style={styles.previewConfirmationText}>Your first cycle begins here</Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

// Continue Button Component - Simplified to avoid animation crashes
const ContinueButton: React.FC<{
  enabled: boolean;
  onPress: () => void;
  reducedMotion: boolean;
}> = ({ enabled, onPress }) => {
  return (
    <View style={styles.continueButtonContainer}>
      <Pressable
        onPress={() => {
          if (enabled) {
            HAPTIC_PATTERNS.SUCCESS();
            onPress();
          }
        }}
        disabled={!enabled}
        style={[styles.continueButton, !enabled && styles.continueButtonDisabled]}
      >
        <LinearGradient
          colors={
            enabled
              ? [theme.colors.sacredGold, theme.colors.brightGold]
              : [theme.colors.shadow, theme.colors.shadow]
          }
          style={styles.continueGradient}
        >
          <Ionicons name="checkmark-circle" size={28} color={theme.colors.paper} />
          <Text style={styles.continueButtonText}>Set Shift Times</Text>
          <Ionicons name="arrow-forward" size={24} color={theme.colors.paper} />
        </LinearGradient>
      </Pressable>
    </View>
  );
};

// Header Component with Entrance Animation
const HeaderSection: React.FC<{
  reducedMotion: boolean;
  currentPhase?: Phase | null;
  selectedDay?: number | null;
}> = ({ reducedMotion, currentPhase, selectedDay }) => {
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Header entrance: 0ms delay
    titleOpacity.value = withTiming(1, { duration: 300 });
    subtitleOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
  }, [titleOpacity, subtitleOpacity]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : subtitleOpacity.value,
  }));

  // Create context-aware subtitle
  const subtitle = currentPhase
    ? `You're on ${getPhaseLabel(currentPhase, selectedDay)} right now—pick today or any date, and we'll map out your whole calendar from there`
    : 'Pick the date you want your calendar to start from—most people choose today';

  return (
    <>
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        When Does Your Rotation Start?
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>{subtitle}</Animated.Text>
    </>
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
  const shiftSystem: ShiftSystem = (data.shiftSystem as ShiftSystem) || ShiftSystem.TWO_SHIFT;
  // Smart default: today
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayDate());
  const [reducedMotion, setReducedMotion] = useState(false);
  const screenOpacity = useSharedValue(1);
  const screenSlideX = useSharedValue(0);

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

  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateX: screenSlideX.value }],
  }));

  // Get pattern data from context
  const pattern = data.patternType || ShiftPattern.CUSTOM;

  // Convert predefined patterns to numeric values
  const getPatternValues = useCallback(
    (patternType: ShiftPattern) => {
      let basePattern;
      switch (patternType) {
        case ShiftPattern.STANDARD_4_4_4:
          basePattern = { daysOn: 4, nightsOn: 4, daysOff: 4 };
          break;
        case ShiftPattern.STANDARD_7_7_7:
          basePattern = { daysOn: 7, nightsOn: 7, daysOff: 7 };
          break;
        case ShiftPattern.STANDARD_2_2_3:
          basePattern = { daysOn: 2, nightsOn: 2, daysOff: 3 };
          break;
        case ShiftPattern.STANDARD_5_5_5:
          basePattern = { daysOn: 5, nightsOn: 5, daysOff: 5 };
          break;
        case ShiftPattern.STANDARD_3_3_3:
          basePattern = { daysOn: 3, nightsOn: 3, daysOff: 3 };
          break;
        case ShiftPattern.STANDARD_10_10_10:
          basePattern = { daysOn: 10, nightsOn: 10, daysOff: 10 };
          break;
        case ShiftPattern.CONTINENTAL:
          basePattern = { daysOn: 2, nightsOn: 2, daysOff: 4 };
          break;
        case ShiftPattern.PITMAN:
          basePattern = { daysOn: 2, nightsOn: 2, daysOff: 3 };
          break;
        case ShiftPattern.CUSTOM:
        default:
          basePattern = data.customPattern || { daysOn: 0, nightsOn: 0, daysOff: 0 };
          break;
      }

      // Convert to 3-shift structure if 3-shift system is selected
      if (shiftSystem === ShiftSystem.THREE_SHIFT) {
        // Check if pattern already has 3-shift data (from custom pattern)
        const hasThreeShiftData =
          'morningOn' in basePattern || 'afternoonOn' in basePattern || 'nightOn' in basePattern;

        if (hasThreeShiftData) {
          // Already a 3-shift pattern, return as-is
          const pattern = basePattern as {
            morningOn?: number;
            afternoonOn?: number;
            nightOn?: number;
            daysOff: number;
          };
          return {
            morningOn: pattern.morningOn || 0,
            afternoonOn: pattern.afternoonOn || 0,
            nightOn: pattern.nightOn || 0,
            daysOff: pattern.daysOff,
          };
        }

        // Convert from 2-shift pattern (predefined patterns like 4-4-4)
        const daysOn = basePattern.daysOn || 0;
        const nightsOn = basePattern.nightsOn || 0;

        // For 3-shift: expand the pattern to include separate morning and afternoon
        // Example: 4-4-4 (2-shift, 12-day) → 4-4-4-4 (3-shift, 16-day)
        return {
          morningOn: daysOn, // Same number of morning shifts as days
          afternoonOn: daysOn, // Same number of afternoon shifts as days
          nightOn: nightsOn, // Keep night shifts
          daysOff: basePattern.daysOff, // Keep days off
        };
      }

      // Return 2-shift structure as-is
      return basePattern;
    },
    [data.customPattern, shiftSystem]
  );

  const customPattern = useMemo(() => getPatternValues(pattern), [pattern, getPatternValues]);

  // Check if user can continue (requires date selection and phaseOffset from Phase Selector)
  const canContinue = selectedDate !== null && data.phaseOffset !== undefined;

  const handleContinue = useCallback(() => {
    if (!canContinue || !selectedDate || data.phaseOffset === undefined) return;

    // Use phaseOffset from Phase Selector screen (already saved in context)
    updateData({
      startDate: new Date(selectedDate),
    });

    // Navigate with haptic feedback
    HAPTIC_PATTERNS.SUCCESS();

    // Defer navigation to allow animations to settle and prevent crashes
    InteractionManager.runAfterInteractions(() => {
      if (onContinue) {
        onContinue();
      } else {
        navigation.navigate('ShiftTimeInput');
      }
    });
  }, [canContinue, selectedDate, data.phaseOffset, updateData, onContinue, navigation]);

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
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.START_DATE}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <Animated.View style={[{ flex: 1 }, screenAnimatedStyle]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with entrance animation */}
          <HeaderSection reducedMotion={reducedMotion} currentPhase={null} selectedDay={null} />

          {/* Interactive Calendar */}
          <InteractiveCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            reducedMotion={reducedMotion}
            customPattern={customPattern}
            phaseOffset={data.phaseOffset ?? 0}
            shiftSystem={shiftSystem}
          />

          {/* Guidance Section */}
          <View style={styles.guidanceSection}>
            <View style={styles.guidanceHeader}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={theme.colors.sacredGold}
              />
              <Text style={styles.guidanceTitle}>Picking your date</Text>
            </View>
            <Text style={styles.guidanceText}>
              Most people pick today so their calendar starts right away. But you can pick any
              date—we&apos;ll calculate your rotation from there.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

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
    backgroundColor: theme.colors.deepVoid,
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
    color: theme.colors.paper,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
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
    color: theme.colors.dust,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },

  // Calendar
  calendarContainer: {
    marginBottom: theme.spacing.xl,
    paddingLeft: theme.spacing.md,
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
    color: theme.colors.sacredGold,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  weekdayLabel: {
    fontSize: 12,
    color: theme.colors.dust,
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
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: theme.colors.paleGold,
  },
  dayCellDisabled: {
    opacity: 0.4,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.paper,
  },
  dayTextSelected: {
    color: theme.colors.paper,
    fontWeight: 'bold',
  },
  dayTextDisabled: {
    color: theme.colors.shadow,
  },
  dayTextOtherMonth: {
    color: theme.colors.dust,
  },

  // Phase Selector
  phaseSelectorContainer: {
    marginBottom: theme.spacing.xl,
  },
  phaseSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  phaseCardsScrollContent: {
    paddingTop: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  phaseCardWrapper: {
    width: 140,
  },
  phaseCard: {
    height: 120,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    overflow: 'hidden',
  },
  phaseCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    backgroundColor: theme.colors.opacity.gold10,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  phaseCardGradient: {
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  phaseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  phaseIcon: {
    width: 32,
    height: 32,
  },
  phaseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
  },

  // Day Within Phase Selector
  dayWithinPhaseSelectorContainer: {
    marginBottom: theme.spacing.xl,
  },
  dayWithinPhaseHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  dayCardsScroll: {
    marginBottom: theme.spacing.md,
  },
  dayCardsScrollContent: {
    paddingTop: theme.spacing.xs,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    gap: 20,
  },
  dayCardWrapper: {
    width: 100,
  },
  dayCard: {
    width: 100,
    height: 100,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayCardGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCardIcon: {
    width: 28,
    height: 28,
    marginBottom: 4,
  },
  dayCardNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.dust,
  },
  dayCardNumberSelected: {
    color: theme.colors.sacredGold,
  },

  // Live Preview Card
  previewCard: {
    marginBottom: theme.spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  previewGradient: {
    borderRadius: 16,
    padding: theme.spacing.lg,
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
    color: theme.colors.dust,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 16,
    color: theme.colors.sacredGold,
    fontWeight: '600',
  },
  previewConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  previewConfirmationText: {
    fontSize: 14,
    color: theme.colors.dust,
    fontStyle: 'italic',
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
    backgroundColor: theme.colors.deepVoid,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.opacity.white10,
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
        shadowColor: theme.colors.deepVoid,
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
    color: theme.colors.paper,
  },
  // Calendar - Enhanced
  shiftIcon: {
    width: 18,
    height: 18,
    position: 'absolute',
    top: -2,
  },
  dayTextWithIcon: {
    marginTop: 12,
  },
  calendarLegend: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  calendarLegendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: theme.spacing.xs,
  },
  legendIconImage: {
    width: 20,
    height: 20,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  // Selected Date Card
  selectedDateCard: {
    marginVertical: theme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  selectedDateGradient: {
    borderRadius: 12,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  selectedDateIcon: {
    fontSize: 24,
  },
  selectedDateLabel: {
    fontSize: 14,
    color: theme.colors.dust,
    fontWeight: '500',
  },
  selectedDateText: {
    fontSize: 16,
    color: theme.colors.sacredGold,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Live Preview - Enhanced with 7-day timeline
  previewTimelineContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.opacity.white10,
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
    borderColor: theme.colors.paleGold,
  },
  previewTimelineDayLabel: {
    fontSize: 10,
    color: theme.colors.paper,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewTimelineShiftLabel: {
    fontSize: 14,
    color: theme.colors.paper,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
  // Guidance Section
  guidanceSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.opacity.gold10,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.sacredGold,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.sacredGold,
  },
  guidanceText: {
    fontSize: 14,
    color: theme.colors.dust,
    lineHeight: 20,
  },
});
