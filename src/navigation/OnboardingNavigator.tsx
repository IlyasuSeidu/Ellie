/**
 * Onboarding Navigator
 *
 * Handles navigation between the full premium onboarding steps.
 *
 * ## Flow (Rotating Rosters):
 * 1. Welcome → 2. PainHook → 3. Introduction → 4. ShiftSystem → 5. RosterType
 * → 6. ShiftPattern → [6b-R. CustomPattern (conditional)] → 7-R. PhaseSelector
 * → 8. StartDate → 9. AhaMoment → [Paywall modal] → 10. ShiftTimeInput → Completion
 *
 * ## Flow (FIFO Rosters):
 * 1. Welcome → 2. PainHook → 3. Introduction → 4. ShiftSystem → 5. RosterType
 * → 6. ShiftPattern → [6b-F. FIFOCustomPattern (conditional)] → 7-F. FIFOPhaseSelector
 * → 8. StartDate → 9. AhaMoment → [Paywall modal] → 10. ShiftTimeInput → Completion
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
import { PremiumPainHookScreen } from '@/screens/onboarding/premium/PremiumPainHookScreen';
import { PremiumIntroductionScreen } from '@/screens/onboarding/premium/PremiumIntroductionScreen';
import { PremiumShiftSystemScreen } from '@/screens/onboarding/premium/PremiumShiftSystemScreen';
import { PremiumRosterTypeScreen } from '@/screens/onboarding/premium/PremiumRosterTypeScreen';
import { PremiumShiftPatternScreen } from '@/screens/onboarding/premium/PremiumShiftPatternScreen';
import { PremiumCustomPatternScreen } from '@/screens/onboarding/premium/PremiumCustomPatternScreen';
import { PremiumFIFOCustomPatternScreen } from '@/screens/onboarding/premium/PremiumFIFOCustomPatternScreen';
import { PremiumPhaseSelectorScreen } from '@/screens/onboarding/premium/PremiumPhaseSelectorScreen';
import { PremiumFIFOPhaseSelectorScreen } from '@/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen';
import { PremiumStartDateScreen } from '@/screens/onboarding/premium/PremiumStartDateScreen';
import { PremiumAhaMomentScreen } from '@/screens/onboarding/premium/PremiumAhaMomentScreen';
import { PremiumShiftTimeInputScreen } from '@/screens/onboarding/premium/PremiumShiftTimeInputScreen';
import { PremiumCompletionScreen } from '@/screens/onboarding/premium/PremiumCompletionScreen';
import type { OnboardingData } from '@/contexts/OnboardingContext';

export type SettingsPatternBaseline = {
  patternType?: OnboardingData['patternType'];
  customPattern?: OnboardingData['customPattern'];
  fifoConfig?: OnboardingData['fifoConfig'];
  rosterType?: OnboardingData['rosterType'];
  shiftSystem?: OnboardingData['shiftSystem'];
};

export type ShiftPatternSettingsSeed = {
  shiftSystem?: OnboardingData['shiftSystem'];
  rosterType?: OnboardingData['rosterType'];
  patternType?: OnboardingData['patternType'];
  customPattern?: OnboardingData['customPattern'];
  fifoConfig?: OnboardingData['fifoConfig'];
};

/**
 * Onboarding Stack Parameter List
 *
 * Defines all routes in the onboarding flow (13-14 screens depending on conditional branches).
 * Most routes use `undefined` params since data is managed through OnboardingContext.
 * Some routes allow optional settings-entry params for edit-mode handoff.
 */
