/**
 * Voice Assistant Service (Orchestrator)
 *
 * Coordinates the full voice assistant pipeline:
 * Speech Recognition → Ellie Brain → Text-to-Speech
 *
 * Manages state transitions and error handling across all services.
 */

import { speechRecognitionService } from './SpeechRecognitionService';
import { textToSpeechService } from './TextToSpeechService';
import { ellieBrainService, EllieBrainServiceError } from './EllieBrainService';
import { voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import { tryOfflineFallback } from '@/utils/offlineFallback';
import type {
  VoiceAssistantState,
  VoiceAssistantUserContext,
  VoiceMessage,
  VoiceAssistantError,
  VoiceAssistantErrorType,
} from '@/types/voiceAssistant';

/** Max messages to keep in memory (prevents unbounded growth) */
const MAX_HISTORY_LENGTH = 50;

export interface VoiceAssistantCallbacks {
  onStateChange: (state: VoiceAssistantState) => void;
  onPartialTranscript: (transcript: string) => void;
  onUserMessage: (message: VoiceMessage) => void;
  onAssistantMessage: (message: VoiceMessage) => void;
  onError: (error: VoiceAssistantError) => void;
}

let messageIdCounter = 0;
function generateMessageId(): string {
  messageIdCounter += 1;
  return `msg_${Date.now()}_${messageIdCounter}`;
}

/**
 * Singleton orchestrator for the voice assistant pipeline.
 */
class VoiceAssistantService {
  private callbacks: VoiceAssistantCallbacks | null = null;
  private currentState: VoiceAssistantState = 'idle';
  private userContext: VoiceAssistantUserContext | null = null;
  private conversationHistory: VoiceMessage[] = [];
  private isStartingListening = false;
  private activeRequestToken = 0;
  private currentProcessingToken: number | null = null;
  private currentSpeechToken: number | null = null;

  /**
   * Initialize the service with callbacks and user context.
   */
  initialize(callbacks: VoiceAssistantCallbacks, userContext: VoiceAssistantUserContext): void {
    this.callbacks = callbacks;
    this.userContext = userContext;
    this.setState('idle', true);
    this.resetEphemeralState();
  }

  /**
   * Update the user context (e.g., when date changes).
   */
  updateUserContext(userContext: VoiceAssistantUserContext): void {
    this.userContext = userContext;
  }

  /**
   * Start listening for speech.
   */
  async startListening(): Promise<void> {
    // Recover from retryable errors without forcing explicit cancel/reset.
    if (this.currentState === 'error') {
      this.setState('idle');
    }

    if (this.currentState !== 'idle' || this.isStartingListening) {
      logger.warn('Cannot start listening from state', { state: this.currentState });
      return;
    }

    this.isStartingListening = true;
    try {
      this.activeRequestToken += 1;
      this.resetEphemeralState();
      this.setState('listening');

      await speechRecognitionService.startListening(
        {
          onPartialResult: (transcript) => {
            this.callbacks?.onPartialTranscript(transcript);
          },
          onFinalResult: (result) => {
            void this.handleFinalTranscript(result.transcript);
          },
          onError: (error) => {
            if (error.message === 'Speech recognition permission denied') {
              this.handleError('permission_denied', error.message);
            } else {
              this.handleError('speech_recognition_failed', error.message);
            }
          },
          onEnd: () => {
            // If still in listening state when recognition ends naturally,
            // it means no result was captured
            if (this.currentState === 'listening') {
              this.resetEphemeralState();
              this.setState('idle');
            }
          },
        },
        voiceAssistantConfig.locale
      );
    } finally {
      this.isStartingListening = false;
    }
  }

  /**
   * Stop listening (triggers final result if available).
   */
  async stopListening(): Promise<void> {
    if (this.currentState !== 'listening') return;
    await speechRecognitionService.stopListening();
  }

  /**
   * Cancel the current operation and return to idle.
   */
  async cancel(): Promise<void> {
    this.activeRequestToken += 1;
    this.resetEphemeralState();

    switch (this.currentState) {
      case 'listening':
        await speechRecognitionService.abort();
        break;
      case 'processing':
        ellieBrainService.abort('user');
        break;
      case 'speaking':
        await textToSpeechService.stop();
        break;
    }

    this.setState('idle');
  }

  /**
   * Handle a completed transcript from speech recognition.
   */
  private async handleFinalTranscript(transcript: string): Promise<void> {
    if (this.currentState !== 'listening') {
      return;
    }

    if (!transcript.trim()) {
      this.resetEphemeralState();
      this.setState('idle');
      return;
    }

    // Create user message
    const userMessage: VoiceMessage = {
      id: generateMessageId(),
      role: 'user',
      text: transcript.trim(),
      timestamp: Date.now(),
    };

    this.conversationHistory.push(userMessage);
    this.trimHistory();
    this.callbacks?.onUserMessage(userMessage);

    const requestToken = this.activeRequestToken + 1;
    this.activeRequestToken = requestToken;
    this.currentProcessingToken = requestToken;

    // Process with brain
    await this.processQuery(userMessage.text, requestToken);
  }

  /**
   * Send query to the Ellie Brain and handle response.
   * Tries offline fallback first for simple queries.
   */
  private async processQuery(query: string, requestToken: number): Promise<void> {
    if (!this.userContext) {
      this.handleError('unknown', 'Voice assistant not initialized');
      return;
    }

    if (this.currentProcessingToken !== requestToken) {
      return;
    }

    this.setState('processing');

    // Phase 3: Try offline fallback for simple queries first
    const offlineResult = tryOfflineFallback(
      query,
      this.userContext.shiftCycle,
      this.userContext.name
    );

    if (offlineResult.handled && offlineResult.text) {
      logger.info('Query handled offline', { toolName: offlineResult.toolName });

      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      const assistantMessage: VoiceMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: offlineResult.text,
        timestamp: Date.now(),
        shiftData: offlineResult.toolName
          ? { toolName: offlineResult.toolName, data: null }
          : undefined,
      };

      this.conversationHistory.push(assistantMessage);
      this.trimHistory();
      this.callbacks?.onAssistantMessage(assistantMessage);

      await this.speakResponse(offlineResult.text, requestToken);
      return;
    }

    // Fall through to backend for complex queries
    try {
      const response = await ellieBrainService.query(
        query,
        this.userContext,
        this.conversationHistory
      );

      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      const assistantMessage: VoiceMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: response.text,
        timestamp: Date.now(),
        shiftData: response.shiftData,
      };

      this.conversationHistory.push(assistantMessage);
      this.trimHistory();
      this.callbacks?.onAssistantMessage(assistantMessage);

      // Speak the response
      await this.speakResponse(response.text, requestToken);
    } catch (error) {
      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      if (error instanceof EllieBrainServiceError) {
        if (error.code === 'request_cancelled') {
          return;
        }

        this.handleError(error.type, error.message, {
          retryable: error.retryable,
          code: error.code,
          requestId: error.requestId,
          statusCode: error.statusCode,
        });
        return;
      }

      const message = (error as Error).message;
      if (message === 'Request cancelled') {
        // User cancelled, already handled
        return;
      }
      this.handleError('backend_error', message);
    } finally {
      if (this.currentProcessingToken === requestToken) {
        this.currentProcessingToken = null;
      }
    }
  }

  /**
   * Speak the assistant's response via TTS.
   */
  private async speakResponse(text: string, requestToken: number): Promise<void> {
    if (this.activeRequestToken !== requestToken) {
      return;
    }

    this.currentSpeechToken = requestToken;
    this.setState('speaking');

    // Resolve TTS language from the configured locale
    const localeConfig = voiceAssistantConfig.supportedLocales?.find(
      (l) => l.code === voiceAssistantConfig.locale
    );
    const ttsLanguage = localeConfig?.ttsLanguage ?? voiceAssistantConfig.locale;

    await textToSpeechService.speak(text, {
      language: ttsLanguage,
      rate: voiceAssistantConfig.speechRate,
      onDone: () => {
        if (this.currentSpeechToken !== requestToken) {
          return;
        }
        this.currentSpeechToken = null;
        this.resetEphemeralState();
        this.setState('idle');
      },
      onStopped: () => {
        if (this.currentSpeechToken !== requestToken) {
          return;
        }
        this.currentSpeechToken = null;
        this.resetEphemeralState();
        this.setState('idle');
      },
      onError: (error) => {
        if (this.currentSpeechToken !== requestToken) {
          return;
        }
        this.currentSpeechToken = null;
        this.handleError('tts_error', error.message);
      },
    });
  }

  /**
   * Handle an error and transition to error state.
   */
  private handleError(
    type: VoiceAssistantErrorType,
    message: string,
    overrides: Partial<VoiceAssistantError> = {}
  ): void {
    logger.error('Voice assistant error', new Error(message), { type });

    const retryableDefaults: Record<VoiceAssistantErrorType, boolean> = {
      permission_denied: false,
      speech_recognition_failed: true,
      network_error: true,
      backend_error: true,
      rate_limited: true,
      timeout: true,
      wake_word_unavailable: false,
      tts_error: true,
      unknown: false,
    };

    const error: VoiceAssistantError = {
      type,
      message,
      retryable: overrides.retryable ?? retryableDefaults[type],
      code: overrides.code,
      requestId: overrides.requestId,
      statusCode: overrides.statusCode,
    };

    this.resetEphemeralState();
    this.setState('error');
    this.callbacks?.onError(error);
  }

  /**
   * Transition to a new state.
   */
  private setState(state: VoiceAssistantState, force = false): void {
    if (!force && this.currentState === state) {
      return;
    }

    this.currentState = state;
    this.callbacks?.onStateChange(state);
  }

  private resetEphemeralState(): void {
    this.currentProcessingToken = null;
    this.currentSpeechToken = null;
  }

  /**
   * Trim conversation history to prevent unbounded memory growth.
   */
  private trimHistory(): void {
    if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
      this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY_LENGTH);
    }
  }

  /**
   * Get the current state.
   */
  getState(): VoiceAssistantState {
    return this.currentState;
  }

  /**
   * Get conversation history.
   */
  getConversationHistory(): VoiceMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history.
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Clean up all services.
   */
  destroy(): void {
    speechRecognitionService.destroy();
    textToSpeechService.destroy();
    ellieBrainService.destroy();
    this.callbacks = null;
    this.userContext = null;
    this.conversationHistory = [];
    this.isStartingListening = false;
    this.activeRequestToken = 0;
    this.resetEphemeralState();
    this.currentState = 'idle';
  }
}

export const voiceAssistantService = new VoiceAssistantService();
