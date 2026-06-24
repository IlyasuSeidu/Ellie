/**
 * PremiumKnownShiftTypeScreen Component
 *
 * Accuracy checkpoint. The user chooses what shift happened on the known date
 * so Ryvro can line up the repeating pattern before saving.
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
  KnownShiftTypeSetupParams,
  OnboardingStackParamList,
} from '@/navigation/OnboardingNavigator';
import { Analytics } from '@/utils/analytics';
import {
  getKnownOffChoiceBody,
  getKnownShiftQuestion,
  getKnownShiftSupport,
  getKnownWorkChoiceBody,
} from '@/utils/dateTenseUtils';
import type { UniversalShiftSchedule } from '@/types';
import {
  buildScheduleWithExactPhase,
  getKnownShiftPhaseOptions,
  type KnownShiftChoice,
} from '@/utils/knownShiftPhase';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'KnownShiftTypeSetup'>;
type KnownShiftRoute = RouteProp<
  { KnownShiftTypeSetup: KnownShiftTypeSetupParams },
  'KnownShiftTypeSetup'
>;

export interface PremiumKnownShiftTypeScreenProps {
  /** Draft schedule for tests or previews */
  scheduleDraft?: UniversalShiftSchedule;
  /** Navigation handler for tests */
  onContinue?: (
    scheduleWithKnownShift: UniversalShiftSchedule,
    selectedShift: KnownShiftChoice
  ) => void;
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

