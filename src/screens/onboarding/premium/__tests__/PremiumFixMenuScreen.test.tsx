/**
 * PremiumFixMenuScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PremiumFixMenuScreen } from '../PremiumFixMenuScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    build: 1,
    'chatbubble-ellipses': 2,
    'calendar-clear': 3,
    'swap-horizontal': 4,
    time: 5,
    'chevron-forward': 6,
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
  ],
  sequence: [{ id: '1', shiftDefinitionId: 'day' }],
};

describe('PremiumFixMenuScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the grandma-friendly fix choices', () => {
    const { getByText } = render(
      <PremiumFixMenuScreen scheduleDraft={scheduleDraft} testID="fix-menu" />
    );

    expect(getByText('What do you want to fix?')).toBeTruthy();
    expect(getByText('The pattern is wrong')).toBeTruthy();
    expect(getByText('The shift times are wrong')).toBeTruthy();
    expect(getByText('The known date is wrong')).toBeTruthy();
    expect(getByText('The shift on that date is wrong')).toBeTruthy();
  });

  it('should call the test handler with the selected choice', () => {
    const mockOnChoose = jest.fn();
    const { getByTestId } = render(
      <PremiumFixMenuScreen
        scheduleDraft={scheduleDraft}
        onChoose={mockOnChoose}
        testID="fix-menu"
      />
    );

    fireEvent.press(getByTestId('fix-menu-shift-button'));

    expect(mockOnChoose).toHaveBeenCalledWith('shift', scheduleDraft);
  });

  it('should restart pattern chat when the pattern is wrong', () => {
    const { getByTestId } = render(
      <PremiumFixMenuScreen scheduleDraft={scheduleDraft} testID="fix-menu" />
    );

    fireEvent.press(getByTestId('fix-menu-pattern-button'));

    expect(mockNavigate).toHaveBeenCalledWith('GuidedShiftChatSetup');
  });

  it('should return to known date when the known date is wrong', () => {
    const { getByTestId } = render(
      <PremiumFixMenuScreen scheduleDraft={scheduleDraft} testID="fix-menu" />
    );

    fireEvent.press(getByTestId('fix-menu-date-button'));

    expect(mockNavigate).toHaveBeenCalledWith('KnownShiftDateSetup', { scheduleDraft });
  });

  it('should return to shift times when the shift times are wrong', () => {
    const { getByTestId } = render(
      <PremiumFixMenuScreen scheduleDraft={scheduleDraft} testID="fix-menu" />
    );

    fireEvent.press(getByTestId('fix-menu-times-button'));

    expect(mockNavigate).toHaveBeenCalledWith('ShiftTimesSetup', {
      scheduleDraft,
      returnTo: 'SchedulePreviewSetup',
    });
  });

  it('should return to known shift when the shift is wrong', () => {
    const { getByTestId } = render(
      <PremiumFixMenuScreen scheduleDraft={scheduleDraft} testID="fix-menu" />
    );

    fireEvent.press(getByTestId('fix-menu-shift-button'));

    expect(mockNavigate).toHaveBeenCalledWith('KnownShiftTypeSetup', { scheduleDraft });
  });
});
