/**
 * PremiumSchedulePreviewScreen Component
 *
 * Final accuracy check before Ryvro stores the schedule. Shows calculated
 * upcoming shifts and asks the user to confirm or fix the draft.
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
  OnboardingStackParamList,
  SchedulePreviewSetupParams,
} from '@/navigation/OnboardingNavigator';
import type { ShiftDay, UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getKnownDatePreviewSentence } from '@/utils/dateTenseUtils';
import {
  calculateUniversalShiftDay,
  calculateUniversalShiftRange,
} from '@/utils/universalShiftUtils';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'SchedulePreviewSetup'>;
type PreviewRoute = RouteProp<
  { SchedulePreviewSetup: SchedulePreviewSetupParams },
  'SchedulePreviewSetup'
>;

export interface PremiumSchedulePreviewScreenProps {
  /** Draft schedule for tests or previews */
  scheduleDraft?: UniversalShiftSchedule;
  /** Confirmation handler for tests */
  onConfirm?: (confirmedSchedule: UniversalShiftSchedule) => void | Promise<void>;
  /** Fix handler for tests */
  onFix?: (scheduleDraft: UniversalShiftSchedule) => void;
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
  error: '#ff8a80',
} as const;

function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatMonthDay(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parseDateStr(dateStr));
}

function formatWeekday(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  }).format(parseDateStr(dateStr));
}

function formatFullDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateStr(dateStr));
}

function stripShiftSuffix(name: string): string {
  return name.replace(/\s+shift$/i, '').trim();
}

function getShiftLabel(day: ShiftDay): string {
  if (day.universal?.definitionName) return stripShiftSuffix(day.universal.definitionName);
  if (day.shiftType === 'off') return 'Off';
  return day.shiftType.charAt(0).toUpperCase() + day.shiftType.slice(1);
}

function getShiftIcon(day: ShiftDay): keyof typeof Ionicons.glyphMap {
  if (day.universal?.icon && day.universal.icon in Ionicons.glyphMap) {
    return day.universal.icon as keyof typeof Ionicons.glyphMap;
  }
  if (day.isNightShift) return 'moon';
  if (!day.isWorkDay) return 'home';
  return 'sunny';
}

function getShiftColor(day: ShiftDay): string {
  return day.isWorkDay ? RYVRO_COLORS.cyan : RYVRO_COLORS.muted;
}

function buildPreviewDays(schedule: UniversalShiftSchedule): ShiftDay[] {
  const today = parseDateStr(toDateStr(new Date()));
  const end = addDays(today, 4);
  return calculateUniversalShiftRange(today, end, schedule);
}

function getDefinitionPhrase(
  definition: UniversalShiftSchedule['shiftDefinitions'][number],
  count: number
): string {
  const name = stripShiftSuffix(definition.name).toLowerCase();
  if (definition.kind === 'off' || !definition.countsAsWork || name.includes('off')) {
    return count === 1 ? 'day off' : 'days off';
  }
  if (definition.countsAsNight || name.includes('night')) {
    return count === 1 ? 'night shift' : 'night shifts';
  }
  if (name.includes('day') || definition.kind === 'work') {
    return count === 1 ? 'day shift' : 'day shifts';
  }

  return count === 1 ? name : `${name}s`;
}

function buildPatternSummary(schedule: UniversalShiftSchedule): string {
  const definitionById = new Map(
    schedule.shiftDefinitions.map((definition) => [definition.id, definition])
  );
  const runs: string[] = [];
  let currentDefinitionId: string | null = null;
  let currentCount = 0;

  const pushCurrentRun = () => {
    if (!currentDefinitionId || currentCount === 0) return;
    const definition = definitionById.get(currentDefinitionId);
    if (!definition) return;
    runs.push(`${currentCount} ${getDefinitionPhrase(definition, currentCount)}`);
  };

  schedule.sequence.forEach((item) => {
    if (item.shiftDefinitionId !== currentDefinitionId) {
      pushCurrentRun();
      currentDefinitionId = item.shiftDefinitionId;
      currentCount = 1;
      return;
    }

    currentCount += 1;
  });
  pushCurrentRun();

  if (runs.length === 0) return 'No pattern found yet.';
  if (runs.length === 1) return runs[0];
  if (runs.length === 2) return `${runs[0]}, then ${runs[1]}`;

  return `${runs.slice(0, -1).join(', ')}, then ${runs[runs.length - 1]}`;
}

