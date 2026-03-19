/**
 * Premium Shift Time Input Screen
 *
 * Collects essential shift timing data to accurately calculate work hours
 * and enable shift notifications.
 *
 * Data collected:
 * - Shift start time (HH:MM format with AM/PM)
 * - Shift duration (8 hours or 12 hours)
 * - Shift end time (auto-calculated)
 * - Shift type (day/night/morning/afternoon - auto-detected)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  BackHandler,
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { SettingsEntryActionButtons } from '@/components/onboarding/premium/SettingsEntryActionButtons';
import { useOnboarding, OnboardingData } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { ShiftPattern, ShiftSystem } from '@/types';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import {
  convertTo24Hour,
  calculateEndTime,
  detectShiftType,
  getRequiredShiftTypes,
} from '@/utils/shiftTimeUtils';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { getDefaultFIFOConfig } from '@/utils/shiftUtils';
import { Analytics } from '@/utils/analytics';
import { formatLocalizedNumber, formatLocalizedTime } from '@/utils/i18nFormat';

// Helper to get pattern display info
const getPatternInfo = (
  patternType: ShiftPattern | undefined,
  customPattern: OnboardingData['customPattern'] | undefined,
  shiftSystem: ShiftSystem | '2-shift' | '3-shift' | undefined,
  t: TFunction<'onboarding'>
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
        name: String(
          t('shiftTime.patternInfo.custom.name', {
            defaultValue: 'Custom Pattern',
          })
        ),
        stats: String(
          t('shiftTime.patternInfo.custom.statsThreeShift', {
            total,
            morningOn,
            afternoonOn,
            nightOn,
            daysOff,
            defaultValue: `${total}-day cycle • ${morningOn}M/${afternoonOn}A/${nightOn}N/${daysOff}O`,
          })
        ),
      };
    }

    // Handle 2-shift custom pattern
    const daysOn = customPattern.daysOn || 0;
    const nightsOn = customPattern.nightsOn || 0;
    const daysOff = customPattern.daysOff || 0;
    const total = daysOn + nightsOn + daysOff;

    return {
      name: String(t('shiftTime.patternInfo.custom.name', { defaultValue: 'Custom Pattern' })),
      stats: String(
        t('shiftTime.patternInfo.custom.statsTwoShift', {
          total,
          daysOn,
          nightsOn,
          daysOff,
          defaultValue: `${total}-day cycle • ${daysOn}D/${nightsOn}N/${daysOff}O`,
        })
      ),
    };
  }

  switch (patternType) {
    case ShiftPattern.STANDARD_4_4_4:
      return {
        name: String(t('shiftTime.patternInfo.standard444.name', { defaultValue: '4-4-4 Cycle' })),
        stats: String(
          t('shiftTime.patternInfo.standard444.stats', { defaultValue: '12-day cycle • 4D/4N/4O' })
        ),
      };
    case ShiftPattern.STANDARD_7_7_7:
      return {
        name: String(t('shiftTime.patternInfo.standard777.name', { defaultValue: '7-7-7 Cycle' })),
        stats: String(
          t('shiftTime.patternInfo.standard777.stats', { defaultValue: '21-day cycle • 7D/7N/7O' })
        ),
      };
    case ShiftPattern.STANDARD_2_2_3:
      return {
        name: String(t('shiftTime.patternInfo.standard223.name', { defaultValue: '2-2-3 Cycle' })),
        stats: String(
          t('shiftTime.patternInfo.standard223.stats', { defaultValue: '7-day cycle • 2D/2N/3O' })
        ),
      };
    case ShiftPattern.STANDARD_5_5_5:
      return {
        name: String(t('shiftTime.patternInfo.standard555.name', { defaultValue: '5-5-5 Cycle' })),
        stats: String(
          t('shiftTime.patternInfo.standard555.stats', { defaultValue: '15-day cycle • 5D/5N/5O' })
        ),
      };
    case ShiftPattern.STANDARD_3_3_3:
      return {
        name: String(t('shiftTime.patternInfo.standard333.name', { defaultValue: '3-3-3 Cycle' })),
        stats: String(
          t('shiftTime.patternInfo.standard333.stats', { defaultValue: '9-day cycle • 3D/3N/3O' })
        ),
      };
    case ShiftPattern.STANDARD_10_10_10:
      return {
        name: String(
          t('shiftTime.patternInfo.standard101010.name', { defaultValue: '10-10-10 Cycle' })
        ),
        stats: String(
          t('shiftTime.patternInfo.standard101010.stats', {
            defaultValue: '30-day cycle • 10D/10N/10O',
          })
        ),
      };
    case ShiftPattern.CONTINENTAL:
      return {
        name: String(t('shiftTime.patternInfo.continental.name', { defaultValue: 'Continental' })),
        stats: String(
          t('shiftTime.patternInfo.continental.stats', { defaultValue: '8-day cycle • 2D/2N/4O' })
        ),
      };
    case ShiftPattern.PITMAN:
      return {
        name: String(t('shiftTime.patternInfo.pitman.name', { defaultValue: 'Pitman' })),
        stats: String(
          t('shiftTime.patternInfo.pitman.stats', { defaultValue: '7-day cycle • 2D/2N/3O' })
        ),
      };
    default:
      return {
        name: String(t('shiftTime.patternInfo.custom.name', { defaultValue: 'Custom Pattern' })),
        stats: String(
          t('shiftTime.patternInfo.defaultStats', {
            defaultValue: 'Custom cycle • Set your schedule',
          })
        ),
      };
  }
};

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;
type StageShiftType = 'day' | 'night' | 'morning' | 'afternoon';
type StageShiftTimes = {
  startTime: string;
  endTime: string;
  duration: 8 | 12;
};

// Preset shift configurations
interface ShiftPreset {
  id: string;
  startTime: string; // HH:MM (12-hour format)
  period: 'AM' | 'PM';
  duration: 8 | 12;
  icon: keyof typeof Ionicons.glyphMap | string; // Can be Ionicon name or emoji
  imageSource?: ImageSourcePropType; // 3D PNG icon (takes priority over icon)
  type: 'day' | 'night' | 'morning' | 'afternoon';
  shiftSystem: ShiftSystem;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  // 2-Shift (12-hour) Presets
  {
    id: 'early_day',
    startTime: '06:00',
    period: 'AM',
    duration: 12,
    icon: 'sunny',
    type: 'day',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'standard_day',
    startTime: '07:00',
    period: 'AM',
    duration: 12,
    icon: 'partly-sunny',
    type: 'day',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'late_day',
    startTime: '01:00',
    period: 'PM',
    duration: 12,
    icon: 'cloudy',
    type: 'day',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'early_night',
    startTime: '06:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'standard_night',
    startTime: '07:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },
  {
    id: 'late_night',
    startTime: '10:00',
    period: 'PM',
    duration: 12,
    icon: 'moon',
    type: 'night',
    shiftSystem: ShiftSystem.TWO_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Morning
  {
    id: 'early_morning',
    startTime: '05:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny',
    type: 'morning',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_morning',
    startTime: '06:00',
    period: 'AM',
    duration: 8,
    icon: 'partly-sunny',
    type: 'morning',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_morning',
    startTime: '08:00',
    period: 'AM',
    duration: 8,
    icon: 'sunny-outline',
    type: 'morning',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Afternoon
  {
    id: 'early_afternoon',
    startTime: '01:00',
    period: 'PM',
    duration: 8,
    icon: 'cloudy',
    type: 'afternoon',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_afternoon',
    startTime: '02:00',
    period: 'PM',
    duration: 8,
    icon: 'cloudy-outline',
    type: 'afternoon',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_afternoon',
    startTime: '03:00',
    period: 'PM',
    duration: 8,
    icon: 'partly-sunny-outline',
    type: 'afternoon',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // 3-Shift (8-hour) Presets - Night
  {
    id: 'early_night_8h',
    startTime: '09:00',
    period: 'PM',
    duration: 8,
    icon: 'moon',
    type: 'night',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'standard_night_8h',
    startTime: '10:00',
    period: 'PM',
    duration: 8,
    icon: 'moon',
    type: 'night',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },
  {
    id: 'late_night_8h',
    startTime: '11:00',
    period: 'PM',
    duration: 8,
    icon: 'moon-outline',
    type: 'night',
    shiftSystem: ShiftSystem.THREE_SHIFT,
  },

  // Custom (available for both)
  {
    id: 'custom',
    startTime: '',
    period: 'AM',
    duration: 12,
    icon: 'create-outline',
    type: 'day',
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
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'ShiftTimeInput'>>();
  const { data, updateData } = useOnboarding();
  const mountTime = useRef(Date.now());
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;
  const shiftSystem: '2-shift' | '3-shift' = data.shiftSystem || ShiftSystem.TWO_SHIFT;
  const rosterType = data.rosterType || 'rotating';

  const closeSettingsEditor = useCallback(() => {
    const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (rootNavigation?.canGoBack()) {
      rootNavigation.goBack();
      return;
    }
    if (rootNavigation?.reset) {
      rootNavigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [navigation]);

  // Ref for ScrollView to enable auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const allowSettingsExitRef = useRef(false);

  // Set duration based on shift system (locked)
  const lockedDuration: 8 | 12 = shiftSystem === ShiftSystem.THREE_SHIFT ? 8 : 12;

  // Determine required shift types based on roster type and pattern
  let requiredShiftTypes: StageShiftType[];
  let resolvedWorkPattern = 'standard';

  if (rosterType === 'fifo') {
    // FIFO roster: determine shift types based on work pattern
    const presetFIFOConfig = getDefaultFIFOConfig(data.patternType ?? ShiftPattern.FIFO_14_14);
    const normalizedPresetPattern = presetFIFOConfig?.workBlockPattern || 'straight-days';
    const hasMatchingPresetLengths =
      !!presetFIFOConfig &&
      !!data.fifoConfig &&
      data.fifoConfig.workBlockDays === presetFIFOConfig.workBlockDays &&
      data.fifoConfig.restBlockDays === presetFIFOConfig.restBlockDays;

    const workPattern =
      data.patternType === ShiftPattern.FIFO_CUSTOM
        ? data.fifoConfig?.workBlockPattern || 'swing'
        : hasMatchingPresetLengths
          ? data.fifoConfig?.workBlockPattern || normalizedPresetPattern
          : normalizedPresetPattern;
    resolvedWorkPattern = workPattern;

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
    resolvedWorkPattern =
      data.patternType === ShiftPattern.CUSTOM
        ? 'custom'
        : data.patternType
          ? String(data.patternType)
          : 'standard';
    // Rotating roster: use existing logic
    const customPatternForStageDetection =
      data.patternType === ShiftPattern.CUSTOM ? data.customPattern : undefined;

    const rotatingShiftTypes = getRequiredShiftTypes(
      shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift' : '2-shift',
      customPatternForStageDetection
    );
    requiredShiftTypes = rotatingShiftTypes.filter(
      (shiftType): shiftType is StageShiftType =>
        shiftType === 'day' ||
        shiftType === 'night' ||
        shiftType === 'morning' ||
        shiftType === 'afternoon'
    );
    if (requiredShiftTypes.length === 0) {
      requiredShiftTypes =
        shiftSystem === ShiftSystem.THREE_SHIFT ? ['morning', 'afternoon', 'night'] : ['day'];
    }
  }

  const initialStageIndex = (() => {
    const initialShiftType = route.params?.initialShiftType;
    if (!initialShiftType) return 0;
    const stageIndex = requiredShiftTypes.indexOf(initialShiftType);
    return stageIndex >= 0 ? stageIndex : 0;
  })();

  const buildInitialCollectedShiftTimes = (): Partial<Record<StageShiftType, StageShiftTimes>> => {
    const initial: Partial<Record<StageShiftType, StageShiftTimes>> = {};
    const currentShiftTimes = data.shiftTimes;

    if (currentShiftTimes?.dayShift) {
      initial.day = currentShiftTimes.dayShift;
    }
    if (currentShiftTimes?.morningShift) {
      initial.morning = currentShiftTimes.morningShift;
    }
    if (currentShiftTimes?.afternoonShift) {
      initial.afternoon = currentShiftTimes.afternoonShift;
    }
    if (currentShiftTimes?.nightShift3) {
      initial.night = currentShiftTimes.nightShift3;
    } else if (currentShiftTimes?.nightShift) {
      initial.night = currentShiftTimes.nightShift;
    }

    const firstRequiredShift = requiredShiftTypes[0];
    if (
      firstRequiredShift &&
      !initial[firstRequiredShift] &&
      data.shiftStartTime &&
      data.shiftEndTime
    ) {
      initial[firstRequiredShift] = {
        startTime: data.shiftStartTime,
        endTime: data.shiftEndTime,
        duration: data.shiftDuration ?? lockedDuration,
      };
    }

    return initial;
  };

  // Multi-stage state: track which shift type we're currently collecting
  const [currentStageIndex, setCurrentStageIndex] = useState(initialStageIndex);
  const currentShiftType = requiredShiftTypes[currentStageIndex];
  const totalStages = requiredShiftTypes.length;
  const isLastStage = currentStageIndex === totalStages - 1;
  const analyticsStepViewMetadata = useMemo(
    () => ({
      roster_type: rosterType,
      work_pattern: resolvedWorkPattern,
    }),
    [resolvedWorkPattern, rosterType]
  );

  useEffect(() => {
    if (isSettingsEntry && returnToMainOnSelect) {
      return;
    }
    Analytics.onboardingStepViewed(
      'shift_time_input',
      ONBOARDING_STEPS.SHIFT_TIME_INPUT,
      analyticsStepViewMetadata
    );
  }, [analyticsStepViewMetadata, isSettingsEntry, returnToMainOnSelect]);

  // Store collected shift times for all stages
  const [collectedShiftTimes, setCollectedShiftTimes] = useState<
    Partial<Record<StageShiftType, StageShiftTimes>>
  >(buildInitialCollectedShiftTimes);

  // Filter presets by shift system AND current shift type
  const filteredPresets = SHIFT_PRESETS.filter((preset) => {
    if (preset.id === 'custom') return true;
    if (preset.shiftSystem !== shiftSystem) return false;
    // FIFO preset selection should always stay scoped to the required shift type.
    if (rosterType === 'fifo' || totalStages > 1) {
      return preset.type === currentShiftType;
    }
    // For single-stage flow, show all presets for this shift system
    return true;
  });

  // State for current stage input
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState('06');
  const [customMinutes, setCustomMinutes] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>(
    currentShiftType === 'night' ? 'PM' : 'AM'
  );
  const [duration, setDuration] = useState<8 | 12>(lockedDuration);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  const resetStageInput = useCallback((shiftType: StageShiftType) => {
    setSelectedPreset(null);
    setCustomHours('06');
    setCustomMinutes('00');
    setCustomPeriod(shiftType === 'night' ? 'PM' : 'AM');
    setShowCustomInput(false);
    setTimeError(null);
  }, []);

  const returnToSettings = useCallback(() => {
    allowSettingsExitRef.current = true;
    closeSettingsEditor();
  }, [closeSettingsEditor]);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  // Auto-scroll to top when stage changes
  useEffect(() => {
    if (currentStageIndex > 0) {
      // Scroll to top with smooth animation when moving to next stage
      scrollViewRef.current?.scrollTo({
        y: 0,
        animated: !reducedMotion,
      });
    }
  }, [currentStageIndex, reducedMotion]);

  useEffect(() => {
    if (!isSettingsEntry || !returnToMainOnSelect) {
      return () => undefined;
    }

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowSettingsExitRef.current) {
        return;
      }

      event.preventDefault();
      returnToSettings();
    });

    return unsubscribe;
  }, [isSettingsEntry, navigation, returnToMainOnSelect, returnToSettings]);

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
    if (selectedPreset && selectedPreset !== 'custom') {
      const preset = SHIFT_PRESETS.find((p) => p.id === selectedPreset);
      if (preset) {
        return preset.type;
      }
    }

    const startTime = getStartTime24h();
    if (!startTime) return 'day';

    const shiftSystem = data.shiftSystem as ShiftSystem;
    return detectShiftType(
      startTime,
      shiftSystem === ShiftSystem.THREE_SHIFT ? '3-shift' : '2-shift'
    );
  }, [selectedPreset, getStartTime24h, data.shiftSystem]);

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
  const isSettingsMode = isSettingsEntry && returnToMainOnSelect;
  const existingCurrentStageTime = collectedShiftTimes[currentShiftType];
  const hasExistingCurrentStageTime = Boolean(
    existingCurrentStageTime?.startTime && existingCurrentStageTime?.endTime
  );
  const canContinue = isValid() || (isSettingsMode && hasExistingCurrentStageTime);

  // Handlers
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setTimeError(null);

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
      setTimeError(
        String(
          t('shiftTime.validation.hoursRange', {
            defaultValue: 'Hours must be between 1 and 12',
          })
        )
      );
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.validateCustomTime.hours',
      });
      return false;
    }

    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
      setTimeError(
        String(
          t('shiftTime.validation.minutesRange', {
            defaultValue: 'Minutes must be between 0 and 59',
          })
        )
      );
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.validateCustomTime.minutes',
      });
      return false;
    }

    setTimeError(null);
    return true;
  }, [customHours, customMinutes, t]);

  const getAnalyticsQuestionKeys = useCallback(
    (shiftType: StageShiftType) => ({
      start: `${shiftType}_shift_start`,
      end: `${shiftType}_shift_end`,
    }),
    []
  );

  const handleContinue = useCallback(() => {
    const hasValidSelection = isValid();
    if (!hasValidSelection && !(isSettingsMode && hasExistingCurrentStageTime)) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.handleContinue.invalid',
      });
      return;
    }

    if (hasValidSelection && selectedPreset === 'custom' && !validateCustomTime()) {
      return;
    }

    const stageShiftTime: StageShiftTimes | undefined = hasValidSelection
      ? {
          startTime: getStartTime24h(),
          endTime: getEndTime24h(),
          duration,
        }
      : existingCurrentStageTime;

    if (!stageShiftTime) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumShiftTimeInputScreen.handleContinue.missingStageTime',
      });
      return;
    }

    // Save current stage's shift times
    const updatedShiftTimes = {
      ...collectedShiftTimes,
      [currentShiftType]: stageShiftTime,
    };
    setCollectedShiftTimes(updatedShiftTimes);

    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumShiftTimeInputScreen.handleContinue.success',
    });

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

    const primaryLegacyShift = updatedShiftTimes[requiredShiftTypes[0]] ?? stageShiftTime;
    const analyticsQuestions = getAnalyticsQuestionKeys(currentShiftType);

    // Save to context with new structure
    updateData({
      shiftTimes,
      // Also save to legacy fields for backwards compatibility (first shift type)
      shiftStartTime: primaryLegacyShift?.startTime,
      shiftEndTime: primaryLegacyShift?.endTime,
      shiftDuration: duration,
      shiftType: hasValidSelection ? getShiftType() : (data.shiftType ?? currentShiftType),
      isCustomShiftTime: hasValidSelection ? selectedPreset === 'custom' : data.isCustomShiftTime,
    });

    if (!isSettingsMode) {
      Analytics.onboardingQuestionAnswered({
        question: analyticsQuestions.start,
        answer_value: stageShiftTime.startTime,
      });
      Analytics.onboardingQuestionAnswered({
        question: analyticsQuestions.end,
        answer_value: stageShiftTime.endTime,
      });
    }

    if (onContinue) {
      onContinue();
    }

    if (isSettingsMode) {
      returnToSettings();
      return;
    }

    // If this is the last stage, save all shift times and navigate
    if (isLastStage) {
      Analytics.onboardingStepCompleted(
        'shift_time_input',
        Date.now() - mountTime.current,
        analyticsStepViewMetadata
      );
      goToNextScreen(navigation, 'ShiftTimeInput');
    } else {
      // Move to next stage
      const nextStageIndex = currentStageIndex + 1;
      const nextShiftType = requiredShiftTypes[nextStageIndex];
      setCurrentStageIndex(nextStageIndex);
      resetStageInput(nextShiftType);
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
    isSettingsMode,
    hasExistingCurrentStageTime,
    existingCurrentStageTime,
    data.isCustomShiftTime,
    data.shiftType,
    getAnalyticsQuestionKeys,
    analyticsStepViewMetadata,
    resetStageInput,
    returnToSettings,
    navigation,
  ]);

  const handleBack = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftTimeInputScreen.handleBack',
    });

    if (onBack) {
      onBack();
      return;
    }
    if (isSettingsEntry && returnToMainOnSelect) {
      returnToSettings();
      return;
    }
    // Non-settings flow: stage-level back remains intact.
    if (currentStageIndex > 0) {
      const previousStageIndex = currentStageIndex - 1;
      const previousShiftType = requiredShiftTypes[previousStageIndex];
      setCurrentStageIndex(previousStageIndex);
      resetStageInput(previousShiftType);
      return;
    }
    navigation.goBack();
  }, [
    currentStageIndex,
    requiredShiftTypes,
    navigation,
    onBack,
    isSettingsEntry,
    returnToMainOnSelect,
    resetStageInput,
    returnToSettings,
  ]);

  // Android hardware back button — mirrors handleBack so stage nav works correctly.
  // BackHandler is a no-op on iOS so no Platform guard is needed.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // signal handled — prevents system/React Navigation default
    });
    return () => subscription.remove();
  }, [handleBack]);

  // Animated styles
  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : floatingY.value }],
  }));

  // Note: Using regular styles instead of animated styles to avoid worklet crashes
  // The pulse animation was removed for stability

  // Get pattern display info from context
  const patternInfo = getPatternInfo(data.patternType, data.customPattern, shiftSystem, t);
  const getShiftTypeLabel = useCallback(
    (shiftType: StageShiftType, format: 'title' | 'lower' = 'title'): string => {
      switch (shiftType) {
        case 'day':
          return String(
            t(
              format === 'title'
                ? 'shiftTime.shiftLabels.dayTitle'
                : 'shiftTime.shiftLabels.dayLower',
              {
                defaultValue: format === 'title' ? 'Day' : 'day',
              }
            )
          );
        case 'night':
          return String(
            t(
              format === 'title'
                ? 'shiftTime.shiftLabels.nightTitle'
                : 'shiftTime.shiftLabels.nightLower',
              {
                defaultValue: format === 'title' ? 'Night' : 'night',
              }
            )
          );
        case 'morning':
          return String(
            t(
              format === 'title'
                ? 'shiftTime.shiftLabels.morningTitle'
                : 'shiftTime.shiftLabels.morningLower',
              {
                defaultValue: format === 'title' ? 'Morning' : 'morning',
              }
            )
          );
        case 'afternoon':
        default:
          return String(
            t(
              format === 'title'
                ? 'shiftTime.shiftLabels.afternoonTitle'
                : 'shiftTime.shiftLabels.afternoonLower',
              {
                defaultValue: format === 'title' ? 'Afternoon' : 'afternoon',
              }
            )
          );
      }
    },
    [t]
  );
  const shiftSystemLabel =
    shiftSystem === ShiftSystem.THREE_SHIFT
      ? String(t('shiftTime.systemLabels.threeShift', { defaultValue: '3-shift system' }))
      : String(t('shiftTime.systemLabels.twoShift', { defaultValue: '2-shift system' }));
  const detectedShiftType = selectedPreset && isValid() ? getShiftType() : null;
  const nextShiftType = requiredShiftTypes[currentStageIndex + 1] ?? currentShiftType;
  const customHoursPlaceholder = formatLocalizedNumber(6, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const customMinutesPlaceholder = formatLocalizedNumber(0, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  const detectionCardMeta = React.useMemo(() => {
    if (!detectedShiftType) {
      return null;
    }

    switch (detectedShiftType) {
      case 'day':
        return {
          title: String(
            t('shiftTime.detection.day.title', {
              defaultValue: 'Daytime start',
            })
          ),
          icon: 'sunny-outline' as const,
          windowLabel: String(
            t('shiftTime.detection.day.window', {
              defaultValue: 'Typical window: 6:00 AM - 5:59 PM',
            })
          ),
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
          title: String(
            t('shiftTime.detection.morning.title', {
              defaultValue: 'Morning start',
            })
          ),
          icon: 'partly-sunny-outline' as const,
          windowLabel: String(
            t('shiftTime.detection.morning.window', {
              defaultValue: 'Typical window: 6:00 AM - 1:59 PM',
            })
          ),
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
          title: String(
            t('shiftTime.detection.afternoon.title', {
              defaultValue: 'Afternoon start',
            })
          ),
          icon: 'sunny-outline' as const,
          windowLabel: String(
            t('shiftTime.detection.afternoon.window', {
              defaultValue: 'Typical window: 2:00 PM - 9:59 PM',
            })
          ),
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
          title: String(
            t('shiftTime.detection.night.title', {
              defaultValue: 'Night start',
            })
          ),
          icon: 'moon-outline' as const,
          windowLabel:
            shiftSystem === ShiftSystem.THREE_SHIFT
              ? String(
                  t('shiftTime.detection.night.windowThreeShift', {
                    defaultValue: 'Typical window: 10:00 PM - 5:59 AM',
                  })
                )
              : String(
                  t('shiftTime.detection.night.windowTwoShift', {
                    defaultValue: 'Typical window: 6:00 PM - 5:59 AM',
                  })
                ),
          colors: [
            'rgba(124, 58, 237, 0.3)',
            'rgba(99, 102, 241, 0.12)',
            'rgba(17, 24, 39, 0.92)',
          ] as const,
          accent: '#A78BFA',
          iconBackground: 'rgba(124, 58, 237, 0.22)',
        };
    }
  }, [detectedShiftType, shiftSystem, t]);

  // Get stage-specific title
  const getStageTitle = (): string =>
    String(
      t('shiftTime.header.title.question', {
        shiftTypeLabel: getShiftTypeLabel(currentShiftType, 'lower'),
        defaultValue: `What time does your ${getShiftTypeLabel(currentShiftType, 'lower')} shift start?`,
      })
    );

  // Get stage-specific subtitle
  const getStageSubtitle = (): string =>
    String(
      t('shiftTime.header.subtitle.preAha', {
        defaultValue: 'Last step before we show you your full year.',
      })
    );

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
              <View style={styles.stagePill}>
                <View style={styles.stagePillDot} />
                <Text style={styles.stageIndicator}>
                  {t('shiftTime.stage.stepOfTotal', {
                    current: currentStageIndex + 1,
                    total: totalStages,
                    defaultValue: `Step ${currentStageIndex + 1} of ${totalStages}`,
                  })}
                </Text>
              </View>
            )}
            <Text style={styles.title}>{getStageTitle()}</Text>
            <View style={styles.titleAccentRule} />
            <Text style={styles.subtitle}>{getStageSubtitle()}</Text>
            <Text style={styles.inlineHint}>
              {t('shiftTime.guidance.hint', {
                defaultValue:
                  'Use the closest start time now. You can fine-tune it later in settings.',
              })}
            </Text>
          </Animated.View>

          {/* Pattern Summary Strip */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeInDown.duration(400).springify()}
            style={styles.patternStrip}
          >
            <Animated.View style={[styles.patternStripInner, floatingStyle]}>
              {patternIcon ? (
                <Image source={patternIcon} style={styles.patternStripIcon} resizeMode="contain" />
              ) : (
                <Ionicons name="calendar" size={18} color={theme.colors.sacredGold} />
              )}
              <Text style={styles.patternStripName} numberOfLines={1}>
                {patternInfo.name}
              </Text>
              <View style={styles.patternStripDivider} />
              <Text style={styles.patternStripStats} numberOfLines={1} ellipsizeMode="tail">
                {patternInfo.stats}
              </Text>
              <View style={styles.patternStripDivider} />
              <Text style={styles.patternStripMeta} numberOfLines={1}>
                {shiftSystemLabel}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Preset Shift Time Cards Section */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(200)}
            style={styles.presetsSection}
          >
            <View style={styles.presetsSectionHeader}>
              <Ionicons name="time-outline" size={16} color={theme.colors.dust} />
              <Text style={styles.presetsSectionTitle}>
                {t('shiftTime.presets.sectionTitle', { defaultValue: 'Pick a Common Start Time' })}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetsScrollContent}
              snapToInterval={148} // 132px card + 16px gap
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
                {/* Label row */}
                <View style={styles.customInputLabelRow}>
                  <Ionicons name="create-outline" size={14} color={theme.colors.dust} />
                  <Text style={styles.inputLabel}>
                    {t('shiftTime.customInput.label', {
                      defaultValue: 'What time do you usually clock in?',
                    })}
                  </Text>
                </View>

                {/* Large clock row: HH : MM */}
                <View style={styles.clockRow}>
                  <TextInput
                    style={[styles.timeInput, timeError && styles.timeInputError]}
                    value={customHours}
                    onChangeText={(value) => handleCustomTimeChange('hours', value)}
                    onBlur={validateCustomTime}
                    placeholder={customHoursPlaceholder}
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
                    placeholder={customMinutesPlaceholder}
                    placeholderTextColor={theme.colors.shadow}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                </View>

                {timeError && <Text style={styles.errorText}>{timeError}</Text>}

                {/* AM/PM segmented pill */}
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
                      {t('shiftTime.customInput.period.am', { defaultValue: 'AM' })}
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
                      {t('shiftTime.customInput.period.pm', { defaultValue: 'PM' })}
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.inputHelper}>
                  {t('shiftTime.customInput.helper', {
                    defaultValue: 'Use 12-hour format (e.g., 6:00 AM)',
                  })}
                </Text>

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
                      <Text style={styles.livePreviewLabel}>
                        {t('shiftTime.preview.yourShift', { defaultValue: 'Your shift:' })}
                      </Text>
                      <Text style={styles.livePreviewTime}>
                        {formatLocalizedTime(getStartTime24h())} →{' '}
                        {formatLocalizedTime(getEndTime24h())}
                      </Text>
                      <Text style={styles.livePreviewDuration}>
                        {t('shiftTime.preview.durationHours', {
                          duration,
                          defaultValue: `${duration} hours`,
                        })}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          {/* Shift Type Auto-Detection Card */}
          {/* Shift Type Auto-Detection Chip */}
          {detectionCardMeta && (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInUp.duration(300)}
              style={styles.detectionInlineRow}
            >
              <View
                style={[
                  styles.detectionInlineChip,
                  { borderColor: `${detectionCardMeta.accent}40` },
                ]}
              >
                <View
                  style={[styles.detectionChipDot, { backgroundColor: detectionCardMeta.accent }]}
                />
                <Ionicons
                  name={detectionCardMeta.icon}
                  size={13}
                  color={detectionCardMeta.accent}
                />
                <Text style={[styles.detectionChipLabel, { color: detectionCardMeta.accent }]}>
                  {detectionCardMeta.title}
                </Text>
                <View style={styles.detectionChipSep} />
                <Text style={styles.detectionChipWindow}>{detectionCardMeta.windowLabel}</Text>
              </View>
            </Animated.View>
          )}

          {/* Tips Footnote */}
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(300).delay(1000)}
            style={styles.tipFootnote}
          >
            <Ionicons name="bulb-outline" size={12} color={theme.colors.shadow} />
            <Text style={styles.tipFootnoteText}>
              {shiftSystem === ShiftSystem.TWO_SHIFT
                ? t('shiftTime.tips.twoShift', {
                    defaultValue:
                      'Not sure? Most shift workers on 12-hour rotations start at 6 AM or 6 PM. Pick the closest match—you can adjust it later in settings if needed.',
                  })
                : t('shiftTime.tips.threeShift', {
                    defaultValue:
                      'Not sure? Most 8-hour shift workers start at 6 AM, 2 PM, or 10 PM. Pick the closest match—you can adjust it later in settings if needed.',
                  })}
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Navigation Buttons */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.duration(400).springify().delay(1200)}
        >
          <View style={styles.bottomNav}>
            {isSettingsMode ? (
              <SettingsEntryActionButtons
                backLabel={String(
                  t('shiftTime.actions.backToSettings', {
                    defaultValue: 'Back to Settings',
                  })
                )}
                saveLabel={String(
                  t('shiftTime.actions.saveAndReturn', {
                    defaultValue: 'Save & Return',
                  })
                )}
                onBack={handleBack}
                onSave={handleContinue}
                saveDisabled={!canContinue}
                backAccessibilityLabel={String(
                  t('shiftTime.actions.backToSettings', {
                    defaultValue: 'Back to Settings',
                  })
                )}
                saveAccessibilityLabel={String(
                  t('shiftTime.actions.saveAndReturnA11y', {
                    defaultValue: 'Save shift time and return to settings',
                  })
                )}
              />
            ) : (
              <LinearGradient
                colors={['rgba(43, 24, 10, 0.84)', 'rgba(22, 14, 9, 0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bottomNavShell}
              >
                <Pressable
                  style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
                  onPress={handleBack}
                  accessibilityLabel={t('shiftTime.actions.goBack', { defaultValue: 'Go back' })}
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
                    pressed && canContinue && styles.continueButtonPressed,
                  ]}
                  onPress={handleContinue}
                  disabled={!canContinue}
                  accessibilityLabel={
                    totalStages === 1
                      ? t('shiftTime.actions.continueToNextStep', {
                          defaultValue: 'Continue to next step',
                        })
                      : isLastStage
                        ? t('shiftTime.actions.saveShiftTimesAndContinue', {
                            defaultValue: 'Save shift times and continue',
                          })
                        : t('shiftTime.actions.continueToShiftType', {
                            shiftType: getShiftTypeLabel(nextShiftType, 'lower'),
                            defaultValue: `Continue to ${getShiftTypeLabel(
                              nextShiftType,
                              'lower'
                            )} shift times`,
                          })
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canContinue }}
                >
                  <View
                    style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                  >
                    <LinearGradient
                      colors={
                        canContinue
                          ? [
                              theme.colors.sacredGold,
                              theme.colors.brightGold,
                              theme.colors.sacredGold,
                            ]
                          : ['rgba(78, 67, 61, 0.85)', 'rgba(58, 52, 49, 0.85)']
                      }
                      locations={canContinue ? [0, 0.5, 1] : undefined}
                      style={styles.continueGradient}
                    >
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.paper} />
                      <Text style={styles.continueButtonText}>
                        {totalStages === 1
                          ? t('shiftTime.actions.saveAndContinue', {
                              defaultValue: 'Save & Continue',
                            })
                          : isLastStage
                            ? t('shiftTime.actions.finishSetup', {
                                defaultValue: 'Finish Setup',
                              })
                            : t('shiftTime.actions.nextShiftType', {
                                defaultValue: 'Next Shift Type',
                              })}
                      </Text>
                      <Ionicons name="arrow-forward" size={22} color={theme.colors.paper} />
                    </LinearGradient>
                  </View>
                </Pressable>
              </LinearGradient>
            )}
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

