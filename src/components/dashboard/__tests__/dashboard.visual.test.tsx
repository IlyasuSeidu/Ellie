import React from 'react';
import { render } from '@testing-library/react-native';
import { CurrentShiftStatusCard } from '../CurrentShiftStatusCard';
import { MonthlyCalendarCard } from '../MonthlyCalendarCard';
import { ShiftCalendarDayCell } from '../ShiftCalendarDayCell';
import { RosterType, ShiftSystem, type ShiftDay } from '@/types';

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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => React.createElement(RN.View, null, children),
    Gesture: {
      Tap: () => ({
        onBegin: function onBegin() {
          return this;
        },
        onEnd: function onEnd() {
          return this;
        },
        onFinalize: function onFinalize() {
          return this;
        },
      }),
      Pan: () => ({
        activeOffsetX: function activeOffsetX() {
          return this;
        },
        failOffsetY: function failOffsetY() {
          return this;
        },
        onEnd: function onEnd() {
          return this;
        },
      }),
    },
  };
});

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
    Easing: { inOut: () => ({}), ease: {}, out: () => ({}), cubic: {} },
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
  };
});

const shiftDays: ShiftDay[] = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const dayStr = String(day).padStart(2, '0');
  const shiftType = day % 3 === 0 ? 'off' : day % 2 === 0 ? 'night' : 'day';
  return {
    date: `2026-02-${dayStr}`,
    isWorkDay: shiftType !== 'off',
    isNightShift: shiftType === 'night',
    shiftType,
  };
});

describe('dashboard visual snapshots', () => {
  it('CurrentShiftStatusCard FIFO snapshot', () => {
    const { toJSON } = render(
      <CurrentShiftStatusCard
        shiftType="day"
        rosterType={RosterType.FIFO}
        fifoBlockInfo={{
          inWorkBlock: true,
          dayInBlock: 3,
          blockLength: 8,
          daysUntilBlockChange: 5,
        }}
        countdown="5d until rest block"
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('MonthlyCalendarCard FIFO snapshot', () => {
    const { toJSON } = render(
      <MonthlyCalendarCard
        year={2026}
        month={1}
        shiftDays={shiftDays}
        onPreviousMonth={jest.fn()}
        onNextMonth={jest.fn()}
        shiftSystem={ShiftSystem.TWO_SHIFT}
        rosterType={RosterType.FIFO}
      />
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('ShiftCalendarDayCell FIFO snapshot', () => {
    const { toJSON } = render(
      <ShiftCalendarDayCell day={12} shiftType="off" rosterType={RosterType.FIFO} isToday />
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
