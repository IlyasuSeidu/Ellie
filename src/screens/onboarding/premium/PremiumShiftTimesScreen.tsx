/**
 * PremiumShiftTimesScreen Component
 *
 * A simple time setup step for the grandma onboarding path. It keeps the
 * universal schedule model, but asks only for plain start and finish times.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { PremiumButton } from '@/components/onboarding/premium';
import type {
  OnboardingStackParamList,
  ShiftTimesSetupParams,
} from '@/navigation/OnboardingNavigator';
import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ShiftTimesSetup'>;
type ShiftTimesRoute = RouteProp<{ ShiftTimesSetup: ShiftTimesSetupParams }, 'ShiftTimesSetup'>;

type Period = 'AM' | 'PM';

type AmPmTimeDraft = {
  hour: string;
  minute: string;
  period: Period;
};

type ShiftTimeDraft = {
  startTime: AmPmTimeDraft;
  endTime: AmPmTimeDraft;
  noSetTime: boolean;
};

export interface PremiumShiftTimesScreenProps {
  scheduleDraft?: UniversalShiftSchedule;
  returnTo?: ShiftTimesSetupParams['returnTo'];
  onContinue?: (scheduleDraft: UniversalShiftSchedule) => void;
  flowContext?: 'onboarding' | 'settings';
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

function cleanHourInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function cleanMinuteInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2);
}

function from24HourTime(value: string): AmPmTimeDraft {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return { hour: '7', minute: '00', period: 'AM' };

  const hour24 = Number(match[1]);
  const period: Period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    hour: String(hour12),
    minute: match[2],
    period,
  };
}

function parseAmPmTimeMinutes(value: AmPmTimeDraft): number | null {
  const hour = Number(value.hour);
  const minute = Number(value.minute);

  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const hour24 = value.period === 'AM' ? hour % 12 : (hour % 12) + 12;
  return hour24 * 60 + minute;
}

function to24HourTime(value: AmPmTimeDraft): string | null {
  const minutes = parseAmPmTimeMinutes(value);
  if (minutes === null) return null;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function stripShiftSuffix(name: string): string {
  return name.replace(/\s+shift$/i, '').trim();
}

function isTimedWorkDefinition(definition: UniversalShiftDefinition): boolean {
  const name = definition.name.toLowerCase();
  if (definition.kind === 'off' || definition.kind === 'leave') return false;
  if (definition.countsAsWork) return true;
  return name.includes('day') || name.includes('night') || name.includes('work');
}

function getDefaultTimes(definition: UniversalShiftDefinition): ShiftTimeDraft {
  const name = definition.name.toLowerCase();
  if (definition.startTime && definition.endTime) {
    return {
      startTime: from24HourTime(definition.startTime),
      endTime: from24HourTime(definition.endTime),
      noSetTime: definition.timePolicy !== 'timed',
    };
  }

  if (definition.countsAsNight || name.includes('night')) {
    return {
      startTime: from24HourTime('19:00'),
      endTime: from24HourTime('07:00'),
      noSetTime: false,
    };
  }

  return {
    startTime: from24HourTime('07:00'),
    endTime: from24HourTime('19:00'),
    noSetTime: false,
  };
}

function buildTimedSchedule(
  schedule: UniversalShiftSchedule,
  drafts: Record<string, ShiftTimeDraft>
): UniversalShiftSchedule {
  return {
    ...schedule,
    updatedAt: new Date().toISOString(),
    shiftDefinitions: schedule.shiftDefinitions.map((definition) => {
      const draft = drafts[definition.id];
      if (!draft) return definition;

      if (draft.noSetTime) {
        return {
          ...definition,
          timePolicy: 'none',
          activePolicy: 'not_active',
          startTime: undefined,
          endTime: undefined,
          crossesMidnight: false,
        };
      }

      const startTime = to24HourTime(draft.startTime) ?? '00:00';
      const endTime = to24HourTime(draft.endTime) ?? '00:00';
      const startMinutes = parseAmPmTimeMinutes(draft.startTime) ?? 0;
      const endMinutes = parseAmPmTimeMinutes(draft.endTime) ?? 0;
      const crossesMidnight = endMinutes <= startMinutes;

      return {
        ...definition,
        timePolicy: 'timed',
        activePolicy: 'timed_window',
        startTime,
        endTime,
        crossesMidnight,
        countsAsNight:
          definition.countsAsNight ||
          definition.name.toLowerCase().includes('night') ||
          startMinutes >= 18 * 60 ||
          crossesMidnight,
      };
    }),
  };
}

export const PremiumShiftTimesScreen: React.FC<PremiumShiftTimesScreenProps> = ({
  scheduleDraft,
  returnTo,
  onContinue,
  flowContext = 'onboarding',
  testID = 'premium-shift-times-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ShiftTimesRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const resolvedReturnTo = returnTo ?? route.params?.returnTo ?? 'KnownShiftDateSetup';
  const isSettingsFlow = flowContext === 'settings';

  const timedDefinitions = useMemo(
    () => resolvedDraft?.shiftDefinitions.filter(isTimedWorkDefinition) ?? [],
    [resolvedDraft]
  );

  const [drafts, setDrafts] = useState<Record<string, ShiftTimeDraft>>(() => {
    const next: Record<string, ShiftTimeDraft> = {};
    timedDefinitions.forEach((definition) => {
      next[definition.id] = getDefaultTimes(definition);
    });
    return next;
  });
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('shift_times', 4);
    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 11000, easing: Easing.linear }),
      -1,
      false
    );
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cardFloat, contentOpacity, contentTranslateY, orbitRotation]);

  useEffect(() => {
    const next: Record<string, ShiftTimeDraft> = {};
    timedDefinitions.forEach((definition) => {
      next[definition.id] = drafts[definition.id] ?? getDefaultTimes(definition);
    });
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedDefinitions]);

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

  const updateDraft = (definitionId: string, patch: Partial<ShiftTimeDraft>) => {
    setDrafts((current) => ({
      ...current,
      [definitionId]: {
        ...current[definitionId],
        ...patch,
      },
    }));
    setError(null);
  };

  const handleContinue = () => {
    if (!resolvedDraft) return;

    for (const definition of timedDefinitions) {
      const draft = drafts[definition.id];
      if (!draft || draft.noSetTime) continue;

      if (
        parseAmPmTimeMinutes(draft.startTime) === null ||
        parseAmPmTimeMinutes(draft.endTime) === null
      ) {
        setError('Please enter a normal time, like 7:00 AM or 7:00 PM.');
        return;
      }
    }

    const nextSchedule = buildTimedSchedule(resolvedDraft, drafts);

    Analytics.onboardingStepCompleted('shift_times', Date.now() - mountTime.current, {
      timed_shift_count: timedDefinitions.length,
      return_to: resolvedReturnTo,
    });

    if (onContinue) {
      onContinue(nextSchedule);
      return;
    }

    navigation.navigate(resolvedReturnTo, { scheduleDraft: nextSchedule });
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
            <Text style={styles.stepLabel}>{isSettingsFlow ? 'Fix times' : 'Shift times'}</Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="time" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>4</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {isSettingsFlow
              ? 'Check your shift times.'
              : 'What time do your work shifts start and finish?'}
          </Text>
          <Text style={styles.support}>
            {isSettingsFlow
              ? 'Use AM and PM. Ryvro will use these times in voice answers and reminders.'
              : 'This helps Ryvro answer clearly and remind you before work.'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.cardEntry}>
          <Animated.View style={[styles.timeCard, cardAnimatedStyle]}>
            {timedDefinitions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle" size={30} color={RYVRO_COLORS.cyan} />
                <Text style={styles.emptyTitle}>No work shift times needed.</Text>
                <Text style={styles.emptyBody}>Your pattern only has rest days or open days.</Text>
              </View>
            ) : (
              timedDefinitions.map((definition) => {
                const draft = drafts[definition.id] ?? getDefaultTimes(definition);
                const title = stripShiftSuffix(definition.name);
                return (
                  <View key={definition.id} style={styles.shiftBlock}>
                    <View style={styles.shiftHeader}>
                      <View style={styles.shiftIcon}>
                        <Ionicons
                          name={(definition.icon as keyof typeof Ionicons.glyphMap) || 'time'}
                          size={21}
                          color={RYVRO_COLORS.cyan}
                        />
                      </View>
                      <Text style={styles.shiftTitle}>{title}</Text>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Starts</Text>
                        <View style={[styles.ampmInput, draft.noSetTime && styles.disabledInput]}>
                          <TextInput
                            value={draft.startTime.hour}
                            onChangeText={(value) =>
                              updateDraft(definition.id, {
                                startTime: {
                                  ...draft.startTime,
                                  hour: cleanHourInput(value),
                                },
                                noSetTime: false,
                              })
                            }
                            editable={!draft.noSetTime}
                            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                            placeholder="7"
                            placeholderTextColor="rgba(157, 178, 194, 0.55)"
                            style={styles.hourInput}
                            testID={`${testID}-${definition.id}-start-hour-input`}
                          />
                          <Text style={styles.timeColon}>:</Text>
                          <TextInput
                            value={draft.startTime.minute}
                            onChangeText={(value) =>
                              updateDraft(definition.id, {
                                startTime: {
                                  ...draft.startTime,
                                  minute: cleanMinuteInput(value),
                                },
                                noSetTime: false,
                              })
                            }
                            editable={!draft.noSetTime}
                            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                            placeholder="00"
                            placeholderTextColor="rgba(157, 178, 194, 0.55)"
                            style={styles.minuteInput}
                            testID={`${testID}-${definition.id}-start-minute-input`}
                          />
                        </View>
                        <View style={styles.periodRow}>
                          {(['AM', 'PM'] as const).map((period) => (
                            <TouchableOpacity
                              key={period}
                              style={[
                                styles.periodButton,
                                draft.startTime.period === period && styles.periodButtonSelected,
                              ]}
                              onPress={() =>
                                updateDraft(definition.id, {
                                  startTime: { ...draft.startTime, period },
                                  noSetTime: false,
                                })
                              }
                              activeOpacity={0.84}
                              testID={`${testID}-${definition.id}-start-${period.toLowerCase()}-button`}
                            >
                              <Text
                                style={[
                                  styles.periodText,
                                  draft.startTime.period === period && styles.periodTextSelected,
                                ]}
                              >
                                {period}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Finishes</Text>
                        <View style={[styles.ampmInput, draft.noSetTime && styles.disabledInput]}>
                          <TextInput
                            value={draft.endTime.hour}
                            onChangeText={(value) =>
                              updateDraft(definition.id, {
                                endTime: {
                                  ...draft.endTime,
                                  hour: cleanHourInput(value),
                                },
                                noSetTime: false,
                              })
                            }
                            editable={!draft.noSetTime}
                            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                            placeholder="7"
                            placeholderTextColor="rgba(157, 178, 194, 0.55)"
                            style={styles.hourInput}
                            testID={`${testID}-${definition.id}-end-hour-input`}
                          />
                          <Text style={styles.timeColon}>:</Text>
                          <TextInput
                            value={draft.endTime.minute}
                            onChangeText={(value) =>
                              updateDraft(definition.id, {
                                endTime: {
                                  ...draft.endTime,
                                  minute: cleanMinuteInput(value),
                                },
                                noSetTime: false,
                              })
                            }
                            editable={!draft.noSetTime}
                            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                            placeholder="00"
                            placeholderTextColor="rgba(157, 178, 194, 0.55)"
                            style={styles.minuteInput}
                            testID={`${testID}-${definition.id}-end-minute-input`}
                          />
                        </View>
                        <View style={styles.periodRow}>
                          {(['AM', 'PM'] as const).map((period) => (
                            <TouchableOpacity
                              key={period}
                              style={[
                                styles.periodButton,
                                draft.endTime.period === period && styles.periodButtonSelected,
                              ]}
                              onPress={() =>
                                updateDraft(definition.id, {
                                  endTime: { ...draft.endTime, period },
                                  noSetTime: false,
                                })
                              }
                              activeOpacity={0.84}
                              testID={`${testID}-${definition.id}-end-${period.toLowerCase()}-button`}
                            >
                              <Text
                                style={[
                                  styles.periodText,
                                  draft.endTime.period === period && styles.periodTextSelected,
                                ]}
                              >
                                {period}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </Animated.View>
        </Animated.View>

        {error ? (
          <Text style={styles.errorText} testID={`${testID}-error`}>
            {error}
          </Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title="Continue"
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
            testID={`${testID}-continue-button`}
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
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.25)',
    backgroundColor: 'rgba(8, 22, 31, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
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
    fontSize: 14,
    fontWeight: '800',
  },
  stepCount: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  stepCountText: {
    color: RYVRO_COLORS.silver,
    fontSize: 16,
    fontWeight: '900',
  },
  hero: {
    paddingTop: 32,
    alignItems: 'center',
  },
  headline: {
    color: '#f7fbff',
    fontSize: 35,
    lineHeight: 41,
    fontWeight: '900',
    textAlign: 'center',
  },
  support: {
    marginTop: 14,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardEntry: {
    marginTop: 28,
  },
  timeCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    backgroundColor: RYVRO_COLORS.panel,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  emptyTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 19,
    fontWeight: '900',
  },
  emptyBody: {
    color: RYVRO_COLORS.muted,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  shiftBlock: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 231, 255, 0.12)',
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
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
  shiftTitle: {
    flex: 1,
    color: RYVRO_COLORS.silver,
    fontSize: 21,
    fontWeight: '900',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  ampmInput: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.2)',
    backgroundColor: 'rgba(2, 7, 11, 0.52)',
    paddingHorizontal: 10,
  },
  hourInput: {
    width: 44,
    color: RYVRO_COLORS.silver,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },
  minuteInput: {
    width: 48,
    color: RYVRO_COLORS.silver,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 0,
  },
  timeColon: {
    color: RYVRO_COLORS.muted,
    fontSize: 24,
    fontWeight: '900',
    paddingBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  periodButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.16)',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    borderColor: 'rgba(32, 244, 220, 0.45)',
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
  },
  periodText: {
    color: RYVRO_COLORS.muted,
    fontSize: 15,
    fontWeight: '900',
  },
  periodTextSelected: {
    color: RYVRO_COLORS.cyan,
  },
  timeInput: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.2)',
    backgroundColor: 'rgba(2, 7, 11, 0.52)',
    color: RYVRO_COLORS.silver,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  disabledInput: {
    opacity: 0.45,
  },
  errorText: {
    marginTop: 14,
    color: RYVRO_COLORS.error,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomPanel: {
    marginTop: 28,
  },
  primaryCtaButton: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    minHeight: 82,
    borderRadius: 28,
  },
  primaryCtaButtonContent: {
    minHeight: 82,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryCtaText: {
    color: RYVRO_COLORS.void,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    textAlign: 'center',
  },
});
