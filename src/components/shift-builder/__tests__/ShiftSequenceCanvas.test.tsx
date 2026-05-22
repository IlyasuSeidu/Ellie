import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ShiftSequenceCanvas } from '../ShiftSequenceCanvas';
import type { UniversalShiftDefinition, UniversalShiftSequenceItem } from '@/types';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

const definitions: UniversalShiftDefinition[] = [
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
  {
    id: 'off-def',
    name: 'Off Day',
    kind: 'off',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
    color: '#78716c',
    icon: 'home',
  },
];

const sequence: UniversalShiftSequenceItem[] = [
  { id: 'seq-1', shiftDefinitionId: 'day-def' },
  { id: 'seq-2', shiftDefinitionId: 'off-def' },
];

function renderCanvas(overrides = {}) {
  return render(
    <ShiftSequenceCanvas
      sequence={sequence}
      definitions={definitions}
      onReorder={jest.fn()}
      onMoveItem={jest.fn()}
      onDuplicate={jest.fn()}
      onInsertBefore={jest.fn()}
      onInsertAfter={jest.fn()}
      onDelete={jest.fn()}
      onItemPress={jest.fn()}
      onAddShift={jest.fn()}
      onAddRepeatedBlock={jest.fn()}
      {...overrides}
    />
  );
}

describe('ShiftSequenceCanvas', () => {
  it('supports non-drag reorder controls', () => {
    const onMoveItem = jest.fn();
    const { getByLabelText } = renderCanvas({ onMoveItem });

    fireEvent.press(getByLabelText('Move Day Shift down'));

    expect(onMoveItem).toHaveBeenCalledWith(0, 1);
  });

  it('adds a repeated block from the manual builder controls', () => {
    const onAddRepeatedBlock = jest.fn();
    const { getAllByText, getByLabelText } = renderCanvas({ onAddRepeatedBlock });

    fireEvent.press(getByLabelText('Add repeated block to sequence'));
    fireEvent.changeText(getByLabelText('Number of repetitions'), '3');
    fireEvent.press(getAllByText('Day Shift')[1]);

    expect(onAddRepeatedBlock).toHaveBeenCalledWith('day-def', 3);
  });
});
