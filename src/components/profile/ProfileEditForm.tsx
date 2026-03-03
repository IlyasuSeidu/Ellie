/**
 * ProfileEditForm Component
 *
 * Displays personal information fields in read-only or edit mode.
 * Read-only mode shows a clean card with label/value rows.
 * Edit mode transitions to PremiumTextInput fields with save/cancel buttons.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { PremiumTextInput } from '@/components/onboarding/premium/PremiumTextInput';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { PremiumCountrySelectorModal } from '@/components/onboarding/premium/PremiumCountrySelectorModal';
import type { Country } from '@/components/onboarding/premium/PremiumCountrySelector';
import type { OnboardingData } from '@/contexts/OnboardingContext';

interface ProfileEditFormProps {
  name: string;
  occupation: string;
  company: string;
  country: string;
  isEditing: boolean;
  onFieldChange: (field: keyof OnboardingData, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  animationDelay?: number;
}

interface FieldConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}

export const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  name,
  occupation,
  company,
  country,
  isEditing,
  onFieldChange,
  onSave,
  onCancel,
  animationDelay = 0,
}) => {
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const saveDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editOpacity = useSharedValue(isEditing ? 1 : 0);
  const editTranslateY = useSharedValue(isEditing ? 0 : 12);
  const readOpacity = useSharedValue(isEditing ? 0 : 1);
  const readTranslateY = useSharedValue(isEditing ? -8 : 0);
  const saveFlashProgress = useSharedValue(0);

  useEffect(() => {
    if (isEditing) {
      editOpacity.value = withTiming(1, { duration: 300 });
      editTranslateY.value = withTiming(0, { duration: 300 });
      readOpacity.value = withTiming(0, { duration: 300 });
      readTranslateY.value = withTiming(-8, { duration: 300 });
      return;
    }

    editOpacity.value = withTiming(0, { duration: 300 });
    editTranslateY.value = withTiming(12, { duration: 300 });
    readOpacity.value = withTiming(1, { duration: 300 });
    readTranslateY.value = withTiming(0, { duration: 300 });
  }, [isEditing, editOpacity, editTranslateY, readOpacity, readTranslateY]);

  useEffect(() => {
    return () => {
      if (saveDelayTimeoutRef.current) {
        clearTimeout(saveDelayTimeoutRef.current);
      }
    };
  }, []);

  const editModeAnimStyle = useAnimatedStyle(() => ({
    opacity: editOpacity.value,
    transform: [{ translateY: editTranslateY.value }],
  }));

  const readModeAnimStyle = useAnimatedStyle(() => ({
    opacity: readOpacity.value,
    transform: [{ translateY: readTranslateY.value }],
  }));

  const saveFlashStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(180, 83, 9, ${0.15 + saveFlashProgress.value * 0.35})`,
  }));

  const fields: FieldConfig[] = [
    { key: 'name', label: 'Name', icon: 'person-outline', value: name },
    { key: 'occupation', label: 'Occupation', icon: 'briefcase-outline', value: occupation },
    { key: 'company', label: 'Company', icon: 'business-outline', value: company },
    { key: 'country', label: 'Country', icon: 'flag-outline', value: country },
  ];

  const handleCountrySelect = useCallback(
    (selected: Country) => {
      onFieldChange('country', selected.name);
    },
    [onFieldChange]
  );

  const handleSavePress = useCallback(() => {
    saveFlashProgress.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );

    if (saveDelayTimeoutRef.current) {
      clearTimeout(saveDelayTimeoutRef.current);
    }

    saveDelayTimeoutRef.current = setTimeout(() => {
      onSave();
    }, 320);
  }, [onSave, saveFlashProgress]);

  // Find matching country for the modal
  const selectedCountryObj: Country | null = country ? { code: '', name: country, flag: '' } : null;

  if (isEditing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <Animated.View
          entering={FadeInUp.delay(animationDelay).duration(300)}
          style={[styles.card, editModeAnimStyle, saveFlashStyle]}
        >
          <PremiumTextInput
            label="Name"
            value={name}
            onChangeText={(text) => onFieldChange('name', text)}
            leftIcon={<Ionicons name="person-outline" size={18} color={theme.colors.shadow} />}
            containerStyle={styles.inputSpacing}
          />
          <PremiumTextInput
            label="Occupation"
            value={occupation}
            onChangeText={(text) => onFieldChange('occupation', text)}
            leftIcon={<Ionicons name="briefcase-outline" size={18} color={theme.colors.shadow} />}
            containerStyle={styles.inputSpacing}
          />
          <PremiumTextInput
            label="Company"
            value={company}
            onChangeText={(text) => onFieldChange('company', text)}
            leftIcon={<Ionicons name="business-outline" size={18} color={theme.colors.shadow} />}
            containerStyle={styles.inputSpacing}
          />

          {/* Country field — opens modal */}
          <TouchableOpacity
            onPress={() => setCountryModalVisible(true)}
            style={styles.countryTrigger}
            activeOpacity={0.7}
          >
            <View style={styles.countryTriggerInner}>
              <Ionicons name="flag-outline" size={18} color={theme.colors.shadow} />
              <View style={styles.countryTextContainer}>
                <Animated.Text style={styles.countryLabel}>Country</Animated.Text>
                <Animated.Text style={styles.countryValue}>
                  {country || 'Select country'}
                </Animated.Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.shadow} />
            </View>
          </TouchableOpacity>

          {/* Save / Cancel */}
          <View style={styles.buttonRow}>
            <PremiumButton
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              size="small"
              style={styles.buttonHalf}
            />
            <PremiumButton
              title="Save Changes"
              onPress={handleSavePress}
              variant="primary"
              size="small"
              style={styles.buttonHalf}
            />
          </View>

          <PremiumCountrySelectorModal
            visible={countryModalVisible}
            onSelect={handleCountrySelect}
            onClose={() => setCountryModalVisible(false)}
            selectedCountry={selectedCountryObj}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // Read-only mode
  return (
    <Animated.View
      entering={FadeInUp.delay(animationDelay).duration(400)}
      style={[styles.wrapper, styles.card, readModeAnimStyle]}
    >
      {fields.map((field, index) => (
        <Animated.View
          key={field.key}
          entering={FadeInUp.delay(animationDelay + index * 80).duration(350)}
        >
          <View style={styles.fieldRow}>
            <View style={styles.fieldLeft}>
              <Ionicons
                name={field.icon}
                size={18}
                color={theme.colors.shadow}
                style={styles.fieldIcon}
              />
              <Animated.Text style={styles.fieldLabel}>{field.label}</Animated.Text>
            </View>
            <Animated.Text style={styles.fieldValue} numberOfLines={1}>
              {field.value || 'Not set'}
            </Animated.Text>
          </View>
          {index < fields.length - 1 && <View style={styles.divider} />}
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
    overflow: 'hidden',
  },

  // Read-only field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldIcon: {
    marginRight: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
  },

  // Edit mode
  inputSpacing: {
    marginBottom: theme.spacing.sm,
  },
  countryTrigger: {
    marginBottom: theme.spacing.md,
  },
  countryTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  countryTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  countryLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginBottom: 2,
  },
  countryValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
});
