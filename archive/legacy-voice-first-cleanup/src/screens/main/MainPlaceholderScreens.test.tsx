import React from 'react';
import { render } from '@testing-library/react-native';
import { ScheduleScreen } from '../ScheduleScreen';
import { StatsScreen } from '../StatsScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

describe('Main helper screens', () => {
  it('renders ScheduleScreen content', () => {
    const { getByText } = render(<ScheduleScreen />);
    expect(getByText('Schedule')).toBeTruthy();
    expect(getByText('Available in Ryvro')).toBeTruthy();
    expect(getByText(/Use the Shift Builder/)).toBeTruthy();
  });

  it('renders StatsScreen content', () => {
    const { getByText } = render(<StatsScreen />);
    expect(getByText('Statistics')).toBeTruthy();
    expect(getByText('Available in Ryvro')).toBeTruthy();
    expect(getByText(/dashboard shows this month's work days/)).toBeTruthy();
  });
});
