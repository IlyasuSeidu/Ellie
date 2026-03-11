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
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

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
      <LinearGradient
        colors={[theme.colors.opacity.gold10, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back-outline" size={22} color={theme.colors.dust} />
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
                  <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
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
                    color={theme.colors.dust}
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
                    placeholderTextColor={theme.colors.shadow}
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
                  <ActivityIndicator size="small" color={theme.colors.deepVoid} />
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
              <Ionicons name="mail-open-outline" size={48} color={theme.colors.sacredGold} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  inner: { flex: 1, paddingHorizontal: theme.spacing.xl },
  backButton: { marginBottom: theme.spacing.lg, alignSelf: 'flex-start', padding: 4 },
  header: { marginBottom: theme.spacing.xl },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.paper,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    lineHeight: 22,
  },
  form: { gap: theme.spacing.sm },
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
    marginBottom: theme.spacing.xs,
  },
  errorBannerText: { color: theme.colors.error, fontSize: theme.typography.fontSizes.sm, flex: 1 },
  fieldGroup: { gap: 6, marginBottom: theme.spacing.xs },
  fieldLabel: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 52,
  },
  inputError: { borderColor: theme.colors.error },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, color: theme.colors.paper, fontSize: theme.typography.fontSizes.md },
  fieldError: { fontSize: 12, color: theme.colors.error },
  primaryButton: {
    height: 52,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.opacity.gold10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold30,
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    textAlign: 'center',
  },
  successBody: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
    lineHeight: 24,
  },
});
