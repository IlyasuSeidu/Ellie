/**
 * ForgotPasswordScreen
 *
 * Enter email and send a reset link.
 * Shows success state after email is sent.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { AuthBackground } from './AuthBackground';
import { authStyles, RYVRO_AUTH_COLORS } from './authStyles';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type Route = RouteProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { sendPasswordReset, error, clearError } = useAuth();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSend = useCallback(async () => {
    const emailSchema = z.object({
      email: z.string().email(
        t('auth.validation.validEmail', {
          defaultValue: 'Enter a valid email address',
        })
      ),
    });

    const result = emailSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setEmailError(result.error.flatten().fieldErrors.email?.[0]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, sendPasswordReset, t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AuthBackground />

      <View
        style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          testID="forgot-password-back-button"
        >
          <Ionicons name="arrow-back-outline" size={22} color={RYVRO_AUTH_COLORS.silver} />
        </TouchableOpacity>

        {!sent ? (
          <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <Text style={styles.title}>
                {t('auth.forgotPassword.title', {
                  defaultValue: 'Reset password',
                })}
              </Text>
              <Text style={styles.subtitle}>
                {t('auth.forgotPassword.subtitle', {
                  defaultValue: "Enter your email and we'll send a link to reset your password.",
                })}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.form}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={RYVRO_AUTH_COLORS.error} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {t('auth.fields.emailLabel', {
                    defaultValue: 'Email',
                  })}
                </Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputError : null]}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={emailError ? RYVRO_AUTH_COLORS.error : RYVRO_AUTH_COLORS.muted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      clearError();
                      setEmailError(undefined);
                    }}
                    placeholder={t('auth.fields.emailPlaceholder', {
                      defaultValue: 'your@email.com',
                    })}
                    placeholderTextColor="rgba(157, 178, 194, 0.58)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    testID="email-input"
                  />
                </View>
                {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting ? styles.primaryButtonDisabled : null]}
                onPress={handleSend}
                disabled={isSubmitting}
                activeOpacity={0.85}
                testID="send-reset-link-button"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.void} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {t('auth.forgotPassword.sendResetLink', {
                      defaultValue: 'Send Reset Link',
                    })}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.successState}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-open-outline" size={48} color={RYVRO_AUTH_COLORS.cyan} />
            </View>
            <Text style={styles.successTitle}>
              {t('auth.forgotPassword.checkInboxTitle', {
                defaultValue: 'Check your inbox',
              })}
            </Text>
            <Text style={styles.successBody}>
              {t('auth.forgotPassword.checkInboxBody', {
                defaultValue: 'We sent a password reset link to {{email}}',
                email: email.trim(),
              })}
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.85}
              testID="back-to-sign-in-button"
            >
              <Text style={styles.primaryButtonText}>
                {t('auth.forgotPassword.backToSignIn', {
                  defaultValue: 'Back to Sign In',
                })}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = authStyles;
