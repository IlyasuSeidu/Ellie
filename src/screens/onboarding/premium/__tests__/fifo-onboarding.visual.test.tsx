import React from 'react';
import { render } from '@testing-library/react-native';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { PremiumRosterTypeScreen } from '../PremiumRosterTypeScreen';
import { PremiumFIFOCustomPatternScreen } from '../PremiumFIFOCustomPatternScreen';
import { PremiumFIFOPhaseSelectorScreen } from '../PremiumFIFOPhaseSelectorScreen';

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
    LinearGradient: (props: any) => React.createElement(RN.View, props),
  };
});

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pan: () => ({
      enabled: jest.fn(function enabled() {
        return this;
      }),
      onBegin: jest.fn(function onBegin() {
        return this;
      }),
      onUpdate: jest.fn(function onUpdate() {
        return this;
      }),
      onEnd: jest.fn(function onEnd() {
        return this;
      }),
      activeOffsetX: jest.fn(function activeOffsetX() {
        return this;
      }),
      failOffsetY: jest.fn(function failOffsetY() {
        return this;
      }),
    }),
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
  GestureDetector: ({ children }: any) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: undefined,
  }),
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
    withSequence: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    Easing: {
      inOut: () => ({}),
      out: () => ({}),
      ease: {},
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

function withProvider(node: React.ReactElement) {
  return <OnboardingProvider>{node}</OnboardingProvider>;
}

describe('fifo onboarding visual snapshots', () => {
  it('PremiumRosterTypeScreen snapshot', () => {
    const { toJSON } = render(withProvider(<PremiumRosterTypeScreen />));
    expect(toJSON()).toMatchSnapshot();
  });

  it('PremiumFIFOCustomPatternScreen snapshot', () => {
    const { toJSON } = render(withProvider(<PremiumFIFOCustomPatternScreen />));
    expect(toJSON()).toMatchSnapshot();
  });

  it('PremiumFIFOPhaseSelectorScreen snapshot', () => {
    const { toJSON } = render(withProvider(<PremiumFIFOPhaseSelectorScreen />));
    expect(toJSON()).toMatchSnapshot();
  });
});
