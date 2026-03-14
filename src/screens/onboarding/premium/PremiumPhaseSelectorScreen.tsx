/**
 * PremiumPhaseSelectorScreen Component
 *
 * Tinder-style swipeable card interface for phase selection (Step 5 of 11)
 * Features two-stage selection: Phase → Day-within-phase (if multi-day)
 * Calculates and saves phaseOffset to OnboardingContext
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
  ScrollView,
  AccessibilityInfo,
  Image,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftSystem, Phase, ShiftPattern } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;
type PhaseRouteProp = RouteProp<OnboardingStackParamList, 'PhaseSelector'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = 120;
const ROTATION_ANGLE = 15;
const VELOCITY_THRESHOLD = 500;

// Spring physics configurations
const SPRING_CONFIGS = {
  swipeRightSelect: { damping: 25, stiffness: 450 },
  swipeLeftSkip: { damping: 35, stiffness: 500 },
  swipeUpInfo: { damping: 20, stiffness: 300 },
  snapBack: { damping: 18, stiffness: 280 },
  stageTransition: { damping: 22, stiffness: 320 },
} as const;

// Selection stages
enum SelectionStage {
  PHASE = 'phase',
  DAY_WITHIN_PHASE = 'dayWithinPhase',
  COMPLETE = 'complete',
}

// Phase card data interface
interface PhaseCardData {
  id: string;
  phase: Phase;
  title: string;
  description: string;
  icon: ReturnType<typeof require> | 'iconicon';
  phaseLength: number;
  gradientColors: [string, string];
}

const PHASE_CARD_ACCENTS: Record<
  Phase,
  {
    borderColor: string;
    badgeGradient: [string, string];
    badgeText: string;
    hintGradient: [string, string];
    hintText: string;
  }
> = {
  day: {
    borderColor: 'rgba(33, 150, 243, 0.45)',
    badgeGradient: ['rgba(33, 150, 243, 0.28)', 'rgba(21, 101, 192, 0.16)'],
    badgeText: '#93C5FD',
    hintGradient: ['rgba(33, 150, 243, 0.3)', 'rgba(21, 101, 192, 0.18)'],
    hintText: '#DBEAFE',
  },
  morning: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    badgeGradient: ['rgba(245, 158, 11, 0.3)', 'rgba(217, 119, 6, 0.16)'],
    badgeText: '#FDE68A',
    hintGradient: ['rgba(245, 158, 11, 0.32)', 'rgba(217, 119, 6, 0.18)'],
    hintText: '#FEF3C7',
  },
  afternoon: {
    borderColor: 'rgba(6, 182, 212, 0.5)',
    badgeGradient: ['rgba(6, 182, 212, 0.3)', 'rgba(14, 116, 144, 0.16)'],
    badgeText: '#67E8F9',
    hintGradient: ['rgba(6, 182, 212, 0.32)', 'rgba(14, 116, 144, 0.18)'],
    hintText: '#CFFAFE',
  },
  night: {
    borderColor: 'rgba(101, 31, 255, 0.5)',
    badgeGradient: ['rgba(101, 31, 255, 0.3)', 'rgba(74, 20, 140, 0.16)'],
    badgeText: '#C4B5FD',
    hintGradient: ['rgba(101, 31, 255, 0.32)', 'rgba(74, 20, 140, 0.18)'],
    hintText: '#E9D5FF',
  },
  off: {
    borderColor: 'rgba(245, 158, 11, 0.38)',
    badgeGradient: ['rgba(245, 158, 11, 0.22)', 'rgba(120, 113, 108, 0.16)'],
    badgeText: '#FCD34D',
    hintGradient: ['rgba(245, 158, 11, 0.24)', 'rgba(120, 113, 108, 0.18)'],
    hintText: '#FEF3C7',
  },
};

// Day card data interface
interface DayCardData {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
}

// Shadow utility function
const getShadowStyle = (cardIndex: number, isActiveCard: boolean) => {
  if (isActiveCard) {
    return Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
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
      android: {
        elevation: 6,
      },
    });
  }
  return Platform.select({
    ios: {
      shadowColor: theme.colors.deepVoid,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    },
    android: {
      elevation: 3,
    },
  });
};

// Helper: Get base phase offset
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

// Main calculation: Enhanced phase offset
const calculateEnhancedPhaseOffset = (
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
  const baseOffset = getBasePhaseOffset(phase, pattern, shiftSystem);
  return baseOffset + (dayWithinPhase - 1);
};

/**
 * Generate ordinal number list for day selection subtitle
 * Example: generateDayOrdinalList(7) → "1st, 2nd, 3rd, 4th, 5th, 6th, or 7th"
 */
