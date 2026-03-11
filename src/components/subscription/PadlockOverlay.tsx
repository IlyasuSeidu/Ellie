import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';

interface PadlockOverlayProps {
  onPress: () => void;
  testID?: string;
}

export const PadlockOverlay: React.FC<PadlockOverlayProps> = ({ onPress, testID }) => {
  const { t } = useTranslation('common');

  return (
    <TouchableOpacity
      style={styles.overlay}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('subscription.padlock.a11yLabel')}
      testID={testID}
    >
      <View style={styles.badge}>
        <Ionicons name="lock-closed" size={14} color={theme.colors.paleGold} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 9, 0.92)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badge: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
  },
});
