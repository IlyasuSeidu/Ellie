/**
 * LivePatternPreview Component
 *
 * Visual preview of custom shift pattern using stone and gold theme
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { theme } from '@/utils/theme';

export interface LivePatternPreviewProps {
  /** Number of consecutive day shifts */
  daysOn: number;
  /** Number of consecutive night shifts */
  nightsOn: number;
  /** Number of consecutive days off */
  daysOff: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

type DayType = 'day' | 'night' | 'off';

interface CycleDay {
  type: DayType;
  index: number;
}

export const LivePatternPreview: React.FC<LivePatternPreviewProps> = ({
  daysOn,
  nightsOn,
  daysOff,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    // Trigger animation when values change
    scale.value = 0.95;
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [daysOn, nightsOn, daysOff, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Generate the pattern cycle
  const generateCycle = (): CycleDay[] => {
    const cycle: CycleDay[] = [];
    let index = 0;

    // Add day shifts
    for (let i = 0; i < daysOn; i++) {
      cycle.push({ type: 'day', index: index++ });
    }

    // Add night shifts
    for (let i = 0; i < nightsOn; i++) {
      cycle.push({ type: 'night', index: index++ });
    }

    // Add days off
    for (let i = 0; i < daysOff; i++) {
      cycle.push({ type: 'off', index: index++ });
    }

    return cycle;
  };

  const cycle = generateCycle();
  const cycleLength = cycle.length;

  // Generate 28 days by repeating the cycle
  const generatePreview = (): CycleDay[] => {
    const preview: CycleDay[] = [];
    let dayIndex = 0;

    while (preview.length < 28) {
      const cycleIndex = dayIndex % cycleLength;
      preview.push({ ...cycle[cycleIndex], index: dayIndex });
      dayIndex++;
    }

    return preview;
  };

  const previewDays = generatePreview();

  const getDayColor = (type: DayType): string => {
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

  const getDayLabel = (type: DayType): string => {
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
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.container, animatedStyle, style]}
      testID={testID}
    >
      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          Your {cycleLength}-day cycle: {daysOn}D / {nightsOn}N / {daysOff}O
        </Text>
      </View>

      {/* 28-day preview */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.previewGrid}>
          {previewDays.map((day, index) => (
            <View
              key={index}
              style={[
                styles.dayBox,
                { backgroundColor: getDayColor(day.type) },
                day.type === 'day' && styles.dayBoxGlow,
              ]}
            >
              <Text style={styles.dayLabel}>{getDayLabel(day.type)}</Text>
              <Text style={styles.dayNumber}>{index + 1}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.workDay }]} />
          <Text style={styles.legendText}>Day Shift</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.nightShift }]} />
          <Text style={styles.legendText}>Night Shift</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: theme.colors.offDay }]} />
          <Text style={styles.legendText}>Off Days</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: theme.colors.softStone,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.dust,
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 400,
  },
  dayBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBoxGlow: {
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  dayNumber: {
    fontSize: 10,
    color: theme.colors.paper,
    opacity: 0.8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.dust,
    fontWeight: '500',
  },
});
