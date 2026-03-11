import i18n from '@/i18n';

const tOnboarding = (key: string, fallback: string): string =>
  String(
    i18n.t(key, {
      ns: 'onboarding',
      defaultValue: fallback,
    })
  );

const getErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.trim().length > 0) {
      return code.trim().toLowerCase();
    }
  }
  return '';
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return '';
};

export function getOnboardingSaveErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (
    code.includes('network') ||
    code.includes('unavailable') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('unreachable') ||
    message.includes('internet')
  ) {
    return tOnboarding(
      'completion.errors.networkUnavailable',
      'We could not connect to save your setup. Check your connection and try again.'
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
    return tOnboarding(
      'completion.errors.permissionDenied',
      "We don't have permission to save your setup. Please sign in again and retry."
    );
  }

  if (
    code.includes('quota') ||
    code.includes('storage') ||
    message.includes('quota') ||
    message.includes('storage') ||
    message.includes('disk') ||
    message.includes('no space') ||
    message.includes('full')
  ) {
    return tOnboarding(
      'completion.errors.storageUnavailable',
      'Your device storage is full. Free up space and try again.'
    );
  }

  if (
    code.includes('timeout') ||
    code.includes('deadline-exceeded') ||
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return tOnboarding('completion.errors.timeout', 'Saving took too long. Please try again.');
  }

  return tOnboarding(
    'completion.errors.genericSaveFailed',
    'We could not save your setup right now. Please try again.'
  );
}
