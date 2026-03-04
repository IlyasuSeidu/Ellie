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

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { goToNextScreen } from '@/utils/onboardingNavigation';
import {
  convertTo24Hour,
  calculateEndTime,
  detectShiftType,
  formatTimeForDisplay,
  getRequiredShiftTypes,
} from '@/utils/shiftTimeUtils';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

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
  imageSource?: ImageSourcePropType; // 3D PNG icon (takes priority over icon)
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
    id: 'early_night',
    label: 'Early Night Shift',
    startTime: '06:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    endTimeLabel: 'Ends at 6:00 AM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'standard_night',
    label: 'Standard Night Shift',
    startTime: '07:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    endTimeLabel: 'Ends at 7:00 AM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'late_night',
    label: 'Late Night Shift',
    startTime: '10:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    endTimeLabel: 'Ends at 10:00 AM',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Morning
  {
    id: 'early_morning',
    label: 'Early Morning',
    startTime: '05:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png'),
    type: 'morning',
    endTimeLabel: 'Ends at 1:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_morning',
    label: 'Standard Morning',
    startTime: '06:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png'),
    type: 'morning',
    endTimeLabel: 'Ends at 2:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_morning',
    label: 'Late Morning',
    startTime: '08:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png'),
    type: 'morning',
    endTimeLabel: 'Ends at 4:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Afternoon
  {
    id: 'early_afternoon',
    label: 'Early Afternoon',
    startTime: '01:00',
    period: 'PM',
    duration: 8,
    icon: 'partly-sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png'),
    type: 'afternoon',
    endTimeLabel: 'Ends at 9:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_afternoon',
    label: 'Standard Afternoon',
    startTime: '02:00',
    period: 'PM',
    duration: 8,
    icon: 'partly-sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png'),
    type: 'afternoon',
    endTimeLabel: 'Ends at 10:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_afternoon',
    label: 'Late Afternoon',
    startTime: '03:00',
    period: 'PM',
    duration: 8,
    icon: 'partly-sunny-outline',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    imageSource: require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png'),
    type: 'afternoon',
    endTimeLabel: 'Ends at 11:00 PM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Night
  {
    id: 'early_night_8h',
    label: 'Early Night',
    startTime: '09:00',
    period: 'PM',
    duration: 8,
    icon: 'moon-outline',
    type: 'night',
    endTimeLabel: 'Ends at 5:00 AM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_night_8h',
    label: 'Standard Night',
    startTime: '10:00',
    period: 'PM',
    duration: 8,
    icon: 'moon-outline',
    type: 'night',
    endTimeLabel: 'Ends at 6:00 AM',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_night_8h',
    label: 'Late Night',
    startTime: '11:00',
    period: 'PM',
    duration: 8,
    icon: 'moon-outline',
    type: 'night',
    endTimeLabel: 'Ends at 7:00 AM',
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
  const rosterType = data.rosterType || 'rotating';

  // Ref for ScrollView to enable auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Set duration based on shift system (locked)
  const lockedDuration: 8 | 12 = shiftSystem === ShiftSystem.THREE_SHIFT ? 8 : 12;

  // Determine required shift types based on roster type and pattern
  let requiredShiftTypes: string[];

  if (rosterType === 'fifo' && data.fifoConfig) {
    // FIFO roster: determine shift types based on work pattern
    const workPattern = data.fifoConfig.workBlockPattern;

    if (workPattern === 'straight-days') {
      // Only collect day shift times
      requiredShiftTypes = ['day'];
    } else if (workPattern === 'straight-nights') {
      // Only collect night shift times
      requiredShiftTypes = ['night'];
    } else if (workPattern === 'swing') {
      // Collect both day and night shift times
      requiredShiftTypes = ['day', 'night'];
    } else {
      // Fallback: collect both (for custom or unknown patterns)
      requiredShiftTypes = ['day', 'night'];
    }
  } else {
    // Rotating roster: use existing logic
    requiredShiftTypes = getRequiredShiftTypes(
      shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift' : '2-shift',
      data.customPattern
    );
  }

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
  const [isPatternExpanded, setIsPatternExpanded] = useState(false);
  const [isGuidanceExpanded, setIsGuidanceExpanded] = useState(false);
  const [isTipExpanded, setIsTipExpanded] = useState(false);
  const [isDetectionExpanded, setIsDetectionExpanded] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  // Auto-scroll to top when stage changes
  useEffect(() => {
    setIsPatternExpanded(false);
    setIsGuidanceExpanded(false);
    setIsTipExpanded(false);
    setIsDetectionExpanded(false);
    if (currentStageIndex > 0) {
      // Scroll to top with smooth animation when moving to next stage
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: !reducedMotion,
      });
    }
  }, [currentStageIndex, reducedMotion]);

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
    setIsDetectionExpanded(false);

    if (presetId === 'custom') {
      setShowCustomInput(true);
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'PremiumShiftTimeInputScreen.handlePresetSelect.custom',
      });
    } else {
      setShowCustomInput(false);
      const preset = SHIFT_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setDuration(preset.duration);
      }
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'PremiumShiftTimeInputScreen.handlePresetSelect.preset',
      });
    }
  };

  const handlePeriodToggle = (period: 'AM' | 'PM') => {
    setCustomPeriod(period);
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handlePeriodToggle',
    });
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
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.validateCustomTime.hours',
      });
      return false;
    }

    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      setTimeError('Minutes must be between 0 and 59');
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.validateCustomTime.minutes',
      });
      return false;
    }

    setTimeError(null);
    return true;
  }, [customHours, customMinutes]);

  const handleContinue = useCallback(() => {
    if (!isValid()) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.handleContinue.invalid',
      });
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

    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumShiftTimeInputScreen.handleContinue.success',
    });

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
      goToNextScreen(navigation, 'ShiftTimeInput');
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
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handleBack',
    });

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
  const [cycleLengthLabel, cycleMixLabel] = React.useMemo(() => {
    const statsParts = patternInfo.stats
      .split('•')
      .map((part) => part.trim())
      .filter(Boolean);
    return [statsParts[0] || 'Custom cycle', statsParts[1] || 'Flexible schedule'];
  }, [patternInfo.stats]);
  const shiftSystemLabel =
    shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift system' : '2-shift system';
  const stageCollectionLabel =
    totalStages === 1
      ? 'Single shift profile'
      : `Profile ${currentStageIndex + 1} of ${totalStages}`;
  const detectedShiftType = selectedPreset && isValid() ? getShiftType() : null;

  const detectionCardMeta = React.useMemo(() => {
    if (!detectedShiftType) {
      return null;
    }

    switch (detectedShiftType) {
      case 'day':
        return {
          title: 'Daytime start',
          icon: 'sunny-outline' as const,
          windowLabel: 'Typical window: 6:00 AM - 5:59 PM',
          quickHint: 'Great for daytime operations and standard handovers.',
          colors: [
            'rgba(59, 130, 246, 0.25)',
            'rgba(37, 99, 235, 0.12)',
            'rgba(15, 23, 42, 0.92)',
          ] as const,
          accent: '#60A5FA',
          iconBackground: 'rgba(59, 130, 246, 0.2)',
        };
      case 'morning':
        return {
          title: 'Morning start',
          icon: 'partly-sunny-outline' as const,
          windowLabel: 'Typical window: 6:00 AM - 1:59 PM',
          quickHint: 'Common for early production and daytime coverage.',
          colors: [
            'rgba(245, 158, 11, 0.28)',
            'rgba(251, 146, 60, 0.12)',
            'rgba(24, 16, 11, 0.92)',
          ] as const,
          accent: '#F59E0B',
          iconBackground: 'rgba(245, 158, 11, 0.2)',
        };
      case 'afternoon':
        return {
          title: 'Afternoon start',
          icon: 'sunny-outline' as const,
          windowLabel: 'Typical window: 2:00 PM - 9:59 PM',
          quickHint: 'Best for late-day handover and evening coverage.',
          colors: [
            'rgba(6, 182, 212, 0.25)',
            'rgba(14, 116, 144, 0.12)',
            'rgba(15, 23, 42, 0.92)',
          ] as const,
          accent: '#22D3EE',
          iconBackground: 'rgba(6, 182, 212, 0.2)',
        };
      case 'night':
      default:
        return {
          title: 'Night start',
          icon: 'moon-outline' as const,
          windowLabel:
            shiftSystem === ShiftSystem.THREE_SHIFT
              ? 'Typical window: 10:00 PM - 5:59 AM'
              : 'Typical window: 6:00 PM - 5:59 AM',
          quickHint: 'Designed for overnight rotations and low-light coverage.',
          colors: [
            'rgba(124, 58, 237, 0.3)',
            'rgba(99, 102, 241, 0.12)',
            'rgba(17, 24, 39, 0.92)',
          ] as const,
          accent: '#A78BFA',
          iconBackground: 'rgba(124, 58, 237, 0.22)',
        };
    }
  }, [detectedShiftType, shiftSystem]);

  const handlePatternCardToggle = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handlePatternCardToggle',
    });
    setIsPatternExpanded((prev) => !prev);
  }, []);

  const handleGuidanceCardToggle = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handleGuidanceCardToggle',
    });
    setIsGuidanceExpanded((prev) => !prev);
  }, []);

  const handleTipCardToggle = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handleTipCardToggle',
    });
    setIsTipExpanded((prev) => !prev);
  }, []);

  const handleDetectionCardToggle = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handleDetectionCardToggle',
    });
    setIsDetectionExpanded((prev) => !prev);
  }, []);

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
          ref={scrollViewRef}
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
            <LinearGradient
              colors={['rgba(217, 119, 6, 0.3)', 'rgba(35, 20, 11, 0.35)', 'rgba(18, 12, 9, 0.82)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.patternCardShell}
            >
              <Animated.View style={floatingStyle}>
                <Pressable
                  onPress={handlePatternCardToggle}
                  style={({ pressed }) => [
                    styles.patternPressable,
                    pressed && styles.patternPressablePressed,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'rgba(63, 46, 35, 0.95)',
                      'rgba(34, 28, 24, 0.98)',
                      'rgba(20, 18, 17, 0.98)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.patternGradient}
                  >
                    <View style={styles.patternMetaRow}>
                      <View style={styles.patternMetaBadge}>
                        <Ionicons
                          name="sparkles-outline"
                          size={14}
                          color={theme.colors.sacredGold}
                        />
                        <Text style={styles.patternMetaBadgeText}>Active Pattern</Text>
                      </View>
                      <View style={[styles.patternMetaBadge, styles.patternMetaBadgeMuted]}>
                        <Text style={styles.patternMetaBadgeMutedText}>{shiftSystemLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.patternIconContainer}>
                      {patternIcon ? (
                        <Image
                          source={patternIcon}
                          style={styles.patternIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="calendar" size={80} color={theme.colors.sacredGold} />
                      )}
                    </View>

                    <Text style={styles.patternName}>{patternInfo.name}</Text>
                    <Text style={styles.patternStats}>{patternInfo.stats}</Text>

                    <View style={styles.patternTagRow}>
                      <View style={styles.patternTag}>
                        <Text style={styles.patternTagText}>{cycleLengthLabel}</Text>
                      </View>
                      <View style={styles.patternTag}>
                        <Text style={styles.patternTagText}>{stageCollectionLabel}</Text>
                      </View>
                    </View>

                    {isPatternExpanded ? (
                      <View style={styles.patternExpanded}>
                        <View style={styles.patternExpandedRow}>
                          <Ionicons name="sync-outline" size={16} color={theme.colors.sacredGold} />
                          <Text style={styles.patternExpandedText}>Cycle mix: {cycleMixLabel}</Text>
                        </View>
                        <View style={styles.patternExpandedRow}>
                          <Ionicons name="time-outline" size={16} color={theme.colors.sacredGold} />
                          <Text style={styles.patternExpandedText}>
                            We only need shift start times to calculate reminders and totals.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.patternHintText}>
                        Tap this card to see quick cycle details.
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Guidance Card */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(100)}
            style={styles.guidanceCard}
          >
            <LinearGradient
              colors={[
                'rgba(217, 119, 6, 0.24)',
                'rgba(43, 24, 10, 0.55)',
                'rgba(24, 16, 11, 0.9)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.guidanceCardGradient}
            >
              <Pressable
                onPress={handleGuidanceCardToggle}
                style={({ pressed }) => [
                  styles.guidancePressable,
                  pressed && styles.guidancePressablePressed,
                ]}
              >
                <View style={styles.guidanceHeader}>
                  <View style={styles.guidanceIconBadge}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={theme.colors.sacredGold}
                    />
                  </View>
                  <View style={styles.guidanceHeaderTextContainer}>
                    <Text style={styles.guidanceTitle}>About shift times</Text>
                    <Text style={styles.guidanceSubtitle}>
                      Used for reminders, hour totals, and smarter alerts
                    </Text>
                  </View>
                  <View style={styles.guidanceChevronBadge}>
                    <Ionicons
                      name={isGuidanceExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.sacredGold}
                    />
                  </View>
                </View>

                <Text style={styles.guidanceText}>
                  Your {patternInfo.name} rotation stays the same, but we need your shift start
                  times so Ellie can track hours and alert you before each shift.
                </Text>

                <View style={styles.guidanceChipRow}>
                  <View style={styles.guidanceChip}>
                    <Text style={styles.guidanceChipText}>Accurate reminders</Text>
                  </View>
                  <View style={styles.guidanceChip}>
                    <Text style={styles.guidanceChipText}>Hours tracking</Text>
                  </View>
                  <View style={styles.guidanceChip}>
                    <Text style={styles.guidanceChipText}>Shift-aware alerts</Text>
                  </View>
                </View>

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

                {isGuidanceExpanded ? (
                  <View style={styles.guidanceExpanded}>
                    <View style={styles.guidanceExpandedRow}>
                      <Ionicons
                        name="checkmark-done-outline"
                        size={16}
                        color={theme.colors.sacredGold}
                      />
                      <Text style={styles.guidanceExpandedText}>
                        Pick the closest start time now, then fine-tune later in settings.
                      </Text>
                    </View>
                    <View style={styles.guidanceExpandedRow}>
                      <Ionicons name="alarm-outline" size={16} color={theme.colors.sacredGold} />
                      <Text style={styles.guidanceExpandedText}>
                        Accurate start times improve alert timing and reduce missed shifts.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.guidanceHintText}>
                    Tap this card to reveal quick setup tips.
                  </Text>
                )}
              </Pressable>
            </LinearGradient>
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
          {detectionCardMeta && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInUp.duration(300)}
              style={styles.detectionCard}
            >
              <LinearGradient
                colors={detectionCardMeta.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.detectionCardGradient}
              >
                <Pressable
                  onPress={handleDetectionCardToggle}
                  style={({ pressed }) => [
                    styles.detectionPressable,
                    pressed && styles.detectionPressablePressed,
                  ]}
                >
                  <View style={styles.detectionHeaderRow}>
                    <View
                      style={[
                        styles.detectionIconBadge,
                        { backgroundColor: detectionCardMeta.iconBackground },
                      ]}
                    >
                      <Ionicons
                        name={detectionCardMeta.icon}
                        size={18}
                        color={detectionCardMeta.accent}
                      />
                    </View>
                    <View style={styles.detectionContent}>
                      <Text style={[styles.detectionText, { color: detectionCardMeta.accent }]}>
                        {detectionCardMeta.title}
                      </Text>
                      <Text style={styles.detectionHelper}>This is when your shift begins</Text>
                    </View>
                    <View style={styles.detectionChevronBadge}>
                      <Ionicons
                        name={isDetectionExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={detectionCardMeta.accent}
                      />
                    </View>
                  </View>

                  <View style={styles.detectionChipRow}>
                    <View style={styles.detectionChip}>
                      <Text style={styles.detectionChipText}>Auto-detected</Text>
                    </View>
                    <View style={styles.detectionChip}>
                      <Text style={styles.detectionChipText}>{detectionCardMeta.windowLabel}</Text>
                    </View>
                  </View>

                  {isDetectionExpanded ? (
                    <View style={styles.detectionExpanded}>
                      <View style={styles.detectionExpandedRow}>
                        <Ionicons
                          name="checkmark-done-outline"
                          size={16}
                          color={detectionCardMeta.accent}
                        />
                        <Text style={styles.detectionExpandedText}>
                          {detectionCardMeta.quickHint}
                        </Text>
                      </View>
                      <View style={styles.detectionExpandedRow}>
                        <Ionicons name="time-outline" size={16} color={detectionCardMeta.accent} />
                        <Text style={styles.detectionExpandedText}>
                          You can still adjust this start time later from settings.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.detectionHintText}>
                      Tap this card to see why this shift type was selected.
                    </Text>
                  )}
                </Pressable>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Tips Section */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(1000)}
            style={styles.tipsSection}
          >
            <LinearGradient
              colors={[
                'rgba(217, 119, 6, 0.22)',
                'rgba(42, 26, 14, 0.56)',
                'rgba(22, 16, 12, 0.94)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tipsSectionGradient}
            >
              <Pressable
                onPress={handleTipCardToggle}
                style={({ pressed }) => [
                  styles.tipPressable,
                  pressed && styles.tipPressablePressed,
                ]}
              >
                <View style={styles.tipHeaderRow}>
                  <View style={styles.tipIconContainer}>
                    <Ionicons name="bulb-outline" size={22} color={theme.colors.sacredGold} />
                  </View>
                  <View style={styles.tipHeaderTextContainer}>
                    <Text style={styles.tipTitle}>Pro Tip</Text>
                    <Text style={styles.tipSubtitle}>
                      Fastest way to pick a reliable start time
                    </Text>
                  </View>
                  <View style={styles.tipChevronBadge}>
                    <Ionicons
                      name={isTipExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.sacredGold}
                    />
                  </View>
                </View>

                <Text style={styles.tipText}>
                  {shiftSystem === ShiftSystem.TWO_SHIFT
                    ? 'Not sure? Most shift workers on 12-hour rotations start at 6 AM or 6 PM. Pick the closest match—you can adjust it later in settings if needed.'
                    : 'Not sure? Most 8-hour shift workers start at 6 AM, 2 PM, or 10 PM. Pick the closest match—you can adjust it later in settings if needed.'}
                </Text>

                <View style={styles.tipChipRow}>
                  <View style={styles.tipChip}>
                    <Text style={styles.tipChipText}>Editable later</Text>
                  </View>
                  <View style={styles.tipChip}>
                    <Text style={styles.tipChipText}>Use closest match</Text>
                  </View>
                </View>

                {isTipExpanded ? (
                  <View style={styles.tipExpanded}>
                    <View style={styles.tipExpandedRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={theme.colors.sacredGold}
                      />
                      <Text style={styles.tipExpandedText}>
                        Start with presets first. They’re fastest and usually close to real shift
                        start times.
                      </Text>
                    </View>
                    <View style={styles.tipExpandedRow}>
                      <Ionicons name="build-outline" size={16} color={theme.colors.sacredGold} />
                      <Text style={styles.tipExpandedText}>
                        If your site schedule is unusual, use Custom and fine-tune to the minute.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.tipHintText}>Tap this card to reveal more setup advice.</Text>
                )}
              </Pressable>
            </LinearGradient>
          </Animated.View>
        </ScrollView>

        {/* Navigation Buttons */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.duration(400).springify().delay(1200)}
        >
          <View style={styles.bottomNav}>
            <LinearGradient
              colors={['rgba(43, 24, 10, 0.84)', 'rgba(22, 14, 9, 0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomNavShell}
            >
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
                onPress={handleBack}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
                </LinearGradient>
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
                <View style={[styles.continueButton, !isValid() && styles.continueButtonDisabled]}>
                  <LinearGradient
                    colors={
                      isValid()
                        ? [
                            theme.colors.sacredGold,
                            theme.colors.brightGold,
                            theme.colors.sacredGold,
                          ]
                        : ['rgba(78, 67, 61, 0.85)', 'rgba(58, 52, 49, 0.85)']
                    }
                    locations={isValid() ? [0, 0.5, 1] : undefined}
                    style={styles.continueGradient}
                  >
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.paper} />
                    <Text style={styles.continueButtonText}>
                      {totalStages === 1
                        ? 'Save & Continue'
                        : isLastStage
                          ? 'Finish Setup'
                          : 'Next Shift Type'}
                    </Text>
                    <Ionicons name="arrow-forward" size={22} color={theme.colors.paper} />
                  </LinearGradient>
                </View>
              </Pressable>
            </LinearGradient>
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
              preset.type === 'morning' && !isCustom && styles.presetIconCircleMorning,
              preset.type === 'afternoon' && !isCustom && styles.presetIconCircleAfternoon,
              isCustom && styles.presetIconCircleCustom,
            ]}
          >
            {preset.imageSource ? (
              <Image source={preset.imageSource} style={styles.presetIconImage} />
            ) : preset.icon.length <= 2 ? (
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
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.36,
        shadowRadius: 24,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  patternCardShell: {
    borderRadius: 22,
    padding: 2,
  },
  patternPressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  patternPressablePressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  patternGradient: {
    borderRadius: 20,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
  },
  patternMetaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  patternMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(217, 119, 6, 0.18)',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
  },
  patternMetaBadgeMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  patternMetaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  patternMetaBadgeMutedText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.paper,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    marginBottom: theme.spacing.sm,
  },
  patternTagRow: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  patternTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  patternTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  patternExpanded: {
    width: '100%',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.opacity.gold20,
    gap: theme.spacing.sm,
  },
  patternExpandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  patternExpandedText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.dust,
    lineHeight: 19,
  },
  patternHintText: {
    marginTop: theme.spacing.md,
    fontSize: 12,
    color: theme.colors.dust,
    textAlign: 'center',
    fontStyle: 'italic',
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
  presetIconCircleMorning: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  presetIconCircleAfternoon: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
  },
  presetIconImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
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
    borderRadius: 18,
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  detectionCardGradient: {
    borderRadius: 18,
    padding: 1,
  },
  detectionPressable: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white10,
    backgroundColor: 'rgba(15, 15, 15, 0.75)',
    padding: theme.spacing.md,
  },
  detectionPressablePressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  detectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionContent: {
    flex: 1,
  },
  detectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detectionChevronBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white20,
    backgroundColor: theme.colors.opacity.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionHelper: {
    fontSize: 13,
    color: theme.colors.dust,
  },
  detectionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  detectionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white20,
    backgroundColor: theme.colors.opacity.white10,
  },
  detectionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  detectionExpanded: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  detectionExpandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  detectionExpandedText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.dust,
    lineHeight: 18,
  },
  detectionHintText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
  // Tips Section
  tipsSection: {
    borderRadius: 20,
    marginBottom: theme.spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  tipsSectionGradient: {
    borderRadius: 20,
    padding: 1,
  },
  tipPressable: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(22, 16, 12, 0.92)',
    padding: theme.spacing.md,
  },
  tipPressablePressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tipIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(217, 119, 6, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipHeaderTextContainer: {
    flex: 1,
    gap: 2,
  },
  tipTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.sacredGold,
  },
  tipSubtitle: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  tipChevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  tipText: {
    fontSize: 15,
    color: theme.colors.dust,
    lineHeight: 24,
  },
  tipChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  tipChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: theme.colors.opacity.gold10,
  },
  tipChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.paleGold,
  },
  tipExpanded: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tipExpandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  tipExpandedText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.dust,
    lineHeight: 19,
  },
  tipHintText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xxl : theme.spacing.lg,
    backgroundColor: 'transparent',
  },
  bottomNavShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  backButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  continueButtonContainer: {
    flex: 1,
  },
  continueButton: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  continueGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.42,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  // Guidance Card
  guidanceCard: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.24,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  guidanceCardGradient: {
    borderRadius: 20,
    padding: 1,
  },
  guidancePressable: {
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(24, 16, 11, 0.92)',
    padding: theme.spacing.lg,
  },
  guidancePressablePressed: {
    opacity: 0.95,
    transform: [{ scale: 0.995 }],
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  guidanceIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidanceHeaderTextContainer: {
    flex: 1,
    gap: 2,
  },
  guidanceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.sacredGold,
  },
  guidanceSubtitle: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  guidanceChevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
  },
  guidanceText: {
    fontSize: 15,
    color: theme.colors.dust,
    lineHeight: 24,
  },
  guidanceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  guidanceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: theme.colors.opacity.gold10,
  },
  guidanceChipText: {
    fontSize: 12,
    color: theme.colors.paleGold,
    fontWeight: '600',
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
  guidanceExpanded: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  guidanceExpandedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  guidanceExpandedText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.dust,
    lineHeight: 19,
  },
  guidanceHintText: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.dust,
    fontStyle: 'italic',
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
