import React, { useEffect, useRef, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { userService } from '@/services/UserService';
import { appStateStorageService } from '@/services/AppStateStorageService';
import { subscriptionEntitlementCacheService } from '@/services/SubscriptionEntitlementCacheService';
import { useSubscription } from '@/hooks/useSubscription';
import { Analytics } from '@/utils/analytics';
import { triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { logger } from '@/utils/logger';
import { getOnboardingSaveErrorMessage } from '@/utils/onboardingErrorMessage';
import {
  persistOnboardingData,
  setPersistedOnboardingComplete,
} from '@/utils/onboardingPersistence';

export interface PremiumCompletionScreenProps {
  onComplete?: () => void;
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
  line: 'rgba(191, 231, 255, 0.2)',
  error: '#ff8a80',
} as const;

const COMPLETION_ANALYTICS_STEP = 12;

export const PremiumCompletionScreen: React.FC<PremiumCompletionScreenProps> = ({
  onComplete,
  testID = 'premium-completion-screen',
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, validateData } = useOnboarding();
  const { user } = useAuth();
  const { isPro, isLoading: subscriptionLoading } = useSubscription();
  const [isSaving, setIsSaving] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const trackedRef = useRef(false);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);
  const checkScale = useSharedValue(0.92);
  const orbitRotation = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('completion', COMPLETION_ANALYTICS_STEP);
    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    checkScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
  }, [checkScale, contentOpacity, contentTranslateY, orbitRotation]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const saveOnboardingData = async () => {
    setIsSaving(true);
    setSaveError(null);

    const validation = validateData();
    if (!validation.isValid) {
      setSaveError(`Missing required information: ${validation.missingFields.join(', ')}.`);
      setIsSaving(false);
      return;
    }

    try {
      await setPersistedOnboardingComplete(true);
      await persistOnboardingData(data);

      if (user) {
        try {
          await userService.createOrSyncUserProfile(user.uid, data, user.email);
        } catch (syncError) {
          logger.error('Failed to sync onboarding data to Firestore', syncError as Error, {
            userId: user.uid,
          });
        }
      }

      if (!trackedRef.current) {
        trackedRef.current = true;
        const installStartedAt = (await appStateStorageService.getInstallStartedAt()) ?? 0;
        const timeToCompleteSeconds =
          Number.isFinite(installStartedAt) && installStartedAt > 0
            ? Math.max(0, Math.round((Date.now() - installStartedAt) / 1000))
            : 0;
        const cachedIsPro = subscriptionLoading
          ? await subscriptionEntitlementCacheService.getCachedIsPro(user?.uid ?? null)
          : null;

        Analytics.onboardingCompleted({
          schedule_name: data.universalSchedule?.name ?? null,
          country: data.country ?? null,
          pain_point: data.painPoint ?? null,
          time_to_complete_seconds: timeToCompleteSeconds,
          is_pro: isPro || cachedIsPro === true,
          platform: Platform.OS,
        });
      }

      setIsSaved(true);
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumCompletionScreen.saveOnboardingData.success',
      });
    } catch (error) {
      logger.error('Failed to save onboarding data', error as Error);
      setSaveError(getOnboardingSaveErrorMessage(error));
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumCompletionScreen.saveOnboardingData.error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    void saveOnboardingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enterApp = () => {
    if (!isSaved) return;
    onComplete?.();

    const parentNavigation =
      typeof navigation.getParent === 'function'
        ? navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
        : undefined;

    if (parentNavigation && typeof parentNavigation.reset === 'function') {
      parentNavigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      return;
    }

    navigation.navigate('Main');
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
      <Animated.View style={[styles.orbit, orbitAnimatedStyle]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.content,
          contentAnimatedStyle,
          {
            paddingTop: Math.max(insets.top + 26, 54),
            paddingBottom: Math.max(insets.bottom + 30, 48),
          },
        ]}
      >
        <Animated.View style={[styles.checkShell, checkAnimatedStyle]}>
          <LinearGradient colors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]} style={styles.checkIcon}>
            <Ionicons name="checkmark" size={44} color={RYVRO_COLORS.void} />
          </LinearGradient>
        </Animated.View>

        <Text style={styles.headline}>You’re set.</Text>
        <Text style={styles.support}>Ask Ryvro about your shift.</Text>

        <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="mic" size={22} color={RYVRO_COLORS.cyan} />
            <Text style={styles.cardText}>Ask by voice anytime.</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Ionicons name="calendar-clear" size={22} color={RYVRO_COLORS.cyan} />
            <Text style={styles.cardText}>Ryvro knows your shift pattern.</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardRow}>
            <Ionicons name="time" size={22} color={RYVRO_COLORS.cyan} />
            <Text style={styles.cardText}>Today and next shift are ready.</Text>
          </View>
        </Animated.View>

        {saveError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        ) : null}

        <View style={styles.bottomPanel}>
          <PremiumButton
            title={isSaving ? 'Saving...' : 'Ask Ryvro'}
            onPress={enterApp}
            disabled={!isSaved || isSaving}
            variant="primary"
            size="large"
            primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
            icon={
              isSaving ? (
                <ActivityIndicator size="small" color={RYVRO_COLORS.void} />
              ) : (
                <Ionicons name="mic-circle" size={28} color={RYVRO_COLORS.void} />
              )
            }
            iconPosition="right"
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
            textStyle={styles.primaryButtonText}
            testID={`${testID}-enter-app`}
          />

          {saveError ? (
            <TouchableOpacity onPress={saveOnboardingData} style={styles.retryButton}>
              <Text style={styles.retryText}>Try saving again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
};

export default PremiumCompletionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RYVRO_COLORS.void,
  },
  cyanGlow: {
    position: 'absolute',
    top: -104,
    left: -112,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 126,
    right: -150,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(20, 124, 255, 0.16)',
  },
  orbit: {
    position: 'absolute',
    top: 196,
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
    alignItems: 'center',
  },
  checkShell: {
    marginTop: 48,
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 8,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
  },
  checkIcon: {
    flex: 1,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    marginTop: 28,
    color: RYVRO_COLORS.silver,
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '900',
    textAlign: 'center',
  },
  support: {
    marginTop: 10,
    color: RYVRO_COLORS.muted,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    marginTop: 34,
    padding: 20,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    flex: 1,
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: RYVRO_COLORS.line,
    marginVertical: 15,
  },
  errorBox: {
    alignSelf: 'stretch',
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 138, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 128, 0.28)',
  },
  errorText: {
    color: RYVRO_COLORS.error,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomPanel: {
    alignSelf: 'stretch',
    marginTop: 'auto',
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
  retryButton: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  retryText: {
    color: RYVRO_COLORS.muted,
    fontSize: 15,
    fontWeight: '800',
  },
});
