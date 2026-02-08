/**
 * PremiumShiftPatternScreen Component
 *
 * Tinder-style swipeable card interface for shift pattern selection (Step 4 of 10)
 * Features swipeable cards with spring physics, card stack visualization, and interactive animations
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

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

// Shift pattern card data
interface PatternCardData {
  id: string;
  type: ShiftPattern;
  icon: string;
  iconImage?: ImageSourcePropType;
  name: string;
  schedule: string;
  description: string;
  supportedSystems: ShiftSystem[]; // Which shift systems this pattern supports
  detailedInfo: {
    workRestRatio: string;
    useCases: string[];
    pros: string[];
    cons: string[];
  };
}

const SHIFT_PATTERNS: PatternCardData[] = [
  {
    id: '4-4-4',
    type: ShiftPattern.STANDARD_4_4_4,
    icon: '⛏️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-4-4-4.png'),
    name: '4-4-4 Cycle',
    schedule: '4D / 4N / 4O',
    description: '4 days on, 4 nights on, 4 days off - Perfect for FIFO mining operations',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '67% work, 33% rest',
      useCases: ['FIFO mining', 'Oil & gas', 'Remote operations'],
      pros: ['Good work-life balance', 'Predictable schedule', 'Extended rest period'],
      cons: ['Rapid day/night transition', 'Can be physically demanding'],
    },
  },
  {
    id: '7-7-7',
    type: ShiftPattern.STANDARD_7_7_7,
    icon: '🗓️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-7-7-7.png'),
    name: '7-7-7 Cycle',
    schedule: '7D / 7N / 7O',
    description: 'Weekly rotation - 7 days, 7 nights, 7 off for consistent scheduling',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '67% work, 33% rest',
      useCases: ['Manufacturing', 'Healthcare', 'Emergency services'],
      pros: ['Full week of rest', 'Easy to remember', 'Good for family planning'],
      cons: ['Long stretches of night shifts', 'Takes time to adjust'],
    },
  },
  {
    id: '2-2-3',
    type: ShiftPattern.STANDARD_2_2_3,
    icon: '⚡',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-2-2-3.png'),
    name: '2-2-3 Cycle',
    schedule: '2D / 2N / 3O',
    description: 'Pitman variation - Short bursts of work with frequent rest periods',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '57% work, 43% rest',
      useCases: ['Police', 'Fire departments', '24/7 operations'],
      pros: ['Frequent days off', 'Less consecutive nights', 'Weekend flexibility'],
      cons: ['Irregular weekly schedule', 'Frequent shift changes'],
    },
  },
  {
    id: '5-5-5',
    type: ShiftPattern.STANDARD_5_5_5,
    icon: '📅',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-5-5-5.png'),
    name: '5-5-5 Cycle',
    schedule: '5D / 5N / 5O',
    description: 'Medium cycle - Balanced rotation for steady operations',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '67% work, 33% rest',
      useCases: ['Construction', 'Utilities', 'Transportation'],
      pros: ['Moderate work periods', 'Good recovery time', 'Flexible schedule'],
      cons: ['5 consecutive nights can be tiring', 'Irregular weekends'],
    },
  },
  {
    id: '3-3-3',
    type: ShiftPattern.STANDARD_3_3_3,
    icon: '🔄',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-3-3-3.png'),
    name: '3-3-3 Cycle',
    schedule: '3D / 3N / 3O',
    description: 'Standard short cycle - Quick rotation for adaptability',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '67% work, 33% rest',
      useCases: ['Security', 'Retail 24hr', 'Call centers'],
      pros: ['Short work stretches', 'Quick recovery', 'Easier adjustment'],
      cons: ['Frequent shift changes', 'Less predictable'],
    },
  },
  {
    id: '10-10-10',
    type: ShiftPattern.STANDARD_10_10_10,
    icon: '📆',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-10-10-10.png'),
    name: '10-10-10 Cycle',
    schedule: '10D / 10N / 10O',
    description: 'Extended cycle - Long work periods with extended rest for remote work',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '67% work, 33% rest',
      useCases: ['Remote mining', 'Offshore oil', 'Antarctic research'],
      pros: ['Long rest period', 'Maximizes travel time', 'High earnings potential'],
      cons: ['Very demanding', 'Long time away from home', 'Difficult adjustment'],
    },
  },
  {
    id: 'continental',
    type: ShiftPattern.CONTINENTAL,
    icon: '🌍',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-continental.png'),
    name: 'Continental',
    schedule: '2M / 2A / 2N / 4O',
    description: 'Continental shift - 8-hour shifts with 4-day rest cycles',
    supportedSystems: [ShiftSystem.THREE_SHIFT], // 8-hour shifts (morning/afternoon/night)
    detailedInfo: {
      workRestRatio: '50% work, 50% rest',
      useCases: ['Manufacturing', 'Processing plants', 'Industrial operations'],
      pros: ['Equal work-rest balance', 'Regular 4-day breaks', '8-hour shifts easier'],
      cons: ['Requires 4 teams', 'Complex scheduling'],
    },
  },
  {
    id: 'pitman',
    type: ShiftPattern.PITMAN,
    icon: '🏭',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-pitman.png'),
    name: 'Pitman Schedule',
    schedule: '2-2-3-2-2-3',
    description: 'Classic Pitman - 12-hour shifts with alternating 2 and 3-day breaks',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    detailedInfo: {
      workRestRatio: '50% work, 50% rest',
      useCases: ['Emergency services', 'Healthcare', 'Manufacturing'],
      pros: ['Every other weekend off', 'Equal work-rest', 'Popular standard'],
      cons: ['12-hour shifts demanding', 'Complex pattern'],
    },
  },
  {
    id: 'custom',
    type: ShiftPattern.CUSTOM,
    icon: '✨',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-custom.png'),
    name: 'Custom Pattern',
    schedule: 'Flexible',
    description: 'Build your own shift pattern tailored to your specific needs',
    supportedSystems: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT], // Supports both
    detailedInfo: {
      workRestRatio: 'You decide',
      useCases: ['Unique schedules', 'Non-standard operations', 'Special projects'],
      pros: ['Fully customizable', 'Fits unique needs', 'Maximum flexibility'],
      cons: ['Requires manual setup', 'May need approval'],
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
  pattern: PatternCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  mountProgress?: SharedValue<number>;
  testID?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  pattern,
  index,
  totalCards,
  isActive,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  mountProgress,
  testID,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95 - index * 0.05);
  const opacity = useSharedValue(isActive ? 1 : 0.9 - index * 0.05);
  const iconScale = useSharedValue(1);
  const hintOpacity = useSharedValue(1);
  const hintScale = useSharedValue(1);

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
      // Use delays to create proper timing
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
    .enabled(isActive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onUpdate((event: any) => {
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
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onEnd((event: any) => {
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
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onSwipeRight)();
      } else if (isSwipeLeft) {
        const duration = Math.max(200, 500 - Math.abs(velocityX) / 3);
        translateX.value = withSpring(-SCREEN_WIDTH, {
          ...SPRING_CONFIGS.swipeLeftSkip,
          velocity: velocityX,
        });
        opacity.value = withTiming(0, { duration });
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        runOnJS(onSwipeLeft)();
      } else if (isSwipeUp) {
        // Snap back to center
        translateY.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
        translateX.value = withSpring(0, SPRING_CONFIGS.swipeUpInfo);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(onSwipeUp)();
      } else {
        // Rubber band back to center
        translateX.value = withSpring(0, SPRING_CONFIGS.snapBack);
        translateY.value = withSpring(0, SPRING_CONFIGS.snapBack);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isActive)
    .onEnd(() => {
      scale.value = withSequence(
        withSpring(1.05, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 400 })
      );
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
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

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.card, getShadowStyle(index, isActive), animatedStyle]}
        testID={testID}
      >
        {/* 3D Icon */}
        <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
          {pattern.iconImage ? (
            <Image source={pattern.iconImage} style={styles.iconImage} resizeMode="contain" />
          ) : (
            <Text style={styles.icon}>{pattern.icon}</Text>
          )}
        </Animated.View>

        {/* Shift Name */}
        <Text style={styles.cardTitle}>{pattern.name}</Text>

        {/* Schedule Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pattern.schedule}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{pattern.description}</Text>

        {/* Swipe Hints (only for first card) */}
        {index === 0 && isActive && (
          <>
            <Animated.View style={[styles.swipeHint, styles.swipeHintLeft, hintAnimatedStyle]}>
              <Text style={styles.swipeHintText}>← Skip</Text>
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

// Memoized version for performance
const SwipeableCardMemoized = React.memo(SwipeableCard, (prevProps, nextProps) => {
  return (
    prevProps.pattern.id === nextProps.pattern.id &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.totalCards === nextProps.totalCards
  );
});

// Learn More Modal Component
interface LearnMoreModalProps {
  visible: boolean;
  pattern: PatternCardData | null;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ visible, pattern, onClose }) => {
  if (!pattern) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{pattern.name}</Text>
          <Text style={styles.modalSchedule}>{pattern.schedule}</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Work-Rest Ratio</Text>
              <Text style={styles.modalSectionText}>{pattern.detailedInfo.workRestRatio}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Common Use Cases</Text>
              {pattern.detailedInfo.useCases.map((useCase, i) => (
                <Text key={i} style={styles.modalListItem}>
                  • {useCase}
                </Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Advantages</Text>
              {pattern.detailedInfo.pros.map((pro, i) => (
                <Text key={i} style={styles.modalListItem}>
                  ✓ {pro}
                </Text>
              ))}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Considerations</Text>
              {pattern.detailedInfo.cons.map((con, i) => (
                <Text key={i} style={styles.modalListItem}>
                  • {con}
                </Text>
              ))}
            </View>
          </ScrollView>

          <PremiumButton
            title="Close"
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

// End Stack Screen Component
interface EndStackScreenProps {
  visible: boolean;
  patternsViewed: number;
  onReviewAgain: () => void;
  onContinueCustom: () => void;
}

const EndStackScreen: React.FC<EndStackScreenProps> = ({
  visible,
  patternsViewed,
  onReviewAgain,
  onContinueCustom,
}) => {
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
        <Text style={styles.endScreenIcon}>✅</Text>
        <Text style={styles.endScreenTitle}>You&apos;ve viewed all {patternsViewed} patterns!</Text>
        <Text style={styles.endScreenSubtitle}>Ready to make your choice or review again?</Text>

        <View style={styles.endScreenButtons}>
          <PremiumButton
            title="Review Patterns"
            onPress={onReviewAgain}
            variant="outline"
            testID="review-again-button"
          />
          <PremiumButton
            title="Create Custom Pattern"
            onPress={onContinueCustom}
            variant="primary"
            testID="continue-custom-button"
          />
        </View>
      </Animated.View>
    </View>
  );
};

// Main Screen Component
export interface PremiumShiftPatternScreenProps {
  onContinue?: (patternType: ShiftPattern) => void;
  testID?: string;
}

export const PremiumShiftPatternScreen: React.FC<PremiumShiftPatternScreenProps> = ({
  onContinue,
  testID = 'premium-shift-pattern-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();

  // Filter patterns based on selected shift system
  const shiftSystem: ShiftSystem = (data.shiftSystem as ShiftSystem) || ShiftSystem.TWO_SHIFT; // Default to 2-shift
  const filteredPatterns = SHIFT_PATTERNS.filter((pattern) =>
    pattern.supportedSystems.includes(shiftSystem)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMorePattern, setLearnMorePattern] = useState<PatternCardData | null>(null);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);

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

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    subtitleOpacity.value = withTiming(1, { duration: 400 });

    // Stagger card entrance animations
    cardAnimations.forEach((anim, index) => {
      anim.value = withDelay(
        index * 80,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleOpacity, subtitleOpacity]);

  // Reset card state when screen comes back into focus (e.g., from CustomPattern screen)
  useFocusEffect(
    useCallback(() => {
      // Force cards to remount with fresh animation state
      setCardRemountKey((prev) => prev + 1);

      // Re-trigger card entrance animations
      cardAnimations.forEach((anim, index) => {
        anim.value = 0;
        anim.value = withDelay(
          index * 80,
          withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
        );
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Detect end of stack
  useEffect(() => {
    if (currentIndex >= filteredPatterns.length) {
      setShowEndScreen(true);
    }
  }, [currentIndex, filteredPatterns.length]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const handleSwipeRight = useCallback(() => {
    const pattern = filteredPatterns[currentIndex];
    updateData({ patternType: pattern.type });

    // Navigate to next screen based on pattern type
    if (onContinue) {
      onContinue(pattern.type);
    } else {
      // If custom pattern, go to custom pattern screen
      // Otherwise, go directly to start date screen
      if (pattern.type === ShiftPattern.CUSTOM) {
        navigation.navigate('CustomPattern');
      } else {
        navigation.navigate('StartDate');
      }
    }
  }, [currentIndex, updateData, onContinue, navigation, filteredPatterns]);

  const handleSwipeUp = useCallback(() => {
    setLearnMorePattern(filteredPatterns[currentIndex]);
    setShowLearnMore(true);
  }, [currentIndex, filteredPatterns]);

  const handleSwipeLeft = useCallback(() => {
    setTimeout(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, 300);
  }, []);

  const handleReviewAgain = useCallback(() => {
    setShowEndScreen(false);
    setCurrentIndex(0);
  }, []);

  const handleContinueCustom = useCallback(() => {
    updateData({ patternType: ShiftPattern.CUSTOM });
    navigation.navigate('CustomPattern');
  }, [updateData, navigation]);

  const visibleCards = filteredPatterns.slice(currentIndex, currentIndex + 4);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader currentStep={4} totalSteps={10} />

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>Choose your shift pattern</Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Swipe right to select • Swipe left to skip • Swipe up for details
      </Animated.Text>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {visibleCards.reverse().map((pattern, index) => (
          <SwipeableCardMemoized
            key={`${pattern.id}-${cardRemountKey}`}
            pattern={pattern}
            index={visibleCards.length - 1 - index}
            totalCards={visibleCards.length}
            isActive={index === visibleCards.length - 1}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSwipeUp}
            mountProgress={cardAnimations[index]}
            testID={`${testID}-card-${pattern.id}`}
          />
        ))}
      </View>

      {/* Progress Dots */}
      <ProgressDots total={filteredPatterns.length} current={currentIndex} />

      {/* Learn More Modal */}
      <LearnMoreModal
        visible={showLearnMore}
        pattern={learnMorePattern}
        onClose={() => setShowLearnMore(false)}
      />

      {/* End Stack Screen */}
      <EndStackScreen
        visible={showEndScreen}
        patternsViewed={filteredPatterns.length}
        onReviewAgain={handleReviewAgain}
        onContinueCustom={handleContinueCustom}
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
  iconImage: {
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
    top: '50%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.opacity.gold30,
    borderRadius: 12,
  },
  swipeHintLeft: {
    left: -theme.spacing.md,
  },
  swipeHintRight: {
    right: -theme.spacing.md,
  },
  swipeHintUp: {
    top: 'auto',
    bottom: 8,
    alignSelf: 'center',
  },
  swipeHintText: {
    fontSize: 14,
    color: theme.colors.paper,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.xxl : theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,
  },
  skipButton: {
    borderColor: theme.colors.dust,
    backgroundColor: 'transparent',
  },
  infoButton: {
    borderColor: theme.colors.dust,
    backgroundColor: 'transparent',
  },
  selectButton: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: theme.colors.sacredGold,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.paper,
    textAlign: 'center',
    fontWeight: '600',
  },
  selectButtonText: {
    fontSize: 14,
    color: theme.colors.deepVoid,
    textAlign: 'center',
    fontWeight: 'bold',
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
    lineHeight: 22,
  },
  modalListItem: {
    fontSize: 16,
    color: theme.colors.dust,
    lineHeight: 24,
    marginBottom: theme.spacing.xs,
  },
  endScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.opacity.void95,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  endScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  endScreenIcon: {
    fontSize: 100,
    marginBottom: theme.spacing.lg,
  },
  endScreenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  endScreenSubtitle: {
    fontSize: 18,
    color: theme.colors.sacredGold,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
  },
  endScreenButtons: {
    width: '100%',
    gap: theme.spacing.md,
  },
});
