/**
 * PremiumCustomPatternScreen Component
 *
 * Custom shift pattern builder with interactive sliders and live preview (Step 4 of 10)
 * Appears when user selects "Custom Pattern" from shift pattern cards
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  Image,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { PatternBuilderSlider } from '@/components/onboarding/premium/PatternBuilderSlider';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

// Cycle block colors - aligned with dashboard calendar
const CYCLE_COLORS = {
  day: theme.colors.shiftVisualization.dayShift, // #2196F3 Blue
  night: theme.colors.shiftVisualization.nightShift, // #651FFF Purple
  morning: theme.colors.shiftVisualization.morningShift, // #F59E0B Amber
  afternoon: theme.colors.shiftVisualization.afternoonShift, // #06B6D4 Cyan
  night3shift: theme.colors.shiftVisualization.nightShift, // #651FFF Purple
  off: theme.colors.shiftVisualization.daysOff, // #78716c Stone
} as const;

// Slider track colors - lighter versions for visual feedback
const TRACK_COLORS = {
  day: '#60A5FA', // Light blue
  night: '#A78BFA', // Light purple
  morning: '#FCD34D', // Light amber
  afternoon: '#67E8F9', // Light cyan
  night3shift: '#A78BFA', // Light purple
  off: '#a8a29e', // Light stone
} as const;

// Spring animation configs
const SPRING_CONFIGS = {
  fast: { damping: 10, stiffness: 400 },
  smooth: { damping: 20, stiffness: 300 },
  bouncy: { damping: 10, stiffness: 400 },
  gentle: { damping: 15, stiffness: 200 },
  elastic: { damping: 8, stiffness: 250 },
} as const;

// Cycle Square Component with individual animations
interface CycleSquareProps {
  type: 'day' | 'night' | 'morning' | 'afternoon' | 'off';
  index: number;
  animationDelay: number;
  reducedMotion: boolean;
  triggerAnimation: number; // Incremented to trigger re-animation
}

const CycleSquare: React.FC<CycleSquareProps> = React.memo(
  ({ type, animationDelay, reducedMotion, triggerAnimation }) => {
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
      if (!reducedMotion && triggerAnimation > 0) {
        opacity.value = withDelay(
          animationDelay,
          withSequence(withTiming(0, { duration: 100 }), withTiming(1, { duration: 200 }))
        );
        rotation.value = withDelay(
          animationDelay,
          withSequence(withTiming(180, { duration: 200 }), withTiming(0, { duration: 200 }))
        );
      }
    }, [triggerAnimation, animationDelay, reducedMotion, opacity, rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ rotateY: `${rotation.value}deg` }],
    }));

    const backgroundColor =
      type === 'day'
        ? CYCLE_COLORS.day
        : type === 'night'
          ? CYCLE_COLORS.night
          : type === 'morning'
            ? CYCLE_COLORS.morning
            : type === 'afternoon'
              ? CYCLE_COLORS.afternoon
              : CYCLE_COLORS.off;

    return (
      <Animated.View
        style={[
          styles.cycleSquare,
          {
            backgroundColor,
          },
          animatedStyle,
        ]}
      />
    );
  }
);

CycleSquare.displayName = 'CycleSquare';

// Live Preview Card Component
interface LivePreviewCardProps {
  shiftSystem: ShiftSystem;
  // 2-shift system props
  daysOn?: number;
  nightsOn?: number;
  // 3-shift system props
  morningOn?: number;
  afternoonOn?: number;
  nightOn?: number;
  // Common props
  daysOff: number;
  reducedMotion?: boolean;
}

const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  shiftSystem,
  daysOn = 0,
  nightsOn = 0,
  morningOn = 0,
  afternoonOn = 0,
  nightOn = 0,
  daysOff,
  reducedMotion = false,
}) => {
  const { t } = useTranslation('onboarding');
  const scaleValue = useSharedValue(0.8);
  const opacityValue = useSharedValue(0);
  const floatValue = useSharedValue(0);
  const dayBlockScale = useSharedValue(0);
  const nightBlockScale = useSharedValue(0);
  const morningBlockScale = useSharedValue(0);
  const afternoonBlockScale = useSharedValue(0);
  const night3BlockScale = useSharedValue(0);
  const offBlockScale = useSharedValue(0);
  const cycleLengthScale = useSharedValue(1);

  // Memoize work-rest calculations
  const { totalDays, workDays, workPercentage, restPercentage } = useMemo(() => {
    const total =
      shiftSystem === ShiftSystem.TWO_SHIFT
        ? daysOn + nightsOn + daysOff
        : morningOn + afternoonOn + nightOn + daysOff;
    const work =
      shiftSystem === ShiftSystem.TWO_SHIFT ? daysOn + nightsOn : morningOn + afternoonOn + nightOn;
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
  }, [shiftSystem, daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff]);

  // Animated percentages for count-up effect
  const animatedWorkPercentage = useSharedValue(workPercentage);
  const animatedRestPercentage = useSharedValue(restPercentage);

  // Animated bar widths (as percentages)
  const workBarWidth = useSharedValue(workPercentage);
  const restBarWidth = useSharedValue(restPercentage);

  // Animate percentages and bar widths when they change
  useEffect(() => {
    animatedWorkPercentage.value = withTiming(workPercentage, { duration: 400 });
    animatedRestPercentage.value = withTiming(restPercentage, { duration: 400 });
    workBarWidth.value = withSpring(workPercentage, SPRING_CONFIGS.smooth);
    restBarWidth.value = withSpring(restPercentage, SPRING_CONFIGS.smooth);
  }, [
    workPercentage,
    restPercentage,
    animatedWorkPercentage,
    animatedRestPercentage,
    workBarWidth,
    restBarWidth,
  ]);

  // Entry animation
  useEffect(() => {
    scaleValue.value = withDelay(200, withSpring(1, SPRING_CONFIGS.gentle));
    opacityValue.value = withDelay(200, withTiming(1, { duration: 400 }));

    // Staggered entrance for cycle blocks
    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      dayBlockScale.value = withDelay(300, withSpring(1, SPRING_CONFIGS.gentle));
      nightBlockScale.value = withDelay(400, withSpring(1, SPRING_CONFIGS.gentle));
      offBlockScale.value = withDelay(500, withSpring(1, SPRING_CONFIGS.gentle));
    } else {
      morningBlockScale.value = withDelay(300, withSpring(1, SPRING_CONFIGS.gentle));
      afternoonBlockScale.value = withDelay(400, withSpring(1, SPRING_CONFIGS.gentle));
      night3BlockScale.value = withDelay(500, withSpring(1, SPRING_CONFIGS.gentle));
      offBlockScale.value = withDelay(600, withSpring(1, SPRING_CONFIGS.gentle));
    }
  }, [
    scaleValue,
    opacityValue,
    shiftSystem,
    dayBlockScale,
    nightBlockScale,
    morningBlockScale,
    afternoonBlockScale,
    night3BlockScale,
    offBlockScale,
  ]);

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
    if (shiftSystem === ShiftSystem.TWO_SHIFT && dayBlockScale.value === 1) {
      dayBlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [daysOn, dayBlockScale, shiftSystem]);

  useEffect(() => {
    if (shiftSystem === ShiftSystem.TWO_SHIFT && nightBlockScale.value === 1) {
      nightBlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [nightsOn, nightBlockScale, shiftSystem]);

  useEffect(() => {
    if (shiftSystem === ShiftSystem.THREE_SHIFT && morningBlockScale.value === 1) {
      morningBlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [morningOn, morningBlockScale, shiftSystem]);

  useEffect(() => {
    if (shiftSystem === ShiftSystem.THREE_SHIFT && afternoonBlockScale.value === 1) {
      afternoonBlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [afternoonOn, afternoonBlockScale, shiftSystem]);

  useEffect(() => {
    if (shiftSystem === ShiftSystem.THREE_SHIFT && night3BlockScale.value === 1) {
      night3BlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [nightOn, night3BlockScale, shiftSystem]);

  useEffect(() => {
    if (offBlockScale.value === 1) {
      offBlockScale.value = withSequence(
        withSpring(1.05, SPRING_CONFIGS.fast),
        withSpring(1, SPRING_CONFIGS.fast)
      );
    }
  }, [daysOff, offBlockScale]);

  useEffect(() => {
    cycleLengthScale.value = withSequence(
      withSpring(1.1, SPRING_CONFIGS.fast),
      withSpring(1, SPRING_CONFIGS.fast)
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

  const morningBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: morningBlockScale.value }],
  }));

  const afternoonBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: afternoonBlockScale.value }],
  }));

  const night3BlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: night3BlockScale.value }],
  }));

  const offBlockAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: offBlockScale.value }],
  }));

  const cycleLengthAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cycleLengthScale.value }],
  }));

  const workBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${workBarWidth.value}%`,
  }));

  const restBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${restBarWidth.value}%`,
  }));

  // Generate cycle preview squares (memoized)
  const cyclePattern = useMemo(() => {
    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      return [
        ...Array(daysOn).fill('day'),
        ...Array(nightsOn).fill('night'),
        ...Array(daysOff).fill('off'),
      ];
    }
    return [
      ...Array(morningOn).fill('morning'),
      ...Array(afternoonOn).fill('afternoon'),
      ...Array(nightOn).fill('night'),
      ...Array(daysOff).fill('off'),
    ];
  }, [shiftSystem, daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff]);

  // Trigger counter for cycle square wave animation
  const [animationTrigger, setAnimationTrigger] = useState(0);

  // Increment trigger when pattern changes to re-animate squares
  useEffect(() => {
    setAnimationTrigger((prev) => prev + 1);
  }, [daysOn, nightsOn, morningOn, afternoonOn, nightOn, daysOff]);

  return (
    <Animated.View style={[styles.previewCard, cardAnimatedStyle]}>
      <LinearGradient
        colors={[theme.colors.softStone, theme.colors.darkStone]}
        style={styles.previewGradient}
      >
        {/* Header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>
            {t('customPattern.preview.title', { defaultValue: 'Your Rotation Preview' })}
          </Text>
          <Text style={styles.previewSubtitle}>
            {t('customPattern.preview.subtitle', {
              defaultValue: 'See what your schedule looks like',
            })}
          </Text>
        </View>

        {/* Cycle Blocks */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cycleBlocksScroll}
          style={styles.cycleBlocksContainer}
        >
          {shiftSystem === ShiftSystem.TWO_SHIFT ? (
            <>
              <Animated.View style={[styles.cycleBlock, dayBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.day }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{daysOn}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.days', { defaultValue: 'Days' })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cycleBlock, nightBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.night }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{nightsOn}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.nights', { defaultValue: 'Nights' })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cycleBlock, offBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.off }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{daysOff}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.off', { defaultValue: 'Off' })}
                  </Text>
                </View>
              </Animated.View>
            </>
          ) : (
            <>
              <Animated.View style={[styles.cycleBlock, morningBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.morning }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{morningOn}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.morning', { defaultValue: 'Morning' })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cycleBlock, afternoonBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.afternoon }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{afternoonOn}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.afternoon', { defaultValue: 'Afternoon' })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cycleBlock, night3BlockAnimatedStyle]}>
                <View
                  style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.night3shift }]}
                >
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{nightOn}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.night', { defaultValue: 'Night' })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cycleBlock, offBlockAnimatedStyle]}>
                <View style={[styles.cycleBlockInner, { backgroundColor: CYCLE_COLORS.off }]}>
                  <Image
                    source={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                    style={styles.cycleBlockIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.cycleBlockNumber}>{daysOff}</Text>
                  <Text style={styles.cycleBlockLabel}>
                    {t('customPattern.preview.blocks.off', { defaultValue: 'Off' })}
                  </Text>
                </View>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* Visual Cycle Preview */}
        <View style={styles.cyclePreviewSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cycleLegendScroll}
          >
            {shiftSystem === ShiftSystem.TWO_SHIFT ? (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.day }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.dayShift', { defaultValue: 'Day Shift' })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.night }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.nightShift', { defaultValue: 'Night Shift' })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.off }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.dayOff', { defaultValue: 'Day Off' })}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.morning }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.morning', { defaultValue: 'Morning' })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.afternoon }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.afternoon', { defaultValue: 'Afternoon' })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.night3shift }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.night', { defaultValue: 'Night' })}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: CYCLE_COLORS.off }]} />
                  <Text style={styles.legendText}>
                    {t('customPattern.preview.legend.dayOff', { defaultValue: 'Day Off' })}
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.cyclePreview}>
            {cyclePattern.map((type, index) => (
              <CycleSquare
                key={`${type}-${index}-${animationTrigger}`}
                type={type}
                index={index}
                animationDelay={index * 30}
                reducedMotion={reducedMotion}
                triggerAnimation={animationTrigger}
              />
            ))}
          </View>

          <Animated.View style={cycleLengthAnimatedStyle}>
            <Text style={styles.cycleLabel}>
              {t('customPattern.preview.cycleLabel', {
                totalDays,
                defaultValue: `Your ${totalDays}-day cycle`,
              })}
            </Text>
          </Animated.View>
        </View>

        {/* Work-Rest Balance Chart */}
        <View style={styles.balanceChart}>
          {/* Balance Header with Icon */}
          <View style={styles.balanceHeader}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/work-rest-balance-scale.png')}
              style={styles.balanceScaleIcon}
              resizeMode="contain"
            />
            <Text style={styles.balanceTitle}>
              {t('customPattern.preview.balanceTitle', { defaultValue: 'Work-Rest Balance' })}
            </Text>
          </View>
          <View style={styles.chartBar}>
            <Animated.View style={[styles.chartSegmentAnimated, workBarAnimatedStyle]}>
              <LinearGradient
                colors={[
                  theme.colors.shiftVisualization.dayShift,
                  theme.colors.shiftVisualization.nightShift,
                ]}
                style={styles.chartGradient}
              >
                <Text style={styles.chartPercentage}>{workPercentage}%</Text>
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.chartSegmentAnimated, restBarAnimatedStyle]}>
              <LinearGradient
                colors={[theme.colors.success, theme.colors.successBg]}
                style={styles.chartGradient}
              >
                <Text style={styles.chartPercentage}>{restPercentage}%</Text>
              </LinearGradient>
            </Animated.View>
          </View>
          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>
              {t('customPattern.preview.workLabel', {
                count: workDays,
                defaultValue: `Work: ${workDays} days`,
              })}
            </Text>
            <Text style={styles.chartLabel}>
              {t('customPattern.preview.restLabel', {
                count: daysOff,
                defaultValue: `Rest: ${daysOff} days`,
              })}
            </Text>
          </View>
          <View style={styles.ratioContainer}>
            <Text style={styles.ratioLabel}>
              {t('customPattern.preview.ratioLabel', { defaultValue: 'Every rotation you work' })}
            </Text>
            <View style={styles.ratioBreakdown}>
              <View style={styles.ratioItem}>
                <Text style={styles.ratioNumber}>{workDays}</Text>
                <Text style={styles.ratioUnit}>
                  {t('customPattern.preview.daysOn', { defaultValue: 'days on' })}
                </Text>
              </View>
              <Text style={styles.ratioSeparator}>→</Text>
              <View style={styles.ratioItem}>
                <Text style={styles.ratioNumber}>{daysOff}</Text>
                <Text style={styles.ratioUnit}>
                  {t('customPattern.preview.daysOff', { defaultValue: 'days off' })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cycle Length Badge */}
        <Animated.View style={[styles.cycleBadge, cycleLengthAnimatedStyle]}>
          <Ionicons name="calendar-number-outline" size={16} color={theme.colors.paper} />
          <Text style={styles.cycleBadgeText}>
            {t('customPattern.preview.badgeLabel', {
              totalDays,
              defaultValue: `${totalDays}-day cycle`,
            })}
          </Text>
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
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'CustomPattern'>>();
  const { data, updateData } = useOnboarding();
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;
  const isSettingsMode = isSettingsEntry && returnToMainOnSelect;
  const settingsBaseline = route.params?.settingsBaseline;
  const shiftSystem = data.shiftSystem || ShiftSystem.TWO_SHIFT;

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

  // State for 2-shift system
  const [daysOn, setDaysOn] = useState(4);
  const [nightsOn, setNightsOn] = useState(4);

  // State for 3-shift system
  const [morningOn, setMorningOn] = useState(4);
  const [afternoonOn, setAfternoonOn] = useState(4);
  const [nightOn, setNightOn] = useState(4);

  // Common state
  const [daysOff, setDaysOff] = useState(4);
  const [showTip, setShowTip] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const reducedMotionRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);

  const tipOpacity = useSharedValue(0);
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

  // Check for reduced motion preference
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

  // Calculate validation and metrics based on shift system
  const totalDays =
    shiftSystem === ShiftSystem.TWO_SHIFT
      ? daysOn + nightsOn + daysOff
      : morningOn + afternoonOn + nightOn + daysOff;

  const hasWorkTime =
    shiftSystem === ShiftSystem.TWO_SHIFT
      ? daysOn > 0 || nightsOn > 0
      : morningOn > 0 || afternoonOn > 0 || nightOn > 0;

  const isValid = totalDays <= 28 && hasWorkTime && daysOff >= 1;

  const workDays =
    shiftSystem === ShiftSystem.TWO_SHIFT ? daysOn + nightsOn : morningOn + afternoonOn + nightOn;

  const workPercentage = Math.round((workDays / totalDays) * 100);
  const hasHighWorkRatio = workPercentage > 85;

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
    if (isValid && !reducedMotion && !isTransitioning) {
      continueButtonScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1000 }), withTiming(1.03, { duration: 1000 })),
        -1,
        true
      );
    } else {
      continueButtonScale.value = 1;
    }
  }, [isValid, continueButtonScale, reducedMotion, isTransitioning]);

  const validationMessage = !isValid
    ? totalDays > 28
      ? t('customPattern.validation.tooLong', {
          totalDays,
          defaultValue: `Your rotation is ${totalDays} days long—we can only handle up to 28 days. Try shortening it.`,
        })
      : !hasWorkTime
        ? t('customPattern.validation.noWork', {
            defaultValue: 'You need at least 1 shift to track—add some day or night shifts',
          })
        : t('customPattern.validation.noOff', {
            defaultValue: 'Everyone needs time off—add at least 1 day off to your rotation',
          })
    : '';

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
  }));

  const continueButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueButtonScale.value }],
  }));

  const handleSave = useCallback(() => {
    if (!isValid || isTransitioningRef.current) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumCustomPatternScreen.handleSave.invalid',
      });
      return;
    }

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    // Save pattern based on shift system
    const customPatternPayload =
      shiftSystem === ShiftSystem.TWO_SHIFT
        ? {
            daysOn,
            nightsOn,
            daysOff,
          }
        : {
            // IMPORTANT: daysOn/nightsOn set to 0 for 3-shift systems
            // 3-shift uses morningOn/afternoonOn/nightOn instead
            // calculateShiftDay() in shiftUtils.ts detects this and uses the correct fields
            daysOn: 0,
            nightsOn: 0,
            morningOn,
            afternoonOn,
            nightOn,
            daysOff,
          };

    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      updateData(
        isSettingsMode
          ? {
              patternType: ShiftPattern.CUSTOM,
              customPattern: customPatternPayload,
            }
          : {
              customPattern: customPatternPayload,
            }
      );
    } else {
      // 3-Shift System
      updateData(
        isSettingsMode
          ? {
              patternType: ShiftPattern.CUSTOM,
              customPattern: customPatternPayload,
            }
          : {
              customPattern: customPatternPayload,
            }
      );
    }

    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumCustomPatternScreen.handleSave.success',
    });
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        clearPendingTransition(true);

        if (onContinue) {
          onContinue();
          return;
        }
        if (isSettingsMode) {
          closeSettingsEditor();
          return;
        }

        const normalizedRosterType = data.rosterType ?? 'rotating';
        goToNextScreen(navigation, 'CustomPattern', {
          ...data,
          rosterType: normalizedRosterType,
          patternType:
            normalizedRosterType === 'fifo'
              ? ShiftPattern.FIFO_CUSTOM
              : (data.patternType ?? ShiftPattern.CUSTOM),
        });
      }, 300);
    });
  }, [
    isValid,
    shiftSystem,
    daysOn,
    nightsOn,
    morningOn,
    afternoonOn,
    nightOn,
    daysOff,
    updateData,
    onContinue,
    isSettingsMode,
    closeSettingsEditor,
    navigation,
    data,
    clearPendingTransition,
  ]);

  const handleBack = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }

    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumCustomPatternScreen.handleBack',
    });
    if (isSettingsMode) {
      if (settingsBaseline) {
        updateData({
          patternType: settingsBaseline.patternType,
          customPattern: settingsBaseline.customPattern
            ? { ...settingsBaseline.customPattern }
            : undefined,
          fifoConfig: settingsBaseline.fifoConfig ? { ...settingsBaseline.fifoConfig } : undefined,
          rosterType: settingsBaseline.rosterType,
          shiftSystem: settingsBaseline.shiftSystem,
        });
      }
      closeSettingsEditor();
      return;
    }

    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  }, [closeSettingsEditor, isSettingsMode, navigation, onBack, settingsBaseline, updateData]);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.CUSTOM_PATTERN}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>
          {t('customPattern.title', { defaultValue: 'Build Your Rotation' })}
        </Text>
        <Text style={styles.subtitle}>
          {t('customPattern.subtitle', {
            defaultValue:
              "Set how many shifts you work, then how many days off you get—we'll show you what it looks like",
          })}
        </Text>
        <Text style={styles.subtitleSecondary}>
          {shiftSystem === ShiftSystem.TWO_SHIFT
            ? t('customPattern.subtitleSecondary.twoShift', { defaultValue: 'Day, Night & Off' })
            : t('customPattern.subtitleSecondary.threeShift', {
                defaultValue: 'Morning, Afternoon, Night & Off',
              })}
        </Text>

        {/* Interactive Sliders Section */}
        <View style={styles.slidersSection}>
          <View style={styles.slidersHeader}>
            <Ionicons name="construct-outline" size={22} color={theme.colors.sacredGold} />
            <Text style={styles.slidersTitle}>
              {t('customPattern.slidersTitle', { defaultValue: 'Set Up Your Rotation' })}
            </Text>
          </View>

          <View style={styles.slidersContainer}>
            {shiftSystem === ShiftSystem.TWO_SHIFT ? (
              <>
                {/* 2-Shift Sliders */}
                <PatternBuilderSlider
                  label={t('customPattern.sliders.dayShifts', { defaultValue: 'Day Shifts' })}
                  icon="sunny"
                  value={daysOn}
                  min={0}
                  max={14}
                  color={CYCLE_COLORS.day}
                  trackColor={TRACK_COLORS.day}
                  onChange={setDaysOn}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={0}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                />

                <PatternBuilderSlider
                  label={t('customPattern.sliders.nightShifts', { defaultValue: 'Night Shifts' })}
                  icon="moon"
                  value={nightsOn}
                  min={0}
                  max={14}
                  color={CYCLE_COLORS.night}
                  trackColor={TRACK_COLORS.night}
                  onChange={setNightsOn}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={1}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                />

                <PatternBuilderSlider
                  label={t('customPattern.sliders.daysOff', { defaultValue: 'Days Off' })}
                  icon="home"
                  value={daysOff}
                  min={1}
                  max={14}
                  color={CYCLE_COLORS.off}
                  trackColor={TRACK_COLORS.off}
                  onChange={setDaysOff}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={2}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                />
              </>
            ) : (
              <>
                {/* 3-Shift Sliders */}
                <PatternBuilderSlider
                  label={t('customPattern.sliders.morningShifts', {
                    defaultValue: 'Morning Shifts',
                  })}
                  icon="sunny-outline"
                  value={morningOn}
                  min={0}
                  max={14}
                  color={CYCLE_COLORS.morning}
                  trackColor={TRACK_COLORS.morning}
                  onChange={setMorningOn}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={0}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/shift-time-morning.png')}
                />

                <PatternBuilderSlider
                  label={t('customPattern.sliders.afternoonShifts', {
                    defaultValue: 'Afternoon Shifts',
                  })}
                  icon="partly-sunny-outline"
                  value={afternoonOn}
                  min={0}
                  max={14}
                  color={CYCLE_COLORS.afternoon}
                  trackColor={TRACK_COLORS.afternoon}
                  onChange={setAfternoonOn}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={1}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png')}
                />

                <PatternBuilderSlider
                  label={t('customPattern.sliders.nightShifts', { defaultValue: 'Night Shifts' })}
                  icon="moon-outline"
                  value={nightOn}
                  min={0}
                  max={14}
                  color={CYCLE_COLORS.night3shift}
                  trackColor={TRACK_COLORS.night3shift}
                  onChange={setNightOn}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={2}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                />

                <PatternBuilderSlider
                  label={t('customPattern.sliders.daysOff', { defaultValue: 'Days Off' })}
                  icon="home"
                  value={daysOff}
                  min={1}
                  max={14}
                  color={CYCLE_COLORS.off}
                  trackColor={TRACK_COLORS.off}
                  onChange={setDaysOff}
                  hapticSourcePrefix="PremiumCustomPatternScreen"
                  delayIndex={3}
                  reducedMotion={reducedMotion}
                  customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                  customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                />
              </>
            )}
          </View>

          {/* Guide to preview */}
          <Text style={styles.previewGuide}>
            <Ionicons name="arrow-down" size={16} color={theme.colors.sacredGold} />{' '}
            {t('customPattern.previewGuide', { defaultValue: 'See your rotation below' })}
          </Text>
        </View>

        {/* Live Preview Card */}
        <LivePreviewCard
          shiftSystem={shiftSystem as ShiftSystem}
          daysOn={daysOn}
          nightsOn={nightsOn}
          morningOn={morningOn}
          afternoonOn={afternoonOn}
          nightOn={nightOn}
          daysOff={daysOff}
          reducedMotion={reducedMotion}
        />

        {/* Tips & Validation */}
        {showTip && (
          <Animated.View style={[styles.tipBox, tipAnimatedStyle]}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/tips-lightbulb-glowing.png')}
              style={styles.tipIcon}
              resizeMode="contain"
            />
            <Text style={styles.tipText}>
              {t('customPattern.tip', {
                defaultValue:
                  'Tip: Most shift workers find rotations with at least 3 days off work best. Your body needs time to recover between swing changes.',
              })}
            </Text>
          </Animated.View>
        )}

        {isValid && !hasHighWorkRatio && (
          <View style={styles.successMessage}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-success-checkmark.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
            <Text style={styles.successText}>
              {t('customPattern.success', {
                workDays,
                daysOff,
                defaultValue: `Looking good! You work ${workDays} days, then get ${daysOff} days off. That's a solid rotation.`,
              })}
            </Text>
          </View>
        )}

        {!isValid && (
          <View style={styles.validationMessage}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-warning-alert.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
            <Text style={styles.validationText}>{validationMessage}</Text>
          </View>
        )}

        {isValid && hasHighWorkRatio && (
          <View style={styles.warningMessage}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-warning-alert.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
            <Text style={styles.warningText}>
              {t('customPattern.warning', {
                workDays,
                totalDays,
                workPercentage,
                defaultValue: `Heads up: you're working ${workDays} out of every ${totalDays} days (${workPercentage}%). That's a lot—consider adding more days off so you don't burn out.`,
              })}
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
          accessibilityLabel={
            isSettingsMode
              ? t('common.backToSettings')
              : t('customPattern.backA11y', { defaultValue: 'Go back' })
          }
          accessibilityHint={
            isSettingsMode
              ? t('customPattern.backHint.settings', {
                  defaultValue: 'Discard changes and return to settings',
                })
              : t('customPattern.backHint.default', {
                  defaultValue: 'Return to shift pattern selection',
                })
          }
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
        </Pressable>

        <Animated.View style={continueButtonAnimatedStyle}>
          <Pressable
            onPress={handleSave}
            style={[styles.continueButton, !isValid && styles.continueButtonDisabled]}
            disabled={!isValid || isTransitioning}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('customPattern.saveA11y', {
              defaultValue: 'Save your rotation and continue',
            })}
            accessibilityHint={
              isValid
                ? t('customPattern.saveHintValid', {
                    totalDays,
                    daysOn,
                    nightsOn,
                    daysOff,
                    defaultValue: `Your ${totalDays}-day cycle: ${daysOn} days on, ${nightsOn} nights on, ${daysOff} days off`,
                  })
                : validationMessage
            }
            accessibilityState={{ disabled: !isValid || isTransitioning }}
          >
            <LinearGradient
              colors={
                isValid
                  ? [theme.colors.sacredGold, theme.colors.brightGold]
                  : [theme.colors.shadow, theme.colors.shadow]
              }
              style={styles.continueGradient}
            >
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/navigation-save-trophy.png')}
                style={styles.trophyIconSmaller}
                resizeMode="contain"
              />
              <Text style={styles.continueButtonText}>
                {isValid
                  ? t('customPattern.saveButton', { defaultValue: 'Save This Rotation' })
                  : t('customPattern.needMoreChanges', { defaultValue: 'Need More Changes' })}
              </Text>
              <Ionicons name="arrow-forward" size={24} color={theme.colors.paper} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {isTransitioning ? (
        <View style={styles.transitionOverlay} pointerEvents="none">
          <Text style={styles.transitionText}>
            {t('rosterType.preparingNextStep', { defaultValue: 'Preparing next step...' })}
          </Text>
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
    paddingBottom: 100,
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
  subtitleSecondary: {
    fontSize: 14,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    fontWeight: '600',
  },
  previewCard: {
    marginBottom: theme.spacing.xl,
    borderRadius: 24,
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
    borderRadius: 24,
    padding: theme.spacing.xl,
  },
  previewHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  previewSubtitle: {
    fontSize: 14,
    color: theme.colors.dust,
    textAlign: 'center',
    marginTop: 4,
  },
  previewHeaderIcon: {
    width: 60,
    height: 60,
  },
  cycleBlocksContainer: {
    marginBottom: theme.spacing.lg,
  },
  cycleBlocksScroll: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  cycleBlock: {
    width: 100,
    minWidth: 100,
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
    color: theme.colors.paper,
  },
  cycleBlockLabel: {
    fontSize: 12,
    color: theme.colors.paper,
    opacity: 0.9,
  },
  cycleBlockIcon: {
    width: 50,
    height: 50,
  },
  cyclePreviewSection: {
    marginBottom: theme.spacing.lg,
  },
  cycleLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.sm,
  },
  cycleLegendScroll: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
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
    color: theme.colors.paper,
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
    color: theme.colors.paper,
    textAlign: 'center',
    fontWeight: '600',
  },
  balanceChart: {
    marginBottom: theme.spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  balanceScaleIcon: {
    width: 80,
    height: 80,
    opacity: 0.9,
  },
  balanceTitle: {
    fontSize: 18,
    color: theme.colors.paper,
    fontWeight: '600',
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
  chartSegmentAnimated: {
    height: '100%',
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
    color: theme.colors.paper,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: 12,
    color: theme.colors.paper,
    opacity: 0.9,
  },
  ratioContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.opacity.white10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  ratioLabel: {
    fontSize: 11,
    color: theme.colors.paper,
    opacity: 0.8,
    marginBottom: theme.spacing.xs,
  },
  ratioBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  ratioItem: {
    alignItems: 'center',
  },
  ratioNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.sacredGold,
  },
  ratioUnit: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  ratioSeparator: {
    fontSize: 20,
    color: theme.colors.dust,
  },
  cycleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.opacity.stone20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    alignSelf: 'center',
  },
  cycleBadgeText: {
    fontSize: 14,
    color: theme.colors.paper,
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
  slidersSubtitle: {
    fontSize: 14,
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
  slidersContainer: {
    backgroundColor: theme.colors.opacity.stone50,
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.xl,
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
  previewGuide: {
    fontSize: 14,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontWeight: '600',
    fontStyle: 'italic',
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
  sliderHeaderIcon: {
    width: 50,
    height: 50,
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
    backgroundColor: theme.colors.opacity.white10,
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
    backgroundColor: theme.colors.opacity.white30,
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
    color: theme.colors.paper,
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
        shadowColor: theme.colors.deepVoid,
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
    width: 30,
    height: 30,
    backgroundColor: theme.colors.paper,
    borderRadius: 15,
    padding: 2,
  },
  tipBox: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.opacity.gold10,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  tipIcon: {
    width: 80,
    height: 80,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.dust,
    lineHeight: 20,
    textAlign: 'center',
  },
  successMessage: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.successBg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  successText: {
    fontSize: 14,
    color: theme.colors.success,
    lineHeight: 20,
    textAlign: 'center',
  },
  validationIcon: {
    width: 80,
    height: 80,
  },
  validationMessage: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  validationText: {
    fontSize: 14,
    color: theme.colors.error,
    lineHeight: 20,
    textAlign: 'center',
  },
  warningMessage: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  warningText: {
    fontSize: 14,
    color: theme.colors.sacredGold,
    lineHeight: 20,
    textAlign: 'center',
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
    backgroundColor: theme.colors.opacity.white10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
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
  trophyIconSmaller: {
    width: 24,
    height: 24,
  },
  continueButtonText: {
    fontSize: 18,
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
  trophyIcon: {
    width: 50,
    height: 50,
    backgroundColor: theme.colors.paper,
    borderRadius: 25,
    padding: 2,
  },
});
