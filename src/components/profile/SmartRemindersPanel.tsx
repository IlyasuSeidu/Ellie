/**
 * SmartRemindersPanel
 *
 * Settings UI for smart shift reminders. Loads/saves SmartReminderSettings
 * from AsyncStorage and triggers a reschedule on every change.
 *
 * Deferred (not wired here):
 *   - Sleep-data / fatigue-aware integration — the backend scaffolding exists,
 *     but the user-facing toggle stays hidden until SleepContext lands.
 *     See ellie-smart-shift-reminders.md §B.
 *   - Stable auth userId — uses the same resolveUserId pattern as useSmartReminders
 *     (Firebase UID when signed in, persisted local UUID otherwise).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { notificationService } from '@/services/NotificationService';
import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import {
  resolveReminderUserId,
  smartReminderSettingsService,
} from '@/services/SmartReminderSettingsService';
import { ShiftDataService } from '@/services/ShiftDataService';
import { getStorageService } from '@/services/StorageService';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TimePickerModal } from '@/components/onboarding/premium/TimePickerModal';
import { formatLocalizedNumber, formatLocalizedTime } from '@/utils/i18nFormat';
import { DEFAULT_SMART_REMINDER_SETTINGS, type SmartReminderSettings } from '@/types/reminders';

// ── Module-level singletons (same pattern as useSmartReminders) ────────────

const _shiftDataService = new ShiftDataService(getStorageService());
const _orchestrator = new SmartReminderOrchestrator(_shiftDataService);

// ── Pure helpers ───────────────────────────────────────────────────────────

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** Format "HH:MM" for display in time chips using the active locale */
function fmtChipTime(hhmm: string, language: string): string {
  return formatLocalizedTime(
    hhmm,
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: undefined,
    },
    language
  );
}

function addMinutesToHHMM(hhmm: string, minutesToAdd: number): string {
  const totalMinutes = (parseHHMM(hhmm) + minutesToAdd + 24 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface SegmentOption<T> {
  label: string;
  value: T;
}

function SegmentedRow<T extends number>({
  label,
  sublabel,
  options,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      {sublabel ? <Text style={s.rowSublabel}>{sublabel}</Text> : null}
      <View style={s.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, value === opt.value && s.chipActive]}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(opt.value);
            }}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, value === opt.value && s.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[s.row, s.rowH, disabled && s.rowDisabled]}>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {sublabel ? <Text style={s.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          void Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ false: theme.colors.softStone, true: theme.colors.sacredGold }}
        thumbColor={theme.colors.paper}
        ios_backgroundColor={theme.colors.softStone}
      />
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={s.sectionLabel}>
      <Text style={s.sectionLabelText}>{title}</Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface SmartRemindersPanelProps {
  animationDelay?: number;
}

