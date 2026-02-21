/**
 * Ellie Brain Service
 *
 * HTTP client for the Ellie Brain Cloud Function backend.
 * Sends user queries with context and conversation history,
 * receives natural language responses with optional shift data.
 */

import { ellieBrainConfig, voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import type {
  EllieBrainErrorPayload,
  EllieBrainRequest,
  EllieBrainResponse,
  EllieBrainResponseEnvelope,
  VoiceAssistantErrorType,
  VoiceAssistantUserContext,
  VoiceMessage,
} from '@/types/voiceAssistant';

type AbortReason = 'none' | 'timeout' | 'user' | 'superseded';

interface EllieBrainServiceErrorOptions {
  type: VoiceAssistantErrorType;
  message: string;
  retryable: boolean;
  code?: string;
  requestId?: string;
  statusCode?: number;
}

export class EllieBrainServiceError extends Error {
  readonly type: VoiceAssistantErrorType;
  readonly retryable: boolean;
  readonly code?: string;
  readonly requestId?: string;
  readonly statusCode?: number;

  constructor(options: EllieBrainServiceErrorOptions) {
    super(options.message);
    this.name = 'EllieBrainServiceError';
    this.type = options.type;
    this.retryable = options.retryable;
    this.code = options.code;
    this.requestId = options.requestId;
    this.statusCode = options.statusCode;
  }
}

function parseJsonSafe(raw: string): unknown | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function normalizeBackendError(
  statusCode: number,
  rawBody: string,
  parsedBody: unknown,
  fallbackMessage: string
): EllieBrainServiceError {
  const envelope = parsedBody as EllieBrainResponseEnvelope | undefined;
  const structuredError =
    envelope && typeof envelope === 'object' && envelope.error && typeof envelope.error === 'object'
      ? (envelope.error as EllieBrainErrorPayload)
      : undefined;
  const requestId =
    structuredError?.requestId ??
    (envelope && typeof envelope === 'object' ? envelope.requestId : undefined);

  if (structuredError?.message) {
    return new EllieBrainServiceError({
      type:
        structuredError.code === 'rate_limited'
          ? 'rate_limited'
          : structuredError.code === 'provider_timeout'
            ? 'timeout'
            : 'backend_error',
      message: structuredError.message,
      retryable: structuredError.retryable,
      code: structuredError.code,
      requestId,
      statusCode,
    });
  }

  if (statusCode === 429) {
    return new EllieBrainServiceError({
      type: 'rate_limited',
      message: 'Too many requests. Please wait briefly and retry.',
      retryable: true,
      code: 'rate_limited',
      requestId,
      statusCode,
    });
  }

  if (statusCode === 408 || statusCode === 504) {
    return new EllieBrainServiceError({
      type: 'timeout',
      message: 'The request timed out. Please try again.',
      retryable: true,
      code: 'provider_timeout',
      requestId,
      statusCode,
    });
  }

  if (statusCode >= 500) {
    return new EllieBrainServiceError({
      type: 'backend_error',
      message: 'The service is temporarily unavailable. Please try again.',
      retryable: true,
      code: 'provider_error',
      requestId,
      statusCode,
    });
  }

  const plainTextMessage = rawBody.trim() || fallbackMessage;
  return new EllieBrainServiceError({
    type: 'backend_error',
    message: plainTextMessage,
    retryable: false,
    code: 'invalid_request',
    requestId,
    statusCode,
  });
}

function normalizeSuccessResponse(parsedBody: unknown): EllieBrainResponse {
  const envelope = parsedBody as EllieBrainResponseEnvelope | undefined;
  const envelopeError =
    envelope && typeof envelope === 'object' && envelope.error && typeof envelope.error === 'object'
      ? (envelope.error as EllieBrainErrorPayload)
      : undefined;
  if (envelopeError) {
    throw new EllieBrainServiceError({
      type:
        envelopeError.code === 'rate_limited'
          ? 'rate_limited'
          : envelopeError.code === 'provider_timeout'
            ? 'timeout'
            : 'backend_error',
      message: envelopeError.message,
      retryable: envelopeError.retryable,
      code: envelopeError.code,
      requestId: envelopeError.requestId ?? envelope?.requestId,
    });
  }

  const fromEnvelope =
    envelope &&
    typeof envelope === 'object' &&
    envelope.data &&
    typeof envelope.data === 'object' &&
    typeof envelope.data.text === 'string'
      ? {
          ...(envelope.data as EllieBrainResponse),
          requestId: envelope.data.requestId ?? envelope.requestId,
        }
      : null;

  if (fromEnvelope?.text) {
    return fromEnvelope;
  }

  const directPayload =
    parsedBody && typeof parsedBody === 'object' ? (parsedBody as EllieBrainResponse) : null;
  if (directPayload?.text) {
    return directPayload;
  }

  throw new EllieBrainServiceError({
    type: 'backend_error',
    message: 'Received malformed response from Ellie Brain.',
    retryable: true,
    code: 'malformed_response',
  });
}

class EllieBrainService {
  private abortController: AbortController | null = null;
  private abortReason: AbortReason = 'none';

  /**
   * Send a query to the Ellie Brain backend.
   *
   * @param query - The user's transcribed speech
   * @param userContext - User context (name, shift cycle, current date, etc.)
   * @param conversationHistory - Recent messages for multi-turn conversation
   * @returns The brain's response with text and optional shift data
   */
  async query(
    query: string,
    userContext: VoiceAssistantUserContext,
    conversationHistory: VoiceMessage[] = []
  ): Promise<EllieBrainResponse> {
    // Sanitize and truncate query
    const sanitizedQuery = query
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, ellieBrainConfig.maxQueryLength);

    if (!sanitizedQuery) {
      throw new Error('Empty query');
    }

    // Build conversation history (last N messages)
    const history = conversationHistory
      .slice(-voiceAssistantConfig.maxHistoryMessages)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        text: msg.text,
      }));

    const requestBody: EllieBrainRequest = {
      query: sanitizedQuery,
      userContext,
      conversationHistory: history,
    };

    // Cancel any in-flight request
    this.abort('superseded');
    this.abortController = new AbortController();
    this.abortReason = 'none';

    // Set up explicit timeout
    const timeoutId = setTimeout(() => {
      this.abortReason = 'timeout';
      this.abortController?.abort();
    }, ellieBrainConfig.timeout);

    try {
      logger.info('Sending query to Ellie Brain', {
        queryLength: sanitizedQuery.length,
        historyCount: history.length,
      });

      const response = await fetch(ellieBrainConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const rawBody = await response.text().catch(() => '');
        const parsedBody = parseJsonSafe(rawBody);
        throw normalizeBackendError(response.status, rawBody, parsedBody, 'Unknown backend error');
      }

      const rawBody = await response.text().catch(() => '');
      const parsedBody = parseJsonSafe(rawBody);

      if (!parsedBody) {
        throw new EllieBrainServiceError({
          type: 'backend_error',
          message: 'Backend response is not valid JSON.',
          retryable: true,
          code: 'malformed_response',
        });
      }

      const data = normalizeSuccessResponse(parsedBody);

      logger.info('Received response from Ellie Brain', {
        responseLength: data.text.length,
        hasShiftData: !!data.shiftData,
        requestId: data.requestId,
      });

      return data;
    } catch (error) {
      if (error instanceof EllieBrainServiceError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        const abortReason = this.abortReason as AbortReason;
        if (abortReason === 'user' || abortReason === 'superseded') {
          throw new EllieBrainServiceError({
            type: 'unknown',
            message: 'Request cancelled',
            retryable: false,
            code: 'request_cancelled',
          });
        }

        throw new EllieBrainServiceError({
          type: 'timeout',
          message: 'The request timed out. Please try again.',
          retryable: true,
          code: 'provider_timeout',
        });
      }
      if (
        error instanceof TypeError &&
        String(error.message || '')
          .toLowerCase()
          .includes('network request failed')
      ) {
        throw new EllieBrainServiceError({
          type: 'network_error',
          message:
            `Cannot reach Ellie Brain service at ${ellieBrainConfig.url}. ` +
            'Check your internet connection and retry.',
          retryable: true,
          code: 'network_unreachable',
        });
      }
      logger.error('Ellie Brain query failed', error as Error);
      throw new EllieBrainServiceError({
        type: 'backend_error',
        message: (error as Error).message || 'Unknown Ellie Brain error',
        retryable: true,
        code: 'internal_error',
      });
    } finally {
      clearTimeout(timeoutId);
      this.abortController = null;
      this.abortReason = 'none';
    }
  }

  /**
   * Abort any in-flight request.
   */
  abort(reason: Exclude<AbortReason, 'none' | 'timeout'> = 'user'): void {
    if (this.abortController) {
      this.abortReason = reason;
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Clean up.
   */
  destroy(): void {
    this.abort('user');
  }
}

export const ellieBrainService = new EllieBrainService();
