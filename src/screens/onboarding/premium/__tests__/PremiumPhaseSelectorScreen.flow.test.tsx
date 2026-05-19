import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Alert, InteractionManager } from 'react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumPhaseSelectorScreen } from '../PremiumPhaseSelectorScreen';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { loadPersistedOnboardingData, persistOnboardingData } from '@/utils/onboardingPersistence';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ShiftPattern } from '@/types';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/onboardingPersistence', () => ({
  loadPersistedOnboardingData: jest.fn(async () => null),
  persistOnboardingData: jest.fn(async () => undefined),
  clearPersistedOnboardingData: jest.fn(async () => undefined),
  readPersistedOnboardingCompletionStatus: jest.fn(async () => false),
}));

jest.mock('expo-haptics');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props, props.children),
  };
});

let mockRouteParams: OnboardingStackParamList['PhaseSelector'] = undefined;
const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const mockRootGoBack = jest.fn();
const mockRootReset = jest.fn();
const mockGetParent = jest.fn(() => ({
  canGoBack: () => true,
  goBack: mockRootGoBack,
  reset: mockRootReset,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    addListener: mockAddListener,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: mockRouteParams }),
  useFocusEffect: jest.fn(),
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
    withSequence: (...vals: number[]) => vals[0] ?? 0,
    withDelay: (_delay: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    Easing: { out: () => ({}), ease: {}, linear: {}, bezier: () => ({}) },
  };
});

jest.mock('react-native-gesture-handler', () => {
  let activePanEnd: ((event: Record<string, number>) => void) | null = null;
  let activeTapEnd: (() => void) | null = null;

  const Pan = () => {
    let enabled = true;
    const api: {
      enabled: (value: boolean) => unknown;
      onUpdate: (cb: (event: Record<string, number>) => void) => unknown;
      onEnd: (cb: (event: Record<string, number>) => void) => unknown;
    } = {
      enabled: jest.fn((value: boolean) => {
        enabled = value;
        return api;
      }),
      onUpdate: jest.fn(() => api),
      onEnd: jest.fn((cb: (event: Record<string, number>) => void) => {
        if (enabled) {
          activePanEnd = cb;
        }
        return api;
      }),
    };
    return api;
  };

  const Tap = () => {
    let enabled = true;
    const api: {
      enabled: (value: boolean) => unknown;
      onEnd: (cb: () => void) => unknown;
    } = {
      enabled: jest.fn((value: boolean) => {
        enabled = value;
        return api;
      }),
      onEnd: jest.fn((cb: () => void) => {
        if (enabled) {
          activeTapEnd = cb;
        }
        return api;
      }),
    };
    return api;
  };

  return {
    Gesture: {
      Pan,
      Tap,
      Simultaneous: () => ({}),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => children,
    __triggerSwipe: (event: Record<string, number>) => {
      if (activePanEnd) {
        activePanEnd(event);
      }
    },
    __triggerTap: () => {
      if (activeTapEnd) {
        activeTapEnd();
      }
    },
    __resetGestures: () => {
      activePanEnd = null;
      activeTapEnd = null;
    },
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

function renderWithContext() {
  return render(
    <OnboardingProvider>
      <PremiumPhaseSelectorScreen />
    </OnboardingProvider>
  );
}

const triggerSwipe = (event: Record<string, number>) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gestureModule = require('react-native-gesture-handler');
  act(() => {
    gestureModule.__triggerSwipe(event);
  });
};

const swipeRight = () =>
  triggerSwipe({
    translationX: 220,
    translationY: 0,
    velocityX: 900,
    velocityY: 0,
  });

const swipeLeft = () =>
  triggerSwipe({
    translationX: -220,
    translationY: 0,
    velocityX: -900,
    velocityY: 0,
  });

describe('PremiumPhaseSelectorScreen flow accuracy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
    jest.mocked(loadPersistedOnboardingData).mockResolvedValue(null);
    jest.mocked(persistOnboardingData).mockResolvedValue(undefined);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react-native-gesture-handler').__resetGestures();
  });

  it('keeps onboarding night day-2 selection deterministic under rapid left-right swipes', async () => {
    jest.mocked(loadPersistedOnboardingData).mockResolvedValue({
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
    });

    const interactionSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((...args: unknown[]) => {
        const callback = args[0] as (() => void) | undefined;
        callback?.();
        return {
          then: () => Promise.resolve(),
          done: () => undefined,
          cancel: jest.fn(),
        };
      });

    jest.useFakeTimers();
    try {
      const { getByText } = renderWithContext();

      await waitFor(() => {
        expect(getByText('Day Shift')).toBeTruthy();
      });

      // Rapid left->right should still pick "Night Shift", not stale "Day Shift".
      swipeLeft();
      swipeRight();

      await waitFor(() => {
        expect(getByText('Which day of Night Shift are you on?')).toBeTruthy();
      });

      // Move from night day 1 -> night day 2, then select.
      swipeLeft();
      swipeRight();

      act(() => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        const writes = jest.mocked(persistOnboardingData).mock.calls;
        const latestPayload = writes[writes.length - 1]?.[0];
        expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 5 }));
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('StartDate');
      });
    } finally {
      jest.useRealTimers();
      interactionSpy.mockRestore();
    }
  });

  it('normalizes legacy lowercase pattern ids so phase/day mapping remains accurate', async () => {
    jest.mocked(loadPersistedOnboardingData).mockResolvedValue({
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: 'standard_4_4_4' as unknown as ShiftPattern,
    });

    const interactionSpy = jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((...args: unknown[]) => {
        const callback = args[0] as (() => void) | undefined;
        callback?.();
        return {
          then: () => Promise.resolve(),
          done: () => undefined,
          cancel: jest.fn(),
        };
      });

    jest.useFakeTimers();
    try {
      const { getByText } = renderWithContext();

      await waitFor(() => {
        expect(getByText('Day Shift')).toBeTruthy();
      });

      swipeLeft();
      swipeRight();
      await waitFor(() => {
        expect(getByText('Which day of Night Shift are you on?')).toBeTruthy();
      });

      swipeLeft();
      swipeRight();
      act(() => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        const writes = jest.mocked(persistOnboardingData).mock.calls;
        const latestPayload = writes[writes.length - 1]?.[0];
        expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 5 }));
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });
    } finally {
      jest.useRealTimers();
      interactionSpy.mockRestore();
    }
  });

  it('keeps the user on phase selection when saving phaseOffset fails', async () => {
    jest.mocked(loadPersistedOnboardingData).mockResolvedValue({
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      patternType: ShiftPattern.STANDARD_4_4_4,
    });
    jest.mocked(persistOnboardingData).mockRejectedValueOnce(new Error('storage unavailable'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { getByText } = renderWithContext();

    await waitFor(() => {
      expect(getByText('Day Shift')).toBeTruthy();
    });

    swipeRight();

    await waitFor(() => {
      expect(getByText('Which day of Day Shift are you on?')).toBeTruthy();
    });

    swipeRight();

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
