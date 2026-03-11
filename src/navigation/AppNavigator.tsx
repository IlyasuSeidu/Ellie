/**
 * AppNavigator
 *
 * Root navigator with three route groups:
 * - Auth (unauthenticated)
 * - Onboarding (authenticated but incomplete onboarding)
 * - Main (authenticated and onboarding complete)
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

function requiresEmailVerification(
  user: {
    emailVerified?: boolean;
    providerData?: Array<{ providerId?: string | null }>;
  } | null
): boolean {
  if (!user) {
    return false;
  }

  const providerData = Array.isArray(user.providerData) ? user.providerData : [];
  const hasPasswordProvider = providerData.some((provider) => provider?.providerId === 'password');

  return hasPasswordProvider && user.emailVerified === false;
}

/**
 * Root Stack Parameter List
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const needsEmailVerification = requiresEmailVerification(user);

  useEffect(() => {
    if (!user || needsEmailVerification) {
      setIsOnboardingComplete(null);
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        const completionFlag = await asyncStorageService.get<boolean>('onboarding:complete');
        if (completionFlag === true) {
          setIsOnboardingComplete(true);
          return;
        }

        if (completionFlag === false) {
          setIsOnboardingComplete(false);
          return;
        }

        // Backward compatibility for older installs without completion flag.
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

    checkOnboardingStatus();
  }, [user, needsEmailVerification]);

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  if (user && !needsEmailVerification && isOnboardingComplete === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  let initialRoute: keyof RootStackParamList;
  let authInitialParams: NavigatorScreenParams<AuthStackParamList> | undefined;
  if (!user) {
    initialRoute = 'Auth';
  } else if (needsEmailVerification) {
    initialRoute = 'Auth';
    authInitialParams = {
      screen: 'EmailVerification',
      params: {
        email: user.email ?? '',
      },
    };
  } else if (!isOnboardingComplete) {
    initialRoute = 'Onboarding';
  } else {
    initialRoute = 'Main';
  }

  return (
    <Stack.Navigator
      key={`root-${user?.uid ?? 'guest'}-${String(isOnboardingComplete)}`}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.deepVoid },
      }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Auth" component={AuthNavigator} initialParams={authInitialParams} />
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
