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
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  } as unknown as NavigationProp<OnboardingStackParamList>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('goToNextScreen', () => {
    it('navigates ShiftSystem to RosterType', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ShiftSystem');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('RosterType');
      expect(nextScreen).toBe('RosterType');
    });

    it('routes rotating custom pattern to CustomPattern', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.CUSTOM,
        rosterType: 'rotating',
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CustomPattern');
      expect(nextScreen).toBe('CustomPattern');
    });

    it('routes fifo custom pattern to FIFOCustomPattern', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.FIFO_CUSTOM,
        rosterType: 'fifo',
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FIFOCustomPattern');
      expect(nextScreen).toBe('FIFOCustomPattern');
    });

    it('routes fifo standard pattern to FIFOPhaseSelector', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.FIFO_8_6,
        rosterType: 'fifo',
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('FIFOPhaseSelector');
      expect(nextScreen).toBe('FIFOPhaseSelector');
    });

    it('routes rotating standard pattern to PhaseSelector', () => {
      const data: Partial<OnboardingData> = {
        patternType: ShiftPattern.STANDARD_4_4_4,
        rosterType: 'rotating',
      };

      const nextScreen = goToNextScreen(mockNavigation, 'ShiftPattern', data as OnboardingData);
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PhaseSelector');
      expect(nextScreen).toBe('PhaseSelector');
    });

    it('navigates from FIFOPhaseSelector to StartDate', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'FIFOPhaseSelector');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('StartDate');
      expect(nextScreen).toBe('StartDate');
    });
  });

  describe('goToPreviousScreen', () => {
    it('calls goBack when available', () => {
      goToPreviousScreen(mockNavigation);
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('canGoNext', () => {
    it('returns true for new FIFO routes', () => {
      expect(canGoNext('RosterType')).toBe(true);
      expect(canGoNext('FIFOCustomPattern')).toBe(true);
      expect(canGoNext('FIFOPhaseSelector')).toBe(true);
    });

    it('returns false for Completion', () => {
      expect(canGoNext('Completion')).toBe(false);
    });
  });

  describe('getNextScreenName', () => {
    it('returns conditional path based on roster and pattern type', () => {
      expect(
        getNextScreenName('ShiftPattern', {
          patternType: ShiftPattern.CUSTOM,
          rosterType: 'rotating',
        } as OnboardingData)
      ).toBe('CustomPattern');

      expect(
        getNextScreenName('ShiftPattern', {
          patternType: ShiftPattern.FIFO_CUSTOM,
          rosterType: 'fifo',
        } as OnboardingData)
      ).toBe('FIFOCustomPattern');

      expect(
        getNextScreenName('ShiftPattern', {
          patternType: ShiftPattern.FIFO_7_7,
          rosterType: 'fifo',
        } as OnboardingData)
      ).toBe('FIFOPhaseSelector');
    });
  });
});
