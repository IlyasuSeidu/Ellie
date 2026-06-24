import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { usePendingSyncStatus } from '@/hooks/usePendingSyncStatus';
import { theme } from '@/utils/theme';

export const SyncStatusIndicator: React.FC = () => {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const { pendingCount, failedCount, isOnline } = usePendingSyncStatus();

  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  const hasFailedSync = failedCount > 0;
  const message = hasFailedSync
    ? t('syncStatus.failed', {
        count: failedCount,
        defaultValue: '{{count}} update needs review before it can sync.',
      })
    : isOnline
      ? t('syncStatus.syncing', {
          count: pendingCount,
          defaultValue: 'Syncing {{count}} saved update.',
        })
      : t('syncStatus.pending', {
          count: pendingCount,
          defaultValue: '{{count}} update saved locally. It will sync when you are online.',
        });

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + (hasFailedSync ? 52 : 56),
          borderColor: hasFailedSync ? 'rgba(248, 113, 113, 0.44)' : 'rgba(212, 168, 106, 0.32)',
        },
      ]}
      pointerEvents="none"
      testID="sync-status-indicator"
    >
      <Ionicons
        name={hasFailedSync ? 'warning-outline' : 'cloud-upload-outline'}
        size={16}
        color={hasFailedSync ? '#FCA5A5' : theme.colors.paper}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 5,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.96)',
    borderWidth: 1,
  },
  text: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: '600',
  },
});