export const SmartRemindersPanel: React.FC<SmartRemindersPanelProps> = ({ animationDelay = 0 }) => {
  const { t } = useTranslation('profile');
  const { data: onboardingData } = useOnboarding();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [settings, setSettings] = useState<SmartReminderSettings>(DEFAULT_SMART_REMINDER_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [quietPickerTarget, setQuietPickerTarget] = useState<'start' | 'end' | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleStatus, setRescheduleStatus] = useState<
    'idle' | 'success' | 'error' | 'permission'
  >('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'error' | 'permission'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'error'>('idle');
  const [quietHoursAdjusted, setQuietHoursAdjusted] = useState(false);
  const mountedRef = useRef(true);
  const settingsRef = useRef<SmartReminderSettings>(DEFAULT_SMART_REMINDER_SETTINGS);
  const loadRequestIdRef = useRef(0);
  const mutationIdRef = useRef(0);
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const scheduleStateReset = useCallback((reset: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      timeoutRefs.current.delete(timeoutId);
      if (mountedRef.current) {
        reset();
      }
    }, delayMs);
    timeoutRefs.current.add(timeoutId);
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const activeTimeouts = timeoutRefs.current;

    return () => {
      mountedRef.current = false;
      activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      activeTimeouts.clear();
    };
  }, []);

  // Load persisted settings once on mount
  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoaded(false);

    smartReminderSettingsService
      .load(user?.uid)
      .then((loadedSettings) => {
        if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
          return;
        }

        settingsRef.current = loadedSettings;
        setSettings(loadedSettings);
      })
      .finally(() => {
        if (!mountedRef.current || loadRequestIdRef.current !== requestId) {
          return;
        }

        setLoaded(true);
      });
  }, [user?.uid]);

  const reschedule = useCallback(
    async (updated: SmartReminderSettings) => {
      if (!onboardingData?.startDate || !onboardingData?.patternType) return;
      const shiftCycle = buildShiftCycle(onboardingData);
      if (!shiftCycle) return;

      const hasPermission = await notificationService.checkPermissions();
      if (!hasPermission) {
        setRescheduleStatus('permission');
        scheduleStateReset(() => setRescheduleStatus('idle'), 4000);
        return;
      }

      const userId = await resolveReminderUserId(user?.uid);

      setIsRescheduling(true);
      setRescheduleStatus('idle');
      try {
        await _orchestrator.reschedule({
          userId,
          userName: onboardingData.name ?? '',
          shiftCycle,
          shiftTimes: onboardingData.shiftTimes,
          settings: updated,
          language,
        });
        setRescheduleStatus('success');
        scheduleStateReset(() => setRescheduleStatus('idle'), 2500);
      } catch {
        setRescheduleStatus('error');
        scheduleStateReset(() => setRescheduleStatus('idle'), 3000);
      } finally {
        setIsRescheduling(false);
      }
    },
    [language, onboardingData, scheduleStateReset, user?.uid]
  );

  /** Merge a partial patch, persist, and reschedule */
  const applyUpdate = useCallback(
    async (patch: Partial<SmartReminderSettings>) => {
      const previous = settingsRef.current;
      const updated: SmartReminderSettings = { ...settingsRef.current, ...patch };
      const mutationId = mutationIdRef.current + 1;
      mutationIdRef.current = mutationId;
      settingsRef.current = updated;
      setSettings(updated);
      setSaveStatus('idle');

      try {
        await smartReminderSettingsService.save(updated, user?.uid);
        await reschedule(updated);
      } catch {
        if (!mountedRef.current || mutationIdRef.current !== mutationId) {
          return;
        }

        settingsRef.current = previous;
        setSettings(previous);
        setSaveStatus('error');
        scheduleStateReset(() => setSaveStatus('idle'), 4000);
      }
    },
    [reschedule, scheduleStateReset, user?.uid]
  );

  const handleTestNotification = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTestStatus('idle');
    try {
      const hasPermission = await notificationService.checkPermissions();
      if (!hasPermission) {
        setTestStatus('permission');
        scheduleStateReset(() => setTestStatus('idle'), 4000);
        return;
      }

      const userId = await resolveReminderUserId(user?.uid);

      await notificationService.scheduleSmartReminder(userId, {
        type: 'SHIFT_REMINDER_CUSTOM_EARLY',
        triggerAt: new Date(Date.now() + 5000),
        shiftDate: new Date().toISOString().slice(0, 10),
        shiftType: 'day',
        isCritical: false,
        title: t('smartReminders.test.title', {
          defaultValue: 'Smart reminders are on',
        }),
        body: t('smartReminders.test.body', {
          defaultValue: 'If this arrives, your smart reminders are working.',
        }),
        data: { test: true },
      });
      setTestStatus('sent');
      scheduleStateReset(() => setTestStatus('idle'), 3000);
    } catch {
      setTestStatus('error');
      scheduleStateReset(() => setTestStatus('idle'), 3000);
    }
  }, [scheduleStateReset, t, user?.uid]);

  const handleManualReschedule = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await reschedule(settingsRef.current);
  }, [reschedule]);

  // Quiet hours overnight window metadata
  const startMin = parseHHMM(settings.quietHoursStart);
  const endMin = parseHHMM(settings.quietHoursEnd);
  const isOvernightWindow = startMin > endMin;
  const windowSpanH = Math.round(
    (isOvernightWindow ? 24 * 60 - startMin + endMin : endMin - startMin) / 60
  );

  const isFifoUser = onboardingData?.rosterType === 'fifo';
  const showPermissionNotice = rescheduleStatus === 'permission' || testStatus === 'permission';

  const updateQuietHours = useCallback(
    async (target: 'start' | 'end', hhmm: string) => {
      const nextStart = target === 'start' ? hhmm : settings.quietHoursStart;
      let nextEnd = target === 'end' ? hhmm : settings.quietHoursEnd;
      let adjusted = false;

      if (nextStart === nextEnd) {
        nextEnd = addMinutesToHHMM(nextStart, 30);
        adjusted = true;
      }

      setQuietHoursAdjusted(adjusted);
      if (adjusted) {
        scheduleStateReset(() => setQuietHoursAdjusted(false), 4000);
      }

      await applyUpdate({
        quietHoursStart: nextStart,
        quietHoursEnd: nextEnd,
      });
    },
    [applyUpdate, scheduleStateReset, settings.quietHoursEnd, settings.quietHoursStart]
  );

  const hoursLabel = useCallback(
    (value: number) =>
      t('smartReminders.units.hoursShort', {
        value: formatLocalizedNumber(value, undefined, language),
        defaultValue: '{{value}} h',
      }),
    [language, t]
  );

  const minutesLabel = useCallback(
    (value: number) =>
      t('smartReminders.units.minutesShort', {
        value: formatLocalizedNumber(value, undefined, language),
        defaultValue: '{{value}} m',
      }),
    [language, t]
  );

  if (!loaded) {
    return (
      <View style={s.loadingRow}>
        <ActivityIndicator size="small" color={theme.colors.sacredGold} />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(animationDelay).duration(400)}>
      {/* ── TIMING ───────────────────────────────────────────── */}
      <SectionLabel
        title={t('smartReminders.sections.timing', {
          defaultValue: 'TIMING',
        })}
      />

      <SegmentedRow
        label={t('smartReminders.rows.early.label', {
          defaultValue: 'Early reminder',
        })}
        sublabel={t('smartReminders.rows.early.sublabel', {
          defaultValue: 'Heads-up before your shift starts',
        })}
        options={[
          { label: hoursLabel(4), value: 4 },
          { label: hoursLabel(8), value: 8 },
          { label: hoursLabel(12), value: 12 },
          { label: hoursLabel(24), value: 24 },
        ]}
        value={settings.earlyReminderHours}
        onChange={(v) => void applyUpdate({ earlyReminderHours: v })}
      />

      <SegmentedRow
        label={t('smartReminders.rows.prep.label', {
          defaultValue: 'Prep time',
        })}
        sublabel={t('smartReminders.rows.prep.sublabel', {
          defaultValue: 'Time to get ready before leaving home',
        })}
        options={[
          { label: minutesLabel(30), value: 30 },
          { label: minutesLabel(60), value: 60 },
          { label: minutesLabel(90), value: 90 },
          { label: hoursLabel(2), value: 120 },
        ]}
        value={settings.prepTimeMinutes}
        onChange={(v) => void applyUpdate({ prepTimeMinutes: v })}
      />

      <SegmentedRow
        label={t('smartReminders.rows.commute.label', {
          defaultValue: 'Commute time',
        })}
        sublabel={t('smartReminders.rows.commute.sublabel', {
          defaultValue: 'How long to get to site',
        })}
        options={[
          {
            label: t('smartReminders.units.none', {
              defaultValue: 'None',
            }),
            value: 0,
          },
          { label: minutesLabel(15), value: 15 },
          { label: minutesLabel(30), value: 30 },
          { label: minutesLabel(60), value: 60 },
        ]}
        value={settings.commuteTimeMinutes}
        onChange={(v) => void applyUpdate({ commuteTimeMinutes: v })}
      />

      <ToggleRow
        label={t('smartReminders.rows.imminent.label', {
          defaultValue: '15-min imminent alert',
        })}
        sublabel={t('smartReminders.rows.imminent.sublabel', {
          defaultValue: 'Alert when your shift is 15 minutes away',
        })}
        value={settings.imminentReminderEnabled}
        onChange={(v) => void applyUpdate({ imminentReminderEnabled: v })}
      />

      <ToggleRow
        label={t('smartReminders.rows.briefing.label', {
          defaultValue: 'Pre-shift briefing alert',
        })}
        sublabel={t('smartReminders.rows.briefing.sublabel', {
          defaultValue: 'For roles requiring a safety briefing before every shift',
        })}
        value={settings.preBriefingEnabled}
        onChange={(v) => void applyUpdate({ preBriefingEnabled: v })}
      />

      {/* ── DO NOT DISTURB ───────────────────────────────────── */}
      <SectionLabel
        title={t('smartReminders.sections.doNotDisturb', {
          defaultValue: 'DO NOT DISTURB',
        })}
      />

      <ToggleRow
        label={t('smartReminders.rows.quietHours.label', {
          defaultValue: 'Quiet hours',
        })}
        sublabel={t('smartReminders.rows.quietHours.sublabel', {
          defaultValue: 'Silence non-critical alerts while you sleep',
        })}
        value={settings.quietHoursEnabled}
        onChange={(v) => void applyUpdate({ quietHoursEnabled: v })}
      />

      {settings.quietHoursEnabled && (
        <View style={s.timeChipRow}>
          <TouchableOpacity
            style={s.timeChip}
            onPress={() => {
              void Haptics.selectionAsync();
              setQuietPickerTarget('start');
            }}
            activeOpacity={0.7}
            accessibilityLabel={t('smartReminders.quietHours.startA11y', {
              time: fmtChipTime(settings.quietHoursStart, language),
              defaultValue: 'Quiet hours start: {{time}}',
            })}
            accessibilityRole="button"
          >
            <Ionicons name="moon-outline" size={14} color={theme.colors.dust} />
            <Text style={s.timeChipText}>{fmtChipTime(settings.quietHoursStart, language)}</Text>
          </TouchableOpacity>

          <Text style={s.timeChipArrow}>→</Text>

          <TouchableOpacity
            style={s.timeChip}
            onPress={() => {
              void Haptics.selectionAsync();
              setQuietPickerTarget('end');
            }}
            activeOpacity={0.7}
            accessibilityLabel={t('smartReminders.quietHours.endA11y', {
              time: fmtChipTime(settings.quietHoursEnd, language),
              defaultValue: 'Quiet hours end: {{time}}',
            })}
            accessibilityRole="button"
          >
            <Ionicons name="sunny-outline" size={14} color={theme.colors.dust} />
            <Text style={s.timeChipText}>{fmtChipTime(settings.quietHoursEnd, language)}</Text>
          </TouchableOpacity>

          {isOvernightWindow && (
            <Text style={s.overnightLabel}>
              {t('smartReminders.quietHours.overnight', {
                hours: formatLocalizedNumber(windowSpanH, undefined, language),
                defaultValue: 'Overnight · {{hours}} h',
              })}
            </Text>
          )}
        </View>
      )}

      {quietHoursAdjusted && (
        <Text style={s.inlineNotice}>
          {t('smartReminders.quietHours.minimumAdjusted', {
            defaultValue: 'Quiet hours adjusted to a 30-minute minimum window.',
          })}
        </Text>
      )}

      {/* ── ADAPTIVE ─────────────────────────────────────────── */}
      <SectionLabel
        title={t('smartReminders.sections.adaptive', {
          defaultValue: 'ADAPTIVE',
        })}
      />

      <ToggleRow
        label={t('smartReminders.rows.backToBack.label', {
          defaultValue: 'Back-to-back night shift warning',
        })}
        sublabel={t('smartReminders.rows.backToBack.sublabel', {
          defaultValue: 'Warn when 3 or more consecutive night shifts are coming up',
        })}
        value={settings.backToBackWarnings}
        onChange={(v) => void applyUpdate({ backToBackWarnings: v })}
      />

      <ToggleRow
        label={t('smartReminders.rows.shortTurnaround.label', {
          defaultValue: 'Short turnaround warning',
        })}
        sublabel={t('smartReminders.rows.shortTurnaround.sublabel', {
          defaultValue: 'Alert when you have less than 10 hours between shifts',
        })}
        value={settings.shortTurnaroundWarnings}
        onChange={(v) => void applyUpdate({ shortTurnaroundWarnings: v })}
      />

      <ToggleRow
        label={t('smartReminders.rows.postShift.label', {
          defaultValue: 'Post-shift check-in',
        })}
        sublabel={t('smartReminders.rows.postShift.sublabel', {
          defaultValue: 'Prompt to log your energy level an hour after each shift',
        })}
        value={settings.postShiftCheckin}
        onChange={(v) => void applyUpdate({ postShiftCheckin: v })}
      />

      {/* ── FIFO (fly-in / fly-out users only) ───────────────── */}
      {isFifoUser && (
        <>
          <SectionLabel
            title={t('smartReminders.sections.fifo', {
              defaultValue: 'FIFO',
            })}
          />
          <ToggleRow
            label={t('smartReminders.rows.travelDay.label', {
              defaultValue: 'Travel day reminders',
            })}
            sublabel={t('smartReminders.rows.travelDay.sublabel', {
              defaultValue: 'Evening alert before fly-in; morning alert on fly-out day',
            })}
            value={settings.fifoTravelReminders}
            onChange={(v) => void applyUpdate({ fifoTravelReminders: v })}
          />
        </>
      )}

      {/* ── ACTIONS ──────────────────────────────────────────── */}
      <View style={s.actions}>
        {showPermissionNotice ? (
          <Text style={s.inlineNotice}>
            {t('smartReminders.actions.permissionNotice', {
              defaultValue:
                'Settings were saved, but notifications are off so reminders were not rescheduled. Enable notifications in Settings to apply them.',
            })}
          </Text>
        ) : null}

        {saveStatus === 'error' ? (
          <Text style={s.inlineNotice}>
            {t('smartReminders.actions.saveError', {
              defaultValue:
                'Reminder settings could not be saved right now. Your previous settings were restored.',
            })}
          </Text>
        ) : null}

        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => void handleTestNotification()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.test.a11y', {
            defaultValue: 'Send a test reminder in 5 seconds',
          })}
        >
          <Ionicons
            name={
              testStatus === 'sent'
                ? 'checkmark-circle-outline'
                : testStatus === 'error' || testStatus === 'permission'
                  ? 'alert-circle-outline'
                  : 'notifications-outline'
            }
            size={16}
            color={
              testStatus === 'sent'
                ? theme.colors.success
                : testStatus === 'error' || testStatus === 'permission'
                  ? theme.colors.error
                  : theme.colors.sacredGold
            }
          />
          <Text
            style={[
              s.actionBtnText,
              testStatus === 'sent' && s.actionBtnTextSuccess,
              (testStatus === 'error' || testStatus === 'permission') && s.actionBtnTextError,
            ]}
          >
            {testStatus === 'sent'
              ? t('smartReminders.actions.test.sent', {
                  defaultValue: 'Test reminder sent — check in 5 seconds',
                })
              : testStatus === 'permission'
                ? t('smartReminders.actions.test.permission', {
                    defaultValue: 'Enable notifications to send a test reminder',
                  })
                : testStatus === 'error'
                  ? t('smartReminders.actions.test.error', {
                      defaultValue: 'Test reminder unavailable right now',
                    })
                  : t('smartReminders.actions.test.idle', {
                      defaultValue: 'Send test reminder',
                    })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => void handleManualReschedule()}
          activeOpacity={0.7}
          disabled={isRescheduling}
          accessibilityRole="button"
          accessibilityLabel={t('smartReminders.actions.reschedule.a11y', {
            defaultValue: 'Reschedule all reminders now',
          })}
        >
          {isRescheduling ? (
            <ActivityIndicator size="small" color={theme.colors.sacredGold} />
          ) : (
            <Ionicons
              name={
                rescheduleStatus === 'success'
                  ? 'checkmark-circle-outline'
                  : rescheduleStatus === 'error' || rescheduleStatus === 'permission'
                    ? 'alert-circle-outline'
                    : 'refresh-outline'
              }
              size={16}
              color={
                rescheduleStatus === 'success'
                  ? theme.colors.success
                  : rescheduleStatus === 'error' || rescheduleStatus === 'permission'
                    ? theme.colors.error
                    : theme.colors.sacredGold
              }
            />
          )}
          <Text
            style={[
              s.actionBtnText,
              rescheduleStatus === 'success' && s.actionBtnTextSuccess,
              (rescheduleStatus === 'error' || rescheduleStatus === 'permission') &&
                s.actionBtnTextError,
            ]}
          >
            {isRescheduling
              ? t('smartReminders.actions.reschedule.inProgress', {
                  defaultValue: 'Rescheduling…',
                })
              : rescheduleStatus === 'success'
                ? t('smartReminders.actions.reschedule.success', {
                    defaultValue: 'Reminders updated',
                  })
                : rescheduleStatus === 'permission'
                  ? t('smartReminders.actions.reschedule.permission', {
                      defaultValue: 'Enable notifications to reschedule reminders',
                    })
                  : rescheduleStatus === 'error'
                    ? t('smartReminders.actions.reschedule.error', {
                        defaultValue: 'Reminder update failed',
                      })
                    : t('smartReminders.actions.reschedule.idle', {
                        defaultValue: 'Reschedule all reminders',
                      })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── QUIET HOURS PICKER ───────────────────────────────── */}
      {/* Rendered at the end so it overlays the whole panel when open */}
      <TimePickerModal
        visible={quietPickerTarget !== null}
        initialTime={
          quietPickerTarget === 'start' ? settings.quietHoursStart : settings.quietHoursEnd
        }
        onConfirm={(hhmm) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (quietPickerTarget) {
            void updateQuietHours(quietPickerTarget, hhmm);
          }
          setQuietPickerTarget(null);
        }}
        onCancel={() => setQuietPickerTarget(null)}
      />
    </Animated.View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  loadingRow: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  sectionLabel: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: theme.colors.dust,
  },
  row: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.softStone,
  },
  rowH: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowLabel: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  rowSublabel: {
    fontSize: 12,
    color: theme.colors.dust,
    marginTop: 2,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  chip: {
    flex: 1,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: 6,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(180, 83, 9, 0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.dust,
  },
  chipTextActive: {
    fontWeight: '700',
    color: theme.colors.sacredGold,
  },
  timeChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.softStone,
    flexWrap: 'wrap',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  timeChipArrow: {
    fontSize: 14,
    color: theme.colors.dust,
  },
  overnightLabel: {
    fontSize: 11,
    color: theme.colors.dust,
    fontStyle: 'italic',
    marginLeft: 'auto',
  },
  inlineNotice: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.dust,
  },
  actions: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.3)',
    backgroundColor: 'rgba(180, 83, 9, 0.08)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
  },
  actionBtnText: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.sacredGold,
  },
  actionBtnTextSuccess: {
    color: theme.colors.success,
  },
  actionBtnTextError: {
    color: theme.colors.error,
  },
});
