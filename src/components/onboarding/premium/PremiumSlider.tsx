/**
 * PremiumSlider Component
 *
 * Custom slider for numeric input using stone and gold theme
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, PanResponder, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface PremiumSliderProps {
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Value change handler */
  onValueChange: (value: number) => void;
  /** Unit label (e.g., "days") */
  unit?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

const SLIDER_WIDTH = Dimensions.get('window').width - 80;
const THUMB_SIZE = 56;

export const PremiumSlider: React.FC<PremiumSliderProps> = ({
  value,
  min,
  max,
  onValueChange,
  unit = 'days',
  style,
  testID,
}) => {
  const position = useSharedValue(((value - min) / (max - min)) * SLIDER_WIDTH);
  const scale = useSharedValue(1);
  const lastHapticValue = useRef(value);

  const handleValueChange = useCallback(
    (newValue: number) => {
      const clampedValue = Math.max(min, Math.min(max, newValue));
      const roundedValue = Math.round(clampedValue);

      if (roundedValue !== lastHapticValue.current) {
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
          source: `PremiumSlider.valueChange:${testID ?? 'unknown'}`,
        });
        lastHapticValue.current = roundedValue;
      }

      onValueChange(roundedValue);
    },
    [min, max, onValueChange, testID]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scale.value = withSpring(1.1, { damping: 15, stiffness: 300 });
        void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
          source: `PremiumSlider.grant:${testID ?? 'unknown'}`,
        });
      },
      onPanResponderMove: (_evt, gestureState) => {
        const newPosition = Math.max(0, Math.min(SLIDER_WIDTH, position.value + gestureState.dx));
        position.value = newPosition;

        const percentage = newPosition / SLIDER_WIDTH;
        const newValue = min + percentage * (max - min);
        handleValueChange(newValue);
      },
      onPanResponderRelease: () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      },
    })
  ).current;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value - THUMB_SIZE / 2 }, { scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: position.value,
  }));

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Track */}
      <View style={styles.track}>
        {/* Fill */}
        <Animated.View style={[styles.fill, fillStyle]} />

        {/* Thumb */}
        <Animated.View {...panResponder.panHandlers} style={[styles.thumbContainer, thumbStyle]}>
          <LinearGradient
            colors={[theme.colors.sacredGold, theme.colors.brightGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumb}
          >
            <View style={styles.thumbGlow} />
            <Text style={styles.thumbValue}>{value}</Text>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Labels */}
      <View style={styles.labelsContainer}>
        <Text style={styles.minLabel}>{min}</Text>
        <Text style={styles.unitLabel}>{unit}</Text>
        <Text style={styles.maxLabel}>{max}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 16,
  },
  track: {
    width: SLIDER_WIDTH,
    height: 8,
    backgroundColor: theme.colors.softStone,
    borderRadius: 4,
    position: 'relative',
    alignSelf: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: 4,
  },
  thumbContainer: {
    position: 'absolute',
    top: -24,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  thumbGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.3,
    borderRadius: THUMB_SIZE / 2,
  },
  thumbValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 8,
  },
  minLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.shadow,
  },
  maxLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.shadow,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.dust,
  },
});
