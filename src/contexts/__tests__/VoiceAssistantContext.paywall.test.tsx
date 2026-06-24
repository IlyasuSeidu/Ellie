import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { VoiceAssistantProvider, useVoiceAssistant } from '../VoiceAssistantContext';
import { voiceAssistantService } from '@/services/VoiceAssistantService';
import { voiceTrialService } from '@/services/VoiceTrialService';

const mockUseAuth = jest.fn();
const mockUseOnboarding = jest.fn();
const mockUseSubscription = jest.fn();
const mockOpenPaywall = jest.fn();

let assistantCallbacks: {
  onAssistantMessage: (message: {
    id: string;
    role: 'assistant';
    text: string;
    timestamp: number;
  }) => void;
} | null = null;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('@/services/speechRecognitionNative', () => ({
  useSpeechRecognitionEvent: jest.fn(),
}));

jest.mock('@/services/SpeechRecognitionService', () => ({
  speechRecognitionService: {
    hasPermissions: jest.fn(async () => true),
    requestPermissions: jest.fn(async () => true),
    handleResult: jest.fn(),
    handleError: jest.fn(),
    handleEnd: jest.fn(),
  },
}));

jest.mock('@/services/WakeWordService', () => ({
  WakeWordError: class WakeWordError extends Error {
    fatal = false;
    retryable = false;
    code = 'mock';
  },
  wakeWordService: {
    resetSessionAvailability: jest.fn(),
    initialize: jest.fn(async () => false),
    destroy: jest.fn(async () => undefined),
    start: jest.fn(async () => undefined),
    stop: jest.fn(async () => undefined),
    getUnavailableReason: jest.fn(() => null),
    isUnavailableForSession: jest.fn(() => false),
    getPrimaryKeywordLabel: jest.fn(() => 'Hey Ryvro'),
  },
}));

jest.mock('@/services/VoiceAssistantPersistenceService', () => ({
  resolveVoiceAssistantPersistenceScope: jest.fn(async (uid?: string | null) =>
    uid ? `auth:${uid}` : 'local:ephemeral'
  ),
  voiceAssistantPersistenceService: {
    setScope: jest.fn(),
    hydrate: jest.fn(async () => ({
      history: [],
      lastError: null,
      wakeWordSession: null,
      diagnostics: [],
    })),
    persistHistory: jest.fn(async () => undefined),
    persistLastError: jest.fn(async () => undefined),
    persistWakeWordSession: jest.fn(async () => undefined),
    persistDiagnostics: jest.fn(async () => undefined),
    appendDiagnostic: jest.fn(async () => undefined),
  },
}));

