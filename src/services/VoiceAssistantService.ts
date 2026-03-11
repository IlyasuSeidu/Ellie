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
import i18n from '@/i18n';
import type {
  VoiceAssistantState,
  VoiceAssistantUserContext,
  VoiceMessage,
  VoiceAssistantError,
  VoiceAssistantErrorType,
  VoiceAssistantNotice,
} from '@/types/voiceAssistant';

/** Max messages to keep in memory (prevents unbounded growth) */
const MAX_HISTORY_LENGTH = 50;
const LISTENING_MAX_DURATION_MS = 15_000;
const LISTENING_SILENCE_STOP_MS = 1_400;
const LISTENING_STOP_FALLBACK_MS = 2_500;

export interface VoiceAssistantCallbacks {
  onStateChange: (state: VoiceAssistantState) => void;
  onPartialTranscript: (transcript: string) => void;
  onUserMessage: (message: VoiceMessage) => void;
  onAssistantMessage: (message: VoiceMessage) => void;
  onError: (error: VoiceAssistantError) => void;
  onNotice?: (notice: VoiceAssistantNotice) => void;
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
  private listeningMaxTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeningSilenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeningStopFallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private hasSpeechInCurrentListen = false;
  private stopRequestedForCurrentListen = false;

  private translateDashboard(key: string, fallback: string): string {
    return String(
      i18n.t(key, {
        ns: 'dashboard',
        defaultValue: fallback,
      })
    );
  }

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
      this.hasSpeechInCurrentListen = false;
      this.stopRequestedForCurrentListen = false;
      this.setState('listening');
      this.scheduleListeningMaxTimeout();