type OnboardingTranslate = (key: string, options?: Record<string, string | number>) => string;

const generateDayOrdinalList = (count: number, t: OnboardingTranslate): string => {
  if (count === 0) return '';

  const ordinals = Array.from({ length: count }, (_, i) =>
    String(
      t('phaseSelector.dayOrdinal', {
        day: i + 1,
        defaultValue: `Day ${i + 1}`,
      })
    )
  );

  if (count === 1) return ordinals[0];
  if (count === 2) {
    return `${ordinals[0]} ${t('phaseSelector.list.or', { defaultValue: 'or' })} ${ordinals[1]}`;
  }

  const lastOrdinal = ordinals.pop();
  return `${ordinals.join(', ')}, ${t('phaseSelector.list.or', { defaultValue: 'or' })} ${lastOrdinal}`;
};

/**
 * Generate contextual day card description
 * Example: generateDayCardDescription(1, 7, 'night', t) → "First day of this phase"
 */
const generateDayCardDescription = (
  dayNumber: number,
  totalDays: number,
  phase: Phase,
  t: OnboardingTranslate
): string => {
  if (phase === 'off') {
    if (dayNumber === totalDays) {
      return String(
        t('phaseSelector.dayDescriptions.restLastDay', {
          defaultValue: 'Last day off before returning',
        })
      );
    }
    return String(
      t('phaseSelector.dayDescriptions.restDayOfTotal', {
        day: dayNumber,
        total: totalDays,
        defaultValue: `Rest day ${dayNumber} of ${totalDays}`,
      })
    );
  }

  if (dayNumber === 1) {
    return String(
      t('phaseSelector.dayDescriptions.firstDay', {
        defaultValue: 'First day of this phase',
      })
    );
  }

  if (dayNumber === totalDays) {
    return String(
      t('phaseSelector.dayDescriptions.lastDay', {
        defaultValue: 'Last day of this phase',
      })
    );
  }

  return String(
    t('phaseSelector.dayDescriptions.dayOfTotal', {
      day: dayNumber,
      total: totalDays,
      defaultValue: `Day ${dayNumber} of ${totalDays}`,
    })
  );
};

// Swipeable Phase Card Component
interface SwipeablePhaseCardProps {
  card: PhaseCardData | DayCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  interactionLocked?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  mountProgress?: SharedValue<number>;
  reducedMotion: boolean;
  stage: SelectionStage;
}

