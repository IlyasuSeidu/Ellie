# Auth, Storage & Firestore Integration — Ellie App

## Context

Ellie currently has no authentication — all data is stored locally in AsyncStorage under the device. A fully implemented `AuthService.ts` (628 lines), `UserService.ts` (Firestore CRUD), and Firebase initialization (`firebase.ts`) already exist but are **never called**. The `signInWithGoogle` and `signInWithApple` methods use `signInWithPopup` (a web browser API) — both must be replaced with the React Native SDK equivalents. Firebase Auth is initialized with `getAuth()` which does not persist sessions on React Native — this must be changed to `initializeAuth()` with `getReactNativePersistence(AsyncStorage)`.

This plan wires everything together:

- Four auth screens (Sign In, Sign Up, Forgot Password, Email Verification)
- `AuthContext` that wraps the entire app
- Navigation updated to gate on auth state
- Onboarding data synced to Firestore after both auth and onboarding complete
- Firestore security rules protecting every user's data

---

## Auth Flow

```
App Launch
  └── AuthProvider → onAuthStateChanged
        ├── loading → fullscreen ActivityIndicator (deepVoid background)
        ├── user === null → AuthNavigator
        │     ├── SignInScreen (default)
        │     ├── SignUpScreen
        │     ├── ForgotPasswordScreen
        │     └── EmailVerificationScreen
        └── user !== null
              ├── password provider + emailVerified === false
              │     └── AuthNavigator → EmailVerificationScreen (strict gate)
              └── email verified (or non-password provider)
                    ├── onboarding:complete === false → OnboardingNavigator
                    │     └── PremiumCompletionScreen → sync onboarding data to Firestore users/{uid}
                    └── onboarding:complete === true → MainTabNavigator
```

---

## Architecture

```
AuthContext (src/contexts/AuthContext.tsx)
  ├── state: { user: User | null, isLoading: boolean, error: string | null }
  ├── actions: signIn, signUp, signInWithGoogle, signInWithApple, signOut, sendPasswordReset
  └── singleton: new AuthService(getFirebaseAuth())

AuthNavigator (src/navigation/AuthNavigator.tsx)
  └── Stack: SignIn → SignUp | ForgotPassword | EmailVerification

AppNavigator (MODIFIED)
  └── Consumes useAuth() → routes to Auth (incl. strict email verification gate) | Onboarding | Main

PremiumCompletionScreen (MODIFIED)
  └── On success: UserService.createOrSyncUserProfile(uid, onboardingData)
```

---

## Files to Create

---

### 1. `src/contexts/AuthContext.tsx`