      await speechRecognitionService.startListening(
        {
          onPartialResult: (transcript) => {
            this.callbacks?.onPartialTranscript(transcript);
            if (transcript.trim().length > 0) {
              this.hasSpeechInCurrentListen = true;
              this.scheduleListeningSilenceStop();
            }
          },
          onFinalResult: (result) => {
            this.clearListeningWatchdogTimers();
            void this.handleFinalTranscript(result.transcript);
          },
          onError: (error) => {
            this.clearListeningWatchdogTimers();
            if (error.message === 'Speech recognition permission denied') {
              this.handleError('permission_denied', error.message);
            } else if (this.isNoSpeechError(error)) {
              // "no-speech" is a common, expected timeout path when wake-word triggers
              // and the user does not continue speaking quickly enough.
              this.handleNoSpeechTimeout();
            } else if (this.isAbortLikeError(error)) {
              logger.info('Speech recognition aborted/cancelled; returning to idle');
              this.resetEphemeralState();
              this.setState('idle');
            } else {
              this.handleError('speech_recognition_failed', error.message);
            }
          },
          onEnd: () => {
            this.clearListeningWatchdogTimers();
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

  private isNoSpeechError(error: Error): boolean {
    const errorWithCode = error as Error & { code?: string };
    const code = errorWithCode.code?.toLowerCase().trim();
    const message = error.message.toLowerCase();

    return code === 'no-speech' || code === 'speech_timeout' || message.includes('no speech');
  }

  private isAbortLikeError(error: Error): boolean {
    const errorWithCode = error as Error & { code?: string };
    const code = errorWithCode.code?.toLowerCase().trim();
    const message = error.message.toLowerCase();

    return (
      code === 'aborted' ||
      code === 'cancelled' ||
      code === 'canceled' ||
      code === 'interrupted' ||
      message.includes('aborted') ||
      message.includes('cancelled') ||
      message.includes('canceled')
    );
  }

  private handleNoSpeechTimeout(): void {
    logger.info('Speech recognition ended with no speech; returning to idle');
    this.emitNotice('warning', "I didn't catch that. Please try again.", 'no_speech');
    this.clearListeningWatchdogTimers();
    this.resetEphemeralState();
    this.setState('idle');
  }

  /**
   * Stop listening (triggers final result if available).
   */
  stopListening(): void {
    if (this.currentState !== 'listening') return;
    this.requestStopListeningWithFallback('user_stop');
  }

  private scheduleListeningMaxTimeout(): void {
    if (this.listeningMaxTimeout) {
      clearTimeout(this.listeningMaxTimeout);
    }

    this.listeningMaxTimeout = setTimeout(() => {
      if (this.currentState !== 'listening') {
        return;
      }
      this.requestStopListeningWithFallback('max_duration');
    }, LISTENING_MAX_DURATION_MS);
  }

  private scheduleListeningSilenceStop(): void {
    if (this.listeningSilenceTimeout) {
      clearTimeout(this.listeningSilenceTimeout);
    }

    this.listeningSilenceTimeout = setTimeout(() => {
      if (this.currentState !== 'listening' || !this.hasSpeechInCurrentListen) {
        return;
      }
      this.requestStopListeningWithFallback('silence');
    }, LISTENING_SILENCE_STOP_MS);
  }

  private requestStopListeningWithFallback(reason: 'user_stop' | 'silence' | 'max_duration'): void {
    if (this.currentState !== 'listening' || this.stopRequestedForCurrentListen) {
      return;
    }

    this.stopRequestedForCurrentListen = true;
    logger.info('Stopping speech recognition from listening watchdog', { reason });

    try {
      speechRecognitionService.stopListening();
    } catch (error) {
      logger.warn('Failed to request speech recognition stop', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (this.listeningStopFallbackTimeout) {
      clearTimeout(this.listeningStopFallbackTimeout);
    }

    this.listeningStopFallbackTimeout = setTimeout(() => {
      if (this.currentState === 'listening') {
        logger.warn('Speech recognition stop fallback triggered; resetting to idle');
        this.handleNoSpeechTimeout();
      }
    }, LISTENING_STOP_FALLBACK_MS);
  }

  private clearListeningWatchdogTimers(): void {
    if (this.listeningMaxTimeout) {
      clearTimeout(this.listeningMaxTimeout);
      this.listeningMaxTimeout = null;
    }

    if (this.listeningSilenceTimeout) {
      clearTimeout(this.listeningSilenceTimeout);
      this.listeningSilenceTimeout = null;
    }

    if (this.listeningStopFallbackTimeout) {
      clearTimeout(this.listeningStopFallbackTimeout);
      this.listeningStopFallbackTimeout = null;
    }

    this.hasSpeechInCurrentListen = false;
    this.stopRequestedForCurrentListen = false;
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
      message: this.toUserFacingErrorMessage(type, message),
      retryable: overrides.retryable ?? retryableDefaults[type],
      code: overrides.code,
      requestId: overrides.requestId,
      statusCode: overrides.statusCode,
    };

    this.resetEphemeralState();
    this.setState('error');
    this.callbacks?.onError(error);
  }

  private toUserFacingErrorMessage(type: VoiceAssistantErrorType, rawMessage: string): string {
    switch (type) {
      case 'permission_denied':
        return this.translateDashboard(
          'voiceAssistant.errors.permissionDenied',
          'Microphone access denied. Please grant permission.'
        );
      case 'speech_recognition_failed':
        return this.translateDashboard(
          'voiceAssistant.errors.recognition',
          "I didn't catch that. Please try again."
        );
      case 'network_error':
        return this.translateDashboard(
          'voiceAssistant.errors.network',
          'Check your connection and retry.'
        );
      case 'backend_error':
        return this.translateDashboard(
          'voiceAssistant.errors.backend',
          'Service temporarily unavailable. Please try again.'
        );
      case 'rate_limited':
        return this.translateDashboard(
          'voiceAssistant.errors.rateLimited',
          'Please wait briefly and retry.'
        );
      case 'timeout':
        return this.translateDashboard(
          'voiceAssistant.errors.timeout',
          'Request timed out. Please retry.'
        );
      case 'wake_word_unavailable':
        return this.translateDashboard(
          'voiceAssistant.errors.wakeWordUnavailable',
          'Wake-word unavailable, tap the mic to talk.'
        );
      case 'tts_error':
        return this.translateDashboard(
          'voiceAssistant.errors.tts',
          'Could not play audio response.'
        );
      case 'unknown':
      default:
        return (
          rawMessage?.trim() ||
          this.translateDashboard('voiceAssistant.errors.default', 'Something went wrong')
        );
    }
  }

  private emitNotice(type: VoiceAssistantNotice['type'], message: string, code?: string): void {
    this.callbacks?.onNotice?.({ type, message, code });
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
    this.clearListeningWatchdogTimers();
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
   * Restore persisted conversation history.
   */
  restoreHistory(messages: VoiceMessage[]): void {
    this.conversationHistory = messages.slice(-MAX_HISTORY_LENGTH);
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
