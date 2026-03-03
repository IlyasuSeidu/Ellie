import React from 'react';
import { render } from '@testing-library/react-native';
import { ScheduleScreen } from '../ScheduleScreen';
import { StatsScreen } from '../StatsScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

describe('Main placeholder screens', () => {
  it('renders ScheduleScreen content', () => {
    const { getByText } = render(<ScheduleScreen />);
    expect(getByText('Schedule')).toBeTruthy();
    expect(getByText('Coming Soon')).toBeTruthy();
  });

  it('renders StatsScreen content', () => {
    const { getByText } = render(<StatsScreen />);
    expect(getByText('Statistics')).toBeTruthy();
    expect(getByText('Coming Soon')).toBeTruthy();
  });
});
