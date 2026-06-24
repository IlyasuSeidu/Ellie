/**
 * VoiceAssistantModal
 *
 * Full-screen modal for the Ryvro voice assistant.
 * Shows conversation history, listening indicator, and controls.
 *
 * Phase 2: Refined animations, error handling UX, accessibility
 * Phase 3: Processing indicator, speaking state, permission flow
 */

import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ListeningIndicator } from './ListeningIndicator';
import { ResponseBubble } from './ResponseBubble';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.92)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  line: 'rgba(191, 231, 255, 0.18)',
  error: '#ff8a80',
  warning: '#ffd166',
} as const;

type VoiceStageState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

const VoiceWaveBar: React.FC<{ index: number; active: boolean }> = ({ index, active }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, {
          duration: 780 + index * 90,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      return;
    }

    pulse.value = withTiming(0.32, { duration: 260, easing: Easing.out(Easing.ease) });
  }, [active, index, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(pulse.value, [0, 1], [18 + index * 2, 42 - Math.abs(index - 2) * 4]),
    opacity: interpolate(pulse.value, [0, 1], [0.46, 1]),
  }));

  return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const VoiceStage: React.FC<{
  state: VoiceStageState;
  title: string;
  subtitle: string;
}> = ({ state, title, subtitle }) => {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.48);
  const isActive = state === 'listening' || state === 'processing' || state === 'speaking';

  useEffect(() => {
    if (isActive) {
      ringScale.value = withRepeat(
        withTiming(1.16, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringOpacity.value = withRepeat(
        withTiming(0.76, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      return;
    }

    ringScale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.ease) });
    ringOpacity.value = withTiming(0.38, { duration: 280, easing: Easing.out(Easing.ease) });
  }, [isActive, ringOpacity, ringScale]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const iconName: keyof typeof Ionicons.glyphMap =
    state === 'speaking'
      ? 'chatbubble-ellipses'
      : state === 'processing'
        ? 'sparkles'
        : state === 'error'
          ? 'alert-circle'
          : 'radio';

  return (
    <View style={styles.voiceStage}>
      <View style={styles.stageHalo}>
        <Animated.View style={[styles.stageRing, ringAnimatedStyle]} />
        <View style={[styles.stageCore, state === 'error' && styles.stageCoreError]}>
          <Ionicons
            name={iconName}
            size={42}
            color={state === 'error' ? RYVRO_COLORS.error : RYVRO_COLORS.void}
          />
        </View>
      </View>

      <View style={styles.waveRow} accessibilityElementsHidden>
        {Array.from({ length: 5 }).map((_, index) => (
          <VoiceWaveBar key={index} index={index} active={isActive} />
        ))}
      </View>

      <Text style={[styles.stageTitle, state === 'error' && styles.errorText]}>{title}</Text>
      <Text style={styles.stageSubtitle}>{subtitle}</Text>
    </View>
  );
};

/**
 * Rotating indicator for processing state
 */
const ProcessingIndicator: React.FC = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.processingIndicator, animStyle]}>
      <Ionicons name="sync" size={24} color={RYVRO_COLORS.cyan} />
    </Animated.View>
  );
};

/**
 * Pulsing indicator for speaking state
 */
const SpeakingIndicator: React.FC = () => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name="volume-high" size={24} color={RYVRO_COLORS.cyan} />
    </Animated.View>
  );
};

