/**
 * ShiftBlockCard
 *
 * A single shift block in the sequence canvas. Shows the shift definition's
 * color, icon, name, and optional time display. Provides drag handle UI,
 * up/down move buttons, and long-press contextual actions.
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { UniversalShiftSequenceItem, UniversalShiftDefinition } from '@/types';
import { getUniversalShiftDisplayModel } from '@/utils/universalShiftUtils';

export interface ShiftBlockCardProps {
  item: UniversalShiftSequenceItem;
  definition: UniversalShiftDefinition;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
  onInsertBefore: (index: number) => void;
  onInsertAfter: (index: number) => void;
  onDelete: (index: number) => void;
  onPress: (index: number) => void;
  onDragStart: (index: number) => void;
}

export const ShiftBlockCard: React.FC<ShiftBlockCardProps> = ({
  item,
  definition,
  index,
  total,
  isFirst,
  isLast,
  isDragging,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onInsertBefore,
  onInsertAfter,
  onDelete,
  onPress,
  onDragStart,
}) => {
  const display = getUniversalShiftDisplayModel(definition);
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: elevation.value,
  }));

  const handlePress = useCallback(() => {
    onPress(index);
  }, [index, onPress]);

  const handleLongPress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(withSpring(1.02), withSpring(1.0));

    const options: {
      text: string;
      onPress: () => void;
      style?: 'destructive' | 'cancel' | 'default';
    }[] = [
      {
        text: 'Duplicate',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDuplicate(index);
        },
      },
      {
        text: 'Insert Before',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onInsertBefore(index);
        },
      },
      {
        text: 'Insert After',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onInsertAfter(index);
        },
      },
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete(index);
        },
      },
      { text: 'Cancel', style: 'cancel' as const, onPress: () => {} },
    ];

    Alert.alert(`Day ${index + 1}: ${definition.name}`, undefined, options, { cancelable: true });
  }, [index, definition.name, onDuplicate, onInsertBefore, onInsertAfter, onDelete, scale]);

  const handleDragStart = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDragStart(index);
    scale.value = withSpring(1.04);
    elevation.value = withTiming(0.4);
  }, [index, onDragStart, scale, elevation]);

  const handleMoveUp = useCallback(() => {
    if (isFirst) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(withTiming(0.97, { duration: 80 }), withSpring(1.0));
    onMoveUp(index);
  }, [index, isFirst, onMoveUp, scale]);

  const handleMoveDown = useCallback(() => {
    if (isLast) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(withTiming(0.97, { duration: 80 }), withSpring(1.0));
    onMoveDown(index);
  }, [index, isLast, onMoveDown, scale]);

  const dayLabel = item.labelOverride ?? definition.name;
  const positionLabel = `Day ${index + 1} of ${total}`;

  return (
    <Animated.View style={[styles.container, isDragging && styles.dragging, animatedStyle]}>
      {/* Colored left accent border */}
      <View style={[styles.colorBar, { backgroundColor: display.color }]} />

      {/* Drag handle */}
      <TouchableOpacity
        style={styles.dragHandle}
        onLongPress={handleDragStart}
        delayLongPress={150}
        accessibilityLabel={`Drag handle for ${dayLabel}`}
        accessibilityHint="Long press and hold to drag this shift to a new position"
        accessibilityRole="button"
      >
        <Ionicons name="reorder-three" size={20} color="#6f8798" />
      </TouchableOpacity>

      {/* Main content — tap to open edit */}
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
        accessibilityLabel={`${dayLabel}${display.timeDisplay ? ', ' + display.timeDisplay : ''}, ${positionLabel}`}
        accessibilityHint="Tap to edit. Long press for more options."
        accessibilityRole="button"
      >
        {/* Icon + name row */}
        <View style={styles.nameRow}>
          <View style={[styles.iconBadge, { backgroundColor: display.color + '33' }]}>
            <Ionicons
              name={display.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={display.color}
            />
          </View>
          <Text style={styles.nameText} numberOfLines={1}>
            {dayLabel}
          </Text>
          {item.labelOverride ? <Text style={styles.overrideTag}> (custom)</Text> : null}
        </View>

        {/* Time display */}
        {display.timeDisplay ? <Text style={styles.timeText}>{display.timeDisplay}</Text> : null}
      </TouchableOpacity>

      {/* Day index badge */}
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>

      {/* Move controls */}
      <View style={styles.moveControls}>
        <TouchableOpacity
          style={[styles.moveButton, isFirst && styles.moveButtonDisabled]}
          onPress={handleMoveUp}
          disabled={isFirst}
          accessibilityLabel={`Move ${dayLabel} up`}
          accessibilityHint={
            isFirst ? 'Already at the top of the sequence' : `Move to position ${index}`
          }
          accessibilityRole="button"
        >
          <Ionicons name="chevron-up" size={16} color={isFirst ? '#6f8798' : '#9db2c2'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.moveButton, isLast && styles.moveButtonDisabled]}
          onPress={handleMoveDown}
          disabled={isLast}
          accessibilityLabel={`Move ${dayLabel} down`}
          accessibilityHint={
            isLast ? 'Already at the bottom of the sequence' : `Move to position ${index + 2}`
          }
          accessibilityRole="button"
        >
          <Ionicons name="chevron-down" size={16} color={isLast ? '#6f8798' : '#9db2c2'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 22, 31, 0.9)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
    minHeight: 56,
    ...Platform.select({
      ios: theme.shadows.ios.small,
      android: theme.shadows.android.small,
    }),
  },
  dragging: {
    backgroundColor: 'rgba(13, 34, 48, 0.98)',
    borderColor: 'rgba(32, 244, 220, 0.42)',
    ...Platform.select({
      ios: theme.shadows.ios.large,
      android: theme.shadows.android.large,
    }),
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  dragHandle: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    flex: 1,
  },
  overrideTag: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  timeText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    marginTop: 2,
    marginLeft: 28,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
  },
  indexText: {
    color: '#20f4dc',
    fontSize: 10,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  moveControls: {
    flexDirection: 'column',
    marginRight: theme.spacing.sm,
  },
  moveButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
});
