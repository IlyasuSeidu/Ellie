import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHeuristicDraft,
  normalizeUniversalScheduleDraft,
  validateUniversalScheduleDraft,
} from '../universal-shift-utils';

test('buildHeuristicDraft creates a day/night/off universal schedule', () => {
  const draft = buildHeuristicDraft(
    'I work 4 days, 4 nights, then 4 off. I start today on my first night.',
    'Africa/Accra',
    '2026-05-20'
  );

  assert.ok(draft);
  assert.equal(draft.sequence.length, 12);
  assert.equal(draft.phaseOffset, 4);
  assert.equal(draft.shiftDefinitions.length, 3);
});

test('normalizeUniversalScheduleDraft rewrites ids and preserves valid sequence references', () => {
  const draft = buildHeuristicDraft('4 days 4 nights 4 off', 'Africa/Accra', '2026-05-20');
  assert.ok(draft);

  const normalized = normalizeUniversalScheduleDraft(draft, '4 days 4 nights 4 off');
  const ids = new Set(normalized.shiftDefinitions.map((definition) => definition.id));

  assert.equal(normalized.source, 'ai');
  assert.equal(normalized.sequence.length, 12);
  assert.ok(normalized.sequence.every((item) => ids.has(item.shiftDefinitionId)));
  assert.ok(normalized.aiDraftMeta?.originalPrompt.includes('4 days'));
});

test('validateUniversalScheduleDraft rejects orphaned sequence items', () => {
  const draft = buildHeuristicDraft('4 days 4 nights 4 off', 'Africa/Accra', '2026-05-20');
  assert.ok(draft);
  const broken = {
    ...draft,
    sequence: [{ id: 'bad', shiftDefinitionId: 'missing' }],
  };

  const errors = validateUniversalScheduleDraft(broken);
  assert.ok(errors.some((error) => error.includes('shiftDefinitionId')));
});

test('validateUniversalScheduleDraft allows confirmed 24-hour timed shifts', () => {
  const draft = buildHeuristicDraft('24 on 48 off', 'Africa/Accra', '2026-05-20');
  assert.ok(draft);
  const workId = draft.shiftDefinitions[0]?.id;
  assert.ok(workId);

  const fireSchedule = {
    ...draft,
    shiftDefinitions: [
      {
        ...draft.shiftDefinitions[0],
        name: 'Station Duty',
        startTime: '08:00',
        endTime: '08:00',
        crossesMidnight: true,
      },
      ...draft.shiftDefinitions.slice(1),
    ],
    sequence: [
      { id: 's1', shiftDefinitionId: workId },
      { id: 's2', shiftDefinitionId: draft.shiftDefinitions[1]?.id ?? workId },
      { id: 's3', shiftDefinitionId: draft.shiftDefinitions[1]?.id ?? workId },
    ],
  };

  assert.deepEqual(validateUniversalScheduleDraft(fireSchedule), []);
});
