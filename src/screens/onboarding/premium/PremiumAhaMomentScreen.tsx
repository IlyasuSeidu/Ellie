import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { buildShiftCycle, getShiftDaysInRange, getShiftStatistics } from '@/utils/shiftUtils';
import { toDateString } from '@/utils/dateUtils';
import { Analytics } from '@/utils/analytics';
import { theme } from '@/utils/theme';
import { PremiumButton } from '@/components/onboarding/premium';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PaywallScreen } from '@/screens/subscription/PaywallScreen';
import { MonthlyCalendarCard } from '@/components/dashboard/MonthlyCalendarCard';
import { VoiceAssistantModal } from '@/components/voice';
import { RosterType, ShiftSystem } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const SUGGESTION_QUERIES = [
  'Am I working Christmas?',
  "When's my next day off?",
  'How many night shifts this month?',
];

// Shift type dot colors — matches ShiftCalendarDayCell on the dashboard
const SHIFT_DOT_COLOR: Record<string, string> = {
  day: '#2196F3',
  night: '#651FFF',
  morning: '#F59E0B',
  afternoon: '#06B6D4',
};

// How many months the user can browse on this screen
const MAX_PREVIEW_MONTHS = 3;

// ─── Main screen ──────────────────────────────────────────────────────────────
export const PremiumAhaMomentScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const { data } = useOnboarding();
  const { openModalWithQuery, openModal } = useVoiceAssistant();
  const navigation = useNavigation<NavigationProp>();
  const [showPaywall, setShowPaywall] = useState(false);

  // Month navigation: 0 = current month, capped at MAX_PREVIEW_MONTHS - 1
  const [monthOffset, setMonthOffset] = useState(0);

  // ── Shift data ──────────────────────────────────────────────────────────────
  const shiftCycle = useMemo(() => buildShiftCycle(data), [data]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const yearStart = useMemo(() => new Date(today.getFullYear(), 0, 1), [today]);
  const yearEnd = useMemo(() => new Date(today.getFullYear() + 1, 11, 31), [today]);

  const shiftDays = useMemo(() => {
    if (!shiftCycle) return [];
    return getShiftDaysInRange(yearStart, yearEnd, shiftCycle);
  }, [shiftCycle, yearStart, yearEnd]);

  // Displayed month, derived from navigation offset
  const displayDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [today, monthOffset]);

  // Filter shift days to just the displayed month — what MonthlyCalendarCard expects
  const displayShiftDays = useMemo(() => {
    const { year, month } = displayDate;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return shiftDays.filter((d) => d.date.startsWith(prefix));
  }, [shiftDays, displayDate]);

  const stats = useMemo(() => {
    if (!shiftCycle) return null;
    return getShiftStatistics(yearStart, yearEnd, shiftCycle);
  }, [shiftCycle, yearStart, yearEnd]);

  const todayStr = useMemo(() => toDateString(today), [today]);

  const nextShift = useMemo(
    () => shiftDays.find((d) => d.shiftType !== 'off' && d.date > todayStr),
    [shiftDays, todayStr]
  );

  const nextShiftDate = useMemo(
    () => (nextShift ? new Date(`${nextShift.date}T00:00:00`) : null),
    [nextShift]
  );

  const nextShiftDaysAway = useMemo(() => {
    if (!nextShiftDate) return null;
    return Math.ceil((nextShiftDate.getTime() - today.getTime()) / 86_400_000);
  }, [nextShiftDate, today]);

  // ── Analytics ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Analytics.onboardingStepViewed('aha_moment', 7);
    void AsyncStorage.getItem('app:install_time').then((value) => {
      if (!value) return;
      const ts = Number(value);
      if (!Number.isFinite(ts) || ts <= 0) return;
      Analytics.ahaMomentReached(Math.floor((Date.now() - ts) / 1000));
    });
  }, []);

  const handleDismissPaywall = () => {
    setShowPaywall(false);
    navigation.navigate('ShiftTimeInput');
  };

  // ── Derived helpers ──────────────────────────────────────────────────────────
  const shiftDotColor = nextShift
    ? (SHIFT_DOT_COLOR[nextShift.shiftType] ?? SHIFT_DOT_COLOR.day)
    : SHIFT_DOT_COLOR.day;

  const totalWorkDays =
    (stats?.dayShifts ?? 0) +
    (stats?.nightShifts ?? 0) +
    (stats?.morningShifts ?? 0) +
    (stats?.afternoonShifts ?? 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.AHA_MOMENT}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Headline ── */}
        <Animated.View entering={FadeIn.duration(350)} style={styles.padded}>
          <Text style={styles.headline}>
            {t('ahaMoment.headline', { defaultValue: 'Your shifts, mapped.' })}
          </Text>
          <Text style={styles.subheadline}>
            {t('ahaMoment.subheadline', {
              defaultValue: 'Stop counting shifts on your hands. No second-guessing.',
            })}
          </Text>
        </Animated.View>

        {/* ── Next Shift Hero Card ── */}
        {nextShiftDate && nextShift && (
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.padded}>
            <View style={styles.heroCard}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroEyebrow}>
                  {t('ahaMoment.nextShiftLabel', { defaultValue: 'YOUR NEXT SHIFT' })}
                </Text>
                <Text style={styles.heroDay}>
                  {nextShiftDate.toLocaleDateString(undefined, { weekday: 'long' })}
                </Text>
                <Text style={styles.heroFullDate}>
                  {nextShiftDate.toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                <View style={styles.heroRow}>
                  <View style={[styles.heroBadge, { backgroundColor: shiftDotColor + '26' }]}>
                    <View style={[styles.heroBadgeDot, { backgroundColor: shiftDotColor }]} />
                    <Text style={[styles.heroBadgeText, { color: shiftDotColor }]}>
                      {(
                        nextShift.shiftType.charAt(0).toUpperCase() + nextShift.shiftType.slice(1)
                      ).replace('_', ' ')}{' '}
                      shift
                    </Text>
                  </View>
                  {nextShiftDaysAway !== null && nextShiftDaysAway > 0 && (
                    <Text style={styles.heroCountdown}>
                      {nextShiftDaysAway === 1 ? 'tomorrow' : `in ${nextShiftDaysAway} days`}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.heroRight, { borderColor: shiftDotColor + '40' }]}>
                <Text style={[styles.heroBigDate, { color: shiftDotColor }]}>
                  {nextShiftDate.getDate()}
                </Text>
                <Text style={[styles.heroMonth, { color: shiftDotColor }]}>
                  {nextShiftDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Dashboard Calendar — identical to main app, bounded to 3 months ── */}
        <Animated.View entering={FadeInDown.delay(250).duration(450)}>
          <MonthlyCalendarCard
            year={displayDate.year}
            month={displayDate.month}
            shiftDays={displayShiftDays}
            onPreviousMonth={() => setMonthOffset((o) => Math.max(0, o - 1))}
            onNextMonth={() => setMonthOffset((o) => Math.min(MAX_PREVIEW_MONTHS - 1, o + 1))}
            shiftSystem={data.shiftSystem as ShiftSystem | undefined}
            rosterType={(data.rosterType as RosterType | undefined) ?? RosterType.ROTATING}
            shiftCycle={shiftCycle ?? undefined}
            animationDelay={250}
          />

          {/* Month progress dots */}
          <View style={styles.monthDots}>
            {Array.from({ length: MAX_PREVIEW_MONTHS }).map((_, i) => (
              <View key={i} style={[styles.monthDot, i === monthOffset && styles.monthDotActive]} />
            ))}
          </View>
        </Animated.View>

        {/* ── Year stats row ── */}
        <Animated.View entering={FadeInDown.delay(420).duration(380)} style={styles.padded}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalWorkDays}</Text>
              <Text style={styles.statLabel}>
                {t('ahaMoment.stats.workDays', { defaultValue: 'Work days' })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.nightShifts ?? 0}</Text>
              <Text style={styles.statLabel}>
                {t('ahaMoment.stats.nightShifts', { defaultValue: 'Night shifts' })}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats?.daysOff ?? 0}</Text>
              <Text style={styles.statLabel}>
                {t('ahaMoment.stats.daysOff', { defaultValue: 'Days off' })}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Hey Ellie section ── */}
        <Animated.View entering={FadeInDown.delay(520).duration(380)} style={styles.padded}>
          <View style={styles.divider} />

          <View style={styles.heyEllieSection}>
            <Text style={styles.heyEllieTitle}>
              {t('ahaMoment.heyEllieTitle', {
                defaultValue: 'Ask Ellie about your roster',
              })}
            </Text>

            <View style={styles.chips}>
              {SUGGESTION_QUERIES.map((query) => (
                <TouchableOpacity
                  key={query}
                  style={styles.chip}
                  onPress={() => {
                    Analytics.ahaMomentVoiceTried(query);
                    openModalWithQuery(query);
                  }}
                >
                  <Ionicons name="mic-outline" size={13} color={theme.colors.sacredGold} />
                  <Text style={styles.chipText}>{query}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.heyEllieButton}
              onPress={() => {
                Analytics.ahaMomentVoiceTried('manual_mic');
                openModal();
              }}
            >
              <View style={styles.heyEllieGlow} />
              <Ionicons name="mic" size={24} color={theme.colors.sacredGold} />
              <Text style={styles.heyEllieLabel}>Hey Ellie</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
        </Animated.View>

        {/* ── CTAs ── */}
        <Animated.View entering={FadeInUp.delay(600).duration(380)} style={styles.padded}>
          <PremiumButton
            title={t('ahaMoment.ctaPrimary', {
              defaultValue: 'Unlock Full Access — Free 7-Day Trial',
            })}
            onPress={() => setShowPaywall(true)}
            variant="primary"
            size="large"
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('ShiftTimeInput')}
            style={styles.secondaryLink}
          >
            <Text style={styles.secondaryLinkText}>
              {t('ahaMoment.ctaSecondary', {
                defaultValue: 'Continue with Limited Access →',
              })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {showPaywall && <PaywallScreen onDismiss={handleDismissPaywall} onboardingData={data} />}

      {/* Hey Ellie modal — only mounted on this screen during onboarding */}
      <VoiceAssistantModal />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  // No horizontal padding on scroll — MonthlyCalendarCard handles its own margins.
  // All other sections use the `padded` wrapper to stay visually aligned with the card.
  scroll: {
    paddingBottom: 44,
  },
  padded: {
    paddingHorizontal: theme.spacing.lg,
  },

  // ── Headline ──
  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.paper,
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 15,
    color: theme.colors.dust,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },

  // ── Next shift hero card ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.sacredGold + '35',
    padding: 16,
    marginBottom: 4,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroDay: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.paper,
    lineHeight: 24,
  },
  heroFullDate: {
    fontSize: 14,
    color: theme.colors.dust,
    marginBottom: 10,
    marginTop: 1,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroCountdown: {
    fontSize: 12,
    color: theme.colors.shadow,
  },
  heroRight: {
    alignItems: 'center',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 64,
  },
  heroBigDate: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  heroMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },

  // ── Month progress dots ──
  monthDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  monthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.softStone,
  },
  monthDotActive: {
    width: 18,
    backgroundColor: theme.colors.sacredGold,
  },

  // ── Stats card ──
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.paper,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.dust,
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 13,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // ── Section divider ──
  divider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
    opacity: 0.3,
    marginVertical: theme.spacing.lg,
    marginHorizontal: -theme.spacing.lg,
  },

  // ── Hey Ellie ──
  heyEllieSection: {
    alignItems: 'center',
  },
  heyEllieTitle: {
    fontSize: 14,
    color: theme.colors.dust,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  chips: {
    gap: 8,
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(180,83,9,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.20)',
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.paper,
    flex: 1,
  },
  heyEllieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180,83,9,0.10)',
    position: 'relative',
  },
  heyEllieGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.05,
  },
  heyEllieLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.sacredGold,
    letterSpacing: 0.5,
  },

  // ── CTAs ──
  secondaryLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 14,
    color: theme.colors.dust,
  },
});
