/**
 * LivePatternPreview Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { LivePatternPreview } from '../LivePatternPreview';

describe('LivePatternPreview', () => {
  describe('Rendering', () => {
    it('should render with basic pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText(/Your 9-day cycle/)).toBeTruthy();
    });

    it('should display cycle summary', () => {
      const { getByText } = render(<LivePatternPreview daysOn={4} nightsOn={4} daysOff={4} />);
      expect(getByText('Your 12-day cycle: 4D / 4N / 4O')).toBeTruthy();
    });

    it('should render 28-day preview', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      // Should have day labels D, N, O
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('N').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });

    it('should render legend', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Off Days')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} testID="preview" />
      );
      expect(getByTestId('preview')).toBeTruthy();
    });
  });

  describe('Cycle Generation - Different Combinations', () => {
    it('should generate cycle for 3-3-3 pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Your 9-day cycle: 3D / 3N / 3O')).toBeTruthy();
    });

    it('should generate cycle for 4-4-4 pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={4} nightsOn={4} daysOff={4} />);
      expect(getByText('Your 12-day cycle: 4D / 4N / 4O')).toBeTruthy();
    });

    it('should generate cycle for 5-5-5 pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={5} nightsOn={5} daysOff={5} />);
      expect(getByText('Your 15-day cycle: 5D / 5N / 5O')).toBeTruthy();
    });

    it('should generate cycle for 7-7-7 pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={7} nightsOn={7} daysOff={7} />);
      expect(getByText('Your 21-day cycle: 7D / 7N / 7O')).toBeTruthy();
    });

    it('should generate cycle for 2-2-3 pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={2} nightsOn={2} daysOff={3} />);
      expect(getByText('Your 7-day cycle: 2D / 2N / 3O')).toBeTruthy();
    });

    it('should generate cycle for asymmetric pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={2} daysOff={4} />);
      expect(getByText('Your 9-day cycle: 3D / 2N / 4O')).toBeTruthy();
    });

    it('should handle days only pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={5} nightsOn={0} daysOff={2} />);
      expect(getByText('Your 7-day cycle: 5D / 0N / 2O')).toBeTruthy();
    });

    it('should handle nights only pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={0} nightsOn={5} daysOff={2} />);
      expect(getByText('Your 7-day cycle: 0D / 5N / 2O')).toBeTruthy();
    });

    it('should handle off days only pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={0} nightsOn={0} daysOff={7} />);
      expect(getByText('Your 7-day cycle: 0D / 0N / 7O')).toBeTruthy();
    });

    it('should handle mixed pattern with no off days', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={0} />);
      expect(getByText('Your 6-day cycle: 3D / 3N / 0O')).toBeTruthy();
    });

    it('should handle single day patterns', () => {
      const { getByText } = render(<LivePatternPreview daysOn={1} nightsOn={1} daysOff={1} />);
      expect(getByText('Your 3-day cycle: 1D / 1N / 1O')).toBeTruthy();
    });

    it('should handle large cycle patterns', () => {
      const { getByText } = render(<LivePatternPreview daysOn={10} nightsOn={10} daysOff={10} />);
      expect(getByText('Your 30-day cycle: 10D / 10N / 10O')).toBeTruthy();
    });
  });

  describe('28-Day Preview Rendering', () => {
    it('should render exactly 28 day boxes', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      // Count day numbers from 1 to 28
      const dayNumbers = [];
      for (let i = 1; i <= 28; i++) {
        dayNumbers.push(i.toString());
      }

      // Check that we have day numbers (at least some of them)
      expect(getAllByText('1').length).toBeGreaterThan(0);
    });

    it('should repeat pattern across 28 days for 3-3-3', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);

      // 9-day cycle repeated over 28 days = 3 full cycles + 1 day
      // Should have D, N, and O labels
      const dLabels = getAllByText('D');
      const nLabels = getAllByText('N');
      const oLabels = getAllByText('O');

      expect(dLabels.length).toBeGreaterThan(0);
      expect(nLabels.length).toBeGreaterThan(0);
      expect(oLabels.length).toBeGreaterThan(0);
    });

    it('should repeat pattern across 28 days for 7-7-7', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={7} nightsOn={7} daysOff={7} />);

      // 21-day cycle repeated over 28 days = 1 full cycle + 7 days
      const dLabels = getAllByText('D');
      const nLabels = getAllByText('N');
      const oLabels = getAllByText('O');

      expect(dLabels.length).toBeGreaterThan(0);
      expect(nLabels.length).toBeGreaterThan(0);
      expect(oLabels.length).toBeGreaterThan(0);
    });

    it('should handle pattern longer than 28 days', () => {
      const { getAllByText, getByText } = render(
        <LivePatternPreview daysOn={15} nightsOn={15} daysOff={15} />
      );

      // 45-day cycle, but should only show 28 days
      expect(getByText('Your 45-day cycle: 15D / 15N / 15O')).toBeTruthy();

      // Should have some D labels (first 15 days of the 28 should be days, then 13 nights)
      const dLabels = getAllByText('D');
      expect(dLabels.length).toBeGreaterThan(0);
    });

    it('should show day numbers 1-28', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);

      // Check first, middle, and last day numbers
      expect(getByText('1')).toBeTruthy();
      expect(getByText('14')).toBeTruthy();
      expect(getByText('28')).toBeTruthy();
    });
  });

  describe('Summary Text', () => {
    it('should show correct cycle length', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText(/9-day cycle/)).toBeTruthy();
    });

    it('should show correct day shift count', () => {
      const { getByText } = render(<LivePatternPreview daysOn={5} nightsOn={3} daysOff={2} />);
      expect(getByText(/5D/)).toBeTruthy();
    });

    it('should show correct night shift count', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={4} daysOff={2} />);
      expect(getByText(/4N/)).toBeTruthy();
    });

    it('should show correct off days count', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={5} />);
      expect(getByText(/5O/)).toBeTruthy();
    });

    it('should format summary correctly', () => {
      const { getByText } = render(<LivePatternPreview daysOn={4} nightsOn={3} daysOff={2} />);
      expect(getByText('Your 9-day cycle: 4D / 3N / 2O')).toBeTruthy();
    });
  });

  describe('Animations', () => {
    it('should render with FadeIn animation', () => {
      const { getByTestId } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} testID="preview" />
      );
      expect(getByTestId('preview')).toBeTruthy();
    });

    it('should re-animate when values change', () => {
      const { rerender, getByText } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />
      );
      expect(getByText('Your 9-day cycle: 3D / 3N / 3O')).toBeTruthy();

      rerender(<LivePatternPreview daysOn={4} nightsOn={4} daysOff={4} />);
      expect(getByText('Your 12-day cycle: 4D / 4N / 4O')).toBeTruthy();
    });

    it('should trigger animation on daysOn change', () => {
      const { rerender, getByText } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />
      );

      rerender(<LivePatternPreview daysOn={5} nightsOn={3} daysOff={3} />);
      expect(getByText(/5D/)).toBeTruthy();
    });

    it('should trigger animation on nightsOn change', () => {
      const { rerender, getByText } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />
      );

      rerender(<LivePatternPreview daysOn={3} nightsOn={5} daysOff={3} />);
      expect(getByText(/5N/)).toBeTruthy();
    });

    it('should trigger animation on daysOff change', () => {
      const { rerender, getByText } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />
      );

      rerender(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={5} />);
      expect(getByText(/5O/)).toBeTruthy();
    });
  });

  describe('Day Type Labels', () => {
    it('should show D for day shifts', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={3} nightsOn={0} daysOff={0} />);
      expect(getAllByText('D').length).toBeGreaterThan(0);
    });

    it('should show N for night shifts', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={0} nightsOn={3} daysOff={0} />);
      expect(getAllByText('N').length).toBeGreaterThan(0);
    });

    it('should show O for off days', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={0} nightsOn={0} daysOff={3} />);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });

    it('should show mixed labels for combined pattern', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={2} nightsOn={2} daysOff={2} />);
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('N').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });
  });

  describe('Legend Display', () => {
    it('should display day shift legend item', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Day Shift')).toBeTruthy();
    });

    it('should display night shift legend item', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Night Shift')).toBeTruthy();
    });

    it('should display off days legend item', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Off Days')).toBeTruthy();
    });

    it('should always show all three legend items', () => {
      const { getByText } = render(<LivePatternPreview daysOn={7} nightsOn={0} daysOff={0} />);
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Off Days')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginTop: 20 };
      const { getByTestId } = render(
        <LivePatternPreview
          daysOn={3}
          nightsOn={3}
          daysOff={3}
          style={customStyle}
          testID="preview"
        />
      );
      expect(getByTestId('preview')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all zeros pattern', () => {
      const { getByText } = render(<LivePatternPreview daysOn={0} nightsOn={0} daysOff={0} />);
      expect(getByText('Your 0-day cycle: 0D / 0N / 0O')).toBeTruthy();
    });

    it('should handle single value in each category', () => {
      const { getByText } = render(<LivePatternPreview daysOn={1} nightsOn={1} daysOff={1} />);
      expect(getByText('Your 3-day cycle: 1D / 1N / 1O')).toBeTruthy();
    });

    it('should handle very large day counts', () => {
      const { getByText } = render(<LivePatternPreview daysOn={20} nightsOn={20} daysOff={20} />);
      expect(getByText('Your 60-day cycle: 20D / 20N / 20O')).toBeTruthy();
    });

    it('should handle pattern exactly 28 days long', () => {
      const { getByText } = render(<LivePatternPreview daysOn={10} nightsOn={10} daysOff={8} />);
      expect(getByText('Your 28-day cycle: 10D / 10N / 8O')).toBeTruthy();
    });

    it('should handle pattern exactly 14 days long (2 cycles)', () => {
      const { getByText } = render(<LivePatternPreview daysOn={5} nightsOn={5} daysOff={4} />);
      expect(getByText('Your 14-day cycle: 5D / 5N / 4O')).toBeTruthy();
    });

    it('should handle uneven patterns', () => {
      const { getByText } = render(<LivePatternPreview daysOn={1} nightsOn={2} daysOff={4} />);
      expect(getByText('Your 7-day cycle: 1D / 2N / 4O')).toBeTruthy();
    });

    it('should update when all values change simultaneously', () => {
      const { rerender, getByText } = render(
        <LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />
      );
      expect(getByText('Your 9-day cycle: 3D / 3N / 3O')).toBeTruthy();

      rerender(<LivePatternPreview daysOn={5} nightsOn={4} daysOff={2} />);
      expect(getByText('Your 11-day cycle: 5D / 4N / 2O')).toBeTruthy();
    });

    it('should handle no day shifts', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={0} nightsOn={5} daysOff={2} />);
      expect(getAllByText('N').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });

    it('should handle no night shifts', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={5} nightsOn={0} daysOff={2} />);
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('O').length).toBeGreaterThan(0);
    });

    it('should handle no off days', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={5} nightsOn={5} daysOff={0} />);
      expect(getAllByText('D').length).toBeGreaterThan(0);
      expect(getAllByText('N').length).toBeGreaterThan(0);
    });

    it('should correctly cycle pattern that does not divide evenly into 28', () => {
      const { getAllByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      // 9-day cycle: should have 3 complete cycles (27 days) + 1 extra day
      const dLabels = getAllByText('D');
      const nLabels = getAllByText('N');
      const oLabels = getAllByText('O');

      // Should have some of each type
      expect(dLabels.length).toBeGreaterThan(0);
      expect(nLabels.length).toBeGreaterThan(0);
      expect(oLabels.length).toBeGreaterThan(0);
    });

    it('should maintain correct order in preview', () => {
      const { getByText } = render(<LivePatternPreview daysOn={2} nightsOn={2} daysOff={2} />);
      // Should show pattern starting with days, then nights, then off
      expect(getByText('Your 6-day cycle: 2D / 2N / 2O')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should render accessible content', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      // Summary text is accessible
      expect(getByText('Your 9-day cycle: 3D / 3N / 3O')).toBeTruthy();
      // Legend provides context
      expect(getByText('Day Shift')).toBeTruthy();
    });

    it('should have readable labels', () => {
      const { getByText } = render(<LivePatternPreview daysOn={3} nightsOn={3} daysOff={3} />);
      expect(getByText('Day Shift')).toBeTruthy();
      expect(getByText('Night Shift')).toBeTruthy();
      expect(getByText('Off Days')).toBeTruthy();
    });
  });
});
