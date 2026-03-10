/**
 * ChatAvatar Component
 *
 * Circular avatar with mining helmet icon and breathing animation
 * Used for bot messages in conversational onboarding
 */

import React, { useEffect } from 'react';
import { StyleSheet, Platform, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@/utils/theme';

export interface ChatAvatarProps {
  /** Avatar size in pixels */
  size?: number;
  /** Enable breathing animation */
  animated?: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Test ID */
  testID?: string;
}

export const ChatAvatar = React.memo<ChatAvatarProps>(
  ({ size = 40, animated = true, reducedMotion, testID }) => {
    const { t } = useTranslation('onboarding');
    const scale = useSharedValue(1);

    useEffect(() => {
      if (animated && !reducedMotion) {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.05, {
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1.0, {
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // Infinite repeat
          false
        );
      } else {
        scale.value = withTiming(1, { duration: 0 });
      }
    }, [animated, reducedMotion, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          animatedStyle,
        ]}
        testID={testID}
        accessibilityRole="image"
        accessibilityLabel={t('chatAvatar.a11y', {
          defaultValue: 'Mining assistant avatar',
        })}
      >
        <Image
          source={require('../../../../assets/onboarding/icons/consolidated/mining-helmet-sacred-flame.png')}
          style={{
            width: size * 0.6,
            height: size * 0.6,
          }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }
);

ChatAvatar.displayName = 'ChatAvatar';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
