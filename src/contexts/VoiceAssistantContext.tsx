/**
 * VoiceAssistantContext
 *
 * React Context that connects the VoiceAssistantService orchestrator
 * to the component tree. Provides state, messages, and actions to UI components.
 *
 * CRITICAL: This component also serves as the bridge between native speech
 * recognition events and the SpeechRecognitionService. The useSpeechRecognitionEvent
 * hooks listen for native events and route them to the service's handler methods.
 *
 * Usage:
 * ```typescript
 * import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
 *
 * const MyComponent = () => {
 *   const { state, messages, startListening, stopListening, cancel } = useVoiceAssistant();
 * };
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useSpeechRecognitionEvent } from '@/services/speechRecognitionNative';
import { voiceAssistantService } from '@/services/VoiceAssistantService';
import { speechRecognitionService } from '@/services/SpeechRecognitionService';
import { wakeWordService } from '@/services/WakeWordService';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { toDateString } from '@/utils/dateUtils';
import { voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import type {
  VoiceAssistantState,
  VoiceMessage,
  VoiceAssistantError,
  VoiceAssistantUserContext,
} from '@/types/voiceAssistant';

interface VoiceAssistantContextValue {
  /** Current state of the voice assistant pipeline */
  state: VoiceAssistantState;
  /** All conversation messages */
  messages: VoiceMessage[];
  /** Partial transcript while user is speaking */
  partialTranscript: string;
  /** Last error, if any */
  error: VoiceAssistantError | null;
  /** Whether the assistant modal is visible */
  isModalVisible: boolean;
  /** Whether speech recognition permissions have been granted */
  hasPermission: boolean;
  /** Whether wake-word detection is configured and enabled */
  isWakeWordEnabled: boolean;
  /** Whether wake-word engine is currently listening */
  isWakeWordListening: boolean;
  /** Current wake-word phrase label */
  wakeWordPhrase: string;
  /** Start listening for speech */
  startListening: () => Promise<void>;
  /** Stop listening (triggers final result) */
  stopListening: () => Promise<void>;
  /** Cancel current operation */
  cancel: () => Promise<void>;
  /** Open the assistant modal */
  openModal: () => void;
  /** Close the assistant modal */
  closeModal: () => void;
  /** Clear conversation history */
  clearHistory: () => void;
  /** Request microphone permissions */
  requestPermissions: () => Promise<boolean>;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

export interface VoiceAssistantProviderProps {
  children: ReactNode;
}

const DEFAULT_WAKE_WORD_LABEL = 'wake word';

function getConfiguredKeywordPathsForPlatform(): string[] {
  if (Platform.OS === 'ios' && voiceAssistantConfig.wakeWord.keywordPathsIOS.length > 0) {
    return voiceAssistantConfig.wakeWord.keywordPathsIOS;
  }

  if (Platform.OS === 'android' && voiceAssistantConfig.wakeWord.keywordPathsAndroid.length > 0) {
    return voiceAssistantConfig.wakeWord.keywordPathsAndroid;
  }

  return voiceAssistantConfig.wakeWord.keywordPaths;
}

function getConfiguredWakeWordLabel(): string {
  const configuredPhrase = voiceAssistantConfig.wakeWord.phrase?.trim();
  if (configuredPhrase) {
    return configuredPhrase;
  }

  const configuredPaths = getConfiguredKeywordPathsForPlatform();
  if (configuredPaths.length > 0) {
    const firstPath = configuredPaths[0];
    const fileName = firstPath.split('/').pop() ?? firstPath;
    return fileName.replace(/\.ppn$/i, '');
  }

  const firstBuiltIn = voiceAssistantConfig.wakeWord.builtInKeywords[0];
  return firstBuiltIn ? firstBuiltIn.toLowerCase() : DEFAULT_WAKE_WORD_LABEL;
}

