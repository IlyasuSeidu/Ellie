/**
 * PremiumShiftSystemScreen Component
 *
 * Tinder-style swipeable card interface for shift system selection (Step 3 of 11)
 * Features swipeable cards with spring physics, card stack visualization, and interactive animations
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
  Modal,
  Pressable,
  ScrollView,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { ShiftSystem } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

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
} as const;

// Shift system card data
interface SystemCardData {
  id: string;
  system: ShiftSystem;
  icon: string;
  title: string;
  schedule: string;
  description: string;
  detailedInfo: {
    workRestRatio: string;
    useCases: string[];
    pros: string[];
    cons: string[];
  };
}

const SHIFT_SYSTEMS: SystemCardData[] = [
  {
    id: '2-shift',
    system: ShiftSystem.TWO_SHIFT,
    icon: '☀️',
    title: '2 Shifts (12 hours)',
    schedule: 'Day & night',
    description: 'Your workplace runs two 12-hour shifts—one during the day, one at night',
    detailedInfo: {
      workRestRatio: '12 hours on, 12 hours off',
      useCases: ['Mining sites', 'Oil & gas', '24/7 operations', 'Remote work'],
      pros: ['Extended rest periods', 'Predictable schedule', 'Good work-life balance'],
      cons: ['Long shift duration', 'Can be physically demanding', 'Limited daylight in winter'],
    },
  },
  {
    id: '3-shift',
    system: ShiftSystem.THREE_SHIFT,
    icon: '🕐',
    title: '3 Shifts (8 hours)',
    schedule: 'Morning, afternoon & night',
    description: 'Your workplace runs three 8-hour shifts—morning, afternoon, and night',
    detailedInfo: {
      workRestRatio: '8 hours on, 16 hours off',
      useCases: ['Manufacturing', 'Healthcare', 'Call centers', '24/7 operations'],
      pros: ['Shorter shifts', 'More time for family', 'Easier to stay alert'],
      cons: [
        'More frequent shift changes',
        'Can disrupt sleep patterns',
        'Less rest between cycles',
      ],
    },
  },
];

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

// Swipeable Card Component
interface SwipeableCardProps {
  system: SystemCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  interactionLocked?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  mountProgress?: SharedValue<number>;
  testID?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  system,
  index,
  totalCards,
  isActive,
  interactionLocked = false,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  mountProgress,
  testID,
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
      source: 'PremiumShiftSystemScreen.card.swipeRight',
    });
  }, []);
  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftSystemScreen.card.swipeLeft',
    });
  }, []);
  const triggerMediumHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumShiftSystemScreen.card.swipeUpOrTap',
    });
  }, []);
  const reportWorkletError = useCallback((phase: 'update' | 'end', message: string) => {
    if (__DEV__) {
      console.error('[ShiftSystem] Swipe worklet error', { phase, message });
    }
  }, []);

  // Idle floating animation
  useEffect(() => {
    if (isActive) {
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
  }, [isActive, translateY, scale, iconScale]);

  // Hint pulse and auto-fade animation with repeat cycle
  useEffect(() => {
    if (isActive && index === 0) {
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
  }, [isActive, index, hintOpacity, hintScale]);

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
      scale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
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
    transform: [{ scale: isActive ? iconScale.value : 1 }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
    transform: [{ scale: hintScale.value }],
  }));

  const titleText = String(
    t(`shiftSystem.cards.${system.id}.title`, { defaultValue: system.title })
  );
  const scheduleText = String(
    t(`shiftSystem.cards.${system.id}.schedule`, { defaultValue: system.schedule })
  );
  const descriptionText = String(
    t(`shiftSystem.cards.${system.id}.description`, { defaultValue: system.description })
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.card, getShadowStyle(index, isActive), animatedStyle]}
        testID={testID}
      >
        {/* Icon */}
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          <Text style={styles.icon}>{system.icon}</Text>
        </Animated.View>

        {/* System Name */}
        <Text style={styles.cardTitle}>{titleText}</Text>

        {/* Schedule Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{scheduleText}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{descriptionText}</Text>

        {/* Swipe Hints (only for first card) */}
        {index === 0 && isActive && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>{t('common.hints.nextOption')}</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintRight, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>{t('common.hints.selectThis')}</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintUp, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>{t('common.hints.learnMore')}</Text>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

// Memoized version for performance
const SwipeableCardMemoized = React.memo(SwipeableCard, (prevProps, nextProps) => {
  return (
    prevProps.system.id === nextProps.system.id &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.totalCards === nextProps.totalCards &&
    prevProps.interactionLocked === nextProps.interactionLocked
  );
});

// Learn More Modal Component
interface LearnMoreModalProps {
  visible: boolean;
  system: SystemCardData | null;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ visible, system, onClose }) => {
  const { t } = useTranslation('onboarding');
  if (!system) return null;

  const titleText = String(
    t(`shiftSystem.cards.${system.id}.title`, { defaultValue: system.title })
  );
  const scheduleText = String(
    t(`shiftSystem.cards.${system.id}.schedule`, { defaultValue: system.schedule })
  );
  const workRestRatioText = String(
    t(`shiftSystem.cards.${system.id}.details.workRestRatio`, {
      defaultValue: system.detailedInfo.workRestRatio,
    })
  );

  const useCases = system.detailedInfo.useCases.map((useCase, index) =>
    String(
      t(`shiftSystem.cards.${system.id}.details.useCases.${index}`, {
        defaultValue: useCase,
      })
    )
  );
  const pros = system.detailedInfo.pros.map((pro, index) =>
    String(
      t(`shiftSystem.cards.${system.id}.details.pros.${index}`, {
        defaultValue: pro,
      })
    )
  );
  const cons = system.detailedInfo.cons.map((con, index) =>
    String(
      t(`shiftSystem.cards.${system.id}.details.cons.${index}`, {
        defaultValue: con,
      })
    )
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{titleText}</Text>
          <Text style={styles.modalSchedule}>{scheduleText}</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('common.learnMore.howItWorks')}</Text>
              <Text style={styles.modalSectionText}>{workRestRatioText}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('common.learnMore.whereUsed')}</Text>
              {useCases.map((useCase, i) => (
                <Text key={i} style={styles.modalListItem}>
                  • {useCase}
                </Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('common.learnMore.pros')}</Text>
              {pros.map((pro, i) => (
                <Text key={i} style={styles.modalListItem}>
                  ✓ {pro}
                </Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('common.learnMore.cons')}</Text>
              {cons.map((con, i) => (
                <Text key={i} style={styles.modalListItem}>
                  • {con}
                </Text>
              ))}
            </View>
          </ScrollView>

          <PremiumButton
            title={t('common.closeButton')}
            onPress={onClose}
            variant="outline"
            testID="modal-close-button"
          />
        </View>
      </Pressable>
    </Modal>
  );
};

// Progress Dots Component
interface ProgressDotsProps {
  total: number;
  current: number;
  testID?: string;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  testID = 'progress-dots',
}) => {
  return (
    <View style={styles.progressDots} testID={testID}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.dot, index === current && styles.dotActive]}
          testID={`${testID.replace('progress-dots', `${['2-shift', '3-shift'][index]}-dot`)}-${index}`}
        />
      ))}
    </View>
  );
};

