/**
 * E2E Test Data Fixtures
 *
 * Provides seeded state objects for different test scenarios.
 * Values are keyed by logical AsyncStorageService keys (without "app:" prefix).
 */

/** Minimal mock user that satisfies the auth bypass check in AuthContext */
export const MOCK_USER = {
  uid: 'e2e-test-uid-001',
  email: 'e2e@test.ellie',
  emailVerified: true,
  providerData: [],
  displayName: 'E2E Tester',
};

/** Completed onboarding data for a rotating 4-4-4 roster */
export const MOCK_ONBOARDING_DATA = {
  name: 'E2E Tester',
  occupation: 'Miner',
  company: 'Test Mine Co.',
  country: 'Australia',
  shiftSystem: '2-shift',
  rosterType: 'rotating',
  patternType: 'STANDARD_4_4_4',
  phaseOffset: 0,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  shiftTimes: {
    dayShift: { hour: 6, minute: 0 },
    nightShift: { hour: 18, minute: 0 },
  },
};

/**
 * Storage seed for tests that start at the onboarding Welcome screen.
 * Auth is set but onboarding is NOT complete.
 */
export const ONBOARDING_START_SEED: Record<string, unknown> = {
  'e2e:mock_user': MOCK_USER,
};

/**
 * Storage seed for tests that need the full main app (dashboard/profile).
 * Auth and onboarding are both complete.
 */
export const MAIN_APP_SEED: Record<string, unknown> = {
  'e2e:mock_user': MOCK_USER,
  'onboarding:complete': true,
  'onboarding:data': MOCK_ONBOARDING_DATA,
};
