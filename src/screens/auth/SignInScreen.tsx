/**
 * SignInScreen
 *
 * Email/password sign-in with Google and Apple social options.
 * Uses Zod for field validation, Reanimated for entrance animations,
 * and Haptics for tactile feedback on errors/success.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

export const SignInScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { signIn, signInWithGoogle, signInWithApple, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleEmailChange = useCallback(
    (v: string) => {
      setEmail(v);
      if (error) clearError();
      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
    },
    [error, clearError, fieldErrors.email]
  );

  const handlePasswordChange = useCallback(
    (v: string) => {
      setPassword(v);
      if (error) clearError();
      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
    },
    [error, clearError, fieldErrors.password]
  );

  const handleSignIn = useCallback(async () => {
    const signInSchema = z.object({
      email: z.string().email(
        t('auth.validation.validEmail', {
          defaultValue: 'Enter a valid email address',
        })
      ),
      password: z.string().min(
        1,
        t('auth.validation.passwordRequired', {
          defaultValue: 'Password is required',
        })
      ),
    });

    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, signIn, t]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsSocialLoading('google');
    try {
      await signInWithGoogle();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSocialLoading(null);
    }
  }, [signInWithGoogle]);

  const handleAppleSignIn = useCallback(async () => {
    setIsSocialLoading('apple');
    try {
      await signInWithApple();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSocialLoading(null);
    }
  }, [signInWithApple]);

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

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Text style={styles.appName}>
            {t('auth.signIn.appName', {
              defaultValue: 'ELLIE',
            })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.signIn.subtitle', {
              defaultValue: 'Sign in to your account',
            })}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.form}>
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
            <View style={[styles.inputWrapper, fieldErrors.email ? styles.inputError : null]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={fieldErrors.email ? theme.colors.error : theme.colors.dust}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={handleEmailChange}
                placeholder={t('auth.fields.emailPlaceholder', {
                  defaultValue: 'your@email.com',
                })}
                placeholderTextColor={theme.colors.shadow}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                testID="email-input"
              />
            </View>
            {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('auth.fields.passwordLabel', {
                defaultValue: 'Password',
              })}
            </Text>
            <View style={[styles.inputWrapper, fieldErrors.password ? styles.inputError : null]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={fieldErrors.password ? theme.colors.error : theme.colors.dust}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={t('auth.fields.passwordPlaceholder', {
                  defaultValue: 'Password',
                })}
                placeholderTextColor={theme.colors.shadow}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                testID="password-input"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.colors.dust}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
            activeOpacity={0.7}
            testID="forgot-password-link"
          >
            <Text style={styles.forgotText}>
              {t('auth.signIn.forgotPassword', {
                defaultValue: 'Forgot password?',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting}
            activeOpacity={0.85}
            testID="sign-in-button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.deepVoid} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.signIn.primaryButton', {
                  defaultValue: 'Sign In',
                })}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {t('auth.signIn.socialDivider', {
                defaultValue: 'or continue with',
              })}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignIn}
            disabled={isSocialLoading !== null}
            activeOpacity={0.8}
            testID="google-sign-in-button"
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator size="small" color={theme.colors.paper} />
            ) : (
              <Ionicons name="logo-google" size={20} color={theme.colors.paper} />
            )}
            <Text style={styles.socialButtonText}>
              {t('auth.social.google', {
                defaultValue: 'Continue with Google',
              })}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={handleAppleSignIn}
              disabled={isSocialLoading !== null}
              activeOpacity={0.8}
              testID="apple-sign-in-button"
            >
              {isSocialLoading === 'apple' ? (
                <ActivityIndicator size="small" color={theme.colors.deepVoid} />
              ) : (
                <Ionicons name="logo-apple" size={20} color={theme.colors.deepVoid} />
              )}
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                {t('auth.social.apple', {
                  defaultValue: 'Continue with Apple',
                })}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.signIn.noAccount', {
              defaultValue: "Don't have an account? ",
            })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            activeOpacity={0.7}
            testID="create-account-link"
          >
            <Text style={styles.footerLink}>
              {t('auth.signIn.createAccount', {
                defaultValue: 'Create account',
              })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  appName: {
    fontSize: theme.typography.fontSizes.xxxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.paper,
    letterSpacing: 6,
    textShadowColor: theme.colors.sacredGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.medium,
  },
  form: {
    gap: theme.spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
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
  inputError: {
    borderColor: theme.colors.error,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
  },
  eyeButton: {
    padding: 4,
  },
  fieldError: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 2,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  forgotText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.medium,
  },
  primaryButton: {
    height: 52,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.softStone,
  },
  dividerText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    height: 52,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  socialButtonText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  appleButton: {
    backgroundColor: theme.colors.paper,
    borderColor: theme.colors.paper,
  },
  appleButtonText: {
    color: theme.colors.deepVoid,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
  },
  footerLink: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
});
