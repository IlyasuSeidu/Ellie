/**
 * PremiumKnownShiftDateScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumKnownShiftDateScreen } from '../PremiumKnownShiftDateScreen';
import type { UniversalShiftSchedule } from '@/types';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    'calendar-clear': 1,
    'chevron-back': 2,
    'chevron-forward': 3,
    'arrow-forward-circle': 4,
  };
  const MockIcon = (props: { name?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.useFakeTimers();

const scheduleDraft: UniversalShiftSchedule = {
  version: 3,
  name: 'AI shift schedule',
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
      startTime: '06:00',
      endTime: '18:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#2196F3',
      icon: 'sunny',
    },
  ],
  sequence: [{ id: '1', shiftDefinitionId: 'day' }],
};

describe('PremiumKnownShiftDateScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render the known date screen', () => {
    const { getByTestId, getByText } = render(
      <PremiumKnownShiftDateScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-date"
      />
    );

    expect(getByTestId('known-date')).toBeTruthy();
    expect(getByText('Pick one date you know.')).toBeTruthy();
    expect(getByText('This date anchors your pattern')).toBeTruthy();
  });

  it('should render quick date choices and date stepper controls', () => {
    const { getByText, getByTestId } = render(
      <PremiumKnownShiftDateScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-date"
      />
    );

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Yesterday')).toBeTruthy();
    expect(getByText('2 days ago')).toBeTruthy();
    expect(getByTestId('known-date-previous-day')).toBeTruthy();
    expect(getByTestId('known-date-next-day')).toBeTruthy();
  });

  it('should update the selected date with the stepper', () => {
    const { getByText, getByTestId, queryByText } = render(
      <PremiumKnownShiftDateScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-date"
      />
    );

    expect(getByText('Thursday, June 18, 2026')).toBeTruthy();

    fireEvent.press(getByTestId('known-date-previous-day'));

    expect(queryByText('Thursday, June 18, 2026')).toBeNull();
  });

  it('should pass the selected known date into the draft schedule', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftDateScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-date"
      />
    );

    fireEvent.press(getByTestId('known-date-previous-day'));
    fireEvent.press(getByTestId('known-date-button'));

    expect(mockOnContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorDate: '2026-06-17',
      })
    );
  });
});
