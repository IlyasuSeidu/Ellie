/**
 * MonthlyCalendarCard Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MonthlyCalendarCard } from '../MonthlyCalendarCard';
import { RosterType, ShiftPattern, ShiftSystem, type ShiftCycle, type ShiftDay } from '@/types';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => React.createElement(RN.View, null, children),
    Gesture: {
      Pan: () => ({
        activeOffsetX: function () {
          return this;
        },
        failOffsetY: function () {
          return this;
        },
        onEnd: function () {
          return this;
        },
      }),
    },
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

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
  };
});

// Sample shift days for February 2026
const createShiftDays = (): ShiftDay[] => {
  const days: ShiftDay[] = [];
  for (let i = 1; i <= 28; i++) {
    const dayStr = i.toString().padStart(2, '0');
    const cyclePos = (i - 1) % 9;
    let shiftType: 'day' | 'night' | 'off';
    if (cyclePos < 3) shiftType = 'day';
    else if (cyclePos < 6) shiftType = 'night';
    else shiftType = 'off';

    days.push({
      date: `2026-02-${dayStr}`,
      isWorkDay: shiftType !== 'off',
      isNightShift: shiftType === 'night',
      shiftType,
    });
  }
  return days;
};

const fifoShiftCycle: ShiftCycle = {
  patternType: ShiftPattern.FIFO_14_7,
  shiftSystem: ShiftSystem.TWO_SHIFT,
  rosterType: RosterType.FIFO,
  daysOn: 14,
  nightsOn: 0,
  daysOff: 7,
  startDate: '2026-02-01',
  phaseOffset: 0,
  fifoConfig: {
    workBlockDays: 14,
    restBlockDays: 7,
    workBlockPattern: 'straight-days',
  },
};

describe('MonthlyCalendarCard', () => {
  const mockPrevMonth = jest.fn();
  const mockNextMonth = jest.fn();
  const mockDayPress = jest.fn();
  const shiftDays = createShiftDays();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render month and year title', () => {
      const { getByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      expect(getByText('February 2026')).toBeTruthy();
    });

    it('should render weekday headers', () => {
      const { getAllByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      // S appears twice (Sunday, Saturday)
      expect(getAllByText('S').length).toBeGreaterThanOrEqual(2);
      expect(getAllByText('M').length).toBeGreaterThanOrEqual(1);
    });

    it('should render day cells', () => {
      const { getByTestId } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      expect(getByTestId('calendar-day-1')).toBeTruthy();
      expect(getByTestId('calendar-day-15')).toBeTruthy();
      expect(getByTestId('calendar-day-28')).toBeTruthy();
    });

    it('should render all legend items when no shiftSystem specified', () => {
      const { getByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      expect(getByText('Day')).toBeTruthy();
      expect(getByText('Morning')).toBeTruthy();
      expect(getByText('Afternoon')).toBeTruthy();
      expect(getByText('Night')).toBeTruthy();
      expect(getByText('Off')).toBeTruthy();
    });

    it('should show only 2-shift legend items for TWO_SHIFT system', () => {
      const { getByText, queryByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          shiftSystem={ShiftSystem.TWO_SHIFT}
        />
      );
      expect(getByText('Day')).toBeTruthy();
      expect(getByText('Night')).toBeTruthy();
      expect(getByText('Off')).toBeTruthy();
      expect(queryByText('Morning')).toBeNull();
      expect(queryByText('Afternoon')).toBeNull();
    });

    it('should show only 3-shift legend items for THREE_SHIFT system', () => {
      const { getByText, queryByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          shiftSystem={ShiftSystem.THREE_SHIFT}
        />
      );
      expect(getByText('Morning')).toBeTruthy();
      expect(getByText('Afternoon')).toBeTruthy();
      expect(getByText('Night')).toBeTruthy();
      expect(getByText('Off')).toBeTruthy();
      expect(queryByText('Day')).toBeNull();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          testID="test-calendar"
        />
      );
      expect(getByTestId('test-calendar')).toBeTruthy();
    });

    it('should show FIFO legend labels in FIFO mode', () => {
      const { getByText, queryByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          rosterType={RosterType.FIFO}
          shiftCycle={fifoShiftCycle}
        />
      );

      expect(getByText('Work Block')).toBeTruthy();
      expect(getByText('Rest Block')).toBeTruthy();
      expect(getByText('14/7')).toBeTruthy();
      expect(getByText('cycle')).toBeTruthy();
      expect(queryByText('Morning')).toBeNull();
    });

    it('renders FIFO ribbons after grid layout measurement', () => {
      const { getByTestId } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          rosterType={RosterType.FIFO}
          shiftCycle={fifoShiftCycle}
        />
      );

      fireEvent(getByTestId('calendar-grid-container'), 'layout', {
        nativeEvent: { layout: { width: 340, height: 320, x: 0, y: 0 } },
      });

      expect(getByTestId('fifo-ribbon-0-0')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should call onPreviousMonth when prev button pressed', () => {
      const { getByLabelText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      fireEvent.press(getByLabelText('Previous month'));
      expect(mockPrevMonth).toHaveBeenCalledTimes(1);
    });

    it('should call onNextMonth when next button pressed', () => {
      const { getByLabelText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
        />
      );
      fireEvent.press(getByLabelText('Next month'));
      expect(mockNextMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Day Selection', () => {
    it('should call onDayPress when a day is pressed', () => {
      const { getByTestId } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          onDayPress={mockDayPress}
        />
      );
      fireEvent.press(getByTestId('calendar-day-15'));
      expect(mockDayPress).toHaveBeenCalledWith(15);
    });
  });

  describe('FIFO tooltip lifecycle', () => {
    it('shows tooltip on long press and dismisses on overlay tap and timeout', () => {
      jest.useFakeTimers();
      const { getByTestId, getByText, queryByTestId, queryByText } = render(
        <MonthlyCalendarCard
          year={2026}
          month={1}
          shiftDays={shiftDays}
          onPreviousMonth={mockPrevMonth}
          onNextMonth={mockNextMonth}
          rosterType={RosterType.FIFO}
          shiftCycle={fifoShiftCycle}
        />
      );

      fireEvent(getByTestId('calendar-day-1'), 'onLongPress');
      expect(getByText(/Block Day/)).toBeTruthy();
      expect(getByTestId('fifo-tooltip-dismiss-overlay')).toBeTruthy();

      fireEvent.press(getByTestId('fifo-tooltip-dismiss-overlay'));
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(queryByTestId('fifo-tooltip-dismiss-overlay')).toBeNull();
      expect(queryByText(/Block Day/)).toBeNull();

      fireEvent(getByTestId('calendar-day-1'), 'onLongPress');
      expect(getByText(/Block Day/)).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(2500);
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(queryByText(/Block Day/)).toBeNull();

      jest.useRealTimers();
    });
  });
});
