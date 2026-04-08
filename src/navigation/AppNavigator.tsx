/**
 * AppNavigator
 *
 * Root navigator with three route groups:
 * - Auth (unauthenticated)
 * - Onboarding (authenticated but incomplete onboarding)
 * - Main (authenticated and onboarding complete)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useNavigation,
  type NavigationProp,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { theme } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import { AuthNavigator, type AuthStackParamList } from './AuthNavigator';
import { OnboardingNavigator, type OnboardingStackParamList } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { readPersistedOnboardingCompletionStatus } from '@/utils/onboardingPersistence';

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

export function readOnboardingCompletionStatus(): Promise<boolean> {
  return readPersistedOnboardingCompletionStatus();
}

export const MainRouteGate: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  const verifyAccess = useCallback(async () => {
    try {
      const complete = await readOnboardingCompletionStatus();
      if (complete) {
        setIsAllowed(true);
        return;
      }

      setIsAllowed(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' as never }],
      });
    } catch {
      setIsAllowed(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' as never }],
      });
    }
  }, [navigation]);

  useEffect(() => {
    void verifyAccess();
  }, [verifyAccess]);

  if (isAllowed !== true) {
    return (
      <View style={styles.loadingContainer} testID="main-route-gate-loading">
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  return <MainTabNavigator />;
};

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
        const complete = await readOnboardingCompletionStatus();
        setIsOnboardingComplete(complete);
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
      <Stack.Screen name="Main" component={MainRouteGate} />
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
