/**
 * PremiumCustomPatternScreen Component
 *
 * Custom shift pattern builder with interactive sliders and live preview (Step 4 of 10)
 * Appears when user selects "Custom Pattern" from shift pattern cards
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
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
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'CustomPattern'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 0.75;

// Cycle block colors
const CYCLE_COLORS = {
  day: '#2196F3',
  night: '#651FFF',
  off: '#F59E0B',
} as const;

// Enhanced Slider Component
interface EnhancedSliderProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  min: number;
  max: number;
  color: string;
  trackColor: string;
  onChange: (value: number) => void;
  delayIndex?: number;
  reducedMotion?: boolean;
  customThumbIcon?: ImageSourcePropType;
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
  customThumbIcon,
}) => {
  const translateX = useSharedValue(((value - min) / (max - min)) * SLIDER_WIDTH);
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);
  const shakeX = useSharedValue(0);
  const thumbGlow = useSharedValue(0.3);

  // Entry animation
  useEffect(() => {
    containerOpacity.value = withDelay(delayIndex * 200, withTiming(1, { duration: 400 }));
    containerTranslateY.value = withDelay(
      delayIndex * 200,
      withSpring(0, { damping: 15, stiffness: 200 })
    );
  }, [delayIndex, containerOpacity, containerTranslateY]);

  // Idle glow pulse animation (skip if reduced motion)
  useEffect(() => {
    if (!reducedMotion) {
      thumbGlow.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 1500 }), withTiming(0.6, { duration: 1500 })),
        -1,
        true
      );
    } else {
      thumbGlow.value = 0.4; // Static value for reduced motion
    }
  }, [thumbGlow, reducedMotion]);

  // Update position when value changes externally
  useEffect(() => {
    translateX.value = withSpring(((value - min) / (max - min)) * SLIDER_WIDTH, {
      damping: 20,
      stiffness: 300,
    });
    badgeScale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [value, min, max, translateX, badgeScale]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      onChange(value + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Shake animation when hitting max limit
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [value, max, onChange, shakeX]);

  const handleDecrement = useCallback(() => {
    if (value > min) {
      onChange(value - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Shake animation when hitting min limit
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [value, min, onChange, shakeX]);

  const handleTrackPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const tapX = event.nativeEvent.locationX;
      const clampedX = Math.max(0, Math.min(SLIDER_WIDTH, tapX));
      const progress = clampedX / SLIDER_WIDTH;
      const newValue = Math.round(min + progress * (max - min));

      if (newValue !== value) {
        onChange(newValue);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [min, max, value, onChange]
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.1, { damping: 10, stiffness: 400 });
      thumbGlow.value = withTiming(0.6, { duration: 150 }); // Max glow during drag
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onUpdate((event: any) => {
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, event.translationX + translateX.value));
      translateX.value = newX;

      // Calculate new value
      const progress = newX / SLIDER_WIDTH;
      const newValue = Math.round(min + progress * (max - min));

      if (newValue !== value) {
        runOnJS(onChange)(newValue);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 400 });

      // Resume idle glow pulse
      thumbGlow.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 1500 }), withTiming(0.6, { duration: 1500 })),
        -1,
        true
      );

      // Snap to nearest value
      const progress = translateX.value / SLIDER_WIDTH;
      const newValue = Math.round(min + progress * (max - min));
      translateX.value = withSpring(((newValue - min) / (max - min)) * SLIDER_WIDTH, {
        damping: 20,
        stiffness: 300,
      });
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
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <Text style={[styles.sliderValue, { color }]}>{value}</Text>
      </View>

      <View style={styles.sliderControls}>
        {/* Decrement Button */}
        <Pressable
          onPress={handleDecrement}
          style={[styles.controlButton, value === min && styles.controlButtonDisabled]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityHint={`Current value is ${value}. Minimum is ${min}.`}
          accessibilityState={{ disabled: value === min }}
        >
          <Ionicons name="remove" size={20} color={value === min ? theme.colors.dust : color} />
        </Pressable>

        {/* Slider Track */}
        <View style={styles.sliderTrackContainer}>
          <View style={[styles.sliderTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <Animated.View
              style={[
                styles.sliderTrackFill,
                { backgroundColor: trackColor },
                trackFillAnimatedStyle,
              ]}
            />
          </View>

          {/* Tap-to-jump overlay */}
          <Pressable onPress={handleTrackPress} style={styles.trackPressable} />

          {/* Tick Marks */}
          <View style={styles.tickMarks}>
            {Array.from({ length: max - min + 1 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tickMark,
                  i === value - min && { backgroundColor: color, height: 8, width: 2 },
                ]}
              />
            ))}
          </View>

          {/* Range Labels */}
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>{min}</Text>
            <Text style={styles.rangeLabel}>{max}</Text>
          </View>

          {/* Value Badge (floating above thumb) */}
          <Animated.View
            style={[styles.valueBadge, { backgroundColor: color }, badgeAnimatedStyle]}
          >
            <Text style={styles.valueBadgeText}>{value}</Text>
          </Animated.View>

          {/* Animated Thumb */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[styles.sliderThumb, { backgroundColor: color }, thumbAnimatedStyle]}
              accessible={true}
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityValue={{ min, max, now: value, text: `${value} ${label.toLowerCase()}` }}
              accessibilityHint="Swipe left or right to adjust value"
            >
              {customThumbIcon ? (
                <Image source={customThumbIcon} style={styles.thumbIcon} resizeMode="contain" />
              ) : (
                <Ionicons name={icon} size={14} color="#fff" />
              )}
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Increment Button */}
        <Pressable
          onPress={handleIncrement}
          style={[styles.controlButton, value === max && styles.controlButtonDisabled]}
          accessible={true}
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

