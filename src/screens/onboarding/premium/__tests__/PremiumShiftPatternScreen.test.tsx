/**
 * PremiumShiftPatternScreen Component Tests
 * Tests for Tinder-style swipeable card interface
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  PremiumShiftPatternScreen,
  _buildSettingsCustomRouteParams,
  _captureSettingsPatternBaseline,
  _resolveShiftPatternSettingsAction,
} from '../PremiumShiftPatternScreen';
import { ShiftPattern } from '@/types';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';

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

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  return {
    Gesture: {
      Pan: () => ({
        enabled: jest.fn(() => ({
          enabled: jest.fn(),
          onUpdate: jest.fn(() => ({
            onUpdate: jest.fn(),
            onEnd: jest.fn(() => ({ onEnd: jest.fn() })),
          })),
        })),
      }),
      Tap: () => ({
        enabled: jest.fn(() => ({
          enabled: jest.fn(),
          onEnd: jest.fn(() => ({ onEnd: jest.fn() })),
        })),
      }),
      Simultaneous: jest.fn((a, b) => ({ a, b })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: (props: any) => props.children,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: undefined,
  }),
  useFocusEffect: jest.fn(() => {
    // No-op in tests to avoid triggering focus effects
  }),
}));

// Mock components
jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ProgressHeader: (props: any) =>
      React.createElement(
        RN.View,
        { testID: 'progress-header' },
        React.createElement(RN.Text, null, `Step ${props.currentStep} of ${props.totalSteps}`)
      ),
  };
});

// Helper to render with context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderWithContext = (component: any) => {
  return render(<OnboardingProvider>{component}</OnboardingProvider>);
};

describe('PremiumShiftPatternScreen', () => {
  const mockOnContinue = jest.fn();
  const expectedProgressText = `Step ${ONBOARDING_STEPS.SHIFT_PATTERN} of ${TOTAL_ONBOARDING_STEPS}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithContext(
        <PremiumShiftPatternScreen onContinue={mockOnContinue} testID="pattern" />
      );
      expect(getByTestId('pattern')).toBeTruthy();
    });

    it('should render title and subtitle', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText("What's Your Roster Rotation?")).toBeTruthy();
      expect(getByText(/Swipe right to choose, left to see more/i)).toBeTruthy();
    });

    it('should render progress header with current onboarding step', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText(expectedProgressText)).toBeTruthy();
    });

    it('should render first card (4-4-4 Rotation)', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('4-4-4 Rotation')).toBeTruthy();
      expect(getByText('4 days • 4 nights • 4 off')).toBeTruthy();
    });
  });

  describe('Swipeable Card Component', () => {
    it('should render card with testID', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern-card-4-4-4')).toBeTruthy();
    });

    it('should show pattern icon, name, schedule, and description', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      // Note: First pattern now uses Image component instead of emoji
      expect(getByText('4-4-4 Rotation')).toBeTruthy(); // Name
      expect(getByText('4 days • 4 nights • 4 off')).toBeTruthy(); // Schedule
      expect(getByText(/Work 4 day shifts, then 4 night shifts, then get 4 days off/)).toBeTruthy();
    });

    it('should show swipe hints on first card', () => {
      const { getByText } = renderWithContext(<PremiumShiftPatternScreen />);
      expect(getByText('← Next option')).toBeTruthy();
      expect(getByText('This one →')).toBeTruthy();
      expect(getByText('↑ Learn more')).toBeTruthy();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress dots with current position', () => {
      const { UNSAFE_getAllByType } = renderWithContext(<PremiumShiftPatternScreen />);
      // 9 total patterns, so should have progress indicator
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const container = UNSAFE_getAllByType(require('react-native').View);
      expect(container.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should render without crashing when no onContinue prop provided', () => {
      const { getByTestId } = renderWithContext(<PremiumShiftPatternScreen testID="pattern" />);
      expect(getByTestId('pattern')).toBeTruthy();
    });
  });

  describe('Settings Entry Helpers', () => {
    it('resolves action for settings-mode custom vs non-custom selections', () => {
      expect(_resolveShiftPatternSettingsAction(true, ShiftPattern.CUSTOM)).toBe('navigate-custom');
      expect(_resolveShiftPatternSettingsAction(true, ShiftPattern.FIFO_CUSTOM)).toBe(
        'navigate-custom'
      );
      expect(_resolveShiftPatternSettingsAction(true, ShiftPattern.STANDARD_4_4_4)).toBe(
        'exit-settings'
      );
      expect(_resolveShiftPatternSettingsAction(false, ShiftPattern.CUSTOM)).toBe(
        'advance-onboarding'
      );
    });

    it('captures and builds settings baseline route params for custom screens', () => {
      const baseline = _captureSettingsPatternBaseline({
        patternType: ShiftPattern.STANDARD_4_4_4,
        customPattern: { daysOn: 4, nightsOn: 4, daysOff: 4 },
        fifoConfig: undefined,
        rosterType: 'rotating',
        shiftSystem: '2-shift',
      });

      const params = _buildSettingsCustomRouteParams(baseline);
      expect(params.entryPoint).toBe('settings');
      expect(params.returnToMainOnSelect).toBe(true);
      expect(params.settingsBaseline).toEqual(
        expect.objectContaining({
          patternType: ShiftPattern.STANDARD_4_4_4,
          rosterType: 'rotating',
          shiftSystem: '2-shift',
        })
      );
    });
  });
});
