/**
 * Main Dashboard E2E Tests
 *
 * Seeds a completed onboarding + mock auth state so the app boots
 * directly into the Main tab navigator (Dashboard tab).
 */

import { device, element, by, expect as detoxExpect, waitFor } from 'detox';
import { seedStorage, clearE2ESeedKeys } from './helpers/storage';
import { MAIN_APP_SEED } from './helpers/testData';

const TIMEOUT = 10000;

describe('Main Dashboard', () => {
  beforeAll(async () => {
    seedStorage(MAIN_APP_SEED);
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    clearE2ESeedKeys();
  });

  beforeEach(async () => {
    // Ensure we're on the Home tab before each test
    await waitFor(element(by.id('tab-home')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('tab-home')).tap();
    await waitFor(element(by.id('dashboard-scroll-view')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });

  async function scrollDashboardTo(testID: string): Promise<void> {
    await waitFor(element(by.id(testID)))
      .toBeVisible()
      .whileElement(by.id('dashboard-scroll-view'))
      .scroll(120, 'down', 0.5, 0.5);
  }

  // ── Dashboard structure ───────────────────────────────────────────────────

  describe('Dashboard layout', () => {
    it('renders the dashboard header', async () => {
      await waitFor(element(by.id('dashboard-header')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });

    it('renders the shift status card', async () => {
      await detoxExpect(element(by.id('dashboard-shift-status'))).toBeVisible();
    });

    it('renders the calendar card', async () => {
      await scrollDashboardTo('dashboard-calendar');
      await detoxExpect(element(by.id('dashboard-calendar'))).toBeVisible();
    });

    it('renders the stats card', async () => {
      await detoxExpect(element(by.id('dashboard-stats'))).toExist();
    });
  });

  // ── Shift status ─────────────────────────────────────────────────────────

  describe('Shift status card', () => {
    it('shows the shift status badge', async () => {
      await detoxExpect(element(by.id('shift-status-badge'))).toBeVisible();
    });

    it('shows the shift status badge icon', async () => {
      await detoxExpect(element(by.id('shift-status-badge-icon'))).toBeVisible();
    });

    it('shows the universal shift icon from the active template', async () => {
      await detoxExpect(element(by.id('shift-status-universal-icon'))).toBeVisible();
    });
  });

  // ── Calendar ──────────────────────────────────────────────────────────────

  describe('Calendar card', () => {
    it('renders calendar grid', async () => {
      await detoxExpect(element(by.id('calendar-grid-container'))).toExist();
    });

    it('renders at least one calendar day cell', async () => {
      // Day 1 cell always exists in any valid month
      await detoxExpect(element(by.id('calendar-day-1'))).toBeVisible();
    });
  });

  // ── Stats card ────────────────────────────────────────────────────────────

  describe('Stats card', () => {
    it('shows work days stat', async () => {
      await scrollDashboardTo('stat-work-days');
      await detoxExpect(element(by.id('stat-work-days'))).toBeVisible();
    });

    it('shows off days stat', async () => {
      await detoxExpect(element(by.id('stat-off-days'))).toExist();
    });

    it('shows balance stat', async () => {
      await detoxExpect(element(by.id('stat-balance'))).toExist();
    });
  });

  // ── Tab navigation ────────────────────────────────────────────────────────

  describe('Tab bar navigation', () => {
    it('shows home tab button', async () => {
      await detoxExpect(element(by.id('tab-home'))).toBeVisible();
    });

    it('shows profile tab button', async () => {
      await detoxExpect(element(by.id('tab-profile'))).toBeVisible();
    });

    it('shows centerRyvro mic button', async () => {
      await detoxExpect(element(by.id('center-mic-gradient'))).toBeVisible();
    });

    it('navigates to profile tab and back to home', async () => {
      await element(by.id('tab-profile')).tap();
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(TIMEOUT);

      await element(by.id('tab-home')).tap();
      await waitFor(element(by.id('dashboard-scroll-view')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
    });
  });
});
