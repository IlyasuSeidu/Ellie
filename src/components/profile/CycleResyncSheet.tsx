/**
 * CycleResyncSheet
 *
 * Two-stage bottom sheet for re-syncing the user's current position in their
 * shift cycle (phaseOffset). Stage 1 picks the current phase/block, Stage 2
 * picks the day within that phase/block.
 *
 * Works for both rotating (Day / Night / Off phases) and FIFO (Work / Rest blocks).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInUp,
  FadeOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { ShiftPattern } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { getDefaultFIFOConfig, getShiftPattern } from '@/utils/shiftUtils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.8;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhaseOption {
  id: string;
  label: string;
  days: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFIFOPattern(patternType?: ShiftPattern): boolean {
  switch (patternType) {
    case ShiftPattern.FIFO_7_7:
    case ShiftPattern.FIFO_8_6:
    case ShiftPattern.FIFO_14_14:
    case ShiftPattern.FIFO_14_7:
    case ShiftPattern.FIFO_21_7:
    case ShiftPattern.FIFO_28_14:
    case ShiftPattern.FIFO_CUSTOM:
      return true;
    default:
      return false;
  }
}

function getRotatingPhases(data: OnboardingData): PhaseOption[] {
  const is3 = data.shiftSystem === '3-shift';
  const phases: PhaseOption[] = [];

  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    const day = data.customPattern.daysOn;
    const night = data.customPattern.nightsOn;
    const off = data.customPattern.daysOff;
    const morning = data.customPattern.morningOn ?? day;
    const afternoon = data.customPattern.afternoonOn ?? day;
    const night3 = data.customPattern.nightOn ?? night;

    if (is3) {
      if (morning > 0) {
        phases.push({
          id: 'morning',
          label: 'morning',
          days: morning,
          icon: 'partly-sunny-outline',
          color: '#F59E0B',
        });
      }
      if (afternoon > 0) {
        phases.push({
          id: 'afternoon',
          label: 'afternoon',
          days: afternoon,
          icon: 'cloud-outline',
          color: '#06B6D4',
        });
      }
      if (night3 > 0) {
        phases.push({
          id: 'night',
          label: 'night',
          days: night3,
          icon: 'moon-outline',
          color: '#9C27B0',
        });
      }
    } else {
      if (day > 0) {
        phases.push({
          id: 'day',
          label: 'day',
          days: day,
          icon: 'sunny-outline',
          color: '#2196F3',
        });
      }
      if (night > 0) {
        phases.push({
          id: 'night',
          label: 'night',
          days: night,
          icon: 'moon-outline',
          color: '#9C27B0',
        });
      }
    }

    if (off > 0) {
      phases.push({
        id: 'off',
        label: 'off',
        days: off,
        icon: 'bed-outline',
        color: '#4CAF50',
      });
    }
    return phases;
  }

  if (!data.patternType) return phases;
  const pattern = getShiftPattern(data.patternType);
  const config = pattern?.config;
  if (!config) return phases;

  if (is3) {
    const hasExplicitThreeShift =
      (config.morningOn ?? 0) > 0 || (config.afternoonOn ?? 0) > 0 || (config.nightOn ?? 0) > 0;
    const morning = hasExplicitThreeShift ? (config.morningOn ?? 0) : (config.daysOn ?? 0);
    const afternoon = hasExplicitThreeShift ? (config.afternoonOn ?? 0) : (config.daysOn ?? 0);
    const night = hasExplicitThreeShift ? (config.nightOn ?? 0) : (config.nightsOn ?? 0);

    if (morning > 0) {
      phases.push({
        id: 'morning',
        label: 'morning',
        days: morning,
        icon: 'partly-sunny-outline',
        color: '#F59E0B',
      });
    }
    if (afternoon > 0) {
      phases.push({
        id: 'afternoon',
        label: 'afternoon',
        days: afternoon,
        icon: 'cloud-outline',
        color: '#06B6D4',
      });
    }
    if (night > 0) {
      phases.push({
        id: 'night',
        label: 'night',
        days: night,
        icon: 'moon-outline',
        color: '#9C27B0',
      });
    }
  } else {
    if ((config.daysOn ?? 0) > 0) {
      phases.push({
        id: 'day',
        label: 'day',
        days: config.daysOn ?? 0,
        icon: 'sunny-outline',
        color: '#2196F3',
      });
    }
    if ((config.nightsOn ?? 0) > 0) {
      phases.push({
        id: 'night',
        label: 'night',
        days: config.nightsOn ?? 0,
        icon: 'moon-outline',
        color: '#9C27B0',
      });
    }
  }

  if ((config.daysOff ?? 0) > 0) {
    phases.push({
      id: 'off',
      label: 'off',
      days: config.daysOff,
      icon: 'bed-outline',
      color: '#4CAF50',
    });
  }

  return phases;
}

function getFIFOPhases(data: OnboardingData): PhaseOption[] {
  const defaultConfig = data.patternType ? getDefaultFIFOConfig(data.patternType) : null;
  const workDays = data.fifoConfig?.workBlockDays ?? defaultConfig?.workBlockDays ?? 8;
  const restDays = data.fifoConfig?.restBlockDays ?? defaultConfig?.restBlockDays ?? 6;
  const phases: PhaseOption[] = [];

  if (workDays > 0) {
    phases.push({
      id: 'work',
      label: 'work',
      days: workDays,
      icon: 'construct-outline',
      color: '#2196F3',
    });
  }

  if (restDays > 0) {
    phases.push({
      id: 'rest',
      label: 'rest',
      days: restDays,
      icon: 'home-outline',
      color: '#78716c',
    });
  }

  return phases;
}

function getDayDescription(
  day: number,
  totalDays: number,
  phaseLabel: string,
  t: TFunction<'profile'>
): string {
  if (day === 1) {
    return t('shift.cycleResync.dayDescriptions.first', {
      phase: phaseLabel,
      defaultValue: `First day of ${phaseLabel}`,
    });
  }
  if (day === totalDays) {
    return t('shift.cycleResync.dayDescriptions.last', {
      phase: phaseLabel,
      defaultValue: `Last day of ${phaseLabel}`,
    });
  }
  if (day === Math.ceil(totalDays / 2)) {
    return t('shift.cycleResync.dayDescriptions.midpoint', {
      phase: phaseLabel,
      defaultValue: `Midpoint of ${phaseLabel}`,
    });
  }
  return t('shift.cycleResync.dayDescriptions.dayOf', {
    day,
    phase: phaseLabel,
    defaultValue: `Day ${day} of ${phaseLabel}`,
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CycleResyncSheetProps {
  visible: boolean;
  onClose: () => void;
  data: OnboardingData;
  onSelect: (phaseOffset: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CycleResyncSheet: React.FC<CycleResyncSheetProps> = ({
  visible,
  onClose,
  data,
  onSelect,
}) => {
  const { t } = useTranslation('profile');
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Two-stage selection state
  const [stage, setStage] = useState<'phase' | 'day'>('phase');
  const [selectedPhase, setSelectedPhase] = useState<PhaseOption | null>(null);
  const [phaseBaseOffset, setPhaseBaseOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);

  // Reset to stage 1 when sheet opens
  useEffect(() => {
    if (visible) {
      setStage('phase');
      setSelectedPhase(null);
      setPhaseBaseOffset(0);
      setSelectedDay(1);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    // Reset to hidden values before opening animation to avoid stale modal state in native builds.
    backdropOpacity.value = 0;
    translateY.value = SCREEN_HEIGHT;
    backdropOpacity.value = withTiming(1, { duration: 220 });
    translateY.value = withSpring(0, { damping: 22, stiffness: 260 });
  }, [visible, backdropOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const isFIFO = data.rosterType === 'fifo' || isFIFOPattern(data.patternType);
  const phases = useMemo(() => {
    const basePhases = isFIFO ? getFIFOPhases(data) : getRotatingPhases(data);

    return basePhases.map((phase) => {
      const key = `shift.cycleResync.phaseLabels.${phase.id}`;

      return {
        ...phase,
        label: t(key, {
          defaultValue: t(`shift.${phase.label}`, { defaultValue: phase.label }),
        }),
      };
    });
  }, [data, isFIFO, t]);

  const handlePhaseSelect = (phase: PhaseOption, index: number) => {
    if (phase.days <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const baseOffset = phases.slice(0, index).reduce((acc, p) => acc + p.days, 0);
    setSelectedPhase(phase);
    setPhaseBaseOffset(baseOffset);
    setSelectedDay(1);
    setStage('day');
  };

  const handleConfirm = () => {
    if (!selectedPhase || selectedPhase.days <= 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelect(phaseBaseOffset + selectedDay - 1);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          accessibilityLabel={t('shift.cycleResync.backdropCloseA11y', {
            defaultValue: 'Close',
          })}
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        {/* Stage 1: Pick Phase */}
        {stage === 'phase' && (
          <Animated.View
            entering={FadeInUp.duration(250)}
            exiting={FadeOutUp.duration(180)}
            style={styles.stageContainer}
          >
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconBg}>
                  <Ionicons name="locate-outline" size={18} color={theme.colors.sacredGold} />
                </View>
                <View>
                  <Animated.Text style={styles.headerTitle}>
                    {t('shift.cycleResync.title', { defaultValue: 'Re-sync Cycle' })}
                  </Animated.Text>
                  <Animated.Text style={styles.headerSubtitle}>
                    {isFIFO
                      ? t('shift.cycleResync.subtitleFifo', {
                          defaultValue: 'Are you at work or home?',
                        })
                      : t('shift.cycleResync.subtitleRotating', {
                          defaultValue: 'Which shift phase are you on?',
                        })}
                  </Animated.Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityLabel={t('shift.cycleResync.closeA11y', {
                  defaultValue: 'Close',
                })}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.shadow} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {phases.map((phase, index) => (
                <TouchableOpacity
                  key={phase.id}
                  style={styles.phaseCard}
                  onPress={() => handlePhaseSelect(phase, index)}
                  activeOpacity={0.75}
                  accessibilityLabel={`${phase.label}, ${t('shift.daysCount', {
                    count: phase.days,
                    defaultValue: '{{count}} days',
                  })}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.phaseIconBg, { backgroundColor: phase.color + '20' }]}>
                    <Ionicons name={phase.icon} size={22} color={phase.color} />
                  </View>
                  <View style={styles.phaseInfo}>
                    <Animated.Text style={styles.phaseLabel}>{phase.label}</Animated.Text>
                    <Animated.Text style={styles.phaseDays}>
                      {t('shift.daysCount', {
                        count: phase.days,
                        defaultValue: '{{count}} days',
                      })}
                    </Animated.Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.shadow} />
                </TouchableOpacity>
              ))}

              {phases.length === 0 && (
                <View style={styles.emptyState}>
                  <Animated.Text style={styles.emptyText}>
                    {t('shift.cycleResync.empty', {
                      defaultValue: 'Configure a shift pattern first to re-sync your cycle.',
                    })}
                  </Animated.Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}

        {/* Stage 2: Pick Day Within Phase */}
        {stage === 'day' && selectedPhase && selectedPhase.days > 0 && (
          <Animated.View
            entering={FadeInUp.duration(250)}
            exiting={FadeOutUp.duration(180)}
            style={styles.stageContainer}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setStage('phase')}
                style={styles.backBtn}
                hitSlop={8}
                accessibilityLabel={t('shift.cycleResync.backToPhaseA11y', {
                  defaultValue: 'Back to phase selection',
                })}
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={20} color={theme.colors.dust} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Animated.Text style={styles.headerTitle}>{selectedPhase.label}</Animated.Text>
                <Animated.Text style={styles.headerSubtitle}>
                  {t('shift.cycleResync.daySubtitle', { defaultValue: 'Which day are you on?' })}
                </Animated.Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityLabel={t('shift.cycleResync.closeA11y', {
                  defaultValue: 'Close',
                })}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.shadow} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Day number pills */}
              <View style={styles.dayPillsGrid}>
                {Array.from({ length: selectedPhase.days }, (_, i) => i + 1).map((day) => {
                  const isSelected = day === selectedDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayPill,
                        isSelected && {
                          backgroundColor: theme.colors.opacity.gold10,
                          borderColor: theme.colors.sacredGold,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedDay(day);
                      }}
                      activeOpacity={0.7}
                      accessibilityLabel={t('shift.cycleResync.dayA11y', {
                        day,
                        defaultValue: 'Day {{day}}',
                      })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                    >
                      <Animated.Text
                        style={[
                          styles.dayPillText,
                          isSelected && { color: theme.colors.sacredGold, fontWeight: '700' },
                        ]}
                      >
                        {day}
                      </Animated.Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Animated.Text style={styles.dayDescription}>
                {getDayDescription(selectedDay, selectedPhase.days, selectedPhase.label, t)}
              </Animated.Text>

              {/* Confirm button */}
              <TouchableOpacity
                style={[styles.confirmBtn, selectedPhase.days <= 0 && styles.confirmBtnDisabled]}
                onPress={handleConfirm}
                disabled={selectedPhase.days <= 0}
                activeOpacity={0.8}
                accessibilityLabel={t('shift.cycleResync.confirmA11y', {
                  defaultValue: 'Confirm cycle position',
                })}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.paper} />
                <Animated.Text style={styles.confirmText}>
                  {t('shift.cycleResync.confirm', { defaultValue: 'Confirm Position' })}
                </Animated.Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.softStone,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  stageContainer: {
    flex: 1,
  },
  // ── Header ─────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
    gap: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.opacity.gold10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Scroll ─────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  // ── Phase cards ────────────────────────
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  phaseIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseInfo: {
    flex: 1,
  },
  phaseLabel: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.paper,
  },
  phaseDays: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 2,
  },
  // ── Day pills ──────────────────────────
  dayPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  dayPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.softStone,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    fontWeight: theme.typography.fontWeights.medium,
  },
  dayDescription: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  // ── Confirm ────────────────────────────
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  confirmBtnDisabled: {
    backgroundColor: theme.colors.shadow,
  },
  confirmText: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  // ── Empty state ────────────────────────
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