const getPresetIconSource = (preset: ShiftPreset): ImageSourcePropType | undefined => {
  if (preset.id === 'custom') {
    return undefined;
  }

  return preset.imageSource;
};

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  selected,
  onSelect,
  index,
  reducedMotion,
}) => {
  const { t } = useTranslation('onboarding');
  const presetIconSource = getPresetIconSource(preset);
  const isCustom = preset.id === 'custom';
  const localizedPresetLabel = String(t(`shiftTime.presets.${preset.id}.label` as never));
  const scale = useSharedValue(1);
  const presetStartTime = !isCustom
    ? formatLocalizedTime(convertTo24Hour(preset.startTime, preset.period))
    : '';
  const localizedEndTimeLabel = !isCustom
    ? String(
        t('shiftTime.presets.endsAt', {
          time: formatLocalizedTime(
            calculateEndTime(convertTo24Hour(preset.startTime, preset.period), preset.duration)
          ),
        })
      )
    : '';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.98, { damping: 20 }), withSpring(1, { damping: 20 }));
    onSelect(preset.id);
  };

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(600).delay(400 + index * 100)}
      style={styles.presetCard}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={
            !isCustom ? `${localizedPresetLabel}. ${localizedEndTimeLabel}` : localizedPresetLabel
          }
          style={[
            styles.presetCardInner,
            selected && styles.presetCardSelected,
            isCustom && styles.presetCardCustom,
            preset.type === 'night' && !isCustom && styles.presetCardNight,
            preset.type === 'morning' && !isCustom && styles.presetCardMorning,
            preset.type === 'afternoon' && !isCustom && styles.presetCardAfternoon,
            selected && !isCustom && preset.type === 'night' && styles.presetCardSelectedNight,
            selected && !isCustom && preset.type === 'morning' && styles.presetCardSelectedMorning,
            selected &&
              !isCustom &&
              preset.type === 'afternoon' &&
              styles.presetCardSelectedAfternoon,
          ]}
        >
          {!isCustom && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>
                {t('shiftTime.units.hourShort', {
                  hours: preset.duration,
                  defaultValue: '{{hours}}h',
                })}
              </Text>
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
            {presetIconSource ? (
              <Image source={presetIconSource} style={styles.presetIconImage} />
            ) : preset.icon.length <= 2 ? (
              <Text style={{ fontSize: 28 }}>{preset.icon}</Text>
            ) : (
              <Ionicons
                name={preset.icon as keyof typeof Ionicons.glyphMap}
                size={28}
                color={theme.colors.paper}
              />
            )}
          </View>

          {!isCustom ? (
            <>
              <Text style={styles.presetTime} numberOfLines={1} adjustsFontSizeToFit>
                {presetStartTime}
              </Text>
              <Text style={styles.presetEndTime} numberOfLines={1}>
                {localizedEndTimeLabel}
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={theme.colors.sacredGold}
                style={{ marginBottom: 4 }}
              />
              <Text style={styles.presetCustomText}>{localizedPresetLabel}</Text>
            </>
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
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(180,83,9,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
    alignSelf: 'center',
  },
  stagePillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.sacredGold,
  },
  stageIndicator: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.sacredGold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  titleAccentRule: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.colors.sacredGold,
    alignSelf: 'center',
    marginBottom: 10,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.dust,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  inlineHint: {
    fontSize: 12,
    color: theme.colors.shadow,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: theme.spacing.lg,
    fontStyle: 'italic',
  },
  // Pattern Summary Strip (new compact design)
  patternStrip: {
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  patternStripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 44,
    overflow: 'hidden',
  },
  patternStripIcon: {
    width: 20,
    height: 20,
  },
  patternStripName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    letterSpacing: 0.2,
  },
  patternStripDivider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.opacity.gold20,
  },
  patternStripStats: {
    fontSize: 12,
    color: theme.colors.dust,
    flexShrink: 1,
  },
  patternStripMeta: {
    fontSize: 12,
    color: theme.colors.shadow,
    flexShrink: 0,
  },
  // Pattern Summary Card (legacy - kept to avoid dead-style errors)
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
  patternSimpleMeta: {
    fontSize: 12,
    color: theme.colors.dust,
    textAlign: 'center',
    opacity: 0.9,
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
    gap: 6,
    marginBottom: 14,
  },
  presetsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.dust,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  presetsScrollContent: {
    paddingRight: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  presetCard: {
    width: 132,
  },
  presetCardInner: {
    height: 172,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 20,
    padding: 12,
    paddingTop: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presetCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180,83,9,0.08)',
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
    backgroundColor: 'rgba(101, 31, 255, 0.10)',
  },
  presetCardMorning: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  presetCardAfternoon: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  presetCardCustom: {
    backgroundColor: 'rgba(180, 83, 9, 0.07)',
  },
  presetCardSelectedNight: {
    borderColor: '#651FFF',
    backgroundColor: 'rgba(101, 31, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#651FFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  presetCardSelectedMorning: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  presetCardSelectedAfternoon: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.paleGold,
  },
  presetIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 4,
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
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  presetIconCircleCustom: {
    backgroundColor: theme.colors.opacity.gold20,
  },
  presetTime: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.paper,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  presetEndTime: {
    fontSize: 11,
    color: theme.colors.shadow,
    textAlign: 'center',
    paddingBottom: 4,
  },
  presetCustomText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    textAlign: 'center',
  },
  // Custom Input Section
  customInputSection: {
    marginBottom: theme.spacing.xl,
  },
  customInputCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    gap: 16,
  },
  inputRow: {
    gap: theme.spacing.md,
  },
  customInputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.dust,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeInput: {
    width: 96,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.softStone,
    color: theme.colors.paper,
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeInputError: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.sacredGold,
    marginHorizontal: 4,
    lineHeight: 56,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: 3,
  },
  periodButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: theme.colors.sacredGold,
  },
  periodButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.shadow,
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
  detectionMetaText: {
    marginTop: theme.spacing.sm,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.paper,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detectionWindowText: {
    marginTop: 4,
    fontSize: 12,
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
  // Tip Footnote (new compact design)
  tipFootnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  tipFootnoteText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.shadow,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // Detection Inline Chip (new compact design)
  detectionInlineRow: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detectionInlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
  },
  detectionChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detectionChipLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detectionChipSep: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 2,
  },
  detectionChipWindow: {
    fontSize: 12,
    color: theme.colors.shadow,
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
    fontSize: 11,
    color: theme.colors.shadow,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default PremiumShiftTimeInputScreen;
