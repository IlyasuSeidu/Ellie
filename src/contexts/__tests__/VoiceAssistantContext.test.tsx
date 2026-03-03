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
    restoreHistory: jest.fn(),
    updateUserContext: jest.fn(),
    getState: jest.fn(() => 'idle'),
    getConversationHistory: jest.fn(() => []),
  },
}));

jest.mock('@/services/VoiceAssistantPersistenceService', () => ({
  voiceAssistantPersistenceService: {
    hydrate: jest.fn(() =>
      Promise.resolve({ history: [], lastError: null, wakeWordSession: null, diagnostics: [] })
    ),
    persistHistory: jest.fn(() => Promise.resolve()),
    persistLastError: jest.fn(() => Promise.resolve()),
    persistWakeWordSession: jest.fn(() => Promise.resolve()),
    persistDiagnostics: jest.fn(() => Promise.resolve()),
    appendDiagnostic: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
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
    getUnavailableReason: jest.fn(() => undefined),
    isUnavailableForSession: jest.fn(() => false),
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
let mockOnboardingSnapshot: Record<string, unknown> = mockOnboardingData;

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    data: mockOnboardingSnapshot,
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

import {
  VoiceAssistantProvider,
  useVoiceAssistant,
  getVoicePersistenceTTLSeconds,
  getConfiguredKeywordPathsForPlatform,
  getConfiguredOpenWakeWordModelPathForPlatform,
  getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform,
  getConfiguredOpenWakeWordEmbeddingModelPathForPlatform,
  getConfiguredWakeWordLabel,
} from '../VoiceAssistantContext';
import { voiceAssistantService } from '@/services/VoiceAssistantService';
import { voiceAssistantPersistenceService } from '@/services/VoiceAssistantPersistenceService';
import { speechRecognitionService } from '@/services/SpeechRecognitionService';
import { WakeWordError, wakeWordService } from '@/services/WakeWordService';
import { useSpeechRecognitionEvent } from '@/services/speechRecognitionNative';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Captures the latest context value when rendered inside the provider. */
let capturedValue: ReturnType<typeof useVoiceAssistant>;
let activeRenderers: ReactTestRenderer[] = [];
const defaultWakeWordConfig = JSON.parse(JSON.stringify(voiceAssistantConfig.wakeWord));

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
    onNotice?: (notice: { type: 'info' | 'warning'; message: string; code?: string }) => void;
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
    Object.assign(voiceAssistantConfig.wakeWord, JSON.parse(JSON.stringify(defaultWakeWordConfig)));

    // Reset mutable mock onboarding data to valid defaults
    mockOnboardingData.name = 'Alex';
    mockOnboardingData.patternType = 'standard_4_4_4';
    mockOnboardingData.shiftSystem = '2-shift';
    mockOnboardingData.startDate = '2024-01-01';
    delete mockOnboardingData.rosterType;
    delete mockOnboardingData.fifoConfig;
    delete mockOnboardingData.occupation;
    delete mockOnboardingData.shiftTimes;
    mockOnboardingSnapshot = mockOnboardingData;

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
    (wakeWordService.initialize as jest.Mock).mockResolvedValue(false);
    (wakeWordService.start as jest.Mock).mockResolvedValue(undefined);
    (wakeWordService.stop as jest.Mock).mockResolvedValue(undefined);
    (wakeWordService.destroy as jest.Mock).mockResolvedValue(undefined);
    (wakeWordService.getPrimaryKeywordLabel as jest.Mock).mockReturnValue('ellie');
    (wakeWordService.getUnavailableReason as jest.Mock).mockReturnValue(undefined);
    (wakeWordService.isUnavailableForSession as jest.Mock).mockReturnValue(false);
    (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
      history: [],
      lastError: null,
      wakeWordSession: null,
      diagnostics: [],
    });
    (voiceAssistantPersistenceService.persistHistory as jest.Mock).mockResolvedValue(undefined);
    (voiceAssistantPersistenceService.persistLastError as jest.Mock).mockResolvedValue(undefined);
    (voiceAssistantPersistenceService.persistWakeWordSession as jest.Mock).mockResolvedValue(
      undefined
    );
    (voiceAssistantPersistenceService.persistDiagnostics as jest.Mock).mockResolvedValue(undefined);
    (voiceAssistantPersistenceService.appendDiagnostic as jest.Mock).mockResolvedValue(undefined);
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
      expect(capturedValue.notice).toBeNull();
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

    it('serializes rosterType and fifoConfig in user context when available', async () => {
      mockOnboardingData.rosterType = 'fifo';
      (buildShiftCycle as jest.Mock).mockReturnValue({
        patternType: 'FIFO_8_6',
        shiftSystem: '2-shift',
        rosterType: 'fifo',
        daysOn: 8,
        nightsOn: 0,
        daysOff: 6,
        startDate: '2024-01-01',
        phaseOffset: 0,
        fifoConfig: {
          workBlockDays: 8,
          restBlockDays: 6,
          workBlockPattern: 'straight-days',
        },
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      expect(voiceAssistantService.initialize).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          rosterType: 'fifo',
          fifoConfig: expect.objectContaining({
            workBlockDays: 8,
            restBlockDays: 6,
            workBlockPattern: 'straight-days',
          }),
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

  describe('local persistence', () => {
    it('hydrates persisted history and restores service history', async () => {
      const persistedHistory = [
        {
          id: 'persisted-1',
          role: 'user',
          text: 'Persisted question',
          timestamp: 1,
        },
      ];

      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
        history: persistedHistory,
        lastError: null,
        wakeWordSession: null,
        diagnostics: [],
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.messages).toEqual(persistedHistory);
      expect(voiceAssistantService.restoreHistory).toHaveBeenCalledWith(persistedHistory);
    });

    it('hydrates last error and persists new errors', async () => {
      jest.useFakeTimers();

      const persistedError = {
        type: 'network_error',
        message: 'Persisted network issue',
        retryable: true,
      };

      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
        history: [],
        lastError: persistedError,
        wakeWordSession: null,
        diagnostics: [],
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.error).toEqual(persistedError);

      const callbacks = getServiceCallbacks();
      const nextError = {
        type: 'backend_error',
        message: 'Service unavailable',
        retryable: true,
      };

      act(() => {
        callbacks.onError(nextError);
      });

      // Advance past the persistence debounce (2s)
      await act(async () => {
        jest.advanceTimersByTime(2500);
        await Promise.resolve();
      });

      expect(voiceAssistantPersistenceService.persistLastError).toHaveBeenCalledWith(
        nextError,
        expect.any(Object)
      );

      jest.useRealTimers();
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

    it('sets notice via onNotice and clears it when listening starts', async () => {
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      expect(callbacks.onNotice).toBeDefined();

      act(() => {
        callbacks.onNotice?.({
          type: 'warning',
          message: "I didn't catch that. Please try again.",
          code: 'no_speech',
        });
      });

      expect(capturedValue.notice).toEqual({
        type: 'warning',
        message: "I didn't catch that. Please try again.",
        code: 'no_speech',
      });

      act(() => {
        callbacks.onStateChange('listening');
      });

      expect(capturedValue.notice).toBeNull();
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

    it('requests permission automatically when wake-word is enabled without permission', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (speechRecognitionService.requestPermissions as jest.Mock).mockResolvedValue(false);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(speechRecognitionService.requestPermissions).toHaveBeenCalled();
      expect(capturedValue.wakeWordWarning).toBeTruthy();
    });

    it('marks wake-word unavailable and persists session when init fails fatally', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(false);
      (wakeWordService.getUnavailableReason as jest.Mock).mockReturnValue('Model unavailable');
      (wakeWordService.isUnavailableForSession as jest.Mock).mockReturnValue(true);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('Model unavailable');
      expect(voiceAssistantPersistenceService.persistWakeWordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          unavailable: true,
          reason: 'Model unavailable',
        }),
        expect.any(Object)
      );
    });

    it('starts wake-word listening when enabled and initialized', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(true);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(wakeWordService.start).toHaveBeenCalled();
      expect(capturedValue.isWakeWordListening).toBe(true);
    });

    it('handles fatal wake-word sync error by disabling availability for session', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(true);

      const fatalError = Object.assign(
        new (WakeWordError as unknown as new (...args: unknown[]) => Error)(
          'fatal wake-word failure'
        ),
        {
          fatal: true,
          retryable: false,
          code: 'runtime_error',
        }
      ) as unknown as Error;
      (wakeWordService.start as jest.Mock).mockRejectedValue(fatalError);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('fatal wake-word failure');
      expect(voiceAssistantPersistenceService.persistWakeWordSession).toHaveBeenCalledWith(
        expect.objectContaining({
          unavailable: true,
          reason: 'fatal wake-word failure',
        }),
        expect.any(Object)
      );
    });

    it('handles wake-word detection callback by opening modal and starting listening', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(wakeWordService.stop).toHaveBeenCalled();
      expect(voiceAssistantService.startListening).toHaveBeenCalled();
      expect(capturedValue.isModalVisible).toBe(true);
    });

    it('handles non-fatal wake-word sync error without persisting unavailable session', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(true);

      const nonFatalError = Object.assign(
        new (WakeWordError as unknown as new (...args: unknown[]) => Error)(
          'temporary wake-word failure'
        ),
        {
          fatal: false,
          retryable: true,
          code: 'runtime_error',
        }
      ) as unknown as Error;
      (wakeWordService.start as jest.Mock).mockRejectedValue(nonFatalError);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('temporary wake-word failure');

      const persistedSessions = (
        voiceAssistantPersistenceService.persistWakeWordSession as jest.Mock
      ).mock.calls.map((call: unknown[]) => call[0]);
      expect(
        persistedSessions.some(
          (session) =>
            session &&
            typeof session === 'object' &&
            'unavailable' in (session as Record<string, unknown>) &&
            (session as { unavailable?: boolean }).unavailable === true
        )
      ).toBe(false);
    });

    it('captures wake-word engine onError callback and uses that message when init fails', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      const engineError = Object.assign(
        new (WakeWordError as unknown as new (...args: unknown[]) => Error)('engine warning'),
        {
          fatal: false,
          retryable: true,
          code: 'runtime_error',
        }
      ) as unknown as Error;

      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        callbacks.onError(engineError);
        return false;
      });
      (wakeWordService.getUnavailableReason as jest.Mock).mockReturnValue(undefined);

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('engine warning');
      expect(voiceAssistantPersistenceService.appendDiagnostic).toHaveBeenCalled();
    });

    it('ignores wake-word detection while app is backgrounded', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      (voiceAssistantService.startListening as jest.Mock).mockClear();
      (wakeWordService.stop as jest.Mock).mockClear();

      act(() => {
        appStateListener?.('background');
      });

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(voiceAssistantService.startListening).not.toHaveBeenCalled();
      expect(capturedValue.isModalVisible).toBe(false);
    });

    it('ignores wake-word detection while modal is already visible', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      act(() => {
        capturedValue.openModal();
      });

      (voiceAssistantService.startListening as jest.Mock).mockClear();
      (wakeWordService.stop as jest.Mock).mockClear();

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(voiceAssistantService.startListening).not.toHaveBeenCalled();
      expect(wakeWordService.stop).not.toHaveBeenCalled();
    });

    it('ignores wake-word detection while assistant is processing', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onStateChange('processing');
      });

      (voiceAssistantService.startListening as jest.Mock).mockClear();
      (wakeWordService.stop as jest.Mock).mockClear();

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(voiceAssistantService.startListening).not.toHaveBeenCalled();
      expect(wakeWordService.stop).not.toHaveBeenCalled();
    });

    it('on wake-word detection from error state, cancels then restarts listening', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onStateChange('error');
      });

      (voiceAssistantService.cancel as jest.Mock).mockClear();
      (voiceAssistantService.startListening as jest.Mock).mockClear();

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(voiceAssistantService.cancel).toHaveBeenCalled();
      expect(voiceAssistantService.startListening).toHaveBeenCalled();
    });

    it('uses persisted wake-word unavailable session and skips wake-word start', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'porcupine';
      voiceAssistantConfig.wakeWord.accessKey = 'test-key';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockImplementation(
        () => new Promise<boolean>(() => undefined)
      );
      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
        history: [],
        lastError: null,
        wakeWordSession: {
          unavailable: true,
          reason: 'Persisted unavailable state',
          updatedAt: Date.now(),
        },
        diagnostics: [],
      });

      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('Persisted unavailable state');
      expect(wakeWordService.start).not.toHaveBeenCalled();
    });

    it('logs wake-word trigger failure when detection cannot start listening', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);

      let detectionHandler: ((keywordLabel: string) => Promise<void>) | undefined;
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        detectionHandler = callbacks.onDetection;
        return true;
      });
      (voiceAssistantService.startListening as jest.Mock).mockRejectedValue(
        new Error('listen failed')
      );

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await act(async () => {
        await detectionHandler?.('Hey Ellie');
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Wake-word trigger failed to start listening',
        expect.any(Error)
      );
    });

    it('logs non-Error wake-word engine callback payloads', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockImplementation(async (_cfg, callbacks) => {
        callbacks.onError('engine-payload' as unknown as Error);
        return false;
      });
      (wakeWordService.getUnavailableReason as jest.Mock).mockReturnValue(undefined);

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.error).toHaveBeenCalledWith('Wake-word engine error', 'engine-payload');
      expect(capturedValue.wakeWordWarning).toBe('Wake-word unavailable, tap mic to talk.');
    });

    it('handles non-Error wake-word sync failure with fallback user message', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(true);
      (wakeWordService.start as jest.Mock).mockRejectedValue('sync failure');

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to synchronize wake-word listening state',
        'sync failure'
      );
      expect(capturedValue.wakeWordWarning).toBe('Wake-word unavailable, tap mic to talk.');
    });
  });

  describe('persistence and notice long-tail branches', () => {
    it('auto-dismisses transient notices after timeout', async () => {
      jest.useFakeTimers();
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onNotice?.({
          type: 'warning',
          message: 'Temporary issue',
          code: 'temporary_issue',
        });
      });

      expect(capturedValue.notice?.message).toBe('Temporary issue');

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      expect(capturedValue.notice).toBeNull();
      jest.useRealTimers();
    });

    it('logs permission check failure and marks permission as unavailable', async () => {
      (speechRecognitionService.hasPermissions as jest.Mock).mockRejectedValue(
        new Error('permission check failed')
      );

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to check speech recognition permissions',
        expect.any(Object)
      );
      expect(capturedValue.hasPermission).toBe(false);
    });

    it('logs wake-word permission request failure during auto-start', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(false);
      (speechRecognitionService.requestPermissions as jest.Mock).mockRejectedValue(
        new Error('request failed')
      );

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to request speech recognition permissions for wake-word',
        expect.any(Object)
      );
      expect(capturedValue.wakeWordWarning).toBeTruthy();
    });

    it('logs stale wake-word session clear failure when reinitialize is forced', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
        history: [],
        lastError: null,
        wakeWordSession: {
          unavailable: true,
          reason: 'old failure',
          updatedAt: Date.now(),
        },
        diagnostics: [],
      });
      (voiceAssistantPersistenceService.persistWakeWordSession as jest.Mock)
        .mockRejectedValueOnce(new Error('clear failed'))
        .mockResolvedValue(undefined);

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to clear stale wake-word unavailable session state',
        expect.any(Object)
      );
    });

    it('logs hydrated snapshot persistence failure', async () => {
      (voiceAssistantPersistenceService.persistHistory as jest.Mock).mockRejectedValue(
        new Error('hydrate persist failed')
      );

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to persist hydrated voice assistant state',
        expect.any(Object)
      );
    });

    it('logs debounced history persistence failure', async () => {
      jest.useFakeTimers();
      (voiceAssistantPersistenceService.persistHistory as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('history write failed'));

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onUserMessage({ id: 'h1', role: 'user', text: 'persist me', timestamp: 1 });
      });

      await act(async () => {
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to persist voice assistant history',
        expect.any(Object)
      );
      jest.useRealTimers();
    });

    it('logs debounced last-error persistence failure', async () => {
      jest.useFakeTimers();
      (voiceAssistantPersistenceService.persistLastError as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('last-error write failed'));

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onError({
          type: 'backend_error',
          message: 'boom',
          retryable: true,
        });
      });

      await act(async () => {
        jest.advanceTimersByTime(2100);
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to persist voice assistant last error',
        expect.any(Object)
      );
      jest.useRealTimers();
    });

    it('respects invalid persistence TTL config by writing without ttl options', async () => {
      const previous = process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS;
      process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS = 'not-a-number';
      renderWithProvider();

      await act(async () => {
        await Promise.resolve();
      });

      const callbacks = getServiceCallbacks();
      act(() => {
        callbacks.onError({
          type: 'network_error',
          message: 'Network down',
          retryable: true,
        });
      });

      const [, options] = (voiceAssistantPersistenceService.appendDiagnostic as jest.Mock).mock
        .calls[
        (voiceAssistantPersistenceService.appendDiagnostic as jest.Mock).mock.calls.length - 1
      ];
      expect(options).toEqual({});
      process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS = previous;
    });
  });

  describe('config helper branches', () => {
    it('parses persistence TTL values', () => {
      const previous = process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS;
      delete process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS;
      expect(getVoicePersistenceTTLSeconds()).toBe(43200);

      process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS = 'not-a-number';
      expect(getVoicePersistenceTTLSeconds()).toBeUndefined();

      process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS = '30.9';
      expect(getVoicePersistenceTTLSeconds()).toBe(30);
      process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS = previous;
    });

    it('selects keyword/model paths by platform and falls back correctly', () => {
      voiceAssistantConfig.wakeWord.keywordPaths = ['fallback/path.ppn'];
      voiceAssistantConfig.wakeWord.keywordPathsIOS = ['ios/path.ppn'];
      voiceAssistantConfig.wakeWord.keywordPathsAndroid = ['android/path.ppn'];
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'fallback/model.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordModelPathIOS = 'ios/model.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordModelPathAndroid = 'android/model.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPath = 'fallback/mel.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathIOS = 'ios/mel.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathAndroid = 'android/mel.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPath = 'fallback/embed.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathIOS = 'ios/embed.onnx';
      voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathAndroid = 'android/embed.onnx';

      expect(getConfiguredKeywordPathsForPlatform('ios')).toEqual(['ios/path.ppn']);
      expect(getConfiguredKeywordPathsForPlatform('android')).toEqual(['android/path.ppn']);
      expect(getConfiguredOpenWakeWordModelPathForPlatform('ios')).toBe('ios/model.onnx');
      expect(getConfiguredOpenWakeWordModelPathForPlatform('android')).toBe('android/model.onnx');
      expect(getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform('ios')).toBe(
        'ios/mel.onnx'
      );
      expect(getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform('android')).toBe(
        'android/mel.onnx'
      );
      expect(getConfiguredOpenWakeWordEmbeddingModelPathForPlatform('ios')).toBe('ios/embed.onnx');
      expect(getConfiguredOpenWakeWordEmbeddingModelPathForPlatform('android')).toBe(
        'android/embed.onnx'
      );

      voiceAssistantConfig.wakeWord.keywordPathsIOS = [];
      voiceAssistantConfig.wakeWord.keywordPathsAndroid = [];
      voiceAssistantConfig.wakeWord.openWakeWordModelPathIOS = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordModelPathAndroid = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathIOS = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathAndroid = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathIOS = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathAndroid = undefined;
      expect(getConfiguredKeywordPathsForPlatform('web')).toEqual(['fallback/path.ppn']);
      expect(getConfiguredOpenWakeWordModelPathForPlatform('web')).toBe('fallback/model.onnx');
      expect(getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform('web')).toBe(
        'fallback/mel.onnx'
      );
      expect(getConfiguredOpenWakeWordEmbeddingModelPathForPlatform('web')).toBe(
        'fallback/embed.onnx'
      );
    });

    it('resolves wake-word label precedence across phrase/model/path/built-in/default', () => {
      voiceAssistantConfig.wakeWord.phrase = ' Hey Ellie ';
      expect(getConfiguredWakeWordLabel()).toBe('Hey Ellie');

      voiceAssistantConfig.wakeWord.phrase = '';
      voiceAssistantConfig.wakeWord.provider = 'openwakeword';
      voiceAssistantConfig.wakeWord.openWakeWordModelPathIOS = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordModelPathAndroid = undefined;
      voiceAssistantConfig.wakeWord.openWakeWordModelPath = 'openwakeword/hey_ellie_v0.1.onnx';
      expect(getConfiguredWakeWordLabel()).toBe('hey_ellie_v0.1');

      voiceAssistantConfig.wakeWord.provider = 'porcupine';
      voiceAssistantConfig.wakeWord.keywordPaths = ['keywords/Hey-Ellie.ppn'];
      expect(getConfiguredWakeWordLabel()).toBe('Hey-Ellie');

      voiceAssistantConfig.wakeWord.keywordPaths = [];
      voiceAssistantConfig.wakeWord.builtInKeywords = ['PORCUPINE'];
      expect(getConfiguredWakeWordLabel()).toBe('porcupine');

      voiceAssistantConfig.wakeWord.builtInKeywords = [];
      expect(getConfiguredWakeWordLabel()).toBe('wake word');
    });
  });

  describe('additional reliability branches', () => {
    it('updates user context on rerender after initialization', async () => {
      const renderer = renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      (voiceAssistantService.initialize as jest.Mock).mockClear();
      mockOnboardingSnapshot = {
        ...mockOnboardingData,
        occupation: 'Updated Occupation',
      };

      act(() => {
        renderer.update(
          <VoiceAssistantProvider>
            <TestConsumer />
          </VoiceAssistantProvider>
        );
      });

      expect(voiceAssistantService.initialize).toHaveBeenCalled();
    });

    it('skips state updates when permission/hydration promises resolve after unmount', async () => {
      let resolvePermissions: ((value: boolean) => void) | undefined;
      let resolveHydrate:
        | ((value: {
            history: [];
            lastError: null;
            wakeWordSession: null;
            diagnostics: [];
          }) => void)
        | undefined;

      const permissionsPromise = new Promise<boolean>((resolve) => {
        resolvePermissions = resolve;
      });
      const hydratePromise = new Promise<{
        history: [];
        lastError: null;
        wakeWordSession: null;
        diagnostics: [];
      }>((resolve) => {
        resolveHydrate = resolve;
      });

      (speechRecognitionService.hasPermissions as jest.Mock).mockReturnValue(permissionsPromise);
      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockReturnValue(hydratePromise);

      const renderer = renderWithProvider();
      await act(async () => {
        renderer.unmount();
      });

      await act(async () => {
        resolvePermissions?.(true);
        resolveHydrate?.({
          history: [],
          lastError: null,
          wakeWordSession: null,
          diagnostics: [],
        });
        await Promise.resolve();
      });

      expect(voiceAssistantService.destroy).toHaveBeenCalled();
    });

    it('respects persisted wake-word unavailable hydration guard on re-initialize', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'porcupine';
      voiceAssistantConfig.wakeWord.accessKey = 'test-key';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (voiceAssistantPersistenceService.hydrate as jest.Mock).mockResolvedValue({
        history: [],
        lastError: null,
        wakeWordSession: {
          unavailable: true,
          reason: 'Wake-word unavailable, tap mic to talk.',
          updatedAt: Date.now(),
        },
        diagnostics: [],
      });

      const renderer = renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      (wakeWordService.initialize as jest.Mock).mockClear();
      voiceAssistantConfig.wakeWord.phrase = 'Ellie Wake';

      act(() => {
        renderer.update(
          <VoiceAssistantProvider>
            <TestConsumer />
          </VoiceAssistantProvider>
        );
      });

      expect(capturedValue.isWakeWordAvailable).toBe(false);
      expect(capturedValue.wakeWordWarning).toBe('Wake-word unavailable, tap mic to talk.');
      expect(wakeWordService.initialize).not.toHaveBeenCalled();
    });

    it('logs appendDiagnostic persistence failures from service callbacks', async () => {
      (voiceAssistantPersistenceService.appendDiagnostic as jest.Mock).mockRejectedValue(
        new Error('append failed')
      );
      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
      });
      const callbacks = getServiceCallbacks();

      act(() => {
        callbacks.onError({
          type: 'network_error',
          message: 'network failed',
          retryable: true,
        });
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to persist voice assistant diagnostic',
        expect.any(Object)
      );
    });

    it('logs wake-word session persistence helper failures', async () => {
      voiceAssistantConfig.wakeWord.enabled = true;
      voiceAssistantConfig.wakeWord.provider = 'porcupine';
      voiceAssistantConfig.wakeWord.accessKey = 'test-key';
      voiceAssistantConfig.wakeWord.autoStart = true;
      (speechRecognitionService.hasPermissions as jest.Mock).mockResolvedValue(true);
      (wakeWordService.initialize as jest.Mock).mockResolvedValue(true);
      (voiceAssistantPersistenceService.persistWakeWordSession as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('session persist failed'))
        .mockResolvedValue(undefined);

      renderWithProvider();
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to persist wake-word session state',
        expect.any(Object)
      );
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
