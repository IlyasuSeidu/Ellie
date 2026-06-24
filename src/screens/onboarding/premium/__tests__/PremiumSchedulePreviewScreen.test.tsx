/**
 * PremiumSchedulePreviewScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PremiumSchedulePreviewScreen } from '../PremiumSchedulePreviewScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();
const mockUpdateDataAsync = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    sunny: 1,
    moon: 2,
    home: 3,
    'calendar-clear': 4,
    'checkmark-circle': 5,
    'create-outline': 6,
    repeat: 7,
    list: 8,
    locate: 9,
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

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    updateDataAsync: mockUpdateDataAsync,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.useFakeTimers();
jest.setSystemTime(new Date('2026-06-18T12:00:00Z'));

const scheduleDraft: UniversalShiftSchedule = {
  version: 3,
  name: 'AI shift schedule',
  timezone: 'UTC',
  anchorDate: '2026-06-18',
  phaseOffset: 2,
  source: 'ai',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '06:00',
      endTime: '18:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
    },
    {
      id: 'night',
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
      color: '#20f4dc',
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
      countsForStats: false,
      color: '#f4b842',
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

describe('PremiumSchedulePreviewScreen', () => {
  const mockOnConfirm = jest.fn();
  const mockOnFix = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockUpdateDataAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render the schedule preview with the plain English schedule summary', () => {
    const { getAllByText, getByTestId, getByText } = render(
      <PremiumSchedulePreviewScreen
        scheduleDraft={scheduleDraft}
        onConfirm={mockOnConfirm}
        onFix={mockOnFix}
        testID="schedule-preview"
      />
    );

    expect(getByTestId('schedule-preview')).toBeTruthy();
    expect(getByText('Here is what Ryvro understood.')).toBeTruthy();
    expect(getByText('Your shift setup')).toBeTruthy();
    expect(getByText('8 days')).toBeTruthy();
    expect(getByText('2 day shifts, 2 night shifts, then 4 days off')).toBeTruthy();
    expect(getByText('On Thursday, June 18, 2026, you were on Night.')).toBeTruthy();
    expect(getByText('Next few days')).toBeTruthy();
    expect(getByText('Today')).toBeTruthy();
    expect(getAllByText('Night').length).toBeGreaterThan(0);
    expect(getAllByText('Off').length).toBeGreaterThan(0);
    expect(getByTestId('schedule-preview-day-4')).toBeTruthy();
  });

  it('should confirm the schedule when Looks right is pressed', async () => {
    const { getByTestId } = render(
      <PremiumSchedulePreviewScreen
        scheduleDraft={scheduleDraft}
        onConfirm={mockOnConfirm}
        onFix={mockOnFix}
        testID="schedule-preview"
      />
    );

    fireEvent.press(getByTestId('schedule-preview-confirm-button'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          anchorDate: '2026-06-18',
          phaseOffset: 2,
          sequence: scheduleDraft.sequence,
        })
      );
    });
  });

  it('should continue to setup summary when no test handler is provided', async () => {
    const { getByTestId } = render(
      <PremiumSchedulePreviewScreen scheduleDraft={scheduleDraft} testID="schedule-preview" />
    );

    fireEvent.press(getByTestId('schedule-preview-confirm-button'));

    await waitFor(() => {
      expect(mockUpdateDataAsync).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('SetupSummary', {
        scheduleDraft: expect.objectContaining({
          anchorDate: '2026-06-18',
          phaseOffset: 2,
        }),
      });
    });
  });

  it('should open the fix path with the same draft schedule', () => {
    const { getByTestId } = render(
      <PremiumSchedulePreviewScreen
        scheduleDraft={scheduleDraft}
        onConfirm={mockOnConfirm}
        onFix={mockOnFix}
        testID="schedule-preview"
      />
    );

    fireEvent.press(getByTestId('schedule-preview-fix-button'));

    expect(mockOnFix).toHaveBeenCalledWith(scheduleDraft);
  });

  it('should open the fix menu when no test handler is provided', () => {
    const { getByTestId } = render(
      <PremiumSchedulePreviewScreen scheduleDraft={scheduleDraft} testID="schedule-preview" />
    );

    fireEvent.press(getByTestId('schedule-preview-fix-button'));

    expect(mockNavigate).toHaveBeenCalledWith('FixMenuSetup', {
      scheduleDraft,
    });
  });
});
