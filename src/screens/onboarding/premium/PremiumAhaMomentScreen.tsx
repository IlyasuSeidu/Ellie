import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/onboarding/premium';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { PaywallScreen } from '@/screens/subscription/PaywallScreen';
import type { ShiftDay, UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';
import { formatShiftTime } from '@/utils/profileUtils';
import { calculateUniversalShiftDay } from '@/utils/universalShiftUtils';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'AhaMoment'>;

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.84)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  line: 'rgba(191, 231, 255, 0.2)',
  error: '#ff8a80',
} as const;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDisplayDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(fromDateKey(dateKey));
}

function stripShiftSuffix(name: string): string {
  return name.replace(/\s+shift$/i, '').trim();
}

function getShiftName(day: ShiftDay | null): string {
  if (!day) return 'No shift found';
  if (day.universal?.definitionName) return stripShiftSuffix(day.universal.definitionName);
  if (day.shiftType === 'off') return 'Off';
  return day.shiftType.charAt(0).toUpperCase() + day.shiftType.slice(1);
}

function getShiftTimeLabel(day: ShiftDay | null): string {
  if (
    !day?.universal?.startTime ||
    !day.universal.endTime ||
    day.universal.timePolicy !== 'timed'
  ) {
    return day?.shiftType === 'off' ? 'Rest day' : 'Time not set';
  }

  return `${formatShiftTime(day.universal.startTime)} to ${formatShiftTime(day.universal.endTime)}`;
}

function findNextWorkShift(schedule?: UniversalShiftSchedule): ShiftDay | null {
  if (!schedule) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 90; offset += 1) {
    const date = addDays(today, offset);
    const day = calculateUniversalShiftDay(date, schedule);
    if (day.shiftType !== 'off' && day.isWorkDay) {
      return day;
    }
  }

  return null;
}

