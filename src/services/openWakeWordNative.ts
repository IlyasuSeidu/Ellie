/**
 * OpenWakeWord native adapter.
 *
 * Loads the local Expo module defensively so stale native builds do not crash startup.
 */

import { logger } from '@/utils/logger';

export interface OpenWakeWordInitializeOptions {
  modelPath: string;
  melspectrogramModelPath?: string;
  embeddingModelPath?: string;
  keywordLabel?: string;
  threshold?: number;
  triggerCooldownMs?: number;
}

export interface OpenWakeWordDetectionEvent {
  keywordLabel: string;
  score: number;
  timestamp: number;
}

export interface OpenWakeWordErrorEvent {
  message: string;
  code?: string;
}

export interface OpenWakeWordInferenceEvent {
  score: number;
  threshold: number;
  timestamp: number;
  rms?: number;
}

export interface OpenWakeWordSubscription {
  remove: () => void;
}

interface OpenWakeWordModuleLike {
  isAvailable?: () => boolean;
  getConfig?: () => {
    keywordLabel: string;
    threshold: number;
    triggerCooldownMs: number;
  };
  initialize: (options: OpenWakeWordInitializeOptions) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
}

interface OpenWakeWordPackageLike {
  default?: OpenWakeWordModuleLike;
  addWakeWordDetectionListener?: (
    listener: (event: OpenWakeWordDetectionEvent) => void
  ) => OpenWakeWordSubscription;
  addWakeWordErrorListener?: (
    listener: (event: OpenWakeWordErrorEvent) => void
  ) => OpenWakeWordSubscription;
  addWakeWordInferenceListener?: (
    listener: (event: OpenWakeWordInferenceEvent) => void
  ) => OpenWakeWordSubscription;
}

let openWakeWordPackage: OpenWakeWordPackageLike | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  openWakeWordPackage = require('ellie-openwakeword') as OpenWakeWordPackageLike;
} catch (error) {
  try {
    // Fallback to local module source path for in-repo development.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    openWakeWordPackage =
      require('../../modules/ellie-openwakeword/src') as OpenWakeWordPackageLike;
  } catch (fallbackError) {
    logger.warn('OpenWakeWord native module is unavailable in this runtime', {
      error: error instanceof Error ? error.message : String(error),
      fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    });
  }
}

function getNativeModule(): OpenWakeWordModuleLike {
  const moduleInstance = openWakeWordPackage?.default;
  if (!moduleInstance) {
    throw new Error(
      'OpenWakeWord native module is unavailable. Rebuild the app after installing the local module.'
    );
  }
  return moduleInstance;
}

export const isOpenWakeWordNativeAvailable = (() => {
  try {
    const moduleInstance = openWakeWordPackage?.default;
    if (!moduleInstance) return false;
    if (typeof moduleInstance.isAvailable !== 'function') return true;
    return moduleInstance.isAvailable();
  } catch {
    return false;
  }
})();

export function initializeOpenWakeWord(options: OpenWakeWordInitializeOptions): Promise<void> {
  return getNativeModule().initialize(options);
}

export function startOpenWakeWord(): Promise<void> {
  return getNativeModule().start();
}

export function stopOpenWakeWord(): Promise<void> {
  return getNativeModule().stop();
}

export function destroyOpenWakeWord(): Promise<void> {
  return getNativeModule().destroy();
}

export function getOpenWakeWordConfig(): {
  keywordLabel: string;
  threshold: number;
  triggerCooldownMs: number;
} | null {
  const configGetter = getNativeModule().getConfig;
  return typeof configGetter === 'function' ? configGetter() : null;
}

export function addOpenWakeWordDetectionListener(
  listener: (event: OpenWakeWordDetectionEvent) => void
): OpenWakeWordSubscription {
  const addListener = openWakeWordPackage?.addWakeWordDetectionListener;
  if (!addListener) {
    return { remove: () => undefined };
  }
  return addListener(listener);
}

export function addOpenWakeWordErrorListener(
  listener: (event: OpenWakeWordErrorEvent) => void
): OpenWakeWordSubscription {
  const addListener = openWakeWordPackage?.addWakeWordErrorListener;
  if (!addListener) {
    return { remove: () => undefined };
  }
  return addListener(listener);
}

export function addOpenWakeWordInferenceListener(
  listener: (event: OpenWakeWordInferenceEvent) => void
): OpenWakeWordSubscription {
  const addListener = openWakeWordPackage?.addWakeWordInferenceListener;
  if (!addListener) {
    return { remove: () => undefined };
  }
  return addListener(listener);
}
