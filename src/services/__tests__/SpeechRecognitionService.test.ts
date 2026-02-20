/**
 * Tests for SpeechRecognitionService
 *
 * Tests the singleton service that manages native speech recognition,
 * including permission handling, event handlers, and lifecycle methods.
 */

import { speechRecognitionService } from '../SpeechRecognitionService';
import { ExpoSpeechRecognitionModule } from '../speechRecognitionNative';

// Mock the native adapter so the SpeechRecognitionService uses our fakes
jest.mock('../speechRecognitionNative', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
  isSpeechRecognitionNativeAvailable: true,
}));

// ── Helpers ────────────────────────────────────────────────────────

/** Reset mocks to their default (permissions granted) implementations */
function resetPermissionMocks() {
  (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
}

function createCallbacks() {
  return {
    onPartialResult: jest.fn(),
    onFinalResult: jest.fn(),
    onError: jest.fn(),
    onEnd: jest.fn(),
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('SpeechRecognitionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPermissionMocks();
    speechRecognitionService.destroy();
  });

  describe('requestPermissions', () => {
    it('should return true when permissions are granted', async () => {
      const result = await speechRecognitionService.requestPermissions();

      expect(result).toBe(true);
      expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permissions are denied', async () => {
      (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

      const result = await speechRecognitionService.requestPermissions();

      expect(result).toBe(false);
    });

    it('should return false when permission request throws', async () => {
      (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission error')
      );

      const result = await speechRecognitionService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('hasPermissions', () => {
    it('should return true when permissions are already granted', async () => {
      const result = await speechRecognitionService.hasPermissions();

      expect(result).toBe(true);
    });

    it('should return false when permissions are not granted', async () => {
      (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

      const result = await speechRecognitionService.hasPermissions();

      expect(result).toBe(false);
    });
  });

  describe('startListening', () => {
    it('should start the native speech recognizer', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs, 'en-US');

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    });

    it('should report listening state after start', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      expect(speechRecognitionService.getIsListening()).toBe(true);
    });

    it('should not start again if already listening', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);
      jest.clearAllMocks();

      await speechRecognitionService.startListening(cbs);

      expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    });

    it('should error if permissions are not granted and cannot be requested', async () => {
      (ExpoSpeechRecognitionModule.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
      (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      expect(cbs.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Speech recognition permission denied',
        })
      );
      expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    });

    it('should pass the specified locale', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs, 'de-DE');

      expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
        expect.objectContaining({ lang: 'de-DE' })
      );
    });
  });

  describe('stopListening', () => {
    it('should call native stop', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);
      await speechRecognitionService.stopListening();

      expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
    });

    it('should NOT set isListening to false (waits for end event)', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);
      await speechRecognitionService.stopListening();

      expect(speechRecognitionService.getIsListening()).toBe(true);
    });

    it('should not call stop when not listening', async () => {
      await speechRecognitionService.stopListening();

      expect(ExpoSpeechRecognitionModule.stop).not.toHaveBeenCalled();
    });
  });

  describe('abort', () => {
    it('should call native abort and set isListening to false', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);
      await speechRecognitionService.abort();

      expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
      expect(speechRecognitionService.getIsListening()).toBe(false);
    });

    it('should not call abort when not listening', async () => {
      await speechRecognitionService.abort();

      expect(ExpoSpeechRecognitionModule.abort).not.toHaveBeenCalled();
    });
  });

  describe('handleResult', () => {
    it('should route partial results to onPartialResult callback', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleResult('partial text', false, 0.5);

      expect(cbs.onPartialResult).toHaveBeenCalledWith('partial text');
      expect(cbs.onFinalResult).not.toHaveBeenCalled();
    });

    it('should route final results to onFinalResult callback', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleResult('final text', true, 0.95);

      expect(cbs.onFinalResult).toHaveBeenCalledWith({
        transcript: 'final text',
        isFinal: true,
        confidence: 0.95,
      });
    });

    it('should set isListening to false on final result', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleResult('done', true, 0.9);

      expect(speechRecognitionService.getIsListening()).toBe(false);
    });

    it('should not call callbacks if no callbacks are registered', () => {
      expect(() => {
        speechRecognitionService.handleResult('test', false, 0.5);
      }).not.toThrow();
    });
  });

  describe('handleError', () => {
    it('should route errors to onError callback', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleError('no-speech', 'No speech detected');

      expect(cbs.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No speech detected' })
      );
    });

    it('should use error code as message when message is empty', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleError('audio', '');

      expect(cbs.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'audio' })
      );
    });

    it('should set isListening to false on error', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleError('error', 'Something failed');

      expect(speechRecognitionService.getIsListening()).toBe(false);
    });
  });

  describe('handleEnd', () => {
    it('should call onEnd callback and set isListening to false', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);

      speechRecognitionService.handleEnd();

      expect(cbs.onEnd).toHaveBeenCalled();
      expect(speechRecognitionService.getIsListening()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should abort any active recognition and reset state', async () => {
      const cbs = createCallbacks();
      await speechRecognitionService.startListening(cbs);
      jest.clearAllMocks();

      speechRecognitionService.destroy();

      expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
      expect(speechRecognitionService.getIsListening()).toBe(false);
    });

    it('should not throw when destroying without active recognition', () => {
      expect(() => {
        speechRecognitionService.destroy();
      }).not.toThrow();
    });
  });
});
