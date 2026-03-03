/**
 * PresetTimeCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PresetTimeCard, TIME_PRESETS, CUSTOM_PRESET } from '../PresetTimeCard';

describe('PresetTimeCard', () => {
  const mockOnSelect = jest.fn();

  const earlyStartPreset = TIME_PRESETS[0]; // 6:00 AM
  const dayShiftPreset = TIME_PRESETS[1]; // 7:00 AM
  const afternoonPreset = TIME_PRESETS[2]; // 2:00 PM
  const eveningPreset = TIME_PRESETS[3]; // 6:00 PM
  const nightShiftPreset = TIME_PRESETS[4]; // 10:00 PM

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render time label', () => {
      const { getByText } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('6:00 AM')).toBeTruthy();
    });

    it('should render description', () => {
      const { getByText } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('Early Start')).toBeTruthy();
    });

    it('should render unselected state by default', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );
      expect(getByTestId('card').props.accessibilityState.selected).toBe(false);
    });

    it('should render selected state', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} selected onSelect={mockOnSelect} testID="card" />
      );
      expect(getByTestId('card').props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Time Presets', () => {
    it('should render early start preset (6:00 AM)', () => {
      const { getByText } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('6:00 AM')).toBeTruthy();
      expect(getByText('Early Start')).toBeTruthy();
    });

    it('should render day shift preset (7:00 AM)', () => {
      const { getByText } = render(
        <PresetTimeCard preset={dayShiftPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('7:00 AM')).toBeTruthy();
      expect(getByText('Day Shift')).toBeTruthy();
    });

    it('should render afternoon preset (2:00 PM)', () => {
      const { getByText } = render(
        <PresetTimeCard preset={afternoonPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('2:00 PM')).toBeTruthy();
      expect(getByText('Afternoon')).toBeTruthy();
    });

    it('should render evening preset (6:00 PM)', () => {
      const { getByText } = render(
        <PresetTimeCard preset={eveningPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('6:00 PM')).toBeTruthy();
      expect(getByText('Evening')).toBeTruthy();
    });

    it('should render night shift preset (10:00 PM)', () => {
      const { getByText } = render(
        <PresetTimeCard preset={nightShiftPreset} onSelect={mockOnSelect} />
      );
      expect(getByText('10:00 PM')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
    });

    it('should render custom preset', () => {
      const { getByText } = render(
        <PresetTimeCard preset={CUSTOM_PRESET} onSelect={mockOnSelect} />
      );
      expect(getByText('Custom')).toBeTruthy();
      expect(getByText('Tap to set')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when pressed', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      fireEvent.press(getByTestId('card'));

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).toHaveBeenCalledWith(earlyStartPreset);
    });

    it('should not call onSelect when disabled', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} disabled onSelect={mockOnSelect} testID="card" />
      );

      fireEvent.press(getByTestId('card'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should trigger haptic on press in', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      const card = getByTestId('card');
      fireEvent(card, 'pressIn');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on press', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      fireEvent.press(getByTestId('card'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic when disabled', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} disabled onSelect={mockOnSelect} testID="card" />
      );

      const card = getByTestId('card');
      fireEvent(card, 'pressIn');

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Selected State', () => {
    it('should render different style when selected', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} selected onSelect={mockOnSelect} testID="card" />
      );

      expect(getByTestId('card').props.accessibilityState.selected).toBe(true);
    });

    it('should call onSelect when selected card is pressed', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} selected onSelect={mockOnSelect} testID="card" />
      );

      fireEvent.press(getByTestId('card'));

      expect(mockOnSelect).toHaveBeenCalledWith(earlyStartPreset);
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      expect(getByTestId('card').props.accessibilityRole).toBe('button');
    });

    it('should generate default accessibility label', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      expect(getByTestId('card').props.accessibilityLabel).toBe('6:00 AM, Early Start');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <PresetTimeCard
          preset={earlyStartPreset}
          onSelect={mockOnSelect}
          accessibilityLabel="Custom early morning time"
          testID="card"
        />
      );

      expect(getByTestId('card').props.accessibilityLabel).toBe('Custom early morning time');
    });

    it('should indicate disabled state', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} disabled onSelect={mockOnSelect} testID="card" />
      );

      expect(getByTestId('card').props.accessibilityState.disabled).toBe(true);
    });

    it('should indicate selected state', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} selected onSelect={mockOnSelect} testID="card" />
      );

      expect(getByTestId('card').props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      const card = getByTestId('card');
      fireEvent(card, 'pressIn');
      fireEvent(card, 'pressOut');
      fireEvent.press(card);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple rapid presses', () => {
      const { getByTestId } = render(
        <PresetTimeCard preset={earlyStartPreset} onSelect={mockOnSelect} testID="card" />
      );

      const card = getByTestId('card');
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnSelect).toHaveBeenCalledTimes(3);
    });

    it('should work without onSelect handler', () => {
      const { getByTestId } = render(<PresetTimeCard preset={earlyStartPreset} testID="card" />);

      fireEvent.press(getByTestId('card'));

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe('TIME_PRESETS Constant', () => {
    it('should have 5 presets', () => {
      expect(TIME_PRESETS).toHaveLength(5);
    });

    it('should have correct time format (HH:mm)', () => {
      TIME_PRESETS.forEach((preset) => {
        expect(preset.time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('should have label and description', () => {
      TIME_PRESETS.forEach((preset) => {
        expect(preset.label).toBeTruthy();
        expect(preset.description).toBeTruthy();
      });
    });
  });

  describe('CUSTOM_PRESET Constant', () => {
    it('should have custom time identifier', () => {
      expect(CUSTOM_PRESET.time).toBe('custom');
    });

    it('should have Custom label', () => {
      expect(CUSTOM_PRESET.label).toBe('Custom');
    });

    it('should have Tap to set description', () => {
      expect(CUSTOM_PRESET.description).toBe('Tap to set');
    });
  });
});
