import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumFIFOCustomPatternScreen } from '../PremiumFIFOCustomPatternScreen';
import { goToNextScreen } from '@/utils/onboardingNavigation';

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

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => ({
      onBegin: jest.fn(function onBegin() {
        return this;
      }),
      onUpdate: jest.fn(function onUpdate() {
        return this;
      }),
      onEnd: jest.fn(function onEnd() {
        return this;
      }),
    }),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GestureDetector: ({ children }: any) => children,
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
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
    withSequence: (...vals: number[]) => vals[0] ?? 0,
    withDelay: (_d: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
    Easing: { inOut: () => ({}), ease: {} },
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props, props.children),
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
      <PremiumFIFOCustomPatternScreen />
    </OnboardingProvider>
  );
}

describe('PremiumFIFOCustomPatternScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders parity shell with FIFO-specific controls', () => {
    const { getByText, getByTestId } = renderWithContext();
    expect(getByText('Build Your FIFO Rotation')).toBeTruthy();
    expect(getByText('Work Block, Rest Block & Pattern Split')).toBeTruthy();
    expect(getByText(/See your FIFO pattern below/)).toBeTruthy();
    expect(getByText('Work Pattern During Work Block')).toBeTruthy();
    expect(getByTestId('fifo-custom-pattern-progress-header')).toBeTruthy();
    expect(getByTestId('fifo-custom-save-button')).toBeTruthy();
    expect(getByTestId('fifo-custom-back-button')).toBeTruthy();
  });

  it('renders and switches work pattern cards', () => {
    const { getByTestId } = renderWithContext();
    const straightDays = getByTestId('work-pattern-straight-days');
    const straightNights = getByTestId('work-pattern-straight-nights');
    const swing = getByTestId('work-pattern-swing');

    expect(straightDays).toBeTruthy();
    expect(straightNights).toBeTruthy();
    expect(swing).toBeTruthy();

    fireEvent.press(straightNights);
    fireEvent.press(swing);
  });

  it('keeps swing config hidden for non-swing and visible for swing', async () => {
    const { queryByTestId, getByText } = renderWithContext();
    expect(queryByTestId('swing-config-section')).toBeNull();

    fireEvent.press(getByText('Swing Roster'));

    await waitFor(() => {
      expect(queryByTestId('swing-config-section')).toBeTruthy();
      expect(getByText('Days on Day Shift')).toBeTruthy();
      expect(getByText('Days on Night Shift')).toBeTruthy();
    });
  });

  it('keeps swing sliders synchronized with work block total', async () => {
    const { getByText, getByLabelText } = renderWithContext();

    fireEvent.press(getByText('Swing Roster'));
    await waitFor(() => {
      expect(getByText('Split total: 14/14 days')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Increase Days at Site (Work Block)'));

    await waitFor(() => {
      expect(getByText('Split total: 14/15 days')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Increase Days on Day Shift'));

    await waitFor(() => {
      expect(getByText('Split total: 15/15 days')).toBeTruthy();
    });
  });

  it('persists fifoConfig with work pattern and swing details on save', async () => {
    const { getByText, getByLabelText, getByTestId } = renderWithContext();

    fireEvent.press(getByText('Swing Roster'));
    fireEvent.press(getByLabelText('Increase Days at Site (Work Block)'));
    fireEvent.press(getByLabelText('Increase Days on Day Shift'));
    fireEvent.press(getByTestId('fifo-custom-save-button'));

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledWith(
        expect.anything(),
        'FIFOCustomPattern',
        expect.objectContaining({
          rosterType: 'fifo',
          fifoConfig: expect.objectContaining({
            workBlockDays: 15,
            restBlockDays: 14,
            workBlockPattern: 'swing',
            swingPattern: expect.objectContaining({
              daysOnDayShift: 8,
              daysOnNightShift: 7,
            }),
          }),
        })
      );
    });
  });

  it('persists updated days at site and days at home values', async () => {
    const { getByLabelText, getByTestId } = renderWithContext();

    fireEvent.press(getByLabelText('Increase Days at Site (Work Block)'));
    fireEvent.press(getByLabelText('Increase Days at Home (Rest Block)'));
    fireEvent.press(getByTestId('fifo-custom-save-button'));

    await waitFor(() => {
      expect(goToNextScreen).toHaveBeenCalledWith(
        expect.anything(),
        'FIFOCustomPattern',
        expect.objectContaining({
          rosterType: 'fifo',
          fifoConfig: expect.objectContaining({
            workBlockDays: 15,
            restBlockDays: 15,
            workBlockPattern: 'straight-days',
          }),
        })
      );
    });
  });

  it('uses back action from bottom navigation', () => {
    const { getByTestId } = renderWithContext();
    fireEvent.press(getByTestId('fifo-custom-back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithContext();
    expect(toJSON()).toMatchSnapshot();
  });
});
