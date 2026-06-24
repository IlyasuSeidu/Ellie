/**
 * Onboarding Navigator
 *
 * Handles navigation between the full premium onboarding steps.
 *
 * ## Main Grandma-Simple Voice Shift Flow:
 * 1. Welcome → 2. SetupIntro → 3. GuidedShiftChatSetup → 4. ShiftTimesSetup
 * → 5. KnownShiftDateSetup → 6. KnownShiftTypeSetup → 7. KnownShiftPhaseSetup
 * → 8. SchedulePreviewSetup → 9. SetupSummary → 10. ReminderSetup
 * → 11. AhaMoment → 12. Completion
 *
 * The main flow ends as:
 * setup complete → voice taste and Ryvro Pro paywall → enter app.
 *
 * ## Data Flow:
 * All screens use `useOnboarding()` hook to read/write to OnboardingContext.
 * The guided setup screens build and save a UniversalShiftSchedule before
 * the AhaMoment and Completion screens validate/persist it.
 *
 * @see {@link OnboardingContext} for data structure
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumWelcomeScreen } from '@/screens/onboarding/premium/PremiumWelcomeScreen';
import { PremiumSetupIntroScreen } from '@/screens/onboarding/premium/PremiumSetupIntroScreen';
import { PremiumGuidedShiftChatScreen } from '@/screens/onboarding/premium/PremiumGuidedShiftChatScreen';
import { PremiumKnownShiftDateScreen } from '@/screens/onboarding/premium/PremiumKnownShiftDateScreen';
import { PremiumKnownShiftTypeScreen } from '@/screens/onboarding/premium/PremiumKnownShiftTypeScreen';
import { PremiumKnownShiftPhaseScreen } from '@/screens/onboarding/premium/PremiumKnownShiftPhaseScreen';
import { PremiumSchedulePreviewScreen } from '@/screens/onboarding/premium/PremiumSchedulePreviewScreen';
import { PremiumFixMenuScreen } from '@/screens/onboarding/premium/PremiumFixMenuScreen';
import { PremiumShiftTimesScreen } from '@/screens/onboarding/premium/PremiumShiftTimesScreen';
import { PremiumSetupSummaryScreen } from '@/screens/onboarding/premium/PremiumSetupSummaryScreen';
import { PremiumReminderSetupScreen } from '@/screens/onboarding/premium/PremiumReminderSetupScreen';
import { PremiumAhaMomentScreen } from '@/screens/onboarding/premium/PremiumAhaMomentScreen';
import { PremiumCompletionScreen } from '@/screens/onboarding/premium/PremiumCompletionScreen';
import { VoiceAssistantScreen } from '@/screens/main/VoiceAssistantScreen';
import type { UniversalShiftSchedule } from '@/types';
import type { KnownShiftChoice } from '@/utils/knownShiftPhase';

export type KnownShiftDateSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
};

export type ShiftTimesSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
  returnTo?: 'KnownShiftDateSetup' | 'SchedulePreviewSetup';
};

export type KnownShiftTypeSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
};

export type KnownShiftPhaseSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
  selectedShift: KnownShiftChoice;
};

export type SchedulePreviewSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
};

export type FixMenuSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
};

export type SetupSummaryParams = {
  scheduleDraft: UniversalShiftSchedule;
};

export type ReminderSetupParams = {
  scheduleDraft: UniversalShiftSchedule;
};

/**
 * Onboarding Stack Parameter List
 *
 * Defines all routes in the Universal onboarding flow.
 * Most routes use `undefined` params since data is managed through OnboardingContext.
 */