export const PremiumKnownShiftTypeScreen: React.FC<PremiumKnownShiftTypeScreenProps> = ({
  scheduleDraft,
  onContinue,
  flowContext = 'onboarding',
  testID = 'premium-known-shift-type-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<KnownShiftRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const [selectedChoice, setSelectedChoice] = useState<KnownShiftChoice | null>(null);
  const isSettingsFlow = flowContext === 'settings';

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const checkPulse = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('known_shift_type', 5);

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
    checkPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1150, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cardFloat, checkPulse, contentOpacity, contentTranslateY, orbitRotation]);

  const anchorDate = resolvedDraft?.anchorDate ?? '';
  const displayDate = useMemo(
    () => (anchorDate ? formatDisplayDate(anchorDate) : ''),
    [anchorDate]
  );

  const options = useMemo(
    () => [
      {
        id: 'day' as const,
        label: t('knownShiftType.day', { defaultValue: 'Day' }),
        body: anchorDate ? getKnownWorkChoiceBody(anchorDate, 'day') : 'I worked a day shift',
        icon: 'sunny' as const,
        colors: [RYVRO_COLORS.cyan, RYVRO_COLORS.blue] as const,
      },
      {
        id: 'night' as const,
        label: t('knownShiftType.night', { defaultValue: 'Night' }),
        body: anchorDate ? getKnownWorkChoiceBody(anchorDate, 'night') : 'I worked a night shift',
        icon: 'moon' as const,
        colors: [RYVRO_COLORS.blue, '#6cc7ff'] as const,
      },
      {
        id: 'off' as const,
        label: t('knownShiftType.off', { defaultValue: 'Off' }),
        body: anchorDate ? getKnownOffChoiceBody(anchorDate) : 'Not working',
        icon: 'home' as const,
        colors: [RYVRO_COLORS.gold, RYVRO_COLORS.cyan] as const,
      },
      {
        id: 'other' as const,
        label: t('knownShiftType.other', { defaultValue: 'Other' }),
        body: t('knownShiftType.otherBody', { defaultValue: 'Something different' }),
        icon: 'ellipsis-horizontal' as const,
        colors: [RYVRO_COLORS.silver, '#7fb6d6'] as const,
      },
    ],
    [anchorDate, t]
  );

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

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkPulse.value }],
  }));

  const handleContinue = () => {
    if (!resolvedDraft || !selectedChoice) return;

    const phaseOptions = getKnownShiftPhaseOptions(resolvedDraft, selectedChoice);
    const scheduleWithKnownShift =
      phaseOptions.length === 1
        ? buildScheduleWithExactPhase(resolvedDraft, phaseOptions[0].sequenceIndex)
        : resolvedDraft;

    Analytics.onboardingStepCompleted('known_shift_type', Date.now() - mountTime.current, {
      selected_shift: selectedChoice,
      anchor_date: resolvedDraft.anchorDate,
      matching_phase_count: phaseOptions.length,
      phase_offset: phaseOptions.length === 1 ? scheduleWithKnownShift.phaseOffset : null,
    });

    if (onContinue) {
      onContinue(scheduleWithKnownShift, selectedChoice);
    } else if (phaseOptions.length > 1) {
      navigation.navigate('KnownShiftPhaseSetup', {
        scheduleDraft: resolvedDraft,
        selectedShift: selectedChoice,
      });
    } else {
      navigation.navigate('SchedulePreviewSetup', {
        scheduleDraft: scheduleWithKnownShift,
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
                ? 'Fix known shift'
                : t('knownShiftType.stepLabel', { defaultValue: 'Known shift' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="checkmark-circle" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>5</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {anchorDate ? getKnownShiftQuestion(anchorDate) : 'What shift is on that date?'}
          </Text>
          <Text style={styles.support}>
            {anchorDate
              ? getKnownShiftSupport(anchorDate, displayDate)
              : `Choose the correct shift for ${displayDate}.`}
          </Text>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.cardEntry}>
            <Animated.View
              style={[styles.shiftCard, cardAnimatedStyle]}
              testID={`${testID}-shift-card`}
            >
              <View style={styles.cardHeader}>
                <Animated.View style={[styles.badge, checkAnimatedStyle]}>
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Ionicons name="checkmark" size={24} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>
                    {t('knownShiftType.cardTitle', {
                      defaultValue: 'This lines up the whole pattern',
                    })}
                  </Text>
                  <Text style={styles.cardBody}>
                    {t('knownShiftType.cardBody', {
                      defaultValue: 'Ryvro uses this answer to place your pattern correctly.',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.dateChip}>
                <Ionicons name="calendar-clear" size={17} color={RYVRO_COLORS.gold} />
                <Text style={styles.dateChipText}>{displayDate}</Text>
              </View>

              <View style={styles.optionList}>
                {options.map((option) => {
                  const selected = selectedChoice === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setSelectedChoice(option.id)}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.optionButton, selected && styles.optionButtonSelected]}
                      testID={`${testID}-option-${option.id}`}
                    >
                      <LinearGradient
                        colors={
                          selected ? option.colors : ['rgba(13, 34, 48, 0.96)', RYVRO_COLORS.panel]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.optionGradient}
                      >
                        <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                          <Ionicons
                            name={option.icon}
                            size={24}
                            color={selected ? RYVRO_COLORS.void : RYVRO_COLORS.silver}
                          />
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
            title={t('knownShiftType.cta', { defaultValue: 'Use this shift' })}
            onPress={handleContinue}
            disabled={!resolvedDraft || !selectedChoice}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={<Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />}
            iconPosition="right"
            style={styles.primaryCtaButton}
            contentStyle={styles.primaryCtaButtonContent}
            textStyle={styles.primaryCtaText}
            titleNumberOfLines={1}
            accessibilityHint={t('knownShiftType.ctaHint', {
              defaultValue: 'Continue with this known shift.',
            })}
            testID={`${testID}-button`}
          />
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
  shiftCard: {
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
  dateChip: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(244, 184, 66, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(244, 184, 66, 0.18)',
  },
  dateChipText: {
    flexShrink: 1,
    color: RYVRO_COLORS.silver,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
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
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
  },
  optionIconSelected: {
    backgroundColor: 'rgba(2, 7, 11, 0.16)',
    borderColor: 'rgba(2, 7, 11, 0.16)',
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 22,
    lineHeight: 27,
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
});
