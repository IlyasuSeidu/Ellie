/**
 * ChatInput Component
 *
 * Text input with submit button, quick replies, and error display
 * Used for collecting user responses in conversational onboarding
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
  Platform,
  KeyboardTypeOptions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

export interface QuickReply {
  id: string;
  label: string;
  value: string;
}

export interface ChatInputProps {
  /** Current input value */
  value: string;
  /** Input change handler */
  onChangeText: (text: string) => void;
  /** Submit handler */
  onSubmit: () => void;
  /** Placeholder text */
  placeholder: string;
  /** Disable input and submit */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Show quick reply buttons */
  showQuickReplies?: boolean;
  /** Quick reply options */
  quickReplies?: QuickReply[];
  /** Quick reply tap handler */
  onQuickReply?: (reply: QuickReply) => void;
  /** Keyboard type */
  keyboardType?: KeyboardTypeOptions;
  /** Auto-focus input */
  autoFocus?: boolean;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  placeholder,
  disabled = false,
  error,
  showQuickReplies = false,
  quickReplies = [],
  onQuickReply,
  keyboardType = 'default',
  autoFocus = true,
  testID,
}) => {
  const { t } = useTranslation('onboarding');
  const submitScale = useSharedValue(1);
  const errorOpacity = useSharedValue(0);

  const [isFocused, setIsFocused] = useState(false);

  // Animate error message
  useEffect(() => {
    if (error) {
      errorOpacity.value = withTiming(1, { duration: 300 });
    } else {
      errorOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [error, errorOpacity]);

  const canSubmit = !disabled && value.trim().length > 0;

  const handleSubmitPress = () => {
    if (canSubmit) {
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: 'ChatInput.submit',
      });
      onSubmit();
    } else {
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'ChatInput.submitError',
      });
    }
  };

  const handlePressIn = () => {
    if (canSubmit) {
      submitScale.value = withTiming(0.95, {
        duration: 100,
        easing: Easing.out(Easing.ease),
      });
    }
  };

  const handlePressOut = () => {
    submitScale.value = withSpring(1, {
      damping: 12,
      stiffness: 400,
    });
  };

  const handleQuickReplyPress = (reply: QuickReply) => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `ChatInput.quickReply:${reply.id}`,
    });
    onQuickReply?.(reply);
  };

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
    opacity: canSubmit ? 1 : 0.4,
  }));

  const errorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  return (
    <View style={styles.container} testID={testID}>
      {/* Error message */}
      {error && (
        <Animated.View style={[styles.errorContainer, errorAnimatedStyle]}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      {/* Quick replies */}
      {showQuickReplies && quickReplies.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRepliesContainer}
          contentContainerStyle={styles.quickRepliesContent}
        >
          {quickReplies.map((reply) => (
            <TouchableOpacity
              key={reply.id}
              style={styles.quickReplyChip}
              onPress={() => handleQuickReplyPress(reply)}
              activeOpacity={0.7}
              testID={`${testID}-quick-reply-${reply.id}`}
              accessibilityRole="button"
              accessibilityLabel={reply.label}
            >
              <Text style={styles.quickReplyText}>{reply.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input container */}
      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            disabled && styles.inputWrapperDisabled,
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.dust}
            style={styles.input}
            keyboardType={keyboardType}
            autoFocus={autoFocus}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="send"
            onSubmitEditing={handleSubmitPress}
            editable={!disabled}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            testID={`${testID}-input`}
            accessibilityLabel={placeholder}
          />
          <AnimatedTouchable
            onPress={handleSubmitPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.submitButton, submitAnimatedStyle]}
            activeOpacity={1}
            disabled={!canSubmit}
            testID={`${testID}-submit`}
            accessibilityRole="button"
            accessibilityLabel={t('chatInput.submitA11y', {
              defaultValue: 'Submit response',
            })}
            accessibilityState={{ disabled: !canSubmit }}
          >
            <Ionicons name="arrow-forward" size={20} color={theme.colors.paper} />
          </AnimatedTouchable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkStone,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for safe area
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  quickRepliesContainer: {
    paddingVertical: 12,
  },
  quickRepliesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyChip: {
    borderWidth: 1,
    borderColor: theme.colors.sacredGold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  quickReplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.sacredGold,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.deepVoid,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    paddingRight: 4,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.sacredGold,
  },
  inputWrapperDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
