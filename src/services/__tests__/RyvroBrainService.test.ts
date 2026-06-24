jest.mock('@/config/env', () => ({
  __esModule: true,
  ryvroBrainConfig: {
    url: 'https://test.cloudfunctions.net/ryvroBrain',
    timeout: 30000,
    maxQueryLength: 500,
  },
  voiceAssistantConfig: {
    maxHistoryMessages: 6,
  },
  isConfiguredRyvroBrainUrl: (url: string | undefined | null) =>
    Boolean(url?.startsWith('https://')),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ryvroBrainService } from '../RyvroBrainService';
import type { UniversalShiftSchedule } from '@/types';
import type { VoiceAssistantUserContext } from '@/types/voiceAssistant';

function fetchOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const universalSchedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Grandma schedule',
  timezone: 'UTC',
  anchorDate: '2026-06-20',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#147cff',
      icon: 'sunny',
    },
    {
      id: 'night',
      name: 'Night Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '19:00',
      endTime: '07:00',
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#147cff',
      icon: 'moon',
    },
    {
      id: 'off',
      name: 'Off',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#9db2c2',
      icon: 'home',
    },
  ],
  sequence: [
    { id: 'seq-1', shiftDefinitionId: 'day' },
    { id: 'seq-2', shiftDefinitionId: 'night' },
    { id: 'seq-3', shiftDefinitionId: 'off' },
    { id: 'seq-4', shiftDefinitionId: 'off' },
  ],
};

describe('RyvroBrainService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(
      fetchOk({
        ok: true,
        requestId: 'request-1',
        data: {
          text: 'Today is your day shift.',
          requestId: 'request-1',
        },
      })
    );
  });

  it('wraps universal schedules in the backend-compatible voice payload', async () => {
    const userContext: VoiceAssistantUserContext = {
      name: '',
      occupation: 'Shift worker',
      company: 'City Hospital',
      country: 'GB',
      currentDate: '2026-06-20',
      currentTime: '12:00',
      scheduleName: universalSchedule.name,
      shiftCycle: universalSchedule,
    };

    await ryvroBrainService.query('What shift am I on today?', userContext);

    const [, requestInit] = mockFetch.mock.calls[0];
    const body = JSON.parse(String(requestInit.body));

    expect(body.userContext.name).toBe('Ryvro user');
    expect(body.userContext.occupation).toBe('Shift worker');
    expect(body.userContext.company).toBe('City Hospital');
    expect(body.userContext.country).toBe('GB');
    expect(body.userContext.shiftSystem).toBe('2-shift');
    expect(body.userContext.shiftTimes).toEqual([
      { type: 'day', startTime: '07:00', endTime: '19:00' },
      { type: 'night', startTime: '19:00', endTime: '07:00' },
    ]);
    expect(body.userContext.shiftCycle).toMatchObject({
      scheduleMode: 'universal',
      patternType: 'universal',
      daysOn: 1,
      nightsOn: 1,
      daysOff: 2,
      startDate: '2026-06-20',
      phaseOffset: 0,
      universalSchedule,
    });
  });

  it('does not add a local date-range cap to the voice backend request', async () => {
    const userContext: VoiceAssistantUserContext = {
      name: 'Ama',
      occupation: 'Shift worker',
      currentDate: '2026-06-20',
      currentTime: '12:00',
      scheduleName: universalSchedule.name,
      shiftCycle: universalSchedule,
    };

    await ryvroBrainService.query('What shifts do I work from 2026 to 2036?', userContext);

    const [, requestInit] = mockFetch.mock.calls[0];
    const body = JSON.parse(String(requestInit.body));

    expect(body.query).toBe('What shifts do I work from 2026 to 2036?');
    expect(body).not.toHaveProperty('dateRangeLimitDays');
    expect(body.userContext).not.toHaveProperty('dateRangeLimitDays');
  });
});
