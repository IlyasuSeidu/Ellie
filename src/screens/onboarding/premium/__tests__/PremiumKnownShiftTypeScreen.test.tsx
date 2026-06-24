/**
 * PremiumKnownShiftTypeScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PremiumKnownShiftTypeScreen } from '../PremiumKnownShiftTypeScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    sunny: 1,
    moon: 2,
    home: 3,
    'ellipsis-horizontal': 4,
    checkmark: 5,
    'calendar-clear': 6,
    'arrow-forward-circle': 7,
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

describe('PremiumKnownShiftTypeScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should navigate to exact position when the selected shift repeats', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftTypeScreen scheduleDraft={scheduleDraft} testID="known-shift" />
    );

    fireEvent.press(getByTestId('known-shift-option-off'));
    fireEvent.press(getByTestId('known-shift-button'));

    expect(mockNavigate).toHaveBeenCalledWith('KnownShiftPhaseSetup', {
      scheduleDraft,
      selectedShift: 'off',
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render the known shift question and choices', () => {
    const { getByTestId, getByText } = render(
      <PremiumKnownShiftTypeScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-shift"
      />
    );

    expect(getByTestId('known-shift')).toBeTruthy();
    expect(getByText('What shift were you on that date?')).toBeTruthy();
    expect(getByText('Day')).toBeTruthy();
    expect(getByText('Night')).toBeTruthy();
    expect(getByText('Off')).toBeTruthy();
    expect(getByText('Other')).toBeTruthy();
    expect(getByText('Thursday, June 18, 2026')).toBeTruthy();
  });

  it('should pass the unchanged draft when a selected shift appears more than once', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftTypeScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-shift"
      />
    );

    fireEvent.press(getByTestId('known-shift-option-night'));
    fireEvent.press(getByTestId('known-shift-button'));

    expect(mockOnContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorDate: '2026-06-18',
        phaseOffset: 0,
      }),
      'night'
    );
  });

  it('should not guess which off slot when the pattern has multiple off days', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftTypeScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-shift"
      />
    );

    fireEvent.press(getByTestId('known-shift-option-off'));
    fireEvent.press(getByTestId('known-shift-button'));

    expect(mockOnContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorDate: '2026-06-18',
        phaseOffset: 0,
      }),
      'off'
    );
  });

  it('should not continue until the user chooses a shift', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftTypeScreen
        scheduleDraft={scheduleDraft}
        onContinue={mockOnContinue}
        testID="known-shift"
      />
    );

    fireEvent.press(getByTestId('known-shift-button'));

    expect(mockOnContinue).not.toHaveBeenCalled();
  });
});
