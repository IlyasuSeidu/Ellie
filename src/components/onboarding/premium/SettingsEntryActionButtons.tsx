import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '@/utils/theme';

type SettingsEntryActionButtonsProps = {
  backLabel: string;
  saveLabel: string;
  onBack: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  backAccessibilityLabel?: string;
  saveAccessibilityLabel?: string;
  backAccessibilityHint?: string;
  saveAccessibilityHint?: string;
  backTestID?: string;
  saveTestID?: string;
  style?: StyleProp<ViewStyle>;
};

export const SettingsEntryActionButtons: React.FC<SettingsEntryActionButtonsProps> = ({
  backLabel,
  saveLabel,
  onBack,
  onSave,
  saveDisabled = false,
  backAccessibilityLabel,
  saveAccessibilityLabel,
  backAccessibilityHint,
  saveAccessibilityHint,
  backTestID,
  saveTestID,
  style,
}) => {
  return (
    <View style={[styles.row, style]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel ?? backLabel}
        accessibilityHint={backAccessibilityHint}
        testID={backTestID}
      >
        <Text
          style={styles.backButtonText}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.85}
        >
          {backLabel}
        </Text>
      </Pressable>

      <Pressable
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveButton,
          saveDisabled && styles.saveButtonDisabled,
          pressed && !saveDisabled && styles.saveButtonPressed,
        ]}
        disabled={saveDisabled}
        accessibilityRole="button"
        accessibilityLabel={saveAccessibilityLabel ?? saveLabel}
        accessibilityHint={saveAccessibilityHint}
        accessibilityState={{ disabled: saveDisabled }}
        testID={saveTestID}
      >
        <Text
          style={[styles.saveButtonText, saveDisabled && styles.saveButtonTextDisabled]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.85}
        >
          {saveLabel}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
  backButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white30,
    backgroundColor: '#223274',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  backButtonText: {
    color: theme.colors.paper,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.45)',
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.softStone,
    borderColor: theme.colors.opacity.white30,
  },
  saveButtonText: {
    color: theme.colors.deepVoid,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  saveButtonTextDisabled: {
    color: theme.colors.shadow,
    fontWeight: '700',
  },
});
