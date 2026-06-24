/**
 * PremiumReminderSetupScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PremiumReminderSetupScreen } from '../PremiumReminderSetupScreen';
import type { UniversalShiftSchedule } from '@/types';
import { notificationService } from '@/services/NotificationService';

const mockNavigate = jest.fn();
const mockUpdateDataAsync = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    alarm: 1,
    time: 2,
    moon: 3,
    'notifications-off': 4,
    notifications: 5,
    'arrow-forward-circle': 6,
  };
  const MockIcon = (props: { name?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    updateDataAsync: mockUpdateDataAsync,
  }),
}));

jest.mock('@/services/NotificationService', () => ({
  notificationService: {
    requestPermissions: jest.fn(),
  },
}));

jest.useFakeTimers();

const scheduleDraft: UniversalShiftSchedule = {
  version: 3,
  name: 'Shift schedule',
  timezone: 'UTC',
  anchorDate: '2026-06-18',
  phaseOffset: 0,
  source: 'ai',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
    },
    {
      id: 'off',
      name: 'Off',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: false,
      color: '#20f4dc',
      icon: 'home',
    },
  ],
  sequence: [
    { id: '1', shiftDefinitionId: 'day' },
    { id: '2', shiftDefinitionId: 'off' },
  ],
};

describe('PremiumReminderSetupScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (notificationService.requestPermissions as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('requests notification permission before continuing with reminders', async () => {
    const { getByTestId } = render(
      <PremiumReminderSetupScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="reminder-setup"
      />
    );

    fireEvent.press(getByTestId('reminder-setup-continue-button'));

    await waitFor(() => {
      expect(notificationService.requestPermissions).toHaveBeenCalledTimes(1);
      expect(mockOnContinue).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftDefinitions: expect.arrayContaining([
            expect.objectContaining({
              id: 'day',
              reminderProfileId: 'day-reminder',
              reminderProfile: expect.objectContaining({
                earlyReminderHours: 1,
              }),
            }),
            expect.objectContaining({
              id: 'off',
              reminderProfileId: undefined,
              reminderProfile: undefined,
            }),
          ]),
        }),
        'one_hour'
      );
    });
  });

  it('does not continue when notification permission is denied', async () => {
    (notificationService.requestPermissions as jest.Mock).mockResolvedValue(false);

    const { getByTestId, getByText } = render(
      <PremiumReminderSetupScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="reminder-setup"
      />
    );

    fireEvent.press(getByTestId('reminder-setup-continue-button'));

    await waitFor(() => {
      expect(notificationService.requestPermissions).toHaveBeenCalledTimes(1);
      expect(mockOnContinue).not.toHaveBeenCalled();
      expect(
        getByText(
          'Turn on notifications to use reminders. Choose No reminders if you want to skip this.'
        )
      ).toBeTruthy();
    });
  });

  it('does not request notification permission when no reminders are selected', async () => {
    const { getByTestId } = render(
      <PremiumReminderSetupScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="reminder-setup"
      />
    );

    fireEvent.press(getByTestId('reminder-setup-none-button'));
    fireEvent.press(getByTestId('reminder-setup-continue-button'));

    await waitFor(() => {
      expect(notificationService.requestPermissions).not.toHaveBeenCalled();
      expect(mockOnContinue).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftDefinitions: expect.arrayContaining([
            expect.objectContaining({
              id: 'day',
              reminderProfileId: undefined,
              reminderProfile: undefined,
            }),
          ]),
        }),
        'none'
      );
    });
  });
});
