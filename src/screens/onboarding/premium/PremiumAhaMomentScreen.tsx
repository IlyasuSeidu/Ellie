import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
import { PremiumButton } from '@/components/onboarding/premium';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PaywallScreen } from '@/screens/subscription/PaywallScreen';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SUGGESTION_QUERIES = [
  'Am I working Christmas?',
  "When's my next day off?",
  'How many night shifts this month?',
];

const SHIFT_COLORS: Record<string, string> = {
  day: '#2196F3',
  night: '#651FFF',
  morning: '#F59E0B',
  afternoon: '#F59E0B',
  off: theme.colors.softStone,
};

export const PremiumAhaMomentScreen: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const { data } = useOnboarding();
  const { openModalWithQuery, openModal } = useVoiceAssistant();
  const navigation = useNavigation<NavigationProp>();
  const [showPaywall, setShowPaywall] = useState(false);

  const year = useMemo(() => new Date().getFullYear(), []);
  const yearStart = useMemo(() => new Date(year, 0, 1), [year]);
  const yearEnd = useMemo(() => new Date(year, 11, 31), [year]);

  const shiftCycle = useMemo(() => buildShiftCycle(data), [data]);
  const shiftDays = useMemo(() => {
    if (!shiftCycle) return [];
    return getShiftDaysInRange(yearStart, yearEnd, shiftCycle);
  }, [shiftCycle, yearStart, yearEnd]);

  const stats = useMemo(() => {
    if (!shiftCycle) return null;
    return getShiftStatistics(yearStart, yearEnd, shiftCycle);
  }, [shiftCycle, yearEnd, yearStart]);

  const nextShift = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shiftDays.find((shiftDay) => {
      if (shiftDay.shiftType === 'off') return false;
      const shiftDate = new Date(`${shiftDay.date}T00:00:00`);
      return shiftDate > today;
    });
  }, [shiftDays]);

  const monthRows = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, month) => {
        const monthDays = shiftDays.filter((shiftDay) => {
          const date = new Date(`${shiftDay.date}T00:00:00`);
          return date.getMonth() === month && date.getFullYear() === year;
        });
        return { month, monthDays };
      }),
    [shiftDays, year]
  );

  useEffect(() => {
    Analytics.onboardingStepViewed('aha_moment', 7);
    void AsyncStorage.getItem('app:install_time').then((value) => {
      if (!value) return;
      const installTimestamp = Number(value);
      if (!Number.isFinite(installTimestamp) || installTimestamp <= 0) return;
      const secondsSinceInstall = Math.floor((Date.now() - installTimestamp) / 1000);
      Analytics.ahaMomentReached(secondsSinceInstall);
    });
  }, []);

  const handleDismissPaywall = () => {
    setShowPaywall(false);
    navigation.navigate('ShiftTimeInput');
  };

  return (
    <View style={styles.container}>
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.AHA_MOMENT}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>
          {t('ahaMoment.headline', { defaultValue: 'Your year, mapped.' })}
        </Text>
        <Text style={styles.subheadline}>
          {t('ahaMoment.subheadline', { defaultValue: 'Every shift. Every day off.' })}
        </Text>

        <View style={styles.calendarCard}>
          {monthRows.map((row, index) => (
            <Animated.View
              key={row.month}
              entering={FadeInDown.delay(index * 80).duration(300)}
              style={styles.monthRow}
            >
              <Text style={styles.monthLabel}>{MONTHS[row.month]}</Text>
              <View style={styles.monthDots}>
                {row.monthDays.map((day, dotIndex) => (
                  <View
                    key={`${day.date}-${dotIndex}`}
                    style={[
                      styles.dot,
                      { backgroundColor: SHIFT_COLORS[day.shiftType] ?? theme.colors.softStone },
                    ]}
                  />
                ))}
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>
              {(stats?.dayShifts ?? 0) +
                (stats?.nightShifts ?? 0) +
                (stats?.morningShifts ?? 0) +
                (stats?.afternoonShifts ?? 0)}
            </Text>
            <Text style={styles.statLabel}>
              {t('ahaMoment.stats.workDays', { defaultValue: 'Work days' })}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{stats?.nightShifts ?? 0}</Text>
            <Text style={styles.statLabel}>
              {t('ahaMoment.stats.nightShifts', { defaultValue: 'Night shifts' })}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{stats?.daysOff ?? 0}</Text>
            <Text style={styles.statLabel}>
              {t('ahaMoment.stats.daysOff', { defaultValue: 'Days off' })}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>
              {nextShift
                ? new Date(`${nextShift.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </Text>
            <Text style={styles.statLabel}>
              {t('ahaMoment.stats.nextShift', { defaultValue: 'Next shift' })}
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        <View style={styles.heyEllieSection}>
          <Text style={styles.heyEllieTitle}>
            {t('ahaMoment.heyEllieTitle', { defaultValue: 'Ask Ellie about your roster' })}
          </Text>

          <View style={styles.suggestionChips}>
            {SUGGESTION_QUERIES.map((query) => (
              <TouchableOpacity
                key={query}
                style={styles.suggestionChip}
                onPress={() => {
                  Analytics.ahaMomentVoiceTried(query);
                  openModalWithQuery(query);
                }}
              >
                <Ionicons name="mic-outline" size={13} color={theme.colors.sacredGold} />
                <Text style={styles.suggestionChipText}>{query}</Text>
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

        <View style={styles.sectionDivider} />

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
            {t('ahaMoment.ctaSecondary', { defaultValue: 'Continue with Limited Access →' })}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showPaywall && <PaywallScreen onDismiss={handleDismissPaywall} onboardingData={data} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.paper,
    marginBottom: 4,
  },
  subheadline: {
    fontSize: 16,
    color: theme.colors.dust,
    marginBottom: theme.spacing.xl,
  },
  calendarCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  monthLabel: {
    width: 32,
    fontSize: 10,
    color: theme.colors.dust,
    fontWeight: '600',
  },
  monthDots: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: theme.spacing.lg,
  },
  statChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.paper,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.dust,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
    opacity: 0.3,
    marginVertical: theme.spacing.lg,
    marginHorizontal: -theme.spacing.xl,
  },
  heyEllieSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  heyEllieTitle: {
    fontSize: 14,
    color: theme.colors.dust,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
  },
  suggestionChips: {
    gap: 8,
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(212, 168, 106, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 106, 0.2)',
  },
  suggestionChipText: {
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
    backgroundColor: 'rgba(212, 168, 106, 0.1)',
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
  secondaryLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 14,
    color: theme.colors.dust,
  },
});
