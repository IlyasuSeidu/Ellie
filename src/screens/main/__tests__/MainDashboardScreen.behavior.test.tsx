import React from 'react';
import { ScrollView } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MainDashboardScreen } from '../MainDashboardScreen';

type HeaderMockProps = {
  testID?: string;
  name?: string;
  onAvatarChange?: (uri: string | null) => void;
};

type ShiftCardMockProps = {
  testID?: string;
};

type CalendarCardMockProps = {
  testID?: string;
  year: number;
  month: number;
  selectedDay?: number;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onDayPress: (day: number) => void;
};

const mockUpdateData = jest.fn();
const mockUseOnboarding = jest.fn();
const mockUseSubscription = jest.fn();

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('@/hooks/usePaywallRecovery', () => ({
  usePaywallRecovery: jest.fn(() => ({ shouldNudge: false, dismissNudge: jest.fn() })),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
}));

jest.mock('@/hooks/useActiveShift', () => ({
  useActiveShift: jest.fn(() => ({
    shiftType: 'day',
    accentShiftType: 'day',
    scheduledShiftType: 'day',
    isOnShift: true,
    timeDisplay: '07:00 - 19:00',
    countdown: '2h left',
    isOvernightCarryOver: false,
  })),
}));

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: jest.fn(() => ({
    rosterType: 'rotating',
    shiftSystem: '2-shift',
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2026-01-01',
    phaseOffset: 0,
  })),
  calculateShiftDay: jest.fn(() => ({
    shiftType: 'day',
    isWorkDay: true,
    isNightShift: false,
  })),
  getShiftDaysInRange: jest.fn(() => []),
  getShiftStatistics: jest.fn(() => ({
    dayShifts: 10,
    nightShifts: 10,
    morningShifts: 0,
    afternoonShifts: 0,
    daysOff: 10,
  })),
  getFIFOBlockInfo: jest.fn(() => null),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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

jest.mock('@/components/dashboard/PersonalizedHeader', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    PersonalizedHeader: (props: HeaderMockProps) =>
      React.createElement(
        RN.View,
        { testID: props.testID },
        React.createElement(RN.Text, null, props.name),
        React.createElement(
          RN.Pressable,
          { testID: 'avatar-change', onPress: () => props.onAvatarChange?.('file://avatar.png') },
          React.createElement(RN.Text, null, 'avatar-change')
        ),
        React.createElement(
          RN.Pressable,
          { testID: 'avatar-clear', onPress: () => props.onAvatarChange?.(null) },
          React.createElement(RN.Text, null, 'avatar-clear')
        )
      ),
  };
});

jest.mock('@/components/dashboard/CurrentShiftStatusCard', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    CurrentShiftStatusCard: (props: ShiftCardMockProps) =>
      React.createElement(RN.View, { testID: props.testID }),
  };
});

jest.mock('@/components/dashboard/MonthlyCalendarCard', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    MonthlyCalendarCard: (props: CalendarCardMockProps) =>
      React.createElement(
        RN.View,
        { testID: props.testID },
        React.createElement(RN.Text, { testID: 'month-label' }, `${props.year}-${props.month}`),
        React.createElement(
          RN.Text,
          { testID: 'selected-day' },
          props.selectedDay === undefined ? '' : String(props.selectedDay)
        ),
        React.createElement(
          RN.Pressable,
          { testID: 'prev-month', onPress: props.onPreviousMonth },
          React.createElement(RN.Text, null, 'prev')
        ),
        React.createElement(
          RN.Pressable,
          { testID: 'next-month', onPress: props.onNextMonth },
          React.createElement(RN.Text, null, 'next')
        ),
        React.createElement(
          RN.Pressable,
          { testID: 'day-5', onPress: () => props.onDayPress(5) },
          React.createElement(RN.Text, null, 'day5')
        )
      ),
  };
});

jest.mock('@/components/dashboard/StatisticsCard', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    StatisticsRow: (props: any) => React.createElement(RN.View, { testID: props.testID }),
  };
});

