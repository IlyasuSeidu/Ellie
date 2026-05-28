import { randomUUID } from 'crypto';
import { RyvroBrainErrorCode, RyvroBrainErrorEnvelope, RyvroBrainRequest } from './types';

export interface ValidationResult {
  ok: true;
  request: RyvroBrainRequest;
}

export interface ValidationFailure {
  ok: false;
  statusCode: number;
  code: RyvroBrainErrorCode;
  message: string;
}

export function createRequestId(rawRequestId: unknown): string {
  if (typeof rawRequestId === 'string') {
    const normalized = rawRequestId.trim();
    if (normalized.length > 0) {
      return normalized.slice(0, 120);
    }
  }
  return randomUUID();
}

export function createErrorEnvelope(
  requestId: string,
  code: RyvroBrainErrorCode,
  message: string,
  retryable: boolean
): RyvroBrainErrorEnvelope {
  return {
    ok: false,
    requestId,
    error: {
      code,
      message,
      retryable,
      requestId,
    },
  };
}

function isValidShiftCycle(shiftCycle: unknown): boolean {
  if (!shiftCycle || typeof shiftCycle !== 'object') {
    return false;
  }

  const typedShiftCycle = shiftCycle as RyvroBrainRequest['userContext']['shiftCycle'];
  return (
    typeof typedShiftCycle.startDate === 'string' &&
    typedShiftCycle.startDate.length > 0 &&
    typeof typedShiftCycle.daysOff === 'number'
  );
}

export function validateRequestBody(body: unknown): ValidationResult | ValidationFailure {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      statusCode: 400,
      code: 'invalid_request',
      message: 'Request body must be a JSON object.',
    };
  }

  const request = body as Partial<RyvroBrainRequest>;
  if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
    return {
      ok: false,
      statusCode: 400,
      code: 'invalid_request',
      message: 'Missing or invalid query.',
    };
  }

  if (!request.userContext || typeof request.userContext !== 'object') {
    return {
      ok: false,
      statusCode: 400,
      code: 'missing_user_context',
      message: 'Missing user context.',
    };
  }

  if (
    !request.userContext.name ||
    typeof request.userContext.name !== 'string' ||
    !isValidShiftCycle(request.userContext.shiftCycle)
  ) {
    return {
      ok: false,
      statusCode: 422,
      code: 'invalid_user_context',
      message: 'Invalid user context.',
    };
  }

  const sanitizedRequest: RyvroBrainRequest = {
    ...request,
    query: request.query.trim().slice(0, 500),
  } as RyvroBrainRequest;

  return { ok: true, request: sanitizedRequest };
}
