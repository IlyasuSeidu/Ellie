/**
 * EmailVerificationScreen
 *
 * Optional verification screen after sign-up.
 * Polls current user for emailVerified and lets user resend verification email.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { getFirebaseAuth } from '@/config/firebase';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'EmailVerification'>;
type Route = RouteProp<AuthStackParamList, 'EmailVerification'>;

const POLL_INTERVAL_MS = 3000;

export const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { sendEmailVerification, error, clearError } = useAuth();

  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNavigatedAfterVerificationRef = useRef(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const navigateAfterVerification = useCallback(async () => {
    if (hasNavigatedAfterVerificationRef.current) {
      return;
    }
    hasNavigatedAfterVerificationRef.current = true;

    const parentNavigation =
      typeof navigation.getParent === 'function'
        ? navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
        : undefined;

    if (parentNavigation && typeof parentNavigation.reset === 'function') {
      try {
        const onboardingComplete = await asyncStorageService.get<boolean>('onboarding:complete');
        const nextRoute: 'Main' | 'Onboarding' =
          onboardingComplete === true ? 'Main' : 'Onboarding';
        parentNavigation.reset({
          index: 0,
          routes: [{ name: nextRoute }],
        });
        return;
      } catch {
        parentNavigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
        return;
      }
    }

    navigation.navigate('SignIn');
  }, [navigation]);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return;
        await user.reload();
        if (user.emailVerified) {
          await navigateAfterVerification();
        }
      } catch {
        // Keep polling on transient errors.
      }
    };

    void checkVerificationStatus();
    const interval = setInterval(() => {
      void checkVerificationStatus();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [navigateAfterVerification]);

  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await sendEmailVerification();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResendCooldown(60);

      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }

      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsResending(false);
    }
  }, [resendCooldown, sendEmailVerification]);

  const handleSkip = useCallback(() => {
    const parentNavigation =
      typeof navigation.getParent === 'function'
        ? navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
        : undefined;

    if (parentNavigation && typeof parentNavigation.reset === 'function') {
      parentNavigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
      return;
    }

    navigation.navigate('SignIn');
  }, [navigation]);

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
    >
      <LinearGradient
        colors={[theme.colors.opacity.gold10, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={56} color={theme.colors.sacredGold} />
        </View>

        <Text style={styles.title}>
          {t('auth.emailVerification.title', {
            defaultValue: 'Verify your email',
          })}
        </Text>
        <Text style={styles.subtitle}>
          {t('auth.emailVerification.subtitle', {
            defaultValue: 'We sent a verification link to {{email}}',
            email,
          })}
        </Text>

        <Text style={styles.instructions}>
          {t('auth.emailVerification.instructions', {
            defaultValue:
              'Click the link in the email to activate your account. This screen will update automatically.',
          })}
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.pollingRow}>
          <ActivityIndicator size="small" color={theme.colors.dust} />
          <Text style={styles.pollingText}>
            {t('auth.emailVerification.waiting', {
              defaultValue: 'Waiting for verification…',
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.resendButton, resendCooldown > 0 ? styles.resendButtonDisabled : null]}
          onPress={handleResend}
          disabled={isResending || resendCooldown > 0}
          activeOpacity={0.7}
          testID="resend-verification-button"
        >
          {isResending ? (
            <ActivityIndicator size="small" color={theme.colors.sacredGold} />
          ) : (
            <Text style={styles.resendText}>
              {resendCooldown > 0
                ? t('auth.emailVerification.resendIn', {
                    defaultValue: 'Resend in {{seconds}}s',
                    seconds: resendCooldown,
                  })
                : t('auth.emailVerification.resend', {
                    defaultValue: 'Resend verification email',
                  })}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          testID="skip-verification-button"
        >
          <Text style={styles.skipText}>
            {t('auth.emailVerification.skip', {
              defaultValue: "I'll verify later",
            })}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.paper,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
    lineHeight: 24,
  },
  instructions: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
  },
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pollingText: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.dust },
  resendButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  resendButtonDisabled: { opacity: 0.5 },
  resendText: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  skipButton: { paddingVertical: theme.spacing.sm },
  skipText: { color: theme.colors.shadow, fontSize: theme.typography.fontSizes.sm },
});
