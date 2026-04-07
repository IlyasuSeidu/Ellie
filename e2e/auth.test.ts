/**
 * Auth Flow E2E Tests
 *
 * Covers SignIn, SignUp, and ForgotPassword screens.
 * No authentication is performed — tests only validate form behaviour
 * and navigation between auth screens (all testable without a real account).
 */

import { device, element, by, expect as detoxExpect } from 'detox';

describe('Auth Flow', () => {
  beforeAll(async () => {
    // Launch the app fresh with no seeded auth state → auth screens
    await device.launchApp({ newInstance: true, delete: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ── Sign-in screen ────────────────────────────────────────────────────────

  describe('Sign-in screen', () => {
    it('shows sign-in and social sign-in buttons', async () => {
      await detoxExpect(element(by.id('sign-in-button'))).toBeVisible();
      await detoxExpect(element(by.id('google-sign-in-button'))).toBeVisible();
      await detoxExpect(element(by.id('apple-sign-in-button'))).toBeVisible();
    });

    it('shows links to create account and forgot password', async () => {
      await detoxExpect(element(by.id('create-account-link'))).toBeVisible();
      await detoxExpect(element(by.id('forgot-password-link'))).toBeVisible();
    });

    it('validates empty email and password on sign-in tap', async () => {
      await element(by.id('sign-in-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
      await detoxExpect(element(by.text('Password is required'))).toBeVisible();
    });

    it('validates email format on sign-in tap', async () => {
      await element(by.id('email-input')).typeText('notanemail');
      await element(by.id('sign-in-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    });
  });

  // ── Navigation: Sign-in ↔ Sign-up ────────────────────────────────────────

  describe('Sign-in ↔ Sign-up navigation', () => {
    it('navigates to sign-up on create-account-link tap', async () => {
      await element(by.id('create-account-link')).tap();
      await detoxExpect(element(by.id('create-account-button'))).toBeVisible();
    });

    it('navigates back to sign-in from sign-up via sign-in-link', async () => {
      await element(by.id('create-account-link')).tap();
      await element(by.id('sign-in-link')).tap();
      await detoxExpect(element(by.id('sign-in-button'))).toBeVisible();
    });
  });

  // ── Sign-up screen ────────────────────────────────────────────────────────

  describe('Sign-up screen', () => {
    beforeEach(async () => {
      await element(by.id('create-account-link')).tap();
    });

    it('shows all sign-up form elements', async () => {
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible();
      await detoxExpect(element(by.id('confirm-password-input'))).toBeVisible();
      await detoxExpect(element(by.id('create-account-button'))).toBeVisible();
    });

    it('shows social sign-up buttons', async () => {
      await detoxExpect(element(by.id('google-sign-up-button'))).toBeVisible();
      await detoxExpect(element(by.id('apple-sign-up-button'))).toBeVisible();
    });

    it('validates empty fields on create-account tap', async () => {
      await element(by.id('create-account-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    });

    it('validates invalid email format', async () => {
      await element(by.id('email-input')).typeText('bad-email');
      await element(by.id('create-account-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    });

    it('validates password mismatch', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Password123');
      await element(by.id('confirm-password-input')).typeText('Password321');
      await element(by.id('confirm-password-input')).tapReturnKey();
      await element(by.id('create-account-button')).tap();
      await detoxExpect(element(by.text('Passwords do not match'))).toExist();
    });
  });

  // ── Forgot-password screen ────────────────────────────────────────────────

  describe('Forgot-password screen', () => {
    beforeEach(async () => {
      await element(by.id('forgot-password-link')).tap();
    });

    it('shows forgot-password form', async () => {
      await detoxExpect(element(by.id('send-reset-link-button'))).toBeVisible();
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
    });

    it('shows back-to-sign-in link', async () => {
      await detoxExpect(element(by.id('back-to-sign-in-button'))).toBeVisible();
    });

    it('navigates back to sign-in via back button', async () => {
      await element(by.id('back-to-sign-in-button')).tap();
      await detoxExpect(element(by.id('sign-in-button'))).toBeVisible();
    });

    it('validates empty email on send-reset-link tap', async () => {
      await element(by.id('send-reset-link-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    });

    it('validates invalid email format on send-reset-link tap', async () => {
      await element(by.id('email-input')).typeText('notanemail');
      await element(by.id('send-reset-link-button')).tap();
      await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    });
  });
});
