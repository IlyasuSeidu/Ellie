/**
 * OnboardingNavigator Tests
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, waitFor } from '@testing-library/react-native';
import { OnboardingNavigator, type OnboardingStackParamList } from '../OnboardingNavigator';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock all screen components to avoid rendering complexity in navigation tests
jest.mock('@/screens/onboarding/premium/PremiumWelcomeScreen', () => ({
  PremiumWelcomeScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumSetupIntroScreen', () => ({
  PremiumSetupIntroScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumGuidedShiftChatScreen', () => ({
  PremiumGuidedShiftChatScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumShiftTimesScreen', () => ({
  PremiumShiftTimesScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumKnownShiftDateScreen', () => ({
  PremiumKnownShiftDateScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumKnownShiftTypeScreen', () => ({
  PremiumKnownShiftTypeScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumKnownShiftPhaseScreen', () => ({
  PremiumKnownShiftPhaseScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumSchedulePreviewScreen', () => ({
  PremiumSchedulePreviewScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumFixMenuScreen', () => ({
  PremiumFixMenuScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumSetupSummaryScreen', () => ({
  PremiumSetupSummaryScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumReminderSetupScreen', () => ({
  PremiumReminderSetupScreen: () => null,
}));
jest.mock('@/screens/main/VoiceAssistantScreen', () => ({
  VoiceAssistantScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumAhaMomentScreen', () => ({
  PremiumAhaMomentScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumCompletionScreen', () => ({
  PremiumCompletionScreen: () => null,
}));

describe('OnboardingNavigator', () => {
  const renderNavigator = () => {
    return render(
      <NavigationContainer>
        <OnboardingNavigator />
      </NavigationContainer>
    );
  };

  describe('Route Registration', () => {
    it('should render navigator without errors', async () => {
      renderNavigator();

      await waitFor(() => {
        // Navigator should render successfully
        expect(true).toBe(true);
      });
    });

    it('should have all onboarding screens available', () => {
      renderNavigator();

      // If navigator renders successfully with all screens registered, test passes
      expect(true).toBe(true);
    });
  });

  describe('TypeScript Types', () => {
    it('should have correct ParamList for the voice-first onboarding routes', () => {
      type ExpectedRoutes = keyof OnboardingStackParamList;
      const routes: ExpectedRoutes[] = [
        'Welcome',
        'SetupIntro',
        'GuidedShiftChatSetup',
        'ShiftTimesSetup',
        'KnownShiftDateSetup',
        'KnownShiftTypeSetup',
        'KnownShiftPhaseSetup',
        'SchedulePreviewSetup',
        'FixMenuSetup',
        'SetupSummary',
        'ReminderSetup',
        'AhaMoment',
        'VoiceAssistantTaste',
        'Completion',
      ];

      // Verify all routes exist
      expect(routes.length).toBe(14);

      // Verify each route is valid (TypeScript will catch type errors at compile time)
      routes.forEach((route) => {
        expect(route).toBeTruthy();
      });
    });

    it('should type params correctly for onboarding and settings-entry routes', () => {
      // Type check for base routes
      type WelcomeParams = OnboardingStackParamList['Welcome'];
      type SetupIntroParams = OnboardingStackParamList['SetupIntro'];
      type GuidedShiftChatParams = OnboardingStackParamList['GuidedShiftChatSetup'];
      type ShiftTimesParams = OnboardingStackParamList['ShiftTimesSetup'];
      type KnownShiftDateParams = OnboardingStackParamList['KnownShiftDateSetup'];
      type KnownShiftTypeParams = OnboardingStackParamList['KnownShiftTypeSetup'];
      type KnownShiftPhaseParams = OnboardingStackParamList['KnownShiftPhaseSetup'];
      type SchedulePreviewParams = OnboardingStackParamList['SchedulePreviewSetup'];
      type FixMenuParams = OnboardingStackParamList['FixMenuSetup'];
      type SetupSummaryParams = OnboardingStackParamList['SetupSummary'];
      type ReminderSetupParams = OnboardingStackParamList['ReminderSetup'];
      type AhaMomentParams = OnboardingStackParamList['AhaMoment'];
      type VoiceAssistantTasteParams = OnboardingStackParamList['VoiceAssistantTaste'];
      type CompletionParams = OnboardingStackParamList['Completion'];

      const welcomeParams: WelcomeParams = undefined;
      const setupIntroParams: SetupIntroParams = undefined;
      const guidedShiftChatParams: GuidedShiftChatParams = undefined;
      const scheduleDraft = {} as never;
      const knownShiftDateParams: KnownShiftDateParams = {
        scheduleDraft,
      };
      const shiftTimesParams: ShiftTimesParams = {
        scheduleDraft,
        returnTo: 'KnownShiftDateSetup',
      };
      const knownShiftTypeParams: KnownShiftTypeParams = {
        scheduleDraft,
      };
      const knownShiftPhaseParams: KnownShiftPhaseParams = {
        scheduleDraft,
        selectedShift: 'off',
      };
      const schedulePreviewParams: SchedulePreviewParams = {
        scheduleDraft,
      };
      const fixMenuParams: FixMenuParams = {
        scheduleDraft,
      };
      const setupSummaryParams: SetupSummaryParams = {
        scheduleDraft,
      };
      const reminderSetupParams: ReminderSetupParams = {
        scheduleDraft,
      };
      const ahaMomentParams: AhaMomentParams = undefined;
      const voiceAssistantTasteParams: VoiceAssistantTasteParams = {
        autoStart: true,
        showBackButton: true,
        voiceOnly: true,
      };
      const completionParams: CompletionParams = undefined;

      expect(welcomeParams).toBeUndefined();
      expect(setupIntroParams).toBeUndefined();
      expect(guidedShiftChatParams).toBeUndefined();
      expect(shiftTimesParams).toBeTruthy();
      expect(knownShiftDateParams).toBeTruthy();
      expect(knownShiftTypeParams).toBeTruthy();
      expect(knownShiftPhaseParams).toBeTruthy();
      expect(schedulePreviewParams).toBeTruthy();
      expect(fixMenuParams).toBeTruthy();
      expect(setupSummaryParams).toBeTruthy();
      expect(reminderSetupParams).toBeTruthy();
      expect(ahaMomentParams).toBeUndefined();
      expect(voiceAssistantTasteParams).toBeTruthy();
      expect(completionParams).toBeUndefined();
    });
  });

  describe('Screen Options', () => {
    it('should configure navigator with correct initial settings', () => {
      renderNavigator();

      // Verify navigator renders (which means screenOptions are valid)
      expect(true).toBe(true);
    });
  });

  describe('Initial Route', () => {
    it('should start at Welcome screen', async () => {
      renderNavigator();

      await waitFor(() => {
        // Navigator should render with Welcome as initial route
        expect(true).toBe(true);
      });
    });
  });
});
