/**
 * PremiumTextInput Component
 *
 * Floating label text input with animations using stone and gold theme
 */

import React, { useState, useCallback } from 'react';
import {
  TextInput,
  View,
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';

export interface PremiumTextInputProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label: string;
  /** Input value */
  value: string;
  /** Change handler */
  onChangeText: (text: string) => void;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
  /** Show clear button */
  showClearButton?: boolean;
  /** Show character counter */
  showCharacterCounter?: boolean;
  /** Maximum length */
  maxLength?: number;
  /** Multiline */
  multiline?: boolean;
  /** Number of lines (multiline) */
  numberOfLines?: number;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Input style */
  inputStyle?: TextStyle;
  /** Test ID */
  testID?: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const PremiumTextInput: React.FC<PremiumTextInputProps> = ({
  label,
  value,
  onChangeText,
  error,
  success = false,
  leftIcon,
  rightIcon,
  showClearButton = true,
  showCharacterCounter = false,
  maxLength,
  multiline = false,
  numberOfLines = 1,
  containerStyle,
  inputStyle,
  testID,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const labelPosition = useSharedValue(value ? 1 : 0);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    labelPosition.value = withTiming(1, { duration: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [labelPosition]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value) {
      labelPosition.value = withTiming(0, { duration: 200 });
    }
  }, [value, labelPosition]);

  const handleClear = useCallback(() => {
    onChangeText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onChangeText]);

  const labelStyle = useAnimatedStyle(() => {
    const translateY = interpolate(labelPosition.value, [0, 1], [0, -28], Extrapolate.CLAMP);

    const scale = interpolate(labelPosition.value, [0, 1], [1, 0.85], Extrapolate.CLAMP);

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const labelColorStyle = useAnimatedStyle(() => {
    return {
      color: isFocused ? theme.colors.sacredGold : theme.colors.dust,
    };
  });

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (success) return theme.colors.success;
    if (isFocused) return theme.colors.sacredGold;
    return theme.colors.softStone;
  };

  const getBackgroundColor = () => {
    if (error) return theme.colors.errorBg;
    if (success) return theme.colors.successBg;
    return theme.colors.darkStone;
  };

  const showClear = showClearButton && value.length > 0 && !rightIcon;
  const characterCount = maxLength ? `${value.length}/${maxLength}` : null;

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
          },
          multiline && styles.multilineContainer,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <View style={styles.inputWrapper}>
          <Animated.Text
            style={[
              styles.label,
              labelStyle,
              labelColorStyle,
              leftIcon ? styles.labelWithLeftIcon : undefined,
            ]}
          >
            {label}
          </Animated.Text>

          <AnimatedTextInput
            {...textInputProps}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              {
                color: theme.colors.paper,
                minHeight: multiline ? numberOfLines * 24 : undefined,
              },
              inputStyle,
            ]}
            placeholderTextColor={theme.colors.dust}
            maxLength={maxLength}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            textAlignVertical={multiline ? 'top' : 'center'}
            testID={`${testID}-input`}
          />
        </View>

        {showClear && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`${testID}-clear`}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>

      {(error || (showCharacterCounter && characterCount)) && (
        <View style={styles.footer}>
          {error && (
            <Text style={styles.errorText} testID={`${testID}-error`}>
              {error}
            </Text>
          )}
          {showCharacterCounter && characterCount && !error && (
            <Text style={styles.characterCounter} testID={`${testID}-counter`}>
              {characterCount}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 60,
  },
  multilineContainer: {
    minHeight: 100,
    paddingTop: 24,
    paddingBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 0,
    fontSize: 16,
    fontWeight: '400',
    transformOrigin: 'left',
    ...Platform.select({
      ios: {
        top: 0,
      },
      android: {
        top: -2,
      },
    }),
  },
  labelWithLeftIcon: {
    left: 40,
  },
  input: {
    fontSize: 16,
    fontWeight: '400',
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 0,
    ...Platform.select({
      ios: {
        paddingVertical: 8,
      },
      android: {
        paddingVertical: 0,
      },
    }),
  },
  leftIconContainer: {
    marginRight: 12,
  },
  rightIconContainer: {
    marginLeft: 12,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.softStone,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: theme.colors.dust,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '400',
  },
  characterCounter: {
    color: theme.colors.shadow,
    fontSize: 12,
    fontWeight: '400',
  },
});
