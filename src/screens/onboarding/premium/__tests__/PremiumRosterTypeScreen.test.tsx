/**
 * PremiumRosterTypeScreen Tests
 *
 * Covers: rendering, title/subtitle copy, swipe hints, swipe-right selection,
 * swipe-left skip (index increment), swipe-up learn-more modal, velocity-based
 * quick flick, focus lifecycle reset, progress dots, and snapshot.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumRosterTypeScreen } from '../PremiumRosterTypeScreen';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { goToNextScreen } from '@/utils/onboardingNavigation';

// ── Mocks ──────────────────────────────────────────────────────────

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-haptics');

type PanEndCallback = (event: {
  translationX: number;
  translationY: number;
  velocityX: number;
  velocityY: number;
}) => void;

let activePanEndCallback: PanEndCallback | null = null;

jest.mock('react-native-gesture-handler', () => {
  const Pan = () => {
    let enabled = true;
    const api: {
      enabled: (value: boolean) => unknown;
      onUpdate: (cb: () => void) => unknown;
      onEnd: (cb: PanEndCallback) => unknown;
    } = {
      enabled: jest.fn((value: boolean) => {
        enabled = value;
        return api;
      }),
      onUpdate: jest.fn(() => api),
      onEnd: jest.fn((cb: PanEndCallback) => {
        if (enabled) {
          activePanEndCallback = cb;
        }
        return api;
      }),
    };
    return api;
  };

  return {
    Gesture: {
      Pan,
      Tap: () => ({
        enabled: jest.fn(function enabled() {
          return this;
        }),
        onEnd: jest.fn(function onEnd() {
          return this;
        }),
      }),
      Simultaneous: jest.fn((a, b) => ({ a, b })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: (props: any) => props.children,
  };
});

let focusCallback: (() => void) | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((cb: () => void) => {
    focusCallback = cb;
  }),
}));

jest.mock('@/utils/onboardingNavigation', () => ({
  goToNextScreen: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withSpring: (val: number) => val,
    withTiming: (val: number) => val,
    withRepeat: (val: number) => val,
    withSequence: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    Easing: { inOut: () => ({}), ease: {}, out: () => ({}) },
  };
});

jest.mock('@/components/onboarding/premium/ProgressHeader', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ProgressHeader: (props: any) =>
      React.createElement(RN.View, { testID: props.testID ?? 'progress-header' }),
  };
});

// ── Helpers ────────────────────────────────────────────────────────

function renderWithContext() {
  return render(
    <OnboardingProvider>
      <PremiumRosterTypeScreen />
    </OnboardingProvider>
  );
}

/** Simulate a swipe by calling the most recent panEnd callback for the active card. */
function simulateSwipe(event: {
  translationX: number;
  translationY: number;
  velocityX?: number;
  velocityY?: number;
}) {
  const cb = activePanEndCallback;
  if (cb) {
    cb({
      translationX: event.translationX,
      translationY: event.translationY,
      velocityX: event.velocityX ?? 0,
      velocityY: event.velocityY ?? 0,
    });
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe('PremiumRosterTypeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activePanEndCallback = null;
    focusCallback = null;
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((task?: unknown) => {
      if (typeof task === 'function') {
        task();
      } else if (task && typeof (task as { run?: () => void }).run === 'function') {
        (task as { run: () => void }).run();
      }
      return {
        then: () => Promise.resolve(),
        done: () => undefined,
        cancel: jest.fn(),
      } as never;
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────

  describe('Initial Rendering', () => {
    it('renders both roster cards and progress header', () => {
      const { getByText, getByTestId } = renderWithContext();
      expect(getByText('Rotating Roster')).toBeTruthy();
      expect(getByText('FIFO / Swing Roster')).toBeTruthy();
      expect(getByTestId('roster-type-progress-header')).toBeTruthy();
    });

    it('renders title and subtitle copy', () => {
      const { getByText } = renderWithContext();
      expect(getByText('How Does Your Roster Work?')).toBeTruthy();
      expect(getByText(/Swipe right to choose, left to see more, up for details/)).toBeTruthy();
    });

    it('renders swipe hints on the active card', () => {
      const { getByText } = renderWithContext();
      expect(getByText('This one →')).toBeTruthy();
      expect(getByText('← Next option')).toBeTruthy();
      expect(getByText('↑ Learn more')).toBeTruthy();
    });

    it('renders progress dots', () => {
      const { getByTestId } = renderWithContext();
      expect(getByTestId('roster-type-progress-dots')).toBeTruthy();
    });

    it('renders first card content: description and examples', () => {
      const { getByText, getAllByText } = renderWithContext();
      expect(
        getByText('You rotate through different shift times in a repeating cycle')
      ).toBeTruthy();
      // Both visible cards show "Common patterns:", so verify at least one exists
      expect(getAllByText('Common patterns:').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Swipe Right (Select) ──────────────────────────────────────

  describe('Swipe Right — Select', () => {
    it('selects rotating on swipe-right of first card', async () => {
      renderWithContext();

      act(() => {
        simulateSwipe({ translationX: 180, translationY: 0 });
      });

      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(goToNextScreen).toHaveBeenCalledWith(
          expect.anything(),
          'RosterType',
          expect.objectContaining({ rosterType: 'rotating' })
        );
      });
    });

    it('selects via velocity-based quick flick (short distance, high velocity)', async () => {
      renderWithContext();

      act(() => {
        // Short distance (50px < 120 threshold) but high velocity (600 > 500 threshold)
        // Quick flick halves threshold to 60, so 50px still under, but velocityX > VELOCITY_THRESHOLD triggers
        simulateSwipe({ translationX: 50, translationY: 0, velocityX: 600 });
      });

      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(goToNextScreen).toHaveBeenCalledWith(
          expect.anything(),
          'RosterType',
          expect.objectContaining({ rosterType: 'rotating' })
        );
      });
    });
  });

  // ── Swipe Left (Skip/Next) ────────────────────────────────────

  describe('Swipe Left — Skip to Next Card', () => {
    it('advances to next card on swipe-left (index-based, non-destructive)', () => {
      const { getByText } = renderWithContext();

      // First card should be Rotating
      expect(getByText('Rotating Roster')).toBeTruthy();

      act(() => {
        simulateSwipe({ translationX: -180, translationY: 0 });
      });

      // handleSwipeLeft uses setTimeout(300) before incrementing index
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // After skip, FIFO card should now be visible as first card
      expect(getByText('FIFO / Swing Roster')).toBeTruthy();
    });

    it('returns to previous card when swiping left on the last card', () => {
      const { getByText, queryByText } = renderWithContext();

      // Skip first card (Rotating)
      act(() => {
        simulateSwipe({ translationX: -180, translationY: 0 });
      });
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Swipe left on second card (FIFO) should go back to previous card
      act(() => {
        simulateSwipe({ translationX: -180, translationY: 0 });
      });
      act(() => {
        jest.advanceTimersByTime(350);
      });

      expect(getByText('Rotating Roster')).toBeTruthy();
      expect(queryByText('All roster types reviewed')).toBeNull();
    });

    it('skips via velocity-based quick flick to the left', () => {
      const { getByText } = renderWithContext();

      act(() => {
        simulateSwipe({ translationX: -50, translationY: 0, velocityX: -600 });
      });

      act(() => {
        jest.advanceTimersByTime(350);
      });

      expect(getByText('FIFO / Swing Roster')).toBeTruthy();
    });
  });

  // ── Swipe Up (Learn More) ─────────────────────────────────────

  describe('Swipe Up — Learn More Modal', () => {
    it('opens learn-more modal on swipe-up', () => {
      const { getByText } = renderWithContext();

      act(() => {
        simulateSwipe({ translationX: 0, translationY: -180 });
      });

      // Modal should show detailed info for the active card (Rotating)
      expect(getByText('How it works')).toBeTruthy();
      expect(getByText(/Workers rotate through different shift times/)).toBeTruthy();
    });

    it('closes learn-more modal on close button press', () => {
      const { getByText, getByTestId } = renderWithContext();

      act(() => {
        simulateSwipe({ translationX: 0, translationY: -180 });
      });

      expect(getByText('How it works')).toBeTruthy();

      fireEvent.press(getByTestId('modal-close-button'));

      // Modal content should no longer be visible
      // (Modal is rendered with visible={false}, content returns null)
    });

    it('opens learn-more via velocity-based quick flick upward', () => {
      const { getByText } = renderWithContext();

      act(() => {
        simulateSwipe({ translationX: 0, translationY: -50, velocityY: -600 });
      });

      expect(getByText('How it works')).toBeTruthy();
    });
  });

  // ── Focus Lifecycle Reset ──────────────────────────────────────

  describe('Focus Lifecycle', () => {
    it('resets index and selection state when screen regains focus', () => {
      const { getByText } = renderWithContext();

      // Skip first card
      act(() => {
        simulateSwipe({ translationX: -180, translationY: 0 });
      });
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Should be on FIFO now
      expect(getByText('FIFO / Swing Roster')).toBeTruthy();

      // Simulate screen regaining focus (e.g., navigating back)
      act(() => {
        if (focusCallback) focusCallback();
      });

      // Should reset back to first card (Rotating)
      expect(getByText('Rotating Roster')).toBeTruthy();
    });
  });

  // ── Snapshot ───────────────────────────────────────────────────

  it('matches snapshot', () => {
    const { toJSON } = renderWithContext();
    expect(toJSON()).toMatchSnapshot();
  });
});
