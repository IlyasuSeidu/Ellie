/**
 * AppNavigator
 *
 * Root navigator that handles routing between onboarding and main dashboard.
 * Checks AsyncStorage on mount to determine if onboarding is complete.
 * If complete, shows MainDashboard. Otherwise, shows OnboardingNavigator.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainDashboardScreen } from '@/screens/main/MainDashboardScreen';

/**
 * Root Stack Parameter List
 */
export type RootStackParamList = {
  Onboarding: undefined;
  MainDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const savedData = await asyncStorageService.get<string>('onboarding:data');
      if (savedData) {
        const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        // Onboarding is complete if essential fields are present
        const complete = !!(parsed.name && parsed.startDate && parsed.patternType);
        setIsOnboardingComplete(complete);
      } else {
        setIsOnboardingComplete(false);
      }
    } catch {
      setIsOnboardingComplete(false);
    }
  };

  // Loading state while checking AsyncStorage
  if (isOnboardingComplete === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.sacredGold} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.colors.deepVoid },
      }}
      initialRouteName={isOnboardingComplete ? 'MainDashboard' : 'Onboarding'}
    >
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
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
