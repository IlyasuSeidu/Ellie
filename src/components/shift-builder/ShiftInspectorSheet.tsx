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
import { theme } from '@/utils/theme';
import type {
  UniversalShiftDefinition,
  UniversalShiftKind,
  UniversalShiftTimePolicy,
  UniversalShiftActivePolicy,
} from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import { generateShiftId } from '@/utils/universalShiftUtils';

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

const PRESET_COLORS = [
  '#2196F3',
  '#651FFF',
  '#F44336',
  '#E91E63',
  '#FF9800',
  '#FFEB3B',
  '#4CAF50',
  '#00BCD4',
  '#FF7043',
  '#78716c',
  '#8BC34A',
  '#9C27B0',
];

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

const TIME_POLICY_OPTIONS: { value: UniversalShiftTimePolicy; label: string }[] = [
  { value: 'timed', label: 'Set times' },
  { value: 'all_day', label: 'All day' },
  { value: 'none', label: 'No time' },
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
  const [h, m] = (value || '00:00').split(':');

  const updateHour = (text: string) => {
    const n = parseInt(text, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(23, n));
    onChange(`${String(clamped).padStart(2, '0')}:${m ?? '00'}`);
  };

  const updateMinute = (text: string) => {
    const n = parseInt(text, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(59, n));
    onChange(`${h ?? '00'}:${String(clamped).padStart(2, '0')}`);
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
      </View>
    </View>
  );
};

