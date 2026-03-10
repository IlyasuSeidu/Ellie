/**
 * CurrentShiftStatusCard Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { CurrentShiftStatusCard } from '../CurrentShiftStatusCard';
import { RosterType } from '@/types';

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
    Easing: { inOut: () => ({}), ease: {}, out: () => ({}), cubic: {} },
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
      const { getAllByText, getByText } = render(<CurrentShiftStatusCard shiftType="off" />);
      expect(getAllByText('DAY OFF').length).toBeGreaterThan(0);
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

    it('should show countdown when provided', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard shiftType="day" countdown="6h 32m until next shift" />
      );
      expect(getByText('6h 32m until next shift')).toBeTruthy();
    });

    it('should show ACTIVE badge with pulse and calendar icon when on shift', () => {
      const { getByText, getByTestId } = render(
        <CurrentShiftStatusCard shiftType="day" isOnShift={true} />
      );
      expect(getByText('ACTIVE')).toBeTruthy();
      expect(getByTestId('shift-status-badge')).toBeTruthy();
      expect(getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
    });

    it('should show ACTIVE badge for night shifts when on shift', () => {
      const { getByText, queryByText, getByTestId } = render(
        <CurrentShiftStatusCard shiftType="night" isOnShift={true} />
      );
      expect(getByText('ACTIVE')).toBeTruthy();
      expect(queryByText('LIVE')).toBeNull();
      expect(getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
    });

    it('should show ACTIVE badge for morning and afternoon shifts when on shift', () => {
      const morning = render(<CurrentShiftStatusCard shiftType="morning" isOnShift={true} />);
      expect(morning.getByText('ACTIVE')).toBeTruthy();
      expect(morning.queryByText('LIVE')).toBeNull();
      expect(morning.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(morning.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');

      const afternoon = render(<CurrentShiftStatusCard shiftType="afternoon" isOnShift={true} />);
      expect(afternoon.getByText('ACTIVE')).toBeTruthy();
      expect(afternoon.queryByText('LIVE')).toBeNull();
      expect(afternoon.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(afternoon.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
    });

    it('should not show ACTIVE badge when off shift', () => {
      const { queryByText } = render(<CurrentShiftStatusCard shiftType="off" isOnShift={false} />);
      expect(queryByText('ACTIVE')).toBeNull();
    });

    it('should show OFF badge when not on shift', () => {
      const { getAllByText } = render(<CurrentShiftStatusCard shiftType="off" isOnShift={false} />);
      expect(getAllByText('DAY OFF').length).toBeGreaterThan(0);
    });

    it('should show ACTIVE badge for rotating work shifts even when not currently on shift', () => {
      const { getByText, queryByText, getByTestId } = render(
        <CurrentShiftStatusCard shiftType="morning" isOnShift={false} />
      );
      expect(getByText('ACTIVE')).toBeTruthy();
      expect(queryByText('OFF')).toBeNull();
      expect(getByTestId('shift-status-badge')).toBeTruthy();
      expect(getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
    });

    it('should show green pulse on ACTIVE badge for all rotating work shifts on and off shift', () => {
      const day = render(<CurrentShiftStatusCard shiftType="day" isOnShift={false} />);
      expect(day.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(day.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(day.getByText('calendar')).toBeTruthy();
      expect(day.getByText('ACTIVE')).toBeTruthy();

      const night = render(<CurrentShiftStatusCard shiftType="night" isOnShift={false} />);
      expect(night.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(night.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(night.getByText('ACTIVE')).toBeTruthy();

      const morning = render(<CurrentShiftStatusCard shiftType="morning" isOnShift={false} />);
      expect(morning.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(morning.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(morning.getByText('ACTIVE')).toBeTruthy();

      const afternoon = render(<CurrentShiftStatusCard shiftType="afternoon" isOnShift={false} />);
      expect(afternoon.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(afternoon.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(afternoon.getByText('ACTIVE')).toBeTruthy();

      const liveDay = render(<CurrentShiftStatusCard shiftType="day" isOnShift={true} />);
      expect(liveDay.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(liveDay.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(liveDay.getByText('ACTIVE')).toBeTruthy();

      const liveMorning = render(<CurrentShiftStatusCard shiftType="morning" isOnShift={true} />);
      expect(liveMorning.getByTestId('active-badge-pulse-dot')).toBeTruthy();
      expect(liveMorning.getByTestId('shift-status-badge-icon').props.name).toBe('calendar');
      expect(liveMorning.getByText('ACTIVE')).toBeTruthy();
    });

    it('should not show the green active pulse for off or FIFO badges', () => {
      const off = render(<CurrentShiftStatusCard shiftType="off" isOnShift={false} />);
      expect(off.queryByTestId('active-badge-pulse-dot')).toBeNull();

      const fifoHome = render(
        <CurrentShiftStatusCard shiftType="off" rosterType={RosterType.FIFO} isOnShift={false} />
      );
      expect(fifoHome.queryByTestId('active-badge-pulse-dot')).toBeNull();

      const fifoWork = render(
        <CurrentShiftStatusCard
          shiftType="day"
          rosterType={RosterType.FIFO}
          isOnShift={false}
          fifoBlockInfo={{
            inWorkBlock: true,
            dayInBlock: 2,
            blockLength: 8,
            daysUntilBlockChange: 6,
          }}
        />
      );
      expect(fifoWork.queryByTestId('active-badge-pulse-dot')).toBeNull();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<CurrentShiftStatusCard shiftType="day" testID="test-card" />);
      expect(getByTestId('test-card')).toBeTruthy();
    });

    it('should render FIFO work block subtitle when fifoBlockInfo is provided', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard
          shiftType="day"
          rosterType={RosterType.FIFO}
          fifoBlockInfo={{
            inWorkBlock: true,
            dayInBlock: 3,
            blockLength: 8,
            daysUntilBlockChange: 5,
          }}
        />
      );
      expect(getByText('WORK BLOCK')).toBeTruthy();
      expect(getByText('Work Block Day 3 of 8')).toBeTruthy();
      expect(getByText('38%')).toBeTruthy();
    });

    it('should show REST badge text when FIFO is resting', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard shiftType="off" rosterType={RosterType.FIFO} isOnShift={false} />
      );
      expect(getByText('REST')).toBeTruthy();
    });

    it('should show WORK badge when FIFO work block but between shifts', () => {
      const { getByText } = render(
        <CurrentShiftStatusCard
          shiftType="day"
          rosterType={RosterType.FIFO}
          isOnShift={false}
          fifoBlockInfo={{
            inWorkBlock: true,
            dayInBlock: 4,
            blockLength: 8,
            daysUntilBlockChange: 4,
          }}
        />
      );
      expect(getByText('WORK')).toBeTruthy();
    });

    it('shows FIFO block transition warning text for tomorrow and today', () => {
      const tomorrow = render(
        <CurrentShiftStatusCard
          shiftType="day"
          rosterType={RosterType.FIFO}
          fifoBlockInfo={{
            inWorkBlock: true,
            dayInBlock: 7,
            blockLength: 8,
            daysUntilBlockChange: 1,
          }}
        />
      );
      expect(tomorrow.getByText('Block change tomorrow!')).toBeTruthy();

      const today = render(
        <CurrentShiftStatusCard
          shiftType="off"
          rosterType={RosterType.FIFO}
          fifoBlockInfo={{
            inWorkBlock: false,
            dayInBlock: 7,
            blockLength: 7,
            daysUntilBlockChange: 0,
          }}
        />
      );
      expect(today.getByText('Block change today!')).toBeTruthy();
    });
  });
});
