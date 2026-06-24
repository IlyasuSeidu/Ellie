/**
 * Profile Screen E2E Tests
 *
 * Seeds a completed onboarding + mock auth state, navigates to the
 * Profile tab, and verifies profile screen elements and interactions.
 */

import { device, element, by, waitFor } from 'detox';
import { seedStorage, clearE2ESeedKeys } from './helpers/storage';
import { MAIN_APP_SEED } from './helpers/testData';

const TIMEOUT = 20000;

async function navigateToProfile(): Promise<void> {
  await waitFor(element(by.id('tab-profile')))
    .toBeVisible()
    .withTimeout(TIMEOUT);
  await element(by.id('tab-profile')).tap();
  await waitFor(element(by.id('language-selector-button')))
    .toBeVisible()
    .whileElement(by.id('profile-screen'))
    .scroll(250, 'down', 0.5, 0.5);
}

describe('Profile Screen', () => {
  afterAll(async () => {
    clearE2ESeedKeys();
  });

  beforeEach(async () => {
    // Start each case from seeded main-app state so modal/navigation state
    // from one check cannot poison the next check.
    seedStorage(MAIN_APP_SEED);
    await device.launchApp({ newInstance: true });
    await navigateToProfile();
  });

  // ── Profile screen elements ───────────────────────────────────────────────

  describe('Profile screen layout', () => {
    it('shows the language selector', async () => {
      await waitFor(element(by.id('language-selector-button')))
        .toBeVisible()
        .whileElement(by.id('profile-screen'))
        .scroll(250, 'down', 0.5, 0.5);
    });
  });

  // ── Language selector ─────────────────────────────────────────────────────

  describe('Language selector', () => {
    it('opens language selector sheet on tap', async () => {
      await element(by.id('language-selector-button')).tap();
      // Language sheet should show at least one language option.
      await waitFor(element(by.id('language-option-en')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });

    it('switches language', async () => {
      await element(by.id('language-selector-button')).tap();
      await waitFor(element(by.id('language-option-es')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
      await element(by.id('language-option-es')).tap();
      await waitFor(element(by.text('Español')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });
  });

  describe('Universal Shift Builder entry', () => {
    it('opens the builder from settings in edit mode', async () => {
      await element(by.id('profile-screen')).scroll(1100, 'up', 0.5, 0.35);
      await waitFor(element(by.id('shift-settings-builder-card-button')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
      await element(by.id('shift-settings-builder-card-button')).tap();
      await waitFor(element(by.id('universal-shift-builder-header-save-button')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });
  });
});