export type OnboardingStackParamList = {
  /** Step 1: Welcome screen with app intro */
  Welcome: undefined;
  /** Step 2: Reassure users before schedule setup begins */
  SetupIntro: undefined;
  /** Step 3: Conversational schedule pattern intake and draft confirmation */
  GuidedShiftChatSetup: undefined;
  /** Step 4: Add simple start and finish times for work shifts */
  ShiftTimesSetup: ShiftTimesSetupParams;
  /** Step 5: Pick one exact date the user knows for sure */
  KnownShiftDateSetup: KnownShiftDateSetupParams;
  /** Step 6: Pick what shift the known date was */
  KnownShiftTypeSetup: KnownShiftTypeSetupParams;
  /** Step 7: Pick the exact matching slot when the selected shift repeats */
  KnownShiftPhaseSetup: KnownShiftPhaseSetupParams;
  /** Step 8: Confirm calculated upcoming shifts before saving */
  SchedulePreviewSetup: SchedulePreviewSetupParams;
  /** Repair branch: choose the simple setup step to fix */
  FixMenuSetup: FixMenuSetupParams;
  /** Step 9: Final plain English setup summary */
  SetupSummary: SetupSummaryParams;
  /** Step 10: Optional shift reminders */
  ReminderSetup: ReminderSetupParams;
  /** Step 11: Let the user taste voice once, then show the Ryvro Pro paywall */
  AhaMoment: undefined;
  /** Voice taste screen launched from AhaMoment */
  VoiceAssistantTaste:
    | { autoStart?: boolean; showBackButton?: boolean; voiceOnly?: boolean }
    | undefined;
  /** Step 12: Save onboarding and hand the user into the app */
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
        contentStyle: { backgroundColor: '#02070b' }, // deepVoid from theme
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
      initialRouteName="Welcome"
    >
      {/* Step 1: Welcome */}
      <Stack.Screen name="Welcome" component={PremiumWelcomeScreen} />

      {/* Step 2: Setup Intro - Explain the simple setup path */}
      <Stack.Screen name="SetupIntro" component={PremiumSetupIntroScreen} />

      {/* Step 3: Guided Shift Chat - User describes their repeating pattern */}
      <Stack.Screen name="GuidedShiftChatSetup" component={PremiumGuidedShiftChatScreen} />

      {/* Step 4: Shift Times - User adds simple start and finish times */}
      <Stack.Screen name="ShiftTimesSetup" component={PremiumShiftTimesScreen} />

      {/* Step 5: Known Shift Date - User chooses a date they know for sure */}
      <Stack.Screen name="KnownShiftDateSetup" component={PremiumKnownShiftDateScreen} />

      {/* Step 6: Known Shift Type - User chooses what shift they had on that date */}
      <Stack.Screen name="KnownShiftTypeSetup" component={PremiumKnownShiftTypeScreen} />

      {/* Step 7: Known Shift Phase - User chooses the exact repeated shift slot */}
      <Stack.Screen name="KnownShiftPhaseSetup" component={PremiumKnownShiftPhaseScreen} />

      {/* Step 8: Schedule Preview - User confirms the calculated upcoming shifts */}
      <Stack.Screen name="SchedulePreviewSetup" component={PremiumSchedulePreviewScreen} />

      {/* Repair branch: user chooses the exact part to fix */}
      <Stack.Screen name="FixMenuSetup" component={PremiumFixMenuScreen} />

      {/* Step 9: Setup Summary - User saves the finished setup */}
      <Stack.Screen name="SetupSummary" component={PremiumSetupSummaryScreen} />

      {/* Step 10: Reminder Setup - User chooses simple shift reminders */}
      <Stack.Screen name="ReminderSetup" component={PremiumReminderSetupScreen} />

      {/* Step 11: Aha Moment - voice taste and Ryvro Pro paywall */}
      <Stack.Screen name="AhaMoment" component={PremiumAhaMomentScreen} />

      {/* Voice taste screen - full Ryvro assistant experience */}
      <Stack.Screen name="VoiceAssistantTaste" component={VoiceAssistantScreen} />

      {/* Step 12: Completion - save and enter the app */}
      <Stack.Screen name="Completion" component={PremiumCompletionScreen} />
    </Stack.Navigator>
  );
};