export type OnboardingStackParamList = {
  /** Step 1: Welcome screen with app intro */
  Welcome: undefined;
  /** Step 2: Pain hook — user selects their biggest roster problem */
  PainHook: undefined;
  /** Step 3: Collect user profile via chat (name, occupation, company, country).
   *  entryPoint 'settings' — launched post-onboarding from settings;
   *  saves data and returns to the previous screen instead of advancing the flow. */
  Introduction: { entryPoint?: 'settings' } | undefined;
  /** Step 4: Select shift system (2-shift or 3-shift) */
  ShiftSystem: undefined;
  /** Step 5: Select roster type (rotating or FIFO) */
  RosterType: undefined;
  /** Step 6: Select shift pattern (filtered by roster type) */
  ShiftPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
        settingsSeed?: ShiftPatternSettingsSeed;
      }
    | undefined;
  /** Step 6b-R: Configure custom rotating pattern (only if CUSTOM selected) */
  CustomPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
        settingsBaseline?: SettingsPatternBaseline;
      }
    | undefined;
  /** Step 6b-F: Configure custom FIFO pattern (only if FIFO_CUSTOM selected) */
  FIFOCustomPattern:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
        settingsBaseline?: SettingsPatternBaseline;
      }
    | undefined;
  /** Step 7-R: Select current phase and day within phase (rotating rosters) */
  PhaseSelector:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 7-F: Select work/rest block and day within block (FIFO rosters) */
  FIFOPhaseSelector:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 8: Select calendar start date */
  StartDate:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
      }
    | undefined;
  /** Step 9: Show year preview and paywall gateway */
  AhaMoment: undefined;
  /** Step 10: Configure shift times (adjusted for roster type) */
  ShiftTimeInput:
    | {
        entryPoint?: 'onboarding' | 'settings';
        returnToMainOnSelect?: boolean;
        initialShiftType?: 'day' | 'night' | 'morning' | 'afternoon';
      }
    | undefined;
  /** Step 10: Review data and complete onboarding */
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
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0c0a09' }, // deepVoid from theme
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
      initialRouteName="Welcome"
    >
      {/* Step 1: Welcome */}
      <Stack.Screen name="Welcome" component={PremiumWelcomeScreen} />

      {/* Step 2: Pain Hook - User identifies their biggest roster problem */}
      <Stack.Screen name="PainHook" component={PremiumPainHookScreen} />

      {/* Step 3: Introduction - Collect user profile */}
      <Stack.Screen name="Introduction" component={PremiumIntroductionScreen} />

      {/* Step 4: Shift System - Select 2-shift or 3-shift */}
      <Stack.Screen name="ShiftSystem" component={PremiumShiftSystemScreen} />

      {/* Step 5: Roster Type - Select rotating or FIFO */}
      <Stack.Screen name="RosterType" component={PremiumRosterTypeScreen} />

      {/* Step 6: Shift Pattern - Select pattern type (filtered by roster type) */}
      <Stack.Screen name="ShiftPattern" component={PremiumShiftPatternScreen} />

      {/* Step 6b-R: Custom Pattern - Configure custom rotating pattern (conditional) */}
      <Stack.Screen name="CustomPattern" component={PremiumCustomPatternScreen} />

      {/* Step 6b-F: FIFO Custom Pattern - Configure custom FIFO pattern (conditional) */}
      <Stack.Screen name="FIFOCustomPattern" component={PremiumFIFOCustomPatternScreen} />

      {/* Step 7-R: Phase Selector - Select current phase (rotating rosters) */}
      <Stack.Screen name="PhaseSelector" component={PremiumPhaseSelectorScreen} />

      {/* Step 7-F: FIFO Phase Selector - Select work/rest block (FIFO rosters) */}
      <Stack.Screen name="FIFOPhaseSelector" component={PremiumFIFOPhaseSelectorScreen} />

      {/* Step 8: Start Date - Select calendar start date */}
      <Stack.Screen name="StartDate" component={PremiumStartDateScreen} />

      {/* Step 9: Aha Moment - Full-year preview and value reveal */}
      <Stack.Screen name="AhaMoment" component={PremiumAhaMomentScreen} />

      {/* Step 10: Shift Time Input - Configure shift times (adjusted for roster type) */}
      <Stack.Screen name="ShiftTimeInput" component={PremiumShiftTimeInputScreen} />

      {/* Step 10: Completion - Review and save */}
      <Stack.Screen name="Completion" component={PremiumCompletionScreen} />
    </Stack.Navigator>
  );
};
