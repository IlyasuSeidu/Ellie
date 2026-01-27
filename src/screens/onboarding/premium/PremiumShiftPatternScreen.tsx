/**
 * PremiumShiftPatternScreen Component
 *
 * Tinder-style swipeable card interface for shift pattern selection (Step 3 of 10)
 * Features swipeable cards with spring physics, card stack visualization, and interactive animations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftPattern } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.58;
const SWIPE_THRESHOLD = 120;
const ROTATION_ANGLE = 15;

// Shift pattern card data
interface PatternCardData {
  id: string;
  type: ShiftPattern;
  icon: string;
  name: string;
  schedule: string;
  description: string;
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
    name: '4-4-4 Cycle',
    schedule: '4D / 4N / 4O',
    description: '4 days on, 4 nights on, 4 days off - Perfect for FIFO mining operations',
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
    name: '7-7-7 Cycle',
    schedule: '7D / 7N / 7O',
    description: 'Weekly rotation - 7 days, 7 nights, 7 off for consistent scheduling',
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
    name: '2-2-3 Cycle',
    schedule: '2D / 2N / 3O',
    description: 'Pitman variation - Short bursts of work with frequent rest periods',
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
    name: '5-5-5 Cycle',
    schedule: '5D / 5N / 5O',
    description: 'Medium cycle - Balanced rotation for steady operations',
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
    name: '3-3-3 Cycle',
    schedule: '3D / 3N / 3O',
    description: 'Standard short cycle - Quick rotation for adaptability',
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
    name: '10-10-10 Cycle',
    schedule: '10D / 10N / 10O',
    description: 'Extended cycle - Long work periods with extended rest for remote work',
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
    name: 'Continental',
    schedule: '2D / 2N / 4O',
    description: 'Continental shift - 8-hour shifts with 4-day rest cycles',
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
    name: 'Pitman Schedule',
    schedule: '2-2-3-2-2-3',
    description: 'Classic Pitman - 12-hour shifts with alternating 2 and 3-day breaks',
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
    name: 'Custom Pattern',
    schedule: 'Flexible',
    description: 'Build your own shift pattern tailored to your specific needs',
    detailedInfo: {
      workRestRatio: 'You decide',
      useCases: ['Unique schedules', 'Non-standard operations', 'Special projects'],
      pros: ['Fully customizable', 'Fits unique needs', 'Maximum flexibility'],
      cons: ['Requires manual setup', 'May need approval'],
    },
  },
];

// Swipeable Card Component
interface SwipeableCardProps {
  pattern: PatternCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
  onSwipeRight: () => void;
  testID?: string;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  pattern,
  index,
  totalCards,
  isActive,
  onSwipeRight,
  testID,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95 - index * 0.05);
  const opacity = useSharedValue(isActive ? 1 : 0.9 - index * 0.05);

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
    }
  }, [isActive, translateY, scale]);

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onUpdate((event: any) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      scale.value = 1.05;
      opacity.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD],
        [1, 0.6],
        Extrapolate.CLAMP
      );
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .onEnd((event: any) => {
      const isSwipeRight = event.translationX > SWIPE_THRESHOLD;

      if (isSwipeRight) {
        translateX.value = withSpring(SCREEN_WIDTH, {
          damping: 30,
          stiffness: 400,
        });
        opacity.value = withTiming(0, { duration: 300 });
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onSwipeRight)();
      } else {
        // Rubber band back to center
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
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
    const rotate = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [-ROTATION_ANGLE, 0, ROTATION_ANGLE],
      Extrapolate.CLAMP
    );

    const stackOffset = index * 8;
    const stackScale = 0.95 - index * 0.05;

    return {
      transform: [
        { translateX: isActive ? translateX.value : 0 },
        { translateY: isActive ? translateY.value : stackOffset },
        { rotate: isActive ? `${rotate}deg` : '0deg' },
        { scale: isActive ? scale.value : stackScale },
      ],
      opacity: isActive ? opacity.value : 0.9 - index * 0.05,
      zIndex: totalCards - index,
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.card, animatedStyle]} testID={testID}>
        {/* 3D Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{pattern.icon}</Text>
        </View>

        {/* Shift Name */}
        <Text style={styles.cardTitle}>{pattern.name}</Text>

        {/* Schedule Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pattern.schedule}</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{pattern.description}</Text>

        {/* Swipe Hint (only for first card) */}
        {index === 0 && isActive && (
          <Animated.View style={[styles.swipeHint, styles.swipeHintRight]}>
            <Text style={styles.swipeHintText}>Swipe right to select →</Text>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
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
export interface PremiumShiftPatternScreenProps {
  onContinue?: (patternType: ShiftPattern) => void;
  testID?: string;
}

export const PremiumShiftPatternScreen: React.FC<PremiumShiftPatternScreenProps> = ({
  onContinue,
  testID = 'premium-shift-pattern-screen',
}) => {
  const { updateData } = useOnboarding();
  const [currentIndex] = useState(0);

  // Title animations
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    subtitleOpacity.value = withTiming(1, { duration: 400 });
  }, [titleOpacity, subtitleOpacity]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const handleSwipeRight = useCallback(() => {
    const pattern = SHIFT_PATTERNS[currentIndex];
    updateData({ patternType: pattern.type });

    // Call onContinue to navigate to next screen
    if (onContinue) {
      onContinue(pattern.type);
    }
  }, [currentIndex, updateData, onContinue]);

  const visibleCards = SHIFT_PATTERNS.slice(currentIndex, currentIndex + 4);

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader currentStep={3} totalSteps={10} />

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>Choose your shift pattern</Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Swipe right to select your pattern
      </Animated.Text>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {visibleCards.reverse().map((pattern, index) => (
          <SwipeableCard
            key={pattern.id}
            pattern={pattern}
            index={visibleCards.length - 1 - index}
            totalCards={visibleCards.length}
            isActive={index === visibleCards.length - 1}
            onSwipeRight={handleSwipeRight}
            testID={`${testID}-card-${pattern.id}`}
          />
        ))}
      </View>

      {/* Progress Dots */}
      <ProgressDots total={SHIFT_PATTERNS.length} current={currentIndex} />
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
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.dust,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
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
    backgroundColor: '#1a1816',
    borderRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.2)',
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
  iconContainer: {
    marginBottom: theme.spacing.lg,
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
    backgroundColor: 'rgba(180, 83, 9, 0.2)',
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
    backgroundColor: 'rgba(180, 83, 9, 0.3)',
    borderRadius: 12,
  },
  swipeHintLeft: {
    left: -theme.spacing.md,
  },
  swipeHintRight: {
    right: -theme.spacing.md,
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
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1816',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 83, 9, 0.3)',
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
