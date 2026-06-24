/**
 * ShiftInspectorSheet
 *
 * Bottom sheet for creating or editing a shift definition. Full form including
 * name, kind, time policy, start/end times, color grid, icon picker, toggles,
 * and optional location field.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type {
  UniversalShiftDefinition,
  UniversalShiftKind,
  UniversalShiftTimePolicy,
  UniversalShiftActivePolicy,
} from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import { generateShiftId } from '@/utils/universalShiftUtils';
import { convertTo12Hour, convertTo24Hour } from '@/utils/shiftTimeUtils';

export interface ShiftInspectorSheetProps {
  visible: boolean;
  definition?: UniversalShiftDefinition;
  onSave: (def: UniversalShiftDefinition) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const KIND_OPTIONS: { value: UniversalShiftKind; label: string; icon: string }[] = [
  { value: 'work', label: 'Work', icon: 'briefcase' },
  { value: 'off', label: 'Off', icon: 'home' },
  { value: 'travel', label: 'Travel', icon: 'airplane' },
  { value: 'on_call', label: 'On Call', icon: 'phone-portrait' },
  { value: 'training', label: 'Training', icon: 'school' },
  { value: 'leave', label: 'Leave', icon: 'umbrella' },
  { value: 'custom', label: 'Custom', icon: 'ellipse' },
];

const SIMPLE_KIND_OPTIONS = KIND_OPTIONS.filter((option) =>
  ['work', 'off', 'training', 'leave'].includes(option.value)
);

const ICON_OPTIONS: string[] = [
  'sunny',
  'moon',
  'home',
  'airplane',
  'school',
  'phone-portrait',
  'briefcase',
  'medkit',
  'car',
  'train',
  'bicycle',
  'ellipse',
  'star',
  'heart',
  'flash',
  'construct',
  'hammer',
  'shield',
  'cafe',
  'restaurant',
  'bed',
  'fitness',
  'walk',
  'boat',
];

const SIMPLE_TIME_OPTIONS: { value: UniversalShiftTimePolicy; label: string; hint: string }[] = [
  { value: 'timed', label: 'Yes, add times', hint: 'Good for Day or Night shifts' },
  { value: 'all_day', label: 'All day', hint: 'Good for Off or Leave' },
  { value: 'none', label: 'No times', hint: 'Just show the shift name' },
];

function defaultForKind(kind: UniversalShiftKind): Partial<UniversalShiftDefinition> {
  switch (kind) {
    case 'work':
      return {
        countsAsWork: true,
        countsAsNight: false,
        timePolicy: 'timed',
        activePolicy: 'timed_window',
      };
    case 'off':
      return {
        countsAsWork: false,
        countsAsNight: false,
        timePolicy: 'all_day',
        activePolicy: 'not_active',
      };
    case 'travel':
      return {
        countsAsWork: true,
        countsAsNight: false,
        timePolicy: 'all_day',
        activePolicy: 'all_day_active',
      };
    case 'on_call':
      return {
        countsAsWork: false,
        countsAsNight: false,
        timePolicy: 'all_day',
        activePolicy: 'all_day_active',
      };
    case 'training':
      return {
        countsAsWork: true,
        countsAsNight: false,
        timePolicy: 'timed',
        activePolicy: 'timed_window',
      };
    case 'leave':
      return {
        countsAsWork: false,
        countsAsNight: false,
        timePolicy: 'all_day',
        activePolicy: 'not_active',
      };
    default:
      return {
        countsAsWork: false,
        countsAsNight: false,
        timePolicy: 'none',
        activePolicy: 'not_active',
      };
  }
}

function activeFromTimePolicy(tp: UniversalShiftTimePolicy): UniversalShiftActivePolicy {
  switch (tp) {
    case 'timed':
      return 'timed_window';
    case 'all_day':
      return 'all_day_active';
    default:
      return 'not_active';
  }
}

function clampIntegerText(text: string, min: number, max: number): number {
  const parsed = parseInt(text.replace(/\D/g, ''), 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function reminderProfileIdFor(name: string, existingId?: string): string {
  if (existingId?.trim()) return existingId.trim();
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}-reminders` : 'shift-reminders';
}

// Simple HH:mm wheel-style time input using two TextInput fields
interface TimeFieldProps {
  label: string;
  value: string; // HH:mm
  onChange: (v: string) => void;
}

const TimeField: React.FC<TimeFieldProps> = ({ label, value, onChange }) => {
  const { time, period } = convertTo12Hour(value || '00:00');
  const [h, m] = time.split(':');

  const updateHour = (text: string) => {
    const n = parseInt(text, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(1, Math.min(12, n));
    onChange(convertTo24Hour(`${String(clamped).padStart(2, '0')}:${m ?? '00'}`, period));
  };

  const updateMinute = (text: string) => {
    const n = parseInt(text, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(59, n));
    onChange(convertTo24Hour(`${h ?? '12'}:${String(clamped).padStart(2, '0')}`, period));
  };

  const updatePeriod = (nextPeriod: 'AM' | 'PM') => {
    onChange(convertTo24Hour(`${h ?? '12'}:${m ?? '00'}`, nextPeriod));
  };

  return (
    <View style={timeStyles.container}>
      <Text style={timeStyles.label}>{label}</Text>
      <View style={timeStyles.inputRow}>
        <TextInput
          style={timeStyles.segment}
          value={h ?? '00'}
          onChangeText={updateHour}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={`${label} hours`}
        />
        <Text style={timeStyles.colon}>:</Text>
        <TextInput
          style={timeStyles.segment}
          value={m ?? '00'}
          onChangeText={updateMinute}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={`${label} minutes`}
        />
        <View style={timeStyles.periodGroup}>
          {(['AM', 'PM'] as const).map((nextPeriod) => {
            const selected = period === nextPeriod;
            return (
              <TouchableOpacity
                key={nextPeriod}
                style={[timeStyles.periodButton, selected && timeStyles.periodButtonActive]}
                onPress={() => updatePeriod(nextPeriod)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label} ${nextPeriod}`}
              >
                <Text style={[timeStyles.periodText, selected && timeStyles.periodTextActive]}>
                  {nextPeriod}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const timeStyles = StyleSheet.create({
  container: { flex: 1, gap: 4 },
  label: { color: '#9db2c2', fontSize: theme.typography.fontSizes.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segment: {
    backgroundColor: '#02070b',
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    width: 52,
    textAlign: 'center',
  },
  colon: { color: '#d6e7f2', fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold' },
  periodGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderRadius: 12,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: '#20f4dc',
  },
  periodText: {
    color: '#9db2c2',
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.bold,
  },
  periodTextActive: {
    color: '#02070b',
  },
});

// ── Main component ────────────────────────────────────────────────────────────

export const ShiftInspectorSheet: React.FC<ShiftInspectorSheetProps> = ({
  visible,
  definition,
  onSave,
  onDelete,
  onClose,
}) => {
  const { t } = useTranslation('onboarding');
  const isNew = !definition;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<UniversalShiftKind>('work');
  const [timePolicy, setTimePolicy] = useState<UniversalShiftTimePolicy>('timed');
  const [activePolicy, setActivePolicy] = useState<UniversalShiftActivePolicy>('timed_window');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('18:00');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const color = '#20f4dc';
  const [icon, setIcon] = useState('sunny');
  const [countsAsWork, setCountsAsWork] = useState(true);
  const [countsAsNight, setCountsAsNight] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [reminderProfileId, setReminderProfileId] = useState('');
  const [earlyReminderHours, setEarlyReminderHours] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.earlyReminderHours
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.prepTimeMinutes
  );
  const [commuteTimeMinutes, setCommuteTimeMinutes] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.commuteTimeMinutes
  );
  const [imminentReminderEnabled, setImminentReminderEnabled] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.imminentReminderEnabled
  );
  const [preBriefingEnabled, setPreBriefingEnabled] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.preBriefingEnabled
  );
  const [fatigueAwareReminders, setFatigueAwareReminders] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.fatigueAwareReminders
  );
  const [postShiftCheckin, setPostShiftCheckin] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.postShiftCheckin
  );
  const [travelReminders, setTravelReminders] = useState(
    DEFAULT_SMART_REMINDER_SETTINGS.travelReminders
  );
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const displayName = name.trim() || 'Day Shift';

  // Reset form when sheet opens
  useEffect(() => {
    if (!visible) return;
    setShowMoreOptions(false);
    if (definition) {
      setName(definition.name);
      setKind(definition.kind);
      setTimePolicy(definition.timePolicy);
      setActivePolicy(definition.activePolicy);
      setStartTime(definition.startTime ?? '06:00');
      setEndTime(definition.endTime ?? '18:00');
      setCrossesMidnight(definition.crossesMidnight ?? false);
      setIcon(definition.icon);
      setCountsAsWork(definition.countsAsWork);
      setCountsAsNight(definition.countsAsNight);
      setLocationName(definition.locationName ?? '');
      setReminderProfileId(definition.reminderProfileId ?? '');
      setEarlyReminderHours(
        definition.reminderProfile?.earlyReminderHours ??
          DEFAULT_SMART_REMINDER_SETTINGS.earlyReminderHours
      );
      setPrepTimeMinutes(
        definition.reminderProfile?.prepTimeMinutes ??
          DEFAULT_SMART_REMINDER_SETTINGS.prepTimeMinutes
      );
      setCommuteTimeMinutes(
        definition.reminderProfile?.commuteTimeMinutes ??
          DEFAULT_SMART_REMINDER_SETTINGS.commuteTimeMinutes
      );
      setImminentReminderEnabled(
        definition.reminderProfile?.imminentReminderEnabled ??
          DEFAULT_SMART_REMINDER_SETTINGS.imminentReminderEnabled
      );
      setPreBriefingEnabled(
        definition.reminderProfile?.preBriefingEnabled ??
          DEFAULT_SMART_REMINDER_SETTINGS.preBriefingEnabled
      );
      setFatigueAwareReminders(
        definition.reminderProfile?.fatigueAwareReminders ??
          DEFAULT_SMART_REMINDER_SETTINGS.fatigueAwareReminders
      );
      setPostShiftCheckin(
        definition.reminderProfile?.postShiftCheckin ??
          DEFAULT_SMART_REMINDER_SETTINGS.postShiftCheckin
      );
      setTravelReminders(
        definition.reminderProfile?.travelReminders ??
          DEFAULT_SMART_REMINDER_SETTINGS.travelReminders
      );
    } else {
      setName('');
      setKind('work');
      setTimePolicy('timed');
      setActivePolicy('timed_window');
      setStartTime('06:00');
      setEndTime('18:00');
      setCrossesMidnight(false);
      setIcon('sunny');
      setCountsAsWork(true);
      setCountsAsNight(false);
      setLocationName('');
      setReminderProfileId('');
      setEarlyReminderHours(DEFAULT_SMART_REMINDER_SETTINGS.earlyReminderHours);
      setPrepTimeMinutes(DEFAULT_SMART_REMINDER_SETTINGS.prepTimeMinutes);
      setCommuteTimeMinutes(DEFAULT_SMART_REMINDER_SETTINGS.commuteTimeMinutes);
      setImminentReminderEnabled(DEFAULT_SMART_REMINDER_SETTINGS.imminentReminderEnabled);
      setPreBriefingEnabled(DEFAULT_SMART_REMINDER_SETTINGS.preBriefingEnabled);
      setFatigueAwareReminders(DEFAULT_SMART_REMINDER_SETTINGS.fatigueAwareReminders);
      setPostShiftCheckin(DEFAULT_SMART_REMINDER_SETTINGS.postShiftCheckin);
      setTravelReminders(DEFAULT_SMART_REMINDER_SETTINGS.travelReminders);
    }
  }, [visible, definition]);

  const handleKindChange = useCallback((k: UniversalShiftKind) => {
    setKind(k);
    const defaults = defaultForKind(k);
    if (defaults.countsAsWork !== undefined) setCountsAsWork(defaults.countsAsWork);
    if (defaults.countsAsNight !== undefined) setCountsAsNight(defaults.countsAsNight);
    if (defaults.timePolicy) setTimePolicy(defaults.timePolicy);
    if (defaults.activePolicy) setActivePolicy(defaults.activePolicy);
  }, []);

  const handleTimePolicyChange = useCallback((tp: UniversalShiftTimePolicy) => {
    setTimePolicy(tp);
    setActivePolicy(activeFromTimePolicy(tp));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert(
        t('shiftBuilder.inspector.nameRequiredTitle'),
        t('shiftBuilder.inspector.nameRequiredMessage')
      );
      return;
    }
    if (timePolicy === 'timed' && (!startTime || !endTime)) {
      Alert.alert(
        t('shiftBuilder.inspector.timesRequiredTitle'),
        t('shiftBuilder.inspector.timesRequiredMessage')
      );
      return;
    }

    const saved: UniversalShiftDefinition = {
      id: definition?.id ?? generateShiftId('def'),
      name: name.trim(),
      kind,
      timePolicy,
      activePolicy,
      startTime: timePolicy === 'timed' ? startTime : undefined,
      endTime: timePolicy === 'timed' ? endTime : undefined,
      crossesMidnight: timePolicy === 'timed' ? crossesMidnight : undefined,
      countsAsWork,
      countsAsNight,
      countsForStats: true,
      color,
      icon,
      locationName: locationName.trim() || undefined,
      reminderProfileId: countsAsWork ? reminderProfileIdFor(name, reminderProfileId) : undefined,
      reminderProfile: countsAsWork
        ? {
            earlyReminderHours,
            prepTimeMinutes,
            commuteTimeMinutes,
            imminentReminderEnabled,
            preBriefingEnabled,
            quietHoursEnabled: DEFAULT_SMART_REMINDER_SETTINGS.quietHoursEnabled,
            quietHoursStart: DEFAULT_SMART_REMINDER_SETTINGS.quietHoursStart,
            quietHoursEnd: DEFAULT_SMART_REMINDER_SETTINGS.quietHoursEnd,
            fatigueAwareReminders,
            backToBackWarnings: DEFAULT_SMART_REMINDER_SETTINGS.backToBackWarnings,
            shortTurnaroundWarnings: DEFAULT_SMART_REMINDER_SETTINGS.shortTurnaroundWarnings,
            postShiftCheckin,
            travelReminders,
          }
        : undefined,
    };

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(saved);
  }, [
    name,
    kind,
    timePolicy,
    activePolicy,
    startTime,
    endTime,
    crossesMidnight,
    color,
    icon,
    countsAsWork,
    countsAsNight,
    locationName,
    reminderProfileId,
    earlyReminderHours,
    prepTimeMinutes,
    commuteTimeMinutes,
    imminentReminderEnabled,
    preBriefingEnabled,
    fatigueAwareReminders,
    postShiftCheckin,
    travelReminders,
    definition,
    onSave,
    t,
  ]);

  const handleDelete = useCallback(() => {
    if (!definition || !onDelete) return;
    Alert.alert(
      t('shiftBuilder.inspector.deleteConfirm.title'),
      t('shiftBuilder.inspector.deleteConfirm.message'),
      [
        { text: t('shiftBuilder.inspector.deleteConfirm.cancel'), style: 'cancel' },
        {
          text: t('shiftBuilder.inspector.deleteConfirm.confirm'),
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(definition.id);
          },
        },
      ]
    );
  }, [definition, onDelete, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>
                  {t(
                    isNew
                      ? 'shiftBuilder.inspector.simpleTitleCreate'
                      : 'shiftBuilder.inspector.simpleTitleEdit',
                    {
                      defaultValue: isNew ? 'Add a shift Ryvro can answer with' : 'Edit this shift',
                    }
                  )}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {t('shiftBuilder.inspector.simpleSubtitle', {
                    defaultValue: 'Keep it simple. Add only what you would say out loud.',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                accessibilityLabel={t('common.closeButton')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#9db2c2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <View style={[styles.shiftPreviewCard, { borderColor: color }]}>
                <View style={[styles.shiftPreviewIcon, { backgroundColor: color }]}>
                  <Ionicons
                    name={icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color="#02070b"
                  />
                </View>
                <View style={styles.shiftPreviewCopy}>
                  <Text style={styles.shiftPreviewEyebrow}>
                    {t('shiftBuilder.inspector.previewEyebrow', {
                      defaultValue: 'Ryvro will answer with',
                    })}
                  </Text>
                  <Text style={styles.shiftPreviewName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <Text style={styles.questionLabel}>
                {t('shiftBuilder.inspector.simpleNameQuestion', {
                  defaultValue: 'What do you call this shift?',
                })}
              </Text>
              <Text style={styles.questionHelp}>
                {t('shiftBuilder.inspector.simpleNameHelp', {
                  defaultValue: 'Use the words you would naturally say: Early, Late, Night, Off.',
                })}
              </Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={(t) => setName(t.slice(0, 80))}
                placeholder={t('shiftBuilder.inspector.simpleNamePlaceholder', {
                  defaultValue: 'Example: Day Shift',
                })}
                placeholderTextColor="#6f8798"
                maxLength={80}
                accessibilityLabel={t('shiftBuilder.inspector.name')}
              />
              {name.length > 60 ? <Text style={styles.charCount}>{name.length}/80</Text> : null}

              {/* Kind */}
              <Text style={styles.questionLabel}>
                {t('shiftBuilder.inspector.simpleKindQuestion', {
                  defaultValue: 'Which one is closest?',
                })}
              </Text>
              <View style={styles.simpleChoiceGrid}>
                {SIMPLE_KIND_OPTIONS.map((opt) => {
                  const label = t(`shiftBuilder.inspector.kind.${opt.value}`);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.simpleChoice, kind === opt.value && styles.simpleChoiceActive]}
                      onPress={() => handleKindChange(opt.value)}
                      accessibilityLabel={label}
                      accessibilityState={{ selected: kind === opt.value }}
                      accessibilityRole="radio"
                    >
                      <Ionicons
                        name={opt.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={kind === opt.value ? '#02070b' : '#9db2c2'}
                      />
                      <Text
                        style={[
                          styles.simpleChoiceText,
                          kind === opt.value && styles.simpleChoiceTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Policy */}
              <Text style={styles.questionLabel}>
                {t('shiftBuilder.inspector.simpleTimeQuestion', {
                  defaultValue: 'Does this shift need times?',
                })}
              </Text>
              <View style={styles.simpleTimeGrid}>
                {SIMPLE_TIME_OPTIONS.map((opt) => {
                  const selected = timePolicy === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.simpleTimeChoice, selected && styles.simpleTimeChoiceActive]}
                      onPress={() => handleTimePolicyChange(opt.value)}
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected }}
                      accessibilityRole="radio"
                    >
                      <Text
                        style={[
                          styles.simpleTimeChoiceTitle,
                          selected && styles.simpleTimeChoiceTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.simpleTimeChoiceHint,
                          selected && styles.simpleTimeChoiceHintActive,
                        ]}
                      >
                        {opt.hint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Timed fields */}
              {timePolicy === 'timed' && (
                <View>
                  <View style={styles.timeRow}>
                    <TimeField
                      label={t('shiftBuilder.inspector.startTime')}
                      value={startTime}
                      onChange={setStartTime}
                    />
                    <View style={styles.timeSep} />
                    <TimeField
                      label={t('shiftBuilder.inspector.endTime')}
                      value={endTime}
                      onChange={setEndTime}
                    />
                  </View>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleLabel}>
                        {t('shiftBuilder.inspector.overnight')}
                      </Text>
                      <Text style={styles.toggleSub}>
                        {t('shiftBuilder.inspector.overnightHint')}
                      </Text>
                    </View>
                    <Switch
                      value={crossesMidnight}
                      onValueChange={setCrossesMidnight}
                      trackColor={{ true: '#20f4dc' }}
                      thumbColor="#d6e7f2"
                      accessibilityLabel={t('shiftBuilder.inspector.overnight')}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.moreOptionsButton}
                onPress={() => setShowMoreOptions((visible) => !visible)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showMoreOptions }}
                accessibilityLabel={t('shiftBuilder.inspector.moreOptionsA11y', {
                  defaultValue: 'Show more shift options',
                })}
              >
                <View style={styles.moreOptionsIcon}>
                  <Ionicons name="options-outline" size={18} color="#20f4dc" />
                </View>
                <View style={styles.moreOptionsCopy}>
                  <Text style={styles.moreOptionsTitle}>
                    {t('shiftBuilder.inspector.moreOptionsTitle', {
                      defaultValue: 'Need to make it exact?',
                    })}
                  </Text>
                  <Text style={styles.moreOptionsText}>
                    {t('shiftBuilder.inspector.moreOptionsText', {
                      defaultValue: 'Color, icon, location, reminders, and work stats are here.',
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={showMoreOptions ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#9db2c2"
                />
              </TouchableOpacity>

              {showMoreOptions ? (
                <View style={styles.moreOptionsPanel}>
                  <Text style={styles.fieldLabel}>{t('shiftBuilder.inspector.kind.label')}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pillRow}
                  >
                    {KIND_OPTIONS.map((opt) => {
                      const label = t(`shiftBuilder.inspector.kind.${opt.value}`);
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.kindPill, kind === opt.value && styles.kindPillActive]}
                          onPress={() => handleKindChange(opt.value)}
                          accessibilityLabel={label}
                          accessibilityState={{ selected: kind === opt.value }}
                          accessibilityRole="radio"
                        >
                          <Ionicons
                            name={opt.icon as keyof typeof Ionicons.glyphMap}
                            size={14}
                            color={kind === opt.value ? '#02070b' : '#9db2c2'}
                          />
                          <Text
                            style={[
                              styles.kindPillText,
                              kind === opt.value && styles.kindPillTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Icon picker */}
                  <Text style={styles.fieldLabel}>{t('shiftBuilder.inspector.icon')}</Text>
                  <View style={styles.iconGrid}>
                    {ICON_OPTIONS.map((ic) => (
                      <TouchableOpacity
                        key={ic}
                        style={[styles.iconButton, icon === ic && styles.iconButtonSelected]}
                        onPress={() => setIcon(ic)}
                        accessibilityLabel={t('shiftBuilder.inspector.iconA11y', { icon: ic })}
                        accessibilityState={{ selected: icon === ic }}
                        accessibilityRole="radio"
                      >
                        <Ionicons
                          name={ic as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={icon === ic ? color : '#9db2c2'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Toggles */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleLabel}>
                        {t('shiftBuilder.inspector.countsAsWork')}
                      </Text>
                      <Text style={styles.toggleSub}>
                        {t('shiftBuilder.inspector.countsAsWorkHint')}
                      </Text>
                    </View>
                    <Switch
                      value={countsAsWork}
                      onValueChange={setCountsAsWork}
                      trackColor={{ true: '#20f4dc' }}
                      thumbColor="#d6e7f2"
                      accessibilityLabel={t('shiftBuilder.inspector.countsAsWorkA11y')}
                    />
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleLabel}>
                        {t('shiftBuilder.inspector.countsAsNight')}
                      </Text>
                      <Text style={styles.toggleSub}>
                        {t('shiftBuilder.inspector.countsAsNightHint')}
                      </Text>
                    </View>
                    <Switch
                      value={countsAsNight}
                      onValueChange={setCountsAsNight}
                      trackColor={{ true: '#20f4dc' }}
                      thumbColor="#d6e7f2"
                      accessibilityLabel={t('shiftBuilder.inspector.countsAsNightA11y')}
                    />
                  </View>

                  {/* Location */}
                  <Text style={styles.fieldLabel}>{t('shiftBuilder.inspector.location')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={locationName}
                    onChangeText={setLocationName}
                    placeholder={t('shiftBuilder.inspector.locationPlaceholder')}
                    placeholderTextColor="#6f8798"
                    maxLength={200}
                    accessibilityLabel={t('shiftBuilder.inspector.locationA11y')}
                  />

                  {/* Reminder profile */}
                  <Text style={styles.fieldLabel}>
                    {t('shiftBuilder.inspector.remindersTitle')}
                  </Text>
                  <View
                    style={[
                      styles.reminderCard,
                      { borderColor: color, borderLeftColor: color },
                      !countsAsWork && styles.reminderCardDisabled,
                    ]}
                  >
                    {!countsAsWork ? (
                      <Text style={styles.helperText}>
                        {t('shiftBuilder.inspector.remindersDisabled')}
                      </Text>
                    ) : (
                      <>
                        <View style={styles.reminderProfileHeader}>
                          <Ionicons name="notifications-outline" size={18} color={color} />
                          <View style={styles.reminderProfileHeaderText}>
                            <Text style={styles.toggleLabel}>
                              {t('shiftBuilder.inspector.reminderRulesTitle')}
                            </Text>
                            <Text style={styles.toggleSub}>
                              {t('shiftBuilder.inspector.reminderRulesHint')}
                            </Text>
                          </View>
                        </View>

                        <TextInput
                          style={styles.reminderProfileInput}
                          value={reminderProfileId}
                          onChangeText={(text) =>
                            setReminderProfileId(text.replace(/\s+/g, '-').slice(0, 80))
                          }
                          placeholder={reminderProfileIdFor(name)}
                          placeholderTextColor="#6f8798"
                          maxLength={80}
                          autoCapitalize="none"
                          accessibilityLabel={t('shiftBuilder.inspector.reminderProfileA11y')}
                        />

                        <View style={styles.reminderNumberGrid}>
                          <View style={styles.reminderNumberField}>
                            <Text style={styles.reminderNumberLabel}>
                              {t('shiftBuilder.inspector.firstReminder')}
                            </Text>
                            <View style={styles.reminderNumberInputRow}>
                              <TextInput
                                style={styles.reminderNumberInput}
                                value={String(earlyReminderHours)}
                                onChangeText={(text) =>
                                  setEarlyReminderHours(clampIntegerText(text, 0, 72))
                                }
                                keyboardType="number-pad"
                                maxLength={2}
                                selectTextOnFocus
                                accessibilityLabel={t('shiftBuilder.inspector.firstReminderA11y')}
                              />
                              <Text style={styles.reminderNumberSuffix}>
                                {t('shiftBuilder.inspector.hoursBefore')}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.reminderNumberField}>
                            <Text style={styles.reminderNumberLabel}>
                              {t('shiftBuilder.inspector.prepTime')}
                            </Text>
                            <View style={styles.reminderNumberInputRow}>
                              <TextInput
                                style={styles.reminderNumberInput}
                                value={String(prepTimeMinutes)}
                                onChangeText={(text) =>
                                  setPrepTimeMinutes(clampIntegerText(text, 0, 720))
                                }
                                keyboardType="number-pad"
                                maxLength={3}
                                selectTextOnFocus
                                accessibilityLabel={t('shiftBuilder.inspector.prepTimeA11y')}
                              />
                              <Text style={styles.reminderNumberSuffix}>
                                {t('shiftBuilder.inspector.minutes')}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.reminderNumberField}>
                            <Text style={styles.reminderNumberLabel}>
                              {t('shiftBuilder.inspector.travelTime')}
                            </Text>
                            <View style={styles.reminderNumberInputRow}>
                              <TextInput
                                style={styles.reminderNumberInput}
                                value={String(commuteTimeMinutes)}
                                onChangeText={(text) =>
                                  setCommuteTimeMinutes(clampIntegerText(text, 0, 720))
                                }
                                keyboardType="number-pad"
                                maxLength={3}
                                selectTextOnFocus
                                accessibilityLabel={t('shiftBuilder.inspector.travelTimeA11y')}
                              />
                              <Text style={styles.reminderNumberSuffix}>
                                {t('shiftBuilder.inspector.minutes')}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.reminderToggleGrid}>
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                              <Text style={styles.toggleLabel}>
                                {t('shiftBuilder.inspector.imminentReminderTitle')}
                              </Text>
                              <Text style={styles.toggleSub}>
                                {t('shiftBuilder.inspector.imminentReminderHint')}
                              </Text>
                            </View>
                            <Switch
                              value={imminentReminderEnabled}
                              onValueChange={setImminentReminderEnabled}
                              trackColor={{ true: '#20f4dc' }}
                              thumbColor="#d6e7f2"
                              accessibilityLabel={t('shiftBuilder.inspector.imminentReminderA11y')}
                            />
                          </View>

                          <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                              <Text style={styles.toggleLabel}>
                                {t('shiftBuilder.inspector.briefingReminderTitle')}
                              </Text>
                              <Text style={styles.toggleSub}>
                                {t('shiftBuilder.inspector.briefingReminderHint')}
                              </Text>
                            </View>
                            <Switch
                              value={preBriefingEnabled}
                              onValueChange={setPreBriefingEnabled}
                              trackColor={{ true: '#20f4dc' }}
                              thumbColor="#d6e7f2"
                              accessibilityLabel={t('shiftBuilder.inspector.briefingReminderA11y')}
                            />
                          </View>

                          <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                              <Text style={styles.toggleLabel}>
                                {t('shiftBuilder.inspector.fatigueAwareTitle')}
                              </Text>
                              <Text style={styles.toggleSub}>
                                {t('shiftBuilder.inspector.fatigueAwareHint')}
                              </Text>
                            </View>
                            <Switch
                              value={fatigueAwareReminders}
                              onValueChange={setFatigueAwareReminders}
                              trackColor={{ true: '#20f4dc' }}
                              thumbColor="#d6e7f2"
                              accessibilityLabel={t('shiftBuilder.inspector.fatigueAwareA11y')}
                            />
                          </View>

                          <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                              <Text style={styles.toggleLabel}>
                                {t('shiftBuilder.inspector.postShiftCheckinTitle')}
                              </Text>
                              <Text style={styles.toggleSub}>
                                {t('shiftBuilder.inspector.postShiftCheckinHint')}
                              </Text>
                            </View>
                            <Switch
                              value={postShiftCheckin}
                              onValueChange={setPostShiftCheckin}
                              trackColor={{ true: '#20f4dc' }}
                              thumbColor="#d6e7f2"
                              accessibilityLabel={t('shiftBuilder.inspector.postShiftCheckinA11y')}
                            />
                          </View>

                          <View style={styles.toggleRow}>
                            <View style={styles.toggleInfo}>
                              <Text style={styles.toggleLabel}>
                                {t('shiftBuilder.inspector.travelRemindersTitle')}
                              </Text>
                              <Text style={styles.toggleSub}>
                                {t('shiftBuilder.inspector.travelRemindersHint')}
                              </Text>
                            </View>
                            <Switch
                              value={travelReminders}
                              onValueChange={setTravelReminders}
                              trackColor={{ true: '#20f4dc' }}
                              thumbColor="#d6e7f2"
                              accessibilityLabel={t('shiftBuilder.inspector.travelRemindersA11y')}
                            />
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actions}>
              {!isNew && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  accessibilityLabel={t('shiftBuilder.inspector.delete')}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityLabel={t('shiftBuilder.cancel')}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{t('shiftBuilder.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                accessibilityLabel={t('shiftBuilder.inspector.saveA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>
                  {t('shiftBuilder.inspector.simpleSave', { defaultValue: 'Save this shift' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.opacity.black60,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(5, 16, 24, 0.99)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 231, 242, 0.14)',
    gap: theme.spacing.sm,
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 24,
  },
  sheetSubtitle: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 19,
    marginTop: 4,
  },
  formScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  shiftPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  shiftPreviewIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  shiftPreviewEyebrow: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  shiftPreviewName: {
    color: '#d6e7f2',
    fontSize: 24,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 29,
  },
  fieldLabel: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  questionLabel: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 24,
    marginTop: theme.spacing.lg,
    marginBottom: 4,
  },
  questionHelp: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 19,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.18)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  charCount: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: 2,
  },
  helperText: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  reminderCard: {
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  reminderCardDisabled: {
    opacity: 0.75,
  },
  reminderProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reminderProfileHeaderText: {
    flex: 1,
  },
  reminderProfileInput: {
    backgroundColor: '#02070b',
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  reminderNumberGrid: {
    gap: theme.spacing.xs,
  },
  reminderNumberField: {
    backgroundColor: '#02070b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.1)',
    padding: theme.spacing.sm,
  },
  reminderNumberLabel: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: 6,
  },
  reminderNumberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  reminderNumberInput: {
    width: 58,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    color: '#d6e7f2',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
    fontSize: theme.typography.fontSizes.md,
  },
  reminderNumberSuffix: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
  },
  reminderToggleGrid: {
    gap: 2,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pillRowInline: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  simpleChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  simpleChoice: {
    width: '47.5%',
    minHeight: 86,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    backgroundColor: 'rgba(214, 231, 242, 0.11)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.sm,
  },
  simpleChoiceActive: {
    backgroundColor: '#20f4dc',
    borderColor: '#20f4dc',
  },
  simpleChoiceText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  simpleChoiceTextActive: {
    color: '#02070b',
  },
  simpleTimeGrid: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  simpleTimeChoice: {
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    justifyContent: 'center',
  },
  simpleTimeChoiceActive: {
    borderColor: '#20f4dc',
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  simpleTimeChoiceTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  simpleTimeChoiceTitleActive: {
    color: '#20f4dc',
  },
  simpleTimeChoiceHint: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 18,
    marginTop: 3,
  },
  simpleTimeChoiceHintActive: {
    color: '#9db2c2',
  },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
  },
  kindPillActive: {
    backgroundColor: '#20f4dc',
  },
  kindPillText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
  },
  kindPillTextActive: {
    color: '#02070b',
    fontWeight: theme.typography.fontWeights.semibold,
  },
  timePill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    borderRadius: 18,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  timePillActive: {
    backgroundColor: '#20f4dc',
  },
  timePillText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
  },
  timePillTextActive: {
    color: '#02070b',
    fontWeight: theme.typography.fontWeights.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  timeSep: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.1)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  toggleSub: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 1,
  },
  moreOptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(8, 22, 31, 0.72)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  moreOptionsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
  },
  moreOptionsCopy: {
    flex: 1,
    minWidth: 0,
  },
  moreOptionsTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  moreOptionsText: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 17,
    marginTop: 3,
  },
  moreOptionsPanel: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 231, 242, 0.1)',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: '#02070b',
    borderWidth: 2,
    borderColor: '#20f4dc',
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 231, 242, 0.14)',
    gap: theme.spacing.sm,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  saveButton: {
    flex: 2,
    height: 52,
    backgroundColor: '#20f4dc',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
