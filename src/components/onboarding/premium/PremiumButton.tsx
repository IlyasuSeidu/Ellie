/**
 * PremiumButton Component
 *
 * Premium button with haptic feedback and animations using stone and gold theme
 * Features: shimmer effect, pulse glow, bouncy interactions, and smooth press animations
 */

import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/utils/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';
export type IconPosition = 'left' | 'right';

export interface PremiumButtonProps {
  /** Button text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon component */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: IconPosition;
  /** Custom style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shimmerTranslate = useSharedValue(-1);
  const bounceY = useSharedValue(0);

  // Shimmer animation - continuous shine effect
  useEffect(() => {
    if (!disabled && !loading && variant === 'primary') {
      shimmerTranslate.value = withRepeat(
        withSequence(
          withTiming(-1, { duration: 0 }),
          withTiming(2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 1500 }) // Pause before repeat
        ),
        -1,
        false
      );
    }
  }, [disabled, loading, variant, shimmerTranslate]);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      // Bouncy press down with spring physics
      scale.value = withSpring(0.92, { damping: 12, stiffness: 400 });
      opacity.value = withTiming(0.85, { duration: 100 });
      bounceY.value = withSpring(2, { damping: 10, stiffness: 300 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      // Bouncy release with overshoot
      scale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 350 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      );
      opacity.value = withTiming(1, { duration: 150 });
      bounceY.value = withSpring(0, { damping: 10, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      // More pronounced haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Celebratory bounce after press
      scale.value = withSequence(
        withSpring(1.08, { damping: 10, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      );

      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: bounceY.value }],
    opacity: opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerTranslate.value, [-1, 2], [-200, 600], Extrapolate.CLAMP);

    const shimmerOpacity = interpolate(
      shimmerTranslate.value,
      [-1, 0, 1, 2],
      [0, 0.6, 0.6, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX }],
      opacity: shimmerOpacity,
    };
  });

  const sizeStyles = getSizeStyles(size);
  const isDisabled = disabled || loading;

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'large'}
          color={variant === 'outline' ? theme.colors.sacredGold : theme.colors.paper}
          testID={`${testID}-loader`}
        />
      );
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Animated.View style={styles.iconContainer}>{icon}</Animated.View>
        )}
        <Animated.Text
          style={[
            styles.text,
            sizeStyles.text,
            getTextColor(variant),
            textStyle,
            isDisabled && styles.disabledText,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {title}
        </Animated.Text>
        {icon && iconPosition === 'right' && (
          <Animated.View style={styles.iconContainer}>{icon}</Animated.View>
        )}
      </>
    );
  };

  const renderShimmer = () => {
    if (disabled || loading || variant !== 'primary') return null;

    return (
      <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmer}
        />
      </Animated.View>
    );
  };

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[animatedStyle, sizeStyles.container, style]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled }}
        testID={testID}
      >
        <LinearGradient
          colors={[theme.colors.sacredGold, theme.colors.brightGold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyles.container, isDisabled && styles.disabledContainer]}
        >
          {renderShimmer()}
          {renderContent()}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (variant === 'secondary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          animatedStyle,
          styles.secondaryButton,
          sizeStyles.container,
          isDisabled && styles.disabledContainer,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled }}
        testID={testID}
      >
        {renderContent()}
      </AnimatedTouchable>
    );
  }

  // Outline variant
  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      style={[
        animatedStyle,
        styles.outlineButton,
        sizeStyles.container,
        isDisabled && styles.disabledContainer,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
    >
      {renderContent()}
    </AnimatedTouchable>
  );
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'small':
      return {
        container: styles.smallContainer,
        text: styles.smallText,
      };
    case 'large':
      return {
        container: styles.largeContainer,
        text: styles.largeText,
      };
    case 'medium':
    default:
      return {
        container: styles.mediumContainer,
        text: styles.mediumText,
      };
  }
};

const getTextColor = (variant: ButtonVariant): TextStyle => {
  switch (variant) {
    case 'outline':
      return { color: theme.colors.sacredGold };
    case 'primary':
    case 'secondary':
    default:
      return { color: theme.colors.paper };
  }
};

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden', // Ensure shimmer is clipped
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: -100,
    right: -100,
    bottom: 0,
    zIndex: 1,
  },
  shimmer: {
    flex: 1,
    width: 100,
  },
  secondaryButton: {
    backgroundColor: theme.colors.brightGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.brightGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  outlineButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    overflow: 'hidden',
  },
  smallContainer: {
    height: 44,
    paddingHorizontal: 20,
    minWidth: 100,
  },
  mediumContainer: {
    height: 56,
    paddingHorizontal: 28,
    minWidth: 140,
  },
  largeContainer: {
    height: 68,
    paddingHorizontal: 36,
    minWidth: 180,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    flexShrink: 1, // Allow text to shrink if needed
    zIndex: 2, // Ensure text is above shimmer
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  smallText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediumText: {
    fontSize: 16,
    lineHeight: 24,
  },
  largeText: {
    fontSize: 18,
    lineHeight: 28,
  },
  iconContainer: {
    marginHorizontal: 8,
    zIndex: 2,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.shadow,
  },
});
