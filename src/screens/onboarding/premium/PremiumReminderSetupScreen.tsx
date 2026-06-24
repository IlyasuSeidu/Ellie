/**
 * PremiumReminderSetupScreen Component
 *
 * Optional reminder setup after the shift schedule is saved.
 */

import React, { useEffect, useRef, useState } from 'react';
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
  ReminderSetupParams,
} from '@/navigation/OnboardingNavigator';
import { notificationService } from '@/services/NotificationService';
import type { UniversalShiftSchedule } from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import { Analytics } from '@/utils/analytics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ReminderSetup'>;
type ReminderRoute = RouteProp<{ ReminderSetup: ReminderSetupParams }, 'ReminderSetup'>;

type ReminderChoice = 'none' | 'one_hour' | 'two_hours' | 'eight_hours';

export interface PremiumReminderSetupScreenProps {
  scheduleDraft?: UniversalShiftSchedule;
  onContinue?: (
    scheduleDraft: UniversalShiftSchedule,
    choice: ReminderChoice
  ) => void | Promise<void>;
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

const CHOICES = [
  {
    id: 'one_hour' as const,
    title: 'One hour before work',
    body: 'A simple reminder before your shift starts.',
    hours: 1,
    icon: 'alarm' as const,
    color: RYVRO_COLORS.cyan,
  },
  {
    id: 'two_hours' as const,
    title: 'Two hours before work',
    body: 'More time to get ready and travel.',
    hours: 2,
    icon: 'time' as const,
    color: RYVRO_COLORS.cyan,
  },
  {
    id: 'eight_hours' as const,
    title: 'The night before',
    body: 'Useful for very early shifts.',
    hours: 8,
    icon: 'moon' as const,
    color: RYVRO_COLORS.gold,
  },
  {
    id: 'none' as const,
    title: 'No reminders',
    body: 'Ryvro will still answer your shift questions.',
    hours: 0,
    icon: 'notifications-off' as const,
    color: RYVRO_COLORS.silver,
  },
];

function applyReminderChoice(
  schedule: UniversalShiftSchedule,
  choice: ReminderChoice
): UniversalShiftSchedule {
  const selected = CHOICES.find((item) => item.id === choice) ?? CHOICES[0];
  const reminderSettings =
    choice === 'none'
      ? undefined
      : {
          ...DEFAULT_SMART_REMINDER_SETTINGS,
          earlyReminderHours: selected.hours,
        };

  return {
    ...schedule,
    updatedAt: new Date().toISOString(),
    shiftDefinitions: schedule.shiftDefinitions.map((definition) => {
      if (!definition.countsAsWork || definition.kind === 'off') {
        return {
          ...definition,
          reminderProfileId: undefined,
          reminderProfile: undefined,
        };
      }

      if (!reminderSettings) {
        return {
          ...definition,
          reminderProfileId: undefined,
          reminderProfile: undefined,
        };
      }

      return {
        ...definition,
        reminderProfileId: `${definition.id}-reminder`,
        reminderProfile: reminderSettings,
      };
    }),
  };
}

export const PremiumReminderSetupScreen: React.FC<PremiumReminderSetupScreenProps> = ({
  scheduleDraft,
  onContinue,
  flowContext = 'onboarding',
  testID = 'premium-reminder-setup-screen',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReminderRoute>();
  const { updateDataAsync } = useOnboarding();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const isSettingsFlow = flowContext === 'settings';
  const [selectedChoice, setSelectedChoice] = useState<ReminderChoice>('one_hour');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('reminder_setup', 10);
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

  const handleContinue = async () => {
    if (!resolvedDraft || isSaving) return;

    setError(null);
    setIsSaving(true);
    const scheduleWithReminders = applyReminderChoice(resolvedDraft, selectedChoice);

    try {
      if (selectedChoice !== 'none') {
        const hasPermission = await notificationService.requestPermissions();
        if (!hasPermission) {
          setError(
            'Turn on notifications to use reminders. Choose No reminders if you want to skip this.'
          );
          return;
        }
      }

      if (onContinue) {
        await onContinue(scheduleWithReminders, selectedChoice);
      } else {
        await updateDataAsync({ universalSchedule: scheduleWithReminders });
        navigation.navigate('AhaMoment');
      }

      Analytics.onboardingStepCompleted('reminder_setup', Date.now() - mountTime.current, {
        reminder_choice: selectedChoice,
      });
    } catch {
      setError('Ryvro could not save reminders yet. Please try again.');
    } finally {
      setIsSaving(false);
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
            <Text style={styles.stepLabel}>{isSettingsFlow ? 'Fix reminders' : 'Reminders'}</Text>
          </View>
          <View style={styles.stepCount}>
            <Ionicons name="notifications" size={19} color={RYVRO_COLORS.silver} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {isSettingsFlow ? 'Choose your reminder.' : 'Should Ryvro remind you before work?'}
          </Text>
          <Text style={styles.support}>
            {isSettingsFlow
              ? 'Pick one calm reminder time for work shifts.'
              : 'Pick one. You can change this later in settings.'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.cardEntry}>
          <Animated.View style={[styles.reminderCard, cardAnimatedStyle]}>
            {CHOICES.map((choice) => {
              const isSelected = selectedChoice === choice.id;
              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[styles.choiceButton, isSelected && styles.selectedChoiceButton]}
                  onPress={() => setSelectedChoice(choice.id)}
                  activeOpacity={0.84}
                  testID={`${testID}-${choice.id}-button`}
                >
                  <View style={[styles.choiceIcon, { borderColor: `${choice.color}66` }]}>
                    <Ionicons name={choice.icon} size={22} color={choice.color} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>{choice.title}</Text>
                    <Text style={styles.choiceBody}>{choice.body}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.selectedRadio]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        </Animated.View>

        {error ? (
          <Text style={styles.errorText} testID={`${testID}-error`}>
            {error}
          </Text>
        ) : null}

        <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={isSaving ? 'Saving...' : 'Continue'}
            onPress={() => void handleContinue()}
            disabled={!resolvedDraft || isSaving}
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
  reminderCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    backgroundColor: RYVRO_COLORS.panel,
    padding: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  choiceButton: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.12)',
    backgroundColor: 'rgba(2, 7, 11, 0.28)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectedChoiceButton: {
    borderColor: 'rgba(32, 244, 220, 0.42)',
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  choiceBody: {
    marginTop: 3,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(214, 231, 242, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: RYVRO_COLORS.cyan,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RYVRO_COLORS.cyan,
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
