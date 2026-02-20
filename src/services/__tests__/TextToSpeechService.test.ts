/**
 * Tests for TextToSpeechService
 *
 * Tests the TTS service wrapper around expo-speech,
 * including speak, stop, and callback handling.
 */

import { textToSpeechService } from '../TextToSpeechService';
import * as Speech from 'expo-speech';

// ── Tests ──────────────────────────────────────────────────────────

describe('TextToSpeechService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    textToSpeechService.destroy();
  });

  describe('speak', () => {
    it('should call Speech.speak with the given text', async () => {
      await textToSpeechService.speak('Hello world');

      expect(Speech.speak).toHaveBeenCalledWith(
        'Hello world',
        expect.objectContaining({
          language: 'en-US',
          rate: 1.0,
          pitch: 1.0,
        })
      );
    });

    it('should use custom language and rate options', async () => {
      await textToSpeechService.speak('Hallo Welt', {
        language: 'de-DE',
        rate: 0.8,
        pitch: 1.2,
      });

      expect(Speech.speak).toHaveBeenCalledWith(
        'Hallo Welt',
        expect.objectContaining({
          language: 'de-DE',
          rate: 0.8,
          pitch: 1.2,
        })
      );
    });

    it('should call onDone when empty text is passed', async () => {
      const onDone = jest.fn();

      await textToSpeechService.speak('   ', { onDone });

      expect(onDone).toHaveBeenCalled();
      expect(Speech.speak).not.toHaveBeenCalled();
    });

    it('should set isSpeaking to true while speaking', async () => {
      await textToSpeechService.speak('Test');

      expect(textToSpeechService.getIsSpeaking()).toBe(true);
    });

    it('should stop previous speech before starting new', async () => {
      await textToSpeechService.speak('First');
      await textToSpeechService.speak('Second');

      expect(Speech.stop).toHaveBeenCalled();
    });

    it('should register onDone callback with Speech.speak', async () => {
      const onDone = jest.fn();

      await textToSpeechService.speak('Test', { onDone });

      const speechOptions = (Speech.speak as jest.Mock).mock.calls[0][1];
      // Simulate the native callback
      speechOptions.onDone();

      expect(onDone).toHaveBeenCalled();
      expect(textToSpeechService.getIsSpeaking()).toBe(false);
    });

    it('should register onStopped callback with Speech.speak', async () => {
      const onStopped = jest.fn();

      await textToSpeechService.speak('Test', { onStopped });

      const speechOptions = (Speech.speak as jest.Mock).mock.calls[0][1];
      speechOptions.onStopped();

      expect(onStopped).toHaveBeenCalled();
      expect(textToSpeechService.getIsSpeaking()).toBe(false);
    });

    it('should register onError callback with Speech.speak', async () => {
      const onError = jest.fn();

      await textToSpeechService.speak('Test', { onError });

      const speechOptions = (Speech.speak as jest.Mock).mock.calls[0][1];
      speechOptions.onError('TTS failed');

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(textToSpeechService.getIsSpeaking()).toBe(false);
    });
  });

  describe('stop', () => {
    it('should call Speech.stop when speaking', async () => {
      await textToSpeechService.speak('Test');
      await textToSpeechService.stop();

      expect(Speech.stop).toHaveBeenCalled();
      expect(textToSpeechService.getIsSpeaking()).toBe(false);
    });

    it('should not call Speech.stop when not speaking', async () => {
      await textToSpeechService.stop();

      expect(Speech.stop).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable', () => {
    it('should return true when voices are available', async () => {
      (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
        { identifier: 'en-US', name: 'English' },
      ]);

      const result = await textToSpeechService.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when no voices are available', async () => {
      (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([]);

      const result = await textToSpeechService.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false when getAvailableVoicesAsync throws', async () => {
      (Speech.getAvailableVoicesAsync as jest.Mock).mockRejectedValue(new Error('Not available'));

      const result = await textToSpeechService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should stop speaking and reset state', async () => {
      await textToSpeechService.speak('Test');

      textToSpeechService.destroy();

      expect(textToSpeechService.getIsSpeaking()).toBe(false);
    });
  });
});
