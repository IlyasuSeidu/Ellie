/**
 * Premium Shift Time Input Screen (Step 6 of 7)
 *
 * Collects essential shift timing data to accurately calculate work hours
 * and enable shift notifications.
 *
 * Data collected:
 * - Shift start time (HH:MM format with AM/PM)
 * - Shift duration (8 hours or 12 hours)
 * - Shift end time (auto-calculated)
 * - Shift type (day/night - auto-detected)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  AccessibilityInfo,
  Image,
  ImageSourcePropType,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding, OnboardingData } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ShiftPattern, ShiftSystem } from '@/types';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import {
  convertTo24Hour,
  calculateEndTime,
  detectShiftType,
  formatTimeForDisplay,
  getRequiredShiftTypes,
} from '@/utils/shiftTimeUtils';

// Helper to get pattern display info
const getPatternInfo = (
  patternType: ShiftPattern | undefined,
  customPattern: OnboardingData['customPattern'] | undefined,
  shiftSystem: ShiftSystem | '2-shift' | '3-shift' | undefined
): { name: string; stats: string } => {
  if (patternType === ShiftPattern.CUSTOM && customPattern) {
    // Handle 3-shift custom pattern
    if (shiftSystem === ShiftSystem.THREE_SHIFT) {
      const morningOn = customPattern.morningOn || 0;
      const afternoonOn = customPattern.afternoonOn || 0;
      const nightOn = customPattern.nightOn || 0;
      const daysOff = customPattern.daysOff || 0;
      const total = morningOn + afternoonOn + nightOn + daysOff;

      return {
        name: 'Custom Pattern',
        stats: `${total}-day cycle • ${morningOn}M/${afternoonOn}A/${nightOn}N/${daysOff}O`,
      };
    }

    // Handle 2-shift custom pattern
    const daysOn = customPattern.daysOn || 0;
    const nightsOn = customPattern.nightsOn || 0;
    const daysOff = customPattern.daysOff || 0;
    const total = daysOn + nightsOn + daysOff;

    return {
      name: 'Custom Pattern',
      stats: `${total}-day cycle • ${daysOn}D/${nightsOn}N/${daysOff}O`,
    };
  }

  switch (patternType) {
    case ShiftPattern.STANDARD_4_4_4:
      return { name: '4-4-4 Cycle', stats: '12-day cycle • 4D/4N/4O' };
    case ShiftPattern.STANDARD_7_7_7:
      return { name: '7-7-7 Cycle', stats: '21-day cycle • 7D/7N/7O' };
    case ShiftPattern.STANDARD_2_2_3:
      return { name: '2-2-3 Cycle', stats: '7-day cycle • 2D/2N/3O' };
    case ShiftPattern.STANDARD_5_5_5:
      return { name: '5-5-5 Cycle', stats: '15-day cycle • 5D/5N/5O' };
    case ShiftPattern.STANDARD_3_3_3:
      return { name: '3-3-3 Cycle', stats: '9-day cycle • 3D/3N/3O' };
    case ShiftPattern.STANDARD_10_10_10:
      return { name: '10-10-10 Cycle', stats: '30-day cycle • 10D/10N/10O' };
    case ShiftPattern.CONTINENTAL:
      return { name: 'Continental', stats: '8-day cycle • 2D/2N/4O' };
    case ShiftPattern.PITMAN:
      return { name: 'Pitman', stats: '7-day cycle • 2D/2N/3O' };
    default:
      return { name: 'Custom Pattern', stats: 'Custom cycle • Set your schedule' };
  }
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

// Preset shift configurations
interface ShiftPreset {
  id: string;
  label: string;
  startTime: string; // HH:MM (12-hour format)
  period: 'AM' | 'PM';
  duration: 8 | 12;
  icon: keyof typeof Ionicons.glyphMap | string; // Can be Ionicon name or emoji
  type: 'day' | 'night' | 'morning' | 'afternoon';
  endTimeLabel: string;
  shiftSystem: ShiftSystem;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  // 2-Shift (12-hour) Presets
  {
    id: 'early_day',
    label: 'Early Day Shift',
    startTime: '06:00',
    period: 'AM',
    duration: 12,
    icon: 'sunny',
    type: 'day',
    endTimeLabel: 'Ends at 6:00 PM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'standard_day',
    label: 'Standard Day Shift',
    startTime: '07:00',
    period: 'AM',
    duration: 12,
    icon: 'partly-sunny',
    type: 'day',
    endTimeLabel: 'Ends at 7:00 PM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'late_day',
    label: 'Late Day Shift',
    startTime: '01:00',
    period: 'PM',
    duration: 12,
    icon: 'cloudy',
    type: 'day',
    endTimeLabel: 'Ends at 1:00 AM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'night',
    label: 'Night Shift',
    startTime: '10:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    endTimeLabel: 'Ends at 10:00 AM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },

  // 3-Shift (8-hour) Presets
  {
    id: 'morning_shift',
    label: 'Morning Shift',
    startTime: '06:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny-outline',
    type: 'morning',
    endTimeLabel: 'Ends at 2:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'afternoon_shift',
    label: 'Afternoon Shift',
    startTime: '02:00',
    period: 'PM',
    duration: 8,
    icon: 'partly-sunny-outline',
    type: 'afternoon',
    endTimeLabel: 'Ends at 10:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'night_shift_8h',
    label: 'Night Shift',
    startTime: '10:00',
    period: 'PM',
    duration: 8,
    icon: 'moon-outline',
    type: 'night',
    endTimeLabel: 'Ends at 6:00 AM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // Custom (available for both)
  {
    id: 'custom',
    label: 'Custom',
    startTime: '',
    period: 'AM',
    duration: 12,
    icon: 'create-outline',
    type: 'day',
    endTimeLabel: '',
    shiftSystem: ShiftSystem.TWO_SHIFT, // Default to 2-shift
  },
];

// Component props
interface PremiumShiftTimeInputScreenProps {
  onContinue?: () => void;
  onBack?: () => void;
  testID?: string;
}

export const PremiumShiftTimeInputScreen: React.FC<PremiumShiftTimeInputScreenProps> = ({
  onContinue,
  onBack,
  testID = 'premium-shift-time-input-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();
  const shiftSystem: '2-shift' | '3-shift' = data.shiftSystem || ShiftSystem.TWO_SHIFT;

  // Set duration based on shift system (locked)
  const lockedDuration: 8 | 12 = shiftSystem === ShiftSystem.THREE_SHIFT ? 8 : 12;

  // Determine required shift types based on pattern
  const requiredShiftTypes = getRequiredShiftTypes(
    shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift' : '2-shift',
    data.customPattern
  );

  // Multi-stage state: track which shift type we're currently collecting
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentShiftType = requiredShiftTypes[currentStageIndex];
  const totalStages = requiredShiftTypes.length;
  const isLastStage = currentStageIndex === totalStages - 1;

  // Store collected shift times for all stages
  const [collectedShiftTimes, setCollectedShiftTimes] = useState<
    Record<string, { startTime: string; endTime: string; duration: 8 | 12 }>
  >({});

  // Filter presets by shift system AND current shift type
  const filteredPresets = SHIFT_PRESETS.filter((preset) => {
    if (preset.id === 'custom') return true;
    if (preset.shiftSystem !== shiftSystem) return false;
    // Only filter by shift type when collecting multiple shift types
    if (totalStages > 1) {
      return preset.type === currentShiftType;
    }
    // For single-stage flow, show all presets for this shift system
    return true;
  });

  // State for current stage input
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState('06');
  const [customMinutes, setCustomMinutes] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('AM');
  const [duration, setDuration] = useState<8 | 12>(lockedDuration);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  // Animation values
  const floatingY = useSharedValue(0);

  // Start continuous animations
  useEffect(() => {
    if (!reducedMotion) {
      // Floating animation for pattern card
      floatingY.value = withRepeat(
        withSequence(
          withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [reducedMotion, floatingY]);

  // Pulse animation removed for stability - was causing crashes

  // Calculated values
  const getStartTime24h = useCallback((): string => {
    if (selectedPreset === 'custom') {
      const timeStr = `${customHours.padStart(2, '0')}:${customMinutes.padStart(2, '0')}`;
      return convertTo24Hour(timeStr, customPeriod);
    }

    const preset = SHIFT_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset) return '';

    return convertTo24Hour(preset.startTime, preset.period);
  }, [selectedPreset, customHours, customMinutes, customPeriod]);

  const getEndTime24h = useCallback((): string => {
    const startTime = getStartTime24h();
    if (!startTime) return '';

    return calculateEndTime(startTime, duration);
  }, [getStartTime24h, duration]);

  const getShiftType = useCallback((): 'day' | 'night' | 'morning' | 'afternoon' => {
    const startTime = getStartTime24h();
    if (!startTime) return 'day';

    const shiftSystem = data.shiftSystem as ShiftSystem;
    return detectShiftType(
      startTime,
      shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift' : '2-shift'
    );
  }, [getStartTime24h, data.shiftSystem]);

  const isValid = useCallback((): boolean => {
    if (!selectedPreset) return false;

    if (selectedPreset === 'custom') {
      const hours = parseInt(customHours, 10);
      const minutes = parseInt(customMinutes, 10);

      if (isNaN(hours) || isNaN(minutes)) return false;
      if (hours < 1 || hours > 12) return false;
      if (minutes < 0 || minutes > 59) return false;
    }

    return true;
  }, [selectedPreset, customHours, customMinutes]);

  // Handlers
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setTimeError(null);

    if (presetId === 'custom') {
      setShowCustomInput(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      setShowCustomInput(false);
      const preset = SHIFT_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setDuration(preset.duration);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePeriodToggle = (period: 'AM' | 'PM') => {
    setCustomPeriod(period);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomTimeChange = (field: 'hours' | 'minutes', value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');

    if (field === 'hours') {
      if (cleaned.length <= 2) {
        setCustomHours(cleaned);
      }
    } else {
      if (cleaned.length <= 2) {
        setCustomMinutes(cleaned);
      }
    }

    setTimeError(null);
  };

  const validateCustomTime = useCallback(() => {
    const hours = parseInt(customHours, 10);
    const minutes = parseInt(customMinutes, 10);

    if (isNaN(hours) || hours < 1 || hours > 12) {
      setTimeError('Hours must be between 1 and 12');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      setTimeError('Minutes must be between 0 and 59');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    setTimeError(null);
    return true;
  }, [customHours, customMinutes]);

  const handleContinue = useCallback(() => {
    if (!isValid()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (selectedPreset === 'custom' && !validateCustomTime()) {
      return;
    }

    const startTime24h = getStartTime24h();
    const endTime24h = getEndTime24h();

    // Save current stage's shift times
    const updatedShiftTimes = {
      ...collectedShiftTimes,
      [currentShiftType]: {
        startTime: startTime24h,
        endTime: endTime24h,
        duration,
      },
    };
    setCollectedShiftTimes(updatedShiftTimes);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // If this is the last stage, save all shift times and navigate
    if (isLastStage) {
      // Build the new shiftTimes structure
      const shiftTimes: OnboardingData['shiftTimes'] = {};

      if (shiftSystem === ShiftSystem.TWO_SHIFT) {
        if (updatedShiftTimes.day) {
          shiftTimes.dayShift = updatedShiftTimes.day;
        }
        if (updatedShiftTimes.night) {
          shiftTimes.nightShift = updatedShiftTimes.night;
        }
      } else {
        // 3-shift system
        if (updatedShiftTimes.morning) {
          shiftTimes.morningShift = updatedShiftTimes.morning;
        }
        if (updatedShiftTimes.afternoon) {
          shiftTimes.afternoonShift = updatedShiftTimes.afternoon;
        }
        if (updatedShiftTimes.night) {
          shiftTimes.nightShift3 = updatedShiftTimes.night;
        }
      }

      // Save to context with new structure
      updateData({
        shiftTimes,
        // Also save to legacy fields for backwards compatibility (first shift type)
        shiftStartTime: updatedShiftTimes[requiredShiftTypes[0]]?.startTime,
        shiftEndTime: updatedShiftTimes[requiredShiftTypes[0]]?.endTime,
        shiftDuration: duration,
        shiftType: getShiftType(),
        isCustomShiftTime: selectedPreset === 'custom',
      });

      if (onContinue) {
        onContinue();
      }

      // Navigate to completion screen (Step 8)
      navigation.navigate('Completion');
    } else {
      // Move to next stage
      setCurrentStageIndex(currentStageIndex + 1);
      // Reset input state for next stage
      setSelectedPreset(null);
      setCustomHours('06');
      setCustomMinutes('00');
      setCustomPeriod(currentShiftType === 'night' ? 'PM' : 'AM');
      setShowCustomInput(false);
      setTimeError(null);
    }
  }, [
    isValid,
    selectedPreset,
    validateCustomTime,
    getStartTime24h,
    getEndTime24h,
    getShiftType,
    duration,
    currentShiftType,
    collectedShiftTimes,
    isLastStage,
    currentStageIndex,
    requiredShiftTypes,
    shiftSystem,
    updateData,
    onContinue,
    navigation,
  ]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If we're not on the first stage, go back to previous stage
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
      // Reset input state
      setSelectedPreset(null);
      setCustomHours('06');
      setCustomMinutes('00');
      setCustomPeriod('AM');
      setShowCustomInput(false);
      setTimeError(null);
    } else {
      // On first stage, go back to previous screen
      if (onBack) {
        onBack();
      } else {
        navigation.goBack();
      }
    }
  }, [currentStageIndex, navigation, onBack]);

  // Animated styles
  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : floatingY.value }],
  }));

  // Note: Using regular styles instead of animated styles to avoid worklet crashes
  // The pulse animation was removed for stability

  // Get pattern display info from context
  const patternInfo = getPatternInfo(data.patternType, data.customPattern, shiftSystem);

  // Get stage-specific title
  const getStageTitle = (): string => {
    if (totalStages === 1) {
      return 'When Do Your Shifts Start?';
    }

    switch (currentShiftType) {
      case 'day':
        return 'Day Shift Times';
      case 'night':
        return 'Night Shift Times';
      case 'morning':
        return 'Morning Shift Times';
      case 'afternoon':
        return 'Afternoon Shift Times';
      default:
        return 'Shift Times';
    }
  };

  // Get stage-specific subtitle
  const getStageSubtitle = (): string => {
    if (totalStages === 1) {
      return "Pick what time you clock in each day—we'll use this to track your hours and set reminders";
    }

    const shiftTypeLabel =
      currentShiftType === 'day'
        ? 'day shifts'
        : currentShiftType === 'night'
          ? 'night shifts'
          : currentShiftType === 'morning'
            ? 'morning shifts'
            : 'afternoon shifts';

    return `Your pattern includes ${shiftTypeLabel}. Set the start time for these shifts.`;
  };

  // Get pattern icon based on pattern type
  const patternIcon = React.useMemo((): ImageSourcePropType | null => {
    switch (data.patternType) {
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
        return require('../../../../assets/onboarding/icons/consolidated/shift-pattern-custom.png');
      default:
        return null;
    }
  }, [data.patternType]);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.SHIFT_TIME_INPUT}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300)}
            style={styles.header}
          >
            {totalStages > 1 && (
              <Text style={styles.stageIndicator}>
                Step {currentStageIndex + 1} of {totalStages}
              </Text>
            )}
            <Text style={styles.title}>{getStageTitle()}</Text>
            <Text style={styles.subtitle}>{getStageSubtitle()}</Text>
          </Animated.View>

          {/* Pattern Summary Card */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(400).springify()}
            style={styles.patternCard}
          >
            <Animated.View style={floatingStyle}>
              <LinearGradient
                colors={[theme.colors.softStone, theme.colors.darkStone]}
                style={styles.patternGradient}
              >
                <View style={styles.patternIconContainer}>
                  {patternIcon ? (
                    <Image source={patternIcon} style={styles.patternIcon} resizeMode="contain" />
                  ) : (
                    <Ionicons name="calendar" size={80} color={theme.colors.sacredGold} />
                  )}
                </View>
                <Text style={styles.patternName}>{patternInfo.name}</Text>
                <Text style={styles.patternStats}>{patternInfo.stats}</Text>
              </LinearGradient>
            </Animated.View>
          </Animated.View>

          {/* Guidance Card */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(100)}
            style={styles.guidanceCard}
          >
            <View style={styles.guidanceHeader}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={theme.colors.sacredGold}
              />
              <Text style={styles.guidanceTitle}>About shift times</Text>
            </View>
            <Text style={styles.guidanceText}>
              Your {patternInfo.name} rotation stays the same—but we need to know what time your
              shifts start so we can track your hours and remind you before each shift.
            </Text>

            {/* Shift Type Definitions */}
            <View style={styles.shiftTypeDefinitions}>
              <Text style={styles.shiftTypeDefinitionsTitle}>
                {shiftSystem === ShiftSystem.TWO_SHIFT ? 'Day vs Night:' : 'Shift types:'}
              </Text>
              {shiftSystem === ShiftSystem.TWO_SHIFT ? (
                <Text style={styles.shiftTypeDefinitionsText}>
                  Day shifts start 6 AM–6 PM • Night shifts start 6 PM–6 AM
                </Text>
              ) : (
                <Text style={styles.shiftTypeDefinitionsText}>
                  Morning: 6 AM–2 PM • Afternoon: 2 PM–10 PM • Night: 10 PM–6 AM
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Preset Shift Time Cards Section */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(200)}
            style={styles.presetsSection}
          >
            <View style={styles.presetsSectionHeader}>
              <Ionicons name="time-outline" size={32} color={theme.colors.sacredGold} />
              <Text style={styles.presetsSectionTitle}>Pick a Common Start Time</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScrollContent}
              snapToInterval={156} // 140px card + 16px gap
              decelerationRate="fast"
            >
              {filteredPresets.map((preset, index) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={selectedPreset === preset.id}
                  onSelect={handlePresetSelect}
                  index={index}
                  reducedMotion={reducedMotion}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Custom Time Input Section */}
          {showCustomInput && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(400).springify()}
              style={styles.customInputSection}
            >
              <LinearGradient
                colors={[theme.colors.softStone, theme.colors.darkStone]}
                style={styles.customInputCard}
              >
                {/* Shift Start Time */}
                <View style={styles.inputRow}>
                  <View style={styles.inputLabelContainer}>
                    <Text style={styles.inputLabel}>What time do you usually clock in?</Text>
                    <Text style={styles.inputHelper}>Use 12-hour format (e.g., 6:00 AM)</Text>
                  </View>
                  <View style={styles.timeInputContainer}>
                    <TextInput
                      style={[styles.timeInput, timeError && styles.timeInputError]}
                      value={customHours}
                      onChangeText={(value) => handleCustomTimeChange('hours', value)}
                      onBlur={validateCustomTime}
                      placeholder="06"
                      placeholderTextColor={theme.colors.shadow}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <Text style={styles.timeSeparator}>:</Text>
                    <TextInput
                      style={[styles.timeInput, timeError && styles.timeInputError]}
                      value={customMinutes}
                      onChangeText={(value) => handleCustomTimeChange('minutes', value)}
                      onBlur={validateCustomTime}
                      placeholder="00"
                      placeholderTextColor={theme.colors.shadow}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <View style={styles.periodSelector}>
                      <Pressable
                        style={[
                          styles.periodButton,
                          customPeriod === 'AM' && styles.periodButtonSelected,
                        ]}
                        onPress={() => handlePeriodToggle('AM')}
                      >
                        <Text
                          style={[
                            styles.periodButtonText,
                            customPeriod === 'AM' && styles.periodButtonTextSelected,
                          ]}
                        >
                          AM
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.periodButton,
                          customPeriod === 'PM' && styles.periodButtonSelected,
                        ]}
                        onPress={() => handlePeriodToggle('PM')}
                      >
                        <Text
                          style={[
                            styles.periodButtonText,
                            customPeriod === 'PM' && styles.periodButtonTextSelected,
                          ]}
                        >
                          PM
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {timeError && <Text style={styles.errorText}>{timeError}</Text>}
                </View>

                {/* Live Preview Card */}
                {isValid() && (
                  <Animated.View
                    entering={reducedMotion ? undefined : FadeIn.duration(200)}
                    style={styles.livePreviewCard}
                  >
                    <Ionicons
                      name="arrow-forward-circle"
                      size={24}
                      color={theme.colors.sacredGold}
                    />
                    <View style={styles.livePreviewContent}>
                      <Text style={styles.livePreviewLabel}>Your shift:</Text>
                      <Text style={styles.livePreviewTime}>
                        {formatTimeForDisplay(getStartTime24h())} →{' '}
                        {formatTimeForDisplay(getEndTime24h())}
                      </Text>
                      <Text style={styles.livePreviewDuration}>{duration} hours</Text>
                    </View>
                  </Animated.View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {/* Shift Type Auto-Detection Card */}
          {selectedPreset && isValid() && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInUp.duration(300)}
              style={[
                styles.detectionCard,
                getShiftType() === 'day' ||
                getShiftType() === 'morning' ||
                getShiftType() === 'afternoon'
                  ? styles.detectionCardDay
                  : styles.detectionCardNight,
              ]}
            >
              <Ionicons name="bulb" size={24} color={theme.colors.sacredGold} />
              <View style={styles.detectionContent}>
                <Text
                  style={[
                    styles.detectionText,
                    getShiftType() === 'day' ||
                    getShiftType() === 'morning' ||
                    getShiftType() === 'afternoon'
                      ? styles.detectionTextDay
                      : styles.detectionTextNight,
                  ]}
                >
                  {getShiftType() === 'day'
                    ? '☀️ Daytime start'
                    : getShiftType() === 'morning'
                      ? '🌅 Morning start'
                      : getShiftType() === 'afternoon'
                        ? '🌤️ Afternoon start'
                        : '🌙 Night start'}
                </Text>
                <Text style={styles.detectionHelper}>This is when your shift begins</Text>
              </View>
            </Animated.View>
          )}

          {/* Tips Section */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(1000)}
            style={styles.tipsSection}
          >
            <View style={styles.tipIconContainer}>
              <Ionicons name="bulb-outline" size={40} color={theme.colors.sacredGold} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                {shiftSystem === ShiftSystem.TWO_SHIFT
                  ? 'Not sure? Most shift workers on 12-hour rotations start at 6 AM or 6 PM. Pick the closest match—you can adjust it later in settings if needed.'
                  : 'Not sure? Most 8-hour shift workers start at 6 AM, 2 PM, or 10 PM. Pick the closest match—you can adjust it later in settings if needed.'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Navigation Buttons */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.duration(400).springify().delay(1200)}
        >
          <View style={styles.bottomNav}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              onPress={handleBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.continueButtonContainer,
                pressed && isValid() && styles.continueButtonPressed,
              ]}
              onPress={handleContinue}
              disabled={!isValid()}
              accessibilityLabel={
                totalStages === 1
                  ? 'Continue to next step'
                  : isLastStage
                    ? 'Save shift times and continue'
                    : `Continue to ${requiredShiftTypes[currentStageIndex + 1]} shift times`
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid() }}
            >
              <View style={[styles.continueButton, { opacity: isValid() ? 1 : 0.5 }]}>
                <LinearGradient
                  colors={[theme.colors.brightGold, theme.colors.sacredGold]}
                  style={styles.continueGradient}
                >
                  <Ionicons name="checkmark" size={24} color={theme.colors.paper} />
                </LinearGradient>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

