import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { EnergyLevel, type ShiftType } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { formatLocalizedDate, formatLocalizedTime } from '@/utils/i18nFormat';
import { shiftLogService } from '@/services/ShiftLogService';

type ShiftCheckInRequest = {
  shiftDate: string;
  shiftType: ShiftType;
};

interface ShiftCheckInModalProps extends ShiftCheckInRequest {
  visible: boolean;
  userId: string;
  firebaseUid?: string | null;
  onboardingData?: OnboardingData;
  language: string;
  onDismiss: () => void;
}

const DEFAULT_SHIFT_TIMES: Record<
  'day' | 'night' | 'morning' | 'afternoon',
  { startTime: string; endTime: string; duration: number }
> = {
  day: { startTime: '07:00', endTime: '19:00', duration: 12 },
  night: { startTime: '19:00', endTime: '07:00', duration: 12 },
  morning: { startTime: '06:00', endTime: '14:00', duration: 8 },
  afternoon: { startTime: '14:00', endTime: '22:00', duration: 8 },
};

function resolveShiftTiming(
  shiftType: ShiftType,
  shiftTimes: OnboardingData['shiftTimes']
): { startTime: string; endTime: string; duration: number } {
  switch (shiftType) {
    case 'day':
      return shiftTimes?.dayShift ?? DEFAULT_SHIFT_TIMES.day;
    case 'night':
      return shiftTimes?.nightShift ?? shiftTimes?.nightShift3 ?? DEFAULT_SHIFT_TIMES.night;
    case 'morning':
      return shiftTimes?.morningShift ?? DEFAULT_SHIFT_TIMES.morning;
    case 'afternoon':
      return shiftTimes?.afternoonShift ?? DEFAULT_SHIFT_TIMES.afternoon;
    default:
      return DEFAULT_SHIFT_TIMES.day;
  }
}

const ENERGY_OPTIONS: Array<{
  value: EnergyLevel;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { value: EnergyLevel.HIGH, icon: 'sunny', color: '#10B981' },
  { value: EnergyLevel.MEDIUM, icon: 'partly-sunny', color: '#F59E0B' },
  { value: EnergyLevel.LOW, icon: 'moon', color: '#EF4444' },
];

