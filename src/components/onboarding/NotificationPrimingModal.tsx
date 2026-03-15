import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';

interface NotificationPrimingModalProps {
  visible: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export const NotificationPrimingModal: React.FC<NotificationPrimingModalProps> = ({
  visible,
  onAllow,
  onDecline,
}) => {
  const { t } = useTranslation('onboarding');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons
            name="notifications-outline"
            size={52}
            color={theme.colors.sacredGold}
            style={styles.icon}
          />
          <Text style={styles.title}>
            {t('completion.notificationPriming.title', { defaultValue: 'Never miss a shift' })}
          </Text>
          <Text style={styles.body}>
            {t('completion.notificationPriming.body', {
              defaultValue:
                'Ellie will remind you 24 hours and 4 hours before every shift.\nYou control what and when.',
            })}
          </Text>
          <TouchableOpacity style={styles.allowButton} onPress={onAllow}>
            <Text style={styles.allowText}>
              {t('completion.notificationPriming.allow', { defaultValue: 'Turn On Reminders' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineText}>
              {t('completion.notificationPriming.decline', { defaultValue: 'Not now' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    alignItems: 'center',
    paddingBottom: 48,
  },
  icon: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.paper,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: theme.colors.dust,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  allowButton: {
    width: '100%',
    backgroundColor: theme.colors.sacredGold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.deepVoid,
  },
  declineButton: {
    paddingVertical: 8,
  },
  declineText: {
    fontSize: 15,
    color: theme.colors.dust,
  },
});
