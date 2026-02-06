/**
 * Onboarding Navigator
 *
 * Handles navigation between all 10 premium onboarding screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumWelcomeScreen } from '@/screens/onboarding/premium/PremiumWelcomeScreen';
import { PremiumIntroductionScreen } from '@/screens/onboarding/premium/PremiumIntroductionScreen';
import { PremiumShiftPatternScreen } from '@/screens/onboarding/premium/PremiumShiftPatternScreen';
import { PremiumCustomPatternScreen } from '@/screens/onboarding/premium/PremiumCustomPatternScreen';
import { PremiumStartDateScreen } from '@/screens/onboarding/premium/PremiumStartDateScreen';
import { PremiumShiftTimeInputScreen } from '@/screens/onboarding/premium/PremiumShiftTimeInputScreen';

// Define the onboarding stack param list
export type OnboardingStackParamList = {
  Welcome: undefined;
  Introduction: undefined;
  ShiftPattern: undefined;
  CustomPattern: undefined;
  StartDate: undefined;
  ShiftTimeInput: undefined;
  // TODO: Add remaining 4 screens (Steps 7-10)
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
      <Stack.Screen name="ShiftPattern" component={PremiumShiftPatternScreen} />
      <Stack.Screen name="CustomPattern" component={PremiumCustomPatternScreen} />
      <Stack.Screen name="StartDate" component={PremiumStartDateScreen} />
      <Stack.Screen name="ShiftTimeInput" component={PremiumShiftTimeInputScreen} />
    </Stack.Navigator>
  );
};
