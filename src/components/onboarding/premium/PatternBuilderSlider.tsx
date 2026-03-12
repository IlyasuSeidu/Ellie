import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 0.75;

const SPRING_CONFIGS = {
  fast: { damping: 10, stiffness: 400 },
  smooth: { damping: 20, stiffness: 300 },
  gentle: { damping: 15, stiffness: 200 },
} as const;

export interface PatternBuilderSliderProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap | string;
  value: number;
  min: number;
  max: number;
  color: string;
  trackColor: string;
  onChange: (value: number) => void;
  hapticSourcePrefix: string;
  delayIndex?: number;
  reducedMotion?: boolean;
  customThumbIcon?: ImageSourcePropType;
  customHeaderIcon?: ImageSourcePropType;
}

export const PatternBuilderSlider: React.FC<PatternBuilderSliderProps> = ({
  label,
  icon,
  value,
  min,
  max,
  color,
  trackColor,
  onChange,
  hapticSourcePrefix,
  delayIndex = 0,
  reducedMotion = false,
  customThumbIcon,
  customHeaderIcon,
}) => {
  const { t } = useTranslation('onboarding');
  const [trackWidth, setTrackWidth] = useState(SLIDER_WIDTH);
  const translateX = useSharedValue(((value - min) / Math.max(1, max - min)) * trackWidth);
  const startX = useSharedValue(0);
  const scale = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const containerOpacity = useSharedValue(0);
  const containerTranslateY = useSharedValue(20);
  const shakeX = useSharedValue(0);
  const thumbGlow = useSharedValue(0.3);

  useEffect(() => {
    containerOpacity.value = withDelay(delayIndex * 200, withTiming(1, { duration: 400 }));
    containerTranslateY.value = withDelay(delayIndex * 200, withSpring(0, SPRING_CONFIGS.gentle));
  }, [containerOpacity, containerTranslateY, delayIndex]);

  useEffect(() => {
    if (reducedMotion) {
      thumbGlow.value = 0.4;
      return;
    }

    thumbGlow.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 1500 }), withTiming(0.6, { duration: 1500 })),
      -1,
      true
    );
  }, [reducedMotion, thumbGlow]);

  useEffect(() => {
    translateX.value = withSpring(
      ((value - min) / Math.max(1, max - min)) * trackWidth,
      SPRING_CONFIGS.smooth
    );
  }, [max, min, trackWidth, translateX, value]);

  useEffect(() => {
    badgeScale.value = withSequence(
      withSpring(1.15, SPRING_CONFIGS.fast),
      withSpring(1, SPRING_CONFIGS.fast)
    );
  }, [badgeScale, value]);

  const shakeForLimit = useCallback(
    (limit: 'increment' | 'decrement') => {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      void triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: `${hapticSourcePrefix}.slider.${limit}.limit:${label}`,
      });
    },
    [hapticSourcePrefix, label, shakeX]
  );

  const handleIncrement = useCallback(() => {
    if (value >= max) {
      shakeForLimit('increment');
      return;
    }

    onChange(value + 1);
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `${hapticSourcePrefix}.slider.increment:${label}`,
    });
  }, [hapticSourcePrefix, label, max, onChange, shakeForLimit, value]);

  const handleDecrement = useCallback(() => {
    if (value <= min) {
      shakeForLimit('decrement');
      return;
    }

    onChange(value - 1);
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `${hapticSourcePrefix}.slider.decrement:${label}`,
    });
  }, [hapticSourcePrefix, label, min, onChange, shakeForLimit, value]);

  const handleTrackPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const tapX = event.nativeEvent.locationX;
      const clampedX = Math.max(0, Math.min(trackWidth, tapX));
      const progress = clampedX / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));

      if (newValue === value) {
        return;
      }

      onChange(newValue);
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium, {
        source: `${hapticSourcePrefix}.slider.trackPress:${label}`,
      });
    },
    [hapticSourcePrefix, label, max, min, onChange, trackWidth, value]
  );

  const triggerLightHaptic = useCallback(() => {
    void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
      source: `${hapticSourcePrefix}.slider.drag:${label}`,
    });
  }, [hapticSourcePrefix, label]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      scale.value = withSpring(1.1, SPRING_CONFIGS.fast);
      thumbGlow.value = withTiming(0.6, { duration: 150 });
    })
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(trackWidth, startX.value + event.translationX));
      translateX.value = newX;
      const progress = newX / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));

      if (newValue !== value) {
        runOnJS(onChange)(newValue);
        runOnJS(triggerLightHaptic)();
      }
    })
    .onEnd(() => {
      scale.value = withSpring(1, SPRING_CONFIGS.fast);
      if (reducedMotion) {
        thumbGlow.value = 0.4;
      } else {
        thumbGlow.value = withRepeat(
          withSequence(withTiming(0.3, { duration: 1500 }), withTiming(0.6, { duration: 1500 })),
          -1,
          true
        );
      }

      const progress = translateX.value / Math.max(1, trackWidth);
      const newValue = Math.round(min + progress * (max - min));
      translateX.value = withSpring(
        ((newValue - min) / Math.max(1, max - min)) * trackWidth,
        SPRING_CONFIGS.smooth
      );
    });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ translateY: containerTranslateY.value }, { translateX: shakeX.value }],
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    shadowOpacity: thumbGlow.value,
  }));

  const trackFillAnimatedStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - 16 }, { scale: badgeScale.value }],
  }));

  return (
    <Animated.View style={[styles.sliderContainer, containerAnimatedStyle]}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderLabelContainer}>
          {customHeaderIcon ? (
            <Image source={customHeaderIcon} style={styles.sliderHeaderIcon} resizeMode="contain" />
          ) : icon.length <= 2 ? (
            <Text style={styles.sliderEmoji}>{icon}</Text>
          ) : (
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
          )}
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <View style={styles.sliderValuePill}>
          <Text style={[styles.sliderValue, { color }]}>{value}</Text>
        </View>
      </View>

      <View style={styles.sliderControls}>
        <Pressable
          onPress={handleDecrement}
          style={[styles.controlButton, value === min && styles.controlButtonDisabled]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={String(
            t('patternBuilderSlider.a11y.decrease', {
              label,
              defaultValue: 'Decrease {{label}}',
            })
          )}
          accessibilityHint={String(
            t('patternBuilderSlider.a11y.currentValueMinimum', {
              value,
              min,
              defaultValue: 'Current value is {{value}}. Minimum is {{min}}.',
            })
          )}
          accessibilityState={{ disabled: value === min }}
        >
          <Ionicons name="remove" size={20} color={value === min ? theme.colors.dust : color} />
        </Pressable>

        <View
          style={styles.sliderTrackContainer}
          onLayout={(event) => {
            const { width } = event.nativeEvent.layout;
            setTrackWidth(width);
          }}
        >
          <View style={[styles.sliderTrack, { backgroundColor: theme.colors.opacity.white10 }]}>
            <Animated.View
              style={[
                styles.sliderTrackFill,
                { backgroundColor: trackColor },
                trackFillAnimatedStyle,
              ]}
            />
          </View>

          <Pressable onPress={handleTrackPress} style={styles.trackPressable} />

          <View style={styles.tickMarks}>
            {Array.from({ length: max - min + 1 }).map((_, index) => (
              <View
                key={`${label}-${index}`}
                style={[
                  styles.tickMark,
                  index === value - min && { backgroundColor: color, height: 8, width: 2 },
                ]}
              />
            ))}
          </View>

          <View style={styles.rangeLabels}>
            <Text style={styles.rangeLabel}>{min}</Text>
            <Text style={styles.rangeLabel}>{max}</Text>
          </View>

          <Animated.View
            style={[styles.valueBadge, { backgroundColor: color }, badgeAnimatedStyle]}
          >
            <Text style={styles.valueBadgeText}>{value}</Text>
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[styles.sliderThumb, { backgroundColor: color }, thumbAnimatedStyle]}
              accessible={true}
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityValue={{ min, max, now: value, text: `${value} ${label.toLowerCase()}` }}
              accessibilityHint={String(
                t('patternBuilderSlider.a11y.adjustHint', {
                  defaultValue: 'Swipe left or right to adjust value',
                })
              )}
            >
              {customThumbIcon ? (
                <Image source={customThumbIcon} style={styles.thumbIcon} resizeMode="contain" />
              ) : icon.length <= 2 ? (
                <Text style={styles.thumbEmoji}>{icon}</Text>
              ) : (
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={theme.colors.paper}
                />
              )}
            </Animated.View>
          </GestureDetector>
        </View>

        <Pressable
          onPress={handleIncrement}
          style={[styles.controlButton, value === max && styles.controlButtonDisabled]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={String(
            t('patternBuilderSlider.a11y.increase', {
              label,
              defaultValue: 'Increase {{label}}',
            })
          )}
          accessibilityHint={String(
            t('patternBuilderSlider.a11y.currentValueMaximum', {
              value,
              max,
              defaultValue: 'Current value is {{value}}. Maximum is {{max}}.',
            })
          )}
          accessibilityState={{ disabled: value === max }}
        >
          <Ionicons name="add" size={20} color={value === max ? theme.colors.dust : color} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    gap: theme.spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexShrink: 1,
  },
  sliderEmoji: {
    fontSize: 20,
  },
  sliderHeaderIcon: {
    width: 50,
    height: 50,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.paper,
    flexShrink: 1,
  },
  sliderValuePill: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.opacity.black40,
    borderWidth: 1,
    borderColor: theme.colors.opacity.white30,
    marginLeft: theme.spacing.sm,
  },
  sliderValue: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.opacity.white20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.opacity.white30,
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
  sliderTrackContainer: {
    flex: 1,
    height: 60,
    position: 'relative',
  },
  trackPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 27,
  },
  sliderTrackFill: {
    height: '100%',
  },
  tickMarks: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tickMark: {
    width: 1,
    height: 4,
    backgroundColor: theme.colors.opacity.white30,
  },
  rangeLabels: {
    position: 'absolute',
    top: 38,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    fontSize: 11,
    color: theme.colors.paper,
    fontWeight: '600',
  },
  valueBadge: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.paper,
  },
  sliderThumb: {
    position: 'absolute',
    top: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.deepVoid,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  thumbIcon: {
    width: 30,
    height: 30,
    backgroundColor: theme.colors.paper,
    borderRadius: 15,
    padding: 2,
  },
  thumbEmoji: {
    fontSize: 14,
  },
});
