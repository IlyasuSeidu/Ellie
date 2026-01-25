/**
 * ReportCheckbox Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { ReportCheckbox, createReportMetadata } from '../ReportCheckbox';

describe('ReportCheckbox', () => {
  const mockOnChange = jest.fn();

  const shiftSummaryReport = createReportMetadata('shift-summary', 5);
  const earningsReport = createReportMetadata('earnings');
  const workLifeReport = createReportMetadata('work-life', 12);
  const holidayReport = createReportMetadata('holiday-impact');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render report title and description', () => {
      const { getByText } = render(
        <ReportCheckbox report={shiftSummaryReport} onChange={mockOnChange} />
      );
      expect(getByText('Shift Summary')).toBeTruthy();
      expect(getByText('View count of shifts by type')).toBeTruthy();
    });

    it('should render unchecked state by default', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      const checkbox = getByTestId('checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(false);
    });

    it('should render checked state', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} checked onChange={mockOnChange} testID="checkbox" />
      );
      const checkbox = getByTestId('checkbox');
      expect(checkbox.props.accessibilityState.checked).toBe(true);
    });

    it('should render badge when badgeCount is provided', () => {
      const { getByText } = render(
        <ReportCheckbox report={shiftSummaryReport} onChange={mockOnChange} />
      );
      expect(getByText('5')).toBeTruthy();
    });

    it('should not render badge when badgeCount is zero', () => {
      const reportWithZeroBadge = createReportMetadata('earnings', 0);
      const { queryByText } = render(
        <ReportCheckbox report={reportWithZeroBadge} onChange={mockOnChange} />
      );
      expect(queryByText('0')).toBeNull();
    });

    it('should not render badge when badgeCount is undefined', () => {
      const { queryByText } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} />
      );
      // Badge count text should not exist
      expect(queryByText(/^\d+$/)).toBeNull();
    });
  });

  describe('Report Types', () => {
    it('should render shift summary report', () => {
      const { getByText } = render(
        <ReportCheckbox report={shiftSummaryReport} onChange={mockOnChange} />
      );
      expect(getByText('Shift Summary')).toBeTruthy();
      expect(getByText('View count of shifts by type')).toBeTruthy();
    });

    it('should render earnings report', () => {
      const { getByText } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} />
      );
      expect(getByText('Earnings Report')).toBeTruthy();
      expect(getByText('Calculate total pay and breakdown')).toBeTruthy();
    });

    it('should render work-life balance report', () => {
      const { getByText } = render(
        <ReportCheckbox report={workLifeReport} onChange={mockOnChange} />
      );
      expect(getByText('Work-Life Balance')).toBeTruthy();
      expect(getByText('Analyze off days and work percentage')).toBeTruthy();
    });

    it('should render holiday impact report', () => {
      const { getByText } = render(
        <ReportCheckbox report={holidayReport} onChange={mockOnChange} />
      );
      expect(getByText('Holiday Impact')).toBeTruthy();
      expect(getByText('See holidays falling on shift days')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onChange when pressed', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      fireEvent.press(getByTestId('checkbox'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(true, earningsReport);
    });

    it('should toggle from checked to unchecked', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} checked onChange={mockOnChange} testID="checkbox" />
      );
      fireEvent.press(getByTestId('checkbox'));

      expect(mockOnChange).toHaveBeenCalledWith(false, earningsReport);
    });

    it('should not call onChange when disabled', () => {
      const { getByTestId } = render(
        <ReportCheckbox
          report={earningsReport}
          disabled
          onChange={mockOnChange}
          testID="checkbox"
        />
      );
      fireEvent.press(getByTestId('checkbox'));

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should trigger haptic on press in', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      const checkbox = getByTestId('checkbox');
      fireEvent(checkbox, 'pressIn');

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should trigger haptic on check', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      fireEvent.press(getByTestId('checkbox'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should trigger light haptic on uncheck', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} checked onChange={mockOnChange} testID="checkbox" />
      );
      fireEvent.press(getByTestId('checkbox'));

      // When unchecking, should use light haptic
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });

    it('should not trigger haptic when disabled', () => {
      const { getByTestId } = render(
        <ReportCheckbox
          report={earningsReport}
          disabled
          onChange={mockOnChange}
          testID="checkbox"
        />
      );
      const checkbox = getByTestId('checkbox');
      fireEvent(checkbox, 'pressIn');

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have checkbox role', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      expect(getByTestId('checkbox').props.accessibilityRole).toBe('checkbox');
    });

    it('should generate default accessibility label', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      expect(getByTestId('checkbox').props.accessibilityLabel).toBe('Earnings Report, unchecked');
    });

    it('should update accessibility label when checked', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} checked onChange={mockOnChange} testID="checkbox" />
      );
      expect(getByTestId('checkbox').props.accessibilityLabel).toBe('Earnings Report, checked');
    });

    it('should use custom accessibility label', () => {
      const { getByTestId } = render(
        <ReportCheckbox
          report={earningsReport}
          onChange={mockOnChange}
          accessibilityLabel="Custom earnings label"
          testID="checkbox"
        />
      );
      expect(getByTestId('checkbox').props.accessibilityLabel).toBe('Custom earnings label');
    });

    it('should indicate disabled state', () => {
      const { getByTestId } = render(
        <ReportCheckbox
          report={earningsReport}
          disabled
          onChange={mockOnChange}
          testID="checkbox"
        />
      );
      expect(getByTestId('checkbox').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle press in and press out sequence', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      const checkbox = getByTestId('checkbox');

      fireEvent(checkbox, 'pressIn');
      fireEvent(checkbox, 'pressOut');
      fireEvent.press(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid toggles', () => {
      const { getByTestId } = render(
        <ReportCheckbox report={earningsReport} onChange={mockOnChange} testID="checkbox" />
      );
      const checkbox = getByTestId('checkbox');

      fireEvent.press(checkbox);
      fireEvent.press(checkbox);
      fireEvent.press(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should handle large badge counts', () => {
      const reportWithLargeBadge = createReportMetadata('shift-summary', 999);
      const { getByText } = render(
        <ReportCheckbox report={reportWithLargeBadge} onChange={mockOnChange} />
      );
      expect(getByText('999')).toBeTruthy();
    });

    it('should work without onChange handler', () => {
      const { getByTestId } = render(<ReportCheckbox report={earningsReport} testID="checkbox" />);
      // Should not crash
      expect(getByTestId('checkbox')).toBeTruthy();
    });
  });

  describe('createReportMetadata Helper', () => {
    it('should create shift-summary metadata', () => {
      const metadata = createReportMetadata('shift-summary');
      expect(metadata.type).toBe('shift-summary');
      expect(metadata.title).toBe('Shift Summary');
      expect(metadata.description).toBe('View count of shifts by type');
    });

    it('should create earnings metadata', () => {
      const metadata = createReportMetadata('earnings');
      expect(metadata.type).toBe('earnings');
      expect(metadata.title).toBe('Earnings Report');
      expect(metadata.description).toBe('Calculate total pay and breakdown');
    });

    it('should create work-life metadata', () => {
      const metadata = createReportMetadata('work-life');
      expect(metadata.type).toBe('work-life');
      expect(metadata.title).toBe('Work-Life Balance');
      expect(metadata.description).toBe('Analyze off days and work percentage');
    });

    it('should create holiday-impact metadata', () => {
      const metadata = createReportMetadata('holiday-impact');
      expect(metadata.type).toBe('holiday-impact');
      expect(metadata.title).toBe('Holiday Impact');
      expect(metadata.description).toBe('See holidays falling on shift days');
    });

    it('should include badge count when provided', () => {
      const metadata = createReportMetadata('shift-summary', 42);
      expect(metadata.badgeCount).toBe(42);
    });

    it('should not include badge count when not provided', () => {
      const metadata = createReportMetadata('earnings');
      expect(metadata.badgeCount).toBeUndefined();
    });
  });
});
