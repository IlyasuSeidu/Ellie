/**
 * ShiftCalendarDayCell Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftCalendarDayCell } from '../ShiftCalendarDayCell';
import { RosterType } from '@/types';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
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
  };
});

describe('ShiftCalendarDayCell', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render day number', () => {
      const { getByText } = render(<ShiftCalendarDayCell day={15} />);
      expect(getByText('15')).toBeTruthy();
    });

    it('should render shift type icon badge for day shift', () => {
      const { UNSAFE_getAllByType } = render(<ShiftCalendarDayCell day={1} shiftType="day" />);
      // Day shift uses 3D PNG image instead of Ionicons
      const { Image } = require('react-native');
      expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
    });

    it('should render shift type icon badge for night shift', () => {
      const { UNSAFE_getAllByType } = render(<ShiftCalendarDayCell day={1} shiftType="night" />);
      // Night shift uses 3D PNG image instead of Ionicons
      const { Image } = require('react-native');
      expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
    });

    it('should render shift type icon badge for off day', () => {
      const { UNSAFE_getByType } = render(<ShiftCalendarDayCell day={1} shiftType="off" />);
      // Off day uses 3D PNG image instead of Ionicons
      const { Image } = require('react-native');
      expect(UNSAFE_getByType(Image)).toBeTruthy();
    });

    it('should render shift type icon badge for morning shift', () => {
      const { UNSAFE_getAllByType } = render(<ShiftCalendarDayCell day={1} shiftType="morning" />);
      // Morning shift uses 3D PNG image instead of Ionicons
      const { Image } = require('react-native');
      expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
    });

    it('should render shift type icon badge for afternoon shift', () => {
      const { UNSAFE_getAllByType } = render(
        <ShiftCalendarDayCell day={1} shiftType="afternoon" />
      );
      // Afternoon shift uses 3D PNG image instead of Ionicons
      const { Image } = require('react-native');
      expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0);
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<ShiftCalendarDayCell day={1} testID="test-cell" />);
      expect(getByTestId('test-cell')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when tapped', () => {
      const { getByText } = render(<ShiftCalendarDayCell day={15} onPress={mockOnPress} />);
      fireEvent.press(getByText('15'));
      expect(mockOnPress).toHaveBeenCalledWith(15);
    });

    it('should not call onPress when isOtherMonth', () => {
      const { getByText } = render(
        <ShiftCalendarDayCell day={15} onPress={mockOnPress} isOtherMonth />
      );
      fireEvent.press(getByText('15'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onLongPress callback when provided', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <ShiftCalendarDayCell day={15} onLongPress={onLongPress} testID="long-press-cell" />
      );
      fireEvent(getByTestId('long-press-cell'), 'onLongPress');
      const Haptics = require('expo-haptics');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(onLongPress).toHaveBeenCalledWith(15);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility label for day shift', () => {
      const { getByLabelText } = render(<ShiftCalendarDayCell day={5} shiftType="day" />);
      expect(getByLabelText('Day 5, day shift')).toBeTruthy();
    });

    it('should include Today in label when isToday', () => {
      const { getByLabelText } = render(<ShiftCalendarDayCell day={5} isToday />);
      expect(getByLabelText('Day 5, Today')).toBeTruthy();
    });

    it('should use block-based label for FIFO mode', () => {
      const { getByLabelText } = render(
        <ShiftCalendarDayCell day={5} shiftType="day" rosterType={RosterType.FIFO} />
      );
      expect(getByLabelText('Day 5, work block')).toBeTruthy();
    });
  });

  describe('FIFO indicators', () => {
    it('renders fly-in and fly-out markers from fifoPosition metadata', () => {
      const flyIn = render(
        <ShiftCalendarDayCell
          day={2}
          shiftType="day"
          rosterType={RosterType.FIFO}
          fifoPosition={{
            blockType: 'work',
            dayInBlock: 1,
            blockLength: 14,
            isFirstDayOfBlock: true,
            isLastDayOfBlock: false,
            isFirstInRow: false,
            isLastInRow: false,
            shiftType: 'day',
            isSwingTransitionDay: false,
            isFlyInDay: true,
            isFlyOutDay: false,
          }}
        />
      );
      expect(flyIn.getByTestId('fifo-fly-in-2')).toBeTruthy();

      const flyOut = render(
        <ShiftCalendarDayCell
          day={14}
          shiftType="day"
          rosterType={RosterType.FIFO}
          fifoPosition={{
            blockType: 'work',
            dayInBlock: 14,
            blockLength: 14,
            isFirstDayOfBlock: false,
            isLastDayOfBlock: true,
            isFirstInRow: false,
            isLastInRow: false,
            shiftType: 'day',
            isSwingTransitionDay: false,
            isFlyInDay: false,
            isFlyOutDay: true,
          }}
        />
      );
      expect(flyOut.getByTestId('fifo-fly-out-14')).toBeTruthy();
    });

    it('renders swing transition gradient marker when flagged', () => {
      const { getByTestId } = render(
        <ShiftCalendarDayCell
          day={5}
          shiftType="night"
          rosterType={RosterType.FIFO}
          fifoPosition={{
            blockType: 'work',
            dayInBlock: 5,
            blockLength: 14,
            isFirstDayOfBlock: false,
            isLastDayOfBlock: false,
            isFirstInRow: false,
            isLastInRow: false,
            shiftType: 'night',
            isSwingTransitionDay: true,
            isFlyInDay: false,
            isFlyOutDay: false,
          }}
        />
      );

      expect(getByTestId('fifo-swing-transition-5')).toBeTruthy();
    });
  });
});
