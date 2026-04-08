import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type { OnboardingData } from '@/contexts/OnboardingContext';

interface OnboardingChecklistProps {
  /** Live onboarding data — used to derive shift-times and profile completion. */
  userData: OnboardingData | null;
  onDismiss: () => void;
  onAddShiftTimes: () => void;
  onCompleteProfile: () => void;
  onAskEllie: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  userData,
  onDismiss,
  onAddShiftTimes,
  onCompleteProfile,
  onAskEllie,
}) => {
  const { t } = useTranslation('dashboard');
  const [askEllieDone, setAskEllieDone] = useState(false);

  // Derive completion from actual data so a focus-return auto-ticks items.
  const shiftTimesDone =
    userData?.shiftTimes !== null &&
    userData?.shiftTimes !== undefined &&
    Object.keys(userData.shiftTimes).length > 0;
  const profileDone = Boolean(userData?.name);

  const handleAskEllie = useCallback(() => {
    setAskEllieDone(true);
    onAskEllie();
  }, [onAskEllie]);

  const items = useMemo(
    () => [
      {
        key: 'roster',
        label: t('onboardingChecklist.items.roster', { defaultValue: 'Set up your roster' }),
        done: true,
        onDoIt: undefined,
      },
      {
        key: 'shift_times',
        label: t('onboardingChecklist.items.shiftTimes', { defaultValue: 'Add your shift times' }),
        done: shiftTimesDone,
        onDoIt: onAddShiftTimes,
      },
      {
        key: 'profile',
        label: t('onboardingChecklist.items.profile', { defaultValue: 'Complete your profile' }),
        done: profileDone,
        onDoIt: onCompleteProfile,
      },
      {
        key: 'ask_ellie',
        label: t('onboardingChecklist.items.askEllie', { defaultValue: 'Ask Ellie a question' }),
        done: askEllieDone,
        onDoIt: handleAskEllie,
      },
    ],
    [
      askEllieDone,
      handleAskEllie,
      onAddShiftTimes,
      onCompleteProfile,
      profileDone,
      shiftTimesDone,
      t,
    ]
  );

  const allComplete = items.every((item) => item.done);

  // Auto-dismiss when every item is ticked — give the user 1.2 s to see the completed state.
  useEffect(() => {
    if (!allComplete) return undefined;
    const timer = setTimeout(onDismiss, 1200);
    return () => clearTimeout(timer);
  }, [allComplete, onDismiss]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('onboardingChecklist.title', { defaultValue: 'Get the most out of Ellie' })}
      </Text>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View key={item.key} style={[styles.row, isLast && styles.rowLast]}>
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={item.done ? theme.colors.sacredGold : theme.colors.softStone}
            />
            <Text style={[styles.label, item.done && styles.labelDone]}>{item.label}</Text>
            {item.done || item.key === 'roster' ? (
              <Text style={styles.doneText}>
                {t('onboardingChecklist.actions.done', { defaultValue: 'Done' })}
              </Text>
            ) : (
              <TouchableOpacity style={styles.doItButton} onPress={item.onDoIt}>
                <Text style={styles.doItText}>
                  {t('onboardingChecklist.actions.doIt', { defaultValue: 'Do it' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {!allComplete && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissText}>
            {t('onboardingChecklist.actions.dismiss', { defaultValue: 'Dismiss' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.paper,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,113,108,0.15)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.paper,
  },
  labelDone: {
    color: theme.colors.dust,
    textDecorationLine: 'line-through',
  },
  doItButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(212,168,106,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,106,0.3)',
  },
  doItText: {
    fontSize: 12,
    color: theme.colors.sacredGold,
    fontWeight: '600',
  },
  doneText: {
    fontSize: 12,
    color: theme.colors.dust,
  },
  dismissButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'flex-end',
  },
  dismissText: {
    fontSize: 13,
    color: theme.colors.shadow,
  },
});
