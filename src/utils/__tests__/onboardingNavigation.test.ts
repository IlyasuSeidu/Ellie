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
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ShiftPattern } from '@/types';

describe('onboardingNavigation', () => {
  // Mock navigation object
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  } as unknown as NavigationProp<OnboardingStackParamList>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('goToNextScreen', () => {
    it('should navigate from Welcome to Introduction', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Welcome');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Introduction');
      expect(nextScreen).toBe('Introduction');
    });

    it('should navigate from Introduction to ShiftSystem', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Introduction');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ShiftSystem');
      expect(nextScreen).toBe('ShiftSystem');
    });

    it('should navigate from ShiftSystem to ShiftPattern', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ShiftSystem');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ShiftPattern');
      expect(nextScreen).toBe('ShiftPattern');
    });

    it('should navigate to CustomPattern if CUSTOM pattern selected', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.CUSTOM,
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CustomPattern');
      expect(nextScreen).toBe('CustomPattern');
    });

    it('should navigate to PhaseSelector if standard pattern selected', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.STANDARD_4_4_4,
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PhaseSelector');
      expect(nextScreen).toBe('PhaseSelector');
    });

    it('should navigate to PhaseSelector if no data provided for ShiftPattern', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PhaseSelector');
      expect(nextScreen).toBe('PhaseSelector');
    });

    it('should navigate from CustomPattern to PhaseSelector', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'CustomPattern');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PhaseSelector');
      expect(nextScreen).toBe('PhaseSelector');
    });

    it('should navigate from PhaseSelector to StartDate', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'PhaseSelector');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('StartDate');
      expect(nextScreen).toBe('StartDate');
    });

    it('should navigate from StartDate to ShiftTimeInput', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'StartDate');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ShiftTimeInput');
      expect(nextScreen).toBe('ShiftTimeInput');
    });

    it('should navigate from ShiftTimeInput to Completion', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ShiftTimeInput');

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Completion');
      expect(nextScreen).toBe('Completion');
    });

    it('should return null from Completion (end of flow)', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Completion');

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(nextScreen).toBeNull();
    });
  });

  describe('goToPreviousScreen', () => {
    it('should call goBack when navigation can go back', () => {
      goToPreviousScreen(mockNavigation);

      expect(mockNavigation.canGoBack).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should not call goBack when navigation cannot go back', () => {
      mockNavigation.canGoBack.mockReturnValue(false);

      goToPreviousScreen(mockNavigation);

      expect(mockNavigation.canGoBack).toHaveBeenCalled();
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  describe('canGoNext', () => {
    it('should return true for Welcome', () => {
      expect(canGoNext('Welcome')).toBe(true);
    });

    it('should return true for Introduction', () => {
      expect(canGoNext('Introduction')).toBe(true);
    });

    it('should return true for ShiftSystem', () => {
      expect(canGoNext('ShiftSystem')).toBe(true);
    });

    it('should return true for ShiftPattern', () => {
      expect(canGoNext('ShiftPattern')).toBe(true);
    });

    it('should return true for CustomPattern', () => {
      expect(canGoNext('CustomPattern')).toBe(true);
    });

    it('should return true for PhaseSelector', () => {
      expect(canGoNext('PhaseSelector')).toBe(true);
    });

    it('should return true for StartDate', () => {
      expect(canGoNext('StartDate')).toBe(true);
    });

    it('should return true for ShiftTimeInput', () => {
      expect(canGoNext('ShiftTimeInput')).toBe(true);
    });

    it('should return false for Completion', () => {
      expect(canGoNext('Completion')).toBe(false);
    });
  });

  describe('getNextScreenName', () => {
    it('should return next screen name without navigating', () => {
      const nextScreen = getNextScreenName('Welcome');

      expect(nextScreen).toBe('Introduction');
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should handle conditional routing for CustomPattern', () => {
      const customData: Partial<OnboardingData> = {
        patternType: ShiftPattern.CUSTOM,
      };
      const standardData: Partial<OnboardingData> = {
        patternType: ShiftPattern.STANDARD_4_4_4,
      };

      expect(getNextScreenName('ShiftPattern', customData as OnboardingData)).toBe('CustomPattern');
      expect(getNextScreenName('ShiftPattern', standardData as OnboardingData)).toBe(
        'PhaseSelector'
      );
    });

    it('should return null for Completion screen', () => {
      const nextScreen = getNextScreenName('Completion');

      expect(nextScreen).toBeNull();
    });

    it('should handle all standard patterns routing to PhaseSelector', () => {
      const patterns = [
        ShiftPattern.STANDARD_4_4_4,
        ShiftPattern.STANDARD_7_7_7,
        ShiftPattern.STANDARD_2_2_3,
        ShiftPattern.STANDARD_5_5_5,
        ShiftPattern.STANDARD_3_3_3,
        ShiftPattern.STANDARD_10_10_10,
        ShiftPattern.CONTINENTAL,
        ShiftPattern.PITMAN,
      ];

      patterns.forEach((pattern) => {
        const data: Partial<OnboardingData> = { patternType: pattern };
        expect(getNextScreenName('ShiftPattern', data as OnboardingData)).toBe('PhaseSelector');
      });
    });
  });
});
