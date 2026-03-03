/**
 * PremiumToggle Component
 *
 * Premium toggle switch using stone and gold theme
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export interface PremiumToggleProps {
  /** Toggle state */
  value: boolean;
  /** Change handler */
  onChange?: (value: boolean) => void;
  /** Optional label */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID */
  testID?: string;
}

const TOGGLE_WIDTH = 60;
const TOGGLE_HEIGHT = 32;
const THUMB_SIZE = 28;
const THUMB_OFFSET = 2;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PremiumToggle: React.FC<PremiumToggleProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const thumbPosition = useSharedValue(value ? 1 : 0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    thumbPosition.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [value, thumbPosition]);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `PremiumToggle.pressIn:${testID ?? 'unknown'}`,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled && onChange) {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: `PremiumToggle.press:${testID ?? 'unknown'}`,
      });
      onChange(!value);
    }
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: thumbPosition.value * (TOGGLE_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2),
      },
    ],
  }));

  const thumbColorStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(value ? theme.colors.paper : theme.colors.shadow, {
      duration: 200,
    }),
  }));

  return (
    <View style={styles.wrapper}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        style={[animatedContainerStyle, disabled && styles.disabledContainer]}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel || label || 'Toggle'}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ checked: value, disabled }}
        testID={testID}
      >
        {value ? (
          <LinearGradient
            colors={[theme.colors.sacredGold, theme.colors.brightGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.track}
          >
            <View style={styles.goldGlow} />
            <Animated.View style={[styles.thumb, thumbAnimatedStyle, thumbColorStyle]} />
          </LinearGradient>
        ) : (
          <View style={[styles.track, styles.offTrack]}>
            <Animated.View style={[styles.thumb, thumbAnimatedStyle, thumbColorStyle]} />
          </View>
        )}
      </AnimatedTouchable>

      {label && <Animated.Text style={styles.label}>{label}</Animated.Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  track: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: TOGGLE_HEIGHT / 2,
    padding: THUMB_OFFSET,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  offTrack: {
    backgroundColor: theme.colors.softStone,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.brightGold,
    opacity: 0.3,
    borderRadius: TOGGLE_HEIGHT / 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  disabledContainer: {
    opacity: 0.5,
  },
  label: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.dust,
  },
});
