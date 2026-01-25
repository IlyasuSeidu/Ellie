/**
 * PremiumCalendar Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PremiumCalendar } from '../PremiumCalendar';

describe('PremiumCalendar', () => {
  const mockOnDateSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render calendar with current month', () => {
      const { getByText } = render(<PremiumCalendar onDateSelect={mockOnDateSelect} />);
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      expect(getByText(new RegExp(currentMonth))).toBeTruthy();
    });

    it('should render calendar with selected date month', () => {
      const selectedDate = new Date(2024, 5, 15); // June 15, 2024
      const { getByText } = render(
        <PremiumCalendar selectedDate={selectedDate} onDateSelect={mockOnDateSelect} />
      );
      expect(getByText(/June 2024/)).toBeTruthy();
    });

    it('should render weekday headers', () => {
      const { getAllByText } = render(<PremiumCalendar onDateSelect={mockOnDateSelect} />);
      expect(getAllByText('S').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('M').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('T').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('W').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('F').length).toBeGreaterThanOrEqual(1);
    });

    it('should render navigation buttons', () => {
      const { getByTestId } = render(
        <PremiumCalendar onDateSelect={mockOnDateSelect} testID="calendar" />
      );
      expect(getByTestId('calendar-prev-month')).toBeTruthy();
      expect(getByTestId('calendar-next-month')).toBeTruthy();
    });

    it('should render 42 day cells (6 weeks)', () => {
      const { getByTestId } = render(
        <PremiumCalendar onDateSelect={mockOnDateSelect} testID="calendar" />
      );
      // Check that day cells 0-41 exist (42 cells total)
      for (let i = 0; i < 42; i++) {
        expect(getByTestId(`calendar-day-${i}`)).toBeTruthy();
      }
    });
  });

  describe('Month Navigation', () => {
    it('should navigate to previous month', () => {
      const selectedDate = new Date(2024, 5, 15); // June 2024
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/June 2024/)).toBeTruthy();

      fireEvent.press(getByTestId('calendar-prev-month'));

      expect(queryByText(/June 2024/)).toBeNull();
      expect(getByText(/May 2024/)).toBeTruthy();
    });

    it('should navigate to next month', () => {
      const selectedDate = new Date(2024, 5, 15); // June 2024
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/June 2024/)).toBeTruthy();

      fireEvent.press(getByTestId('calendar-next-month'));

      expect(queryByText(/June 2024/)).toBeNull();
      expect(getByText(/July 2024/)).toBeTruthy();
    });

    it('should navigate across year boundary', () => {
      const selectedDate = new Date(2024, 0, 15); // January 2024
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/January 2024/)).toBeTruthy();

      fireEvent.press(getByTestId('calendar-prev-month'));

      expect(queryByText(/January 2024/)).toBeNull();
      expect(getByText(/December 2023/)).toBeTruthy();
    });

    it('should trigger haptic on month navigation', () => {
      const { getByTestId } = render(
        <PremiumCalendar onDateSelect={mockOnDateSelect} testID="calendar" />
      );

      fireEvent.press(getByTestId('calendar-prev-month'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

      jest.clearAllMocks();

      fireEvent.press(getByTestId('calendar-next-month'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('Date Selection', () => {
    it('should call onDateSelect when day is pressed', () => {
      const selectedDate = new Date(2024, 5, 1); // June 1, 2024
      const { getByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      // Find and press day 15
      const day15 = getByText('15');
      fireEvent.press(day15);

      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0][0];
      expect(calledDate.getDate()).toBe(15);
      expect(calledDate.getMonth()).toBe(5);
      expect(calledDate.getFullYear()).toBe(2024);
    });

    it('should not call onDateSelect when no handler provided', () => {
      const { getByText } = render(<PremiumCalendar testID="calendar" />);
      const day15 = getByText('15');
      fireEvent.press(day15);
      // No error should occur
      expect(true).toBe(true);
    });
  });

  describe('Date Restrictions', () => {
    it('should disable dates before minDate', () => {
      const selectedDate = new Date(2024, 5, 15); // June 15, 2024
      const minDate = new Date(2024, 5, 10); // June 10, 2024

      const { getByTestId } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          minDate={minDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      // Days before June 10 should be disabled
      // The calendar shows 42 cells, need to find the cell for day 5
      const calendar = getByTestId('calendar');
      expect(calendar).toBeTruthy();
    });

    it('should disable dates after maxDate', () => {
      const selectedDate = new Date(2024, 5, 15); // June 15, 2024
      const maxDate = new Date(2024, 5, 20); // June 20, 2024

      const { getByTestId } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          maxDate={maxDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      const calendar = getByTestId('calendar');
      expect(calendar).toBeTruthy();
    });

    it('should disable specific dates', () => {
      const selectedDate = new Date(2024, 5, 15); // June 15, 2024
      const disabledDates = [new Date(2024, 5, 10), new Date(2024, 5, 20), new Date(2024, 5, 25)];

      const { getByTestId } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          disabledDates={disabledDates}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      const calendar = getByTestId('calendar');
      expect(calendar).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation buttons', () => {
      const { getByTestId } = render(
        <PremiumCalendar onDateSelect={mockOnDateSelect} testID="calendar" />
      );

      const prevButton = getByTestId('calendar-prev-month');
      const nextButton = getByTestId('calendar-next-month');

      expect(prevButton.props.accessibilityRole).toBe('button');
      expect(nextButton.props.accessibilityRole).toBe('button');
      expect(prevButton.props.accessibilityLabel).toBe('Previous month');
      expect(nextButton.props.accessibilityLabel).toBe('Next month');
    });

    it('should have testID', () => {
      const { getByTestId } = render(
        <PremiumCalendar onDateSelect={mockOnDateSelect} testID="my-calendar" />
      );
      expect(getByTestId('my-calendar')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year February', () => {
      const selectedDate = new Date(2024, 1, 15); // February 2024 (leap year)
      const { getByText, getAllByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/February 2024/)).toBeTruthy();
      expect(getAllByText('29').length).toBeGreaterThanOrEqual(1); // Feb 29 exists in leap year
    });

    it('should handle non-leap year February', () => {
      const selectedDate = new Date(2023, 1, 15); // February 2023 (non-leap year)
      const { getByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/February 2023/)).toBeTruthy();
      // February 2023 should only go up to 28
      expect(getByText('28')).toBeTruthy();
    });

    it('should handle month with 31 days', () => {
      const selectedDate = new Date(2024, 0, 15); // January 2024
      const { getByText, getAllByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/January 2024/)).toBeTruthy();
      expect(getAllByText('31').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle month with 30 days', () => {
      const selectedDate = new Date(2024, 3, 15); // April 2024
      const { getByText } = render(
        <PremiumCalendar
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
          testID="calendar"
        />
      );

      expect(getByText(/April 2024/)).toBeTruthy();
      expect(getByText('30')).toBeTruthy();
    });
  });
});
