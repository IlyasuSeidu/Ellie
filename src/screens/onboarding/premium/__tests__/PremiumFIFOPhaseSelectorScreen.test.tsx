import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumFIFOPhaseSelectorScreen } from '../PremiumFIFOPhaseSelectorScreen';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { asyncStorageService } from '@/services/AsyncStorageService';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
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
    withSequence: (...vals: number[]) => vals[0] ?? 0,
    withDelay: (_d: number, val: number) => val,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    runOnJS: (fn: unknown) => fn,
    Easing: { inOut: () => ({}), ease: {}, out: () => ({}), linear: {} },
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
      <PremiumFIFOPhaseSelectorScreen />
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

const swipeUp = () =>
  triggerSwipe({
    translationX: 0,
    translationY: -220,
    velocityX: 0,
    velocityY: -900,
  });

describe('PremiumFIFOPhaseSelectorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const gestureModule = require('react-native-gesture-handler');
    gestureModule.__resetGestures();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders stage 1 parity title/subtitle and progress header', () => {
    const { getByText, getByTestId } = renderWithContext();
    expect(getByText('Where are you in your FIFO cycle?')).toBeTruthy();
    expect(getByText('Swipe right to select, left to see next, or up for more info')).toBeTruthy();
    expect(getByText('At Site (Working)')).toBeTruthy();
    expect(getByText('At Home (Rest)')).toBeTruthy();
    expect(getByTestId('fifo-phase-selector-progress-header')).toBeTruthy();
  });

  it('right swipe selects current block and moves to stage 2', async () => {
    const { getByText } = renderWithContext();
    swipeRight();

    await waitFor(() => {
      expect(getByText('Which day of At Site (Working) are you on?')).toBeTruthy();
      expect(getByText('Day 1')).toBeTruthy();
    });
  });

  it('left swipe skips to next block, then right swipe selects it', async () => {
    const { getByText } = renderWithContext();
    swipeLeft();
    swipeRight();

    await waitFor(() => {
      expect(getByText('Which day of At Home (Rest) are you on?')).toBeTruthy();
    });
  });

  it('left swipe loops at end in stage 1 (two skips returns to first block)', async () => {
    const { getByText } = renderWithContext();
    swipeLeft();
    swipeLeft();
    swipeRight();

    await waitFor(() => {
      expect(getByText('Which day of At Site (Working) are you on?')).toBeTruthy();
    });
  });

  it('up swipe opens info modal and close returns to flow', async () => {
    const { getByText, queryByText } = renderWithContext();
    swipeUp();

    await waitFor(() => {
      expect(getByText('Block Length')).toBeTruthy();
    });

    fireEvent.press(getByText('close'));
    await waitFor(() => {
      expect(queryByText('Block Length')).toBeNull();
      expect(getByText('Where are you in your FIFO cycle?')).toBeTruthy();
    });
  });

  it('computes phaseOffset for rest block day 3', async () => {
    renderWithContext();
    swipeLeft();
    swipeRight(); // select rest block
    swipeLeft(); // day 2
    swipeLeft(); // day 3
    swipeRight(); // select day 3

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledWith(expect.anything(), 'FIFOPhaseSelector');
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 16 }));
    });
  });

  it('computes phaseOffset for work block day 3', async () => {
    renderWithContext();
    swipeRight(); // select work block
    swipeLeft(); // day 2
    swipeLeft(); // day 3
    swipeRight(); // select day 3

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledWith(expect.anything(), 'FIFOPhaseSelector');
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 2 }));
    });
  });

  it('keeps one-shot navigation when right-swipe fires repeatedly on day cards', async () => {
    renderWithContext();
    swipeRight(); // stage 1: select work block

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledTimes(0);
    });

    swipeRight(); // day 1 select
    swipeRight(); // duplicate
    swipeRight(); // duplicate

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledTimes(1);
      expect(goToNextScreen).toHaveBeenCalledWith(expect.anything(), 'FIFOPhaseSelector');
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 0 }));
    });
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithContext();
    expect(toJSON()).toMatchSnapshot();
  });
});
