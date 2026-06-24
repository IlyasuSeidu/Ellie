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
  useWindowDimensions,
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
import {
  UNIVERSAL_SHIFT_TEMPLATES,
  type UniversalShiftTemplateIndustry,
} from '@/constants/universalShiftTemplates';

// ── Navigation types ──────────────────────────────────────────────────────────

export type UniversalShiftBuilderParams = {
  mode: 'create' | 'edit';
  entryPoint?: 'onboarding' | 'settings';
  onSaveNextScreen?: 'AhaMoment' | 'Completion' | 'SchedulePreviewSetup';
  existingSchedule?: UniversalShiftSchedule;
  editorMode?: 'simple' | 'advanced';
};

type BuilderRoute = RouteProp<
  { UniversalShiftBuilder: UniversalShiftBuilderParams },
  'UniversalShiftBuilder'
>;

type BuilderNavigation = {
  navigate: (screen: string, params?: unknown) => void;
  goBack: () => void;
};

type SelectedTemplateAnalytics = {
  templateId: string;
  industry: UniversalShiftTemplateIndustry;
};

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

function normalizeTemplateSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export const UniversalShiftBuilderScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation<BuilderNavigation>();
  const route = useRoute<BuilderRoute>();
  const { t, i18n } = useTranslation('schedule');
  const { data, updateDataAsync } = useOnboarding();

  const {
    mode: _mode,
    entryPoint = 'settings',
    onSaveNextScreen,
    existingSchedule,
    editorMode = 'advanced',
  } = route.params ?? { mode: 'create' as const };
  const isOnboardingEntry = entryPoint === 'onboarding';
  const startsSimple = editorMode === 'simple' || isOnboardingEntry;

  // ── Schedule state ──────────────────────────────────────────────────────────

  const [schedule, setSchedule] = useState<UniversalShiftSchedule>(
    () => existingSchedule ?? buildEmptySchedule(t('builder.defaultScheduleName'))
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
  const [selectedTemplateAnalytics, setSelectedTemplateAnalytics] =
    useState<SelectedTemplateAnalytics | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [cycleDayDraft, setCycleDayDraft] = useState('1');
  const templateTileWidth = Math.min(312, Math.max(248, windowWidth - theme.spacing.md * 5));

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
  const [advancedToolsVisible, setAdvancedToolsVisible] = useState(!startsSimple);
  const aiAbortRef = useRef<AbortController | null>(null);

  const aiAvailable = useMemo(() => config.features.aiShiftBuilderEnabled, []);
  const filteredTemplates = useMemo(() => {
    const query = normalizeTemplateSearch(templateSearchQuery);
    if (!query) return UNIVERSAL_SHIFT_TEMPLATES;

    return UNIVERSAL_SHIFT_TEMPLATES.filter((template) => {
      const searchableText = normalizeTemplateSearch(
        [
          template.id,
          template.industry,
          template.title,
          template.subtitle,
          template.aiPromptExample,
          template.visual.label,
          template.schedule.name,
          ...template.schedule.shiftDefinitions.map((definition) => definition.name),
        ].join(' ')
      );

      return searchableText.includes(query);
    });
  }, [templateSearchQuery]);
  const isTemplateSearchActive = templateSearchQuery.trim().length > 0;
  const templateSearchResultText = isTemplateSearchActive
    ? t('builder.templateSearchResultCount', {
        count: filteredTemplates.length,
        total: UNIVERSAL_SHIFT_TEMPLATES.length,
        defaultValue: '{{count}} of {{total}} templates',
      })
    : t('builder.templateSearchAllCount', {
        count: UNIVERSAL_SHIFT_TEMPLATES.length,
        defaultValue: '{{count}} templates',
      });

  useEffect(() => {
    Analytics.screenView('UniversalShiftBuilder');
    Analytics.track('shift_builder_opened', {
      mode: _mode,
      entry_point: entryPoint,
      editor_mode: editorMode,
      source: existingSchedule?.source ?? 'manual',
    });
  }, [_mode, editorMode, entryPoint, existingSchedule?.source]);

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

  const handleClearTemplateSearch = useCallback(() => {
    setTemplateSearchQuery('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  useEffect(() => {
    setCycleDayDraft(String(alignmentDayNumber));
  }, [alignmentDayNumber]);

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

  const setCycleDayNumber = useCallback(
    (dayNumber: number) => {
      const cycleLength = Math.max(schedule.sequence.length, 1);
      const safeDay = Math.min(Math.max(dayNumber, 1), cycleLength);

      setCycleDayDraft(String(safeDay));
      if (safeDay === alignmentDayNumber) return;

      updateSchedule((s) => ({ ...s, phaseOffset: safeDay - 1 }));
    },
    [alignmentDayNumber, schedule.sequence.length, updateSchedule]
  );

  const commitCycleDayNumber = useCallback(
    (draft: string) => {
      const parsed = Number.parseInt(draft, 10);
      setCycleDayNumber(Number.isFinite(parsed) ? parsed : alignmentDayNumber);
    },
    [alignmentDayNumber, setCycleDayNumber]
  );

  const handleCycleDayNumberChange = useCallback((text: string) => {
    setCycleDayDraft(text.replace(/[^0-9]/g, '').slice(0, 3));
  }, []);

  const handleCycleDayNumberCommit = useCallback(() => {
    commitCycleDayNumber(cycleDayDraft);
  }, [commitCycleDayNumber, cycleDayDraft]);

  const handleCycleDayStep = useCallback(
    (direction: -1 | 1) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCycleDayNumber(alignmentDayNumber + direction);
    },
    [alignmentDayNumber, setCycleDayNumber]
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
      setSelectedTemplateAnalytics(null);
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
        parser_source: result.parserSource,
        fallback_reason: result.fallbackReason,
        question_count: result.questions.length,
        warning_count: result.warnings.length,
      });
      Analytics.track('shift_builder_ai_parse_completed', {
        status: result.status,
        parser_source: result.parserSource,
        fallback_reason: result.fallbackReason,
        has_draft: Boolean(result.scheduleDraft),
      });
      if (result.parserSource === 'local_fallback') {
        Analytics.track('shift_builder_ai_fallback_used', {
          fallback_reason: result.fallbackReason ?? 'unknown',
          prompt_length: aiPrompt.trim().length,
          has_draft: Boolean(result.scheduleDraft),
        });
      }
      if (result.status === 'needs_clarification') {
        Analytics.track('shift_builder_ai_clarification_needed', {
          parser_source: result.parserSource,
          question_count: result.questions.length,
          has_draft: Boolean(result.scheduleDraft),
        });
      }
      setAiResult(result);
      setAiReviewVisible(true);
    } catch (err) {
      if (err instanceof ShiftScheduleParserError) {
        Analytics.track('shift_builder_ai_parse_failed', {
          code: err.code,
          retryable: err.retryable,
          prompt_length: aiPrompt.trim().length,
        });
        setAiError(err.message);
      } else {
        Analytics.track('shift_builder_ai_parse_failed', {
          code: 'unknown',
          retryable: false,
          prompt_length: aiPrompt.trim().length,
        });
        setAiError(t('builder.aiGenericError'));
      }
    } finally {
      setAiLoading(false);
      aiAbortRef.current = null;
    }
  }, [aiPrompt, schedule, i18n.language, t]);

  const handleAiFollowUp = useCallback(
    async (prompt: string) => {
      if (aiFollowUpLoading) return;
      setAiFollowUpLoading(true);

      const followUpAbort = new AbortController();
      try {
        Analytics.track('shift_builder_ai_follow_up_submitted', {
          prompt_length: prompt.length,
          had_existing_draft: Boolean(aiResult?.scheduleDraft),
        });
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
        Analytics.track('shift_builder_ai_parse_completed', {
          status: result.status,
          parser_source: result.parserSource,
          fallback_reason: result.fallbackReason,
          has_draft: Boolean(result.scheduleDraft),
          is_follow_up: true,
        });
        if (result.parserSource === 'local_fallback') {
          Analytics.track('shift_builder_ai_fallback_used', {
            fallback_reason: result.fallbackReason ?? 'unknown',
            prompt_length: prompt.length,
            has_draft: Boolean(result.scheduleDraft),
            is_follow_up: true,
          });
        }
        if (result.status === 'needs_clarification') {
          Analytics.track('shift_builder_ai_clarification_needed', {
            parser_source: result.parserSource,
            question_count: result.questions.length,
            has_draft: Boolean(result.scheduleDraft),
            is_follow_up: true,
          });
        }
        setAiResult(result);
      } catch (err) {
        Analytics.track('shift_builder_ai_parse_failed', {
          code: err instanceof ShiftScheduleParserError ? err.code : 'unknown',
          retryable: err instanceof ShiftScheduleParserError ? err.retryable : false,
          prompt_length: prompt.length,
          is_follow_up: true,
        });
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
      parser_source: draft.aiDraftMeta?.parserSource,
      fallback_reason: draft.aiDraftMeta?.fallbackReason,
      schedule_source: draft.source,
    });
    setSelectedTemplateAnalytics(null);
    setSchedule(draft);
    setIsDirty(true);
    setDismissedWarnings(false);
    setAiReviewVisible(false);
    setAiResult(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleAiEditManually = useCallback(() => {
    Analytics.track('shift_builder_ai_manual_edit_after_draft', {
      status: aiResult?.status,
      parser_source: aiResult?.parserSource,
      fallback_reason: aiResult?.fallbackReason,
      has_draft: Boolean(aiResult?.scheduleDraft),
    });
    setAiReviewVisible(false);
  }, [aiResult]);

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
        setSelectedTemplateAnalytics({ templateId: template.id, industry: template.industry });
        setIsDirty(true);
        setDismissedWarnings(false);
        setAiPrompt(template.aiPromptExample);
        Analytics.track('shift_builder_template_applied', {
          template_id: template.id,
          industry: template.industry,
          template_industry: template.industry,
          schedule_source: nextSchedule.source,
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
      name: schedule.name.trim() || t('builder.defaultScheduleName'),
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
        schedule_source: finalSchedule.source,
        entry_point: entryPoint,
        template_id: selectedTemplateAnalytics?.templateId,
        industry: selectedTemplateAnalytics?.industry,
        template_industry: selectedTemplateAnalytics?.industry,
        ai_parser_source: finalSchedule.aiDraftMeta?.parserSource,
        ai_fallback_reason: finalSchedule.aiDraftMeta?.fallbackReason,
      });
      setIsDirty(false);
      if (isOnboardingEntry) {
        if (onSaveNextScreen === 'SchedulePreviewSetup') {
          navigation.navigate(
            'SchedulePreviewSetup' as never,
            { scheduleDraft: finalSchedule } as never
          );
        } else {
          navigation.navigate((onSaveNextScreen ?? 'AhaMoment') as never);
        }
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
  }, [
    entryPoint,
    isOnboardingEntry,
    navigation,
    onSaveNextScreen,
    schedule,
    selectedTemplateAnalytics,
    t,
    updateDataAsync,
  ]);

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
      colors={['#07121a', '#02070b']}
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
          <Ionicons name="chevron-back" size={24} color={'#d6e7f2'} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {schedule.name.trim() || t('builder.fallbackTitle')}
          </Text>
          {isDirty && (
            <Text style={styles.dirtyIndicator} testID="universal-shift-builder-dirty-indicator">
              {t('builder.unsavedChanges')}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderButton, !canSave && styles.saveHeaderButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={!canSave || isSaving}
          accessibilityLabel={t('builder.save')}
          accessibilityRole="button"
          testID="universal-shift-builder-header-save-button"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={'#02070b'} />
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
          <Ionicons name="information-circle-outline" size={16} color={'#6f8798'} />
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
            <Ionicons name="sparkles" size={16} color={'#20f4dc'} />
            <Text style={styles.aiSectionTitle}>{t('builder.aiTitle')}</Text>
          </View>
          <Ionicons
            name={aiSectionExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={'#9db2c2'}
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
                placeholderTextColor={'#6f8798'}
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
                    <ActivityIndicator size="small" color={'#02070b'} />
                  ) : (
                    <Ionicons name="sparkles" size={18} color={'#02070b'} />
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
                  accessibilityLabel={t('builder.aiRetryA11y')}
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

  const renderSimpleEditorIntro = () => (
    <View style={styles.simpleIntroCard} testID="universal-shift-builder-simple-intro">
      <View style={styles.simpleIntroIcon}>
        <Ionicons name="sparkles" size={22} color={'#02070b'} />
      </View>
      <View style={styles.simpleIntroCopy}>
        <Text style={styles.simpleIntroTitle}>
          {t('builder.simpleEditorTitle', { defaultValue: 'Let Ryvro match your real rota' })}
        </Text>
        <Text style={styles.simpleIntroText}>
          {t('builder.simpleEditorBody', {
            defaultValue:
              'Answer the four plain questions below. When the preview looks right, Ryvro can answer your shift questions accurately.',
          })}
        </Text>
      </View>
    </View>
  );

  const renderSimpleStep = (
    step: number,
    title: string,
    helper: string,
    children: React.ReactNode,
    testID?: string
  ) => (
    <View style={styles.simpleStepCard} testID={testID}>
      <View style={styles.simpleStepHeader}>
        <View style={styles.simpleStepNumber}>
          <Text style={styles.simpleStepNumberText}>{step}</Text>
        </View>
        <View style={styles.simpleStepCopy}>
          <Text style={styles.simpleStepTitle}>{title}</Text>
          <Text style={styles.simpleStepHelper}>{helper}</Text>
        </View>
      </View>
      <View style={styles.simpleStepBody}>{children}</View>
    </View>
  );

  const renderScheduleNameSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{t('builder.scheduleName')}</Text>
      <TextInput
        style={styles.nameInput}
        value={schedule.name}
        onChangeText={handleNameChange}
        placeholder={t('builder.defaultScheduleName')}
        placeholderTextColor={'#6f8798'}
        maxLength={120}
        accessibilityLabel={t('builder.scheduleNameA11y')}
      />
    </View>
  );

  const renderAdvancedToolsToggle = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setAdvancedToolsVisible((visible) => !visible)}
        accessibilityRole="button"
        accessibilityState={{ expanded: advancedToolsVisible }}
        accessibilityLabel={t('builder.advancedToolsTitle', { defaultValue: 'Advanced tools' })}
        testID="universal-shift-builder-advanced-toggle"
      >
        <View style={styles.advancedToggleIcon}>
          <Ionicons name="options" size={18} color={'#20f4dc'} />
        </View>
        <View style={styles.advancedToggleCopy}>
          <Text style={styles.advancedToggleTitle}>
            {t('builder.advancedToolsTitle', { defaultValue: 'Advanced tools' })}
          </Text>
          <Text style={styles.advancedToggleText}>
            {t('builder.advancedToolsBody', {
              defaultValue: 'Templates, public holidays, one-day changes, and calendar import.',
            })}
          </Text>
        </View>
        <Ionicons
          name={advancedToolsVisible ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={'#9db2c2'}
        />
      </TouchableOpacity>
    </View>
  );

  const renderTemplateSection = () => (
    <View style={styles.section}>
      <View style={styles.templateHeaderRow}>
        <View style={styles.templateHeaderCopy}>
          <Text style={styles.sectionLabel}>{t('builder.templateTitle')}</Text>
          <Text style={styles.templateHint}>{t('builder.templateHint')}</Text>
        </View>
        <View style={styles.templateCountBadge}>
          <Ionicons name="albums-outline" size={13} color={'#02070b'} />
          <Text style={styles.templateCountText}>{filteredTemplates.length}</Text>
        </View>
      </View>

      <View style={styles.templateSearchGroup}>
        <View
          style={styles.templateSearchCard}
          testID="universal-shift-builder-template-search-row"
        >
          <Ionicons name="search" size={18} color={'#6f8798'} />
          <TextInput
            value={templateSearchQuery}
            onChangeText={setTemplateSearchQuery}
            placeholder={t('builder.templateSearchPlaceholder')}
            placeholderTextColor={'#6f8798'}
            accessibilityLabel={t('builder.templateSearchA11y')}
            accessibilityHint={t('builder.templateSearchHint', {
              defaultValue: 'Search templates by industry, shift type, or roster pattern.',
            })}
            style={styles.templateSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            testID="universal-shift-builder-template-search"
          />
          {isTemplateSearchActive && (
            <TouchableOpacity
              style={styles.templateSearchClearButton}
              onPress={handleClearTemplateSearch}
              accessibilityRole="button"
              accessibilityLabel={t('builder.templateSearchClearA11y', {
                defaultValue: 'Clear template search',
              })}
              testID="universal-shift-builder-template-search-clear"
            >
              <Ionicons name="close-circle" size={20} color={'#9db2c2'} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.templateSearchResultText}>{templateSearchResultText}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.templateScroll}
        contentContainerStyle={styles.templateContent}
        keyboardShouldPersistTaps="handled"
        testID="universal-shift-builder-template-scroll"
      >
        {filteredTemplates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[styles.templateCard, { width: templateTileWidth }]}
            onPress={() => handleApplyTemplate(template.id)}
            accessibilityRole="button"
            accessibilityLabel={t('builder.useTemplateA11y', { template: template.title })}
            testID={`universal-shift-builder-template-${template.id}`}
          >
            <View style={styles.templateCardTopRow}>
              <View style={styles.templateVisualGroup}>
                <View
                  style={[
                    styles.templateVisualBadge,
                    { backgroundColor: `${template.visual.accentColor}26` },
                  ]}
                >
                  <Ionicons
                    name={template.visual.icon as never}
                    size={18}
                    color={template.visual.accentColor}
                  />
                </View>
                <View style={styles.templateIconStack}>
                  {template.schedule.shiftDefinitions.slice(0, 3).map((definition, index) => (
                    <View
                      key={`${template.id}-${definition.id}`}
                      style={[
                        styles.templateIconBubble,
                        {
                          backgroundColor: 'rgba(32, 244, 220, 0.14)',
                          marginLeft: index === 0 ? 0 : -8,
                          zIndex: 3 - index,
                        },
                      ]}
                    >
                      <Ionicons
                        name={definition.icon as never}
                        size={14}
                        color={theme.colors.sacredGold}
                      />
                    </View>
                  ))}
                </View>
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
                {template.visual.label}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={'#20f4dc'} />
            </View>
          </TouchableOpacity>
        ))}
        {filteredTemplates.length === 0 && (
          <View
            style={[styles.templateEmptyCard, { width: templateTileWidth }]}
            testID="universal-shift-builder-template-empty"
          >
            <Ionicons name="search-outline" size={22} color={'#6f8798'} />
            <Text style={styles.templateEmptyTitle}>{t('builder.templateEmptyTitle')}</Text>
            <Text style={styles.templateEmptyHint}>{t('builder.templateEmptyHint')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderAnchorSection = () => (
    <View>
      <Text style={startsSimple ? styles.simpleInlineLabel : styles.sectionLabel}>
        {startsSimple
          ? t('builder.simpleAnchorLabel', { defaultValue: 'Pick one date you know for sure' })
          : t('builder.matchFrom')}
      </Text>
      <TouchableOpacity
        style={styles.anchorDateButton}
        onPress={handleAnchorDatePress}
        accessibilityLabel={`${t('builder.matchFrom')} ${schedule.anchorDate}`}
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={16} color={'#9db2c2'} />
        <Text style={styles.anchorDateText}>{schedule.anchorDate}</Text>
        <Ionicons name="pencil-outline" size={14} color={'#6f8798'} />
      </TouchableOpacity>
      <Text style={styles.anchorHint}>
        {startsSimple
          ? t('builder.simpleAnchorHint', {
              defaultValue:
                'Use a date where you are completely sure what you worked or that you were off.',
            })
          : t('builder.matchFromHint')}
      </Text>

      <View style={styles.phaseOffsetRow}>
        <View style={styles.phaseOffsetInfo}>
          <Text style={styles.phaseOffsetLabel}>
            {startsSimple
              ? t('builder.simplePhaseLabel', { defaultValue: 'What shift was that date?' })
              : t('builder.whatDayAreYouOn')}
          </Text>
          <Text style={styles.phaseOffsetHint}>
            {startsSimple
              ? t('builder.simplePhaseHint', {
                  defaultValue:
                    'This tells Ryvro if that date was your 1st off day, 2nd night, or another exact spot in the repeat.',
                })
              : t('builder.cycleDaySummary', {
                  date: schedule.anchorDate,
                  day: alignmentDayNumber,
                  label: alignmentDayLabel,
                })}
          </Text>
        </View>
        <View style={styles.phaseOffsetStepper}>
          <TouchableOpacity
            style={[
              styles.phaseOffsetStepButton,
              alignmentDayNumber <= 1 && styles.phaseOffsetStepButtonDisabled,
            ]}
            onPress={() => handleCycleDayStep(-1)}
            disabled={alignmentDayNumber <= 1}
            accessibilityRole="button"
            accessibilityLabel={t('builder.previousCycleDayA11y', {
              defaultValue: 'Go to previous cycle day',
            })}
            testID="universal-shift-builder-cycle-day-decrement"
          >
            <Ionicons
              name="remove"
              size={18}
              color={alignmentDayNumber <= 1 ? '#6f8798' : '#d6e7f2'}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.phaseOffsetInput}
            value={cycleDayDraft}
            onChangeText={handleCycleDayNumberChange}
            onBlur={handleCycleDayNumberCommit}
            onSubmitEditing={handleCycleDayNumberCommit}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={3}
            selectTextOnFocus
            accessibilityLabel={t('builder.cycleDayNumberLabel')}
            testID="universal-shift-builder-cycle-day-input"
          />
          <TouchableOpacity
            style={[
              styles.phaseOffsetStepButton,
              alignmentDayNumber >= Math.max(schedule.sequence.length, 1) &&
                styles.phaseOffsetStepButtonDisabled,
            ]}
            onPress={() => handleCycleDayStep(1)}
            disabled={alignmentDayNumber >= Math.max(schedule.sequence.length, 1)}
            accessibilityRole="button"
            accessibilityLabel={t('builder.nextCycleDayA11y', {
              defaultValue: 'Go to next cycle day',
            })}
            testID="universal-shift-builder-cycle-day-increment"
          >
            <Ionicons
              name="add"
              size={18}
              color={
                alignmentDayNumber >= Math.max(schedule.sequence.length, 1) ? '#6f8798' : '#d6e7f2'
              }
            />
          </TouchableOpacity>
        </View>
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
            <Ionicons name="calendar" size={13} color={'#02070b'} />
            <Text style={styles.holidayCountText}>{exceptions.length}</Text>
          </View>
        </View>

        <View style={styles.holidayImportCard}>
          <View style={styles.holidayImportInputs}>
            <TextInput
              style={styles.holidayCountryInput}
              value={holidayCountry}
              onChangeText={(text) => setHolidayCountry(text.slice(0, 2).toUpperCase())}
              placeholder={t('builder.holidayCountryPlaceholder')}
              placeholderTextColor={'#6f8798'}
              autoCapitalize="characters"
              maxLength={2}
              accessibilityLabel={t('builder.holidayCountryA11y')}
            />
            <TextInput
              style={styles.holidayYearInput}
              value={holidayYear}
              onChangeText={(text) => setHolidayYear(text.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('builder.holidayYearPlaceholder')}
              placeholderTextColor={'#6f8798'}
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
                <ActivityIndicator size="small" color={'#02070b'} />
              ) : (
                <Ionicons name="download-outline" size={16} color={'#02070b'} />
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
              placeholderTextColor={'#6f8798'}
              maxLength={80}
              accessibilityLabel={t('builder.holidayNameA11y')}
            />
            <TextInput
              style={styles.holidayDateInput}
              value={holidayDraftDate}
              onChangeText={(text) => setHolidayDraftDate(text.slice(0, 10))}
              placeholder={t('builder.dateFormatPlaceholder')}
              placeholderTextColor={'#6f8798'}
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
              <Ionicons name="add" size={18} color={'#02070b'} />
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
            <Ionicons name="swap-horizontal" size={13} color={'#d6e7f2'} />
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
                    color={selected ? '#02070b' : '#9db2c2'}
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
              placeholder={t('builder.dateFormatPlaceholder')}
              placeholderTextColor={'#6f8798'}
              maxLength={10}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
              accessibilityLabel={t('builder.oneOffDateA11y')}
            />
            <TextInput
              style={styles.oneOffReasonInput}
              value={oneOffDraftReason}
              onChangeText={setOneOffDraftReason}
              placeholder={t('builder.oneOffReasonPlaceholder')}
              placeholderTextColor={'#6f8798'}
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
                      {
                        borderColor: selected
                          ? theme.colors.sacredGold
                          : 'rgba(214, 231, 242, 0.14)',
                      },
                    ]}
                    onPress={() => setOneOffDraftDefinitionId(definition.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons
                      name={definition.icon as never}
                      size={14}
                      color={theme.colors.sacredGold}
                    />
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
            <Ionicons name="add-circle" size={18} color={'#02070b'} />
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
                        {t('builder.oneOffListSubtitle', {
                          date: exception.date,
                          reason: exception.reason ? ` • ${exception.reason}` : '',
                        })}
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
          <Ionicons name="calendar-outline" size={13} color={'#02070b'} />
          <Text style={styles.calendarCountText}>ICS</Text>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarDateRow}>
          <TextInput
            style={styles.calendarDateInput}
            value={calendarExportStart}
            onChangeText={(text) => setCalendarExportStart(text.slice(0, 10))}
            placeholder={t('builder.calendarExportStartPlaceholder')}
            placeholderTextColor={'#6f8798'}
            maxLength={10}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
            accessibilityLabel={t('builder.calendarExportStartA11y')}
          />
          <TextInput
            style={styles.calendarDateInput}
            value={calendarExportEnd}
            onChangeText={(text) => setCalendarExportEnd(text.slice(0, 10))}
            placeholder={t('builder.calendarExportEndPlaceholder')}
            placeholderTextColor={'#6f8798'}
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
            color={calendarIncludeOffDays ? '#20f4dc' : '#6f8798'}
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
              <ActivityIndicator size="small" color={'#02070b'} />
            ) : (
              <Ionicons name="share-outline" size={17} color={'#02070b'} />
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
              <ActivityIndicator size="small" color={'#d6e7f2'} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={17} color={'#d6e7f2'} />
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
                <Ionicons name="calendar-outline" size={18} color={'#20f4dc'} />
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
              <Ionicons name="close-circle" size={24} color={'#6f8798'} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.anchorPickerInput, anchorDraftError && styles.anchorPickerInputError]}
            value={anchorDraft}
            onChangeText={(text) => {
              setAnchorDraft(text);
              setAnchorDraftError(null);
            }}
            placeholder={t('builder.dateFormatPlaceholder')}
            placeholderTextColor={'#6f8798'}
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
              accessibilityLabel={t('builder.useTodayA11y')}
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
              accessibilityLabel={t('builder.restoreCurrentDateA11y')}
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
            <Ionicons name="checkmark-circle" size={18} color={'#02070b'} />
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
                  <Ionicons name="create-outline" size={18} color={'#20f4dc'} />
                </View>
                <View>
                  <Text style={styles.anchorPickerTitle}>
                    {t('builder.sequenceDayTitle', { day: sequenceEditIndex + 1 })}
                  </Text>
                  <Text style={styles.anchorPickerSubtitle}>
                    {t('builder.sequenceLabelSubtitle', {
                      label: definition?.name ?? t('builder.sequenceItem'),
                    })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSequenceEditIndex(null)}
                hitSlop={8}
                accessibilityLabel={t('builder.closeSequenceEditorA11y')}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={'#6f8798'} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.anchorPickerInput}
              value={sequenceLabelDraft}
              onChangeText={(text) => setSequenceLabelDraft(text.slice(0, 80))}
              placeholder={definition?.name ?? t('builder.customDayLabel')}
              placeholderTextColor={'#6f8798'}
              maxLength={80}
              accessibilityLabel={t('builder.customDayLabelA11y')}
            />
            <Text style={styles.anchorPickerHelp}>{t('builder.customDayLabelHelp')}</Text>

            <View style={styles.anchorPickerQuickRow}>
              <TouchableOpacity
                style={styles.anchorPickerQuickButton}
                onPress={() => setSequenceLabelDraft('')}
                accessibilityLabel={t('builder.clearCustomDayLabelA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.anchorPickerQuickText}>{t('builder.clearLabel')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.anchorPickerApplyButton}
              onPress={handleSequenceLabelSave}
              accessibilityLabel={t('builder.saveCustomDayLabelA11y')}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={18} color={'#02070b'} />
              <Text style={styles.anchorPickerApplyText}>{t('builder.saveLabel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View
      style={[styles.screen, { paddingBottom: insets.bottom }]}
      testID="universal-shift-builder-screen"
    >
      <LinearGradient
        colors={['#07121a', '#02070b', '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} pointerEvents="none" />
      <View style={styles.blueGlow} pointerEvents="none" />
      <View style={styles.goldGlow} pointerEvents="none" />
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
          {startsSimple ? <View style={styles.section}>{renderSimpleEditorIntro()}</View> : null}

          {!startsSimple ? renderScheduleNameSection() : null}

          {!advancedToolsVisible ? renderAdvancedToolsToggle() : null}

          {advancedToolsVisible ? (
            <>
              {renderAdvancedToolsToggle()}

              {startsSimple ? renderScheduleNameSection() : null}

              {/* AI section */}
              {renderAiSection()}

              {/* Template library */}
              {renderTemplateSection()}
            </>
          ) : null}

          {startsSimple ? (
            <View style={styles.section}>
              {renderSimpleStep(
                1,
                t('builder.simpleStepShiftsTitle', { defaultValue: 'What shifts do you work?' }),
                t('builder.simpleStepShiftsHelper', {
                  defaultValue:
                    'Add only the names grandma would say out loud: Day, Night, Off, Training, Leave.',
                }),
                <ShiftDefinitionPalette
                  definitions={schedule.shiftDefinitions}
                  sequence={schedule.sequence}
                  onAdd={handleAddShift}
                  onEdit={handleEditDefinition}
                  onDelete={handleDeleteDefinition}
                  onCreateNew={handleCreateNewDefinition}
                  title={t('builder.simplePaletteTitle', { defaultValue: 'Your shift names' })}
                  helperText={t('builder.simplePaletteHelper', {
                    defaultValue: 'Tap a shift to edit its time. Tap Add to put it in the repeat.',
                  })}
                  createLabel={t('builder.simplePaletteCreate', { defaultValue: 'Add shift' })}
                />,
                'universal-shift-builder-simple-step-shifts'
              )}
            </View>
          ) : (
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
          )}

          {startsSimple ? (
            <View style={styles.section}>
              {renderSimpleStep(
                2,
                t('builder.simpleStepOrderTitle', {
                  defaultValue: 'What order do those shifts repeat in?',
                }),
                t('builder.simpleStepOrderHelper', {
                  defaultValue:
                    'Build the repeat from the first day to the last day, then it starts again.',
                }),
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
                  title={t('builder.simpleCanvasTitle', { defaultValue: 'Your repeating order' })}
                  helperText={t('builder.simpleCanvasHelper', {
                    defaultValue:
                      'Example: Day, Day, Night, Night, Off, Off. Use the arrows if one is in the wrong place.',
                  })}
                  addShiftLabel={t('builder.simpleCanvasAddOne', { defaultValue: 'Add one day' })}
                  addBlockLabel={t('builder.simpleCanvasAddMany', {
                    defaultValue: 'Add same shift many times',
                  })}
                />,
                'universal-shift-builder-simple-step-order'
              )}
            </View>
          ) : (
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
          )}

          {/* Anchor date + phase */}
          {startsSimple ? (
            <View style={styles.section}>
              {renderSimpleStep(
                3,
                t('builder.simpleStepMatchTitle', {
                  defaultValue: 'What date should Ryvro match?',
                }),
                t('builder.simpleStepMatchHelper', {
                  defaultValue:
                    'This is the safety check that makes sure today is the correct Day, Night, or Off in your repeat.',
                }),
                renderAnchorSection(),
                'universal-shift-builder-simple-step-match'
              )}
            </View>
          ) : (
            <View style={styles.section}>{renderAnchorSection()}</View>
          )}

          {advancedToolsVisible ? (
            <>
              {/* Holiday exception controls */}
              {renderHolidayExceptionsSection()}

              {/* One-off exception controls */}
              {renderOneOffExceptionsSection()}

              {/* Calendar file controls */}
              {renderCalendarImportExportSection()}
            </>
          ) : null}

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

          {startsSimple ? (
            <View style={styles.section}>
              {renderSimpleStep(
                4,
                t('builder.simpleStepPreviewTitle', {
                  defaultValue: 'Does the preview look right?',
                }),
                t('builder.simpleStepPreviewHelper', {
                  defaultValue:
                    'Check a few dates you already know. If they match, save this schedule.',
                }),
                <SchedulePreviewCalendar
                  schedule={schedule}
                  hasErrors={!validation.valid}
                  errors={visibleErrors}
                />,
                'universal-shift-builder-simple-step-preview'
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <SchedulePreviewCalendar
                schedule={schedule}
                hasErrors={!validation.valid}
                errors={visibleErrors}
              />
            </View>
          )}

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
            accessibilityLabel={t('builder.saveScheduleA11y')}
            accessibilityRole="button"
            testID="universal-shift-builder-save-button"
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={'#02070b'} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={canSave ? '#02070b' : '#6f8798'}
                />
                <Text
                  style={[styles.saveBarButtonText, !canSave && styles.saveBarButtonTextDisabled]}
                >
                  {t('builder.saveSchedule')}
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
    backgroundColor: '#02070b',
  },
  cyanGlow: {
    position: 'absolute',
    top: -96,
    left: -98,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(32, 244, 220, 0.12)',
  },
  blueGlow: {
    position: 'absolute',
    top: 150,
    right: -150,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20, 124, 255, 0.12)',
  },
  goldGlow: {
    position: 'absolute',
    bottom: 60,
    left: -130,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(244, 184, 66, 0.08)',
  },
  kav: {
    flex: 1,
  },
  headerBar: {
    backgroundColor: 'rgba(8, 22, 31, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 231, 242, 0.12)',
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
    borderRadius: 20,
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#d6e7f2',
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
    backgroundColor: '#20f4dc',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderButtonDisabled: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
  },
  saveHeaderText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  saveHeaderTextDisabled: {
    color: '#6f8798',
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
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  simpleIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(8, 22, 31, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.28)',
    padding: theme.spacing.md,
  },
  simpleIntroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20f4dc',
  },
  simpleIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  simpleIntroTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  simpleIntroText: {
    marginTop: 4,
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 19,
  },
  simpleStepCard: {
    backgroundColor: 'rgba(8, 22, 31, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  simpleStepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  simpleStepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20f4dc',
  },
  simpleStepNumberText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  simpleStepCopy: {
    flex: 1,
    minWidth: 0,
  },
  simpleStepTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 24,
  },
  simpleStepHelper: {
    marginTop: 5,
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  simpleStepBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 231, 242, 0.1)',
    paddingTop: theme.spacing.md,
  },
  simpleInlineLabel: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    marginBottom: theme.spacing.xs,
  },
  advancedToggle: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(8, 22, 31, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    padding: theme.spacing.md,
  },
  advancedToggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
  },
  advancedToggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  advancedToggleTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  advancedToggleText: {
    marginTop: 3,
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
  },
  nameInput: {
    backgroundColor: 'rgba(8, 22, 31, 0.9)',
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.medium,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
  },
  // AI section
  aiSection: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    color: '#d6e7f2',
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
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  aiBuildButton: {
    width: 44,
    height: 44,
    backgroundColor: '#20f4dc',
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBuildButtonDisabled: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
  },
  exampleChipsScroll: {
    paddingBottom: theme.spacing.sm,
  },
  exampleChipsContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  exampleChip: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
  },
  exampleChipText: {
    color: '#9db2c2',
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
    color: '#20f4dc',
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
    color: '#6f8798',
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
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  templateCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#20f4dc',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  templateCountText: {
    color: '#02070b',
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
  templateSearchGroup: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  templateSearchCard: {
    backgroundColor: '#02070b',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    paddingHorizontal: theme.spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  templateSearchInput: {
    flex: 1,
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 20,
    padding: 0,
    minWidth: 0,
  },
  templateSearchClearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateSearchResultText: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  templateCard: {
    width: 222,
    minHeight: 174,
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
  templateVisualGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 104,
  },
  templateVisualBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    marginRight: 7,
  },
  templateIconStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 62,
  },
  templateIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(8, 22, 31, 0.88)',
  },
  templateCycleText: {
    color: '#9db2c2',
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  templateTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 18,
    marginBottom: 5,
  },
  templateSubtitle: {
    color: '#9db2c2',
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
    color: '#20f4dc',
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'capitalize',
  },
  templateEmptyCard: {
    width: 222,
    minHeight: 174,
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    padding: theme.spacing.md,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
  },
  templateEmptyTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  templateEmptyHint: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 16,
  },
  holidayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  holidayHint: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
    marginBottom: theme.spacing.sm,
  },
  holidayCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#20f4dc',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 36,
    justifyContent: 'center',
  },
  holidayCountText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  holidayImportCard: {
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
  },
  holidayYearInput: {
    width: 78,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    textAlign: 'center',
  },
  holidayImportButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#20f4dc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  holidayImportButtonDisabled: {
    opacity: 0.7,
  },
  holidayImportButtonText: {
    color: '#02070b',
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
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
    fontSize: theme.typography.fontSizes.sm,
  },
  holidayDateInput: {
    width: 116,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
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
    backgroundColor: '#20f4dc',
  },
  holidayList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  holidayListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  holidayListSubtitle: {
    color: '#6f8798',
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
    color: '#d6e7f2',
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
    borderColor: 'rgba(214, 231, 242, 0.14)',
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  oneOffActionChipSelected: {
    backgroundColor: '#20f4dc',
    borderColor: '#20f4dc',
  },
  oneOffActionText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  oneOffActionTextSelected: {
    color: '#02070b',
  },
  oneOffReasonInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
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
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
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
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  oneOffAddButton: {
    minHeight: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: '#20f4dc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  oneOffAddButtonText: {
    color: '#02070b',
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
    backgroundColor: '#20f4dc',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 46,
    justifyContent: 'center',
  },
  calendarCountText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
  calendarCard: {
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
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
    color: '#9db2c2',
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
    backgroundColor: '#20f4dc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  calendarPrimaryButtonText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  calendarSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.sm,
  },
  calendarSecondaryButtonText: {
    color: '#d6e7f2',
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
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    marginBottom: theme.spacing.xs,
  },
  anchorDateText: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
  },
  anchorHint: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    marginBottom: theme.spacing.sm,
    lineHeight: 17,
  },
  phaseOffsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
    gap: theme.spacing.md,
  },
  phaseOffsetInfo: {
    flex: 1,
  },
  phaseOffsetLabel: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  phaseOffsetHint: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  phaseOffsetStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(8, 22, 31, 0.88)',
    overflow: 'hidden',
  },
  phaseOffsetStepButton: {
    width: 38,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseOffsetStepButtonDisabled: {
    opacity: 0.45,
  },
  phaseOffsetInput: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    width: 54,
    minHeight: 42,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(8, 22, 31, 0.88)',
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
    borderColor: 'rgba(214, 231, 242, 0.14)',
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  alignmentChoiceSelected: {
    borderColor: '#20f4dc',
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
  },
  alignmentChoiceDay: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
  alignmentChoiceLabel: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    marginTop: 2,
  },
  alignmentChoiceTextSelected: {
    color: '#20f4dc',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  anchorPickerSheet: {
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorPickerTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  anchorPickerSubtitle: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  anchorPickerInput: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.14)',
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
    color: '#6f8798',
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
    borderColor: 'rgba(214, 231, 242, 0.14)',
    paddingVertical: theme.spacing.sm,
  },
  anchorPickerQuickText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  anchorPickerApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#20f4dc',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  anchorPickerApplyText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  bottomSpacer: {
    height: 120,
  },
  // Save bar
  saveBar: {
    backgroundColor: 'rgba(8, 22, 31, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 231, 242, 0.14)',
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
    backgroundColor: '#20f4dc',
    borderRadius: 24,
    paddingVertical: theme.spacing.md,
  },
  saveBarButtonDisabled: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
  },
  saveBarButtonText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  saveBarButtonTextDisabled: {
    color: '#6f8798',
  },
});
