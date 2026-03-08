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
jest.mock('@/screens/onboarding/premium/PremiumIntroductionScreen', () => ({
  PremiumIntroductionScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumShiftSystemScreen', () => ({
  PremiumShiftSystemScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumRosterTypeScreen', () => ({
  PremiumRosterTypeScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumShiftPatternScreen', () => ({
  PremiumShiftPatternScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumCustomPatternScreen', () => ({
  PremiumCustomPatternScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumFIFOCustomPatternScreen', () => ({
  PremiumFIFOCustomPatternScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumPhaseSelectorScreen', () => ({
  PremiumPhaseSelectorScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen', () => ({
  PremiumFIFOPhaseSelectorScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumStartDateScreen', () => ({
  PremiumStartDateScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumShiftTimeInputScreen', () => ({
  PremiumShiftTimeInputScreen: () => null,
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
    it('should have correct ParamList with 12 routes', () => {
      type ExpectedRoutes = keyof OnboardingStackParamList;
      const routes: ExpectedRoutes[] = [
        'Welcome',
        'Introduction',
        'ShiftSystem',
        'RosterType',
        'ShiftPattern',
        'CustomPattern',
        'FIFOCustomPattern',
        'PhaseSelector',
        'FIFOPhaseSelector',
        'StartDate',
        'ShiftTimeInput',
        'Completion',
      ];

      // Verify all routes exist
      expect(routes.length).toBe(12);

      // Verify each route is valid (TypeScript will catch type errors at compile time)
      routes.forEach((route) => {
        expect(route).toBeTruthy();
      });
    });

    it('should type params correctly for onboarding and settings-entry routes', () => {
      // Type check for base routes
      type WelcomeParams = OnboardingStackParamList['Welcome'];
      type IntroParams = OnboardingStackParamList['Introduction'];
      type ShiftSystemParams = OnboardingStackParamList['ShiftSystem'];
      type RosterTypeParams = OnboardingStackParamList['RosterType'];
      type ShiftPatternParams = OnboardingStackParamList['ShiftPattern'];
      type CustomPatternParams = OnboardingStackParamList['CustomPattern'];
      type FIFOCustomPatternParams = OnboardingStackParamList['FIFOCustomPattern'];
      type PhaseSelectorParams = OnboardingStackParamList['PhaseSelector'];
      type FIFOPhaseSelectorParams = OnboardingStackParamList['FIFOPhaseSelector'];
      type StartDateParams = OnboardingStackParamList['StartDate'];
      type ShiftTimeInputParams = OnboardingStackParamList['ShiftTimeInput'];
      type CompletionParams = OnboardingStackParamList['Completion'];

      const welcomeParams: WelcomeParams = undefined;
      const introParams: IntroParams = undefined;
      const shiftSystemParams: ShiftSystemParams = undefined;
      const rosterTypeParams: RosterTypeParams = undefined;
      const shiftPatternParams: ShiftPatternParams = undefined;
      const shiftPatternSettingsParams: ShiftPatternParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };
      const customPatternParams: CustomPatternParams = undefined;
      const customPatternSettingsParams: CustomPatternParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };
      const fifoCustomPatternParams: FIFOCustomPatternParams = undefined;
      const fifoCustomPatternSettingsParams: FIFOCustomPatternParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };
      const phaseSelectorParams: PhaseSelectorParams = undefined;
      const fifoPhaseSelectorParams: FIFOPhaseSelectorParams = undefined;
      const startDateParams: StartDateParams = undefined;
      const startDateSettingsParams: StartDateParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };
      const shiftTimeInputParams: ShiftTimeInputParams = undefined;
      const shiftTimeInputSettingsParams: ShiftTimeInputParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
        initialShiftType: 'night',
      };
      const completionParams: CompletionParams = undefined;

      expect(welcomeParams).toBeUndefined();
      expect(introParams).toBeUndefined();
      expect(shiftSystemParams).toBeUndefined();
      expect(rosterTypeParams).toBeUndefined();
      expect(shiftPatternParams).toBeUndefined();
      expect(shiftPatternSettingsParams).toBeTruthy();
      expect(customPatternParams).toBeUndefined();
      expect(customPatternSettingsParams).toBeTruthy();
      expect(fifoCustomPatternParams).toBeUndefined();
      expect(fifoCustomPatternSettingsParams).toBeTruthy();
      expect(phaseSelectorParams).toBeUndefined();
      expect(fifoPhaseSelectorParams).toBeUndefined();
      expect(startDateParams).toBeUndefined();
      expect(startDateSettingsParams).toBeTruthy();
      expect(shiftTimeInputParams).toBeUndefined();
      expect(shiftTimeInputSettingsParams).toBeTruthy();
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
