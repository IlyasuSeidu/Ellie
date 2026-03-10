/**
 * Premium Completion Screen (Step 8 of 11)
 *
 * Celebration and completion screen for onboarding flow.
 * Shows summary of user's configuration and saves data to Firestore.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  AccessibilityInfo,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeOutUp,
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

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/constants/onboardingProgress';
import { getShiftTimesFromData } from '@/utils/shiftTimeUtils';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  getPatternDisplayName,
  getShiftSystemDisplayName,
  getRosterTypeDisplayName,
  getFIFOWorkPatternName,
  getFIFOCycleDescription,
} from '@/utils/profileUtils';
import { triggerImpactHaptic, triggerNotificationHaptic } from '@/utils/hapticsDiagnostics';
import { normalizeLanguage } from '@/i18n/languageDetector';

// Animated SVG components
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Confetti Particle Component
const ConfettiParticle: React.FC<{ delay: number; angle: number; reducedMotion: boolean }> = ({
  delay,
  angle,
  reducedMotion,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  const colors = [
    theme.colors.sacredGold,
    '#60A5FA', // Blue
    '#F59E0B', // Amber
    '#10B981', // Green
    '#EC4899', // Pink
    '#8B5CF6', // Purple
  ];

  const particleColor = colors[Math.floor(Math.random() * colors.length)];

  useEffect(() => {
    if (reducedMotion) return;

    translateX.value = withDelay(
      delay,
      withTiming(Math.cos(angle) * (Math.random() * 150 + 100), {
        duration: 1500,
        easing: Easing.out(Easing.quad),
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(Math.sin(angle) * (Math.random() * 150 + 100) + 300, {
        duration: 1500,
        easing: Easing.in(Easing.quad),
      })
    );
    rotation.value = withDelay(delay, withTiming(Math.random() * 720, { duration: 1500 }));
    opacity.value = withDelay(delay + 1000, withTiming(0, { duration: 500 }));
  }, [delay, angle, reducedMotion, translateX, translateY, rotation, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (reducedMotion) return null;

  return (
    <Animated.View style={[styles.confettiParticle, animatedStyle]}>
      <View style={[styles.confettiDot, { backgroundColor: particleColor }]} />
    </Animated.View>
  );
};

// Sparkle Component for checkmark decoration
const Sparkle: React.FC<{ delay: number; angle: number; reducedMotion: boolean }> = ({
  delay,
  angle,
  reducedMotion,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      scale.value = 1;
      opacity.value = 0.8;
      return;
    }

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 400 }), withTiming(0.8, { duration: 400 })),
        -1,
        true
      )
    );
    opacity.value = withDelay(delay, withTiming(0.8, { duration: 300 }));
  }, [delay, reducedMotion, scale, opacity]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle) * 70 },
      { translateY: Math.sin(angle) * 70 },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.sparkle, sparkleStyle]}>
      <Ionicons name="sparkles" size={16} color={theme.colors.sacredGold} />
    </Animated.View>
  );
};

export interface PremiumCompletionScreenProps {
  onComplete?: () => void;
  testID?: string;
}

interface FeaturePill {
  id: string;
  translationKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  description: string;
  color: string;
}

const FEATURE_HIGHLIGHTS: FeaturePill[] = [
  {
    id: '1',
    translationKey: 'reminders',
    text: 'Smart shift reminders',
    icon: 'notifications-outline',
    description: 'Never miss a shift with intelligent notifications that adapt to your rotation',
    color: theme.colors.sacredGold,
  },
  {
    id: '2',
    translationKey: 'sleep',
    text: 'Sleep tracking & insights',
    icon: 'moon-outline',
    description: 'Optimize your rest between shifts with personalized sleep analytics',
    color: '#60A5FA', // Blue
  },
  {
    id: '3',
    translationKey: 'fatigue',
    text: 'Fatigue monitoring',
    icon: 'battery-charging-outline',
    description: 'Track your energy levels and get alerts when fatigue risk is high',
    color: '#F59E0B', // Amber
  },
  {
    id: '4',
    translationKey: 'team',
    text: 'Team coordination',
    icon: 'people-outline',
    description: 'See your crew schedule and coordinate handovers seamlessly',
    color: '#10B981', // Green
  },
  {
    id: '5',
    translationKey: 'balance',
    text: 'Work-life balance',
    icon: 'fitness-outline',
    description: 'Maintain healthy routines with activity and wellness tracking',
    color: '#EC4899', // Pink
  },
  {
    id: '6',
    translationKey: 'earnings',
    text: 'Earnings calculator',
    icon: 'calculator-outline',
    description: 'Automatically calculate overtime, penalties, and shift allowances',
    color: '#8B5CF6', // Purple
  },
  {
    id: '7',
    translationKey: 'meals',
    text: 'Meal & hydration',
    icon: 'restaurant-outline',
    description: 'Stay healthy with meal timing suggestions and hydration reminders',
    color: '#14B8A6', // Teal
  },
];

export const PremiumCompletionScreen: React.FC<PremiumCompletionScreenProps> = ({
  onComplete,
  testID = 'premium-completion-screen',
}) => {
  const { t, i18n } = useTranslation('onboarding');
  const { data, validateData } = useOnboarding();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const featuresSectionYRef = useRef(0);

  // Animation values
  const checkmarkProgress = useSharedValue(0);
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
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumCompletionScreen.triggerCelebration',
      });

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

  // Validation logic is now handled by OnboardingContext.validateData()
  // No need for duplicate validation function here

  // Save onboarding data
  const saveOnboardingData = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Validate data BEFORE saving (using context validation)
      const validation = validateData();

      if (!validation.isValid) {
        throw new Error(
          `Missing required information: ${validation.missingFields.join(', ')}. Please go back and complete all steps.`
        );
      }

      // For now, just save to AsyncStorage
      // Full UserService integration will come after proper backend setup
      await asyncStorageService.set('onboarding:complete', true);
      await asyncStorageService.set('onboarding:data', data);

      setIsSaved(true);

      // Trigger success haptic
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Success, {
        source: 'PremiumCompletionScreen.saveOnboardingData.success',
      });
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      setSaveError(error instanceof Error ? error.message : String(t('completion.saveFailed')));
      await triggerNotificationHaptic(Haptics.NotificationFeedbackType.Error, {
        source: 'PremiumCompletionScreen.saveOnboardingData.error',
      });
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

  // Handle completion - navigate to Main Dashboard
  const handleGetStarted = () => {
    if (!isSaved) return;

    // Call completion callback if provided
    onComplete?.();

    const parentNavigation =
      typeof navigation.getParent === 'function'
        ? navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
        : undefined;

    if (parentNavigation && typeof parentNavigation.reset === 'function') {
      parentNavigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      return;
    }

    // Fallback for test/mocked navigation objects
    if (typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    }
  };

  // Handle feature pill expansion
  const handleFeaturePillPress = useCallback(
    (featureId: string) => {
      const isAlreadySelected = expandedFeature === featureId;
      setExpandedFeature(isAlreadySelected ? null : featureId);

      if (!isAlreadySelected && scrollViewRef.current) {
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(featuresSectionYRef.current - 130, 0),
            animated: true,
          });
        });
      }

      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: 'PremiumCompletionScreen.handleFeaturePillPress',
      });
    },
    [expandedFeature]
  );

  const selectedFeature = useMemo(
    () =>
      FEATURE_HIGHLIGHTS.map((feature) => ({
        ...feature,
        text: String(
          t(`completion.features.${feature.translationKey}`, {
            defaultValue: feature.text,
          })
        ),
        description: String(
          t(`completion.features.${feature.translationKey}Desc`, {
            defaultValue: feature.description,
          })
        ),
      })).find((feature) => feature.id === expandedFeature) ?? null,
    [expandedFeature, t]
  );

  const featureHighlights = useMemo(
    () =>
      FEATURE_HIGHLIGHTS.map((feature) => ({
        ...feature,
        text: String(
          t(`completion.features.${feature.translationKey}`, {
            defaultValue: feature.text,
          })
        ),
        description: String(
          t(`completion.features.${feature.translationKey}Desc`, {
            defaultValue: feature.description,
          })
        ),
      })),
    [t]
  );

  // Format pattern name for display
  const getPatternName = (): string => getPatternDisplayName(data);

  // Format shift system
  const getShiftSystemName = (): string => {
    const displayName = getShiftSystemDisplayName(data.shiftSystem);
    return displayName === '3-Shift (8h)'
      ? String(
          t('completion.summary.shiftSystemThree', {
            defaultValue: '3-Shift System',
          })
        )
      : String(
          t('completion.summary.shiftSystemTwo', {
            defaultValue: '2-Shift System',
          })
        );
  };

  // Get roster type display name
  const getRosterTypeName = (): string => {
    return getRosterTypeDisplayName(data.rosterType) === 'FIFO'
      ? String(
          t('completion.summary.rosterTypeFIFO', {
            defaultValue: 'FIFO (Fly-In Fly-Out)',
          })
        )
      : String(
          t('completion.summary.rosterTypeRotating', {
            defaultValue: 'Rotating Roster',
          })
        );
  };

  // Get FIFO work pattern description
  const getFIFOShiftPatternName = (): string => getFIFOWorkPatternName(data.fifoConfig);

  // Get FIFO cycle description
  const getFIFOCycleSummary = (): string => {
    return getFIFOCycleDescription(data.fifoConfig).replace(', ', ' → ');
  };

  // Format date
  const formatDate = (date?: Date): string => {
    if (!date) return String(t('completion.summary.notSet', { defaultValue: 'Not set' }));
    const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
    const locale =
      language === 'pt-BR'
        ? 'pt-BR'
        : language === 'es'
          ? 'es-ES'
          : language === 'fr'
            ? 'fr-FR'
            : language === 'ar'
              ? 'ar'
              : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format shift times - returns array of shift time entries
  const getShiftTimeEntries = (): Array<{ label: string; value: string }> => {
    const shiftTimes = getShiftTimesFromData(data);
    const entries = shiftTimes.map((st) => ({
      label: `${st.type.charAt(0).toUpperCase() + st.type.slice(1)} Shift`,
      value: `${st.startTime} - ${st.endTime}`,
    }));

    // If no shift times configured, show placeholder
    if (entries.length === 0) {
      entries.push({
        label: String(t('completion.summary.shiftTimes', { defaultValue: 'Shift Times' })),
        value: String(t('completion.summary.notSet', { defaultValue: 'Not set' })),
      });
    }

    return entries;
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress Header */}
      <ProgressHeader
        currentStep={ONBOARDING_STEPS.COMPLETION}
        totalSteps={TOTAL_ONBOARDING_STEPS}
      />

      <ScrollView
        ref={scrollViewRef}
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

          {/* Confetti explosion */}
          <View style={styles.confettiContainer} pointerEvents="none">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={1000 + i * 20}
                angle={(Math.PI * 2 * i) / 30}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>

          {/* Sparkles around checkmark */}
          <View style={styles.sparklesContainer}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Sparkle
                key={i}
                delay={1000 + i * 100}
                angle={(Math.PI * 2 * i) / 6}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>

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
          {t('completion.title', { defaultValue: "You're all set!" })}
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          entering={reducedMotion ? undefined : FadeInDown.delay(500).duration(500)}
          style={styles.subtitle}
        >
          {t('completion.subtitle', { defaultValue: 'Welcome to Ellie' })}
        </Animated.Text>

        {/* Summary Card */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.delay(800).duration(500)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <Ionicons name="person-circle-outline" size={24} color={theme.colors.sacredGold} />
            <Text style={styles.summaryHeaderText}>
              {t('completion.summary.title', { defaultValue: 'Your profile' })}
            </Text>
          </View>

          <View style={styles.summaryContent}>
            {(
              [
                data.name
                  ? {
                      icon: 'person-outline',
                      label: String(t('completion.summary.name', { defaultValue: 'Name' })),
                      value: data.name,
                    }
                  : undefined,
                data.company
                  ? {
                      icon: 'business-outline',
                      label: String(t('completion.summary.company', { defaultValue: 'Company' })),
                      value: data.company,
                    }
                  : undefined,
                {
                  icon: 'swap-horizontal-outline',
                  label: String(
                    t('completion.summary.rosterType', { defaultValue: 'Roster Type' })
                  ),
                  value: getRosterTypeName(),
                },
                {
                  icon: 'layers-outline',
                  label: String(
                    t('completion.summary.shiftSystem', { defaultValue: 'Shift System' })
                  ),
                  value: getShiftSystemName(),
                },
                {
                  icon: 'refresh-outline',
                  label: String(t('completion.summary.pattern', { defaultValue: 'Pattern' })),
                  value: getPatternName(),
                },
                // FIFO-specific fields
                ...(data.rosterType === 'fifo'
                  ? [
                      {
                        icon: 'sync-outline',
                        label: String(t('completion.summary.cycle', { defaultValue: 'Cycle' })),
                        value: getFIFOCycleSummary(),
                      },
                      {
                        icon: 'partly-sunny-outline',
                        label: String(
                          t('completion.summary.workPattern', { defaultValue: 'Work Pattern' })
                        ),
                        value: getFIFOShiftPatternName(),
                      },
                    ]
                  : []),
                {
                  icon: 'calendar-outline',
                  label: String(t('completion.summary.startDate', { defaultValue: 'Start Date' })),
                  value: formatDate(data.startDate),
                },
                // Spread all shift time entries (supports multiple shifts)
                ...getShiftTimeEntries().map((entry) => ({
                  icon: 'time-outline',
                  label: entry.label,
                  value: entry.value,
                })),
              ] as Array<{ icon: string; label: string; value: string } | undefined>
            )
              .filter(Boolean)
              .map((item, index) => {
                // Type narrowing: After filter(Boolean), item is guaranteed to be defined
                const summaryItem = item as { icon: string; label: string; value: string };
                return (
                  <Animated.View
                    key={summaryItem.label}
                    entering={
                      reducedMotion
                        ? undefined
                        : FadeInRight.duration(400)
                            .delay(800 + index * 100)
                            .springify()
                    }
                    style={styles.summaryRow}
                  >
                    <Ionicons
                      name={summaryItem.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={theme.colors.sacredGold}
                    />
                    <View style={styles.summaryRowContent}>
                      <Text style={styles.summaryLabel}>{summaryItem.label}</Text>
                      <Text style={styles.summaryValue}>
                        {summaryItem.value ||
                          String(t('completion.summary.notSet', { defaultValue: 'Not set' }))}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
          </View>
        </Animated.View>

        {/* Feature Highlights */}
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.delay(1200).duration(500)}
          style={styles.featuresSection}
          onLayout={(event) => {
            featuresSectionYRef.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.featuresTitle}>
            {t('completion.featuresTitle', { defaultValue: 'What you can do with Ellie' })}
          </Text>

          {selectedFeature ? (
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(260)}
              exiting={reducedMotion ? undefined : FadeOutUp.duration(180)}
              style={styles.featureDetailCard}
            >
              <View style={styles.featureDetailHeader}>
                <Ionicons name={selectedFeature.icon} size={18} color={selectedFeature.color} />
                <Text style={styles.featureDetailTitle}>{selectedFeature.text}</Text>
              </View>
              <Text style={styles.featureDetailText}>{selectedFeature.description}</Text>
            </Animated.View>
          ) : (
            <Text style={styles.featureHintText}>
              {t('completion.featureHint', {
                defaultValue: 'Tap a feature chip to see more details.',
              })}
            </Text>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuresScroll}
          >
            {featureHighlights.map((feature, index) => (
              <Pressable key={feature.id} onPress={() => handleFeaturePillPress(feature.id)}>
                <Animated.View
                  entering={
                    reducedMotion ? undefined : FadeIn.delay(1500 + index * 100).duration(300)
                  }
                  style={[
                    styles.featurePill,
                    expandedFeature === feature.id && styles.featurePillExpanded,
                  ]}
                >
                  <View style={styles.featurePillContent}>
                    <Ionicons name={feature.icon} size={20} color={feature.color} />
                    <Text
                      style={[
                        styles.featurePillText,
                        expandedFeature === feature.id && styles.featurePillTextExpanded,
                      ]}
                    >
                      {feature.text}
                    </Text>
                  </View>
                </Animated.View>
              </Pressable>
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
              <Text style={styles.loadingText}>
                {t('completion.loading', { defaultValue: 'Setting up your calendar...' })}
              </Text>
            </View>
          ) : saveError ? (
            <PremiumButton
              title={t('completion.tryAgain', { defaultValue: 'Try Again' })}
              onPress={handleRetry}
              variant="primary"
              size="large"
              accessibilityLabel={t('completion.retryA11yLabel', {
                defaultValue: 'Retry saving your data',
              })}
              accessibilityHint={t('completion.retryA11yHint', {
                defaultValue: 'Tap to try saving your data again',
              })}
            />
          ) : (
            <PremiumButton
              title={t('welcome.getStarted')}
              onPress={handleGetStarted}
              variant="primary"
              size="large"
              disabled={!isSaved}
              accessibilityLabel={t('completion.getStartedA11yLabel', {
                defaultValue: 'Get started with Ellie',
              })}
              accessibilityHint={t('completion.getStartedA11yHint', {
                defaultValue: 'Tap to start using the app',
              })}
            />
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
  confettiContainer: {
    position: 'absolute',
    width: '100%',
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confettiParticle: {
    position: 'absolute',
  },
  confettiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sparklesContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
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
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  summaryRowContent: {
    flex: 1,
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
  featureHintText: {
    fontSize: 13,
    color: theme.colors.dust,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  featureDetailCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.opacity.gold20,
    backgroundColor: theme.colors.softStone,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  featureDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  featureDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.paper,
    flex: 1,
  },
  featureDetailText: {
    fontSize: 13,
    color: theme.colors.dust,
    lineHeight: 19,
  },
  featurePill: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.darkStone,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.sacredGold,
    marginRight: theme.spacing.sm,
    minWidth: 200,
  },
  featurePillExpanded: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: theme.colors.softStone,
  },
  featurePillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  featurePillText: {
    fontSize: 14,
    color: theme.colors.paper,
    flex: 1,
  },
  featurePillTextExpanded: {
    color: theme.colors.paleGold,
    fontWeight: '700',
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
