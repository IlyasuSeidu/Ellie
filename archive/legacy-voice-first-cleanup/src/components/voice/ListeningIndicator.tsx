/**
 * ListeningIndicator
 *
 * Animated concentric rings that pulse when the voice assistant is listening.
 * Shows a microphone icon in the center with expanding gold rings.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const RING_COUNT = 3;
const CENTER_SIZE = 80;
const RING_GAP = 24;

const RYVRO_COLORS = {
  void: '#02070b',
  cyan: '#20f4dc',
  blue: '#147cff',
} as const;

interface ListeningIndicatorProps {
  isListening: boolean;
}

const Ring: React.FC<{ index: number; isListening: boolean }> = ({ index, isListening }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      const stagger = index * 400;
      // Slower cycle (2500ms) reduces GPU rasterization load vs 1500ms
      scale.value = withDelay(
        stagger,
        withRepeat(withTiming(1.5, { duration: 2500, easing: Easing.out(Easing.ease) }), -1, false)
      );
      opacity.value = withDelay(
        stagger,
        withRepeat(withTiming(0, { duration: 2500, easing: Easing.out(Easing.ease) }), -1, false)
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, index, scale, opacity]);

  // Set initial opacity when listening starts
  useEffect(() => {
    if (isListening) {
      const timeout = setTimeout(() => {
        opacity.value = 0.5;
      }, index * 400);

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isListening, index, opacity]);

  const ringSize = CENTER_SIZE + RING_GAP * (index + 1) * 2;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({ isListening }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <Ring key={i} index={i} isListening={isListening} />
      ))}

      <View style={styles.center}>
        <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={36} color={RYVRO_COLORS.void} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CENTER_SIZE + RING_GAP * RING_COUNT * 2 + 40,
    height: CENTER_SIZE + RING_GAP * RING_COUNT * 2 + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: RYVRO_COLORS.cyan,
  },
  center: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: RYVRO_COLORS.cyan,
    borderWidth: 8,
    borderColor: 'rgba(32, 244, 220, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RYVRO_COLORS.blue,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
});
