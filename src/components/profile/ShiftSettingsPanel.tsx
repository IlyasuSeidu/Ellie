/**
 * ShiftSettingsPanel — "Shift Command Center"
 *
 * Replaces the read-only ShiftConfigCard with a fully interactive premium
 * panel. Features:
 *   • Gradient header that changes colour by system / roster type
 *   • Read mode: coloured Ionicon rows, gold pill badges, tap-to-edit button
 *   • Edit mode: animated PillToggle (system / roster), tappable pattern row
 *     → PatternSelectorSheet, TimePickerModal for shift times, inline
 *     PatternBuilderSliders for FIFO blocks and custom patterns, site-name
 *     input, haptic feedback throughout
 *   • All changes buffered locally until Save is tapped
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ShiftPattern, type FIFOConfig, type ShiftType } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { getContrastTextColor, hexToRGBA } from '@/utils/styleUtils';
import {
  getPatternDisplayName,
  getShiftSystemDisplayName,
  getRosterTypeDisplayName,
  formatShiftTime,
} from '@/utils/profileUtils';
import { getDefaultFIFOConfig, getShiftPattern } from '@/utils/shiftUtils';
import { TimePickerModal } from '@/components/onboarding/premium/TimePickerModal';
import { PatternBuilderSlider } from '@/components/onboarding/premium/PatternBuilderSlider';
import { PremiumTextInput } from '@/components/onboarding/premium/PremiumTextInput';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useShiftAccent } from '@/hooks/useShiftAccent';
import { PatternSelectorSheet } from './PatternSelectorSheet';
import { StartDatePickerSheet } from './StartDatePickerSheet';
import { CycleResyncSheet } from './CycleResyncSheet';

// ── Constants ─────────────────────────────────────────────────────────────────

const FIFO_PATTERN_SET = new Set<ShiftPattern>([
  ShiftPattern.FIFO_7_7,
  ShiftPattern.FIFO_8_6,
  ShiftPattern.FIFO_14_14,
  ShiftPattern.FIFO_14_7,
  ShiftPattern.FIFO_21_7,
  ShiftPattern.FIFO_28_14,
  ShiftPattern.FIFO_CUSTOM,
]);

const THREE_SHIFT_COMPATIBLE = new Set<ShiftPattern>([
  ShiftPattern.STANDARD_3_3_3,
  ShiftPattern.STANDARD_4_4_4,
  ShiftPattern.STANDARD_5_5_5,
  ShiftPattern.STANDARD_7_7_7,
  ShiftPattern.CONTINENTAL,
  ShiftPattern.CUSTOM,
]);

function isFIFOPattern(p?: ShiftPattern): boolean {
  return p !== null && p !== undefined && FIFO_PATTERN_SET.has(p);
}

function getHeaderGradient(shiftSystem?: string, rosterType?: string): readonly [string, string] {
  if (rosterType === 'fifo') return ['#1B5E20', '#1565C0'] as const;
  if (shiftSystem === '3-shift') return ['#E65100', '#F57F17'] as const;
  return ['#1565C0', '#7B1FA2'] as const;
}

const LIVE_HEADER_GRADIENT_BY_SHIFT: Record<ShiftType, readonly [string, string]> = {
  day: ['#2196F3', '#1565C0'],
  night: ['#7C4DFF', '#4A148C'],
  morning: ['#F59E0B', '#D97706'],
  afternoon: ['#06B6D4', '#0E7490'],
  off: ['#57534e', '#44403c'],
};

type TimeTarget = {
  shiftKey: 'dayShift' | 'nightShift' | 'morningShift' | 'afternoonShift' | 'nightShift3';
  field: 'startTime' | 'endTime';
  label: string;
};

type FIFOWorkPattern = 'straight-days' | 'straight-nights' | 'swing' | 'custom';

const FIFO_WORK_PATTERN_LABELS: Record<FIFOWorkPattern, string> = {
  'straight-days': 'Straight Days',
  'straight-nights': 'Nights',
  swing: 'Swing',
  custom: 'Custom',
};

const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  day: 'Day',
  night: 'Night',
  morning: 'Morning',
  afternoon: 'Afternoon',
  off: 'Off',
};

const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  day: '#2196F3',
  night: '#9C27B0',
  morning: '#F59E0B',
  afternoon: '#06B6D4',
  off: '#4CAF50',
};

const DEFAULT_CUSTOM_SEQUENCE: ShiftType[] = ['day', 'day', 'night', 'night', 'off', 'off', 'off'];

// ── Module-level helpers ───────────────────────────────────────────────────────

function parseStartDateValue(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const parsed = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatStartDate(date: Date | string | undefined): string {
  const d = parseStartDateValue(date);
  if (!d) return 'Not set';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSelectableStartDate(date: Date | string | undefined): Date {
  return parseStartDateValue(date) ?? new Date();
}

function getRotatingPhaseLengths(data: OnboardingData): Array<{ label: string; days: number }> {
  const is3 = data.shiftSystem === '3-shift';

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    const day = data.customPattern.daysOn;
    const night = data.customPattern.nightsOn;
    const off = data.customPattern.daysOff;
    const morning = data.customPattern.morningOn ?? day;
    const afternoon = data.customPattern.afternoonOn ?? day;
    const night3 = data.customPattern.nightOn ?? night;

    return is3
      ? [
          { label: 'Morning Shift', days: morning },
          { label: 'Afternoon Shift', days: afternoon },
          { label: 'Night Shift', days: night3 },
          { label: 'Off', days: off },
        ]
      : [
          { label: 'Day Shift', days: day },
          { label: 'Night Shift', days: night },
          { label: 'Off', days: off },
        ];
  }

  if (!data.patternType) return [];
  const pattern = getShiftPattern(data.patternType);
  const config = pattern?.config;
  if (!config) return [];

  if (is3) {
    const hasExplicitThreeShift =
      (config.morningOn ?? 0) > 0 || (config.afternoonOn ?? 0) > 0 || (config.nightOn ?? 0) > 0;
    const morning = hasExplicitThreeShift ? (config.morningOn ?? 0) : (config.daysOn ?? 0);
    const afternoon = hasExplicitThreeShift ? (config.afternoonOn ?? 0) : (config.daysOn ?? 0);
    const night = hasExplicitThreeShift ? (config.nightOn ?? 0) : (config.nightsOn ?? 0);

    return [
      { label: 'Morning Shift', days: morning },
      { label: 'Afternoon Shift', days: afternoon },
      { label: 'Night Shift', days: night },
      { label: 'Off', days: config.daysOff ?? 0 },
    ];
  }

  return [
    { label: 'Day Shift', days: config.daysOn ?? 0 },
    { label: 'Night Shift', days: config.nightsOn ?? 0 },
    { label: 'Off', days: config.daysOff ?? 0 },
  ];
}

function getCyclePositionLabel(data: OnboardingData): string | null {
  const { phaseOffset, patternType, rosterType, shiftSystem, fifoConfig } = data;
  if (phaseOffset === null || phaseOffset === undefined || !patternType) return null;

  if (rosterType === 'fifo' || isFIFOPattern(patternType)) {
    const defaultConfig = getDefaultFIFOConfig(patternType);
    const workBlockDays = fifoConfig?.workBlockDays ?? defaultConfig?.workBlockDays ?? 0;
    const restBlockDays = fifoConfig?.restBlockDays ?? defaultConfig?.restBlockDays ?? 0;
    const cycleLength = workBlockDays + restBlockDays;

    if (cycleLength <= 0) {
      return `Day ${phaseOffset + 1} of cycle`;
    }

    const normalizedOffset = ((phaseOffset % cycleLength) + cycleLength) % cycleLength;
    if (normalizedOffset < workBlockDays) {
      return `Work Block · Day ${normalizedOffset + 1} of ${workBlockDays}`;
    }
    const restDay = normalizedOffset - workBlockDays + 1;
    return `Rest Block · Day ${restDay} of ${restBlockDays}`;
  }

  const phases = getRotatingPhaseLengths({ ...data, shiftSystem });
  const validPhases = phases.filter((phase) => phase.days > 0);
  const cycleLength = validPhases.reduce((acc, phase) => acc + phase.days, 0);
  if (cycleLength <= 0) return `Day ${phaseOffset + 1} of cycle`;
  const normalizedOffset = ((phaseOffset % cycleLength) + cycleLength) % cycleLength;

  let cumulative = 0;
  for (const phase of validPhases) {
    if (normalizedOffset < cumulative + phase.days) {
      const dayInPhase = normalizedOffset - cumulative + 1;
      return `${phase.label} · Day ${dayInPhase} of ${phase.days}`;
    }
    cumulative += phase.days;
  }

  return `Day ${normalizedOffset + 1} of cycle`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ShiftSettingsPanelProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onOpenPatternOnboarding?: (seed: Partial<OnboardingData>) => void;
  onOpenStartDateOnboarding?: (seed: Partial<OnboardingData>) => void;
  onOpenShiftTimeOnboarding?: (
    seed: Partial<OnboardingData>,
    initialShiftType?: 'day' | 'night' | 'morning' | 'afternoon'
  ) => void;
  animationDelay?: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export const ShiftSettingsPanel: React.FC<ShiftSettingsPanelProps> = ({
  data,
  onUpdate,
  onOpenPatternOnboarding,
  onOpenStartDateOnboarding,
  onOpenShiftTimeOnboarding,
  animationDelay = 0,
}) => {
  const { shiftType: activeAccentShiftType } = useShiftAccent();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localData, setLocalData] = useState<Partial<OnboardingData>>({});
  const [patternSheetVisible, setPatternSheetVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<TimeTarget | null>(null);
  const [autoResetNotice, setAutoResetNotice] = useState<string | null>(null);
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [resyncSheetVisible, setResyncSheetVisible] = useState(false);

  // The data we're displaying / editing — localData shadows data during edit
  const d = isEditing ? { ...data, ...localData } : data;
  const editShiftSystem = d.shiftSystem;
  const editRosterType = d.rosterType;
  const editPatternType = d.patternType;
  const editCustomPattern = d.customPattern;
  const editFIFOConfig = d.fifoConfig;
  const editShiftTimes = d.shiftTimes;
  const editShiftStartTime = d.shiftStartTime;
  const editShiftEndTime = d.shiftEndTime;
  const editShiftDuration = d.shiftDuration;
  const editShiftType = d.shiftType;
  const editIsCustomShiftTime = d.isCustomShiftTime;
  const editStartDate = d.startDate;
  const editPhaseOffset = d.phaseOffset;

  const systemIndex = d.shiftSystem === '3-shift' ? 1 : 0;
  const rosterIndex = d.rosterType === 'fifo' ? 1 : 0;

  // ── Save-button pulse when there are pending changes ───────────────────────
  const saveButtonGlow = useSharedValue(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges =
    isEditing &&
    Object.keys(localData).some(
      (k) =>
        JSON.stringify(localData[k as keyof OnboardingData]) !==
        JSON.stringify(data[k as keyof OnboardingData])
    );

  useEffect(() => {
    if (hasChanges) {
      saveButtonGlow.value = withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
        -1,
        true
      );
    } else {
      saveButtonGlow.value = withTiming(0, { duration: 300 });
    }
  }, [hasChanges, saveButtonGlow]);

  const saveGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: saveButtonGlow.value * 0.5,
    shadowRadius: 12 + saveButtonGlow.value * 8,
  }));

  // ── Enter edit mode ────────────────────────────────────────────────────────
  const handleStartEditing = useCallback(() => {
    setLocalData({
      shiftSystem: data.shiftSystem,
      rosterType: data.rosterType,
      patternType: data.patternType,
      customPattern: data.customPattern ? { ...data.customPattern } : undefined,
      fifoConfig: data.fifoConfig ? { ...data.fifoConfig } : undefined,
      shiftTimes: data.shiftTimes ? { ...data.shiftTimes } : undefined,
      startDate: data.startDate,
      phaseOffset: data.phaseOffset,
    });
    setIsEditing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [data]);

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    setLocalData({});
    setIsEditing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate(localData);
      setLocalData({});
      setIsEditing(false);
      setIsSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 600);
  }, [localData, onUpdate]);

  // ── System toggle ──────────────────────────────────────────────────────────
  const handleSystemChange = useCallback(
    (index: number) => {
      const newSystem = index === 0 ? '2-shift' : '3-shift';
      const updates: Partial<OnboardingData> = { shiftSystem: newSystem };
      let notice: string | null = null;
      if (newSystem === '3-shift') {
        updates.rosterType = 'rotating';
        const cur = localData.patternType ?? data.patternType;
        if (cur && !THREE_SHIFT_COMPATIBLE.has(cur)) {
          updates.patternType = ShiftPattern.STANDARD_3_3_3;
          notice = 'Pattern reset to 3-3-3 — previous pattern is not compatible with 3-shift.';
        }
      }
      setAutoResetNotice(notice);
      setLocalData((prev) => ({ ...prev, ...updates }));
    },
    [localData.patternType, data.patternType]
  );

  // ── Roster toggle ──────────────────────────────────────────────────────────
  const handleRosterChange = useCallback(
    (index: number) => {
      const newRoster = index === 0 ? 'rotating' : 'fifo';
      const updates: Partial<OnboardingData> = { rosterType: newRoster };
      const cur = localData.patternType ?? data.patternType;
      let notice: string | null = null;
      if (newRoster === 'fifo') {
        if (!isFIFOPattern(cur)) {
          updates.patternType = ShiftPattern.FIFO_8_6;
          notice = 'Pattern changed to 8/6 FIFO — choose a different FIFO pattern above.';
        }
        if (!(localData.fifoConfig ?? data.fifoConfig)) {
          updates.fifoConfig = {
            workBlockDays: 8,
            restBlockDays: 6,
            workBlockPattern: 'straight-days',
          };
        }
      } else {
        if (isFIFOPattern(cur)) {
          updates.patternType = ShiftPattern.STANDARD_3_3_3;
          notice = 'Pattern changed to 3-3-3 Rotation — choose a different rotating pattern above.';
        }
      }
      setAutoResetNotice(notice);
      setLocalData((prev) => ({ ...prev, ...updates }));
    },
    [localData.patternType, localData.fifoConfig, data.patternType, data.fifoConfig]
  );

  // ── Pattern selection from sheet ───────────────────────────────────────────
  const handlePatternSelect = useCallback((pattern: ShiftPattern) => {
    setLocalData((prev) => ({ ...prev, patternType: pattern }));
    setAutoResetNotice(null); // user explicitly chose — clear auto-reset notice
  }, []);

  const handleOpenPatternPicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!onOpenPatternOnboarding) {
      setPatternSheetVisible(true);
      return;
    }

    const seed: Partial<OnboardingData> = {
      shiftSystem: editShiftSystem,
      rosterType: editRosterType,
      patternType: editPatternType,
      customPattern: editCustomPattern,
      fifoConfig: editFIFOConfig,
    };

    // Ensure onboarding screens open with the same active config the user sees in edit mode.
    onUpdate(seed);
    setPatternSheetVisible(false);
    setTimePickerTarget(null);
    setStartDatePickerVisible(false);
    setResyncSheetVisible(false);
    setAutoResetNotice(null);
    setLocalData({});
    setIsEditing(false);
    onOpenPatternOnboarding(seed);
  }, [
    editCustomPattern,
    editFIFOConfig,
    editPatternType,
    editRosterType,
    editShiftSystem,
    onOpenPatternOnboarding,
    onUpdate,
  ]);

  const handleOpenShiftTimePicker = useCallback(
    (target: TimeTarget) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!onOpenShiftTimeOnboarding) {
        setTimePickerTarget(target);
        return;
      }

      const seed: Partial<OnboardingData> = {
        shiftSystem: editShiftSystem,
        rosterType: editRosterType,
        patternType: editPatternType,
        customPattern: editCustomPattern,
        fifoConfig: editFIFOConfig,
        shiftTimes: editShiftTimes,
        shiftStartTime: editShiftStartTime,
        shiftEndTime: editShiftEndTime,
        shiftDuration: editShiftDuration,
        shiftType: editShiftType,
        isCustomShiftTime: editIsCustomShiftTime,
      };

      const initialShiftType =
        target.shiftKey === 'dayShift'
          ? 'day'
          : target.shiftKey === 'nightShift' || target.shiftKey === 'nightShift3'
            ? 'night'
            : target.shiftKey === 'morningShift'
              ? 'morning'
              : target.shiftKey === 'afternoonShift'
                ? 'afternoon'
                : undefined;

      onUpdate(seed);
      setPatternSheetVisible(false);
      setTimePickerTarget(null);
      setStartDatePickerVisible(false);
      setResyncSheetVisible(false);
      setAutoResetNotice(null);
      setLocalData({});
      setIsEditing(false);
      onOpenShiftTimeOnboarding(seed, initialShiftType);
    },
    [
      editCustomPattern,
      editFIFOConfig,
      editIsCustomShiftTime,
      editPatternType,
      editRosterType,
      editShiftDuration,
      editShiftEndTime,
      editShiftStartTime,
      editShiftSystem,
      editShiftTimes,
      editShiftType,
      onOpenShiftTimeOnboarding,
      onUpdate,
    ]
  );

  const handleOpenStartDatePicker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!onOpenStartDateOnboarding) {
      setStartDatePickerVisible(true);
      return;
    }

    const seed: Partial<OnboardingData> = {
      shiftSystem: editShiftSystem,
      rosterType: editRosterType,
      patternType: editPatternType,
      customPattern: editCustomPattern,
      fifoConfig: editFIFOConfig,
      startDate: editStartDate,
      phaseOffset: editPhaseOffset,
    };

    onUpdate(seed);
    setPatternSheetVisible(false);
    setTimePickerTarget(null);
    setStartDatePickerVisible(false);
    setResyncSheetVisible(false);
    setAutoResetNotice(null);
    setLocalData({});
    setIsEditing(false);
    onOpenStartDateOnboarding(seed);
  }, [
    editCustomPattern,
    editFIFOConfig,
    editPatternType,
    editPhaseOffset,
    editRosterType,
    editShiftSystem,
    editStartDate,
    onOpenStartDateOnboarding,
    onUpdate,
  ]);

  // ── Time picker ────────────────────────────────────────────────────────────
  const getTimeValue = useCallback(
    (target: TimeTarget): string => {
      const shiftTimes = (isEditing ? localData.shiftTimes : data.shiftTimes) ?? {};
      const shiftData = shiftTimes[target.shiftKey];
      return (shiftData as Record<string, string> | undefined)?.[target.field] ?? '06:00';
    },
    [isEditing, localData.shiftTimes, data.shiftTimes]
  );

  const handleTimeConfirm = useCallback(
    (time: string) => {
      if (!timePickerTarget) return;
      const { shiftKey, field } = timePickerTarget;
      const THREE_SHIFT_KEYS = new Set(['morningShift', 'afternoonShift', 'nightShift3']);
      setLocalData((prev) => {
        const prevTimes = prev.shiftTimes ?? {};
        const prevShift = (prevTimes[shiftKey] as Record<string, unknown> | undefined) ?? {};
        const update: Record<string, unknown> = { [field]: time };
        // Auto-compute endTime for 3-shift (always 8h duration)
        if (field === 'startTime' && THREE_SHIFT_KEYS.has(shiftKey)) {
          const [h, m] = time.split(':').map(Number);
          const endH = (h + 8) % 24;
          update.endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          update.duration = 8;
        }
        return {
          ...prev,
          shiftTimes: {
            ...prevTimes,
            [shiftKey]: { ...prevShift, ...update },
          },
        };
      });
      setTimePickerTarget(null);
    },
    [timePickerTarget]
  );

  // ── Start date + cycle re-sync ─────────────────────────────────────────────
  const handleStartDateSelect = useCallback((date: Date) => {
    setLocalData((prev) => ({ ...prev, startDate: date, phaseOffset: 0 }));
    setStartDatePickerVisible(false);
    setAutoResetNotice('Cycle position reset — use Re-sync Cycle below to set your current day.');
  }, []);

  const handleResyncConfirm = useCallback((newPhaseOffset: number) => {
    setLocalData((prev) => ({ ...prev, phaseOffset: newPhaseOffset }));
    setResyncSheetVisible(false);
    setAutoResetNotice(null);
  }, []);

  // ── FIFO config helpers ────────────────────────────────────────────────────
  const currentFifoConfig = useMemo<FIFOConfig>(
    () => ({
      workBlockDays: 8,
      restBlockDays: 6,
      workBlockPattern: 'straight-days',
      ...data.fifoConfig,
      ...localData.fifoConfig,
    }),
    [data.fifoConfig, localData.fifoConfig]
  );

  const updateFifoConfig = useCallback(
    (updates: Partial<FIFOConfig>) => {
      setLocalData((prev) => ({
        ...prev,
        fifoConfig: { ...currentFifoConfig, ...updates },
      }));
    },
    [currentFifoConfig]
  );

  const fifoWorkPattern = currentFifoConfig.workBlockPattern;

  // ── Custom pattern helpers ─────────────────────────────────────────────────
  const customPattern = useMemo(
    () => ({
      daysOn: 3,
      nightsOn: 3,
      daysOff: 3,
      ...data.customPattern,
      ...localData.customPattern,
    }),
    [data.customPattern, localData.customPattern]
  );
  const updateCustomPattern = useCallback(
    (updates: Partial<typeof customPattern>) => {
      setLocalData((prev) => ({
        ...prev,
        customPattern: { ...customPattern, ...updates },
      }));
    },
    [customPattern]
  );

  const effectiveShiftSystem = d.shiftSystem ?? '2-shift';
  const effectiveRosterType = d.rosterType ?? 'rotating';
  const effectivePattern = d.patternType;
  const isCustomRotating =
    effectivePattern === ShiftPattern.CUSTOM && effectiveRosterType === 'rotating';
  const isFIFOCustom = effectivePattern === ShiftPattern.FIFO_CUSTOM;
  const isFIFORoster = effectiveRosterType === 'fifo';
  const is3Shift = effectiveShiftSystem === '3-shift';

  const headerGradient = useMemo(() => {
    if (activeAccentShiftType) {
      return LIVE_HEADER_GRADIENT_BY_SHIFT[activeAccentShiftType];
    }
    return getHeaderGradient(effectiveShiftSystem, effectiveRosterType);
  }, [activeAccentShiftType, effectiveShiftSystem, effectiveRosterType]);
  const liveAccentColor = useMemo(
    () =>
      activeAccentShiftType
        ? LIVE_HEADER_GRADIENT_BY_SHIFT[activeAccentShiftType][0]
        : theme.colors.sacredGold,
    [activeAccentShiftType]
  );
  const headerIconBadgeStyle = useMemo(
    () => ({
      borderColor: hexToRGBA(liveAccentColor, 0.68),
      shadowColor: liveAccentColor,
    }),
    [liveAccentColor]
  );
  const liveAccentIconColor = useMemo(
    () => getContrastTextColor(liveAccentColor, theme.colors.paper, theme.colors.deepVoid),
    [liveAccentColor]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      {/* ── Gradient header card ────────────────────────────────────────── */}
      <LinearGradient
        colors={[...headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconCircle, headerIconBadgeStyle]}>
              <Ionicons name="settings-outline" size={18} color={liveAccentIconColor} />
            </View>
            <View>
              <Animated.Text style={styles.headerTitle}>
                {isEditing ? 'Edit Shift Settings' : 'Shift Configuration'}
              </Animated.Text>
              <Animated.Text style={styles.headerSubtitle} numberOfLines={1}>
                {isEditing
                  ? 'Tap save when done'
                  : `${getShiftSystemDisplayName(effectiveShiftSystem)} · ${getRosterTypeDisplayName(effectiveRosterType)}`}
              </Animated.Text>
            </View>
          </View>

          {isEditing ? (
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.headerActionBtn, headerIconBadgeStyle]}
              hitSlop={8}
              accessibilityLabel="Cancel editing shift settings"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={22} color={liveAccentIconColor} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStartEditing}
              style={[styles.headerActionBtn, headerIconBadgeStyle]}
              hitSlop={8}
              accessibilityLabel="Edit shift settings"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={20} color={liveAccentIconColor} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── READ MODE ───────────────────────────────────────────────────── */}
      {!isEditing && (
        <Animated.View
          key="read"
          entering={FadeInUp.delay(animationDelay).duration(350)}
          exiting={FadeOutUp.duration(200)}
          style={styles.card}
        >
          <ReadRow
            icon="time-outline"
            iconColor="#2196F3"
            label="System"
            value={getShiftSystemDisplayName(effectiveShiftSystem)}
            isBadge
          />
          <Divider />

          {!is3Shift && (
            <>
              <ReadRow
                icon="swap-horizontal-outline"
                iconColor="#9C27B0"
                label="Roster"
                value={getRosterTypeDisplayName(effectiveRosterType)}
                isBadge
              />
              <Divider />
            </>
          )}

          <ReadRow
            icon="refresh-circle-outline"
            iconColor={theme.colors.sacredGold}
            label="Pattern"
            value={getPatternDisplayName(d) || 'Not configured'}
          />
          {!effectivePattern && (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={14} color={theme.colors.dust} />
              <Animated.Text style={styles.emptyStateText}>
                No pattern configured — tap ✏️ above to set up your shift schedule
              </Animated.Text>
            </View>
          )}

          {/* Start Date */}
          {d.startDate && (
            <>
              <Divider />
              <ReadRow
                icon="calendar-outline"
                iconColor="#06B6D4"
                label="Start Date"
                value={formatStartDate(d.startDate)}
              />
            </>
          )}

          {/* Cycle Position */}
          {d.phaseOffset !== null && d.phaseOffset !== undefined && d.patternType && (
            <>
              <Divider />
              <ReadRow
                icon="locate-outline"
                iconColor={theme.colors.sacredGold}
                label="Cycle"
                value={getCyclePositionLabel(d) ?? '—'}
              />
            </>
          )}

          {/* Shift times (new structure or legacy fallback) */}
          {!isFIFORoster && (d.shiftTimes || d.shiftStartTime) && (
            <>
              {!is3Shift && (d.shiftTimes?.dayShift || d.shiftStartTime) && (
                <>
                  <Divider />
                  <ReadRow
                    icon="sunny-outline"
                    iconColor="#2196F3"
                    label="Day"
                    value={
                      d.shiftTimes?.dayShift
                        ? `${formatShiftTime(d.shiftTimes.dayShift.startTime)} – ${formatShiftTime(d.shiftTimes.dayShift.endTime)}`
                        : `${formatShiftTime(d.shiftStartTime ?? '06:00')} – ${formatShiftTime(d.shiftEndTime ?? '18:00')}`
                    }
                  />
                </>
              )}
              {!is3Shift && d.shiftTimes?.nightShift && (
                <>
                  <Divider />
                  <ReadRow
                    icon="moon-outline"
                    iconColor="#9C27B0"
                    label="Night"
                    value={`${formatShiftTime(d.shiftTimes.nightShift.startTime)} – ${formatShiftTime(d.shiftTimes.nightShift.endTime)}`}
                  />
                </>
              )}
              {is3Shift && d.shiftTimes?.morningShift && (
                <>
                  <Divider />
                  <ReadRow
                    icon="partly-sunny-outline"
                    iconColor="#F59E0B"
                    label="Morning"
                    value={formatShiftTime(d.shiftTimes.morningShift.startTime)}
                  />
                </>
              )}
              {is3Shift && d.shiftTimes?.afternoonShift && (
                <>
                  <Divider />
                  <ReadRow
                    icon="cloud-outline"
                    iconColor="#06B6D4"
                    label="Afternoon"
                    value={formatShiftTime(d.shiftTimes.afternoonShift.startTime)}
                  />
                </>
              )}
              {is3Shift && d.shiftTimes?.nightShift3 && (
                <>
                  <Divider />
                  <ReadRow
                    icon="moon-outline"
                    iconColor="#9C27B0"
                    label="Night"
                    value={formatShiftTime(d.shiftTimes.nightShift3.startTime)}
                  />
                </>
              )}
            </>
          )}

          {/* FIFO read rows */}
          {isFIFORoster && currentFifoConfig && (
            <>
              <Divider />
              <ReadRow
                icon="construct-outline"
                iconColor="#2196F3"
                label="Work"
                value={`${currentFifoConfig.workBlockDays} days on-site`}
              />
              <Divider />
              <ReadRow
                icon="home-outline"
                iconColor="#78716c"
                label="Rest"
                value={`${currentFifoConfig.restBlockDays} days at home`}
              />
              <Divider />
              <ReadRow
                icon="flash-outline"
                iconColor={theme.colors.sacredGold}
                label="Shifts"
                value={
                  FIFO_WORK_PATTERN_LABELS[currentFifoConfig.workBlockPattern as FIFOWorkPattern] ??
                  'Custom'
                }
              />
              {/* Swing sub-detail */}
              {currentFifoConfig.workBlockPattern === 'swing' && currentFifoConfig.swingPattern && (
                <>
                  <Divider />
                  <ReadRow
                    icon="sunny-outline"
                    iconColor="#F59E0B"
                    label="Day Shifts"
                    value={`${currentFifoConfig.swingPattern.daysOnDayShift} days`}
                  />
                  <Divider />
                  <ReadRow
                    icon="moon-outline"
                    iconColor="#9C27B0"
                    label="Night Shifts"
                    value={`${currentFifoConfig.swingPattern.daysOnNightShift} days`}
                  />
                </>
              )}
              {/* Custom sequence summary */}
              {currentFifoConfig.workBlockPattern === 'custom' &&
                currentFifoConfig.customWorkSequence && (
                  <>
                    <Divider />
                    <ReadRow
                      icon="list-outline"
                      iconColor={theme.colors.sacredGold}
                      label="Sequence"
                      value={`${currentFifoConfig.customWorkSequence.length} shifts`}
                    />
                  </>
                )}
              {/* FIFO shift times */}
              {(currentFifoConfig.workBlockPattern === 'straight-days' ||
                currentFifoConfig.workBlockPattern === 'swing') &&
                d.shiftTimes?.dayShift && (
                  <>
                    <Divider />
                    <ReadRow
                      icon="sunny-outline"
                      iconColor="#2196F3"
                      label="Day Shift"
                      value={`${formatShiftTime(d.shiftTimes.dayShift.startTime)} – ${formatShiftTime(d.shiftTimes.dayShift.endTime)}`}
                    />
                  </>
                )}
              {(currentFifoConfig.workBlockPattern === 'straight-nights' ||
                currentFifoConfig.workBlockPattern === 'swing') &&
                d.shiftTimes?.nightShift && (
                  <>
                    <Divider />
                    <ReadRow
                      icon="moon-outline"
                      iconColor="#9C27B0"
                      label="Night Shift"
                      value={`${formatShiftTime(d.shiftTimes.nightShift.startTime)} – ${formatShiftTime(d.shiftTimes.nightShift.endTime)}`}
                    />
                  </>
                )}
              {/* FlyIn/FlyOut days */}
              {currentFifoConfig.flyInDay !== null && currentFifoConfig.flyInDay !== undefined && (
                <>
                  <Divider />
                  <ReadRow
                    icon="airplane-outline"
                    iconColor="#2196F3"
                    label="Fly-In"
                    value={`Day ${currentFifoConfig.flyInDay}`}
                  />
                </>
              )}
              {currentFifoConfig.flyOutDay !== null &&
                currentFifoConfig.flyOutDay !== undefined && (
                  <>
                    <Divider />
                    <ReadRow
                      icon="airplane-outline"
                      iconColor="#78716c"
                      label="Fly-Out"
                      value={`Day ${currentFifoConfig.flyOutDay}`}
                    />
                  </>
                )}
              {currentFifoConfig.siteName ? (
                <>
                  <Divider />
                  <ReadRow
                    icon="location-outline"
                    iconColor="#06B6D4"
                    label="Site"
                    value={currentFifoConfig.siteName}
                  />
                </>
              ) : null}
            </>
          )}

          <View style={styles.readFooter}>
            <Animated.Text style={styles.readFooterText}>
              Tap ✏️ to edit shift settings
            </Animated.Text>
          </View>
        </Animated.View>
      )}

      {/* ── EDIT MODE ───────────────────────────────────────────────────── */}
      {isEditing && (
        <Animated.View
          key="edit"
          entering={FadeInUp.delay(60).duration(350)}
          exiting={FadeOutUp.duration(200)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.editCard}>
              {/* Auto-reset notice */}
              {autoResetNotice && (
                <Animated.View entering={FadeInUp.duration(250)} style={styles.noticeBox}>
                  <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                  <Animated.Text style={styles.noticeText}>{autoResetNotice}</Animated.Text>
                </Animated.View>
              )}

              {/* System section */}
              <EditSectionLabel
                label="SHIFT SYSTEM"
                icon="time-outline"
                iconColor="#2196F3"
                delay={0}
              />
              <PillToggle
                options={['2-Shift (12h)', '3-Shift (8h)']}
                selectedIndex={systemIndex}
                onChange={handleSystemChange}
              />

              {/* Roster section (hidden for 3-shift) */}
              {!is3Shift && (
                <>
                  <EditSectionLabel
                    label="ROSTER TYPE"
                    icon="swap-horizontal-outline"
                    iconColor="#9C27B0"
                    delay={80}
                  />
                  <PillToggle
                    options={['Rotating', 'FIFO']}
                    selectedIndex={rosterIndex}
                    onChange={handleRosterChange}
                    accentColor="#9C27B0"
                    accentBorder="rgba(156, 39, 176, 0.4)"
                  />
                </>
              )}

              {/* Pattern section */}
              <EditSectionLabel
                label="SHIFT PATTERN"
                icon="refresh-circle-outline"
                iconColor={theme.colors.sacredGold}
                delay={160}
              />
              <TouchableOpacity
                style={styles.patternRow}
                onPress={handleOpenPatternPicker}
                activeOpacity={0.7}
                accessibilityLabel={`Shift pattern: ${getPatternDisplayName(d)}. Double tap to change.`}
                accessibilityRole="button"
                accessibilityHint="Opens pattern selector"
              >
                <View style={styles.patternRowLeft}>
                  <View
                    style={[styles.patternIconBg, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]}
                  >
                    <Ionicons
                      name="refresh-circle-outline"
                      size={18}
                      color={theme.colors.sacredGold}
                    />
                  </View>
                  <Animated.Text style={styles.patternName} numberOfLines={1}>
                    {getPatternDisplayName(d)}
                  </Animated.Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.dust} />
              </TouchableOpacity>

              {/* Shift times — rotating rosters */}
              {!isFIFORoster && (
                <>
                  <EditSectionLabel
                    label="SHIFT TIMES"
                    icon="alarm-outline"
                    iconColor="#F59E0B"
                    delay={240}
                  />
                  {!is3Shift ? (
                    <>
                      <TimeRow
                        icon="sunny-outline"
                        iconColor="#2196F3"
                        label="Day Start"
                        time={getTimeValue({
                          shiftKey: 'dayShift',
                          field: 'startTime',
                          label: 'Day Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'dayShift',
                            field: 'startTime',
                            label: 'Day Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="sunny-outline"
                        iconColor="#1565C0"
                        label="Day End"
                        time={getTimeValue({
                          shiftKey: 'dayShift',
                          field: 'endTime',
                          label: 'Day End',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'dayShift',
                            field: 'endTime',
                            label: 'Day Shift End',
                          })
                        }
                      />
                      <TimeRow
                        icon="moon-outline"
                        iconColor="#9C27B0"
                        label="Night Start"
                        time={getTimeValue({
                          shiftKey: 'nightShift',
                          field: 'startTime',
                          label: 'Night Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'nightShift',
                            field: 'startTime',
                            label: 'Night Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="moon-outline"
                        iconColor="#7B1FA2"
                        label="Night End"
                        time={getTimeValue({
                          shiftKey: 'nightShift',
                          field: 'endTime',
                          label: 'Night End',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'nightShift',
                            field: 'endTime',
                            label: 'Night Shift End',
                          })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <TimeRow
                        icon="partly-sunny-outline"
                        iconColor="#F59E0B"
                        label="Morning Start"
                        time={getTimeValue({
                          shiftKey: 'morningShift',
                          field: 'startTime',
                          label: 'Morning Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'morningShift',
                            field: 'startTime',
                            label: 'Morning Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="cloud-outline"
                        iconColor="#06B6D4"
                        label="Afternoon Start"
                        time={getTimeValue({
                          shiftKey: 'afternoonShift',
                          field: 'startTime',
                          label: 'Afternoon Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'afternoonShift',
                            field: 'startTime',
                            label: 'Afternoon Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="moon-outline"
                        iconColor="#9C27B0"
                        label="Night Start"
                        time={getTimeValue({
                          shiftKey: 'nightShift3',
                          field: 'startTime',
                          label: 'Night Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'nightShift3',
                            field: 'startTime',
                            label: 'Night Shift Start',
                          })
                        }
                      />
                    </>
                  )}
                </>
              )}

              {/* FIFO details */}
              {isFIFORoster && (
                <>
                  <EditSectionLabel
                    label="FIFO BLOCK"
                    icon="construct-outline"
                    iconColor="#2196F3"
                    delay={240}
                  />

                  <View style={styles.sliderWrapper}>
                    <PatternBuilderSlider
                      label="Work Block"
                      icon="construct-outline"
                      value={currentFifoConfig.workBlockDays}
                      min={1}
                      max={60}
                      color="#2196F3"
                      trackColor="rgba(33,150,243,0.5)"
                      onChange={(v) => updateFifoConfig({ workBlockDays: v })}
                      hapticSourcePrefix="ShiftSettingsPanel"
                      delayIndex={0}
                    />
                  </View>

                  <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                    <PatternBuilderSlider
                      label="Rest Block"
                      icon="home-outline"
                      value={currentFifoConfig.restBlockDays}
                      min={1}
                      max={60}
                      color="#78716c"
                      trackColor="rgba(120,113,108,0.5)"
                      onChange={(v) => updateFifoConfig({ restBlockDays: v })}
                      hapticSourcePrefix="ShiftSettingsPanel"
                      delayIndex={1}
                    />
                  </View>

                  <EditSectionLabel
                    label="WORK PATTERN"
                    icon="flash-outline"
                    iconColor={theme.colors.sacredGold}
                    delay={320}
                  />
                  <View style={styles.workPatternGrid}>
                    {(
                      ['straight-days', 'straight-nights', 'swing', 'custom'] as FIFOWorkPattern[]
                    ).map((wp) => (
                      <TouchableOpacity
                        key={wp}
                        style={[
                          styles.workPatternChip,
                          fifoWorkPattern === wp && styles.workPatternChipSelected,
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateFifoConfig({ workBlockPattern: wp });
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel={FIFO_WORK_PATTERN_LABELS[wp]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: fifoWorkPattern === wp }}
                      >
                        <Animated.Text
                          style={[
                            styles.workPatternChipText,
                            fifoWorkPattern === wp && styles.workPatternChipTextSelected,
                          ]}
                        >
                          {FIFO_WORK_PATTERN_LABELS[wp]}
                        </Animated.Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Swing sub-section */}
                  {fifoWorkPattern === 'swing' && (
                    <Animated.View entering={FadeInUp.duration(300)}>
                      <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                        <PatternBuilderSlider
                          label="Day Shifts"
                          icon="sunny-outline"
                          value={currentFifoConfig.swingPattern?.daysOnDayShift ?? 5}
                          min={1}
                          max={30}
                          color="#F59E0B"
                          trackColor="rgba(245,158,11,0.5)"
                          onChange={(v) =>
                            updateFifoConfig({
                              swingPattern: {
                                daysOnDayShift: v,
                                daysOnNightShift:
                                  currentFifoConfig.swingPattern?.daysOnNightShift ?? 5,
                              },
                            })
                          }
                          hapticSourcePrefix="ShiftSettingsPanel"
                          delayIndex={0}
                        />
                      </View>
                      <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                        <PatternBuilderSlider
                          label="Night Shifts"
                          icon="moon-outline"
                          value={currentFifoConfig.swingPattern?.daysOnNightShift ?? 5}
                          min={1}
                          max={30}
                          color="#9C27B0"
                          trackColor="rgba(156,39,176,0.5)"
                          onChange={(v) =>
                            updateFifoConfig({
                              swingPattern: {
                                daysOnDayShift: currentFifoConfig.swingPattern?.daysOnDayShift ?? 5,
                                daysOnNightShift: v,
                              },
                            })
                          }
                          hapticSourcePrefix="ShiftSettingsPanel"
                          delayIndex={1}
                        />
                      </View>
                    </Animated.View>
                  )}

                  {/* Custom work sequence (FIFO_CUSTOM or workBlockPattern === 'custom') */}
                  {(isFIFOCustom || fifoWorkPattern === 'custom') && (
                    <Animated.View entering={FadeInUp.duration(300)}>
                      <EditSectionLabel
                        label="CUSTOM SEQUENCE"
                        icon="list-outline"
                        iconColor={theme.colors.sacredGold}
                        delay={400}
                      />
                      <View style={styles.sequenceBuilderWrapper}>
                        <Animated.Text style={styles.sequenceHelp}>
                          Tap shift types below to build your daily work sequence
                        </Animated.Text>
                        {/* Current sequence display */}
                        <View style={styles.sequenceRow}>
                          {(currentFifoConfig.customWorkSequence ?? DEFAULT_CUSTOM_SEQUENCE).map(
                            (shiftType, idx) => (
                              <TouchableOpacity
                                key={`seq-${idx}`}
                                style={[
                                  styles.sequenceChip,
                                  {
                                    backgroundColor: SHIFT_TYPE_COLORS[shiftType] + '30',
                                    borderColor: SHIFT_TYPE_COLORS[shiftType] + '80',
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  const seq = [
                                    ...(currentFifoConfig.customWorkSequence ??
                                      DEFAULT_CUSTOM_SEQUENCE),
                                  ];
                                  seq.splice(idx, 1);
                                  updateFifoConfig({ customWorkSequence: seq });
                                }}
                                accessibilityLabel={`Remove ${SHIFT_TYPE_LABELS[shiftType]} shift from position ${idx + 1}`}
                              >
                                <Animated.Text
                                  style={[
                                    styles.sequenceChipText,
                                    { color: SHIFT_TYPE_COLORS[shiftType] },
                                  ]}
                                >
                                  {SHIFT_TYPE_LABELS[shiftType][0]}
                                </Animated.Text>
                              </TouchableOpacity>
                            )
                          )}
                          {(currentFifoConfig.customWorkSequence ?? DEFAULT_CUSTOM_SEQUENCE)
                            .length < 20 && (
                            <TouchableOpacity
                              style={styles.sequenceAddBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                const seq = [
                                  ...(currentFifoConfig.customWorkSequence ??
                                    DEFAULT_CUSTOM_SEQUENCE),
                                  'day' as ShiftType,
                                ];
                                if (seq.length <= 20) {
                                  updateFifoConfig({ customWorkSequence: seq });
                                }
                              }}
                              activeOpacity={0.7}
                              accessibilityLabel="Add day shift to sequence"
                              accessibilityRole="button"
                            >
                              <Ionicons name="add" size={14} color={theme.colors.dust} />
                            </TouchableOpacity>
                          )}
                        </View>
                        {/* Shift type palette */}
                        <View style={styles.sequencePalette}>
                          {(['day', 'night', 'morning', 'afternoon', 'off'] as ShiftType[]).map(
                            (type) => (
                              <TouchableOpacity
                                key={type}
                                style={[
                                  styles.paletteChip,
                                  {
                                    borderColor: SHIFT_TYPE_COLORS[type] + '60',
                                    backgroundColor: SHIFT_TYPE_COLORS[type] + '18',
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  const seq = [
                                    ...(currentFifoConfig.customWorkSequence ??
                                      DEFAULT_CUSTOM_SEQUENCE),
                                    type,
                                  ];
                                  if (seq.length <= 20)
                                    updateFifoConfig({ customWorkSequence: seq });
                                }}
                                accessibilityLabel={`Add ${SHIFT_TYPE_LABELS[type]} shift to sequence`}
                              >
                                <Animated.Text
                                  style={[
                                    styles.paletteChipText,
                                    { color: SHIFT_TYPE_COLORS[type] },
                                  ]}
                                >
                                  + {SHIFT_TYPE_LABELS[type]}
                                </Animated.Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </View>
                    </Animated.View>
                  )}

                  {/* FIFO Shift Times */}
                  {(fifoWorkPattern === 'straight-days' ||
                    fifoWorkPattern === 'swing' ||
                    fifoWorkPattern === 'custom') && (
                    <Animated.View entering={FadeInUp.duration(300)}>
                      <EditSectionLabel
                        label="SHIFT TIMES"
                        icon="alarm-outline"
                        iconColor="#F59E0B"
                        delay={360}
                      />
                      <TimeRow
                        icon="sunny-outline"
                        iconColor="#2196F3"
                        label="Day Start"
                        time={getTimeValue({
                          shiftKey: 'dayShift',
                          field: 'startTime',
                          label: 'Day Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'dayShift',
                            field: 'startTime',
                            label: 'Day Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="sunny-outline"
                        iconColor="#1565C0"
                        label="Day End"
                        time={getTimeValue({
                          shiftKey: 'dayShift',
                          field: 'endTime',
                          label: 'Day End',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'dayShift',
                            field: 'endTime',
                            label: 'Day Shift End',
                          })
                        }
                      />
                    </Animated.View>
                  )}
                  {(fifoWorkPattern === 'straight-nights' || fifoWorkPattern === 'swing') && (
                    <Animated.View entering={FadeInUp.duration(300)}>
                      {fifoWorkPattern === 'straight-nights' && (
                        <EditSectionLabel
                          label="SHIFT TIMES"
                          icon="alarm-outline"
                          iconColor="#F59E0B"
                          delay={360}
                        />
                      )}
                      <TimeRow
                        icon="moon-outline"
                        iconColor="#9C27B0"
                        label="Night Start"
                        time={getTimeValue({
                          shiftKey: 'nightShift',
                          field: 'startTime',
                          label: 'Night Start',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'nightShift',
                            field: 'startTime',
                            label: 'Night Shift Start',
                          })
                        }
                      />
                      <TimeRow
                        icon="moon-outline"
                        iconColor="#7B1FA2"
                        label="Night End"
                        time={getTimeValue({
                          shiftKey: 'nightShift',
                          field: 'endTime',
                          label: 'Night End',
                        })}
                        onPress={() =>
                          handleOpenShiftTimePicker({
                            shiftKey: 'nightShift',
                            field: 'endTime',
                            label: 'Night Shift End',
                          })
                        }
                      />
                    </Animated.View>
                  )}

                  {/* Site name */}
                  <EditSectionLabel
                    label="SITE DETAILS"
                    icon="location-outline"
                    iconColor="#06B6D4"
                    delay={480}
                  />
                  <PremiumTextInput
                    label="Site Name (optional)"
                    value={currentFifoConfig.siteName ?? ''}
                    onChangeText={(text) => updateFifoConfig({ siteName: text || undefined })}
                    leftIcon={
                      <Ionicons name="location-outline" size={18} color={theme.colors.shadow} />
                    }
                  />

                  {/* Travel Days */}
                  <EditSectionLabel
                    label="TRAVEL DAYS (OPTIONAL)"
                    icon="airplane-outline"
                    iconColor="#2196F3"
                    delay={540}
                  />
                  <FlyDayStepper
                    label="Fly-In Day"
                    value={currentFifoConfig.flyInDay}
                    min={1}
                    max={currentFifoConfig.workBlockDays}
                    onChange={(v) => updateFifoConfig({ flyInDay: v })}
                    onClear={() => updateFifoConfig({ flyInDay: undefined })}
                  />
                  <FlyDayStepper
                    label="Fly-Out Day"
                    value={currentFifoConfig.flyOutDay}
                    min={1}
                    max={currentFifoConfig.workBlockDays + currentFifoConfig.restBlockDays}
                    onChange={(v) => updateFifoConfig({ flyOutDay: v })}
                    onClear={() => updateFifoConfig({ flyOutDay: undefined })}
                  />
                </>
              )}

              {/* Custom rotating pattern */}
              {isCustomRotating && (
                <>
                  <EditSectionLabel
                    label="CUSTOM PATTERN"
                    icon="construct-outline"
                    iconColor={theme.colors.sacredGold}
                    delay={240}
                  />
                  {!is3Shift ? (
                    <>
                      <View style={styles.sliderWrapper}>
                        <PatternBuilderSlider
                          label="Day Shifts"
                          icon="sunny-outline"
                          value={customPattern.daysOn}
                          min={1}
                          max={30}
                          color="#2196F3"
                          trackColor="rgba(33,150,243,0.5)"
                          onChange={(v) => updateCustomPattern({ daysOn: v })}
                          hapticSourcePrefix="ShiftSettingsPanel.custom"
                          delayIndex={0}
                        />
                      </View>
                      <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                        <PatternBuilderSlider
                          label="Night Shifts"
                          icon="moon-outline"
                          value={customPattern.nightsOn}
                          min={1}
                          max={30}
                          color="#9C27B0"
                          trackColor="rgba(156,39,176,0.5)"
                          onChange={(v) => updateCustomPattern({ nightsOn: v })}
                          hapticSourcePrefix="ShiftSettingsPanel.custom"
                          delayIndex={1}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.sliderWrapper}>
                        <PatternBuilderSlider
                          label="Morning Shifts"
                          icon="partly-sunny-outline"
                          value={customPattern.morningOn ?? 3}
                          min={1}
                          max={20}
                          color="#F59E0B"
                          trackColor="rgba(245,158,11,0.5)"
                          onChange={(v) => updateCustomPattern({ morningOn: v })}
                          hapticSourcePrefix="ShiftSettingsPanel.custom"
                          delayIndex={0}
                        />
                      </View>
                      <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                        <PatternBuilderSlider
                          label="Afternoon Shifts"
                          icon="cloud-outline"
                          value={customPattern.afternoonOn ?? 3}
                          min={1}
                          max={20}
                          color="#06B6D4"
                          trackColor="rgba(6,182,212,0.5)"
                          onChange={(v) => updateCustomPattern({ afternoonOn: v })}
                          hapticSourcePrefix="ShiftSettingsPanel.custom"
                          delayIndex={1}
                        />
                      </View>
                      <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                        <PatternBuilderSlider
                          label="Night Shifts"
                          icon="moon-outline"
                          value={customPattern.nightOn ?? 3}
                          min={1}
                          max={20}
                          color="#9C27B0"
                          trackColor="rgba(156,39,176,0.5)"
                          onChange={(v) => updateCustomPattern({ nightOn: v })}
                          hapticSourcePrefix="ShiftSettingsPanel.custom"
                          delayIndex={2}
                        />
                      </View>
                    </>
                  )}
                  <View style={[styles.sliderWrapper, { marginTop: theme.spacing.md }]}>
                    <PatternBuilderSlider
                      label="Days Off"
                      icon="bed-outline"
                      value={customPattern.daysOff}
                      min={1}
                      max={30}
                      color="#4CAF50"
                      trackColor="rgba(76,175,80,0.5)"
                      onChange={(v) => updateCustomPattern({ daysOff: v })}
                      hapticSourcePrefix="ShiftSettingsPanel.custom"
                      delayIndex={is3Shift ? 3 : 2}
                    />
                  </View>
                </>
              )}

              {/* Schedule Anchor */}
              <EditSectionLabel
                label="SCHEDULE ANCHOR"
                icon="calendar-outline"
                iconColor="#06B6D4"
                delay={560}
              />
              <TouchableOpacity
                style={styles.patternRow}
                onPress={handleOpenStartDatePicker}
                activeOpacity={0.7}
                accessibilityLabel={`Start date: ${formatStartDate(d.startDate)}. Double tap to change.`}
                accessibilityRole="button"
                accessibilityHint="Opens date picker"
              >
                <View style={styles.patternRowLeft}>
                  <View style={[styles.patternIconBg, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#06B6D4" />
                  </View>
                  <View>
                    <Animated.Text style={styles.patternName}>
                      {formatStartDate(d.startDate)}
                    </Animated.Text>
                    <Animated.Text style={styles.patternRowSub}>Cycle reference date</Animated.Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.dust} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.patternRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setResyncSheetVisible(true);
                }}
                activeOpacity={0.7}
                accessibilityLabel={`Cycle position: ${getCyclePositionLabel(d) ?? 'Not set'}. Double tap to re-sync.`}
                accessibilityRole="button"
                accessibilityHint="Opens cycle position selector"
              >
                <View style={styles.patternRowLeft}>
                  <View style={[styles.patternIconBg, { backgroundColor: 'rgba(180,83,9,0.15)' }]}>
                    <Ionicons name="locate-outline" size={18} color={theme.colors.sacredGold} />
                  </View>
                  <View>
                    <Animated.Text style={styles.patternName}>
                      {getCyclePositionLabel(d) ?? 'Not synced'}
                    </Animated.Text>
                    <Animated.Text style={styles.patternRowSub}>
                      Current position in cycle
                    </Animated.Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.dust} />
              </TouchableOpacity>

              {/* Save button */}
              <Animated.View style={[styles.saveButtonWrapper, saveGlowStyle]}>
                <PremiumButton
                  title={isSaving ? 'Saving…' : 'Save Changes'}
                  onPress={handleSave}
                  variant="primary"
                  size="medium"
                  primaryGradientColors={headerGradient}
                  loading={isSaving}
                  disabled={!hasChanges}
                  icon={
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={theme.colors.paper}
                    />
                  }
                  iconPosition="right"
                  style={styles.saveButton}
                  accessibilityLabel={
                    isSaving ? 'Saving shift settings' : 'Save shift settings changes'
                  }
                  accessibilityHint={
                    hasChanges ? 'Saves your pending changes' : 'No changes to save'
                  }
                />
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <PatternSelectorSheet
        visible={patternSheetVisible}
        onClose={() => setPatternSheetVisible(false)}
        shiftSystem={effectiveShiftSystem}
        rosterType={effectiveRosterType}
        selectedPattern={effectivePattern}
        onSelect={handlePatternSelect}
      />

      <TimePickerModal
        visible={timePickerTarget !== null}
        initialTime={timePickerTarget ? getTimeValue(timePickerTarget) : '06:00'}
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerTarget(null)}
      />

      <StartDatePickerSheet
        visible={startDatePickerVisible}
        onClose={() => setStartDatePickerVisible(false)}
        selectedDate={getSelectableStartDate(d.startDate)}
        onSelect={handleStartDateSelect}
      />

      <CycleResyncSheet
        visible={resyncSheetVisible}
        onClose={() => setResyncSheetVisible(false)}
        data={d}
        onSelect={handleResyncConfirm}
      />
    </View>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Read-only row with coloured icon */
const ReadRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  isBadge?: boolean;
}> = ({ icon, iconColor, label, value, isBadge }) => (
  <View style={styles.readRow}>
    <View style={styles.readRowLeft}>
      <View style={[styles.readRowIconBg, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Animated.Text style={styles.readRowLabel}>{label}</Animated.Text>
    </View>
    {isBadge ? (
      <View style={styles.badge}>
        <Animated.Text style={styles.badgeText}>{value}</Animated.Text>
      </View>
    ) : (
      <Animated.Text style={styles.readRowValue} numberOfLines={2}>
        {value}
      </Animated.Text>
    )}
  </View>
);

/** Thin divider between read rows */
const Divider: React.FC = () => <View style={styles.divider} />;

/** Section label for edit mode */
const EditSectionLabel: React.FC<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  delay?: number;
}> = ({ label, icon, iconColor, delay = 0 }) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(300)} style={styles.sectionLabelRow}>
    <Ionicons name={icon} size={13} color={iconColor} />
    <Animated.Text style={styles.sectionLabel}>{label}</Animated.Text>
  </Animated.View>
);

/** Time picker trigger row */
const TimeRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  time: string;
  onPress: () => void;
}> = ({ icon, iconColor, label, time, onPress }) => {
  const scale = useSharedValue(1);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={rowStyle}>
      <TouchableOpacity
        style={styles.timeRow}
        onPress={() => {
          scale.value = withSequence(
            withSpring(0.97, { damping: 15, stiffness: 400 }),
            withDelay(100, withSpring(1.0, { damping: 12, stiffness: 300 }))
          );
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={1}
      >
        <View style={styles.timeRowLeft}>
          <View style={[styles.timeRowIconBg, { backgroundColor: iconColor + '22' }]}>
            <Ionicons name={icon} size={15} color={iconColor} />
          </View>
          <Animated.Text style={styles.timeRowLabel}>{label}</Animated.Text>
        </View>
        <View style={styles.timeRowRight}>
          <Animated.Text style={styles.timeRowValue}>{formatShiftTime(time)}</Animated.Text>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.shadow} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/** Animated 2-option pill toggle */
const PillToggle: React.FC<{
  options: [string, string];
  selectedIndex: number;
  onChange: (index: number) => void;
  accentColor?: string;
  accentBorder?: string;
}> = ({
  options,
  selectedIndex,
  onChange,
  accentColor = theme.colors.sacredGold,
  accentBorder = 'rgba(180, 83, 9, 0.35)',
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const pillWidth = containerWidth > 0 ? containerWidth / 2 : 0;
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (pillWidth > 0) {
      indicatorX.value = withSpring(selectedIndex * pillWidth, {
        damping: 18,
        stiffness: 280,
      });
    }
  }, [selectedIndex, pillWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: pillWidth,
  }));

  return (
    <View
      style={styles.pillContainer}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.pillIndicator,
          {
            backgroundColor: accentColor + '20',
            borderColor: accentBorder,
          },
          indicatorStyle,
        ]}
      />
      {options.map((option, i) => (
        <TouchableOpacity
          key={option}
          style={styles.pillOption}
          onPress={() => {
            onChange(i);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <Animated.Text
            style={[
              styles.pillOptionText,
              selectedIndex === i && {
                color: accentColor,
                fontWeight: theme.typography.fontWeights.semibold,
              },
            ]}
          >
            {option}
          </Animated.Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/** Inline stepper for flyInDay / flyOutDay */
const FlyDayStepper: React.FC<{
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onClear: () => void;
}> = ({ label, value, min, max, onChange, onClear }) => (
  <View style={styles.flyStepperRow}>
    <Animated.Text style={styles.flyStepperLabel}>{label}</Animated.Text>
    <View style={styles.flyStepperControls}>
      {value !== null && value !== undefined ? (
        <>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(Math.max(min, value - 1));
            }}
            style={styles.flyStepBtn}
            disabled={value <= min}
            hitSlop={8}
            accessibilityLabel={`Decrease ${label}`}
          >
            <Ionicons
              name="remove"
              size={16}
              color={value <= min ? theme.colors.shadow : theme.colors.paper}
            />
          </TouchableOpacity>
          <Animated.Text style={styles.flyStepValue}>Day {value}</Animated.Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(Math.min(max, value + 1));
            }}
            style={styles.flyStepBtn}
            disabled={value >= max}
            hitSlop={8}
            accessibilityLabel={`Increase ${label}`}
          >
            <Ionicons
              name="add"
              size={16}
              color={value >= max ? theme.colors.shadow : theme.colors.paper}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClear}
            style={styles.flyStepClear}
            hitSlop={8}
            accessibilityLabel={`Clear ${label}`}
          >
            <Ionicons name="close-circle" size={16} color={theme.colors.shadow} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(min);
          }}
          style={styles.flyStepSetBtn}
          accessibilityLabel={`Set ${label}`}
        >
          <Animated.Text style={styles.flyStepSetText}>Set</Animated.Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },

  // ── Gradient header ──────────────────────────────────────────────────────
  headerGradient: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    overflow: 'hidden',
    marginBottom: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12,10,9,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'rgba(255,255,255,0.95)',
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12,10,9,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Read mode card ───────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    overflow: 'hidden',
  },
  readRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 11,
  },
  readRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readRowIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readRowLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readRowValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  badge: {
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.3)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.softStone,
    marginHorizontal: theme.spacing.md,
  },
  readFooter: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
    marginTop: theme.spacing.xs,
  },
  readFooterText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  emptyStateText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.dust,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Auto-reset notice
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  noticeText: {
    fontSize: theme.typography.fontSizes.xs,
    color: '#F59E0B',
    flex: 1,
    lineHeight: 16,
  },

  // ── Edit mode card ───────────────────────────────────────────────────────
  editCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 10,
    color: theme.colors.shadow,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  // PillToggle
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.full,
    position: 'relative',
    overflow: 'hidden',
  },
  pillIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  pillOption: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pillOptionText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    fontWeight: theme.typography.fontWeights.medium,
  },

  // Pattern row
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  patternRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  patternIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternName: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
  },

  // Time rows
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeRowIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRowLabel: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
  },
  timeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeRowValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
  },

  // FIFO sliders
  sliderWrapper: {
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  // FIFO work pattern chips
  workPatternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  workPatternChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.softStone,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  workPatternChipSelected: {
    backgroundColor: theme.colors.opacity.gold10,
    borderColor: 'rgba(180, 83, 9, 0.4)',
  },
  workPatternChipText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    fontWeight: theme.typography.fontWeights.medium,
  },
  workPatternChipTextSelected: {
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  // Custom work sequence builder
  sequenceBuilderWrapper: {
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: theme.spacing.sm,
  },
  sequenceHelp: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    fontStyle: 'italic',
  },
  sequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 32,
  },
  sequenceChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceChipText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.bold,
  },
  sequenceAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequencePalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  paletteChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  paletteChipText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  // Fly stepper
  flyStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  flyStepperLabel: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
  },
  flyStepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flyStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.softStone,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyStepValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    fontWeight: theme.typography.fontWeights.medium,
    minWidth: 48,
    textAlign: 'center',
  },
  flyStepClear: {
    marginLeft: 4,
  },
  flyStepSetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.opacity.gold10,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.3)',
  },
  flyStepSetText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.semibold,
  },

  // Schedule anchor / pattern row sub-label
  patternRowSub: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 1,
  },

  // Save button
  saveButtonWrapper: {
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 12,
  },
  saveButton: {
    width: '100%',
  },
});