```typescript
/**
 * AuthContext
 *
 * Provides Firebase Auth state to the entire app via onAuthStateChanged.
 * Wraps AuthService to expose sign-in, sign-up, social auth, and sign-out
 * as simple async actions with error handling.
 *
 * Provider placed in App.tsx outside NavigationContainer so navigation can
 * consume useAuth() at any level.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { User } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { AuthService } from '@/services/AuthService';
import { getFirebaseAuth } from '@/config/firebase';
import { logger } from '@/utils/logger';

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Currently authenticated user, or null if not signed in */
  user: User | null;
  /** True while the initial auth state is being determined (Firebase restore) */
  isLoading: boolean;
  /** Last auth error message, or null */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
  /** Sign in with email + password */
  signIn(email: string, password: string): Promise<void>;
  /** Create account with email + password */
  signUp(email: string, password: string): Promise<void>;
  /** Sign in / sign up via Google OAuth */
  signInWithGoogle(): Promise<void>;
  /** Sign in / sign up via Apple (iOS only) */
  signInWithApple(): Promise<void>;
  /** Sign out and clear local session */
  signOut(): Promise<void>;
  /** Send a password reset email */
  sendPasswordReset(email: string): Promise<void>;
  /** Send email verification to the current user */
  sendEmailVerification(): Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Module-level singleton — AuthService is stateful (rate limiting, inactivity timer).
// Created once so state persists across re-renders.
let _authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!_authService) {
    _authService = new AuthService(getFirebaseAuth());
  }
  return _authService;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = getAuthService();

  // ── Auth state listener ──────────────────────────────────────────────────
  // Firebase restores the persisted session on first load. isLoading stays
  // true until this fires (usually <500ms with AsyncStorage persistence).

  useEffect(() => {
    const unsubscribe = service.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
      logger.debug('AuthContext: auth state changed', {
        uid: firebaseUser?.uid ?? null,
      });
    });

    return () => {
      unsubscribe();
      service.cleanup();
    };
  }, [service]);

  // ── Google Sign-In config ────────────────────────────────────────────────
  // GoogleSignin.configure must be called before any sign-in attempt.
  // GOOGLE_WEB_CLIENT_ID is the OAuth 2.0 web client ID from Firebase console.

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      offlineAccess: false,
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await service.signInWithEmail(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
      throw err; // rethrow so screens can react (e.g. shake animation)
    }
  }, [service]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await service.signUpWithEmail(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg);
      throw err;
    }
  }, [service]);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);

      // 1. Trigger native Google sign-in sheet
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // 2. Get ID token from the signed-in Google user
      const tokens = await GoogleSignin.getTokens();
      const { idToken } = tokens;

      if (!idToken) throw new Error('No ID token returned from Google');

      // 3. Exchange for Firebase credential
      const credential = GoogleAuthProvider.credential(idToken);
      const auth = getFirebaseAuth();
      await signInWithCredential(auth, credential);

      logger.info('AuthContext: Google sign-in success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      setError(msg);
      throw err;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      setError(null);

      // 1. Trigger Apple Sign-In sheet (iOS only)
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;
      if (!identityToken) throw new Error('No identity token from Apple');

      // 2. Exchange for Firebase credential
      const provider = new OAuthProvider('apple.com');
      const authCredential = provider.credential({ idToken: identityToken });
      const auth = getFirebaseAuth();
      await signInWithCredential(auth, authCredential);

      logger.info('AuthContext: Apple sign-in success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apple sign in failed';
      setError(msg);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await service.signOut();
      // Also sign out from Google if they used Google sign-in
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore: user may not have signed in with Google
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign out failed';
      setError(msg);
      throw err;
    }
  }, [service]);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      setError(null);
      await service.sendPasswordResetEmail(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(msg);
      throw err;
    }
  }, [service]);

  const sendEmailVerification = useCallback(async () => {
    try {
      setError(null);
      await service.sendEmailVerification();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification email';
      setError(msg);
      throw err;
    }
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      sendPasswordReset,
      sendEmailVerification,
    }),
    [
      user,
      isLoading,
      error,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      sendPasswordReset,
      sendEmailVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
};
```

---

### 2. `src/navigation/AuthNavigator.tsx`

```typescript
/**
 * AuthNavigator
 *
 * Native stack for all unauthenticated screens.
 * SignIn is the initial route; Sign Up, Forgot Password, and
 * Email Verification are pushed on top.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: { email?: string } | undefined;
  EmailVerification: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="SignIn"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: theme.colors.deepVoid },
    }}
  >
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
  </Stack.Navigator>
);
```

---

### 3. `src/screens/auth/SignInScreen.tsx`

The main entry point for returning users. Matches the app's stone + gold design system: `deepVoid` background, `LinearGradient` header glow, `sacredGold` accent, `FadeInUp` Reanimated entrance. Reuses `PremiumButton` for primary CTA.

```typescript
/**
 * SignInScreen
 *
 * Email/password sign-in with Google and Apple social options.
 * Uses Zod for field validation, Reanimated for entrance animations,
 * and Haptics for tactile feedback on errors/success.
 */

import React, { useState, useCallback, useRef } from 'react';
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { z } from 'zod';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

// ── Validation ────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Component ────────────────────────────────────────────────────────────────

export const SignInScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, signInWithApple, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);

  const passwordRef = useRef<TextInput>(null);

  // Clear context error when user starts typing
  const handleEmailChange = useCallback((v: string) => {
    setEmail(v);
    if (error) clearError();
    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
  }, [error, clearError, fieldErrors.email]);

  const handlePasswordChange = useCallback((v: string) => {
    setPassword(v);
    if (error) clearError();
    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
  }, [error, clearError, fieldErrors.password]);

  // ── Email/Password sign-in ─────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    const result = signInSchema.safeParse({ email: email.trim(), password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigation happens automatically via onAuthStateChanged in AppNavigator
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, signIn]);

  // ── Social sign-in ─────────────────────────────────────────────────────

  const handleGoogleSignIn = useCallback(async () => {
    setIsSocialLoading('google');
    try {
      await signInWithGoogle();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSocialLoading(null);
    }
  }, [signInWithGoogle]);

  const handleAppleSignIn = useCallback(async () => {
    setIsSocialLoading('apple');
    try {
      await signInWithApple();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSocialLoading(null);
    }
  }, [signInWithApple]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Gold top-gradient glow — matches onboarding style */}
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
        {/* ── Header ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Text style={styles.appName}>ELLIE</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </Animated.View>

        {/* ── Form ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.form}>

          {/* Global auth error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
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
                placeholder="your@email.com"
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
            {fieldErrors.email ? (
              <Text style={styles.fieldError}>{fieldErrors.email}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
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
                placeholder="Password"
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

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Sign In button */}
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
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* ── Social divider ─────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
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
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Apple — iOS only */}
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
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Footer: sign-up link ──────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

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
```

