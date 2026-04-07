import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import { IS_E2E_TEST_MODE } from '@/utils/e2e';

interface E2ESwipeControlsProps {
  prefix: string;
  onSelect: () => void;
  onNext?: () => void;
  onInfo?: () => void;
}

export const E2ESwipeControls: React.FC<E2ESwipeControlsProps> = ({
  prefix,
  onSelect,
  onNext,
  onInfo,
}) => {
  const [lastAction, setLastAction] = useState<'select' | 'next' | 'info' | null>(null);

  const handleSelect = useCallback(() => {
    setLastAction('select');
    onSelect();
  }, [onSelect]);

  const handleNext = useCallback(() => {
    setLastAction('next');
    onNext?.();
  }, [onNext]);

  const handleInfo = useCallback(() => {
    setLastAction('info');
    onInfo?.();
  }, [onInfo]);

  if (!IS_E2E_TEST_MODE) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label} testID={`${prefix}-e2e-status-label`}>
          {lastAction ? `Simulator • ${lastAction}` : 'Simulator'}
        </Text>
        <View style={styles.row}>
          {onNext ? (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              testID={`${prefix}-e2e-next-button`}
              accessibilityRole="button"
              accessibilityLabel="Move to next option"
              hitSlop={8}
            >
              <Ionicons name="arrow-forward" size={16} color={theme.colors.paper} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleSelect}
            style={({ pressed }) => [styles.selectButton, pressed && styles.selectButtonPressed]}
            testID={`${prefix}-e2e-select-button`}
            accessibilityRole="button"
            accessibilityLabel="Select current option"
            hitSlop={8}
          >
            <Text style={styles.selectButtonText}>Select</Text>
          </Pressable>
          {onInfo ? (
            <Pressable
              onPress={handleInfo}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              testID={`${prefix}-e2e-info-button`}
              accessibilityRole="button"
              accessibilityLabel="Open option information"
              hitSlop={8}
            >
              <Ionicons name="information" size={16} color={theme.colors.paper} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 248,
    right: theme.spacing.lg,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(17, 13, 10, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    color: theme.colors.dust,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectButton: {
    minHeight: 40,
    minWidth: 88,
    borderRadius: 14,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonPressed: {
    opacity: 0.85,
  },
  selectButtonText: {
    color: theme.colors.deepVoid,
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
