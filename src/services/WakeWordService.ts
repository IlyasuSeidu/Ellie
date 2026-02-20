/**
 * Wake Word Service
 *
 * High-level wrapper around Porcupine wake-word detection.
 * Handles initialization, lifecycle, and safe fallback behavior.
 */

import {
  createPorcupineManagerFromBuiltIns,
  createPorcupineManagerFromKeywordPaths,
  getBuiltInKeywordsMap,
  isWakeWordNativeAvailable,
  type PorcupineManagerInstance,
} from './wakeWordNative';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';

export interface WakeWordConfig {
  accessKey: string;
  keywordPaths: string[];
  builtInKeywords: string[];
  sensitivity: number;
  modelPath?: string;
  device?: string;
}

export interface WakeWordCallbacks {
  onDetection: (keywordLabel: string, keywordIndex: number) => void;
  onError: (error: Error) => void;
}

const DEFAULT_BUILT_IN_KEYWORD = 'PORCUPINE';
const DEFAULT_SENSITIVITY = 0.65;

function clampSensitivity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SENSITIVITY;
  return Math.min(1, Math.max(0, value));
}

function isActivationLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();
  return (
    name.includes('activationlimit') ||
    message.includes('activation limit') ||
    message.includes('activationlimit')
  );
}

function getKeywordPathLabel(path: string): string {
  const fileName = path.split('/').pop() ?? path;
  return fileName.replace(/\.ppn$/i, '');
}

class WakeWordService {
  private manager: PorcupineManagerInstance | null = null;
  private isListening = false;
  private isInitialized = false;
  private keywordLabels: string[] = [];

  isSupported(): boolean {
    return isWakeWordNativeAvailable;
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

  async initialize(config: WakeWordConfig, callbacks: WakeWordCallbacks): Promise<boolean> {
    await this.destroy();

    if (!isWakeWordNativeAvailable) {
      logger.warn('Wake-word native module is not available');
      return false;
    }

    const accessKey = config.accessKey.trim();
    if (!accessKey) {
      callbacks.onError(new Error('Missing Picovoice AccessKey for wake-word detection'));
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

    const initializeFromBuiltIns = async (): Promise<void> => {
      const resolvedBuiltIns = this.resolveBuiltInKeywords(config.builtInKeywords);
      if (resolvedBuiltIns.length === 0) {
        throw new Error('No valid built-in wake words were provided');
      }

      const sensitivities =
        Platform.OS === 'ios' ? undefined : resolvedBuiltIns.map(() => sensitivity);

      this.manager = await createPorcupineManagerFromBuiltIns(
        accessKey,
        resolvedBuiltIns,
        onDetection,
        onProcessError,
        config.modelPath,
        config.device,
        sensitivities
      );

      this.keywordLabels = resolvedBuiltIns;
    };

    try {
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
          if (isActivationLimitError(customModelError)) {
            logger.error(
              'Wake-word activation limit reached; skipping built-in fallback',
              customModelError as Error
            );
            throw customModelError;
          }

          logger.warn('Custom wake-word model initialization failed; falling back to built-in', {
            error:
              customModelError instanceof Error
                ? customModelError.message
                : String(customModelError),
          });

          await initializeFromBuiltIns();
        }
      } else {
        await initializeFromBuiltIns();
      }

      this.isInitialized = true;
      logger.info('Wake-word service initialized', {
        keywords: this.keywordLabels,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize wake-word service', error as Error);
      callbacks.onError(error as Error);
      await this.destroy();
      return false;
    }
  }

  async start(): Promise<void> {
    if (!this.manager || this.isListening) {
      return;
    }

    try {
      await this.manager.start();
      this.isListening = true;
      logger.info('Wake-word listening started');
    } catch (error) {
      logger.error('Failed to start wake-word listening', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
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

    return Array.from(resolved);
  }
}

export const wakeWordService = new WakeWordService();
