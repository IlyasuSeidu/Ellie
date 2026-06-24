/**
 * PremiumSetupSummaryScreen Component
 *
 * Final plain English review before the schedule is saved.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { useOnboarding } from '@/contexts/OnboardingContext';
import type {
  OnboardingStackParamList,
  SetupSummaryParams,
} from '@/navigation/OnboardingNavigator';
import type { ShiftDay, UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getDateStateVerb } from '@/utils/dateTenseUtils';
import { formatShiftTime } from '@/utils/profileUtils';
import { calculateUniversalShiftDay } from '@/utils/universalShiftUtils';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'SetupSummary'>;
type SummaryRoute = RouteProp<{ SetupSummary: SetupSummaryParams }, 'SetupSummary'>;

export interface PremiumSetupSummaryScreenProps {
  scheduleDraft?: UniversalShiftSchedule;
  onContinue?: (scheduleDraft: UniversalShiftSchedule) => void | Promise<void>;
  onFix?: (scheduleDraft: UniversalShiftSchedule) => void;
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

function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
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

function buildTimesSummary(schedule: UniversalShiftSchedule): string {
  const timed = schedule.shiftDefinitions.filter(
    (definition) => definition.countsAsWork && definition.kind !== 'off'
  );

  if (timed.length === 0) return 'No work shift times.';

  return timed
    .map((definition) => {
      const name = stripShiftSuffix(definition.name);
      if (definition.timePolicy !== 'timed' || !definition.startTime || !definition.endTime) {
        return `${name}: no set time`;
      }

      return `${name}: ${formatShiftTime(definition.startTime)} to ${formatShiftTime(
        definition.endTime
      )}`;
    })
    .join('\n');
}

export const PremiumSetupSummaryScreen: React.FC<PremiumSetupSummaryScreenProps> = ({
  scheduleDraft,
  onContinue,
  onFix,
  testID = 'premium-setup-summary-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SummaryRoute>();
  const { updateDataAsync } = useOnboarding();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('setup_summary', 9);
    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
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

  const patternSummary = useMemo(
    () => (resolvedDraft ? buildPatternSummary(resolvedDraft) : ''),
    [resolvedDraft]
  );
  const timesSummary = useMemo(
    () => (resolvedDraft ? buildTimesSummary(resolvedDraft) : ''),
    [resolvedDraft]
  );
  const anchorText = useMemo(() => {
    if (!resolvedDraft?.anchorDate) return 'No known date yet.';
    const day = calculateUniversalShiftDay(parseDateStr(resolvedDraft.anchorDate), resolvedDraft);
    return `${formatFullDate(resolvedDraft.anchorDate)} ${getDateStateVerb(
      resolvedDraft.anchorDate
    )} ${getShiftLabel(day)}.`;
  }, [resolvedDraft]);

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

  const handleSave = async () => {
    if (!resolvedDraft || isSaving) return;

    setError(null);
    setIsSaving(true);
    const scheduleToSave: UniversalShiftSchedule = {
      ...resolvedDraft,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (onContinue) {
        await onContinue(scheduleToSave);
      } else {
        await updateDataAsync({ universalSchedule: scheduleToSave });
        navigation.navigate('ReminderSetup', { scheduleDraft: scheduleToSave });
      }

      Analytics.onboardingStepCompleted('setup_summary', Date.now() - mountTime.current, {
        sequence_length: scheduleToSave.sequence.length,
        shift_definition_count: scheduleToSave.shiftDefinitions.length,
      });
    } catch {
      setError('Ryvro could not save this yet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFix = () => {
    if (!resolvedDraft) return;

    if (onFix) {
      onFix(resolvedDraft);
      return;
    }

    navigation.navigate('FixMenuSetup', { scheduleDraft: resolvedDraft });
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
          <View style={styles.stepPill}>
            <View style={styles.stepDot} />
            <Text style={styles.stepLabel}>Final check</Text>
          </View>
          <View style={styles.stepCount}>
            <Ionicons name="shield-checkmark" size={19} color={RYVRO_COLORS.silver} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>Check your shift setup.</Text>
          <Text style={styles.support}>
            If this is right, Ryvro can answer your voice questions.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.cardEntry}>
          <Animated.View style={[styles.summaryCard, cardAnimatedStyle]}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { borderColor: 'rgba(32, 244, 220, 0.38)' }]}>
                <Ionicons name="repeat" size={20} color={RYVRO_COLORS.cyan} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>Your repeating pattern</Text>
                <Text style={styles.summaryValue}>{patternSummary}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { borderColor: 'rgba(244, 184, 66, 0.44)' }]}>
                <Ionicons name="time" size={20} color={RYVRO_COLORS.gold} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>Shift times</Text>
                <Text style={styles.summaryValue}>{timesSummary}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { borderColor: 'rgba(20, 124, 255, 0.44)' }]}>
                <Ionicons name="locate" size={20} color={RYVRO_COLORS.cyan} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>Known date</Text>
                <Text style={styles.summaryValue}>{anchorText}</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {error ? (
          <Text style={styles.errorText} testID={`${testID}-error`}>
            {error}
          </Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={isSaving ? 'Saving...' : 'Save my shifts'}
            onPress={() => void handleSave()}
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
            testID={`${testID}-save-button`}
          />

          <TouchableOpacity
            onPress={handleFix}
            disabled={!resolvedDraft || isSaving}
            activeOpacity={0.84}
            style={styles.fixButton}
            testID={`${testID}-fix-button`}
          >
            <Ionicons name="create-outline" size={20} color={RYVRO_COLORS.silver} />
            <Text style={styles.fixButtonText}>Fix something</Text>
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
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.25)',
    backgroundColor: 'rgba(8, 22, 31, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
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
  hero: {
    paddingTop: 32,
    alignItems: 'center',
  },
  headline: {
    color: '#f7fbff',
    fontSize: 37,
    lineHeight: 43,
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
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    backgroundColor: RYVRO_COLORS.panel,
    padding: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 13,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
  },
  summaryCopy: {
    flex: 1,
  },
  summaryLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 3,
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
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
  fixButton: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  fixButtonText: {
    color: RYVRO_COLORS.silver,
    fontSize: 16,
    fontWeight: '900',
  },
});
