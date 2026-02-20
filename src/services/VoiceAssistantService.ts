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
import { ellieBrainService } from './EllieBrainService';
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

  /**
   * Initialize the service with callbacks and user context.
   */
  initialize(
    callbacks: VoiceAssistantCallbacks,
    userContext: VoiceAssistantUserContext
  ): void {
    this.callbacks = callbacks;
    this.userContext = userContext;
    this.setState('idle');
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
    if (this.currentState !== 'idle') {
      logger.warn('Cannot start listening from state', { state: this.currentState });
      return;
    }

    this.setState('listening');

    await speechRecognitionService.startListening(
      {
        onPartialResult: (transcript) => {
          this.callbacks?.onPartialTranscript(transcript);
        },
        onFinalResult: (result) => {
          this.handleFinalTranscript(result.transcript);
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
            this.setState('idle');
          }
        },
      },
      voiceAssistantConfig.locale
    );
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
    switch (this.currentState) {
      case 'listening':
        await speechRecognitionService.abort();
        break;
      case 'processing':
        ellieBrainService.abort();
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
    if (!transcript.trim()) {
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

    // Process with brain
    await this.processQuery(userMessage.text);
  }

  /**
   * Send query to the Ellie Brain and handle response.
   * Tries offline fallback first for simple queries.
   */
  private async processQuery(query: string): Promise<void> {
    if (!this.userContext) {
      this.handleError('unknown', 'Voice assistant not initialized');
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

      await this.speakResponse(offlineResult.text);
      return;
    }

    // Fall through to backend for complex queries
    try {
      const response = await ellieBrainService.query(
        query,
        this.userContext,
        this.conversationHistory
      );

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
      await this.speakResponse(response.text);
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Request cancelled') {
        // User cancelled, already handled
        return;
      }
      if (message.includes('Rate limit')) {
        this.handleError('network_error', message);
      } else if (message.includes('Backend error')) {
        this.handleError('backend_error', message);
      } else {
        this.handleError('network_error', message);
      }
    }
  }

  /**
   * Speak the assistant's response via TTS.
   */
  private async speakResponse(text: string): Promise<void> {
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
        this.setState('idle');
      },
      onStopped: () => {
        this.setState('idle');
      },
      onError: (error) => {
        this.handleError('tts_error', error.message);
      },
    });
  }

  /**
   * Handle an error and transition to error state.
   */
  private handleError(type: VoiceAssistantErrorType, message: string): void {
    logger.error('Voice assistant error', new Error(message), { type });

    const error: VoiceAssistantError = {
      type,
      message,
      retryable: type !== 'permission_denied',
    };

    this.setState('error');
    this.callbacks?.onError(error);
  }

  /**
   * Transition to a new state.
   */
  private setState(state: VoiceAssistantState): void {
    this.currentState = state;
    this.callbacks?.onStateChange(state);
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
    this.currentState = 'idle';
  }
}

export const voiceAssistantService = new VoiceAssistantService();
