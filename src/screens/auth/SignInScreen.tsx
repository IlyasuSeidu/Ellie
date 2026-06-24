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
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
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
      <AuthBackground />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Image
            source={require('../../../assets/brand/ryvro-in-app-logo.png')}
            style={styles.appLogo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel={t('auth.signIn.appLogoLabel', {
              defaultValue: 'Ryvro app logo',
            })}
            testID="sign-in-app-logo"
          />
          <Text style={styles.title}>
            {t('auth.signIn.title', {
              defaultValue: 'Welcome back',
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
                onChangeText={handleEmailChange}
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
                onChangeText={handlePasswordChange}
                placeholder={t('auth.fields.passwordPlaceholder', {
                  defaultValue: 'Password',
                })}
                placeholderTextColor="rgba(157, 178, 194, 0.58)"
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
                  color={RYVRO_AUTH_COLORS.muted}
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
              <ActivityIndicator size="small" color={RYVRO_AUTH_COLORS.void} />
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
              onPress={handleAppleSignIn}
              disabled={isSocialLoading !== null}
              activeOpacity={0.8}
              testID="apple-sign-in-button"
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

const styles = authStyles;
