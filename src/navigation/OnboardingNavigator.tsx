/**
 * Onboarding Navigator
 *
 * Handles navigation between the full premium onboarding steps.
 *
 * ## Universal Schedule Flow:
 * 1. Welcome → 2. PainHook → 3. Introduction → 4. UniversalShiftBuilder
 * → 5. AhaMoment → 6. Completion
 *
 * ## Data Flow:
 * All screens use `useOnboarding()` hook to read/write to OnboardingContext.
 * UniversalShiftBuilder writes the complete schedule before the AhaMoment and
 * Completion screens validate/persist it.
 *
 * @see {@link OnboardingContext} for data structure
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumWelcomeScreen } from '@/screens/onboarding/premium/PremiumWelcomeScreen';
import { PremiumPainHookScreen } from '@/screens/onboarding/premium/PremiumPainHookScreen';
import { PremiumIntroductionScreen } from '@/screens/onboarding/premium/PremiumIntroductionScreen';
import { PremiumAhaMomentScreen } from '@/screens/onboarding/premium/PremiumAhaMomentScreen';
import { PremiumCompletionScreen } from '@/screens/onboarding/premium/PremiumCompletionScreen';
import {
  UniversalShiftBuilderScreen,
  type UniversalShiftBuilderParams,
} from '@/screens/main/UniversalShiftBuilderScreen';

/**
 * Onboarding Stack Parameter List
 *
 * Defines all routes in the Universal onboarding flow.
 * Most routes use `undefined` params since data is managed through OnboardingContext.
 */
export type OnboardingStackParamList = {
  /** Step 1: Welcome screen with app intro */
  Welcome: undefined;
  /** Step 2: Pain hook — user selects their biggest schedule problem */
  PainHook: undefined;
  /** Step 3: Collect user profile via chat (name, occupation, company, country).
   *  entryPoint 'settings' — launched post-onboarding from settings;
   *  saves data and returns to the previous screen instead of advancing the flow. */
  Introduction: { entryPoint?: 'settings' } | undefined;
  /** Step 4: Build any shift schedule with AI or manual controls */
  UniversalShiftBuilder: UniversalShiftBuilderParams;
  /** Step 5: Show year preview and paywall gateway */
  AhaMoment: undefined;
  /** Step 6: Review data and complete onboarding */
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

      {/* Step 2: Pain Hook - User identifies their biggest schedule problem */}
      <Stack.Screen
        name="PainHook"
        component={PremiumPainHookScreen}
        options={{
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />

      {/* Step 3: Introduction - Collect user profile */}
      <Stack.Screen name="Introduction" component={PremiumIntroductionScreen} />

      {/* Step 4: Universal Shift Builder - AI-assisted and manual schedule setup */}
      <Stack.Screen
        name="UniversalShiftBuilder"
        component={UniversalShiftBuilderScreen}
        initialParams={{
          mode: 'create',
          entryPoint: 'onboarding',
          onSaveNextScreen: 'AhaMoment',
        }}
        options={{
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />

      {/* Step 5: Aha Moment - Full-year preview and value reveal */}
      <Stack.Screen name="AhaMoment" component={PremiumAhaMomentScreen} />

      {/* Step 6: Completion - Review and save */}
      <Stack.Screen name="Completion" component={PremiumCompletionScreen} />
    </Stack.Navigator>
  );
};
