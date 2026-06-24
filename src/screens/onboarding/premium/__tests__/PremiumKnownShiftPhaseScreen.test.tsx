/**
 * PremiumKnownShiftPhaseScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PremiumKnownShiftPhaseScreen } from '../PremiumKnownShiftPhaseScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    locate: 1,
    checkmark: 2,
    'arrow-forward-circle': 3,
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

describe('PremiumKnownShiftPhaseScreen', () => {
  const mockOnContinue = jest.fn();
  const mockOnUnsure = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render exact off-day options', () => {
    const { getByText } = render(
      <PremiumKnownShiftPhaseScreen
        scheduleDraft={scheduleDraft}
        selectedShift="off"
        onContinue={mockOnContinue}
        onUnsure={mockOnUnsure}
        testID="known-phase"
      />
    );

    expect(getByText('Which one was it?')).toBeTruthy();
    expect(getByText('1st day off')).toBeTruthy();
    expect(getByText('2nd day off')).toBeTruthy();
    expect(getByText('3rd day off')).toBeTruthy();
    expect(getByText('4th day off')).toBeTruthy();
  });

  it('should set the exact phase offset from the selected option', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftPhaseScreen
        scheduleDraft={scheduleDraft}
        selectedShift="off"
        onContinue={mockOnContinue}
        onUnsure={mockOnUnsure}
        testID="known-phase"
      />
    );

    fireEvent.press(getByTestId('known-phase-option-6'));
    fireEvent.press(getByTestId('known-phase-button'));

    expect(mockOnContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorDate: '2026-06-18',
        phaseOffset: 6,
      }),
      expect.objectContaining({
        occurrence: 3,
        sequenceIndex: 6,
      })
    );
  });

  it('should not continue until an exact option is selected', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftPhaseScreen
        scheduleDraft={scheduleDraft}
        selectedShift="off"
        onContinue={mockOnContinue}
        onUnsure={mockOnUnsure}
        testID="known-phase"
      />
    );

    fireEvent.press(getByTestId('known-phase-button'));

    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('should route unsure users to the repair path', () => {
    const { getByTestId } = render(
      <PremiumKnownShiftPhaseScreen
        scheduleDraft={scheduleDraft}
        selectedShift="off"
        onContinue={mockOnContinue}
        onUnsure={mockOnUnsure}
        testID="known-phase"
      />
    );

    fireEvent.press(getByTestId('known-phase-unsure-button'));

    expect(mockOnUnsure).toHaveBeenCalledWith(scheduleDraft);
  });
});
