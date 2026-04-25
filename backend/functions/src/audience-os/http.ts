import type { AudienceRunInput, ProductManifest } from './types';

export type AudienceOpsErrorCode = 'invalid_request' | 'unsupported_adapter';

export interface AudienceOpsSuccessEnvelope {
  ok: true;
  requestId: string;
  data: Record<string, unknown>;
}

export interface AudienceOpsErrorEnvelope {
  ok: false;
  requestId: string;
  error: {
    code: AudienceOpsErrorCode;
    message: string;
    retryable: boolean;
    requestId: string;
  };
}

export function createAudienceOpsError(
  requestId: string,
  code: AudienceOpsErrorCode,
  message: string
): AudienceOpsErrorEnvelope {
  return {
    ok: false,
    requestId,
    error: {
      code,
      message,
      retryable: false,
      requestId,
    },
  };
}

export function validateAudienceRunInput(body: unknown): AudienceRunInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  const candidate = body as Partial<AudienceRunInput> & { adapterId?: string };
  if (candidate.adapterId && candidate.adapterId !== 'ellie') {
    throw new Error('Only the "ellie" adapter is implemented in this repo right now.');
  }

  if (!candidate.manifest || typeof candidate.manifest !== 'object') {
    throw new Error('Request body must include a manifest object.');
  }

  const manifest = candidate.manifest as ProductManifest;

  return {
    manifest,
    rawLeads: Array.isArray(candidate.rawLeads) ? candidate.rawLeads : [],
    leads: Array.isArray(candidate.leads) ? candidate.leads : [],
    now: typeof candidate.now === 'string' ? candidate.now : undefined,
  };
}
