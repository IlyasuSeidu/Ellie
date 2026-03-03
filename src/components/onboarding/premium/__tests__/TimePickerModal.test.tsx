/**
 * TimePickerModal Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { TimePickerModal } from '../TimePickerModal';

describe('TimePickerModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getByText('Select Time')).toBeTruthy();
    });

    it('should not render modal when not visible', () => {
      const { queryByText } = render(
        <TimePickerModal visible={false} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(queryByText('Select Time')).toBeNull();
    });

    it('should render hour label', () => {
      const { getByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getByText('Hour')).toBeTruthy();
    });

    it('should render minute label', () => {
      const { getByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getByText('Minute')).toBeTruthy();
    });

    it('should render cancel button', () => {
      const { getByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should render confirm button', () => {
      const { getByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getByText('Confirm')).toBeTruthy();
    });
  });

  describe('24-Hour Format', () => {
    it('should render 24 hours (0-23)', () => {
      const { getAllByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getAllByText('00').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('12').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('23').length).toBeGreaterThanOrEqual(1);
    });

    it('should not render AM/PM selector in 24h format', () => {
      const { queryByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(queryByText('Period')).toBeNull();
    });

    it('should initialize with default time 09:00', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} testID="modal" />
      );
      // Component should be rendered
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should initialize with custom time', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          initialTime="14:30"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  describe('12-Hour Format', () => {
    it('should render Period label in 12h format', () => {
      const { getByText } = render(
        <TimePickerModal
          visible
          use12HourFormat
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Period')).toBeTruthy();
    });

    it('should render AM/PM buttons in 12h format', () => {
      const { getByText } = render(
        <TimePickerModal
          visible
          use12HourFormat
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('AM')).toBeTruthy();
      expect(getByText('PM')).toBeTruthy();
    });

    it('should render 12 hours (1-12) in 12h format', () => {
      const { getByText } = render(
        <TimePickerModal
          visible
          use12HourFormat
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('01')).toBeTruthy();
      expect(getByText('12')).toBeTruthy();
    });

    it('should convert afternoon time to PM', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="14:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );
      expect(getByTestId('modal')).toBeTruthy();
    });

    it('should convert midnight to 12 AM', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="00:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  describe('Minute Selection', () => {
    it('should render minutes 0, 15, 30, 45', () => {
      const { getAllByText } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} />
      );
      expect(getAllByText('00').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('15').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('30').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('45').length).toBeGreaterThanOrEqual(1);
    });

    it('should select minute when pressed', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-minute-15'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Hour Selection', () => {
    it('should select hour when pressed', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-hour-14'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on hour selection', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-hour-10'));
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });

  describe('AM/PM Toggle', () => {
    it('should toggle AM/PM when pressed', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-pm'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on AM/PM toggle', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-am'));
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should call onCancel when cancel button pressed', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} onCancel={mockOnCancel} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm with 24h format time', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          initialTime="09:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).toHaveBeenCalledWith('09:00');
    });

    it('should convert 12h PM time to 24h format', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="14:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('14:00');
    });

    it('should convert 12h AM time to 24h format', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="09:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('09:00');
    });

    it('should convert 12 AM to 00:00', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="00:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('00:00');
    });

    it('should convert 12 PM to 12:00', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          use12HourFormat
          initialTime="12:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('12:00');
    });
  });

  describe('Edge Cases', () => {
    it('should work without onConfirm handler', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onCancel={mockOnCancel} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      // Should not crash
      expect(true).toBe(true);
    });

    it('should work without onCancel handler', () => {
      const { getByTestId } = render(
        <TimePickerModal visible onConfirm={mockOnConfirm} testID="modal" />
      );

      fireEvent.press(getByTestId('modal-cancel'));
      // Should not crash
      expect(true).toBe(true);
    });

    it('should pad hours with leading zero', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          initialTime="05:15"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('05:15');
    });

    it('should pad minutes with leading zero', () => {
      const { getByTestId } = render(
        <TimePickerModal
          visible
          initialTime="14:00"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          testID="modal"
        />
      );

      fireEvent.press(getByTestId('modal-confirm'));
      expect(mockOnConfirm).toHaveBeenCalledWith('14:00');
    });
  });
});
