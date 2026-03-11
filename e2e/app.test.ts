import { device, element, by, expect as detoxExpect } from 'detox';

describe('Ellie Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows sign-in screen by default', async () => {
    await detoxExpect(element(by.id('sign-in-button'))).toBeVisible();
    await detoxExpect(element(by.id('google-sign-in-button'))).toBeVisible();
  });

  it('navigates from sign in to sign up and back', async () => {
    await element(by.id('create-account-link')).tap();
    await detoxExpect(element(by.id('create-account-button'))).toBeVisible();

    await element(by.id('sign-in-link')).tap();
    await detoxExpect(element(by.id('sign-in-button'))).toBeVisible();
  });

  it('validates required sign-in inputs', async () => {
    await element(by.id('sign-in-button')).tap();
    await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    await detoxExpect(element(by.text('Password is required'))).toBeVisible();
  });

  it('navigates to forgot password screen', async () => {
    await element(by.id('forgot-password-link')).tap();
    await detoxExpect(element(by.id('send-reset-link-button'))).toBeVisible();
  });

  it('validates required forgot-password email input', async () => {
    await element(by.id('forgot-password-link')).tap();
    await element(by.id('send-reset-link-button')).tap();
    await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
  });

  it('validates sign-up fields and password mismatch', async () => {
    await element(by.id('create-account-link')).tap();
    await element(by.id('email-input')).typeText('invalid-email');
    await element(by.id('password-input')).typeText('Password123');
    await element(by.id('confirm-password-input')).typeText('Password321');
    await element(by.id('create-account-button')).tap();

    await detoxExpect(element(by.text('Enter a valid email address'))).toBeVisible();
    await detoxExpect(element(by.text('Passwords do not match'))).toBeVisible();
  });
});
