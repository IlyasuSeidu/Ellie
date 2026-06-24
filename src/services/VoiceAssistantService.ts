/**
 * Voice Assistant Service (Orchestrator)
 *
 * Coordinates the full voice assistant pipeline:
 * Speech Recognition → Ryvro voice backend → Text-to-Speech
 *
 * Manages state transitions and error handling across all services.
 */

import { speechRecognitionService } from './SpeechRecognitionService';
import { textToSpeechService } from './TextToSpeechService';
import { ryvroBrainService, RyvroBrainServiceError } from './RyvroBrainService';
import { voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import {
  buildLocalShiftBrainUnsupportedResponse,
  classifyLocalShiftBrainIntent,
  answerWithLocalShiftBrain,
} from '@/utils/localShiftBrain';
import i18n from '@/i18n';
import { normalizeLanguage } from '@/i18n/languageDetector';
import { networkService } from '@/services/NetworkService';
import { Analytics } from '@/utils/analytics';
import { formatTimeForDisplay, formatTimesInTextForDisplay } from '@/utils/shiftTimeUtils';
import type {
  VoiceAssistantState,
  VoiceAssistantUserContext,
  VoiceMessage,
  VoiceAssistantError,
  VoiceAssistantErrorType,
  VoiceAssistantNotice,
  ShiftQueryResult,
} from '@/types/voiceAssistant';

/** Max messages to keep in memory (prevents unbounded growth) */
const MAX_HISTORY_LENGTH = 50;
const LISTENING_MAX_DURATION_MS = 15_000;
const LISTENING_SILENCE_STOP_MS = 1_400;
const LISTENING_STOP_FALLBACK_MS = 2_500;
const VOICE_LOCALE_BY_APP_LANGUAGE: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  fr: 'fr-FR',
  ar: 'ar-SA',
  'zh-CN': 'zh-CN',
  ru: 'ru-RU',
  hi: 'hi-IN',
  af: 'af-ZA',
  zu: 'zu-ZA',
  id: 'id-ID',
};
const OFF_SHIFT_CLOSING_REGEX = /\s*Enjoy the rest\.?$/i;

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

export function sanitizeVoiceAssistantResponseText(text: string): string {
  return text
    .trim()
    .replace(/^(?:hi|hello|hey)(?:\s+there)?[,.!]\s+/i, '')
    .replace(/^there[,.!]\s+/i, '')
    .trim();
}

function getPersonalizationName(userContext: VoiceAssistantUserContext | null): string | null {
  const firstName = userContext?.name?.trim().split(/\s+/)[0];
  if (!firstName || /^ryvro$/i.test(firstName) || /^user$/i.test(firstName)) {
    return null;
  }

  return firstName;
}

function makeShiftNamePleasant(shiftName: string): string {
  const normalized = shiftName
    .trim()
    .replace(/\.$/, '')
    .replace(/^a\s+/i, '')
    .replace(/^an\s+/i, '');
  if (/^off$/i.test(normalized)) {
    return 'off';
  }

  return `on ${normalized}`;
}

function buildPleasantShiftSentence(
  firstName: string | null,
  shiftName: string,
  dateText: string,
  timeText?: string
): string {
  const prefix = firstName ? `${firstName}, ` : '';
  const pleasantShift = makeShiftNamePleasant(shiftName);
  const cleanDate = dateText.trim().replace(/\.$/, '');
  const cleanTime = timeText?.trim().replace(/\.$/, '');

  if (/^off$/i.test(shiftName.trim())) {
    return `${prefix}you’re off on ${cleanDate}. Enjoy the rest.`;
  }

  return `${prefix}you’re ${pleasantShift} on ${cleanDate}${cleanTime ? `, ${cleanTime}` : ''}.`;
}

interface RangeShiftDay {
  date: string;
  isWorkDay: boolean;
  isNightShift?: boolean;
  shiftType?: string;
  universal?: {
    definitionName?: string;
    startTime?: string;
    endTime?: string;
  };
}

interface RangeGroup {
  label: string;
  timeText: string;
  dates: Date[];
}