describe('MainDashboardScreen behavior coverage', () => {
  const baseData = {
    name: 'John Doe',
    occupation: 'Nurse',
    company: 'Hospital',
    country: 'US',
    shiftSystem: '2-shift',
    patternType: 'STANDARD_3_3_3',
    phaseOffset: 0,
    startDate: '2026-01-01',
    shiftTimes: {
      dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
      nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscription.mockReturnValue({
      isPro: false,
      isLoading: false,
      openPaywall: jest.fn(),
    });
    mockUseOnboarding.mockReturnValue({
      data: baseData,
      updateData: mockUpdateData,
      hydrated: true,
    });
  });

  it('renders error state when onboarding has no usable data', async () => {
    mockUseOnboarding.mockReturnValue({
      data: {},
      updateData: mockUpdateData,
      hydrated: true,
    });

    const { getByText } = render(<MainDashboardScreen />);

    await waitFor(() => {
      expect(getByText('Unable to load shift data')).toBeTruthy();
    });
  });

  it('updates onboarding context when avatar changes', async () => {
    const { getByTestId } = render(<MainDashboardScreen />);

    await waitFor(() => {
      expect(getByTestId('dashboard-header')).toBeTruthy();
    });

    fireEvent.press(getByTestId('avatar-change'));
    expect(mockUpdateData).toHaveBeenCalledWith({ avatarUri: 'file://avatar.png' });

    fireEvent.press(getByTestId('avatar-clear'));
    expect(mockUpdateData).toHaveBeenCalledWith({ avatarUri: undefined });
  });

  it('wraps previous month from January to previous December', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));

    const { getByTestId } = render(<MainDashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('month-label')).toBeTruthy();
    });

    expect(getByTestId('month-label').props.children).toBe('2026-0');
    fireEvent.press(getByTestId('prev-month'));
    expect(getByTestId('month-label').props.children).toBe('2025-11');

    jest.useRealTimers();
  });

  it('wraps next month from December to next January', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-12-15T12:00:00.000Z'));

    const { getByTestId } = render(<MainDashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('month-label')).toBeTruthy();
    });

    expect(getByTestId('month-label').props.children).toBe('2026-11');
    fireEvent.press(getByTestId('next-month'));
    expect(getByTestId('month-label').props.children).toBe('2027-0');

    jest.useRealTimers();
  });

  it('does not trigger the feature gate while subscription state is still loading', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
    mockUseSubscription.mockReturnValue({
      isPro: false,
      isLoading: true,
      openPaywall: jest.fn(),
    });

    const { getByTestId, queryByText } = render(<MainDashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('month-label')).toBeTruthy();
    });

    fireEvent.press(getByTestId('next-month'));

    expect(queryByText('Ilyasu, your roster is ready.')).toBeNull();
    expect(getByTestId('month-label').props.children).toBe('2026-1');

    jest.useRealTimers();
  });

  it('toggles selected day when pressing same day twice', async () => {
    const { getByTestId } = render(<MainDashboardScreen />);
    await waitFor(() => {
      expect(getByTestId('selected-day')).toBeTruthy();
    });

    fireEvent.press(getByTestId('day-5'));
    expect(getByTestId('selected-day').props.children).toBe('5');

    fireEvent.press(getByTestId('day-5'));
    expect(getByTestId('selected-day').props.children).toBe('');
  });

  it('shows refresh success banner and auto-dismisses after timeout', async () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { UNSAFE_getByType, queryByText } = render(<MainDashboardScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(ScrollView)).toBeTruthy();
    });

    const scrollView = UNSAFE_getByType(ScrollView);
    const onRefresh = scrollView.props.refreshControl.props.onRefresh;

    await act(async () => {
      onRefresh();
      onRefresh();
    });

    await waitFor(() => {
      expect(queryByText('Schedule updated')).toBeTruthy();
    });

    act(() => {
      jest.advanceTimersByTime(2600);
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(queryByText('Schedule updated')).toBeNull();

    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});
