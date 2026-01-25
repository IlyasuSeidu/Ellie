/**
 * PremiumCountrySelector Component
 *
 * Country selector with search functionality using stone and gold theme
 */

import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';

export interface Country {
  /** Country code (ISO 3166-1 alpha-2) */
  code: string;
  /** Country name */
  name: string;
  /** Country flag emoji */
  flag: string;
}

export interface PremiumCountrySelectorProps {
  /** Selected country code */
  selectedCountry?: string;
  /** Country selection handler */
  onCountrySelect?: (country: Country) => void;
  /** Custom country list (defaults to common countries) */
  countries?: Country[];
  /** Placeholder text for search */
  searchPlaceholder?: string;
  /** Maximum height for the country list */
  maxHeight?: number;
  /** Test ID */
  testID?: string;
}

const DEFAULT_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PremiumCountrySelector: React.FC<PremiumCountrySelectorProps> = ({
  selectedCountry,
  onCountrySelect,
  countries = DEFAULT_COUNTRIES,
  searchPlaceholder = 'Search countries...',
  maxHeight = 400,
  testID,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return countries;
    }

    const query = searchQuery.toLowerCase();
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
    );
  }, [searchQuery, countries]);

  const handleCountryPress = (country: Country) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onCountrySelect) {
      onCountrySelect(country);
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Search input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.colors.shadow}
          accessibilityLabel="Search countries"
          testID={`${testID}-search-input`}
        />
      </View>

      {/* Country list */}
      <ScrollView
        style={[styles.listContainer, { maxHeight }]}
        showsVerticalScrollIndicator={true}
        testID={`${testID}-scroll-view`}
      >
        {filteredCountries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.Text style={styles.emptyText}>No countries found</Animated.Text>
          </View>
        ) : (
          filteredCountries.map((country) => (
            <CountryItem
              key={country.code}
              country={country}
              selected={selectedCountry === country.code}
              onPress={handleCountryPress}
              testID={`${testID}-country-${country.code}`}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

interface CountryItemProps {
  country: Country;
  selected: boolean;
  onPress: (country: Country) => void;
  testID?: string;
}

const CountryItem: React.FC<CountryItemProps> = ({ country, selected, onPress, testID }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    onPress(country);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[animatedStyle, styles.countryItem, selected && styles.selectedCountryItem]}
      accessibilityRole="button"
      accessibilityLabel={`${country.name} ${country.flag}`}
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Animated.Text style={styles.flagText}>{country.flag}</Animated.Text>
      <Animated.Text style={[styles.countryText, selected && styles.selectedCountryText]}>
        {country.name}
      </Animated.Text>
      {selected && <Animated.Text style={styles.checkmark}>✓</Animated.Text>}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  searchContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  searchInput: {
    height: 44,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.paper,
  },
  listContainer: {
    padding: theme.spacing.sm,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.xs,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCountryItem: {
    backgroundColor: theme.colors.opacity.gold10,
    borderColor: theme.colors.sacredGold,
  },
  flagText: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  countryText: {
    flex: 1,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.paper,
  },
  selectedCountryText: {
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.sacredGold,
  },
  checkmark: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
