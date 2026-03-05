/**
 * PremiumFIFOCustomPatternScreen Component
 *
 * Custom FIFO roster builder with premium onboarding shell parity.
 * Preserves FIFO-specific controls:
 * - Work Pattern During Work Block
 * - Swing configuration
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  InteractionManager,
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
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import type { FIFOConfig } from '@/types';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 0.75;

const SPRING_CONFIGS = {
  fast: { damping: 10, stiffness: 400 },
  smooth: { damping: 20, stiffness: 300 },
  gentle: { damping: 15, stiffness: 220 },
} as const;

interface WorkPatternOption {
  id: 'straight-days' | 'straight-nights' | 'swing';
  title: string;
  icon: ImageSourcePropType;
  description: string;
  color: string;
}

const WORK_PATTERNS: WorkPatternOption[] = [
  {
    id: 'straight-days',
    title: 'Straight Days',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    icon: require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
    description: 'Work day shifts only for the entire work block (e.g., 7am-7pm)',
    color: theme.colors.shiftVisualization.dayShift,
  },
  {
    id: 'straight-nights',
    title: 'Straight Nights',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    icon: require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
    description: 'Work night shifts only for the entire work block (e.g., 7pm-7am)',
    color: theme.colors.shiftVisualization.nightShift,
  },
  {
    id: 'swing',
    title: 'Swing Roster',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    icon: require('../../../../assets/onboarding/icons/consolidated/roster-type-rotating.png'),
    description: 'Alternate between day shifts and night shifts during work block',
    color: theme.colors.sacredGold,
  },
];

interface EnhancedSliderProps {
  label: string;
  icon: string;
  value: number;
  min: number;
  max: number;
  color: string;
  trackColor: string;
  onChange: (value: number) => void;
  delayIndex?: number;
  reducedMotion?: boolean;
}

const EnhancedSlider: React.FC<EnhancedSliderProps> = ({
  label,
  icon,
  value,
  min,
  max,
  color,
  trackColor,
  onChange,
  delayIndex = 0,
  reducedMotion = false,
}) => {
  const [trackWidth, setTrackWidth] = React.useState(SLIDER_WIDTH);
  const translateX = useSharedValue(((value - min) / Math.max(1, max - min)) * trackWidth);
  const startX = useSharedValue(0);
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);
  const shakeX = useSharedValue(0);
  const thumbGlow = useSharedValue(0.3);

  useEffect(() => {
    containerOpacity.value = withDelay(delayIndex * 180, withTiming(1, { duration: 380 }));
    containerTranslateY.value = withDelay(delayIndex * 180, withSpring(0, SPRING_CONFIGS.gentle));
  }, [delayIndex, containerOpacity, containerTranslateY]);

  useEffect(() => {
    if (reducedMotion) {
      thumbGlow.value = 0.45;
      return;
    }
    thumbGlow.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 1400 }), withTiming(0.6, { duration: 1400 })),
      -1,
      true
    );
  }, [thumbGlow, reducedMotion]);

  useEffect(() => {
    translateX.value = withSpring(
      ((value - min) / Math.max(1, max - min)) * trackWidth,
      SPRING_CONFIGS.smooth
    );
  }, [value, min, max, trackWidth, translateX]);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.15, SPRING_CONFIGS.fast),
      withSpring(1, SPRING_CONFIGS.fast)
    );
  }, [value, badgeScale]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      onChange(value + 1);
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `PremiumFIFOCustomPatternScreen.slider.increment:${label}`,
      });
      return;
    }
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
      source: `PremiumFIFOCustomPatternScreen.slider.increment.limit:${label}`,
    });
  }, [max, onChange, shakeX, value, label]);

  const handleDecrement = useCallback(() => {
    if (value > min) {
      onChange(value - 1);
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `PremiumFIFOCustomPatternScreen.slider.decrement:${label}`,
      });
      return;
    }
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
      source: `PremiumFIFOCustomPatternScreen.slider.decrement.limit:${label}`,
    });
  }, [min, onChange, shakeX, value, label]);

  const handleTrackPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const tapX = event.nativeEvent.locationX;
      const clampedX = Math.max(0, Math.min(trackWidth, tapX));
      const progress = clampedX / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));

      if (newValue !== value) {
        onChange(newValue);
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
          source: `PremiumFIFOCustomPatternScreen.slider.trackPress:${label}`,
        });
      }
    },
    [max, min, onChange, trackWidth, value, label]
  );

  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `PremiumFIFOCustomPatternScreen.slider.drag:${label}`,
    });
  }, [label]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      scale.value = withSpring(1.1, SPRING_CONFIGS.fast);
      thumbGlow.value = withTiming(0.7, { duration: 160 });
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(trackWidth, startX.value + event.translationX));
      translateX.value = newX;
      const progress = newX / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));

      if (newValue !== value) {
        runOnJS(onChange)(newValue);
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1, SPRING_CONFIGS.fast);
      if (!reducedMotion) {
        thumbGlow.value = withRepeat(
          withSequence(withTiming(0.3, { duration: 1400 }), withTiming(0.6, { duration: 1400 })),
          -1,
          true
        );
      } else {
        thumbGlow.value = 0.45;
      }

      const progress = translateX.value / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));
      translateX.value = withSpring(
        ((newValue - min) / Math.max(1, max - min)) * trackWidth,
        SPRING_CONFIGS.smooth
      );
    });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }, { translateX: shakeX.value }],
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    shadowOpacity: thumbGlow.value,
  }));

  const trackFillAnimatedStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - 16 }, { scale: badgeScale.value }],
  }));

  return (
    <Animated.View style={[styles.sliderContainer, containerAnimatedStyle]}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderLabelContainer}>
          <Text style={styles.sliderEmoji}>{icon}</Text>
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <Text style={[styles.sliderValue, { color }]}>{value}</Text>
      </View>

      <View style={styles.sliderControls}>
        <Pressable
          onPress={handleDecrement}
          style={[styles.controlButton, value === min && styles.controlButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityHint={`Current value is ${value}. Minimum is ${min}.`}
          accessibilityState={{ disabled: value === min }}
        >
          <Ionicons name="remove" size={20} color={value === min ? theme.colors.dust : color} />
        </Pressable>

        <View
          style={styles.sliderTrackContainer}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setTrackWidth(width);
          }}
        >
          <View style={[styles.sliderTrack, { backgroundColor: theme.colors.opacity.white10 }]}>
            <Animated.View
              style={[
                styles.sliderTrackFill,
                { backgroundColor: trackColor },
                trackFillAnimatedStyle,
              ]}
            />
          </View>

          <Pressable onPress={handleTrackPress} style={styles.trackPressable} />

          <View style={styles.tickMarks}>
            {Array.from({ length: max - min + 1 }).map((_, index) => (
              <View
                key={`${label}-${index}`}
                style={[
                  styles.tickMark,
                  index === value - min && { backgroundColor: color, height: 8, width: 2 },
                ]}
              />
            ))}
          </View>

          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>{min}</Text>
            <Text style={styles.rangeLabel}>{max}</Text>
          </View>

          <Animated.View
            style={[styles.valueBadge, { backgroundColor: color }, badgeAnimatedStyle]}
          >
            <Text style={styles.valueBadgeText}>{value}</Text>
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[styles.sliderThumb, { backgroundColor: color }, thumbAnimatedStyle]}
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityValue={{ min, max, now: value, text: `${value} ${label.toLowerCase()}` }}
              accessibilityHint="Swipe left or right to adjust value"
            >
              <View style={styles.thumbInner} />
            </Animated.View>
          </GestureDetector>
        </View>

        <Pressable
          onPress={handleIncrement}
          style={[styles.controlButton, value === max && styles.controlButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityHint={`Current value is ${value}. Maximum is ${max}.`}
          accessibilityState={{ disabled: value === max }}
        >
          <Ionicons name="add" size={20} color={value === max ? theme.colors.dust : color} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

interface WorkPatternCardProps {
  pattern: WorkPatternOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

const WorkPatternCard: React.FC<WorkPatternCardProps> = ({
  pattern,
  isSelected,
  onSelect,
  index,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 360 }));
    translateY.value = withDelay(index * 100, withSpring(0, SPRING_CONFIGS.gentle));
  }, [index, opacity, translateY]);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.96, SPRING_CONFIGS.fast),
      withSpring(1, SPRING_CONFIGS.fast)
    );
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: `PremiumFIFOCustomPatternScreen.workPattern.select:${pattern.id}`,
    });
    onSelect();
  }, [onSelect, pattern.id, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={handlePress} testID={`work-pattern-${pattern.id}`}>
      <Animated.View
        style={[
          styles.patternCard,
          isSelected && styles.patternCardSelected,
          { borderColor: isSelected ? pattern.color : theme.colors.softStone },
          cardStyle,
        ]}
      >
        <Image source={pattern.icon} style={styles.patternIconImage} resizeMode="contain" />
        <Text style={styles.patternTitle}>{pattern.title}</Text>
        <Text style={styles.patternDescription}>{pattern.description}</Text>
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: pattern.color }]}>
            <Ionicons name="checkmark" size={16} color={theme.colors.deepVoid} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

interface FIFOPreviewCardProps {
  workBlockDays: number;
  restBlockDays: number;
  workPattern: 'straight-days' | 'straight-nights' | 'swing' | 'custom';
  daysOnDayShift: number;
  daysOnNightShift: number;
  reducedMotion: boolean;
}

const FIFOPreviewCard: React.FC<FIFOPreviewCardProps> = ({
  workBlockDays,
  restBlockDays,
  workPattern,
  daysOnDayShift,
  daysOnNightShift,
  reducedMotion,
}) => {
  const scaleValue = useSharedValue(0.9);
  const opacityValue = useSharedValue(0);
  const floatValue = useSharedValue(0);

  const totalCycleDays = workBlockDays + restBlockDays;
  const workPercentage = Math.round((workBlockDays / Math.max(1, totalCycleDays)) * 100);
  const restPercentage = Math.round((restBlockDays / Math.max(1, totalCycleDays)) * 100);
  const previewDays = Math.min(totalCycleDays, 42);

  useEffect(() => {
    scaleValue.value = withDelay(200, withSpring(1, SPRING_CONFIGS.gentle));
    opacityValue.value = withDelay(200, withTiming(1, { duration: 420 }));
  }, [opacityValue, scaleValue]);

  useEffect(() => {
    if (reducedMotion) {
      floatValue.value = 0;
      return;
    }
    floatValue.value = withRepeat(
      withSequence(withTiming(-2, { duration: 1800 }), withTiming(2, { duration: 1800 })),
      -1,
      true
    );
  }, [floatValue, reducedMotion]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateY: floatValue.value }],
    opacity: opacityValue.value,
  }));

  return (
    <Animated.View style={[styles.previewCard, cardAnimatedStyle]}>
      <LinearGradient
        colors={[theme.colors.softStone, theme.colors.darkStone]}
        style={styles.previewGradient}
      >
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Your FIFO Rotation Preview</Text>
          <Text style={styles.previewSubtitle}>
            {workBlockDays} days at site, then {restBlockDays} days at home
          </Text>
        </View>

        <View style={styles.blockSummaryRow}>
          <View
            style={[
              styles.summaryChip,
              { backgroundColor: theme.colors.shiftVisualization.dayShift },
            ]}
          >
            <Text style={styles.summaryChipText}>Work: {workBlockDays}d</Text>
          </View>
          <View
            style={[
              styles.summaryChip,
              { backgroundColor: theme.colors.shiftVisualization.daysOff },
            ]}
          >
            <Text style={styles.summaryChipText}>Rest: {restBlockDays}d</Text>
          </View>
        </View>
        {workPattern === 'swing' && (
          <Text style={styles.swingPreviewText}>
            Swing split: {daysOnDayShift} day-shift days + {daysOnNightShift} night-shift days
          </Text>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cyclePreview}
        >
          {Array.from({ length: previewDays }).map((_, index) => {
            const isWork = index < workBlockDays;
            let backgroundColor: string = theme.colors.shiftVisualization.daysOff;

            if (isWork) {
              if (workPattern === 'straight-nights') {
                backgroundColor = theme.colors.shiftVisualization.nightShift;
              } else if (workPattern === 'swing') {
                backgroundColor =
                  index < daysOnDayShift
                    ? theme.colors.shiftVisualization.dayShift
                    : theme.colors.shiftVisualization.nightShift;
              } else {
                backgroundColor = theme.colors.shiftVisualization.dayShift;
              }
            }

            return (
              <View
                key={`fifo-day-${index}`}
                style={[styles.cycleSquare, { backgroundColor }]}
                accessibilityLabel={`Cycle day ${index + 1}`}
              />
            );
          })}
        </ScrollView>

        <View style={styles.balanceChart}>
          <Text style={styles.balanceTitle}>Work-Rest Balance</Text>
          <View style={styles.chartBar}>
            <View style={[styles.chartSegment, { width: `${workPercentage}%` }]}>
              <LinearGradient
                colors={[
                  theme.colors.shiftVisualization.dayShift,
                  theme.colors.shiftVisualization.nightShift,
                ]}
                style={styles.chartGradient}
              >
                <Text style={styles.chartPercentage}>{workPercentage}%</Text>
              </LinearGradient>
            </View>
            <View style={[styles.chartSegment, { width: `${restPercentage}%` }]}>
              <LinearGradient
                colors={[theme.colors.success, theme.colors.successBg]}
                style={styles.chartGradient}
              >
                <Text style={styles.chartPercentage}>{restPercentage}%</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>Work: {workBlockDays} days</Text>
            <Text style={styles.chartLabel}>Rest: {restBlockDays} days</Text>
          </View>
        </View>

        <View style={styles.cycleBadge}>
          <Ionicons name="calendar-number-outline" size={16} color={theme.colors.paper} />
          <Text style={styles.cycleBadgeText}>{totalCycleDays}-day FIFO cycle</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export const PremiumFIFOCustomPatternScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();

  const [workBlockDays, setWorkBlockDays] = useState(data.fifoConfig?.workBlockDays || 14);
  const [restBlockDays, setRestBlockDays] = useState(data.fifoConfig?.restBlockDays || 14);
  const [workPattern, setWorkPattern] = useState<
    'straight-days' | 'straight-nights' | 'swing' | 'custom'
  >(data.fifoConfig?.workBlockPattern || 'straight-days');
  const [daysOnDayShift, setDaysOnDayShift] = useState(
    data.fifoConfig?.swingPattern?.daysOnDayShift || 7
  );
  const [daysOnNightShift, setDaysOnNightShift] = useState(
    data.fifoConfig?.swingPattern?.daysOnNightShift || 7
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reducedMotionRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);
  const continueButtonScale = useSharedValue(1);

  const clearPendingTransition = useCallback((resetUi: boolean) => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }

    if (interactionHandleRef.current?.cancel) {
      interactionHandleRef.current.cancel();
    }
    interactionHandleRef.current = null;

    if (resetUi) {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const updateReducedMotionState = (enabled: boolean) => {
      if (!mounted || reducedMotionRef.current === enabled) {
        return;
      }
      reducedMotionRef.current = enabled;
      setReducedMotion(enabled);
    };

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      updateReducedMotionState(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      updateReducedMotionState(enabled);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTransition(false);
    };
  }, [clearPendingTransition]);

  useEffect(() => {
    if (workPattern !== 'swing') {
      return;
    }

    const swingTotal = daysOnDayShift + daysOnNightShift;
    if (swingTotal > workBlockDays) {
      const ratio = daysOnDayShift / Math.max(1, swingTotal);
      setDaysOnDayShift(Math.max(1, Math.floor(workBlockDays * ratio)));
      setDaysOnNightShift(Math.max(1, Math.ceil(workBlockDays * (1 - ratio))));
    }
  }, [daysOnDayShift, daysOnNightShift, workBlockDays, workPattern]);

  const totalCycleDays = useMemo(
    () => workBlockDays + restBlockDays,
    [workBlockDays, restBlockDays]
  );
  const workPercentage = useMemo(
    () => Math.round((workBlockDays / Math.max(1, totalCycleDays)) * 100),
    [workBlockDays, totalCycleDays]
  );
  const swingTotal = daysOnDayShift + daysOnNightShift;
  const swingMismatch = workPattern === 'swing' && swingTotal !== workBlockDays;
  const hasHardError = workBlockDays < 1 || restBlockDays < 1 || swingMismatch;
  const hasWarning = !hasHardError && (workPercentage > 75 || totalCycleDays > 42);

  useEffect(() => {
    if (!hasHardError && !reducedMotion && !isTransitioning) {
      continueButtonScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1000 }), withTiming(1.03, { duration: 1000 })),
        -1,
        true
      );
      return;
    }
    continueButtonScale.value = 1;
  }, [continueButtonScale, hasHardError, reducedMotion, isTransitioning]);

  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const handleBack = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }

    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumFIFOCustomPatternScreen.handleBack',
    });
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (hasHardError || isTransitioningRef.current) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumFIFOCustomPatternScreen.handleContinue.invalid',
      });
      return;
    }

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    const fifoConfig: FIFOConfig = {
      workBlockDays,
      restBlockDays,
      workBlockPattern: workPattern,
      ...(workPattern === 'swing' && {
        swingPattern: {
          daysOnDayShift,
          daysOnNightShift,
        },
      }),
    };

    updateData({ fifoConfig });
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumFIFOCustomPatternScreen.handleContinue.success',
    });
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        clearPendingTransition(true);
        goToNextScreen(navigation, 'FIFOCustomPattern', {
          ...data,
          rosterType: 'fifo',
          patternType: data.patternType,
          fifoConfig,
        });
      }, 300);
    });
  }, [
    clearPendingTransition,
    data,
    daysOnDayShift,
    daysOnNightShift,
    hasHardError,
    navigation,
    restBlockDays,
    updateData,
    workBlockDays,
    workPattern,
  ]);

  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.SHIFT_PATTERN + 0.5}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        testID="fifo-custom-pattern-progress-header"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Build Your FIFO Rotation</Text>
        <Text style={styles.subtitle}>
          Set your on-site block, home block, and work-block shift style for a schedule that fits
          your site cycle.
        </Text>
        <Text style={styles.subtitleSecondary}>Work Block, Rest Block &amp; Pattern Split</Text>

        <View style={styles.slidersSection}>
          <View style={styles.slidersHeader}>
            <Ionicons name="construct-outline" size={22} color={theme.colors.sacredGold} />
            <Text style={styles.slidersTitle}>Set Up Your FIFO Pattern</Text>
          </View>

          <View style={styles.slidersContainer}>
            <EnhancedSlider
              label="Days at Site (Work Block)"
              icon="🏗️"
              value={workBlockDays}
              min={1}
              max={60}
              color={theme.colors.shiftVisualization.dayShift}
              trackColor="#60A5FA"
              onChange={setWorkBlockDays}
              delayIndex={0}
              reducedMotion={reducedMotion}
            />

            <EnhancedSlider
              label="Days at Home (Rest Block)"
              icon="🏠"
              value={restBlockDays}
              min={1}
              max={60}
              color={theme.colors.shiftVisualization.daysOff}
              trackColor="#a8a29e"
              onChange={setRestBlockDays}
              delayIndex={1}
              reducedMotion={reducedMotion}
            />
          </View>
        </View>

        <View style={styles.sectionContainer} testID="work-pattern-section">
          <Text style={styles.sectionTitle}>Work Pattern During Work Block</Text>
          <Text style={styles.sectionSubtitle}>How are your shifts organized while at site?</Text>

          <View style={styles.patternCardsContainer}>
            {WORK_PATTERNS.map((pattern, index) => (
              <WorkPatternCard
                key={pattern.id}
                pattern={pattern}
                isSelected={workPattern === pattern.id}
                onSelect={() => setWorkPattern(pattern.id)}
                index={index}
              />
            ))}
          </View>
        </View>

        {workPattern === 'swing' && (
          <View style={styles.swingConfigContainer} testID="swing-config-section">
            <Text style={styles.sectionTitle}>Swing Configuration</Text>
            <Text style={styles.sectionSubtitle}>
              Split your work block between day and night shifts.
            </Text>

            <EnhancedSlider
              label="Days on Day Shift"
              icon="☀️"
              value={daysOnDayShift}
              min={1}
              max={Math.max(1, workBlockDays - 1)}
              color={theme.colors.shiftVisualization.dayShift}
              trackColor="#60A5FA"
              onChange={(val) => {
                setDaysOnDayShift(val);
                setDaysOnNightShift(Math.max(0, workBlockDays - val));
              }}
              delayIndex={2}
              reducedMotion={reducedMotion}
            />

            <EnhancedSlider
              label="Days on Night Shift"
              icon="🌙"
              value={daysOnNightShift}
              min={1}
              max={Math.max(1, workBlockDays - 1)}
              color={theme.colors.shiftVisualization.nightShift}
              trackColor="#A78BFA"
              onChange={(val) => {
                setDaysOnNightShift(val);
                setDaysOnDayShift(Math.max(0, workBlockDays - val));
              }}
              delayIndex={3}
              reducedMotion={reducedMotion}
            />

            <Text style={styles.swingSplitText} testID="swing-total-text">
              Split total: {swingTotal}/{workBlockDays} days
            </Text>
          </View>
        )}

        <Text style={styles.previewGuide}>
          <Ionicons name="arrow-down" size={16} color={theme.colors.sacredGold} /> See your FIFO
          pattern below
        </Text>

        <FIFOPreviewCard
          workBlockDays={workBlockDays}
          restBlockDays={restBlockDays}
          workPattern={workPattern}
          daysOnDayShift={daysOnDayShift}
          daysOnNightShift={daysOnNightShift}
          reducedMotion={reducedMotion}
        />

        {hasHardError && (
          <View style={styles.validationMessage} testID="fifo-status-error">
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.validationText}>
              {swingMismatch
                ? `Swing split must equal ${workBlockDays} days before saving.`
                : 'Work and rest blocks must each be at least 1 day.'}
            </Text>
          </View>
        )}

        {!hasHardError && hasWarning && (
          <View style={styles.warningMessage} testID="fifo-status-warning">
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
            <Text style={styles.warningText}>
              This roster is heavy ({workPercentage}% work). Consider balancing with more home days
              if fatigue becomes an issue.
            </Text>
          </View>
        )}

        {!hasHardError && !hasWarning && (
          <View style={styles.successMessage} testID="fifo-status-success">
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
            <Text style={styles.successText}>
              Solid FIFO setup. {workBlockDays} days at site, then {restBlockDays} days at home.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to shift pattern selection"
          testID="fifo-custom-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
        </Pressable>

        <Animated.View style={continueButtonAnimatedStyle}>
          <Pressable
            onPress={handleContinue}
            style={[styles.continueButton, hasHardError && styles.continueButtonDisabled]}
            disabled={hasHardError || isTransitioning}
            accessibilityRole="button"
            accessibilityLabel="Save FIFO pattern and continue"
            accessibilityHint={
              hasHardError
                ? 'Fix the validation issue before continuing'
                : `${workBlockDays} days work, ${restBlockDays} days rest`
            }
            accessibilityState={{ disabled: hasHardError || isTransitioning }}
            testID="fifo-custom-save-button"
          >
            <LinearGradient
              colors={
                hasHardError
                  ? [theme.colors.shadow, theme.colors.shadow]
                  : [theme.colors.sacredGold, theme.colors.brightGold]
              }
              style={styles.continueGradient}
            >
              <Ionicons name="save-outline" size={22} color={theme.colors.paper} />
              <Text style={styles.continueButtonText}>Save FIFO Pattern</Text>
              <Ionicons name="arrow-forward" size={24} color={theme.colors.paper} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {isTransitioning ? (
        <View style={styles.transitionOverlay} pointerEvents="none">
          <Text style={styles.transitionText}>Preparing next step...</Text>
        </View>
      ) : null}
    </View>
  );
};

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
    paddingBottom: 120,
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
    marginBottom: theme.spacing.md,
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
  subtitleSecondary: {
    fontSize: 14,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    fontWeight: '600',
  },
  slidersSection: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  slidersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  slidersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  slidersContainer: {
    gap: theme.spacing.md,
  },
  sliderContainer: {
    marginBottom: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  sliderEmoji: {
    fontSize: 20,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.paper,
    flexShrink: 1,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.deepVoid,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 62,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
  trackPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  tickMarks: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    paddingHorizontal: 2,
  },
  tickMark: {
    width: 1,
    height: 6,
    backgroundColor: theme.colors.opacity.white30,
  },
  rangeLabels: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 11,
    color: theme.colors.dust,
  },
  valueBadge: {
    position: 'absolute',
    top: -30,
    width: 32,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -16,
  },
  valueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.deepVoid,
  },
  sliderThumb: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -16,
    marginTop: -4,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.deepVoid,
  },
  sectionContainer: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.paper,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.dust,
    marginBottom: 14,
  },
  patternCardsContainer: {
    gap: 12,
  },
  patternCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    position: 'relative',
  },
  patternCardSelected: {
    borderWidth: 2,
  },
  patternIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  patternIconImage: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },
  patternTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: 4,
  },
  patternDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.dust,
    paddingRight: 24,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swingConfigContainer: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  swingSplitText: {
    fontSize: 13,
    color: theme.colors.sacredGold,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  previewGuide: {
    fontSize: 14,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  previewCard: {
    marginBottom: theme.spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  previewGradient: {
    borderRadius: 24,
    padding: theme.spacing.lg,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  previewTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 14,
    color: theme.colors.dust,
    marginTop: 4,
    textAlign: 'center',
  },
  blockSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  summaryChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryChipText: {
    color: theme.colors.paper,
    fontWeight: '700',
    fontSize: 13,
  },
  swingPreviewText: {
    color: theme.colors.sacredGold,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
  },
  cyclePreview: {
    gap: 6,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  cycleSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  balanceChart: {
    backgroundColor: theme.colors.opacity.black40,
    borderRadius: 14,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  balanceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.paper,
    marginBottom: 10,
  },
  chartBar: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    height: 28,
    marginBottom: 10,
    backgroundColor: theme.colors.opacity.white10,
  },
  chartSegment: {
    height: '100%',
  },
  chartGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPercentage: {
    fontSize: 11,
    color: theme.colors.paper,
    fontWeight: '700',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    color: theme.colors.dust,
    fontSize: 12,
    fontWeight: '600',
  },
  cycleBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.opacity.black40,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cycleBadgeText: {
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: '700',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.successBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: theme.spacing.xl,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.success,
    lineHeight: 20,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.errorBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: theme.spacing.xl,
  },
  validationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
    lineHeight: 20,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.warningBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: theme.spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.warning,
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.deepVoid,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    width: SCREEN_WIDTH - theme.spacing.lg * 2 - 56 - theme.spacing.md,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
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
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    zIndex: 200,
  },
  transitionText: {
    color: theme.colors.paper,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
