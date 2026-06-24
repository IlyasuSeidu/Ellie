/**
 * PremiumSetupIntroScreen Component
 *
 * Second onboarding screen that makes shift setup feel small and clear.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PremiumButton } from '@/components/onboarding/premium';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Analytics } from '@/utils/analytics';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'SetupIntro'>;

export interface PremiumSetupIntroScreenProps {
  /** Navigation handler for next screen (optional for testing) */
  onContinue?: () => void;
  /** Test ID */
  testID?: string;
}

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.82)',
  panelStrong: 'rgba(13, 34, 48, 0.94)',
  cyan: '#20f4dc',
  teal: '#19bdb5',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  gold: '#20f4dc',
  line: 'rgba(191, 231, 255, 0.2)',
} as const;

export const PremiumSetupIntroScreen: React.FC<PremiumSetupIntroScreenProps> = ({
  onContinue,
  testID = 'premium-setup-intro-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(26);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const cardGlow = useSharedValue(0.45);
  const progressOne = useSharedValue(0);
  const progressTwo = useSharedValue(0);
  const progressThree = useSharedValue(0);
  const badgePulse = useSharedValue(1);

  useEffect(() => {
    Analytics.onboardingStepViewed('setup_intro', 2);

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
    cardGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.42, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    progressOne.value = withDelay(260, withTiming(1, { duration: 460 }));
    progressTwo.value = withDelay(620, withTiming(1, { duration: 460 }));
    progressThree.value = withDelay(980, withTiming(1, { duration: 460 }));
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [
    badgePulse,
    cardFloat,
    cardGlow,
    contentOpacity,
    contentTranslateY,
    orbitRotation,
    progressOne,
    progressThree,
    progressTwo,
  ]);

  const handleContinue = () => {
    Analytics.onboardingStepCompleted('setup_intro', Date.now() - mountTime.current);
    if (onContinue) {
      onContinue();
    } else {
      navigation.navigate('GuidedShiftChatSetup');
    }
  };

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

  const cardGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardGlow.value,
    transform: [{ scale: 1 + cardGlow.value * 0.018 }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgePulse.value }],
  }));

  const progressOneStyle = useAnimatedStyle(() => ({
    opacity: progressOne.value,
    transform: [{ scale: 0.92 + progressOne.value * 0.08 }],
  }));

  const progressTwoStyle = useAnimatedStyle(() => ({
    opacity: progressTwo.value,
    transform: [{ scale: 0.92 + progressTwo.value * 0.08 }],
  }));

  const progressThreeStyle = useAnimatedStyle(() => ({
    opacity: progressThree.value,
    transform: [{ scale: 0.92 + progressThree.value * 0.08 }],
  }));

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
            <Text style={styles.stepLabel}>
              {t('setupIntro.stepLabel', { defaultValue: 'Shift setup' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            <Text style={styles.stepCountText}>2</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {t('setupIntro.headline', { defaultValue: "Let's set up your shifts." })}
          </Text>
          <Text style={styles.support}>
            {t('setupIntro.support', {
              defaultValue: 'Ryvro only needs your pattern and one date you know for sure.',
            })}
          </Text>

          <Animated.View
            entering={FadeInDown.delay(260).duration(420)}
            style={styles.setupCardEntry}
          >
            <Animated.View
              style={[styles.setupCard, cardAnimatedStyle]}
              testID={`${testID}-setup-card`}
            >
              <Animated.View style={[styles.setupCardGlow, cardGlowAnimatedStyle]} />
              <View style={styles.cardHeader}>
                <Animated.View style={[styles.badge, badgeAnimatedStyle]}>
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGradient}
                  >
                    <Ionicons name="sparkles" size={22} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>
                    {t('setupIntro.cardTitle', { defaultValue: "What we'll ask" })}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {t('setupIntro.promise', {
                      defaultValue: 'Takes about a minute. You can change it later.',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.setupList}>
                <SetupItem
                  iconName="repeat"
                  title={t('setupIntro.patternTitle', { defaultValue: 'Your pattern' })}
                  body={t('setupIntro.patternBody', {
                    defaultValue: 'Example: 2 days, 2 nights, 4 off',
                  })}
                  animatedStyle={progressOneStyle}
                />
                <SetupItem
                  iconName="calendar-clear"
                  title={t('setupIntro.dateTitle', { defaultValue: 'One known date' })}
                  body={t('setupIntro.dateBody', {
                    defaultValue: 'Pick a day you remember',
                  })}
                  animatedStyle={progressTwoStyle}
                />
                <SetupItem
                  iconName="moon"
                  title={t('setupIntro.shiftTitle', { defaultValue: "That day's shift" })}
                  body={t('setupIntro.shiftBody', {
                    defaultValue: 'Day, night, off, or custom',
                  })}
                  animatedStyle={progressThreeStyle}
                />
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520).duration(420)} style={styles.bottomPanel}>
          <PremiumButton
            title={t('setupIntro.cta', { defaultValue: 'Continue setup' })}
            onPress={handleContinue}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={<Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />}
            iconPosition="right"
            style={styles.primaryCtaButton}
            contentStyle={styles.primaryCtaButtonContent}
            textStyle={styles.primaryCtaText}
            titleNumberOfLines={1}
            accessibilityHint={t('setupIntro.ctaHint', {
              defaultValue: 'Continue to schedule setup.',
            })}
            testID={`${testID}-button`}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

type SetupItemProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
};

const SetupItem: React.FC<SetupItemProps> = ({ iconName, title, body, animatedStyle }) => {
  return (
    <Animated.View style={[styles.setupItem, animatedStyle]}>
      <View style={styles.itemIcon}>
        <Ionicons name={iconName} size={20} color={RYVRO_COLORS.cyan} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemBody}>{body}</Text>
      </View>
      <View style={styles.itemCheck}>
        <Ionicons name="checkmark" size={16} color={RYVRO_COLORS.void} />
      </View>
    </Animated.View>
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
  setupCard: {
    alignSelf: 'stretch',
    maxWidth: 360,
    marginTop: 34,
    padding: 20,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    overflow: 'hidden',
    position: 'relative',
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
  setupCardEntry: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  setupCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(32, 244, 220, 0.075)',
    borderRadius: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
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
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  cardSubtitle: {
    marginTop: 3,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  setupList: {
    marginTop: 18,
    gap: 12,
    zIndex: 1,
  },
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(2, 7, 11, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.14)',
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  itemBody: {
    marginTop: 2,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  itemCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.gold,
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
