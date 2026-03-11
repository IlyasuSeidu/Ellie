import { getAuthErrorCode, getAuthErrorMessage } from '@/utils/authErrorMessage';

describe('authErrorMessage', () => {
  it('extracts firebase error code from structured error object', () => {
    const err = Object.assign(new Error('firebase error'), { code: 'auth/wrong-password' });
    expect(getAuthErrorCode(err)).toBe('auth/wrong-password');
  });

  it('extracts firebase error code from error message when code field is missing', () => {
    const err = new Error('Request failed with auth/user-not-found');
    expect(getAuthErrorCode(err)).toBe('auth/user-not-found');
  });

  it('maps known firebase auth codes to user-friendly messages', () => {
    const err = Object.assign(new Error('bad credentials'), {
      code: 'auth/invalid-login-credentials',
    });
    expect(getAuthErrorMessage(err, 'signIn')).toBe(
      'The email or password you entered is incorrect.'
    );
  });

  it('maps cancel-like social errors to clear cancellation messaging', () => {
    const err = Object.assign(new Error('Cancelled by user'), {
      code: 'SIGN_IN_CANCELLED',
    });
    expect(getAuthErrorMessage(err, 'googleSignIn')).toBe('Sign-in was canceled.');
  });

  it('uses action-specific fallback for unknown errors', () => {
    const err = new Error('Something unfamiliar happened');
    expect(getAuthErrorMessage(err, 'passwordReset')).toBe(
      'Unable to send a reset link right now. Please try again.'
    );
  });
});
