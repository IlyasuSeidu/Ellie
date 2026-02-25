import { EventEmitter, requireNativeModule, type Subscription } from 'expo-modules-core';

export type OpenWakeWordInitializeOptions = {
  modelPath: string;
  melspectrogramModelPath?: string;
  embeddingModelPath?: string;
  keywordLabel?: string;
  threshold?: number;
  triggerCooldownMs?: number;
  minRmsForDetection?: number;
  activationFrames?: number;
  scoreSmoothingAlpha?: number;
};

export type OpenWakeWordDetectionEvent = {
  keywordLabel: string;
  score: number;
  timestamp: number;
};

export type OpenWakeWordErrorEvent = {
  message: string;
  code?: string;
};

export type OpenWakeWordInferenceEvent = {
  score: number;
  threshold: number;
  timestamp: number;
  rms?: number;
};

type EllieOpenWakeWordNativeModule = {
  isAvailable: () => boolean;
  isInitialized: () => boolean;
  isListening: () => boolean;
  getConfig?: () => {
    keywordLabel: string;
    threshold: number;
    triggerCooldownMs: number;
    minRmsForDetection?: number;
    activationFrames?: number;
    scoreSmoothingAlpha?: number;
  };
  initialize: (options: OpenWakeWordInitializeOptions) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  destroy: () => Promise<void>;
  // Development helper retained for diagnostics/tests.
  simulateDetection?: (score?: number) => Promise<void>;
};

const moduleInstance = requireNativeModule<EllieOpenWakeWordNativeModule>('EllieOpenWakeWord');
const eventEmitter = new EventEmitter(moduleInstance);

export function addWakeWordDetectionListener(
  listener: (event: OpenWakeWordDetectionEvent) => void
): Subscription {
  return eventEmitter.addListener<OpenWakeWordDetectionEvent>('onWakeWordDetected', listener);
}

export function addWakeWordErrorListener(
  listener: (event: OpenWakeWordErrorEvent) => void
): Subscription {
  return eventEmitter.addListener<OpenWakeWordErrorEvent>('onWakeWordError', listener);
}

export function addWakeWordInferenceListener(
  listener: (event: OpenWakeWordInferenceEvent) => void
): Subscription {
  return eventEmitter.addListener<OpenWakeWordInferenceEvent>('onWakeWordInference', listener);
}

export default moduleInstance;
