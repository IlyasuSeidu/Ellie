/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers.
 * Initial flow now skips Introduction and routes:
 * Welcome -> ShiftSystem -> RosterType -> ShiftPattern -> Phase Selector -> StartDate
 * -> AhaMoment -> ShiftTimeInput -> Completion.
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  // Introduction removed from initial flow — no step number
  SHIFT_SYSTEM: 2,
  ROSTER_TYPE: 3,
  SHIFT_PATTERN: 4,
  CUSTOM_PATTERN: 4, // Conditional — same visual step as SHIFT_PATTERN
  FIFO_CUSTOM_PATTERN: 4, // Conditional — same visual step as SHIFT_PATTERN (FIFO)
  PHASE_SELECTOR: 5, // SWIPE — DO NOT TOUCH THE SCREEN
  FIFO_PHASE_SELECTOR: 5, // SWIPE — DO NOT TOUCH THE SCREEN
  START_DATE: 6,
  AHA_MOMENT: 7, // New paywall gateway screen
  SHIFT_TIME_INPUT: 8,
  COMPLETION: 8,
} as const;

export const TOTAL_ONBOARDING_STEPS = 7;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