---

### 4. `src/screens/auth/SignUpScreen.tsx`

```typescript
/**
 * SignUpScreen
 *
 * Create account with name, email, password + confirm.
 * After sign-up: AuthContext.signUp() creates the Firebase user.
 * onAuthStateChanged fires → AppNavigator routes to OnboardingNavigator
 * (onboarding:complete is false for new accounts).
 * Email verification is triggered but not blocking — user can complete
 * onboarding with an unverified email and verify later.
 */

import React, { useState, useCallback, useRef } from 'react';
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
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

// ── Validation ────────────────────────────────────────────────────────────────

const signUpSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ── Component ────────────────────────────────────────────────────────────────

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
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

  const clearFieldError = useCallback(
    (field: 'email' | 'password' | 'confirmPassword') =>
      setFieldErrors((p) => ({ ...p, [field]: undefined })),
    []
  );

  const handleSignUp = useCallback(async () => {
    const result = signUpSchema.safeParse({ email: email.trim(), password, confirmPassword });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({
        email: errors.email?.[0],
        password: errors.password?.[0],
        confirmPassword: errors.confirmPassword?.[0],
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email.trim(), password);
      // Send verification email (non-blocking — user continues to onboarding)
      try {
        await sendEmailVerification();
      } catch {
        // Don't block sign-up if verification email fails
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // AppNavigator detects new user → routes to Onboarding
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, confirmPassword, signUp, sendEmailVerification]);

  const handleGoogleSignUp = useCallback(async () => {
    setIsSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSocialLoading(null);
    }
  }, [signInWithGoogle]);

  const handleAppleSignUp = useCallback(async () => {
    setIsSocialLoading('apple');
    try {
      await signInWithApple();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back-outline" size={22} color={theme.colors.dust} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking your shifts with Ellie</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.form}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputWrapper, fieldErrors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.dust} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); clearFieldError('email'); }}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.shadow}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputWrapper, fieldErrors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.dust} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
                placeholder="Min. 8 chars, uppercase, number"
                placeholderTextColor={theme.colors.shadow}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={styles.eyeButton} activeOpacity={0.7}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.dust} />
              </TouchableOpacity>
            </View>
            {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Confirm password</Text>
            <View style={[styles.inputWrapper, fieldErrors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.dust} style={styles.inputIcon} />
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearFieldError('confirmPassword'); }}
                placeholder="Repeat password"
                placeholderTextColor={theme.colors.shadow}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeButton} activeOpacity={0.7}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.dust} />
              </TouchableOpacity>
            </View>
            {fieldErrors.confirmPassword && <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>}
          </View>

          {/* Create account button */}
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
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Social sign-up */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignUp}
            disabled={isSocialLoading !== null}
            activeOpacity={0.8}
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator size="small" color={theme.colors.paper} />
            ) : (
              <Ionicons name="logo-google" size={20} color={theme.colors.paper} />
            )}
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, styles.appleButton]}
              onPress={handleAppleSignUp}
              disabled={isSocialLoading !== null}
              activeOpacity={0.8}
            >
              {isSocialLoading === 'apple' ? (
                <ActivityIndicator size="small" color={theme.colors.deepVoid} />
              ) : (
                <Ionicons name="logo-apple" size={20} color={theme.colors.deepVoid} />
              )}
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Sign-in link */}
        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Styles are identical in structure to SignInScreen — deepVoid bg, gold accents.
// (Omitted for brevity — copy from SignInScreen.styles and extend as needed)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  scroll: { flexGrow: 1, paddingHorizontal: theme.spacing.xl },
  backButton: { marginBottom: theme.spacing.lg, alignSelf: 'flex-start', padding: 4 },
  header: { marginBottom: theme.spacing.xl },
  title: { fontSize: theme.typography.fontSizes.xxl, fontWeight: theme.typography.fontWeights.black, color: theme.colors.paper, marginBottom: theme.spacing.xs },
  subtitle: { fontSize: theme.typography.fontSizes.md, color: theme.colors.dust },
  form: { gap: theme.spacing.sm },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.xs },
  errorBannerText: { color: theme.colors.error, fontSize: theme.typography.fontSizes.sm, flex: 1 },
  fieldGroup: { gap: 6, marginBottom: theme.spacing.xs },
  fieldLabel: { fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: theme.colors.paper },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.darkStone, borderWidth: 1, borderColor: theme.colors.softStone, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, height: 52 },
  inputError: { borderColor: theme.colors.error },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, color: theme.colors.paper, fontSize: theme.typography.fontSizes.md },
  eyeButton: { padding: 4 },
  fieldError: { fontSize: 12, color: theme.colors.error, marginTop: 2 },
  primaryButton: { height: 52, backgroundColor: theme.colors.sacredGold, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: theme.colors.deepVoid, fontSize: theme.typography.fontSizes.md, fontWeight: theme.typography.fontWeights.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginVertical: theme.spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.softStone },
  dividerText: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.dust },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, height: 52, backgroundColor: theme.colors.darkStone, borderWidth: 1, borderColor: theme.colors.softStone, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
  socialButtonText: { color: theme.colors.paper, fontSize: theme.typography.fontSizes.md, fontWeight: theme.typography.fontWeights.semibold },
  appleButton: { backgroundColor: theme.colors.paper, borderColor: theme.colors.paper },
  appleButtonText: { color: theme.colors.deepVoid },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.xl },
  footerText: { color: theme.colors.dust, fontSize: theme.typography.fontSizes.sm },
  footerLink: { color: theme.colors.sacredGold, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold },
});
```

