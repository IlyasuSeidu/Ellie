/**
 * Wake Word Service
 *
 * High-level wrapper around wake-word detection providers.
 * Handles initialization, lifecycle, and safe fallback behavior.
 */

import {
  createPorcupineManagerFromBuiltIns,
  createPorcupineManagerFromKeywordPaths,
  getBuiltInKeywordsMap,
  isWakeWordNativeAvailable,
  type PorcupineManagerInstance,
} from './wakeWordNative';
import {
  addOpenWakeWordDetectionListener,
  addOpenWakeWordErrorListener,
  addOpenWakeWordInferenceListener,
  destroyOpenWakeWord,
  getOpenWakeWordConfig,
  initializeOpenWakeWord,
  isOpenWakeWordNativeAvailable,
  startOpenWakeWord,
  stopOpenWakeWord,
  type OpenWakeWordSubscription,
} from './openWakeWordNative';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

export interface WakeWordConfig {
  provider?: 'porcupine' | 'openwakeword';
  accessKey?: string;
  keywordPaths: string[];
  builtInKeywords: string[];
  sensitivity: number;
  openWakeWordModelPath?: string;
  openWakeWordMelspectrogramModelPath?: string;
  openWakeWordEmbeddingModelPath?: string;
  openWakeWordKeywordLabel?: string;
  openWakeWordThreshold?: number;
  openWakeWordTriggerCooldownMs?: number;
  openWakeWordMinRmsForDetection?: number;
  openWakeWordActivationFrames?: number;
  openWakeWordScoreSmoothingAlpha?: number;
  modelPath?: string;
  device?: string;
}

export interface WakeWordCallbacks {
  onDetection: (keywordLabel: string, keywordIndex: number) => void;
  onError: (error: Error) => void;
}

export type WakeWordErrorCode =
  | 'activation_limit'
  | 'auth_failed'
  | 'invalid_model'
  | 'runtime_error'
  | 'configuration_error';

export class WakeWordError extends Error {
  readonly code: WakeWordErrorCode;
  readonly fatal: boolean;
  readonly retryable: boolean;

  constructor(message: string, code: WakeWordErrorCode, fatal: boolean, retryable: boolean) {
    super(message);
    this.name = 'WakeWordError';
    this.code = code;
    this.fatal = fatal;
    this.retryable = retryable;
  }
}

const DEFAULT_BUILT_IN_KEYWORD = 'PORCUPINE';
const DEFAULT_BUILT_IN_KEYWORD_VALUE = 'porcupine';
const DEFAULT_SENSITIVITY = 0.65;
const DEFAULT_OPENWAKEWORD_THRESHOLD = 0.1;
const DEFAULT_OPENWAKEWORD_TRIGGER_COOLDOWN_MS = 2000;
const DEFAULT_OPENWAKEWORD_MIN_RMS = 0.01;
const DEFAULT_OPENWAKEWORD_ACTIVATION_FRAMES = 1;
const DEFAULT_OPENWAKEWORD_SCORE_SMOOTHING_ALPHA = 0.35;

function clampSensitivity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SENSITIVITY;
  return Math.min(1, Math.max(0, value));
}

function normalizeWakeWordError(error: unknown): WakeWordError {
  if (error instanceof WakeWordError) {
    return error;
  }

  const source = error instanceof Error ? error : new Error(String(error));
  const name = source.name.toLowerCase();
  const message = source.message.toLowerCase();

  if (
    name.includes('activationlimit') ||
    message.includes('activation limit') ||
    message.includes('activationlimit')
  ) {
    return new WakeWordError(
      'Wake-word activation limit reached for this access key.',
      'activation_limit',
      true,
      false
    );
  }

  if (
    name.includes('authorization') ||
    name.includes('authentication') ||
    message.includes('accesskey') ||
    message.includes('access key') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return new WakeWordError(
      'Wake-word authentication failed. Check your Picovoice AccessKey.',
      'auth_failed',
      true,
      false
    );
  }

  if (
    name.includes('invalidargument') ||
    message.includes('.ppn') ||
    message.includes('.onnx') ||
    message.includes('.tflite') ||
    message.includes('model path') ||
    message.includes('invalid model') ||
    message.includes('keyword') ||
    message.includes('initialization failed')
  ) {
    return new WakeWordError(
      'Wake-word model is invalid or incompatible with this platform.',
      'invalid_model',
      false,
      false
    );
  }

  return new WakeWordError(source.message, 'runtime_error', false, true);
}

function getKeywordPathLabel(path: string): string {
  const fileName = path.split('/').pop() ?? path;
  return fileName.replace(/\.ppn$/i, '');
}

