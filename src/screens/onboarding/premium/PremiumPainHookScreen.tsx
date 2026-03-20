/**
 * PremiumPainHookScreen Component
 *
 * Restores the onboarding-card treatment for the pain-hook step while keeping
 * the implementation type-safe and compatible with the typed i18n setup.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions, ScrollView } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { Analytics } from '@/utils/analytics';
import { PremiumButton } from '@/components/onboarding/premium';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { useOnboarding, type OnboardingData } from '@/contexts/OnboardingContext';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PainHook'>;
type PainOptionId = NonNullable<OnboardingData['painPoint']>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 380);
const SWIPE_THRESHOLD = 82;
const VELOCITY_THRESHOLD = 700;

type PainOption = {
  id: PainOptionId;
  icon: IoniconName;
  gradient: readonly [string, string];
  glow: string;
  labelKey:
    | 'painHook.options.cycle_lost'
    | 'painHook.options.wrong_alarm'
    | 'painHook.options.days_off'
    | 'painHook.options.family'
    | 'painHook.options.mental_math';
  subKey:
    | 'painHook.subs.cycle_lost'
    | 'painHook.subs.wrong_alarm'
    | 'painHook.subs.days_off'
    | 'painHook.subs.family'
    | 'painHook.subs.mental_math';
};

const PAIN_OPTIONS: readonly PainOption[] = [
  {
    id: 'cycle_lost',
    icon: 'sync-circle-outline',
    gradient: ['#1f4fd1', '#102457'],
    glow: 'rgba(33, 150, 243, 0.34)',
    labelKey: 'painHook.options.cycle_lost',
    subKey: 'painHook.subs.cycle_lost',
  },
  {
    id: 'wrong_alarm',
    icon: 'alarm-outline',
    gradient: ['#b45309', '#5a2d06'],
    glow: 'rgba(245, 158, 11, 0.34)',
    labelKey: 'painHook.options.wrong_alarm',
    subKey: 'painHook.subs.wrong_alarm',
  },
  {
    id: 'days_off',
    icon: 'calendar-outline',
    gradient: ['#0f766e', '#113633'],
    glow: 'rgba(45, 212, 191, 0.3)',
    labelKey: 'painHook.options.days_off',
    subKey: 'painHook.subs.days_off',
  },
  {
    id: 'family',
    icon: 'people-outline',
    gradient: ['#7c3aed', '#2e1065'],
    glow: 'rgba(168, 85, 247, 0.34)',
    labelKey: 'painHook.options.family',
    subKey: 'painHook.subs.family',
  },
  {
    id: 'mental_math',
    icon: 'calculator-outline',
    gradient: ['#9333ea', '#312e81'],
    glow: 'rgba(129, 140, 248, 0.32)',
    labelKey: 'painHook.options.mental_math',
    subKey: 'painHook.subs.mental_math',
  },
] as const;

interface PainCardProps {
  option: PainOption;
  isSelected: boolean;
  onSelect: (id: PainOptionId) => void;
  onNext: () => void;
}

const PainCard: React.FC<PainCardProps> = ({ option, isSelected, onSelect, onNext }) => {
  const { t } = useTranslation('onboarding');
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const hintOpacity = useSharedValue(1);

  const triggerSelectHaptic = useCallback(() => {
    void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
      source: 'PremiumPainHookScreen.card.select',
    });
  }, []);

  const triggerNextHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: 'PremiumPainHookScreen.card.next',
    });
  }, []);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    hintOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(2200, withTiming(0.45, { duration: 500, easing: Easing.out(Easing.quad) })),
        withDelay(1300, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }))
      ),
      -1,
      false
    );
  }, [hintOpacity, option.id, translateX, translateY]);

  const handleSelect = useCallback(() => {
    onSelect(option.id);
    triggerSelectHaptic();
  }, [onSelect, option.id, triggerSelectHaptic]);

  const handleNext = useCallback(() => {
    onNext();
    triggerNextHaptic();
  }, [onNext, triggerNextHaptic]);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.08;
    })
    .onEnd((event) => {
      const shouldSelect =
        event.translationX > SWIPE_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;
      const shouldAdvance =
        event.translationX < -SWIPE_THRESHOLD || event.velocityX < -VELOCITY_THRESHOLD;

      if (shouldSelect) {
        translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
        runOnJS(handleSelect)();
        return;
      }

      if (shouldAdvance) {
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 160 }, (finished) => {
          if (finished) {
            runOnJS(handleNext)();
          }
        });
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${interpolate(translateX.value, [-180, 180], [-8, 8])}deg` },
    ],
  }));

  const animatedHintsStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const label = t(option.labelKey);
  const subtitle = t(option.subKey);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.activeCardWrapper,
          animatedCardStyle,
          isSelected && { shadowColor: option.glow, elevation: 16 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.activeCardPressable, pressed && styles.activeCardPressed]}
          onPress={handleSelect}
          accessibilityRole="button"
          accessibilityLabel={`${label}. ${subtitle}`}
          testID={`pain-hook-card-${option.id}`}
        >
          <LinearGradient
            colors={[...option.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.activeCardGradient,
              isSelected && styles.activeCardSelected,
              { borderColor: isSelected ? theme.colors.paleGold : theme.colors.opacity.white20 },
            ]}
          >
            <Animated.View style={[styles.cardHintsRow, animatedHintsStyle]}>
              <View style={styles.cardHintChip}>
                <Text style={styles.cardHintText}>{t('common.hints.nextOption')}</Text>
              </View>
              <View style={styles.cardHintChip}>
                <Text style={styles.cardHintText}>{t('common.hints.selectThis')}</Text>
              </View>
            </Animated.View>

            <View style={styles.iconShell}>
              <Ionicons name={option.icon} size={48} color={theme.colors.paper} />
            </View>

            <Text style={styles.cardTitle}>{label}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.cardFooterChip}>
                <Text style={styles.cardFooterText}>Ellie</Text>
              </View>
              {isSelected ? (
                <View style={[styles.cardFooterChip, styles.cardFooterChipSelected]}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.deepVoid} />
                  <Text style={styles.cardFooterTextSelected}>{t('common.continueButton')}</Text>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

export const PremiumPainHookScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const { data, updateData } = useOnboarding();
  const mountTime = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(() => {
    const savedIndex = PAIN_OPTIONS.findIndex((option) => option.id === data.painPoint);
    return savedIndex >= 0 ? savedIndex : 0;
  });
  const [selected, setSelected] = useState<PainOptionId | null>(data.painPoint ?? null);
  const buttonOpacity = useSharedValue(data.painPoint ? 1 : 0);
  const buttonTranslate = useSharedValue(data.painPoint ? 0 : 28);

  useEffect(() => {
    Analytics.onboardingStepViewed('pain_hook', ONBOARDING_STEPS.PAIN_HOOK);
  }, []);

  const revealButton = useCallback(() => {
    buttonOpacity.value = withTiming(1, { duration: 220 });
    buttonTranslate.value = withSpring(0, { damping: 16, stiffness: 220 });
  }, [buttonOpacity, buttonTranslate]);

  const hideButton = useCallback(() => {
    buttonOpacity.value = withTiming(0, { duration: 140 });
    buttonTranslate.value = withTiming(28, { duration: 140 });
  }, [buttonOpacity, buttonTranslate]);

  const handleSelect = useCallback(
    (id: PainOptionId) => {
      setSelected(id);
      revealButton();
    },
    [revealButton]
  );

  const handleNext = useCallback(() => {
    setSelected(null);
    hideButton();
    setCurrentIndex((previous) => (previous + 1) % PAIN_OPTIONS.length);
  }, [hideButton]);

  const handleContinue = useCallback(() => {
    if (!selected) {
      return;
    }

    updateData({ painPoint: selected });
    Analytics.onboardingQuestionAnswered({ question: 'pain_point', answer_value: selected });
    Analytics.onboardingStepCompleted('pain_hook', Date.now() - mountTime.current);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToNextScreen(navigation, 'PainHook');
  }, [navigation, selected, updateData]);

  const activeOption = PAIN_OPTIONS[currentIndex];
  const previewOptions = useMemo(
    () => [
      PAIN_OPTIONS[(currentIndex + 1) % PAIN_OPTIONS.length],
      PAIN_OPTIONS[(currentIndex + 2) % PAIN_OPTIONS.length],
    ],
    [currentIndex]
  );

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  return (
    <View style={styles.container} testID="pain-hook-screen">
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.PAIN_HOOK}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        onBack={() => navigation.goBack()}
        testID="pain-hook-progress"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('painHook.title')}</Text>
          <Text style={styles.subtitle}>{t('painHook.subtitle')}</Text>
        </View>

        <View style={styles.dotRow}>
          {PAIN_OPTIONS.map((option, index) => {
            const isActive = index === currentIndex;
            const isChosen = option.id === selected;
            return (
              <View
                key={option.id}
                style={[styles.dot, isActive && styles.dotActive, isChosen && styles.dotChosen]}
              />
            );
          })}
        </View>

        <View style={styles.deck}>
          <View
            style={[
              styles.previewCard,
              styles.previewCardFar,
              { backgroundColor: previewOptions[1].gradient[1] },
            ]}
          />
          <View
            style={[
              styles.previewCard,
              styles.previewCardNear,
              { backgroundColor: previewOptions[0].gradient[0] },
            ]}
          />

          <PainCard
            key={activeOption.id}
            option={activeOption}
            isSelected={selected === activeOption.id}
            onSelect={handleSelect}
            onNext={handleNext}
          />
        </View>

        <View style={styles.buttonSpacer} />
      </ScrollView>

      <Animated.View
        style={[styles.buttonContainer, buttonAnimatedStyle]}
        pointerEvents={selected ? 'auto' : 'none'}
      >
        <PremiumButton
          title={t('painHook.cta')}
          onPress={handleContinue}
          variant="primary"
          size="large"
          titleNumberOfLines={1}
          testID="pain-hook-continue-button"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: 132,
  },
  header: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.dust,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.softStone,
  },
  dotActive: {
    width: 22,
    backgroundColor: theme.colors.brightGold,
  },
  dotChosen: {
    backgroundColor: theme.colors.paper,
  },
  deck: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 470,
    marginBottom: theme.spacing.md,
  },
  previewCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: 420,
    borderRadius: 28,
    opacity: 0.32,
  },
  previewCardNear: {
    transform: [{ scale: 0.95 }, { translateY: 12 }],
  },
  previewCardFar: {
    transform: [{ scale: 0.9 }, { translateY: 24 }],
    opacity: 0.18,
  },
  activeCardWrapper: {
    width: CARD_WIDTH,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },
  activeCardPressable: {
    borderRadius: 28,
  },
  activeCardPressed: {
    opacity: 0.98,
  },
  activeCardGradient: {
    minHeight: 420,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 22,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  activeCardSelected: {
    borderWidth: 2,
  },
  cardHintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHintChip: {
    backgroundColor: theme.colors.opacity.black40,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cardHintText: {
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  iconShell: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.opacity.white10,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white20,
  },
  cardTitle: {
    marginTop: theme.spacing.xl,
    fontSize: 34,
    lineHeight: 40,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.black,
    textAlign: 'center',
  },
  cardSubtitle: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    lineHeight: 28,
    color: theme.colors.paper,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  cardFooterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.opacity.black40,
  },
  cardFooterChipSelected: {
    backgroundColor: theme.colors.paper,
  },
  cardFooterText: {
    fontSize: 13,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.semibold,
    letterSpacing: 0.2,
  },
  cardFooterTextSelected: {
    fontSize: 13,
    color: theme.colors.deepVoid,
    fontWeight: theme.typography.fontWeights.bold,
    letterSpacing: 0.2,
  },
  buttonSpacer: {
    height: 8,
  },
  buttonContainer: {
    position: 'absolute',
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    bottom: Platform.select({ ios: 36, android: 28 }),
  },
});
