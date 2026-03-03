/**
 * PremiumCountrySelector Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { PremiumCountrySelector, Country } from '../PremiumCountrySelector';

describe('PremiumCountrySelector', () => {
  const mockOnCountrySelect = jest.fn();

  const testCountries: Country[] = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default countries', () => {
      const { getByText } = render(
        <PremiumCountrySelector onCountrySelect={mockOnCountrySelect} />
      );
      expect(getByText('United States')).toBeTruthy();
      expect(getByText('United Kingdom')).toBeTruthy();
      expect(getByText('Canada')).toBeTruthy();
    });

    it('should render with custom countries', () => {
      const { getByText, queryByText } = render(
        <PremiumCountrySelector countries={testCountries} onCountrySelect={mockOnCountrySelect} />
      );
      expect(getByText('United States')).toBeTruthy();
      expect(getByText('Germany')).toBeTruthy();
      expect(queryByText('Australia')).toBeNull();
    });

    it('should render search input', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector onCountrySelect={mockOnCountrySelect} testID="selector" />
      );
      expect(getByTestId('selector-search-input')).toBeTruthy();
    });

    it('should render with custom search placeholder', () => {
      const { getByPlaceholderText } = render(
        <PremiumCountrySelector
          onCountrySelect={mockOnCountrySelect}
          searchPlaceholder="Find a country..."
        />
      );
      expect(getByPlaceholderText('Find a country...')).toBeTruthy();
    });

    it('should render scroll view', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector onCountrySelect={mockOnCountrySelect} testID="selector" />
      );
      expect(getByTestId('selector-scroll-view')).toBeTruthy();
    });

    it('should show selected country with checkmark', () => {
      const { getByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          selectedCountry="US"
          onCountrySelect={mockOnCountrySelect}
        />
      );
      expect(getByText('✓')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should filter countries by name', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'United');

      expect(getByText('United States')).toBeTruthy();
      expect(getByText('United Kingdom')).toBeTruthy();
      expect(queryByText('Canada')).toBeNull();
      expect(queryByText('Germany')).toBeNull();
    });

    it('should filter countries by code', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'CA');

      expect(getByText('Canada')).toBeTruthy();
      expect(queryByText('United States')).toBeNull();
      expect(queryByText('Germany')).toBeNull();
    });

    it('should be case insensitive', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'GERMANY');

      expect(getByText('Germany')).toBeTruthy();
      expect(queryByText('United States')).toBeNull();
    });

    it('should show empty state when no results', () => {
      const { getByTestId, getByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'XYZ123');

      expect(getByText('No countries found')).toBeTruthy();
    });

    it('should show all countries when search is cleared', () => {
      const { getByTestId, getByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');

      // Filter
      fireEvent.changeText(searchInput, 'Canada');
      expect(getByText('Canada')).toBeTruthy();

      // Clear
      fireEvent.changeText(searchInput, '');
      expect(getByText('United States')).toBeTruthy();
      expect(getByText('United Kingdom')).toBeTruthy();
      expect(getByText('Canada')).toBeTruthy();
    });

    it('should handle whitespace in search query', () => {
      const { getByTestId, getByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, '   ');

      // Should show all countries when only whitespace
      expect(getByText('United States')).toBeTruthy();
      expect(getByText('Canada')).toBeTruthy();
    });
  });

  describe('Country Selection', () => {
    it('should call onCountrySelect when country is pressed', () => {
      const { getByText } = render(
        <PremiumCountrySelector countries={testCountries} onCountrySelect={mockOnCountrySelect} />
      );

      fireEvent.press(getByText('Canada'));

      expect(mockOnCountrySelect).toHaveBeenCalledTimes(1);
      expect(mockOnCountrySelect).toHaveBeenCalledWith({
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
      });
    });

    it('should trigger haptic on country selection', () => {
      const { getByText } = render(
        <PremiumCountrySelector countries={testCountries} onCountrySelect={mockOnCountrySelect} />
      );

      fireEvent.press(getByText('Canada'));

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not crash when no onCountrySelect handler provided', () => {
      const { getByText } = render(<PremiumCountrySelector countries={testCountries} />);

      fireEvent.press(getByText('Canada'));

      // Should not crash
      expect(true).toBe(true);
    });

    it('should highlight selected country', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector
          countries={testCountries}
          selectedCountry="US"
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const usCountry = getByTestId('selector-country-US');
      expect(usCountry.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible search input', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector onCountrySelect={mockOnCountrySelect} testID="selector" />
      );

      const searchInput = getByTestId('selector-search-input');
      expect(searchInput.props.accessibilityLabel).toBe('Search countries');
    });

    it('should have accessible country items', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const usCountry = getByTestId('selector-country-US');
      expect(usCountry.props.accessibilityRole).toBe('button');
      expect(usCountry.props.accessibilityLabel).toBe('United States 🇺🇸');
    });
  });

  describe('Custom Props', () => {
    it('should render with custom countries', () => {
      const { getByTestId } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const scrollView = getByTestId('selector-scroll-view');
      expect(scrollView).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty country list', () => {
      const { getByText } = render(
        <PremiumCountrySelector countries={[]} onCountrySelect={mockOnCountrySelect} />
      );

      expect(getByText('No countries found')).toBeTruthy();
    });

    it('should handle search with no matches in empty list', () => {
      const { getByTestId, getByText } = render(
        <PremiumCountrySelector
          countries={[]}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'United States');

      expect(getByText('No countries found')).toBeTruthy();
    });

    it('should handle partial name matches', () => {
      const { getByTestId, getByText, queryByText } = render(
        <PremiumCountrySelector
          countries={testCountries}
          onCountrySelect={mockOnCountrySelect}
          testID="selector"
        />
      );

      const searchInput = getByTestId('selector-search-input');
      fireEvent.changeText(searchInput, 'Uni');

      expect(getByText('United States')).toBeTruthy();
      expect(getByText('United Kingdom')).toBeTruthy();
      expect(queryByText('Canada')).toBeNull();
    });
  });
});
