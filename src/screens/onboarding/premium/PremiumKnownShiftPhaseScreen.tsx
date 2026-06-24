/**
 * PremiumKnownShiftPhaseScreen Component
 *
 * Exact schedule alignment screen. It asks which repeated Day, Night, or Off
 * slot the known date belongs to.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PremiumButton } from '@/components/onboarding/premium';
import type {
  KnownShiftPhaseSetupParams,
  OnboardingStackParamList,
} from '@/navigation/OnboardingNavigator';
import type { UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getExactPhaseQuestion, getExactPhaseUnsureHint } from '@/utils/dateTenseUtils';
import {
  buildScheduleWithExactPhase,
  getKnownShiftChoiceLabel,
  getKnownShiftPhaseOptions,
  type KnownShiftChoice,
  type KnownShiftPhaseOption,
} from '@/utils/knownShiftPhase';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'KnownShiftPhaseSetup'>;
type PhaseRoute = RouteProp<
  { KnownShiftPhaseSetup: KnownShiftPhaseSetupParams },
  'KnownShiftPhaseSetup'
>;

export interface PremiumKnownShiftPhaseScreenProps {
  /** Draft schedule for tests or previews */
  scheduleDraft?: UniversalShiftSchedule;
  /** Selected shift for tests or previews */
  selectedShift?: KnownShiftChoice;
  /** Navigation handler for tests */
  onContinue?: (
    scheduleWithExactPhase: UniversalShiftSchedule,
    option: KnownShiftPhaseOption
  ) => void;
  /** Repair handler for tests */
  onUnsure?: (scheduleDraft: UniversalShiftSchedule) => void;
  flowContext?: 'onboarding' | 'settings';
  /** Test ID */
  testID?: string;
}

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.84)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  gold: '#20f4dc',
  line: 'rgba(191, 231, 255, 0.2)',
} as const;

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateStr(dateStr));
}