---

### 5. `src/screens/auth/ForgotPasswordScreen.tsx`

```typescript
/**
 * ForgotPasswordScreen
 *
 * Enter email → Firebase sends a password reset link.
 * Shows a success state after the email is sent so user knows to check inbox.
 * Pre-fills the email field if navigated from SignInScreen with email param.
 */

import React, { useState, useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { z } from 'zod';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
type Route = RouteProp<AuthStackParamList, 'ForgotPassword'>;

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { sendPasswordReset, error, clearError } = useAuth();

  const [email, setEmail] = useState(route.params?.email ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(async () => {
    const result = emailSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      setEmailError(result.error.flatten().fieldErrors.email?.[0]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, sendPasswordReset]);

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

      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={22} color={theme.colors.dust} />
        </TouchableOpacity>

        {!sent ? (
          <>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send a link to reset your password.
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
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={[styles.inputWrapper, emailError && styles.inputError]}>
                  <Ionicons name="mail-outline" size={18} color={theme.colors.dust} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError(); setEmailError(undefined); }}
                    placeholder="your@email.com"
                    placeholderTextColor={theme.colors.shadow}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                  />
                </View>
                {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                onPress={handleSend}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={theme.colors.deepVoid} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          /* ── Success state ──────────────────────────────────────── */
          <Animated.View entering={FadeInUp.duration(500)} style={styles.successState}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-open-outline" size={48} color={theme.colors.sacredGold} />
            </View>
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successBody}>
              We sent a password reset link to{'\n'}
              <Text style={styles.successEmail}>{email.trim()}</Text>
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
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
  title: { fontSize: theme.typography.fontSizes.xxl, fontWeight: theme.typography.fontWeights.black, color: theme.colors.paper, marginBottom: theme.spacing.sm },
  subtitle: { fontSize: theme.typography.fontSizes.md, color: theme.colors.dust, lineHeight: 22 },
  form: { gap: theme.spacing.sm },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: theme.borderRadius.md, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, marginBottom: theme.spacing.xs },
  errorBannerText: { color: theme.colors.error, fontSize: theme.typography.fontSizes.sm, flex: 1 },
  fieldGroup: { gap: 6, marginBottom: theme.spacing.xs },
  fieldLabel: { fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: theme.colors.paper },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.darkStone, borderWidth: 1, borderColor: theme.colors.softStone, borderRadius: theme.borderRadius.md, paddingHorizontal: theme.spacing.md, height: 52 },
  inputError: { borderColor: theme.colors.error },
  inputIcon: { marginRight: theme.spacing.sm },
  input: { flex: 1, color: theme.colors.paper, fontSize: theme.typography.fontSizes.md },
  fieldError: { fontSize: 12, color: theme.colors.error },
  primaryButton: { height: 52, backgroundColor: theme.colors.sacredGold, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.sm },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: theme.colors.deepVoid, fontSize: theme.typography.fontSizes.md, fontWeight: theme.typography.fontWeights.bold },
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.colors.opacity.gold10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.opacity.gold30, marginBottom: theme.spacing.md },
  successTitle: { fontSize: theme.typography.fontSizes.xl, fontWeight: theme.typography.fontWeights.bold, color: theme.colors.paper, textAlign: 'center' },
  successBody: { fontSize: theme.typography.fontSizes.md, color: theme.colors.dust, textAlign: 'center', lineHeight: 24 },
  successEmail: { color: theme.colors.paper, fontWeight: theme.typography.fontWeights.semibold },
});
```

