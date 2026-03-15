/**
 * PremiumFIFOPhaseSelectorScreen Component
 *
 * Three-stage FIFO phase selector with swipe parity to PremiumPhaseSelectorScreen.
 * Stage 1 (standard FIFO only): Select work pattern (days/nights/swing)
 * Stage 2: Select block type (work/rest)
 * Stage 3: Select day within selected block
 *
 * Swipe semantics:
 * - Right: select current option
 * - Left: skip to next option (loops at end)
 * - Up: show info modal
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
  Modal,
  Pressable,
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
  interpolate,
  Extrapolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PatternBuilderSlider } from '@/components/onboarding/premium/PatternBuilderSlider';
import { SettingsEntryActionButtons } from '@/components/onboarding/premium/SettingsEntryActionButtons';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { ShiftPattern, type FIFOConfig } from '@/types';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { getDefaultFIFOConfig } from '@/utils/shiftUtils';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { Analytics } from '@/utils/analytics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;
type FIFOPhaseRouteProp = RouteProp<OnboardingStackParamList, 'FIFOPhaseSelector'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = 120;
const ROTATION_ANGLE = 15;
const VELOCITY_THRESHOLD = 500;

const SPRING_CONFIGS = {
  swipeRightSelect: { damping: 25, stiffness: 450 },
  swipeLeftSkip: { damping: 35, stiffness: 500 },
  swipeUpInfo: { damping: 20, stiffness: 300 },
  snapBack: { damping: 18, stiffness: 280 },
} as const;

enum SelectionStage {
  WORK_PATTERN = 'workPattern',
  SWING_CONFIG = 'swingConfig',
  BLOCK = 'block',
  DAY_WITHIN_BLOCK = 'dayWithinBlock',
}

interface WorkPatternCardData {
  type: 'workPattern';
  id: StandardFIFOWorkBlockPattern;
  title: string;
  description: string;
  icon: ImageSourcePropType;
  gradientColors: [string, string];
  quickInfo: string;
}

interface BlockCardData {
  type: 'block';
  id: 'work' | 'rest';
  title: string;
  description: string;
  icon: ImageSourcePropType;
  blockLength: number;
  gradientColors: [string, string];
  quickInfo: string;
}

interface DayCardData {
  type: 'day';
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  blockType: 'work' | 'rest';
}

type FIFOSelectableCardData = WorkPatternCardData | BlockCardData | DayCardData;

const getBlockLengthsFromPattern = (
  patternType: ShiftPattern | undefined
): { workBlockDays: number; restBlockDays: number } => {
  if (patternType === ShiftPattern.FIFO_8_6) return { workBlockDays: 8, restBlockDays: 6 };
  if (patternType === ShiftPattern.FIFO_7_7) return { workBlockDays: 7, restBlockDays: 7 };
  if (patternType === ShiftPattern.FIFO_14_14) return { workBlockDays: 14, restBlockDays: 14 };
  if (patternType === ShiftPattern.FIFO_14_7) return { workBlockDays: 14, restBlockDays: 7 };
  if (patternType === ShiftPattern.FIFO_21_7) return { workBlockDays: 21, restBlockDays: 7 };
  if (patternType === ShiftPattern.FIFO_28_14) return { workBlockDays: 28, restBlockDays: 14 };
  return { workBlockDays: 14, restBlockDays: 14 };
};

type FIFOWorkBlockPattern = FIFOConfig['workBlockPattern'];
type StandardFIFOWorkBlockPattern = Exclude<FIFOWorkBlockPattern, 'custom'>;

interface ResolvedFIFOConfig {
  workBlockDays: number;
  restBlockDays: number;
  workBlockPattern: FIFOWorkBlockPattern;
  swingPattern?: FIFOConfig['swingPattern'];
  customWorkSequence?: FIFOConfig['customWorkSequence'];
}

type SwingPatternConfig = NonNullable<FIFOConfig['swingPattern']>;

const normalizeStandardWorkPattern = (
  pattern: FIFOWorkBlockPattern
): StandardFIFOWorkBlockPattern =>
  pattern === 'straight-nights' || pattern === 'swing' ? pattern : 'straight-days';

const getDefaultSwingSplit = (
  workBlockDays: number,
  swingPattern?: FIFOConfig['swingPattern']
): SwingPatternConfig => {
  const fallbackDays = Math.ceil(workBlockDays / 2);
  const fallbackNights = Math.max(0, workBlockDays - fallbackDays);

  if (!swingPattern) {
    return {
      daysOnDayShift: fallbackDays,
      daysOnNightShift: fallbackNights,
    };
  }

  const daysOnDayShift = normalizePositiveInt(swingPattern.daysOnDayShift, fallbackDays);
  const daysOnNightShift = normalizePositiveInt(swingPattern.daysOnNightShift, fallbackNights);

  if (daysOnDayShift + daysOnNightShift !== workBlockDays) {
    return {
      daysOnDayShift: fallbackDays,
      daysOnNightShift: fallbackNights,
    };
  }

  return { daysOnDayShift, daysOnNightShift };
};

const resolveFIFOConfig = (
  patternType: ShiftPattern | undefined,
  fifoConfig: FIFOConfig | null | undefined,
  isCustomFIFOPattern: boolean
): ResolvedFIFOConfig => {
  const presetLengths = getBlockLengthsFromPattern(patternType);
  const presetDefaults = getDefaultFIFOConfig(patternType ?? ShiftPattern.FIFO_14_14) ?? {
    workBlockDays: presetLengths.workBlockDays,
    restBlockDays: presetLengths.restBlockDays,
    workBlockPattern: 'straight-days' as const,
  };

  const toResolved = (
    source: Partial<FIFOConfig> | undefined,
    fallbackWorkDays: number,
    fallbackRestDays: number,
    fallbackPattern: FIFOWorkBlockPattern
  ): ResolvedFIFOConfig => ({
    workBlockDays: normalizePositiveInt(source?.workBlockDays, fallbackWorkDays),
    restBlockDays: normalizePositiveInt(source?.restBlockDays, fallbackRestDays),
    workBlockPattern: source?.workBlockPattern ?? fallbackPattern,
    ...(source?.swingPattern ? { swingPattern: source.swingPattern } : {}),
    ...(source?.customWorkSequence ? { customWorkSequence: source.customWorkSequence } : {}),
  });

  if (isCustomFIFOPattern && fifoConfig) {
    return toResolved(
      fifoConfig,
      presetDefaults.workBlockDays,
      presetDefaults.restBlockDays,
      presetDefaults.workBlockPattern
    );
  }

  const hasMatchingPresetLengths =
    !!fifoConfig &&
    normalizePositiveInt(fifoConfig.workBlockDays, presetDefaults.workBlockDays) ===
      presetDefaults.workBlockDays &&
    normalizePositiveInt(fifoConfig.restBlockDays, presetDefaults.restBlockDays) ===
      presetDefaults.restBlockDays;

  if (hasMatchingPresetLengths && fifoConfig) {
    return toResolved(
      fifoConfig,
      presetDefaults.workBlockDays,
      presetDefaults.restBlockDays,
      presetDefaults.workBlockPattern
    );
  }

  return toResolved(
    presetDefaults,
    presetDefaults.workBlockDays,
    presetDefaults.restBlockDays,
    presetDefaults.workBlockPattern
  );
};

const generateDayDescription = (
  blockType: 'work' | 'rest',
  dayNumber: number,
  totalDays: number,
  workBlockPattern: FIFOWorkBlockPattern = 'straight-days',
  t: TFunction<'onboarding'>
): string => {
  if (blockType === 'work') {
    const isStraightDays = workBlockPattern === 'straight-days';
    const isStraightNights = workBlockPattern === 'straight-nights';
    if (dayNumber === 1) {
      return isStraightDays
        ? String(
            t('fifoPhaseSelector.days.work.firstDayAtSite', {
              defaultValue: 'First day back at site',
            })
          )
        : isStraightNights
          ? String(
              t('fifoPhaseSelector.days.work.firstNightAtSite', {
                defaultValue: 'First night shift back at site',
              })
            )
          : String(
              t('fifoPhaseSelector.days.work.firstShiftAtSite', {
                defaultValue: 'First shift back at site',
              })
            );
    }
    if (dayNumber === totalDays) {
      return isStraightDays
        ? String(
            t('fifoPhaseSelector.days.work.lastDayBeforeHome', {
              defaultValue: 'Last day before flying home',
            })
          )
        : isStraightNights
          ? String(
              t('fifoPhaseSelector.days.work.lastNightBeforeHome', {
                defaultValue: 'Last night shift before flying home',
              })
            )
          : String(
              t('fifoPhaseSelector.days.work.lastShiftBeforeHome', {
                defaultValue: 'Last shift before flying home',
              })
            );
    }
    if (dayNumber === Math.ceil(totalDays / 2)) {
      return String(
        t('fifoPhaseSelector.days.shared.midpoint', {
          defaultValue: 'Midpoint of this block',
        })
      );
    }
    if (isStraightDays) {
      return String(
        t('fifoPhaseSelector.days.work.dayOfWorkBlock', {
          dayNumber,
          defaultValue: `Day ${dayNumber} of your work block`,
        })
      );
    }
    if (isStraightNights) {
      return String(
        t('fifoPhaseSelector.days.work.shiftOfNightBlock', {
          dayNumber,
          defaultValue: `Shift ${dayNumber} of your night work block`,
        })
      );
    }
    return String(
      t('fifoPhaseSelector.days.work.shiftOfWorkBlock', {
        dayNumber,
        defaultValue: `Shift ${dayNumber} of your work block`,
      })
    );
  }

  if (dayNumber === 1) {
    return String(
      t('fifoPhaseSelector.days.rest.firstDayAtHome', {
        defaultValue: 'First day back at home',
      })
    );
  }
  if (dayNumber === totalDays) {
    return String(
      t('fifoPhaseSelector.days.rest.lastDayBeforeSite', {
        defaultValue: 'Last day before returning to site',
      })
    );
  }
  if (dayNumber === Math.ceil(totalDays / 2)) {
    return String(
      t('fifoPhaseSelector.days.shared.midpoint', {
        defaultValue: 'Midpoint of this block',
      })
    );
  }
  return String(
    t('fifoPhaseSelector.days.rest.dayOfRestBlock', {
      dayNumber,
      defaultValue: `Day ${dayNumber} of your rest block`,
    })
  );
};

const getDayCardContent = (
  blockType: 'work' | 'rest',
  dayNumber: number,
  totalDays: number,
  workBlockPattern: FIFOWorkBlockPattern,
  t: TFunction<'onboarding'>,
  swingPattern?: SwingPatternConfig
): Pick<DayCardData, 'title' | 'description'> => {
  if (
    blockType === 'work' &&
    workBlockPattern === 'swing' &&
    swingPattern &&
    swingPattern.daysOnDayShift > 0 &&
    swingPattern.daysOnNightShift > 0
  ) {
    const isDayShiftSegment = dayNumber <= swingPattern.daysOnDayShift;
    if (isDayShiftSegment) {
      const dayShiftDayNumber = dayNumber;
      if (dayShiftDayNumber === 1) {
        return {
          title: String(
            t('fifoPhaseSelector.days.swing.dayShiftTitle', {
              dayNumber: 1,
              defaultValue: 'Day Shift Day 1',
            })
          ),
          description: String(
            t('fifoPhaseSelector.days.swing.firstDayShiftAtSite', {
              defaultValue: 'First day shift back at site',
            })
          ),
        };
      }
      if (dayShiftDayNumber === swingPattern.daysOnDayShift) {
        return {
          title: String(
            t('fifoPhaseSelector.days.swing.dayShiftTitle', {
              dayNumber: dayShiftDayNumber,
              defaultValue: `Day Shift Day ${dayShiftDayNumber}`,
            })
          ),
          description: String(
            t('fifoPhaseSelector.days.swing.finalDayShiftBeforeNights', {
              defaultValue: 'Final day shift before switching to nights',
            })
          ),
        };
      }
      return {
        title: String(
          t('fifoPhaseSelector.days.swing.dayShiftTitle', {
            dayNumber: dayShiftDayNumber,
            defaultValue: `Day Shift Day ${dayShiftDayNumber}`,
          })
        ),
        description: String(
          t('fifoPhaseSelector.days.swing.dayShiftDayDescription', {
            dayNumber: dayShiftDayNumber,
            defaultValue: `Day shift day ${dayShiftDayNumber} of your work block`,
          })
        ),
      };
    }

    const nightShiftDayNumber = dayNumber - swingPattern.daysOnDayShift;
    if (nightShiftDayNumber === 1) {
      return {
        title: String(
          t('fifoPhaseSelector.days.swing.nightShiftTitle', {
            dayNumber: 1,
            defaultValue: 'Night Shift Day 1',
          })
        ),
        description: String(
          t('fifoPhaseSelector.days.swing.firstNightShiftInBlock', {
            defaultValue: 'First night shift in this swing block',
          })
        ),
      };
    }
    if (nightShiftDayNumber === swingPattern.daysOnNightShift) {
      return {
        title: String(
          t('fifoPhaseSelector.days.swing.nightShiftTitle', {
            dayNumber: nightShiftDayNumber,
            defaultValue: `Night Shift Day ${nightShiftDayNumber}`,
          })
        ),
        description: String(
          t('fifoPhaseSelector.days.swing.finalNightShiftBeforeHome', {
            defaultValue: 'Final night shift before flying home',
          })
        ),
      };
    }
    return {
      title: String(
        t('fifoPhaseSelector.days.swing.nightShiftTitle', {
          dayNumber: nightShiftDayNumber,
          defaultValue: `Night Shift Day ${nightShiftDayNumber}`,
        })
      ),
      description: String(
        t('fifoPhaseSelector.days.swing.nightShiftDayDescription', {
          dayNumber: nightShiftDayNumber,
          defaultValue: `Night shift day ${nightShiftDayNumber} of your work block`,
        })
      ),
    };
  }

  return {
    title: String(
      t('fifoPhaseSelector.days.defaultDayTitle', {
        dayNumber,
        defaultValue: `Day ${dayNumber}`,
      })
    ),
    description: generateDayDescription(blockType, dayNumber, totalDays, workBlockPattern, t),
  };
};

interface SwipeableFIFOCardProps {
  card: FIFOSelectableCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  interactionLocked?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  mountProgress?: SharedValue<number>;
  reducedMotion: boolean;
}

const SwipeableFIFOCard: React.FC<SwipeableFIFOCardProps> = ({
  card,
  index,
  totalCards,
  isActive,
  interactionLocked = false,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  mountProgress,
  reducedMotion,
}) => {
  const { t } = useTranslation('onboarding');
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95 - index * 0.05);
  const opacity = useSharedValue(isActive ? 1 : 0.9 - index * 0.05);
  const iconScale = useSharedValue(1);
  const hintOpacity = useSharedValue(1);
  const hintScale = useSharedValue(1);
  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumFIFOPhaseSelectorScreen.card.swipeLeft',
    });
  }, []);
  const triggerMediumHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumFIFOPhaseSelectorScreen.card.swipeRightOrUp',
    });
  }, []);
  const reportWorkletError = useCallback((phase: 'update' | 'end', message: string) => {
    if (__DEV__) {
      console.error('[FIFOPhaseSelector] Swipe worklet error', { phase, message });
    }
  }, []);

  // Cards can loop back and become active again; normalize shared values to avoid stale transforms.
  useEffect(() => {
    if (isActive) {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 1;
      scale.value = 1;
      return;
    }

    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 0.9 - index * 0.05;
    scale.value = 0.95 - index * 0.05;
  }, [index, isActive, opacity, scale, translateX, translateY]);

  useEffect(() => {
    if (isActive && !reducedMotion) {
      translateY.value = withRepeat(
        withSequence(withTiming(-3, { duration: 1500 }), withTiming(3, { duration: 1500 })),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1000 }), withTiming(1.02, { duration: 1000 })),
        -1,
        true
      );
      iconScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1200 }), withTiming(1.08, { duration: 1200 })),
        -1,
        true
      );
    }
  }, [isActive, reducedMotion, translateY, scale, iconScale]);

  useEffect(() => {
    if (isActive && index === 0 && !reducedMotion) {
      hintScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 600 }), withTiming(1.15, { duration: 600 })),
        -1,
        true
      );
      hintOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withDelay(3000, withTiming(0, { duration: 500 })),
          withDelay(7000, withTiming(1, { duration: 500 }))
        ),
        -1,
        false
      );
    }
  }, [isActive, index, reducedMotion, hintOpacity, hintScale]);

  const panGesture = Gesture.Pan()
    .enabled(isActive && !interactionLocked)
    .onUpdate((event) => {
      try {
        translateX.value = event.translationX;
        translateY.value = event.translationY;

        const distance = Math.sqrt(event.translationX ** 2 + event.translationY ** 2);
        scale.value = interpolate(distance, [0, SWIPE_THRESHOLD], [1.0, 1.08], Extrapolate.CLAMP);

        opacity.value = interpolate(
          Math.abs(event.translationX),
          [0, SWIPE_THRESHOLD],
          [1, 0.6],
          Extrapolate.CLAMP
        );
      } catch (error) {
        runOnJS(reportWorkletError)('update', String(error));
      }
    })
    .onEnd((event) => {
      try {
        const velocityX = event.velocityX ?? 0;
        const velocityY = event.velocityY ?? 0;
        const isQuickFlick =
          Math.abs(velocityX) > VELOCITY_THRESHOLD || Math.abs(velocityY) > VELOCITY_THRESHOLD;
        const activeThreshold = isQuickFlick ? SWIPE_THRESHOLD * 0.5 : SWIPE_THRESHOLD;

        const isSwipeRight =
          event.translationX > activeThreshold ||
          (velocityX > VELOCITY_THRESHOLD && event.translationX > 0);
        const isSwipeLeft =
          event.translationX < -activeThreshold ||
          (velocityX < -VELOCITY_THRESHOLD && event.translationX < 0);
        const isSwipeUp =
          event.translationY < -activeThreshold ||
          (velocityY < -VELOCITY_THRESHOLD && event.translationY < 0);

        if (isSwipeRight) {
          const duration = Math.max(200, 500 - Math.abs(velocityX) / 3);
          translateX.value = withSpring(SCREEN_WIDTH, {
            ...SPRING_CONFIGS.swipeRightSelect,
            velocity: velocityX,
          });
          opacity.value = withTiming(0, { duration });
          runOnJS(onSwipeRight)();
        } else if (isSwipeLeft) {
          const duration = Math.max(200, 500 - Math.abs(velocityX) / 3);
          translateX.value = withSpring(-SCREEN_WIDTH, {
            ...SPRING_CONFIGS.swipeLeftSkip,
            velocity: velocityX,
          });
          opacity.value = withTiming(0, { duration });
          runOnJS(triggerLightHaptic)();
          runOnJS(onSwipeLeft)();
        } else if (isSwipeUp) {
          translateY.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
          translateX.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
          scale.value = withSpring(1);
          opacity.value = withSpring(1);
          runOnJS(triggerMediumHaptic)();
          runOnJS(onSwipeUp)();
        } else {
          translateX.value = withSpring(0, SPRING_CONFIGS.snapBack);
          translateY.value = withSpring(0, SPRING_CONFIGS.snapBack);
          scale.value = withSpring(1);
          opacity.value = withSpring(1);
        }
      } catch (error) {
        translateX.value = withSpring(0, SPRING_CONFIGS.snapBack);
        translateY.value = withSpring(0, SPRING_CONFIGS.snapBack);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        runOnJS(reportWorkletError)('end', String(error));
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isActive && !interactionLocked)
    .onEnd(() => {
      if (!reducedMotion) {
        scale.value = withSequence(
          withSpring(1.05, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
      }
      runOnJS(triggerMediumHaptic)();
    });

  const composed = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
      [-ROTATION_ANGLE * 1.3, -ROTATION_ANGLE, 0, ROTATION_ANGLE, ROTATION_ANGLE * 1.3],
      Extrapolate.CLAMP
    );

    const stackOffset = index * 8;
    const stackScale = 0.95 - index * 0.05;
    const parallaxFactor = isActive ? 0 : (1 - index * 0.3) * 0.2;
    const parallaxX = translateX.value * parallaxFactor;
    const parallaxY = translateY.value * parallaxFactor;
    const mountOpacity = mountProgress?.value ?? 1;
    const mountTranslateY = interpolate(
      mountProgress?.value ?? 1,
      [0, 1],
      [30, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: isActive ? translateX.value : parallaxX },
        {
          translateY: isActive
            ? translateY.value + mountTranslateY
            : stackOffset + parallaxY + mountTranslateY,
        },
        { rotate: isActive ? `${rotate}deg` : '0deg' },
        { scale: isActive ? scale.value : stackScale },
      ],
      opacity: (isActive ? opacity.value : 0.9 - index * 0.05) * mountOpacity,
      zIndex: totalCards - index,
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isActive && !reducedMotion ? iconScale.value : 1 }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ scale: hintScale.value }],
  }));

  const isBlockCard = card.type === 'block';
  const isPatternCard = card.type === 'workPattern';
  const isVisualCard = isBlockCard || isPatternCard;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, animatedStyle, getShadowStyle(index, isActive)]}>
        {isVisualCard && (
          <LinearGradient
            colors={card.gradientColors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          {isVisualCard ? (
            <Image source={card.icon} style={styles.iconImage} resizeMode="contain" />
          ) : (
            <Text style={styles.icon}>{card.dayNumber}</Text>
          )}
        </Animated.View>

        <Text style={styles.cardTitle}>{card.title}</Text>

        {isBlockCard && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {t('phaseSelector.modal.phaseLengthValue', {
                count: card.blockLength,
                defaultValue: `${card.blockLength} ${card.blockLength === 1 ? 'day' : 'days'}`,
              })}
            </Text>
          </View>
        )}

        <Text style={styles.description}>{card.description}</Text>

        {(isBlockCard || (index === 0 && isActive)) && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>
                {t('phaseSelector.hints.next', { defaultValue: '← Next' })}
              </Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintRight, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>
                {t('phaseSelector.hints.select', { defaultValue: 'Select →' })}
              </Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintUp, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>
                {t('phaseSelector.hints.info', { defaultValue: '↑ Info' })}
              </Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

interface FIFOInfoModalProps {
  visible: boolean;
  content: FIFOSelectableCardData | null;
  onClose: () => void;
}

const FIFOInfoModal: React.FC<FIFOInfoModalProps> = ({ visible, content, onClose }) => {
  const { t } = useTranslation('onboarding');
  if (!content) return null;

  const isBlockCard = content.type === 'block';
  const isPatternCard = content.type === 'workPattern';
  const isVisualCard = isBlockCard || isPatternCard;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="close" size={28} color={theme.colors.paper} />
          </Pressable>
        </View>

        <View style={styles.modalContent}>
          {isVisualCard ? (
            <Image source={content.icon} style={styles.modalIconImage} resizeMode="contain" />
          ) : (
            <Text style={styles.modalIcon}>{content.dayNumber}</Text>
          )}
          <Text style={styles.modalTitle}>{content.title}</Text>
          <Text style={styles.modalDescription}>{content.description}</Text>

          {(isBlockCard || isPatternCard) && (
            <>
              {isBlockCard ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    {t('fifoPhaseSelector.modal.blockLength', { defaultValue: 'Block Length' })}
                  </Text>
                  <Text style={styles.modalSectionText}>
                    {t('phaseSelector.modal.phaseLengthValue', {
                      count: content.blockLength,
                      defaultValue: `${content.blockLength} ${content.blockLength === 1 ? 'day' : 'days'}`,
                    })}
                  </Text>
                </View>
              ) : null}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {t('fifoPhaseSelector.modal.whyItMatters', { defaultValue: 'Why it matters' })}
                </Text>
                <Text style={styles.modalSectionText}>{content.quickInfo}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

interface ProgressDotsProps {
  total: number;
  current: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ total, current }) => (
  <View style={styles.progressDots}>
    {Array.from({ length: total }).map((_, index) => (
      <View key={index} style={[styles.dot, index === current && styles.dotActive]} />
    ))}
  </View>
);

const getShadowStyle = (cardIndex: number, isActiveCard: boolean) => {
  if (isActiveCard) {
    return Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    });
  }
  if (cardIndex === 1) {
    return Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    });
  }
  return Platform.select({
    ios: {
      shadowColor: theme.colors.deepVoid,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
  });
};

const generateOrdinalList = (count: number): string => {
  if (count === 0) return '';
  const getOrdinal = (n: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };
  const ordinals = Array.from({ length: count }, (_, i) => getOrdinal(i + 1));
  if (count === 1) return ordinals[0];
  if (count === 2) return `${ordinals[0]} or ${ordinals[1]}`;
  const last = ordinals.pop();
  return `${ordinals.join(', ')}, or ${last}`;
};

const normalizePositiveInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.floor(parsed));
    }
  }
  return fallback;
};

export const PremiumFIFOPhaseSelectorScreen: React.FC = () => {
  useEffect(() => {
    Analytics.onboardingStepViewed('fifo_phase_selector', 5);
  }, []);

  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FIFOPhaseRouteProp>();
  const { data, updateData } = useOnboarding();
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;
  const isSettingsMode = isSettingsEntry && returnToMainOnSelect;

  const isCustomFIFOPattern = data.patternType === ShiftPattern.FIFO_CUSTOM;
  const [stage, setStage] = useState<SelectionStage>(
    isCustomFIFOPattern ? SelectionStage.BLOCK : SelectionStage.WORK_PATTERN
  );
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedBlockType, setSelectedBlockType] = useState<'work' | 'rest' | null>(null);
  const [selectedBlockTitle, setSelectedBlockTitle] = useState('');
  const [dayCards, setDayCards] = useState<DayCardData[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<FIFOSelectableCardData | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);
  const isCustomFIFOPatternRef = useRef(isCustomFIFOPattern);
  const hasUserSelectedWorkPatternRef = useRef(false);
  const hasUserAdjustedSwingSplitRef = useRef(false);
  const allowSettingsExitRef = useRef(false);
  const [pendingSettingsSelection, setPendingSettingsSelection] = useState<{
    phaseOffset: number;
    fifoConfig: FIFOConfig;
  } | null>(null);

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

  const returnToSettings = useCallback(() => {
    allowSettingsExitRef.current = true;
    closeSettingsEditor();
  }, [closeSettingsEditor]);

  const cardAnimations = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  const resolvedFIFOConfig = useMemo(
    () =>
      resolveFIFOConfig(
        data.patternType as ShiftPattern | undefined,
        data.fifoConfig,
        isCustomFIFOPattern
      ),
    [data.fifoConfig, data.patternType, isCustomFIFOPattern]
  );

  const { workBlockDays, restBlockDays, workBlockPattern } = resolvedFIFOConfig;
  const standardWorkPattern = normalizeStandardWorkPattern(workBlockPattern);
  const defaultSwingSplit = useMemo(
    () => getDefaultSwingSplit(workBlockDays, resolvedFIFOConfig.swingPattern),
    [resolvedFIFOConfig.swingPattern, workBlockDays]
  );
  const standardWorkPatternRef = useRef(standardWorkPattern);
  const defaultSwingSplitRef = useRef(defaultSwingSplit);
  const [selectedWorkPattern, setSelectedWorkPattern] =
    useState<StandardFIFOWorkBlockPattern>(standardWorkPattern);
  const [daysOnDayShift, setDaysOnDayShift] = useState(defaultSwingSplit.daysOnDayShift);
  const [daysOnNightShift, setDaysOnNightShift] = useState(defaultSwingSplit.daysOnNightShift);
  const activeWorkBlockPattern = isCustomFIFOPattern ? workBlockPattern : selectedWorkPattern;

  useEffect(() => {
    isCustomFIFOPatternRef.current = isCustomFIFOPattern;
  }, [isCustomFIFOPattern]);

  useEffect(() => {
    standardWorkPatternRef.current = standardWorkPattern;
  }, [standardWorkPattern]);

  useEffect(() => {
    defaultSwingSplitRef.current = defaultSwingSplit;
  }, [defaultSwingSplit]);

  useEffect(() => {
    if (!isCustomFIFOPattern && !hasUserSelectedWorkPatternRef.current) {
      setSelectedWorkPattern(standardWorkPattern);
    }
    if (!isCustomFIFOPattern && !hasUserAdjustedSwingSplitRef.current) {
      setDaysOnDayShift(defaultSwingSplit.daysOnDayShift);
      setDaysOnNightShift(defaultSwingSplit.daysOnNightShift);
    }
  }, [
    defaultSwingSplit.daysOnDayShift,
    defaultSwingSplit.daysOnNightShift,
    isCustomFIFOPattern,
    standardWorkPattern,
  ]);

  useEffect(() => {
    if (isCustomFIFOPattern && stage === SelectionStage.WORK_PATTERN) {
      setStage(SelectionStage.BLOCK);
      setCurrentCardIndex(0);
      setCardRemountKey((prev) => prev + 1);
    }
  }, [isCustomFIFOPattern, stage]);

  const workPatternCards = useMemo<WorkPatternCardData[]>(
    () => [
      {
        type: 'workPattern',
        id: 'straight-days',
        title: String(
          t('fifoPhaseSelector.patterns.straightDays.title', { defaultValue: 'Straight Days' })
        ),
        description: String(
          t('fifoPhaseSelector.patterns.straightDays.description', {
            defaultValue: 'Your work block runs day shifts only.',
          })
        ),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        icon: require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
        gradientColors: [theme.colors.shiftVisualization.dayShift, '#1976D2'],
        quickInfo: String(
          t('fifoPhaseSelector.patterns.straightDays.quickInfo', {
            defaultValue: 'Best for operations that keep all crews on daytime rotations.',
          })
        ),
      },
      {
        type: 'workPattern',
        id: 'straight-nights',
        title: String(
          t('fifoPhaseSelector.patterns.straightNights.title', { defaultValue: 'Straight Nights' })
        ),
        description: String(
          t('fifoPhaseSelector.patterns.straightNights.description', {
            defaultValue: 'Your work block runs night shifts only.',
          })
        ),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        icon: require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
        gradientColors: [theme.colors.shiftVisualization.nightShift, '#4C1D95'],
        quickInfo: String(
          t('fifoPhaseSelector.patterns.straightNights.quickInfo', {
            defaultValue:
              'Use this when site crews remain on night shifts for the full work block.',
          })
        ),
      },
      {
        type: 'workPattern',
        id: 'swing',
        title: String(t('fifoPhaseSelector.patterns.swing.title', { defaultValue: 'Swing' })),
        description: String(
          t('fifoPhaseSelector.patterns.swing.description', {
            defaultValue: 'Your work block mixes day and night shifts.',
          })
        ),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        icon: require('../../../../assets/onboarding/icons/consolidated/roster-type-rotating.png'),
        gradientColors: ['#0891B2', '#6366F1'],
        quickInfo: String(
          t('fifoPhaseSelector.patterns.swing.quickInfo', {
            defaultValue: 'Choose this when your work block rotates between days and nights.',
          })
        ),
      },
    ],
    [t]
  );

  const blockCards = useMemo<BlockCardData[]>(() => {
    const workBlockVisuals =
      activeWorkBlockPattern === 'straight-nights'
        ? {
            description: String(
              t('fifoPhaseSelector.blocks.work.descriptionNight', {
                defaultValue: 'You are currently at the mine site on your night-shift work block',
              })
            ),
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            icon: require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
            gradientColors: [theme.colors.shiftVisualization.nightShift, '#4C1D95'] as [
              string,
              string,
            ],
            quickInfo: String(
              t('fifoPhaseSelector.blocks.work.quickInfoNight', {
                defaultValue:
                  'This means your cycle starts counting from your night-shift work block.',
              })
            ),
          }
        : activeWorkBlockPattern === 'straight-days'
          ? {
              description: String(
                t('fifoPhaseSelector.blocks.work.descriptionDay', {
                  defaultValue: 'You are currently at the mine site on your day-shift work block',
                })
              ),
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              icon: require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
              gradientColors: [theme.colors.shiftVisualization.dayShift, '#1976D2'] as [
                string,
                string,
              ],
              quickInfo: String(
                t('fifoPhaseSelector.blocks.work.quickInfoDay', {
                  defaultValue:
                    'This means your cycle starts counting from your day-shift work block.',
                })
              ),
            }
          : {
              description: String(
                t('fifoPhaseSelector.blocks.work.descriptionNeutral', {
                  defaultValue: 'You are currently at the mine site on your work block',
                })
              ),
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              icon: require('../../../../assets/onboarding/icons/consolidated/roster-type-fifo.png'),
              gradientColors: ['#0EA5E9', '#6366F1'] as [string, string],
              quickInfo: String(
                t('fifoPhaseSelector.blocks.work.quickInfoNeutral', {
                  defaultValue:
                    'This means your cycle starts counting from your current work block.',
                })
              ),
            };

    return [
      {
        type: 'block',
        id: 'work',
        title: String(
          t('fifoPhaseSelector.blocks.work.title', { defaultValue: 'At Site (Working)' })
        ),
        description: workBlockVisuals.description,
        icon: workBlockVisuals.icon,
        blockLength: workBlockDays,
        gradientColors: workBlockVisuals.gradientColors,
        quickInfo: workBlockVisuals.quickInfo,
      },
      {
        type: 'block',
        id: 'rest',
        title: String(t('fifoPhaseSelector.blocks.rest.title', { defaultValue: 'At Home (Rest)' })),
        description: String(
          t('fifoPhaseSelector.blocks.rest.description', {
            defaultValue: 'You are currently at home on your rest block',
          })
        ),
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        icon: require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png'),
        blockLength: restBlockDays,
        gradientColors: [theme.colors.shiftVisualization.daysOff, '#57534e'],
        quickInfo: String(
          t('fifoPhaseSelector.blocks.rest.quickInfo', {
            defaultValue: 'This offsets your cycle by your work block length first.',
          })
        ),
      },
    ];
  }, [activeWorkBlockPattern, restBlockDays, t, workBlockDays]);

  const clearPendingTransition = useCallback(() => {
    if (interactionHandleRef.current?.cancel) {
      interactionHandleRef.current.cancel();
    }
    interactionHandleRef.current = null;
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    isTransitioningRef.current = false;
    setIsTransitioning(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applyReducedMotion = (enabled: boolean | null | undefined) => {
      if (!isMounted || typeof enabled !== 'boolean') return;
      if (reducedMotionRef.current === enabled) return;
      reducedMotionRef.current = enabled;
      setReducedMotion(enabled);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(applyReducedMotion)
      .catch(() => {
        // Keep default false if query fails.
      });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      applyReducedMotion
    );
    return () => {
      isMounted = false;
      subscription.remove?.();
    };
  }, []);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    cardAnimations.forEach((anim, index) => {
      anim.value = withDelay(
        index * 100,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      clearPendingTransition();
      setStage(isCustomFIFOPatternRef.current ? SelectionStage.BLOCK : SelectionStage.WORK_PATTERN);
      setCurrentCardIndex(0);
      hasUserSelectedWorkPatternRef.current = false;
      hasUserAdjustedSwingSplitRef.current = false;
      setSelectedWorkPattern(standardWorkPatternRef.current);
      setDaysOnDayShift(defaultSwingSplitRef.current.daysOnDayShift);
      setDaysOnNightShift(defaultSwingSplitRef.current.daysOnNightShift);
      setSelectedBlockType(null);
      setSelectedBlockTitle('');
      setDayCards([]);
      setShowInfoModal(false);
      setInfoModalContent(null);
      setCardRemountKey((prev) => prev + 1);

      cardAnimations.forEach((anim, index) => {
        anim.value = 0;
        anim.value = withDelay(
          index * 100,
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
        );
      });
      return () => {
        clearPendingTransition();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearPendingTransition])
  );

  useEffect(() => {
    return () => {
      clearPendingTransition();
    };
  }, [clearPendingTransition]);

  useEffect(() => {
    if (!isSettingsMode) {
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
  }, [isSettingsMode, navigation, returnToSettings]);

  const currentCards = useMemo<FIFOSelectableCardData[]>(() => {
    if (stage === SelectionStage.WORK_PATTERN) {
      return workPatternCards;
    }
    if (stage === SelectionStage.SWING_CONFIG) {
      return [];
    }
    if (stage === SelectionStage.BLOCK) {
      return blockCards;
    }
    return dayCards;
  }, [blockCards, dayCards, stage, workPatternCards]);

  const visibleCards = useMemo(() => {
    return currentCards.slice(currentCardIndex, currentCardIndex + 4);
  }, [currentCards, currentCardIndex]);
  const stackedCards = useMemo(() => [...visibleCards].reverse(), [visibleCards]);

  const stageDayCount = selectedBlockType === 'work' ? workBlockDays : restBlockDays;
  const swingSplitTotal = daysOnDayShift + daysOnNightShift;
  const swingSplitSummary = `${daysOnDayShift} + ${daysOnNightShift} = ${swingSplitTotal}`;
  const canConfigureSwingSplit = workBlockDays > 1;
  const isSwingSplitValid =
    canConfigureSwingSplit &&
    daysOnDayShift >= 1 &&
    daysOnNightShift >= 1 &&
    swingSplitTotal === workBlockDays;

  useEffect(() => {
    if (currentCardIndex >= currentCards.length && currentCards.length > 0) {
      setCurrentCardIndex(0);
    }
  }, [currentCardIndex, currentCards.length]);

  const calculateAndNavigate = useCallback(
    (blockType: 'work' | 'rest', dayWithinBlock: number) => {
      if (isTransitioningRef.current) {
        return;
      }

      const safeDayWithinBlock = normalizePositiveInt(dayWithinBlock, 1);
      const cycleLength = Math.max(1, workBlockDays + restBlockDays);
      const rawOffset =
        blockType === 'work' ? safeDayWithinBlock - 1 : workBlockDays + (safeDayWithinBlock - 1);
      const phaseOffset = Math.max(0, Math.min(cycleLength - 1, rawOffset));
      if (__DEV__ && phaseOffset !== rawOffset) {
        console.warn(
          '[FIFOPhaseSelector] phaseOffset was clamped — day card exceeded cycle bounds.',
          { blockType, dayWithinBlock, workBlockDays, restBlockDays, rawOffset, phaseOffset }
        );
      }
      const fifoConfig: FIFOConfig = isCustomFIFOPattern
        ? {
            workBlockDays,
            restBlockDays,
            workBlockPattern,
            ...(resolvedFIFOConfig.swingPattern
              ? { swingPattern: resolvedFIFOConfig.swingPattern }
              : {}),
            ...(resolvedFIFOConfig.customWorkSequence
              ? { customWorkSequence: resolvedFIFOConfig.customWorkSequence }
              : {}),
          }
        : {
            workBlockDays,
            restBlockDays,
            workBlockPattern: selectedWorkPattern,
            ...(selectedWorkPattern === 'swing'
              ? {
                  swingPattern: {
                    daysOnDayShift,
                    daysOnNightShift,
                  },
                }
              : {}),
          };
      if (isSettingsMode) {
        setPendingSettingsSelection({
          phaseOffset,
          fifoConfig,
        });
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
          source: 'PremiumFIFOPhaseSelectorScreen.handleDaySelect.settingsPending',
        });
        return;
      }
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      updateData({ phaseOffset, fifoConfig });
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumFIFOPhaseSelectorScreen.handleDaySelect',
      });
      interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
        navigationTimeoutRef.current = setTimeout(() => {
          navigationTimeoutRef.current = null;
          if (isSettingsMode) {
            returnToSettings();
            return;
          }
          goToNextScreen(navigation, 'FIFOPhaseSelector');
        }, 300);
      });
    },
    [
      isSettingsMode,
      isCustomFIFOPattern,
      navigation,
      restBlockDays,
      resolvedFIFOConfig.customWorkSequence,
      resolvedFIFOConfig.swingPattern,
      returnToSettings,
      daysOnDayShift,
      daysOnNightShift,
      selectedWorkPattern,
      updateData,
      workBlockDays,
      workBlockPattern,
    ]
  );

  const handleSaveSettingsSelection = useCallback(() => {
    if (!isSettingsMode || !pendingSettingsSelection) {
      return;
    }

    updateData({
      phaseOffset: pendingSettingsSelection.phaseOffset,
      fifoConfig: pendingSettingsSelection.fifoConfig,
    });
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumFIFOPhaseSelectorScreen.handleSaveSettingsSelection',
    });
    returnToSettings();
  }, [isSettingsMode, pendingSettingsSelection, returnToSettings, updateData]);

  const handleContinueFromSwingConfig = useCallback(() => {
    if (!isSwingSplitValid) {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumFIFOPhaseSelectorScreen.handleSwingConfigContinue.invalid',
      });
      return;
    }
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumFIFOPhaseSelectorScreen.handleSwingConfigContinue',
    });
    setCurrentCardIndex(0);
    setStage(SelectionStage.BLOCK);
    setCardRemountKey((prev) => prev + 1);
  }, [isSwingSplitValid]);

  const handleChangePattern = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumFIFOPhaseSelectorScreen.handleSwingConfigChangePattern',
    });
    setCurrentCardIndex(0);
    hasUserAdjustedSwingSplitRef.current = false;
    setStage(SelectionStage.WORK_PATTERN);
    setCardRemountKey((prev) => prev + 1);
  }, []);

  const handleSwipeRight = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }

    if (stage === SelectionStage.SWING_CONFIG) {
      if (isSwingSplitValid) {
        handleContinueFromSwingConfig();
      } else {
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
          source: 'PremiumFIFOPhaseSelectorScreen.handleSwingConfigSwipe.invalid',
        });
      }
      return;
    }

    const active = currentCards[currentCardIndex];
    if (!active) return;

    if (stage === SelectionStage.WORK_PATTERN && active.type === 'workPattern') {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'PremiumFIFOPhaseSelectorScreen.handleWorkPatternSelect',
      });
      hasUserSelectedWorkPatternRef.current = true;
      setSelectedWorkPattern(active.id);
      setCurrentCardIndex(0);
      if (active.id === 'swing' && !isCustomFIFOPattern) {
        const swingSplit = getDefaultSwingSplit(workBlockDays, resolvedFIFOConfig.swingPattern);
        hasUserAdjustedSwingSplitRef.current = false;
        setDaysOnDayShift(swingSplit.daysOnDayShift);
        setDaysOnNightShift(swingSplit.daysOnNightShift);
        setStage(SelectionStage.SWING_CONFIG);
      } else {
        setStage(SelectionStage.BLOCK);
      }
      setCardRemountKey((prev) => prev + 1);
      return;
    }

    if (stage === SelectionStage.BLOCK && active.type === 'block') {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'PremiumFIFOPhaseSelectorScreen.handleBlockSelect',
      });
      setSelectedBlockType(active.id);
      setSelectedBlockTitle(active.title);

      const totalDays = normalizePositiveInt(
        active.id === 'work' ? workBlockDays : restBlockDays,
        14
      );
      const swingPatternForDayCards: SwingPatternConfig | undefined =
        active.id === 'work' && activeWorkBlockPattern === 'swing'
          ? isCustomFIFOPattern
            ? getDefaultSwingSplit(workBlockDays, resolvedFIFOConfig.swingPattern)
            : { daysOnDayShift, daysOnNightShift }
          : undefined;
      const generatedDays: DayCardData[] = Array.from({ length: totalDays }, (_, idx) => ({
        ...(getDayCardContent(
          active.id,
          idx + 1,
          totalDays,
          activeWorkBlockPattern,
          t,
          swingPatternForDayCards
        ) as Pick<DayCardData, 'title' | 'description'>),
        type: 'day',
        id: `${active.id}-day-${idx + 1}`,
        dayNumber: idx + 1,
        blockType: active.id,
      }));

      setDayCards(generatedDays);
      setCurrentCardIndex(0);
      setStage(SelectionStage.DAY_WITHIN_BLOCK);
      setCardRemountKey((prev) => prev + 1);
      return;
    }

    if (stage === SelectionStage.DAY_WITHIN_BLOCK && active.type === 'day') {
      calculateAndNavigate(active.blockType, active.dayNumber);
    }
  }, [
    calculateAndNavigate,
    handleContinueFromSwingConfig,
    currentCardIndex,
    currentCards,
    isSwingSplitValid,
    restBlockDays,
    stage,
    activeWorkBlockPattern,
    isCustomFIFOPattern,
    resolvedFIFOConfig.swingPattern,
    daysOnDayShift,
    daysOnNightShift,
    t,
    workBlockDays,
  ]);

  const handleSwipeLeft = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    const totalCards = currentCards.length;
    if (totalCards === 0) return;

    setCurrentCardIndex((prev) => {
      if (prev < totalCards - 1) {
        return prev + 1;
      }
      // Loop back to start for deterministic never-empty flow.
      setCardRemountKey((key) => key + 1);
      return 0;
    });
  }, [currentCards.length]);

  const handleSwipeUp = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    const active = currentCards[currentCardIndex];
    if (!active) return;
    setInfoModalContent(active);
    setShowInfoModal(true);
  }, [currentCardIndex, currentCards]);

  const activeWorkPatternSubtitle = useMemo(() => {
    const activeCard =
      stage === SelectionStage.WORK_PATTERN ? currentCards[currentCardIndex] : undefined;

    if (!activeCard || activeCard.type !== 'workPattern') {
      return '';
    }

    if (activeCard.id === 'straight-days') {
      return String(
        t('fifoPhaseSelector.subtitle.workPatternMode.straightDays', {
          defaultValue: 'This option means straight days only.',
        })
      );
    }

    if (activeCard.id === 'straight-nights') {
      return String(
        t('fifoPhaseSelector.subtitle.workPatternMode.straightNights', {
          defaultValue: 'This option means straight nights only.',
        })
      );
    }

    return String(
      t('fifoPhaseSelector.subtitle.workPatternMode.swing', {
        defaultValue: 'This option mixes day and night shifts.',
      })
    );
  }, [currentCardIndex, currentCards, stage, t]);

  const activeStageContextSubtitle = useMemo(() => {
    const activeCard =
      stage === SelectionStage.BLOCK || stage === SelectionStage.DAY_WITHIN_BLOCK
        ? currentCards[currentCardIndex]
        : undefined;

    if (!activeCard) {
      return '';
    }

    if (stage === SelectionStage.BLOCK && activeCard.type === 'block') {
      return activeCard.description;
    }

    if (stage === SelectionStage.DAY_WITHIN_BLOCK && activeCard.type === 'day') {
      return `${activeCard.title}: ${activeCard.description}`;
    }

    return '';
  }, [currentCardIndex, currentCards, stage]);

  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.FIFO_PHASE_SELECTOR}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        testID="fifo-phase-selector-progress-header"
      />

      <Text style={styles.title}>
        {stage === SelectionStage.WORK_PATTERN
          ? String(
              t('fifoPhaseSelector.title.workPattern', {
                defaultValue: 'How are shifts run during your FIFO work block?',
              })
            )
          : stage === SelectionStage.SWING_CONFIG
            ? String(
                t('fifoPhaseSelector.title.swingConfig', {
                  defaultValue: 'Configure your swing split',
                })
              )
            : stage === SelectionStage.BLOCK
              ? String(
                  t('fifoPhaseSelector.title.block', {
                    defaultValue: 'Where are you in your FIFO cycle?',
                  })
                )
              : String(
                  t('fifoPhaseSelector.title.dayWithinBlock', {
                    blockTitle: selectedBlockTitle,
                    defaultValue: `Which day of ${selectedBlockTitle} are you on?`,
                  })
                )}
      </Text>

      <Text style={styles.subtitle}>
        {stage === SelectionStage.WORK_PATTERN
          ? `${String(
              t('fifoPhaseSelector.subtitle.workPattern', {
                defaultValue:
                  'Swipe right to choose your work-block pattern, left for next option, or up for info',
              })
            )}\n${activeWorkPatternSubtitle}`
          : stage === SelectionStage.SWING_CONFIG
            ? String(
                t('fifoPhaseSelector.subtitle.swingConfig', {
                  defaultValue:
                    'Set how many day-shift and night-shift days you work before choosing your current block',
                })
              )
            : stage === SelectionStage.BLOCK
              ? `${String(
                  t('fifoPhaseSelector.subtitle.block', {
                    defaultValue: 'Swipe right to select, left to see next, or up for more info',
                  })
                )}\n${activeStageContextSubtitle}`
              : `${String(
                  t('fifoPhaseSelector.subtitle.dayWithinBlock', {
                    ordinalList: generateOrdinalList(stageDayCount),
                    defaultValue: `Swipe right to select, left to see next, or up for more info. Is it the ${generateOrdinalList(
                      stageDayCount
                    )}?`,
                  })
                )}\n${activeStageContextSubtitle}`}
      </Text>

      <>
        <ProgressDots
          total={stage === SelectionStage.SWING_CONFIG ? 1 : currentCards.length}
          current={stage === SelectionStage.SWING_CONFIG ? 0 : currentCardIndex}
        />

        {stage === SelectionStage.SWING_CONFIG ? (
          <View style={styles.swingConfigCard} testID="swing-config-stage">
            <LinearGradient
              colors={['#0EA5E9', '#6366F1']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            <View style={styles.swingConfigContent}>
              <PatternBuilderSlider
                label={String(
                  t('fifoPhaseSelector.swingConfig.daysOnDayShift', {
                    defaultValue: 'Days on Day Shift',
                  })
                )}
                icon="☀️"
                value={daysOnDayShift}
                min={1}
                max={Math.max(1, workBlockDays - 1)}
                color={theme.colors.shiftVisualization.dayShift}
                trackColor="#60A5FA"
                onChange={(value) => {
                  hasUserAdjustedSwingSplitRef.current = true;
                  const nextDayShiftDays = Math.max(
                    1,
                    Math.min(Math.max(1, workBlockDays - 1), value)
                  );
                  setDaysOnDayShift(nextDayShiftDays);
                  setDaysOnNightShift(Math.max(1, workBlockDays - nextDayShiftDays));
                }}
                hapticSourcePrefix="PremiumFIFOPhaseSelectorScreen"
                delayIndex={0}
                reducedMotion={reducedMotion}
                customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
                customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png')}
              />

              <PatternBuilderSlider
                label={String(
                  t('fifoPhaseSelector.swingConfig.daysOnNightShift', {
                    defaultValue: 'Days on Night Shift',
                  })
                )}
                icon="🌙"
                value={daysOnNightShift}
                min={1}
                max={Math.max(1, workBlockDays - 1)}
                color={theme.colors.shiftVisualization.nightShift}
                trackColor="#A78BFA"
                onChange={(value) => {
                  hasUserAdjustedSwingSplitRef.current = true;
                  const nextNightShiftDays = Math.max(
                    1,
                    Math.min(Math.max(1, workBlockDays - 1), value)
                  );
                  setDaysOnNightShift(nextNightShiftDays);
                  setDaysOnDayShift(Math.max(1, workBlockDays - nextNightShiftDays));
                }}
                hapticSourcePrefix="PremiumFIFOPhaseSelectorScreen"
                delayIndex={1}
                reducedMotion={reducedMotion}
                customThumbIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
                customHeaderIcon={require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png')}
              />

              <Text style={styles.swingSplitText} testID="swing-split-total-text">
                {String(
                  t('fifoPhaseSelector.swingConfig.splitTotal', {
                    swingSplitTotal: swingSplitSummary,
                    workBlockDays,
                    defaultValue: `Split total: ${swingSplitSummary}/${workBlockDays} days`,
                  })
                )}
              </Text>

              {isSwingSplitValid ? null : (
                <Text style={styles.swingValidationText} testID="swing-config-error">
                  {String(
                    t('fifoPhaseSelector.swingConfig.validation', {
                      workBlockDays,
                      defaultValue: `Swing split must equal ${workBlockDays} days with at least 1 day on each shift.`,
                    })
                  )}
                </Text>
              )}

              <View style={styles.swingActions}>
                <Pressable
                  onPress={handleChangePattern}
                  style={styles.changePatternButton}
                  testID="swing-config-change-pattern-button"
                >
                  <Text
                    style={styles.changePatternButtonText}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.85}
                  >
                    {String(
                      t('fifoPhaseSelector.swingConfig.changePattern', {
                        defaultValue: 'Change Pattern',
                      })
                    )}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleContinueFromSwingConfig}
                  style={[
                    styles.swingContinueButton,
                    !isSwingSplitValid && styles.swingContinueButtonDisabled,
                  ]}
                  disabled={!isSwingSplitValid}
                  testID="swing-config-continue-button"
                >
                  <Text style={styles.swingContinueButtonText}>
                    {String(
                      t('fifoPhaseSelector.swingConfig.continue', {
                        defaultValue: 'Continue',
                      })
                    )}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.cardStack}>
            {stackedCards.map((card, index) => (
              <SwipeableFIFOCard
                key={`${card.id}-${cardRemountKey}`}
                card={card}
                index={stackedCards.length - 1 - index}
                totalCards={stackedCards.length}
                isActive={index === stackedCards.length - 1}
                interactionLocked={isTransitioning}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onSwipeUp={handleSwipeUp}
                mountProgress={cardAnimations[index]}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
        )}
      </>
      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>
            {String(
              t('fifoPhaseSelector.transition.preparingCalendar', {
                defaultValue: 'Preparing your calendar...',
              })
            )}
          </Text>
        </View>
      ) : null}

      {isSettingsMode ? (
        <View style={styles.settingsActions}>
          <SettingsEntryActionButtons
            backLabel={String(
              t('fifoPhaseSelector.actions.backToSettings', {
                defaultValue: 'Back to Settings',
              })
            )}
            saveLabel={String(
              t('fifoPhaseSelector.actions.saveAndReturn', {
                defaultValue: 'Save & Return',
              })
            )}
            onBack={returnToSettings}
            onSave={handleSaveSettingsSelection}
            saveDisabled={!pendingSettingsSelection}
            backAccessibilityLabel={String(
              t('fifoPhaseSelector.actions.backToSettingsA11y', {
                defaultValue: 'Back to settings',
              })
            )}
            saveAccessibilityLabel={String(
              t('fifoPhaseSelector.actions.saveAndReturnA11y', {
                defaultValue: 'Save selection and return to settings',
              })
            )}
            backTestID="fifo-phase-selector-back-settings-button"
            saveTestID="fifo-phase-selector-save-settings-button"
          />
        </View>
      ) : null}

      <FIFOInfoModal
        visible={showInfoModal}
        content={infoModalContent}
        onClose={() => setShowInfoModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
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
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-black' },
    }),
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.paper,
    opacity: 0.88,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
    }),
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  swingConfigCard: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
    minHeight: CARD_HEIGHT,
  },
  swingConfigContent: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  swingSplitText: {
    fontSize: 18,
    color: theme.colors.paper,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  swingValidationText: {
    fontSize: 14,
    color: '#FCA5A5',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  swingActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  changePatternButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white30,
    minHeight: 56,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.opacity.black60,
  },
  changePatternButtonText: {
    color: theme.colors.paper,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  swingContinueButton: {
    flex: 1,
    borderRadius: 16,
    minHeight: 56,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sacredGold,
  },
  swingContinueButtonDisabled: {
    backgroundColor: theme.colors.softStone,
    opacity: 0.6,
  },
  swingContinueButtonText: {
    color: theme.colors.deepVoid,
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 120,
    color: theme.colors.paper,
  },
  iconImage: {
    width: 120,
    height: 120,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  badge: {
    backgroundColor: theme.colors.opacity.black40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold30,
  },
  badgeText: {
    fontSize: 18,
    color: theme.colors.paper,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: theme.colors.dust,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
  },
  swipeHint: {
    position: 'absolute',
    backgroundColor: theme.colors.opacity.gold30,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
  },
  swipeHintLeft: {
    left: theme.spacing.lg,
    top: '50%',
  },
  swipeHintRight: {
    right: theme.spacing.lg,
    top: '50%',
  },
  swipeHintUp: {
    top: theme.spacing.lg,
    alignSelf: 'center',
  },
  swipeHintText: {
    fontSize: 14,
    color: theme.colors.dust,
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.opacity.black60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  transitionText: {
    fontSize: 18,
    color: theme.colors.dust,
    textAlign: 'center',
    fontWeight: '600',
  },
  settingsActions: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  settingsActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  settingsBackButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white30,
    backgroundColor: theme.colors.softStone,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  settingsBackButtonText: {
    fontSize: 15,
    color: theme.colors.paper,
    fontWeight: '600',
  },
  settingsSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.45)',
    backgroundColor: theme.colors.sacredGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  settingsSaveButtonDisabled: {
    backgroundColor: theme.colors.softStone,
    borderColor: theme.colors.opacity.white30,
  },
  settingsSaveButtonText: {
    fontSize: 15,
    color: theme.colors.deepVoid,
    fontWeight: '700',
  },
  settingsSaveButtonTextDisabled: {
    color: theme.colors.shadow,
    fontWeight: '600',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.softStone,
  },
  dotActive: {
    backgroundColor: theme.colors.sacredGold,
    width: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.darkStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalIcon: {
    fontSize: 96,
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.paper,
  },
  modalIconImage: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 18,
    fontWeight: '400',
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: 32,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.dust,
    lineHeight: 24,
  },
});
