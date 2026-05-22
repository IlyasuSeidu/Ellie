/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers.
 * Initial flow routes:
 * Welcome -> PainHook -> Introduction -> UniversalShiftBuilder -> AhaMoment -> Completion.
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  PAIN_HOOK: 2,
  INTRODUCTION: 3,
  UNIVERSAL_SHIFT_BUILDER: 4,
  AHA_MOMENT: 5, // Paywall gateway screen
  COMPLETION: 6,
} as const;

export const TOTAL_ONBOARDING_STEPS = 6;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