export const VoiceAssistantProvider: React.FC<VoiceAssistantProviderProps> = ({ children }) => {
  const { data: onboardingData } = useOnboarding();
  const isWakeWordEnabled =
    voiceAssistantConfig.wakeWord.enabled && Boolean(voiceAssistantConfig.wakeWord.accessKey);
  const configuredWakeWordPhrase = voiceAssistantConfig.wakeWord.phrase?.trim();

  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<VoiceAssistantError | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [isWakeWordReady, setIsWakeWordReady] = useState(false);
  const [wakeWordPhrase, setWakeWordPhrase] = useState(getConfiguredWakeWordLabel());
  const [isAppActive, setIsAppActive] = useState(true);

  const initializedRef = useRef(false);
  const stateRef = useRef<VoiceAssistantState>('idle');
  const isModalVisibleRef = useRef(false);
  const hasPermissionRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const startListeningFromWakeWordRef = useRef<() => Promise<void>>(async () => {});

  // ─── Native Speech Recognition Event Bridge ───────────────────────
  // These hooks listen for native events from expo-speech-recognition
  // and route them to the SpeechRecognitionService's handler methods.
  // This is the critical wiring that connects native STT → service → UI.

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const bestResult = event.results[0];
      speechRecognitionService.handleResult(
        bestResult.transcript,
        event.isFinal,
        bestResult.confidence
      );
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    speechRecognitionService.handleError(event.error, event.message);
  });

  useSpeechRecognitionEvent('end', () => {
    speechRecognitionService.handleEnd();
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isModalVisibleRef.current = isModalVisible;
  }, [isModalVisible]);

  useEffect(() => {
    hasPermissionRef.current = hasPermission;
  }, [hasPermission]);

  useEffect(() => {
    isAppActiveRef.current = isAppActive;
  }, [isAppActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setIsAppActive(nextState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ─── Build User Context ───────────────────────────────────────────

  const buildUserContext = useCallback((): VoiceAssistantUserContext | null => {
    if (!onboardingData.name || !onboardingData.patternType || !onboardingData.startDate) {
      return null;
    }

    const shiftCycle = buildShiftCycle(onboardingData);
    if (!shiftCycle) return null;

    const now = new Date();

    return {
      name: onboardingData.name,
      occupation: onboardingData.occupation,
      shiftCycle,
      currentDate: toDateString(now),
      currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      shiftSystem: onboardingData.shiftSystem ?? '2-shift',
      shiftTimes: onboardingData.shiftTimes,
    };
  }, [onboardingData]);

  // ─── Initialize Service ───────────────────────────────────────────

  useEffect(() => {
    const userContext = buildUserContext();
    if (!userContext) return;

    if (initializedRef.current) {
      voiceAssistantService.updateUserContext(userContext);
      return;
    }

    voiceAssistantService.initialize(
      {
        onStateChange: (newState) => {
          setState(newState);
          if (newState !== 'error') {
            setError(null);
          }
          if (newState !== 'listening') {
            setPartialTranscript('');
          }
        },
        onPartialTranscript: (transcript) => {
          setPartialTranscript(transcript);
        },
        onUserMessage: (message) => {
          setMessages((prev) => [...prev, message]);
        },
        onAssistantMessage: (message) => {
          setMessages((prev) => [...prev, message]);
        },
        onError: (err) => {
          setError(err);
        },
      },
      userContext
    );

    initializedRef.current = true;

    // Check permissions on mount
    speechRecognitionService.hasPermissions().then(setHasPermission);

    return () => {
      voiceAssistantService.destroy();
      initializedRef.current = false;
    };
  }, [buildUserContext]);

  // ─── Actions ──────────────────────────────────────────────────────

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await speechRecognitionService.requestPermissions();
    setHasPermission(granted);
    return granted;
  }, []);

  const startListeningFromWakeWord = useCallback(async (): Promise<void> => {
    if (!hasPermissionRef.current) {
      const granted = await requestPermissions();
      if (!granted) return;
    }

    // Update context with current time before each query
    const userContext = buildUserContext();
    if (userContext) {
      voiceAssistantService.updateUserContext(userContext);
    }

    await voiceAssistantService.startListening();
  }, [requestPermissions, buildUserContext]);

  useEffect(() => {
    startListeningFromWakeWordRef.current = startListeningFromWakeWord;
  }, [startListeningFromWakeWord]);

  const startListening = useCallback(async (): Promise<void> => {
    await startListeningFromWakeWord();
  }, [startListeningFromWakeWord]);

  const stopListening = useCallback(async (): Promise<void> => {
    await voiceAssistantService.stopListening();
  }, []);

  const cancel = useCallback(async (): Promise<void> => {
    await voiceAssistantService.cancel();
  }, []);

  const openModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(async () => {
    if (state !== 'idle') {
      await voiceAssistantService.cancel();
    }
    setIsModalVisible(false);
  }, [state]);

  const clearHistory = useCallback(() => {
    voiceAssistantService.clearHistory();
    setMessages([]);
  }, []);

  // ─── Wake Word Integration ────────────────────────────────────────

  useEffect(() => {
    let isCancelled = false;

    const initializeWakeWord = async () => {
      if (!isWakeWordEnabled) {
        await wakeWordService.destroy();
        if (!isCancelled) {
          setIsWakeWordListening(false);
          setIsWakeWordReady(false);
          setWakeWordPhrase(getConfiguredWakeWordLabel());
        }
        return;
      }

      const initialized = await wakeWordService.initialize(
        {
          accessKey: voiceAssistantConfig.wakeWord.accessKey ?? '',
          keywordPaths: getConfiguredKeywordPathsForPlatform(),
          builtInKeywords: voiceAssistantConfig.wakeWord.builtInKeywords,
          sensitivity: voiceAssistantConfig.wakeWord.sensitivity,
        },
        {
          onDetection: async (keywordLabel) => {
            if (!isAppActiveRef.current || isModalVisibleRef.current) {
              return;
            }

            if (stateRef.current !== 'idle') {
              return;
            }

            try {
              await wakeWordService.stop();
              setIsWakeWordListening(false);
              setWakeWordPhrase(configuredWakeWordPhrase || keywordLabel);
              setIsModalVisible(true);
              await startListeningFromWakeWordRef.current();
            } catch (wakeWordError) {
              logger.error('Wake-word trigger failed to start listening', wakeWordError as Error);
            }
          },
          onError: (wakeWordError) => {
            logger.error('Wake-word engine error', wakeWordError);
          },
        }
      );

      if (!isCancelled && initialized) {
        setIsWakeWordReady(true);
        setWakeWordPhrase(configuredWakeWordPhrase || wakeWordService.getPrimaryKeywordLabel());
      } else if (!isCancelled) {
        setIsWakeWordReady(false);
      }
    };

    void initializeWakeWord();

    return () => {
      isCancelled = true;
      void wakeWordService.destroy();
    };
  }, [configuredWakeWordPhrase, isWakeWordEnabled]);

  useEffect(() => {
    let isCancelled = false;

    const syncWakeWordListening = async () => {
      const shouldListen =
        isWakeWordEnabled &&
        isWakeWordReady &&
        voiceAssistantConfig.wakeWord.autoStart &&
        isAppActive &&
        hasPermission &&
        !isModalVisible &&
        state === 'idle';

      try {
        if (shouldListen) {
          await wakeWordService.start();
          if (!isCancelled) {
            setIsWakeWordListening(true);
          }
        } else {
          await wakeWordService.stop();
          if (!isCancelled) {
            setIsWakeWordListening(false);
          }
        }
      } catch (wakeWordError) {
        logger.error('Failed to synchronize wake-word listening state', wakeWordError as Error);
        if (!isCancelled) {
          setIsWakeWordListening(false);
        }
      }
    };

    void syncWakeWordListening();

    return () => {
      isCancelled = true;
    };
  }, [hasPermission, isAppActive, isModalVisible, isWakeWordEnabled, isWakeWordReady, state]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        messages,
        partialTranscript,
        error,
        isModalVisible,
        hasPermission,
        isWakeWordEnabled,
        isWakeWordListening,
        wakeWordPhrase,
        startListening,
        stopListening,
        cancel,
        openModal,
        closeModal,
        clearHistory,
        requestPermissions,
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = (): VoiceAssistantContextValue => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
};