jest.mock('@/services/VoiceAssistantService', () => ({
  voiceAssistantService: {
    initialize: jest.fn((callbacks) => {
      assistantCallbacks = callbacks;
    }),
    updateUserContext: jest.fn(),
    restoreHistory: jest.fn(),
    startListening: jest.fn(async () => undefined),
    stopListening: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
    processTextQuery: jest.fn(async () => undefined),
    clearHistory: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('@/services/VoiceTrialService', () => ({
  voiceTrialService: {
    getState: jest.fn(),
    markUsed: jest.fn(),
  },
}));

const schedule = {
  version: 3,
  name: 'Two days, two nights, four off',
  timezone: 'Africa/Accra',
  anchorDate: '2026-06-22',
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
      durationMinutes: 720,
      crossesMidnight: false,
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
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
      color: '#5f7484',
      icon: 'home',
    },
  ],
  sequence: [
    { id: '1', shiftDefinitionId: 'day' },
    { id: '2', shiftDefinitionId: 'off' },
  ],
};

const Harness = () => {
  const { startListening, notice } = useVoiceAssistant();
  return (
    <>
      <TouchableOpacity testID="start-voice" onPress={() => void startListening()}>
        <Text>Start</Text>
      </TouchableOpacity>
      {notice ? <Text>{notice.message}</Text> : null}
    </>
  );
};

describe('VoiceAssistantProvider paywall gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assistantCallbacks = null;
    mockOpenPaywall.mockClear();
    mockUseAuth.mockReturnValue({ user: { uid: 'user-123' } });
    mockUseOnboarding.mockReturnValue({
      data: {
        name: 'Ilyasu',
        universalSchedule: schedule,
      },
    });
    mockUseSubscription.mockReturnValue({
      isPro: false,
      isLoading: false,
      openPaywall: mockOpenPaywall,
      refreshSubscriptionStatus: jest.fn(async () => false),
    });
    jest.mocked(voiceTrialService.getState).mockResolvedValue({
      hasUsedFreeVoiceAnswer: false,
      usedAt: null,
    });
    jest.mocked(voiceTrialService.markUsed).mockResolvedValue({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782187200000,
    });
  });

  it('marks the first non-Pro assistant answer and opens a hard paywall', async () => {
    render(
      <VoiceAssistantProvider>
        <Harness />
      </VoiceAssistantProvider>
    );

    await waitFor(() => expect(assistantCallbacks).not.toBeNull());

    await act(async () => {
      assistantCallbacks?.onAssistantMessage({
        id: 'answer-1',
        role: 'assistant',
        text: 'Ilyasu, you are off today.',
        timestamp: Date.now(),
      });
    });

    await waitFor(() => {
      expect(voiceTrialService.markUsed).toHaveBeenCalledWith('user-123', expect.any(Number));
      expect(mockOpenPaywall).toHaveBeenCalledWith({
        entryPoint: 'feature_gate',
        allowDismiss: false,
      });
    });
  });

  it('does not consume the free answer or show paywall for Pro users', async () => {
    mockUseSubscription.mockReturnValue({
      isPro: true,
      isLoading: false,
      openPaywall: mockOpenPaywall,
      refreshSubscriptionStatus: jest.fn(async () => true),
    });

    render(
      <VoiceAssistantProvider>
        <Harness />
      </VoiceAssistantProvider>
    );

    await waitFor(() => expect(assistantCallbacks).not.toBeNull());

    await act(async () => {
      assistantCallbacks?.onAssistantMessage({
        id: 'answer-1',
        role: 'assistant',
        text: 'Ilyasu, you are off today.',
        timestamp: Date.now(),
      });
    });

    expect(voiceTrialService.markUsed).not.toHaveBeenCalled();
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });

  it('blocks new voice starts with a hard paywall after the free answer is used', async () => {
    jest.mocked(voiceTrialService.getState).mockResolvedValue({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782187200000,
    });

    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <Harness />
      </VoiceAssistantProvider>
    );

    await waitFor(() => expect(assistantCallbacks).not.toBeNull());

    await act(async () => {
      fireEvent.press(getByTestId('start-voice'));
    });

    await waitFor(() => {
      expect(mockOpenPaywall).toHaveBeenCalledWith({
        entryPoint: 'feature_gate',
        allowDismiss: false,
      });
    });
    expect(voiceAssistantService.startListening).not.toHaveBeenCalled();
  });

  it('refreshes RevenueCat before blocking and allows purchased users to use the mic', async () => {
    const refreshSubscriptionStatus = jest.fn(async () => true);
    mockUseSubscription.mockReturnValue({
      isPro: false,
      isLoading: false,
      openPaywall: mockOpenPaywall,
      refreshSubscriptionStatus,
    });
    jest.mocked(voiceTrialService.getState).mockResolvedValue({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782187200000,
    });

    const { getByTestId } = render(
      <VoiceAssistantProvider>
        <Harness />
      </VoiceAssistantProvider>
    );

    await waitFor(() => expect(assistantCallbacks).not.toBeNull());

    await act(async () => {
      fireEvent.press(getByTestId('start-voice'));
    });

    await waitFor(() => {
      expect(refreshSubscriptionStatus).toHaveBeenCalled();
      expect(voiceAssistantService.startListening).toHaveBeenCalled();
    });
    expect(mockOpenPaywall).not.toHaveBeenCalled();
  });
});
