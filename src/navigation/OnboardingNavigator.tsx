/**
 * Onboarding Navigator
 *
 * Handles navigation between 9-10 premium onboarding screens (depends on roster type).
 *
 * ## Flow (Rotating Rosters):
 * 1. Welcome → 2. Introduction → 3. ShiftSystem → 3.5 RosterType → 4. ShiftPattern
 * → [4b-R. CustomPattern (conditional)] → 5-R. PhaseSelector → 6. StartDate
 * → 7. ShiftTimeInput → 8. Completion
 *
 * ## Flow (FIFO Rosters):
 * 1. Welcome → 2. Introduction → 3. ShiftSystem → 3.5 RosterType → 4. ShiftPattern
 * → [4b-F. FIFOCustomPattern (conditional)] → 5-F. FIFOPhaseSelector → 6. StartDate
 * → 7. ShiftTimeInput → 8. Completion
 *
 * ## Conditional Navigation:
 * - **RosterType** screen added between ShiftSystem and ShiftPattern
 * - **CustomPattern** appears if user selects ShiftPattern.CUSTOM (rotating)
 * - **FIFOCustomPattern** appears if user selects ShiftPattern.FIFO_CUSTOM (FIFO)
 * - **PhaseSelector** used for rotating rosters
 * - **FIFOPhaseSelector** used for FIFO rosters
 * - **ShiftTimeInput** adjusts based on shift system and roster type
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
import { PremiumRosterTypeScreen } from '@/screens/onboarding/premium/PremiumRosterTypeScreen';
import { PremiumShiftPatternScreen } from '@/screens/onboarding/premium/PremiumShiftPatternScreen';
import { PremiumCustomPatternScreen } from '@/screens/onboarding/premium/PremiumCustomPatternScreen';
import { PremiumFIFOCustomPatternScreen } from '@/screens/onboarding/premium/PremiumFIFOCustomPatternScreen';
import { PremiumPhaseSelectorScreen } from '@/screens/onboarding/premium/PremiumPhaseSelectorScreen';
import { PremiumFIFOPhaseSelectorScreen } from '@/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen';
import { PremiumStartDateScreen } from '@/screens/onboarding/premium/PremiumStartDateScreen';
import { PremiumShiftTimeInputScreen } from '@/screens/onboarding/premium/PremiumShiftTimeInputScreen';
import { PremiumCompletionScreen } from '@/screens/onboarding/premium/PremiumCompletionScreen';

/**
 * Onboarding Stack Parameter List
 *
 * Defines all routes in the onboarding flow (9-10 screens depending on roster type).
 * All routes have `undefined` params as data is managed through OnboardingContext.
 */
export type OnboardingStackParamList = {
  /** Step 1: Welcome screen with app intro (auto-advances) */
  Welcome: undefined;
  /** Step 2: Collect user profile via chat (name, occupation, company, country) */
  Introduction: undefined;
  /** Step 3: Select shift system (2-shift or 3-shift) */
  ShiftSystem: undefined;
  /** Step 3.5: Select roster type (rotating or FIFO) - NEW */
  RosterType: undefined;
  /** Step 4: Select shift pattern (filtered by roster type) */
  ShiftPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 4b-R: Configure custom rotating pattern (only if CUSTOM selected) */
  CustomPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 4b-F: Configure custom FIFO pattern (only if FIFO_CUSTOM selected) - NEW */
  FIFOCustomPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 5-R: Select current phase and day within phase (rotating rosters) */
  PhaseSelector: undefined;
  /** Step 5-F: Select work/rest block and day within block (FIFO rosters) - NEW */
  FIFOPhaseSelector: undefined;
  /** Step 6: Select calendar start date */
  StartDate: undefined;
  /** Step 7: Configure shift times (adjusted for roster type) */
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
        gestureEnabled: false, // Disable swipe back gesture for controlled flow
        fullScreenGestureEnabled: false, // Disable full-screen swipe as well
      }}
      initialRouteName="Welcome"
    >
      {/* Step 1: Welcome */}
      <Stack.Screen name="Welcome" component={PremiumWelcomeScreen} />

      {/* Step 2: Introduction - Collect user profile */}
      <Stack.Screen name="Introduction" component={PremiumIntroductionScreen} />

      {/* Step 3: Shift System - Select 2-shift or 3-shift */}
      <Stack.Screen name="ShiftSystem" component={PremiumShiftSystemScreen} />

      {/* Step 3.5: Roster Type - Select rotating or FIFO (NEW) */}
      <Stack.Screen name="RosterType" component={PremiumRosterTypeScreen} />

      {/* Step 4: Shift Pattern - Select pattern type (filtered by roster type) */}
      <Stack.Screen name="ShiftPattern" component={PremiumShiftPatternScreen} />

      {/* Step 4b-R: Custom Pattern - Configure custom rotating pattern (conditional) */}
      <Stack.Screen name="CustomPattern" component={PremiumCustomPatternScreen} />

      {/* Step 4b-F: FIFO Custom Pattern - Configure custom FIFO pattern (conditional, NEW) */}
      <Stack.Screen name="FIFOCustomPattern" component={PremiumFIFOCustomPatternScreen} />

      {/* Step 5-R: Phase Selector - Select current phase (rotating rosters) */}
      <Stack.Screen name="PhaseSelector" component={PremiumPhaseSelectorScreen} />

      {/* Step 5-F: FIFO Phase Selector - Select work/rest block (FIFO rosters, NEW) */}
      <Stack.Screen name="FIFOPhaseSelector" component={PremiumFIFOPhaseSelectorScreen} />

      {/* Step 6: Start Date - Select calendar start date */}
      <Stack.Screen name="StartDate" component={PremiumStartDateScreen} />

      {/* Step 7: Shift Time Input - Configure shift times (adjusted for roster type) */}
      <Stack.Screen name="ShiftTimeInput" component={PremiumShiftTimeInputScreen} />

      {/* Step 8: Completion - Review and save */}
      <Stack.Screen name="Completion" component={PremiumCompletionScreen} />
    </Stack.Navigator>
  );
};
