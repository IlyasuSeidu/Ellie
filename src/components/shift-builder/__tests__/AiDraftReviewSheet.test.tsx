import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AiDraftReviewSheet } from '../AiDraftReviewSheet';
import type { ShiftScheduleParserResult } from '@/services/ShiftScheduleParserService';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

const result: ShiftScheduleParserResult = {
  status: 'draft',
  summary: 'I found a 4-day repeating pattern.',
  assumptions: ['Starts today'],
  questions: [],
  warnings: [],
  confidence: 0.86,
  scheduleDraft: {
    version: 3,
    name: 'AI Draft',
    timezone: 'UTC',
    anchorDate: '2026-05-21',
    phaseOffset: 0,
    source: 'ai',
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
  },
};

describe('AiDraftReviewSheet', () => {
  it('requires explicit acceptance before applying the AI draft', () => {
    const onAccept = jest.fn();
    const { getByLabelText } = render(
      <AiDraftReviewSheet
        visible
        result={result}
        onAccept={onAccept}
        onEditManually={jest.fn()}
        onDiscard={jest.fn()}
        onFollowUp={jest.fn()}
        isFollowUpLoading={false}
      />
    );

    fireEvent.press(getByLabelText('Use this AI draft'));

    expect(onAccept).toHaveBeenCalledWith(result.scheduleDraft);
  });

  it('lets the user continue the AI conversation before accepting', () => {
    const onFollowUp = jest.fn();
    const { getByLabelText } = render(
      <AiDraftReviewSheet
        visible
        result={result}
        onAccept={jest.fn()}
        onEditManually={jest.fn()}
        onDiscard={jest.fn()}
        onFollowUp={onFollowUp}
        isFollowUpLoading={false}
      />
    );

    fireEvent.changeText(getByLabelText('Follow-up question for AI'), 'Make it nights instead');
    fireEvent.press(getByLabelText('Send follow-up'));

    expect(onFollowUp).toHaveBeenCalledWith('Make it nights instead');
  });
});
