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
import { theme } from '@/utils/theme';

const RING_COUNT = 3;
const CENTER_SIZE = 80;
const RING_GAP = 24;

interface ListeningIndicatorProps {
  isListening: boolean;
}

const Ring: React.FC<{ index: number; isListening: boolean }> = ({ index, isListening }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      const delay = index * 300;
      scale.value = withDelay(
        delay,
        withRepeat(
          withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, index, scale, opacity]);

  // Set initial opacity when listening starts
  useEffect(() => {
    if (isListening) {
      const delay = index * 300;
      const timeout = setTimeout(() => {
        opacity.value = 0.5;
      }, delay);

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
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={36}
          color={theme.colors.sacredGold}
        />
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
    borderColor: theme.colors.sacredGold,
  },
  center: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.ios.goldGlow,
  },
});
