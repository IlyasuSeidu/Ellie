import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/utils/theme';

type ChecklistItem = {
  key: string;
  label: string;
  storageKey: string;
  onDoIt: () => void;
};

interface OnboardingChecklistProps {
  onDismiss: () => void;
  onAddShiftTimes?: () => void;
  onCompleteProfile?: () => void;
  onAskEllie?: () => void;
  onSetHourlyRate?: () => void;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  onDismiss,
  onAddShiftTimes,
  onCompleteProfile,
  onAskEllie,
  onSetHourlyRate,
}) => {
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({
    roster: true,
  });

  const items = useMemo<ChecklistItem[]>(
    () => [
      {
        key: 'roster',
        label: 'Set up your roster',
        storageKey: 'checklist:roster_done',
        onDoIt: () => undefined,
      },
      {
        key: 'shift_times',
        label: 'Add your shift times',
        storageKey: 'checklist:shift_times_done',
        onDoIt: () => {
          void AsyncStorage.setItem('checklist:shift_times_done', 'true');
          setCompletedItems((prev) => ({ ...prev, shift_times: true }));
          onAddShiftTimes?.();
        },
      },
      {
        key: 'profile',
        label: 'Complete your profile',
        storageKey: 'checklist:profile_done',
        onDoIt: () => {
          onCompleteProfile?.();
        },
      },
      {
        key: 'ask_ellie',
        label: 'Ask Ellie a question',
        storageKey: 'checklist:ask_ellie_done',
        onDoIt: () => {
          void AsyncStorage.setItem('checklist:ask_ellie_done', 'true');
          setCompletedItems((prev) => ({ ...prev, ask_ellie: true }));
          onAskEllie?.();
        },
      },
      {
        key: 'hourly_rate',
        label: 'Set your hourly rate',
        storageKey: 'checklist:hourly_rate_done',
        onDoIt: () => {
          onSetHourlyRate?.();
        },
      },
    ],
    [onAddShiftTimes, onAskEllie, onCompleteProfile, onSetHourlyRate]
  );

  useEffect(() => {
    let isMounted = true;
    void Promise.all(items.map((item) => AsyncStorage.getItem(item.storageKey))).then((values) => {
      if (!isMounted) return;
      const completed: Record<string, boolean> = { roster: true };
      items.forEach((item, index) => {
        if (values[index] === 'true') {
          completed[item.key] = true;
        }
      });
      setCompletedItems(completed);
    });
    return () => {
      isMounted = false;
    };
  }, [items]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Get the most out of Ellie</Text>
      {items.map((item) => {
        const done = completedItems[item.key] ?? false;
        return (
          <View key={item.key} style={styles.row}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={done ? theme.colors.sacredGold : theme.colors.softStone}
            />
            <Text style={[styles.label, done && styles.labelDone]}>{item.label}</Text>
            {!done && item.key !== 'roster' ? (
              <TouchableOpacity style={styles.doItButton} onPress={item.onDoIt}>
                <Text style={styles.doItText}>Do it</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.doneText}>Done</Text>
            )}
          </View>
        );
      })}
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text style={styles.dismissText}>Dismiss</Text>
      </TouchableOpacity>
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
