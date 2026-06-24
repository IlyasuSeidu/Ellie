/**
 * ShiftSequenceCanvas
 *
 * Vertical scrollable sequence editor. Shows all sequence items as ShiftBlockCards
 * with move-up/move-down controls (accessible alternative to drag).
 * Includes cycle stats, add-shift, and add-repeated-block capabilities.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import type { UniversalShiftSequenceItem, UniversalShiftDefinition } from '@/types';
import { ShiftBlockCard } from './ShiftBlockCard';

export interface ShiftSequenceCanvasProps {
  sequence: UniversalShiftSequenceItem[];
  definitions: UniversalShiftDefinition[];
  onReorder: (newSequence: UniversalShiftSequenceItem[]) => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onDuplicate: (index: number) => void;
  onInsertBefore: (index: number, definitionId: string) => void;
  onInsertAfter: (index: number, definitionId: string) => void;
  onDelete: (index: number) => void;
  onItemPress: (index: number) => void;
  onAddShift: (definitionId: string) => void;
  onAddRepeatedBlock: (definitionId: string, count: number) => void;
  title?: string;
  helperText?: string;
  addShiftLabel?: string;
  addBlockLabel?: string;
}

type AddMode = 'single' | 'repeated' | null;
const ESTIMATED_ROW_HEIGHT = 64;

interface PendingInsert {
  mode: 'before' | 'after';
  index: number;
}

interface DraggableSequenceItemProps {
  item: UniversalShiftSequenceItem;
  definition: UniversalShiftDefinition;
  index: number;
  total: number;
  isDragging: boolean;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onDuplicate: (index: number) => void;
  onInsertBefore: (index: number) => void;
  onInsertAfter: (index: number) => void;
  onDelete: (index: number) => void;
  onItemPress: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
}

const DraggableSequenceItem: React.FC<DraggableSequenceItemProps> = ({
  item,
  definition,
  index,
  total,
  isDragging,
  onMoveItem,
  onDuplicate,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onItemPress,
  onDragStart,
  onDragEnd,
}) => {
  const translateY = useSharedValue(0);
  const lift = useSharedValue(1);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: lift.value }],
    zIndex: isDragging ? 10 : 0,
  }));

  const panGesture = Gesture.Pan()
    .activateAfterLongPress(180)
    .runOnJS(true)
    .onBegin(() => {
      onDragStart(index);
      lift.value = withSpring(1.025);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    })
    .onUpdate((event) => {
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const rowOffset = Math.round(event.translationY / ESTIMATED_ROW_HEIGHT);
      const targetIndex = Math.max(0, Math.min(total - 1, index + rowOffset));
      translateY.value = withSpring(0);
      lift.value = withSpring(1);
      onDragEnd();
      if (targetIndex !== index) {
        onMoveItem(index, targetIndex);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    })
    .onFinalize(() => {
      translateY.value = withSpring(0);
      lift.value = withSpring(1);
      onDragEnd();
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={dragStyle}>
        <ShiftBlockCard
          item={item}
          definition={definition}
          index={index}
          total={total}
          isFirst={index === 0}
          isLast={index === total - 1}
          isDragging={isDragging}
          onMoveUp={(fromIndex) => onMoveItem(fromIndex, fromIndex - 1)}
          onMoveDown={(fromIndex) => onMoveItem(fromIndex, fromIndex + 1)}
          onDuplicate={onDuplicate}
          onInsertBefore={onInsertBefore}
          onInsertAfter={onInsertAfter}
          onDelete={onDelete}
          onPress={onItemPress}
          onDragStart={onDragStart}
        />
      </Animated.View>
    </GestureDetector>
  );
};

export const ShiftSequenceCanvas: React.FC<ShiftSequenceCanvasProps> = ({
  sequence,
  definitions,
  onReorder: _onReorder,
  onMoveItem,
  onDuplicate,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onItemPress,
  onAddShift,
  onAddRepeatedBlock,
  title,
  helperText,
  addShiftLabel,
  addBlockLabel,
}) => {
  const { t } = useTranslation('onboarding');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [repeatCount, setRepeatCount] = useState('4');
  const [pendingInsert, setPendingInsert] = useState<PendingInsert | null>(null);

  const defMap = new Map(definitions.map((d) => [d.id, d]));

  // Cycle stats for badge
  const cycleStats =
    sequence.length > 0 && definitions.length > 0
      ? (() => {
          const totalDays = sequence.length;
          let workDays = 0;
          for (const item of sequence) {
            const def = defMap.get(item.shiftDefinitionId);
            if (def?.countsAsWork) workDays++;
          }
          const avgPerWeek = totalDays > 0 ? ((workDays / totalDays) * 7).toFixed(1) : '0';
          return { totalDays, workDays, avgPerWeek };
        })()
      : null;

  const handleDragStart = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleInsertBefore = useCallback(
    (index: number) => {
      if (definitions.length === 0) return;
      if (definitions.length === 1) {
        onInsertBefore(index, definitions[0].id);
        return;
      }
      setPendingInsert({ mode: 'before', index });
      setAddMode('single');
    },
    [definitions, onInsertBefore]
  );

  const handleInsertAfter = useCallback(
    (index: number) => {
      if (definitions.length === 0) return;
      if (definitions.length === 1) {
        onInsertAfter(index, definitions[0].id);
        return;
      }
      setPendingInsert({ mode: 'after', index });
      setAddMode('single');
    },
    [definitions, onInsertAfter]
  );

  const handleDefinitionPick = useCallback(
    (definitionId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (addMode === 'repeated') {
        const count = Math.max(1, Math.min(90, parseInt(repeatCount, 10) || 1));
        onAddRepeatedBlock(definitionId, count);
        setAddMode(null);
        setRepeatCount('4');
      } else if (addMode === 'single' && pendingInsert) {
        if (pendingInsert.mode === 'before') {
          onInsertBefore(pendingInsert.index, definitionId);
        } else {
          onInsertAfter(pendingInsert.index, definitionId);
        }
        setAddMode(null);
        setPendingInsert(null);
      } else {
        onAddShift(definitionId);
        setAddMode(null);
      }
    },
    [
      addMode,
      repeatCount,
      pendingInsert,
      onAddRepeatedBlock,
      onInsertBefore,
      onInsertAfter,
      onAddShift,
    ]
  );

  const handleAddSingle = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (definitions.length === 0) {
      Alert.alert(
        t('shiftBuilder.canvas.noShiftTypesTitle'),
        t('shiftBuilder.canvas.noShiftTypesMessage')
      );
      return;
    }
    if (definitions.length === 1) {
      onAddShift(definitions[0].id);
      return;
    }
    setPendingInsert(null);
    setAddMode('single');
  }, [definitions, onAddShift, t]);

  const handleAddRepeated = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (definitions.length === 0) {
      Alert.alert(
        t('shiftBuilder.canvas.noShiftTypesTitle'),
        t('shiftBuilder.canvas.noShiftTypesMessage')
      );
      return;
    }
    setPendingInsert(null);
    setAddMode('repeated');
  }, [definitions, t]);

  const handleCloseModal = useCallback(() => {
    setAddMode(null);
    setPendingInsert(null);
  }, []);

  const renderEmpty = () => (
    <Animated.View entering={FadeInUp} style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={40} color={'#6f8798'} />
      <Text style={styles.emptyTitle}>{t('shiftBuilder.canvas.emptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('shiftBuilder.canvas.emptySubtitle')}</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header with stats */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title ?? t('shiftBuilder.canvas.title')}</Text>
          {helperText ? <Text style={styles.headerHelper}>{helperText}</Text> : null}
        </View>
        {cycleStats && (
          <View style={styles.statsBadge}>
            <Text style={styles.statsBadgeText}>
              {t('shiftBuilder.canvas.cycleStats', {
                days: cycleStats.totalDays,
                avg: cycleStats.avgPerWeek,
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Sequence list */}
      {sequence.length === 0 ? (
        renderEmpty()
      ) : (
        <View>
          {sequence.map((item, index) => {
            const def = defMap.get(item.shiftDefinitionId);
            if (!def) return null;
            return (
              <DraggableSequenceItem
                key={`${item.id}-${index}`}
                item={item}
                definition={def}
                index={index}
                total={sequence.length}
                isDragging={draggingIndex === index}
                onMoveItem={onMoveItem}
                onDuplicate={onDuplicate}
                onInsertBefore={handleInsertBefore}
                onInsertAfter={handleInsertAfter}
                onDelete={onDelete}
                onItemPress={onItemPress}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </View>
      )}

      {/* Add controls */}
      <View style={styles.addRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSingle}
          accessibilityLabel={t('shiftBuilder.canvas.addShiftA11y')}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={18} color={'#20f4dc'} />
          <Text style={styles.addButtonText}>
            {addShiftLabel ?? t('shiftBuilder.canvas.addShift')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddRepeated}
          accessibilityLabel={t('shiftBuilder.canvas.addBlockA11y')}
          accessibilityRole="button"
        >
          <Ionicons name="layers-outline" size={18} color={'#20f4dc'} />
          <Text style={styles.addButtonText}>
            {addBlockLabel ?? t('shiftBuilder.canvas.addBlock')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Definition picker modal */}
      <Modal
        visible={addMode !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>
              {addMode === 'repeated'
                ? t('shiftBuilder.canvas.modalAddRepeated')
                : pendingInsert
                  ? t(
                      pendingInsert.mode === 'before'
                        ? 'shiftBuilder.canvas.modalInsertBefore'
                        : 'shiftBuilder.canvas.modalInsertAfter',
                      { day: pendingInsert.index + 1 }
                    )
                  : t('shiftBuilder.canvas.modalChooseShift')}
            </Text>

            {addMode === 'repeated' && (
              <View style={styles.repeatRow}>
                <Text style={styles.repeatLabel}>{t('shiftBuilder.canvas.repeatCountLabel')}</Text>
                <TextInput
                  style={styles.repeatInput}
                  value={repeatCount}
                  onChangeText={setRepeatCount}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                  accessibilityLabel={t('shiftBuilder.canvas.repeatInputA11y')}
                />
                <Text style={styles.repeatLabel}>{t('shiftBuilder.canvas.repeatTimes')}</Text>
              </View>
            )}

            <ScrollView style={styles.defList}>
              {definitions.map((def) => {
                const usageCount = sequence.filter((s) => s.shiftDefinitionId === def.id).length;
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={styles.defPickerRow}
                    onPress={() => handleDefinitionPick(def.id)}
                    accessibilityLabel={
                      usageCount > 0
                        ? `${def.name}, ${t('shiftBuilder.canvas.definitionUsedTimes', {
                            count: usageCount,
                          })}`
                        : def.name
                    }
                    accessibilityRole="button"
                  >
                    <View style={[styles.defColorChip, { backgroundColor: def.color }]} />
                    <Ionicons
                      name={def.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={def.color}
                      style={styles.defIcon}
                    />
                    <Text style={styles.defName}>{def.name}</Text>
                    {usageCount > 0 && (
                      <View style={styles.usageBadge}>
                        <Text style={styles.usageBadgeText}>×{usageCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCloseModal}
              accessibilityLabel={t('shiftBuilder.cancel')}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>{t('shiftBuilder.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  headerHelper: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.sm,
    lineHeight: 19,
    marginTop: 3,
  },
  statsBadge: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  statsBadgeText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  emptySubtitle: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    lineHeight: 20,
  },
  addRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(8, 22, 31, 0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#20f4dc',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.opacity.black60,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'rgba(8, 22, 31, 0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    marginBottom: theme.spacing.md,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(214, 231, 242, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.1)',
    padding: theme.spacing.sm,
  },
  repeatLabel: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
  },
  repeatInput: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    backgroundColor: '#02070b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    minWidth: 44,
    textAlign: 'center',
  },
  defList: {
    flexGrow: 0,
  },
  defPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 16,
    backgroundColor: 'rgba(214, 231, 242, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.08)',
    marginBottom: 4,
  },
  defColorChip: {
    width: 10,
    height: 28,
    borderRadius: 3,
    marginRight: theme.spacing.sm,
  },
  defIcon: {
    marginRight: theme.spacing.sm,
  },
  defName: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    flex: 1,
  },
  usageBadge: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  usageBadgeText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
  },
  cancelButtonText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.md,
  },
});
