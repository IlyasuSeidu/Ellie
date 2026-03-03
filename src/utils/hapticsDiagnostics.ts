import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { logger } from '@/utils/logger';

interface HapticOptions {
  source: string;
  allowVibrationFallback?: boolean;
  fallbackPattern?: number | number[];
}

const DEFAULT_FALLBACK_PATTERN = 10;

function getPlatformOS(): string {
  return typeof Platform?.OS === 'string' ? Platform.OS : 'unknown';
}

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: 'UnknownError', message: String(error) };
}

function triggerVibrationFallback(options: HapticOptions): void {
  if (!options.allowVibrationFallback) {
    return;
  }

  const fallbackPattern = options.fallbackPattern ?? DEFAULT_FALLBACK_PATTERN;
  const platform = getPlatformOS();

  try {
    if (typeof Vibration?.vibrate === 'function') {
      Vibration.vibrate(fallbackPattern);
    }
    logger.warn('Haptics: vibration fallback triggered', {
      source: options.source,
      platform,
      fallbackPattern,
    });
  } catch (fallbackError) {
    logger.error('Haptics: vibration fallback failed', fallbackError as Error, {
      source: options.source,
      platform,
    });
  }
}

async function runHaptic(
  action: () => Promise<void>,
  kind: 'impact' | 'notification' | 'selection',
  detail: string,
  options: HapticOptions
): Promise<boolean> {
  const startedAt = Date.now();
  const platform = getPlatformOS();

  try {
    await action();
    return true;
  } catch (error) {
    const normalizedError = normalizeError(error);
    logger.warn('Haptics: trigger failed', {
      source: options.source,
      kind,
      detail,
      platform,
      durationMs: Date.now() - startedAt,
      error: normalizedError,
    });

    triggerVibrationFallback(options);
    return false;
  }
}

export function triggerImpactHaptic(
  style: Haptics.ImpactFeedbackStyle,
  options: HapticOptions
): Promise<boolean> {
  return runHaptic(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    'impact',
    `light(requested:${style})`,
    { allowVibrationFallback: true, ...options }
  );
}

export function triggerNotificationHaptic(
  type: Haptics.NotificationFeedbackType,
  options: HapticOptions
): Promise<boolean> {
  return runHaptic(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    'notification',
    `light(requested:${type})`,
    { allowVibrationFallback: true, ...options }
  );
}

export function triggerSelectionHaptic(options: HapticOptions): Promise<boolean> {
  return runHaptic(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    'selection',
    'light(requested:selection)',
    { allowVibrationFallback: true, ...options }
  );
}