function isRangeShiftDay(value: unknown): value is RangeShiftDay {
  if (!value || typeof value !== 'object') return false;
  const day = value as RangeShiftDay;
  return typeof day.date === 'string' && typeof day.isWorkDay === 'boolean';
}

function parseRangeShiftDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    parsed.getFullYear() !== Number(match[1]) ||
    parsed.getMonth() !== Number(match[2]) - 1 ||
    parsed.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return parsed;
}

function formatRangeHeaderDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatRangeListDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function addDaysForRange(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function areSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDateRuns(dates: Date[]): string {
  const sorted = [...dates].sort((left, right) => left.getTime() - right.getTime());
  const runs: Array<{ start: Date; end: Date }> = [];

  for (const date of sorted) {
    const last = runs[runs.length - 1];
    if (last && areSameCalendarDay(addDaysForRange(last.end, 1), date)) {
      last.end = date;
    } else {
      runs.push({ start: date, end: date });
    }
  }

  return runs
    .map((run) =>
      areSameCalendarDay(run.start, run.end)
        ? formatRangeListDate(run.start)
        : `${formatRangeListDate(run.start)} to ${formatRangeListDate(run.end)}`
    )
    .join(', ');
}

function normalizeRangeShiftLabel(day: RangeShiftDay): string {
  if (!day.isWorkDay) return 'Off';
  return day.universal?.definitionName?.trim() || `${day.shiftType ?? 'Work'} shift`;
}

function normalizeRangeTimeText(day: RangeShiftDay): string {
  const startTime = day.universal?.startTime;
  const endTime = day.universal?.endTime;
  if (!day.isWorkDay || !startTime || !endTime) return '';
  return `${formatTimeForDisplay(startTime)} to ${formatTimeForDisplay(endTime)}`;
}

function formatRangeGroupLabel(group: RangeGroup): string {
  return group.timeText ? `${group.label}, ${group.timeText}` : group.label;
}

function formatStructuredRangeAnswer(
  shiftData: ShiftQueryResult | undefined,
  firstName: string | null
): string | null {
  if (shiftData?.toolName !== 'get_shifts_in_range' || !Array.isArray(shiftData.data)) {
    return null;
  }

  const days = shiftData.data
    .filter(isRangeShiftDay)
    .map((day) => ({ ...day, parsedDate: parseRangeShiftDate(day.date) }))
    .filter((day): day is RangeShiftDay & { parsedDate: Date } => Boolean(day.parsedDate))
    .sort((left, right) => left.parsedDate.getTime() - right.parsedDate.getTime());

  if (days.length === 0) return null;

  const firstDate = days[0].parsedDate;
  const lastDate = days[days.length - 1].parsedDate;
  const workDays = days.filter((day) => day.isWorkDay).length;
  const offDays = days.length - workDays;
  const prefix = firstName ? `${firstName}, ` : '';
  const summary = `${prefix}from ${formatRangeHeaderDate(firstDate)} to ${formatRangeHeaderDate(
    lastDate
  )}, you work ${workDays} day${workDays === 1 ? '' : 's'} and have ${offDays} day${
    offDays === 1 ? '' : 's'
  } off.`;

  const groups = new Map<string, RangeGroup>();
  for (const day of days) {
    const label = normalizeRangeShiftLabel(day);
    const timeText = normalizeRangeTimeText(day);
    const key = `${label}|${timeText}`;
    const existing = groups.get(key);
    if (existing) {
      existing.dates.push(day.parsedDate);
    } else {
      groups.set(key, { label, timeText, dates: [day.parsedDate] });
    }
  }

  const detailLines = Array.from(groups.values()).map(
    (group) => `${formatRangeGroupLabel(group)}: ${formatDateRuns(group.dates)}.`
  );

  return [summary, ...detailLines].join('\n\n');
}

function makeResponsePleasant(text: string, firstName: string | null): string {
  let trimmedText = text.trim();
  if (firstName) {
    const escapedName = firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    trimmedText = trimmedText.replace(new RegExp(`^${escapedName}[,.!]?\\s+`, 'i'), '').trim();
  }

  trimmedText = trimmedText
    .replace(OFF_SHIFT_CLOSING_REGEX, '')
    .replace(/^you\s+are\b/i, 'you’re')
    .replace(/^you\s+have\b/i, 'you’re on')
    .replace(/^your\s+shift\s+is\b/i, 'you’re on')
    .trim();

  const exactShiftMatch = /^(.+?)\s+is\s+(.+?)\.?$/i.exec(trimmedText);
  if (exactShiftMatch?.[1] && exactShiftMatch?.[2]) {
    return buildPleasantShiftSentence(firstName, exactShiftMatch[2], exactShiftMatch[1]);
  }

  const namedShiftMatch =
    /^you’re\s+(?:on\s+)?(.+?)\s+on\s+(.+?)(?:,\s+((?:from\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)\s+to\s+\d{1,2}:\d{2}\s*(?:AM|PM)))?\.?$/i.exec(
      trimmedText
    );
  if (namedShiftMatch?.[1] && namedShiftMatch?.[2]) {
    return buildPleasantShiftSentence(
      firstName,
      namedShiftMatch[1],
      namedShiftMatch[2],
      namedShiftMatch[3]?.replace(/^from\s+/i, '')
    );
  }

  const offMatch = /^you’re\s+off\s+(?:on\s+)?(.+?)\.?$/i.exec(trimmedText);
  if (offMatch?.[1]) {
    return buildPleasantShiftSentence(firstName, 'off', offMatch[1]);
  }

  if (!firstName) {
    return trimmedText;
  }

  return `${firstName}, ${trimmedText}`;
}

export function formatVoiceAssistantResponseText(
  text: string,
  userContext: VoiceAssistantUserContext | null,
  shiftData?: ShiftQueryResult
): string {
  const sanitizedText = sanitizeVoiceAssistantResponseText(text);
  const firstName = getPersonalizationName(userContext);
  const structuredRangeAnswer = formatStructuredRangeAnswer(shiftData, firstName);
  if (structuredRangeAnswer) {
    return structuredRangeAnswer;
  }
  return makeResponsePleasant(sanitizedText, firstName);
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
  private queuedTextQuery: string | null = null;
  private queuedTextQueryDrainTimeout: ReturnType<typeof setTimeout> | null = null;
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

  private buildLocalShiftBrainAnalyticsContext(query: string) {
    const localShiftBrainIntent = classifyLocalShiftBrainIntent(query);
    return {
      intent_guess: localShiftBrainIntent.intent,
      locale: localShiftBrainIntent.language,
      schedule_name: this.userContext?.scheduleName ?? this.userContext?.shiftCycle.name ?? null,
      query_length: query.trim().length,
    };
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
            const errorCode = (error as Error & { code?: string }).code;
            if (error.message === 'Speech recognition permission denied') {
              this.handleError('permission_denied', error.message);
            } else if (errorCode === 'offline_unavailable') {
              this.emitNotice(
                'warning',
                this.translateDashboard(
                  'voiceAssistant.notices.offlineRecognitionUnavailable',
                  "Offline voice input isn't available on this device right now."
                ),
                'offline_recognition_unavailable'
              );
              this.resetEphemeralState();
              this.setState('idle');
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
        this.resolveVoiceLocale()
      );
    } finally {
      this.isStartingListening = false;
    }
  }

  /**
   * Process a text query directly, bypassing STT.
   * Used by onboarding suggestion chips and non-voice entry points.
   */
  async processTextQuery(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    if (
      this.currentState === 'listening' ||
      this.currentState === 'processing' ||
      this.currentState === 'speaking'
    ) {
      this.queuedTextQuery = trimmedQuery;
      this.emitNotice(
        'info',
        this.translateDashboard('voiceAssistant.notices.queuedQuery', "I'll answer that next."),
        'queued_query'
      );
      return;
    }

    await this.processTranscript(trimmedQuery, false);
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
    this.emitNotice(
      'warning',
      this.translateDashboard(
        'voiceAssistant.errors.recognition',
        "I didn't catch that. Please try again."
      ),
      'no_speech'
    );
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
    this.queuedTextQuery = null;
    if (this.queuedTextQueryDrainTimeout) {
      clearTimeout(this.queuedTextQueryDrainTimeout);
      this.queuedTextQueryDrainTimeout = null;
    }
    this.resetEphemeralState();

    switch (this.currentState) {
      case 'listening':
        await speechRecognitionService.abort();
        break;
      case 'processing':
        ryvroBrainService.abort('user');
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

    await this.processTranscript(transcript, true);
  }

  private async processTranscript(transcript: string, fromListening: boolean): Promise<void> {
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript) {
      if (fromListening) {
        this.resetEphemeralState();
        this.setState('idle');
      }
      return;
    }

    // Create user message
    const userMessage: VoiceMessage = {
      id: generateMessageId(),
      role: 'user',
      text: trimmedTranscript,
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
   * Send query to the Ryvro voice backend and handle response.
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
    const localShiftBrainAnalyticsContext = this.buildLocalShiftBrainAnalyticsContext(query);

    // Local-first: answer deterministic schedule questions on-device before using the backend
    const localShiftBrainResult = answerWithLocalShiftBrain(
      query,
      this.userContext.shiftCycle,
      this.userContext.name ?? ''
    );

    if (localShiftBrainResult.handled && localShiftBrainResult.text) {
      logger.info('Query handled by local shift brain', {
        toolName: localShiftBrainResult.toolName,
      });
      Analytics.track('voice_assistant_local_shift_brain_handled', {
        ...localShiftBrainAnalyticsContext,
        tool_name: localShiftBrainResult.toolName ?? 'unknown',
      });

      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      const displayText = formatVoiceAssistantResponseText(
        formatTimesInTextForDisplay(localShiftBrainResult.text),
        this.userContext,
        localShiftBrainResult.toolName
          ? { toolName: localShiftBrainResult.toolName, data: localShiftBrainResult.data ?? null }
          : undefined
      );
      const assistantMessage: VoiceMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: displayText,
        timestamp: Date.now(),
        shiftData: localShiftBrainResult.toolName
          ? { toolName: localShiftBrainResult.toolName, data: localShiftBrainResult.data ?? null }
          : undefined,
      };

      this.conversationHistory.push(assistantMessage);
      this.trimHistory();
      this.callbacks?.onAssistantMessage(assistantMessage);

      await this.speakResponse(displayText, requestToken);
      return;
    }

    if (networkService.getSnapshot().status === 'offline') {
      Analytics.track('voice_assistant_local_shift_brain_unhandled', {
        ...localShiftBrainAnalyticsContext,
        needs_connection: true,
      });
      const localOnlyText = buildLocalShiftBrainUnsupportedResponse(
        this.userContext.shiftCycle,
        this.userContext.name ?? ''
      );

      const displayText = formatVoiceAssistantResponseText(
        formatTimesInTextForDisplay(localOnlyText),
        this.userContext
      );
      const assistantMessage: VoiceMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: displayText,
        timestamp: Date.now(),
      };

      this.conversationHistory.push(assistantMessage);
      this.trimHistory();
      this.callbacks?.onAssistantMessage(assistantMessage);

      await this.speakResponse(displayText, requestToken);
      return;
    }

    // Use the backend for questions the local shift brain cannot confidently answer
    try {
      const response = await ryvroBrainService.query(
        query,
        this.userContext,
        this.conversationHistory
      );

      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      const displayText = formatVoiceAssistantResponseText(
        formatTimesInTextForDisplay(response.text),
        this.userContext,
        response.shiftData
      );
      const assistantMessage: VoiceMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: displayText,
        timestamp: Date.now(),
        shiftData: response.shiftData,
      };

      this.conversationHistory.push(assistantMessage);
      this.trimHistory();
      this.callbacks?.onAssistantMessage(assistantMessage);

      // Speak the response
      await this.speakResponse(displayText, requestToken);
    } catch (error) {
      if (this.currentProcessingToken !== requestToken) {
        return;
      }

      if (error instanceof RyvroBrainServiceError) {
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

    const audioRepliesAvailable = await textToSpeechService.isAvailable();
    if (!audioRepliesAvailable) {
      this.emitAudioUnavailableNotice();
      this.resetEphemeralState();
      this.setState('idle');
      return;
    }

    this.currentSpeechToken = requestToken;
    this.setState('speaking');

    const speechLocale = this.resolveVoiceLocale();
    const localeConfig = voiceAssistantConfig.supportedLocales?.find(
      (l) => l.code === speechLocale
    );
    const ttsLanguage = localeConfig?.ttsLanguage ?? speechLocale;

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
        logger.warn('Voice assistant could not play audio response', {
          error: error.message,
        });
        this.emitAudioUnavailableNotice();
        this.resetEphemeralState();
        this.setState('idle');
      },
    });
  }

  private emitAudioUnavailableNotice(): void {
    this.emitNotice(
      'info',
      this.translateDashboard(
        'voiceAssistant.notices.audioUnavailable',
        "Audio replies aren't available right now. You can still read Ryvro's answer."
      ),
      'audio_unavailable'
    );
  }

  private resolveVoiceLocale(): string {
    const normalizedLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? 'en');
    return VOICE_LOCALE_BY_APP_LANGUAGE[normalizedLanguage] ?? voiceAssistantConfig.locale;
  }

  /**
   * Handle an error and transition to error state.
   */
  private handleError(
    type: VoiceAssistantErrorType,
    message: string,
    overrides: Partial<VoiceAssistantError> = {}
  ): void {
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
      message: this.toUserFacingErrorMessage(type, message, overrides.code),
      retryable: overrides.retryable ?? retryableDefaults[type],
      code: overrides.code,
      requestId: overrides.requestId,
      statusCode: overrides.statusCode,
    };

    if (error.retryable || type === 'permission_denied') {
      logger.warn('Voice assistant error', {
        type,
        retryable: error.retryable,
        code: error.code,
        requestId: error.requestId,
        statusCode: error.statusCode,
        message: error.message,
      });
    } else {
      logger.error('Voice assistant error', new Error(message), { type });
    }

    this.resetEphemeralState();
    this.setState('error');
    this.callbacks?.onError(error);
  }

  private toUserFacingErrorMessage(
    type: VoiceAssistantErrorType,
    rawMessage: string,
    code?: string
  ): string {
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
        if (code === 'backend_not_configured') {
          return rawMessage;
        }
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

    if (!force && state === 'idle') {
      this.scheduleQueuedTextQueryDrain();
    }
  }

  private resetEphemeralState(): void {
    this.currentProcessingToken = null;
    this.currentSpeechToken = null;
    this.clearListeningWatchdogTimers();
  }

  private scheduleQueuedTextQueryDrain(): void {
    if (!this.queuedTextQuery || this.currentState !== 'idle' || this.queuedTextQueryDrainTimeout) {
      return;
    }

    this.queuedTextQueryDrainTimeout = setTimeout(() => {
      this.queuedTextQueryDrainTimeout = null;

      const queuedQuery = this.queuedTextQuery;
      this.queuedTextQuery = null;

      if (!queuedQuery || this.currentState !== 'idle' || !this.userContext) {
        return;
      }

      void this.processTextQuery(queuedQuery);
    }, 0);
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
    ryvroBrainService.destroy();
    this.callbacks = null;
    this.userContext = null;
    this.conversationHistory = [];
    this.isStartingListening = false;
    this.activeRequestToken = 0;
    this.queuedTextQuery = null;
    if (this.queuedTextQueryDrainTimeout) {
      clearTimeout(this.queuedTextQueryDrainTimeout);
      this.queuedTextQueryDrainTimeout = null;
    }
    this.resetEphemeralState();
    this.currentState = 'idle';
  }
}

export const voiceAssistantService = new VoiceAssistantService();
