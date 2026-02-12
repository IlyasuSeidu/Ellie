/**
 * PremiumPhaseSelectorScreen Component
 *
 * Tinder-style swipeable card interface for phase selection (Step 5 of 11)
 * Features two-stage selection: Phase → Day-within-phase (if multi-day)
 * Calculates and saves phaseOffset to OnboardingContext
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftSystem, Phase } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.55;
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
  icon: string;
  color: string;
  secondaryColor: string;
  phaseLength: number;
}

// Day card data interface
interface DayCardData {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
}

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

// Swipeable Phase Card Component
interface SwipeablePhaseCardProps {
  card: PhaseCardData | DayCardData;
  index: number;
  totalCards: number;
  isActive: boolean;
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
  isActive,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  mountProgress,
  reducedMotion: _reducedMotion,
  stage: _stage,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95 - index * 0.05);
  const opacity = useSharedValue(isActive ? 1 : 0.9 - index * 0.05);

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
        { scale: scale.value * stackScale },
      ],
      opacity: opacity.value * mountOpacity,
      zIndex: 100 - index,
    };
  });

  // Type guard to check if card is PhaseCardData
  const isPhaseCard = (c: PhaseCardData | DayCardData): c is PhaseCardData => {
    return 'phase' in c;
  };

  const phaseCard = isPhaseCard(card) ? card : null;
  const dayCard = !isPhaseCard(card) ? card : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {phaseCard && (
          <LinearGradient
            colors={[phaseCard.color, phaseCard.secondaryColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>{phaseCard.icon}</Text>
              <Text style={styles.cardTitle}>{phaseCard.title}</Text>
              <Text style={styles.cardDescription}>{phaseCard.description}</Text>
              {phaseCard.phaseLength > 0 && (
                <Text style={styles.cardPhaseLength}>
                  {phaseCard.phaseLength} {phaseCard.phaseLength === 1 ? 'day' : 'days'}
                </Text>
              )}
            </View>
          </LinearGradient>
        )}

        {dayCard && (
          <View style={[styles.cardGradient, styles.dayCardBackground]}>
            <View style={styles.cardContent}>
              <Text style={styles.dayNumber}>{dayCard.dayNumber}</Text>
              <Text style={styles.cardTitle}>{dayCard.title}</Text>
              <Text style={styles.cardDescription}>{dayCard.description}</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

// Instruction Text Component
interface InstructionTextProps {
  stage: SelectionStage;
}

const InstructionText: React.FC<InstructionTextProps> = ({ stage }) => {
  const text = useMemo(() => {
    switch (stage) {
      case SelectionStage.PHASE:
        return 'Swipe right to select your current phase';
      case SelectionStage.DAY_WITHIN_PHASE:
        return 'Which day of this phase are you starting on?';
      default:
        return '';
    }
  }, [stage]);

  return <Text style={styles.instruction}>{text}</Text>;
};

// Swipe Instructions Component
const SwipeInstructions: React.FC = () => {
  return (
    <View style={styles.swipeInstructions}>
      <View style={styles.swipeHintRow}>
        <Ionicons name="arrow-back" size={20} color={theme.colors.dust} />
        <Text style={styles.swipeHintText}>Skip</Text>
      </View>
      <View style={styles.swipeHintRow}>
        <Ionicons name="arrow-forward" size={20} color={theme.colors.sacredGold} />
        <Text style={styles.swipeHintText}>Select</Text>
      </View>
      <View style={styles.swipeHintRow}>
        <Ionicons name="arrow-up" size={20} color={theme.colors.dust} />
        <Text style={styles.swipeHintText}>Info</Text>
      </View>
    </View>
  );
};

// Phase Info Modal Component
interface PhaseInfoModalProps {
  visible: boolean;
  content: PhaseCardData | DayCardData | null;
  onClose: () => void;
}

const PhaseInfoModal: React.FC<PhaseInfoModalProps> = ({ visible, content, onClose }) => {
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
                <Text style={styles.modalSectionTitle}>Phase Length</Text>
                <Text style={styles.modalSectionText}>
                  {phaseCard.phaseLength} {phaseCard.phaseLength === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </>
          )}

          {dayCard && (
            <>
              <Text style={styles.modalTitle}>{dayCard.title}</Text>
              <Text style={styles.modalDescription}>{dayCard.description}</Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

// Main Screen Component
export const PremiumPhaseSelectorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();

  // State
  const [stage, setStage] = useState<SelectionStage>(SelectionStage.PHASE);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [_selectedDay, setSelectedDay] = useState<number | null>(null);
  const [phaseCards, setPhaseCards] = useState<PhaseCardData[]>([]);
  const [dayCards, setDayCards] = useState<DayCardData[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<PhaseCardData | DayCardData | null>(
    null
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  // Mount animation
  const mountProgress = useSharedValue(0);

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });
  }, []);

  // Mount animation
  useEffect(() => {
    mountProgress.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, [mountProgress]);

  // Generate phase cards based on shift system
  useEffect(() => {
    if (!data.shiftSystem) return;

    const pattern = data.customPattern;
    if (!pattern) return;

    const shiftSystem = data.shiftSystem;

    if (shiftSystem === ShiftSystem.TWO_SHIFT) {
      // 2-Shift: Day, Night, Off
      const cards: PhaseCardData[] = [
        {
          id: 'day',
          phase: 'day' as Phase,
          title: 'Day Shift',
          description: 'Daytime working hours',
          icon: '☀️',
          color: '#f59e0b',
          secondaryColor: '#d97706',
          phaseLength: pattern.daysOn ?? 0,
        },
        {
          id: 'night',
          phase: 'night' as Phase,
          title: 'Night Shift',
          description: 'Nighttime working hours',
          icon: '🌙',
          color: '#3b82f6',
          secondaryColor: '#2563eb',
          phaseLength: pattern.nightsOn ?? 0,
        },
        {
          id: 'off',
          phase: 'off' as Phase,
          title: 'Days Off',
          description: 'Rest and recovery',
          icon: '🛏️',
          color: '#6b7280',
          secondaryColor: '#4b5563',
          phaseLength: pattern.daysOff,
        },
      ].filter((card) => card.phaseLength > 0);

      setPhaseCards(cards);
    } else {
      // 3-Shift: Morning, Afternoon, Night, Off
      const cards: PhaseCardData[] = [
        {
          id: 'morning',
          phase: 'morning' as Phase,
          title: 'Morning Shift',
          description: 'Early day hours',
          icon: '☕',
          color: '#f59e0b',
          secondaryColor: '#d97706',
          phaseLength: pattern.morningOn ?? 0,
        },
        {
          id: 'afternoon',
          phase: 'afternoon' as Phase,
          title: 'Afternoon Shift',
          description: 'Mid-day hours',
          icon: '☀️',
          color: '#fb923c',
          secondaryColor: '#f97316',
          phaseLength: pattern.afternoonOn ?? 0,
        },
        {
          id: 'night',
          phase: 'night' as Phase,
          title: 'Night Shift',
          description: 'Nighttime hours',
          icon: '🌙',
          color: '#3b82f6',
          secondaryColor: '#2563eb',
          phaseLength: pattern.nightOn ?? 0,
        },
        {
          id: 'off',
          phase: 'off' as Phase,
          title: 'Days Off',
          description: 'Rest days',
          icon: '🛏️',
          color: '#6b7280',
          secondaryColor: '#4b5563',
          phaseLength: pattern.daysOff,
        },
      ].filter((card) => card.phaseLength > 0);

      setPhaseCards(cards);
    }
  }, [data.shiftSystem, data.customPattern]);

  // Calculate and navigate helper
  const calculateAndNavigate = useCallback(
    (phase: Phase, dayWithinPhase: number) => {
      const pattern = data.customPattern;
      if (!pattern || !data.shiftSystem) return;

      const shiftSystem = data.shiftSystem as ShiftSystem;

      const phaseOffset = calculateEnhancedPhaseOffset(phase, dayWithinPhase, pattern, shiftSystem);

      updateData({ phaseOffset });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        navigation.navigate('StartDate');
      }, 300);
    },
    [data.customPattern, data.shiftSystem, updateData, navigation]
  );

  // Handle swipe right (select)
  const handleSwipeRight = useCallback(() => {
    if (stage === SelectionStage.PHASE) {
      // Phase selection
      const selectedCard = phaseCards[currentCardIndex];
      if (!selectedCard) return;

      setSelectedPhase(selectedCard.phase);

      if (selectedCard.phaseLength > 1) {
        // Multi-day phase: Generate day cards and transition to stage 2
        const cards: DayCardData[] = Array.from({ length: selectedCard.phaseLength }, (_, i) => ({
          id: `day-${i + 1}`,
          dayNumber: i + 1,
          title: `Day ${i + 1}`,
          description: `Starting on day ${i + 1} of your ${selectedCard.title}`,
        }));

        setDayCards(cards);
        setCurrentCardIndex(0);
        setStage(SelectionStage.DAY_WITHIN_PHASE);

        // Reset mount animation for stage transition
        mountProgress.value = 0;
        mountProgress.value = withSpring(1, SPRING_CONFIGS.stageTransition);
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
  }, [
    stage,
    phaseCards,
    dayCards,
    currentCardIndex,
    selectedPhase,
    calculateAndNavigate,
    mountProgress,
  ]);

  // Handle swipe left (skip)
  const handleSwipeLeft = useCallback(() => {
    const totalCards = stage === SelectionStage.PHASE ? phaseCards.length : dayCards.length;

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      // Loop back to first card
      setCurrentCardIndex(0);
    }
  }, [stage, phaseCards.length, dayCards.length, currentCardIndex]);

  // Handle swipe up (info)
  const handleSwipeUp = useCallback(() => {
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
      <ProgressHeader currentStep={5} totalSteps={11} />

      <View style={styles.content}>
        <InstructionText stage={stage} />

        <View style={styles.cardStack}>
          {visibleCards.map((card, index) => (
            <SwipeablePhaseCard
              key={card.id}
              card={card}
              index={index}
              totalCards={currentCards.length}
              isActive={index === 0}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSwipeUp={handleSwipeUp}
              mountProgress={mountProgress}
              reducedMotion={reducedMotion}
              stage={stage}
            />
          ))}
        </View>

        <SwipeInstructions />
      </View>

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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.paper,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
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
  cardGradient: {
    flex: 1,
    borderRadius: 24,
  },
  dayCardBackground: {
    backgroundColor: theme.colors.darkStone,
  },
  cardContent: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: 16,
  },
  cardPhaseLength: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.paper,
    opacity: 0.8,
  },
  dayNumber: {
    fontSize: 72,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    marginBottom: 24,
  },
  swipeInstructions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  swipeHintRow: {
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.dust,
    marginTop: 4,
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