// Live Preview Card Component
interface LivePreviewCardProps {
  daysOn: number;
  nightsOn: number;
  daysOff: number;
  reducedMotion?: boolean;
}

const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  daysOn,
  nightsOn,
  daysOff,
  reducedMotion = false,
}) => {
  const scaleValue = useSharedValue(0.8);
  const opacityValue = useSharedValue(0);
  const floatValue = useSharedValue(0);
  const dayBlockScale = useSharedValue(0);
  const nightBlockScale = useSharedValue(0);
  const offBlockScale = useSharedValue(0);
  const cycleLengthScale = useSharedValue(1);

  // Memoize work-rest calculations
  const { totalDays, workDays, workPercentage, restPercentage, workRatio, restRatio } =
    useMemo(() => {
      const total = daysOn + nightsOn + daysOff;
      const work = daysOn + nightsOn;
      const workPct = Math.round((work / total) * 100);
      const restPct = Math.round((daysOff / total) * 100);

      // Calculate work-rest ratio (simplified)
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(work, daysOff);
      const wRatio = work / divisor;
      const rRatio = daysOff / divisor;

      return {
        totalDays: total,
        workDays: work,
        workPercentage: workPct,
        restPercentage: restPct,
        workRatio: wRatio,
        restRatio: rRatio,
      };
    }, [daysOn, nightsOn, daysOff]);

  // Animated percentages for count-up effect
  const animatedWorkPercentage = useSharedValue(workPercentage);
  const animatedRestPercentage = useSharedValue(restPercentage);

  // Animate percentages when they change
  useEffect(() => {
    animatedWorkPercentage.value = withTiming(workPercentage, { duration: 400 });
    animatedRestPercentage.value = withTiming(restPercentage, { duration: 400 });
  }, [workPercentage, restPercentage, animatedWorkPercentage, animatedRestPercentage]);

  // Entry animation
  useEffect(() => {
    scaleValue.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 200 }));
    opacityValue.value = withDelay(200, withTiming(1, { duration: 400 }));

    // Staggered entrance for cycle blocks
    dayBlockScale.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 200 }));
    nightBlockScale.value = withDelay(400, withSpring(1, { damping: 15, stiffness: 200 }));
    offBlockScale.value = withDelay(500, withSpring(1, { damping: 15, stiffness: 200 }));
  }, [scaleValue, opacityValue, dayBlockScale, nightBlockScale, offBlockScale]);

  // Idle floating animation (skip if reduced motion)
  useEffect(() => {
    if (!reducedMotion) {
      floatValue.value = withRepeat(
        withSequence(withTiming(-2, { duration: 2000 }), withTiming(2, { duration: 2000 })),
        -1,
        true
      );
    }
  }, [floatValue, reducedMotion]);

  // Pulse animations when values change (only if already entered)
  useEffect(() => {
    if (dayBlockScale.value === 1) {
      dayBlockScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
    }
  }, [daysOn, dayBlockScale]);

  useEffect(() => {
    if (nightBlockScale.value === 1) {
      nightBlockScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
    }
  }, [nightsOn, nightBlockScale]);

  useEffect(() => {
    if (offBlockScale.value === 1) {
      offBlockScale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
    }
  }, [daysOff, offBlockScale]);

  useEffect(() => {
    cycleLengthScale.value = withSequence(
      withSpring(1.1, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
  }, [totalDays, cycleLengthScale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }, { translateY: floatValue.value }],
    opacity: opacityValue.value,
  }));

  const dayBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dayBlockScale.value }],
  }));

  const nightBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nightBlockScale.value }],
  }));

  const offBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: offBlockScale.value }],
  }));

  const cycleLengthAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cycleLengthScale.value }],
  }));

  // Generate cycle preview squares (memoized)
  const cyclePattern = useMemo(
    () => [
      ...Array(daysOn).fill('day'),
      ...Array(nightsOn).fill('night'),
      ...Array(daysOff).fill('off'),
    ],
    [daysOn, nightsOn, daysOff]
  );

  // Cycle preview animation (pulse when pattern changes)
  const cyclePreviewScale = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      cyclePreviewScale.value = withSequence(
        withTiming(1.05, { duration: 200 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
    }
  }, [cyclePattern.length, daysOn, nightsOn, daysOff, reducedMotion, cyclePreviewScale]);

  const cyclePreviewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cyclePreviewScale.value }],
  }));

  return (
    <Animated.View style={[styles.previewCard, cardAnimatedStyle]}>
      <LinearGradient colors={['#b45309', '#d97706']} style={styles.previewGradient}>
        {/* Header */}
        <View style={styles.previewHeader}>
          <Ionicons name="calendar-outline" size={24} color="#fff" />
          <Text style={styles.previewTitle}>Custom Cycle</Text>
        </View>

        {/* Cycle Blocks */}
        <View style={styles.cycleBlocks}>
          <Animated.View style={[styles.cycleBlock, dayBlockAnimatedStyle]}>
            <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.day }]}>
              <Ionicons name="sunny" size={20} color="#fff" />
              <Text style={styles.cycleBlockNumber}>{daysOn}</Text>
              <Text style={styles.cycleBlockLabel}>Days</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.cycleBlock, nightBlockAnimatedStyle]}>
            <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.night }]}>
              <Ionicons name="moon" size={20} color="#fff" />
              <Text style={styles.cycleBlockNumber}>{nightsOn}</Text>
              <Text style={styles.cycleBlockLabel}>Nights</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.cycleBlock, offBlockAnimatedStyle]}>
            <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.off }]}>
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.cycleBlockNumber}>{daysOff}</Text>
              <Text style={styles.cycleBlockLabel}>Off</Text>
            </View>
          </Animated.View>
        </View>

        {/* Visual Cycle Preview */}
        <View style={styles.cyclePreviewSection}>
          {/* Calendar Grid Icon */}
          <View style={styles.calendarGridIconContainer}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/cycle-preview-calendar-grid.png')}
              style={styles.calendarGridIcon}
              resizeMode="contain"
            />
          </View>

          <View style={styles.cycleLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.day }]} />
              <Text style={styles.legendText}>Day Shift</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.night }]} />
              <Text style={styles.legendText}>Night Shift</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.off }]} />
              <Text style={styles.legendText}>Day Off</Text>
            </View>
          </View>

          <Animated.View style={[styles.cyclePreview, cyclePreviewAnimatedStyle]}>
            {cyclePattern.map((type, index) => (
              <View
                key={index}
                style={[
                  styles.cycleSquare,
                  {
                    backgroundColor:
                      type === 'day'
                        ? CYCLE_COLORS.day
                        : type === 'night'
                          ? CYCLE_COLORS.night
                          : CYCLE_COLORS.off,
                  },
                ]}
              />
            ))}
          </Animated.View>

          <Animated.View style={cycleLengthAnimatedStyle}>
            <Text style={styles.cycleLabel}>Your {totalDays}-day cycle</Text>
          </Animated.View>
        </View>

        {/* Work-Rest Balance Chart */}
        <View style={styles.balanceChart}>
          <Text style={styles.balanceTitle}>Work-Rest Balance</Text>
          <View style={styles.chartBar}>
            <View style={[styles.chartSegment, { flex: workDays }]}>
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.chartGradient}>
                <Text style={styles.chartPercentage}>{workPercentage}%</Text>
              </LinearGradient>
            </View>
            <View style={[styles.chartSegment, { flex: daysOff }]}>
              <LinearGradient colors={['#22C55E', '#15803D']} style={styles.chartGradient}>
                <Text style={styles.chartPercentage}>{restPercentage}%</Text>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>Work: {workDays} days</Text>
            <Text style={styles.chartLabel}>Rest: {daysOff} days</Text>
          </View>
          <View style={styles.ratioContainer}>
            <Text style={styles.ratioLabel}>Work:Rest Ratio</Text>
            <Text style={styles.ratioValue}>
              {workRatio}:{restRatio}
            </Text>
          </View>
        </View>

        {/* Cycle Length Badge */}
        <Animated.View style={[styles.cycleBadge, cycleLengthAnimatedStyle]}>
          <Ionicons name="calendar-number-outline" size={16} color="#fff" />
          <Text style={styles.cycleBadgeText}>{totalDays}-day cycle</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