class WakeWordService {
  private manager: PorcupineManagerInstance | null = null;
  private provider: 'porcupine' | 'openwakeword' = 'openwakeword';
  private isListening = false;
  private isInitialized = false;
  private keywordLabels: string[] = [];
  private disabledForSession = false;
  private unavailableReason: string | null = null;
  private openWakeWordSubscriptions: OpenWakeWordSubscription[] = [];

  isSupported(): boolean {
    return isWakeWordNativeAvailable || isOpenWakeWordNativeAvailable;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getPrimaryKeywordLabel(): string {
    return this.keywordLabels[0] ?? 'wake word';
  }

  isUnavailableForSession(): boolean {
    return this.disabledForSession;
  }

  getUnavailableReason(): string | null {
    return this.unavailableReason;
  }

  resetSessionAvailability(): void {
    this.disabledForSession = false;
    this.unavailableReason = null;
  }

  async initialize(config: WakeWordConfig, callbacks: WakeWordCallbacks): Promise<boolean> {
    if (this.disabledForSession) {
      logger.warn('Wake-word disabled for this app session', {
        reason: this.unavailableReason,
      });
      return false;
    }

    await this.destroy();

    this.provider = config.provider ?? 'openwakeword';

    if (this.provider === 'porcupine' && !isWakeWordNativeAvailable) {
      logger.warn('Porcupine wake-word native module is not available');
      return false;
    }

    if (this.provider === 'openwakeword' && !isOpenWakeWordNativeAvailable) {
      logger.warn('OpenWakeWord native module is not available');
      return false;
    }

    const accessKey = config.accessKey?.trim() ?? '';
    if (this.provider === 'porcupine' && !accessKey) {
      const missingAccessKeyError = new WakeWordError(
        'Missing Picovoice AccessKey for wake-word detection.',
        'configuration_error',
        false,
        false
      );
      callbacks.onError(missingAccessKeyError);
      return false;
    }

    const sensitivity = clampSensitivity(config.sensitivity);

    const onDetection = (keywordIndex: number) => {
      const keywordLabel = this.keywordLabels[keywordIndex] ?? `keyword_${keywordIndex + 1}`;
      callbacks.onDetection(keywordLabel, keywordIndex);
    };

    const onProcessError = (error: Error) => {
      callbacks.onError(error);
    };

    const initializeOpenWakeWordProvider = async (): Promise<void> => {
      const modelPath = config.openWakeWordModelPath?.trim();
      if (!modelPath) {
        throw new WakeWordError(
          'Missing OpenWakeWord model path for wake-word detection.',
          'configuration_error',
          true,
          false
        );
      }

      const threshold = clampSensitivity(
        config.openWakeWordThreshold ?? DEFAULT_OPENWAKEWORD_THRESHOLD
      );
      const triggerCooldownMs = Math.max(
        0,
        config.openWakeWordTriggerCooldownMs ?? DEFAULT_OPENWAKEWORD_TRIGGER_COOLDOWN_MS
      );
      const minRmsForDetection = Math.min(
        1,
        Math.max(0, config.openWakeWordMinRmsForDetection ?? DEFAULT_OPENWAKEWORD_MIN_RMS)
      );
      const activationFrames = Math.max(
        1,
        Math.floor(config.openWakeWordActivationFrames ?? DEFAULT_OPENWAKEWORD_ACTIVATION_FRAMES)
      );
      const scoreSmoothingAlpha = Math.min(
        1,
        Math.max(
          0,
          config.openWakeWordScoreSmoothingAlpha ?? DEFAULT_OPENWAKEWORD_SCORE_SMOOTHING_ALPHA
        )
      );
      const keywordLabel = config.openWakeWordKeywordLabel?.trim() || 'Hey Ellie';

      this.openWakeWordSubscriptions = [
        addOpenWakeWordDetectionListener((event) => {
          callbacks.onDetection(event.keywordLabel || keywordLabel, 0);
        }),
        addOpenWakeWordErrorListener((event) => {
          callbacks.onError(new Error(event.message));
        }),
        addOpenWakeWordInferenceListener(
          (() => {
            let sampleCount = 0;
            return (event: { score: number; threshold: number; rms?: number }) => {
              // Only log every 50th sample to avoid CPU overhead from constant serialization
              sampleCount += 1;
              if (sampleCount % 50 === 0) {
                logger.debug('OpenWakeWord inference sample', {
                  score: Number(event.score.toFixed(4)),
                  threshold: event.threshold,
                  rms: typeof event.rms === 'number' ? Number(event.rms.toFixed(4)) : undefined,
                });
              }
            };
          })()
        ),
      ];

      await initializeOpenWakeWord({
        modelPath,
        melspectrogramModelPath: config.openWakeWordMelspectrogramModelPath?.trim() || undefined,
        embeddingModelPath: config.openWakeWordEmbeddingModelPath?.trim() || undefined,
        keywordLabel,
        threshold,
        triggerCooldownMs,
        minRmsForDetection,
        activationFrames,
        scoreSmoothingAlpha,
      });

      const runtimeConfig = getOpenWakeWordConfig();
      logger.info('OpenWakeWord runtime config', {
        modelPath,
        threshold: runtimeConfig?.threshold ?? threshold,
        triggerCooldownMs: runtimeConfig?.triggerCooldownMs ?? triggerCooldownMs,
        minRmsForDetection: runtimeConfig?.minRmsForDetection ?? minRmsForDetection,
        activationFrames: runtimeConfig?.activationFrames ?? activationFrames,
        scoreSmoothingAlpha: runtimeConfig?.scoreSmoothingAlpha ?? scoreSmoothingAlpha,
      });

      this.keywordLabels = [keywordLabel];
    };

    const initializeFromBuiltIns = async (): Promise<void> => {
      const resolvedBuiltIns = this.resolveBuiltInKeywords(config.builtInKeywords);
      if (resolvedBuiltIns.length === 0) {
        throw new Error('No valid built-in wake words were provided');
      }

      const sensitivities =
        Platform.OS === 'ios' ? undefined : resolvedBuiltIns.map(() => sensitivity);

      try {
        this.manager = await createPorcupineManagerFromBuiltIns(
          accessKey,
          resolvedBuiltIns,
          onDetection,
          onProcessError,
          config.modelPath,
          config.device,
          sensitivities
        );
      } catch (extendedOptionsError) {
        const normalizedExtendedError = normalizeWakeWordError(extendedOptionsError);
        const isOptionCompatibilityIssue =
          normalizedExtendedError.code === 'invalid_model' ||
          normalizedExtendedError.code === 'configuration_error' ||
          normalizedExtendedError.code === 'runtime_error';

        if (!isOptionCompatibilityIssue) {
          throw normalizedExtendedError;
        }

        logger.warn(
          'Built-in wake-word initialization failed with extended options; retrying with minimal options',
          {
            error: normalizedExtendedError.message,
          }
        );

        try {
          this.manager = await createPorcupineManagerFromBuiltIns(
            accessKey,
            resolvedBuiltIns,
            onDetection,
            onProcessError
          );
        } catch (minimalOptionsError) {
          const normalizedMinimalError = normalizeWakeWordError(minimalOptionsError);
          const shouldDisableForSession =
            normalizedMinimalError.code === 'invalid_model' ||
            normalizedMinimalError.code === 'configuration_error';

          if (shouldDisableForSession) {
            throw new WakeWordError(
              'Wake-word is unavailable in this app build. Tap mic to talk.',
              'configuration_error',
              true,
              false
            );
          }

          throw normalizedMinimalError;
        }
      }

      this.keywordLabels = resolvedBuiltIns;
    };

    try {
      if (this.provider === 'openwakeword') {
        await initializeOpenWakeWordProvider();
      } else {
        if (config.keywordPaths.length > 0) {
          try {
            const sensitivities =
              Platform.OS === 'ios' ? undefined : config.keywordPaths.map(() => sensitivity);

            this.manager = await createPorcupineManagerFromKeywordPaths(
              accessKey,
              config.keywordPaths,
              onDetection,
              onProcessError,
              config.modelPath,
              config.device,
              sensitivities
            );

            this.keywordLabels = config.keywordPaths.map(getKeywordPathLabel);
          } catch (customModelError) {
            const normalizedCustomError = normalizeWakeWordError(customModelError);
            if (normalizedCustomError.fatal) {
              logger.error(
                'Fatal wake-word model initialization error; skipping built-in fallback',
                normalizedCustomError
              );
              throw normalizedCustomError;
            }

            logger.warn('Custom wake-word model initialization failed; falling back to built-in', {
              error: normalizedCustomError.message,
            });

            await initializeFromBuiltIns();
          }
        } else {
          await initializeFromBuiltIns();
        }
      }

      this.isInitialized = true;
      logger.info('Wake-word service initialized', {
        provider: this.provider,
        keywords: this.keywordLabels,
      });

      return true;
    } catch (error) {
      const baseError = normalizeWakeWordError(error);
      const normalizedError =
        this.provider === 'openwakeword' &&
        (baseError.code === 'invalid_model' || baseError.code === 'configuration_error')
          ? new WakeWordError(
              'Wake-word is unavailable in this app build. Tap mic to talk.',
              'configuration_error',
              true,
              false
            )
          : baseError;
      if (normalizedError.fatal) {
        this.disabledForSession = true;
        this.unavailableReason = normalizedError.message;
      }

      if (normalizedError.fatal) {
        logger.error('Failed to initialize wake-word service', normalizedError);
      } else {
        logger.warn('Wake-word initialization failed; tap-to-talk remains available', {
          error: normalizedError.message,
          code: normalizedError.code,
        });
      }
      callbacks.onError(normalizedError);
      await this.destroy();
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.provider === 'openwakeword') {
      if (!this.isInitialized || this.isListening) {
        return;
      }

      try {
        await startOpenWakeWord();
        this.isListening = true;
        logger.info('Wake-word listening started');
      } catch (error) {
        const normalizedError = normalizeWakeWordError(error);
        if (normalizedError.fatal) {
          this.disabledForSession = true;
          this.unavailableReason = normalizedError.message;
        }
        logger.error('Failed to start wake-word listening', normalizedError);
        throw normalizedError;
      }
      return;
    }

    if (!this.manager || this.isListening) {
      return;
    }

    try {
      await this.manager.start();
      this.isListening = true;
      logger.info('Wake-word listening started');
    } catch (error) {
      const normalizedError = normalizeWakeWordError(error);
      if (normalizedError.fatal) {
        this.disabledForSession = true;
        this.unavailableReason = normalizedError.message;
      }
      logger.error('Failed to start wake-word listening', normalizedError);
      throw normalizedError;
    }
  }

  async stop(): Promise<void> {
    if (this.provider === 'openwakeword') {
      if (!this.isListening) {
        return;
      }

      try {
        await stopOpenWakeWord();
        this.isListening = false;
        logger.info('Wake-word listening stopped');
      } catch (error) {
        logger.error('Failed to stop wake-word listening', error as Error);
        throw error;
      }
      return;
    }

    if (!this.manager || !this.isListening) {
      return;
    }

    try {
      await this.manager.stop();
      this.isListening = false;
      logger.info('Wake-word listening stopped');
    } catch (error) {
      logger.error('Failed to stop wake-word listening', error as Error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.provider === 'openwakeword') {
      if (this.isListening) {
        try {
          await stopOpenWakeWord();
        } catch (error) {
          logger.warn('Wake-word stop failed during destroy', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      try {
        await destroyOpenWakeWord();
      } catch (error) {
        logger.warn('Wake-word destroy failed for OpenWakeWord provider', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      for (const subscription of this.openWakeWordSubscriptions) {
        subscription.remove();
      }
      this.openWakeWordSubscriptions = [];
      this.manager = null;
      this.keywordLabels = [];
      this.isListening = false;
      this.isInitialized = false;
      return;
    }

    if (this.isListening) {
      try {
        await this.manager?.stop();
      } catch (error) {
        logger.warn('Wake-word stop failed during destroy', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.manager?.delete();
    this.manager = null;
    this.keywordLabels = [];
    this.isListening = false;
    this.isInitialized = false;
  }

  private resolveBuiltInKeywords(requestedKeywords: string[]): string[] {
    const builtInMap = getBuiltInKeywordsMap();
    const availableValues = new Set(Object.values(builtInMap).map((value) => value.toLowerCase()));

    const input = requestedKeywords.length > 0 ? requestedKeywords : [DEFAULT_BUILT_IN_KEYWORD];
    const resolved = new Set<string>();

    for (const keyword of input) {
      const normalizedKey = keyword.trim().replace(/\s+/g, '_').toUpperCase();
      const mapped = builtInMap[normalizedKey];

      if (mapped) {
        resolved.add(mapped);
        continue;
      }

      const normalizedValue = keyword.trim().toLowerCase();
      if (availableValues.has(normalizedValue)) {
        resolved.add(normalizedValue);
      }
    }

    // Some native package versions omit BuiltInKeywords map from JS export.
    // In that case, try best-effort literal values so built-ins still work.
    if (resolved.size === 0) {
      for (const keyword of input) {
        const literalKeyword = keyword.trim().toLowerCase();
        if (literalKeyword.length > 0) {
          resolved.add(literalKeyword);
        }
      }
    }

    if (resolved.size === 0) {
      resolved.add(DEFAULT_BUILT_IN_KEYWORD_VALUE);
    }

    return Array.from(resolved);
  }
}

export const wakeWordService = new WakeWordService();
