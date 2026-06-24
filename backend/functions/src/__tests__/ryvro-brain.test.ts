import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSystemPrompt, resolveDirectScheduleQuery } from '../ryvro-brain';
import type { RyvroBrainRequest } from '../types';

function makeRequest(overrides: Partial<RyvroBrainRequest['userContext']> = {}): RyvroBrainRequest {
  return {
    query: 'Do I work tomorrow?',
    userContext: {
      name: 'Amina',
      occupation: 'Nurse',
      currentDate: '2026-05-29',
      currentTime: '14:00',
      shiftSystem: '2-shift',
      rosterType: 'rotating',
      shiftCycle: {
        scheduleMode: 'universal',
        patternType: 'UNIVERSAL',
        rosterType: 'rotating',
        shiftSystem: '2-shift',
        daysOn: 2,
        nightsOn: 2,
        daysOff: 3,
        startDate: '2026-05-29',
        phaseOffset: 0,
        universalSchedule: {
          version: 3,
          name: 'Hospital 2-2-3',
          timezone: 'UTC',
          anchorDate: '2026-05-29',
          phaseOffset: 0,
          source: 'manual',
          shiftDefinitions: [
            {
              id: 'day',
              name: 'Ward Day',
              kind: 'work',
              timePolicy: 'timed',
              activePolicy: 'timed_window',
              startTime: '07:00',
              endTime: '19:00',
              countsAsWork: true,
              countsAsNight: false,
              countsForStats: true,
              color: '#2563eb',
              icon: 'medical',
              locationName: 'Ward 7',
            },
            {
              id: 'on-call',
              name: 'On-call',
              kind: 'on_call',
              timePolicy: 'all_day',
              activePolicy: 'all_day_active',
              countsAsWork: true,
              countsAsNight: false,
              countsForStats: true,
              color: '#7c3aed',
              icon: 'call',
            },
            {
              id: 'off',
              name: 'Rest',
              kind: 'off',
              timePolicy: 'none',
              activePolicy: 'not_active',
              countsAsWork: false,
              countsAsNight: false,
              countsForStats: true,
              color: '#78716c',
              icon: 'home',
            },
          ],
          sequence: [
            { id: 'seq-1', shiftDefinitionId: 'day' },
            { id: 'seq-2', shiftDefinitionId: 'on-call' },
            { id: 'seq-3', shiftDefinitionId: 'off' },
          ],
        },
      },
      ...overrides,
    },
  };
}

test('buildSystemPrompt keeps universal voice context broad for non-mining schedules', () => {
  const prompt = buildSystemPrompt(makeRequest());

  assert.match(prompt, /friendly and helpful voice assistant for shift workers/);
  assert.match(
    prompt,
    /Universal shift types: Ward Day \(work\), On-call \(on_call\), Rest \(off\)/
  );
  assert.match(prompt, /User's occupation: Nurse/);
  assert.match(prompt, /Industry assumption: none/);
  assert.match(prompt, /Do not assume the user works in mining, FIFO, or at a site/);
  assert.match(prompt, /Use "work location" when speaking generally/);
  assert.match(prompt, /Saturday two weeks from now/);
  assert.match(prompt, /next two weeks Saturday/);
  assert.match(prompt, /next week Saturday/);
  assert.match(prompt, /Saturday next week/);
  assert.match(prompt, /Next two Saturdays/);
  assert.match(prompt, /next 7 days/);
  assert.match(prompt, /next 14 days/);
  assert.match(prompt, /Last week/);
  assert.match(prompt, /from June 12 to June 27/);
  assert.match(prompt, /first Saturday in August/);
  assert.match(prompt, /final seven calendar days of the current month/);
  assert.match(prompt, /ask one short clarification question before using a tool/);
  assert.doesNotMatch(prompt, /User's roster type: FIFO/);
});

test('resolveDirectScheduleQuery routes common spoken ranges without model help', () => {
  assert.deepEqual(
    resolveDirectScheduleQuery({ ...makeRequest(), query: 'What shifts do I have next 14 days?' }),
    {
      toolName: 'get_shifts_in_range',
      input: { startDate: '2026-05-29', endDate: '2026-06-11' },
    }
  );

  assert.deepEqual(
    resolveDirectScheduleQuery({ ...makeRequest(), query: 'What did I work last week?' }),
    {
      toolName: 'get_shifts_in_range',
      input: { startDate: '2026-05-17', endDate: '2026-05-23' },
    }
  );

  assert.deepEqual(
    resolveDirectScheduleQuery({
      ...makeRequest(),
      query: 'What shifts do I have from June 12 to June 27?',
    }),
    {
      toolName: 'get_shifts_in_range',
      input: { startDate: '2026-06-12', endDate: '2026-06-27' },
    }
  );

  assert.deepEqual(
    resolveDirectScheduleQuery({
      ...makeRequest(),
      query: 'What shift do I have first Saturday in August?',
    }),
    {
      toolName: 'get_shift_for_date',
      input: { date: '2026-08-01' },
    }
  );
});

test('resolveDirectScheduleQuery routes end-of-month phrases online', () => {
  assert.deepEqual(
    resolveDirectScheduleQuery({
      ...makeRequest(),
      query: 'What shifts do I have at the end of the month?',
    }),
    {
      toolName: 'get_shifts_in_range',
      input: { startDate: '2026-05-25', endDate: '2026-05-31' },
    }
  );

  assert.deepEqual(
    resolveDirectScheduleQuery({
      ...makeRequest(),
      query: 'What shifts do I have from today to the end of the month?',
    }),
    {
      toolName: 'get_shifts_in_range',
      input: { startDate: '2026-05-29', endDate: '2026-05-31' },
    }
  );
});

test('buildSystemPrompt only marks FIFO when the user context is FIFO', () => {
  const prompt = buildSystemPrompt(
    makeRequest({
      occupation: 'Offshore technician',
      rosterType: 'fifo',
      shiftCycle: {
        ...makeRequest().userContext.shiftCycle,
        rosterType: 'fifo',
      },
    })
  );

  assert.match(prompt, /User's roster type: FIFO \/ block roster/);
  assert.match(
    prompt,
    /Industry assumption: none unless occupation, roster type, or schedule location makes it explicit/
  );
});
