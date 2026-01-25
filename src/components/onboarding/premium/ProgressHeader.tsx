/**
 * ProgressHeader Component
 *
 * Animated progress indicator using stone and gold theme
 */

import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';

export interface ProgressHeaderProps {
  /** Current step (1-based index) */
  currentStep: number;
  /** Total number of steps (1-10) */
  totalSteps: number;
  /** Back button handler */
  onBack?: () => void;
  /** Skip button handler */
  onSkip?: () => void;
  /** Show skip button */
  showSkip?: boolean;
  /** Show progress percentage */
  showPercentage?: boolean;
  /** Custom background color */
  backgroundColor?: string;
  /** Custom style */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onSkip,
  showSkip = false,
  showPercentage = false,
  backgroundColor = 'transparent',
  style,
  testID,
}) => {
  const handleBack = () => {
    if (onBack && currentStep > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSkip();
    }
  };

  const progressPercentage = Math.round((currentStep / totalSteps) * 100);
  const showBackButton = currentStep > 1 && onBack;

  return (
    <View style={[styles.container, { backgroundColor }, style]} testID={testID}>
      <View style={styles.header}>
        {/* Back Button */}
        <View style={styles.actionContainer}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID={`${testID}-back`}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <ProgressDot
              key={index}
              step={index + 1}
              currentStep={currentStep}
              testID={`${testID}-dot-${index + 1}`}
            />
          ))}
        </View>

        {/* Skip Button */}
        <View style={styles.actionContainer}>
          {showSkip && onSkip ? (
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Skip"
              testID={`${testID}-skip`}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>

      {/* Progress Percentage */}
      {showPercentage && (
        <Text style={styles.percentageText} testID={`${testID}-percentage`}>
          {progressPercentage}% Complete
        </Text>
      )}
    </View>
  );
};

interface ProgressDotProps {
  step: number;
  currentStep: number;
  testID?: string;
}

const ProgressDot: React.FC<ProgressDotProps> = ({ step, currentStep, testID }) => {
  const isCompleted = step < currentStep;
  const isCurrent = step === currentStep;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = isCurrent
      ? withSpring(1.2, { damping: 15, stiffness: 300 })
      : withSpring(1, { damping: 15, stiffness: 300 });

    const opacity = interpolate(scale, [1, 1.2], [isCompleted ? 1 : 0.5, 1], Extrapolate.CLAMP);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getDotColor = () => {
    if (isCurrent) return theme.colors.sacredGold;
    if (isCompleted) return theme.colors.brightGold;
    return theme.colors.softStone;
  };

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: getDotColor() },
        animatedStyle,
        isCurrent && styles.currentDot,
      ]}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionContainer: {
    width: 60,
    alignItems: 'center',
  },
  placeholder: {
    width: 24,
    height: 24,
  },
  backButtonText: {
    fontSize: 24,
    color: theme.colors.dust,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentDot: {
    shadowColor: theme.colors.sacredGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  skipButtonText: {
    fontSize: 14,
    color: theme.colors.shadow,
    fontWeight: '500',
  },
  percentageText: {
    marginTop: 12,
    fontSize: 12,
    color: theme.colors.paper,
    textAlign: 'center',
    fontWeight: '500',
  },
});
