/**
 * useProfileData Hook
 *
 * Encapsulates all profile data management: reading from OnboardingContext,
 * edit mode state, field updates, save/cancel, avatar changes, and computed
 * display values for the Profile screen.
 */

import { useState, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
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

export interface UseProfileDataReturn {
  /** Current onboarding data */
  data: OnboardingData;
  /** Computed shift cycle (or null if incomplete) */
  shiftCycle: ShiftCycle | null;

  /** Whether edit mode is active */
  isEditing: boolean;
  /** Local edited fields (not yet saved) */
  editedFields: Partial<OnboardingData>;

  /** Enter edit mode — copies current data to editedFields */
  startEditing: () => void;
  /** Exit edit mode — discards changes */
  cancelEditing: () => void;
  /** Update a single field in editedFields */
  updateField: (field: keyof OnboardingData, value: string) => void;
  /** Save editedFields to context + AsyncStorage */
  saveChanges: () => void;
  /** Update avatar immediately (no edit mode needed) */
  handleAvatarChange: (uri: string | null) => void;
  /** Bulk update any onboarding fields immediately (used by ShiftSettingsPanel) */
  updateData: (updates: Partial<OnboardingData>) => void;

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
  const { data, updateData } = useOnboarding();

  const [isEditing, setIsEditing] = useState(false);
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

  const saveChanges = useCallback(() => {
    updateData(editedFields);
    setEditedFields({});
    setIsEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editedFields, updateData]);

  const handleAvatarChange = useCallback(
    (uri: string | null) => {
      updateData({ avatarUri: uri ?? undefined });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [updateData]
  );

  return {
    data,
    shiftCycle,
    isEditing,
    editedFields,
    startEditing,
    cancelEditing,
    updateField,
    saveChanges,
    handleAvatarChange,
    updateData,
    patternDisplayName,
    shiftSystemName,
    rosterTypeName,
    cycleLengthDays,
    cycleLengthText,
    workRestRatio,
  };
}
