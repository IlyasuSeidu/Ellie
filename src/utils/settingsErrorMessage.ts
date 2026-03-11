import i18n from '@/i18n';

export type SettingsAction = 'languageChange' | 'onboardingReset' | 'profileSave';

const tCommon = (key: string, fallback: string): string =>
  String(
    i18n.t(key, {
      ns: 'common',
      defaultValue: fallback,
    })
  );

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim().toLowerCase();
    }
  }
  return '';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return '';
}

function getActionFallback(action: SettingsAction): string {
  switch (action) {
    case 'languageChange':
      return tCommon(
        'errors.settings.languageChangeFailed',
        'Unable to change language right now. Please try again.'
      );
    case 'onboardingReset':
      return tCommon(
        'errors.settings.onboardingResetFailed',
        'Unable to restart onboarding right now. Please try again.'
      );
    case 'profileSave':
      return tCommon(
        'errors.settings.profileSaveFailed',
        'Unable to save your settings right now. Please try again.'
      );
    default:
      return tCommon(
        'errors.runtime.unexpected',
        'An unexpected error occurred. Please try again.'
      );
  }
}

export function getSettingsErrorMessage(error: unknown, action: SettingsAction): string {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (
    code.includes('network') ||
    code.includes('unavailable') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('internet')
  ) {
    return tCommon(
      'errors.runtime.network',
      'Network error. Please check your connection and try again.'
    );
  }

  if (
    code.includes('permission') ||
    code.includes('unauthorized') ||
    code.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('not authorized') ||
    message.includes('forbidden')
  ) {
    return tCommon(
      'errors.settings.permissionDenied',
      "You don't have permission to update these settings."
    );
  }

  if (code.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
    return tCommon('errors.settings.timeout', 'The request took too long. Please try again.');
  }

  return getActionFallback(action);
}
