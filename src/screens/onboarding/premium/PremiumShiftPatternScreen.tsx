/**
 * PremiumShiftPatternScreen Component
 *
 * Shift pattern selection screen (Step 3 of 10) for choosing roster pattern
 * Features pattern cards in responsive grid with staggered animations
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PatternCard } from '@/components/onboarding/premium/PatternCard';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftPattern } from '@/types';

// Animated card wrapper component
interface AnimatedPatternCardProps {
  pattern: {
    id: string;
    type: ShiftPattern;
    icon: string;
    name: string;
    description: string;
    schedule: string;
  };
  delay: number;
  selectedPattern: string | null;
  onSelect: (patternId: string) => void;
  numColumns: number;
  testID?: string;
}

const AnimatedPatternCardWrapper: React.FC<AnimatedPatternCardProps> = ({
  pattern,
  delay,
  selectedPattern,
  onSelect,
  numColumns,
  testID,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
  }, [opacity, translateY, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: `${100 / numColumns}%`,
          paddingHorizontal: theme.spacing.xs,
          marginBottom: theme.spacing.md,
        },
        animatedStyle,
      ]}
    >
      <PatternCard
        pattern={pattern.type}
        metadata={{
          emoji: pattern.icon,
          name: pattern.name,
          description: pattern.description,
          preview: [],
        }}
        selected={selectedPattern === pattern.id}
        onSelect={() => onSelect(pattern.id)}
        testID={testID}
      />
    </Animated.View>
  );
};

const SHIFT_PATTERNS = [
  {
    id: '3-3-3',
    type: ShiftPattern.STANDARD_3_3_3,
    icon: '🔄',
    name: '3-3-3 Cycle',
    description: 'Standard short cycle',
    schedule: '3D/3N/3O',
  },
  {
    id: '5-5-5',
    type: ShiftPattern.STANDARD_5_5_5,
    icon: '📅',
    name: '5-5-5 Cycle',
    description: 'Medium cycle',
    schedule: '5D/5N/5O',
  },
  {
    id: '10-10-10',
    type: ShiftPattern.STANDARD_10_10_10,
    icon: '📆',
    name: '10-10-10 Cycle',
    description: 'Extended cycle',
    schedule: '10D/10N/10O',
  },
  {
    id: '2-2-3',
    type: ShiftPattern.STANDARD_2_2_3,
    icon: '⚡',
    name: '2-2-3 Cycle',
    description: 'Pitman variation',
    schedule: '2D/2N/3O',
  },
  {
    id: '4-4-4',
    type: ShiftPattern.STANDARD_4_4_4,
    icon: '⛏️',
    name: '4-4-4 Cycle',
    description: 'FIFO Standard',
    schedule: '4D/4N/4O',
  },
  {
    id: '7-7-7',
    type: ShiftPattern.STANDARD_7_7_7,
    icon: '🗓️',
    name: '7-7-7 Cycle',
    description: 'Weekly rotation',
    schedule: '7D/7N/7O',
  },
  {
    id: 'continental',
    type: ShiftPattern.CONTINENTAL,
    icon: '🌍',
    name: 'Continental',
    description: 'Continental shift',
    schedule: '2D/2N/4O',
  },
  {
    id: 'pitman',
    type: ShiftPattern.PITMAN,
    icon: '🏭',
    name: 'Pitman Schedule',
    description: 'Classic Pitman',
    schedule: '2-2-3-2-2-3',
  },
  {
    id: 'custom',
    type: ShiftPattern.CUSTOM,
    icon: '✨',
    name: 'Custom Pattern',
    description: 'Build your own',
    schedule: 'Flexible',
  },
];

export interface PremiumShiftPatternScreenProps {
  onContinue?: (patternType: ShiftPattern) => void;
  testID?: string;
}

export const PremiumShiftPatternScreen: React.FC<PremiumShiftPatternScreenProps> = ({
  onContinue,
  testID = 'premium-shift-pattern-screen',
}) => {
  const { width } = useWindowDimensions();
  const { data, updateData } = useOnboarding();
  const [selectedPattern, setSelectedPattern] = useState<string | null>(data.patternType || null);

  // Determine number of columns based on screen width
  const numColumns = width >= 768 ? 3 : 2;

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  // Start animations on mount
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    titleTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });

    // Subtitle animation
    subtitleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // Button animation
    buttonOpacity.value = withDelay(
      400 + SHIFT_PATTERNS.length * 50 + 100,
      withTiming(1, { duration: 300 })
    );
  }, [titleOpacity, titleTranslateY, subtitleOpacity, buttonOpacity]);

  // Animated styles
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handlePatternSelect = (patternId: string) => {
    setSelectedPattern(patternId);
    const pattern = SHIFT_PATTERNS.find((p) => p.id === patternId);
    if (pattern) {
      updateData({ patternType: pattern.type });
    }
  };

  const handleContinue = () => {
    if (selectedPattern) {
      const pattern = SHIFT_PATTERNS.find((p) => p.id === selectedPattern);
      if (pattern) {
        // Save pattern type to context
        updateData({ patternType: pattern.type });

        // Call optional callback or navigate
        if (onContinue) {
          onContinue(pattern.type);
        }
        // Note: Navigation to next screen (StartDate or CustomPattern)
        // will be implemented when those screens are created
      }
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress Header */}
      <ProgressHeader currentStep={3} totalSteps={10} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          Choose your shift pattern
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
          Select the pattern that matches your roster
        </Animated.Text>

        {/* Pattern Grid */}
        <View style={[styles.grid, { marginTop: theme.spacing.xl }]}>
          {SHIFT_PATTERNS.map((pattern, index) => (
            <AnimatedPatternCardWrapper
              key={pattern.id}
              pattern={pattern}
              delay={400 + index * 50}
              selectedPattern={selectedPattern}
              onSelect={handlePatternSelect}
              numColumns={numColumns}
              testID={`${testID}-pattern-${pattern.id}`}
            />
          ))}
        </View>

        {/* Continue Button */}
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <PremiumButton
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            size="large"
            disabled={!selectedPattern}
            testID={`${testID}-continue-button`}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
        textShadowColor: theme.colors.sacredGold,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  subtitle: {
    fontSize: 16,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.dust,
    marginBottom: theme.spacing.lg,
    letterSpacing: 0.5,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      },
    }),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  buttonContainer: {
    marginTop: theme.spacing.xl,
  },
});
