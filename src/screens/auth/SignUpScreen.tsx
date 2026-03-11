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
          <Ionicons name="arrow-back-outline" size={22} color={theme.colors.dust} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.title}>
            {t('auth.signUp.title', {
              defaultValue: 'Create account',
            })}
          </Text>
          <Text style={styles.subtitle}>
            {t('auth.signUp.subtitle', {
              defaultValue: 'Start tracking your shifts with Ellie',
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
            <View style={[styles.inputWrapper, fieldErrors.email ? styles.inputError : null]}>
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
                  clearFieldError('email');
                }}
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
                color={theme.colors.dust}
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
                placeholderTextColor={theme.colors.shadow}
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
                  color={theme.colors.dust}
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
                color={theme.colors.dust}
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
                placeholderTextColor={theme.colors.shadow}
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
                  color={theme.colors.dust}
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
              <ActivityIndicator size="small" color={theme.colors.deepVoid} />
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
              onPress={handleAppleSignUp}
              disabled={isSocialLoading !== null}
              activeOpacity={0.8}
              testID="apple-sign-up-button"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  scroll: { flexGrow: 1, paddingHorizontal: theme.spacing.xl },
  backButton: { marginBottom: theme.spacing.lg, alignSelf: 'flex-start', padding: 4 },
  header: { marginBottom: theme.spacing.xl },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.paper,
    marginBottom: theme.spacing.xs,
  },
  subtitle: { fontSize: theme.typography.fontSizes.md, color: theme.colors.dust },
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
  eyeButton: { padding: 4 },
  fieldError: { fontSize: 12, color: theme.colors.error, marginTop: 2 },
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.softStone },
  dividerText: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.dust },
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
  appleButton: { backgroundColor: theme.colors.paper, borderColor: theme.colors.paper },
  appleButtonText: { color: theme.colors.deepVoid },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: { color: theme.colors.dust, fontSize: theme.typography.fontSizes.sm },
  footerLink: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
});