---

### 6. `src/screens/auth/EmailVerificationScreen.tsx`

```typescript
/**
 * EmailVerificationScreen
 *
 * Shown after email/password sign-up. Tells the user to verify their email.
 * Polls `user.reload()` every 3 seconds to detect verification.
 * Also provides a "Resend" button and an "I'll do it later" option.
 *
 * Note: For password-provider users, verification is enforced by AppNavigator
 * before onboarding/main access. Unverified accounts are routed here until
 * `emailVerified` becomes true.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { getFirebaseAuth } from '@/config/firebase';
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
  const { sendEmailVerification } = useAuth();

  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds

  // ── Polling for verification ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return;
        await user.reload();
        if (user.emailVerified) {
          clearInterval(interval);
          // onAuthStateChanged will re-fire → AppNavigator routes correctly
        }
      } catch {
        // Network error — keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // ── Resend with 60s cooldown ─────────────────────────────────────────────
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await sendEmailVerification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Start 60s cooldown
      setResendCooldown(60);
      const cooldown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(cooldown); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsResending(false);
    }
  }, [resendCooldown, sendEmailVerification]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <LinearGradient
        colors={[theme.colors.opacity.gold10, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View entering={FadeInUp.duration(500)} style={styles.content}>
        {/* Animated mail icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={56} color={theme.colors.sacredGold} />
        </View>

        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <Text style={styles.instructions}>
          Click the link in the email to activate your account. This screen will update automatically.
        </Text>

        {/* Polling indicator */}
        <View style={styles.pollingRow}>
          <ActivityIndicator size="small" color={theme.colors.dust} />
          <Text style={styles.pollingText}>Waiting for verification…</Text>
        </View>

        {/* Resend */}
        <TouchableOpacity
          style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
          onPress={handleResend}
          disabled={isResending || resendCooldown > 0}
          activeOpacity={0.7}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={theme.colors.sacredGold} />
          ) : (
            <Text style={styles.resendText}>
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend verification email'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip (continue to onboarding unverified) */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            // AppNavigator will route based on auth state — user is already authenticated
            // The navigator re-evaluates and routes to Onboarding
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>I'll verify later</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.deepVoid },
  content: { flex: 1, paddingHorizontal: theme.spacing.xl, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.opacity.gold10, borderWidth: 1, borderColor: theme.colors.opacity.gold30, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  title: { fontSize: theme.typography.fontSizes.xxl, fontWeight: theme.typography.fontWeights.black, color: theme.colors.paper, textAlign: 'center' },
  subtitle: { fontSize: theme.typography.fontSizes.md, color: theme.colors.dust, textAlign: 'center', lineHeight: 24 },
  emailHighlight: { color: theme.colors.paper, fontWeight: theme.typography.fontWeights.semibold },
  instructions: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.shadow, textAlign: 'center', lineHeight: 20 },
  pollingRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  pollingText: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.dust },
  resendButton: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
  resendButtonDisabled: { opacity: 0.5 },
  resendText: { color: theme.colors.sacredGold, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold },
  skipButton: { paddingVertical: theme.spacing.sm },
  skipText: { color: theme.colors.shadow, fontSize: theme.typography.fontSizes.sm },
});
```

---