// End Stack Screen Component
interface EndStackScreenProps {
  visible: boolean;
  systemsViewed: number;
  hasSelection: boolean;
  onReviewAgain: () => void;
  onContinue: () => void;
}

const EndStackScreen: React.FC<EndStackScreenProps> = ({
  visible,
  systemsViewed,
  hasSelection,
  onReviewAgain,
  onContinue,
}) => {
  const { t } = useTranslation('onboarding');
  const scaleValue = useSharedValue(0.8);
  const opacityValue = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scaleValue.value = withSpring(1, { damping: 15, stiffness: 200 });
      opacityValue.value = withTiming(1, { duration: 300 });
    }
  }, [visible, scaleValue, opacityValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.endScreenOverlay}>
      <Animated.View style={[styles.endScreenContent, animatedStyle]}>
        <Text style={styles.endScreenIcon}>{hasSelection ? '✅' : '👀'}</Text>
        <Text style={styles.endScreenTitle}>
          {hasSelection
            ? t('shiftSystem.endState.selectedTitle')
            : t('shiftSystem.endState.reviewedTitle', { count: systemsViewed })}
        </Text>
        <Text style={styles.endScreenSubtitle}>
          {hasSelection ? t('shiftSystem.endState.selectedSubtitle') : t('shiftSystem.reviewAgain')}
        </Text>

        <View style={styles.endScreenButtons}>
          <PremiumButton
            title={t('shiftSystem.reviewButton')}
            onPress={onReviewAgain}
            variant={hasSelection ? 'outline' : 'primary'}
            testID="review-again-button"
          />
          {hasSelection && (
            <PremiumButton
              title={t('common.continueButton')}
              onPress={onContinue}
              variant="primary"
              testID="continue-button"
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
};

// Main Screen Component
export interface PremiumShiftSystemScreenProps {
  testID?: string;
}

export const PremiumShiftSystemScreen: React.FC<PremiumShiftSystemScreenProps> = ({
  testID = 'premium-shift-system-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMoreSystem, setLearnMoreSystem] = useState<SystemCardData | null>(null);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState<ShiftSystem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);
  const swipeLeftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);

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

  const clearPendingTransitions = useCallback(() => {
    if (swipeLeftTimeoutRef.current) {
      clearTimeout(swipeLeftTimeoutRef.current);
      swipeLeftTimeoutRef.current = null;
    }
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    if (interactionHandleRef.current?.cancel) {
      interactionHandleRef.current.cancel();
    }
    interactionHandleRef.current = null;
    isTransitioningRef.current = false;
    setIsTransitioning(false);
  }, []);

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
      clearPendingTransitions();
      // Force cards to remount with fresh animation state
      setCardRemountKey((prev) => prev + 1);

      // Reset to beginning of card stack
      setCurrentIndex(0);
      setShowEndScreen(false);
      setShowLearnMore(false);
      setLearnMoreSystem(null);
      // Keep selectedSystem so user's previous selection is preserved

      // Re-trigger card entrance animations
      cardAnimations.forEach((anim, index) => {
        anim.value = 0;
        anim.value = withDelay(
          index * 100,
          withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
        );
      });
      return () => {
        clearPendingTransitions();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearPendingTransitions])
  );

  useEffect(() => {
    return () => {
      clearPendingTransitions();
    };
  }, [clearPendingTransitions]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const handleSwipeRight = useCallback(() => {
    if (isTransitioningRef.current) return;
    const system = SHIFT_SYSTEMS[currentIndex];
    if (!system) return;
    setSelectedSystem(system.system);

    // Save selection — auto-set rosterType for 3-shift (FIFO not supported)
    const updates: { shiftSystem: ShiftSystem; rosterType?: 'rotating' } = {
      shiftSystem: system.system,
    };
    if (system.system === ShiftSystem.THREE_SHIFT) {
      updates.rosterType = 'rotating';
    }
    updateData(updates);
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    // Navigate after animation completes
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
          source: 'PremiumShiftSystemScreen.handleSwipeRight.navigate',
        });

        // Navigate — skips RosterType for 3-shift, goes to RosterType for 2-shift
        goToNextScreen(navigation, 'ShiftSystem', { ...data, ...updates });
      }, 300);
    });
  }, [currentIndex, updateData, navigation, data]);

  const handleSwipeLeft = useCallback(() => {
    if (isTransitioningRef.current) return;
    // Delay state update to allow swipe animation to complete
    if (swipeLeftTimeoutRef.current) {
      clearTimeout(swipeLeftTimeoutRef.current);
    }
    swipeLeftTimeoutRef.current = setTimeout(() => {
      swipeLeftTimeoutRef.current = null;
      if (currentIndex < SHIFT_SYSTEMS.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setShowEndScreen(true);
      }
    }, 300);
  }, [currentIndex]);

  const handleSwipeUp = useCallback(() => {
    if (isTransitioningRef.current) return;
    const system = SHIFT_SYSTEMS[currentIndex];
    if (!system) return;
    setLearnMoreSystem(system);
    setShowLearnMore(true);
  }, [currentIndex]);

  const handleLearnMoreClose = useCallback(() => {
    setShowLearnMore(false);
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftSystemScreen.learnMore.close',
    });
  }, []);

  const handleReviewAgain = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumShiftSystemScreen.reviewAgain',
    });
    setShowEndScreen(false);
    setCurrentIndex(0);
    setSelectedSystem(null);
    setCardRemountKey((prev) => prev + 1);
  }, []);

  const handleContinue = useCallback(() => {
    // Only continue if user made a selection
    if (!selectedSystem || isTransitioningRef.current) return;

    // Save selection — auto-set rosterType for 3-shift (FIFO not supported)
    const updates: { shiftSystem: ShiftSystem; rosterType?: 'rotating' } = {
      shiftSystem: selectedSystem,
    };
    if (selectedSystem === ShiftSystem.THREE_SHIFT) {
      updates.rosterType = 'rotating';
    }
    updateData(updates);
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumShiftSystemScreen.handleContinue',
    });

    // Navigate — skips RosterType for 3-shift, goes to RosterType for 2-shift
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        goToNextScreen(navigation, 'ShiftSystem', { ...data, ...updates });
      }, 300);
    });
  }, [selectedSystem, updateData, navigation, data]);

  // Slice visible cards to show only 4 at a time (matches pattern screen approach)
  const visibleCards = useMemo(
    () => SHIFT_SYSTEMS.slice(currentIndex, currentIndex + 4),
    [currentIndex]
  );

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.SHIFT_SYSTEM}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        testID="progress-header"
      />

      {/* Title */}
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        {t('shiftSystem.title')}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
        {t('shiftSystem.instruction')}
      </Animated.Text>

      {/* Progress Dots */}
      <ProgressDots total={SHIFT_SYSTEMS.length} current={currentIndex} />

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {[...visibleCards].reverse().map((system, index) => (
          <SwipeableCardMemoized
            key={`${system.id}-${cardRemountKey}`}
            system={system}
            index={visibleCards.length - 1 - index}
            totalCards={visibleCards.length}
            isActive={index === visibleCards.length - 1}
            interactionLocked={isTransitioning}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSwipeUp}
            mountProgress={cardAnimations[index]}
            testID={`shift-system-card-${system.id}`}
          />
        ))}
      </View>

      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>
            {t('rosterType.preparingNextStep', { defaultValue: 'Preparing next step...' })}
          </Text>
        </View>
      ) : null}

      {/* Learn More Modal */}
      <LearnMoreModal
        visible={showLearnMore}
        system={learnMoreSystem}
        onClose={handleLearnMoreClose}
      />

      {/* End Stack Screen */}
      <EndStackScreen
        visible={showEndScreen}
        systemsViewed={SHIFT_SYSTEMS.length}
        hasSelection={!!selectedSystem}
        onReviewAgain={handleReviewAgain}
        onContinue={handleContinue}
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
    textAlign: 'center',
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
    textAlign: 'center',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.opacity.black60,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.opacity.gold30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalSchedule: {
    fontSize: 18,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    fontWeight: '600',
  },
  modalScroll: {
    marginBottom: theme.spacing.lg,
  },
  modalSection: {
    marginBottom: theme.spacing.lg,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.paper,
    marginBottom: theme.spacing.sm,
  },
  modalSectionText: {
    fontSize: 16,
    color: theme.colors.dust,
    lineHeight: 24,
  },
  modalListItem: {
    fontSize: 15,
    color: theme.colors.dust,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  endScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.opacity.void95,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  endScreenContent: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 24,
    padding: theme.spacing.xxl,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold30,
  },
  endScreenIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  endScreenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  endScreenSubtitle: {
    fontSize: 16,
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  endScreenButtons: {
    width: '100%',
    gap: theme.spacing.md,
  },
});

export default PremiumShiftSystemScreen;
