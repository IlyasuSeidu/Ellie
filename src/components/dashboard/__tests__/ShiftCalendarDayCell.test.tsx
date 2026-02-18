/**
 * ShiftCalendarDayCell Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftCalendarDayCell } from '../ShiftCalendarDayCell';

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
      const { getByText } = render(<ShiftCalendarDayCell day={1} shiftType="morning" />);
      expect(getByText('sunny-outline')).toBeTruthy();
    });

    it('should render shift type icon badge for afternoon shift', () => {
      const { getByText } = render(<ShiftCalendarDayCell day={1} shiftType="afternoon" />);
      expect(getByText('partly-sunny')).toBeTruthy();
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
  });
});
