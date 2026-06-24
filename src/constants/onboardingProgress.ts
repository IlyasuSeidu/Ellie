/**
 * Onboarding Progress Configuration
 *
 * Centralized source of truth for onboarding step numbers.
 * Initial flow routes:
 * Welcome -> SetupIntro -> GuidedShiftChatSetup -> ShiftTimesSetup
 * -> KnownShiftDateSetup -> KnownShiftTypeSetup -> KnownShiftPhaseSetup
 * -> SchedulePreviewSetup -> SetupSummary -> ReminderSetup -> AhaMoment
 * -> Completion.
 */

export const ONBOARDING_STEPS = {
  WELCOME: 1,
  SETUP_INTRO: 2,
  GUIDED_SHIFT_CHAT: 3,
  SHIFT_TIMES: 4,
  KNOWN_SHIFT_DATE: 5,
  KNOWN_SHIFT_TYPE: 6,
  KNOWN_SHIFT_PHASE: 7,
  SCHEDULE_PREVIEW: 8,
  SETUP_SUMMARY: 9,
  REMINDER_SETUP: 10,
  AHA_MOMENT: 11, // Paywall gateway screen
  COMPLETION: 12,
} as const;

export const TOTAL_ONBOARDING_STEPS = 12;

/**
 * Get step number for a given screen
 */
export function getStepNumber(screenName: keyof typeof ONBOARDING_STEPS): number {
  return ONBOARDING_STEPS[screenName];
}
