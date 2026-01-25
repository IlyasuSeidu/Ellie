/**
 * PhaseSelector Component
 *
 * Phase offset selector for start date using stone and gold theme
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';

export type PhaseType = 'day' | 'night' | 'off';

export interface PhaseSelectorProps {
  /** Currently selected phase */
  selectedPhase: PhaseType;
  /** Phase selection handler */
  onPhaseSelect: (phase: PhaseType) => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

interface PhaseOption {
  type: PhaseType;
  label: string;
  icon: string;
}

const PHASE_OPTIONS: PhaseOption[] = [
  { type: 'day', label: 'Day Shift', icon: '☀️' },
  { type: 'night', label: 'Night Shift', icon: '🌙' },
  { type: 'off', label: 'Off Days', icon: '🏖️' },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PhaseSelector: React.FC<PhaseSelectorProps> = ({
  selectedPhase,
  onPhaseSelect,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {PHASE_OPTIONS.map((option) => (
        <PhaseCard
          key={option.type}
          option={option}
          selected={selectedPhase === option.type}
          onSelect={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPhaseSelect(option.type);
          }}
        />
      ))}
    </View>
  );
};

interface PhaseCardProps {
  option: PhaseOption;
  selected: boolean;
  onSelect: () => void;
}

const PhaseCard: React.FC<PhaseCardProps> = ({ option, selected, onSelect }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (selected) {
    return (
      <AnimatedTouchable
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="radio"
        accessibilityLabel={option.label}
        accessibilityState={{ selected: true }}
        style={[animatedStyle, styles.card]}
        testID={`phase-${option.type}`}
      >
        <LinearGradient
          colors={[theme.colors.sacredGold, theme.colors.brightGold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.selectedCard}
        >
          <View style={styles.goldGlow} />
          <Text style={styles.selectedIcon}>{option.icon}</Text>
          <Text style={styles.selectedLabel}>{option.label}</Text>
          <View style={styles.radioIndicator}>
            <View style={styles.radioInner} />
          </View>
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ selected: false }}
      style={[animatedStyle, styles.card, styles.unselectedCard]}
      testID={`phase-${option.type}`}
    >
      <Text style={styles.unselectedIcon}>{option.icon}</Text>
      <Text style={styles.unselectedLabel}>{option.label}</Text>
      <View style={styles.radioIndicatorUnselected}>
        <View style={styles.radioOutline} />
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  card: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  unselectedCard: {
    backgroundColor: theme.colors.darkStone,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.3,
  },
  selectedIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  unselectedIcon: {
    fontSize: 32,
    marginRight: 16,
    opacity: 0.7,
  },
  selectedLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  unselectedLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.dust,
  },
  radioIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.sacredGold,
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.softStone,
  },
});
