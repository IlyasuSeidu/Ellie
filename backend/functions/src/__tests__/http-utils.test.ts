import { createErrorEnvelope, createRequestId, validateRequestBody } from '../http-utils';

const validRequest = {
  query: 'What shift am I on tomorrow?',
  userContext: {
    name: 'Alex',
    shiftCycle: {
      patternType: 'STANDARD_4_4_4',
      shiftSystem: '2-shift',
      daysOn: 4,
      nightsOn: 4,
      daysOff: 4,
      startDate: '2024-01-01',
      phaseOffset: 0,
    },
    currentDate: '2026-02-20',
    currentTime: '11:30',
    shiftSystem: '2-shift',
  },
};

describe('backend http-utils', () => {
  describe('validateRequestBody', () => {
    it('rejects non-object request body', () => {
      const result = validateRequestBody(null);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid_request');
        expect(result.statusCode).toBe(400);
      }
    });

    it('rejects missing query', () => {
      const result = validateRequestBody({
        ...validRequest,
        query: ' ',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid_request');
      }
    });

    it('rejects missing user context', () => {
      const result = validateRequestBody({
        query: 'hello',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('missing_user_context');
      }
    });

    it('rejects invalid shift cycle', () => {
      const result = validateRequestBody({
        ...validRequest,
        userContext: {
          ...validRequest.userContext,
          shiftCycle: {
            ...validRequest.userContext.shiftCycle,
            startDate: '',
          },
        },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid_user_context');
        expect(result.statusCode).toBe(422);
      }
    });

    it('sanitizes and truncates valid query', () => {
      const longQuery = `  ${'a'.repeat(700)}  `;
      const result = validateRequestBody({
        ...validRequest,
        query: longQuery,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.request.query.length).toBe(500);
      }
    });
  });

  describe('createErrorEnvelope', () => {
    it('returns normalized error envelope', () => {
      const envelope = createErrorEnvelope(
        'req-123',
        'provider_timeout',
        'Provider timed out',
        true
      );

      expect(envelope).toEqual({
        ok: false,
        requestId: 'req-123',
        error: {
          code: 'provider_timeout',
          message: 'Provider timed out',
          retryable: true,
          requestId: 'req-123',
        },
      });
    });
  });

  describe('createRequestId', () => {
    it('uses provided header value when present', () => {
      expect(createRequestId('abc-123')).toBe('abc-123');
    });

    it('creates UUID when header is missing', () => {
      const requestId = createRequestId(undefined);
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});
