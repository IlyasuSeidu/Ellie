/**
 * Ellie Brain — Firebase Cloud Function Entry Point
 *
 * HTTPS callable function that processes voice assistant queries.
 * Validates requests, calls OpenAI API with tool use, returns responses.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { buildDailyAudienceRun, ellieAudienceAdapter } from './audience-os';
import {
  createAudienceOpsError,
  type AudienceOpsSuccessEnvelope,
  validateAudienceRunInput,
} from './audience-os/http';
import { EllieBrainProcessingError, processQuery } from './ellie-brain';
import { EllieBrainSuccessEnvelope } from './types';
import { createErrorEnvelope, createRequestId, validateRequestBody } from './http-utils';

const openaiApiKey = defineSecret('OPENAI_API_KEY');
const PROVIDER_TIMEOUT_MS = 25000;

function logStructured(level: 'info' | 'error', message: string, details: Record<string, unknown>) {
  const payload = JSON.stringify({ message, ...details });
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(payload);
}

/**
 * Main HTTPS endpoint for the Ellie Brain.
 *
 * POST /ellieBrain
 * Body: EllieBrainRequest
 * Response: EllieBrainResponse
 */
export const ellieBrain = onRequest(
  {
    secrets: [openaiApiKey],
    cors: true,
    maxInstances: 20,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (req, res) => {
    const startedAt = Date.now();
    const requestId = createRequestId(req.get('x-request-id'));

    // Only allow POST
    if (req.method !== 'POST') {
      res
        .status(405)
        .json(createErrorEnvelope(requestId, 'invalid_request', 'Method not allowed.', false));
      return;
    }

    try {
      const validation = validateRequestBody(req.body);
      if (!validation.ok) {
        const shouldRetry =
          validation.code === 'rate_limited' || validation.code === 'provider_timeout';
        res
          .status(validation.statusCode)
          .json(createErrorEnvelope(requestId, validation.code, validation.message, shouldRetry));
        return;
      }

      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        logStructured('error', 'OPENAI_API_KEY secret is not configured', {
          requestId,
          errorCode: 'internal_error',
          latencyMs: Date.now() - startedAt,
        });
        res
          .status(500)
          .json(
            createErrorEnvelope(requestId, 'internal_error', 'Service configuration error.', false)
          );
        return;
      }

      const response = await processQuery(validation.request, apiKey, {
        requestId,
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });

      if (!response.text || response.text.trim().length === 0) {
        throw new EllieBrainProcessingError(
          'provider_error',
          'Provider returned an empty response.',
          true,
          502
        );
      }

      const successEnvelope: EllieBrainSuccessEnvelope = {
        ok: true,
        requestId,
        data: {
          ...response,
          requestId,
        },
      };

      logStructured('info', 'Ellie Brain request completed', {
        requestId,
        latencyMs: Date.now() - startedAt,
        providerStatus: 'ok',
      });

      res.status(200).json(successEnvelope);
    } catch (error) {
      const mappedError =
        error instanceof EllieBrainProcessingError
          ? error
          : new EllieBrainProcessingError(
              'internal_error',
              'Something went wrong. Please try again.',
              true,
              500
            );

      logStructured('error', 'Ellie Brain request failed', {
        requestId,
        errorCode: mappedError.code,
        retryable: mappedError.retryable,
        providerStatus: mappedError.providerStatus ?? 'unknown',
        latencyMs: Date.now() - startedAt,
        message: mappedError.message,
      });

      res
        .status(mappedError.statusCode)
        .json(
          createErrorEnvelope(
            requestId,
            mappedError.code,
            mappedError.message,
            mappedError.retryable
          )
        );
    }
  }
);

export const signalLoopPreview = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  (req, res) => {
    const requestId = createRequestId(req.get('x-request-id'));

    if (req.method !== 'POST') {
      res
        .status(405)
        .json(createAudienceOpsError(requestId, 'invalid_request', 'Method not allowed.'));
      return;
    }

    try {
      const input = validateAudienceRunInput(req.body);
      const result = buildDailyAudienceRun(input, ellieAudienceAdapter);

      const response: AudienceOpsSuccessEnvelope = {
        ok: true,
        requestId,
        data: result as unknown as Record<string, unknown>,
      };

      res.status(200).json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid SignalLoop preview request.';
      const code =
        message.includes('adapter') || message.includes('implemented')
          ? 'unsupported_adapter'
          : 'invalid_request';

      res.status(400).json(createAudienceOpsError(requestId, code, message));
    }
  }
);

export const audienceOpsPreview = signalLoopPreview;
