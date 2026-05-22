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
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
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
  ],
  sequence: [{ id: 'seq-1', shiftDefinitionId: 'day-def' }],
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

    const { getByLabelText } = render(<ShiftSettingsPanel data={data} onUpdate={jest.fn()} />);

    fireEvent.press(getByLabelText('Edit Universal Schedule'));

    expect(mockOpenPaywall).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('UniversalShiftBuilder', {
      mode: 'edit',
      entryPoint: 'settings',
      existingSchedule: schedule,
    });
  });
});
