/**
 * PremiumRosterTypeScreen Component
 *
 * Tinder-style swipeable card interface for roster type selection (Step 3.5 of 11)
 * Features swipeable cards with spring physics, idle animations, smart hint cycling,
 * velocity-based gesture detection, and accessibility support.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Image,
  ImageSourcePropType,
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
import { RosterType } from '@/types';
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

// Roster type card data
interface RosterTypeCardData {
  id: string;
  type: RosterType;
  icon: string;
  iconImage?: ImageSourcePropType;
  title: string;
  subtitle: string;
  description: string;
  detailedInfo: {
    howItWorks: string;
    examples: string[];
    regions: string[];
    pros: string[];
    cons: string[];
  };
}

const ROSTER_TYPES: RosterTypeCardData[] = [
  {
    id: 'rotating',
    type: RosterType.ROTATING,
    icon: '🔄',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/roster-type-rotating.png'),
    title: 'Rotating Roster',
    subtitle: 'Days → Nights → Off pattern',
    description: 'You rotate through different shift times in a repeating cycle',
    detailedInfo: {
      howItWorks:
        'Workers rotate through different shift times (day shifts, night shifts, days off) in a continuous cycle',
      examples: [
        '5-5-5 (South Africa)',
        '4-4-4 (common globally)',
        '7-7-7 (long cycle)',
        '2-2-3 (short cycle)',
      ],
      regions: ['South Africa', 'Zambia', 'DRC', 'Europe', 'Some US operations'],
      pros: [
        'Go home daily or frequently',
        'Regular routine at each phase',
        'Suitable for local operations',
        'Easier for family planning',
      ],
      cons: [
        'Night shifts can disrupt sleep',
        'Constant rotation through times',
        'Less extended home time',
      ],
    },
  },
  {
    id: 'fifo',
    type: RosterType.FIFO,
    icon: '✈️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/roster-type-fifo.png'),
    title: 'FIFO / Swing Roster',
    subtitle: 'Work blocks → Home blocks',
    description: 'You work consecutive days on-site, then get extended time at home',
    detailedInfo: {
      howItWorks:
        'Workers fly in to remote sites, work consecutive days (work block), then fly home for extended rest (rest block)',
      examples: [
        '8/6 (common WA)',
        '14/14 (even-time)',
        '21/7 (remote sites)',
        '28/14 (long cycle)',
      ],
      regions: ['Australia', 'Canada', 'Remote global mining'],
      pros: [
        'Extended time at home',
        'Higher pay rates',
        'Good for remote sites',
        'Predictable blocks',
      ],
      cons: [
        'Away from family for extended periods',
        'Travel fatigue',
        'Isolation at camp',
        'Adjustment between blocks',
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

// Swipeable Card Component (extracted outside main component for per-card shared values)
interface SwipeableCardProps {
  rosterType: RosterTypeCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  smoothPreview?: boolean;
  interactionLocked?: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  reducedMotion: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  rosterType,
  index,
  totalCards,
  isActive,
  smoothPreview = false,
  interactionLocked = false,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  reducedMotion,
}) => {
  const { t } = useTranslation('onboarding');
  // Per-card shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95 - index * 0.05);
  const opacity = useSharedValue(isActive ? 1 : 0.9 - index * 0.05);
  const iconScale = useSharedValue(1);
  const hintOpacity = useSharedValue(1);
  const hintScale = useSharedValue(1);
  const triggerSuccessHaptic = useCallback(() => {
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumRosterTypeScreen.card.swipeRight',
    });
  }, []);
  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumRosterTypeScreen.card.swipeLeft',
    });
  }, []);
  const triggerMediumHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumRosterTypeScreen.card.swipeUpOrTap',
    });
  }, []);
  const reportWorkletError = useCallback((phase: 'update' | 'end', message: string) => {
    if (__DEV__) {
      console.error('[RosterType] Swipe worklet error', { phase, message });
    }
  }, []);

  // Cards in this screen can become active again (loop-back behavior).
  // Normalize transform state on role changes so stale swipe offsets do not persist.
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
    opacity.value = smoothPreview ? 1 : 0.9 - index * 0.05;
    scale.value = smoothPreview ? 1 : 0.95 - index * 0.05;
  }, [isActive, index, smoothPreview, opacity, scale, translateX, translateY]);

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

  // Smart hint cycling: visible 3s → fade out 0.5s → hidden 7s → fade in 0.5s
  useEffect(() => {
    if (isActive && index === 0 && !reducedMotion) {
      // Pulse scale animation
      hintScale.value = withRepeat(
        withSequence(withTiming(1.0, { duration: 600 }), withTiming(1.15, { duration: 600 })),
        -1,
        true
      );

      // Smart opacity cycle
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

  // Pan gesture with velocity-based detection
  const panGesture = Gesture.Pan()
    .enabled(isActive && !interactionLocked)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onUpdate((event: any) => {
      try {
        translateX.value = event.translationX;
        translateY.value = event.translationY;

        // Dynamic scale based on Euclidean distance
        const distance = Math.sqrt(event.translationX ** 2 + event.translationY ** 2);
        scale.value = interpolate(distance, [0, SWIPE_THRESHOLD], [1.0, 1.08], Extrapolate.CLAMP);

        // Opacity reduction as user swipes horizontally
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
        const velocityX = event.velocityX ?? 0;
        const velocityY = event.velocityY ?? 0;

        // Dynamic threshold for quick flicks
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
          // Snap back smoothly then open modal (no fly-off-screen)
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

  // Tap gesture for bounce feedback
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

  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => {
    // Enhanced 5-point rotation interpolation
    const rotate = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD * 1.5, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SWIPE_THRESHOLD * 1.5],
      [-ROTATION_ANGLE * 1.3, -ROTATION_ANGLE, 0, ROTATION_ANGLE, ROTATION_ANGLE * 1.3],
      Extrapolate.CLAMP
    );

    const isSmoothPreview = smoothPreview && !isActive;
    const stackOffset = isSmoothPreview ? 0 : index * 8;
    const stackScale = isSmoothPreview ? 1 : 0.95 - index * 0.05;

    // Parallax effect for background cards
    const parallaxFactor = isActive ? 0 : (1 - index * 0.3) * 0.2;
    const parallaxX = translateX.value * parallaxFactor;
    const parallaxY = translateY.value * parallaxFactor;

    return {
      transform: [
        { translateX: isActive ? translateX.value : parallaxX },
        { translateY: isActive ? translateY.value : stackOffset + parallaxY },
        { rotate: isActive ? `${rotate}deg` : '0deg' },
        { scale: isActive ? scale.value : stackScale },
      ],
      opacity: isActive ? opacity.value : isSmoothPreview ? 1 : 0.9 - index * 0.05,
      zIndex: isActive ? totalCards + 1 : totalCards - index,
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
    t(`rosterType.cards.${rosterType.id}.title`, {
      defaultValue: rosterType.title,
    })
  );
  const subtitleText = String(
    t(`rosterType.cards.${rosterType.id}.subtitle`, {
      defaultValue: rosterType.subtitle,
    })
  );
  const descriptionText = String(
    t(`rosterType.cards.${rosterType.id}.description`, {
      defaultValue: rosterType.description,
    })
  );

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.card, getShadowStyle(index, isActive), animatedCardStyle]}
        testID={`roster-type-card-${rosterType.id}`}
      >
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          {rosterType.iconImage ? (
            <Image
              source={rosterType.iconImage}
              style={styles.cardIconImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.cardIcon}>{rosterType.icon}</Text>
          )}
        </Animated.View>

        <Text style={styles.cardTitle}>{titleText}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{subtitleText}</Text>
        </View>

        <Text style={styles.description}>{descriptionText}</Text>

        {/* Swipe Hints (only for first active card, with smart cycling) */}
        {index === 0 && isActive && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintRight, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>{t('common.hints.selectThis')}</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>{t('common.hints.nextOption')}</Text>
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
    prevProps.rosterType.id === nextProps.rosterType.id &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.totalCards === nextProps.totalCards &&
    prevProps.smoothPreview === nextProps.smoothPreview &&
    prevProps.interactionLocked === nextProps.interactionLocked &&
    prevProps.reducedMotion === nextProps.reducedMotion
  );
});

