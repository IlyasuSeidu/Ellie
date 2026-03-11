import { getSettingsErrorMessage } from '@/utils/settingsErrorMessage';

describe('settingsErrorMessage', () => {
  it('maps network-style errors to connectivity message', () => {
    const err = new Error('Network request failed');
    expect(getSettingsErrorMessage(err, 'languageChange')).toBe(
      'Network error. Please check your connection and try again.'
    );
  });

  it('maps permission errors to permission message', () => {
    const err = Object.assign(new Error('forbidden'), { code: 'permission-denied' });
    expect(getSettingsErrorMessage(err, 'profileSave')).toBe(
      "You don't have permission to update these settings."
    );
  });

  it('uses action fallback for unknown onboarding reset errors', () => {
    const err = new Error('something odd happened');
    expect(getSettingsErrorMessage(err, 'onboardingReset')).toBe(
      'Unable to restart onboarding right now. Please try again.'
    );
  });
});
