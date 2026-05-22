/**
 * ShiftDefinitionPalette
 *
 * Displays reusable shift definitions. Each row shows color chip, icon, name,
 * time, usage count, and controls to add, edit, or delete.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { UniversalShiftSequenceItem, UniversalShiftDefinition } from '@/types';
import { getUniversalShiftDisplayModel } from '@/utils/universalShiftUtils';

export interface ShiftDefinitionPaletteProps {
  definitions: UniversalShiftDefinition[];
  sequence: UniversalShiftSequenceItem[];
  onAdd: (definitionId: string) => void;
  onEdit: (definition: UniversalShiftDefinition) => void;
  onDelete: (definitionId: string) => void;
  onCreateNew: () => void;
}

export const ShiftDefinitionPalette: React.FC<ShiftDefinitionPaletteProps> = ({
  definitions,
  sequence,
  onAdd,
  onEdit,
  onDelete,
  onCreateNew,
}) => {
  const usageMap = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of sequence) {
      counts.set(item.shiftDefinitionId, (counts.get(item.shiftDefinitionId) ?? 0) + 1);
    }
    return counts;
  }, [sequence]);

  const handleAdd = useCallback(
    (def: UniversalShiftDefinition) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAdd(def.id);
    },
    [onAdd]
  );

  const handleEdit = useCallback(
    (def: UniversalShiftDefinition) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEdit(def);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (def: UniversalShiftDefinition) => {
      const count = usageMap.get(def.id) ?? 0;
      if (count > 0) {
        Alert.alert(
          'Cannot delete',
          `"${def.name}" is used ${count} time${count !== 1 ? 's' : ''} in your sequence. Remove it from the sequence first.`,
          [{ text: 'OK' }]
        );
        return;
      }
      Alert.alert(`Delete "${def.name}"?`, 'This shift type will be permanently removed.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(def.id);
          },
        },
      ]);
    },
    [usageMap, onDelete]
  );

  const handleCreateNew = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreateNew();
  }, [onCreateNew]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shift Types</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateNew}
          accessibilityLabel="Create new shift type"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={16} color={theme.colors.sacredGold} />
          <Text style={styles.createButtonText}>New type</Text>
        </TouchableOpacity>
      </View>

      {definitions.length === 0 ? (
        <Animated.View entering={FadeInUp} style={styles.emptyState}>
          <Ionicons name="layers-outline" size={32} color={theme.colors.shadow} />
          <Text style={styles.emptyText}>No shift types yet.</Text>
          <Text style={styles.emptySubtext}>Tap New type to create your first shift.</Text>
        </Animated.View>
      ) : (
        <View>
          {definitions.map((def) => {
            const display = getUniversalShiftDisplayModel(def);
            const usageCount = usageMap.get(def.id) ?? 0;
            const isInUse = usageCount > 0;

            return (
              <Animated.View
                key={def.id}
                entering={FadeInUp}
                exiting={FadeOutDown}
                layout={Layout.springify()}
                style={styles.row}
              >
                {/* Color bar */}
                <View style={[styles.colorBar, { backgroundColor: display.color }]} />

                {/* Icon badge */}
                <View style={[styles.iconBadge, { backgroundColor: display.color + '22' }]}>
                  <Ionicons
                    name={display.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={display.color}
                  />
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.defName} numberOfLines={1}>
                    {display.name}
                  </Text>
                  {display.timeDisplay ? (
                    <Text style={styles.defTime}>{display.timeDisplay}</Text>
                  ) : (
                    <Text style={styles.defTime}>{def.kind}</Text>
                  )}
                </View>

                {/* Usage count badge */}
                {isInUse && (
                  <View
                    style={[
                      styles.usageBadge,
                      {
                        backgroundColor: display.color + '22',
                        borderColor: display.color + '55',
                      },
                    ]}
                  >
                    <Text style={[styles.usageBadgeText, { color: display.color }]}>
                      ×{usageCount}
                    </Text>
                  </View>
                )}

                {/* Controls */}
                <View style={styles.controls}>
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      {
                        backgroundColor: display.color + '22',
                        borderColor: display.color + '55',
                      },
                    ]}
                    onPress={() => handleAdd(def)}
                    accessibilityLabel={`Add ${def.name} to sequence`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="add-circle" size={22} color={display.color} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => handleEdit(def)}
                    accessibilityLabel={`Edit ${def.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="pencil" size={18} color={display.color} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, isInUse && styles.controlButtonDisabled]}
                    onPress={() => handleDelete(def)}
                    accessibilityLabel={`Delete ${def.name}`}
                    accessibilityHint={isInUse ? 'Cannot delete — in use in sequence' : ''}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={isInUse ? theme.colors.shadow : theme.colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  createButtonText: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  emptyText: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  emptySubtext: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
    minHeight: 52,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  defName: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  defTime: {
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 1,
  },
  usageBadge: {
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    marginRight: theme.spacing.xs,
  },
  usageBadgeText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: theme.spacing.sm,
  },
  controlButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
});