// Learn More Modal Component
interface LearnMoreModalProps {
  visible: boolean;
  rosterType: RosterTypeCardData | null;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ visible, rosterType, onClose }) => {
  const { t } = useTranslation('onboarding');
  if (!rosterType) return null;

  const titleText = String(
    t(`rosterType.cards.${rosterType.id}.title`, {
      defaultValue: rosterType.title,
    })
  );
  const subtitleText = String(
    t(`rosterType.cards.${rosterType.id}.subtitle`, {
      defaultValue: rosterType.subtitle,
    })
  );
  const howItWorks = String(
    t(`rosterType.cards.${rosterType.id}.details.howItWorks`, {
      defaultValue: rosterType.detailedInfo.howItWorks,
    })
  );
  const examples = rosterType.detailedInfo.examples.map((example, index) =>
    String(
      t(`rosterType.cards.${rosterType.id}.details.examples.${index}`, {
        defaultValue: example,
      })
    )
  );
  const regions = rosterType.detailedInfo.regions.map((region, index) =>
    String(
      t(`rosterType.cards.${rosterType.id}.details.regions.${index}`, {
        defaultValue: region,
      })
    )
  );
  const pros = rosterType.detailedInfo.pros.map((pro, index) =>
    String(
      t(`rosterType.cards.${rosterType.id}.details.pros.${index}`, {
        defaultValue: pro,
      })
    )
  );
  const cons = rosterType.detailedInfo.cons.map((con, index) =>
    String(
      t(`rosterType.cards.${rosterType.id}.details.cons.${index}`, {
        defaultValue: con,
      })
    )
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalBackdropDismissArea} onPress={onClose} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{titleText}</Text>
          <Text style={styles.modalSubtitle}>{subtitleText}</Text>

          <View style={styles.modalScrollContainer}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('common.learnMore.howItWorks')}</Text>
                <Text style={styles.modalSectionText}>{howItWorks}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('rosterType.learnMore.examples')}</Text>
                {examples.map((example, i) => (
                  <Text key={i} style={styles.modalListItem}>
                    • {example}
                  </Text>
                ))}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('rosterType.learnMore.popularIn')}</Text>
                {regions.map((region, i) => (
                  <Text key={i} style={styles.modalListItem}>
                    📍 {region}
                  </Text>
                ))}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('rosterType.learnMore.benefits')}</Text>
                {pros.map((pro, i) => (
                  <Text key={i} style={styles.modalListItem}>
                    ✓ {pro}
                  </Text>
                ))}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {t('rosterType.learnMore.considerations')}
                </Text>
                {cons.map((con, i) => (
                  <Text key={i} style={styles.modalListItem}>
                    • {con}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>

          <PremiumButton
            title={t('common.closeButton')}
            onPress={onClose}
            variant="outline"
            testID="modal-close-button"
          />
        </View>
      </View>
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
        <View key={index} style={[styles.dot, index === current && styles.dotActive]} />
      ))}
    </View>
  );
};

