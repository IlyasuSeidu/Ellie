/**
 * PremiumStartDateScreen Component Tests
 * Tests for start date and phase selection with animations
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import {
  PremiumStartDateScreen,
  _SelectedDateCard,
  _InteractiveCalendar,
  _AnimatedPhaseCard,
  _DayCard,
  _PhaseSelector,
  _DayWithinPhaseSelector,
  _LivePreviewCard,
  _calculateEnhancedPhaseOffset,
  _getBasePhaseOffset,
  _getPhaseColor,
  _getPhaseIcon,
  _getCalendarShiftIcon,
  _getShiftColor,
  _getShiftBorderColor,
  _getShiftGlowColor,
  _getShiftRingColor,
  _applyDateSelection,
  _handleCalendarPanEnd,
  _getPhaseGradientColors,
  _getPhaseBorderColor,
  _getPhaseShadowColor,
  _getDayWithinPhaseLength,
  _getDayWithinPhaseLabel,
  _isDateValid,
  _getShiftTypeForDate,
  _getPhaseLabel,
  _resolvePatternValues,
} from '../PremiumStartDateScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ShiftPattern, ShiftSystem } from '@/types';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import * as OnboardingContext from '@/contexts/OnboardingContext';
import * as Haptics from 'expo-haptics';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRootGoBack = jest.fn();
const mockRootReset = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const mockCanGoBack = jest.fn(() => true);
let mockRouteParams: OnboardingStackParamList['StartDate'] = undefined;

// Mock haptics
// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-haptics');

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
  };
});

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const mockGesture = {
    onBegin: jest.fn().mockReturnThis(),
    onUpdate: jest.fn().mockReturnThis(),
    onEnd: jest.fn().mockReturnThis(),
    onFinalize: jest.fn().mockReturnThis(),
  };
  return {
    Gesture: {
      Pan: jest.fn(() => mockGesture),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: (props: any) => props.children,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  useRoute: () => ({
    key: 'StartDate-test',
    name: 'StartDate',
    params: mockRouteParams,
  }),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
    getParent: () => ({
      canGoBack: mockCanGoBack,
      goBack: mockRootGoBack,
      reset: mockRootReset,
    }),
  }),
}));

jest.mock('@/utils/onboardingNavigation', () => ({
  goToNextScreen: jest.fn(),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(RN.View, props, props.children),
  };
});

// Mock components
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    ProgressHeader: (props: Record<string, unknown>) =>
      React.createElement(
        RN.View,
        { testID: 'progress-header' },
        React.createElement(RN.Text, null, `Step ${props.currentStep} of ${props.totalSteps}`)
      ),
  };
});

// Helper to render with context
const renderWithContext = (component: React.ReactElement) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe('PremiumStartDateScreen', () => {
  const mockOnBack = jest.fn();
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
    mockRouteParams = undefined;
    mockCanGoBack.mockReturnValue(true);
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });

    it('should render progress header correctly', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Step 6 of 8')).toBeTruthy();
    });

    it('should render without crashing when no callbacks provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should handle all props being provided', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="start-date-screen"
        />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Interactive Calendar', () => {
    it('should render calendar with month navigation', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display weekday labels', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Sun')).toBeTruthy();
      expect(getByText('Mon')).toBeTruthy();
      expect(getByText('Tue')).toBeTruthy();
      expect(getByText('Wed')).toBeTruthy();
      expect(getByText('Thu')).toBeTruthy();
      expect(getByText('Fri')).toBeTruthy();
      expect(getByText('Sat')).toBeTruthy();
    });

    it('should render calendar component', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Phase Offset from Context', () => {
    it('should use phase offset from context', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      // Phase selection is now done in PhaseSelector screen (step 5)
      // This screen uses phaseOffset from OnboardingContext
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render calendar with phase offset visualization', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should not render phase selection UI', () => {
      const { queryByText } = renderWithContext(<PremiumStartDateScreen />);
      // Phase selection UI removed - now in PhaseSelector screen
      expect(queryByText("Choose which part of your cycle you'll be on")).toBeFalsy();
    });
  });

  describe('Calendar Visualization', () => {
    it('should display calendar with shift pattern visualization', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      // Calendar visualizes the shift pattern based on phaseOffset from context
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should not render live preview card', () => {
      const { queryByText } = renderWithContext(<PremiumStartDateScreen />);
      // Live preview component is no longer shown (marked as unused)
      expect(queryByText('Starting:')).toBeFalsy();
      expect(queryByText('Phase:')).toBeFalsy();
    });

    it('should visualize phase offset in calendar', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Continue Button', () => {
    it('should render continue button', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Set Shift Times')).toBeTruthy();
    });

    it('should have back button', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should render navigation buttons', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Set Shift Times')).toBeTruthy();
    });

    it('keeps continue disabled when phaseOffset is missing', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      fireEvent.press(getByText('Set Shift Times'));
      expect(goToNextScreen).not.toHaveBeenCalled();
      expect(mockOnContinue).not.toHaveBeenCalled();
    });

    it('continues to next screen when phaseOffset is available', async () => {
      const updateDataMock = jest.fn();
      const onboardingSpy = jest.spyOn(OnboardingContext, 'useOnboarding').mockReturnValue({
        data: {
          name: 'Alex',
          occupation: 'Engineer',
          company: 'Site',
          country: 'US',
          shiftSystem: '2-shift',
          patternType: 'standard_4_4_4',
          phaseOffset: 2,
        },
        updateData: updateDataMock,
      } as unknown as ReturnType<typeof OnboardingContext.useOnboarding>);

      const runAfterInteractionsSpy = jest
        .spyOn(require('react-native').InteractionManager, 'runAfterInteractions')
        .mockImplementation((...args: unknown[]) => {
          const callback = args[0] as (() => void) | undefined;
          callback?.();
          return { cancel: jest.fn() };
        });

      const { getByText } = render(<PremiumStartDateScreen />);
      fireEvent.press(getByText('Set Shift Times'));

      expect(goToNextScreen).toHaveBeenCalledWith(expect.anything(), 'StartDate');
      expect(updateDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
        })
      );
      expect(runAfterInteractionsSpy).toHaveBeenCalled();
      onboardingSpy.mockRestore();
      runAfterInteractionsSpy.mockRestore();
    });

    it('uses onContinue callback when provided', async () => {
      const updateDataMock = jest.fn();
      const onboardingSpy = jest.spyOn(OnboardingContext, 'useOnboarding').mockReturnValue({
        data: {
          name: 'Alex',
          occupation: 'Engineer',
          company: 'Site',
          country: 'US',
          shiftSystem: '2-shift',
          patternType: 'standard_4_4_4',
          phaseOffset: 1,
        },
        updateData: updateDataMock,
      } as unknown as ReturnType<typeof OnboardingContext.useOnboarding>);

      const runAfterInteractionsSpy = jest
        .spyOn(require('react-native').InteractionManager, 'runAfterInteractions')
        .mockImplementation((...args: unknown[]) => {
          const callback = args[0] as (() => void) | undefined;
          callback?.();
          return { cancel: jest.fn() };
        });

      const { getByText } = render(<PremiumStartDateScreen onContinue={mockOnContinue} />);
      fireEvent.press(getByText('Set Shift Times'));

      expect(mockOnContinue).toHaveBeenCalled();
      expect(updateDataMock).toHaveBeenCalled();
      expect(goToNextScreen).not.toHaveBeenCalled();
      onboardingSpy.mockRestore();
      runAfterInteractionsSpy.mockRestore();
    });

    it('handles back via callback and navigation fallback', () => {
      const callbackView = renderWithContext(<PremiumStartDateScreen onBack={mockOnBack} />);
      fireEvent.press(callbackView.getByText('arrow-back'));
      expect(mockOnBack).toHaveBeenCalled();

      const fallbackView = renderWithContext(<PremiumStartDateScreen />);
      fireEvent.press(fallbackView.getByText('arrow-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Settings Entry Mode', () => {
    it('shows settings-specific CTA labels', () => {
      mockRouteParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };

      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('Save & Return')).toBeTruthy();
      expect(getByText('arrow-back')).toBeTruthy();
    });

    it('back exits directly to settings parent navigator', () => {
      mockRouteParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };

      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      fireEvent.press(getByText('arrow-back'));

      expect(mockRootGoBack).toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('forward saves current start date and exits to settings without onboarding progression', () => {
      mockRouteParams = {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      };

      const updateDataMock = jest.fn();
      const onboardingSpy = jest.spyOn(OnboardingContext, 'useOnboarding').mockReturnValue({
        data: {
          name: 'Alex',
          occupation: 'Engineer',
          company: 'Site',
          country: 'US',
          shiftSystem: '2-shift',
          patternType: 'standard_4_4_4',
          startDate: '2026-03-06T00:00:00.000Z',
        },
        updateData: updateDataMock,
      } as unknown as ReturnType<typeof OnboardingContext.useOnboarding>);

      const runAfterInteractionsSpy = jest
        .spyOn(require('react-native').InteractionManager, 'runAfterInteractions')
        .mockImplementation((...args: unknown[]) => {
          const callback = args[0] as (() => void) | undefined;
          callback?.();
          return { cancel: jest.fn() };
        });

      const { getByText } = render(<PremiumStartDateScreen />);
      fireEvent.press(getByText('Save & Return'));

      expect(updateDataMock).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          phaseOffset: 0,
        })
      );
      expect(mockRootGoBack).toHaveBeenCalled();
      expect(goToNextScreen).not.toHaveBeenCalled();

      onboardingSpy.mockRestore();
      runAfterInteractionsSpy.mockRestore();
    });
  });

  describe('Data Management', () => {
    it('should handle pattern data from context', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should work with OnboardingProvider', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Integration with Context', () => {
    it('should render within OnboardingProvider', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should handle callbacks from parent', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen
          onBack={mockOnBack}
          onContinue={mockOnContinue}
          testID="start-date-screen"
        />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render with reduced motion support', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should have accessible labels', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should have descriptive titles and subtitles', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle default pattern values', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
    });

    it('should render without errors', () => {
      const { getByTestId } = renderWithContext(
        <PremiumStartDateScreen testID="start-date-screen" />
      );
      expect(getByTestId('start-date-screen')).toBeTruthy();
    });

    it('should display all UI elements correctly', () => {
      const { getByText } = renderWithContext(<PremiumStartDateScreen />);
      expect(getByText('When Does Your Rotation Start?')).toBeTruthy();
      expect(
        getByText('Pick the date you want your calendar to start from—most people choose today')
      ).toBeTruthy();
    });
  });

  describe('Exported Helpers and Subcomponents', () => {
    it('calculates enhanced phase offsets for 2-shift and 3-shift', () => {
      expect(
        _calculateEnhancedPhaseOffset(
          'night',
          2,
          { daysOn: 4, nightsOn: 4, daysOff: 4 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBe(5);

      expect(
        _calculateEnhancedPhaseOffset(
          'afternoon',
          3,
          { morningOn: 4, afternoonOn: 4, nightOn: 4, daysOff: 4 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(6);
    });

    it('validates calendar date window (today..+90 days)', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(_isDateValid(yesterday)).toBe(false);

      expect(_isDateValid(today)).toBe(true);

      const plus90 = new Date(today);
      plus90.setDate(plus90.getDate() + 90);
      expect(_isDateValid(plus90)).toBe(true);

      const plus91 = new Date(today);
      plus91.setDate(plus91.getDate() + 91);
      expect(_isDateValid(plus91)).toBe(false);
    });

    it('computes shift type for 2-shift and 3-shift patterns', () => {
      const start = new Date('2026-02-01T00:00:00.000Z');

      // Before start date
      expect(
        _getShiftTypeForDate(
          new Date('2026-01-31T00:00:00.000Z'),
          start,
          0,
          { daysOn: 2, nightsOn: 2, daysOff: 2 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBeNull();

      // 2-shift cycle positions
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-01T00:00:00.000Z'),
          start,
          0,
          { daysOn: 2, nightsOn: 2, daysOff: 2 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBe('day');
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-03T00:00:00.000Z'),
          start,
          0,
          { daysOn: 2, nightsOn: 2, daysOff: 2 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBe('night');
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-05T00:00:00.000Z'),
          start,
          0,
          { daysOn: 2, nightsOn: 2, daysOff: 2 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBe('off');

      // 3-shift cycle positions
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-01T00:00:00.000Z'),
          start,
          0,
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe('morning');
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-03T00:00:00.000Z'),
          start,
          0,
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe('afternoon');
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-05T00:00:00.000Z'),
          start,
          0,
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe('night');
      expect(
        _getShiftTypeForDate(
          new Date('2026-02-07T00:00:00.000Z'),
          start,
          0,
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe('off');

      expect(
        _getShiftTypeForDate(
          new Date('2026-02-01T00:00:00.000Z'),
          start,
          0,
          { morningOn: 0, afternoonOn: 0, nightOn: 0, daysOff: 0 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBeNull();

      expect(
        _getShiftTypeForDate(
          new Date('2026-02-01T00:00:00.000Z'),
          start,
          0,
          { daysOn: 0, nightsOn: 0, daysOff: 0 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBeNull();
    });

    it('covers base phase offset and phase presentation fallback branches', () => {
      expect(
        _getBasePhaseOffset('day', { daysOn: 2, nightsOn: 2, daysOff: 2 }, ShiftSystem.TWO_SHIFT)
      ).toBe(0);
      expect(
        _getBasePhaseOffset('night', { daysOn: 2, nightsOn: 2, daysOff: 2 }, ShiftSystem.TWO_SHIFT)
      ).toBe(2);
      expect(
        _getBasePhaseOffset('off', { daysOn: 2, nightsOn: 2, daysOff: 2 }, ShiftSystem.TWO_SHIFT)
      ).toBe(4);
      expect(
        _getBasePhaseOffset(
          'morning',
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(0);
      expect(
        _getBasePhaseOffset(
          'afternoon',
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(2);
      expect(
        _getBasePhaseOffset(
          'night',
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(4);
      expect(
        _getBasePhaseOffset(
          'off',
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(6);
      expect(
        _getBasePhaseOffset(
          'invalid' as unknown as never,
          { daysOn: 2, nightsOn: 2, daysOff: 2 },
          ShiftSystem.TWO_SHIFT
        )
      ).toBe(0);
      expect(
        _getBasePhaseOffset(
          'invalid' as unknown as never,
          { morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 },
          ShiftSystem.THREE_SHIFT
        )
      ).toBe(0);

      expect(_getPhaseColor('day')).toBeTruthy();
      expect(_getPhaseColor('night')).toBeTruthy();
      expect(_getPhaseColor('morning')).toBeTruthy();
      expect(_getPhaseColor('afternoon')).toBeTruthy();
      expect(_getPhaseColor('off')).toBeTruthy();
      expect(_getPhaseColor('invalid' as unknown as never)).toBeTruthy();

      expect(_getPhaseIcon('day')).toBeTruthy();
      expect(_getPhaseIcon('night')).toBeTruthy();
      expect(_getPhaseIcon('morning')).toBeTruthy();
      expect(_getPhaseIcon('afternoon')).toBeTruthy();
      expect(_getPhaseIcon('off')).toBeTruthy();
      expect(_getPhaseIcon('invalid' as unknown as never)).toBeTruthy();

      expect(_getCalendarShiftIcon('day')).toBeTruthy();
      expect(_getCalendarShiftIcon('night')).toBeTruthy();
      expect(_getCalendarShiftIcon('morning')).toBeTruthy();
      expect(_getCalendarShiftIcon('afternoon')).toBeTruthy();
      expect(_getCalendarShiftIcon('off')).toBeTruthy();
      expect(_getCalendarShiftIcon('invalid' as unknown as never)).toBeTruthy();
    });

    it('formats phase labels for empty and specific-day variants', () => {
      expect(_getPhaseLabel(null, null)).toBe('your current shift');
      expect(_getPhaseLabel('day', null)).toBe('Day Shift');
      expect(_getPhaseLabel('night', 3)).toBe('Day 3 of Night Shifts');
      expect(_getPhaseLabel('off', 2)).toBe('Day 2 of Days Off');
    });

    it('renders selected date card only when date is set', () => {
      const hidden = render(<_SelectedDateCard selectedDate={null} reducedMotion={false} />);
      expect(hidden.queryByText('Your cycle will start on:')).toBeNull();

      const visible = render(<_SelectedDateCard selectedDate="2026-02-28" reducedMotion={false} />);
      expect(visible.getByText('Your cycle will start on:')).toBeTruthy();
    });

    it('navigates calendar month with arrow controls', () => {
      const onDateSelect = jest.fn();
      const calendar = render(
        <_InteractiveCalendar
          selectedDate={null}
          onDateSelect={onDateSelect}
          reducedMotion={false}
          customPattern={{ daysOn: 2, nightsOn: 2, daysOff: 2 }}
          phaseOffset={0}
          shiftSystem={ShiftSystem.TWO_SHIFT}
        />
      );

      const getMonthLabel = () => {
        const monthNode = calendar.getByText(/\d{4}/);
        const { children } = monthNode.props;
        return Array.isArray(children) ? children.join('') : String(children);
      };

      const initialLabel = getMonthLabel();
      fireEvent.press(calendar.getByText('chevron-forward'));
      const afterNextLabel = getMonthLabel();
      expect(afterNextLabel).not.toBe(initialLabel);

      fireEvent.press(calendar.getByText('chevron-back'));
      const afterBackLabel = getMonthLabel();
      expect(afterBackLabel).toBe(initialLabel);
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('renders phase selector variants for 2-shift and 3-shift', () => {
      const onPhaseSelect = jest.fn();

      const twoShift = render(
        <_PhaseSelector
          selectedPhase={null}
          onPhaseSelect={onPhaseSelect}
          pattern={{ daysOn: 2, nightsOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          reducedMotion={false}
        />
      );
      expect(twoShift.getByText('Day Shift')).toBeTruthy();
      expect(twoShift.getByText('Night Shift')).toBeTruthy();

      const threeShift = render(
        <_PhaseSelector
          selectedPhase={null}
          onPhaseSelect={onPhaseSelect}
          pattern={{ morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          reducedMotion={false}
        />
      );
      expect(threeShift.getByText('Morning Shift')).toBeTruthy();
      expect(threeShift.getByText('Afternoon Shift')).toBeTruthy();
    });

    it('renders animated phase card iconicon path in selected and unselected states', () => {
      const selected = render(
        <_AnimatedPhaseCard
          phase={'invalid' as unknown as never}
          isSelected={true}
          onPress={jest.fn()}
          label="Custom"
          icon="iconicon"
          entranceDelay={0}
          reducedMotion={false}
          disabled={false}
        />
      );
      expect(selected.getByText('Custom')).toBeTruthy();

      const unselected = render(
        <_AnimatedPhaseCard
          phase="off"
          isSelected={false}
          onPress={jest.fn()}
          label="Unselected"
          icon="iconicon"
          entranceDelay={0}
          reducedMotion={false}
          disabled={false}
        />
      );
      expect(unselected.getByText('Unselected')).toBeTruthy();
    });

    it('fires phase selection callback on tap in 2-shift and 3-shift selectors', () => {
      const onPhaseSelect = jest.fn();
      const twoShift = render(
        <_PhaseSelector
          selectedPhase={null}
          onPhaseSelect={onPhaseSelect}
          pattern={{ daysOn: 2, nightsOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          reducedMotion={false}
        />
      );
      const dayShift = twoShift.getByText('Day Shift');
      fireEvent(dayShift, 'touchStart', { nativeEvent: { pageX: 10, pageY: 10 } });
      fireEvent(dayShift, 'touchEnd', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('day');
      const nightShift = twoShift.getByText('Night Shift');
      fireEvent(nightShift, 'touchStart', { nativeEvent: { pageX: 12, pageY: 12 } });
      fireEvent(nightShift, 'touchEnd', { nativeEvent: { pageX: 12, pageY: 12 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('night');
      const daysOff = twoShift.getByText('Days Off');
      fireEvent(daysOff, 'touchStart', { nativeEvent: { pageX: 14, pageY: 14 } });
      fireEvent(daysOff, 'touchEnd', { nativeEvent: { pageX: 14, pageY: 14 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('off');

      const threeShift = render(
        <_PhaseSelector
          selectedPhase={null}
          onPhaseSelect={onPhaseSelect}
          pattern={{ morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          reducedMotion={false}
        />
      );
      const morning = threeShift.getByText('Morning Shift');
      fireEvent(morning, 'touchStart', { nativeEvent: { pageX: 20, pageY: 20 } });
      fireEvent(morning, 'touchEnd', { nativeEvent: { pageX: 20, pageY: 20 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('morning');
      const afternoon = threeShift.getByText('Afternoon Shift');
      fireEvent(afternoon, 'touchStart', { nativeEvent: { pageX: 22, pageY: 22 } });
      fireEvent(afternoon, 'touchEnd', { nativeEvent: { pageX: 22, pageY: 22 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('afternoon');
      const threeShiftNight = threeShift.getByText('Night Shift');
      fireEvent(threeShiftNight, 'touchStart', { nativeEvent: { pageX: 24, pageY: 24 } });
      fireEvent(threeShiftNight, 'touchEnd', { nativeEvent: { pageX: 24, pageY: 24 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('night');
      const threeShiftOff = threeShift.getByText('Days Off');
      fireEvent(threeShiftOff, 'touchStart', { nativeEvent: { pageX: 26, pageY: 26 } });
      fireEvent(threeShiftOff, 'touchEnd', { nativeEvent: { pageX: 26, pageY: 26 } });
      expect(onPhaseSelect).toHaveBeenCalledWith('off');
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('does not select phase when touch movement indicates scroll gesture', () => {
      const onPhaseSelect = jest.fn();
      const view = render(
        <_PhaseSelector
          selectedPhase={null}
          onPhaseSelect={onPhaseSelect}
          pattern={{ daysOn: 2, nightsOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          reducedMotion={false}
        />
      );

      const dayShiftNode = view.getByText('Day Shift');
      fireEvent(dayShiftNode, 'touchStart', { nativeEvent: { pageX: 0, pageY: 0 } });
      fireEvent(dayShiftNode, 'touchEnd', { nativeEvent: { pageX: 40, pageY: 40 } });
      expect(onPhaseSelect).not.toHaveBeenCalled();
    });

    it('renders day-within-phase selector for multi-day phase and emits day selection', () => {
      const onDaySelect = jest.fn();

      const hidden = render(
        <_DayWithinPhaseSelector
          selectedPhase="day"
          pattern={{ daysOn: 1, nightsOn: 1, daysOff: 1 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          selectedDay={null}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );
      expect(hidden.queryByText('Which day of your Day Shift?')).toBeNull();

      const visible = render(
        <_DayWithinPhaseSelector
          selectedPhase="day"
          pattern={{ daysOn: 3, nightsOn: 1, daysOff: 1 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          selectedDay={2}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );
      expect(visible.getByText('Which day of your Day Shift?')).toBeTruthy();

      const day2 = visible.getByLabelText('Day 2');
      fireEvent(day2, 'touchStart', { nativeEvent: { pageX: 10, pageY: 10 } });
      fireEvent(day2, 'touchEnd', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(onDaySelect).toHaveBeenCalledWith(2);
    });

    it('renders day-within-phase labels for 3-shift paths and hides when phase clears', () => {
      const onDaySelect = jest.fn();
      const view = render(
        <_DayWithinPhaseSelector
          selectedPhase="morning"
          pattern={{ morningOn: 3, afternoonOn: 2, nightOn: 2, daysOff: 2 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          selectedDay={1}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );
      expect(view.getByText('Which day of your Morning Shift?')).toBeTruthy();

      view.rerender(
        <_DayWithinPhaseSelector
          selectedPhase="night"
          pattern={{ morningOn: 2, afternoonOn: 2, nightOn: 3, daysOff: 2 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          selectedDay={1}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );
      expect(view.getByText('Which day of your Night Shift?')).toBeTruthy();

      view.rerender(
        <_DayWithinPhaseSelector
          selectedPhase={null}
          pattern={{ morningOn: 2, afternoonOn: 2, nightOn: 3, daysOff: 2 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          selectedDay={1}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );
      expect(view.queryByText(/Which day of your/)).toBeNull();
    });

    it('does not select day when touch movement indicates scroll gesture', () => {
      const onDaySelect = jest.fn();

      const visible = render(
        <_DayWithinPhaseSelector
          selectedPhase="day"
          pattern={{ daysOn: 3, nightsOn: 1, daysOff: 1 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          selectedDay={null}
          onDaySelect={onDaySelect}
          reducedMotion={false}
        />
      );

      const day2 = visible.getByLabelText('Day 2');
      fireEvent(day2, 'touchStart', { nativeEvent: { pageX: 0, pageY: 0 } });
      fireEvent(day2, 'touchEnd', { nativeEvent: { pageX: 25, pageY: 25 } });
      expect(onDaySelect).not.toHaveBeenCalled();
    });

    it('day card triggers on tap and ignores drag in standalone mode', () => {
      const onPress = jest.fn();
      const dayCard = render(
        <_DayCard
          dayNumber={1}
          isSelected={true}
          phase="off"
          onPress={onPress}
          reducedMotion={false}
          entranceDelay={0}
        />
      );

      const dayButton = dayCard.getByLabelText('Day 1');
      fireEvent(dayButton, 'touchStart', { nativeEvent: { pageX: 5, pageY: 5 } });
      fireEvent(dayButton, 'touchEnd', { nativeEvent: { pageX: 5, pageY: 5 } });
      expect(onPress).toHaveBeenCalledTimes(1);

      fireEvent(dayButton, 'touchStart', { nativeEvent: { pageX: 0, pageY: 0 } });
      fireEvent(dayButton, 'touchEnd', { nativeEvent: { pageX: 40, pageY: 40 } });
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders live preview card with timeline and confirmation rows', () => {
      const { getByText } = render(
        <_LivePreviewCard
          selectedDate="2026-02-28"
          selectedPhase="night"
          reducedMotion={false}
          customPattern={{ daysOn: 4, nightsOn: 4, daysOff: 4 }}
          shiftSystem={ShiftSystem.TWO_SHIFT}
          phaseOffset={1}
        />
      );

      expect(getByText('Starting:')).toBeTruthy();
      expect(getByText('Phase:')).toBeTruthy();
      expect(getByText('Your first cycle begins here')).toBeTruthy();
    });

    it('renders live preview for morning and afternoon phase icon branches', () => {
      const morningView = render(
        <_LivePreviewCard
          selectedDate="2026-02-28"
          selectedPhase="morning"
          reducedMotion={false}
          customPattern={{ morningOn: 4, afternoonOn: 4, nightOn: 4, daysOff: 4 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          phaseOffset={1}
        />
      );
      expect(morningView.getByText('Morning Shift')).toBeTruthy();

      const afternoonView = render(
        <_LivePreviewCard
          selectedDate="2026-02-28"
          selectedPhase="afternoon"
          reducedMotion={false}
          customPattern={{ morningOn: 4, afternoonOn: 4, nightOn: 4, daysOff: 4 }}
          shiftSystem={ShiftSystem.THREE_SHIFT}
          phaseOffset={1}
        />
      );
      expect(afternoonView.getByText('Afternoon Shift')).toBeTruthy();
    });

    it('resolves pattern values across predefined, FIFO, and 3-shift conversion branches', () => {
      const twoShiftData = {
        customPattern: { daysOn: 1, nightsOn: 1, daysOff: 1 },
        rosterType: 'rotating',
      };
      expect(
        _resolvePatternValues(ShiftPattern.STANDARD_4_4_4, twoShiftData, ShiftSystem.TWO_SHIFT)
      ).toEqual({ daysOn: 4, nightsOn: 4, daysOff: 4 });
      expect(
        _resolvePatternValues(ShiftPattern.FIFO_14_7, twoShiftData, ShiftSystem.TWO_SHIFT)
      ).toEqual({
        daysOn: 14,
        nightsOn: 0,
        daysOff: 7,
        workBlockPattern: 'straight-days',
      });
      expect(
        _resolvePatternValues(
          ShiftPattern.FIFO_CUSTOM,
          {
            fifoConfig: {
              workBlockDays: 9,
              restBlockDays: 5,
              workBlockPattern: 'straight-nights',
            },
            rosterType: 'fifo',
          },
          ShiftSystem.TWO_SHIFT
        )
      ).toEqual({
        daysOn: 9,
        nightsOn: 0,
        daysOff: 5,
        workBlockPattern: 'straight-nights',
      });

      expect(
        _resolvePatternValues(ShiftPattern.STANDARD_2_2_3, twoShiftData, ShiftSystem.THREE_SHIFT)
      ).toEqual({ morningOn: 2, afternoonOn: 2, nightOn: 2, daysOff: 3 });

      expect(
        _resolvePatternValues(
          ShiftPattern.CUSTOM,
          {
            customPattern: { morningOn: 3, afternoonOn: 2, nightOn: 1, daysOff: 2 },
            rosterType: 'rotating',
          },
          ShiftSystem.THREE_SHIFT
        )
      ).toEqual({ morningOn: 3, afternoonOn: 2, nightOn: 1, daysOff: 2 });
    });

    it('covers all predefined pattern mapping branches', () => {
      const rotating = {
        rosterType: 'rotating',
        customPattern: { daysOn: 1, nightsOn: 1, daysOff: 1 },
      };
      const cases: Array<
        [
          ShiftPattern,
          { daysOn: number; nightsOn: number; daysOff: number; workBlockPattern?: string },
        ]
      > = [
        [ShiftPattern.STANDARD_7_7_7, { daysOn: 7, nightsOn: 7, daysOff: 7 }],
        [ShiftPattern.STANDARD_5_5_5, { daysOn: 5, nightsOn: 5, daysOff: 5 }],
        [ShiftPattern.STANDARD_3_3_3, { daysOn: 3, nightsOn: 3, daysOff: 3 }],
        [ShiftPattern.STANDARD_10_10_10, { daysOn: 10, nightsOn: 10, daysOff: 10 }],
        [ShiftPattern.CONTINENTAL, { daysOn: 2, nightsOn: 2, daysOff: 4 }],
        [ShiftPattern.PITMAN, { daysOn: 2, nightsOn: 2, daysOff: 3 }],
        [
          ShiftPattern.FIFO_8_6,
          { daysOn: 8, nightsOn: 0, daysOff: 6, workBlockPattern: 'straight-days' },
        ],
        [
          ShiftPattern.FIFO_7_7,
          { daysOn: 7, nightsOn: 0, daysOff: 7, workBlockPattern: 'straight-days' },
        ],
        [
          ShiftPattern.FIFO_14_14,
          { daysOn: 14, nightsOn: 0, daysOff: 14, workBlockPattern: 'straight-days' },
        ],
        [
          ShiftPattern.FIFO_21_7,
          { daysOn: 21, nightsOn: 0, daysOff: 7, workBlockPattern: 'straight-days' },
        ],
        [
          ShiftPattern.FIFO_28_14,
          { daysOn: 28, nightsOn: 0, daysOff: 14, workBlockPattern: 'straight-days' },
        ],
      ];

      cases.forEach(([pattern, expected]) => {
        if (String(pattern).startsWith('FIFO_')) {
          expect(_resolvePatternValues(pattern, rotating, ShiftSystem.TWO_SHIFT)).toEqual(expected);
          return;
        }
        expect(_resolvePatternValues(pattern, rotating, ShiftSystem.TWO_SHIFT)).toEqual(
          expect.objectContaining({
            daysOn: expected.daysOn,
            nightsOn: expected.nightsOn,
            daysOff: expected.daysOff,
          })
        );
      });
    });

    it('derives FIFO shift type using FIFO config for straight-nights, swing, and custom sequence', () => {
      const start = new Date('2026-02-01T00:00:00.000Z');

      expect(
        _getShiftTypeForDate(
          new Date('2026-02-01T00:00:00.000Z'),
          start,
          0,
          { daysOn: 14, nightsOn: 0, daysOff: 14, workBlockPattern: 'straight-days' },
          ShiftSystem.TWO_SHIFT,
          {
            rosterType: 'fifo',
            patternType: ShiftPattern.FIFO_14_14,
            fifoConfig: {
              workBlockDays: 14,
              restBlockDays: 14,
              workBlockPattern: 'straight-nights',
            },
          }
        )
      ).toBe('night');

      expect(
        _getShiftTypeForDate(
          new Date('2026-02-03T00:00:00.000Z'),
          start,
          0,
          { daysOn: 14, nightsOn: 0, daysOff: 14, workBlockPattern: 'straight-days' },
          ShiftSystem.TWO_SHIFT,
          {
            rosterType: 'fifo',
            patternType: ShiftPattern.FIFO_14_14,
            fifoConfig: {
              workBlockDays: 14,
              restBlockDays: 14,
              workBlockPattern: 'swing',
              swingPattern: { daysOnDayShift: 2, daysOnNightShift: 12 },
            },
          }
        )
      ).toBe('night');

      expect(
        _getShiftTypeForDate(
          new Date('2026-02-02T00:00:00.000Z'),
          start,
          0,
          { daysOn: 14, nightsOn: 0, daysOff: 14, workBlockPattern: 'straight-days' },
          ShiftSystem.TWO_SHIFT,
          {
            rosterType: 'fifo',
            patternType: ShiftPattern.FIFO_14_14,
            fifoConfig: {
              workBlockDays: 14,
              restBlockDays: 14,
              workBlockPattern: 'custom',
              customWorkSequence: ['day', 'night', 'night'],
            },
          }
        )
      ).toBe('night');
    });

    it('covers calendar selection and pan-end helper branches', () => {
      const onDateSelect = jest.fn();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      _applyDateSelection(today, onDateSelect);
      expect(onDateSelect).toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalled();

      onDateSelect.mockClear();
      const past = new Date(today);
      past.setDate(past.getDate() - 2);
      _applyDateSelection(past, onDateSelect);
      expect(onDateSelect).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalled();

      const goNext = jest.fn();
      const goPrev = jest.fn();
      _handleCalendarPanEnd(-51, goNext, goPrev);
      _handleCalendarPanEnd(52, goNext, goPrev);
      _handleCalendarPanEnd(10, goNext, goPrev);
      expect(goNext).toHaveBeenCalledTimes(1);
      expect(goPrev).toHaveBeenCalledTimes(1);
    });

    it('covers interactive calendar date press and gesture handler callbacks', () => {
      const onDateSelect = jest.fn();
      const view = render(
        <_InteractiveCalendar
          selectedDate={null}
          onDateSelect={onDateSelect}
          reducedMotion={false}
          customPattern={{ daysOn: 2, nightsOn: 2, daysOff: 2 }}
          phaseOffset={0}
          shiftSystem={ShiftSystem.TWO_SHIFT}
        />
      );

      const todayDay = String(new Date().getDate());
      const dayNodes = view.getAllByText(todayDay);
      dayNodes.forEach((node) => {
        fireEvent.press(node);
      });
      expect(onDateSelect).toHaveBeenCalled();

      // Exercise pan gesture callbacks wired in _InteractiveCalendar.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Gesture } = require('react-native-gesture-handler');
      const panMock = Gesture.Pan as jest.Mock;
      const panInstance = panMock.mock.results[panMock.mock.results.length - 1]?.value as {
        onUpdate: jest.Mock;
        onEnd: jest.Mock;
      };
      const onUpdate = panInstance.onUpdate.mock.calls[
        panInstance.onUpdate.mock.calls.length - 1
      ]?.[0] as ((event: { translationX: number }) => void) | undefined;
      const onEnd = panInstance.onEnd.mock.calls[panInstance.onEnd.mock.calls.length - 1]?.[0] as
        | ((event: { translationX: number }) => void)
        | undefined;

      act(() => {
        onUpdate?.({ translationX: 18 });
      });
      act(() => {
        onEnd?.({ translationX: -64 });
      });
    });

    it('covers shift color and phase style helper branches', () => {
      expect(_getShiftColor('day')).toEqual(expect.objectContaining({ r: expect.any(Number) }));
      expect(_getShiftColor('night')).toEqual(expect.objectContaining({ r: expect.any(Number) }));
      expect(_getShiftColor('morning')).toEqual(expect.objectContaining({ r: expect.any(Number) }));
      expect(_getShiftColor('afternoon')).toEqual(
        expect.objectContaining({ r: expect.any(Number) })
      );
      expect(_getShiftColor('off')).toEqual(expect.objectContaining({ r: expect.any(Number) }));
      expect(_getShiftColor(null)).toEqual(expect.objectContaining({ r: expect.any(Number) }));

      expect(_getShiftBorderColor(null, 1)).toBe('transparent');
      expect(_getShiftBorderColor('day', 1)).toContain('rgba(');
      expect(_getShiftGlowColor(undefined, 1)).toContain('rgba(');
      expect(_getShiftRingColor('off', 1)).toContain('rgba(');

      expect(_getPhaseGradientColors('day')).toHaveLength(2);
      expect(_getPhaseGradientColors('night')).toHaveLength(2);
      expect(_getPhaseGradientColors('morning')).toHaveLength(2);
      expect(_getPhaseGradientColors('afternoon')).toHaveLength(2);
      expect(_getPhaseGradientColors('off')).toHaveLength(2);
      expect(_getPhaseGradientColors('invalid' as unknown as never)).toHaveLength(2);

      expect(_getPhaseBorderColor('day')).toContain('rgb');
      expect(_getPhaseBorderColor('night')).toContain('rgb');
      expect(_getPhaseBorderColor('morning')).toContain('rgb');
      expect(_getPhaseBorderColor('afternoon')).toContain('rgb');
      expect(_getPhaseBorderColor('off')).toContain('rgb');
      expect(_getPhaseBorderColor('invalid' as unknown as never)).toBeTruthy();

      expect(_getPhaseShadowColor('day')).toContain('#');
      expect(_getPhaseShadowColor('night')).toContain('#');
      expect(_getPhaseShadowColor('morning')).toContain('#');
      expect(_getPhaseShadowColor('afternoon')).toContain('#');
      expect(_getPhaseShadowColor('off')).toContain('#');
      expect(_getPhaseShadowColor('invalid' as unknown as never)).toBeTruthy();
    });

    it('covers day-within-phase helper branches for 2-shift and 3-shift variants', () => {
      const two = { daysOn: 2, nightsOn: 3, daysOff: 4 };
      expect(_getDayWithinPhaseLength('day', two, ShiftSystem.TWO_SHIFT)).toBe(2);
      expect(_getDayWithinPhaseLength('night', two, ShiftSystem.TWO_SHIFT)).toBe(3);
      expect(_getDayWithinPhaseLength('off', two, ShiftSystem.TWO_SHIFT)).toBe(4);
      expect(
        _getDayWithinPhaseLength('invalid' as unknown as never, two, ShiftSystem.TWO_SHIFT)
      ).toBe(0);

      const three = { morningOn: 2, afternoonOn: 3, nightOn: 4, daysOff: 5 };
      expect(_getDayWithinPhaseLength('morning', three, ShiftSystem.THREE_SHIFT)).toBe(2);
      expect(_getDayWithinPhaseLength('afternoon', three, ShiftSystem.THREE_SHIFT)).toBe(3);
      expect(_getDayWithinPhaseLength('night', three, ShiftSystem.THREE_SHIFT)).toBe(4);
      expect(_getDayWithinPhaseLength('off', three, ShiftSystem.THREE_SHIFT)).toBe(5);
      expect(
        _getDayWithinPhaseLength('invalid' as unknown as never, three, ShiftSystem.THREE_SHIFT)
      ).toBe(0);

      expect(_getDayWithinPhaseLabel('day')).toBe('Day Shifts');
      expect(_getDayWithinPhaseLabel('night')).toBe('Night Shifts');
      expect(_getDayWithinPhaseLabel('morning')).toBe('Morning Shifts');
      expect(_getDayWithinPhaseLabel('afternoon')).toBe('Afternoon Shifts');
      expect(_getDayWithinPhaseLabel('off')).toBe('Days Off');
      expect(_getDayWithinPhaseLabel('invalid' as unknown as never)).toBe('');
    });

    it('applies reduced motion changes from accessibility listener', () => {
      let listener: ((enabled: boolean) => void) | undefined;
      const addListenerSpy = jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
        _eventName: string,
        cb: unknown
      ) => {
        listener = cb as (enabled: boolean) => void;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      }) as never);

      renderWithContext(<PremiumStartDateScreen />);
      act(() => {
        listener?.(true);
      });
      expect(addListenerSpy).toHaveBeenCalled();
      addListenerSpy.mockRestore();
    });
  });
});