export const VoiceAssistantModal: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const {
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
    closeModal,
    clearHistory,
    requestPermissions,
    submitTextQuery,
  } = useVoiceAssistant();

  const insets = useSafeAreaInsets();
  const networkSnapshot = useNetworkStatus();
  const scrollViewRef = useRef<ScrollView>(null);
  const [typedQuery, setTypedQuery] = useState('');
  const isOffline = networkSnapshot.status === 'offline';
  const prefersTypedFallback =
    !hasPermission || (isWakeWordEnabled && !isWakeWordAvailable) || isOffline;
  const isComposerDisabled = state === 'listening';
  const suggestions = useMemo(
    () => [
      t('voiceAssistant.empty.example1', {
        defaultValue: 'What shift do I have tomorrow?',
      }),
      t('voiceAssistant.empty.example2', {
        defaultValue: 'When is my next day off?',
      }),
      t('voiceAssistant.empty.example3', {
        defaultValue: 'How many night shifts this month?',
      }),
    ],
    [t]
  );

  // Auto-scroll to bottom when new messages arrive or partial transcript updates
  useEffect(() => {
    if (messages.length > 0 || partialTranscript) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, partialTranscript]);

  const handleMicPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (state === 'listening') {
      await stopListening();
    } else if (state === 'idle' || state === 'error') {
      await startListening();
    } else if (state === 'speaking') {
      await cancel();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeModal();
  };

  const handlePermissionRequest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestPermissions();
  };

  const handleTypedSubmit = async (queryOverride?: string) => {
    const nextQuery = (queryOverride ?? typedQuery).trim();
    if (!nextQuery || isComposerDisabled) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTypedQuery('');
    await submitTextQuery(nextQuery);
  };

  const normalizeSentence = (text: string): string => text.trim().replace(/[.!?]+$/g, '');

  const getStageTitle = (): string => {
    switch (state) {
      case 'listening':
        return t('voiceAssistant.stage.listeningTitle', { defaultValue: 'I am listening.' });
      case 'processing':
        return t('voiceAssistant.stage.processingTitle', { defaultValue: 'Checking your shift.' });
      case 'speaking':
        return t('voiceAssistant.stage.speakingTitle', { defaultValue: 'Ryvro is answering.' });
      case 'error':
        return t('voiceAssistant.stage.errorTitle', { defaultValue: 'Let us try again.' });
      default:
        return messages.length > 0
          ? t('voiceAssistant.stage.askAgainTitle', { defaultValue: 'Ask another question.' })
          : t('voiceAssistant.stage.readyTitle', { defaultValue: 'Ask Ryvro.' });
    }
  };

  const getStageSubtitle = (): string => {
    switch (state) {
      case 'listening':
        return t('voiceAssistant.stage.listeningSubtitle', {
          defaultValue: 'Say the question in your own words.',
        });
      case 'processing':
        return t('voiceAssistant.stage.processingSubtitle', {
          defaultValue: 'This only takes a moment.',
        });
      case 'speaking':
        return t('voiceAssistant.stage.speakingSubtitle', {
          defaultValue: 'Tap the mic if you want Ryvro to stop.',
        });
      case 'error':
        return t('voiceAssistant.stage.errorSubtitle', {
          defaultValue: 'Tap the big mic and try again.',
        });
      default:
        if (!hasPermission) {
          return t('voiceAssistant.stage.permissionSubtitle', {
            defaultValue: 'Turn on the microphone or type your question.',
          });
        }
        return t('voiceAssistant.stage.readySubtitle', {
          defaultValue: 'Tap the big mic and speak normally.',
        });
    }
  };

  const getStatusText = (): string => {
    switch (state) {
      case 'listening':
        return t('voiceAssistant.status.listening', { defaultValue: 'Listening...' });
      case 'processing':
        return t('voiceAssistant.status.processing', { defaultValue: 'Thinking...' });
      case 'speaking':
        return t('voiceAssistant.status.speaking', { defaultValue: 'Tap to stop speaking' });
      case 'error':
        return getErrorMessage();
      default:
        if (notice) {
          return notice.message;
        }
        if (messages.length === 0 && !hasPermission) {
          return t('voiceAssistant.status.typeOrGrantMic', {
            defaultValue: 'Type your question below or grant microphone access.',
          });
        }
        if (messages.length === 0 && isWakeWordEnabled && !isWakeWordAvailable) {
          return t('voiceAssistant.status.wakeWordUnavailable', {
            defaultValue: 'Wake-word unavailable. Type below or tap the mic to talk.',
          });
        }
        if (messages.length === 0 && isWakeWordEnabled && isWakeWordListening) {
          return t('voiceAssistant.status.sayWakeWordOrTap', {
            wakeWordPhrase,
            defaultValue: 'Say "{{wakeWordPhrase}}" or tap the mic',
          });
        }
        return messages.length > 0
          ? t('voiceAssistant.status.askAnother', {
              defaultValue: 'Tap the mic to ask another question',
            })
          : t('voiceAssistant.status.askRyvro', { defaultValue: 'Tap the mic to ask Ryvro' });
    }
  };

  const getErrorMessage = (): string => {
    if (!error) return t('voiceAssistant.errors.default', { defaultValue: 'Something went wrong' });

    switch (error.type) {
      case 'permission_denied':
        return Platform.OS === 'ios'
          ? t('voiceAssistant.errors.permissionDeniedIos', {
              defaultValue: 'Microphone access denied. Enable in Settings > Ryvro.',
            })
          : t('voiceAssistant.errors.permissionDenied', {
              defaultValue: 'Microphone access denied. Please grant permission.',
            });
      case 'network_error':
        return t('voiceAssistant.errors.network', {
          defaultValue: 'Check your connection and retry.',
        });
      case 'speech_recognition_failed':
        return t('voiceAssistant.errors.recognition', {
          defaultValue: "I didn't catch that. Please try again.",
        });
      case 'backend_error':
        return t('voiceAssistant.errors.backend', {
          defaultValue: 'Service temporarily unavailable. Please try again.',
        });
      case 'rate_limited':
        return t('voiceAssistant.errors.rateLimited', {
          defaultValue: 'Please wait briefly and retry.',
        });
      case 'timeout':
        return t('voiceAssistant.errors.timeout', {
          defaultValue: 'Request timed out. Please retry.',
        });
      case 'wake_word_unavailable':
        return t('voiceAssistant.errors.wakeWordUnavailable', {
          defaultValue: 'Wake-word unavailable, tap the mic to talk.',
        });
      case 'tts_error':
        return t('voiceAssistant.errors.tts', {
          defaultValue: 'Could not play audio response.',
        });
      default:
        return (
          error.message ||
          t('voiceAssistant.errors.default', { defaultValue: 'Something went wrong' })
        );
    }
  };

  const getMicIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (state) {
      case 'listening':
        return 'stop-circle';
      case 'processing':
        return 'hourglass-outline';
      case 'speaking':
        return 'stop';
      case 'error':
        return 'refresh';
      default:
        return 'mic';
    }
  };

  const getMicAccessibilityLabel = (): string => {
    switch (state) {
      case 'listening':
        return t('voiceAssistant.micA11y.listening', {
          defaultValue: 'Stop listening. Double tap to finish speaking.',
        });
      case 'processing':
        return t('voiceAssistant.micA11y.processing', {
          defaultValue: 'Processing your question. Please wait.',
        });
      case 'speaking':
        return t('voiceAssistant.micA11y.speaking', {
          defaultValue: ' Ryvro is speaking. Double tap to stop.',
        });
      case 'error':
        return t('voiceAssistant.micA11y.error', {
          message: normalizeSentence(getErrorMessage()),
          defaultValue: 'Error: {{message}}. Double tap to try again.',
        });
      default:
        return t('voiceAssistant.micA11y.idle', {
          defaultValue: 'Ask Ryvro a question. Double tap to start speaking.',
        });
    }
  };

  return (
    <Modal
      visible={isModalVisible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.backdrop}
      >
        <View style={styles.cyanGlow} pointerEvents="none" />
        <View style={styles.blueGlow} pointerEvents="none" />
        <Animated.View
          entering={SlideInDown.duration(400).springify()}
          exiting={SlideOutDown.duration(300)}
          style={[
            styles.modalContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Header */}
          <View style={styles.header} accessibilityRole="header">
            <View style={styles.headerLeft}>
              <View style={styles.brandMark}>
                <Ionicons name="radio" size={20} color={RYVRO_COLORS.void} />
              </View>
              <View>
                <Text style={styles.title} accessibilityRole="text">
                  Ryvro
                </Text>
                <Text style={styles.subtitle}>
                  {t('voiceAssistant.subtitle', { defaultValue: 'Voice shift assistant' })}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {messages.length > 0 && (
                <TouchableOpacity
                  onPress={clearHistory}
                  style={styles.clearButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel={t('voiceAssistant.clearHistoryA11y', {
                    defaultValue: 'Clear conversation history',
                  })}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color={RYVRO_COLORS.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={t('voiceAssistant.closeA11y', {
                  defaultValue: 'Close voice assistant',
                })}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={RYVRO_COLORS.silver} />
              </TouchableOpacity>
            </View>
          </View>

          <VoiceStage state={state} title={getStageTitle()} subtitle={getStageSubtitle()} />

          {/* Conversation Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.conversationArea}
            contentContainerStyle={styles.conversationContent}
            showsVerticalScrollIndicator={false}
            accessibilityRole="list"
            accessibilityLabel={t('voiceAssistant.conversationHistoryA11y', {
              defaultValue: 'Conversation history',
            })}
          >
            {/* Empty state with suggestions */}
            {messages.length === 0 && state === 'idle' && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {t('voiceAssistant.empty.prompt', {
                    defaultValue: 'Try one of these.',
                  })}
                </Text>
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionLabel}>
                    {prefersTypedFallback
                      ? t('voiceAssistant.empty.tryAsking', { defaultValue: 'Try asking:' })
                      : t('voiceAssistant.empty.trySaying', { defaultValue: 'Try saying:' })}
                  </Text>
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionChip}
                      onPress={() => void handleTypedSubmit(suggestion)}
                      accessibilityRole="button"
                      accessibilityLabel={t('voiceAssistant.empty.suggestionA11y', {
                        query: suggestion,
                        defaultValue: 'Ask Ryvro: {{query}}',
                      })}
                    >
                      <Text style={styles.suggestionText}>&quot;{suggestion}&quot;</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Permission denied notice */}
            {!hasPermission && state === 'idle' && messages.length === 0 && (
              <View style={styles.permissionNotice}>
                <Ionicons name="mic-off-outline" size={32} color={RYVRO_COLORS.warning} />
                <Text style={styles.permissionText}>
                  {t('voiceAssistant.permission.notice', {
                    defaultValue:
                      'Ryvro needs microphone access to hear you. You can also type below.',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={handlePermissionRequest}
                  accessibilityLabel={t('voiceAssistant.permission.grantA11y', {
                    defaultValue: 'Grant microphone permission',
                  })}
                  accessibilityRole="button"
                >
                  <Text style={styles.permissionButtonText}>
                    {t('voiceAssistant.permission.grant', { defaultValue: 'Grant Permission' })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {messages.map((message, index) => (
              <ResponseBubble
                key={message.id}
                message={message}
                index={index}
                isNew={message.role === 'assistant' && index === messages.length - 1}
              />
            ))}

            {/* Partial transcript while listening */}
            {partialTranscript ? (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={styles.partialTranscriptContainer}
              >
                <Text
                  style={styles.partialTranscript}
                  accessibilityLabel={t('voiceAssistant.partialTranscriptA11y', {
                    text: partialTranscript,
                    defaultValue: 'You are saying: {{text}}',
                  })}
                  accessibilityRole="text"
                >
                  {partialTranscript}
                </Text>
              </Animated.View>
            ) : null}

            {/* Processing indicator inline */}
            {state === 'processing' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.processingBubble}>
                <ActivityIndicator size="small" color={RYVRO_COLORS.cyan} />
                <Text style={styles.processingText}>
                  {t('voiceAssistant.processingInline', { defaultValue: 'Ryvro is checking...' })}
                </Text>
              </Animated.View>
            )}
          </ScrollView>

          {/* Bottom Controls */}
          <View style={styles.controls}>
            {/* Listening indicator (shows rings when listening) */}
            {state === 'listening' && (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={styles.indicatorContainer}
              >
                <ListeningIndicator isListening />
              </Animated.View>
            )}

            {/* Processing spinner */}
            {state === 'processing' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.stateIndicatorContainer}
              >
                <ProcessingIndicator />
              </Animated.View>
            )}

            {/* Speaking indicator */}
            {state === 'speaking' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={styles.stateIndicatorContainer}
              >
                <SpeakingIndicator />
              </Animated.View>
            )}

            {/* Status text */}
            <Text
              style={[
                styles.statusText,
                state === 'error' && styles.errorText,
                state === 'idle' && notice?.type === 'warning' && styles.noticeWarningText,
                state === 'idle' && notice?.type === 'info' && styles.noticeInfoText,
              ]}
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
            >
              {getStatusText()}
            </Text>

            {isOffline && (
              <Text style={styles.offlineHintText} accessibilityRole="text">
                {t('voiceAssistant.offlineHint', {
                  defaultValue:
                    'Offline answers are limited to simple schedule questions saved on this device.',
                })}
              </Text>
            )}

            {state === 'idle' && isWakeWordEnabled && !isWakeWordAvailable && wakeWordWarning && (
              <Text style={styles.wakeWordWarningText} accessibilityRole="text">
                {wakeWordWarning}
              </Text>
            )}

            <View style={styles.composerContainer}>
              <TextInput
                value={typedQuery}
                onChangeText={setTypedQuery}
                placeholder={t('voiceAssistant.composer.placeholder', {
                  defaultValue: 'Type a question for Ryvro',
                })}
                placeholderTextColor={RYVRO_COLORS.muted}
                style={styles.composerInput}
                editable={!isComposerDisabled}
                returnKeyType="send"
                onSubmitEditing={() => void handleTypedSubmit()}
                accessibilityLabel={t('voiceAssistant.composer.a11y', {
                  defaultValue: 'Type a question for Ryvro',
                })}
              />
              <TouchableOpacity
                style={[
                  styles.composerSendButton,
                  (typedQuery.trim().length === 0 || isComposerDisabled) &&
                    styles.composerSendButtonDisabled,
                ]}
                onPress={() => void handleTypedSubmit()}
                disabled={typedQuery.trim().length === 0 || isComposerDisabled}
                accessibilityRole="button"
                accessibilityLabel={t('voiceAssistant.composer.sendA11y', {
                  defaultValue: 'Send typed question',
                })}
              >
                <Ionicons name="send" size={18} color={RYVRO_COLORS.void} />
              </TouchableOpacity>
            </View>

            {/* Mic button */}
            <TouchableOpacity
              style={[
                styles.micButton,
                state === 'listening' && styles.micButtonActive,
                state === 'processing' && styles.micButtonProcessing,
                state === 'error' && styles.micButtonError,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.7}
              disabled={state === 'processing'}
              accessibilityLabel={getMicAccessibilityLabel()}
              accessibilityRole="button"
              accessibilityState={{
                disabled: state === 'processing',
                busy: state === 'processing',
              }}
            >
              <Ionicons
                name={getMicIconName()}
                size={32}
                color={
                  state === 'listening'
                    ? RYVRO_COLORS.void
                    : state === 'error'
                      ? RYVRO_COLORS.error
                      : RYVRO_COLORS.void
                }
              />
            </TouchableOpacity>

            {/* Error details with retry hint */}
            {state === 'error' && error && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
                {error.retryable && (
                  <Text style={styles.retryHint} accessibilityRole="text">
                    {t('voiceAssistant.retryHint', { defaultValue: 'Tap the mic to try again' })}
                  </Text>
                )}
                {error.requestId && (
                  <Text style={styles.requestIdText} accessibilityRole="text">
                    {t('voiceAssistant.requestRef', {
                      requestId: error.requestId,
                      defaultValue: 'Ref: {{requestId}}',
                    })}
                  </Text>
                )}
                {error.type === 'permission_denied' && (
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={handlePermissionRequest}
                    accessibilityLabel={t('voiceAssistant.permission.requestA11y', {
                      defaultValue: 'Request microphone permission',
                    })}
                    accessibilityRole="button"
                  >
                    <Text style={styles.settingsButtonText}>
                      {t('voiceAssistant.permission.grant', { defaultValue: 'Grant Permission' })}
                    </Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 2, 4, 0.78)',
  },
  cyanGlow: {
    position: 'absolute',
    top: -90,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    right: -150,
    bottom: 120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(20, 124, 255, 0.15)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: RYVRO_COLORS.void,
    marginTop: SCREEN_HEIGHT * 0.035,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: RYVRO_COLORS.line,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    color: RYVRO_COLORS.silver,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: RYVRO_COLORS.muted,
    fontWeight: '700',
  },
  clearButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(157, 178, 194, 0.08)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.cyan,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  voiceStage: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: RYVRO_COLORS.line,
  },
  stageHalo: {
    width: 126,
    height: 126,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageRing: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    borderColor: 'rgba(32, 244, 220, 0.42)',
    backgroundColor: 'rgba(32, 244, 220, 0.06)',
  },
  stageCore: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.cyan,
    borderWidth: 8,
    borderColor: 'rgba(32, 244, 220, 0.14)',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOpacity: 0.32,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  stageCoreError: {
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderColor: 'rgba(255, 138, 128, 0.24)',
  },
  waveRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
  },
  waveBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor: RYVRO_COLORS.blue,
  },
  stageTitle: {
    marginTop: 8,
    color: RYVRO_COLORS.silver,
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '900',
    textAlign: 'center',
  },
  stageSubtitle: {
    marginTop: 8,
    color: RYVRO_COLORS.muted,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  conversationArea: {
    flex: 1,
  },
  conversationContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 24,
    color: RYVRO_COLORS.silver,
    textAlign: 'center',
    fontWeight: '800',
  },
  suggestions: {
    marginTop: 16,
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  suggestionLabel: {
    fontSize: 14,
    color: RYVRO_COLORS.muted,
    fontWeight: '800',
    marginBottom: 8,
  },
  suggestionChip: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  suggestionText: {
    fontSize: 16,
    lineHeight: 22,
    color: RYVRO_COLORS.silver,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionNotice: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 17,
    lineHeight: 24,
    color: RYVRO_COLORS.muted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    fontWeight: '700',
  },
  permissionButton: {
    backgroundColor: RYVRO_COLORS.blue,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 22,
  },
  permissionButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: RYVRO_COLORS.silver,
  },
  partialTranscriptContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  partialTranscript: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 6,
    backgroundColor: 'rgba(20, 124, 255, 0.24)',
    color: RYVRO_COLORS.silver,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    overflow: 'hidden',
  },
  processingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  processingText: {
    fontSize: 15,
    color: RYVRO_COLORS.muted,
    fontWeight: '800',
  },
  controls: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: RYVRO_COLORS.line,
    backgroundColor: 'rgba(2, 7, 11, 0.94)',
  },
  indicatorContainer: {
    marginBottom: 8,
  },
  stateIndicatorContainer: {
    marginBottom: 8,
    height: 32,
    justifyContent: 'center',
  },
  processingIndicator: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 18,
    lineHeight: 25,
    color: RYVRO_COLORS.silver,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontWeight: '800',
  },
  offlineHintText: {
    fontSize: 13,
    color: RYVRO_COLORS.muted,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: RYVRO_COLORS.error,
  },
  noticeWarningText: {
    color: RYVRO_COLORS.warning,
  },
  noticeInfoText: {
    color: RYVRO_COLORS.muted,
  },
  wakeWordWarningText: {
    fontSize: 13,
    color: RYVRO_COLORS.warning,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  composerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  composerInput: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    backgroundColor: RYVRO_COLORS.panel,
    color: RYVRO_COLORS.silver,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
  },
  composerSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.cyan,
  },
  composerSendButtonDisabled: {
    opacity: 0.4,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: RYVRO_COLORS.cyan,
    borderWidth: 8,
    borderColor: 'rgba(32, 244, 220, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  micButtonActive: {
    backgroundColor: RYVRO_COLORS.blue,
    borderColor: 'rgba(20, 124, 255, 0.22)',
  },
  micButtonProcessing: {
    opacity: 0.5,
    borderColor: RYVRO_COLORS.line,
  },
  micButtonError: {
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderColor: RYVRO_COLORS.error,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  retryHint: {
    fontSize: 13,
    color: RYVRO_COLORS.muted,
  },
  requestIdText: {
    marginTop: 4,
    fontSize: 12,
    color: RYVRO_COLORS.muted,
  },
  settingsButton: {
    marginTop: 8,
    backgroundColor: RYVRO_COLORS.panelStrong,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  settingsButtonText: {
    fontSize: 13,
    color: RYVRO_COLORS.cyan,
    fontWeight: '800',
  },
});
