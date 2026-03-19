/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers.
 * Initial flow routes:
 * Welcome -> PainHook -> Introduction -> ShiftSystem -> RosterType -> ShiftPattern
 * -> Phase Selector -> StartDate -> ShiftTimeInput -> AhaMoment -> Completion.
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  PAIN_HOOK: 2,
  INTRODUCTION: 3,
  SHIFT_SYSTEM: 4,
  ROSTER_TYPE: 5,
  SHIFT_PATTERN: 6,
  CUSTOM_PATTERN: 6, // Conditional — same visual step as SHIFT_PATTERN
  FIFO_CUSTOM_PATTERN: 6, // Conditional — same visual step as SHIFT_PATTERN (FIFO)
  PHASE_SELECTOR: 7, // SWIPE — DO NOT TOUCH THE SCREEN
  FIFO_PHASE_SELECTOR: 7, // SWIPE — DO NOT TOUCH THE SCREEN
  START_DATE: 8,
  SHIFT_TIME_INPUT: 9,
  AHA_MOMENT: 10, // Paywall gateway screen
  COMPLETION: 10,
} as const;

export const TOTAL_ONBOARDING_STEPS = 10;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