export const PremiumSchedulePreviewScreen: React.FC<PremiumSchedulePreviewScreenProps> = ({
  scheduleDraft,
  onConfirm,
  onFix,
  flowContext = 'onboarding',
  testID = 'premium-schedule-preview-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PreviewRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const isSettingsFlow = flowContext === 'settings';
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const previewPulse = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('schedule_preview', 6);

    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
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
    previewPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cardFloat, contentOpacity, contentTranslateY, orbitRotation, previewPulse]);

  const previewDays = useMemo(
    () => (resolvedDraft ? buildPreviewDays(resolvedDraft) : []),
    [resolvedDraft]
  );

  const anchorDay = useMemo(
    () =>
      resolvedDraft?.anchorDate
        ? calculateUniversalShiftDay(parseDateStr(resolvedDraft.anchorDate), resolvedDraft)
        : null,
    [resolvedDraft]
  );
  const patternSummary = useMemo(
    () => (resolvedDraft ? buildPatternSummary(resolvedDraft) : ''),
    [resolvedDraft]
  );
  const cycleLength = resolvedDraft?.sequence.length ?? 0;
  const anchorShiftLabel = anchorDay ? getShiftLabel(anchorDay) : '';

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

  const previewPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: previewPulse.value }],
  }));

  const handleConfirm = async () => {
    if (!resolvedDraft || isSaving) return;

    setError(null);
    setIsSaving(true);
    const confirmedSchedule: UniversalShiftSchedule = {
      ...resolvedDraft,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (onConfirm) {
        await onConfirm(confirmedSchedule);
      } else {
        navigation.navigate('SetupSummary', { scheduleDraft: confirmedSchedule });
      }

      Analytics.onboardingStepCompleted('schedule_preview', Date.now() - mountTime.current, {
        preview_days: previewDays.length,
        schedule_source: confirmedSchedule.source,
        sequence_length: confirmedSchedule.sequence.length,
      });
    } catch {
      setError(
        t('schedulePreview.saveError', {
          defaultValue: 'Ryvro could not save this yet. Please try again.',
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFix = () => {
    if (!resolvedDraft) return;

    Analytics.track('schedule_preview_fix_requested', {
      schedule_source: resolvedDraft.source,
      sequence_length: resolvedDraft.sequence.length,
    });

    if (onFix) {
      onFix(resolvedDraft);
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
            paddingTop: Math.max(insets.top + (isSettingsFlow ? 36 : 22), isSettingsFlow ? 58 : 42),
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
                ? 'Check setup'
                : t('schedulePreview.stepLabel', { defaultValue: 'Preview' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="shield-checkmark" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>7</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {isSettingsFlow
              ? 'Check Ryvro’s answer setup.'
              : t('schedulePreview.headline', {
                  defaultValue: 'Here is what Ryvro understood.',
                })}
          </Text>
          <Text style={styles.support}>
            {isSettingsFlow
              ? 'If this looks right, save it. If not, fix one part.'
              : t('schedulePreview.support', {
                  defaultValue: 'Check this once before Ryvro answers your shift questions.',
                })}
          </Text>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.cardEntry}>
            <Animated.View
              style={[styles.previewCard, cardAnimatedStyle]}
              testID={`${testID}-preview-card`}
            >
              <View style={styles.cardHeader}>
                <Animated.View style={[styles.badge, previewPulseStyle]}>
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Ionicons name="calendar-clear" size={24} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>
                    {t('schedulePreview.cardTitle', {
                      defaultValue: 'Your shift setup',
                    })}
                  </Text>
                  <Text style={styles.cardBody}>
                    {t('schedulePreview.cardBody', {
                      defaultValue: 'If this is right, Ryvro can answer by voice.',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryList} testID={`${testID}-summary`}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { borderColor: 'rgba(32, 244, 220, 0.38)' }]}>
                    <Ionicons name="repeat" size={19} color={RYVRO_COLORS.cyan} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryLabel}>
                      {t('schedulePreview.repeatLabel', { defaultValue: 'Repeats every' })}
                    </Text>
                    <Text style={styles.summaryValue}>
                      {t('schedulePreview.repeatValue', {
                        defaultValue: '{{count}} days',
                        count: cycleLength,
                      })}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { borderColor: 'rgba(244, 184, 66, 0.44)' }]}>
                    <Ionicons name="list" size={19} color={RYVRO_COLORS.gold} />
                  </View>
                  <View style={styles.summaryCopy}>
                    <Text style={styles.summaryLabel}>
                      {t('schedulePreview.patternLabel', { defaultValue: 'Pattern' })}
                    </Text>
                    <Text style={styles.summaryValue}>{patternSummary}</Text>
                  </View>
                </View>

                {resolvedDraft?.anchorDate && anchorDay ? (
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryIcon, { borderColor: 'rgba(20, 124, 255, 0.44)' }]}>
                      <Ionicons name="locate" size={19} color={RYVRO_COLORS.cyan} />
                    </View>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.summaryLabel}>
                        {t('schedulePreview.knownDateLabel', { defaultValue: 'Known date' })}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {getKnownDatePreviewSentence(
                          resolvedDraft.anchorDate,
                          formatFullDate(resolvedDraft.anchorDate),
                          anchorShiftLabel
                        )}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.proofHeader}>
                <Text style={styles.proofTitle}>
                  {t('schedulePreview.proofTitle', { defaultValue: 'Next few days' })}
                </Text>
                <Text style={styles.proofBody}>
                  {t('schedulePreview.proofBody', {
                    defaultValue: 'A quick check that the dates line up.',
                  })}
                </Text>
              </View>

              <View style={styles.timeline} testID={`${testID}-timeline`}>
                {previewDays.map((day, index) => {
                  const shiftColor = getShiftColor(day);
                  const isToday = index === 0;
                  return (
                    <View
                      key={day.date}
                      style={[styles.dayRow, isToday && styles.dayRowToday]}
                      testID={`${testID}-day-${index}`}
                    >
                      <View style={styles.dateBlock}>
                        <Text style={styles.weekdayText}>
                          {isToday
                            ? t('schedulePreview.today', { defaultValue: 'Today' })
                            : formatWeekday(day.date)}
                        </Text>
                        <Text style={styles.dateText}>{formatMonthDay(day.date)}</Text>
                      </View>

                      <View style={styles.connectorColumn}>
                        <View style={[styles.timelineDot, { backgroundColor: shiftColor }]} />
                        {index < previewDays.length - 1 ? (
                          <View style={styles.timelineLine} />
                        ) : null}
                      </View>

                      <View style={styles.shiftBlock}>
                        <View style={[styles.shiftIcon, { borderColor: `${shiftColor}66` }]}>
                          <Ionicons name={getShiftIcon(day)} size={20} color={shiftColor} />
                        </View>
                        <View style={styles.shiftCopy}>
                          <Text style={styles.shiftLabel}>{getShiftLabel(day)}</Text>
                          <Text style={styles.shiftMeta}>{formatFullDate(day.date)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>

          {error ? (
            <Text style={styles.errorText} testID={`${testID}-error`}>
              {error}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={
              isSaving
                ? t('schedulePreview.saving', { defaultValue: 'Saving...' })
                : t('schedulePreview.confirm', { defaultValue: 'Yes, this is right' })
            }
            onPress={() => void handleConfirm()}
            disabled={!resolvedDraft || isSaving}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={<Ionicons name="checkmark-circle" size={28} color={RYVRO_COLORS.void} />}
            iconPosition="right"
            style={styles.primaryCtaButton}
            contentStyle={styles.primaryCtaButtonContent}
            textStyle={styles.primaryCtaText}
            titleNumberOfLines={1}
            accessibilityHint={t('schedulePreview.confirmHint', {
              defaultValue: 'Review this schedule and continue.',
            })}
            testID={`${testID}-confirm-button`}
          />

          <TouchableOpacity
            onPress={handleFix}
            disabled={!resolvedDraft || isSaving}
            activeOpacity={0.84}
            style={styles.fixButton}
            accessibilityRole="button"
            accessibilityHint={t('schedulePreview.fixHint', {
              defaultValue: 'Choose the setup step you want to fix.',
            })}
            testID={`${testID}-fix-button`}
          >
            <Ionicons name="create-outline" size={20} color={RYVRO_COLORS.silver} />
            <Text style={styles.fixButtonText}>
              {t('schedulePreview.fix', { defaultValue: 'Fix something' })}
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
    paddingTop: 42,
  },
  headline: {
    color: '#f7fbff',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
    maxWidth: 352,
  },
  support: {
    marginTop: 16,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 332,
  },
  cardEntry: {
    width: '100%',
  },
  previewCard: {
    marginTop: 30,
    width: '100%',
    borderRadius: 28,
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
  summaryList: {
    marginTop: 22,
    gap: 12,
  },
  summaryRow: {
    minHeight: 76,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(214, 231, 242, 0.065)',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 7, 11, 0.52)',
    borderWidth: 1,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  summaryValue: {
    marginTop: 3,
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  proofHeader: {
    marginTop: 24,
    alignItems: 'center',
  },
  proofTitle: {
    color: '#f7fbff',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  proofBody: {
    marginTop: 5,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  timeline: {
    marginTop: 18,
    gap: 0,
  },
  dayRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dayRowToday: {
    borderRadius: 24,
    backgroundColor: 'rgba(32, 244, 220, 0.07)',
  },
  dateBlock: {
    width: 70,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  weekdayText: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  dateText: {
    marginTop: 2,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  connectorColumn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 26,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 5,
    backgroundColor: 'rgba(214, 231, 242, 0.16)',
  },
  shiftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 10,
  },
  shiftIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
  },
  shiftCopy: {
    flex: 1,
  },
  shiftLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
  },
  shiftMeta: {
    marginTop: 2,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 14,
    color: RYVRO_COLORS.error,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomPanel: {
    marginTop: 26,
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
  fixButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 22,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.18)',
  },
  fixButtonText: {
    color: RYVRO_COLORS.silver,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
});
