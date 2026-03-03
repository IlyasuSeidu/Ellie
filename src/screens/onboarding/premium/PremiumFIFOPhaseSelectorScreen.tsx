/**
 * PremiumFIFOPhaseSelectorScreen Component
 *
 * Two-stage FIFO phase selector with swipe parity to PremiumPhaseSelectorScreen.
 * Stage 1: Select block type (work/rest)
 * Stage 2: Select day within selected block
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { ShiftPattern } from '@/types';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

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
  BLOCK = 'block',
  DAY_WITHIN_BLOCK = 'dayWithinBlock',
}

interface BlockCardData {
  type: 'block';
  id: 'work' | 'rest';
  title: string;
  description: string;
  icon: string;
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

type FIFOCardData = BlockCardData | DayCardData;

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

const generateDayDescription = (
  blockType: 'work' | 'rest',
  dayNumber: number,
  totalDays: number
): string => {
  if (dayNumber === 1) {
    return blockType === 'work' ? 'First day back at site' : 'First day back at home';
  }
  if (dayNumber === totalDays) {
    return blockType === 'work'
      ? 'Last day before flying home'
      : 'Last day before returning to site';
  }
  if (dayNumber === Math.ceil(totalDays / 2)) {
    return 'Midpoint of this block';
  }
  return `Day ${dayNumber} of your ${blockType === 'work' ? 'work' : 'rest'} block`;
};

interface SwipeableFIFOCardProps {
  card: FIFOCardData;
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

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, animatedStyle, getShadowStyle(index, isActive)]}>
        {isBlockCard && (
          <LinearGradient
            colors={card.gradientColors}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        )}

        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          {isBlockCard ? (
            <Text style={styles.icon}>{card.icon}</Text>
          ) : (
            <Text style={styles.icon}>{card.dayNumber}</Text>
          )}
        </Animated.View>

        <Text style={styles.cardTitle}>{card.title}</Text>

        {isBlockCard && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {card.blockLength} {card.blockLength === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        <Text style={styles.description}>{card.description}</Text>

        {index === 0 && isActive && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>← Next</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintRight, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>Select →</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintUp, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>↑ Info</Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

interface FIFOInfoModalProps {
  visible: boolean;
  content: FIFOCardData | null;
  onClose: () => void;
}

const FIFOInfoModal: React.FC<FIFOInfoModalProps> = ({ visible, content, onClose }) => {
  if (!content) return null;

  const isBlockCard = content.type === 'block';

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
          <Text style={styles.modalIcon}>{isBlockCard ? content.icon : content.dayNumber}</Text>
          <Text style={styles.modalTitle}>{content.title}</Text>
          <Text style={styles.modalDescription}>{content.description}</Text>

          {isBlockCard && (
            <>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Block Length</Text>
                <Text style={styles.modalSectionText}>
                  {content.blockLength} {content.blockLength === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Why it matters</Text>
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
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();

  const [stage, setStage] = useState<SelectionStage>(SelectionStage.BLOCK);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedBlockType, setSelectedBlockType] = useState<'work' | 'rest' | null>(null);
  const [selectedBlockTitle, setSelectedBlockTitle] = useState('');
  const [dayCards, setDayCards] = useState<DayCardData[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<FIFOCardData | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);

  const cardAnimations = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  const { workBlockDays, restBlockDays } = useMemo(() => {
    if (data.fifoConfig) {
      return {
        workBlockDays: normalizePositiveInt(data.fifoConfig.workBlockDays, 14),
        restBlockDays: normalizePositiveInt(data.fifoConfig.restBlockDays, 14),
      };
    }
    return getBlockLengthsFromPattern(data.patternType as ShiftPattern | undefined);
  }, [data.fifoConfig, data.patternType]);

  const blockCards = useMemo<BlockCardData[]>(
    () => [
      {
        type: 'block',
        id: 'work',
        title: 'At Site (Working)',
        description: 'You are currently at the mine site on your work block',
        icon: '⛏️',
        blockLength: workBlockDays,
        gradientColors: [theme.colors.shiftVisualization.dayShift, '#1976D2'],
        quickInfo: 'This means your cycle starts counting from your current work day.',
      },
      {
        type: 'block',
        id: 'rest',
        title: 'At Home (Rest)',
        description: 'You are currently at home on your rest block',
        icon: '🏠',
        blockLength: restBlockDays,
        gradientColors: [theme.colors.shiftVisualization.daysOff, '#57534e'],
        quickInfo: 'This offsets your cycle by your work block length first.',
      },
    ],
    [restBlockDays, workBlockDays]
  );

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
      setStage(SelectionStage.BLOCK);
      setCurrentCardIndex(0);
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

  const currentCards = useMemo<FIFOCardData[]>(
    () => (stage === SelectionStage.BLOCK ? blockCards : dayCards),
    [blockCards, dayCards, stage]
  );

  const visibleCards = useMemo(() => {
    return currentCards.slice(currentCardIndex, currentCardIndex + 4);
  }, [currentCards, currentCardIndex]);
  const stackedCards = useMemo(() => [...visibleCards].reverse(), [visibleCards]);

  const stageDayCount = selectedBlockType === 'work' ? workBlockDays : restBlockDays;

  useEffect(() => {
    if (currentCardIndex >= currentCards.length && currentCards.length > 0) {
      setCurrentCardIndex(0);
    }
  }, [currentCardIndex, currentCards.length]);

  const calculateAndNavigate = useCallback(
    (blockType: 'work' | 'rest', dayWithinBlock: number) => {
      if (isTransitioningRef.current) {
        if (__DEV__) {
          console.info('[FIFOPhaseSelector] Selection ignored while transition lock is active');
        }
        return;
      }

      const safeDayWithinBlock = normalizePositiveInt(dayWithinBlock, 1);
      const cycleLength = Math.max(1, workBlockDays + restBlockDays);
      const rawOffset =
        blockType === 'work' ? safeDayWithinBlock - 1 : workBlockDays + (safeDayWithinBlock - 1);
      const phaseOffset = Math.max(0, Math.min(cycleLength - 1, rawOffset));
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      updateData({ phaseOffset });
      if (__DEV__) {
        console.info('[FIFOPhaseSelector] Day selected', {
          blockType,
          dayWithinBlock: safeDayWithinBlock,
        });
        console.info('[FIFOPhaseSelector] Computed phaseOffset', { phaseOffset, cycleLength });
      }
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumFIFOPhaseSelectorScreen.handleDaySelect',
      });
      if (__DEV__) {
        console.info('[FIFOPhaseSelector] Navigation scheduled');
      }
      interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
        navigationTimeoutRef.current = setTimeout(() => {
          navigationTimeoutRef.current = null;
          if (__DEV__) {
            console.info('[FIFOPhaseSelector] Navigation executing');
          }
          goToNextScreen(navigation, 'FIFOPhaseSelector');
        }, 300);
      });
    },
    [navigation, restBlockDays, updateData, workBlockDays]
  );

  const handleSwipeRight = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    const active = currentCards[currentCardIndex];
    if (!active) return;

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
      const generatedDays: DayCardData[] = Array.from({ length: totalDays }, (_, idx) => ({
        type: 'day',
        id: `${active.id}-day-${idx + 1}`,
        dayNumber: idx + 1,
        title: `Day ${idx + 1}`,
        description: generateDayDescription(active.id, idx + 1, totalDays),
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
  }, [calculateAndNavigate, currentCardIndex, currentCards, restBlockDays, stage, workBlockDays]);

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

  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.PHASE_SELECTOR}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        testID="fifo-phase-selector-progress-header"
      />

      <Text style={styles.title}>
        {stage === SelectionStage.BLOCK
          ? 'Where are you in your FIFO cycle?'
          : `Which day of ${selectedBlockTitle} are you on?`}
      </Text>

      <Text style={styles.subtitle}>
        {stage === SelectionStage.BLOCK
          ? 'Swipe right to select, left to see next, or up for more info'
          : `Swipe right to select, left to see next, or up for more info. Is it the ${generateOrdinalList(
              stageDayCount
            )}?`}
      </Text>

      <>
        <ProgressDots total={currentCards.length} current={currentCardIndex} />

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
      </>
      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>Preparing your calendar...</Text>
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
    color: theme.colors.dust,
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
