/**
 * PremiumCountrySelector Component
 *
 * Country selector with search functionality using stone and gold theme
 */

import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import i18n from '@/i18n';
import { normalizeLanguage } from '@/i18n/languageDetector';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

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
  /** Test ID */
  testID?: string;
}

const DEFAULT_COUNTRIES: Country[] = [
  // Top global mining countries
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },

  // Major mining nations (alphabetically)
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CD', name: 'Democratic Republic of Congo', flag: '🇨🇩' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const getCountryDisplayLocale = (): string => {
  const normalized = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
  if (normalized === 'es') return 'es-ES';
  if (normalized === 'pt-BR') return 'pt-BR';
  if (normalized === 'fr') return 'fr-FR';
  if (normalized === 'ar') return 'ar';
  if (normalized === 'zh-CN') return 'zh-CN';
  if (normalized === 'ru') return 'ru-RU';
  if (normalized === 'hi') return 'hi-IN';
  if (normalized === 'af') return 'af-ZA';
  if (normalized === 'zu') return 'zu-ZA';
  if (normalized === 'id') return 'id-ID';
  return 'en-US';
};

const resolveLocalizedCountryName = (countryCode: string, fallbackName: string): string => {
  try {
    if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
      return fallbackName;
    }
    const formatter = new Intl.DisplayNames([getCountryDisplayLocale()], { type: 'region' });
    return formatter.of(countryCode) || fallbackName;
  } catch {
    return fallbackName;
  }
};

export const PremiumCountrySelector: React.FC<PremiumCountrySelectorProps> = ({
  selectedCountry,
  onCountrySelect,
  countries = DEFAULT_COUNTRIES,
  searchPlaceholder,
  testID,
}) => {
  const { t, i18n: i18nInstance } = useTranslation('onboarding');
  const [searchQuery, setSearchQuery] = useState('');
  const resolvedSearchPlaceholder =
    searchPlaceholder ??
    t('countrySelector.searchPlaceholder', { defaultValue: 'Search countries...' });
  const usesDefaultCountries = countries === DEFAULT_COUNTRIES;

  const displayCountries = useMemo(() => {
    if (!usesDefaultCountries) {
      return countries;
    }
    void i18nInstance.resolvedLanguage;
    return countries.map((country) => ({
      ...country,
      name: resolveLocalizedCountryName(country.code, country.name),
    }));
  }, [countries, usesDefaultCountries, i18nInstance.resolvedLanguage]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayCountries;
    }

    const query = searchQuery.toLowerCase();
    return displayCountries.filter((country) => {
      const fallbackCountry = DEFAULT_COUNTRIES.find((entry) => entry.code === country.code);
      const fallbackName = fallbackCountry?.name.toLowerCase() ?? '';
      return (
        country.name.toLowerCase().includes(query) ||
        fallbackName.includes(query) ||
        country.code.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, displayCountries]);

  const handleCountryPress = (country: Country) => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
      source: `PremiumCountrySelector.select:${country.code}`,
    });
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
          placeholder={resolvedSearchPlaceholder}
          placeholderTextColor={theme.colors.shadow}
          accessibilityLabel={t('countrySelector.searchA11y', {
            defaultValue: 'Search countries',
          })}
          testID={`${testID}-search-input`}
        />
      </View>

      {/* Country list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        testID={`${testID}-scroll-view`}
      >
        {filteredCountries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.Text style={styles.emptyText}>
              {t('countrySelector.empty', { defaultValue: 'No countries found' })}
            </Animated.Text>
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
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `PremiumCountrySelector.pressIn:${country.code}`,
    });
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
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: theme.spacing.sm,
    flexGrow: 1,
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