// Preset Card Component
interface PresetCardProps {
  preset: ShiftPreset;
  selected: boolean;
  onSelect: (id: string) => void;
  index: number;
  reducedMotion: boolean;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  selected,
  onSelect,
  index,
  reducedMotion,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.98, { damping: 20 }), withSpring(1, { damping: 20 }));
    onSelect(preset.id);
  };

  const isCustom = preset.id === 'custom';

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(600).delay(400 + index * 100)}
      style={styles.presetCard}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          style={[
            styles.presetCardInner,
            selected && styles.presetCardSelected,
            isCustom && styles.presetCardCustom,
            preset.type === 'night' && !isCustom && styles.presetCardNight,
          ]}
        >
          {!isCustom && preset.duration === 12 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{preset.duration}h</Text>
            </View>
          )}
          {!isCustom && preset.duration === 8 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{preset.duration}h</Text>
            </View>
          )}

          <View
            style={[
              styles.presetIconCircle,
              preset.type === 'day' && !isCustom && styles.presetIconCircleDay,
              preset.type === 'night' && !isCustom && styles.presetIconCircleNight,
              isCustom && styles.presetIconCircleCustom,
            ]}
          >
            {preset.icon.length <= 2 ? (
              <Text style={{ fontSize: 32 }}>{preset.icon}</Text>
            ) : (
              <Ionicons
                name={preset.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={theme.colors.paper}
              />
            )}
          </View>

          {!isCustom ? (
            <>
              <Text style={styles.presetTime}>
                {preset.startTime.replace(/^0/, '')} {preset.period}
              </Text>
              <Text style={styles.presetEndTime}>{preset.endTimeLabel}</Text>
            </>
          ) : (
            <Text style={styles.presetCustomText}>Custom Time</Text>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
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
    fontSize: 15,
    color: theme.colors.dust,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  stageIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Pattern Summary Card
  patternCard: {
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
  patternGradient: {
    borderRadius: 16,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  patternIconContainer: {
    marginBottom: theme.spacing.md,
  },
  patternIcon: {
    width: 80,
    height: 80,
  },
  patternName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  patternStats: {
    fontSize: 14,
    color: theme.colors.dust,
    textAlign: 'center',
  },
  // Presets Section
  presetsSection: {
    marginBottom: theme.spacing.xl,
  },
  presetsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  presetsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
  },
  presetsScrollContent: {
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  presetCard: {
    width: 140,
  },
  presetCardInner: {
    height: 120,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCardSelected: {
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
  presetCardNight: {
    backgroundColor: 'rgba(101, 31, 255, 0.05)',
  },
  presetCardCustom: {
    backgroundColor: 'rgba(180, 83, 9, 0.05)',
  },
  durationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.opacity.gold20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.sacredGold,
  },
  presetIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  presetIconCircleDay: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
  },
  presetIconCircleNight: {
    backgroundColor: 'rgba(101, 31, 255, 0.2)',
  },
  presetIconCircleCustom: {
    backgroundColor: theme.colors.opacity.gold20,
  },
  presetTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.paper,
    marginBottom: 2,
  },
  presetEndTime: {
    fontSize: 12,
    color: theme.colors.dust,
    textAlign: 'center',
  },
  presetCustomText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
  },
  // Custom Input Section
  customInputSection: {
    marginBottom: theme.spacing.xl,
  },
  customInputCard: {
    borderRadius: 20,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    gap: theme.spacing.lg,
  },
  inputRow: {
    gap: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  timeInput: {
    width: 60,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    color: theme.colors.paper,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeInputError: {
    borderColor: theme.colors.error,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  periodButton: {
    width: 48,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.dust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: theme.colors.sacredGold,
    borderColor: theme.colors.sacredGold,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dust,
  },
  periodButtonTextSelected: {
    color: theme.colors.paper,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  // Duration Selector
  durationSelector: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  durationCard: {
    flex: 1,
    height: 80,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    overflow: 'hidden',
  },
  durationCardSelected: {
    backgroundColor: theme.colors.sacredGold,
    borderColor: theme.colors.sacredGold,
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
  durationCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.dust,
  },
  durationTextSelected: {
    color: theme.colors.paper,
  },
  // Live Preview Card
  livePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: theme.colors.sacredGold,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: theme.spacing.md,
  },
  livePreviewContent: {
    flex: 1,
  },
  livePreviewLabel: {
    fontSize: 13,
    color: theme.colors.dust,
    marginBottom: 2,
  },
  livePreviewTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
    marginBottom: 2,
  },
  livePreviewDuration: {
    fontSize: 13,
    color: theme.colors.dust,
  },
  // Detection Card
  detectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  detectionCardDay: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  detectionCardNight: {
    backgroundColor: 'rgba(101, 31, 255, 0.1)',
  },
  detectionContent: {
    flex: 1,
  },
  detectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detectionTextDay: {
    color: '#2196F3',
  },
  detectionTextNight: {
    color: '#651FFF',
  },
  detectionHelper: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  // Tips Section
  tipsSection: {
    flexDirection: 'row',
    backgroundColor: theme.colors.opacity.stone50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.opacity.gold20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
    marginBottom: theme.spacing.xs,
  },
  tipText: {
    fontSize: 12,
    color: theme.colors.dust,
    lineHeight: 18,
  },
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.deepVoid,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.opacity.white10,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  continueButtonContainer: {
    width: 54,
    height: 54,
  },
  continueButton: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    overflow: 'hidden',
  },
  continueButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  continueGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Guidance Card
  guidanceCard: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
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
  shiftTypeDefinitions: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.opacity.gold20,
  },
  shiftTypeDefinitionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.sacredGold,
    marginBottom: theme.spacing.xs,
  },
  shiftTypeDefinitionsText: {
    fontSize: 12,
    color: theme.colors.dust,
    lineHeight: 18,
  },
  // Input Helper
  inputLabelContainer: {
    gap: theme.spacing.xs,
  },
  inputHelper: {
    fontSize: 12,
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
});

export default PremiumShiftTimeInputScreen;
