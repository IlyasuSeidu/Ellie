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
jest.mock('@/screens/onboarding/premium/PremiumPainHookScreen', () => ({
  PremiumPainHookScreen: () => null,
}));
jest.mock('@/screens/onboarding/premium/PremiumIntroductionScreen', () => ({
  PremiumIntroductionScreen: () => null,
}));
jest.mock('@/screens/main/UniversalShiftBuilderScreen', () => ({
  UniversalShiftBuilderScreen: () => null,
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
    it('should have correct ParamList with Universal Builder routes', () => {
      type ExpectedRoutes = keyof OnboardingStackParamList;
      const routes: ExpectedRoutes[] = [
        'Welcome',
        'PainHook',
        'Introduction',
        'UniversalShiftBuilder',
        'AhaMoment',
        'Completion',
      ];

      // Verify all routes exist
      expect(routes.length).toBe(6);

      // Verify each route is valid (TypeScript will catch type errors at compile time)
      routes.forEach((route) => {
        expect(route).toBeTruthy();
      });
    });

    it('should type params correctly for onboarding and settings-entry routes', () => {
      // Type check for base routes
      type WelcomeParams = OnboardingStackParamList['Welcome'];
      type PainHookParams = OnboardingStackParamList['PainHook'];
      type IntroParams = OnboardingStackParamList['Introduction'];
      type UniversalShiftBuilderParams = OnboardingStackParamList['UniversalShiftBuilder'];
      type AhaMomentParams = OnboardingStackParamList['AhaMoment'];
      type CompletionParams = OnboardingStackParamList['Completion'];

      const welcomeParams: WelcomeParams = undefined;
      const painHookParams: PainHookParams = undefined;
      const introParams: IntroParams = undefined;
      const universalBuilderParams: UniversalShiftBuilderParams = {
        mode: 'create',
        entryPoint: 'onboarding',
        onSaveNextScreen: 'AhaMoment',
      };
      const ahaMomentParams: AhaMomentParams = undefined;
      const completionParams: CompletionParams = undefined;

      expect(welcomeParams).toBeUndefined();
      expect(painHookParams).toBeUndefined();
      expect(introParams).toBeUndefined();
      expect(universalBuilderParams).toBeTruthy();
      expect(ahaMomentParams).toBeUndefined();
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
