/**
 * Onboarding Navigation Utilities
 *
 * Centralized navigation helpers for onboarding flow.
 * Provides type-safe navigation with built-in validation and conditional routing logic.
 */

import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import type { OnboardingData } from '@/contexts/OnboardingContext';

// Navigation type that accepts any navigation object with navigate method
type AnyNavigation = {
  navigate: (screen: string) => void;
  goBack: () => void;
  canGoBack: () => boolean;
};

/**
 * Navigation flow map
 * Defines the next screen for each onboarding step
 * Universal onboarding uses one schedule-builder step instead of separate
 * category, pattern, phase, date, and time screens.
 */
const NAVIGATION_FLOW: Record<
  keyof OnboardingStackParamList,
  (data?: OnboardingData) => keyof OnboardingStackParamList | null
> = {
  Welcome: () => 'PainHook',
  PainHook: () => 'Introduction',
  Introduction: () => 'UniversalShiftBuilder',
  UniversalShiftBuilder: () => 'AhaMoment',
  AhaMoment: () => 'Completion',
  Completion: () => null, // Final screen
};

/**
 * Navigate to the next screen in the onboarding flow
 *
 * Handles the compressed Universal Builder onboarding path.
 *
 * @param navigation - React Navigation navigation prop
 * @param currentScreen - Current screen name
 * @param onboardingData - Current onboarding data (for conditional routing)
 * @returns Next screen name or null if at end
 *
 * @example
 * ```typescript
 * import { goToNextScreen } from '@/utils/onboardingNavigation';
 *
 * // Simple navigation
 * goToNextScreen(navigation, 'Welcome');
 *
 * // Schedule setup navigation
 * goToNextScreen(navigation, 'Introduction', data);
 * ```
 */
export function goToNextScreen(
  navigation: AnyNavigation,
  currentScreen: keyof OnboardingStackParamList,
  onboardingData?: OnboardingData
): keyof OnboardingStackParamList | null {
  const getNextScreen = NAVIGATION_FLOW[currentScreen];
  const nextScreen = getNextScreen(onboardingData);

  if (nextScreen) {
    navigation.navigate(nextScreen as never);
  }

  return nextScreen;
}

/**
 * Navigate to the previous screen
 *
 * Uses React Navigation's goBack() which handles the navigation stack correctly.
 * For onboarding, users should ideally not go back (controlled flow),
 * but this is provided for edge cases or explicit back buttons.
 *
 * @param navigation - React Navigation navigation prop
 *
 * @example
 * ```typescript
 * import { goToPreviousScreen } from '@/utils/onboardingNavigation';
 *
 * goToPreviousScreen(navigation);
 * ```
 */
export function goToPreviousScreen(navigation: AnyNavigation): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}

/**
 * Check if current screen can navigate forward
 *
 * @param currentScreen - Current screen name
 * @returns True if there's a next screen
 *
 * @example
 * ```typescript
 * import { canGoNext } from '@/utils/onboardingNavigation';
 *
 * if (canGoNext('Welcome')) {
 *   // Show continue button
 * }
 * ```
 */
export function canGoNext(currentScreen: keyof OnboardingStackParamList): boolean {
  return NAVIGATION_FLOW[currentScreen]() !== null;
}

/**
 * Get the next screen name without navigating
 *
 * Useful for preview or validation
 *
 * @param currentScreen - Current screen name
 * @param onboardingData - Current onboarding data
 * @returns Next screen name or null
 *
 * @example
 * ```typescript
 * import { getNextScreenName } from '@/utils/onboardingNavigation';
 *
 * const nextScreen = getNextScreenName('Introduction', data);
 * console.log(`Next screen will be: ${nextScreen}`);
 * ```
 */
export function getNextScreenName(
  currentScreen: keyof OnboardingStackParamList,
  onboardingData?: OnboardingData
): keyof OnboardingStackParamList | null {
  const getNextScreen = NAVIGATION_FLOW[currentScreen];
  return getNextScreen(onboardingData);
}
