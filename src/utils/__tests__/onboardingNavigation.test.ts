/**
 * Onboarding Navigation Utilities Tests
 */

import type { NavigationProp } from '@react-navigation/native';
import {
  goToNextScreen,
  goToPreviousScreen,
  canGoNext,
  getNextScreenName,
} from '../onboardingNavigation';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

describe('onboardingNavigation', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  } as unknown as NavigationProp<OnboardingStackParamList>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('goToNextScreen', () => {
    it('navigates Welcome to PainHook', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Welcome');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PainHook');
      expect(nextScreen).toBe('PainHook');
    });

    it('navigates PainHook to Introduction', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'PainHook');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Introduction');
      expect(nextScreen).toBe('Introduction');
    });

    it('navigates Introduction to UniversalShiftBuilder', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Introduction');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('UniversalShiftBuilder');
      expect(nextScreen).toBe('UniversalShiftBuilder');
    });

    it('navigates UniversalShiftBuilder to AhaMoment', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'UniversalShiftBuilder');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('AhaMoment');
      expect(nextScreen).toBe('AhaMoment');
    });

    it('navigates AhaMoment to Completion', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'AhaMoment');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Completion');
      expect(nextScreen).toBe('Completion');
    });
  });

  describe('goToPreviousScreen', () => {
    it('calls goBack when available', () => {
      goToPreviousScreen(mockNavigation);
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('canGoNext', () => {
    it('returns true before Completion', () => {
      expect(canGoNext('PainHook')).toBe(true);
      expect(canGoNext('Introduction')).toBe(true);
      expect(canGoNext('UniversalShiftBuilder')).toBe(true);
    });

    it('returns false for Completion', () => {
      expect(canGoNext('Completion')).toBe(false);
    });
  });

  describe('getNextScreenName', () => {
    it('returns the universal schedule setup path', () => {
      expect(getNextScreenName('Introduction')).toBe('UniversalShiftBuilder');
      expect(getNextScreenName('UniversalShiftBuilder')).toBe('AhaMoment');
    });
  });
});
