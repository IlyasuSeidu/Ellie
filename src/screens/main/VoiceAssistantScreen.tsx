import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useVoiceAssistant } from '@/contexts/VoiceAssistantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { MainStackParamList } from '@/navigation/MainStackNavigator';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { userService } from '@/services/UserService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { logger } from '@/utils/logger';
import { ProfileQuickStartModal, type ProfileQuickStartValues } from './ProfileQuickStartModal';

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.9)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  line: 'rgba(191, 231, 255, 0.18)',
  error: '#ff8a80',
  warning: '#ffd166',
} as const;

type RouteParams = {
  autoStart?: boolean;
  showBackButton?: boolean;
  voiceOnly?: boolean;
};

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
type VoiceNavigation = NativeStackNavigationProp<MainStackParamList, 'Ask'>;
type ProfilePromptStatus = 'checking' | 'ready' | 'completed';

function getProfilePromptStorageKey(userId?: string | null): string {
  return `${STORAGE_KEYS.appState.profilePromptCompletedAt}:${userId || 'local'}`;
}

function hasProfileDetails(data: {
  name?: string;
  occupation?: string;
  company?: string;
  country?: string;
}): boolean {
  return Boolean(
    data.name?.trim() &&
    data.occupation?.trim() &&
    data.company?.trim() &&
    /^[A-Za-z]{2}$/.test(data.country?.trim() ?? '')
  );
}

const WaveBar: React.FC<{ index: number; active: boolean }> = ({ index, active }) => {
  const pulse = useSharedValue(0.35);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, {
          duration: 720 + index * 95,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
      return;
    }

    pulse.value = withTiming(0.35, { duration: 260, easing: Easing.out(Easing.ease) });
  }, [active, index, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(pulse.value, [0, 1], [18 + index * 2, 52 - Math.abs(index - 3) * 5]),
    opacity: interpolate(pulse.value, [0, 1], [0.42, 1]),
  }));

  return <Animated.View style={[styles.waveBar, animatedStyle]} />;
};

