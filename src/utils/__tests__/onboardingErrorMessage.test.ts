import { getOnboardingSaveErrorMessage } from '@/utils/onboardingErrorMessage';

describe('onboardingErrorMessage', () => {
  it('maps network-like failures to a clear connectivity message', () => {
    const err = new Error('Network error while saving');
    expect(getOnboardingSaveErrorMessage(err)).toBe(
      'We could not connect to save your setup. Check your connection and try again.'
    );
  });

  it('maps permission failures to a re-auth guidance message', () => {
    const err = Object.assign(new Error('Missing or insufficient permissions'), {
      code: 'permission-denied',
    });
    expect(getOnboardingSaveErrorMessage(err)).toBe(
      "We don't have permission to save your setup. Please sign in again and retry."
    );
  });

  it('maps storage-related failures to a storage guidance message', () => {
    const err = new Error('No space left on device');
    expect(getOnboardingSaveErrorMessage(err)).toBe(
      'Your device storage is full. Free up space and try again.'
    );
  });

  it('maps timeout failures to a retry message', () => {
    const err = Object.assign(new Error('Request timed out'), {
      code: 'deadline-exceeded',
    });
    expect(getOnboardingSaveErrorMessage(err)).toBe('Saving took too long. Please try again.');
  });

  it('returns generic fallback for unknown failures', () => {
    const err = new Error('Unexpected failure');
    expect(getOnboardingSaveErrorMessage(err)).toBe(
      'We could not save your setup right now. Please try again.'
    );
  });
});
