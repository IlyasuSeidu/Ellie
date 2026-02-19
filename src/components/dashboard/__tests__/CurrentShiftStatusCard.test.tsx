/**
 * CurrentShiftStatusCard Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { CurrentShiftStatusCard } from '../CurrentShiftStatusCard';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => React.createElement(RN.View, null, children),
    Gesture: {
      Tap: () => ({
        onBegin: function () {
          return this;
        },
        onEnd: function () {
          return this;
        },
        onFinalize: function () {
          return this;
        },
      }),
    },
  };
});

// Mock reanimated
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
    withRepeat: (val: number) => val,
    withSequence: (val: number) => val,
    withTiming: (val: number) => val,
    withSpring: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    Easing: { inOut: () => ({}), ease: {} },
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
  };
});

describe('CurrentShiftStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render day shift card', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="day" testID="shift-card" />);
      expect(getByText('DAY SHIFT')).toBeTruthy();
      expect(getByText('Stay energized!')).toBeTruthy();
    });

    it('should render night shift card', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="night" />);
      expect(getByText('NIGHT SHIFT')).toBeTruthy();
      expect(getByText('Stay alert!')).toBeTruthy();
    });

    it('should render day off card', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="off" />);
      expect(getByText('DAY OFF')).toBeTruthy();
      expect(getByText('Rest and recharge!')).toBeTruthy();
    });

    it('should render morning shift card', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="morning" />);
      expect(getByText('MORNING SHIFT')).toBeTruthy();
      expect(getByText('Rise and shine!')).toBeTruthy();
    });

    it('should render afternoon shift card', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="afternoon" />);
      expect(getByText('AFTERNOON SHIFT')).toBeTruthy();
      expect(getByText('Keep it going!')).toBeTruthy();
    });

    it('should show time display when provided', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard shiftType="day" timeDisplay="7:00 AM - 7:00 PM" />
      );
      expect(getByText('7:00 AM - 7:00 PM')).toBeTruthy();
    });

    it('should show countdown when provided', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard shiftType="day" countdown="6h 32m until next shift" />
      );
      expect(getByText('6h 32m until next shift')).toBeTruthy();
    });

    it('should show LIVE badge when on shift', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="day" isOnShift={true} />);
      expect(getByText('LIVE')).toBeTruthy();
    });

    it('should not show LIVE badge when off shift', () => {
      const { queryByText } = render(<CurrentShiftStatusCard shiftType="off" isOnShift={false} />);
      expect(queryByText('LIVE')).toBeNull();
    });

    it('should show OFF badge when not on shift', () => {
      const { getByText } = render(<CurrentShiftStatusCard shiftType="off" isOnShift={false} />);
      expect(getByText('OFF')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<CurrentShiftStatusCard shiftType="day" testID="test-card" />);
      expect(getByTestId('test-card')).toBeTruthy();
    });
  });
});
