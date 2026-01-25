/**
 * PremiumWelcomeScreen Component
 *
 * Welcome/splash screen (Step 1 of 10) using stone and gold theme
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { theme } from '@/utils/theme';
import { PremiumButton } from '@/components/onboarding/premium';

export interface PremiumWelcomeScreenProps {
  /** Navigation handler for next screen */
  onContinue?: () => void;
  /** Test ID */
  testID?: string;
}

const ANIMATION_TIMINGS = {
  LOGO_FADE: 500,
  NAME_SLIDE: 300,
  TAGLINE_FADE: 200,
  BUTTON_SLIDE: 200,
  AUTO_ADVANCE: 3000,
};

export const PremiumWelcomeScreen: React.FC<PremiumWelcomeScreenProps> = ({
  onContinue,
  testID,
}) => {
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const nameTranslateY = useSharedValue(30);
  const nameOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    // Orchestrated entrance animation
    // 1. Logo fades in (0-500ms)
    logoOpacity.value = withTiming(1, {
      duration: ANIMATION_TIMINGS.LOGO_FADE,
      easing: Easing.cubic,
    });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });

    // 2. App name slides up with glow (500-800ms)
    nameTranslateY.value = withDelay(500, withSpring(0, { damping: 15, stiffness: 200 }));
    nameOpacity.value = withDelay(500, withTiming(1, { duration: ANIMATION_TIMINGS.NAME_SLIDE }));

    // 3. Tagline fades in (800-1000ms)
    taglineOpacity.value = withDelay(
      800,
      withTiming(1, { duration: ANIMATION_TIMINGS.TAGLINE_FADE })
    );

    // 4. Button slides up (1000-1200ms)
    buttonTranslateY.value = withDelay(1000, withSpring(0, { damping: 15, stiffness: 200 }));
    buttonOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: ANIMATION_TIMINGS.BUTTON_SLIDE })
    );

    // Auto-advance after 3 seconds
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (onContinue) {
        onContinue();
      }
    }, ANIMATION_TIMINGS.AUTO_ADVANCE);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, [
    logoOpacity,
    logoScale,
    nameTranslateY,
    nameOpacity,
    taglineOpacity,
    buttonTranslateY,
    buttonOpacity,
    onContinue,
  ]);

  const handleContinue = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (onContinue) {
      onContinue();
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const nameAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <View style={styles.container} testID={testID}>
      {/* Background */}
      <View style={styles.background} />

      {/* Gold gradient overlay */}
      <LinearGradient
        colors={[theme.colors.opacity.gold10, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
        style={styles.gradientOverlay}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo placeholder with animation */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoPlaceholder}>
            <Animated.Text style={styles.logoIcon}>⛏️</Animated.Text>
          </View>
        </Animated.View>

        {/* App name with gold glow */}
        <Animated.View style={[styles.nameContainer, nameAnimatedStyle]}>
          <Animated.Text style={styles.appName}>Ellie</Animated.Text>
          <View style={styles.nameGlow} />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
          Your Mining Shift Companion
        </Animated.Text>

        {/* Get Started button */}
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <PremiumButton
            title="Get Started"
            onPress={handleContinue}
            variant="primary"
            size="large"
            testID={`${testID}-button`}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.deepVoid,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: '50%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.xl,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: theme.colors.darkStone,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  logoIcon: {
    fontSize: 64,
  },
  nameContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: 48,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    letterSpacing: 2,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        textShadowColor: theme.colors.sacredGold,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
      },
    }),
  },
  nameGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.1,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  tagline: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
});
