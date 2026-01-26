/**
 * PremiumCountrySelectorModal Component
 *
 * Modal wrapper for PremiumCountrySelector component
 */

import React from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme } from '@/utils/theme';
import { PremiumCountrySelector, Country } from './PremiumCountrySelector';

export interface PremiumCountrySelectorModalProps {
  /** Modal visibility */
  visible: boolean;
  /** Country selection handler */
  onSelect: (country: Country) => void;
  /** Close modal handler */
  onClose: () => void;
  /** Currently selected country */
  selectedCountry: Country | null;
  /** Test ID */
  testID?: string;
}

export const PremiumCountrySelectorModal: React.FC<PremiumCountrySelectorModalProps> = ({
  visible,
  onSelect,
  onClose,
  selectedCountry,
  testID = 'premium-country-selector-modal',
}) => {
  const handleSelect = (country: Country) => {
    onSelect(country);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          testID={`${testID}-backdrop`}
        />

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Animated.Text style={styles.headerTitle}>Select Country</Animated.Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              testID={`${testID}-close-button`}
            >
              <Animated.Text style={styles.closeIcon}>✕</Animated.Text>
            </TouchableOpacity>
          </View>

          {/* Country Selector */}
          <View style={styles.selectorWrapper}>
            <PremiumCountrySelector
              selectedCountry={selectedCountry?.code}
              onCountrySelect={handleSelect}
              testID={`${testID}-selector`}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    height: '80%',
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
    backgroundColor: theme.colors.deepVoid,
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: theme.typography.fontSizes.xl,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.bold,
  },
  selectorWrapper: {
    flex: 1,
    padding: theme.spacing.md,
  },
});
