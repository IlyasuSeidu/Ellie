/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  INTRODUCTION: 2,
  SHIFT_SYSTEM: 3,
  SHIFT_PATTERN: 4,
  CUSTOM_PATTERN: 4, // Conditional - same step as SHIFT_PATTERN
  PHASE_SELECTOR: 5,
  START_DATE: 6,
  SHIFT_TIME_INPUT: 7,
  COMPLETION: 8,
} as const;

/**
 * Total number of screens in onboarding flow
 * Note: Custom Pattern is conditional, so total is 8 screens
 */
export const TOTAL_ONBOARDING_STEPS = 8;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
