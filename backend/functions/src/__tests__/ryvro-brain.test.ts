import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSystemPrompt } from '../ryvro-brain';
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
  assert.doesNotMatch(prompt, /User's roster type: FIFO/);
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
