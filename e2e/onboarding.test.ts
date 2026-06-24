/**
 * Onboarding Flow E2E Tests
 *
 * Seeds a mock authenticated user (no onboarding complete) so the app boots
 * directly into the onboarding stack, then exercises the live rotating-roster
 * entry path:
 *
 *   Welcome → PainHook → Introduction → UniversalShiftBuilder
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
  await element(by.id(INTRO_INPUT)).tap();
  await element(by.id(INTRO_INPUT)).replaceText(answer);
  await pause(300);
  await element(by.id(INTRO_INPUT)).tapReturnKey();
  await pause(2500);
}

describe('Onboarding Flow — fresh builder entry path', () => {
  beforeAll(async () => {
    seedStorage(ONBOARDING_START_SEED);
    await device.launchApp({ newInstance: true });
    await device.disableSynchronization();
  });

  afterAll(async () => {
    await device.enableSynchronization();
    clearE2ESeedKeys();
  });

  it('walks from Welcome to the Universal Shift Builder on the simulator', async () => {
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
    await submitIntroAnswer('Amina');
    await submitIntroAnswer('Nurse');
    await submitIntroAnswer('City Hospital');
    await submitIntroAnswer('Australia');
    await waitForExist('universal-shift-builder-screen', XLONG);
    await detoxExpect(element(by.id('universal-shift-builder-template-search'))).toBeVisible();
  });
});
