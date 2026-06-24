/**
 * PremiumGuidedShiftChatScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PremiumGuidedShiftChatScreen } from '../PremiumGuidedShiftChatScreen';
import { parseShiftScheduleDescription } from '@/services/ShiftScheduleParserService';
import type { UniversalShiftSchedule } from '@/types';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    mic: 1,
    sparkles: 2,
    'arrow-forward-circle': 3,
    checkmark: 4,
    'alert-circle': 5,
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
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/services/ShiftScheduleParserService', () => ({
  parseShiftScheduleDescription: jest.fn(),
  ShiftScheduleParserError: class ShiftScheduleParserError extends Error {
    code = 'TEST';
    retryable = false;
  },
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
      color: '#7C4DFF',
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
      color: '#57534e',
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

describe('PremiumGuidedShiftChatScreen', () => {
  const mockOnContinue = jest.fn();
  const mockParse = parseShiftScheduleDescription as jest.MockedFunction<
    typeof parseShiftScheduleDescription
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockParse.mockResolvedValue({
      status: 'draft',
      scheduleDraft,
      summary: 'Draft created',
      assumptions: [],
      questions: [],
      warnings: [],
      confidence: 0.9,
      parserSource: 'local_fallback',
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render the guided chat screen', () => {
    const { getByTestId, getByText } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    expect(getByTestId('guided-chat')).toBeTruthy();
    expect(getByText('Tell Ryvro your pattern.')).toBeTruthy();
    expect(getByText('Example: 2 days, 2 nights, then 4 off.')).toBeTruthy();
    expect(getByText('Your pattern')).toBeTruthy();
  });

  it('should fill the example pattern', () => {
    const { getByTestId } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    fireEvent.press(getByTestId('guided-chat-example-button'));

    expect(getByTestId('guided-chat-input').props.value).toBe(
      'I work 2 days, 2 nights, then 4 off'
    );
  });

  it('should parse the typed pattern and show exact order review', async () => {
    const { getByTestId, getByText, getAllByText } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    fireEvent.changeText(getByTestId('guided-chat-input'), 'I work 2 days, 2 nights, then 4 off');
    fireEvent.press(getByTestId('guided-chat-submit-button'));

    await waitFor(() => {
      expect(mockParse).toHaveBeenCalled();
      expect(getByTestId('guided-chat-review-panel')).toBeTruthy();
    });
    expect(getByText('Did Ryvro get this right?')).toBeTruthy();
    expect(getByText('Exact order')).toBeTruthy();
    expect(getAllByText('Day')).toHaveLength(2);
    expect(getAllByText('Night')).toHaveLength(2);
    expect(getAllByText('Off')).toHaveLength(4);
  });

  it('should continue only after a draft is confirmed', async () => {
    const { getByTestId } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    fireEvent.changeText(getByTestId('guided-chat-input'), 'I work 2 days, 2 nights, then 4 off');
    fireEvent.press(getByTestId('guided-chat-submit-button'));

    await waitFor(() => {
      expect(getByTestId('guided-chat-confirm-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('guided-chat-confirm-button'));

    expect(mockOnContinue).toHaveBeenCalledWith(scheduleDraft);
  });

  it('should let the user change the draft instead of confirming', async () => {
    const { getByTestId, queryByTestId } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    fireEvent.changeText(getByTestId('guided-chat-input'), 'I work 2 days, 2 nights, then 4 off');
    fireEvent.press(getByTestId('guided-chat-submit-button'));

    await waitFor(() => {
      expect(getByTestId('guided-chat-review-panel')).toBeTruthy();
    });

    fireEvent.press(getByTestId('guided-chat-change-button'));

    expect(queryByTestId('guided-chat-review-panel')).toBeNull();
    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('should show an error when no draft is returned', async () => {
    mockParse.mockResolvedValueOnce({
      status: 'needs_clarification',
      summary: 'Need more detail',
      assumptions: [],
      questions: ['How many days off do you get?'],
      warnings: [],
      confidence: 0.2,
      parserSource: 'local_fallback',
    });

    const { getByTestId, getByText } = render(
      <PremiumGuidedShiftChatScreen onContinue={mockOnContinue} testID="guided-chat" />
    );

    fireEvent.changeText(getByTestId('guided-chat-input'), 'I work some shifts');
    fireEvent.press(getByTestId('guided-chat-submit-button'));

    await waitFor(() => {
      expect(getByText('How many days off do you get?')).toBeTruthy();
    });
  });
});
