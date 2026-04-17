/**
 * Voice assistant local persistence.
 *
 * Persists conversation history, last error, wake-word session state,
 * and timestamped diagnostics using AsyncStorageService.
 * Supports optional TTL so restored state can expire automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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
const LOCAL_SCOPE_KEY = 'voice-assistant:local-user-id:v1';
const MAX_PERSISTED_HISTORY = 50;
const MAX_PERSISTED_DIAGNOSTICS = 100;
const DEFAULT_SCOPE = 'global';

export interface VoiceAssistantWakeWordSessionState {
  unavailable: boolean;
  reason?: string;
  updatedAt: number;
  configFingerprint?: string;
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
    (typeof value.reason === 'undefined' || typeof value.reason === 'string') &&
    (typeof value.configFingerprint === 'undefined' || typeof value.configFingerprint === 'string')
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
  private scope = DEFAULT_SCOPE;

  setScope(scope: string | null | undefined): void {
    const normalized = scope?.trim();
    this.scope = normalized && normalized.length > 0 ? normalized : DEFAULT_SCOPE;
  }

  private getScopedKey(baseKey: string): string {
    return this.scope === DEFAULT_SCOPE ? baseKey : `${baseKey}:${this.scope}`;
  }

  private async readScopedValue<T>(baseKey: string): Promise<T | null> {
    const scopedKey = this.getScopedKey(baseKey);
    const scopedValue = await asyncStorageService.get<T>(scopedKey);
    if (scopedValue !== null && typeof scopedValue !== 'undefined') {
      return scopedValue;
    }

    if (this.scope === DEFAULT_SCOPE) {
      return null;
    }

    const legacyValue = await asyncStorageService.get<T>(baseKey);
    if (legacyValue === null || typeof legacyValue === 'undefined') {
      return null;
    }

    try {
      await asyncStorageService.set(scopedKey, legacyValue);
      await asyncStorageService.remove(baseKey);
    } catch (error) {
      logger.warn('Failed to migrate legacy voice assistant persistence key', {
        error: error instanceof Error ? error.message : String(error),
        key: baseKey,
        scope: this.scope,
      });
    }

    return legacyValue;
  }

  async hydrate(): Promise<VoiceAssistantPersistedState> {
    try {
      const [historyRaw, lastErrorRaw, wakeWordSessionRaw, diagnosticsRaw] = await Promise.all([
        this.readScopedValue<unknown>(HISTORY_KEY),
        this.readScopedValue<unknown>(LAST_ERROR_KEY),
        this.readScopedValue<unknown>(WAKE_WORD_SESSION_KEY),
        this.readScopedValue<unknown>(DIAGNOSTICS_KEY),
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
    const historyKey = this.getScopedKey(HISTORY_KEY);
    if (normalizedHistory.length === 0) {
      try {
        await asyncStorageService.remove(historyKey);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(historyKey, normalizedHistory, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(historyKey, normalizedHistory);
  }

  async persistLastError(
    error: VoiceAssistantError | null,
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const lastErrorKey = this.getScopedKey(LAST_ERROR_KEY);
    if (!error) {
      try {
        await asyncStorageService.remove(lastErrorKey);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(lastErrorKey, error, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(lastErrorKey, error);
  }

  async persistWakeWordSession(
    session: VoiceAssistantWakeWordSessionState | null,
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const wakeWordSessionKey = this.getScopedKey(WAKE_WORD_SESSION_KEY);
    if (!session) {
      try {
        await asyncStorageService.remove(wakeWordSessionKey);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(wakeWordSessionKey, session, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(wakeWordSessionKey, session);
  }

  async persistDiagnostics(
    diagnostics: VoiceAssistantDiagnosticEvent[],
    options: VoiceAssistantPersistenceOptions = {}
  ): Promise<void> {
    const normalized = diagnostics.slice(-MAX_PERSISTED_DIAGNOSTICS);
    const diagnosticsKey = this.getScopedKey(DIAGNOSTICS_KEY);
    if (normalized.length === 0) {
      try {
        await asyncStorageService.remove(diagnosticsKey);
      } catch {
        // Best-effort cleanup.
      }
      return;
    }

    if (typeof options.ttlSeconds === 'number' && options.ttlSeconds > 0) {
      await asyncStorageService.setWithTTL(diagnosticsKey, normalized, options.ttlSeconds);
      return;
    }

    await asyncStorageService.set(diagnosticsKey, normalized);
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
      const scopedKeys = [
        this.getScopedKey(HISTORY_KEY),
        this.getScopedKey(LAST_ERROR_KEY),
        this.getScopedKey(WAKE_WORD_SESSION_KEY),
        this.getScopedKey(DIAGNOSTICS_KEY),
      ];

      const keysToClear =
        this.scope === DEFAULT_SCOPE
          ? scopedKeys
          : [...scopedKeys, HISTORY_KEY, LAST_ERROR_KEY, WAKE_WORD_SESSION_KEY, DIAGNOSTICS_KEY];

      await asyncStorageService.removeMultiple(keysToClear);
    } catch {
      // Best-effort cleanup.
    }
  }
}

export async function resolveVoiceAssistantPersistenceScope(
  firebaseUid?: string | null
): Promise<string> {
  if (firebaseUid) {
    return `auth:${firebaseUid}`;
  }

  const generated = `local:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const existing = await asyncStorageService.get<string>(LOCAL_SCOPE_KEY);
    if (existing) {
      return existing.startsWith('local:') ? existing : `local:${existing}`;
    }

    const legacyExisting = await AsyncStorage.getItem(LOCAL_SCOPE_KEY);
    if (legacyExisting) {
      const normalized = legacyExisting.startsWith('local:')
        ? legacyExisting
        : `local:${legacyExisting}`;
      await asyncStorageService.set(LOCAL_SCOPE_KEY, normalized);
      await AsyncStorage.removeItem(LOCAL_SCOPE_KEY);
      return normalized;
    }

    await asyncStorageService.set(LOCAL_SCOPE_KEY, generated);
  } catch (error) {
    logger.error('Failed to resolve voice assistant persistence scope', error as Error);
  }

  return generated;
}

export const voiceAssistantPersistenceService = new VoiceAssistantPersistenceService();
