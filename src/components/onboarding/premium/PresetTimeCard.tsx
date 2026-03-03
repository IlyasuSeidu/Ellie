/**
 * PresetTimeCard Component
 *
 * Quick time preset selector using stone and gold theme
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface TimePreset {
  /** Time in 24h format (HH:mm) */
  time: string;
  /** Display label for the time */
  label: string;
  /** Description of the preset */
  description: string;
}

export interface PresetTimeCardProps {
  /** Time preset */
  preset: TimePreset;
  /** Selected state */
  selected?: boolean;
  /** Selection handler */
  onSelect?: (preset: TimePreset) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PresetTimeCard: React.FC<PresetTimeCardProps> = ({
  preset,
  selected = false,
  onSelect,
  disabled = false,
  accessibilityLabel,
  testID,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `PresetTimeCard.pressIn:${preset.time}`,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled && onSelect) {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: `PresetTimeCard.press:${preset.time}`,
      });
      onSelect(preset);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (selected) {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[animatedStyle, styles.container, disabled && styles.disabledContainer]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${preset.label}, ${preset.description}`}
        accessibilityState={{ selected, disabled }}
        testID={testID}
      >
        <LinearGradient
          colors={[theme.colors.sacredGold, theme.colors.brightGold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectedGradient}
        >
          <View style={styles.goldGlow} />
          <Animated.Text style={styles.selectedTimeLabel}>{preset.label}</Animated.Text>
          <Animated.Text style={styles.selectedDescription}>{preset.description}</Animated.Text>
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[
        animatedStyle,
        styles.container,
        styles.unselectedContainer,
        disabled && styles.disabledContainer,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || `${preset.label}, ${preset.description}`}
      accessibilityState={{ selected, disabled }}
      testID={testID}
    >
      <Animated.Text style={styles.timeLabel}>{preset.label}</Animated.Text>
      <Animated.Text style={styles.description}>{preset.description}</Animated.Text>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 150,
    minHeight: 100,
    borderRadius: theme.borderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  unselectedContainer: {
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedGradient: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledContainer: {
    opacity: 0.5,
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.brightGold,
    opacity: 0.2,
    borderRadius: theme.borderRadius.md,
  },
  timeLabel: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginBottom: 4,
  },
  selectedTimeLabel: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginBottom: 4,
  },
  description: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    textAlign: 'center',
  },
  selectedDescription: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium,
  },
});

/**
 * Predefined time presets
 */
export const TIME_PRESETS: TimePreset[] = [
  {
    time: '06:00',
    label: '6:00 AM',
    description: 'Early Start',
  },
  {
    time: '07:00',
    label: '7:00 AM',
    description: 'Day Shift',
  },
  {
    time: '14:00',
    label: '2:00 PM',
    description: 'Afternoon',
  },
  {
    time: '18:00',
    label: '6:00 PM',
    description: 'Evening',
  },
  {
    time: '22:00',
    label: '10:00 PM',
    description: 'Night Shift',
  },
];

/**
 * Custom preset for opening time picker
 */
export const CUSTOM_PRESET: TimePreset = {
  time: 'custom',
  label: 'Custom',
  description: 'Tap to set',
};
