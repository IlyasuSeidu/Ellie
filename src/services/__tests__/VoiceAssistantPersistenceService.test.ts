import { voiceAssistantPersistenceService } from '../VoiceAssistantPersistenceService';
import { asyncStorageService } from '../AsyncStorageService';
import type {
  VoiceAssistantDiagnosticEvent,
  VoiceAssistantError,
  VoiceMessage,
} from '@/types/voiceAssistant';

jest.mock('../AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    setWithTTL: jest.fn(),
    remove: jest.fn(),
    removeMultiple: jest.fn(),
  },
}));

describe('VoiceAssistantPersistenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hydrates valid persisted history, last error, wake-word session, and diagnostics', async () => {
    (asyncStorageService.get as jest.Mock)
      .mockResolvedValueOnce([
        { id: '1', role: 'user', text: 'hello', timestamp: 1 },
        { id: '2', role: 'assistant', text: 'hi', timestamp: 2 },
        { id: 'bad', role: 'assistant', text: 123 },
      ])
      .mockResolvedValueOnce({
        type: 'network_error',
        message: 'Network failed',
        retryable: true,
      })
      .mockResolvedValueOnce({
        unavailable: true,
        reason: 'Activation limit',
        updatedAt: 1700000000000,
      })
      .mockResolvedValueOnce([
        {
          id: 'd1',
          timestamp: 1700000000001,
          category: 'wake_word',
          code: 'wake_word_initialize_failed',
          message: 'Activation limit',
          retryable: false,
        },
        {
          id: 2,
          timestamp: 'oops',
          category: 'wake_word',
          code: 'invalid',
          message: 'invalid',
        },
      ]);

    const result = await voiceAssistantPersistenceService.hydrate();

    expect(result.history).toEqual([
      { id: '1', role: 'user', text: 'hello', timestamp: 1 },
      { id: '2', role: 'assistant', text: 'hi', timestamp: 2 },
    ]);
    expect(result.lastError).toEqual({
      type: 'network_error',
      message: 'Network failed',
      retryable: true,
    });
    expect(result.wakeWordSession).toEqual({
      unavailable: true,
      reason: 'Activation limit',
      updatedAt: 1700000000000,
    });
    expect(result.diagnostics).toEqual([
      {
        id: 'd1',
        timestamp: 1700000000001,
        category: 'wake_word',
        code: 'wake_word_initialize_failed',
        message: 'Activation limit',
        retryable: false,
      },
    ]);
  });

  it('persists history with ttl when provided', async () => {
    const history: VoiceMessage[] = [{ id: '1', role: 'user', text: 'hey', timestamp: 1 }];
    await voiceAssistantPersistenceService.persistHistory(history, { ttlSeconds: 60 });
    expect(asyncStorageService.setWithTTL).toHaveBeenCalledWith(
      'voice-assistant:history:v1',
      history,
      60
    );
  });

  it('removes history key when history is empty', async () => {
    await voiceAssistantPersistenceService.persistHistory([]);
    expect(asyncStorageService.remove).toHaveBeenCalledWith('voice-assistant:history:v1');
  });

  it('persists last error with ttl when provided', async () => {
    const error: VoiceAssistantError = {
      type: 'backend_error',
      message: 'Service temporarily unavailable',
      retryable: true,
    };
    await voiceAssistantPersistenceService.persistLastError(error, { ttlSeconds: 120 });
    expect(asyncStorageService.setWithTTL).toHaveBeenCalledWith(
      'voice-assistant:last-error:v1',
      error,
      120
    );
  });

  it('removes last error when null is provided', async () => {
    await voiceAssistantPersistenceService.persistLastError(null);
    expect(asyncStorageService.remove).toHaveBeenCalledWith('voice-assistant:last-error:v1');
  });

  it('persists wake-word session with ttl when provided', async () => {
    const session = {
      unavailable: true,
      reason: 'Activation limit',
      updatedAt: 1700000000000,
    };
    await voiceAssistantPersistenceService.persistWakeWordSession(session, { ttlSeconds: 30 });

    expect(asyncStorageService.setWithTTL).toHaveBeenCalledWith(
      'voice-assistant:wake-word-session:v1',
      session,
      30
    );
  });

  it('removes wake-word session when null is provided', async () => {
    await voiceAssistantPersistenceService.persistWakeWordSession(null);
    expect(asyncStorageService.remove).toHaveBeenCalledWith('voice-assistant:wake-word-session:v1');
  });

  it('appends diagnostic to existing diagnostics', async () => {
    const existingDiagnostics: VoiceAssistantDiagnosticEvent[] = [
      {
        id: 'd0',
        timestamp: 1700000000000,
        category: 'pipeline',
        code: 'voice_error_network_error',
        message: 'Network failed',
      },
    ];

    (asyncStorageService.get as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingDiagnostics);

    await voiceAssistantPersistenceService.appendDiagnostic({
      category: 'wake_word',
      code: 'wake_word_initialize_failed',
      message: 'Activation limit',
      retryable: false,
    });

    expect(asyncStorageService.set).toHaveBeenCalledWith(
      'voice-assistant:diagnostics:v1',
      expect.arrayContaining([
        existingDiagnostics[0],
        expect.objectContaining({
          category: 'wake_word',
          code: 'wake_word_initialize_failed',
          message: 'Activation limit',
          retryable: false,
        }),
      ])
    );
  });

  it('clears all voice persistence keys', async () => {
    await voiceAssistantPersistenceService.clear();
    expect(asyncStorageService.removeMultiple).toHaveBeenCalledWith([
      'voice-assistant:history:v1',
      'voice-assistant:last-error:v1',
      'voice-assistant:wake-word-session:v1',
      'voice-assistant:diagnostics:v1',
    ]);
  });
});
