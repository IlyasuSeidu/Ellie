/**
 * useProfileData Hook
 *
 * Encapsulates all profile data management: reading from OnboardingContext,
 * edit mode state, field updates, save/cancel, avatar changes, and computed
 * display values for the Profile screen.
 */

import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useOnboarding, type OnboardingData } from '@/contexts/OnboardingContext';
import { buildShiftCycle } from '@/utils/shiftUtils';
import type { ShiftCycle } from '@/types';
import {
  getPatternDisplayName,
  getShiftSystemDisplayName,
  getRosterTypeDisplayName,
  getCycleLengthDays,
  getWorkRestRatio,
} from '@/utils/profileUtils';
import { getSettingsErrorMessage } from '@/utils/settingsErrorMessage';

export interface UseProfileDataReturn {
  /** Current onboarding data */
  data: OnboardingData;
  /** Computed shift cycle (or null if incomplete) */
  shiftCycle: ShiftCycle | null;

  /** Whether edit mode is active */
  isEditing: boolean;
  /** Whether a personal-info save is currently in flight */
  isSaving: boolean;
  /** Local edited fields (not yet saved) */
  editedFields: Partial<OnboardingData>;

  /** Enter edit mode — copies current data to editedFields */
  startEditing: () => void;
  /** Exit edit mode — discards changes */
  cancelEditing: () => void;
  /** Update a single field in editedFields */
  updateField: (field: keyof OnboardingData, value: string) => void;
  /** Save editedFields to context + AsyncStorage */
  saveChanges: () => Promise<void>;
  /** Update avatar immediately (no edit mode needed) */
  handleAvatarChange: (uri: string | null) => Promise<void>;
  /** Bulk update any onboarding fields immediately (used by ShiftSettingsPanel) */
  updateData: (updates: Partial<OnboardingData>) => void;
  /** Bulk update any onboarding fields and await persistence */
  updateDataAsync: (updates: Partial<OnboardingData>) => Promise<void>;

  /** Human-readable pattern name */
  patternDisplayName: string;
  /** Human-readable shift system name */
  shiftSystemName: string;
  /** Human-readable roster type name */
  rosterTypeName: string;
  /** Cycle length text (e.g., "21") or null */
  cycleLengthDays: number | null;
  /** Cycle length text for display (e.g., "21") */
  cycleLengthText: string;
  /** Work:rest ratio string (e.g., "2:1") */
  workRestRatio: string;
}

export function useProfileData(): UseProfileDataReturn {
  const { data, updateData, updateDataAsync } = useOnboarding();
  const { t } = useTranslation('common');

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Partial<OnboardingData>>({});

  // Build shift cycle from onboarding data
  const shiftCycle = useMemo(() => buildShiftCycle(data), [data]);

  // Computed display values
  const patternDisplayName = useMemo(() => getPatternDisplayName(data), [data]);
  const shiftSystemName = useMemo(
    () => getShiftSystemDisplayName(data.shiftSystem),
    [data.shiftSystem]
  );
  const rosterTypeName = useMemo(
    () => getRosterTypeDisplayName(data.rosterType),
    [data.rosterType]
  );
  const cycleLengthDays = useMemo(() => getCycleLengthDays(data), [data]);
  const cycleLengthText = useMemo(
    () => (cycleLengthDays !== null ? String(cycleLengthDays) : '-'),
    [cycleLengthDays]
  );
  const workRestRatio = useMemo(() => getWorkRestRatio(data), [data]);

  const startEditing = useCallback(() => {
    setEditedFields({
      name: data.name,
      occupation: data.occupation,
      company: data.company,
      country: data.country,
    });
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [data.name, data.occupation, data.company, data.country]);

  const cancelEditing = useCallback(() => {
    setEditedFields({});
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateField = useCallback((field: keyof OnboardingData, value: string) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveChanges = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await updateDataAsync(editedFields);
      setEditedFields({});
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('errors.titles.error', { defaultValue: 'Error' }),
        getSettingsErrorMessage(error, 'profileSave')
      );
    } finally {
      setIsSaving(false);
    }
  }, [editedFields, isSaving, updateDataAsync, t]);

  const handleAvatarChange = useCallback(
    async (uri: string | null) => {
      try {
        await updateDataAsync({ avatarUri: uri ?? undefined });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          t('errors.titles.error', { defaultValue: 'Error' }),
          getSettingsErrorMessage(error, 'profileSave')
        );
      }
    },
    [updateDataAsync, t]
  );

  return {
    data,
    shiftCycle,
    isEditing,
    isSaving,
    editedFields,
    startEditing,
    cancelEditing,
    updateField,
    saveChanges,
    handleAvatarChange,
    updateData,
    updateDataAsync,
    patternDisplayName,
    shiftSystemName,
    rosterTypeName,
    cycleLengthDays,
    cycleLengthText,
    workRestRatio,
  };
}