const VoiceOrb: React.FC<{ state: AssistantState; onPress: () => void; disabled: boolean }> = ({
  state,
  onPress,
  disabled,
}) => {
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.42);
  const lift = useSharedValue(0);
  const active = state === 'listening' || state === 'processing' || state === 'speaking';

  useEffect(() => {
    if (active) {
      ringScale.value = withRepeat(
        withTiming(1.16, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      ringOpacity.value = withRepeat(
        withTiming(0.82, { duration: 1350, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      lift.value = withRepeat(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      return;
    }

    ringScale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.ease) });
    ringOpacity.value = withTiming(0.42, { duration: 320, easing: Easing.out(Easing.ease) });
    lift.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [active, lift, ringOpacity, ringScale]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  const iconName: keyof typeof Ionicons.glyphMap =
    state === 'speaking'
      ? 'volume-high'
      : state === 'processing'
        ? 'sparkles'
        : state === 'error'
          ? 'refresh'
          : state === 'listening'
            ? 'stop-circle'
            : 'mic';

  return (
    <Animated.View style={[styles.orbWrap, orbStyle]}>
      <Animated.View style={[styles.orbRingOuter, ringStyle]} />
      <Animated.View style={[styles.orbRingInner, ringStyle]} />
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        disabled={disabled}
        style={[styles.orbButton, state === 'error' && styles.orbButtonError]}
        accessibilityRole="button"
        accessibilityLabel="Ask Ryvro"
        accessibilityState={{ disabled, busy: state === 'processing' }}
        testID="voice-screen-orb-button"
      >
        <LinearGradient
          colors={
            state === 'error'
              ? [RYVRO_COLORS.panelStrong, RYVRO_COLORS.panelStrong]
              : [RYVRO_COLORS.cyan, RYVRO_COLORS.blue]
          }
          style={styles.orbGradient}
        >
          <Ionicons
            name={iconName}
            size={54}
            color={state === 'error' ? RYVRO_COLORS.error : RYVRO_COLORS.void}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const VoiceAssistantScreen: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const navigation = useNavigation<VoiceNavigation>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const autoStartedRef = useRef(false);
  const [profilePromptStatus, setProfilePromptStatus] = useState<ProfilePromptStatus>('checking');
  const routeParams = (route.params ?? {}) as RouteParams;
  const voiceOnly = routeParams.voiceOnly === true;
  const { user } = useAuth();
  const { data: onboardingData, hydrated: onboardingHydrated, updateDataAsync } = useOnboarding();
  const {
    state,
    messages,
    error,
    notice,
    hasPermission,
    isWakeWordEnabled,
    isWakeWordAvailable,
    isWakeWordListening,
    wakeWordPhrase,
    wakeWordWarning,
    startListening,
    stopListening,
    cancel,
    requestPermissions,
  } = useVoiceAssistant();
  const networkSnapshot = useNetworkStatus();
  const isOffline = networkSnapshot.status === 'offline';
  const isActive = state === 'listening' || state === 'processing' || state === 'speaking';
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages]
  );
  const hasAnswer = latestAssistantMessage !== null;
  const profilePromptKey = useMemo(
    () => getProfilePromptStorageKey(user?.uid ?? null),
    [user?.uid]
  );
  const canShowProfilePrompt =
    !routeParams.showBackButton &&
    !voiceOnly &&
    onboardingHydrated &&
    !hasProfileDetails(onboardingData);
  const showProfilePrompt = canShowProfilePrompt && profilePromptStatus === 'ready';

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (!routeParams.autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startListening();
  }, [routeParams.autoStart, startListening]);

  useEffect(() => {
    let isMounted = true;

    const checkProfilePrompt = async () => {
      if (!canShowProfilePrompt) {
        setProfilePromptStatus('completed');
        return;
      }

      setProfilePromptStatus('checking');
      try {
        const completedAt = await asyncStorageService.get<number>(profilePromptKey);
        if (!isMounted) return;
        setProfilePromptStatus(completedAt ? 'completed' : 'ready');
      } catch (error) {
        logger.warn('Could not read profile prompt state', {
          error: error instanceof Error ? error.message : String(error),
        });
        if (!isMounted) return;
        setProfilePromptStatus('ready');
      }
    };

    void checkProfilePrompt();

    return () => {
      isMounted = false;
    };
  }, [canShowProfilePrompt, profilePromptKey]);

  const completeProfilePrompt = useCallback(async () => {
    await asyncStorageService.set(profilePromptKey, Date.now());
    setProfilePromptStatus('completed');
  }, [profilePromptKey]);

  const handleProfileSave = useCallback(
    async (values: ProfileQuickStartValues) => {
      const nextData = {
        name: values.name,
        occupation: values.occupation,
        company: values.company,
        country: values.country,
      };

      await updateDataAsync(nextData);

      if (user?.uid) {
        await userService.createOrSyncUserProfile(
          user.uid,
          { ...onboardingData, ...nextData },
          user.email
        );
      }

      await completeProfilePrompt();
    },
    [completeProfilePrompt, onboardingData, updateDataAsync, user?.email, user?.uid]
  );

  const handleProfileDismiss = useCallback(async () => {
    await completeProfilePrompt();
  }, [completeProfilePrompt]);

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

  const stageTitle = useMemo(() => {
    switch (state) {
      case 'listening':
        return 'I’m listening.';
      case 'processing':
        return 'Checking your schedule.';
      case 'speaking':
        return 'Ryvro is answering.';
      case 'error':
        return 'Let’s try again.';
      default:
        return messages.length > 0 ? 'Ask another question.' : 'Ask about your shift.';
    }
  }, [messages.length, state]);

  const stageSubtitle = useMemo(() => {
    if (notice) return notice.message;
    switch (state) {
      case 'listening':
        return 'Say it in your own words.';
      case 'processing':
        return 'This only takes a moment.';
      case 'speaking':
        return 'Tap the mic if you want Ryvro to stop.';
      case 'error':
        return getErrorMessage();
      default:
        if (!hasPermission) return 'Turn on the microphone so Ryvro can hear you.';
        if (isWakeWordEnabled && isWakeWordListening)
          return `Say "${wakeWordPhrase}" or tap the mic.`;
        return voiceOnly
          ? 'Tap the big mic and ask by voice.'
          : 'Tap the big mic and ask by voice.';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasPermission,
    isWakeWordEnabled,
    isWakeWordListening,
    notice,
    state,
    voiceOnly,
    wakeWordPhrase,
  ]);

  const handleMicPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (state === 'listening') {
      await stopListening();
    } else if (state === 'speaking') {
      await cancel();
    } else if (state === 'idle' || state === 'error') {
      await startListening();
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const openSettings = () => {
    navigation.navigate('Settings');
  };

  const conversationPanel = (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.conversationArea, hasAnswer && styles.conversationAreaWithAnswer]}
      contentContainerStyle={styles.conversationContent}
      showsVerticalScrollIndicator={false}
      accessibilityRole="text"
      accessibilityLabel="Ryvro voice answer"
    >
      <Animated.View entering={FadeIn.delay(160).duration(360)} style={styles.voiceOnlyPanel}>
        {latestAssistantMessage ? (
          <>
            <View style={styles.answerBadge}>
              <Ionicons name="checkmark-circle" size={20} color={RYVRO_COLORS.cyan} />
              <Text style={styles.answerBadgeText}>Ryvro answer</Text>
            </View>
            <Text style={styles.answerText}>{latestAssistantMessage.text}</Text>
          </>
        ) : (
          <>
            <View style={styles.answerBadge}>
              <Ionicons name="mic" size={20} color={RYVRO_COLORS.cyan} />
              <Text style={styles.answerBadgeText}>Try asking</Text>
            </View>
            <View style={styles.promptList}>
              {[
                'What shift am I on today?',
                'Am I working next Saturday?',
                'When is my next day off?',
                'What shift do I have next week?',
              ].map((prompt) => (
                <View key={prompt} style={styles.promptRow}>
                  <Ionicons name="mic" size={16} color={RYVRO_COLORS.cyan} />
                  <Text style={styles.promptText}>{prompt}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Animated.View>

      {!hasPermission && state === 'idle' && messages.length === 0 ? (
        <View style={styles.permissionPanel}>
          <Ionicons name="mic-off-outline" size={30} color={RYVRO_COLORS.warning} />
          <Text style={styles.permissionText}>Ryvro needs microphone access to hear you.</Text>
          <TouchableOpacity
            onPress={requestPermissions}
            style={styles.permissionButton}
            accessibilityRole="button"
            accessibilityLabel="Grant microphone permission"
          >
            <Text style={styles.permissionButtonText}>Turn on microphone</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isOffline ? (
        <Text style={styles.helperText}>
          Offline answers are limited to simple questions saved on this device.
        </Text>
      ) : null}

      {state === 'idle' && isWakeWordEnabled && !isWakeWordAvailable && wakeWordWarning ? (
        <Text style={styles.helperText}>{wakeWordWarning}</Text>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={styles.container} testID="voice-assistant-screen">
      <LinearGradient
        colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 18, 42),
            paddingBottom: Math.max(insets.bottom + 18, 30),
          },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(420)} style={styles.header}>
          {routeParams.showBackButton ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={RYVRO_COLORS.silver} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}

          <View style={styles.headerTitleWrap}>
            <Text style={styles.brandTitle}>Ryvro</Text>
            <Text style={styles.brandSubtitle}>Voice shift assistant</Text>
          </View>

          {routeParams.showBackButton ? (
            <View style={styles.headerSpacer} />
          ) : (
            <TouchableOpacity
              onPress={openSettings}
              style={styles.headerIconButton}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              testID="ask-settings-button"
            >
              <Ionicons name="settings-outline" size={22} color={RYVRO_COLORS.silver} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {hasAnswer ? conversationPanel : null}

        <Animated.View
          entering={FadeInUp.delay(80).duration(460)}
          style={[styles.stage, hasAnswer && styles.stageAfterAnswer]}
        >
          {hasAnswer ? null : (
            <VoiceOrb state={state} onPress={handleMicPress} disabled={state === 'processing'} />
          )}

          {hasAnswer ? null : (
            <View style={styles.waveRow} accessibilityElementsHidden>
              {Array.from({ length: 7 }).map((_, index) => (
                <WaveBar key={index} index={index} active={isActive} />
              ))}
            </View>
          )}

          <Text style={[styles.stageTitle, state === 'error' && styles.stageTitleError]}>
            {stageTitle}
          </Text>
          <Text style={styles.stageSubtitle}>{stageSubtitle}</Text>

          {hasAnswer ? (
            <View style={styles.orbAfterAnswer} accessibilityElementsHidden={false}>
              <VoiceOrb state={state} onPress={handleMicPress} disabled={state === 'processing'} />
              <View style={styles.waveRowAfterAnswer} accessibilityElementsHidden>
                {Array.from({ length: 7 }).map((_, index) => (
                  <WaveBar key={index} index={index} active={isActive} />
                ))}
              </View>
            </View>
          ) : null}
        </Animated.View>

        {hasAnswer ? null : conversationPanel}
      </View>

      <ProfileQuickStartModal
        visible={showProfilePrompt}
        initialData={onboardingData}
        onSave={handleProfileSave}
        onDismiss={handleProfileDismiss}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RYVRO_COLORS.void,
  },
  cyanGlow: {
    position: 'absolute',
    top: -110,
    left: -120,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: 'rgba(32, 244, 220, 0.17)',
  },
  blueGlow: {
    position: 'absolute',
    right: -180,
    top: 160,
    width: 390,
    height: 390,
    borderRadius: 195,
    backgroundColor: 'rgba(20, 124, 255, 0.16)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(214, 231, 242, 0.08)',
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  headerIconDisabled: {
    opacity: 0.35,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  brandTitle: {
    color: RYVRO_COLORS.silver,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
  },
  brandSubtitle: {
    marginTop: 2,
    color: RYVRO_COLORS.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  stage: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 18,
  },
  stageAfterAnswer: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  orbAfterAnswer: {
    marginTop: 18,
    alignItems: 'center',
  },
  waveRowAfterAnswer: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  orbWrap: {
    width: 178,
    height: 178,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRingOuter: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: 'rgba(32, 244, 220, 0.34)',
    backgroundColor: 'rgba(32, 244, 220, 0.05)',
  },
  orbRingInner: {
    position: 'absolute',
    width: 134,
    height: 134,
    borderRadius: 67,
    borderWidth: 1,
    borderColor: 'rgba(20, 124, 255, 0.34)',
  },
  orbButton: {
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: 'hidden',
    shadowColor: RYVRO_COLORS.cyan,
    shadowOpacity: 0.36,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  orbButtonError: {
    shadowColor: RYVRO_COLORS.error,
  },
  orbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 58,
  },
  waveRow: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  waveBar: {
    width: 8,
    borderRadius: 999,
    backgroundColor: RYVRO_COLORS.blue,
  },
  stageTitle: {
    marginTop: 6,
    color: RYVRO_COLORS.silver,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
    textAlign: 'center',
  },
  stageTitleError: {
    color: RYVRO_COLORS.error,
  },
  stageSubtitle: {
    marginTop: 10,
    color: RYVRO_COLORS.muted,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  conversationArea: {
    flex: 1,
  },
  conversationAreaWithAnswer: {
    flex: 0,
    marginTop: 18,
  },
  conversationContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  voiceOnlyPanel: {
    marginTop: 6,
    padding: 20,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  answerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  answerBadgeText: {
    color: RYVRO_COLORS.cyan,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  answerText: {
    marginTop: 16,
    color: RYVRO_COLORS.silver,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  promptList: {
    marginTop: 18,
    gap: 10,
  },
  promptRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(13, 34, 48, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.12)',
  },
  promptText: {
    flex: 1,
    color: RYVRO_COLORS.silver,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  permissionPanel: {
    marginTop: 14,
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
  },
  permissionText: {
    marginTop: 10,
    color: RYVRO_COLORS.muted,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: RYVRO_COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: RYVRO_COLORS.silver,
    fontSize: 15,
    fontWeight: '900',
  },
  helperText: {
    marginTop: 12,
    color: RYVRO_COLORS.warning,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontWeight: '700',
  },
});
