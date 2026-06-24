/**
 * RyvroVoiceButton
 *
 * Floating action button that opens the Ryvro voice assistant.
 * Shows a pulsing Ryvro glow when the assistant is active.
 * Used by legacy entry points that need a compact voice shortcut.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { useSubscription } from '@/hooks/useSubscription';

const BUTTON_SIZE = 60;
const RYVRO_COLORS = {
  void: '#02070b',
  cyan: '#20f4dc',
  blue: '#147cff',
} as const;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const RyvroVoiceButton: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const { state, openModal } = useVoiceAssistant();
  const { isPro, isLoading, openPaywall } = useSubscription();
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
    if (isLoading) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPro) {
      openModal();
    } else {
      openPaywall();
    }
  };

  return (
    <View style={styles.container}>
      {/* Glow ring behind button */}
      <Animated.View style={[styles.glow, glowStyle]} />

      <AnimatedTouchable
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={isLoading}
        accessibilityLabel={t('tabs.openVoiceAssistantA11y', {
          defaultValue: 'Open Ryvro voice assistant',
        })}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLoading }}
      >
        <Ionicons name="mic" size={26} color={RYVRO_COLORS.void} />
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
    backgroundColor: RYVRO_COLORS.blue,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: RYVRO_COLORS.cyan,
    borderWidth: 6,
    borderColor: 'rgba(32, 244, 220, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOpacity: 0.34,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
