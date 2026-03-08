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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import type { FIFOConfig } from '@/types';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { PatternBuilderSlider } from '@/components/onboarding/premium/PatternBuilderSlider';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

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
        style={[styles.patternCardShell, isSelected && styles.patternCardSelected, cardStyle]}
      >
        <LinearGradient
          colors={
            isSelected
              ? [theme.colors.opacity.gold20, theme.colors.opacity.white10]
              : [theme.colors.opacity.white10, theme.colors.opacity.black40]
          }
          style={[
            styles.patternCard,
            { borderColor: isSelected ? pattern.color : theme.colors.opacity.gold20 },
          ]}
        >
          <View style={[styles.patternAccent, { backgroundColor: pattern.color }]} />
          <Image source={pattern.icon} style={styles.patternIconImage} resizeMode="contain" />
          <Text style={styles.patternTitle}>{pattern.title}</Text>
          <Text style={styles.patternDescription}>{pattern.description}</Text>
          {isSelected && (
            <View style={[styles.selectedBadge, { backgroundColor: pattern.color }]}>
              <Ionicons name="checkmark" size={16} color={theme.colors.deepVoid} />
            </View>
          )}
        </LinearGradient>
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
          <Image
            source={require('../../../../assets/onboarding/icons/consolidated/roster-type-fifo.png')}
            style={styles.previewHeaderIcon}
            resizeMode="contain"
          />
          <Text style={styles.previewTitle}>Your FIFO Rotation Preview</Text>
          <Text style={styles.previewSubtitle}>
            {workBlockDays} days at site, then {restBlockDays} days at home
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cycleBlocksScroll}
          style={styles.cycleBlocksContainer}
        >
          <View style={styles.cycleBlock}>
            <View
              style={[
                styles.cycleBlockInner,
                { backgroundColor: theme.colors.shiftVisualization.dayShift },
              ]}
            >
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                style={styles.cycleBlockIcon}
                resizeMode="contain"
              />
              <Text style={styles.cycleBlockNumber}>{workBlockDays}</Text>
              <Text style={styles.cycleBlockLabel}>Work</Text>
            </View>
          </View>

          <View style={styles.cycleBlock}>
            <View
              style={[
                styles.cycleBlockInner,
                { backgroundColor: theme.colors.shiftVisualization.daysOff },
              ]}
            >
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
                style={styles.cycleBlockIcon}
                resizeMode="contain"
              />
              <Text style={styles.cycleBlockNumber}>{restBlockDays}</Text>
              <Text style={styles.cycleBlockLabel}>Rest</Text>
            </View>
          </View>
        </ScrollView>
        {workPattern === 'swing' && (
          <Text style={styles.swingPreviewText}>
            Swing split: {daysOnDayShift} day-shift days + {daysOnNightShift} night-shift days
          </Text>
        )}

        <View style={styles.cyclePreviewSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cycleLegendScroll}
            style={styles.cycleLegendContainer}
          >
            {workPattern === 'swing' ? (
              <>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: theme.colors.shiftVisualization.dayShift },
                    ]}
                  />
                  <Text style={styles.legendText}>Day Swing</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: theme.colors.shiftVisualization.nightShift },
                    ]}
                  />
                  <Text style={styles.legendText}>Night Swing</Text>
                </View>
              </>
            ) : (
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        workPattern === 'straight-nights'
                          ? theme.colors.shiftVisualization.nightShift
                          : theme.colors.shiftVisualization.dayShift,
                    },
                  ]}
                />
                <Text style={styles.legendText}>Work Block</Text>
              </View>
            )}
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.colors.shiftVisualization.daysOff },
                ]}
              />
              <Text style={styles.legendText}>Home Block</Text>
            </View>
          </ScrollView>

          <View style={styles.cyclePreview}>
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
          </View>

          <Text style={styles.cycleLabel}>Cycle flow across {previewDays} visible days</Text>
        </View>

        <View style={styles.balanceChart}>
          <View style={styles.balanceHeader}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/work-rest-balance-scale.png')}
              style={styles.balanceScaleIcon}
              resizeMode="contain"
            />
            <Text style={styles.balanceTitle}>Work-Rest Balance</Text>
          </View>
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

        <View style={styles.ratioContainer}>
          <Text style={styles.ratioLabel}>Site to home rhythm</Text>
          <View style={styles.ratioBreakdown}>
            <View style={styles.ratioItem}>
              <Text style={styles.ratioNumber}>{workBlockDays}</Text>
              <Text style={styles.ratioUnit}>site days</Text>
            </View>
            <Text style={styles.ratioSeparator}>:</Text>
            <View style={styles.ratioItem}>
              <Text style={styles.ratioNumber}>{restBlockDays}</Text>
              <Text style={styles.ratioUnit}>home days</Text>
            </View>
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
  const route = useRoute<RouteProp<OnboardingStackParamList, 'FIFOCustomPattern'>>();
  const { data, updateData } = useOnboarding();
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;

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
  const tipOpacity = useSharedValue(0);
  const tipTranslateY = useSharedValue(12);

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

  useEffect(() => {
    tipOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    tipTranslateY.value = withDelay(500, withSpring(0, SPRING_CONFIGS.gentle));
  }, [tipOpacity, tipTranslateY]);

  const tipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
    transform: [{ translateY: tipTranslateY.value }],
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
        if (isSettingsEntry && returnToMainOnSelect) {
          closeSettingsEditor();
          return;
        }
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
    isSettingsEntry,
    returnToMainOnSelect,
    closeSettingsEditor,
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
            <PatternBuilderSlider
              label="Days at Site (Work Block)"
              icon="🏗️"
              value={workBlockDays}
              min={1}
              max={60}
              color={theme.colors.shiftVisualization.dayShift}
              trackColor="#60A5FA"
              onChange={setWorkBlockDays}
              hapticSourcePrefix="PremiumFIFOCustomPatternScreen"
              delayIndex={0}
              reducedMotion={reducedMotion}
              customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
              customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
            />

            <PatternBuilderSlider
              label="Days at Home (Rest Block)"
              icon="🏠"
              value={restBlockDays}
              min={1}
              max={60}
              color={theme.colors.shiftVisualization.daysOff}
              trackColor="#a8a29e"
              onChange={setRestBlockDays}
              hapticSourcePrefix="PremiumFIFOCustomPatternScreen"
              delayIndex={1}
              reducedMotion={reducedMotion}
              customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
              customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png')}
            />
          </View>
        </View>

        <View style={styles.sectionContainer} testID="work-pattern-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="layers-outline" size={22} color={theme.colors.sacredGold} />
            <Text style={styles.sectionTitle}>Work Pattern During Work Block</Text>
          </View>
          <View style={styles.sectionBody}>
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
        </View>

        {workPattern === 'swing' && (
          <View style={styles.swingConfigContainer} testID="swing-config-section">
            <View style={styles.sectionHeader}>
              <Ionicons name="swap-horizontal-outline" size={22} color={theme.colors.sacredGold} />
              <Text style={styles.sectionTitle}>Swing Configuration</Text>
            </View>
            <View style={styles.sectionBody}>
              <Text style={styles.sectionSubtitle}>
                Split your work block between day and night shifts.
              </Text>

              <PatternBuilderSlider
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
                hapticSourcePrefix="PremiumFIFOCustomPatternScreen"
                delayIndex={2}
                reducedMotion={reducedMotion}
                customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
              />

              <PatternBuilderSlider
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
                hapticSourcePrefix="PremiumFIFOCustomPatternScreen"
                delayIndex={3}
                reducedMotion={reducedMotion}
                customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
              />

              <Text style={styles.swingSplitText} testID="swing-total-text">
                Split total: {swingTotal}/{workBlockDays} days
              </Text>
            </View>
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

        <Animated.View style={[styles.tipBox, tipAnimatedStyle]}>
          <Image
            source={require('../../../../assets/onboarding/icons/consolidated/tips-lightbulb-glowing.png')}
            style={styles.tipIcon}
            resizeMode="contain"
          />
          <Text style={styles.tipText}>
            Tip: Match your home block to recovery and travel demands. FIFO patterns work best when
            the rest block is long enough to reset before your next site run.
          </Text>
        </Animated.View>

        {hasHardError && (
          <View style={styles.validationMessage} testID="fifo-status-error">
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-warning-alert.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
            <Text style={styles.validationText}>
              {swingMismatch
                ? `Swing split must equal ${workBlockDays} days before saving.`
                : 'Work and rest blocks must each be at least 1 day.'}
            </Text>
          </View>
        )}

        {!hasHardError && hasWarning && (
          <View style={styles.warningMessage} testID="fifo-status-warning">
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-warning-alert.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
            <Text style={styles.warningText}>
              This roster is heavy ({workPercentage}% work). Consider balancing with more home days
              if fatigue becomes an issue.
            </Text>
          </View>
        )}

        {!hasHardError && !hasWarning && (
          <View style={styles.successMessage} testID="fifo-status-success">
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/validation-success-checkmark.png')}
              style={styles.validationIcon}
              resizeMode="contain"
            />
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Return to shift pattern selection"
          testID="fifo-custom-back-button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.paper} />
        </Pressable>

        <Animated.View style={[styles.continueButtonWrap, continueButtonAnimatedStyle]}>
          <Pressable
            onPress={handleContinue}
            style={[styles.continueButton, hasHardError && styles.continueButtonDisabled]}
            disabled={hasHardError || isTransitioning}
            accessible={true}
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
              <Image
                source={require('../../../../assets/onboarding/icons/consolidated/navigation-save-trophy.png')}
                style={styles.trophyIconSmaller}
                resizeMode="contain"
              />
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
  sectionContainer: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sectionBody: {
    backgroundColor: theme.colors.opacity.stone50,
    borderRadius: 24,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.dust,
    marginBottom: 0,
    textAlign: 'center',
  },
  patternCardsContainer: {
    gap: theme.spacing.md,
  },
  patternCardShell: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  patternCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: theme.spacing.lg,
    position: 'relative',
    minHeight: 142,
  },
  patternIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  patternAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
  },
  patternIconImage: {
    width: 42,
    height: 42,
    marginBottom: theme.spacing.sm,
  },
  patternTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: theme.spacing.xs,
  },
  patternDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.dust,
    paddingRight: 36,
  },
  patternCardSelected: {
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
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
    marginBottom: theme.spacing.xl,
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
    fontStyle: 'italic',
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
    marginTop: 4,
    textAlign: 'center',
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
  swingPreviewText: {
    color: theme.colors.sacredGold,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: theme.spacing.md,
  },
  cyclePreviewSection: {
    marginBottom: theme.spacing.lg,
  },
  cycleLegendContainer: {
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
  chartGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPercentage: {
    fontSize: 14,
    color: theme.colors.paper,
    fontWeight: 'bold',
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
    marginBottom: theme.spacing.lg,
  },
  ratioLabel: {
    fontSize: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonWrap: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  continueButton: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  trophyIconSmaller: {
    width: 24,
    height: 24,
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
