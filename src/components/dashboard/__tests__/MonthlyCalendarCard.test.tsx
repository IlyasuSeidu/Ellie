import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MonthlyCalendarCard } from '../MonthlyCalendarCard';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) =>
    React.createElement(RN.Text, { ...props, testID: `icon-${props.name}` }, props.name || 'icon');
  return { Ionicons: MockIcon };
});

const buildCurrentWeekIndex = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.floor((firstDayOfMonth + date.getDate() - 1) / 7);
};

describe('MonthlyCalendarCard subscription gates', () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentWeekIndex = buildCurrentWeekIndex(today);

  const baseProps = {
    year,
    month,
    shiftDays: [],
    onPreviousMonth: jest.fn(),
    onNextMonth: jest.fn(),
    onDayPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('locks non-current weeks for free users and leaves the current week available', () => {
    const onLockedWeekPress = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <MonthlyCalendarCard
        {...baseProps}
        lockNonCurrentWeeks
        onLockedWeekPress={onLockedWeekPress}
      />
    );

    expect(queryByTestId(`calendar-week-${currentWeekIndex}-locked`)).toBeNull();

    const lockedWeekIndex = currentWeekIndex === 0 ? 1 : 0;
    fireEvent.press(getByTestId(`calendar-week-${lockedWeekIndex}-locked`));

    expect(onLockedWeekPress).toHaveBeenCalledTimes(1);
  });

  it('does not render week locks when the calendar is unlocked', () => {
    const { queryByTestId } = render(<MonthlyCalendarCard {...baseProps} />);

    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      expect(queryByTestId(`calendar-week-${weekIndex}-locked`)).toBeNull();
    }
  });
});
