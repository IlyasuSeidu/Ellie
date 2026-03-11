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
import { voiceAssistantPersistenceService } from '@/services/VoiceAssistantPersistenceService';
import { speechRecognitionService } from '@/services/SpeechRecognitionService';
import { WakeWordError, wakeWordService } from '@/services/WakeWordService';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { toDateString } from '@/utils/dateUtils';
import { voiceAssistantConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';
import type {
  VoiceAssistantDiagnosticCategory,
  VoiceAssistantState,
  VoiceMessage,
  VoiceAssistantError,
  VoiceAssistantNotice,
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
  /** Non-fatal user-facing notice */
  notice: VoiceAssistantNotice | null;
  /** Whether the assistant modal is visible */
  isModalVisible: boolean;
  /** Whether speech recognition permissions have been granted */
  hasPermission: boolean;
  /** Whether wake-word detection is configured and enabled */
  isWakeWordEnabled: boolean;
  /** Whether wake-word engine is available in this app session */
  isWakeWordAvailable: boolean;
  /** Whether wake-word engine is currently listening */
  isWakeWordListening: boolean;
  /** Optional wake-word warning shown to the user */
  wakeWordWarning: string | null;
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
const DEFAULT_VOICE_PERSIST_TTL_SECONDS = 12 * 60 * 60;
const NOTICE_AUTO_DISMISS_MS = 4_000;
const PERSISTENCE_DEBOUNCE_MS = 2_000;

const getWakeWordUnavailableWarning = (): string =>
  i18n.t('voiceAssistant.warnings.wakeWordUnavailableTapToTalk', {
    ns: 'dashboard',
    defaultValue: 'Wake-word unavailable, tap mic to talk.',
  });

const getWakeWordPermissionRequiredWarning = (): string =>
  i18n.t('voiceAssistant.warnings.microphonePermissionRequired', {
    ns: 'dashboard',
    defaultValue: 'Microphone permission required for Hey Ellie. Tap mic to talk.',
  });

export function getVoicePersistenceTTLSeconds(): number | undefined {
  const rawValue = process.env.EXPO_PUBLIC_VOICE_ASSISTANT_PERSIST_TTL_SECONDS;
  if (!rawValue) {
    return DEFAULT_VOICE_PERSIST_TTL_SECONDS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

export function getConfiguredKeywordPathsForPlatform(platformOS: string = Platform.OS): string[] {
  if (platformOS === 'ios' && voiceAssistantConfig.wakeWord.keywordPathsIOS.length > 0) {
    return voiceAssistantConfig.wakeWord.keywordPathsIOS;
  }

  if (platformOS === 'android' && voiceAssistantConfig.wakeWord.keywordPathsAndroid.length > 0) {
    return voiceAssistantConfig.wakeWord.keywordPathsAndroid;
  }

  return voiceAssistantConfig.wakeWord.keywordPaths;
}

export function getConfiguredOpenWakeWordModelPathForPlatform(
  platformOS: string = Platform.OS
): string | undefined {
  if (platformOS === 'ios' && voiceAssistantConfig.wakeWord.openWakeWordModelPathIOS) {
    return voiceAssistantConfig.wakeWord.openWakeWordModelPathIOS;
  }

  if (platformOS === 'android' && voiceAssistantConfig.wakeWord.openWakeWordModelPathAndroid) {
    return voiceAssistantConfig.wakeWord.openWakeWordModelPathAndroid;
  }

  return voiceAssistantConfig.wakeWord.openWakeWordModelPath;
}

export function getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform(
  platformOS: string = Platform.OS
): string | undefined {
  if (
    platformOS === 'ios' &&
    voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathIOS
  ) {
    return voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathIOS;
  }

  if (
    platformOS === 'android' &&
    voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathAndroid
  ) {
    return voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPathAndroid;
  }

  return voiceAssistantConfig.wakeWord.openWakeWordMelspectrogramModelPath;
}

export function getConfiguredOpenWakeWordEmbeddingModelPathForPlatform(
  platformOS: string = Platform.OS
): string | undefined {
  if (platformOS === 'ios' && voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathIOS) {
    return voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathIOS;
  }

  if (
    platformOS === 'android' &&
    voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathAndroid
  ) {
    return voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPathAndroid;
  }

  return voiceAssistantConfig.wakeWord.openWakeWordEmbeddingModelPath;
}

export function getConfiguredWakeWordLabel(): string {
  const configuredPhrase = voiceAssistantConfig.wakeWord.phrase?.trim();
  if (configuredPhrase) {
    return configuredPhrase;
  }

  if (voiceAssistantConfig.wakeWord.provider === 'openwakeword') {
    const modelPath = getConfiguredOpenWakeWordModelPathForPlatform();
    if (modelPath) {
      const fileName = modelPath.split('/').pop() ?? modelPath;
      return fileName.replace(/\.(onnx|tflite)$/i, '');
    }
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
  const configuredOpenWakeWordModelPath = getConfiguredOpenWakeWordModelPathForPlatform();
  const configuredOpenWakeWordMelspectrogramModelPath =
    getConfiguredOpenWakeWordMelspectrogramModelPathForPlatform();
  const configuredOpenWakeWordEmbeddingModelPath =
    getConfiguredOpenWakeWordEmbeddingModelPathForPlatform();
  const hasWakeWordProviderRequirements =
    voiceAssistantConfig.wakeWord.provider === 'openwakeword'
      ? Boolean(configuredOpenWakeWordModelPath)
      : Boolean(voiceAssistantConfig.wakeWord.accessKey);
  const isWakeWordEnabled =
    voiceAssistantConfig.wakeWord.enabled && hasWakeWordProviderRequirements;
  const configuredWakeWordPhrase = voiceAssistantConfig.wakeWord.phrase?.trim();

  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<VoiceAssistantError | null>(null);
  const [notice, setNotice] = useState<VoiceAssistantNotice | null>(null);
  const [lastError, setLastError] = useState<VoiceAssistantError | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasPermissionChecked, setHasPermissionChecked] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [isWakeWordReady, setIsWakeWordReady] = useState(false);
  const [isWakeWordAvailable, setIsWakeWordAvailable] = useState(isWakeWordEnabled);
  const [wakeWordWarning, setWakeWordWarning] = useState<string | null>(null);
  const [wakeWordPhrase, setWakeWordPhrase] = useState(getConfiguredWakeWordLabel());
  const [isAppActive, setIsAppActive] = useState(true);

  const initializedRef = useRef(false);
  const hydrationCompleteRef = useRef(false);
  const wakeWordUnavailableHydratedRef = useRef(false);
  const stateRef = useRef<VoiceAssistantState>('idle');
  const isModalVisibleRef = useRef(false);
  const hasPermissionRef = useRef(false);
  const wakeWordPermissionRequestAttemptedRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const startListeningFromWakeWordRef = useRef<() => Promise<void>>(async () => {});
  const noticeDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      rosterType: shiftCycle.rosterType,
      fifoConfig: shiftCycle.fifoConfig,
      currentDate: toDateString(now),
      currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      shiftSystem: onboardingData.shiftSystem ?? '2-shift',
      shiftTimes: onboardingData.shiftTimes,
    };
  }, [onboardingData]);

  const getPersistenceOptions = useCallback(() => {
    const ttlSeconds = getVoicePersistenceTTLSeconds();
    return ttlSeconds ? { ttlSeconds } : {};
  }, []);

  const clearNoticeDismissTimeout = useCallback(() => {
    if (noticeDismissTimeoutRef.current) {
      clearTimeout(noticeDismissTimeoutRef.current);
      noticeDismissTimeoutRef.current = null;
    }
  }, []);

  const clearNotice = useCallback(() => {
    clearNoticeDismissTimeout();
    setNotice(null);
  }, [clearNoticeDismissTimeout]);

  const showNotice = useCallback(
    (nextNotice: VoiceAssistantNotice) => {
      clearNoticeDismissTimeout();
      setNotice(nextNotice);
      noticeDismissTimeoutRef.current = setTimeout(() => {
        setNotice(null);
        noticeDismissTimeoutRef.current = null;
      }, NOTICE_AUTO_DISMISS_MS);
    },
    [clearNoticeDismissTimeout]
  );

  const appendDiagnostic = useCallback(
    (
      category: VoiceAssistantDiagnosticCategory,
      code: string,
      message: string,
      retryable?: boolean,
      details?: Record<string, unknown>
    ) => {
      void voiceAssistantPersistenceService
        .appendDiagnostic(
          {
            category,
            code,
            message,
            retryable,
            details,
          },
          getPersistenceOptions()
        )
        .catch((persistenceError) => {
          logger.warn('Failed to persist voice assistant diagnostic', {
            error:
              persistenceError instanceof Error
                ? persistenceError.message
                : String(persistenceError),
            category,
            code,
          });
        });
    },
    [getPersistenceOptions]
  );

  const persistWakeWordSession = useCallback(
    (session: { unavailable: boolean; reason?: string; updatedAt: number } | null) => {
      void voiceAssistantPersistenceService
        .persistWakeWordSession(session, getPersistenceOptions())
        .catch((persistenceError) => {
          logger.warn('Failed to persist wake-word session state', {
            error:
              persistenceError instanceof Error
                ? persistenceError.message
                : String(persistenceError),
          });
        });
    },
    [getPersistenceOptions]
  );

  // ─── Initialize Service ───────────────────────────────────────────

  useEffect(() => {
    const userContext = buildUserContext();
    if (!userContext) return undefined;

    if (initializedRef.current) {
      voiceAssistantService.updateUserContext(userContext);
      return undefined;
    }

    let isCancelled = false;

    voiceAssistantService.initialize(
      {
        onStateChange: (newState) => {
          setState(newState);
          if (newState !== 'error') {
            setError(null);
          }
          if (newState !== 'idle') {
            clearNotice();
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
          clearNotice();
          setError(err);
          setLastError(err);
          appendDiagnostic('pipeline', `voice_error_${err.type}`, err.message, err.retryable, {
            requestId: err.requestId,
            statusCode: err.statusCode,
            errorCode: err.code,
          });
        },
        onNotice: (assistantNotice) => {
          showNotice(assistantNotice);
          appendDiagnostic(
            'pipeline',
            `voice_notice_${assistantNotice.code ?? assistantNotice.type}`,
            assistantNotice.message,
            true,
            {
              noticeType: assistantNotice.type,
              code: assistantNotice.code,
            }
          );
        },
      },
      userContext
    );

    initializedRef.current = true;
    hydrationCompleteRef.current = false;

    // Check permissions on mount
    setHasPermissionChecked(false);
    speechRecognitionService
      .hasPermissions()
      .then((granted) => {
        if (isCancelled) {
          return;
        }
        setHasPermission(granted);
        setHasPermissionChecked(true);
      })
      .catch((permissionError) => {
        logger.warn('Failed to check speech recognition permissions', {
          error:
            permissionError instanceof Error ? permissionError.message : String(permissionError),
        });
        if (!isCancelled) {
          setHasPermission(false);
          setHasPermissionChecked(true);
        }
      });

    const hydratePersistedVoiceState = async () => {
      const persistedState = await voiceAssistantPersistenceService.hydrate();
      if (isCancelled) {
        return;
      }

      if (persistedState.history.length > 0) {
        voiceAssistantService.restoreHistory(persistedState.history);
        setMessages(persistedState.history);
      }

      if (persistedState.lastError) {
        setLastError(persistedState.lastError);
        setError(persistedState.lastError);
      }

      const persistedWakeWordReason = persistedState.wakeWordSession?.reason ?? '';
      const isInvalidModelSessionFlag = persistedWakeWordReason
        .toLowerCase()
        .includes('invalid or incompatible');
      const shouldForceWakeWordReinitialize =
        voiceAssistantConfig.wakeWord.provider === 'openwakeword' &&
        Boolean(configuredOpenWakeWordModelPath);

      if (
        persistedState.wakeWordSession?.unavailable &&
        isWakeWordEnabled &&
        !isInvalidModelSessionFlag &&
        !shouldForceWakeWordReinitialize
      ) {
        wakeWordUnavailableHydratedRef.current = true;
        setIsWakeWordReady(false);
        setIsWakeWordListening(false);
        setIsWakeWordAvailable(false);
        setWakeWordWarning(
          persistedState.wakeWordSession.reason ?? getWakeWordUnavailableWarning()
        );
      } else {
        wakeWordUnavailableHydratedRef.current = false;
        if (isInvalidModelSessionFlag || shouldForceWakeWordReinitialize) {
          void voiceAssistantPersistenceService
            .persistWakeWordSession(null, getPersistenceOptions())
            .catch((persistenceError) => {
              logger.warn('Failed to clear stale wake-word unavailable session state', {
                error:
                  persistenceError instanceof Error
                    ? persistenceError.message
                    : String(persistenceError),
              });
            });
        }
      }

      hydrationCompleteRef.current = true;

      // Ensure we have current snapshots persisted with current TTL strategy.
      await Promise.all([
        voiceAssistantPersistenceService.persistHistory(
          persistedState.history,
          getPersistenceOptions()
        ),
        voiceAssistantPersistenceService.persistLastError(
          persistedState.lastError,
          getPersistenceOptions()
        ),
        voiceAssistantPersistenceService.persistWakeWordSession(
          persistedState.wakeWordSession,
          getPersistenceOptions()
        ),
        voiceAssistantPersistenceService.persistDiagnostics(
          persistedState.diagnostics,
          getPersistenceOptions()
        ),
      ]).catch((persistenceError) => {
        logger.warn('Failed to persist hydrated voice assistant state', {
          error:
            persistenceError instanceof Error ? persistenceError.message : String(persistenceError),
        });
      });
    };

    void hydratePersistedVoiceState();

    return () => {
      isCancelled = true;
      voiceAssistantService.destroy();
      clearNoticeDismissTimeout();
      initializedRef.current = false;
      hydrationCompleteRef.current = false;
      wakeWordUnavailableHydratedRef.current = false;
    };
  }, [
    appendDiagnostic,
    buildUserContext,
    clearNotice,
    clearNoticeDismissTimeout,
    configuredOpenWakeWordModelPath,
    getPersistenceOptions,
    isWakeWordEnabled,
    showNotice,
  ]);

  useEffect(() => {
    return () => {
      clearNoticeDismissTimeout();
    };
  }, [clearNoticeDismissTimeout]);

  const historyPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initializedRef.current || !hydrationCompleteRef.current) {
      return undefined;
    }

    // Debounce persistence writes to reduce AsyncStorage I/O
    if (historyPersistTimerRef.current) clearTimeout(historyPersistTimerRef.current);
    historyPersistTimerRef.current = setTimeout(() => {
      void voiceAssistantPersistenceService
        .persistHistory(messages, getPersistenceOptions())
        .catch((persistenceError) => {
          logger.warn('Failed to persist voice assistant history', {
            error:
              persistenceError instanceof Error
                ? persistenceError.message
                : String(persistenceError),
          });
        });
    }, PERSISTENCE_DEBOUNCE_MS);

    return () => {
      if (historyPersistTimerRef.current) clearTimeout(historyPersistTimerRef.current);
    };
  }, [getPersistenceOptions, messages]);

  const errorPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initializedRef.current || !hydrationCompleteRef.current) {
      return undefined;
    }

    if (errorPersistTimerRef.current) clearTimeout(errorPersistTimerRef.current);
    errorPersistTimerRef.current = setTimeout(() => {
      void voiceAssistantPersistenceService
        .persistLastError(lastError, getPersistenceOptions())
        .catch((persistenceError) => {
          logger.warn('Failed to persist voice assistant last error', {
            error:
              persistenceError instanceof Error
                ? persistenceError.message
                : String(persistenceError),
          });
        });
    }, PERSISTENCE_DEBOUNCE_MS);

    return () => {
      if (errorPersistTimerRef.current) clearTimeout(errorPersistTimerRef.current);
    };
  }, [getPersistenceOptions, lastError]);

  // ─── Actions ──────────────────────────────────────────────────────

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await speechRecognitionService.requestPermissions();
    setHasPermission(granted);
    setHasPermissionChecked(true);
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

  useEffect(() => {
    if (!isWakeWordEnabled || !voiceAssistantConfig.wakeWord.autoStart || !hasPermissionChecked) {
      return undefined;
    }

    if (hasPermission || wakeWordPermissionRequestAttemptedRef.current) {
      return undefined;
    }

    let isCancelled = false;
    wakeWordPermissionRequestAttemptedRef.current = true;

    const ensureWakeWordPermission = async () => {
      try {
        const granted = await requestPermissions();
        if (!isCancelled && !granted) {
          setWakeWordWarning((previous) => previous ?? getWakeWordPermissionRequiredWarning());
          appendDiagnostic(
            'speech_recognition',
            'wake_word_permission_denied',
            'Microphone permission denied for wake-word listening.',
            true
          );
        }
      } catch (permissionError) {
        if (!isCancelled) {
          logger.warn('Failed to request speech recognition permissions for wake-word', {
            error:
              permissionError instanceof Error ? permissionError.message : String(permissionError),
          });
          setWakeWordWarning((previous) => previous ?? getWakeWordPermissionRequiredWarning());
          appendDiagnostic(
            'speech_recognition',
            'wake_word_permission_request_failed',
            permissionError instanceof Error
              ? permissionError.message
              : 'Failed to request microphone permission for wake-word listening.',
            true
          );
        }
      }
    };

    void ensureWakeWordPermission();

    return () => {
      isCancelled = true;
    };
  }, [
    appendDiagnostic,
    hasPermission,
    hasPermissionChecked,
    isWakeWordEnabled,
    requestPermissions,
  ]);

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
          setIsWakeWordAvailable(false);
          setWakeWordWarning(null);
          setWakeWordPhrase(getConfiguredWakeWordLabel());
        }
        return;
      }

      if (wakeWordUnavailableHydratedRef.current) {
        if (!isCancelled) {
          setIsWakeWordListening(false);
          setIsWakeWordReady(false);
          setIsWakeWordAvailable(false);
          setWakeWordWarning((previous) => previous ?? getWakeWordUnavailableWarning());
        }
        return;
      }

      let wakeWordInitErrorMessage: string | undefined;
      let wakeWordInitError: Error | undefined;
      const initialized = await wakeWordService.initialize(
        {
          provider: voiceAssistantConfig.wakeWord.provider,
          accessKey: voiceAssistantConfig.wakeWord.accessKey ?? '',
          keywordPaths: getConfiguredKeywordPathsForPlatform(),
          builtInKeywords: voiceAssistantConfig.wakeWord.builtInKeywords,
          sensitivity: voiceAssistantConfig.wakeWord.sensitivity,
          openWakeWordModelPath: configuredOpenWakeWordModelPath,
          openWakeWordMelspectrogramModelPath: configuredOpenWakeWordMelspectrogramModelPath,
          openWakeWordEmbeddingModelPath: configuredOpenWakeWordEmbeddingModelPath,
          openWakeWordKeywordLabel: configuredWakeWordPhrase || getConfiguredWakeWordLabel(),
          openWakeWordThreshold: voiceAssistantConfig.wakeWord.openWakeWordThreshold,
          openWakeWordTriggerCooldownMs:
            voiceAssistantConfig.wakeWord.openWakeWordTriggerCooldownMs,
          openWakeWordMinRmsForDetection:
            voiceAssistantConfig.wakeWord.openWakeWordMinRmsForDetection,
          openWakeWordActivationFrames: voiceAssistantConfig.wakeWord.openWakeWordActivationFrames,
          openWakeWordScoreSmoothingAlpha:
            voiceAssistantConfig.wakeWord.openWakeWordScoreSmoothingAlpha,
        },
        {
          onDetection: async (keywordLabel) => {
            const currentState = stateRef.current;

            logger.info('Wake-word detected event received', {
              keywordLabel,
              appActive: isAppActiveRef.current,
              modalVisible: isModalVisibleRef.current,
              state: currentState,
            });

            if (!isAppActiveRef.current) {
              logger.debug('Ignoring wake-word detection while app is not active');
              return;
            }

            if (isModalVisibleRef.current) {
              logger.debug('Ignoring wake-word detection while voice modal is already visible');
              return;
            }

            const canWakeFromState = currentState === 'idle' || currentState === 'error';
            if (!canWakeFromState) {
              logger.debug('Ignoring wake-word detection due to assistant state', {
                state: currentState,
              });
              return;
            }

            try {
              await wakeWordService.stop();
              setIsWakeWordListening(false);
              setWakeWordPhrase(configuredWakeWordPhrase || keywordLabel);
              setIsModalVisible(true);

              if (currentState === 'error') {
                await voiceAssistantService.cancel();
              }

              await startListeningFromWakeWordRef.current();
            } catch (wakeWordError) {
              logger.error('Wake-word trigger failed to start listening', wakeWordError as Error);
            }
          },
          onError: (wakeWordError) => {
            if (wakeWordError instanceof WakeWordError) {
              logger.warn('Wake-word engine warning', {
                code: wakeWordError.code,
                fatal: wakeWordError.fatal,
                retryable: wakeWordError.retryable,
                message: wakeWordError.message,
              });
            } else {
              logger.error('Wake-word engine error', wakeWordError);
            }
            if (wakeWordError instanceof WakeWordError || wakeWordError instanceof Error) {
              wakeWordInitError = wakeWordError;
              wakeWordInitErrorMessage = wakeWordError.message;
            }

            const retryable =
              wakeWordError instanceof WakeWordError ? wakeWordError.retryable : undefined;
            appendDiagnostic(
              'wake_word',
              'wake_word_engine_error',
              wakeWordError instanceof Error
                ? wakeWordError.message
                : 'Wake-word engine emitted an unknown error.',
              retryable
            );
          },
        }
      );

      if (!isCancelled && initialized) {
        wakeWordUnavailableHydratedRef.current = false;
        setIsWakeWordReady(true);
        setIsWakeWordAvailable(true);
        setWakeWordWarning(null);
        setWakeWordPhrase(configuredWakeWordPhrase || wakeWordService.getPrimaryKeywordLabel());
        persistWakeWordSession(null);
        appendDiagnostic(
          'wake_word',
          'wake_word_initialized',
          'Wake-word initialized successfully.'
        );
      } else if (!isCancelled) {
        setIsWakeWordReady(false);
        setIsWakeWordListening(false);

        const unavailableReason =
          wakeWordInitErrorMessage ??
          wakeWordService.getUnavailableReason() ??
          getWakeWordUnavailableWarning();
        setIsWakeWordAvailable(false);
        setWakeWordWarning(unavailableReason);

        const isFatalWakeWordFailure =
          (wakeWordInitError instanceof WakeWordError && wakeWordInitError.fatal) ||
          wakeWordService.isUnavailableForSession();
        if (isFatalWakeWordFailure) {
          wakeWordUnavailableHydratedRef.current = true;
          persistWakeWordSession({
            unavailable: true,
            reason: unavailableReason,
            updatedAt: Date.now(),
          });
        }

        const retryable =
          wakeWordInitError instanceof WakeWordError ? wakeWordInitError.retryable : undefined;
        appendDiagnostic('wake_word', 'wake_word_initialize_failed', unavailableReason, retryable, {
          fatal: isFatalWakeWordFailure,
        });
      }
    };

    void initializeWakeWord();

    return () => {
      isCancelled = true;
      void wakeWordService.destroy();
    };
  }, [
    appendDiagnostic,
    configuredOpenWakeWordEmbeddingModelPath,
    configuredOpenWakeWordMelspectrogramModelPath,
    configuredOpenWakeWordModelPath,
    configuredWakeWordPhrase,
    isWakeWordEnabled,
    persistWakeWordSession,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const syncWakeWordListening = async () => {
      const shouldListen =
        isWakeWordEnabled &&
        isWakeWordAvailable &&
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
        if (wakeWordError instanceof WakeWordError) {
          logger.warn('Failed to synchronize wake-word listening state', {
            code: wakeWordError.code,
            fatal: wakeWordError.fatal,
            retryable: wakeWordError.retryable,
            message: wakeWordError.message,
          });
        } else {
          logger.error('Failed to synchronize wake-word listening state', wakeWordError as Error);
        }
        if (!isCancelled) {
          const message =
            wakeWordError instanceof Error
              ? wakeWordError.message
              : getWakeWordUnavailableWarning();
          const isFatalWakeWordFailure =
            wakeWordError instanceof WakeWordError ? wakeWordError.fatal : false;

          setIsWakeWordListening(false);
          setIsWakeWordAvailable(false);
          setWakeWordWarning(message);

          if (isFatalWakeWordFailure) {
            wakeWordUnavailableHydratedRef.current = true;
            persistWakeWordSession({
              unavailable: true,
              reason: message,
              updatedAt: Date.now(),
            });
          }

          const retryable =
            wakeWordError instanceof WakeWordError ? wakeWordError.retryable : undefined;
          appendDiagnostic('wake_word', 'wake_word_sync_failed', message, retryable, {
            fatal: isFatalWakeWordFailure,
          });
        }
      }
    };

    void syncWakeWordListening();

    return () => {
      isCancelled = true;
    };
  }, [
    appendDiagnostic,
    hasPermission,
    isAppActive,
    isModalVisible,
    isWakeWordAvailable,
    isWakeWordEnabled,
    isWakeWordReady,
    persistWakeWordSession,
    state,
  ]);

  return (
    <VoiceAssistantContext.Provider
      value={{
        state,
        messages,
        partialTranscript,
        error,
        notice,
        isModalVisible,
        hasPermission,
        isWakeWordEnabled,
        isWakeWordAvailable,
        isWakeWordListening,
        wakeWordWarning,
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
