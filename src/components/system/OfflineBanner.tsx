import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { theme } from '@/utils/theme';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const snapshot = useNetworkStatus();

  if (snapshot.status !== 'offline') {
    return null;
  }

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="none"
      testID="offline-banner"
    >
      <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.paper} />
      <Text style={styles.text}>
        {t('offlineBanner.message', {
          defaultValue: 'Offline. Your shift data is still available.',
        })}
      </Text>
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
    backgroundColor: 'rgba(68, 64, 60, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 106, 0.32)',
  },
  text: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: '600',
  },
});
