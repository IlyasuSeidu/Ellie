/**
 * EmailVerificationScreen
 *
 * Optional verification screen after sign-up.
 * Polls current user for emailVerified and lets user resend verification email.
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { getFirebaseAuth } from '@/config/firebase';
import { readPersistedOnboardingCompletionStatus } from '@/utils/onboardingPersistence';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { AuthBackground } from './AuthBackground';
import { authStyles, RYVRO_AUTH_COLORS } from './authStyles';

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
        const onboardingComplete = await readPersistedOnboardingCompletionStatus();
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
      <AuthBackground />

      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={56} color={RYVRO_AUTH_COLORS.cyan} />
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
            <Ionicons name="alert-circle-outline" size={16} color={RYVRO_AUTH_COLORS.error} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.pollingRow}>
          <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.cyan} />
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
            <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.cyan} />
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

const styles = authStyles;
