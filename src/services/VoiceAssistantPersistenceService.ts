/**
 * Voice assistant local persistence.
 *
 * Persists conversation history, last error, wake-word session state,
 * and timestamped diagnostics using AsyncStorageService.
 * Supports optional TTL so restored state can expire automatically.
 */

import { asyncStorageService } from './AsyncStorageService';
import { logger } from '@/utils/logger';
import type {
  VoiceAssistantDiagnosticEvent,
  VoiceAssistantError,
  VoiceMessage,
} from '@/types/voiceAssistant';

const HISTORY_KEY = 'voice-assistant:history:v1';
const LAST_ERROR_KEY = 'voice-assistant:last-error:v1';
const WAKE_WORD_SESSION_KEY = 'voice-assistant:wake-word-session:v1';
const DIAGNOSTICS_KEY = 'voice-assistant:diagnostics:v1';
const MAX_PERSISTED_HISTORY = 50;
const MAX_PERSISTED_DIAGNOSTICS = 100;

export interface VoiceAssistantWakeWordSessionState {
  unavailable: boolean;
  reason?: string;
  updatedAt: number;
}

export interface VoiceAssistantPersistedState {
  history: VoiceMessage[];
  lastError: VoiceAssistantError | null;
  wakeWordSession: VoiceAssistantWakeWordSessionState | null;
  diagnostics: VoiceAssistantDiagnosticEvent[];
}

export interface VoiceAssistantPersistenceOptions {
  ttlSeconds?: number;
}

function isValidVoiceMessage(value: unknown): value is VoiceMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as VoiceMessage;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.text === 'string' &&
    typeof message.timestamp === 'number'
  );
}

function isValidVoiceAssistantError(value: unknown): value is VoiceAssistantError {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const error = value as VoiceAssistantError;
  return (
    typeof error.type === 'string' &&
    typeof error.message === 'string' &&
    typeof error.retryable === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidWakeWordSessionState(value: unknown): value is VoiceAssistantWakeWordSessionState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.unavailable === 'boolean' &&
    typeof value.updatedAt === 'number' &&
    (typeof value.reason === 'undefined' || typeof value.reason === 'string')
  );
}

function isValidDiagnosticEvent(value: unknown): value is VoiceAssistantDiagnosticEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.timestamp === 'number' &&
    typeof value.category === 'string' &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    (typeof value.retryable === 'undefined' || typeof value.retryable === 'boolean') &&
    (typeof value.details === 'undefined' || isRecord(value.details))
  );
}

class VoiceAssistantPersistenceService {
  async hydrate(): Promise<VoiceAssistantPersistedState> {
    try {
      const [historyRaw, lastErrorRaw, wakeWordSessionRaw, diagnosticsRaw] = await Promise.all([
        asyncStorageService.get<unknown>(HISTORY_KEY),
        asyncStorageService.get<unknown>(LAST_ERROR_KEY),
        asyncStorageService.get<unknown>(WAKE_WORD_SESSION_KEY),
        asyncStorageService.get<unknown>(DIAGNOSTICS_KEY),
      ]);

      const history = Array.isArray(historyRaw)
        ? historyRaw.filter(isValidVoiceMessage).slice(-MAX_PERSISTED_HISTORY)
        : [];
      const lastError = isValidVoiceAssistantError(lastErrorRaw) ? lastErrorRaw : null;
      const wakeWordSession = isValidWakeWordSessionState(wakeWordSessionRaw)
        ? wakeWordSessionRaw
        : null;
      const diagnostics = Array.isArray(diagnosticsRaw)
        ? diagnosticsRaw.filter(isValidDiagnosticEvent).slice(-MAX_PERSISTED_DIAGNOSTICS)
        : [];

      return { history, lastError, wakeWordSession, diagnostics };
    } catch (error) {
      logger.error('Failed to hydrate voice assistant persistence', error as Error);
      return { history: [], lastError: null, wakeWordSession: null, diagnostics: [] };
    }
  }

  async persistHistory(
    history: VoiceMessage[],
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const normalizedHistory = history.slice(-MAX_PERSISTED_HISTORY);
    if (normalizedHistory.length === 0) {
      try {
        await asyncStorageService.remove(HISTORY_KEY);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(HISTORY_KEY, normalizedHistory, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(HISTORY_KEY, normalizedHistory);
  }

  async persistLastError(
    error: VoiceAssistantError | null,
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    if (!error) {
      try {
        await asyncStorageService.remove(LAST_ERROR_KEY);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(LAST_ERROR_KEY, error, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(LAST_ERROR_KEY, error);
  }

  async persistWakeWordSession(
    session: VoiceAssistantWakeWordSessionState | null,
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    if (!session) {
      try {
        await asyncStorageService.remove(WAKE_WORD_SESSION_KEY);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(WAKE_WORD_SESSION_KEY, session, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(WAKE_WORD_SESSION_KEY, session);
  }

  async persistDiagnostics(
    diagnostics: VoiceAssistantDiagnosticEvent[],
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const normalized = diagnostics.slice(-MAX_PERSISTED_DIAGNOSTICS);
    if (normalized.length === 0) {
      try {
        await asyncStorageService.remove(DIAGNOSTICS_KEY);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(DIAGNOSTICS_KEY, normalized, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(DIAGNOSTICS_KEY, normalized);
  }

  async appendDiagnostic(
    diagnostic: Omit<VoiceAssistantDiagnosticEvent, 'id' | 'timestamp'> &
      Partial<Pick<VoiceAssistantDiagnosticEvent, 'id' | 'timestamp'>>,
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const hydrated = await this.hydrate();
    const normalizedDiagnostic: VoiceAssistantDiagnosticEvent = {
      id: diagnostic.id ?? `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: diagnostic.timestamp ?? Date.now(),
      category: diagnostic.category,
      code: diagnostic.code,
      message: diagnostic.message,
      retryable: diagnostic.retryable,
      details: diagnostic.details,
    };

    const nextDiagnostics = [...hydrated.diagnostics, normalizedDiagnostic].slice(
      -MAX_PERSISTED_DIAGNOSTICS
    );
    await this.persistDiagnostics(nextDiagnostics, options);
  }

  async clear(): Promise<void> {
    try {
      await asyncStorageService.removeMultiple([
        HISTORY_KEY,
        LAST_ERROR_KEY,
        WAKE_WORD_SESSION_KEY,
        DIAGNOSTICS_KEY,
      ]);
    } catch {
      // Best-effort cleanup.
    }
  }
}

export const voiceAssistantPersistenceService = new VoiceAssistantPersistenceService();
