/**
 * Text-to-Speech Service
 *
 * Wraps expo-speech to provide a clean API for
 * speaking text with control over voice, rate, and callbacks.
 */

import * as Speech from 'expo-speech';
import { logger } from '@/utils/logger';

export interface TTSOptions {
  /** Language/locale (default: 'en-US') */
  language?: string;
  /** Speech rate 0.1-2.0 (default: 1.0) */
  rate?: number;
  /** Speech pitch 0.5-2.0 (default: 1.0) */
  pitch?: number;
  /** Called when speech finishes */
  onDone?: () => void;
  /** Called if speech is stopped early */
  onStopped?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Singleton service for text-to-speech.
 *
 * Uses expo-speech which wraps:
 * - iOS: AVSpeechSynthesizer
 * - Android: TextToSpeech
 */
class TextToSpeechService {
  private isSpeaking = false;

  /**
   * Speak the given text.
   *
   * Stops any current speech before starting new speech.
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      options.onDone?.();
      return;
    }

    // Stop any ongoing speech first
    if (this.isSpeaking) {
      await this.stop();
    }

    this.isSpeaking = true;

    try {
      Speech.speak(text, {
        language: options.language ?? 'en-US',
        rate: options.rate ?? 1.0,
        pitch: options.pitch ?? 1.0,
        onDone: () => {
          this.isSpeaking = false;
          options.onDone?.();
        },
        onStopped: () => {
          this.isSpeaking = false;
          options.onStopped?.();
        },
        onError: (error) => {
          this.isSpeaking = false;
          logger.error('TTS error', new Error(String(error)));
          options.onError?.(new Error(String(error)));
        },
      });
      logger.info('TTS started', { textLength: text.length });
    } catch (error) {
      this.isSpeaking = false;
      logger.error('Failed to start TTS', error as Error);
      options.onError?.(error as Error);
    }
  }

  /**
   * Stop any current speech.
   */
  async stop(): Promise<void> {
    if (!this.isSpeaking) return;

    try {
      Speech.stop();
    } catch (error) {
      logger.error('Failed to stop TTS', error as Error);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Check if TTS is currently speaking.
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if TTS is available on this device.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.stop();
    this.isSpeaking = false;
  }
}

export const textToSpeechService = new TextToSpeechService();
