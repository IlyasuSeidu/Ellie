/**
 * Onboarding Navigation Utilities
 *
 * Centralized navigation helpers for onboarding flow.
 * Provides type-safe navigation with built-in validation and conditional routing logic.
 */

import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { ShiftPattern } from '@/types';
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
 * Updated to support both Rotating and FIFO roster paradigms
 */
const NAVIGATION_FLOW: Record<
  keyof OnboardingStackParamList,
  (data?: OnboardingData) => keyof OnboardingStackParamList | null
> = {
  Welcome: () => 'Introduction',
  Introduction: () => 'ShiftSystem',
  ShiftSystem: () => 'RosterType', // NEW: Go to roster type selection
  RosterType: () => 'ShiftPattern', // NEW: Roster type screen
  ShiftPattern: (data) => {
    // Complex conditional routing based on pattern type AND roster type

    // Custom rotating pattern
    if (data?.patternType === ShiftPattern.CUSTOM && data?.rosterType === 'rotating') {
      return 'CustomPattern';
    }

    // Custom FIFO pattern
    if (data?.patternType === ShiftPattern.FIFO_CUSTOM && data?.rosterType === 'fifo') {
      return 'FIFOCustomPattern';
    }

    // FIFO patterns (non-custom)
    if (data?.rosterType === 'fifo') {
      return 'FIFOPhaseSelector';
    }

    // Rotating patterns (non-custom) - default behavior
    return 'PhaseSelector';
  },
  CustomPattern: () => 'PhaseSelector', // Rotating custom → rotating phase
  FIFOCustomPattern: () => 'FIFOPhaseSelector', // NEW: FIFO custom → FIFO phase
  PhaseSelector: () => 'StartDate', // Rotating phase → start date
  FIFOPhaseSelector: () => 'StartDate', // NEW: FIFO phase → start date
  StartDate: () => 'ShiftTimeInput',
  ShiftTimeInput: () => 'Completion',
  Completion: () => null, // Final screen
};

/**
 * Navigate to the next screen in the onboarding flow
 *
 * Handles conditional routing (e.g., CustomPattern only if CUSTOM selected)
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
 * // Conditional navigation (ShiftPattern → CustomPattern or PhaseSelector)
 * goToNextScreen(navigation, 'ShiftPattern', data);
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
 * const nextScreen = getNextScreenName('ShiftPattern', data);
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
