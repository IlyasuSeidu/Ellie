jest.mock('@/config/env', () => ({
  __esModule: true,
  voiceAssistantConfig: {
    locale: 'en-US',
    maxHistoryMessages: 6,
    speechRate: 1,
    supportedLocales: [{ code: 'en-US', ttsLanguage: 'en-US' }],
  },
}));

jest.mock('../RyvroBrainService', () => ({
  ryvroBrainService: {
    query: jest.fn(),
    abort: jest.fn(),
    destroy: jest.fn(),
  },
  RyvroBrainServiceError: class RyvroBrainServiceError extends Error {
    retryable = true;
    type = 'backend_error';
  },
}));

jest.mock('../TextToSpeechService', () => ({
  textToSpeechService: {
    isAvailable: jest.fn(async () => true),
    speak: jest.fn(async (_text: string, options: { onDone?: () => void }) => {
      options.onDone?.();
    }),
    stop: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../SpeechRecognitionService', () => ({
  speechRecognitionService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    abort: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('@/services/NetworkService', () => ({
  networkService: {
    getSnapshot: jest.fn(() => ({ status: 'online' })),
  },
}));

jest.mock('@/utils/analytics', () => ({
  Analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import type { UniversalShiftSchedule } from '@/types';
import type { VoiceAssistantUserContext } from '@/types/voiceAssistant';
import { type VoiceAssistantCallbacks, voiceAssistantService } from '../VoiceAssistantService';
import { ryvroBrainService } from '../RyvroBrainService';
import { textToSpeechService } from '../TextToSpeechService';

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Local schedule',
  timezone: 'UTC',
  anchorDate: '2026-06-18',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#147cff',
      icon: 'sunny-outline',
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
      color: '#8ea4b5',
      icon: 'home-outline',
    },
  ],
  sequence: [
    { id: 'seq-1', shiftDefinitionId: 'day' },
    { id: 'seq-2', shiftDefinitionId: 'off' },
  ],
};

const userContext: VoiceAssistantUserContext = {
  name: 'Ama Mensah',
  shiftCycle: schedule,
  currentDate: '2026-06-18',
  currentTime: '12:00',
  scheduleName: schedule.name,
};

describe('VoiceAssistantService local-first shift brain', () => {
  let callbacks: jest.Mocked<VoiceAssistantCallbacks>;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-18T12:00:00'));
    jest.clearAllMocks();

    callbacks = {
      onStateChange: jest.fn(),
      onPartialTranscript: jest.fn(),
      onUserMessage: jest.fn(),
      onAssistantMessage: jest.fn(),
      onError: jest.fn(),
      onNotice: jest.fn(),
    };
    voiceAssistantService.initialize(callbacks, userContext);
  });

  afterEach(() => {
    voiceAssistantService.destroy();
    jest.useRealTimers();
  });

  it('answers deterministic schedule questions locally without calling the backend', async () => {
    await voiceAssistantService.processTextQuery('What shift am I on today?');

    expect(ryvroBrainService.query).not.toHaveBeenCalled();
    expect(callbacks.onAssistantMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.onAssistantMessage.mock.calls[0][0].text).toContain('Day shift');
    expect(callbacks.onAssistantMessage.mock.calls[0][0].text).toContain('7:00 AM to 7:00 PM');
    expect(textToSpeechService.speak).toHaveBeenCalled();
  });

  it('formats local range answers into grouped readable sections', async () => {
    await voiceAssistantService.processTextQuery('What shifts do I have next week?');

    expect(ryvroBrainService.query).not.toHaveBeenCalled();
    expect(callbacks.onAssistantMessage).toHaveBeenCalledTimes(1);
    const answer = callbacks.onAssistantMessage.mock.calls[0][0].text;
    expect(answer).toContain('Ama, from Sunday, Jun 21 to Saturday, Jun 27');
    expect(answer).toContain('Day shift, 7:00 AM to 7:00 PM:');
    expect(answer).toContain('Off:');
    expect(answer).toContain('\n\n');
  });

  it('uses the backend for online questions the local shift brain cannot answer', async () => {
    jest.mocked(ryvroBrainService.query).mockResolvedValueOnce({
      text: 'Your rota looks manageable this week.',
    });

    await voiceAssistantService.processTextQuery('Does my rota look hard?');

    expect(ryvroBrainService.query).toHaveBeenCalledTimes(1);
    expect(callbacks.onAssistantMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.onAssistantMessage.mock.calls[0][0].text).toContain(
      'Your rota looks manageable this week.'
    );
  });
});
