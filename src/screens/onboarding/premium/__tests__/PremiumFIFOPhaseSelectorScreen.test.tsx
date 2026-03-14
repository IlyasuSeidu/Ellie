import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumFIFOPhaseSelectorScreen } from '../PremiumFIFOPhaseSelectorScreen';
import { goToNextScreen } from '@/utils/onboardingNavigation';
import { asyncStorageService } from '@/services/AsyncStorageService';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

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

let mockRouteParams: OnboardingStackParamList['FIFOPhaseSelector'] = undefined;
const mockNavigate = jest.fn();
const mockAddListener = jest.fn();
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
      onBegin: (cb: (event: Record<string, number>) => void) => unknown;
      onUpdate: (cb: (event: Record<string, number>) => void) => unknown;
      onEnd: (cb: (event: Record<string, number>) => void) => unknown;
    } = {
      enabled: jest.fn((value: boolean) => {
        enabled = value;
        return api;
      }),
      onBegin: jest.fn(() => api),
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

jest.mock('@/components/onboarding/premium/PatternBuilderSlider', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PatternBuilderSlider: ({ label, value, onChange }: any) =>
      React.createElement(
        RN.View,
        {
          testID: `mock-slider-${String(label).replace(/\s+/g, '-').toLowerCase()}`,
          onSetValueForTest: onChange,
        },
        React.createElement(RN.Text, null, String(label)),
        React.createElement(RN.Text, null, String(value))
      ),
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

const continueFromSwingConfig = (getByTestId: (id: string) => unknown) => {
  const continueButton = getByTestId('swing-config-continue-button') as {
    props?: Record<string, unknown>;
  };
  const onPress = continueButton.props?.onPress;
  const onStartShouldSetResponder = continueButton.props?.onStartShouldSetResponder;
  const onResponderGrant = continueButton.props?.onResponderGrant;
  const onResponderRelease = continueButton.props?.onResponderRelease;
  const onClick = continueButton.props?.onClick;
  const syntheticEvent = {
    nativeEvent: {},
    currentTarget: 1,
    target: 1,
    persist: () => undefined,
    stopPropagation: () => undefined,
    preventDefault: () => undefined,
  };

  act(() => {
    if (typeof onPress === 'function') {
      onPress();
      return;
    }
    if (typeof onStartShouldSetResponder === 'function') {
      onStartShouldSetResponder(syntheticEvent);
    }
    if (typeof onResponderGrant === 'function') {
      onResponderGrant(syntheticEvent);
    }
    if (typeof onResponderRelease === 'function') {
      onResponderRelease(syntheticEvent);
      return;
    }
    if (typeof onClick === 'function') {
      onClick(syntheticEvent);
      return;
    }
    fireEvent.press(continueButton as never);
  });
};

const setSwingSliderValue = (
  getByTestId: (id: string) => unknown,
  testId: string,
  value: number
) => {
  const slider = getByTestId(testId) as {
    props?: { onSetValueForTest?: (nextValue: number) => void };
  };
  act(() => {
    slider.props?.onSetValueForTest?.(value);
  });
};

describe('PremiumFIFOPhaseSelectorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockAddListener.mockImplementation(() => jest.fn());
    mockGetParent.mockReturnValue({
      canGoBack: () => true,
      goBack: mockRootGoBack,
      reset: mockRootReset,
    });
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

  it('renders swipeable work-pattern stage first for standard FIFO', () => {
    const { getByText, getByTestId } = renderWithContext();
    expect(getByText('How are shifts run during your FIFO work block?')).toBeTruthy();
    expect(getByText(/Swipe right to choose your work-block pattern/)).toBeTruthy();
    expect(getByText(/This option means straight days only\./)).toBeTruthy();
    expect(getByText('Straight Days')).toBeTruthy();
    expect(getByText('Straight Nights')).toBeTruthy();
    expect(getByText('Swing')).toBeTruthy();
    expect(getByTestId('fifo-phase-selector-progress-header')).toBeTruthy();
  });

  it('right swipe selects current work pattern and moves to block stage', async () => {
    const { getByText } = renderWithContext();
    swipeRight();

    await waitFor(() => {
      expect(getByText('Where are you in your FIFO cycle?')).toBeTruthy();
      expect(getByText('At Site (Working)')).toBeTruthy();
    });
  });

  it('right swipe on block stage then moves to day stage', async () => {
    const { getByText } = renderWithContext();
    swipeRight(); // select straight-days pattern
    swipeRight(); // select work block

    await waitFor(() => {
      expect(getByText('Which day of At Site (Working) are you on?')).toBeTruthy();
      expect(getByText('Day 1')).toBeTruthy();
    });
  });

  it('left swipe skips to next work pattern, then right swipe selects it', async () => {
    const { getByText } = renderWithContext();
    swipeLeft();
    swipeRight(); // select straight-nights

    await waitFor(() => {
      expect(getByText('Where are you in your FIFO cycle?')).toBeTruthy();
      expect(
        getByText('You are currently at the mine site on your night-shift work block')
      ).toBeTruthy();
    });
  });

  it('opens swing configuration stage when swing pattern is selected', async () => {
    const { getByText, getByTestId } = renderWithContext();
    swipeLeft(); // straight-nights
    swipeLeft(); // swing
    swipeRight(); // select swing

    await waitFor(() => {
      expect(getByText('Configure your swing split')).toBeTruthy();
      expect(getByTestId('swing-config-stage')).toBeTruthy();
      expect(getByTestId('swing-config-continue-button')).toBeTruthy();
      expect(getByTestId('swing-config-change-pattern-button')).toBeTruthy();
      expect(getByTestId('swing-split-total-text')).toBeTruthy();
    });
  });

  it('left swipe loops at end in work-pattern stage', async () => {
    const { getByText } = renderWithContext();
    swipeLeft();
    swipeLeft();
    swipeLeft();
    swipeRight();

    await waitFor(() => {
      expect(getByText('Where are you in your FIFO cycle?')).toBeTruthy();
      expect(
        getByText('You are currently at the mine site on your day-shift work block')
      ).toBeTruthy();
    });
  });

  it('up swipe opens info modal for work-pattern cards and close returns to flow', async () => {
    const { getByText, queryByText } = renderWithContext();
    swipeUp();

    await waitFor(() => {
      expect(getByText('Why it matters')).toBeTruthy();
    });

    fireEvent.press(getByText('close'));
    await waitFor(() => {
      expect(queryByText('Why it matters')).toBeNull();
      expect(getByText('How are shifts run during your FIFO work block?')).toBeTruthy();
    });
  });

  it('computes phaseOffset for rest block day 3', async () => {
    renderWithContext();
    swipeRight(); // select straight-days
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
    swipeRight(); // select straight-days
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

  it('stages selection in settings-entry mode until save button is tapped', async () => {
    mockRouteParams = { entryPoint: 'settings', returnToMainOnSelect: true };

    const { getByTestId } = renderWithContext();
    swipeRight(); // select straight-days pattern
    swipeRight(); // select work block
    swipeRight(); // select day 1

    await waitFor(() => {
      expect(goToNextScreen).not.toHaveBeenCalled();
      expect(mockRootGoBack).not.toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('fifo-phase-selector-save-settings-button'));

    await waitFor(() => {
      expect(mockRootGoBack).toHaveBeenCalledTimes(1);
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(expect.objectContaining({ phaseOffset: 0 }));
    });
  });

  it('keeps one-shot navigation when right-swipe fires repeatedly on day cards', async () => {
    renderWithContext();
    swipeRight(); // stage 1: select straight-days pattern
    swipeRight(); // stage 2: select work block

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

  it('uses standard FIFO preset config instead of stale custom fifoConfig', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_8_6',
      fifoConfig: {
        workBlockDays: 10,
        restBlockDays: 10,
        workBlockPattern: 'straight-nights',
      },
    });

    const { getByText } = renderWithContext();

    swipeRight(); // select straight-days pattern

    await waitFor(() => {
      expect(getByText('8 days')).toBeTruthy();
      expect(getByText('6 days')).toBeTruthy();
    });

    swipeRight(); // Select work block

    await waitFor(() => {
      expect(getByText('Which day of At Site (Working) are you on?')).toBeTruthy();
    });

    swipeRight(); // Select day 1

    await waitFor(() => {
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(
        expect.objectContaining({
          phaseOffset: 0,
          fifoConfig: expect.objectContaining({
            workBlockDays: 8,
            restBlockDays: 6,
            workBlockPattern: 'straight-days',
          }),
        })
      );
    });
  });

  it('renders night semantics for FIFO custom straight-nights work block card', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_CUSTOM',
      fifoConfig: {
        workBlockDays: 14,
        restBlockDays: 14,
        workBlockPattern: 'straight-nights',
      },
    });

    const { getByText, queryByText } = renderWithContext();

    await waitFor(() => {
      expect(
        getByText('You are currently at the mine site on your night-shift work block')
      ).toBeTruthy();
      expect(
        queryByText('You are currently at the mine site on your day-shift work block')
      ).toBeNull();
    });
  });

  it('renders neutral work-block semantics for FIFO custom swing pattern', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_CUSTOM',
      fifoConfig: {
        workBlockDays: 14,
        restBlockDays: 14,
        workBlockPattern: 'swing',
        swingPattern: { daysOnDayShift: 7, daysOnNightShift: 7 },
      },
    });

    const { getByText, queryByText } = renderWithContext();

    await waitFor(() => {
      expect(getByText('You are currently at the mine site on your work block')).toBeTruthy();
      expect(
        queryByText('You are currently at the mine site on your day-shift work block')
      ).toBeNull();
      expect(
        queryByText('You are currently at the mine site on your night-shift work block')
      ).toBeNull();
    });
  });

  it('persists straight-nights for standard FIFO when selected in work-pattern stage', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_8_6',
    });

    const { getByText } = renderWithContext();
    swipeLeft(); // straight-nights
    swipeRight(); // select pattern
    await waitFor(() => {
      expect(getByText('8 days')).toBeTruthy();
      expect(getByText('6 days')).toBeTruthy();
    });
    swipeRight(); // select work block
    swipeRight(); // select day 1

    await waitFor(() => {
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(
        expect.objectContaining({
          fifoConfig: expect.objectContaining({
            workBlockDays: 8,
            restBlockDays: 6,
            workBlockPattern: 'straight-nights',
          }),
        })
      );
    });
  });

  it('persists swing with explicit 50/50 split for standard FIFO when selected in work-pattern stage', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_8_6',
    });

    const { getByText, getByTestId } = renderWithContext();
    swipeLeft(); // straight-nights
    swipeLeft(); // swing
    swipeRight(); // select pattern
    await waitFor(() => {
      expect(getByText('Configure your swing split')).toBeTruthy();
    });
    continueFromSwingConfig(getByTestId);
    await waitFor(() => {
      expect(getByText('8 days')).toBeTruthy();
      expect(getByText('6 days')).toBeTruthy();
    });
    swipeRight(); // select work block
    swipeRight(); // select day 1

    await waitFor(() => {
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(
        expect.objectContaining({
          fifoConfig: expect.objectContaining({
            workBlockDays: 8,
            restBlockDays: 6,
            workBlockPattern: 'swing',
            swingPattern: {
              daysOnDayShift: 4,
              daysOnNightShift: 4,
            },
          }),
        })
      );
    });
  });

  it('shows swing day card labels aligned to split before night cards', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_8_6',
    });

    const { getByText, getByTestId } = renderWithContext();
    swipeLeft(); // straight-nights
    swipeLeft(); // swing
    swipeRight(); // select swing
    await waitFor(() => {
      expect(getByText('Configure your swing split')).toBeTruthy();
    });
    continueFromSwingConfig(getByTestId);
    swipeRight(); // select work block

    await waitFor(() => {
      expect(getByText('Day Shift Day 1')).toBeTruthy();
    });

    swipeLeft();
    swipeLeft();
    swipeLeft();
    swipeLeft();

    await waitFor(() => {
      expect(getByText('Night Shift Day 1')).toBeTruthy();
    });
  });

  it('persists user-configured swing split and aligns day cards to that split', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValueOnce({
      rosterType: 'fifo',
      patternType: 'FIFO_8_6',
    });

    const { getByText, getByTestId } = renderWithContext();
    swipeLeft(); // straight-nights
    swipeLeft(); // swing
    swipeRight(); // select swing

    await waitFor(() => {
      expect(getByText('Configure your swing split')).toBeTruthy();
    });

    setSwingSliderValue(getByTestId, 'mock-slider-days-on-day-shift', 5);
    await waitFor(() => {
      expect(getByText('Split total: 5 + 3 = 8/8 days')).toBeTruthy();
    });

    continueFromSwingConfig(getByTestId);
    swipeRight(); // select work block
    await waitFor(() => {
      expect(getByText('Day Shift Day 1')).toBeTruthy();
    });

    swipeLeft();
    swipeLeft();
    swipeLeft();
    swipeLeft();
    swipeLeft();

    await waitFor(() => {
      expect(getByText('Night Shift Day 1')).toBeTruthy();
    });

    swipeRight(); // select first night-shift day

    await waitFor(() => {
      const setCalls = (asyncStorageService.set as jest.Mock).mock.calls;
      const latestPayload = setCalls[setCalls.length - 1]?.[1];
      expect(latestPayload).toEqual(
        expect.objectContaining({
          fifoConfig: expect.objectContaining({
            workBlockPattern: 'swing',
            swingPattern: {
              daysOnDayShift: 5,
              daysOnNightShift: 3,
            },
          }),
        })
      );
    });
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithContext();
    expect(toJSON()).toMatchSnapshot();
  });
});
