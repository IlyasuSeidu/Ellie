/**
 * PremiumWelcomeScreen Component
 *
 * First-run promise screen for the voice-first Ryvro experience.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Image, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PremiumButton } from '@/components/onboarding/premium';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { Analytics } from '@/utils/analytics';
import { appStateStorageService } from '@/services/AppStateStorageService';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export interface PremiumWelcomeScreenProps {
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

export const PremiumWelcomeScreen: React.FC<PremiumWelcomeScreenProps> = ({
  onContinue,
  testID = 'premium-welcome-screen',
}) => {
  const { t } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const contentTranslateY = useSharedValue(26);
  const contentOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);
  const cardGlow = useSharedValue(0.45);
  const questionReveal = useSharedValue(0);
  const answerReveal = useSharedValue(0);
  const waveOne = useSharedValue(0.42);
  const waveTwo = useSharedValue(0.76);
  const waveThree = useSharedValue(0.55);

  useEffect(() => {
    Analytics.onboardingStepViewed('welcome', 1);
    void appStateStorageService
      .ensureInstallStartedAt()
      .then((installTime) => {
        Analytics.onboardingStarted({ install_time_epoch: installTime });
      })
      .catch(() => {
        // Non-blocking analytics bootstrap.
      });

    logoOpacity.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSpring(1, { damping: 17, stiffness: 170 });
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    contentTranslateY.value = withDelay(180, withSpring(0, { damping: 18, stiffness: 170 }));
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
      false
    );
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    cardGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.42, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    questionReveal.value = withDelay(520, withTiming(1, { duration: 520 }));
    answerReveal.value = withDelay(980, withTiming(1, { duration: 620 }));
    waveOne.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.36, { duration: 520, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    waveTwo.value = withRepeat(
      withSequence(
        withTiming(0.38, { duration: 360, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    waveThree.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 460, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.44, { duration: 430, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [
    answerReveal,
    cardFloat,
    cardGlow,
    contentOpacity,
    contentTranslateY,
    logoOpacity,
    logoScale,
    orbitRotation,
    pulseScale,
    questionReveal,
    waveOne,
    waveThree,
    waveTwo,
  ]);

  const handleContinue = () => {
    Analytics.onboardingStepCompleted('welcome', Date.now() - mountTime.current);
    if (onContinue) {
      onContinue();
    } else {
      navigation.navigate('SetupIntro');
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const demoCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const demoGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardGlow.value,
    transform: [{ scale: 1 + cardGlow.value * 0.018 }],
  }));

  const questionRevealStyle = useAnimatedStyle(() => ({
    opacity: questionReveal.value,
    transform: [{ translateY: (1 - questionReveal.value) * 8 }],
  }));

  const answerRevealStyle = useAnimatedStyle(() => ({
    opacity: answerReveal.value,
    transform: [{ translateY: (1 - answerReveal.value) * 10 }],
  }));

  const dividerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + answerReveal.value * 0.65,
    transform: [{ scaleX: 0.2 + answerReveal.value * 0.8 }],
  }));

  const micRingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - (pulseScale.value - 1) * 6,
    transform: [{ scale: 1.1 + (pulseScale.value - 1) * 3.4 }],
  }));

  const waveOneStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: waveOne.value }],
  }));

  const waveTwoStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: waveTwo.value }],
  }));

  const waveThreeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: waveThree.value }],
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
            paddingBottom: Math.max(insets.bottom + 24, 42),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
      >
        <Animated.View style={[styles.brandRow, logoAnimatedStyle]}>
          <View style={styles.logoFrame}>
            <Image
              source={require('../../../../assets/icon.png')}
              style={styles.logoIcon}
              resizeMode="cover"
            />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Ryvro</Text>
            <Text style={styles.brandTag}>Voice shift assistant</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.kicker}>No calendars. No guessing.</Text>
          <Text style={styles.headline}>
            {t('welcome.headline', {
              defaultValue: 'Ask Ryvro what shift you have.',
            })}
          </Text>
          <Text style={styles.tagline}>
            {t('welcome.tagline', {
              defaultValue: 'Set your shifts once. Then ask by voice anytime.',
            })}
          </Text>

          <Animated.View
            entering={FadeInDown.delay(360).duration(420)}
            style={styles.demoCardEntry}
          >
            <Animated.View
              style={[styles.demoCard, demoCardAnimatedStyle]}
              testID={`${testID}-demo-card`}
            >
              <Animated.View style={[styles.demoCardGlow, demoGlowAnimatedStyle]} />
              <Animated.View style={[styles.questionRow, questionRevealStyle]}>
                <Animated.View style={[styles.micPulse, pulseAnimatedStyle]}>
                  <Animated.View style={[styles.micRing, micRingAnimatedStyle]} />
                  <LinearGradient
                    colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.micCircle}
                  >
                    <Ionicons name="mic" size={26} color={RYVRO_COLORS.void} />
                  </LinearGradient>
                </Animated.View>
                <View style={styles.questionCopy}>
                  <View style={styles.questionMetaRow}>
                    <Text style={styles.questionLabel}>You ask</Text>
                    <View style={styles.waveform} accessibilityElementsHidden>
                      <Animated.View style={[styles.waveBar, waveOneStyle]} />
                      <Animated.View style={[styles.waveBar, styles.waveBarTall, waveTwoStyle]} />
                      <Animated.View style={[styles.waveBar, waveThreeStyle]} />
                    </View>
                  </View>
                  <Text style={styles.questionText}>
                    {t('welcome.demoQuestion', {
                      defaultValue: 'What shift am I on Friday?',
                    })}
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.answerDivider, dividerAnimatedStyle]} />

              <Animated.View style={[styles.answerRow, answerRevealStyle]}>
                <View style={styles.answerIcon}>
                  <Ionicons name="checkmark" size={18} color={RYVRO_COLORS.void} />
                </View>
                <View style={styles.answerCopy}>
                  <Text style={styles.answerLabel}>Ryvro says</Text>
                  <Text style={styles.answerText}>
                    {t('welcome.demoAnswer', {
                      defaultValue: 'On Friday, you are on Night shift.',
                    })}
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(520).duration(420)} style={styles.bottomPanel}>
          <View style={styles.promiseRow}>
            <View style={styles.promiseDot} />
            <Text style={styles.promiseText}>
              {t('welcome.promise', {
                defaultValue: 'Made for tired shift workers who just need a straight answer.',
              })}
            </Text>
          </View>

          <PremiumButton
            title={t('welcome.getStarted', { defaultValue: 'Set up my shifts' })}
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
            accessibilityHint={t('welcome.getStartedHint', {
              defaultValue: 'Continue to set up your shifts.',
            })}
            testID={`${testID}-button`}
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
    top: -92,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(32, 244, 220, 0.18)',
  },
  blueGlow: {
    position: 'absolute',
    top: 86,
    right: -130,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20, 124, 255, 0.16)',
  },
  goldGlow: {
    position: 'absolute',
    bottom: 24,
    right: -110,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(244, 184, 66, 0.13)',
  },
  orbit: {
    position: 'absolute',
    top: 122,
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.13)',
    borderRightColor: 'rgba(244, 184, 66, 0.42)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoFrame: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.26)',
    backgroundColor: RYVRO_COLORS.void,
    ...Platform.select({
      ios: {
        shadowColor: RYVRO_COLORS.cyan,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoIcon: {
    width: 64,
    height: 64,
  },
  brandCopy: {
    flex: 1,
  },
  brandName: {
    color: RYVRO_COLORS.silver,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: 0,
  },
  brandTag: {
    marginTop: 2,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  kicker: {
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginBottom: 18,
    color: RYVRO_COLORS.gold,
    backgroundColor: 'rgba(244, 184, 66, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 184, 66, 0.23)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  headline: {
    maxWidth: 350,
    color: '#f6fbff',
    fontSize: 43,
    lineHeight: 47,
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
  tagline: {
    maxWidth: 334,
    marginTop: 16,
    color: RYVRO_COLORS.muted,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  demoCard: {
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
  demoCardEntry: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  demoCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(32, 244, 220, 0.075)',
    borderRadius: 28,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  micPulse: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.12)',
    position: 'relative',
  },
  micRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.52)',
  },
  micCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCopy: {
    flex: 1,
    minWidth: 0,
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  questionLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 14,
  },
  waveBar: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: RYVRO_COLORS.cyan,
  },
  waveBarTall: {
    height: 16,
    backgroundColor: RYVRO_COLORS.blue,
  },
  questionText: {
    marginTop: 4,
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
    flexShrink: 1,
  },
  answerDivider: {
    height: 1,
    marginVertical: 18,
    backgroundColor: 'rgba(191, 231, 255, 0.14)',
    zIndex: 1,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  answerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.gold,
  },
  answerCopy: {
    flex: 1,
    minWidth: 0,
  },
  answerLabel: {
    color: RYVRO_COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  answerText: {
    marginTop: 4,
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
    flexShrink: 1,
  },
  bottomPanel: {
    gap: 16,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 10,
    maxWidth: 340,
    paddingHorizontal: 2,
  },
  promiseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: RYVRO_COLORS.gold,
  },
  promiseText: {
    flexShrink: 1,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
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
