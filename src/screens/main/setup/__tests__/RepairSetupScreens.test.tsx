import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  RepairKnownShiftTypeScreen,
  RepairSchedulePreviewScreen,
  RepairShiftTimesScreen,
} from '../RepairSetupScreens';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();
const mockUpdateDataAsync = jest.fn();

type ShiftTimesMockProps = {
  onContinue?: (schedule: UniversalShiftSchedule) => void;
  flowContext?: string;
  testID?: string;
};

type KnownShiftTypeMockProps = {
  onContinue?: (schedule: UniversalShiftSchedule, shiftType: string) => void;
  flowContext?: string;
  testID?: string;
};

type SchedulePreviewMockProps = {
  onConfirm?: (schedule: UniversalShiftSchedule) => void;
  flowContext?: string;
  testID?: string;
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    updateDataAsync: mockUpdateDataAsync,
  }),
}));

jest.mock('@/screens/onboarding/premium/PremiumShiftTimesScreen', () => ({
  PremiumShiftTimesScreen: ({ onContinue, flowContext, testID }: ShiftTimesMockProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onContinue?.(mockSchedule)}
        accessibilityLabel={flowContext}
      >
        <Text>Repair shift times</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/screens/onboarding/premium/PremiumKnownShiftTypeScreen', () => ({
  PremiumKnownShiftTypeScreen: ({ onContinue, flowContext, testID }: KnownShiftTypeMockProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onContinue?.(mockSchedule, 'day')}
        accessibilityLabel={flowContext}
      >
        <Text>Repair known shift type</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/screens/onboarding/premium/PremiumSchedulePreviewScreen', () => ({
  PremiumSchedulePreviewScreen: ({ onConfirm, flowContext, testID }: SchedulePreviewMockProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        testID={testID}
        onPress={() => onConfirm?.(mockSchedule)}
        accessibilityLabel={flowContext}
      >
        <Text>Repair schedule preview</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/screens/onboarding/premium/PremiumFixMenuScreen', () => ({
  PremiumFixMenuScreen: () => null,
}));

jest.mock('@/screens/onboarding/premium/PremiumGuidedShiftChatScreen', () => ({
  PremiumGuidedShiftChatScreen: () => null,
}));

jest.mock('@/screens/onboarding/premium/PremiumKnownShiftDateScreen', () => ({
  PremiumKnownShiftDateScreen: () => null,
}));

jest.mock('@/screens/onboarding/premium/PremiumKnownShiftPhaseScreen', () => ({
  PremiumKnownShiftPhaseScreen: () => null,
}));

jest.mock('@/screens/onboarding/premium/PremiumReminderSetupScreen', () => ({
  PremiumReminderSetupScreen: () => null,
}));

const mockSchedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Two days, two nights, four off',
  timezone: 'Africa/Accra',
  anchorDate: '2026-06-22',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      durationMinutes: 720,
      crossesMidnight: false,
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
    },
    {
      id: 'night',
      name: 'Night shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '19:00',
      endTime: '07:00',
      durationMinutes: 720,
      crossesMidnight: true,
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#147cff',
      icon: 'moon',
    },
    {
      id: 'off',
      name: 'Off',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#5f7484',
      icon: 'home',
    },
  ],
  sequence: [
    { id: '1', shiftDefinitionId: 'day' },
    { id: '2', shiftDefinitionId: 'day' },
    { id: '3', shiftDefinitionId: 'night' },
    { id: '4', shiftDefinitionId: 'night' },
    { id: '5', shiftDefinitionId: 'off' },
    { id: '6', shiftDefinitionId: 'off' },
    { id: '7', shiftDefinitionId: 'off' },
    { id: '8', shiftDefinitionId: 'off' },
  ],
};

describe('repair setup screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps shift time fixes inside the repair flow', () => {
    const { getByTestId, getByLabelText } = render(<RepairShiftTimesScreen />);

    expect(getByLabelText('settings')).toBeTruthy();
    fireEvent.press(getByTestId('repair-shift-times-screen'));

    expect(mockNavigate).toHaveBeenCalledWith('SchedulePreviewSetup', {
      scheduleDraft: mockSchedule,
    });
  });

  it('routes ambiguous known shifts to exact phase', () => {
    const { getByTestId, getByLabelText } = render(<RepairKnownShiftTypeScreen />);

    expect(getByLabelText('settings')).toBeTruthy();
    fireEvent.press(getByTestId('repair-known-shift-type-screen'));

    expect(mockNavigate).toHaveBeenCalledWith('KnownShiftPhaseSetup', {
      scheduleDraft: mockSchedule,
      selectedShift: 'day',
    });
  });

  it('saves confirmed repair preview and returns to Settings', async () => {
    const { getByTestId, getByLabelText } = render(<RepairSchedulePreviewScreen />);

    expect(getByLabelText('settings')).toBeTruthy();
    fireEvent.press(getByTestId('repair-schedule-preview-screen'));

    await waitFor(() => {
      expect(mockUpdateDataAsync).toHaveBeenCalledWith({ universalSchedule: mockSchedule });
    });
    expect(mockNavigate).toHaveBeenCalledWith('Settings');
  });
});
