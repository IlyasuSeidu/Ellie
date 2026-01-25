/**
 * PatternCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PatternCard, getPatternMetadata } from '../PatternCard';
import { ShiftPattern } from '@/types';

describe('PatternCard', () => {
  const mockOnSelect = jest.fn();
  const mockMetadata = {
    emoji: '⛏️',
    name: 'Test Pattern',
    description: '3 Days, 3 Nights, 3 Off',
    preview: ['day', 'night', 'off', 'day', 'night', 'off'] as Array<'day' | 'night' | 'off'>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with metadata', () => {
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('Test Pattern')).toBeTruthy();
      expect(getByText('3 Days, 3 Nights, 3 Off')).toBeTruthy();
      expect(getByText('⛏️')).toBeTruthy();
    });

    it('should render in unselected state by default', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');
      expect(card.props.accessibilityState.selected).toBe(false);
    });

    it('should render in selected state', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          selected
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');
      expect(card.props.accessibilityState.selected).toBe(true);
    });

    it('should render preview boxes for pattern', () => {
      const { getAllByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
        />
      );
      // Check for preview labels
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('N').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });

    it('should limit preview to 12 boxes', () => {
      const longPreview = Array(20).fill('day');
      const longMetadata = { ...mockMetadata, preview: longPreview };
      const { getAllByText, getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={longMetadata}
          onSelect={mockOnSelect}
        />
      );
      const dayLabels = getAllByText('D');
      expect(dayLabels.length).toBe(12);
      expect(getByText('...')).toBeTruthy();
    });

    it('should not show ellipsis for short patterns', () => {
      const shortMetadata = {
        ...mockMetadata,
        preview: ['day', 'night', 'off'] as Array<'day' | 'night' | 'off'>,
      };
      const { queryByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={shortMetadata}
          onSelect={mockOnSelect}
        />
      );
      expect(queryByText('...')).toBeNull();
    });
  });

  describe('All ShiftPattern Enum Values', () => {
    it('should render STANDARD_3_3_3 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_3_3_3);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('3-3-3 Standard')).toBeTruthy();
      expect(getByText('3 Days, 3 Nights, 3 Off')).toBeTruthy();
    });

    it('should render STANDARD_4_4_4 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_4_4_4);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_4_4_4}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('4-4-4 FIFO')).toBeTruthy();
      expect(getByText('4 Days, 4 Nights, 4 Off')).toBeTruthy();
    });

    it('should render STANDARD_5_5_5 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_5_5_5);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_5_5_5}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('5-5-5 Standard')).toBeTruthy();
      expect(getByText('5 Days, 5 Nights, 5 Off')).toBeTruthy();
    });

    it('should render STANDARD_7_7_7 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_7_7_7);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_7_7_7}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('7-7-7 Extended')).toBeTruthy();
      expect(getByText('7 Days, 7 Nights, 7 Off')).toBeTruthy();
    });

    it('should render STANDARD_10_10_10 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_10_10_10);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_10_10_10}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('10-10-10 Long')).toBeTruthy();
      expect(getByText('10 Days, 10 Nights, 10 Off')).toBeTruthy();
    });

    it('should render STANDARD_2_2_3 pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_2_2_3);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_2_2_3}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('2-2-3 Rapid')).toBeTruthy();
      expect(getByText('2 Days, 2 Nights, 3 Off')).toBeTruthy();
    });

    it('should render CONTINENTAL pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.CONTINENTAL);
      const { getByText } = render(
        <PatternCard
          pattern={ShiftPattern.CONTINENTAL}
          metadata={metadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getByText('Continental')).toBeTruthy();
      expect(getByText('8-hour shifts, 3 teams')).toBeTruthy();
    });

    it('should render PITMAN pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.PITMAN);
      const { getByText } = render(
        <PatternCard pattern={ShiftPattern.PITMAN} metadata={metadata} onSelect={mockOnSelect} />
      );
      expect(getByText('Pitman Schedule')).toBeTruthy();
      expect(getByText('12-hour shifts, 4 teams')).toBeTruthy();
    });

    it('should render CUSTOM pattern', () => {
      const metadata = getPatternMetadata(ShiftPattern.CUSTOM);
      const { getByText } = render(
        <PatternCard pattern={ShiftPattern.CUSTOM} metadata={metadata} onSelect={mockOnSelect} />
      );
      expect(getByText('Custom Pattern')).toBeTruthy();
      expect(getByText('Create your own schedule')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when pressed', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      fireEvent.press(getByTestId('pattern-card'));
      expect(mockOnSelect).toHaveBeenCalledWith(ShiftPattern.STANDARD_3_3_3);
      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should handle press in event', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');
      fireEvent(card, 'pressIn');
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should handle press out event', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');
      fireEvent(card, 'pressOut');
      // Press out doesn't trigger haptic, just animation
    });

    it('should trigger medium haptic on press', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      fireEvent.press(getByTestId('pattern-card'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should handle full press sequence', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');

      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent.press(card);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should handle multiple presses', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      const card = getByTestId('pattern-card');

      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card').props.accessibilityRole).toBe('button');
    });

    it('should have proper accessibility label', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card').props.accessibilityLabel).toBe('Test Pattern pattern');
    });

    it('should have proper accessibility hint', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card').props.accessibilityHint).toBe(
        'Selects 3 Days, 3 Nights, 3 Off shift pattern'
      );
    });

    it('should indicate selected state in accessibility', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          selected
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card').props.accessibilityState).toEqual({ selected: true });
    });

    it('should indicate unselected state in accessibility', () => {
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          selected={false}
          onSelect={mockOnSelect}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card').props.accessibilityState).toEqual({ selected: false });
    });
  });

  describe('getPatternMetadata Function', () => {
    it('should return metadata for STANDARD_3_3_3', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_3_3_3);
      expect(metadata.name).toBe('3-3-3 Standard');
      expect(metadata.description).toBe('3 Days, 3 Nights, 3 Off');
      expect(metadata.emoji).toBe('⛏️');
      expect(metadata.preview).toHaveLength(9);
    });

    it('should return metadata for STANDARD_4_4_4', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_4_4_4);
      expect(metadata.name).toBe('4-4-4 FIFO');
      expect(metadata.description).toBe('4 Days, 4 Nights, 4 Off');
      expect(metadata.emoji).toBe('⛏️');
      expect(metadata.preview).toHaveLength(12);
    });

    it('should return metadata for STANDARD_5_5_5', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_5_5_5);
      expect(metadata.name).toBe('5-5-5 Standard');
      expect(metadata.description).toBe('5 Days, 5 Nights, 5 Off');
      expect(metadata.emoji).toBe('⛏️');
      expect(metadata.preview).toHaveLength(15);
    });

    it('should return metadata for STANDARD_7_7_7', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_7_7_7);
      expect(metadata.name).toBe('7-7-7 Extended');
      expect(metadata.description).toBe('7 Days, 7 Nights, 7 Off');
      expect(metadata.emoji).toBe('🌙');
      expect(metadata.preview).toHaveLength(21);
    });

    it('should return metadata for STANDARD_10_10_10', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_10_10_10);
      expect(metadata.name).toBe('10-10-10 Long');
      expect(metadata.description).toBe('10 Days, 10 Nights, 10 Off');
      expect(metadata.emoji).toBe('🌙');
      expect(metadata.preview).toHaveLength(30);
    });

    it('should return metadata for STANDARD_2_2_3', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_2_2_3);
      expect(metadata.name).toBe('2-2-3 Rapid');
      expect(metadata.description).toBe('2 Days, 2 Nights, 3 Off');
      expect(metadata.emoji).toBe('⚡');
      expect(metadata.preview).toHaveLength(7);
    });

    it('should return metadata for CONTINENTAL', () => {
      const metadata = getPatternMetadata(ShiftPattern.CONTINENTAL);
      expect(metadata.name).toBe('Continental');
      expect(metadata.description).toBe('8-hour shifts, 3 teams');
      expect(metadata.emoji).toBe('🌐');
      expect(metadata.preview).toHaveLength(8);
    });

    it('should return metadata for PITMAN', () => {
      const metadata = getPatternMetadata(ShiftPattern.PITMAN);
      expect(metadata.name).toBe('Pitman Schedule');
      expect(metadata.description).toBe('12-hour shifts, 4 teams');
      expect(metadata.emoji).toBe('🔄');
      expect(metadata.preview.length).toBeGreaterThan(0);
    });

    it('should return metadata for CUSTOM', () => {
      const metadata = getPatternMetadata(ShiftPattern.CUSTOM);
      expect(metadata.name).toBe('Custom Pattern');
      expect(metadata.description).toBe('Create your own schedule');
      expect(metadata.emoji).toBe('✏️');
      expect(metadata.preview).toEqual(['day', 'night', 'off']);
    });

    it('should include correct preview sequence for patterns', () => {
      const metadata = getPatternMetadata(ShiftPattern.STANDARD_3_3_3);
      expect(metadata.preview).toEqual([
        'day',
        'day',
        'day',
        'night',
        'night',
        'night',
        'off',
        'off',
        'off',
      ]);
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mockMetadata}
          onSelect={mockOnSelect}
          style={customStyle}
          testID="pattern-card"
        />
      );
      expect(getByTestId('pattern-card')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty preview array', () => {
      const emptyPreviewMetadata = {
        ...mockMetadata,
        preview: [] as Array<'day' | 'night' | 'off'>,
      };
      const { queryByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={emptyPreviewMetadata}
          onSelect={mockOnSelect}
        />
      );
      expect(queryByText('...')).toBeNull();
    });

    it('should handle exactly 12 preview items', () => {
      const exactPreview = Array(12).fill('day');
      const exactMetadata = { ...mockMetadata, preview: exactPreview };
      const { queryByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={exactMetadata}
          onSelect={mockOnSelect}
        />
      );
      expect(queryByText('...')).toBeNull();
    });

    it('should handle mixed preview types', () => {
      const mixedMetadata = {
        ...mockMetadata,
        preview: ['day', 'night', 'off', 'day', 'night', 'off'] as Array<'day' | 'night' | 'off'>,
      };
      const { getAllByText } = render(
        <PatternCard
          pattern={ShiftPattern.STANDARD_3_3_3}
          metadata={mixedMetadata}
          onSelect={mockOnSelect}
        />
      );
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('N').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });
  });
});
