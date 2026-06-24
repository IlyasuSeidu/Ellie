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
import { useTranslation } from 'react-i18next';
import type { VoiceMessage } from '@/types/voiceAssistant';
import { formatLocalizedDateTime } from '@/utils/i18nFormat';

const RYVRO_COLORS = {
  void: '#02070b',
  panel: 'rgba(8, 22, 31, 0.92)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  line: 'rgba(191, 231, 255, 0.18)',
} as const;

/** Characters revealed per tick for typewriter effect */
const CHARS_PER_TICK = 3;
/** Interval between ticks in ms */
const TICK_INTERVAL = 50;

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
  const { t, i18n } = useTranslation('dashboard');
  const isUser = message.role === 'user';
  const shouldAnimate = isNew && !isUser;

  const [displayedText, setDisplayedText] = useState(shouldAnimate ? '' : message.text);
  const animatingRef = useRef(shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedText(message.text);
      return undefined;
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
          ? t('voiceAssistant.responseBubble.userSaidA11y', {
              text: message.text,
              defaultValue: 'You said: {{text}}',
            })
          : t('voiceAssistant.responseBubble.assistantSaidA11y', {
              text: message.text,
              defaultValue: ' Ryvro said: {{text}}',
            })
      }
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && <Text style={styles.assistantLabel}>Ryvro</Text>}
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {displayedText}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser && styles.timestampRight]}>
        {formatTime(message.timestamp, i18n.resolvedLanguage ?? i18n.language)}
      </Text>
    </Animated.View>
  );
};

function formatTime(timestamp: number, language: string): string {
  const date = new Date(timestamp);
  return formatLocalizedDateTime(
    date,
    {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    },
    language
  );
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
    maxWidth: '84%',
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: 'rgba(20, 124, 255, 0.24)',
    borderBottomRightRadius: 7,
    borderColor: 'rgba(20, 124, 255, 0.32)',
  },
  assistantBubble: {
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderBottomLeftRadius: 7,
    borderColor: RYVRO_COLORS.line,
  },
  assistantLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: RYVRO_COLORS.cyan,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  userText: {
    color: RYVRO_COLORS.silver,
  },
  assistantText: {
    color: RYVRO_COLORS.silver,
  },
  timestamp: {
    fontSize: 12,
    color: RYVRO_COLORS.muted,
    marginTop: 4,
    marginLeft: 4,
  },
  timestampRight: {
    marginRight: 4,
    marginLeft: 0,
  },
});
