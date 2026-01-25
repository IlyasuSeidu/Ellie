/**
 * PatternCard Component
 *
 * Interactive shift pattern selection card using stone and gold theme
 */

import React from 'react';
import { View, TouchableOpacity, Text, ViewStyle, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { ShiftPattern } from '@/types';

export interface PatternMetadata {
  /** Pattern emoji icon */
  emoji: string;
  /** Pattern display name */
  name: string;
  /** Pattern description (e.g., "4 Days, 4 Nights, 4 Off") */
  description: string;
  /** Visual pattern preview */
  preview: ('day' | 'night' | 'off')[];
}

export interface PatternCardProps {
  /** Shift pattern type */
  pattern: ShiftPattern;
  /** Pattern metadata */
  metadata: PatternMetadata;
  /** Whether this pattern is selected */
  selected?: boolean;
  /** Selection handler */
  onSelect: (pattern: ShiftPattern) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  metadata,
  selected = false,
  onSelect,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(pattern);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getShiftColor = (type: 'day' | 'night' | 'off'): string => {
    switch (type) {
      case 'day':
        return theme.colors.workDay;
      case 'night':
        return theme.colors.nightShift;
      case 'off':
      default:
        return theme.colors.offDay;
    }
  };

  const getShiftLabel = (type: 'day' | 'night' | 'off'): string => {
    switch (type) {
      case 'day':
        return 'D';
      case 'night':
        return 'N';
      case 'off':
      default:
        return 'O';
    }
  };

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${metadata.name} pattern`}
      accessibilityHint={`Selects ${metadata.description} shift pattern`}
      accessibilityState={{ selected }}
      style={[animatedStyle, styles.container, selected && styles.selectedContainer, style]}
      testID={testID}
    >
      {/* Gold glow overlay when selected */}
      {selected && <View style={styles.goldGlow} />}

      {/* Pattern emoji */}
      <Text style={styles.emoji}>{metadata.emoji}</Text>

      {/* Pattern name */}
      <Text style={styles.name}>{metadata.name}</Text>

      {/* Pattern description */}
      <Text style={styles.description}>{metadata.description}</Text>

      {/* Visual pattern preview */}
      <View style={styles.previewContainer}>
        {metadata.preview.slice(0, 12).map((type, index) => (
          <View
            key={index}
            style={[
              styles.previewBox,
              { backgroundColor: getShiftColor(type) },
              selected && type === 'day' && styles.dayBoxGlow,
            ]}
          >
            <Text style={styles.previewLabel}>{getShiftLabel(type)}</Text>
          </View>
        ))}
        {metadata.preview.length > 12 && <Text style={styles.previewEllipsis}>...</Text>}
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 140,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.2,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.paper,
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.dust,
    marginBottom: 16,
    textAlign: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  previewBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxGlow: {
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  previewEllipsis: {
    fontSize: 16,
    color: theme.colors.dust,
    marginLeft: 4,
  },
});

/**
 * Get preset pattern metadata
 */
export function getPatternMetadata(pattern: ShiftPattern): PatternMetadata {
  const metadata: Record<ShiftPattern, PatternMetadata> = {
    [ShiftPattern.STANDARD_3_3_3]: {
      emoji: '⛏️',
      name: '3-3-3 Standard',
      description: '3 Days, 3 Nights, 3 Off',
      preview: ['day', 'day', 'day', 'night', 'night', 'night', 'off', 'off', 'off'],
    },
    [ShiftPattern.STANDARD_4_4_4]: {
      emoji: '⛏️',
      name: '4-4-4 FIFO',
      description: '4 Days, 4 Nights, 4 Off',
      preview: [
        'day',
        'day',
        'day',
        'day',
        'night',
        'night',
        'night',
        'night',
        'off',
        'off',
        'off',
        'off',
      ],
    },
    [ShiftPattern.STANDARD_5_5_5]: {
      emoji: '⛏️',
      name: '5-5-5 Standard',
      description: '5 Days, 5 Nights, 5 Off',
      preview: [
        'day',
        'day',
        'day',
        'day',
        'day',
        'night',
        'night',
        'night',
        'night',
        'night',
        'off',
        'off',
        'off',
        'off',
        'off',
      ],
    },
    [ShiftPattern.STANDARD_7_7_7]: {
      emoji: '🌙',
      name: '7-7-7 Extended',
      description: '7 Days, 7 Nights, 7 Off',
      preview: [
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
      ],
    },
    [ShiftPattern.STANDARD_10_10_10]: {
      emoji: '🌙',
      name: '10-10-10 Long',
      description: '10 Days, 10 Nights, 10 Off',
      preview: [
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'day',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'night',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
        'off',
      ],
    },
    [ShiftPattern.STANDARD_2_2_3]: {
      emoji: '⚡',
      name: '2-2-3 Rapid',
      description: '2 Days, 2 Nights, 3 Off',
      preview: ['day', 'day', 'night', 'night', 'off', 'off', 'off'],
    },
    [ShiftPattern.CONTINENTAL]: {
      emoji: '🌐',
      name: 'Continental',
      description: '8-hour shifts, 3 teams',
      preview: ['day', 'day', 'night', 'night', 'off', 'off', 'off', 'off'],
    },
    [ShiftPattern.PITMAN]: {
      emoji: '🔄',
      name: 'Pitman Schedule',
      description: '12-hour shifts, 4 teams',
      preview: [
        'day',
        'day',
        'off',
        'off',
        'day',
        'day',
        'day',
        'off',
        'off',
        'night',
        'night',
        'off',
        'off',
        'night',
        'night',
        'night',
      ],
    },
    [ShiftPattern.CUSTOM]: {
      emoji: '✏️',
      name: 'Custom Pattern',
      description: 'Create your own schedule',
      preview: ['day', 'night', 'off'],
    },
  };

  return metadata[pattern];
}
