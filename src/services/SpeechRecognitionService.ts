/**
 * Speech Recognition Service
 *
 * Wraps expo-speech-recognition to provide a clean API for
 * starting/stopping speech-to-text with event callbacks.
 *
 * Event flow:
 * 1. Service calls ExpoSpeechRecognitionModule.start()
 * 2. VoiceAssistantContext wires native events via useSpeechRecognitionEvent hooks
 * 3. Hooks route events to handleResult/handleError/handleEnd on this service
 * 4. This service routes to the registered callbacks (set by VoiceAssistantService)
 */

import { ExpoSpeechRecognitionModule } from './speechRecognitionNative';
import { logger } from '@/utils/logger';
import type { SpeechRecognitionResult } from '@/types/voiceAssistant';
import { networkService } from '@/services/NetworkService';

type SpeechRecognitionServiceError = Error & { code: string };
type RecognitionStartOptions = Parameters<typeof ExpoSpeechRecognitionModule.start>[0] & {
  requiresOnDeviceRecognition?: boolean;
};

export interface SpeechRecognitionCallbacks {
  onPartialResult: (transcript: string) => void;
  onFinalResult: (result: SpeechRecognitionResult) => void;
  onError: (error: Error) => void;
  onEnd?: () => void;
}

/**
 * Singleton service for managing speech recognition.
 *
 * Uses expo-speech-recognition which wraps:
 * - iOS: SFSpeechRecognizer
 * - Android: SpeechRecognizer
 *
 * IMPORTANT: Native events are bridged through useSpeechRecognitionEvent hooks
 * in VoiceAssistantContext. The context calls handleResult/handleError/handleEnd
 * on this service when native events fire.
 */
class SpeechRecognitionService {
  private isListening = false;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private supportedLocalesByLowercase: Map<string, string> | null = null;
  private supportedLocalesFetchPromise: Promise<Map<string, string> | null> | null = null;

  private static readonly SOFT_END_ERROR_CODES = new Set([
    'aborted',
    'cancelled',
    'canceled',
    'interrupted',
  ]);

  /**
   * Request microphone and speech recognition permissions.
   * @returns true if all permissions granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      logger.error('Failed to request speech recognition permissions', error as Error);
      return false;
    }
  }

  /**
   * Check if permissions are already granted.
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return result.granted;
    } catch (error) {
      logger.error('Failed to check speech recognition permissions', error as Error);
      return false;
    }
  }

  /**
   * Start listening for speech.
   *
   * This starts the native speech recognizer. Events are delivered via
   * useSpeechRecognitionEvent hooks in VoiceAssistantContext, which call
   * handleResult/handleError/handleEnd on this service.
   *
   * @param callbacks - Event callbacks for results and errors
   * @param locale - Language locale (default: 'en-US')
   */
  async startListening(callbacks: SpeechRecognitionCallbacks, locale = 'en-US'): Promise<void> {
    if (this.isListening) {
      logger.warn('Speech recognition already active');
      return;
    }

    const hasPerms = await this.hasPermissions();
    if (!hasPerms) {
      const granted = await this.requestPermissions();
      if (!granted) {
        callbacks.onError(
          this.createRecognitionError('permission_denied', 'Speech recognition permission denied')
        );
        return;
      }
    }

    const requiresOnDeviceRecognition = networkService.getSnapshot().status === 'offline';
    if (
      requiresOnDeviceRecognition &&
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() === false
    ) {
      callbacks.onError(
        this.createRecognitionError(
          'offline_unavailable',
          'On-device speech recognition is unavailable while offline'
        )
      );
      return;
    }

    this.callbacks = callbacks;
    this.isListening = true;

    try {
      const resolvedLocale = await this.resolveRecognizerLocale(locale);
      const startOptions: RecognitionStartOptions = {
        lang: resolvedLocale,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        requiresOnDeviceRecognition,
      };
      ExpoSpeechRecognitionModule.start(startOptions);
      logger.info('Speech recognition started', {
        locale: resolvedLocale,
        requestedLocale: locale,
        requiresOnDeviceRecognition,
      });
    } catch (error) {
      this.isListening = false;
      this.callbacks = null;
      logger.error('Failed to start speech recognition', error as Error);
      callbacks.onError(
        this.createRecognitionError(
          'start_failed',
          error instanceof Error ? error.message : 'Failed to start speech recognition'
        )
      );
    }
  }

