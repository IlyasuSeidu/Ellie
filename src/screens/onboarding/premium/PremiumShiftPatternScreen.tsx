/**
 * PremiumShiftPatternScreen Component
 *
 * Tinder-style swipeable card interface for shift pattern selection (Step 4 of 10)
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
  Image,
  ImageSourcePropType,
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
import { useNavigation, useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { SettingsEntryActionButtons } from '@/components/onboarding/premium/SettingsEntryActionButtons';
import { useOnboarding, type OnboardingData } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem } from '@/types';
import type {
  OnboardingStackParamList,
  SettingsPatternBaseline,
} from '@/navigation/OnboardingNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
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
  rosterType: 'rotating' | 'fifo'; // NEW: Which roster paradigm this pattern belongs to
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
    name: '4-4-4 Rotation',
    schedule: '4 days • 4 nights • 4 off',
    description:
      'Work 4 day shifts, then 4 night shifts, then get 4 days off—common for fly-in fly-out sites',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 8 days out of every 12-day cycle, giving you 4 days off',
      useCases: ['Fly-in fly-out mining', 'Oil & gas', 'Remote sites'],
      pros: ['Decent time at home', 'Easy to plan around', 'Good stretch of days off'],
      cons: ['You switch from days to nights pretty quick', 'Long shifts can be tough'],
    },
  },
  {
    id: '7-7-7',
    type: ShiftPattern.STANDARD_7_7_7,
    icon: '🗓️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-7-7-7.png'),
    name: '7-7-7 Rotation',
    schedule: '7 days • 7 nights • 7 off',
    description: 'A full week of day shifts, then nights, then a week off—great for planning ahead',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 14 days out of every 21-day cycle, giving you 7 days off',
      useCases: ['Manufacturing', 'Healthcare', 'Emergency services'],
      pros: ['Full week to recover', 'Simple to remember', 'Easy to plan around'],
      cons: ['7 nights in a row can be draining', 'Takes a while to adjust'],
    },
  },
  {
    id: '2-2-3',
    type: ShiftPattern.STANDARD_2_2_3,
    icon: '⚡',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-2-2-3.png'),
    name: '2-2-3 Rotation',
    schedule: '2 days • 2 nights • 3 off',
    description: 'Short swings of 2 days, 2 nights, then 3 days off—you get breaks more often',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 4 days out of every 7-day cycle, giving you 3 days off',
      useCases: ['Police', 'Fire departments', '24/7 operations'],
      pros: ['Get time off more often', 'Not too many nights in a row', 'Weekends work out well'],
      cons: ['Week-to-week can vary', 'Shift changes happen often'],
    },
  },
  {
    id: '5-5-5',
    type: ShiftPattern.STANDARD_5_5_5,
    icon: '📅',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-5-5-5.png'),
    name: '5-5-5 Rotation',
    schedule: '5 days • 5 nights • 5 off',
    description: 'Work 5 day shifts, then 5 night shifts, then 5 days off—a good middle ground',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 10 days out of every 15-day cycle, giving you 5 days off',
      useCases: ['Construction', 'Utilities', 'Transportation'],
      pros: ['Not too long at work', 'Decent time to recover', 'Works for most people'],
      cons: ['5 nights in a row can be tiring', 'Weekends can be unpredictable'],
    },
  },
  {
    id: '3-3-3',
    type: ShiftPattern.STANDARD_3_3_3,
    icon: '🔄',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-3-3-3.png'),
    name: '3-3-3 Rotation',
    schedule: '3 days • 3 nights • 3 off',
    description: 'Short swings of 3 day shifts, 3 night shifts, then 3 days off—faster rotation',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 6 days out of every 9-day cycle, giving you 3 days off',
      useCases: ['Security', '24-hour retail', 'Call centers'],
      pros: ['Not stuck on one shift too long', 'Recover faster', 'Body adjusts easier'],
      cons: ['Shifts change pretty often', 'Can feel less settled'],
    },
  },
  {
    id: '10-10-10',
    type: ShiftPattern.STANDARD_10_10_10,
    icon: '📆',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-10-10-10.png'),
    name: '10-10-10 Rotation',
    schedule: '10 days • 10 nights • 10 off',
    description: 'Long swings of 10 days, 10 nights, then 10 off—maximizes your time at home',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 20 days out of every 30-day cycle, giving you 10 days off',
      useCases: ['Remote mining', 'Offshore oil', 'Antarctic research'],
      pros: ['Big chunk of time off', 'Worth the travel', 'Good money usually'],
      cons: ['Really demanding', 'Away from home a while', 'Hard to adjust to'],
    },
  },
  {
    id: 'continental',
    type: ShiftPattern.CONTINENTAL,
    icon: '🌍',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-continental.png'),
    name: 'Continental Rotation',
    schedule: '2 mornings • 2 afternoons • 2 nights • 4 off',
    description:
      'Work 2 morning shifts, 2 afternoon, 2 night, then 4 days off—for 8-hour shift sites',
    supportedSystems: [ShiftSystem.THREE_SHIFT], // 8-hour shifts (morning/afternoon/night)
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 6 days out of every 10-day cycle, giving you 4 days off',
      useCases: ['Manufacturing', 'Processing plants', 'Industrial sites'],
      pros: ['Half your time is off', '4 days off regularly', '8-hour shifts are easier'],
      cons: ['Needs 4 crews to work', 'Scheduling can be tricky'],
    },
  },
  {
    id: 'pitman',
    type: ShiftPattern.PITMAN,
    icon: '🏭',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-pitman.png'),
    name: 'Pitman Schedule',
    schedule: '2 days • 2 nights • 3 off',
    description:
      'Short swings of 2 day shifts, then 2 night shifts, then 3 days off—a compact 7-day cycle',
    supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour shifts
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You work 4 days out of every 7-day cycle, giving you 3 days off',
      useCases: ['Emergency services', 'Healthcare', 'Manufacturing'],
      pros: ['Frequent days off', 'Quick rotation between shifts', 'Compact cycle'],
      cons: ['12-hour shifts can be tough', 'Switching day to night quickly'],
    },
  },
  {
    id: 'custom',
    type: ShiftPattern.CUSTOM,
    icon: '✨',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-custom.png'),
    name: 'Custom Rotation',
    schedule: 'You choose',
    description: 'Your site uses something different? Build your own rotation here',
    supportedSystems: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT], // Supports both
    rosterType: 'rotating',
    detailedInfo: {
      workRestRatio: 'You decide',
      useCases: ['Unique schedules', 'Non-standard sites', 'Special arrangements'],
      pros: ['Set it up your way', 'Fits what you need', 'Total flexibility'],
      cons: ['Takes time to set up', 'Might need manager approval'],
    },
  },

  // FIFO Patterns (Australian/Canadian style)
  {
    id: 'fifo-8-6',
    type: ShiftPattern.FIFO_8_6,
    icon: '⛏️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-8-6.png'),
    name: 'FIFO 8/6',
    schedule: '8 days work • 6 days home',
    description: 'Work 8 consecutive days on-site, then 6 days at home—popular in WA mining',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '8 days at site, 6 days at home (14-day cycle)',
      useCases: ['Western Australian mining', 'Remote operations', 'FIFO camps'],
      pros: [
        'Good work-life balance',
        'Enough time to recover',
        'Easy to plan around',
        'Higher pay rates',
      ],
      cons: ['Travel days can be tiring', 'Away from home for over a week', 'Camp accommodation'],
    },
  },
  {
    id: 'fifo-7-7',
    type: ShiftPattern.FIFO_7_7,
    icon: '🏠',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-7-7.png'),
    name: 'FIFO 7/7 (Even-Time)',
    schedule: '1 week work • 1 week home',
    description: 'One week on-site, one week at home—perfect 50/50 balance',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '7 days at site, 7 days at home (14-day cycle)',
      useCases: ['Remote mining', 'Oil & gas', 'Construction sites'],
      pros: [
        'Perfect work-life balance',
        'Equal time home and away',
        'Easy to adjust',
        'Predictable schedule',
      ],
      cons: ['One week away can still be tough', 'Not ideal for very remote sites'],
    },
  },
  {
    id: 'fifo-14-14',
    type: ShiftPattern.FIFO_14_14,
    icon: '✈️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-14-14.png'),
    name: 'FIFO 14/14 (Even-Time)',
    schedule: '2 weeks work • 2 weeks home',
    description: 'Two weeks on-site, two weeks at home—perfect work-life balance',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '14 days at site, 14 days at home (28-day cycle)',
      useCases: ['Remote mining', 'Offshore operations', 'Long-distance FIFO'],
      pros: [
        'Perfect 50/50 balance',
        '2 full weeks at home',
        'Predictable schedule',
        'Good for savings',
      ],
      cons: ['2 weeks away is tough on family', 'Long travel distances', 'Isolation at camp'],
    },
  },
  {
    id: 'fifo-14-7',
    type: ShiftPattern.FIFO_14_7,
    icon: '🏗️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-14-7.png'),
    name: 'FIFO 14/7 (2:1)',
    schedule: '2 weeks work • 1 week home',
    description: '14 days on-site, 7 days home—higher pay for more time away',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '14 days at site, 7 days at home (21-day cycle)',
      useCases: ['Remote mining', 'Offshore oil', 'Very remote sites'],
      pros: [
        'Higher pay rates',
        'Good for saving money',
        '1 week off still decent',
        'Worth the travel cost',
      ],
      cons: ['2 weeks away is very demanding', 'Hard on relationships', 'Less recovery time'],
    },
  },
  {
    id: 'fifo-21-7',
    type: ShiftPattern.FIFO_21_7,
    icon: '🚁',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-21-7.png'),
    name: 'FIFO 21/7 (3:1)',
    schedule: '3 weeks work • 1 week home',
    description: '21 days on-site, 7 days home—for very remote sites with high pay',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '21 days at site, 7 days at home (28-day cycle)',
      useCases: ['Very remote mining', 'Antarctic stations', 'Offshore platforms'],
      pros: [
        'Very high pay',
        'Worth long travel',
        'Good for aggressive savings',
        'Extended work focus',
      ],
      cons: [
        '3 weeks away is extremely demanding',
        'Very tough on family',
        'Limited recovery time',
        'High burnout risk',
      ],
    },
  },
  {
    id: 'fifo-28-14',
    type: ShiftPattern.FIFO_28_14,
    icon: '🌍',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-28-14.png'),
    name: 'FIFO 28/14 (2:1)',
    schedule: '4 weeks work • 2 weeks home',
    description: '28 days on-site, 14 days home—long cycles for very remote operations',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: '28 days at site, 14 days at home (42-day cycle)',
      useCases: ['Antarctica', 'Very remote mining', 'International sites'],
      pros: [
        'Premium pay rates',
        '2 weeks off for full recovery',
        'Worth international travel',
        'Maximum savings',
      ],
      cons: [
        '4 weeks away is incredibly demanding',
        'Severe impact on relationships',
        'Long adjustment periods',
        'Very high stress',
      ],
    },
  },
  {
    id: 'fifo-custom',
    type: ShiftPattern.FIFO_CUSTOM,
    icon: '🛠️',
    iconImage: require('../../../../assets/onboarding/icons/consolidated/shift-pattern-fifo-custom.png'),
    name: 'Custom FIFO',
    schedule: 'You choose',
    description: 'Your FIFO site uses a unique roster? Configure your own work/rest blocks',
    supportedSystems: [ShiftSystem.TWO_SHIFT],
    rosterType: 'fifo',
    detailedInfo: {
      workRestRatio: 'You decide',
      useCases: ['Unique FIFO schedules', 'Special project sites', 'Flexible arrangements'],
      pros: ['Fully customizable', 'Matches your exact roster', 'Total flexibility'],
      cons: ['Takes time to configure', 'Need to know your exact roster'],
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
  interactionLocked?: boolean;
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
      source: 'PremiumShiftPatternScreen.card.swipeRight',
    });
  }, []);
  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumShiftPatternScreen.card.swipeLeft',
    });
  }, []);
  const triggerMediumHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: 'PremiumShiftPatternScreen.card.swipeUpOrTap',
    });
  }, []);
  const reportWorkletError = useCallback((phase: 'update' | 'end', message: string) => {
    if (__DEV__) {
      console.error('[ShiftPattern] Swipe worklet error', { phase, message });
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

  const nameText = String(
    t(`shiftPattern.cards.${pattern.id}.name`, { defaultValue: pattern.name })
  );
  const scheduleText = String(
    t(`shiftPattern.cards.${pattern.id}.schedule`, { defaultValue: pattern.schedule })
  );
  const descriptionText = String(
    t(`shiftPattern.cards.${pattern.id}.description`, { defaultValue: pattern.description })
  );

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
        <Text style={styles.cardTitle}>{nameText}</Text>

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
    prevProps.pattern.id === nextProps.pattern.id &&
    prevProps.index === nextProps.index &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.totalCards === nextProps.totalCards &&
    prevProps.interactionLocked === nextProps.interactionLocked
  );
});

// Learn More Modal Component
interface LearnMoreModalProps {
  visible: boolean;
  pattern: PatternCardData | null;
  onClose: () => void;
}

const LearnMoreModal: React.FC<LearnMoreModalProps> = ({ visible, pattern, onClose }) => {
  const { t } = useTranslation('onboarding');
  if (!pattern) return null;

  const patternName = String(
    t(`shiftPattern.cards.${pattern.id}.name`, { defaultValue: pattern.name })
  );
  const patternSchedule = String(
    t(`shiftPattern.cards.${pattern.id}.schedule`, { defaultValue: pattern.schedule })
  );
  const workRestRatio = String(
    t(`shiftPattern.cards.${pattern.id}.details.workRestRatio`, {
      defaultValue: pattern.detailedInfo.workRestRatio,
    })
  );
  const useCases = pattern.detailedInfo.useCases.map((useCase, index) =>
    String(
      t(`shiftPattern.cards.${pattern.id}.details.useCases.${index}`, {
        defaultValue: useCase,
      })
    )
  );
  const pros = pattern.detailedInfo.pros.map((pro, index) =>
    String(
      t(`shiftPattern.cards.${pattern.id}.details.pros.${index}`, {
        defaultValue: pro,
      })
    )
  );
  const cons = pattern.detailedInfo.cons.map((con, index) =>
    String(
      t(`shiftPattern.cards.${pattern.id}.details.cons.${index}`, {
        defaultValue: con,
      })
    )
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{patternName}</Text>
          <Text style={styles.modalSchedule}>{patternSchedule}</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>{t('common.learnMore.howItWorks')}</Text>
              <Text style={styles.modalSectionText}>{workRestRatio}</Text>
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
        <Text style={styles.endScreenIcon}>✅</Text>
        <Text style={styles.endScreenTitle}>
          {t('shiftPattern.endState.reviewedTitle', {
            count: patternsViewed,
            defaultValue: `That's all ${patternsViewed} rotations we've got!`,
          })}
        </Text>
        <Text style={styles.endScreenSubtitle}>
          {t('shiftPattern.endState.reviewedSubtitle', {
            defaultValue: "Didn't see yours? You can build a custom one, or take another look",
          })}
        </Text>

        <View style={styles.endScreenButtons}>
          <PremiumButton
            title={t('shiftPattern.endState.reviewButton', { defaultValue: 'Look Again' })}
            onPress={onReviewAgain}
            variant="outline"
            testID="review-again-button"
          />
          <PremiumButton
            title={t('shiftPattern.endState.customButton', {
              defaultValue: 'Build Custom Rotation',
            })}
            onPress={onContinueCustom}
            variant="primary"
            testID="continue-custom-button"
          />
        </View>
      </Animated.View>
    </View>
  );
};

const isCustomPatternType = (patternType: ShiftPattern): boolean =>
  patternType === ShiftPattern.CUSTOM || patternType === ShiftPattern.FIFO_CUSTOM;

const cloneSettingsPatternBaseline = (
  baseline: SettingsPatternBaseline
): SettingsPatternBaseline => ({
  patternType: baseline.patternType,
  customPattern: baseline.customPattern ? { ...baseline.customPattern } : undefined,
  fifoConfig: baseline.fifoConfig ? { ...baseline.fifoConfig } : undefined,
  rosterType: baseline.rosterType,
  shiftSystem: baseline.shiftSystem,
});

export const _captureSettingsPatternBaseline = (
  data: Pick<
    OnboardingData,
    'patternType' | 'customPattern' | 'fifoConfig' | 'rosterType' | 'shiftSystem'
  >
): SettingsPatternBaseline => ({
  patternType: data.patternType,
  customPattern: data.customPattern ? { ...data.customPattern } : undefined,
  fifoConfig: data.fifoConfig ? { ...data.fifoConfig } : undefined,
  rosterType: data.rosterType,
  shiftSystem: data.shiftSystem,
});

export const _resolveShiftPatternSettingsAction = (
  isSettingsMode: boolean,
  patternType: ShiftPattern
): 'exit-settings' | 'navigate-custom' | 'advance-onboarding' => {
  if (!isSettingsMode) return 'advance-onboarding';
  if (isCustomPatternType(patternType)) return 'navigate-custom';
  return 'exit-settings';
};

export const _buildSettingsCustomRouteParams = (
  baseline: SettingsPatternBaseline
): NonNullable<OnboardingStackParamList['CustomPattern']> => ({
  entryPoint: 'settings',
  returnToMainOnSelect: true,
  settingsBaseline: cloneSettingsPatternBaseline(baseline),
});

// Main Screen Component
export interface PremiumShiftPatternScreenProps {
  onContinue?: (patternType: ShiftPattern) => void;
  testID?: string;
}

export const PremiumShiftPatternScreen: React.FC<PremiumShiftPatternScreenProps> = ({
  onContinue,
  testID = 'premium-shift-pattern-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'ShiftPattern'>>();
  const { data, updateData } = useOnboarding();
  const isSettingsEntry = route.params?.entryPoint === 'settings';
  const returnToMainOnSelect = route.params?.returnToMainOnSelect === true;
  const isSettingsMode = isSettingsEntry && returnToMainOnSelect;
  const settingsSeed = route.params?.settingsSeed;
  const settingsBaselineRef = useRef<SettingsPatternBaseline | null>(null);
  const [pendingSettingsPatternType, setPendingSettingsPatternType] = useState<ShiftPattern | null>(
    null
  );

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

  // In settings-entry mode, use the active settings pills passed as route seed.
  // In onboarding mode, keep using context data.
  const effectiveShiftSystem = (
    isSettingsMode ? (settingsSeed?.shiftSystem ?? data.shiftSystem) : data.shiftSystem
  ) as ShiftSystem | undefined;
  const shiftSystem: ShiftSystem = effectiveShiftSystem || ShiftSystem.TWO_SHIFT;
  const rosterType =
    (isSettingsMode ? (settingsSeed?.rosterType ?? data.rosterType) : data.rosterType) ||
    'rotating';

  const filteredPatterns = SHIFT_PATTERNS.filter(
    (pattern) => pattern.supportedSystems.includes(shiftSystem) && pattern.rosterType === rosterType
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [learnMorePattern, setLearnMorePattern] = useState<PatternCardData | null>(null);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [cardRemountKey, setCardRemountKey] = useState(0);
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
    if (!isSettingsMode || settingsBaselineRef.current) {
      return;
    }
    settingsBaselineRef.current = _captureSettingsPatternBaseline(data);
  }, [data, isSettingsMode]);

  const getSettingsCustomRouteParams = useCallback(() => {
    const existingBaseline = settingsBaselineRef.current;
    if (existingBaseline) {
      return _buildSettingsCustomRouteParams(existingBaseline);
    }

    const fallbackBaseline = _captureSettingsPatternBaseline(data);
    settingsBaselineRef.current = fallbackBaseline;
    return _buildSettingsCustomRouteParams(fallbackBaseline);
  }, [data]);

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
      clearPendingTransitions();
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
    if (isTransitioningRef.current) return;
    const pattern = filteredPatterns[currentIndex];
    if (!pattern) return;
    if (isSettingsMode) {
      if (isCustomPatternType(pattern.type)) {
        isTransitioningRef.current = true;
        setIsTransitioning(true);
        interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
          navigationTimeoutRef.current = setTimeout(() => {
            navigationTimeoutRef.current = null;
            const customRoute =
              pattern.type === ShiftPattern.FIFO_CUSTOM ? 'FIFOCustomPattern' : 'CustomPattern';
            navigation.navigate(customRoute, getSettingsCustomRouteParams());
          }, 300);
        });
        return;
      }
      setPendingSettingsPatternType(pattern.type);
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumShiftPatternScreen.handleSwipeRight.settingsPending',
      });
      return;
    }

    isTransitioningRef.current = true;
    setIsTransitioning(true);

    // Navigate to next screen based on pattern type
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        updateData({ patternType: pattern.type });
        if (onContinue) {
          onContinue(pattern.type);
          return;
        }
        // Use the navigation helper which handles conditional routing
        goToNextScreen(navigation, 'ShiftPattern', { ...data, patternType: pattern.type });
      }, 300);
    });
  }, [
    currentIndex,
    data,
    filteredPatterns,
    getSettingsCustomRouteParams,
    isSettingsMode,
    navigation,
    onContinue,
    updateData,
  ]);

  const handleSaveSettingsPattern = useCallback(() => {
    if (!isSettingsMode || pendingSettingsPatternType === null) {
      return;
    }
    updateData({ patternType: pendingSettingsPatternType });
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumShiftPatternScreen.handleSaveSettingsPattern',
    });
    closeSettingsEditor();
  }, [closeSettingsEditor, isSettingsMode, pendingSettingsPatternType, updateData]);

  const handleSwipeUp = useCallback(() => {
    if (isTransitioningRef.current) return;
    setLearnMorePattern(filteredPatterns[currentIndex]);
    setShowLearnMore(true);
  }, [currentIndex, filteredPatterns]);

  const handleSwipeLeft = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (swipeLeftTimeoutRef.current) {
      clearTimeout(swipeLeftTimeoutRef.current);
    }
    swipeLeftTimeoutRef.current = setTimeout(() => {
      swipeLeftTimeoutRef.current = null;
      setCurrentIndex((prevIndex) => prevIndex + 1);
    }, 300);
  }, []);

  const handleReviewAgain = useCallback(() => {
    setShowEndScreen(false);
    setCurrentIndex(0);
  }, []);

  const handleContinueCustom = useCallback(() => {
    if (isTransitioningRef.current) return;
    const customPatternType =
      rosterType === 'fifo' ? ShiftPattern.FIFO_CUSTOM : ShiftPattern.CUSTOM;
    if (!isSettingsMode) {
      updateData({ patternType: customPatternType });
    }
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      navigationTimeoutRef.current = setTimeout(() => {
        navigationTimeoutRef.current = null;
        if (isSettingsMode) {
          navigation.navigate(
            rosterType === 'fifo' ? 'FIFOCustomPattern' : 'CustomPattern',
            getSettingsCustomRouteParams()
          );
          return;
        }
        goToNextScreen(navigation, 'ShiftPattern', { ...data, patternType: customPatternType });
      }, 300);
    });
  }, [data, getSettingsCustomRouteParams, isSettingsMode, navigation, rosterType, updateData]);

  const visibleCards = useMemo(
    () => filteredPatterns.slice(currentIndex, currentIndex + 4),
    [filteredPatterns, currentIndex]
  );

  return (
    <View style={styles.container} testID={testID}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.SHIFT_PATTERN}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      {isSettingsEntry ? (
        <View style={styles.settingsEntryActions}>
          <SettingsEntryActionButtons
            backLabel={String(t('common.backToSettings', { defaultValue: 'Back to Settings' }))}
            saveLabel={String(t('common.saveAndReturn', { defaultValue: 'Save & Return' }))}
            onBack={closeSettingsEditor}
            onSave={handleSaveSettingsPattern}
            saveDisabled={pendingSettingsPatternType === null}
            backAccessibilityLabel={String(
              t('common.backToSettings', { defaultValue: 'Back to Settings' })
            )}
            saveAccessibilityLabel={String(
              t('common.saveAndReturn', {
                defaultValue: 'Save and return to settings',
              })
            )}
            saveTestID="shift-pattern-save-settings-button"
          />
        </View>
      ) : null}

      {/* Title */}
      <Animated.Text style={[styles.title, titleStyle]}>
        {t('shiftPattern.title', { defaultValue: "What's Your Roster Rotation?" })}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        {t('shiftPattern.instruction', {
          defaultValue:
            "Choose the rotation your workplace uses—we'll build your calendar from this\nSwipe right to choose, left to see more, up for info",
        })}
      </Animated.Text>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {[...visibleCards].reverse().map((pattern, index) => (
          <SwipeableCardMemoized
            key={`${pattern.id}-${cardRemountKey}`}
            pattern={pattern}
            index={visibleCards.length - 1 - index}
            totalCards={visibleCards.length}
            isActive={index === visibleCards.length - 1}
            interactionLocked={isTransitioning}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onSwipeUp={handleSwipeUp}
            mountProgress={cardAnimations[index]}
            testID={`${testID}-card-${pattern.id}`}
          />
        ))}
      </View>

      {isTransitioning ? (
        <View pointerEvents="none" style={styles.transitionOverlay}>
          <Text style={styles.transitionText}>{t('rosterType.preparingNextStep')}</Text>
        </View>
      ) : null}

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
  settingsEntryActions: {
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  settingsExitButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
  },
  settingsExitButtonText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
  settingsSaveButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.45)',
    backgroundColor: theme.colors.sacredGold,
  },
  settingsSaveButtonDisabled: {
    backgroundColor: theme.colors.darkStone,
    borderColor: theme.colors.softStone,
  },
  settingsSaveButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
    letterSpacing: 0.3,
  },
  settingsSaveButtonTextDisabled: {
    color: theme.colors.shadow,
    fontWeight: theme.typography.fontWeights.semibold,
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
