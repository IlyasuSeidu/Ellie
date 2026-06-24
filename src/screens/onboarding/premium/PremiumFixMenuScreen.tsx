/**
 * PremiumFixMenuScreen Component
 *
 * Repair menu after schedule preview. Lets the user choose the exact thing that
 * is wrong instead of dropping them into the full editor.
 */

import React, { useEffect, useRef } from 'react';
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
import type {
  FixMenuSetupParams,
  OnboardingStackParamList,
} from '@/navigation/OnboardingNavigator';
import type { UniversalShiftSchedule } from '@/types';
import { Analytics } from '@/utils/analytics';
import { getKnownDateShiftCorrectionBody } from '@/utils/dateTenseUtils';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'FixMenuSetup'>;
type FixMenuRoute = RouteProp<{ FixMenuSetup: FixMenuSetupParams }, 'FixMenuSetup'>;

type FixChoice = 'pattern' | 'times' | 'date' | 'shift';

export interface PremiumFixMenuScreenProps {
  /** Draft schedule for tests or previews */
  scheduleDraft?: UniversalShiftSchedule;
  /** Navigation handler for tests */
  onChoose?: (choice: FixChoice, scheduleDraft: UniversalShiftSchedule) => void;
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

export const PremiumFixMenuScreen: React.FC<PremiumFixMenuScreenProps> = ({
  scheduleDraft,
  onChoose,
  flowContext = 'onboarding',
  testID = 'premium-fix-menu-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<FixMenuRoute>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());
  const resolvedDraft = scheduleDraft ?? route.params?.scheduleDraft;
  const isSettingsFlow = flowContext === 'settings';

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('fix_menu', 8);

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

  const handleChoose = (choice: FixChoice) => {
    if (!resolvedDraft) return;

    Analytics.onboardingStepCompleted('fix_menu', Date.now() - mountTime.current, {
      choice,
      sequence_length: resolvedDraft.sequence.length,
    });

    if (onChoose) {
      onChoose(choice, resolvedDraft);
      return;
    }

    if (choice === 'pattern') {
      navigation.navigate('GuidedShiftChatSetup');
      return;
    }

    if (choice === 'date') {
      navigation.navigate('KnownShiftDateSetup', { scheduleDraft: resolvedDraft });
      return;
    }

    if (choice === 'times') {
      navigation.navigate('ShiftTimesSetup', {
        scheduleDraft: resolvedDraft,
        returnTo: 'SchedulePreviewSetup',
      });
      return;
    }

    if (choice === 'shift') {
      navigation.navigate('KnownShiftTypeSetup', { scheduleDraft: resolvedDraft });
      return;
    }
  };

  const choices = [
    {
      id: 'pattern' as const,
      title: t('fixMenu.patternTitle', { defaultValue: 'The pattern is wrong' }),
      body: t('fixMenu.patternBody', {
        defaultValue: 'Start again with the words you use for your work pattern.',
      }),
      icon: 'chatbubble-ellipses' as const,
      color: RYVRO_COLORS.cyan,
    },
    {
      id: 'times' as const,
      title: t('fixMenu.timesTitle', { defaultValue: 'The shift times are wrong' }),
      body: t('fixMenu.timesBody', {
        defaultValue: 'Change when your work shifts start and finish.',
      }),
      icon: 'time' as const,
      color: RYVRO_COLORS.cyan,
    },
    {
      id: 'date' as const,
      title: t('fixMenu.dateTitle', { defaultValue: 'The known date is wrong' }),
      body: t('fixMenu.dateBody', {
        defaultValue: 'Pick a different date you know for sure.',
      }),
      icon: 'calendar-clear' as const,
      color: RYVRO_COLORS.cyan,
    },
    {
      id: 'shift' as const,
      title: t('fixMenu.shiftTitle', { defaultValue: 'The shift on that date is wrong' }),
      body: resolvedDraft?.anchorDate
        ? getKnownDateShiftCorrectionBody(resolvedDraft.anchorDate)
        : 'Change whether that date is day, night, off, or something else.',
      icon: 'swap-horizontal' as const,
      color: RYVRO_COLORS.gold,
    },
  ];

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
                ? 'Schedule repair'
                : t('fixMenu.stepLabel', { defaultValue: 'Fix setup' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            <Ionicons name="build" size={18} color={RYVRO_COLORS.silver} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {t('fixMenu.headline', { defaultValue: 'What do you want to fix?' })}
          </Text>
          <Text style={styles.support}>
            {t('fixMenu.support', {
              defaultValue: 'Choose one thing. Ryvro will take you to the right screen.',
            })}
          </Text>

          <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.cardEntry}>
            <Animated.View style={[styles.menuCard, cardAnimatedStyle]}>
              {choices.map((choice) => (
                <TouchableOpacity
                  key={choice.id}
                  style={styles.choiceButton}
                  onPress={() => handleChoose(choice.id)}
                  activeOpacity={0.84}
                  accessibilityRole="button"
                  accessibilityLabel={choice.title}
                  accessibilityHint={choice.body}
                  testID={`${testID}-${choice.id}-button`}
                >
                  <View style={[styles.choiceIcon, { borderColor: `${choice.color}66` }]}>
                    <Ionicons name={choice.icon} size={22} color={choice.color} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>{choice.title}</Text>
                    <Text style={styles.choiceBody}>{choice.body}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={RYVRO_COLORS.muted} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          </Animated.View>
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
  menuCard: {
    marginTop: 30,
    width: '100%',
    borderRadius: 28,
    padding: 10,
    gap: 10,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.22)',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: Platform.OS === 'ios' ? 0.18 : 0,
    shadowRadius: 32,
    elevation: 8,
  },
  choiceButton: {
    minHeight: 88,
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
  choiceIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 7, 11, 0.52)',
    borderWidth: 1,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  choiceBody: {
    marginTop: 4,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
