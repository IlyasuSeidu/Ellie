/**
 * ChatMessage Component
 *
 * Renders bot and user messages with animations in conversational onboarding
 * Bot messages: Left-aligned with avatar, darkStone bubble
 * User messages: Right-aligned, sacredGold bubble with glow
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChatAvatar } from './ChatAvatar';
import { theme } from '@/utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: number;
  metadata?: {
    isSkipped?: boolean;
    countryFlag?: string;
  };
}

export interface ChatMessageProps {
  /** Message data */
  message: Message;
  /** Is this a bot message */
  isBot: boolean;
  /** Animation delay in ms */
  delay?: number;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Long-press handler for editing */
  onLongPress?: () => void;
  /** Test ID */
  testID?: string;
}

export const ChatMessage = React.memo<ChatMessageProps>(
  ({ message, isBot, delay = 0, reducedMotion, onLongPress, testID }) => {
    // Animation values
    const slideUp = useSharedValue(isBot ? 30 : 0);
    const slideFromRight = useSharedValue(isBot ? 0 : 50);
    const opacity = useSharedValue(0);

    useEffect(() => {
      if (reducedMotion) {
        // Skip animations if reduced motion is enabled
        slideUp.value = 0;
        slideFromRight.value = 0;
        opacity.value = 1;
      } else {
        if (isBot) {
          // Bot message: Slide up with spring
          slideUp.value = withDelay(
            delay,
            withSpring(0, {
              damping: 20,
              stiffness: 300,
              mass: 0.8,
            })
          );
        } else {
          // User message: Slide from right with spring
          slideFromRight.value = withSpring(0, {
            damping: 18,
            stiffness: 280,
            mass: 0.7,
          });
        }

        // Fade in
        opacity.value = withDelay(
          delay,
          withTiming(1, {
            duration: isBot ? 400 : 300,
            easing: Easing.out(Easing.cubic),
          })
        );
      }
    }, [delay, isBot, reducedMotion, slideUp, slideFromRight, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: slideUp.value }, { translateX: slideFromRight.value }],
      opacity: opacity.value,
    }));

    const displayContent = message.metadata?.isSkipped
      ? 'Skipped'
      : message.metadata?.countryFlag
        ? `${message.metadata.countryFlag} ${message.content}`
        : message.content;

    if (isBot) {
      return (
        <Animated.View
          style={[styles.messageContainer, styles.botContainer, animatedStyle]}
          testID={testID}
          accessibilityRole="text"
          accessibilityLabel={`Bot message: ${message.content}`}
        >
          <ChatAvatar
            size={40}
            animated={true}
            reducedMotion={reducedMotion}
            testID={`${testID}-avatar`}
          />
          <View style={styles.botBubble}>
            <Text style={styles.botText}>{displayContent}</Text>
          </View>
        </Animated.View>
      );
    }

    // User message
    return (
      <Animated.View style={[styles.messageContainer, styles.userContainer, animatedStyle]}>
        <Pressable
          onLongPress={onLongPress}
          testID={testID}
          accessibilityRole="text"
          accessibilityLabel={`Your message: ${message.content}`}
          accessibilityHint={onLongPress ? 'Long press to edit' : undefined}
        >
          <View style={[styles.userBubble, message.metadata?.isSkipped && styles.skippedBubble]}>
            <Text style={[styles.userText, message.metadata?.isSkipped && styles.skippedText]}>
              {displayContent}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.reducedMotion === nextProps.reducedMotion
    );
  }
);

ChatMessage.displayName = 'ChatMessage';

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  botContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  botBubble: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH * 0.75,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
  },
  botText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: theme.colors.paper,
  },
  userBubble: {
    backgroundColor: theme.colors.sacredGold,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH * 0.7,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    color: theme.colors.deepVoid,
  },
  skippedBubble: {
    backgroundColor: theme.colors.softStone,
  },
  skippedText: {
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
});
