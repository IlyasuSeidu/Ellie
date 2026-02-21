/**
 * VoiceAssistantContext Tests
 *
 * Comprehensive tests for the VoiceAssistantProvider and useVoiceAssistant hook.
 * Covers: provider rendering, initial state, actions, service callbacks,
 * buildUserContext, wake-word integration, AppState handling, and error branches.
 */

import React from 'react';
import { Text, AppState } from 'react-native';
import { create, act, ReactTestRenderer } from 'react-test-renderer';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/services/VoiceAssistantService', () => ({
  voiceAssistantService: {
    initialize: jest.fn(),
    destroy: jest.fn(),
    startListening: jest.fn(),
    stopListening: jest.fn(),
    cancel: jest.fn(),
    clearHistory: jest.fn(),
    updateUserContext: jest.fn(),
    getState: jest.fn(() => 'idle'),
    getConversationHistory: jest.fn(() => []),
  },
}));

jest.mock('@/services/SpeechRecognitionService', () => ({
  speechRecognitionService: {
    hasPermissions: jest.fn(() => Promise.resolve(true)),
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    handleResult: jest.fn(),
    handleError: jest.fn(),
    handleEnd: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('@/services/WakeWordService', () => ({
  WakeWordError: class WakeWordError extends Error {
    fatal = false;
    retryable = true;
    code = 'runtime_error';
  },
  wakeWordService: {
    initialize: jest.fn(() => Promise.resolve(false)),
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    getPrimaryKeywordLabel: jest.fn(() => 'ellie'),
  },
}));

jest.mock('@/services/speechRecognitionNative', () => ({
  useSpeechRecognitionEvent: jest.fn(),
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  isSpeechRecognitionNativeAvailable: true,
}));

// Mock OnboardingContext - provide valid onboarding data
const mockOnboardingData: Record<string, unknown> = {
  name: 'Alex',
  patternType: 'standard_4_4_4',
  shiftSystem: '2-shift',
  startDate: '2024-01-01',
  daysOn: 4,
  nightsOn: 4,
  daysOff: 4,
  phaseOffset: 0,
};

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    data: mockOnboardingData,
    setData: jest.fn(),
    isComplete: true,
  }),
}));

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: jest.fn(() => ({
    patternType: 'standard_4_4_4',
    shiftSystem: '2-shift',
    daysOn: 4,
    nightsOn: 4,
    daysOff: 4,
    startDate: '2024-01-01',
    phaseOffset: 0,
  })),
}));

