/**
 * Profile Screen E2E Tests
 *
 * Seeds a completed onboarding + mock auth state, navigates to the
 * Profile tab, and verifies profile screen elements and interactions.
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { seedStorage, clearE2ESeedKeys } from './helpers/storage';
import { MAIN_APP_SEED } from './helpers/testData';

const TIMEOUT = 10000;

async function navigateToProfile(): Promise<void> {
  await waitFor(element(by.id('tab-profile')))
    .toBeVisible()
    .withTimeout(TIMEOUT);
  await element(by.id('tab-profile')).tap();
  await waitFor(element(by.id('language-selector-button')))
    .toBeVisible()
    .withTimeout(TIMEOUT);
}

describe('Profile Screen', () => {
  beforeAll(async () => {
    seedStorage(MAIN_APP_SEED);
    await device.launchApp({ newInstance: true });
    await navigateToProfile();
  });

  afterAll(async () => {
    clearE2ESeedKeys();
  });

  beforeEach(async () => {
    // Re-navigate to profile if we drifted away during a test
    await navigateToProfile();
  });

  // ── Profile screen elements ───────────────────────────────────────────────

  describe('Profile screen layout', () => {
    it('shows the language selector', async () => {
      await detoxExpect(element(by.id('language-selector-button'))).toBeVisible();
    });
  });

  // ── Language selector ─────────────────────────────────────────────────────

  describe('Language selector', () => {
    it('opens language selector sheet on tap', async () => {
      await element(by.id('language-selector-button')).tap();
      // Language sheet should show at least one language option
      await waitFor(element(by.text('English')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });

    it('dismisses language sheet on backdrop tap', async () => {
      await element(by.id('language-selector-button')).tap();
      await waitFor(element(by.text('English')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
      // Dismiss by tapping outside the sheet
      await element(by.id('tab-profile')).tap();
      await waitFor(element(by.id('language-selector-button')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });
  });

  // ── Tab navigation from profile ───────────────────────────────────────────

  describe('Navigation from profile', () => {
    it('navigates back to home dashboard from profile tab', async () => {
      await element(by.id('tab-home')).tap();
      await waitFor(element(by.id('dashboard-header')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });
  });
});
