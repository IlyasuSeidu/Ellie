/**
 * VoiceAssistantModal
 *
 * Full-screen modal for the Ellie voice assistant.
 * Shows conversation history, listening indicator, and controls.
 *
 * Phase 2: Refined animations, error handling UX, accessibility
 * Phase 3: Processing indicator, speaking state, permission flow
 */

import React, { useRef, useEffect } from 'react';
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
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { ListeningIndicator } from './ListeningIndicator';
import { ResponseBubble } from './ResponseBubble';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      <Ionicons name="sync" size={24} color={theme.colors.sacredGold} />
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
      <Ionicons name="volume-high" size={24} color={theme.colors.sacredGold} />
    </Animated.View>
  );
};

export const VoiceAssistantModal: React.FC = () => {
  const {
    state,
    messages,
    partialTranscript,
    error,
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
  } = useVoiceAssistant();

  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

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

  const normalizeSentence = (text: string): string => text.trim().replace(/[.!?]+$/g, '');

  const getStatusText = (): string => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Tap to stop speaking';
      case 'error':
        return getErrorMessage();
      default:
        if (messages.length === 0 && isWakeWordEnabled && !isWakeWordAvailable) {
          return 'Wake-word unavailable, tap the mic to talk';
        }
        if (messages.length === 0 && isWakeWordEnabled && isWakeWordListening) {
          return `Say "${wakeWordPhrase}" or tap the mic`;
        }
        return messages.length > 0
          ? 'Tap the mic to ask another question'
          : 'Tap the mic to ask Ellie';
    }
  };

  const getErrorMessage = (): string => {
    if (!error) return 'Something went wrong';

    switch (error.type) {
      case 'permission_denied':
        return Platform.OS === 'ios'
          ? 'Microphone access denied. Enable in Settings > Ellie.'
          : 'Microphone access denied. Please grant permission.';
      case 'network_error':
        return 'Check your connection and retry.';
      case 'speech_recognition_failed':
        return "I didn't catch that. Please try again.";
      case 'backend_error':
        return 'Service temporarily unavailable. Please try again.';
      case 'rate_limited':
        return 'Please wait briefly and retry.';
      case 'timeout':
        return 'Request timed out. Please retry.';
      case 'wake_word_unavailable':
        return 'Wake-word unavailable, tap the mic to talk.';
      case 'tts_error':
        return 'Could not play audio response.';
      default:
        return error.message || 'Something went wrong';
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
        return 'Stop listening. Double tap to finish speaking.';
      case 'processing':
        return 'Processing your question. Please wait.';
      case 'speaking':
        return 'Ellie is speaking. Double tap to stop.';
      case 'error':
        return `Error: ${normalizeSentence(getErrorMessage())}. Double tap to try again.`;
      default:
        return 'Ask Ellie a question. Double tap to start speaking.';
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
              <Text style={styles.title} accessibilityRole="text">
                Ellie
              </Text>
              <Text style={styles.subtitle}>Voice Assistant</Text>
            </View>
            <View style={styles.headerRight}>
              {messages.length > 0 && (
                <TouchableOpacity
                  onPress={clearHistory}
                  style={styles.clearButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Clear conversation history"
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.shadow} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Close voice assistant"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={theme.colors.dust} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Conversation Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.conversationArea}
            contentContainerStyle={styles.conversationContent}
            showsVerticalScrollIndicator={false}
            accessibilityRole="list"
            accessibilityLabel="Conversation history"
          >
            {/* Empty state with suggestions */}
            {messages.length === 0 && state === 'idle' && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={theme.colors.softStone}
                  accessibilityElementsHidden
                />
                <Text style={styles.emptyText}>Ask me about your shift schedule</Text>
                <View style={styles.suggestions}>
                  <Text style={styles.suggestionLabel}>Try saying:</Text>
                  <Text style={styles.suggestionText}>
                    &quot;What shift do I have tomorrow?&quot;
                  </Text>
                  <Text style={styles.suggestionText}>&quot;When is my next day off?&quot;</Text>
                  <Text style={styles.suggestionText}>
                    &quot;How many night shifts this month?&quot;
                  </Text>
                </View>
              </View>
            )}

            {/* Permission denied notice */}
            {!hasPermission && state === 'idle' && messages.length === 0 && (
              <View style={styles.permissionNotice}>
                <Ionicons name="mic-off-outline" size={32} color={theme.colors.warning} />
                <Text style={styles.permissionText}>
                  Ellie needs microphone access to hear your questions.
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={handlePermissionRequest}
                  accessibilityLabel="Grant microphone permission"
                  accessibilityRole="button"
                >
                  <Text style={styles.permissionButtonText}>Grant Permission</Text>
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
                  accessibilityLabel={`You are saying: ${partialTranscript}`}
                  accessibilityRole="text"
                >
                  {partialTranscript}
                </Text>
              </Animated.View>
            ) : null}

            {/* Processing indicator inline */}
            {state === 'processing' && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.processingBubble}>
                <ActivityIndicator size="small" color={theme.colors.sacredGold} />
                <Text style={styles.processingText}>Ellie is thinking...</Text>
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
              style={[styles.statusText, state === 'error' && styles.errorText]}
              accessibilityLiveRegion="polite"
              accessibilityRole="text"
            >
              {getStatusText()}
            </Text>

            {state === 'idle' && isWakeWordEnabled && !isWakeWordAvailable && wakeWordWarning && (
              <Text style={styles.wakeWordWarningText} accessibilityRole="text">
                Wake-word unavailable, tap mic to talk.
              </Text>
            )}

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
                    ? theme.colors.text.inverse
                    : state === 'error'
                      ? theme.colors.error
                      : theme.colors.sacredGold
                }
              />
            </TouchableOpacity>

            {/* Error details with retry hint */}
            {state === 'error' && error && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.errorContainer}>
                {error.retryable && (
                  <Text style={styles.retryHint} accessibilityRole="text">
                    Tap the mic to try again
                  </Text>
                )}
                {error.type === 'permission_denied' && (
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={handlePermissionRequest}
                    accessibilityLabel="Request microphone permission"
                    accessibilityRole="button"
                  >
                    <Text style={styles.settingsButtonText}>Grant Permission</Text>
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
    backgroundColor: theme.colors.opacity.black60,
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
    marginTop: SCREEN_HEIGHT * 0.05,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.sacredGold,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    marginTop: 2,
  },
  clearButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  conversationArea: {
    flex: 1,
  },
  conversationContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: theme.typography.fontSizes.lg,
    color: theme.colors.dust,
    marginTop: 16,
    textAlign: 'center',
  },
  suggestions: {
    marginTop: 24,
    alignItems: 'center',
  },
  suggestionLabel: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.shadow,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    fontStyle: 'italic',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionNotice: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.dust,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: theme.colors.sacredGold,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  permissionButtonText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.inverse,
  },
  partialTranscriptContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  partialTranscript: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: theme.colors.opacity.gold20,
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.md,
    fontStyle: 'italic',
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
    paddingVertical: 10,
    backgroundColor: theme.colors.softStone,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  processingText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    fontStyle: 'italic',
  },
  controls: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
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
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: theme.colors.error,
  },
  wakeWordWarningText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.warning,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.darkStone,
    borderWidth: 2,
    borderColor: theme.colors.sacredGold,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.ios.goldGlow,
    elevation: 8,
  },
  micButtonActive: {
    backgroundColor: theme.colors.sacredGold,
    borderColor: theme.colors.brightGold,
  },
  micButtonProcessing: {
    opacity: 0.5,
    borderColor: theme.colors.softStone,
  },
  micButtonError: {
    borderColor: theme.colors.error,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  retryHint: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.shadow,
  },
  settingsButton: {
    marginTop: 8,
    backgroundColor: theme.colors.softStone,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  settingsButtonText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.sacredGold,
    fontWeight: theme.typography.fontWeights.medium,
  },
});
