/**
 * TypingIndicator Component
 *
 * Shows three animated dots to indicate bot is typing
 * Dots bounce with staggered timing for natural effect
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@/utils/theme';

export interface TypingIndicatorProps {
  /** Show/hide the indicator */
  visible: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Test ID */
  testID?: string;
}

export const TypingIndicator = React.memo<TypingIndicatorProps>(
  ({ visible, reducedMotion, testID }) => {
    const { t } = useTranslation('onboarding');
    const dot1Y = useSharedValue(0);
    const dot2Y = useSharedValue(0);
    const dot3Y = useSharedValue(0);

    useEffect(() => {
      if (visible && !reducedMotion) {
        const bounceAnimation = withRepeat(
          withSequence(
            withTiming(-4, {
              duration: 300,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0, {
              duration: 300,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // Infinite repeat
          false
        );

        // Staggered animation for natural effect
        dot1Y.value = bounceAnimation;
        dot2Y.value = withDelay(150, bounceAnimation);
        dot3Y.value = withDelay(300, bounceAnimation);
      } else {
        // Reset to 0 if not visible or reduced motion
        dot1Y.value = withTiming(0, { duration: 0 });
        dot2Y.value = withTiming(0, { duration: 0 });
        dot3Y.value = withTiming(0, { duration: 0 });
      }
    }, [visible, reducedMotion, dot1Y, dot2Y, dot3Y]);

    const dot1Style = useAnimatedStyle(() => ({
      transform: [{ translateY: dot1Y.value }],
    }));

    const dot2Style = useAnimatedStyle(() => ({
      transform: [{ translateY: dot2Y.value }],
    }));

    const dot3Style = useAnimatedStyle(() => ({
      transform: [{ translateY: dot3Y.value }],
    }));

    if (!visible) return null;

    return (
      <View
        style={styles.container}
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={t('typingIndicator.a11y', {
          defaultValue: 'Bot is typing',
        })}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.bubble}>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
            <Animated.View style={[styles.dot, dot3Style]} />
          </View>
        </View>
      </View>
    );
  }
);

TypingIndicator.displayName = 'TypingIndicator';

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bubble: {
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    marginLeft: 52, // Align with bot message text (avatar 40px + gap 12px)
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.dust,
  },
});