// Main Screen Component
export const PremiumRosterTypeScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMoreRosterType, setLearnMoreRosterType] = useState<RosterTypeCardData | null>(null);
  const [cardRemountKey, setCardRemountKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  // Reduced motion accessibility
  const [reducedMotion, setReducedMotion] = useState(false);
  const reducedMotionRef = useRef(false);
  const swipeLeftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactionHandleRef = useRef<{ cancel?: () => void } | null>(null);

  const clearPendingTimeouts = useCallback(() => {
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

  useEffect(() => {
    return () => {
      clearPendingTimeouts();
    };
  }, [clearPendingTimeouts]);

  // Title animations
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    subtitleOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
  }, [titleOpacity, subtitleOpacity]);

  // Reset full stack state on screen focus (e.g., navigating back from next screen)
  useFocusEffect(
    useCallback(() => {
      clearPendingTimeouts();
      setCurrentIndex(0);
      setShowLearnMore(false);
      setLearnMoreRosterType(null);
      setCardRemountKey((prev) => prev + 1);
      return () => {
        clearPendingTimeouts();
      };
    }, [clearPendingTimeouts])
  );

  // Handle roster type selection
  const handleSelectRosterType = useCallback(
    (rosterType: RosterType) => {
      if (isTransitioningRef.current) return;
      clearPendingTimeouts();
      const rosterTypeValue = rosterType === RosterType.ROTATING ? 'rotating' : 'fifo';
      updateData({ rosterType: rosterTypeValue });
      isTransitioningRef.current = true;
      setIsTransitioning(true);

      interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
        navigationTimeoutRef.current = setTimeout(() => {
          navigationTimeoutRef.current = null;
          goToNextScreen(navigation, 'RosterType', { ...data, rosterType: rosterTypeValue });
        }, 300);
      });
    },
    [clearPendingTimeouts, navigation, data, updateData]
  );

  const handleSwipeRight = useCallback(() => {
    if (currentIndex >= ROSTER_TYPES.length) return;
    const selectedCard = ROSTER_TYPES[currentIndex];
    handleSelectRosterType(selectedCard.type);
  }, [currentIndex, handleSelectRosterType]);

  const handleSwipeLeft = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentIndex >= ROSTER_TYPES.length) return;
    if (swipeLeftTimeoutRef.current) {
      clearTimeout(swipeLeftTimeoutRef.current);
    }
    swipeLeftTimeoutRef.current = setTimeout(() => {
      swipeLeftTimeoutRef.current = null;
      setCurrentIndex((prev) => {
        const lastIndex = ROSTER_TYPES.length - 1;
        if (lastIndex <= 0) return 0;

        // Keep swipe flow alive: when user swipes left on the last card,
        // move back to the previous card instead of showing an empty state.
        if (prev >= lastIndex) {
          return Math.max(0, prev - 1);
        }

        return prev + 1;
      });
    }, 300);
  }, [currentIndex]);

  const handleSwipeUp = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentIndex >= ROSTER_TYPES.length) return;
    const selectedCard = ROSTER_TYPES[currentIndex];
    setLearnMoreRosterType(selectedCard);
    setShowLearnMore(true);
  }, [currentIndex]);

  const handleModalClose = useCallback(() => {
    setShowLearnMore(false);
    setLearnMoreRosterType(null);
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumRosterTypeScreen.learnMore.close',
    });
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  // Visible cards computed from currentIndex (non-destructive slice).
  // At the last card, also keep the previous card rendered underneath for a smooth swipe-left transition.
  const visibleCards = useMemo(() => {
    const totalCards = ROSTER_TYPES.length;
    if (totalCards <= 1) {
      return ROSTER_TYPES.slice(currentIndex, currentIndex + 1);
    }

    if (currentIndex === totalCards - 1) {
      return [ROSTER_TYPES[currentIndex], ROSTER_TYPES[currentIndex - 1]];
    }

    return ROSTER_TYPES.slice(currentIndex, currentIndex + 4);
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.ROSTER_TYPE}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        testID="roster-type-progress-header"
      />

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>{t('rosterType.title')}</Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        {t('rosterType.instruction')}
      </Animated.Text>

      {/* Card Stack Container */}
      <View style={styles.cardStackContainer}>
        {visibleCards.map((rt, index) => {
          // When we are on the last card, render the previous card as a full-size preview
          // under the active card to avoid a visual jump on wrap-back.
          const isLastCard = currentIndex === ROSTER_TYPES.length - 1;
          const isLastCardPreview = isLastCard && index === 1;

          return (
            <SwipeableCardMemoized
              key={`${rt.id}-${cardRemountKey}`}
              rosterType={rt}
              index={index}
              isActive={index === 0}
              totalCards={visibleCards.length}
              smoothPreview={isLastCardPreview}
              interactionLocked={isTransitioning}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSwipeUp={handleSwipeUp}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </View>

      {/* Progress Dots */}
      <ProgressDots
        total={ROSTER_TYPES.length}
        current={currentIndex}
        testID="roster-type-progress-dots"
      />

      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>{t('rosterType.preparingNextStep')}</Text>
        </View>
      ) : null}

      {/* Learn More Modal */}
      <LearnMoreModal
        visible={showLearnMore}
        rosterType={learnMoreRosterType}
        onClose={handleModalClose}
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
  cardStackContainer: {
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
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 120,
    textAlign: 'center',
  },
  cardIconImage: {
    width: 180,
    height: 180,
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 12,
  },
  swipeHintRight: {
    right: theme.spacing.lg,
    top: '50%',
  },
  swipeHintLeft: {
    left: theme.spacing.lg,
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
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.dust,
    opacity: 0.3,
  },
  dotActive: {
    backgroundColor: theme.colors.sacredGold,
    opacity: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.opacity.black60,
    justifyContent: 'flex-end',
  },
  modalBackdropDismissArea: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.opacity.gold30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScrollContainer: {
    flexGrow: 1,
    minHeight: 140,
    marginBottom: 20,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.paper,
    marginBottom: 12,
  },
  modalSectionText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.dust,
  },
  modalListItem: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.dust,
    marginBottom: 6,
  },
});