export const PremiumKnownShiftPhaseScreen: React.FC<PremiumKnownShiftPhaseScreenProps> = ({
  scheduleDraft,
  selectedShift,
  onContinue,
  onUnsure,
  flowContext = 'onboarding',
  testID = 'premium-known-shift-phase-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PhaseRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const resolvedShift = selectedShift ?? route.params?.selectedShift;
  const [selectedOption, setSelectedOption] = useState<KnownShiftPhaseOption | null>(null);
  const isSettingsFlow = flowContext === 'settings';

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('known_shift_phase', 6);

    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 10500, easing: Easing.linear }),
      -1,
      false
    );
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1150, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [badgePulse, cardFloat, contentOpacity, contentTranslateY, orbitRotation]);

  const phaseOptions = useMemo(
    () =>
      resolvedDraft && resolvedShift ? getKnownShiftPhaseOptions(resolvedDraft, resolvedShift) : [],
    [resolvedDraft, resolvedShift]
  );
  const dateText = resolvedDraft?.anchorDate ? formatDisplayDate(resolvedDraft.anchorDate) : '';
  const anchorDate = resolvedDraft?.anchorDate ?? '';
  const shiftLabel = resolvedShift ? getKnownShiftChoiceLabel(resolvedShift) : 'shift';

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const handleContinue = () => {
    if (!resolvedDraft || !selectedOption) return;

    const scheduleWithExactPhase = buildScheduleWithExactPhase(
      resolvedDraft,
      selectedOption.sequenceIndex
    );

    Analytics.onboardingStepCompleted('known_shift_phase', Date.now() - mountTime.current, {
      selected_shift: resolvedShift,
      occurrence: selectedOption.occurrence,
      sequence_index: selectedOption.sequenceIndex,
      phase_offset: scheduleWithExactPhase.phaseOffset,
    });

    if (onContinue) {
      onContinue(scheduleWithExactPhase, selectedOption);
    } else {
      navigation.navigate('SchedulePreviewSetup', {
        scheduleDraft: scheduleWithExactPhase,
      });
    }
  };

  const handleUnsure = () => {
    if (!resolvedDraft) return;

    Analytics.track('known_shift_phase_unsure', {
      selected_shift: resolvedShift,
      matching_phase_count: phaseOptions.length,
    });

    if (onUnsure) {
      onUnsure(resolvedDraft);
    } else {
      navigation.navigate('FixMenuSetup', {
        scheduleDraft: resolvedDraft,
      });
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <LinearGradient
        colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />
      <View style={styles.goldGlow} />
      <Animated.View style={[styles.orbit, orbitAnimatedStyle]} pointerEvents="none" />

      <ScrollView
        testID={`${testID}-scroll-view`}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 22, 42),
            paddingBottom: Math.max(insets.bottom + 56, 74),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
      >
        <Animated.View style={[styles.topRow, contentAnimatedStyle]}>
          <View style={[styles.stepPill, isSettingsFlow && styles.repairPill]}>
            <View style={styles.stepDot} />
            <Text style={styles.stepLabel}>
              {isSettingsFlow
                ? 'Fix exact day'
                : t('knownShiftPhase.stepLabel', { defaultValue: 'Exact day' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="locate" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>6</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {anchorDate ? getExactPhaseQuestion(anchorDate) : 'Which exact one?'}
          </Text>
          <Text style={styles.support}>
            {t('knownShiftPhase.support', {
              defaultValue: 'You chose {{shift}} for {{date}}.',
              shift: shiftLabel,
              date: dateText,
            })}
          </Text>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.cardEntry}>
            <Animated.View
              style={[styles.phaseCard, cardAnimatedStyle]}
              testID={`${testID}-phase-card`}
            >
              <View style={styles.cardHeader}>
                <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Ionicons name="locate" size={24} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>
                    {t('knownShiftPhase.cardTitle', {
                      defaultValue: 'This makes the dates exact',
                    })}
                  </Text>
                  <Text style={styles.cardBody}>
                    {t('knownShiftPhase.cardBody', {
                      defaultValue: 'Pick where that day sits inside your repeating pattern.',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.optionList}>
                {phaseOptions.map((option) => {
                  const selected = selectedOption?.sequenceIndex === option.sequenceIndex;
                  return (
                    <TouchableOpacity
                      key={option.sequenceIndex}
                      onPress={() => setSelectedOption(option)}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.optionButton, selected && styles.optionButtonSelected]}
                      testID={`${testID}-option-${option.sequenceIndex}`}
                    >
                      <LinearGradient
                        colors={
                          selected
                            ? [RYVRO_COLORS.cyan, RYVRO_COLORS.blue]
                            : [RYVRO_COLORS.panelStrong, RYVRO_COLORS.panel]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.optionGradient}
                      >
                        <View
                          style={[styles.optionNumber, selected && styles.optionNumberSelected]}
                        >
                          <Text
                            style={[
                              styles.optionNumberText,
                              selected && styles.optionNumberTextSelected,
                            ]}
                          >
                            {option.occurrence}
                          </Text>
                        </View>
                        <View style={styles.optionCopy}>
                          <Text
                            style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                          >
                            {option.label}
                          </Text>
                          <Text style={[styles.optionBody, selected && styles.optionBodySelected]}>
                            {option.body}
                          </Text>
                        </View>
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected ? (
                            <Ionicons name="checkmark" size={16} color={RYVRO_COLORS.cyan} />
                          ) : null}
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={t('knownShiftPhase.cta', { defaultValue: 'Use this exact day' })}
            onPress={handleContinue}
            disabled={!resolvedDraft || !selectedOption}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={<Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />}
            iconPosition="right"
            style={styles.primaryCtaButton}
            contentStyle={styles.primaryCtaButtonContent}
            textStyle={styles.primaryCtaText}
            titleNumberOfLines={1}
            accessibilityHint={t('knownShiftPhase.ctaHint', {
              defaultValue: 'Continue with this exact day in the pattern.',
            })}
            testID={`${testID}-button`}
          />

          <TouchableOpacity
            onPress={handleUnsure}
            activeOpacity={0.84}
            style={styles.unsureButton}
            accessibilityRole="button"
            accessibilityHint={
              anchorDate
                ? getExactPhaseUnsureHint(anchorDate)
                : 'Use the fix options if you do not know which one it was.'
            }
            testID={`${testID}-unsure-button`}
          >
            <Text style={styles.unsureButtonText}>
              {t('knownShiftPhase.unsure', { defaultValue: "I don't know" })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RYVRO_COLORS.void,
  },
  cyanGlow: {
    position: 'absolute',
    top: -96,
    left: -98,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 118,
    right: -128,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20, 124, 255, 0.15)',
  },
  goldGlow: {
    position: 'absolute',
    bottom: 10,
    left: -104,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(244, 184, 66, 0.11)',
  },
  orbit: {
    position: 'absolute',
    top: 170,
    alignSelf: 'center',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.12)',
    borderRightColor: 'rgba(244, 184, 66, 0.34)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.18)',
  },
  repairPill: {
    backgroundColor: 'rgba(20, 124, 255, 0.12)',
    borderColor: 'rgba(32, 244, 220, 0.34)',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RYVRO_COLORS.gold,
  },
  stepLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    fontWeight: '800',
  },
  stepCount: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  stepCountText: {
    color: RYVRO_COLORS.silver,
    fontSize: 15,
    fontWeight: '900',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 44,
  },
  headline: {
    color: '#f7fbff',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
    maxWidth: 340,
  },
  support: {
    marginTop: 18,
    color: RYVRO_COLORS.muted,
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 330,
  },
  cardEntry: {
    width: '100%',
  },
  phaseCard: {
    marginTop: 34,
    width: '100%',
    borderRadius: 32,
    padding: 18,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.22)',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: 32,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 5,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  badgeGradient: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
  },
  cardTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  cardBody: {
    marginTop: 4,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  optionList: {
    marginTop: 18,
    gap: 12,
  },
  optionButton: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.16)',
  },
  optionButtonSelected: {
    borderColor: 'rgba(32, 244, 220, 0.58)',
  },
  optionGradient: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
  },
  optionNumberSelected: {
    backgroundColor: 'rgba(2, 7, 11, 0.16)',
    borderColor: 'rgba(2, 7, 11, 0.16)',
  },
  optionNumberText: {
    color: RYVRO_COLORS.silver,
    fontSize: 21,
    fontWeight: '900',
  },
  optionNumberTextSelected: {
    color: RYVRO_COLORS.void,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  optionLabelSelected: {
    color: RYVRO_COLORS.void,
  },
  optionBody: {
    marginTop: 3,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  optionBodySelected: {
    color: 'rgba(2, 7, 11, 0.76)',
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(214, 231, 242, 0.3)',
  },
  radioSelected: {
    backgroundColor: RYVRO_COLORS.void,
    borderColor: RYVRO_COLORS.void,
  },
  bottomPanel: {
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
  },
  primaryCtaButton: {
    width: '100%',
    maxWidth: 560,
    minHeight: 72,
    borderRadius: 30,
    shadowColor: RYVRO_COLORS.blue,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: Platform.OS === 'ios' ? 0.22 : 0,
    shadowRadius: 28,
    elevation: 9,
  },
  primaryCtaButtonContent: {
    minHeight: 72,
    paddingHorizontal: 24,
  },
  primaryCtaText: {
    color: RYVRO_COLORS.void,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  unsureButton: {
    minHeight: 54,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsureButtonText: {
    color: RYVRO_COLORS.muted,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
  },
});