const timeStyles = StyleSheet.create({
  container: { flex: 1, gap: 4 },
  label: { color: theme.colors.dust, fontSize: theme.typography.fontSizes.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segment: {
    backgroundColor: theme.colors.deepVoid,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    width: 52,
    textAlign: 'center',
  },
  colon: { color: theme.colors.paper, fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold' },
});

// ── Main component ────────────────────────────────────────────────────────────

export const ShiftInspectorSheet: React.FC<ShiftInspectorSheetProps> = ({
  visible,
  definition,
  onSave,
  onDelete,
  onClose,
}) => {
  const isNew = !definition;

  const [name, setName] = useState('');
  const [kind, setKind] = useState<UniversalShiftKind>('work');
  const [timePolicy, setTimePolicy] = useState<UniversalShiftTimePolicy>('timed');
  const [activePolicy, setActivePolicy] = useState<UniversalShiftActivePolicy>('timed_window');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('18:00');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]);
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
  const [customColor, setCustomColor] = useState('');

  // Reset form when sheet opens
  useEffect(() => {
    if (!visible) return;
    if (definition) {
      setName(definition.name);
      setKind(definition.kind);
      setTimePolicy(definition.timePolicy);
      setActivePolicy(definition.activePolicy);
      setStartTime(definition.startTime ?? '06:00');
      setEndTime(definition.endTime ?? '18:00');
      setCrossesMidnight(definition.crossesMidnight ?? false);
      setColor(definition.color);
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
      setCustomColor('');
    } else {
      setName('');
      setKind('work');
      setTimePolicy('timed');
      setActivePolicy('timed_window');
      setStartTime('06:00');
      setEndTime('18:00');
      setCrossesMidnight(false);
      setColor(PRESET_COLORS[0]);
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
      setCustomColor('');
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
      Alert.alert('Name required', 'Please enter a name for this shift type.');
      return;
    }
    if (timePolicy === 'timed' && (!startTime || !endTime)) {
      Alert.alert('Times required', 'Please set start and end times for a timed shift.');
      return;
    }

    const hexColor = customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) ? customColor : color;

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
      color: hexColor,
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
    customColor,
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
  ]);

  const handleDelete = useCallback(() => {
    if (!definition || !onDelete) return;
    Alert.alert(`Delete "${definition.name}"?`, 'This will permanently remove this shift type.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete(definition.id);
        },
      },
    ]);
  }, [definition, onDelete]);

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
              <Text style={styles.sheetTitle}>{isNew ? 'New Shift Type' : 'Edit Shift Type'}</Text>
              <TouchableOpacity
                onPress={onClose}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={theme.colors.dust} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={(t) => setName(t.slice(0, 80))}
                placeholder="e.g. Day Shift, Rest Day"
                placeholderTextColor={theme.colors.shadow}
                maxLength={80}
                accessibilityLabel="Shift name"
              />
              <Text style={styles.charCount}>{name.length}/80</Text>

              {/* Kind */}
              <Text style={styles.fieldLabel}>Kind</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                {KIND_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.kindPill, kind === opt.value && styles.kindPillActive]}
                    onPress={() => handleKindChange(opt.value)}
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: kind === opt.value }}
                    accessibilityRole="radio"
                  >
                    <Ionicons
                      name={opt.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={kind === opt.value ? theme.colors.deepVoid : theme.colors.dust}
                    />
                    <Text
                      style={[styles.kindPillText, kind === opt.value && styles.kindPillTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time Policy */}
              <Text style={styles.fieldLabel}>Time</Text>
              <View style={styles.pillRowInline}>
                {TIME_POLICY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.timePill, timePolicy === opt.value && styles.timePillActive]}
                    onPress={() => handleTimePolicyChange(opt.value)}
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: timePolicy === opt.value }}
                    accessibilityRole="radio"
                  >
                    <Text
                      style={[
                        styles.timePillText,
                        timePolicy === opt.value && styles.timePillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Timed fields */}
              {timePolicy === 'timed' && (
                <View>
                  <View style={styles.timeRow}>
                    <TimeField label="Start" value={startTime} onChange={setStartTime} />
                    <View style={styles.timeSep} />
                    <TimeField label="End" value={endTime} onChange={setEndTime} />
                  </View>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleLabel}>Overnight</Text>
                      <Text style={styles.toggleSub}>
                        Shift ends after midnight. For 24-hour shifts, use the same start/end time
                        and turn this on.
                      </Text>
                    </View>
                    <Switch
                      value={crossesMidnight}
                      onValueChange={setCrossesMidnight}
                      trackColor={{ true: theme.colors.sacredGold }}
                      thumbColor={theme.colors.paper}
                      accessibilityLabel="Crosses midnight toggle"
                    />
                  </View>
                </View>
              )}

              {/* Color grid */}
              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      color === c && styles.colorSwatchSelected,
                    ]}
                    onPress={() => {
                      setColor(c);
                      setCustomColor('');
                    }}
                    accessibilityLabel={`Color ${c}`}
                    accessibilityState={{ selected: color === c }}
                    accessibilityRole="radio"
                  >
                    {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customColorRow}>
                <Text style={styles.customColorLabel}>#</Text>
                <TextInput
                  style={styles.customColorInput}
                  value={customColor.replace('#', '')}
                  onChangeText={(t) => {
                    const hex = '#' + t.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                    setCustomColor(hex);
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) setColor(hex);
                  }}
                  placeholder="Custom hex (e.g. FF5722)"
                  placeholderTextColor={theme.colors.shadow}
                  maxLength={6}
                  autoCapitalize="characters"
                  accessibilityLabel="Custom color hex code"
                />
                {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
                  <View style={[styles.customColorPreview, { backgroundColor: customColor }]} />
                )}
              </View>

              {/* Icon picker */}
              <Text style={styles.fieldLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconButton, icon === ic && styles.iconButtonSelected]}
                    onPress={() => setIcon(ic)}
                    accessibilityLabel={`Icon: ${ic}`}
                    accessibilityState={{ selected: icon === ic }}
                    accessibilityRole="radio"
                  >
                    <Ionicons
                      name={ic as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={icon === ic ? color : theme.colors.dust}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Toggles */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Counts as work</Text>
                  <Text style={styles.toggleSub}>Included in work day stats</Text>
                </View>
                <Switch
                  value={countsAsWork}
                  onValueChange={setCountsAsWork}
                  trackColor={{ true: theme.colors.sacredGold }}
                  thumbColor={theme.colors.paper}
                  accessibilityLabel="Counts as work day toggle"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Counts as night</Text>
                  <Text style={styles.toggleSub}>Affects night shift statistics</Text>
                </View>
                <Switch
                  value={countsAsNight}
                  onValueChange={setCountsAsNight}
                  trackColor={{ true: theme.colors.sacredGold }}
                  thumbColor={theme.colors.paper}
                  accessibilityLabel="Counts as night shift toggle"
                />
              </View>

              {/* Location */}
              <Text style={styles.fieldLabel}>Work location (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="e.g. Hospital, depot, plant, station"
                placeholderTextColor={theme.colors.shadow}
                maxLength={200}
                accessibilityLabel="Work location name"
              />

              {/* Reminder profile */}
              <Text style={styles.fieldLabel}>Reminders for this shift</Text>
              <View
                style={[
                  styles.reminderCard,
                  { borderColor: color, borderLeftColor: color },
                  !countsAsWork && styles.reminderCardDisabled,
                ]}
              >
                {!countsAsWork ? (
                  <Text style={styles.helperText}>
                    Off and leave shift types do not schedule pre-shift reminders.
                  </Text>
                ) : (
                  <>
                    <View style={styles.reminderProfileHeader}>
                      <Ionicons name="notifications-outline" size={18} color={color} />
                      <View style={styles.reminderProfileHeaderText}>
                        <Text style={styles.toggleLabel}>Reminder rules</Text>
                        <Text style={styles.toggleSub}>
                          These rules apply only to this shift type.
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
                      placeholderTextColor={theme.colors.shadow}
                      maxLength={80}
                      autoCapitalize="none"
                      accessibilityLabel="Reminder profile name"
                    />

                    <View style={styles.reminderNumberGrid}>
                      <View style={styles.reminderNumberField}>
                        <Text style={styles.reminderNumberLabel}>First reminder</Text>
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
                            accessibilityLabel="Hours before shift for first reminder"
                          />
                          <Text style={styles.reminderNumberSuffix}>hours before</Text>
                        </View>
                      </View>

                      <View style={styles.reminderNumberField}>
                        <Text style={styles.reminderNumberLabel}>Prep time</Text>
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
                            accessibilityLabel="Preparation minutes before shift"
                          />
                          <Text style={styles.reminderNumberSuffix}>minutes</Text>
                        </View>
                      </View>

                      <View style={styles.reminderNumberField}>
                        <Text style={styles.reminderNumberLabel}>Travel time</Text>
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
                            accessibilityLabel="Travel minutes before shift"
                          />
                          <Text style={styles.reminderNumberSuffix}>minutes</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.reminderToggleGrid}>
                      <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>15-minute alert</Text>
                          <Text style={styles.toggleSub}>
                            Send a final reminder just before start time
                          </Text>
                        </View>
                        <Switch
                          value={imminentReminderEnabled}
                          onValueChange={setImminentReminderEnabled}
                          trackColor={{ true: theme.colors.sacredGold }}
                          thumbColor={theme.colors.paper}
                          accessibilityLabel="15 minute reminder toggle"
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>Briefing reminder</Text>
                          <Text style={styles.toggleSub}>
                            Treat the 15-minute reminder as critical briefing prep
                          </Text>
                        </View>
                        <Switch
                          value={preBriefingEnabled}
                          onValueChange={setPreBriefingEnabled}
                          trackColor={{ true: theme.colors.sacredGold }}
                          thumbColor={theme.colors.paper}
                          accessibilityLabel="Briefing reminder toggle"
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>Fatigue-aware timing</Text>
                          <Text style={styles.toggleSub}>
                            Move prep reminders earlier when fatigue risk is high
                          </Text>
                        </View>
                        <Switch
                          value={fatigueAwareReminders}
                          onValueChange={setFatigueAwareReminders}
                          trackColor={{ true: theme.colors.sacredGold }}
                          thumbColor={theme.colors.paper}
                          accessibilityLabel="Fatigue-aware reminders toggle"
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>Post-shift check-in</Text>
                          <Text style={styles.toggleSub}>
                            Ask how the shift went one hour after it ends
                          </Text>
                        </View>
                        <Switch
                          value={postShiftCheckin}
                          onValueChange={setPostShiftCheckin}
                          trackColor={{ true: theme.colors.sacredGold }}
                          thumbColor={theme.colors.paper}
                          accessibilityLabel="Post shift check-in toggle"
                        />
                      </View>

                      <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                          <Text style={styles.toggleLabel}>Travel reminders</Text>
                          <Text style={styles.toggleSub}>
                            Use this shift in travel-in and travel-out reminders
                          </Text>
                        </View>
                        <Switch
                          value={travelReminders}
                          onValueChange={setTravelReminders}
                          trackColor={{ true: theme.colors.sacredGold }}
                          thumbColor={theme.colors.paper}
                          accessibilityLabel="Travel reminders toggle"
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.actions}>
              {!isNew && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  accessibilityLabel="Delete shift type"
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                accessibilityLabel="Save shift type"
                accessibilityRole="button"
              >
                <Text style={styles.saveText}>Save</Text>
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
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.softStone,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  sheetTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  formScroll: {
    paddingHorizontal: theme.spacing.md,
  },
  fieldLabel: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  charCount: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: 2,
  },
  helperText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  reminderCard: {
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
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
    backgroundColor: theme.colors.deepVoid,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
  },
  reminderNumberGrid: {
    gap: theme.spacing.xs,
  },
  reminderNumberField: {
    backgroundColor: theme.colors.deepVoid,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
  },
  reminderNumberLabel: {
    color: theme.colors.dust,
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
    backgroundColor: theme.colors.softStone,
    color: theme.colors.paper,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.bold,
    fontSize: theme.typography.fontSizes.md,
  },
  reminderNumberSuffix: {
    color: theme.colors.shadow,
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
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
  },
  kindPillActive: {
    backgroundColor: theme.colors.sacredGold,
  },
  kindPillText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
  },
  kindPillTextActive: {
    color: theme.colors.deepVoid,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  timePill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  timePillActive: {
    backgroundColor: theme.colors.sacredGold,
  },
  timePillText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
  },
  timePillTextActive: {
    color: theme.colors.deepVoid,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  timeSep: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.softStone,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleLabel: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  toggleSub: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: theme.colors.paper,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  customColorLabel: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  customColorInput: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    paddingVertical: theme.spacing.sm,
  },
  customColorPreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.softStone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: theme.colors.deepVoid,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
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
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  saveButton: {
    flex: 2,
    height: 44,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
