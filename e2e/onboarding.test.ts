/**
 * Onboarding Flow E2E Tests
 *
 * Seeds a mock authenticated user (no onboarding complete) so the app boots
 * directly into the onboarding stack, then exercises the live rotating-roster
 * happy path:
 *
 *   Welcome → PainHook → Introduction → UniversalShiftBuilder →
 *   AhaMoment → Completion
 *
 * Synchronization stays disabled because the onboarding flow uses continuous
 * animations and timed chat transitions that otherwise keep Detox busy.
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { clearE2ESeedKeys, seedStorage } from './helpers/storage';
import { ONBOARDING_START_SEED } from './helpers/testData';

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

async function scrollToVisible(testID: string, scrollViewID: string): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id(scrollViewID))
    .scroll(300, 'down', 0.5, 0.75);
}

async function tapAndWait(tapID: string, nextID: string, timeout = LONG): Promise<void> {
  await element(by.id(tapID)).tap();
  await waitForVisible(nextID, timeout);
  await pause(900);
}

async function submitIntroAnswer(answer: string): Promise<void> {
  await waitForVisible(INTRO_INPUT, XLONG);
  await element(by.id(INTRO_INPUT)).tap();
  await element(by.id(INTRO_INPUT)).replaceText(answer);
  await waitForVisible(INTRO_SUBMIT, LONG);
  await element(by.id(INTRO_SUBMIT)).tap();
  await pause(700);
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
    await waitForVisible('universal-shift-builder-screen', XLONG);

    // Universal shift builder
    await waitForVisible('universal-shift-builder-template-healthcare-2-2-3', LONG);
    await element(by.id('universal-shift-builder-template-healthcare-2-2-3')).tap();
    await waitForVisible('universal-shift-builder-dirty-indicator', LONG);
    await waitForVisible('universal-shift-builder-save-button', LONG);
    await element(by.id('universal-shift-builder-save-button')).tap();
    await waitForExist('aha-moment-scroll-view', XLONG);

    // Aha moment
    await scrollToVisible('aha-moment-primary-cta', 'aha-moment-scroll-view');
    await scrollToVisible('aha-moment-secondary-cta', 'aha-moment-scroll-view');
    await element(by.id('aha-moment-secondary-cta')).tap();
    await waitForVisible('premium-completion-screen', XLONG);

    // Completion
    await waitForExist('premium-completion-screen', LONG);
    await scrollToVisible('completion-get-started-button', 'completion-scroll-view');
    await detoxExpect(element(by.id('completion-get-started-button'))).toBeVisible();
  });
});
