/**
 * UniversalShiftBuilderScreen
 *
 * Full-screen shift schedule builder. Supports both manual building (shift
 * definition palette + sequence canvas) and AI-assisted drafting via the
 * parser service. Validates before save, warns on warnings, saves via
 * OnboardingContext.updateDataAsync.
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '@/contexts/OnboardingContext';
import config from '@/config/env';
import { theme } from '@/utils/theme';
import {
  type UniversalShiftSchedule,
  type UniversalShiftDefinition,
  type UniversalShiftSequenceItem,
  type UniversalHolidayException,
  type UniversalOneOffException,
} from '@/types';
import {
  buildHolidayExceptionsFromHolidays,
  validateUniversalSchedule,
  generateShiftId,
} from '@/utils/universalShiftUtils';
import { Analytics } from '@/utils/analytics';
import { normalizeUniversalSchedule } from '@/utils/universalShiftScheduleUtils';
import {
  parseShiftScheduleDescription,
  ShiftScheduleParserError,
  type ShiftScheduleParserResult,
} from '@/services/ShiftScheduleParserService';
import { ShiftDefinitionPalette } from '@/components/shift-builder/ShiftDefinitionPalette';
import { ShiftSequenceCanvas } from '@/components/shift-builder/ShiftSequenceCanvas';
import { ShiftInspectorSheet } from '@/components/shift-builder/ShiftInspectorSheet';
import { SchedulePreviewCalendar } from '@/components/shift-builder/SchedulePreviewCalendar';
import { AiDraftReviewSheet } from '@/components/shift-builder/AiDraftReviewSheet';
import { BuilderValidationBanner } from '@/components/shift-builder/BuilderValidationBanner';
import { HolidayService } from '@/services/HolidayService';
import { getStorageService } from '@/services/StorageService';
import {
  exportUniversalScheduleToCalendarFile,
  pickAndImportUniversalScheduleCalendar,
  shareUniversalScheduleCalendarFile,
} from '@/services/ShiftCalendarFileService';
import { UNIVERSAL_SHIFT_TEMPLATES } from '@/constants/universalShiftTemplates';

// ── Navigation types ──────────────────────────────────────────────────────────

export type UniversalShiftBuilderParams = {
  mode: 'create' | 'edit';
  entryPoint?: 'onboarding' | 'settings';
  onSaveNextScreen?: 'AhaMoment' | 'Completion';
  existingSchedule?: UniversalShiftSchedule;
};

type BuilderRoute = RouteProp<
  { UniversalShiftBuilder: UniversalShiftBuilderParams },
  'UniversalShiftBuilder'
>;

// ── Constants ─────────────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  '4 days on, 4 nights on, 4 off',
  '4 on 4 off',
  'Mon–Fri 9–5',
  '7 on 7 off',
  '12-hour rotating swing',
  '14 on 14 off remote nights',
];

const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonthsDateStr(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildEmptySchedule(name = 'My Schedule'): UniversalShiftSchedule {
  return {
    version: 3,
    name,
    timezone: DEFAULT_TIMEZONE,
    anchorDate: todayStr(),
    phaseOffset: 0,
    shiftDefinitions: [],
    sequence: [],
    source: 'manual',
  };
}

function cloneTemplateSchedule(templateSchedule: UniversalShiftSchedule): UniversalShiftSchedule {
  return {
    ...templateSchedule,
    timezone: DEFAULT_TIMEZONE,
    anchorDate: todayStr(),
    source: 'template',
    updatedAt: new Date().toISOString(),
    shiftDefinitions: templateSchedule.shiftDefinitions.map((definition) => ({
      ...definition,
      reminderProfile: definition.reminderProfile ? { ...definition.reminderProfile } : undefined,
    })),
    sequence: templateSchedule.sequence.map((item) => ({ ...item })),
    holidayExceptions: templateSchedule.holidayExceptions?.map((exception) => ({ ...exception })),
    oneOffExceptions: templateSchedule.oneOffExceptions?.map((exception) => ({ ...exception })),
  };
}

function getSequenceDayLabel(
  item: UniversalShiftSequenceItem | undefined,
  definitions: UniversalShiftDefinition[],
  fallbackLabels: { notSet: string; unknownShift: string }
): string {
  if (!item) return fallbackLabels.notSet;
  const definition = definitions.find((def) => def.id === item.shiftDefinitionId);
  return item.labelOverride || definition?.name || fallbackLabels.unknownShift;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const UniversalShiftBuilderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<BuilderRoute>();
  const { t, i18n } = useTranslation('schedule');
  const { data, updateDataAsync } = useOnboarding();

  const {
    mode: _mode,
    entryPoint = 'settings',
    onSaveNextScreen,
    existingSchedule,
  } = route.params ?? { mode: 'create' as const };
  const isOnboardingEntry = entryPoint === 'onboarding';

  // ── Schedule state ──────────────────────────────────────────────────────────

  const [schedule, setSchedule] = useState<UniversalShiftSchedule>(
    () => existingSchedule ?? buildEmptySchedule()
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState(false);
  const [anchorPickerVisible, setAnchorPickerVisible] = useState(false);
  const [anchorDraft, setAnchorDraft] = useState(schedule.anchorDate);
  const [anchorDraftError, setAnchorDraftError] = useState<string | null>(null);
  const [sequenceEditIndex, setSequenceEditIndex] = useState<number | null>(null);
  const [sequenceLabelDraft, setSequenceLabelDraft] = useState('');
  const [holidayImporting, setHolidayImporting] = useState(false);
  const [holidayCountry, setHolidayCountry] = useState(
    (data.country || 'US').slice(0, 2).toUpperCase()
  );
  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));
  const [holidayDraftName, setHolidayDraftName] = useState('');
  const [holidayDraftDate, setHolidayDraftDate] = useState(todayStr());
  const [oneOffDraftDate, setOneOffDraftDate] = useState(todayStr());
  const [oneOffDraftReason, setOneOffDraftReason] = useState('');
  const [oneOffDraftAction, setOneOffDraftAction] = useState<'mark_off' | 'use_shift_definition'>(
    'use_shift_definition'
  );
  const [oneOffDraftDefinitionId, setOneOffDraftDefinitionId] = useState(
    existingSchedule?.shiftDefinitions[0]?.id ?? ''
  );
  const [calendarExportStart, setCalendarExportStart] = useState(todayStr());
  const [calendarExportEnd, setCalendarExportEnd] = useState(addMonthsDateStr(todayStr(), 12));
  const [calendarIncludeOffDays, setCalendarIncludeOffDays] = useState(true);
  const [calendarExporting, setCalendarExporting] = useState(false);
  const [calendarImporting, setCalendarImporting] = useState(false);
  const [calendarImportSummary, setCalendarImportSummary] = useState<string | null>(null);

  // ── Inspector sheet state ───────────────────────────────────────────────────
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<UniversalShiftDefinition | undefined>(
    undefined
  );

  // ── AI state ───────────────────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ShiftScheduleParserResult | null>(null);
  const [aiReviewVisible, setAiReviewVisible] = useState(false);
  const [aiFollowUpLoading, setAiFollowUpLoading] = useState(false);
  const [aiSectionExpanded, setAiSectionExpanded] = useState(true);
  const aiAbortRef = useRef<AbortController | null>(null);

  const aiAvailable = useMemo(() => config.features.aiShiftBuilderEnabled, []);

  useEffect(() => {
    Analytics.screenView('UniversalShiftBuilder');
    Analytics.track('shift_builder_opened', {
      mode: _mode,
      entry_point: entryPoint,
      source: existingSchedule?.source ?? 'manual',
    });
  }, [_mode, entryPoint, existingSchedule?.source]);

  useEffect(() => {
    if (oneOffDraftDefinitionId) return;
    const firstDefinition = schedule.shiftDefinitions[0];
    if (firstDefinition) {
      setOneOffDraftDefinitionId(firstDefinition.id);
    }
  }, [oneOffDraftDefinitionId, schedule.shiftDefinitions]);

  // ── Pulse animation for AI loading ─────────────────────────────────────────
  const aiPulse = useSharedValue(1);
  useEffect(() => {
    if (aiLoading) {
      aiPulse.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false
      );
    } else {
      aiPulse.value = withTiming(1, { duration: 200 });
    }
  }, [aiLoading, aiPulse]);
  const aiPulseStyle = useAnimatedStyle(() => ({ opacity: aiPulse.value }));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validation = useMemo(() => {
    if (!schedule.sequence?.length && !schedule.shiftDefinitions?.length) {
      return { valid: false, errors: [], warnings: [] };
    }
    return validateUniversalSchedule(schedule);
  }, [schedule]);

  const visibleErrors = validation.errors;
  const visibleWarnings = dismissedWarnings ? [] : validation.warnings;
  const shiftLabelFallbacks = useMemo(
    () => ({
      notSet: t('builder.notSet'),
      unknownShift: t('builder.unknownShift'),
    }),
    [t]
  );

  // ── Dirty state helper ─────────────────────────────────────────────────────
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setDismissedWarnings(false);
  }, []);

  // ── Schedule mutators ──────────────────────────────────────────────────────

  const updateSchedule = useCallback(
    (updater: (prev: UniversalShiftSchedule) => UniversalShiftSchedule) => {
      setSchedule((prev) => updater(prev));
      markDirty();
    },
    [markDirty]
  );

  // Name
  const handleNameChange = useCallback(
    (text: string) => {
      updateSchedule((s) => ({ ...s, name: text }));
    },
    [updateSchedule]
  );

  const handleAnchorDatePress = useCallback(() => {
    setAnchorDraft(schedule.anchorDate);
    setAnchorDraftError(null);
    setAnchorPickerVisible(true);
  }, [schedule.anchorDate]);

  const handleAnchorDraftApply = useCallback(() => {
    const trimmed = anchorDraft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setAnchorDraftError(t('builder.invalidDateFormat'));
      return;
    }

    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      setAnchorDraftError(t('builder.invalidDate'));
      return;
    }

    updateSchedule((s) => ({ ...s, anchorDate: trimmed }));
    setAnchorPickerVisible(false);
  }, [anchorDraft, t, updateSchedule]);

  const alignmentDayNumber = useMemo(() => {
    const cycleLength = Math.max(schedule.sequence.length, 1);
    return ((schedule.phaseOffset ?? 0) % cycleLength) + 1;
  }, [schedule.phaseOffset, schedule.sequence.length]);

  const alignmentDayLabel = useMemo(
    () =>
      getSequenceDayLabel(
        schedule.sequence[alignmentDayNumber - 1],
        schedule.shiftDefinitions,
        shiftLabelFallbacks
      ),
    [alignmentDayNumber, schedule.sequence, schedule.shiftDefinitions, shiftLabelFallbacks]
  );

  const alignmentChoices = useMemo(
    () =>
      schedule.sequence.slice(0, 14).map((item, index) => ({
        index,
        label: getSequenceDayLabel(item, schedule.shiftDefinitions, shiftLabelFallbacks),
      })),
    [schedule.sequence, schedule.shiftDefinitions, shiftLabelFallbacks]
  );

  const handleCycleDayNumberChange = useCallback(
    (text: string) => {
      const n = parseInt(text, 10);
      if (isNaN(n) || n < 1) return;
      updateSchedule((s) => {
        const cycleLength = Math.max(s.sequence.length, 1);
        return { ...s, phaseOffset: Math.min(n, cycleLength) - 1 };
      });
    },
    [updateSchedule]
  );

  const handleAlignmentChoicePress = useCallback(
    (index: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateSchedule((s) => ({ ...s, phaseOffset: index }));
    },
    [updateSchedule]
  );

  // ── Definition CRUD ────────────────────────────────────────────────────────

  const handleCreateNewDefinition = useCallback(() => {
    setEditingDefinition(undefined);
    setInspectorVisible(true);
  }, []);

  const handleEditDefinition = useCallback((def: UniversalShiftDefinition) => {
    setEditingDefinition(def);
    setInspectorVisible(true);
  }, []);

  const handleSaveDefinition = useCallback(
    (def: UniversalShiftDefinition) => {
      updateSchedule((s) => {
        const existing = s.shiftDefinitions.findIndex((d) => d.id === def.id);
        let newDefs: UniversalShiftDefinition[];
        if (existing >= 0) {
          newDefs = s.shiftDefinitions.map((d) => (d.id === def.id ? def : d));
        } else {
          newDefs = [...s.shiftDefinitions, def];
        }
        return { ...s, shiftDefinitions: newDefs };
      });
      setInspectorVisible(false);
      setEditingDefinition(undefined);
    },
    [updateSchedule]
  );

  const handleDeleteDefinition = useCallback(
    (id: string) => {
      updateSchedule((s) => ({
        ...s,
        shiftDefinitions: s.shiftDefinitions.filter((d) => d.id !== id),
        sequence: s.sequence.filter((item) => item.shiftDefinitionId !== id),
      }));
      setInspectorVisible(false);
    },
    [updateSchedule]
  );

  // ── Sequence CRUD ──────────────────────────────────────────────────────────

  const handleAddShift = useCallback(
    (definitionId: string) => {
      Analytics.track('shift_builder_manual_shift_added', {
        definition_id: definitionId,
        source: 'single',
      });
      updateSchedule((s) => ({
        ...s,
        sequence: [...s.sequence, { id: generateShiftId('seq'), shiftDefinitionId: definitionId }],
      }));
    },
    [updateSchedule]
  );

  const handleAddRepeatedBlock = useCallback(
    (definitionId: string, count: number) => {
      Analytics.track('shift_builder_manual_shift_added', {
        definition_id: definitionId,
        source: 'block',
        count,
      });
      const items: UniversalShiftSequenceItem[] = Array.from({ length: count }, () => ({
        id: generateShiftId('seq'),
        shiftDefinitionId: definitionId,
      }));
      updateSchedule((s) => ({ ...s, sequence: [...s.sequence, ...items] }));
    },
    [updateSchedule]
  );

  const handleMoveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      Analytics.track('shift_builder_sequence_reordered', {
        from_index: fromIndex,
        to_index: toIndex,
      });
      updateSchedule((s) => {
        const seq = [...s.sequence];
        const [moved] = seq.splice(fromIndex, 1);
        if (!moved) return s;
        seq.splice(toIndex, 0, moved);
        return { ...s, sequence: seq };
      });
    },
    [updateSchedule]
  );

  const handleReorder = useCallback(
    (newSequence: UniversalShiftSequenceItem[]) => {
      updateSchedule((s) => ({ ...s, sequence: newSequence }));
    },
    [updateSchedule]
  );

  const handleDuplicate = useCallback(
    (index: number) => {
      updateSchedule((s) => {
        const item = s.sequence[index];
        if (!item) return s;
        const newItem: UniversalShiftSequenceItem = {
          id: generateShiftId('seq'),
          shiftDefinitionId: item.shiftDefinitionId,
          labelOverride: item.labelOverride,
        };
        const seq = [...s.sequence];
        seq.splice(index + 1, 0, newItem);
        return { ...s, sequence: seq };
      });
    },
    [updateSchedule]
  );

  const handleInsertBefore = useCallback(
    (index: number, definitionId: string) => {
      updateSchedule((s) => {
        const newItem: UniversalShiftSequenceItem = {
          id: generateShiftId('seq'),
          shiftDefinitionId: definitionId,
        };
        const seq = [...s.sequence];
        seq.splice(index, 0, newItem);
        return { ...s, sequence: seq };
      });
    },
    [updateSchedule]
  );

  const handleInsertAfter = useCallback(
    (index: number, definitionId: string) => {
      updateSchedule((s) => {
        const newItem: UniversalShiftSequenceItem = {
          id: generateShiftId('seq'),
          shiftDefinitionId: definitionId,
        };
        const seq = [...s.sequence];
        seq.splice(index + 1, 0, newItem);
        return { ...s, sequence: seq };
      });
    },
    [updateSchedule]
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      updateSchedule((s) => {
        const seq = [...s.sequence];
        seq.splice(index, 1);
        return { ...s, sequence: seq };
      });
    },
    [updateSchedule]
  );

  const handleItemPress = useCallback(
    (index: number) => {
      const item = schedule.sequence[index];
      if (!item) return;
      setSequenceEditIndex(index);
      setSequenceLabelDraft(item.labelOverride ?? '');
    },
    [schedule.sequence]
  );

  const handleSequenceLabelSave = useCallback(() => {
    if (sequenceEditIndex === null) return;
    const label = sequenceLabelDraft.trim();
    updateSchedule((s) => ({
      ...s,
      sequence: s.sequence.map((item, index) =>
        index === sequenceEditIndex ? { ...item, labelOverride: label || undefined } : item
      ),
    }));
    setSequenceEditIndex(null);
    setSequenceLabelDraft('');
  }, [sequenceEditIndex, sequenceLabelDraft, updateSchedule]);

  const mergeHolidayExceptions = useCallback(
    (incoming: UniversalHolidayException[]) => {
      updateSchedule((s) => {
        const existing = s.holidayExceptions ?? [];
        const existingKeys = new Set(existing.map((item) => `${item.date}:${item.action}`));
        const uniqueIncoming = incoming.filter((item) => {
          const key = `${item.date}:${item.action}`;
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });
        return { ...s, holidayExceptions: [...existing, ...uniqueIncoming] };
      });
    },
    [updateSchedule]
  );

  const handleImportPublicHolidays = useCallback(async () => {
    const country = holidayCountry.trim().slice(0, 2).toUpperCase();
    const year = Number(holidayYear);
    if (!/^[A-Z]{2}$/.test(country) || !Number.isInteger(year) || year < 1900 || year > 2200) {
      Alert.alert(t('builder.holidayDetailsTitle'), t('builder.holidayCountryYearError'));
      return;
    }

    setHolidayImporting(true);
    try {
      const service = new HolidayService(getStorageService());
      service.setDataLoader(async (countryCode, targetYear) => {
        const response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${targetYear}/${countryCode}`
        );
        if (!response.ok) return null;
        const rows = (await response.json()) as Array<{
          date: string;
          localName?: string;
          name?: string;
          types?: string[];
        }>;
        return {
          country: countryCode,
          year: targetYear,
          holidays: rows.map((row, index) => ({
            id: `${countryCode}-${targetYear}-${index}-${row.date}`,
            name: row.name || row.localName || 'Public holiday',
            date: row.date,
            type: row.types?.includes('Observance')
              ? ('observance' as const)
              : ('national' as const),
            description:
              row.localName && row.name && row.localName !== row.name ? row.localName : undefined,
            isPaid: row.types?.includes('Public') ?? true,
          })),
        };
      });
      const holidays = await service.getHolidaysForCountry(country, year);
      if (holidays.length === 0) {
        Alert.alert(t('builder.noHolidaysTitle'), t('builder.noHolidaysMessage'));
        return;
      }

      const exceptions = buildHolidayExceptionsFromHolidays(holidays, {
        action: 'mark_off',
        appliesToWorkShiftsOnly: true,
      });
      mergeHolidayExceptions(exceptions);
      Analytics.track('shift_builder_holidays_imported', {
        country,
        year,
        count: exceptions.length,
      });
    } catch {
      Alert.alert(t('builder.holidayImportFailedTitle'), t('builder.holidayImportFailedMessage'));
    } finally {
      setHolidayImporting(false);
    }
  }, [holidayCountry, holidayYear, mergeHolidayExceptions, t]);

  const handleAddManualHolidayException = useCallback(() => {
    const date = holidayDraftDate.trim();
    const name = holidayDraftName.trim();
    const country = holidayCountry.trim().slice(0, 2).toUpperCase();
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[A-Z]{2}$/.test(country)) {
      Alert.alert(t('builder.holidayDetailsTitle'), t('builder.holidayManualError'));
      return;
    }

    mergeHolidayExceptions([
      {
        id: generateShiftId('holiday'),
        date,
        holidayName: name,
        country,
        action: 'mark_off',
        paidOverride: true,
        appliesToWorkShiftsOnly: true,
      },
    ]);
    setHolidayDraftName('');
    Analytics.track('shift_builder_holiday_exception_added', { country });
  }, [holidayCountry, holidayDraftDate, holidayDraftName, mergeHolidayExceptions, t]);

  const handleRemoveHolidayException = useCallback(
    (id: string) => {
      updateSchedule((s) => ({
        ...s,
        holidayExceptions: (s.holidayExceptions ?? []).filter((item) => item.id !== id),
      }));
    },
    [updateSchedule]
  );

  const handleAddOneOffException = useCallback(() => {
    const date = oneOffDraftDate.trim();
    const reason = oneOffDraftReason.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert(t('builder.oneOffDetailsTitle'), t('builder.oneOffDateError'));
      return;
    }
    if (oneOffDraftAction === 'use_shift_definition' && !oneOffDraftDefinitionId) {
      Alert.alert(t('builder.oneOffShiftTypeTitle'), t('builder.oneOffShiftTypeError'));
      return;
    }

    const selectedDef = schedule.shiftDefinitions.find((def) => def.id === oneOffDraftDefinitionId);
    const exception: UniversalOneOffException = {
      id: generateShiftId('one_off'),
      date,
      action: oneOffDraftAction,
      shiftDefinitionId:
        oneOffDraftAction === 'use_shift_definition' ? oneOffDraftDefinitionId : undefined,
      label:
        oneOffDraftAction === 'use_shift_definition'
          ? selectedDef
            ? t('builder.oneOffSwapToLabel', { shift: selectedDef.name })
            : t('builder.oneOffShiftSwapLabel')
          : t('builder.oneOffOffDayLabel'),
      reason: reason || undefined,
    };

    updateSchedule((s) => ({
      ...s,
      oneOffExceptions: [
        ...(s.oneOffExceptions ?? []).filter((item) => item.date !== date),
        exception,
      ],
    }));
    setOneOffDraftReason('');
    Analytics.track('shift_builder_one_off_exception_added', {
      action: oneOffDraftAction,
      has_reason: Boolean(reason),
    });
  }, [
    oneOffDraftAction,
    oneOffDraftDate,
    oneOffDraftDefinitionId,
    oneOffDraftReason,
    schedule.shiftDefinitions,
    t,
    updateSchedule,
  ]);

  const handleRemoveOneOffException = useCallback(
    (id: string) => {
      updateSchedule((s) => ({
        ...s,
        oneOffExceptions: (s.oneOffExceptions ?? []).filter((item) => item.id !== id),
      }));
    },
    [updateSchedule]
  );

  const handleExportCalendar = useCallback(async () => {
    const result = validateUniversalSchedule(schedule);
    if (!result.valid) {
      Alert.alert(t('builder.calendarExportBlockedTitle'), result.errors.join('\n'));
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(calendarExportStart.trim()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(calendarExportEnd.trim()) ||
      calendarExportStart.trim() > calendarExportEnd.trim()
    ) {
      Alert.alert(t('builder.calendarExportDatesTitle'), t('builder.calendarExportDatesError'));
      return;
    }

    setCalendarExporting(true);
    try {
      const exported = await exportUniversalScheduleToCalendarFile(schedule, {
        startDate: calendarExportStart.trim(),
        endDate: calendarExportEnd.trim(),
        includeOffDays: calendarIncludeOffDays,
      });
      await shareUniversalScheduleCalendarFile(exported.uri);
      Analytics.track('shift_builder_calendar_exported', {
        event_count: exported.eventCount,
        include_off_days: calendarIncludeOffDays,
      });
    } catch (err) {
      Alert.alert(
        t('builder.calendarExportFailedTitle'),
        err instanceof Error ? err.message : t('builder.calendarExportFailedMessage')
      );
    } finally {
      setCalendarExporting(false);
    }
  }, [calendarExportEnd, calendarExportStart, calendarIncludeOffDays, schedule, t]);

  const handleImportCalendar = useCallback(async () => {
    setCalendarImporting(true);
    setCalendarImportSummary(null);
    try {
      const result = await pickAndImportUniversalScheduleCalendar(schedule);
      if (!result) return;

      setSchedule(result.schedule);
      setIsDirty(true);
      setDismissedWarnings(false);
      const summary = `${result.importedCount} imported${
        result.skippedCount ? `, ${result.skippedCount} skipped` : ''
      }`;
      setCalendarImportSummary(summary);
      Analytics.track('shift_builder_calendar_imported', {
        imported_count: result.importedCount,
        skipped_count: result.skippedCount,
        warning_count: result.warnings.length,
      });
      if (result.warnings.length > 0) {
        Alert.alert(t('builder.calendarImportNotesTitle'), result.warnings.slice(0, 5).join('\n'));
      }
    } catch (err) {
      Alert.alert(
        t('builder.calendarImportFailedTitle'),
        err instanceof Error ? err.message : t('builder.calendarImportFailedMessage')
      );
    } finally {
      setCalendarImporting(false);
    }
  }, [schedule, t]);

  // ── AI flow ────────────────────────────────────────────────────────────────

  const handleBuildWithAI = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiError(null);
    setAiLoading(true);

    aiAbortRef.current = new AbortController();

    try {
      Analytics.track('shift_builder_ai_prompt_submitted', {
        prompt_length: aiPrompt.trim().length,
        has_existing_schedule: schedule.sequence.length > 0,
      });
      const result = await parseShiftScheduleDescription(
        {
          prompt: aiPrompt.trim(),
          timezone: DEFAULT_TIMEZONE,
          locale: i18n.language || 'en',
          today: todayStr(),
          existingSchedule: schedule.sequence.length > 0 ? schedule : undefined,
        },
        aiAbortRef.current.signal
      );
      Analytics.track('shift_builder_ai_draft_created', {
        status: result.status,
        confidence: result.confidence,
        has_draft: Boolean(result.scheduleDraft),
      });
      setAiResult(result);
      setAiReviewVisible(true);
    } catch (err) {
      if (err instanceof ShiftScheduleParserError) {
        setAiError(err.message);
      } else {
        setAiError('Something went wrong. Please try again.');
      }
    } finally {
      setAiLoading(false);
      aiAbortRef.current = null;
    }
  }, [aiPrompt, schedule, i18n.language]);

  const handleAiFollowUp = useCallback(
    async (prompt: string) => {
      if (aiFollowUpLoading) return;
      setAiFollowUpLoading(true);

      const followUpAbort = new AbortController();
      try {
        const result = await parseShiftScheduleDescription(
          {
            prompt,
            timezone: DEFAULT_TIMEZONE,
            locale: i18n.language || 'en',
            today: todayStr(),
            existingSchedule: aiResult?.scheduleDraft ?? schedule,
          },
          followUpAbort.signal
        );
        setAiResult(result);
      } catch (err) {
        Alert.alert(
          t('builder.followUpFailed'),
          err instanceof ShiftScheduleParserError ? err.message : t('builder.tryAgain')
        );
      } finally {
        setAiFollowUpLoading(false);
      }
    },
    [aiFollowUpLoading, aiResult, schedule, i18n.language, t]
  );

  const handleAiAccept = useCallback((draft: UniversalShiftSchedule) => {
    Analytics.track('shift_builder_ai_draft_accepted', {
      sequence_length: draft.sequence.length,
      definition_count: draft.shiftDefinitions.length,
      confidence: draft.aiDraftMeta?.confidence,
    });
    setSchedule(draft);
    setIsDirty(true);
    setDismissedWarnings(false);
    setAiReviewVisible(false);
    setAiResult(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleAiEditManually = useCallback(() => {
    setAiReviewVisible(false);
  }, []);

  const handleAiDiscard = useCallback(() => {
    setAiReviewVisible(false);
    setAiResult(null);
  }, []);

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = UNIVERSAL_SHIFT_TEMPLATES.find((candidate) => candidate.id === templateId);
      if (!template) return;

      const applyTemplate = () => {
        const nextSchedule = cloneTemplateSchedule(template.schedule);
        setSchedule(nextSchedule);
        setIsDirty(true);
        setDismissedWarnings(false);
        setAiPrompt(template.aiPromptExample);
        Analytics.track('shift_builder_template_applied', {
          template_id: template.id,
          industry: template.industry,
          sequence_length: nextSchedule.sequence.length,
          definition_count: nextSchedule.shiftDefinitions.length,
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      };

      if (isDirty || schedule.sequence.length > 0 || schedule.shiftDefinitions.length > 0) {
        Alert.alert(
          t('builder.templateReplaceTitle'),
          t('builder.templateReplaceMessage', { template: template.title }),
          [
            { text: t('builder.cancel'), style: 'cancel' },
            { text: t('builder.templateUseButton'), onPress: applyTemplate },
          ]
        );
        return;
      }

      applyTemplate();
    },
    [isDirty, schedule.sequence.length, schedule.shiftDefinitions.length, t]
  );

  // ── Back/close with dirty check ────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(t('builder.discardTitle'), t('builder.discardMessage'), [
        { text: t('builder.keepEditing'), style: 'cancel' },
        {
          text: t('builder.discard'),
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation, t]);

  // ── Save flow ──────────────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    setIsSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const normalized = normalizeUniversalSchedule(schedule, 'saved');
    if (normalized.errors.length > 0) {
      Analytics.track('shift_builder_validation_failed', {
        error_count: normalized.errors.length,
        warning_count: normalized.warnings.length,
      });
      Alert.alert(t('builder.cannotSave'), normalized.errors.join('\n'));
      setIsSaving(false);
      return;
    }

    const finalSchedule: UniversalShiftSchedule = {
      ...normalized.normalizedSchedule,
      name: schedule.name.trim() || 'My Schedule',
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDataAsync({
        universalSchedule: finalSchedule,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Analytics.track('shift_builder_saved', {
        sequence_length: finalSchedule.sequence.length,
        definition_count: finalSchedule.shiftDefinitions.length,
        source: finalSchedule.source,
        entry_point: entryPoint,
      });
      setIsDirty(false);
      if (isOnboardingEntry) {
        navigation.navigate((onSaveNextScreen ?? 'AhaMoment') as never);
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert(t('builder.saveFailed'), t('builder.saveFailedMessage'), [
        { text: t('builder.aiRetry'), onPress: () => void doSave() },
        { text: t('builder.cancel') },
      ]);
    } finally {
      setIsSaving(false);
    }
  }, [entryPoint, isOnboardingEntry, navigation, onSaveNextScreen, schedule, t, updateDataAsync]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const result = validateUniversalSchedule(schedule);

    if (!result.valid) {
      Analytics.track('shift_builder_validation_failed', {
        error_count: result.errors.length,
        warning_count: result.warnings.length,
      });
      setDismissedWarnings(false);
      Alert.alert(
        t('builder.cannotSave'),
        `${t('builder.fixIssues')}\n\n${result.errors.map((e) => `• ${e}`).join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (result.warnings.length > 0 && !dismissedWarnings) {
      Alert.alert(
        t('builder.reviewWarnings'),
        `${result.warnings.map((w) => `• ${w}`).join('\n')}\n\n${t('builder.saveAnywayQuestion')}`,
        [
          { text: t('builder.review'), style: 'cancel' },
          {
            text: t('builder.saveAnyway'),
            onPress: () => void doSave(),
          },
        ]
      );
      return;
    }

    await doSave();
  }, [schedule, isSaving, dismissedWarnings, doSave, t]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const canSave = validation.valid && !isSaving;

  const renderHeader = () => (
    <LinearGradient
      colors={['#1c1917', '#0c0a09']}
      style={[styles.headerBar, { paddingTop: insets.top }]}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
          accessibilityLabel={
            isDirty ? t('builder.discardTitle') : t('builder.goBack', { defaultValue: 'Go back' })
          }
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.paper} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {schedule.name.trim() || t('builder.fallbackTitle')}
          </Text>
          {isDirty && <Text style={styles.dirtyIndicator}>{t('builder.unsavedChanges')}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderButton, !canSave && styles.saveHeaderButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={!canSave || isSaving}
          accessibilityLabel={t('builder.save')}
          accessibilityRole="button"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.deepVoid} />
          ) : (
            <Text style={[styles.saveHeaderText, !canSave && styles.saveHeaderTextDisabled]}>
              {t('builder.save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderAiSection = () => {
    if (!aiAvailable) {
      return (
        <View style={styles.aiUnavailableRow}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.shadow} />
          <Text style={styles.aiUnavailableText}>{t('builder.aiUnavailable')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.aiSection}>
        {/* AI section header */}
        <TouchableOpacity
          style={styles.aiSectionHeader}
          onPress={() => setAiSectionExpanded((v) => !v)}
          accessibilityLabel={`AI builder, ${aiSectionExpanded ? 'collapse' : 'expand'}`}
          accessibilityRole="button"
        >
          <View style={styles.aiSectionHeaderLeft}>
            <Ionicons name="sparkles" size={16} color={theme.colors.sacredGold} />
            <Text style={styles.aiSectionTitle}>{t('builder.aiTitle')}</Text>
          </View>
          <Ionicons
            name={aiSectionExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.colors.dust}
          />
        </TouchableOpacity>

        {aiSectionExpanded && (
          <Animated.View entering={FadeInDown.duration(200)}>
            {/* Prompt input */}
            <View style={styles.aiPromptRow}>
              <TextInput
                style={styles.aiPromptInput}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder={t('builder.aiPromptPlaceholder')}
                placeholderTextColor={theme.colors.shadow}
                multiline={false}
                returnKeyType="done"
                editable={!aiLoading}
                accessibilityLabel={t('builder.aiPromptLabel')}
              />
              <Animated.View style={aiPulseStyle}>
                <TouchableOpacity
                  style={[
                    styles.aiBuildButton,
                    (!aiPrompt.trim() || aiLoading) && styles.aiBuildButtonDisabled,
                  ]}
                  onPress={() => void handleBuildWithAI()}
                  disabled={!aiPrompt.trim() || aiLoading}
                  accessibilityLabel={t('builder.aiBuildLabel')}
                  accessibilityRole="button"
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.deepVoid} />
                  ) : (
                    <Ionicons name="sparkles" size={18} color={theme.colors.deepVoid} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Example chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.exampleChipsScroll}
              contentContainerStyle={styles.exampleChipsContent}
            >
              {EXAMPLE_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.exampleChip}
                  onPress={() => {
                    setAiPrompt(p);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityLabel={`Example: ${p}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.exampleChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Error state */}
            {aiError && (
              <Animated.View entering={FadeInDown} style={styles.aiErrorRow}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.error} />
                <Text style={styles.aiErrorText}>{aiError}</Text>
                <TouchableOpacity
                  onPress={() => void handleBuildWithAI()}
                  accessibilityLabel="Retry AI"
                  accessibilityRole="button"
                >
                  <Text style={styles.aiRetryText}>{t('builder.aiRetry')}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  const renderTemplateSection = () => (
    <View style={styles.section}>
      <View style={styles.templateHeaderRow}>
        <View style={styles.templateHeaderCopy}>
          <Text style={styles.sectionLabel}>{t('builder.templateTitle')}</Text>
          <Text style={styles.templateHint}>{t('builder.templateHint')}</Text>
        </View>
        <View style={styles.templateCountBadge}>
          <Ionicons name="albums-outline" size={13} color={theme.colors.deepVoid} />
          <Text style={styles.templateCountText}>{UNIVERSAL_SHIFT_TEMPLATES.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.templateScroll}
        contentContainerStyle={styles.templateContent}
      >
        {UNIVERSAL_SHIFT_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => handleApplyTemplate(template.id)}
            accessibilityRole="button"
            accessibilityLabel={t('builder.useTemplateA11y', { template: template.title })}
          >
            <View style={styles.templateCardTopRow}>
              <View style={styles.templateIconStack}>
                {template.schedule.shiftDefinitions.slice(0, 3).map((definition, index) => (
                  <View
                    key={`${template.id}-${definition.id}`}
                    style={[
                      styles.templateIconBubble,
                      {
                        backgroundColor: `${definition.color}24`,
                        marginLeft: index === 0 ? 0 : -8,
                        zIndex: 3 - index,
                      },
                    ]}
                  >
                    <Ionicons name={definition.icon as never} size={14} color={definition.color} />
                  </View>
                ))}
              </View>
              <Text style={styles.templateCycleText}>
                {t('builder.templateCycleLength', { count: template.schedule.sequence.length })}
              </Text>
            </View>

            <Text style={styles.templateTitle} numberOfLines={2}>
              {template.title}
            </Text>
            <Text style={styles.templateSubtitle} numberOfLines={3}>
              {template.subtitle}
            </Text>

            <View style={styles.templateFooterRow}>
              <Text style={styles.templateIndustryText} numberOfLines={1}>
                {template.industry.replace(/_/g, ' ')}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={theme.colors.sacredGold} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAnchorSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t('builder.matchFrom')}</Text>
      <TouchableOpacity
        style={styles.anchorDateButton}
        onPress={handleAnchorDatePress}
        accessibilityLabel={`${t('builder.matchFrom')} ${schedule.anchorDate}`}
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={16} color={theme.colors.dust} />
        <Text style={styles.anchorDateText}>{schedule.anchorDate}</Text>
        <Ionicons name="pencil-outline" size={14} color={theme.colors.shadow} />
      </TouchableOpacity>
      <Text style={styles.anchorHint}>{t('builder.matchFromHint')}</Text>

      <View style={styles.phaseOffsetRow}>
        <View style={styles.phaseOffsetInfo}>
          <Text style={styles.phaseOffsetLabel}>{t('builder.whatDayAreYouOn')}</Text>
          <Text style={styles.phaseOffsetHint}>
            {t('builder.cycleDaySummary', {
              date: schedule.anchorDate,
              day: alignmentDayNumber,
              label: alignmentDayLabel,
            })}
          </Text>
        </View>
        <TextInput
          style={styles.phaseOffsetInput}
          value={String(alignmentDayNumber)}
          onChangeText={handleCycleDayNumberChange}
          keyboardType="number-pad"
          maxLength={3}
          selectTextOnFocus
          accessibilityLabel={t('builder.cycleDayNumberLabel')}
        />
      </View>
      {alignmentChoices.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.alignmentChoicesScroll}
          contentContainerStyle={styles.alignmentChoicesContent}
        >
          {alignmentChoices.map((choice) => {
            const selected = choice.index === alignmentDayNumber - 1;
            return (
              <TouchableOpacity
                key={`${choice.index}-${choice.label}`}
                style={[styles.alignmentChoice, selected && styles.alignmentChoiceSelected]}
                onPress={() => handleAlignmentChoicePress(choice.index)}
                accessibilityLabel={`Set selected date to cycle day ${choice.index + 1}, ${choice.label}`}
                accessibilityState={{ selected }}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.alignmentChoiceDay,
                    selected && styles.alignmentChoiceTextSelected,
                  ]}
                >
                  {t('builder.dayNumber', { day: choice.index + 1 })}
                </Text>
                <Text
                  style={[
                    styles.alignmentChoiceLabel,
                    selected && styles.alignmentChoiceTextSelected,
                  ]}
                  numberOfLines={1}
                >
                  {choice.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderHolidayExceptionsSection = () => {
    const exceptions = schedule.holidayExceptions ?? [];

    return (
      <View style={styles.section}>
        <View style={styles.holidayHeaderRow}>
          <View>
            <Text style={styles.sectionLabel}>{t('builder.holidayTitle')}</Text>
            <Text style={styles.holidayHint}>{t('builder.holidayHint')}</Text>
          </View>
          <View style={styles.holidayCountBadge}>
            <Ionicons name="calendar" size={13} color={theme.colors.deepVoid} />
            <Text style={styles.holidayCountText}>{exceptions.length}</Text>
          </View>
        </View>

        <View style={styles.holidayImportCard}>
          <View style={styles.holidayImportInputs}>
            <TextInput
              style={styles.holidayCountryInput}
              value={holidayCountry}
              onChangeText={(text) => setHolidayCountry(text.slice(0, 2).toUpperCase())}
              placeholder="US"
              placeholderTextColor={theme.colors.shadow}
              autoCapitalize="characters"
              maxLength={2}
              accessibilityLabel={t('builder.holidayCountryA11y')}
            />
            <TextInput
              style={styles.holidayYearInput}
              value={holidayYear}
              onChangeText={(text) => setHolidayYear(text.replace(/\D/g, '').slice(0, 4))}
              placeholder="2026"
              placeholderTextColor={theme.colors.shadow}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel={t('builder.holidayYearA11y')}
            />
            <TouchableOpacity
              style={[
                styles.holidayImportButton,
                holidayImporting && styles.holidayImportButtonDisabled,
              ]}
              onPress={() => void handleImportPublicHolidays()}
              disabled={holidayImporting}
              accessibilityLabel={t('builder.holidayImportA11y')}
              accessibilityRole="button"
            >
              {holidayImporting ? (
                <ActivityIndicator size="small" color={theme.colors.deepVoid} />
              ) : (
                <Ionicons name="download-outline" size={16} color={theme.colors.deepVoid} />
              )}
              <Text style={styles.holidayImportButtonText}>{t('builder.import')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.holidayManualRow}>
            <TextInput
              style={styles.holidayNameInput}
              value={holidayDraftName}
              onChangeText={setHolidayDraftName}
              placeholder={t('builder.holidayNamePlaceholder')}
              placeholderTextColor={theme.colors.shadow}
              maxLength={80}
              accessibilityLabel={t('builder.holidayNameA11y')}
            />
            <TextInput
              style={styles.holidayDateInput}
              value={holidayDraftDate}
              onChangeText={(text) => setHolidayDraftDate(text.slice(0, 10))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.shadow}
              maxLength={10}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              accessibilityLabel={t('builder.holidayDateA11y')}
            />
            <TouchableOpacity
              style={styles.holidayAddButton}
              onPress={handleAddManualHolidayException}
              accessibilityLabel={t('builder.holidayAddA11y')}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={theme.colors.deepVoid} />
            </TouchableOpacity>
          </View>
        </View>

        {exceptions.length > 0 && (
          <View style={styles.holidayList}>
            {exceptions
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((exception) => (
                <View key={exception.id} style={styles.holidayListItem}>
                  <View style={styles.holidayListIcon}>
                    <Ionicons name="calendar" size={15} color="#ea580c" />
                  </View>
                  <View style={styles.holidayListTextWrap}>
                    <Text style={styles.holidayListTitle} numberOfLines={1}>
                      {exception.holidayName}
                    </Text>
                    <Text style={styles.holidayListSubtitle} numberOfLines={1}>
                      {t('builder.holidayListSubtitle', {
                        date: exception.date,
                        country: exception.country,
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.holidayRemoveButton}
                    onPress={() => handleRemoveHolidayException(exception.id)}
                    accessibilityLabel={t('builder.removeHolidayA11y', {
                      holiday: exception.holidayName,
                    })}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </View>
    );
  };

  const renderOneOffExceptionsSection = () => {
    const exceptions = schedule.oneOffExceptions ?? [];
    const selectedDefinition = schedule.shiftDefinitions.find(
      (definition) => definition.id === oneOffDraftDefinitionId
    );

    return (
      <View style={styles.section}>
        <View style={styles.holidayHeaderRow}>
          <View>
            <Text style={styles.sectionLabel}>{t('builder.oneOffTitle')}</Text>
            <Text style={styles.holidayHint}>{t('builder.oneOffHint')}</Text>
          </View>
          <View style={styles.oneOffCountBadge}>
            <Ionicons name="swap-horizontal" size={13} color={theme.colors.paper} />
            <Text style={styles.oneOffCountText}>{exceptions.length}</Text>
          </View>
        </View>

        <View style={styles.holidayImportCard}>
          <View style={styles.oneOffActionRow}>
            {(['use_shift_definition', 'mark_off'] as const).map((action) => {
              const selected = action === oneOffDraftAction;
              return (
                <TouchableOpacity
                  key={action}
                  style={[styles.oneOffActionChip, selected && styles.oneOffActionChipSelected]}
                  onPress={() => setOneOffDraftAction(action)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={
                      action === 'use_shift_definition' ? 'repeat-outline' : 'remove-circle-outline'
                    }
                    size={14}
                    color={selected ? theme.colors.deepVoid : theme.colors.dust}
                  />
                  <Text
                    style={[styles.oneOffActionText, selected && styles.oneOffActionTextSelected]}
                  >
                    {action === 'use_shift_definition'
                      ? t('builder.swapShift')
                      : t('builder.makeOff')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.holidayManualRow}>
            <TextInput
              style={styles.holidayDateInput}
              value={oneOffDraftDate}
              onChangeText={(text) => setOneOffDraftDate(text.slice(0, 10))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.shadow}
              maxLength={10}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              accessibilityLabel={t('builder.oneOffDateA11y')}
            />
            <TextInput
              style={styles.oneOffReasonInput}
              value={oneOffDraftReason}
              onChangeText={setOneOffDraftReason}
              placeholder={t('builder.oneOffReasonPlaceholder')}
              placeholderTextColor={theme.colors.shadow}
              maxLength={120}
              accessibilityLabel={t('builder.oneOffReasonA11y')}
            />
          </View>

          {oneOffDraftAction === 'use_shift_definition' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.oneOffDefinitionsScroll}
              contentContainerStyle={styles.oneOffDefinitionsContent}
            >
              {schedule.shiftDefinitions.map((definition) => {
                const selected = definition.id === oneOffDraftDefinitionId;
                return (
                  <TouchableOpacity
                    key={definition.id}
                    style={[
                      styles.oneOffDefinitionChip,
                      selected && styles.oneOffDefinitionChipSelected,
                      { borderColor: selected ? definition.color : theme.colors.softStone },
                    ]}
                    onPress={() => setOneOffDraftDefinitionId(definition.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons name={definition.icon as never} size={14} color={definition.color} />
                    <Text style={styles.oneOffDefinitionText} numberOfLines={1}>
                      {definition.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.oneOffAddButton}
            onPress={handleAddOneOffException}
            accessibilityLabel={t('builder.oneOffAddA11y')}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle" size={18} color={theme.colors.deepVoid} />
            <Text style={styles.oneOffAddButtonText}>
              {oneOffDraftAction === 'use_shift_definition'
                ? t('builder.makeThisDayShift', {
                    shift: selectedDefinition?.name ?? t('builder.selectedShift'),
                  })
                : t('builder.makeThisDayOff')}
            </Text>
          </TouchableOpacity>
        </View>

        {exceptions.length > 0 && (
          <View style={styles.holidayList}>
            {exceptions
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((exception) => {
                const definition = schedule.shiftDefinitions.find(
                  (candidate) => candidate.id === exception.shiftDefinitionId
                );
                return (
                  <View
                    key={exception.id}
                    style={[
                      styles.holidayListItem,
                      {
                        borderColor: definition?.color ?? '#0ea5e9',
                        borderLeftWidth: 4,
                        borderLeftColor: definition?.color ?? '#0ea5e9',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.oneOffListIcon,
                        { backgroundColor: `${definition?.color ?? '#0ea5e9'}24` },
                      ]}
                    >
                      <Ionicons
                        name={(definition?.icon as never) ?? 'swap-horizontal'}
                        size={15}
                        color={definition?.color ?? '#0ea5e9'}
                      />
                    </View>
                    <View style={styles.holidayListTextWrap}>
                      <Text style={styles.holidayListTitle} numberOfLines={1}>
                        {exception.action === 'use_shift_definition'
                          ? t('builder.oneOffSwapToLabel', {
                              shift: definition?.name ?? t('builder.shift'),
                            })
                          : exception.label || t('builder.oneOffOffDayLabel')}
                      </Text>
                      <Text style={styles.holidayListSubtitle} numberOfLines={1}>
                        {exception.date}
                        {exception.reason ? ` • ${exception.reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.holidayRemoveButton}
                      onPress={() => handleRemoveOneOffException(exception.id)}
                      accessibilityLabel={t('builder.removeOneOffA11y')}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
          </View>
        )}
      </View>
    );
  };

  const renderCalendarImportExportSection = () => (
    <View style={styles.section}>
      <View style={styles.holidayHeaderRow}>
        <View>
          <Text style={styles.sectionLabel}>{t('builder.calendarTitle')}</Text>
          <Text style={styles.holidayHint}>{t('builder.calendarHint')}</Text>
        </View>
        <View style={styles.calendarCountBadge}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.deepVoid} />
          <Text style={styles.calendarCountText}>ICS</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarDateRow}>
          <TextInput
            style={styles.calendarDateInput}
            value={calendarExportStart}
            onChangeText={(text) => setCalendarExportStart(text.slice(0, 10))}
            placeholder="Start YYYY-MM-DD"
            placeholderTextColor={theme.colors.shadow}
            maxLength={10}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            accessibilityLabel={t('builder.calendarExportStartA11y')}
          />
          <TextInput
            style={styles.calendarDateInput}
            value={calendarExportEnd}
            onChangeText={(text) => setCalendarExportEnd(text.slice(0, 10))}
            placeholder="End YYYY-MM-DD"
            placeholderTextColor={theme.colors.shadow}
            maxLength={10}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            accessibilityLabel={t('builder.calendarExportEndA11y')}
          />
        </View>

        <TouchableOpacity
          style={styles.calendarToggleRow}
          onPress={() => setCalendarIncludeOffDays((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: calendarIncludeOffDays }}
          accessibilityLabel={t('builder.calendarIncludeOffA11y')}
        >
          <Ionicons
            name={calendarIncludeOffDays ? 'checkbox' : 'square-outline'}
            size={18}
            color={calendarIncludeOffDays ? theme.colors.sacredGold : theme.colors.shadow}
          />
          <Text style={styles.calendarToggleText}>{t('builder.calendarIncludeOff')}</Text>
        </TouchableOpacity>

        <View style={styles.calendarActionRow}>
          <TouchableOpacity
            style={[
              styles.calendarPrimaryButton,
              calendarExporting && styles.holidayImportButtonDisabled,
            ]}
            onPress={() => void handleExportCalendar()}
            disabled={calendarExporting}
            accessibilityRole="button"
            accessibilityLabel={t('builder.calendarExportA11y')}
          >
            {calendarExporting ? (
              <ActivityIndicator size="small" color={theme.colors.deepVoid} />
            ) : (
              <Ionicons name="share-outline" size={17} color={theme.colors.deepVoid} />
            )}
            <Text style={styles.calendarPrimaryButtonText}>{t('builder.calendarExport')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.calendarSecondaryButton,
              calendarImporting && styles.holidayImportButtonDisabled,
            ]}
            onPress={() => void handleImportCalendar()}
            disabled={calendarImporting}
            accessibilityRole="button"
            accessibilityLabel={t('builder.calendarImportA11y')}
          >
            {calendarImporting ? (
              <ActivityIndicator size="small" color={theme.colors.paper} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={17} color={theme.colors.paper} />
            )}
            <Text style={styles.calendarSecondaryButtonText}>{t('builder.calendarImport')}</Text>
          </TouchableOpacity>
        </View>

        {calendarImportSummary ? (
          <View style={styles.calendarImportSummary}>
            <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
            <Text style={styles.calendarImportSummaryText}>{calendarImportSummary}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderAnchorPicker = () => (
    <Modal
      visible={anchorPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setAnchorPickerVisible(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.anchorPickerSheet}>
          <View style={styles.anchorPickerHeader}>
            <View style={styles.anchorPickerTitleRow}>
              <View style={styles.anchorPickerIcon}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.sacredGold} />
              </View>
              <View>
                <Text style={styles.anchorPickerTitle}>{t('builder.matchFrom')}</Text>
                <Text style={styles.anchorPickerSubtitle}>{t('builder.matchDateSubtitle')}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setAnchorPickerVisible(false)}
              hitSlop={8}
              accessibilityLabel={t('builder.closeDatePicker')}
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.shadow} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.anchorPickerInput, anchorDraftError && styles.anchorPickerInputError]}
            value={anchorDraft}
            onChangeText={(text) => {
              setAnchorDraft(text);
              setAnchorDraftError(null);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.shadow}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel={t('builder.dateInputLabel')}
          />
          {anchorDraftError ? (
            <Text style={styles.anchorPickerError}>{anchorDraftError}</Text>
          ) : (
            <Text style={styles.anchorPickerHelp}>{t('builder.dateHelp')}</Text>
          )}

          <View style={styles.anchorPickerQuickRow}>
            <TouchableOpacity
              style={styles.anchorPickerQuickButton}
              onPress={() => {
                setAnchorDraft(todayStr());
                setAnchorDraftError(null);
              }}
              accessibilityLabel="Use today as the date to match from"
              accessibilityRole="button"
            >
              <Text style={styles.anchorPickerQuickText}>{t('builder.today')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.anchorPickerQuickButton}
              onPress={() => {
                setAnchorDraft(schedule.anchorDate);
                setAnchorDraftError(null);
              }}
              accessibilityLabel="Restore current match date"
              accessibilityRole="button"
            >
              <Text style={styles.anchorPickerQuickText}>{t('builder.current')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.anchorPickerApplyButton}
            onPress={handleAnchorDraftApply}
            accessibilityLabel={t('builder.applyDate')}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.deepVoid} />
            <Text style={styles.anchorPickerApplyText}>{t('builder.applyDate')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSequenceItemEditor = () => {
    if (sequenceEditIndex === null) return null;
    const item = schedule.sequence[sequenceEditIndex];
    const definition = item
      ? schedule.shiftDefinitions.find((def) => def.id === item.shiftDefinitionId)
      : undefined;

    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setSequenceEditIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.anchorPickerSheet}>
            <View style={styles.anchorPickerHeader}>
              <View style={styles.anchorPickerTitleRow}>
                <View style={styles.anchorPickerIcon}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.sacredGold} />
                </View>
                <View>
                  <Text style={styles.anchorPickerTitle}>Day {sequenceEditIndex + 1}</Text>
                  <Text style={styles.anchorPickerSubtitle}>
                    {definition?.name ?? 'Sequence item'} label
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSequenceEditIndex(null)}
                hitSlop={8}
                accessibilityLabel="Close sequence item editor"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.shadow} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.anchorPickerInput}
              value={sequenceLabelDraft}
              onChangeText={(text) => setSequenceLabelDraft(text.slice(0, 80))}
              placeholder={definition?.name ?? 'Custom day label'}
              placeholderTextColor={theme.colors.shadow}
              maxLength={80}
              accessibilityLabel="Custom label for this sequence day"
            />
            <Text style={styles.anchorPickerHelp}>
              Leave blank to use the reusable shift type name.
            </Text>

            <View style={styles.anchorPickerQuickRow}>
              <TouchableOpacity
                style={styles.anchorPickerQuickButton}
                onPress={() => setSequenceLabelDraft('')}
                accessibilityLabel="Clear custom day label"
                accessibilityRole="button"
              >
                <Text style={styles.anchorPickerQuickText}>Clear label</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.anchorPickerApplyButton}
              onPress={handleSequenceLabelSave}
              accessibilityLabel="Save custom day label"
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={18} color={theme.colors.deepVoid} />
              <Text style={styles.anchorPickerApplyText}>Save label</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom }]}>
      {renderHeader()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Schedule name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Schedule Name</Text>
            <TextInput
              style={styles.nameInput}
              value={schedule.name}
              onChangeText={handleNameChange}
              placeholder="My Schedule"
              placeholderTextColor={theme.colors.shadow}
              maxLength={120}
              accessibilityLabel="Schedule name"
            />
          </View>

          {/* AI section */}
          {renderAiSection()}

          {/* Template library */}
          {renderTemplateSection()}

          {/* Shift Types palette */}
          <View style={styles.section}>
            <ShiftDefinitionPalette
              definitions={schedule.shiftDefinitions}
              sequence={schedule.sequence}
              onAdd={handleAddShift}
              onEdit={handleEditDefinition}
              onDelete={handleDeleteDefinition}
              onCreateNew={handleCreateNewDefinition}
            />
          </View>

          {/* Sequence canvas */}
          <View style={styles.section}>
            <ShiftSequenceCanvas
              sequence={schedule.sequence}
              definitions={schedule.shiftDefinitions}
              onReorder={handleReorder}
              onMoveItem={handleMoveItem}
              onDuplicate={handleDuplicate}
              onInsertBefore={handleInsertBefore}
              onInsertAfter={handleInsertAfter}
              onDelete={handleDeleteItem}
              onItemPress={handleItemPress}
              onAddShift={handleAddShift}
              onAddRepeatedBlock={handleAddRepeatedBlock}
            />
          </View>

          {/* Anchor date + phase */}
          {renderAnchorSection()}

          {/* Holiday exception controls */}
          {renderHolidayExceptionsSection()}

          {/* One-off exception controls */}
          {renderOneOffExceptionsSection()}

          {/* Calendar file controls */}
          {renderCalendarImportExportSection()}

          {/* Validation banner */}
          {(visibleErrors.length > 0 || visibleWarnings.length > 0) && (
            <View style={styles.section}>
              <BuilderValidationBanner
                errors={visibleErrors}
                warnings={visibleWarnings}
                onDismissWarnings={() => setDismissedWarnings(true)}
              />
            </View>
          )}

          {/* Preview calendar */}
          <View style={styles.section}>
            <SchedulePreviewCalendar
              schedule={schedule}
              hasErrors={!validation.valid}
              errors={visibleErrors}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Bottom save bar */}
        <View
          style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}
        >
          {visibleErrors.length > 0 && (
            <Text style={styles.saveBarErrorText} numberOfLines={1}>
              {visibleErrors[0]}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.saveBarButton, !canSave && styles.saveBarButtonDisabled]}
            onPress={() => void handleSave()}
            disabled={!canSave}
            accessibilityLabel="Save schedule"
            accessibilityRole="button"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.deepVoid} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={canSave ? theme.colors.deepVoid : theme.colors.shadow}
                />
                <Text
                  style={[styles.saveBarButtonText, !canSave && styles.saveBarButtonTextDisabled]}
                >
                  Save schedule
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Shift inspector sheet */}
      <ShiftInspectorSheet
        visible={inspectorVisible}
        definition={editingDefinition}
        onSave={handleSaveDefinition}
        onDelete={editingDefinition ? handleDeleteDefinition : undefined}
        onClose={() => {
          setInspectorVisible(false);
          setEditingDefinition(undefined);
        }}
      />

      {/* AI draft review sheet */}
      <AiDraftReviewSheet
        visible={aiReviewVisible}
        result={aiResult}
        onAccept={handleAiAccept}
        onEditManually={handleAiEditManually}
        onDiscard={handleAiDiscard}
        onFollowUp={(p) => void handleAiFollowUp(p)}
        isFollowUpLoading={aiFollowUpLoading}
      />

      {renderAnchorPicker()}
      {renderSequenceItemEditor()}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  kav: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: theme.colors.darkStone,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  dirtyIndicator: {
    color: theme.colors.warning,
    fontSize: 10,
    marginTop: 1,
  },
  saveHeaderButton: {
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderButtonDisabled: {
    backgroundColor: theme.colors.softStone,
  },
  saveHeaderText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  saveHeaderTextDisabled: {
    color: theme.colors.shadow,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.sm,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  nameInput: {
    backgroundColor: theme.colors.darkStone,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
  },
  // AI section
  aiSection: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.softStone,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  aiSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  aiSectionTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  aiPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  aiPromptInput: {
    flex: 1,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  aiBuildButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBuildButtonDisabled: {
    backgroundColor: theme.colors.softStone,
  },
  exampleChipsScroll: {
    paddingBottom: theme.spacing.sm,
  },
  exampleChipsContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  exampleChip: {
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
  },
  exampleChipText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  aiErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.errorBg,
  },
  aiErrorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.sm,
  },
  aiRetryText: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  aiUnavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  aiUnavailableText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.sm,
  },
  templateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  templateHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  templateHint: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  templateCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  templateCountText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  templateScroll: {
    marginHorizontal: -theme.spacing.md,
  },
  templateContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  templateCard: {
    width: 222,
    minHeight: 174,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  templateCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  templateIconStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
  },
  templateIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.darkStone,
  },
  templateCycleText: {
    color: theme.colors.dust,
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  templateTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 18,
    marginBottom: 5,
  },
  templateSubtitle: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 16,
    minHeight: 48,
  },
  templateFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  templateIndustryText: {
    flex: 1,
    color: theme.colors.sacredGold,
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'capitalize',
  },
  holidayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  holidayHint: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  holidayCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  holidayCountText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  holidayImportCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  holidayImportInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  holidayCountryInput: {
    width: 54,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
  },
  holidayYearInput: {
    width: 78,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    textAlign: 'center',
  },
  holidayImportButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.sacredGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  holidayImportButtonDisabled: {
    opacity: 0.7,
  },
  holidayImportButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  holidayManualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  holidayNameInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    fontSize: theme.typography.fontSizes.sm,
  },
  holidayDateInput: {
    width: 116,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    fontSize: theme.typography.fontSizes.sm,
  },
  holidayAddButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sacredGold,
  },
  holidayList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  holidayListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.sm,
  },
  holidayListIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 88, 12, 0.14)',
  },
  holidayListTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  holidayListTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  holidayListSubtitle: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  holidayRemoveButton: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oneOffCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0ea5e9',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  oneOffCountText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  oneOffActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  oneOffActionChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.softStone,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  oneOffActionChipSelected: {
    backgroundColor: theme.colors.sacredGold,
    borderColor: theme.colors.sacredGold,
  },
  oneOffActionText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  oneOffActionTextSelected: {
    color: theme.colors.deepVoid,
  },
  oneOffReasonInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    fontSize: theme.typography.fontSizes.sm,
  },
  oneOffDefinitionsScroll: {
    marginHorizontal: -theme.spacing.sm,
  },
  oneOffDefinitionsContent: {
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  oneOffDefinitionChip: {
    maxWidth: 160,
    minHeight: 36,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.softStone,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  oneOffDefinitionChipSelected: {
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
  },
  oneOffDefinitionText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  oneOffAddButton: {
    minHeight: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.sacredGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  oneOffAddButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  oneOffListIcon: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.16)',
  },
  calendarCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 46,
    justifyContent: 'center',
  },
  calendarCountText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  calendarCard: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  calendarDateRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  calendarDateInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    fontSize: theme.typography.fontSizes.sm,
  },
  calendarToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 34,
  },
  calendarToggleText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
  },
  calendarActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  calendarPrimaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.sacredGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  calendarPrimaryButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  calendarSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.softStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  calendarSecondaryButtonText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  calendarImportSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22, 163, 74, 0.14)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  calendarImportSummaryText: {
    color: '#86efac',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  // Anchor date section
  anchorDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    marginBottom: theme.spacing.xs,
  },
  anchorDateText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
  },
  anchorHint: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginBottom: theme.spacing.sm,
    lineHeight: 17,
  },
  phaseOffsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    gap: theme.spacing.md,
  },
  phaseOffsetInfo: {
    flex: 1,
  },
  phaseOffsetLabel: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  phaseOffsetHint: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  phaseOffsetInput: {
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    width: 60,
    textAlign: 'center',
  },
  alignmentChoicesScroll: {
    marginTop: theme.spacing.sm,
  },
  alignmentChoicesContent: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  alignmentChoice: {
    minWidth: 108,
    maxWidth: 150,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  alignmentChoiceSelected: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: theme.colors.sacredGold + '22',
  },
  alignmentChoiceDay: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
  alignmentChoiceLabel: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    marginTop: 2,
  },
  alignmentChoiceTextSelected: {
    color: theme.colors.sacredGold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  anchorPickerSheet: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
  },
  anchorPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  anchorPickerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  anchorPickerIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.sacredGold + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorPickerTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  anchorPickerSubtitle: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  anchorPickerInput: {
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  anchorPickerInputError: {
    borderColor: theme.colors.error,
  },
  anchorPickerError: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: theme.spacing.xs,
  },
  anchorPickerHelp: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: theme.spacing.xs,
  },
  anchorPickerQuickRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  anchorPickerQuickButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    paddingVertical: theme.spacing.sm,
  },
  anchorPickerQuickText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  anchorPickerApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  anchorPickerApplyText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  bottomSpacer: {
    height: 120,
  },
  // Save bar
  saveBar: {
    backgroundColor: theme.colors.darkStone,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  saveBarErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSizes.xs,
    textAlign: 'center',
  },
  saveBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
  },
  saveBarButtonDisabled: {
    backgroundColor: theme.colors.softStone,
  },
  saveBarButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  saveBarButtonTextDisabled: {
    color: theme.colors.shadow,
  },
});