// Main Screen Component
export interface PremiumCustomPatternScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
  testID?: string;
}

export const PremiumCustomPatternScreen: React.FC<PremiumCustomPatternScreenProps> = ({
  onBack,
  onContinue,
  testID = 'premium-custom-pattern-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { updateData } = useOnboarding();
  const [daysOn, setDaysOn] = useState(4);
  const [nightsOn, setNightsOn] = useState(4);
  const [daysOff, setDaysOff] = useState(4);
  const [showTip, setShowTip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const tipOpacity = useSharedValue(0);
  const continueButtonScale = useSharedValue(1);
  const heroIconOpacity = useSharedValue(0);
  const heroIconScale = useSharedValue(0.8);

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

  // Calculate validation and metrics
  const totalDays = daysOn + nightsOn + daysOff;
  const hasWorkTime = daysOn > 0 || nightsOn > 0;
  const isValid = totalDays <= 28 && hasWorkTime && daysOff >= 1;
  const workDays = daysOn + nightsOn;
  const workPercentage = Math.round((workDays / totalDays) * 100);
  const hasHighWorkRatio = workPercentage > 85;

  // Hero icon entrance animation
  useEffect(() => {
    heroIconOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    heroIconScale.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 200 }));
  }, [heroIconOpacity, heroIconScale]);

  // Show tip after first interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTip(true);
      tipOpacity.value = withTiming(1, { duration: 300 });
    }, 800);
    return () => clearTimeout(timer);
  }, [tipOpacity]);

  // Continue button idle pulse (skip if reduced motion)
  useEffect(() => {
    if (isValid && !reducedMotion) {
      continueButtonScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1000 }), withTiming(1.03, { duration: 1000 })),
        -1,
        true
      );
    } else {
      continueButtonScale.value = 1;
    }
  }, [isValid, continueButtonScale, reducedMotion]);

  const validationMessage = !isValid
    ? totalDays > 28
      ? 'Total cycle must be 28 days or less'
      : !hasWorkTime
        ? 'At least 1 day or 1 night shift required'
        : 'At least 1 day off required'
    : '';

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const handleSave = useCallback(() => {
    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    updateData({ customPattern: { daysOn, nightsOn, daysOff } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (onContinue) {
      onContinue();
    }
  }, [isValid, daysOn, nightsOn, daysOff, updateData, onContinue]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [onBack, navigation]);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader currentStep={4} totalSteps={10} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Icon */}
        <Animated.View style={[styles.heroIconContainer, tipAnimatedStyle]}>
          <Image
            source={require('../../../../assets/onboarding/icons/consolidated/custom-pattern-builder-hero.png')}
            style={styles.heroIcon}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Customize Your Shift Pattern</Text>
        <Text style={styles.subtitle}>Design your ideal work schedule</Text>

        {/* Live Preview Card */}
        <LivePreviewCard
          daysOn={daysOn}
          nightsOn={nightsOn}
          daysOff={daysOff}
          reducedMotion={reducedMotion}
        />

        {/* Interactive Sliders Section */}
        <View style={styles.slidersSection}>
          <View style={styles.slidersHeader}>
            <Ionicons name="options-outline" size={22} color={theme.colors.sacredGold} />
            <Text style={styles.slidersTitle}>Adjust Your Pattern</Text>
          </View>

          <View style={styles.slidersContainer}>
            <EnhancedSlider
              label="Days On"
              icon="sunny"
              value={daysOn}
              min={0}
              max={14}
              color={CYCLE_COLORS.day}
              trackColor="#60A5FA"
              onChange={setDaysOn}
              delayIndex={0}
              reducedMotion={reducedMotion}
              customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
            />

            <EnhancedSlider
              label="Nights On"
              icon="moon"
              value={nightsOn}
              min={0}
              max={14}
              color={CYCLE_COLORS.night}
              trackColor="#A78BFA"
              onChange={setNightsOn}
              delayIndex={1}
              reducedMotion={reducedMotion}
              customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
            />

            <EnhancedSlider
              label="Days Off"
              icon="home"
              value={daysOff}
              min={1}
              max={14}
              color={CYCLE_COLORS.off}
              trackColor="#FBBF24"
              onChange={setDaysOff}
              delayIndex={2}
              reducedMotion={reducedMotion}
              customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
            />
          </View>
        </View>

        {/* Tips & Validation */}
        {showTip && (
          <Animated.View style={[styles.tipBox, tipAnimatedStyle]}>
            <Ionicons name="bulb" size={20} color="#FBBF24" />
            <Text style={styles.tipText}>
              A balanced shift pattern helps improve alertness and overall health.
            </Text>
          </Animated.View>
        )}

        {!isValid && (
          <View style={styles.validationMessage}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.validationText}>{validationMessage}</Text>
          </View>
        )}

        {isValid && hasHighWorkRatio && (
          <View style={styles.warningMessage}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              High work ratio ({workPercentage}%). Consider adding more rest days for better
              work-life balance.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to shift pattern selection"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
        </Pressable>

        <Animated.View style={continueButtonAnimatedStyle}>
          <Pressable
            onPress={handleSave}
            style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
            disabled={!isValid}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Continue with custom pattern"
            accessibilityHint={
              isValid
                ? `Your ${totalDays}-day cycle: ${daysOn} days on, ${nightsOn} nights on, ${daysOff} days off`
                : validationMessage
            }
            accessibilityState={{ disabled: !isValid }}
          >
            <LinearGradient
              colors={isValid ? ['#F59E0B', '#D97706'] : ['#6B7280', '#4B5563']}
              style={styles.continueGradient}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
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
    paddingBottom: 100,
  },
  heroIconContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  heroIcon: {
    width: 120,
    height: 120,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.dust,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  previewCard: {
    marginBottom: theme.spacing.xl,
  },
  previewGradient: {
    borderRadius: 24,
    padding: theme.spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#b45309',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cycleBlocks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cycleBlock: {
    flex: 1,
  },
  cycleBlockInner: {
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cycleBlockNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cycleBlockLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  cyclePreviewSection: {
    marginBottom: theme.spacing.lg,
  },
  calendarGridIconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  calendarGridIcon: {
    width: 80,
    height: 80,
    opacity: 0.9,
  },
  cycleLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
  },
  cyclePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    marginBottom: theme.spacing.sm,
  },
  cycleSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  cycleLabel: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  balanceChart: {
    marginBottom: theme.spacing.md,
  },
  balanceTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  chartBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  chartSegment: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  ratioLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.8,
  },
  ratioValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    alignSelf: 'center',
  },
  cycleBadgeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  slidersSection: {
    marginBottom: theme.spacing.xl,
  },
  slidersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  slidersTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  slidersContainer: {
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  sliderContainer: {
    gap: theme.spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 60,
    position: 'relative',
  },
  trackPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 27,
  },
  sliderTrackFill: {
    height: '100%',
  },
  tickMarks: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tickMark: {
    width: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  rangeLabels: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 10,
    color: theme.colors.dust,
  },
  valueBadge: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  sliderThumb: {
    position: 'absolute',
    top: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  thumbIcon: {
    width: 14,
    height: 14,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.dust,
    lineHeight: 20,
  },
  validationMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  validationText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
  },
  warningMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#F59E0B',
    lineHeight: 20,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xxl : theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.deepVoid,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
