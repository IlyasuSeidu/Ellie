/**
 * PremiumIntroductionScreen Component
 *
 * User introduction screen (Step 2 of 10) for collecting basic user information
 * Features staggered animations, real-time validation, and stone/gold theme
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { z } from 'zod';
import { theme } from '@/utils/theme';
import { ProgressHeader } from '@/components/onboarding/premium/ProgressHeader';
import { PremiumTextInput } from '@/components/onboarding/premium/PremiumTextInput';
import { PremiumButton } from '@/components/onboarding/premium/PremiumButton';
import { PremiumCountrySelectorModal } from '@/components/onboarding/premium/PremiumCountrySelectorModal';
import { Country } from '@/components/onboarding/premium/PremiumCountrySelector';

// Validation schema using Zod
const introductionSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  occupation: z.string().min(1, 'Occupation is required'),
  company: z.string().optional(),
  country: z.object({
    code: z.string(),
    name: z.string(),
    flag: z.string(),
  }),
});

type IntroductionFormData = z.infer<typeof introductionSchema>;

export interface PremiumIntroductionScreenProps {
  onContinue?: (data: IntroductionFormData) => void;
  testID?: string;
}

export const PremiumIntroductionScreen: React.FC<PremiumIntroductionScreenProps> = ({
  onContinue,
  testID = 'premium-introduction-screen',
}) => {
  // Form state
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Animation values
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const field1Opacity = useSharedValue(0);
  const field1TranslateY = useSharedValue(20);
  const field2Opacity = useSharedValue(0);
  const field2TranslateY = useSharedValue(20);
  const field3Opacity = useSharedValue(0);
  const field3TranslateY = useSharedValue(20);
  const field4Opacity = useSharedValue(0);
  const field4TranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);

  // Start animations on mount
  useEffect(() => {
    // Title animation
    titleOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    titleTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });

    // Subtitle animation
    subtitleOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // Hero animation
    heroOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

    // Staggered field animations
    field1Opacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    field1TranslateY.value = withDelay(600, withTiming(0, { duration: 300 }));

    field2Opacity.value = withDelay(700, withTiming(1, { duration: 300 }));
    field2TranslateY.value = withDelay(700, withTiming(0, { duration: 300 }));

    field3Opacity.value = withDelay(800, withTiming(1, { duration: 300 }));
    field3TranslateY.value = withDelay(800, withTiming(0, { duration: 300 }));

    field4Opacity.value = withDelay(900, withTiming(1, { duration: 300 }));
    field4TranslateY.value = withDelay(900, withTiming(0, { duration: 300 }));

    buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 300 }));
  }, [
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    heroOpacity,
    field1Opacity,
    field1TranslateY,
    field2Opacity,
    field2TranslateY,
    field3Opacity,
    field3TranslateY,
    field4Opacity,
    field4TranslateY,
    buttonOpacity,
  ]);

  // Animated styles
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
  }));

  const field1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: field1Opacity.value,
    transform: [{ translateY: field1TranslateY.value }],
  }));

  const field2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: field2Opacity.value,
    transform: [{ translateY: field2TranslateY.value }],
  }));

  const field3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: field3Opacity.value,
    transform: [{ translateY: field3TranslateY.value }],
  }));

  const field4AnimatedStyle = useAnimatedStyle(() => ({
    opacity: field4Opacity.value,
    transform: [{ translateY: field4TranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  // Validate individual field
  const validateField = (fieldName: keyof IntroductionFormData, value: unknown) => {
    try {
      const fieldSchema = introductionSchema.shape[fieldName];
      fieldSchema.parse(value);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({
          ...prev,
          [fieldName]: error.errors[0].message,
        }));
      }
    }
  };

  // Handle field blur
  const handleBlur = (fieldName: keyof IntroductionFormData) => {
    setTouchedFields((prev) => ({ ...prev, [fieldName]: true }));

    // Validate field on blur
    const fieldValue =
      fieldName === 'name'
        ? name
        : fieldName === 'occupation'
          ? occupation
          : fieldName === 'company'
            ? company
            : selectedCountry;

    validateField(fieldName, fieldValue);
  };

  // Validate entire form
  const validateForm = (): boolean => {
    try {
      introductionSchema.parse({
        name,
        occupation,
        company: company || undefined,
        country: selectedCountry,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    return (
      name.length >= 2 &&
      name.length <= 50 &&
      occupation.length > 0 &&
      selectedCountry !== null &&
      Object.keys(errors).length === 0
    );
  };

  // Handle continue
  const handleContinue = () => {
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      occupation: true,
      company: true,
      country: true,
    });

    if (validateForm() && selectedCountry) {
      onContinue?.({
        name,
        occupation,
        company: company || undefined,
        country: selectedCountry,
      });
    }
  };

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountrySelector(false);
    setTouchedFields((prev) => ({ ...prev, country: true }));
    validateField('country', country);
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Progress Header */}
      <ProgressHeader currentStep={2} totalSteps={10} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Animated.Text style={[styles.title, titleAnimatedStyle]}>
            Let&apos;s get to know you
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            Help us personalize your experience
          </Animated.Text>

          {/* Hero Illustration */}
          <Animated.View style={[styles.heroContainer, heroAnimatedStyle]}>
            <Image
              source={require('../../../../assets/onboarding/icons/consolidated/digital-id-badge.png')}
              style={styles.heroIcon}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field */}
            <Animated.View style={field1AnimatedStyle}>
              <PremiumTextInput
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (touchedFields.name) {
                    validateField('name', text);
                  }
                }}
                onBlur={() => handleBlur('name')}
                error={touchedFields.name ? errors.name : undefined}
                testID={`${testID}-name-input`}
              />
            </Animated.View>

            {/* Occupation Field */}
            <Animated.View style={field2AnimatedStyle}>
              <PremiumTextInput
                label="Occupation"
                placeholder="e.g., Mining Engineer"
                value={occupation}
                onChangeText={(text) => {
                  setOccupation(text);
                  if (touchedFields.occupation) {
                    validateField('occupation', text);
                  }
                }}
                onBlur={() => handleBlur('occupation')}
                error={touchedFields.occupation ? errors.occupation : undefined}
                testID={`${testID}-occupation-input`}
              />
            </Animated.View>

            {/* Company Field */}
            <Animated.View style={field3AnimatedStyle}>
              <PremiumTextInput
                label="Company"
                placeholder="e.g., ABC Mining Co."
                value={company}
                onChangeText={setCompany}
                onBlur={() => handleBlur('company')}
                testID={`${testID}-company-input`}
              />
            </Animated.View>

            {/* Country Field */}
            <Animated.View style={field4AnimatedStyle}>
              <PremiumTextInput
                label="Country"
                placeholder="Select your country"
                value={selectedCountry?.name || ''}
                onChangeText={() => {}}
                onPress={() => setShowCountrySelector(true)}
                editable={false}
                rightIcon={selectedCountry?.flag}
                error={touchedFields.country ? errors.country : undefined}
                testID={`${testID}-country-input`}
              />
            </Animated.View>
          </View>

          {/* Continue Button */}
          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <PremiumButton
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              size="large"
              disabled={!isFormValid()}
              testID={`${testID}-continue-button`}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Selector Modal */}
      <PremiumCountrySelectorModal
        visible={showCountrySelector}
        onSelect={handleCountrySelect}
        onClose={() => setShowCountrySelector(false)}
        selectedCountry={selectedCountry}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.paper,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    letterSpacing: 1.5,
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
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.dust,
    marginBottom: theme.spacing.xl,
    letterSpacing: 0.8,
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
  heroContainer: {
    marginBottom: theme.spacing.xl,
    alignSelf: 'flex-start',
    marginLeft: 5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 48,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  heroIcon: {
    width: 320,
    height: 320,
  },
  formContainer: {
    gap: theme.spacing.lg,
  },
  buttonContainer: {
    marginTop: theme.spacing.xxl,
    width: '100%',
  },
});

export default PremiumIntroductionScreen;
