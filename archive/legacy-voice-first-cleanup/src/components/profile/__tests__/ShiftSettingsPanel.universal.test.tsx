import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ShiftSettingsPanel } from '../ShiftSettingsPanel';
import type { OnboardingData } from '@/contexts/OnboardingContext';

const mockNavigate = jest.fn();
const mockOpenPaywall = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, color }: { name: string; color?: string }) =>
      React.createElement(Text, null, color ? `${name}:${color}` : name),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/config/env', () => ({
  __esModule: true,
  default: {
    features: {
      universalShiftBuilderEnabled: true,
    },
  },
}));

jest.mock('@/hooks/useShiftAccent', () => ({
  useShiftAccent: () => ({ tabAccentColor: '#2563eb' }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: true,
    isLoading: false,
    openPaywall: mockOpenPaywall,
  }),
}));

const schedule: NonNullable<OnboardingData['universalSchedule']> = {
  version: 3,
  name: 'Universal Test Schedule',
  timezone: 'UTC',
  anchorDate: '2026-05-21',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day-def',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '06:00',
      endTime: '18:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#2563eb',
      icon: 'sunny',
    },
    {
      id: 'night-def',
      name: 'Night Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '18:00',
      endTime: '06:00',
      crossesMidnight: true,
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#7c3aed',
      icon: 'moon',
    },
  ],
  sequence: [
    { id: 'seq-1', shiftDefinitionId: 'day-def' },
    { id: 'seq-2', shiftDefinitionId: 'night-def' },
    { id: 'seq-3', shiftDefinitionId: 'night-def' },
  ],
};

describe('ShiftSettingsPanel universal builder navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Universal Shift Builder from settings with the current schedule', () => {
    const data: OnboardingData = {
      name: 'Amina',
      universalSchedule: schedule,
    };

    const { getByLabelText, getByText } = render(
      <ShiftSettingsPanel data={data} onUpdate={jest.fn()} />
    );

    expect(getByText('Names, colors, icons, AI drafting, and manual drag-and-drop')).toBeTruthy();

    fireEvent.press(getByLabelText('Edit Universal Schedule'));

    expect(mockOpenPaywall).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('UniversalShiftBuilder', {
      mode: 'edit',
      entryPoint: 'settings',
      existingSchedule: schedule,
    });
  });

  it('shows configured shift colors and icons in settings', () => {
    const data: OnboardingData = {
      name: 'Amina',
      universalSchedule: schedule,
    };

    const { getByText } = render(<ShiftSettingsPanel data={data} onUpdate={jest.fn()} />);

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText('Night Shift')).toBeTruthy();
    expect(getByText('sunny:#2563eb')).toBeTruthy();
    expect(getByText('moon:#7c3aed')).toBeTruthy();
    expect(getByText('6:00 AM - 6:00 PM')).toBeTruthy();
    expect(getByText('6:00 PM - 6:00 AM +1')).toBeTruthy();
    expect(getByText('x1')).toBeTruthy();
    expect(getByText('x2')).toBeTruthy();
  });

  it('opens the Universal Shift Builder from settings in create mode when no schedule exists', () => {
    const data: OnboardingData = {
      name: 'Amina',
    };

    const { getByLabelText, getByText } = render(
      <ShiftSettingsPanel data={data} onUpdate={jest.fn()} />
    );

    expect(getByText('Names, colors, icons, AI drafting, and manual drag-and-drop')).toBeTruthy();

    fireEvent.press(getByLabelText('Build Universal Schedule'));

    expect(mockOpenPaywall).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('UniversalShiftBuilder', {
      mode: 'create',
      entryPoint: 'settings',
      existingSchedule: undefined,
    });
  });
});
