import assert from 'node:assert/strict';
import test from 'node:test';
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

test('validateRequestBody rejects non-object request body', () => {
  const result = validateRequestBody(null);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'invalid_request');
    assert.equal(result.statusCode, 400);
  }
});

test('validateRequestBody rejects missing query', () => {
  const result = validateRequestBody({
    ...validRequest,
    query: ' ',
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'invalid_request');
  }
});

test('validateRequestBody rejects missing user context', () => {
  const result = validateRequestBody({
    query: 'hello',
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'missing_user_context');
  }
});

test('validateRequestBody rejects invalid shift cycle', () => {
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
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, 'invalid_user_context');
    assert.equal(result.statusCode, 422);
  }
});

test('validateRequestBody sanitizes and truncates valid query', () => {
  const longQuery = `  ${'a'.repeat(700)}  `;
  const result = validateRequestBody({
    ...validRequest,
    query: longQuery,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.request.query.length, 500);
  }
});

test('createErrorEnvelope returns normalized error envelope', () => {
  const envelope = createErrorEnvelope('req-123', 'provider_timeout', 'Provider timed out', true);

  assert.deepEqual(envelope, {
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

test('createRequestId uses provided header value when present', () => {
  assert.equal(createRequestId('abc-123'), 'abc-123');
});

test('createRequestId creates UUID when header is missing', () => {
  const requestId = createRequestId(undefined);
  assert.match(
    requestId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});
