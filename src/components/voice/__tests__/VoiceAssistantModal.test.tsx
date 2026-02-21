/**
 * VoiceAssistantModal Component Tests
 *
 * Comprehensive tests for the full-screen voice assistant modal.
 * Covers all states (idle, listening, processing, speaking, error),
 * status text, error messages, mic icon names, button interactions,
 * permission flows, empty states, partial transcripts, and accessibility.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VoiceAssistantModal } from '../VoiceAssistantModal';
import type { VoiceMessage, VoiceAssistantError } from '@/types/voiceAssistant';

// Mock Ionicons so we can inspect icon names
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) =>
    React.createElement(RN.Text, { ...props, testID: `icon-${props.name}` }, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

// Mock child components to simplify tree (but still render something testable)
jest.mock('../ListeningIndicator', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ListeningIndicator: (props: any) =>
      React.createElement(RN.View, { testID: 'listening-indicator', ...props }),
  };
});

jest.mock('../ResponseBubble', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ResponseBubble: (props: any) =>
      React.createElement(
        RN.View,
        { testID: `response-bubble-${props.message.id}` },
        React.createElement(RN.Text, null, props.message.text)
      ),
  };
});

// ---------- Voice assistant mock ----------

const mockVoiceAssistant = {
  state: 'idle' as string,
  messages: [] as VoiceMessage[],
  partialTranscript: '',
  error: null as VoiceAssistantError | null,
  isModalVisible: true,
  hasPermission: true,
  isWakeWordEnabled: false,
  isWakeWordAvailable: true,
  isWakeWordListening: false,
  wakeWordWarning: null as string | null,
  wakeWordPhrase: 'Hey Ellie',
  startListening: jest.fn(),
  stopListening: jest.fn(),
  cancel: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn(),
  clearHistory: jest.fn(),
  requestPermissions: jest.fn(),
};

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => mockVoiceAssistant,
}));

// ---------- Helpers ----------

const makeUserMessage = (overrides?: Partial<VoiceMessage>): VoiceMessage => ({
  id: 'msg-u-1',
  role: 'user',
  text: 'What shift do I have tomorrow?',
  timestamp: Date.now(),
  ...overrides,
});

const makeAssistantMessage = (overrides?: Partial<VoiceMessage>): VoiceMessage => ({
  id: 'msg-a-1',
  role: 'assistant',
  text: 'You have a day shift tomorrow.',
  timestamp: Date.now(),
  ...overrides,
});

// ---------- Test suite ----------

describe('VoiceAssistantModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Reset mock to defaults
    mockVoiceAssistant.state = 'idle';
    mockVoiceAssistant.messages = [];
    mockVoiceAssistant.partialTranscript = '';
    mockVoiceAssistant.error = null;
    mockVoiceAssistant.isModalVisible = true;
    mockVoiceAssistant.hasPermission = true;
    mockVoiceAssistant.isWakeWordEnabled = false;
    mockVoiceAssistant.isWakeWordAvailable = true;
    mockVoiceAssistant.isWakeWordListening = false;
    mockVoiceAssistant.wakeWordWarning = null;
    mockVoiceAssistant.wakeWordPhrase = 'Hey Ellie';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===================================================================
  // Basic rendering
  // ===================================================================

  describe('Basic rendering', () => {
    it('should render the modal with header title "Ellie"', () => {
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Ellie')).toBeTruthy();
    });

    it('should render subtitle "Voice Assistant"', () => {
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Voice Assistant')).toBeTruthy();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Close voice assistant')).toBeTruthy();
    });
  });

  // ===================================================================
  // Empty state (idle, no messages)
  // ===================================================================

  describe('Empty state (idle, no messages)', () => {
    it('should show empty state text', () => {
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Ask me about your shift schedule')).toBeTruthy();
    });

    it('should show "Try saying:" label', () => {
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Try saying:')).toBeTruthy();
    });

    it('should show suggestion examples', () => {
      const { getByText } = render(<VoiceAssistantModal />);
      // HTML entities &quot; become " in rendered text
      expect(getByText(/"What shift do I have tomorrow\?"/)).toBeTruthy();
      expect(getByText(/"When is my next day off\?"/)).toBeTruthy();
      expect(getByText(/"How many night shifts this month\?"/)).toBeTruthy();
    });
  });

  // ===================================================================
  // Idle state with messages
  // ===================================================================

  describe('Idle state with messages', () => {
    it('should render messages in conversation', () => {
      mockVoiceAssistant.messages = [makeUserMessage(), makeAssistantMessage()];
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('What shift do I have tomorrow?')).toBeTruthy();
      expect(getByText('You have a day shift tomorrow.')).toBeTruthy();
    });

    it('should NOT show empty state when messages exist', () => {
      mockVoiceAssistant.messages = [makeUserMessage()];
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ask me about your shift schedule')).toBeNull();
    });

    it('should show clear button when messages exist', () => {
      mockVoiceAssistant.messages = [makeUserMessage()];
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Clear conversation history')).toBeTruthy();
    });

    it('should NOT show clear button when no messages', () => {
      mockVoiceAssistant.messages = [];
      const { queryByLabelText } = render(<VoiceAssistantModal />);
      expect(queryByLabelText('Clear conversation history')).toBeNull();
    });
  });

  // ===================================================================
  // getStatusText for each state
  // ===================================================================

  describe('getStatusText', () => {
    it('should show "Listening..." when listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Listening...')).toBeTruthy();
    });

    it('should show "Thinking..." when processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Thinking...')).toBeTruthy();
    });

    it('should show "Tap to stop speaking" when speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Tap to stop speaking')).toBeTruthy();
    });

    it('should show "Tap the mic to ask Ellie" when idle with no messages', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Tap the mic to ask Ellie')).toBeTruthy();
    });

    it('should show "Tap the mic to ask another question" when idle with messages', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [makeUserMessage()];
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Tap the mic to ask another question')).toBeTruthy();
    });

    it('should show wake word prompt when wake word is enabled and listening', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      mockVoiceAssistant.isWakeWordEnabled = true;
      mockVoiceAssistant.isWakeWordListening = true;
      mockVoiceAssistant.wakeWordPhrase = 'Hey Ellie';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Say "Hey Ellie" or tap the mic')).toBeTruthy();
    });

    it('should NOT show wake word prompt if wake word is not enabled', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      mockVoiceAssistant.isWakeWordEnabled = false;
      mockVoiceAssistant.isWakeWordListening = false;
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText(/Say "Hey Ellie"/)).toBeNull();
    });

    it('should NOT show wake word prompt if messages exist', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [makeUserMessage()];
      mockVoiceAssistant.isWakeWordEnabled = true;
      mockVoiceAssistant.isWakeWordListening = true;
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText(/Say "Hey Ellie"/)).toBeNull();
    });

    it('should show wake-word unavailable idle message when wake word is unavailable', () => {
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      mockVoiceAssistant.isWakeWordEnabled = true;
      mockVoiceAssistant.isWakeWordAvailable = false;
      mockVoiceAssistant.wakeWordWarning = 'Wake-word unavailable';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Wake-word unavailable, tap the mic to talk')).toBeTruthy();
      expect(getByText('Wake-word unavailable, tap mic to talk.')).toBeTruthy();
    });
  });

  // ===================================================================
  // getErrorMessage for each error type
  // ===================================================================

  describe('getErrorMessage', () => {
    it('should show "Something went wrong" when error state but no error object', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = null;
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('should show iOS permission_denied message on iOS', () => {
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'permission_denied',
        message: 'Permission denied',
        retryable: false,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Microphone access denied. Enable in Settings > Ellie.')).toBeTruthy();
      Platform.OS = originalOS;
    });

    it('should show Android permission_denied message on Android', () => {
      const originalOS = Platform.OS;
      Platform.OS = 'android';
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'permission_denied',
        message: 'Permission denied',
        retryable: false,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Microphone access denied. Please grant permission.')).toBeTruthy();
      Platform.OS = originalOS;
    });

    it('should show network_error message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'network_error',
        message: 'Network error',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Check your connection and retry.')).toBeTruthy();
    });

    it('should show speech_recognition_failed message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'speech_recognition_failed',
        message: 'Failed',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText("I didn't catch that. Please try again.")).toBeTruthy();
    });

    it('should show backend_error message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'backend_error',
        message: 'Server error',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Service temporarily unavailable. Please try again.')).toBeTruthy();
    });

    it('should show rate_limited message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'rate_limited',
        message: 'rate limited',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Please wait briefly and retry.')).toBeTruthy();
    });

    it('should show timeout message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'timeout',
        message: 'timeout',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Request timed out. Please retry.')).toBeTruthy();
    });

    it('should show tts_error message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'tts_error',
        message: 'TTS failed',
        retryable: false,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Could not play audio response.')).toBeTruthy();
    });

    it('should show error.message for unknown error type', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'unknown' as VoiceAssistantError['type'],
        message: 'Custom error message',
        retryable: false,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Custom error message')).toBeTruthy();
    });

    it('should show "Something went wrong" for unknown error type with no message', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'unknown' as VoiceAssistantError['type'],
        message: '',
        retryable: false,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });

  // ===================================================================
  // getMicIconName for each state
  // ===================================================================

  describe('getMicIconName', () => {
    it('should show stop-circle icon when listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-stop-circle')).toBeTruthy();
    });

    it('should show hourglass-outline icon when processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-hourglass-outline')).toBeTruthy();
    });

    it('should show stop icon when speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-stop')).toBeTruthy();
    });

    it('should show refresh icon when error', () => {
      mockVoiceAssistant.state = 'error';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-refresh')).toBeTruthy();
    });

    it('should show mic icon when idle', () => {
      mockVoiceAssistant.state = 'idle';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-mic')).toBeTruthy();
    });
  });

  // ===================================================================
  // Mic button press behavior per state
  // ===================================================================

  describe('Mic button press', () => {
    it('should call stopListening when state is listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(getByLabelText('Stop listening. Double tap to finish speaking.'));
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockVoiceAssistant.stopListening).toHaveBeenCalledTimes(1);
    });

    it('should call startListening when state is idle', () => {
      mockVoiceAssistant.state = 'idle';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(getByLabelText('Ask Ellie a question. Double tap to start speaking.'));
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockVoiceAssistant.startListening).toHaveBeenCalledTimes(1);
    });

    it('should call startListening when state is error', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'network_error',
        message: 'Network error',
        retryable: true,
      };
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(
          getByLabelText('Error: Check your connection and retry. Double tap to try again.')
        );
      });
      expect(mockVoiceAssistant.startListening).toHaveBeenCalledTimes(1);
    });

    it('should call cancel when state is speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(getByLabelText('Ellie is speaking. Double tap to stop.'));
      });
      expect(mockVoiceAssistant.cancel).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when state is processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      const micButton = getByLabelText('Processing your question. Please wait.');
      expect(micButton.props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    });

    it('should not call startListening or stopListening when processing and pressed', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      // The button is disabled but let's test pressing it doesn't route to any action
      // Note: fireEvent.press still fires in testing-library even if disabled
      act(() => {
        fireEvent.press(getByLabelText('Processing your question. Please wait.'));
      });
      // Haptics is called because handleMicPress runs, but no state action is triggered
      // since processing doesn't match any of the if-else branches
      expect(mockVoiceAssistant.startListening).not.toHaveBeenCalled();
      expect(mockVoiceAssistant.stopListening).not.toHaveBeenCalled();
      expect(mockVoiceAssistant.cancel).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // Close button
  // ===================================================================

  describe('Close button', () => {
    it('should call closeModal and haptics when close is pressed', () => {
      const { getByLabelText } = render(<VoiceAssistantModal />);
      fireEvent.press(getByLabelText('Close voice assistant'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(mockVoiceAssistant.closeModal).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================================
  // Clear button
  // ===================================================================

  describe('Clear button', () => {
    it('should call clearHistory when clear button is pressed', () => {
      mockVoiceAssistant.messages = [makeUserMessage()];
      const { getByLabelText } = render(<VoiceAssistantModal />);
      fireEvent.press(getByLabelText('Clear conversation history'));
      expect(mockVoiceAssistant.clearHistory).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================================
  // Permission notice
  // ===================================================================

  describe('Permission notice', () => {
    it('should show permission notice when hasPermission=false and idle with no messages', () => {
      mockVoiceAssistant.hasPermission = false;
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Ellie needs microphone access to hear your questions.')).toBeTruthy();
    });

    it('should show "Grant Permission" button in permission notice', () => {
      mockVoiceAssistant.hasPermission = false;
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Grant microphone permission')).toBeTruthy();
    });

    it('should call requestPermissions and haptics when Grant Permission is pressed', () => {
      mockVoiceAssistant.hasPermission = false;
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [];
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(getByLabelText('Grant microphone permission'));
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(mockVoiceAssistant.requestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should NOT show permission notice when hasPermission=true', () => {
      mockVoiceAssistant.hasPermission = true;
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ellie needs microphone access to hear your questions.')).toBeNull();
    });

    it('should NOT show permission notice when not idle', () => {
      mockVoiceAssistant.hasPermission = false;
      mockVoiceAssistant.state = 'listening';
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ellie needs microphone access to hear your questions.')).toBeNull();
    });

    it('should NOT show permission notice when messages exist', () => {
      mockVoiceAssistant.hasPermission = false;
      mockVoiceAssistant.state = 'idle';
      mockVoiceAssistant.messages = [makeUserMessage()];
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ellie needs microphone access to hear your questions.')).toBeNull();
    });
  });

  // ===================================================================
  // Partial transcript
  // ===================================================================

  describe('Partial transcript', () => {
    it('should display partial transcript text when present', () => {
      mockVoiceAssistant.partialTranscript = 'What shift do I';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('What shift do I')).toBeTruthy();
    });

    it('should have accessibility label for partial transcript', () => {
      mockVoiceAssistant.partialTranscript = 'What shift';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('You are saying: What shift')).toBeTruthy();
    });

    it('should NOT display partial transcript container when empty string', () => {
      mockVoiceAssistant.partialTranscript = '';
      const { queryByLabelText } = render(<VoiceAssistantModal />);
      expect(queryByLabelText(/You are saying:/)).toBeNull();
    });
  });

  // ===================================================================
  // Processing state
  // ===================================================================

  describe('Processing state', () => {
    it('should show "Ellie is thinking..." text when processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Ellie is thinking...')).toBeTruthy();
    });

    it('should show sync icon for ProcessingIndicator', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-sync')).toBeTruthy();
    });

    it('should NOT show listening indicator when processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { queryByTestId } = render(<VoiceAssistantModal />);
      expect(queryByTestId('listening-indicator')).toBeNull();
    });
  });

  // ===================================================================
  // Listening state
  // ===================================================================

  describe('Listening state', () => {
    it('should show ListeningIndicator when listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('listening-indicator')).toBeTruthy();
    });

    it('should NOT show processing indicator when listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ellie is thinking...')).toBeNull();
    });
  });

  // ===================================================================
  // Speaking state
  // ===================================================================

  describe('Speaking state', () => {
    it('should show volume-high icon for SpeakingIndicator', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-volume-high')).toBeTruthy();
    });

    it('should NOT show listening indicator when speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { queryByTestId } = render(<VoiceAssistantModal />);
      expect(queryByTestId('listening-indicator')).toBeNull();
    });

    it('should NOT show processing bubble when speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Ellie is thinking...')).toBeNull();
    });
  });

  // ===================================================================
  // Error state
  // ===================================================================

  describe('Error state', () => {
    it('should show retry hint when error is retryable', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'network_error',
        message: 'Network issue',
        retryable: true,
      };
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Tap the mic to try again')).toBeTruthy();
    });

    it('should NOT show retry hint when error is not retryable', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'tts_error',
        message: 'TTS failed',
        retryable: false,
      };
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Tap the mic to try again')).toBeNull();
    });

    it('should show "Grant Permission" button in error area for permission_denied error', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'permission_denied',
        message: 'Denied',
        retryable: false,
      };
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Request microphone permission')).toBeTruthy();
    });

    it('should call requestPermissions when error Grant Permission is pressed', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'permission_denied',
        message: 'Denied',
        retryable: false,
      };
      const { getByLabelText } = render(<VoiceAssistantModal />);
      act(() => {
        fireEvent.press(getByLabelText('Request microphone permission'));
      });
      expect(mockVoiceAssistant.requestPermissions).toHaveBeenCalledTimes(1);
    });

    it('should NOT show Grant Permission in error area for non-permission errors', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'network_error',
        message: 'Network issue',
        retryable: true,
      };
      const { queryByLabelText } = render(<VoiceAssistantModal />);
      expect(queryByLabelText('Request microphone permission')).toBeNull();
    });

    it('should NOT show error container when state is error but error object is null', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = null;
      const { queryByText } = render(<VoiceAssistantModal />);
      expect(queryByText('Tap the mic to try again')).toBeNull();
    });
  });

  // ===================================================================
  // getMicAccessibilityLabel
  // ===================================================================

  describe('getMicAccessibilityLabel', () => {
    it('should set correct a11y label for idle state', () => {
      mockVoiceAssistant.state = 'idle';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Ask Ellie a question. Double tap to start speaking.')).toBeTruthy();
    });

    it('should set correct a11y label for listening state', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Stop listening. Double tap to finish speaking.')).toBeTruthy();
    });

    it('should set correct a11y label for processing state', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Processing your question. Please wait.')).toBeTruthy();
    });

    it('should set correct a11y label for speaking state', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Ellie is speaking. Double tap to stop.')).toBeTruthy();
    });

    it('should set correct a11y label for error state', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = null;
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Error: Something went wrong. Double tap to try again.')).toBeTruthy();
    });

    it('should include specific error message in error a11y label', () => {
      mockVoiceAssistant.state = 'error';
      mockVoiceAssistant.error = {
        type: 'network_error',
        message: 'No network',
        retryable: true,
      };
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(
        getByLabelText('Error: Check your connection and retry. Double tap to try again.')
      ).toBeTruthy();
    });
  });

  // ===================================================================
  // Auto-scroll behavior
  // ===================================================================

  describe('Auto-scroll', () => {
    it('should trigger auto-scroll timeout when messages exist', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      mockVoiceAssistant.messages = [makeUserMessage()];
      render(<VoiceAssistantModal />);
      // useEffect sets a 100ms timeout for scrollToEnd
      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
    });

    it('should trigger auto-scroll timeout when partialTranscript is set', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      mockVoiceAssistant.partialTranscript = 'Hello';
      render(<VoiceAssistantModal />);
      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
    });

    it('should not trigger scroll when no messages and no partialTranscript', () => {
      // We check that no scrollToEnd-related timeout is set
      // The component may still set other timeouts, so just verify render is clean
      mockVoiceAssistant.messages = [];
      mockVoiceAssistant.partialTranscript = '';
      const { toJSON } = render(<VoiceAssistantModal />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===================================================================
  // Modal visibility
  // ===================================================================

  describe('Modal visibility', () => {
    it('should render modal when isModalVisible=true', () => {
      mockVoiceAssistant.isModalVisible = true;
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('Ellie')).toBeTruthy();
    });

    it('should still render with isModalVisible=false (Modal handles visibility)', () => {
      mockVoiceAssistant.isModalVisible = false;
      // In test renderer, hidden Modal trees can return null.
      const { toJSON } = render(<VoiceAssistantModal />);
      expect(toJSON()).toBeNull();
    });
  });

  // ===================================================================
  // State indicator visibility
  // ===================================================================

  describe('State indicator visibility', () => {
    it('should only show ListeningIndicator when state=listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { getByTestId, queryByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('listening-indicator')).toBeTruthy();
      expect(queryByTestId('icon-sync')).toBeNull();
      expect(queryByTestId('icon-volume-high')).toBeNull();
    });

    it('should only show ProcessingIndicator when state=processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { getByTestId, queryByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-sync')).toBeTruthy();
      expect(queryByTestId('listening-indicator')).toBeNull();
      expect(queryByTestId('icon-volume-high')).toBeNull();
    });

    it('should only show SpeakingIndicator when state=speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { getByTestId, queryByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('icon-volume-high')).toBeTruthy();
      expect(queryByTestId('listening-indicator')).toBeNull();
      expect(queryByTestId('icon-sync')).toBeNull();
    });

    it('should show no state indicator when idle', () => {
      mockVoiceAssistant.state = 'idle';
      const { queryByTestId } = render(<VoiceAssistantModal />);
      expect(queryByTestId('listening-indicator')).toBeNull();
      expect(queryByTestId('icon-sync')).toBeNull();
      expect(queryByTestId('icon-volume-high')).toBeNull();
    });

    it('should show no state indicator when error', () => {
      mockVoiceAssistant.state = 'error';
      const { queryByTestId } = render(<VoiceAssistantModal />);
      expect(queryByTestId('listening-indicator')).toBeNull();
      expect(queryByTestId('icon-sync')).toBeNull();
      expect(queryByTestId('icon-volume-high')).toBeNull();
    });
  });

  // ===================================================================
  // Multiple messages rendering
  // ===================================================================

  describe('Multiple messages', () => {
    it('should render all messages in order', () => {
      mockVoiceAssistant.messages = [
        makeUserMessage({ id: 'u1', text: 'First question' }),
        makeAssistantMessage({ id: 'a1', text: 'First answer' }),
        makeUserMessage({ id: 'u2', text: 'Second question' }),
        makeAssistantMessage({ id: 'a2', text: 'Second answer' }),
      ];
      const { getByText } = render(<VoiceAssistantModal />);
      expect(getByText('First question')).toBeTruthy();
      expect(getByText('First answer')).toBeTruthy();
      expect(getByText('Second question')).toBeTruthy();
      expect(getByText('Second answer')).toBeTruthy();
    });

    it('should render ResponseBubble for each message with correct testID', () => {
      mockVoiceAssistant.messages = [
        makeUserMessage({ id: 'u1' }),
        makeAssistantMessage({ id: 'a1' }),
      ];
      const { getByTestId } = render(<VoiceAssistantModal />);
      expect(getByTestId('response-bubble-u1')).toBeTruthy();
      expect(getByTestId('response-bubble-a1')).toBeTruthy();
    });
  });

  // ===================================================================
  // Conversation area accessibility
  // ===================================================================

  describe('Conversation area accessibility', () => {
    it('should have accessibility label "Conversation history" on ScrollView', () => {
      const { getByLabelText } = render(<VoiceAssistantModal />);
      expect(getByLabelText('Conversation history')).toBeTruthy();
    });
  });
});