export const ShiftCheckInModal: React.FC<ShiftCheckInModalProps> = ({
  visible,
  userId,
  firebaseUid,
  shiftDate,
  shiftType,
  onboardingData,
  language,
  onDismiss,
}) => {
  const { t } = useTranslation(['common', 'dashboard']);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'savedOffline' | 'error'>('idle');
  const [hasExistingEntry, setHasExistingEntry] = useState(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shiftTiming = useMemo(
    () => resolveShiftTiming(shiftType, onboardingData?.shiftTimes),
    [onboardingData?.shiftTimes, shiftType]
  );
  const localizedShiftType = t(`notifications.smartReminders.shiftType.${shiftType}`, {
    ns: 'dashboard',
    defaultValue: shiftType,
  });
  const formattedDate = formatLocalizedDate(
    new Date(`${shiftDate}T12:00:00.000Z`),
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    },
    language
  );
  const formattedStart = formatLocalizedTime(shiftTiming.startTime, undefined, language);
  const formattedEnd = formatLocalizedTime(shiftTiming.endTime, undefined, language);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setSaveState('idle');

    shiftLogService
      .getShiftLog(userId, shiftDate, shiftType, firebaseUid)
      .then((entry) => {
        if (cancelled) {
          return;
        }

        setEnergyLevel(entry?.energyLevel ?? null);
        setNotes(entry?.notes ?? '');
        setHasExistingEntry(Boolean(entry));
      })
      .catch(() => {
        if (!cancelled) {
          setEnergyLevel(null);
          setNotes('');
          setHasExistingEntry(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseUid, shiftDate, shiftType, userId, visible]);

  const handleSubmit = useCallback(async () => {
    if (!energyLevel) {
      return;
    }

    setIsSubmitting(true);
    setSaveState('idle');

    try {
      const result = await shiftLogService.saveShiftLog(
        {
          id: shiftLogService.buildId(userId, shiftDate, shiftType),
          userId,
          date: shiftDate,
          shiftType,
          startTime: shiftTiming.startTime,
          endTime: shiftTiming.endTime,
          hoursWorked: shiftTiming.duration,
          energyLevel,
          notes: notes.trim() || undefined,
          loggedAt: new Date().toISOString(),
        },
        firebaseUid
      );

      setHasExistingEntry(true);
      setSaveState(result.syncStatus === 'synced' ? 'saved' : 'savedOffline');
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
      dismissTimeoutRef.current = setTimeout(() => {
        dismissTimeoutRef.current = null;
        onDismiss();
      }, 900);
    } catch {
      setSaveState('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    energyLevel,
    firebaseUid,
    notes,
    onDismiss,
    shiftDate,
    shiftTiming.duration,
    shiftTiming.endTime,
    shiftTiming.startTime,
    shiftType,
    userId,
  ]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>
                {t('shiftCheckIn.title', {
                  defaultValue: 'Log your energy after this shift',
                })}
              </Text>
              <Text style={styles.subtitle}>
                {t('shiftCheckIn.subtitle', {
                  defaultValue: '{{shiftType}} on {{shiftDate}} · {{startTime}} - {{endTime}}',
                  shiftType: localizedShiftType,
                  shiftDate: formattedDate,
                  startTime: formattedStart,
                  endTime: formattedEnd,
                })}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onDismiss} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={theme.colors.paper} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={theme.colors.sacredGold} />
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>
                  {t('shiftCheckIn.energyPrompt', {
                    defaultValue: 'How was your energy on this shift?',
                  })}
                </Text>
                <View style={styles.energyRow}>
                  {ENERGY_OPTIONS.map((option) => {
                    const selected = energyLevel === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        testID={`shift-checkin-energy-${option.value.toLowerCase()}`}
                        style={[
                          styles.energyCard,
                          selected && styles.energyCardSelected,
                          selected && { borderColor: option.color },
                        ]}
                        onPress={() => setEnergyLevel(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={22}
                          color={selected ? option.color : theme.colors.dust}
                        />
                        <Text style={styles.energyLabel}>
                          {t(`shiftCheckIn.energy.${option.value.toLowerCase()}`, {
                            defaultValue:
                              option.value === EnergyLevel.HIGH
                                ? 'High'
                                : option.value === EnergyLevel.MEDIUM
                                  ? 'Medium'
                                  : 'Low',
                          })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.sectionLabel}>
                  {t('shiftCheckIn.notesLabel', {
                    defaultValue: 'Notes (optional)',
                  })}
                </Text>
                <TextInput
                  multiline
                  testID="shift-checkin-notes-input"
                  placeholder={t('shiftCheckIn.notesPlaceholder', {
                    defaultValue: 'Anything worth remembering about this shift?',
                  })}
                  placeholderTextColor={theme.colors.dust}
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  maxLength={1000}
                  textAlignVertical="top"
                />

                {saveState === 'saved' ? (
                  <Text style={styles.successText}>
                    {t('shiftCheckIn.saved', {
                      defaultValue: 'Check-in saved.',
                    })}
                  </Text>
                ) : null}
                {saveState === 'savedOffline' ? (
                  <Text style={styles.successText}>
                    {t('shiftCheckIn.savedOffline', {
                      defaultValue:
                        'Check-in saved locally. It will sync when you are back online.',
                    })}
                  </Text>
                ) : null}
                {saveState === 'error' ? (
                  <Text style={styles.errorText}>
                    {t('shiftCheckIn.error', {
                      defaultValue: 'This check-in could not be saved right now. Try again.',
                    })}
                  </Text>
                ) : null}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryButtonText}>
                {t('shiftCheckIn.dismiss', {
                  defaultValue: 'Not now',
                })}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="shift-checkin-submit"
              disabled={!energyLevel || isLoading || isSubmitting}
              onPress={() => void handleSubmit()}
              style={[
                styles.primaryButton,
                (!energyLevel || isLoading || isSubmitting) && styles.primaryButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.deepVoid} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {hasExistingEntry
                    ? t('shiftCheckIn.update', {
                        defaultValue: 'Update check-in',
                      })
                    : t('shiftCheckIn.submit', {
                        defaultValue: 'Save check-in',
                      })}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.deepVoid,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    minHeight: 420,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.darkStone,
  },
  content: {
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  loadingState: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  sectionLabel: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.sm,
  },
  energyRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  energyCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  energyCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  energyLabel: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  notesInput: {
    minHeight: 120,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    color: theme.colors.paper,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSizes.md,
  },
  successText: {
    color: '#4ADE80',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 52,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
});
