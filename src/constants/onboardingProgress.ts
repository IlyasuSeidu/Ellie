/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers.
 *
 * Flow (Rotating):  Welcome → Introduction → ShiftSystem → RosterType → ShiftPattern
 *                   → [CustomPattern] → PhaseSelector → StartDate → ShiftTimeInput → Completion
 *
 * Flow (FIFO):      Welcome → Introduction → ShiftSystem → RosterType → ShiftPattern
 *                   → [FIFOCustomPattern] → FIFOPhaseSelector → StartDate → ShiftTimeInput → Completion
 *
 * RosterType is always shown (3-shift skips it via navigation, but the screen exists).
 * Conditional screens (CustomPattern / FIFOCustomPattern) share the same visual step as ShiftPattern.
 * Total visible steps for the user is 9 (non-conditional) or 10 (with conditional custom screen).
 * We display 9 as the base total so the progress bar doesn't jump backwards on conditional screens.
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  INTRODUCTION: 2,
  SHIFT_SYSTEM: 3,
  ROSTER_TYPE: 4,
  SHIFT_PATTERN: 5,
  CUSTOM_PATTERN: 5, // Conditional — same visual step as SHIFT_PATTERN
  FIFO_CUSTOM_PATTERN: 5, // Conditional — same visual step as SHIFT_PATTERN (FIFO path)
  PHASE_SELECTOR: 6,
  FIFO_PHASE_SELECTOR: 6, // Same visual step as PHASE_SELECTOR (FIFO path)
  START_DATE: 7,
  SHIFT_TIME_INPUT: 8,
  COMPLETION: 9,
} as const;

/**
 * Total number of onboarding steps shown in the progress bar.
 * Conditional screens share a step number so the bar never appears to go backwards.
 */
export const TOTAL_ONBOARDING_STEPS = 9;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
