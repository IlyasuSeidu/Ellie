/**
 * PremiumButton Component
 *
 * Premium button with haptic feedback and animations using stone and gold theme
 */

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import LinearGradient from 'react-native-linear-gradient';
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

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.8, { duration: 100 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

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
        >
          {title}
        </Animated.Text>
        {icon && iconPosition === 'right' && (
          <Animated.View style={styles.iconContainer}>{icon}</Animated.View>
        )}
      </>
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
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: theme.colors.brightGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: theme.colors.brightGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
  },
  smallContainer: {
    height: 40,
    paddingHorizontal: 16,
  },
  mediumContainer: {
    height: 52,
    paddingHorizontal: 24,
  },
  largeContainer: {
    height: 60,
    paddingHorizontal: 32,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
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
  },
  disabledContainer: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.shadow,
  },
});