### 7. `firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ── Users collection ─────────────────────────────────────────
    // Only the authenticated owner can read or write their document.
    // Allow create only if the document ID matches the requester's UID.
    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
    }

    // ── Notifications collection ─────────────────────────────────
    // Notifications are scoped by userId field.
    match /notifications/{notifId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // ── Sleep logs ───────────────────────────────────────────────
    match /sleepLogs/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Files to Modify

---

### 8. `src/config/firebase.ts` ← **CRITICAL FIX**

The current `getAuth(firebaseApp)` call does **not** persist the auth session across app restarts on React Native. Must be changed to `initializeAuth()` with `getReactNativePersistence(AsyncStorage)`.

**Replace `initializeFirebaseAuth`:**

```typescript
// ADD imports at top of firebase.ts:
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REPLACE the existing initializeFirebaseAuth function body:
function initializeFirebaseAuth(firebaseApp: FirebaseApp): Auth {
  if (auth) {
    return auth;
  }

  try {
    // initializeAuth with AsyncStorage persistence ensures the session is
    // restored after the app is closed and reopened (unlike bare getAuth()).
    auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

    console.log('Firebase Auth initialized successfully (AsyncStorage persistence)');
    return auth;
  } catch (error) {
    console.error('Failed to initialize Firebase Auth:', error);
    throw new Error('Firebase Auth initialization failed');
  }
}
```

> **Note**: `initializeAuth` must only be called once per app. The existing guard `if (auth) return auth;` at the top of the function ensures this.

---

### 9. `src/services/AuthService.ts` ← **FIX signInWithGoogle and signInWithApple**

The existing methods use `signInWithPopup` — a web browser API that throws "Not supported" on React Native. Replace both methods with the native SDK approach. These are internal implementation changes only; all callers (AuthContext) remain unchanged.

**Replace `signInWithGoogle` method:**

```typescript
// ADD imports at top of AuthService.ts:
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithCredential } from 'firebase/auth';

// REPLACE signInWithGoogle method body:
async signInWithGoogle(): Promise<User> {
  logger.info('Signing in with Google (native)');

  try {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();

    if (!idToken) {
      throw new AuthenticationError('No ID token from Google', 'google/no-id-token');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(this.auth, credential);

    this.resetInactivityTimer();
    logger.info('Google sign-in success', { userId: userCredential.user.uid });
    return userCredential.user;
  } catch (error: unknown) {
    logger.error('Google sign in failed', error as Error);
    throw this.mapFirebaseError(error);
  }
}
```

**Replace `signInWithApple` method body:**

```typescript
// REPLACE signInWithApple method body:
async signInWithApple(): Promise<User> {
  logger.info('Signing in with Apple (native)');

  try {
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!appleCredential.identityToken) {
      throw new AuthenticationError('No identity token from Apple', 'apple/no-identity-token');
    }

    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: appleCredential.identityToken,
    });

    const userCredential = await signInWithCredential(this.auth, firebaseCredential);

    this.resetInactivityTimer();
    logger.info('Apple sign-in success', { userId: userCredential.user.uid });
    return userCredential.user;
  } catch (error: unknown) {
    logger.error('Apple sign in failed', error as Error);
    throw this.mapFirebaseError(error);
  }
}
```

> Remove the `signInWithPopup` import from the top of AuthService.ts — it is no longer used.

---

### 10. `src/services/UserService.ts` ← **ADD `createOrSyncUserProfile`**

Add one new method that creates or merges a Firestore user document from onboarding data. Called from `PremiumCompletionScreen` after onboarding finishes.

```typescript
// ADD import at top of UserService.ts:
import type { OnboardingData } from '@/contexts/OnboardingContext';

// ADD method to UserService class:

/**
 * Create or sync a user profile from completed onboarding data.
 *
 * Called after onboarding completes when a user is authenticated.
 * Uses setDoc with merge: true so existing data is not overwritten
 * (safe to call multiple times).
 *
 * @param userId       - Firebase Auth UID
 * @param onboarding   - Completed OnboardingData from OnboardingContext
 */
async createOrSyncUserProfile(userId: string, onboarding: OnboardingData): Promise<void> {
  const now = new Date().toISOString();

  const profileData: Partial<UserProfile> = {
    id: userId,
    name: onboarding.name ?? '',
    occupation: onboarding.occupation ?? '',
    company: onboarding.company ?? '',
    country: onboarding.country ?? '',
    email: '', // Populated from auth.currentUser.email by caller
    updatedAt: now,
  };

  // Build ShiftCycle if onboarding has shift data
  if (onboarding.patternType && onboarding.startDate) {
    const { buildShiftCycle } = await import('@/utils/shiftUtils');
    const cycle = buildShiftCycle(onboarding);
    if (cycle) {
      profileData.shiftCycle = cycle;
    }
  }

  try {
    // Try update first (user document might already exist from a previous session)
    const existing = await this.getUser(userId);

    if (existing) {
      await this.updateUser(userId, profileData);
      logger.info('UserService: synced existing user profile from onboarding', { userId });
    } else {
      await this.createUser(userId, {
        ...profileData,
        createdAt: now,
      } as UserProfile);
      logger.info('UserService: created new user profile from onboarding', { userId });
    }
  } catch (error) {
    logger.error('UserService: failed to sync user profile', error as Error, { userId });
    throw error;
  }
}
```

---

### 11. `src/navigation/AppNavigator.tsx` ← **FULL REWRITE**

The current AppNavigator only checks `onboarding:complete`. It needs to check auth state first via `useAuth()`.

```typescript
/**
 * AppNavigator
 *
 * Root navigator with three possible routes:
 *   • Auth (unauthenticated) — SignIn / SignUp / ForgotPassword
 *   • Auth (authenticated but unverified password user) — EmailVerification
 *   • Onboarding (authenticated, not yet configured)
 *   • Main (authenticated + onboarding complete)
 *
 * Auth state comes from AuthContext (onAuthStateChanged-backed).
 * Onboarding completion is still checked from AsyncStorage.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { theme } from '@/utils/theme';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { useAuth } from '@/contexts/AuthContext';
import { AuthNavigator, type AuthStackParamList } from './AuthNavigator';
import { OnboardingNavigator, type OnboardingStackParamList } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  // Check onboarding completion (local AsyncStorage) whenever user changes
  useEffect(() => {
    if (!user) {
      // Not logged in — no need to check onboarding yet
      setIsOnboardingComplete(null);
      return;
    }

    const check = async () => {
      try {
        const flag = await asyncStorageService.get<boolean>('onboarding:complete');
        if (flag === true) {
          setIsOnboardingComplete(true);
          return;
        }

        // Backward compat: derive from onboarding data fields
        const savedData = await asyncStorageService.get<Record<string, unknown>>('onboarding:data');
        if (savedData && typeof savedData === 'object') {
          const complete = !!(
            savedData.name &&
            savedData.startDate &&
            savedData.patternType &&
            savedData.shiftSystem
          );
          setIsOnboardingComplete(complete);
        } else {
          setIsOnboardingComplete(false);
        }
      } catch {
        setIsOnboardingComplete(false);
      }
    };

    check();
  }, [user]);

  // ── Loading states ──────────────────────────────────────────────────────

  // 1. Waiting for Firebase Auth to restore persisted session
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  // 2. Authenticated but onboarding check not yet complete
  if (user && isOnboardingComplete === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  // ── Route determination ─────────────────────────────────────────────────

  let initialRoute: keyof RootStackParamList;
  if (!user) {
    initialRoute = 'Auth';
  } else if (!isOnboardingComplete) {
    initialRoute = 'Onboarding';
  } else {
    initialRoute = 'Main';
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.deepVoid },
      }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

---

### 12. `App.tsx` ← **ADD `<AuthProvider>`**

Wrap the provider tree with `AuthProvider` above `OnboardingProvider`:

```typescript
// ADD import:
import { AuthProvider } from './src/contexts/AuthContext';

// REPLACE export default function App():
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <VoiceAssistantProvider>
              <AppContent />
            </VoiceAssistantProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

> `AuthProvider` goes above `OnboardingProvider` because `AppNavigator` needs `useAuth()` and sits inside `AppContent`.

---

### 13. `src/screens/onboarding/premium/PremiumCompletionScreen.tsx` ← **ADD Firestore sync**

The completion screen already calls `asyncStorageService.set('onboarding:complete', true)` and navigates to Main. Add a `UserService.createOrSyncUserProfile()` call just before the navigation.

**Find the `handleComplete` function (or equivalent save + navigate function) and add:**

```typescript
// ADD imports at top of PremiumCompletionScreen.tsx:
import { UserService } from '@/services/UserService';
import { useAuth } from '@/contexts/AuthContext';

// ADD inside the component:
const { user } = useAuth();
const userService = useMemo(() => new UserService(), []);

// ADD inside the handleComplete (or equivalent save) function,
// after asyncStorageService.set('onboarding:complete', true):

// Sync onboarding data to Firestore if user is authenticated
if (user) {
  try {
    await userService.createOrSyncUserProfile(user.uid, data);
    // Also persist email from Firebase Auth user (not collected in onboarding)
    await userService.updateUser(user.uid, { email: user.email ?? '' });
    logger.info('Onboarding data synced to Firestore', { userId: user.uid });
  } catch (err) {
    // Don't block navigation — local save succeeded. Firestore sync can retry later.
    logger.error('Failed to sync onboarding to Firestore', err as Error);
  }
}
```

---

### 14. `src/config/env.ts` ← **ADD Google Client ID**

Add the Google Web Client ID environment variable:

```typescript
// ADD to firebaseConfig or as a separate export:
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
```

**Add to `.env` (not committed to git):**

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_FROM_FIREBASE_CONSOLE
```

**How to get the web client ID:**

1. Firebase Console → Project → Authentication → Sign-in method → Google → Web SDK configuration
2. Copy the "Web client ID" (format: `NNNNNNNNNN-xxxxxxxx.apps.googleusercontent.com`)

---

## Implementation Order

1. `src/config/firebase.ts` — fix `initializeAuth` with AsyncStorage persistence (critical first — everything depends on auth persisting)
2. `src/services/AuthService.ts` — fix `signInWithGoogle` and `signInWithApple` native implementations
3. `src/services/UserService.ts` — add `createOrSyncUserProfile()` method
4. `src/contexts/AuthContext.tsx` — new file: auth state + actions
5. `src/navigation/AuthNavigator.tsx` — new file: auth stack
6. `src/screens/auth/SignInScreen.tsx` — new file
7. `src/screens/auth/SignUpScreen.tsx` — new file
8. `src/screens/auth/ForgotPasswordScreen.tsx` — new file
9. `src/screens/auth/EmailVerificationScreen.tsx` — new file
10. `src/navigation/AppNavigator.tsx` — rewrite to consume `useAuth()`
11. `App.tsx` — wrap with `<AuthProvider>`
12. `src/screens/onboarding/premium/PremiumCompletionScreen.tsx` — add Firestore sync
13. `firestore.rules` — deploy security rules
14. `.env` — add `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

---

## Firestore Data Flow After Auth

```
User signs up (email/password or social)
  └── Firebase creates Auth user (UID assigned)
        └── onAuthStateChanged fires → user !== null
              └── AppNavigator routes to OnboardingNavigator
                    └── User completes 8-step onboarding
                          └── PremiumCompletionScreen:
                                1. asyncStorageService.set('onboarding:complete', true)
                                2. UserService.createOrSyncUserProfile(uid, onboardingData)
                                   → writes to Firestore: users/{uid}
                                3. Navigate to Main

Returning user (app restart)
  └── AuthProvider reads persisted session from AsyncStorage
        └── onAuthStateChanged fires → user !== null
              └── asyncStorageService.get('onboarding:complete') → true
                    └── AppNavigator routes directly to Main
                          └── VoiceAssistantContext, useShiftAccent, etc. all work immediately
```

---

## Google Sign-In Setup (Required Before First Run)

### iOS (`ios/Ellie/Info.plist`):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <!-- Reversed iOS client ID from GoogleService-Info.plist -->
      <string>com.googleusercontent.apps.YOUR_IOS_CLIENT_ID</string>
    </array>
  </dict>
</array>
```

### Android (`android/app/google-services.json`):

- Download from Firebase Console → Project settings → Android → google-services.json
- Place in `android/app/`

### Firebase Console:

- Enable Google Sign-In provider under Authentication → Sign-in method
- Enable Apple Sign-In (iOS only) under Authentication → Sign-in method

### Apple Sign-In (iOS only):

- Add "Sign In with Apple" capability in Xcode: Project → Signing & Capabilities → + Sign In with Apple
- Ensure `app.json` / `app.config.js` has `"usesAppleSignIn": true` in `expo.ios`

---

## Verification Plan

1. **Session persistence** — Sign in, force-close the app, reopen → session should restore automatically. Verified users land in onboarding/main, unverified password users land in EmailVerification.

2. **Email/password sign-up flow** — Create account → app routes to EmailVerification (strict gate for unverified password users). After verification, continue onboarding and verify `users/{uid}` document exists in Firestore with correct name/occupation/shiftCycle.

3. **Email/password sign-in flow** — Sign out, sign back in:
   - unverified password account → EmailVerification
   - verified account → Main (if onboarding complete) or Onboarding (if incomplete)

4. **Google Sign-In** — Tap "Continue with Google" → native OS sheet appears → select account → lands on Onboarding (new user) or Main (returning). Verify no "signInWithPopup" error.

5. **Apple Sign-In (iOS)** — Tap "Continue with Apple" → Face ID / Touch ID sheet → same flow. Only visible on iOS.

6. **Forgot password** — Submit email → check inbox → reset link arrives within 60 seconds. Tap "Back to Sign In" → sign in with new password.

7. **Rate limiting** — Attempt wrong password 5× → "Too many requests" error shown. Wait 15 minutes or use a different email.

8. **Firestore security rules** — Use Firebase console "Rules playground" to verify:
   - Authenticated user can read/write `users/{their uid}` ✅
   - Authenticated user cannot read `users/{other uid}` ❌
   - Unauthenticated user cannot read anything ❌

9. **Onboarding data sync** — After completing onboarding, open Firebase console → Firestore → `users/{uid}` → verify all fields present: name, occupation, company, country, shiftCycle, email.

10. **Navigation gating** — Sign out → app routes to AuthNavigator (SignInScreen). Sign in:
    - unverified password account → EmailVerification
    - verified account → Main (if onboarded) or Onboarding (new account)

11. **VoiceAssistant + useSmartReminders** — After auth + onboarding, verify voice assistant context has correct user name and shift context, and smart reminders are scheduled.
