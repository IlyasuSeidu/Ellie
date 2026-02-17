/**
 * UpcomingShiftsCard Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { UpcomingShiftsCard } from '../UpcomingShiftsCard';
import type { UpcomingShift } from '@/types/dashboard';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
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
    FadeInRight: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeIn: { delay: () => ({ duration: () => undefined }) },
  };
});

const sampleShifts: UpcomingShift[] = [
  {
    date: '2026-02-18',
    shiftType: 'day',
    isWorkDay: true,
    displayDate: 'Wed, Feb 18',
    timeDisplay: '7:00 AM - 7:00 PM',
  },
  {
    date: '2026-02-19',
    shiftType: 'night',
    isWorkDay: true,
    displayDate: 'Thu, Feb 19',
    timeDisplay: '7:00 PM - 7:00 AM',
  },
  {
    date: '2026-02-20',
    shiftType: 'off',
    isWorkDay: false,
    displayDate: 'Fri, Feb 20',
  },
];

describe('UpcomingShiftsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header', () => {
      const { getByText } = render(<UpcomingShiftsCard shifts={sampleShifts} />);
      expect(getByText('Upcoming Shifts')).toBeTruthy();
    });

    it('should render all shift entries', () => {
      const { getByText } = render(<UpcomingShiftsCard shifts={sampleShifts} />);
      expect(getByText('Wed, Feb 18')).toBeTruthy();
      expect(getByText('Thu, Feb 19')).toBeTruthy();
      expect(getByText('Fri, Feb 20')).toBeTruthy();
    });

    it('should render shift type labels', () => {
      const { getByText } = render(<UpcomingShiftsCard shifts={sampleShifts} />);
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Day Off')).toBeTruthy();
    });

    it('should render time display for work days', () => {
      const { getByText } = render(<UpcomingShiftsCard shifts={sampleShifts} />);
      expect(getByText('7:00 AM - 7:00 PM')).toBeTruthy();
      expect(getByText('7:00 PM - 7:00 AM')).toBeTruthy();
    });

    it('should return null when no shifts', () => {
      const { toJSON } = render(<UpcomingShiftsCard shifts={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <UpcomingShiftsCard shifts={sampleShifts} testID="test-upcoming" />
      );
      expect(getByTestId('test-upcoming')).toBeTruthy();
    });
  });
});
