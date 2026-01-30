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
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
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
  customPattern?: { daysOn: number; nightsOn: number; daysOff: number };
  reducedMotion: boolean;
}

interface CalendarProps {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  reducedMotion: boolean;
}

interface PhaseSelectorProps {
  selectedPhase: 'day' | 'night' | 'off' | null;
  onPhaseSelect: (phase: 'day' | 'night' | 'off') => void;
  pattern: { daysOn: number; nightsOn: number; daysOff: number };
  reducedMotion: boolean;
}

interface LivePreviewCardProps {
  selectedDate: string | null;
  selectedPhase: 'day' | 'night' | 'off' | null;
  pattern: { daysOn: number; nightsOn: number; daysOff: number };
  reducedMotion: boolean;
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

// Pattern Summary Card Component
const PatternSummaryCard: React.FC<PatternSummaryCardProps> = ({
  pattern,
  customPattern,
  reducedMotion,
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

  return (
    <Animated.View style={[styles.patternCard, animatedStyle]}>
      <LinearGradient colors={[COLORS.softStone, COLORS.darkStone]} style={styles.patternGradient}>
        {/* Placeholder for 3D icon */}
        <View style={styles.patternIconContainer}>
          <Ionicons name="calendar" size={64} color={COLORS.paleGold} />
        </View>

        <Text style={styles.patternName}>{patternName}</Text>

        {customPattern && (
          <>
            <Text style={styles.patternDetails}>
              {customPattern.daysOn} Days • {customPattern.nightsOn} Nights •{' '}
              {customPattern.daysOff} Off
            </Text>

            {/* Mini Cycle Preview */}
            <View style={styles.miniCyclePreview}>
              {[
                ...Array(customPattern.daysOn).fill('day'),
                ...Array(customPattern.nightsOn).fill('night'),
                ...Array(customPattern.daysOff).fill('off'),
              ].map((type, index) => (
                <View
                  key={index}
                  style={[
                    styles.miniCycleBlock,
                    {
                      backgroundColor:
                        type === 'day'
                          ? COLORS.dayShift
                          : type === 'night'
                            ? COLORS.nightShift
                            : COLORS.daysOff,
                    },
                  ]}
                />
              ))}
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
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(50);

  useEffect(() => {
    opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    slideY.value = withDelay(200, withSpring(0, SPRING_CONFIGS.bouncy));
  }, [opacity, slideY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slideY.value }],
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

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const dateString = date.toISOString().split('T')[0];
          const isSelected = selectedDate === dateString;
          const isToday =
            date.toDateString() === new Date().toDateString() &&
            date.getMonth() === currentMonth.getMonth();
          const isValid = isDateValid(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

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
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  !isValid && styles.dayTextDisabled,
                  !isCurrentMonth && styles.dayTextOtherMonth,
                ]}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  pattern: _pattern,
  reducedMotion,
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

          {/* Row 3: Confirmation */}
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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
  const customPattern = useMemo(
    () => data.customPattern || { daysOn: 0, nightsOn: 0, daysOff: 0 },
    [data.customPattern]
  );

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
        />

        {/* Interactive Calendar */}
        <InteractiveCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          reducedMotion={reducedMotion}
        />

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
          pattern={customPattern}
          reducedMotion={reducedMotion}
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
});