export const PremiumAhaMomentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { data } = useOnboarding();
  const { isPro, isLoading: subscriptionLoading } = useSubscription();
  const { state: voiceState } = useVoiceAssistant();
  const [showPaywall, setShowPaywall] = useState(false);
  const [voiceAttemptStarted, setVoiceAttemptStarted] = useState(false);

  const schedule = data.universalSchedule;
  const todayKey = toDateKey(new Date());
  const todayShift = useMemo(
    () => (schedule ? calculateUniversalShiftDay(fromDateKey(todayKey), schedule) : null),
    [schedule, todayKey]
  );
  const nextWorkShift = useMemo(() => findNextWorkShift(schedule), [schedule]);
  const heroShift = todayShift?.isWorkDay ? todayShift : nextWorkShift;
  const heroLabel = todayShift?.isWorkDay ? 'Today' : 'Next work shift';
  const query = todayShift?.isWorkDay ? 'What shift am I on today?' : 'When is my next shift?';

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const micScale = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('aha_moment', ONBOARDING_STEPS.AHA_MOMENT, {
      schedule_name: schedule?.name ?? null,
      platform: Platform.OS,
    });

    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    micScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1050, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1050, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [contentOpacity, contentTranslateY, micScale, orbitRotation, schedule?.name]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const showPaywallNow = () => {
    if (isPro) {
      navigation.navigate('Completion');
      return;
    }
    setShowPaywall(true);
  };

  const handleTasteVoice = () => {
    if (subscriptionLoading) return;

    setVoiceAttemptStarted(true);
    Analytics.ahaMomentVoiceTried(query, {
      schedule_name: schedule?.name ?? null,
      trigger_source: 'aha_moment',
    });
    navigation.navigate('VoiceAssistantTaste', {
      autoStart: true,
      showBackButton: true,
      voiceOnly: true,
    });
  };

  const handlePaywallComplete = () => {
    setShowPaywall(false);
    navigation.navigate('Completion');
  };

  return (
    <View style={styles.container} testID="aha-moment-screen">
      <LinearGradient
        colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />
      <Animated.View style={[styles.orbit, orbitAnimatedStyle]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.content,
          contentAnimatedStyle,
          {
            paddingTop: Math.max(insets.top + 24, 50),
            paddingBottom: Math.max(insets.bottom + 28, 46),
          },
        ]}
      >
        <View style={styles.hero}>
          <Animated.View style={[styles.micShell, micAnimatedStyle]}>
            <LinearGradient
              colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
              style={styles.micGradient}
            >
              <Ionicons name="mic" size={38} color={RYVRO_COLORS.void} />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.headline}>Ryvro is ready.</Text>
          <Text style={styles.support}>Try one voice question. Then unlock Ryvro Pro.</Text>
        </View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.shiftCard}>
          <View style={styles.shiftHeader}>
            <Text style={styles.cardLabel}>{heroLabel}</Text>
            <Ionicons name="checkmark-circle" size={22} color={RYVRO_COLORS.cyan} />
          </View>
          <Text style={styles.shiftName}>{getShiftName(heroShift)}</Text>
          <Text style={styles.shiftDate}>
            {heroShift ? formatDisplayDate(heroShift.date) : 'Schedule saved'}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={18} color={RYVRO_COLORS.cyan} />
            <Text style={styles.timeText}>{getShiftTimeLabel(heroShift)}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.askCard}>
          <Text style={styles.askLabel}>Try asking</Text>
          <Text style={styles.askText}>{`"${query}"`}</Text>
        </Animated.View>

        <View style={styles.bottomPanel}>
          <PremiumButton
            title={
              subscriptionLoading
                ? 'Checking Ryvro...'
                : voiceAttemptStarted && voiceState === 'listening'
                  ? 'Listening...'
                  : voiceAttemptStarted
                    ? 'Try Ryvro'
                    : 'Try Ryvro'
            }
            onPress={handleTasteVoice}
            disabled={subscriptionLoading || voiceState === 'listening'}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={
              subscriptionLoading ? (
                <ActivityIndicator size="small" color={RYVRO_COLORS.void} />
              ) : (
                <Ionicons name="mic-circle" size={28} color={RYVRO_COLORS.void} />
              )
            }
            iconPosition="right"
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            textStyle={styles.primaryButtonText}
            testID="aha-moment-voice-taste"
          />

          <TouchableOpacity
            onPress={showPaywallNow}
            activeOpacity={0.8}
            style={styles.secondaryButton}
            testID="aha-moment-show-paywall"
          >
            <Text style={styles.secondaryText}>Unlock Ryvro Pro</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {showPaywall ? (
        <PaywallScreen
          onDismiss={handlePaywallComplete}
          onboardingData={data}
          entryPoint="aha_moment"
          allowDismiss={false}
        />
      ) : null}
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
    top: -100,
    left: -110,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 126,
    right: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(20, 124, 255, 0.16)',
  },
  orbit: {
    position: 'absolute',
    top: 188,
    alignSelf: 'center',
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.12)',
    borderRightColor: 'rgba(20, 124, 255, 0.45)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 34,
  },
  micShell: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 8,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
  },
  micGradient: {
    flex: 1,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginTop: 22,
    color: RYVRO_COLORS.silver,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '900',
    textAlign: 'center',
  },
  support: {
    marginTop: 12,
    color: RYVRO_COLORS.muted,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
  },
  shiftCard: {
    marginTop: 30,
    padding: 20,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: RYVRO_COLORS.cyan,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  shiftName: {
    marginTop: 12,
    color: RYVRO_COLORS.silver,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
  },
  shiftDate: {
    marginTop: 6,
    color: RYVRO_COLORS.muted,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  timeRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: RYVRO_COLORS.silver,
    fontSize: 17,
    fontWeight: '800',
  },
  askCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  askLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  askText: {
    marginTop: 7,
    color: RYVRO_COLORS.silver,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  bottomPanel: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  primaryButton: {
    width: '100%',
  },
  primaryButtonContent: {
    minHeight: 72,
  },
  primaryButtonText: {
    color: RYVRO_COLORS.void,
    fontSize: 22,
    fontWeight: '900',
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  secondaryText: {
    color: RYVRO_COLORS.muted,
    fontSize: 16,
    fontWeight: '800',
  },
});
