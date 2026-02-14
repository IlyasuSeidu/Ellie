/**
 * Premium Completion Screen (Step 8 of 11)
 *
 * Celebration and completion screen for onboarding flow.
 * Shows summary of user's configuration and saves data to Firestore.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { ShiftPattern } from '@/types';

// Animated SVG components
const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface PremiumCompletionScreenProps {
  onComplete?: () => void;
  testID?: string;
}

interface FeaturePill {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const FEATURE_HIGHLIGHTS: FeaturePill[] = [
  { icon: 'calendar-outline', label: 'Holiday tracking' },
  { icon: 'stats-chart-outline', label: 'Shift analytics' },
  { icon: 'notifications-outline', label: 'Smart notifications' },
  { icon: 'time-outline', label: 'Shift time tracking' },
  { icon: 'scale-outline', label: 'Work-life insights' },
  { icon: 'sync-outline', label: 'Calendar sync' },
];

export const PremiumCompletionScreen: React.FC<PremiumCompletionScreenProps> = ({
  onComplete,
  testID = 'premium-completion-screen',
}) => {
  const { data } = useOnboarding();

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Animation values
  const checkmarkProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // Check for reduced motion
  useEffect(() => {
    const checkReducedMotion = async () => {
      const isReducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReducedMotion(isReducedMotionEnabled);
    };
    checkReducedMotion();
  }, []);

  // Trigger success haptic and animations on mount
  useEffect(() => {
    const triggerCelebration = async () => {
      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate checkmark
      checkmarkProgress.value = withDelay(
        300,
        withTiming(1, {
          duration: 1000,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        })
      );

      // Pulse glow effect
      glowOpacity.value = withDelay(
        1500,
        withRepeat(
          withSequence(withTiming(0.6, { duration: 1500 }), withTiming(0.3, { duration: 1500 })),
          -1,
          true
        )
      );
    };

    triggerCelebration();
  }, [checkmarkProgress, glowOpacity]);

  // Animated props for checkmark
  const checkmarkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 100 - checkmarkProgress.value * 100,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Save onboarding data
  const saveOnboardingData = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // For now, just save to AsyncStorage
      // Full UserService integration will come after proper backend setup
      await asyncStorageService.set('onboarding:complete', true);
      await asyncStorageService.set('onboarding:data', JSON.stringify(data));

      setIsSaved(true);

      // Trigger success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Pulse button
      buttonScale.value = withSequence(
        withSpring(1.1, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save your data. Please try again.'
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  // Save data on mount
  useEffect(() => {
    saveOnboardingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle retry
  const handleRetry = () => {
    saveOnboardingData();
  };

  // Handle completion
  const handleGetStarted = async () => {
    if (!isSaved) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call completion callback if provided
    onComplete?.();

    // Navigate to main app (placeholder - update when Dashboard is created)
    // TODO: navigation.navigate('Dashboard');
  };

  // Format pattern name for display
  const getPatternName = (): string => {
    if (data.customPattern) {
      const { daysOn, nightsOn, daysOff } = data.customPattern;
      const pattern = nightsOn ? `${daysOn}-${nightsOn}-${daysOff}` : `${daysOn}-${daysOff}`;
      return `${pattern} Custom Rotation`;
    }

    const patternNames: Record<ShiftPattern, string> = {
      [ShiftPattern.STANDARD_4_4_4]: '4-4-4 Rotation',
      [ShiftPattern.STANDARD_7_7_7]: '7-7-7 Rotation',
      [ShiftPattern.STANDARD_2_2_3]: '2-2-3 (Pitman)',
      [ShiftPattern.STANDARD_5_5_5]: '5-5-5 Rotation',
      [ShiftPattern.STANDARD_3_3_3]: '3-3-3 Rotation',
      [ShiftPattern.STANDARD_10_10_10]: '10-10-10 Rotation',
      [ShiftPattern.CONTINENTAL]: 'Continental',
      [ShiftPattern.PITMAN]: 'Pitman',
      [ShiftPattern.CUSTOM]: 'Custom Rotation',
    };

    return patternNames[data.patternType || ShiftPattern.CUSTOM];
  };

  // Format shift system
  const getShiftSystemName = (): string => {
    return data.shiftSystem === '2-shift' ? '2-Shift System' : '3-Shift System';
  };

  // Format date
  const formatDate = (date?: Date): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format shift times
  const getShiftTimes = (): string => {
    if (!data.shiftStartTime || !data.shiftEndTime) return 'Not set';
    return `${data.shiftStartTime} - ${data.shiftEndTime}`;
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress Header */}
      <ProgressHeader currentStep={8} totalSteps={11} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Checkmark Circle */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(500)}
          style={styles.checkmarkContainer}
        >
          {/* Glow effect */}
          <Animated.View style={[styles.glow, glowStyle]} />

          {/* SVG Circle and Checkmark */}
          <Svg width={120} height={120} viewBox="0 0 120 120">
            {/* Gradient border circle */}
            <Circle
              cx={60}
              cy={60}
              r={56}
              fill="transparent"
              stroke={theme.colors.sacredGold}
              strokeWidth={4}
            />

            {/* Checkmark path */}
            <AnimatedPath
              d="M 35 60 L 50 75 L 85 40"
              fill="transparent"
              stroke={theme.colors.paper}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="100"
              animatedProps={checkmarkAnimatedProps}
            />
          </Svg>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={reducedMotion ? undefined : FadeInDown.delay(400).duration(500)}
          style={styles.title}
        >
          You&apos;re all set!
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={reducedMotion ? undefined : FadeInDown.delay(500).duration(500)}
          style={styles.subtitle}
        >
          Welcome to Ellie
        </Animated.Text>

        {/* Summary Card */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.delay(800).duration(500)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="person-circle-outline" size={24} color={theme.colors.sacredGold} />
            <Text style={styles.summaryHeaderText}>Your profile</Text>
          </View>

          <View style={styles.summaryContent}>
            {data.name && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name</Text>
                <Text style={styles.summaryValue}>{data.name}</Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shift System</Text>
              <Text style={styles.summaryValue}>{getShiftSystemName()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rotation</Text>
              <Text style={styles.summaryValue}>{getPatternName()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Start Date</Text>
              <Text style={styles.summaryValue}>{formatDate(data.startDate)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shift Times</Text>
              <Text style={styles.summaryValue}>{getShiftTimes()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Feature Highlights */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.delay(1200).duration(500)}
          style={styles.featuresSection}
        >
          <Text style={styles.featuresTitle}>What you can do with Ellie</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuresScroll}
          >
            {FEATURE_HIGHLIGHTS.map((feature, index) => (
              <Animated.View
                key={feature.label}
                entering={
                  reducedMotion ? undefined : FadeIn.delay(1500 + index * 100).duration(300)
                }
                style={styles.featurePill}
              >
                <Ionicons name={feature.icon} size={20} color={theme.colors.sacredGold} />
                <Text style={styles.featurePillText}>{feature.label}</Text>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Error Message */}
        {saveError && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.error} />
            <Text style={styles.errorText}>{saveError}</Text>
          </Animated.View>
        )}

        {/* Loading or Get Started Button */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.delay(2000).duration(500)}
          style={styles.buttonContainer}
        >
          {isSaving ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.sacredGold} />
              <Text style={styles.loadingText}>Setting up your calendar...</Text>
            </View>
          ) : saveError ? (
            <PremiumButton
              title="Try Again"
              onPress={handleRetry}
              variant="primary"
              size="large"
              accessibilityLabel="Retry saving your data"
              accessibilityHint="Tap to try saving your data again"
            />
          ) : (
            <Animated.View style={buttonAnimatedStyle}>
              <PremiumButton
                title="Get Started"
                onPress={handleGetStarted}
                variant="primary"
                size="large"
                disabled={!isSaved}
                accessibilityLabel="Get started with Ellie"
                accessibilityHint="Tap to start using the app"
              />
            </Animated.View>
          )}
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
    paddingBottom: theme.spacing.xxxl,
    alignItems: 'center',
  },
  // Checkmark Circle
  checkmarkContainer: {
    marginTop: theme.spacing.xxxl,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.3,
  },
  // Text
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.paper,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.dust,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  // Summary Card
  summaryCard: {
    width: '100%',
    backgroundColor: theme.colors.darkStone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  summaryHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.sacredGold,
  },
  summaryContent: {
    gap: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.dust,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.paper,
    textAlign: 'right',
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  // Features
  featuresSection: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dust,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  featuresScroll: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.sacredGold,
    marginRight: theme.spacing.sm,
  },
  featurePillText: {
    fontSize: 14,
    color: theme.colors.paper,
  },
  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.errorBg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.error,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.dust,
  },
  // Button
  buttonContainer: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
});

export default PremiumCompletionScreen;
