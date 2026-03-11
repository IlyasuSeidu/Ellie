import i18n from '@/i18n';

export type AuthAction =
  | 'signIn'
  | 'signUp'
  | 'googleSignIn'
  | 'appleSignIn'
  | 'passwordReset'
  | 'emailVerification'
  | 'signOut'
  | 'sessionRestore';

const tCommon = (key: string, fallback: string): string =>
  String(
    i18n.t(key, {
      ns: 'common',
      defaultValue: fallback,
    })
  );

function getCodeFromMessage(message: string): string | null {
  const firebaseCode = message.match(/\b(auth\/[a-z-]+)\b/i)?.[1];
  if (firebaseCode) return firebaseCode.toLowerCase();

  if (/google\/no-id-token/i.test(message)) return 'google/no-id-token';
  if (/apple\/no-identity-token/i.test(message)) return 'apple/no-identity-token';
  if (/play services/i.test(message)) return 'google/play-services-not-available';
  if (/cancelled|canceled|aborted/i.test(message)) return 'auth/popup-closed-by-user';

  return null;
}

export function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim();
    }
  }

  if (error instanceof Error) {
    const fromMessage = getCodeFromMessage(error.message);
    if (fromMessage) return fromMessage;
  }

  return 'auth/unknown';
}

function getActionFallback(action: AuthAction): string {
  switch (action) {
    case 'signIn':
      return tCommon(
        'errors.auth.actionSignInFailed',
        'Unable to sign in right now. Please try again.'
      );
    case 'signUp':
      return tCommon(
        'errors.auth.actionSignUpFailed',
        'Unable to create your account right now. Please try again.'
      );
    case 'googleSignIn':
    case 'appleSignIn':
      return tCommon(
        'errors.auth.actionSocialSignInFailed',
        'Social sign-in is unavailable right now. Please try email sign-in.'
      );
    case 'passwordReset':
      return tCommon(
        'errors.auth.actionPasswordResetFailed',
        'Unable to send a reset link right now. Please try again.'
      );
    case 'emailVerification':
      return tCommon(
        'errors.auth.actionEmailVerificationFailed',
        'Unable to send verification email right now. Please try again.'
      );
    case 'signOut':
      return tCommon('errors.auth.actionSignOutFailed', 'Unable to sign out right now.');
    case 'sessionRestore':
      return tCommon(
        'errors.auth.actionSessionRestoreFailed',
        'Unable to restore your session. Please sign in again.'
      );
    default:
      return tCommon(
        'errors.runtime.unexpected',
        'An unexpected error occurred. Please try again.'
      );
  }
}

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const code = getAuthErrorCode(error).toLowerCase();

  switch (code) {
    case 'auth/user-not-found':
      return tCommon('errors.auth.userNotFound', 'No account found with this email.');
    case 'auth/wrong-password':
      return tCommon('errors.auth.wrongPassword', 'Incorrect password.');
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return tCommon(
        'errors.auth.invalidCredentials',
        'The email or password you entered is incorrect.'
      );
    case 'auth/email-already-in-use':
      return tCommon('errors.auth.emailAlreadyInUse', 'An account with this email already exists.');
    case 'auth/weak-password':
      return tCommon(
        'errors.auth.weakPassword',
        'Password is too weak. Use at least 6 characters.'
      );
    case 'auth/invalid-email':
      return tCommon('errors.auth.invalidEmail', 'Invalid email address.');
    case 'auth/missing-email':
      return tCommon('errors.auth.missingEmail', 'Please enter your email address.');
    case 'auth/missing-password':
      return tCommon('errors.auth.missingPassword', 'Please enter your password.');
    case 'auth/user-disabled':
      return tCommon(
        'errors.auth.userDisabled',
        'This account has been disabled. Contact support for help.'
      );
    case 'auth/operation-not-allowed':
      return tCommon('errors.auth.operationNotAllowed', 'This operation is not allowed.');
    case 'auth/too-many-requests':
      return tCommon('errors.auth.tooManyRequests', 'Too many attempts. Please try again later.');
    case 'auth/network-request-failed':
      return tCommon(
        'errors.auth.networkRequestFailed',
        'Network error. Please check your connection.'
      );
    case 'auth/requires-recent-login':
      return tCommon(
        'errors.auth.sessionExpired',
        'For security reasons, please sign in again and retry.'
      );
    case 'auth/account-exists-with-different-credential':
      return tCommon(
        'errors.auth.accountExistsWithDifferentCredential',
        'An account already exists with this email using a different sign-in method.'
      );
    case 'auth/credential-already-in-use':
      return tCommon(
        'errors.auth.credentialAlreadyInUse',
        'This credential is already linked to another account.'
      );
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'sign_in_cancelled':
    case 'err_request_canceled':
      return tCommon('errors.auth.signInCancelled', 'Sign-in was canceled.');
    case 'play_services_not_available':
    case 'google/play-services-not-available':
      return tCommon(
        'errors.auth.googlePlayServicesUnavailable',
        'Google Play Services is unavailable on this device.'
      );
    case 'google/no-id-token':
      return tCommon(
        'errors.auth.googleMissingIdToken',
        'Google sign-in could not be completed. Please try again.'
      );
    case 'apple/no-identity-token':
      return tCommon(
        'errors.auth.appleMissingIdentityToken',
        'Apple sign-in could not be completed. Please try again.'
      );
    default:
      return getActionFallback(action);
  }
}
