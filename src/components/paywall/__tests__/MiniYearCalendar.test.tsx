import React from 'react';
import { render } from '@testing-library/react-native';
import { MiniYearCalendar } from '../MiniYearCalendar';

const mockGetShiftDaysInRange = jest.fn();
const mockBuildShiftCycle = jest.fn();

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: (...args: unknown[]) => mockBuildShiftCycle(...args),
  getShiftDaysInRange: (...args: unknown[]) => mockGetShiftDaysInRange(...args),
}));

describe('MiniYearCalendar', () => {
  const onboardingData = {
    patternType: '4-4-4',
    shiftSystem: '2-shift',
    rosterType: 'rotating',
    startDate: new Date('2026-01-01'),
    phaseOffset: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildShiftCycle.mockReturnValue({
      patternType: '4-4-4',
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      daysOn: 4,
      nightsOn: 4,
      daysOff: 4,
      startDate: '2026-01-01',
      phaseOffset: 0,
    });
    mockGetShiftDaysInRange.mockReturnValue([
      { date: '2026-01-01', shiftType: 'day' },
      { date: '2026-01-02', shiftType: 'night' },
      { date: '2026-02-01', shiftType: 'off' },
    ]);
  });

  it('renders month labels and shift dots for the year', () => {
    const { getByText } = render(<MiniYearCalendar data={onboardingData as never} />);

    expect(getByText('Jan')).toBeTruthy();
    expect(getByText('Feb')).toBeTruthy();
    expect(getByText('Dec')).toBeTruthy();
    expect(mockBuildShiftCycle).toHaveBeenCalled();
    expect(mockGetShiftDaysInRange).toHaveBeenCalled();
  });

  it('renders safely when shift cycle cannot be built', () => {
    mockBuildShiftCycle.mockReturnValue(null);
    mockGetShiftDaysInRange.mockReturnValue([]);

    const { getByText } = render(
      <MiniYearCalendar data={onboardingData as never} compact blurred />
    );

    expect(getByText('Jan')).toBeTruthy();
    expect(mockGetShiftDaysInRange).not.toHaveBeenCalled();
  });
});
