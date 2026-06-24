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
    it('navigates Welcome to SetupIntro', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'Welcome');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SetupIntro');
      expect(nextScreen).toBe('SetupIntro');
    });

    it('navigates SetupIntro to GuidedShiftChatSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'SetupIntro');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('GuidedShiftChatSetup');
      expect(nextScreen).toBe('GuidedShiftChatSetup');
    });

    it('navigates GuidedShiftChatSetup to ShiftTimesSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'GuidedShiftChatSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ShiftTimesSetup');
      expect(nextScreen).toBe('ShiftTimesSetup');
    });

    it('navigates ShiftTimesSetup to KnownShiftDateSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ShiftTimesSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('KnownShiftDateSetup');
      expect(nextScreen).toBe('KnownShiftDateSetup');
    });

    it('navigates KnownShiftDateSetup to KnownShiftTypeSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'KnownShiftDateSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('KnownShiftTypeSetup');
      expect(nextScreen).toBe('KnownShiftTypeSetup');
    });

    it('navigates KnownShiftTypeSetup to KnownShiftPhaseSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'KnownShiftTypeSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('KnownShiftPhaseSetup');
      expect(nextScreen).toBe('KnownShiftPhaseSetup');
    });

    it('navigates KnownShiftPhaseSetup to SchedulePreviewSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'KnownShiftPhaseSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SchedulePreviewSetup');
      expect(nextScreen).toBe('SchedulePreviewSetup');
    });

    it('navigates SchedulePreviewSetup to SetupSummary', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'SchedulePreviewSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SetupSummary');
      expect(nextScreen).toBe('SetupSummary');
    });

    it('navigates FixMenuSetup back to SchedulePreviewSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'FixMenuSetup');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SchedulePreviewSetup');
      expect(nextScreen).toBe('SchedulePreviewSetup');
    });

    it('navigates SetupSummary to ReminderSetup', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'SetupSummary');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ReminderSetup');
      expect(nextScreen).toBe('ReminderSetup');
    });

    it('navigates ReminderSetup to AhaMoment', () => {
      const nextScreen = goToNextScreen(mockNavigation, 'ReminderSetup');
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
      expect(canGoNext('SetupIntro')).toBe(true);
      expect(canGoNext('GuidedShiftChatSetup')).toBe(true);
      expect(canGoNext('ShiftTimesSetup')).toBe(true);
      expect(canGoNext('KnownShiftDateSetup')).toBe(true);
      expect(canGoNext('KnownShiftTypeSetup')).toBe(true);
      expect(canGoNext('KnownShiftPhaseSetup')).toBe(true);
      expect(canGoNext('SchedulePreviewSetup')).toBe(true);
      expect(canGoNext('FixMenuSetup')).toBe(true);
      expect(canGoNext('SetupSummary')).toBe(true);
      expect(canGoNext('ReminderSetup')).toBe(true);
    });

    it('returns false for Completion', () => {
      expect(canGoNext('Completion')).toBe(false);
    });
  });

  describe('getNextScreenName', () => {
    it('returns the universal schedule setup path', () => {
      expect(getNextScreenName('Welcome')).toBe('SetupIntro');
      expect(getNextScreenName('SetupIntro')).toBe('GuidedShiftChatSetup');
      expect(getNextScreenName('GuidedShiftChatSetup')).toBe('ShiftTimesSetup');
      expect(getNextScreenName('ShiftTimesSetup')).toBe('KnownShiftDateSetup');
      expect(getNextScreenName('KnownShiftDateSetup')).toBe('KnownShiftTypeSetup');
      expect(getNextScreenName('KnownShiftTypeSetup')).toBe('KnownShiftPhaseSetup');
      expect(getNextScreenName('KnownShiftPhaseSetup')).toBe('SchedulePreviewSetup');
      expect(getNextScreenName('SchedulePreviewSetup')).toBe('SetupSummary');
      expect(getNextScreenName('FixMenuSetup')).toBe('SchedulePreviewSetup');
      expect(getNextScreenName('SetupSummary')).toBe('ReminderSetup');
      expect(getNextScreenName('ReminderSetup')).toBe('AhaMoment');
    });
  });
});
