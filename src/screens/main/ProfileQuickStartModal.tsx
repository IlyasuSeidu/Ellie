import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { OnboardingData } from '@/contexts/OnboardingContext';

const RYVRO = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.96)',
  panelStrong: 'rgba(13, 34, 48, 0.98)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  quiet: '#5f7484',
  line: 'rgba(191, 231, 255, 0.18)',
  lineStrong: 'rgba(32, 244, 220, 0.34)',
} as const;

const COUNTRY_OPTIONS = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'New Zealand', value: 'NZ' },
] as const;

export interface ProfileQuickStartValues {
  name: string;
  occupation: string;
  company: string;
  country: string;
}

interface ProfileQuickStartModalProps {
  visible: boolean;
  initialData: Pick<OnboardingData, 'name' | 'occupation' | 'company' | 'country'>;
  onSave: (values: ProfileQuickStartValues) => Promise<void> | void;
  onDismiss: () => Promise<void> | void;
  mode?: 'setup' | 'edit';
}

function normalizeCountry(value: string): string {
  return value.trim().toUpperCase();
}

export const ProfileQuickStartModal: React.FC<ProfileQuickStartModalProps> = ({
  visible,
  initialData,
  onSave,
  onDismiss,
  mode = 'setup',
}) => {
  const [name, setName] = useState(initialData.name?.trim() ?? '');
  const [occupation, setOccupation] = useState(initialData.occupation?.trim() ?? '');
  const [company, setCompany] = useState(initialData.company?.trim() ?? '');
  const [country, setCountry] = useState(normalizeCountry(initialData.country ?? 'US'));
  const [customCountry, setCustomCountry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initialData.name?.trim() ?? '');
    setOccupation(initialData.occupation?.trim() ?? '');
    setCompany(initialData.company?.trim() ?? '');
    const initialCountry = normalizeCountry(initialData.country ?? 'US');
    const isKnown = COUNTRY_OPTIONS.some((option) => option.value === initialCountry);
    setCountry(isKnown ? initialCountry : 'OTHER');
    setCustomCountry(isKnown ? '' : initialCountry);
    setHasTriedSubmit(false);
    setSaveError(null);
  }, [initialData.company, initialData.country, initialData.name, initialData.occupation, visible]);

  const finalCountry = country === 'OTHER' ? normalizeCountry(customCountry) : country;
  const isCustomCountryValid = country !== 'OTHER' || /^[A-Z]{2}$/.test(finalCountry);
  const isFormValid =
    name.trim().length >= 2 &&
    occupation.trim().length >= 2 &&
    company.trim().length >= 2 &&
    finalCountry.length === 2 &&
    isCustomCountryValid;

  const selectedCountryLabel = useMemo(() => {
    if (country === 'OTHER') return finalCountry || 'Other country';
    return COUNTRY_OPTIONS.find((option) => option.value === country)?.label ?? country;
  }, [country, finalCountry]);
  const isEditMode = mode === 'edit';

  const handleSave = async () => {
    setHasTriedSubmit(true);
    setSaveError(null);
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        occupation: occupation.trim(),
        company: company.trim(),
        country: finalCountry,
      });
    } catch {
      setSaveError('Ryvro could not save your details. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDismiss = async () => {
    if (isSaving) return;
    await onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          testID="profile-modal-backdrop"
        />
        <Animated.View entering={FadeIn.duration(180)} style={styles.glowCyan} />
        <Animated.View entering={FadeIn.duration(220)} style={styles.glowBlue} />

        <Animated.View entering={FadeInDown.duration(360)} style={styles.sheet}>
          <LinearGradient
            colors={[RYVRO.panelStrong, RYVRO.panel, 'rgba(2, 7, 11, 0.98)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.handle} />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.iconWrap}>
              <LinearGradient colors={[RYVRO.cyan, RYVRO.blue]} style={styles.iconGradient}>
                <Ionicons name="person" size={30} color={RYVRO.void} />
              </LinearGradient>
            </View>

            <Text style={styles.eyebrow}>
              {isEditMode ? 'Your Ryvro details' : 'Personalize Ryvro'}
            </Text>
            <Text style={styles.title}>
              {isEditMode ? 'Edit how Ryvro knows you.' : 'Let Ryvro speak to you by name.'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode
                ? 'Ryvro uses these details in answers, settings, and your synced profile.'
                : 'These details help answers feel like they were made for your actual shift life.'}
            </Text>

            <View style={styles.previewCard}>
              <View style={styles.previewBadge}>
                <Ionicons name="sparkles" size={15} color={RYVRO.cyan} />
                <Text style={styles.previewBadgeText}>Ryvro will say</Text>
              </View>
              <Text style={styles.previewText}>
                {name.trim() || 'Ama'}, you’re on Day shift today.
              </Text>
              <Text style={styles.previewMeta}>
                {occupation.trim() || 'Shift worker'} · {company.trim() || 'Your workplace'} ·{' '}
                {selectedCountryLabel}
              </Text>
            </View>

            <ProfileField
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="Ilyasu Seidu"
              autoCapitalize="words"
              testID="profile-name-input"
              showError={hasTriedSubmit && name.trim().length < 2}
              errorText="Enter your name."
            />

            <ProfileField
              label="Job title"
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Nurse, security officer, plant operator"
              autoCapitalize="words"
              testID="profile-job-input"
              showError={hasTriedSubmit && occupation.trim().length < 2}
              errorText="Enter your job title."
            />

            <ProfileField
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Where you work"
              autoCapitalize="words"
              testID="profile-company-input"
              showError={hasTriedSubmit && company.trim().length < 2}
              errorText="Enter your company."
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Work country</Text>
              <View style={styles.countryGrid}>
                {COUNTRY_OPTIONS.map((option) => {
                  const selected = country === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setCountry(option.value)}
                      style={[styles.countryChip, selected && styles.countryChipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      testID={`profile-country-${option.value}`}
                    >
                      <Text style={[styles.countryText, selected && styles.countryTextSelected]}>
                        {option.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={18} color={RYVRO.cyan} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setCountry('OTHER')}
                  style={[styles.countryChip, country === 'OTHER' && styles.countryChipSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: country === 'OTHER' }}
                  testID="profile-country-other"
                >
                  <Text
                    style={[styles.countryText, country === 'OTHER' && styles.countryTextSelected]}
                  >
                    Other
                  </Text>
                  {country === 'OTHER' ? (
                    <Ionicons name="checkmark-circle" size={18} color={RYVRO.cyan} />
                  ) : null}
                </TouchableOpacity>
              </View>

              {country === 'OTHER' ? (
                <View style={styles.customCountryWrap}>
                  <Text style={styles.customCountryHelp}>Use a two-letter country code.</Text>
                  <TextInput
                    value={customCountry}
                    onChangeText={(value) => setCustomCountry(value.slice(0, 2).toUpperCase())}
                    placeholder="GH"
                    placeholderTextColor={RYVRO.quiet}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={2}
                    style={styles.input}
                    testID="profile-country-custom-input"
                  />
                  {hasTriedSubmit && !isCustomCountryValid ? (
                    <Text style={styles.errorText}>Enter a two-letter country code.</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            {saveError ? (
              <View style={styles.saveErrorBox} testID="profile-save-error">
                <Ionicons name="alert-circle" size={18} color="#ff8a80" />
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.86}
              style={[styles.saveButton, (!isFormValid || isSaving) && styles.saveButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save my details"
              disabled={isSaving}
              testID="profile-save-button"
            >
              <LinearGradient colors={[RYVRO.cyan, RYVRO.blue]} style={styles.saveGradient}>
                <Text style={styles.saveText}>
                  {isSaving ? 'Saving...' : isEditMode ? 'Save changes' : 'Save my details'}
                </Text>
                <Ionicons name="arrow-forward-circle" size={28} color={RYVRO.void} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.laterButton}
              accessibilityRole="button"
              accessibilityLabel={isEditMode ? 'Cancel editing' : 'Not now'}
              testID="profile-dismiss-button"
            >
              <Text style={styles.laterText}>{isEditMode ? 'Cancel' : 'Not now'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters';
  testID: string;
  showError: boolean;
  errorText: string;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  testID,
  showError,
  errorText,
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={RYVRO.quiet}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      returnKeyType="next"
      style={[styles.input, showError && styles.inputError]}
      testID={testID}
    />
    {showError ? <Text style={styles.errorText}>{errorText}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 2, 4, 0.72)',
  },
  glowCyan: {
    position: 'absolute',
    top: 90,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  glowBlue: {
    position: 'absolute',
    right: -90,
    bottom: 210,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(20, 124, 255, 0.18)',
  },
  sheet: {
    maxHeight: '92%',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RYVRO.line,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: 'rgba(214, 231, 242, 0.28)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 18,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 6,
    borderWidth: 1,
    borderColor: RYVRO.lineStrong,
    backgroundColor: 'rgba(32, 244, 220, 0.08)',
  },
  iconGradient: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginTop: 14,
    color: RYVRO.cyan,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    color: RYVRO.silver,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: RYVRO.muted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  previewCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 7, 11, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  previewBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
  },
  previewBadgeText: {
    color: RYVRO.cyan,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewText: {
    marginTop: 12,
    color: RYVRO.silver,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  previewMeta: {
    marginTop: 8,
    color: RYVRO.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  fieldGroup: {
    marginTop: 16,
  },
  label: {
    color: RYVRO.silver,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    color: RYVRO.silver,
    fontSize: 16,
    fontWeight: '800',
    backgroundColor: 'rgba(13, 34, 48, 0.72)',
    borderWidth: 1,
    borderColor: RYVRO.line,
  },
  inputError: {
    borderColor: 'rgba(255, 138, 128, 0.72)',
  },
  errorText: {
    marginTop: 7,
    color: '#ff8a80',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryChip: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(13, 34, 48, 0.72)',
    borderWidth: 1,
    borderColor: RYVRO.line,
  },
  countryChipSelected: {
    borderColor: RYVRO.lineStrong,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
  },
  countryText: {
    color: RYVRO.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  countryTextSelected: {
    color: RYVRO.silver,
  },
  customCountryWrap: {
    marginTop: 10,
  },
  customCountryHelp: {
    color: RYVRO.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    marginBottom: 7,
  },
  actions: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: RYVRO.line,
    backgroundColor: 'rgba(2, 7, 11, 0.82)',
  },
  saveButton: {
    minHeight: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: RYVRO.cyan,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.62,
  },
  saveGradient: {
    minHeight: 60,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  saveText: {
    color: RYVRO.void,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  laterButton: {
    alignSelf: 'center',
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    color: RYVRO.muted,
    fontSize: 15,
    fontWeight: '900',
  },
  saveErrorBox: {
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 138, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 128, 0.28)',
  },
  saveErrorText: {
    flex: 1,
    color: '#ffd0cc',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
});