  /**
   * Stop listening (triggers final result if speech was captured).
   */
  stopListening(): void {
    if (!this.isListening) return;

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      logger.error('Failed to stop speech recognition', error as Error);
    }
    // Don't set isListening = false here — wait for 'end' event
  }

  /**
   * Abort listening without waiting for final result.
   */
  abort(): void {
    if (!this.isListening) return;

    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      logger.error('Failed to abort speech recognition', error as Error);
    } finally {
      this.isListening = false;
      this.callbacks = null;
    }
  }

  /**
   * Handle a speech recognition result event.
   * Called by the useSpeechRecognitionEvent('result') hook in VoiceAssistantContext.
   */
  handleResult(transcript: string, isFinal: boolean, confidence: number): void {
    if (!this.callbacks) return;

    if (isFinal) {
      this.isListening = false;
      this.callbacks.onFinalResult({ transcript, isFinal, confidence });
    } else {
      this.callbacks.onPartialResult(transcript);
    }
  }

  /**
   * Handle a speech recognition error event.
   * Called by the useSpeechRecognitionEvent('error') hook in VoiceAssistantContext.
   */
  handleError(errorCode: string, message: string): void {
    const normalizedMessage = message || errorCode;
    const normalizedCode = errorCode.toLowerCase();
    const normalizedError = this.createRecognitionError(normalizedCode, normalizedMessage);
    const lowerMessage = normalizedMessage.toLowerCase();
    const isSoftEndSignal =
      SpeechRecognitionService.SOFT_END_ERROR_CODES.has(normalizedCode) ||
      lowerMessage.includes('aborted') ||
      lowerMessage.includes('cancelled') ||
      lowerMessage.includes('canceled');

    if (isSoftEndSignal) {
      logger.info('Speech recognition ended with abort/cancel signal', { code: normalizedCode });
      this.isListening = false;
      this.callbacks?.onEnd?.();
      return;
    }

    if (normalizedCode === 'no-speech') {
      logger.warn('Speech recognition ended with no-speech', { code: normalizedCode });
    } else {
      logger.error('Speech recognition error', normalizedError, { code: normalizedCode });
    }

    this.isListening = false;
    this.callbacks?.onError(normalizedError);
  }

  /**
   * Handle speech recognition end event.
   * Called by the useSpeechRecognitionEvent('end') hook in VoiceAssistantContext.
   */
  handleEnd(): void {
    this.isListening = false;
    this.callbacks?.onEnd?.();
  }

  /**
   * Whether speech recognition is currently active.
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Clean up callbacks.
   */
  destroy(): void {
    if (this.isListening) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.callbacks = null;
    this.isListening = false;
    this.supportedLocalesByLowercase = null;
    this.supportedLocalesFetchPromise = null;
  }

  private createRecognitionError(code: string, message: string): SpeechRecognitionServiceError {
    const error = new Error(message) as SpeechRecognitionServiceError;
    error.code = code;
    return error;
  }

  private async resolveRecognizerLocale(locale: string): Promise<string> {
    const requestedLocale = locale.trim() || 'en-US';
    const locales = await this.getSupportedLocalesByLowercase();
    if (!locales || locales.size === 0) {
      return requestedLocale;
    }

    const exactMatch = locales.get(requestedLocale.toLowerCase());
    if (exactMatch) {
      return exactMatch;
    }

    const requestedLanguage = requestedLocale.split(/[-_]/)[0]?.toLowerCase();
    if (!requestedLanguage) {
      return requestedLocale;
    }

    for (const [normalizedLocale, candidate] of locales.entries()) {
      if (
        normalizedLocale === requestedLanguage ||
        normalizedLocale.startsWith(`${requestedLanguage}-`)
      ) {
        logger.warn('Requested speech locale unavailable; using supported language variant', {
          requestedLocale,
          fallbackLocale: candidate,
        });
        return candidate;
      }
    }

    logger.warn(
      'Requested speech locale not in recognizer supported locales; using requested locale',
      {
        requestedLocale,
      }
    );
    return requestedLocale;
  }

  private getSupportedLocalesByLowercase(): Promise<Map<string, string> | null> {
    if (this.supportedLocalesByLowercase) {
      return Promise.resolve(this.supportedLocalesByLowercase);
    }

    if (this.supportedLocalesFetchPromise) {
      return this.supportedLocalesFetchPromise;
    }

    const getSupportedLocales = ExpoSpeechRecognitionModule.getSupportedLocales;
    if (!getSupportedLocales) {
      return Promise.resolve(null);
    }

    this.supportedLocalesFetchPromise = (async () => {
      try {
        const result = await getSupportedLocales({});
        const allLocales = [...(result.locales ?? []), ...(result.installedLocales ?? [])]
          .map((value) => value.trim())
          .filter((value) => value.length > 0);

        if (allLocales.length === 0) {
          return null;
        }

        const uniqueLocales = Array.from(new Set(allLocales));
        const normalizedMap = new Map<string, string>();
        uniqueLocales.forEach((value) => {
          normalizedMap.set(value.toLowerCase(), value);
        });

        this.supportedLocalesByLowercase = normalizedMap;
        return normalizedMap;
      } catch (error) {
        logger.warn('Failed to fetch supported speech locales; using requested locale', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      } finally {
        this.supportedLocalesFetchPromise = null;
      }
    })();

    return this.supportedLocalesFetchPromise;
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
