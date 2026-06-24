/**
 * PremiumKnownShiftDateScreen Component
 *
 * Accuracy anchor screen. The user chooses one date where they know exactly
 * what shift they had.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  Easing,
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
  KnownShiftDateSetupParams,
  OnboardingStackParamList,
} from '@/navigation/OnboardingNavigator';
import { Analytics } from '@/utils/analytics';
import type { UniversalShiftSchedule } from '@/types';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'KnownShiftDateSetup'>;
type KnownDateRoute = RouteProp<
  { KnownShiftDateSetup: KnownShiftDateSetupParams },
  'KnownShiftDateSetup'
>;

export interface PremiumKnownShiftDateScreenProps {
  /** Draft schedule for tests or previews */
  scheduleDraft?: UniversalShiftSchedule;
  /** Navigation handler for tests */
  onContinue?: (scheduleWithKnownDate: UniversalShiftSchedule) => void;
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

function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayStr(): string {
  return toDateStr(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  return toDateStr(date);
}

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

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parseDateStr(dateStr));
}

export const PremiumKnownShiftDateScreen: React.FC<PremiumKnownShiftDateScreenProps> = ({
  scheduleDraft,
  onContinue,
  flowContext = 'onboarding',
  testID = 'premium-known-shift-date-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<KnownDateRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const [selectedDate, setSelectedDate] = useState(resolvedDraft?.anchorDate ?? todayStr());
  const isSettingsFlow = flowContext === 'settings';

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('known_shift_date', 4);

    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 11000, easing: Easing.linear }),
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
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [badgePulse, cardFloat, contentOpacity, contentTranslateY, orbitRotation]);

  const datePresets = useMemo(() => {
    const today = todayStr();
    return [
      { label: t('knownShiftDate.today', { defaultValue: 'Today' }), value: today },
      {
        label: t('knownShiftDate.yesterday', { defaultValue: 'Yesterday' }),
        value: addDays(today, -1),
      },
      {
        label: t('knownShiftDate.twoDaysAgo', { defaultValue: '2 days ago' }),
        value: addDays(today, -2),
      },
    ];
  }, [t]);

  const selectedDisplayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const handleContinue = () => {
    if (!resolvedDraft) return;

    const scheduleWithKnownDate: UniversalShiftSchedule = {
      ...resolvedDraft,
      anchorDate: selectedDate,
      updatedAt: new Date().toISOString(),
    };

    Analytics.onboardingStepCompleted('known_shift_date', Date.now() - mountTime.current, {
      selected_date: selectedDate,
    });

    if (onContinue) {
      onContinue(scheduleWithKnownDate);
    } else {
      navigation.navigate('KnownShiftTypeSetup', {
        scheduleDraft: scheduleWithKnownDate,
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
                ? 'Fix known date'
                : t('knownShiftDate.stepLabel', { defaultValue: 'Known date' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="calendar-clear" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>4</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {isSettingsFlow
              ? 'Pick the date you know for sure.'
              : t('knownShiftDate.headline', { defaultValue: 'Pick one date you know.' })}
          </Text>
          <Text style={styles.support}>
            {isSettingsFlow
              ? 'This date tells Ryvro where your repeating pattern really starts.'
              : t('knownShiftDate.support', {
                  defaultValue: 'Choose a date where you are sure what shift you had.',
                })}
          </Text>

          <Animated.View entering={FadeInDown.delay(240).duration(420)} style={styles.cardEntry}>
            <Animated.View
              style={[styles.dateCard, cardAnimatedStyle]}
              testID={`${testID}-date-card`}
            >
              <View style={styles.cardHeader}>
                <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Ionicons name="calendar-clear" size={22} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>
                    {t('knownShiftDate.cardTitle', {
                      defaultValue: 'This date anchors your pattern',
                    })}
                  </Text>
                  <Text style={styles.cardBody}>
                    {t('knownShiftDate.cardBody', {
                      defaultValue: 'Ryvro will line up the pattern from this exact day.',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.presetRow}>
                {datePresets.map((preset) => {
                  const selected = selectedDate === preset.value;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => setSelectedDate(preset.value)}
                      activeOpacity={0.86}
                      style={[styles.presetButton, selected && styles.presetButtonSelected]}
                      testID={`${testID}-preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          selected && styles.presetButtonTextSelected,
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <Text style={styles.presetDateText}>{formatShortDate(preset.value)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.selectedDatePanel}>
                <Text style={styles.selectedLabel}>
                  {t('knownShiftDate.selectedLabel', { defaultValue: 'Date you know' })}
                </Text>
                <Text style={styles.selectedDateText}>{selectedDisplayDate}</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => setSelectedDate((value) => addDays(value, -1))}
                    style={styles.stepperButton}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    testID={`${testID}-previous-day`}
                  >
                    <Ionicons name="chevron-back" size={21} color={RYVRO_COLORS.silver} />
                    <Text style={styles.stepperText}>
                      {t('knownShiftDate.previousDay', { defaultValue: 'Previous day' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedDate((value) => addDays(value, 1))}
                    style={styles.stepperButton}
                    activeOpacity={0.86}
                    accessibilityRole="button"
                    testID={`${testID}-next-day`}
                  >
                    <Text style={styles.stepperText}>
                      {t('knownShiftDate.nextDay', { defaultValue: 'Next day' })}
                    </Text>
                    <Ionicons name="chevron-forward" size={21} color={RYVRO_COLORS.silver} />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={t('knownShiftDate.cta', { defaultValue: 'I know this date' })}
            onPress={handleContinue}
            disabled={!resolvedDraft}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={<Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />}
            iconPosition="right"
            style={styles.primaryCtaButton}
            contentStyle={styles.primaryCtaButtonContent}
            textStyle={styles.primaryCtaText}
            titleNumberOfLines={1}
            accessibilityHint={t('knownShiftDate.ctaHint', {
              defaultValue: 'Continue with this known date.',
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
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  repairPill: {
    backgroundColor: 'rgba(20, 124, 255, 0.12)',
    borderColor: 'rgba(32, 244, 220, 0.34)',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RYVRO_COLORS.cyan,
  },
  stepLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  stepCount: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 184, 66, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 184, 66, 0.28)',
  },
  stepCountText: {
    color: RYVRO_COLORS.gold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 34,
    paddingBottom: 28,
  },
  cardEntry: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  headline: {
    maxWidth: 350,
    color: '#f6fbff',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  support: {
    maxWidth: 340,
    marginTop: 16,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  dateCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 34,
    padding: 20,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.42,
        shadowRadius: 34,
      },
      android: {
        elevation: 10,
      },
    }),
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
    padding: 4,
    backgroundColor: 'rgba(32, 244, 220, 0.11)',
  },
  badgeGradient: {
    flex: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    letterSpacing: 0,
  },
  cardBody: {
    marginTop: 4,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  presetButton: {
    flex: 1,
    minHeight: 68,
    borderRadius: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 7, 11, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.14)',
  },
  presetButtonSelected: {
    backgroundColor: 'rgba(32, 244, 220, 0.12)',
    borderColor: 'rgba(32, 244, 220, 0.35)',
  },
  presetButtonText: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  presetButtonTextSelected: {
    color: '#ffffff',
  },
  presetDateText: {
    marginTop: 4,
    color: RYVRO_COLORS.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  selectedDatePanel: {
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  selectedLabel: {
    color: RYVRO_COLORS.cyan,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  selectedDateText: {
    marginTop: 7,
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  stepperButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(191, 231, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.14)',
  },
  stepperText: {
    color: RYVRO_COLORS.silver,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bottomPanel: {
    paddingTop: 2,
  },
  primaryCtaButton: {
    width: '100%',
    height: 76,
  },
  primaryCtaButtonContent: {
    height: 76,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  primaryCtaText: {
    color: RYVRO_COLORS.void,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
