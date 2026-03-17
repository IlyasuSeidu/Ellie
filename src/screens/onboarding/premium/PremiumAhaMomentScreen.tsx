import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { buildShiftCycle, getShiftDaysInRange, getShiftStatistics } from '@/utils/shiftUtils';
import { Analytics } from '@/utils/analytics';
import { theme } from '@/utils/theme';
import { formatLocalizedDate, formatLocalizedNumber } from '@/utils/i18nFormat';
import { PremiumButton } from '@/components/onboarding/premium';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PaywallScreen } from '@/screens/subscription/PaywallScreen';
import { MonthlyCalendarCard } from '@/components/dashboard/MonthlyCalendarCard';
import { VoiceAssistantModal } from '@/components/voice';
import { RosterType, ShiftSystem } from '@/types';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const SHIFT_DOT_COLOR: Record<string, string> = {
  day: '#2196F3',
  night: '#651FFF',
  morning: '#F59E0B',
  afternoon: '#06B6D4',
};

const MAX_PREVIEW_MONTHS = 3;

export const PremiumAhaMomentScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const { data } = useOnboarding();
  const { openModalWithQuery, openModal } = useVoiceAssistant();
  const navigation = useNavigation<NavigationProp>();
  const [showPaywall, setShowPaywall] = React.useState(false);
  const [monthOffset, setMonthOffset] = React.useState(0);

  // ── Pulse animation for Hey Ellie button ────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [pulseScale]);

  // ── Shift data ───────────────────────────────────────────────────────────────
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

  const displayDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [today, monthOffset]);

  const displayShiftDays = useMemo(() => {
    const { year, month } = displayDate;
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return shiftDays.filter((d) => d.date.startsWith(prefix));
  }, [shiftDays, displayDate]);

  const stats = useMemo(() => {
    if (!shiftCycle) return null;
    return getShiftStatistics(yearStart, yearEnd, shiftCycle);
  }, [shiftCycle, yearStart, yearEnd]);

  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

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

  const nextDayOff = useMemo(
    () => shiftDays.find((d) => d.shiftType === 'off' && d.date > todayStr),
    [shiftDays, todayStr]
  );
  const nextDayOffDate = useMemo(
    () => (nextDayOff ? new Date(`${nextDayOff.date}T00:00:00`) : null),
    [nextDayOff]
  );
  const nextDayOffDaysAway = useMemo(() => {
    if (!nextDayOffDate) return null;
    return Math.ceil((nextDayOffDate.getTime() - today.getTime()) / 86_400_000);
  }, [nextDayOffDate, today]);

  const totalWorkDays =
    (stats?.dayShifts ?? 0) +
    (stats?.nightShifts ?? 0) +
    (stats?.morningShifts ?? 0) +
    (stats?.afternoonShifts ?? 0);

  const shiftDotColor = nextShift
    ? (SHIFT_DOT_COLOR[nextShift.shiftType] ?? SHIFT_DOT_COLOR.day)
    : SHIFT_DOT_COLOR.day;

  const suggestionQueries = useMemo(
    () => [
      t('ahaMoment.suggestions.workingChristmas', { defaultValue: 'Am I working Christmas?' }),
      t('ahaMoment.suggestions.nextDayOff', { defaultValue: "When's my next day off?" }),
      t('ahaMoment.suggestions.nightShiftsThisMonth', {
        defaultValue: 'How many night shifts this month?',
      }),
    ],
    [t]
  );

  const nextDayOffLabel = (() => {
    if (nextDayOffDaysAway === null) return '—';
    if (nextDayOffDaysAway === 0) {
      return String(t('ahaMoment.relative.today', { defaultValue: 'Today' }));
    }
    if (nextDayOffDaysAway === 1) {
      return String(t('ahaMoment.relative.tomorrowShort', { defaultValue: 'Tmrw' }));
    }
    return String(
      t('ahaMoment.relative.inDaysShort', {
        defaultValue: '{{days}}d',
        days: nextDayOffDaysAway,
      })
    );
  })();

  // ── Analytics ────────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────
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
              defaultValue:
                'Stop counting shifts on your hands. No second-guessing with your heads.',
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
                  {formatLocalizedDate(nextShiftDate, { weekday: 'long' })}
                </Text>
                <Text style={styles.heroFullDate}>
                  {formatLocalizedDate(nextShiftDate, {
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                <View style={styles.heroRow}>
                  <View style={[styles.heroBadge, { backgroundColor: shiftDotColor + '26' }]}>
                    <View style={[styles.heroBadgeDot, { backgroundColor: shiftDotColor }]} />
                    <Text style={[styles.heroBadgeText, { color: shiftDotColor }]}>
                      {String(
                        t('ahaMoment.shiftBadge', {
                          defaultValue: '{{shiftName}} shift',
                          shiftName: t(`shiftTime.shiftLabels.${nextShift.shiftType}Title`, {
                            defaultValue: (
                              nextShift.shiftType.charAt(0).toUpperCase() +
                              nextShift.shiftType.slice(1)
                            ).replace('_', ' '),
                          }),
                        })
                      )}
                    </Text>
                  </View>
                  {nextShiftDaysAway !== null && nextShiftDaysAway > 0 && (
                    <Text style={styles.heroCountdown}>
                      {nextShiftDaysAway === 1
                        ? t('ahaMoment.countdown.tomorrow', { defaultValue: 'tomorrow' })
                        : t('ahaMoment.countdown.inDays', {
                            defaultValue: 'in {{days}} days',
                            days: nextShiftDaysAway,
                          })}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.heroRight, { borderColor: shiftDotColor + '40' }]}>
                <Text style={[styles.heroBigDate, { color: shiftDotColor }]}>
                  {formatLocalizedNumber(nextShiftDate.getDate())}
                </Text>
                <Text style={[styles.heroMonth, { color: shiftDotColor }]}>
                  {formatLocalizedDate(nextShiftDate, { month: 'short' }).toUpperCase()}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Dashboard Calendar ── */}
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

          <View style={styles.monthDots}>
            {Array.from({ length: MAX_PREVIEW_MONTHS }).map((_, i) => (
              <View key={i} style={[styles.monthDot, i === monthOffset && styles.monthDotActive]} />
            ))}
          </View>
        </Animated.View>

        {/* ── Stats 2×2 grid ── */}
        <Animated.View entering={FadeInDown.delay(380).duration(380)} style={styles.padded}>
          <View style={styles.statsCard}>
            <View style={styles.statsTopAccent} />

            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{formatLocalizedNumber(totalWorkDays)}</Text>
                <Text style={styles.statLabel}>
                  {t('ahaMoment.stats.workDays', { defaultValue: 'Work Days' })}
                </Text>
              </View>
              <View style={styles.statVertDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{formatLocalizedNumber(stats?.daysOff ?? 0)}</Text>
                <Text style={styles.statLabel}>
                  {t('ahaMoment.stats.daysOff', { defaultValue: 'Days Off' })}
                </Text>
              </View>
            </View>

            <View style={styles.statsHorizDivider} />

            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {formatLocalizedNumber(stats?.nightShifts ?? 0)}
                </Text>
                <Text style={styles.statLabel}>
                  {t('ahaMoment.stats.nightShifts', { defaultValue: 'Night Shifts' })}
                </Text>
              </View>
              <View style={styles.statVertDivider} />
              <View style={styles.statCell}>
                <Text
                  style={[
                    styles.statValue,
                    nextDayOffDaysAway !== null && { color: theme.colors.sacredGold },
                  ]}
                >
                  {nextDayOffLabel}
                </Text>
                <Text style={styles.statLabel}>
                  {t('ahaMoment.stats.nextDayOff', { defaultValue: 'Next Day Off' })}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Hey Ellie card ── */}
        <Animated.View entering={FadeInDown.delay(480).duration(380)} style={styles.padded}>
          <View style={styles.ellieCard}>
            <View style={styles.ellieTopAccent} />

            {/* Header */}
            <View style={styles.ellieHeader}>
              <View style={styles.ellieHeaderIcon}>
                <Ionicons name="mic" size={18} color={theme.colors.sacredGold} />
              </View>
              <View>
                <Text style={styles.ellieTitle}>
                  {t('ahaMoment.heyEllieTitle', { defaultValue: 'Ask Ellie' })}
                </Text>
                <Text style={styles.ellieSubtitle}>
                  {t('ahaMoment.tryAsking', { defaultValue: 'Try asking…' })}
                </Text>
              </View>
            </View>

            {/* Suggestion rows */}
            <View style={styles.ellieChips}>
              {suggestionQueries.map((query, index) => (
                <TouchableOpacity
                  key={query}
                  activeOpacity={0.7}
                  style={[
                    styles.ellieChip,
                    index < suggestionQueries.length - 1 && styles.ellieChipBorder,
                  ]}
                  onPress={() => {
                    Analytics.ahaMomentVoiceTried(query);
                    openModalWithQuery(query);
                  }}
                >
                  <Ionicons
                    name="mic-outline"
                    size={14}
                    color={theme.colors.sacredGold}
                    style={styles.ellieChipMic}
                  />
                  <Text style={styles.ellieChipText}>{query}</Text>
                  <Ionicons name="chevron-forward" size={15} color={theme.colors.shadow} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Hey Ellie mic button */}
            <Animated.View style={[styles.ellieButtonWrapper, pulseStyle]}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => {
                  Analytics.ahaMomentVoiceTried('manual_mic');
                  openModal();
                }}
              >
                <LinearGradient
                  colors={['rgba(180,83,9,0.22)', 'rgba(180,83,9,0.07)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ellieButtonGradient}
                >
                  <Ionicons name="mic" size={22} color={theme.colors.sacredGold} />
                  <Text style={styles.ellieButtonLabel}>
                    {t('ahaMoment.buttonLabel', { defaultValue: 'Hey Ellie' })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ── CTAs ── */}
        <Animated.View
          entering={FadeInUp.delay(580).duration(380)}
          style={[styles.padded, styles.ctaSection]}
        >
          <PremiumButton
            title={t('ahaMoment.ctaPrimary', {
              defaultValue: 'Unlock Full Access\nFree 7-Day Trial',
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
  scroll: {
    paddingTop: 8,
    paddingBottom: 48,
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
    marginBottom: 20,
    textAlign: 'center',
  },

  // ── Hero card ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.sacredGold + '35',
    padding: 16,
    marginBottom: 12,
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

  // ── Month dots ──
  monthDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
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

  // ── Stats 2×2 grid ──
  statsCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
  },
  statsTopAccent: {
    height: 2,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.35,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.paper,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.dust,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  statVertDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 12,
  },
  statsHorizDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
  },

  // ── Hey Ellie card ──
  ellieCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 4,
  },
  ellieTopAccent: {
    height: 2,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.2,
  },
  ellieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  ellieHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(180,83,9,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.25)',
  },
  ellieTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.paper,
    lineHeight: 21,
  },
  ellieSubtitle: {
    fontSize: 13,
    color: theme.colors.dust,
    marginTop: 1,
  },
  ellieChips: {
    marginHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(180,83,9,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.14)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  ellieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  ellieChipBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180,83,9,0.10)',
  },
  ellieChipMic: {
    marginRight: 10,
  },
  ellieChipText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.paper,
  },
  ellieButtonWrapper: {
    paddingBottom: 18,
    paddingHorizontal: 14,
  },
  ellieButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: theme.colors.sacredGold + '80',
  },
  ellieButtonLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.sacredGold,
    letterSpacing: 0.4,
  },

  // ── CTAs ──
  ctaSection: {
    marginTop: 12,
  },
  secondaryLink: {
    marginTop: 14,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 14,
    color: theme.colors.dust,
  },
});
