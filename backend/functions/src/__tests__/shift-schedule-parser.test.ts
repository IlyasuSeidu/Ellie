import assert from 'node:assert/strict';
import test from 'node:test';
import { ShiftScheduleParserError, parseShiftScheduleDescription } from '../shift-schedule-parser';

test('parseShiftScheduleDescription validates required prompt', async () => {
  await assert.rejects(
    () =>
      parseShiftScheduleDescription(
        { prompt: '', timezone: 'Africa/Accra', locale: 'en-US', today: '2026-05-20' },
        'test-key'
      ),
    (error) => error instanceof ShiftScheduleParserError && error.code === 'invalid_request'
  );
});

test('parseShiftScheduleDescription falls back to deterministic parser when provider fails', async () => {
  const result = await parseShiftScheduleDescription(
    {
      prompt: 'I work 4 days, 4 nights, then 4 off.',
      timezone: 'Africa/Accra',
      locale: 'en-US',
      today: '2026-05-20',
    },
    'bad-key'
  );

  assert.equal(result.status, 'draft');
  assert.equal(result.scheduleDraft?.sequence.length, 12);
  assert.ok(result.warnings.some((warning) => warning.includes('deterministic')));
});

test('parseShiftScheduleDescription fallback supports every universal shift kind', async () => {
  const result = await parseShiftScheduleDescription(
    {
      prompt:
        'Build 2 days, 1 evening, 2 nights, 1 travel, 1 on call, 1 training, 1 leave, 1 custom maintenance, then 3 off.',
      timezone: 'Africa/Accra',
      locale: 'en-US',
      today: '2026-05-21',
    },
    'bad-key'
  );

  assert.equal(result.status, 'draft');
  const draft = result.scheduleDraft;
  assert.ok(draft);
  assert.equal(draft.sequence.length, 13);
  assert.deepEqual(
    [...new Set(draft.shiftDefinitions.map((definition) => definition.kind))].sort(),
    ['custom', 'leave', 'off', 'on_call', 'training', 'travel', 'work'].sort()
  );
  assert.ok(draft.shiftDefinitions.some((definition) => definition.name === 'Evening Shift'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.countsAsNight));
  assert.ok(
    draft.shiftDefinitions.some(
      (definition) => definition.kind === 'travel' && definition.countsAsWork
    )
  );
  assert.ok(
    draft.shiftDefinitions.some(
      (definition) => definition.kind === 'on_call' && !definition.countsAsWork
    )
  );
});

test('parseShiftScheduleDescription fallback handles broad industry shift language', async () => {
  const result = await parseShiftScheduleDescription(
    {
      prompt:
        'For a mixed healthcare, aviation, mine, retail, and maintenance roster: 1 early, 1 late, 1 graveyard, 1 fly-out, 1 standby, 1 course, 1 sick leave, 1 maintenance, then 2 rest.',
      timezone: 'Africa/Accra',
      locale: 'en-US',
      today: '2026-05-21',
    },
    'bad-key'
  );

  assert.equal(result.status, 'draft');
  const draft = result.scheduleDraft;
  assert.ok(draft);
  assert.equal(draft.sequence.length, 10);
  assert.ok(draft.shiftDefinitions.some((definition) => definition.name === 'Day Shift'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.name === 'Evening Shift'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.name === 'Night Shift'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'travel'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'on_call'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'training'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'leave'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'custom'));
  assert.ok(draft.shiftDefinitions.some((definition) => definition.kind === 'off'));
});
