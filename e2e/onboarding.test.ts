/**
 * Onboarding Flow E2E Tests
 *
 * Seeds a mock authenticated user (no onboarding complete) so the app boots
 * directly into the onboarding stack, then exercises the live rotating-roster
 * happy path:
 *
 *   Welcome → PainHook → Introduction → ShiftSystem → RosterType →
 *   ShiftPattern → PhaseSelector → StartDate → ShiftTimeInput →
 *   AhaMoment → Completion
 *
 * Synchronization stays disabled because the onboarding flow uses continuous
 * animations and timed chat transitions that otherwise keep Detox busy.
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { clearE2ESeedKeys, seedStorage } from './helpers/storage';
import { ONBOARDING_START_SEED } from './helpers/testData';

const SHORT = 6000;
const LONG = 20000;
const XLONG = 30000;

const INTRO_BASE = 'premium-introduction-screen-chat-input';
const INTRO_INPUT = `${INTRO_BASE}-input`;
const INTRO_SUBMIT = `${INTRO_BASE}-submit`;
const INTRO_SKIP_COMPANY = `${INTRO_BASE}-quick-reply-skip`;

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExist(testID: string, timeout = LONG): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toExist()
    .withTimeout(timeout);
}

async function waitForVisible(testID: string, timeout = LONG): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

async function tapAndWait(tapID: string, nextID: string, timeout = LONG): Promise<void> {
  await element(by.id(tapID)).tap();
  await waitForVisible(nextID, timeout);
  await pause(900);
}

async function submitIntroAnswer(answer: string): Promise<void> {
  await waitForVisible(INTRO_INPUT, XLONG);
  await element(by.id(INTRO_INPUT)).replaceText(answer);
  await element(by.id(INTRO_SUBMIT)).tap();
}

describe('Onboarding Flow — rotating roster happy path', () => {
  beforeAll(async () => {
    seedStorage(ONBOARDING_START_SEED);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  afterAll(async () => {
    await device.enableSynchronization();
    clearE2ESeedKeys();
  });

  it('walks from Welcome to Completion on the simulator', async () => {
    // Welcome
    await waitForVisible('premium-welcome-screen-button', LONG);
    await tapAndWait('premium-welcome-screen-button', 'pain-hook-card-cycle_lost', LONG);

    // Pain hook
    await waitForVisible('pain-hook-card-cycle_lost', LONG);
    await element(by.id('pain-hook-card-cycle_lost')).swipe('right', 'fast', 0.8);
    await waitForVisible('pain-hook-continue-button', LONG);
    await pause(900);
    await tapAndWait('pain-hook-continue-button', 'premium-introduction-screen', LONG);

    // Introduction
    await waitForVisible('premium-introduction-screen', LONG);
    await submitIntroAnswer('Ilyasu');
    await submitIntroAnswer('Miner');
    await waitForVisible(INTRO_SKIP_COMPANY, XLONG);
    await element(by.id(INTRO_SKIP_COMPANY)).tap();
    await submitIntroAnswer('Australia');
    await waitForVisible('shift-system-card-2-shift', XLONG);

    // Shift system
    await waitForExist('progress-header', SHORT);
    await waitForVisible('shift-system-card-2-shift', SHORT);
    await tapAndWait('shift-system-e2e-select-button', 'roster-type-progress-header', XLONG);
    await pause(900);

    // Roster type
    await waitForVisible('roster-type-progress-header', SHORT);
    await waitForVisible('roster-type-e2e-next-button', LONG);
    await element(by.id('roster-type-e2e-next-button')).tap();
    await pause(600);
    await tapAndWait('roster-type-e2e-select-button', 'premium-shift-pattern-screen', XLONG);
    await pause(900);

    // Shift pattern
    await waitForExist('premium-shift-pattern-screen', SHORT);
    await waitForVisible('premium-shift-pattern-screen-card-4-4-4', LONG);
    await tapAndWait('shift-pattern-e2e-select-button', 'phase-selector-screen', XLONG);
    await pause(900);

    // Phase selector: first choose phase, then day within phase
    await waitForExist('phase-selector-screen', SHORT);
    await waitForVisible('phase-selector-card-stack', SHORT);
    await tapAndWait('phase-selector-e2e-select-button', 'phase-selector-card-stack', XLONG);
    await pause(600);
    await tapAndWait('phase-selector-e2e-select-button', 'premium-start-date-screen', XLONG);

    // Start date
    await waitForExist('premium-start-date-screen', SHORT);
    await waitForExist('start-date-back-button', SHORT);
    await waitForExist('start-date-continue-button', SHORT);
    await tapAndWait('start-date-continue-button', 'premium-shift-time-input-screen', XLONG);

    // Shift time input
    await waitForExist('premium-shift-time-input-screen', SHORT);
    await waitForExist('shift-time-back-button', SHORT);
    await waitForExist('shift-time-continue-button', SHORT);
    await tapAndWait('shift-time-continue-button', 'aha-moment-primary-cta', XLONG);

    // Aha moment
    await waitForVisible('aha-moment-primary-cta', XLONG);
    await waitForExist('aha-moment-secondary-cta', LONG);
    await tapAndWait('aha-moment-secondary-cta', 'premium-completion-screen', XLONG);

    // Completion
    await waitForExist('premium-completion-screen', LONG);
    await waitForVisible('completion-get-started-button', XLONG);
    await detoxExpect(element(by.id('completion-get-started-button'))).toBeVisible();
  });
});
