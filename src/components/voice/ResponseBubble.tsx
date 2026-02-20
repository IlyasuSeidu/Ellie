/**
 * ResponseBubble
 *
 * Chat bubble for displaying user and assistant messages
 * in the voice assistant conversation.
 *
 * Phase 3: Assistant messages animate with a typewriter effect
 * when isNew is true, simulating streaming display.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { theme } from '@/utils/theme';
import type { VoiceMessage } from '@/types/voiceAssistant';

/** Characters revealed per tick for typewriter effect */
const CHARS_PER_TICK = 2;
/** Interval between ticks in ms */
const TICK_INTERVAL = 20;

interface ResponseBubbleProps {
  message: VoiceMessage;
  index: number;
  /** When true, assistant messages animate with typewriter effect */
  isNew?: boolean;
}

export const ResponseBubble: React.FC<ResponseBubbleProps> = ({
  message,
  index,
  isNew = false,
}) => {
  const isUser = message.role === 'user';
  const shouldAnimate = isNew && !isUser;

  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : message.text);
  const animatingRef = useRef(shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedText(message.text);
      return;
    }

    let charIndex = 0;
    animatingRef.current = true;

    const interval = setInterval(() => {
      charIndex += CHARS_PER_TICK;
      if (charIndex >= message.text.length) {
        setDisplayedText(message.text);
        animatingRef.current = false;
        clearInterval(interval);
      } else {
        setDisplayedText(message.text.slice(0, charIndex));
      }
    }, TICK_INTERVAL);

    return () => {
      clearInterval(interval);
      animatingRef.current = false;
    };
  }, [message.text, shouldAnimate]);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 50).duration(300)}
      style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}
      accessibilityRole="text"
      accessibilityLabel={
        isUser
          ? `You said: ${message.text}`
          : `Ellie said: ${message.text}`
      }
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && <Text style={styles.assistantLabel}>Ellie</Text>}
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {displayedText}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser && styles.timestampRight]}>
        {formatTime(message.timestamp)}
      </Text>
    </Animated.View>
  );
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: theme.colors.sacredGold,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.colors.softStone,
    borderBottomLeftRadius: 4,
  },
  assistantLabel: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.sacredGold,
    marginBottom: 2,
  },
  text: {
    fontSize: theme.typography.fontSizes.md,
    lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.normal,
  },
  userText: {
    color: theme.colors.text.inverse,
  },
  assistantText: {
    color: theme.colors.paper,
  },
  timestamp: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
    marginTop: 4,
    marginLeft: 4,
  },
  timestampRight: {
    marginRight: 4,
    marginLeft: 0,
  },
});
