/**
 * SignUpScreen
 *
 * Create account with email, password + confirm.
 * After sign-up: AuthContext.signUp() creates the Firebase user.
 * onAuthStateChanged fires and AppNavigator routes to Onboarding.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { AuthBackground } from './AuthBackground';
import { authStyles, RYVRO_AUTH_COLORS } from './authStyles';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { signUp, signInWithGoogle, signInWithApple, sendEmailVerification, error, clearError } =
    useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const clearFieldError = useCallback(
    (field: 'email' | 'password' | 'confirmPassword') =>
      setFieldErrors((p) => ({ ...p, [field]: undefined })),
    []
  );

  const handleSignUp = useCallback(async () => {
    const signUpSchema = z
      .object({
        email: z.string().email(
          t('auth.validation.validEmail', {
            defaultValue: 'Enter a valid email address',
          })
        ),
        password: z
          .string()
          .min(
            8,
            t('auth.validation.passwordMin', {
              defaultValue: 'Password must be at least 8 characters',
            })
          )
          .regex(
            /[A-Z]/,
            t('auth.validation.passwordUpper', {
              defaultValue: 'Must contain an uppercase letter',
            })
          )
          .regex(
            /[a-z]/,
            t('auth.validation.passwordLower', {
              defaultValue: 'Must contain a lowercase letter',
            })
          )
          .regex(
            /[0-9]/,
            t('auth.validation.passwordNumber', {
              defaultValue: 'Must contain a number',
            })
          ),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        message: t('auth.validation.passwordsMatch', {
          defaultValue: 'Passwords do not match',
        }),
        path: ['confirmPassword'],
      });

    const result = signUpSchema.safeParse({ email: email.trim(), password, confirmPassword });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password);
      try {
        await sendEmailVerification();
      } catch {
        // Do not block sign-up flow if verification email fails.
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, confirmPassword, signUp, sendEmailVerification, t]);

  const handleGoogleSignUp = useCallback(async () => {
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

  const handleAppleSignUp = useCallback(async () => {
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
      <AuthBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back-outline" size={22} color={RYVRO_AUTH_COLORS.silver} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.title}>
            {t('auth.signUp.title', {
              defaultValue: 'Create account',
            })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.signUp.subtitle', {
              defaultValue: 'Start tracking your shifts with Ryvro',
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
            <View style={[styles.inputWrapper, fieldErrors.email ? styles.inputError : null]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={fieldErrors.email ? RYVRO_AUTH_COLORS.error : RYVRO_AUTH_COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  clearError();
                  clearFieldError('email');
                }}
                placeholder={t('auth.fields.emailPlaceholder', {
                  defaultValue: 'your@email.com',
                })}
                placeholderTextColor="rgba(157, 178, 194, 0.58)"
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
                color={fieldErrors.password ? RYVRO_AUTH_COLORS.error : RYVRO_AUTH_COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  clearError();
                  clearFieldError('password');
                }}
                placeholder={t('auth.signUp.passwordHint', {
                  defaultValue: 'Min. 8 chars, uppercase, number',
                })}
                placeholderTextColor="rgba(157, 178, 194, 0.58)"
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
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
                  color={RYVRO_AUTH_COLORS.muted}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('auth.signUp.confirmPasswordLabel', {
                defaultValue: 'Confirm password',
              })}
            </Text>
            <View
              style={[styles.inputWrapper, fieldErrors.confirmPassword ? styles.inputError : null]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={
                  fieldErrors.confirmPassword ? RYVRO_AUTH_COLORS.error : RYVRO_AUTH_COLORS.muted
                }
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  clearError();
                  clearFieldError('confirmPassword');
                }}
                placeholder={t('auth.signUp.confirmPasswordPlaceholder', {
                  defaultValue: 'Repeat password',
                })}
                placeholderTextColor="rgba(157, 178, 194, 0.58)"
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                testID="confirm-password-input"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((p) => !p)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={RYVRO_AUTH_COLORS.muted}
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmPassword ? (
              <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleSignUp}
            disabled={isSubmitting}
            activeOpacity={0.85}
            testID="create-account-button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.void} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('auth.signUp.primaryButton', {
                  defaultValue: 'Create Account',
                })}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {t('auth.signUp.socialDivider', {
                defaultValue: 'or',
              })}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignUp}
            disabled={isSocialLoading !== null}
            activeOpacity={0.8}
            testID="google-sign-up-button"
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.silver} />
            ) : (
              <Ionicons name="logo-google" size={20} color={RYVRO_AUTH_COLORS.silver} />
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
              onPress={handleAppleSignUp}
              disabled={isSocialLoading !== null}
              activeOpacity={0.8}
              testID="apple-sign-up-button"
            >
              {isSocialLoading === 'apple' ? (
                <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.void} />
              ) : (
                <Ionicons name="logo-apple" size={20} color={RYVRO_AUTH_COLORS.void} />
              )}
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                {t('auth.social.apple', {
                  defaultValue: 'Continue with Apple',
                })}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>
            {t('auth.signUp.haveAccount', {
              defaultValue: 'Already have an account? ',
            })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.7}
            testID="sign-in-link"
          >
            <Text style={styles.footerLink}>
              {t('auth.signUp.signInLink', {
                defaultValue: 'Sign In',
              })}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = authStyles;
