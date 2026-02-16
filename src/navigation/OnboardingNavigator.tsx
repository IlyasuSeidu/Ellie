/**
 * Onboarding Navigator
 *
 * Handles navigation between all 9 premium onboarding screens (8 steps total).
 *
 * ## Flow:
 * 1. Welcome → 2. Introduction → 3. ShiftSystem → 4. ShiftPattern
 * → [4b. CustomPattern (conditional)] → 5. PhaseSelector → 6. StartDate
 * → 7. ShiftTimeInput → 8. Completion
 *
 * ## Conditional Navigation:
 * - **CustomPattern** screen only appears if user selects ShiftPattern.CUSTOM in step 4
 * - **ShiftTimeInput** is multi-stage based on shift system (2-shift vs 3-shift)
 * - **PhaseSelector** is two-stage if selected phase has multiple days
 *
 * ## Data Flow:
 * All screens use `useOnboarding()` hook to read/write to OnboardingContext.
 * Final data is validated and saved to AsyncStorage in CompletionScreen.
 *
 * @see {@link OnboardingContext} for data structure
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumWelcomeScreen } from '@/screens/onboarding/premium/PremiumWelcomeScreen';
import { PremiumIntroductionScreen } from '@/screens/onboarding/premium/PremiumIntroductionScreen';
import { PremiumShiftSystemScreen } from '@/screens/onboarding/premium/PremiumShiftSystemScreen';
import { PremiumShiftPatternScreen } from '@/screens/onboarding/premium/PremiumShiftPatternScreen';
import { PremiumCustomPatternScreen } from '@/screens/onboarding/premium/PremiumCustomPatternScreen';
import { PremiumPhaseSelectorScreen } from '@/screens/onboarding/premium/PremiumPhaseSelectorScreen';
import { PremiumStartDateScreen } from '@/screens/onboarding/premium/PremiumStartDateScreen';
import { PremiumShiftTimeInputScreen } from '@/screens/onboarding/premium/PremiumShiftTimeInputScreen';
import { PremiumCompletionScreen } from '@/screens/onboarding/premium/PremiumCompletionScreen';

/**
 * Onboarding Stack Parameter List
 *
 * Defines all routes in the onboarding flow.
 * All routes have `undefined` params as data is managed through OnboardingContext.
 */
export type OnboardingStackParamList = {
  /** Step 1: Welcome screen with app intro (auto-advances) */
  Welcome: undefined;
  /** Step 2: Collect user profile via chat (name, occupation, company, country) */
  Introduction: undefined;
  /** Step 3: Select shift system (2-shift or 3-shift) */
  ShiftSystem: undefined;
  /** Step 4: Select shift pattern (standard or custom) */
  ShiftPattern: undefined;
  /** Step 4b: Configure custom pattern (only if CUSTOM selected) */
  CustomPattern: undefined;
  /** Step 5: Select current phase and day within phase */
  PhaseSelector: undefined;
  /** Step 6: Select calendar start date */
  StartDate: undefined;
  /** Step 7: Configure shift times (multi-stage based on system) */
  ShiftTimeInput: undefined;
  /** Step 8: Review data and complete onboarding */
  Completion: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Onboarding Navigator Component
 *
 * Creates the navigation stack for the premium onboarding flow.
 * Screens are ordered to match the logical flow for better readability.
 */
export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0c0a09' }, // deepVoid from theme
      }}
      initialRouteName="Welcome"
    >
      {/* Step 1: Welcome */}
      <Stack.Screen name="Welcome" component={PremiumWelcomeScreen} />

      {/* Step 2: Introduction - Collect user profile */}
      <Stack.Screen name="Introduction" component={PremiumIntroductionScreen} />

      {/* Step 3: Shift System - Select 2-shift or 3-shift */}
      <Stack.Screen name="ShiftSystem" component={PremiumShiftSystemScreen} />

      {/* Step 4: Shift Pattern - Select pattern type */}
      <Stack.Screen name="ShiftPattern" component={PremiumShiftPatternScreen} />

      {/* Step 4b: Custom Pattern - Configure custom pattern (conditional) */}
      <Stack.Screen name="CustomPattern" component={PremiumCustomPatternScreen} />

      {/* Step 5: Phase Selector - Select current phase */}
      <Stack.Screen name="PhaseSelector" component={PremiumPhaseSelectorScreen} />

      {/* Step 6: Start Date - Select calendar start date */}
      <Stack.Screen name="StartDate" component={PremiumStartDateScreen} />

      {/* Step 7: Shift Time Input - Configure shift times */}
      <Stack.Screen name="ShiftTimeInput" component={PremiumShiftTimeInputScreen} />

      {/* Step 8: Completion - Review and save */}
      <Stack.Screen name="Completion" component={PremiumCompletionScreen} />
    </Stack.Navigator>
  );
};
