/**
 * Launch-critical mobile fit E2E smoke.
 *
 * This does not replace deeper flow tests. It verifies that the first-run,
 * authenticated dashboard, profile/settings, and builder surfaces expose their
 * primary controls on a phone viewport after the Ryvro identity migration.
 */

import { by, device, element, expect as detoxExpect, waitFor } from 'detox';
import { clearE2ESeedKeys, seedStorage } from './helpers/storage';
import { MAIN_APP_SEED, ONBOARDING_START_SEED } from './helpers/testData';

const TIMEOUT = 20000;
const IS_IOS = device.getPlatform() === 'ios';

async function launchWithoutSeed(): Promise<void> {
  try {
    await device.terminateApp();
  } catch {
    // The app may not be running yet.
  }
  clearE2ESeedKeys();
  await device.launchApp({ newInstance: true });
}

async function launchWithSeed(seed: Record<string, unknown>): Promise<void> {
  try {
    await device.terminateApp();
  } catch {
    // The app may not be running yet.
  }
  seedStorage(seed);
  await device.launchApp({ newInstance: true });
}

async function waitVisible(testID: string, timeout = TIMEOUT): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

async function waitExists(testID: string, timeout = TIMEOUT): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toExist()
    .withTimeout(timeout);
}

async function scrollVisible(
  testID: string,
  scrollViewID: string,
  direction: 'up' | 'down'
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id(scrollViewID))
    .scroll(320, direction, 0.5, 0.55);
}

describe('Launch-critical mobile fit', () => {
  afterEach(async () => {
    clearE2ESeedKeys();
  });

  it('shows primary auth controls on the signed-out launch screen', async () => {
    await launchWithoutSeed();

    await waitVisible('email-input');
    await waitVisible('password-input');
    await waitVisible('sign-in-button');
    await waitVisible('google-sign-in-button');
    if (IS_IOS) {
      await waitVisible('apple-sign-in-button');
    }
    await waitVisible('create-account-link');
    await waitVisible('forgot-password-link');
  });

  it('shows the first-run onboarding entry on a fresh authenticated launch', async () => {
    await launchWithSeed(ONBOARDING_START_SEED);

    await waitVisible('premium-welcome-screen-button');
  });

  it('shows dashboard, profile, and builder controls after onboarding is complete', async () => {
    await launchWithSeed(MAIN_APP_SEED);

    await waitVisible('dashboard-scroll-view');
    await waitVisible('dashboard-header');
    await waitVisible('dashboard-shift-status');
    await waitVisible('shift-status-universal-icon');
    await scrollVisible('dashboard-calendar', 'dashboard-scroll-view', 'down');
    await waitExists('calendar-grid-container');

    await waitVisible('tab-profile');
    await element(by.id('tab-profile')).tap();
    await scrollVisible('language-selector-button', 'profile-screen', 'down');
    await waitVisible('language-selector-current-value');
    await element(by.id('profile-screen')).scroll(1100, 'up', 0.5, 0.35);
    await waitVisible('shift-settings-builder-card-button');
    await element(by.id('shift-settings-builder-card-button')).tap();
    await waitVisible('universal-shift-builder-header-save-button');
    await waitVisible('universal-shift-builder-template-search');

    await detoxExpect(element(by.id('universal-shift-builder-screen'))).toExist();
  });
});
