/**
 * EllieButton
 *
 * Floating action button that opens the Ellie voice assistant.
 * Shows a pulsing gold glow when the assistant is active.
 * Positioned at the bottom-right of the dashboard.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';

const BUTTON_SIZE = 60;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const EllieButton: React.FC = () => {
  const { state, openModal } = useVoiceAssistant();
  const isActive = state !== 'idle';

  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isActive, pulseScale]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: isActive ? 0.6 : 0,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openModal();
  };

  return (
    <View style={styles.container}>
      {/* Glow ring behind button */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <AnimatedTouchable
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel="Open Ellie voice assistant"
        accessibilityRole="button"
      >
        <Ionicons name="mic" size={26} color={theme.colors.sacredGold} />
      </AnimatedTouchable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: BUTTON_SIZE + 16,
    height: BUTTON_SIZE + 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  glow: {
    position: 'absolute',
    width: BUTTON_SIZE + 16,
    height: BUTTON_SIZE + 16,
    borderRadius: (BUTTON_SIZE + 16) / 2,
    backgroundColor: theme.colors.sacredGold,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.ios.goldGlow,
    elevation: 8,
  },
});