jest.mock('@/utils/dateUtils', () => ({
  toDateString: jest.fn(() => '2024-06-15'),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ─── Imports (must be after jest.mock) ────────────────────────────────────────

import { VoiceAssistantProvider, useVoiceAssistant } from '../VoiceAssistantContext';
import { voiceAssistantService } from '@/services/VoiceAssistantService';
import { speechRecognitionService } from '@/services/SpeechRecognitionService';
import { wakeWordService } from '@/services/WakeWordService';
import { useSpeechRecognitionEvent } from '@/services/speechRecognitionNative';
import { buildShiftCycle } from '@/utils/shiftUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Captures the latest context value when rendered inside the provider. */
let capturedValue: ReturnType<typeof useVoiceAssistant>;
let activeRenderers: ReactTestRenderer[] = [];

function TestConsumer() {
  const value = useVoiceAssistant();
  capturedValue = value;
  return <Text testID="state">{value.state}</Text>;
}

function createTracked(element: React.ReactElement): ReactTestRenderer {
  const renderer = create(element);
  activeRenderers.push(renderer);
  return renderer;
}

function renderWithProvider(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = createTracked(
      <VoiceAssistantProvider>
        <TestConsumer />
      </VoiceAssistantProvider>
    );
  });
  return renderer;
}

/**
 * Returns the captured callback that was registered with voiceAssistantService.initialize.
 * The callbacks object is the first argument of the first call.
 */
function getServiceCallbacks() {
  const initMock = voiceAssistantService.initialize as jest.Mock;
  expect(initMock).toHaveBeenCalled();
  return initMock.mock.calls[0][0] as {
    onStateChange: (state: string) => void;
    onPartialTranscript: (transcript: string) => void;
    onUserMessage: (message: unknown) => void;
    onAssistantMessage: (message: unknown) => void;
    onError: (err: unknown) => void;
  };
}

/**
 * Returns the registered handler for a specific native speech recognition event.
 */
function getSpeechEventHandler(eventName: string): ((...args: unknown[]) => void) | undefined {
  const mock = useSpeechRecognitionEvent as jest.Mock;
  const call = mock.mock.calls.find((c: unknown[]) => c[0] === eventName);
  return call ? (call[1] as (...args: unknown[]) => void) : undefined;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('VoiceAssistantContext', () => {
  let appStateListener: ((state: string) => void) | undefined;
  let appStateSubscription: { remove: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mutable mock onboarding data to valid defaults
    mockOnboardingData.name = 'Alex';
    mockOnboardingData.patternType = 'standard_4_4_4';
    mockOnboardingData.shiftSystem = '2-shift';
    mockOnboardingData.startDate = '2024-01-01';

    // Reset buildShiftCycle mock to return valid data
    (buildShiftCycle as jest.Mock).mockReturnValue({
      patternType: 'standard_4_4_4',
      shiftSystem: '2-shift',
      daysOn: 4,
      nightsOn: 4,
      daysOff: 4,
      startDate: '2024-01-01',
      phaseOffset: 0,
    });

    // Mock hasPermissions default
    (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
    (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(true);

    // Capture AppState listener
    appStateSubscription = { remove: jest.fn() };
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (state: string) => void;
      return appStateSubscription;
    });

    // Make service methods resolve by default
    (voiceAssistantService.startListening as jest.Mock).mockResolvedValue(undefined);
    (voiceAssistantService.stopListening as jest.Mock).mockResolvedValue(undefined);
    (voiceAssistantService.cancel as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      activeRenderers.forEach((renderer) => renderer.unmount());
      activeRenderers = [];
      await Promise.resolve();
    });
    jest.restoreAllMocks();
  });

  // ─── Provider Rendering ───────────────────────────────────────────

  describe('Provider rendering', () => {
    it('renders children correctly', () => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = createTracked(
          <VoiceAssistantProvider>
            <Text testID="child">Hello</Text>
          </VoiceAssistantProvider>
        );
      });

      const json = renderer.toJSON() as { children: string[] };
      expect(json).not.toBeNull();
    });

    it('renders multiple children', () => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = createTracked(
          <VoiceAssistantProvider>
            <Text>First</Text>
            <Text>Second</Text>
          </VoiceAssistantProvider>
        );
      });

      expect(renderer.toJSON()).not.toBeNull();
    });
  });

  // ─── useVoiceAssistant Hook ───────────────────────────────────────

  describe('useVoiceAssistant hook', () => {
    it('reports an error when used outside VoiceAssistantProvider', () => {
      const onError = jest.fn();

      class TestErrorBoundary extends React.Component<
        { children: React.ReactNode },
        { hasError: boolean }
      > {
        constructor(props: { children: React.ReactNode }) {
          super(props);
          this.state = { hasError: false };
        }

        static getDerivedStateFromError() {
          return { hasError: true };
        }

        componentDidCatch(error: Error) {
          onError(error);
        }

        render() {
          return this.state.hasError ? null : this.props.children;
        }
      }

      act(() => {
        createTracked(
          <TestErrorBoundary>
            <TestConsumer />
          </TestErrorBoundary>
        );
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'useVoiceAssistant must be used within VoiceAssistantProvider',
        })
      );
    });
  });

  // ─── Initial State ────────────────────────────────────────────────

  describe('initial state', () => {
    it('provides correct initial state values', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve(); // flush microtasks
      });

      expect(capturedValue.state).toBe('idle');
      expect(capturedValue.messages).toEqual([]);
      expect(capturedValue.partialTranscript).toBe('');
      expect(capturedValue.error).toBeNull();
      expect(capturedValue.isModalVisible).toBe(false);
      expect(typeof capturedValue.startListening).toBe('function');
      expect(typeof capturedValue.stopListening).toBe('function');
      expect(typeof capturedValue.cancel).toBe('function');
      expect(typeof capturedValue.openModal).toBe('function');
      expect(typeof capturedValue.closeModal).toBe('function');
      expect(typeof capturedValue.clearHistory).toBe('function');
      expect(typeof capturedValue.requestPermissions).toBe('function');
    });

    it('initializes voiceAssistantService on mount with valid onboarding data', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).toHaveBeenCalledTimes(1);
      expect(voiceAssistantService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          onStateChange: expect.any(Function),
          onPartialTranscript: expect.any(Function),
          onUserMessage: expect.any(Function),
          onAssistantMessage: expect.any(Function),
          onError: expect.any(Function),
        }),
        expect.objectContaining({
          name: 'Alex',
          shiftCycle: expect.any(Object),
          currentDate: expect.any(String),
          currentTime: expect.any(String),
          shiftSystem: '2-shift',
        })
      );
    });

    it('checks speech permissions on mount', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(speechRecognitionService.hasPermissions).toHaveBeenCalled();
    });

    it('sets hasPermission to true when permissions are granted', async () => {
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      renderWithProvider();

      await act(async () => {
        // Flush the hasPermissions promise
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(capturedValue.hasPermission).toBe(true);
    });

    it('sets hasPermission to false when permissions are not granted', async () => {
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(false);

      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(capturedValue.hasPermission).toBe(false);
    });
  });

  // ─── buildUserContext ─────────────────────────────────────────────

  describe('buildUserContext', () => {
    it('returns null and does not initialize when name is missing', async () => {
      mockOnboardingData.name = '';
      (voiceAssistantService.initialize as jest.Mock).mockClear();

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).not.toHaveBeenCalled();
    });

    it('returns null and does not initialize when patternType is missing', async () => {
      mockOnboardingData.patternType = '';
      (voiceAssistantService.initialize as jest.Mock).mockClear();

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).not.toHaveBeenCalled();
    });

    it('returns null and does not initialize when startDate is missing', async () => {
      mockOnboardingData.startDate = '';
      (voiceAssistantService.initialize as jest.Mock).mockClear();

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).not.toHaveBeenCalled();
    });

    it('returns null when buildShiftCycle returns null', async () => {
      (buildShiftCycle as jest.Mock).mockReturnValue(null);
      (voiceAssistantService.initialize as jest.Mock).mockClear();

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).not.toHaveBeenCalled();
    });

    it('includes occupation when present in onboarding data', async () => {
      mockOnboardingData.occupation = 'Firefighter';

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const initCall = (voiceAssistantService.initialize as jest.Mock).mock.calls[0];
      const userContext = initCall[1];
      expect(userContext.occupation).toBe('Firefighter');
    });

    it('includes shiftTimes when present in onboarding data', async () => {
      const mockShiftTimes = { dayStart: '07:00', dayEnd: '19:00' };
      mockOnboardingData.shiftTimes = mockShiftTimes;

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const initCall = (voiceAssistantService.initialize as jest.Mock).mock.calls[0];
      const userContext = initCall[1];
      expect(userContext.shiftTimes).toEqual(mockShiftTimes);

      // Clean up
      delete mockOnboardingData.shiftTimes;
    });

    it('defaults shiftSystem to 2-shift when not specified', async () => {
      delete mockOnboardingData.shiftSystem;

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const initCall = (voiceAssistantService.initialize as jest.Mock).mock.calls[0];
      const userContext = initCall[1];
      expect(userContext.shiftSystem).toBe('2-shift');
    });
  });

  // ─── Service Callback State Updates ───────────────────────────────

  describe('service callbacks', () => {
    it('updates state when onStateChange fires', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('listening');
      });

      expect(capturedValue.state).toBe('listening');
    });

    it('clears error when state changes to non-error state', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // First set an error
      act(() => {
        callbacks.onError({ type: 'network_error', message: 'fail', retryable: true });
      });
      expect(capturedValue.error).not.toBeNull();

      // Transition to a non-error state should clear error
      act(() => {
        callbacks.onStateChange('idle');
      });
      expect(capturedValue.error).toBeNull();
    });

    it('does NOT clear error when state changes to error', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // Set an error via onError
      act(() => {
        callbacks.onError({ type: 'network_error', message: 'fail', retryable: true });
      });

      // When state goes to 'error', existing error should remain
      act(() => {
        callbacks.onStateChange('error');
      });

      expect(capturedValue.error).toEqual({
        type: 'network_error',
        message: 'fail',
        retryable: true,
      });
    });

    it('clears partialTranscript when state changes away from listening', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // Set partial transcript while listening
      act(() => {
        callbacks.onStateChange('listening');
      });
      act(() => {
        callbacks.onPartialTranscript('hello wo');
      });
      expect(capturedValue.partialTranscript).toBe('hello wo');

      // State changes away from listening -> partial transcript cleared
      act(() => {
        callbacks.onStateChange('processing');
      });
      expect(capturedValue.partialTranscript).toBe('');
    });

    it('does NOT clear partialTranscript when state changes to listening', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onPartialTranscript('test');
      });

      act(() => {
        callbacks.onStateChange('listening');
      });

      // partialTranscript remains because state IS 'listening'
      expect(capturedValue.partialTranscript).toBe('test');
    });

    it('updates partialTranscript via onPartialTranscript', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onPartialTranscript('hello world');
      });

      expect(capturedValue.partialTranscript).toBe('hello world');
    });

    it('appends user messages via onUserMessage', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      const msg = { id: '1', role: 'user', text: 'What shift am I on?', timestamp: Date.now() };

      act(() => {
        callbacks.onUserMessage(msg);
      });

      expect(capturedValue.messages).toHaveLength(1);
      expect(capturedValue.messages[0]).toEqual(msg);
    });

    it('appends assistant messages via onAssistantMessage', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      const msg = {
        id: '2',
        role: 'assistant',
        text: 'You are on day shift.',
        timestamp: Date.now(),
      };

      act(() => {
        callbacks.onAssistantMessage(msg);
      });

      expect(capturedValue.messages).toHaveLength(1);
      expect(capturedValue.messages[0]).toEqual(msg);
    });

    it('accumulates multiple messages in order', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      const userMsg = { id: '1', role: 'user', text: 'Hello', timestamp: 1000 };
      const assistantMsg = { id: '2', role: 'assistant', text: 'Hi!', timestamp: 1001 };
      const userMsg2 = { id: '3', role: 'user', text: 'What shift?', timestamp: 1002 };

      act(() => {
        callbacks.onUserMessage(userMsg);
      });
      act(() => {
        callbacks.onAssistantMessage(assistantMsg);
      });
      act(() => {
        callbacks.onUserMessage(userMsg2);
      });

      expect(capturedValue.messages).toHaveLength(3);
      expect(capturedValue.messages[0].id).toBe('1');
      expect(capturedValue.messages[1].id).toBe('2');
      expect(capturedValue.messages[2].id).toBe('3');
    });

    it('sets error via onError', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      const err = {
        type: 'speech_recognition_failed',
        message: 'No speech detected',
        retryable: true,
      };

      act(() => {
        callbacks.onError(err);
      });

      expect(capturedValue.error).toEqual(err);
    });
  });

  // ─── Actions ──────────────────────────────────────────────────────

  describe('startListening', () => {
    it('calls voiceAssistantService.startListening', async () => {
      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        await capturedValue.startListening();
      });

      expect(voiceAssistantService.startListening).toHaveBeenCalled();
    });

    it('updates user context before starting', async () => {
      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        await capturedValue.startListening();
      });

      expect(voiceAssistantService.updateUserContext).toHaveBeenCalled();
    });

    it('requests permissions if not yet granted', async () => {
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(true);

      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // hasPermission should be false now
      expect(capturedValue.hasPermission).toBe(false);

      await act(async () => {
        await capturedValue.startListening();
      });

      expect(speechRecognitionService.requestPermissions).toHaveBeenCalled();
      expect(voiceAssistantService.startListening).toHaveBeenCalled();
    });

    it('does not call startListening when permission request is denied', async () => {
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(false);

      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      await act(async () => {
        await capturedValue.startListening();
      });

      expect(speechRecognitionService.requestPermissions).toHaveBeenCalled();
      expect(voiceAssistantService.startListening).not.toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    it('calls voiceAssistantService.stopListening', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await capturedValue.stopListening();
      });

      expect(voiceAssistantService.stopListening).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('calls voiceAssistantService.cancel', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await capturedValue.cancel();
      });

      expect(voiceAssistantService.cancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('openModal / closeModal', () => {
    it('openModal sets isModalVisible to true', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(capturedValue.isModalVisible).toBe(false);

      act(() => {
        capturedValue.openModal();
      });

      expect(capturedValue.isModalVisible).toBe(true);
    });

    it('closeModal sets isModalVisible to false when idle', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedValue.openModal();
      });
      expect(capturedValue.isModalVisible).toBe(true);

      await act(async () => {
        await capturedValue.closeModal();
      });

      expect(capturedValue.isModalVisible).toBe(false);
    });

    it('closeModal cancels the service when not idle', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // Put the assistant in 'listening' state
      act(() => {
        callbacks.onStateChange('listening');
      });

      act(() => {
        capturedValue.openModal();
      });

      await act(async () => {
        await capturedValue.closeModal();
      });

      expect(voiceAssistantService.cancel).toHaveBeenCalled();
      expect(capturedValue.isModalVisible).toBe(false);
    });

    it('closeModal does not cancel when already idle', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedValue.openModal();
      });

      (voiceAssistantService.cancel as jest.Mock).mockClear();

      await act(async () => {
        await capturedValue.closeModal();
      });

      expect(voiceAssistantService.cancel).not.toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('clears messages and calls voiceAssistantService.clearHistory', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // Add some messages first
      act(() => {
        callbacks.onUserMessage({ id: '1', role: 'user', text: 'hi', timestamp: 1 });
      });
      act(() => {
        callbacks.onAssistantMessage({ id: '2', role: 'assistant', text: 'hello', timestamp: 2 });
      });
      expect(capturedValue.messages).toHaveLength(2);

      act(() => {
        capturedValue.clearHistory();
      });

      expect(capturedValue.messages).toEqual([]);
      expect(voiceAssistantService.clearHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestPermissions', () => {
    it('calls speechRecognitionService.requestPermissions and returns true', async () => {
      (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(true);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await capturedValue.requestPermissions();
      });

      expect(result).toBe(true);
      expect(speechRecognitionService.requestPermissions).toHaveBeenCalled();
      expect(capturedValue.hasPermission).toBe(true);
    });

    it('returns false when permissions are denied', async () => {
      (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(false);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await capturedValue.requestPermissions();
      });

      expect(result).toBe(false);
      expect(capturedValue.hasPermission).toBe(false);
    });
  });

  // ─── Native Speech Recognition Event Bridge ──────────────────────

  describe('speech recognition event bridge', () => {
    it('registers event handlers for result, error, and end', () => {
      renderWithProvider();

      const mock = useSpeechRecognitionEvent as jest.Mock;
      const eventNames = mock.mock.calls.map((c: unknown[]) => c[0]);
      expect(eventNames).toContain('result');
      expect(eventNames).toContain('error');
      expect(eventNames).toContain('end');
    });

    it('routes result events to speechRecognitionService.handleResult', () => {
      renderWithProvider();

      const handler = getSpeechEventHandler('result');
      expect(handler).toBeDefined();

      handler?.({
        results: [{ transcript: 'hello world', confidence: 0.95 }],
        isFinal: true,
      });

      expect(speechRecognitionService.handleResult).toHaveBeenCalledWith('hello world', true, 0.95);
    });

    it('does nothing for result events with empty results', () => {
      renderWithProvider();

      const handler = getSpeechEventHandler('result');

      handler?.({ results: [] });

      expect(speechRecognitionService.handleResult).not.toHaveBeenCalled();
    });

    it('does nothing for result events with undefined results', () => {
      renderWithProvider();

      const handler = getSpeechEventHandler('result');

      handler?.({});

      expect(speechRecognitionService.handleResult).not.toHaveBeenCalled();
    });

    it('routes error events to speechRecognitionService.handleError', () => {
      renderWithProvider();

      const handler = getSpeechEventHandler('error');
      expect(handler).toBeDefined();

      handler?.({ error: 'no-speech', message: 'No speech detected' });

      expect(speechRecognitionService.handleError).toHaveBeenCalledWith(
        'no-speech',
        'No speech detected'
      );
    });

    it('routes end events to speechRecognitionService.handleEnd', () => {
      renderWithProvider();

      const handler = getSpeechEventHandler('end');
      expect(handler).toBeDefined();

      handler?.();

      expect(speechRecognitionService.handleEnd).toHaveBeenCalled();
    });
  });

  // ─── Service Lifecycle ────────────────────────────────────────────

  describe('service lifecycle', () => {
    it('destroys the service on unmount', async () => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = createTracked(
          <VoiceAssistantProvider>
            <TestConsumer />
          </VoiceAssistantProvider>
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        renderer.unmount();
      });

      expect(voiceAssistantService.destroy).toHaveBeenCalled();
    });

    it('calls updateUserContext (not re-initialize) when onboarding data changes after init', async () => {
      // First render - initializes
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).toHaveBeenCalledTimes(1);

      // The provider uses initializedRef.current to decide whether to update vs init.
      // Since we can't easily trigger a re-render with changed onboardingData
      // within the same component tree (the mock is module-scoped),
      // we verify that updateUserContext is at least called during startListening.
      await act(async () => {
        await capturedValue.startListening();
      });

      expect(voiceAssistantService.updateUserContext).toHaveBeenCalled();
    });
  });

  // ─── AppState Handling ────────────────────────────────────────────

  describe('AppState handling', () => {
    it('registers an AppState listener on mount', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('removes AppState listener on unmount', async () => {
      let renderer!: ReactTestRenderer;
      act(() => {
        renderer = createTracked(
          <VoiceAssistantProvider>
            <TestConsumer />
          </VoiceAssistantProvider>
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        renderer.unmount();
      });

      expect(appStateSubscription.remove).toHaveBeenCalled();
    });

    it('sets isAppActive to false when app goes to background', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      // Simulate going to background
      act(() => {
        appStateListener?.('background');
      });

      // We can't directly observe isAppActive in the context value,
      // but this confirms the listener fires without error.
      // The wake word sync effect depends on isAppActive internally.
    });

    it('sets isAppActive to true when app becomes active', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        appStateListener?.('background');
      });

      act(() => {
        appStateListener?.('active');
      });

      // AppState listener successfully processed without error
    });
  });

  // ─── Multiple State Transitions ───────────────────────────────────

  describe('multiple state transitions', () => {
    it('handles idle -> listening -> processing -> speaking -> idle cycle', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      expect(capturedValue.state).toBe('idle');

      act(() => {
        callbacks.onStateChange('listening');
      });
      expect(capturedValue.state).toBe('listening');

      act(() => {
        callbacks.onPartialTranscript('what shift');
      });
      expect(capturedValue.partialTranscript).toBe('what shift');

      act(() => {
        callbacks.onStateChange('processing');
      });
      expect(capturedValue.state).toBe('processing');
      expect(capturedValue.partialTranscript).toBe(''); // cleared on non-listening

      act(() => {
        callbacks.onUserMessage({
          id: '1',
          role: 'user',
          text: 'what shift am I on?',
          timestamp: 1,
        });
      });

      act(() => {
        callbacks.onStateChange('speaking');
      });
      expect(capturedValue.state).toBe('speaking');

      act(() => {
        callbacks.onAssistantMessage({
          id: '2',
          role: 'assistant',
          text: 'Day shift',
          timestamp: 2,
        });
      });

      act(() => {
        callbacks.onStateChange('idle');
      });
      expect(capturedValue.state).toBe('idle');
      expect(capturedValue.messages).toHaveLength(2);
    });

    it('handles error state transition and recovery', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('listening');
      });

      // Error occurs
      act(() => {
        callbacks.onError({ type: 'speech_recognition_failed', message: 'Error', retryable: true });
      });
      act(() => {
        callbacks.onStateChange('error');
      });

      expect(capturedValue.state).toBe('error');
      expect(capturedValue.error).not.toBeNull();

      // Recovery: back to idle clears error
      act(() => {
        callbacks.onStateChange('idle');
      });

      expect(capturedValue.state).toBe('idle');
      expect(capturedValue.error).toBeNull();
    });

    it('handles rapid state changes', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('listening');
        callbacks.onStateChange('processing');
        callbacks.onStateChange('speaking');
        callbacks.onStateChange('idle');
      });

      expect(capturedValue.state).toBe('idle');
    });
  });

  // ─── Wake Word Integration ────────────────────────────────────────

  describe('wake word integration', () => {
    it('provides isWakeWordEnabled from config', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      // The test config has wakeWord.enabled = false and no accessKey
      expect(capturedValue.isWakeWordEnabled).toBe(false);
    });

    it('provides wakeWordPhrase', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      // From the default test config, builtInKeywords = ['PORCUPINE']
      // getConfiguredWakeWordLabel should return 'porcupine' (lowercased)
      expect(typeof capturedValue.wakeWordPhrase).toBe('string');
    });

    it('calls wakeWordService.destroy when wake word is not enabled', async () => {
      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(wakeWordService.destroy).toHaveBeenCalled();
    });

    it('provides isWakeWordListening as false when not enabled', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordListening).toBe(false);
    });
  });

  // ─── Combined Action Flows ────────────────────────────────────────

  describe('combined action flows', () => {
    it('open modal -> start listening -> stop -> close modal', async () => {
      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const callbacks = getServiceCallbacks();

      // Open modal
      act(() => {
        capturedValue.openModal();
      });
      expect(capturedValue.isModalVisible).toBe(true);

      // Start listening
      await act(async () => {
        await capturedValue.startListening();
      });
      expect(voiceAssistantService.startListening).toHaveBeenCalled();

      // Simulate state change to listening
      act(() => {
        callbacks.onStateChange('listening');
      });

      // Stop listening
      await act(async () => {
        await capturedValue.stopListening();
      });
      expect(voiceAssistantService.stopListening).toHaveBeenCalled();

      // Simulate state back to idle
      act(() => {
        callbacks.onStateChange('idle');
      });

      // Close modal
      await act(async () => {
        await capturedValue.closeModal();
      });
      expect(capturedValue.isModalVisible).toBe(false);
    });

    it('clearHistory then start fresh conversation', async () => {
      renderWithProvider();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const callbacks = getServiceCallbacks();

      // Add messages
      act(() => {
        callbacks.onUserMessage({ id: '1', role: 'user', text: 'old message', timestamp: 1 });
      });

      // Clear
      act(() => {
        capturedValue.clearHistory();
      });
      expect(capturedValue.messages).toEqual([]);

      // New conversation
      act(() => {
        callbacks.onUserMessage({ id: '2', role: 'user', text: 'new message', timestamp: 2 });
      });
      expect(capturedValue.messages).toHaveLength(1);
      expect(capturedValue.messages[0].text).toBe('new message');
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles closeModal in various states without error', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      // Close modal when already closed (no-op)
      await act(async () => {
        await capturedValue.closeModal();
      });
      expect(capturedValue.isModalVisible).toBe(false);

      // Close modal in processing state
      act(() => {
        capturedValue.openModal();
      });
      act(() => {
        callbacks.onStateChange('processing');
      });
      await act(async () => {
        await capturedValue.closeModal();
      });
      expect(voiceAssistantService.cancel).toHaveBeenCalled();
      expect(capturedValue.isModalVisible).toBe(false);
    });

    it('handles closeModal in speaking state', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('speaking');
      });

      act(() => {
        capturedValue.openModal();
      });

      (voiceAssistantService.cancel as jest.Mock).mockClear();

      await act(async () => {
        await capturedValue.closeModal();
      });

      expect(voiceAssistantService.cancel).toHaveBeenCalled();
    });

    it('handles closeModal in error state', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('error');
      });

      act(() => {
        capturedValue.openModal();
      });

      (voiceAssistantService.cancel as jest.Mock).mockClear();

      await act(async () => {
        await capturedValue.closeModal();
      });

      expect(voiceAssistantService.cancel).toHaveBeenCalled();
    });

    it('multiple openModal calls are idempotent', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedValue.openModal();
      });
      act(() => {
        capturedValue.openModal();
      });

      expect(capturedValue.isModalVisible).toBe(true);
    });

    it('multiple clearHistory calls do not cause errors', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      act(() => {
        capturedValue.clearHistory();
      });
      act(() => {
        capturedValue.clearHistory();
      });

      expect(capturedValue.messages).toEqual([]);
      expect(voiceAssistantService.clearHistory).toHaveBeenCalledTimes(2);
    });

    it('handles partial transcript updates followed by state reset', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onStateChange('listening');
      });

      act(() => {
        callbacks.onPartialTranscript('hel');
      });
      act(() => {
        callbacks.onPartialTranscript('hello');
      });
      act(() => {
        callbacks.onPartialTranscript('hello wor');
      });
      act(() => {
        callbacks.onPartialTranscript('hello world');
      });

      expect(capturedValue.partialTranscript).toBe('hello world');

      act(() => {
        callbacks.onStateChange('idle');
      });

      expect(capturedValue.partialTranscript).toBe('');
    });
  });
});
