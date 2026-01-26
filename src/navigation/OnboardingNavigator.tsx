/**
 * Onboarding Navigator
 *
 * Handles navigation between all 10 premium onboarding screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumWelcomeScreen } from '@/screens/onboarding/premium/PremiumWelcomeScreen';
import { PremiumIntroductionScreen } from '@/screens/onboarding/premium/PremiumIntroductionScreen';

// Define the onboarding stack param list
export type OnboardingStackParamList = {
  Welcome: undefined;
  Introduction: undefined;
  // TODO: Add remaining 8 screens (Steps 3-10)
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0c0a09' }, // deepVoid
      }}
    >
      <Stack.Screen name="Welcome" component={PremiumWelcomeScreen} />
      <Stack.Screen name="Introduction" component={PremiumIntroductionScreen} />
    </Stack.Navigator>
  );
};
