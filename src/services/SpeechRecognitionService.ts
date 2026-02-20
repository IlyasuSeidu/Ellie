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
        callbacks.onError(new Error('Speech recognition permission denied'));
        return;
      }
    }

    this.callbacks = callbacks;
    this.isListening = true;

    try {
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
      logger.info('Speech recognition started', { locale });
    } catch (error) {
      this.isListening = false;
      this.callbacks = null;
      logger.error('Failed to start speech recognition', error as Error);
      callbacks.onError(error as Error);
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
    logger.error('Speech recognition error', new Error(message), { code: errorCode });
    this.isListening = false;
    this.callbacks?.onError(new Error(message || errorCode));
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
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
