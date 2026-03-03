/**
 * PremiumCard Component
 *
 * Base card component with shadow and animations using stone and gold theme
 */

import React from 'react';
import { View, TouchableOpacity, ViewStyle, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface PremiumCardProps {
  /** Card children */
  children: React.ReactNode;
  /** Pressable card */
  pressable?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Active state (shows gold glow) */
  active?: boolean;
  /** Custom padding */
  padding?: number;
  /** Custom style */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  pressable = false,
  onPress,
  active = false,
  padding = 20,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (pressable && onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `PremiumCard.pressIn:${testID ?? 'unknown'}`,
      });
    }
  };

  const handlePressOut = () => {
    if (pressable && onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (pressable && onPress) {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: `PremiumCard.press:${testID ?? 'unknown'}`,
      });
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = [styles.card, { padding }, active && styles.activeCard, style];

  if (pressable && onPress) {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[animatedStyle, cardStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        {active && <View style={styles.goldGlow} />}
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedView style={[animatedStyle, cardStyle]} accessibilityRole="none" testID={testID}>
      {active && <View style={styles.goldGlow} />}
      {children}
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  activeCard: {
    borderColor: theme.colors.sacredGold,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.1,
    borderRadius: 16,
  },
});