const SwipeablePhaseCard: React.FC<SwipeablePhaseCardProps> = ({
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
  const triggerSuccessHaptic = useCallback(() => {
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumPhaseSelectorScreen.card.swipeRight',
    });
  }, []);
  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumPhaseSelectorScreen.card.swipeLeft',
    });
  }, []);
  const triggerMediumHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumPhaseSelectorScreen.card.swipeUpOrTap',
    });
  }, []);
  const reportWorkletError = useCallback((phase: 'update' | 'end', message: string) => {
    if (__DEV__) {
      console.error('[PhaseSelector] Swipe worklet error', { phase, message });
    }
  }, []);

  // Idle floating animation
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
      // Icon pulse animation
      iconScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 1200 }), withTiming(1.08, { duration: 1200 })),
        -1,
        true
      );
    }
  }, [isActive, reducedMotion, translateY, scale, iconScale]);

  // Hint pulse and auto-fade animation with repeat cycle
  useEffect(() => {
    if (isActive && index === 0 && !reducedMotion) {
      // Pulse animation - continuous loop
      hintScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 600 }), withTiming(1.15, { duration: 600 })),
        -1, // Infinite repeat
        true
      );

      // Opacity cycle: visible 3s -> fade out 0.5s -> hidden 7s -> fade in 0.5s -> repeat
      hintOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }), // Ensure we start visible
          withDelay(3000, withTiming(0, { duration: 500 })), // Wait 3s, then fade out over 0.5s
          withDelay(7000, withTiming(1, { duration: 500 })) // Wait 7s hidden, then fade in over 0.5s
        ),
        -1, // Infinite repeat
        false
      );
    }
  }, [isActive, index, reducedMotion, hintOpacity, hintScale]);

  const panGesture = Gesture.Pan()
    .enabled(isActive && !interactionLocked)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onUpdate((event: any) => {
      try {
        translateX.value = event.translationX;
        translateY.value = event.translationY;

        // Dynamic scale based on swipe distance
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onEnd((event: any) => {
      try {
        // Velocity-based detection
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
          runOnJS(triggerSuccessHaptic)();
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
          // Snap back to center
          translateY.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
          translateX.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
          scale.value = withSpring(1);
          opacity.value = withSpring(1);
          runOnJS(triggerMediumHaptic)();
          runOnJS(onSwipeUp)();
        } else {
          // Rubber band back to center
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
    // Enhanced rotation interpolation
    const rotate = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
      [-ROTATION_ANGLE * 1.3, -ROTATION_ANGLE, 0, ROTATION_ANGLE, ROTATION_ANGLE * 1.3],
      Extrapolate.CLAMP
    );

    const stackOffset = index * 8;
    const stackScale = 0.95 - index * 0.05;

    // Parallax effect for background cards
    const parallaxFactor = isActive ? 0 : (1 - index * 0.3) * 0.2;
    const parallaxX = translateX.value * parallaxFactor;
    const parallaxY = translateY.value * parallaxFactor;

    // Mount animation values
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

  // Type guard to check if card is PhaseCardData
  const isPhaseCard = (c: PhaseCardData | DayCardData): c is PhaseCardData => {
    return 'phase' in c;
  };

  const phaseCard = isPhaseCard(card) ? card : null;
  const dayCard = !isPhaseCard(card) ? card : null;
  const phaseAccent = phaseCard ? PHASE_CARD_ACCENTS[phaseCard.phase] : null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          styles.card,
          phaseAccent && { borderColor: phaseAccent.borderColor },
          getShadowStyle(index, isActive),
          animatedStyle,
        ]}
      >
        {/* Gradient Background (for phase cards only) */}
        {phaseCard && (
          <LinearGradient
            colors={phaseCard.gradientColors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        {/* Icon */}
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          {phaseCard ? (
            phaseCard.icon === 'iconicon' ? (
              <Ionicons name="partly-sunny" size={120} color={theme.colors.paper} />
            ) : (
              <Image source={phaseCard.icon} style={styles.iconImage} resizeMode="contain" />
            )
          ) : (
            <Text style={styles.icon}>{dayCard?.dayNumber}</Text>
          )}
        </Animated.View>

        {/* Title */}
        <Text style={styles.cardTitle}>{card.title}</Text>

        {/* Badge (phase length for phase cards) */}
        {phaseCard && phaseCard.phaseLength > 0 && (
          <LinearGradient
            colors={
              phaseAccent?.badgeGradient ?? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={[styles.badgeText, phaseAccent && { color: phaseAccent.badgeText }]}>
              {phaseCard.phaseLength} {phaseCard.phaseLength === 1 ? 'day' : 'days'}
            </Text>
          </LinearGradient>
        )}

        {/* Description */}
        <Text style={styles.description}>{card.description}</Text>

        {/* Swipe Hints (only for first card) */}
        {index === 0 && isActive && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <View style={styles.swipeHintBubble}>
                <LinearGradient
                  colors={
                    phaseAccent?.hintGradient ?? [
                      'rgba(255,255,255,0.16)',
                      'rgba(255,255,255,0.08)',
                    ]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swipeHintGradient}
                >
                  <Text
                    style={[styles.swipeHintText, phaseAccent && { color: phaseAccent.hintText }]}
                  >
                    {t('phaseSelector.hints.next', { defaultValue: '← Next' })}
                  </Text>
                </LinearGradient>
              </View>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintRight, hintAnimatedStyle]}>
              <View style={styles.swipeHintBubble}>
                <LinearGradient
                  colors={
                    phaseAccent?.hintGradient ?? [
                      'rgba(255,255,255,0.16)',
                      'rgba(255,255,255,0.08)',
                    ]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swipeHintGradient}
                >
                  <Text
                    style={[styles.swipeHintText, phaseAccent && { color: phaseAccent.hintText }]}
                  >
                    {t('phaseSelector.hints.select', { defaultValue: 'Select →' })}
                  </Text>
                </LinearGradient>
              </View>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintUp, hintAnimatedStyle]}>
              <View style={styles.swipeHintBubble}>
                <LinearGradient
                  colors={
                    phaseAccent?.hintGradient ?? [
                      'rgba(255,255,255,0.16)',
                      'rgba(255,255,255,0.08)',
                    ]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.swipeHintGradient}
                >
                  <Text
                    style={[styles.swipeHintText, phaseAccent && { color: phaseAccent.hintText }]}
                  >
                    {t('phaseSelector.hints.info', { defaultValue: '↑ Info' })}
                  </Text>
                </LinearGradient>
              </View>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

// Phase Info Modal Component
interface PhaseInfoModalProps {
  visible: boolean;
  content: PhaseCardData | DayCardData | null;
  onClose: () => void;
}

const PhaseInfoModal: React.FC<PhaseInfoModalProps> = ({ visible, content, onClose }) => {
  const { t } = useTranslation('onboarding');
  if (!content) return null;

  const isPhaseCard = (c: PhaseCardData | DayCardData): c is PhaseCardData => {
    return 'phase' in c;
  };

  const phaseCard = isPhaseCard(content) ? content : null;
  const dayCard = !isPhaseCard(content) ? content : null;

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

        <ScrollView style={styles.modalContent}>
          {phaseCard && (
            <>
              <Text style={styles.modalIcon}>{phaseCard.icon}</Text>
              <Text style={styles.modalTitle}>{phaseCard.title}</Text>
              <Text style={styles.modalDescription}>{phaseCard.description}</Text>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {t('phaseSelector.modal.phaseLength', { defaultValue: 'Phase Length' })}
                </Text>
                <Text style={styles.modalSectionText}>
                  {t('phaseSelector.modal.phaseLengthValue', {
                    count: phaseCard.phaseLength,
                    defaultValue: `${phaseCard.phaseLength} ${phaseCard.phaseLength === 1 ? 'day' : 'days'}`,
                  })}
                </Text>
              </View>
            </>
          )}

          {dayCard && (
            <>
              <Text style={styles.modalIcon}>{dayCard.dayNumber}</Text>
              <Text style={styles.modalTitle}>{dayCard.title}</Text>
              <Text style={styles.modalDescription}>{dayCard.description}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Progress Dots Component
interface ProgressDotsProps {
  total: number;
  current: number;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ total, current }) => {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, index) => (
        <View key={index} style={[styles.dot, index === current && styles.dotActive]} />
      ))}
    </View>
  );
};

// Main Screen Component
export const PremiumPhaseSelectorScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PhaseRouteProp>();
  const { data, updateData } = useOnboarding();
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;
  const isSettingsMode = isSettingsEntry && returnToMainOnSelect;

  // State
  const [stage, setStage] = useState<SelectionStage>(SelectionStage.PHASE);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [selectedPhaseTitle, setSelectedPhaseTitle] = useState<string>('');
  const [_selectedDay, setSelectedDay] = useState<number | null>(null);
  const [phaseCards, setPhaseCards] = useState<PhaseCardData[]>([]);
  const [dayCards, setDayCards] = useState<DayCardData[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<PhaseCardData | DayCardData | null>(
    null
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);
  const allowSettingsExitRef = useRef(false);
  const [pendingSettingsPhaseOffset, setPendingSettingsPhaseOffset] = useState<number | null>(null);

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

  // Title animations
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  // Card mount animations
  const cardAnimations = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

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

  // Check reduced motion preference
  useEffect(() => {
    let isMounted = true;

    const applyReducedMotionPreference = (enabled: boolean | null | undefined) => {
      if (!isMounted || typeof enabled !== 'boolean') return;
      if (reducedMotionRef.current === enabled) return;

      reducedMotionRef.current = enabled;
      setReducedMotion(enabled);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(applyReducedMotionPreference)
      .catch(() => {
        // Keep default false if accessibility query fails.
      });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      applyReducedMotionPreference
    );

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Mount animations
  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    subtitleOpacity.value = withTiming(1, { duration: 400 });

    // Stagger card entrance animations
    cardAnimations.forEach((anim, index) => {
      anim.value = withDelay(
        index * 100,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleOpacity, subtitleOpacity]);

  // Reset card state when screen comes back into focus (e.g., from StartDate screen)
  useFocusEffect(
    useCallback(() => {
      clearPendingTransition();
      // Force cards to remount with fresh animation state
      setCardRemountKey((prev) => prev + 1);

      // Reset to beginning of card stack
      setCurrentCardIndex(0);
      setShowInfoModal(false);
      setInfoModalContent(null);
      // Keep selectedPhase so user's previous selection is preserved

      // Re-trigger card entrance animations
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

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  // Convert preset pattern to pattern values (like StartDate screen does)
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
          basePattern = { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 4 };
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
      if (data.shiftSystem === ShiftSystem.THREE_SHIFT) {
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
        return {
          morningOn: daysOn,
          afternoonOn: daysOn,
          nightOn: nightsOn,
          daysOff: basePattern.daysOff,
        };
      }

      // Return 2-shift structure as-is
      return basePattern;
    },
    [data.customPattern, data.shiftSystem]
  );

  // Get current pattern (convert preset or use custom)
  const pattern = useMemo(() => {
    const patternType = data.patternType || ShiftPattern.CUSTOM;
    return getPatternValues(patternType);
  }, [data.patternType, getPatternValues]);

  // Generate phase cards based on shift system
  useEffect(() => {
    if (!data.shiftSystem) return;

    const shiftSystem = data.shiftSystem;

    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      // 2-Shift: Day, Night, Off
      const cards: PhaseCardData[] = [
        {
          id: 'day',
          phase: 'day' as Phase,
          title: String(t('phaseSelector.cards.day.title', { defaultValue: 'Day Shift' })),
          description: String(
            t('phaseSelector.cards.day.description', {
              defaultValue: 'Working during daylight (e.g., 6am-6pm)',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
          phaseLength: ('daysOn' in pattern ? pattern.daysOn : 0) ?? 0,
          gradientColors: ['rgba(33, 150, 243, 0.25)', 'rgba(33, 150, 243, 0.05)'] as [
            string,
            string,
          ],
        },
        {
          id: 'night',
          phase: 'night' as Phase,
          title: String(t('phaseSelector.cards.night.title', { defaultValue: 'Night Shift' })),
          description: String(
            t('phaseSelector.cards.night.description', {
              defaultValue: 'Working at nighttime (e.g., 6pm-6am)',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
          phaseLength: ('nightsOn' in pattern ? pattern.nightsOn : 0) ?? 0,
          gradientColors: ['rgba(101, 31, 255, 0.25)', 'rgba(101, 31, 255, 0.05)'] as [
            string,
            string,
          ],
        },
        {
          id: 'off',
          phase: 'off' as Phase,
          title: String(t('phaseSelector.cards.off.title', { defaultValue: 'Days Off' })),
          description: String(
            t('phaseSelector.cards.off.description', {
              defaultValue: 'Rest and recovery at home',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png'),
          phaseLength: pattern.daysOff,
          gradientColors: ['rgba(255, 152, 0, 0.25)', 'rgba(255, 152, 0, 0.05)'] as [
            string,
            string,
          ],
        },
      ].filter((card) => card.phaseLength > 0);

      setPhaseCards(cards);
    } else {
      // 3-Shift: Morning, Afternoon, Night, Off
      const cards: PhaseCardData[] = [
        {
          id: 'morning',
          phase: 'morning' as Phase,
          title: String(t('phaseSelector.cards.morning.title', { defaultValue: 'Morning Shift' })),
          description: String(
            t('phaseSelector.cards.morning.description', {
              defaultValue: 'Early morning hours (e.g., 4am-12pm)',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-day-shift-sun.png'),
          phaseLength: ('morningOn' in pattern ? pattern.morningOn : 0) ?? 0,
          gradientColors: ['rgba(252, 211, 77, 0.25)', 'rgba(252, 211, 77, 0.05)'] as [
            string,
            string,
          ],
        },
        {
          id: 'afternoon',
          phase: 'afternoon' as Phase,
          title: String(
            t('phaseSelector.cards.afternoon.title', { defaultValue: 'Afternoon Shift' })
          ),
          description: String(
            t('phaseSelector.cards.afternoon.description', {
              defaultValue: 'Afternoon hours (e.g., 12pm-8pm)',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/shift-time-afternoon.png'),
          phaseLength: ('afternoonOn' in pattern ? pattern.afternoonOn : 0) ?? 0,
          gradientColors: ['rgba(6, 182, 212, 0.25)', 'rgba(6, 182, 212, 0.05)'] as [
            string,
            string,
          ],
        },
        {
          id: 'night',
          phase: 'night' as Phase,
          title: String(t('phaseSelector.cards.night.title', { defaultValue: 'Night Shift' })),
          description: String(
            t('phaseSelector.cards.night.descriptionThreeShift', {
              defaultValue: 'Nighttime hours (e.g., 8pm-4am)',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-night-shift-moon.png'),
          phaseLength: ('nightOn' in pattern ? pattern.nightOn : 0) ?? 0,
          gradientColors: ['rgba(101, 31, 255, 0.25)', 'rgba(101, 31, 255, 0.05)'] as [
            string,
            string,
          ],
        },
        {
          id: 'off',
          phase: 'off' as Phase,
          title: String(t('phaseSelector.cards.off.title', { defaultValue: 'Days Off' })),
          description: String(
            t('phaseSelector.cards.off.description', {
              defaultValue: 'Rest and recovery at home',
            })
          ),
          icon: require('../../../../assets/onboarding/icons/consolidated/slider-days-off-rest.png'),
          phaseLength: pattern.daysOff,
          gradientColors: ['rgba(255, 152, 0, 0.25)', 'rgba(255, 152, 0, 0.05)'] as [
            string,
            string,
          ],
        },
      ].filter((card) => card.phaseLength > 0);

      setPhaseCards(cards);
    }
  }, [data.shiftSystem, pattern, t]);

  // Calculate and navigate helper
  const calculateAndNavigate = useCallback(
    (phase: Phase, dayWithinPhase: number) => {
      if (isTransitioningRef.current) {
        return;
      }
      if (!data.shiftSystem) return;

      const shiftSystem = data.shiftSystem as ShiftSystem;

      const phaseOffset = calculateEnhancedPhaseOffset(phase, dayWithinPhase, pattern, shiftSystem);
      if (isSettingsMode) {
        setPendingSettingsPhaseOffset(phaseOffset);
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
          source: 'PremiumPhaseSelectorScreen.calculateAndNavigate.settingsPending',
        });
        return;
      }
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      updateData({ phaseOffset });

      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumPhaseSelectorScreen.calculateAndNavigate',
      });

      interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
        navigationTimeoutRef.current = setTimeout(() => {
          navigationTimeoutRef.current = null;
          if (isSettingsMode) {
            returnToSettings();
            return;
          }
          goToNextScreen(navigation, 'PhaseSelector');
        }, 300);
      });
    },
    [data.shiftSystem, isSettingsMode, navigation, pattern, returnToSettings, updateData]
  );

  const handleSaveSettingsSelection = useCallback(() => {
    if (!isSettingsMode || pendingSettingsPhaseOffset === null) {
      return;
    }

    updateData({ phaseOffset: pendingSettingsPhaseOffset });
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumPhaseSelectorScreen.handleSaveSettingsSelection',
    });
    returnToSettings();
  }, [isSettingsMode, pendingSettingsPhaseOffset, returnToSettings, updateData]);

  // Handle swipe right (select)
  const handleSwipeRight = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    if (stage === SelectionStage.PHASE) {
      // Phase selection
      const selectedCard = phaseCards[currentCardIndex];
      if (!selectedCard) return;

      setSelectedPhase(selectedCard.phase);
      setSelectedPhaseTitle(selectedCard.title);

      if (selectedCard.phaseLength > 1) {
        // Multi-day phase: Generate day cards and transition to stage 2
        const cards: DayCardData[] = Array.from({ length: selectedCard.phaseLength }, (_, i) => ({
          id: `day-${i + 1}`,
          dayNumber: i + 1,
          title: String(
            t('phaseSelector.dayCardTitle', {
              day: i + 1,
              defaultValue: `Day ${i + 1}`,
            })
          ),
          description: generateDayCardDescription(
            i + 1,
            selectedCard.phaseLength,
            selectedCard.phase,
            t as OnboardingTranslate
          ),
        }));

        setDayCards(cards);
        setCurrentCardIndex(0);
        setStage(SelectionStage.DAY_WITHIN_PHASE);
      } else {
        // Single-day phase: Skip to calculation
        setSelectedDay(1);
        calculateAndNavigate(selectedCard.phase, 1);
      }
    } else if (stage === SelectionStage.DAY_WITHIN_PHASE) {
      // Day-within-phase selection
      const selectedCard = dayCards[currentCardIndex];
      if (!selectedCard || !selectedPhase) return;

      setSelectedDay(selectedCard.dayNumber);
      calculateAndNavigate(selectedPhase, selectedCard.dayNumber);
    }
  }, [stage, phaseCards, dayCards, currentCardIndex, selectedPhase, calculateAndNavigate, t]);

  // Handle swipe left (skip)
  const handleSwipeLeft = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    const totalCards = stage === SelectionStage.PHASE ? phaseCards.length : dayCards.length;

    setTimeout(() => {
      if (currentCardIndex < totalCards - 1) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        // Loop back to first card with fresh animations
        setCurrentCardIndex(0);
        setCardRemountKey((prev) => prev + 1);

        // Haptic feedback for loop-back
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
          source: 'PremiumPhaseSelectorScreen.handleSwipeLeft.loopback',
        });

        // Re-trigger card entrance animations
        cardAnimations.forEach((anim, index) => {
          anim.value = 0;
          anim.value = withDelay(
            index * 100,
            withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
          );
        });
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, phaseCards.length, dayCards.length, currentCardIndex]);

  // Handle swipe up (info)
  const handleSwipeUp = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    const activeCard =
      stage === SelectionStage.PHASE ? phaseCards[currentCardIndex] : dayCards[currentCardIndex];

    if (activeCard) {
      setInfoModalContent(activeCard);
      setShowInfoModal(true);
    }
  }, [stage, phaseCards, dayCards, currentCardIndex]);

  // Get current cards based on stage
  const currentCards = useMemo(() => {
    return stage === SelectionStage.PHASE ? phaseCards : dayCards;
  }, [stage, phaseCards, dayCards]);

  // Render card stack (max 4 visible cards)
  const visibleCards = useMemo(() => {
    return currentCards.slice(currentCardIndex, currentCardIndex + 4);
  }, [currentCards, currentCardIndex]);

  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.PHASE_SELECTOR}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      {/* Title */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        {stage === SelectionStage.PHASE
          ? t('phaseSelector.title', { defaultValue: 'What shift are you on right now?' })
          : t('phaseSelector.dayTitle', {
              selectedPhaseTitle,
              defaultValue: `Which day of ${selectedPhaseTitle} are you on?`,
            })}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
        {stage === SelectionStage.PHASE
          ? t('common.swipeHint')
          : t('phaseSelector.daySubtitle', {
              selectedPhaseTitle,
              dayList: generateDayOrdinalList(
                phaseCards.find((c) => c.phase === selectedPhase)?.phaseLength || 0,
                t as OnboardingTranslate
              ),
              defaultValue: `You said you're on ${selectedPhaseTitle}. Swipe to your current day—is it the ${generateDayOrdinalList(
                phaseCards.find((c) => c.phase === selectedPhase)?.phaseLength || 0,
                t as OnboardingTranslate
              )}?`,
            })}
      </Animated.Text>

      {/* Progress Dots */}
      <ProgressDots total={currentCards.length} current={currentCardIndex} />

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {[...visibleCards].reverse().map((card, index) => (
          <SwipeablePhaseCard
            key={`${card.id}-${cardRemountKey}`}
            card={card}
            index={visibleCards.length - 1 - index}
            totalCards={visibleCards.length}
            isActive={index === visibleCards.length - 1}
            interactionLocked={isTransitioning}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSwipeUp}
            mountProgress={cardAnimations[index]}
            reducedMotion={reducedMotion}
            stage={stage}
          />
        ))}
      </View>

      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>
            {t('phaseSelector.preparing', { defaultValue: 'Preparing your calendar...' })}
          </Text>
        </View>
      ) : null}

      {isSettingsMode ? (
        <View style={styles.settingsActions}>
          <View style={styles.settingsActionsRow}>
            <Pressable
              onPress={returnToSettings}
              style={styles.settingsBackButton}
              accessibilityRole="button"
              accessibilityLabel={t('phaseSelector.actions.backToSettingsA11y', {
                defaultValue: 'Back to settings',
              })}
              testID="phase-selector-back-settings-button"
            >
              <Ionicons name="arrow-back-outline" size={16} color={theme.colors.paper} />
              <Text style={styles.settingsBackButtonText}>
                {t('phaseSelector.actions.backToSettings', {
                  defaultValue: 'Back to Settings',
                })}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveSettingsSelection}
              style={[
                styles.settingsSaveButton,
                pendingSettingsPhaseOffset === null && styles.settingsSaveButtonDisabled,
              ]}
              disabled={pendingSettingsPhaseOffset === null}
              accessibilityRole="button"
              accessibilityLabel={t('phaseSelector.actions.saveAndReturnA11y', {
                defaultValue: 'Save selection and return to settings',
              })}
              testID="phase-selector-save-settings-button"
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={
                  pendingSettingsPhaseOffset === null ? theme.colors.shadow : theme.colors.deepVoid
                }
              />
              <Text
                style={[
                  styles.settingsSaveButtonText,
                  pendingSettingsPhaseOffset === null && styles.settingsSaveButtonTextDisabled,
                ]}
              >
                {t('phaseSelector.actions.saveAndReturn', {
                  defaultValue: 'Save & Return',
                })}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <PhaseInfoModal
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
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
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
    backgroundColor: theme.colors.opacity.gold20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    marginBottom: theme.spacing.lg,
  },
  badgeText: {
    fontSize: 18,
    color: theme.colors.sacredGold,
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
  },
  swipeHintBubble: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeHintGradient: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
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
