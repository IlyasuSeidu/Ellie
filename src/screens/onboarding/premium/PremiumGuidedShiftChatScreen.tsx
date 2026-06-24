/**
 * PremiumGuidedShiftChatScreen Component
 *
 * Conversational front door for universal shift setup. AI/parser output stays a
 * draft until the user confirms the exact repeating pattern.
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { PremiumButton } from '@/components/onboarding/premium';
import { Analytics } from '@/utils/analytics';
import {
  parseShiftScheduleDescription,
  ShiftScheduleParserError,
  type ShiftScheduleParserResult,
} from '@/services/ShiftScheduleParserService';
import type { UniversalShiftSchedule } from '@/types';

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'GuidedShiftChatSetup'>;

export interface PremiumGuidedShiftChatScreenProps {
  /** Navigation handler for tests */
  onContinue?: (scheduleDraft: UniversalShiftSchedule) => void;
  /** Changes copy and chrome when used after onboarding from Settings */
  flowContext?: 'onboarding' | 'settings';
  /** Test ID */
  testID?: string;
}

const RYVRO_COLORS = {
  void: '#02070b',
  ink: '#07121a',
  panel: 'rgba(8, 22, 31, 0.84)',
  panelStrong: 'rgba(13, 34, 48, 0.96)',
  cyan: '#20f4dc',
  teal: '#19bdb5',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  gold: '#20f4dc',
  line: 'rgba(191, 231, 255, 0.2)',
  error: '#ff6b6b',
} as const;

const DEFAULT_EXAMPLE = 'I work 2 days, 2 nights, then 4 off';
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function stripShiftSuffix(name: string): string {
  return name.replace(/\s+shift$/i, '').trim();
}

function getSequenceLabels(schedule: UniversalShiftSchedule): string[] {
  return schedule.sequence.map((item) => {
    const definition = schedule.shiftDefinitions.find((def) => def.id === item.shiftDefinitionId);
    return stripShiftSuffix(item.labelOverride || definition?.name || 'Shift');
  });
}

export const PremiumGuidedShiftChatScreen: React.FC<PremiumGuidedShiftChatScreenProps> = ({
  onContinue,
  flowContext = 'onboarding',
  testID = 'premium-guided-shift-chat-screen',
}) => {
  const { t, i18n } = useTranslation('onboarding');
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const mountTime = useRef(Date.now());

  const [prompt, setPrompt] = useState('');
  const [parserResult, setParserResult] = useState<ShiftScheduleParserResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);
  const orbitRotation = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    Analytics.onboardingStepViewed('guided_shift_chat', 3);

    contentOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    contentTranslateY.value = withSpring(0, { damping: 18, stiffness: 170 });
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cardFloat, contentOpacity, contentTranslateY, orbitRotation]);

  const sequenceLabels = useMemo(() => {
    return parserResult?.scheduleDraft ? getSequenceLabels(parserResult.scheduleDraft) : [];
  }, [parserResult]);

  const canSubmit = prompt.trim().length > 0 && !isParsing;
  const confirmedDraft = parserResult?.scheduleDraft;
  const isSettingsFlow = flowContext === 'settings';

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const orbitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const handleUseExample = () => {
    setPrompt(t('guidedShiftChat.example', { defaultValue: DEFAULT_EXAMPLE }));
    setParserResult(null);
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isParsing) return;

    setError(null);
    setParserResult(null);
    setIsParsing(true);

    try {
      Analytics.track('guided_shift_chat_prompt_submitted', {
        prompt_length: trimmed.length,
      });

      const result = await parseShiftScheduleDescription({
        prompt: trimmed,
        timezone: DEFAULT_TIMEZONE,
        locale: i18n.language || 'en',
        today: todayStr(),
      });

      if (result.status !== 'draft' || !result.scheduleDraft) {
        setError(
          result.questions[0] ||
            t('guidedShiftChat.fallbackError', {
              defaultValue:
                'Ryvro could not read that pattern yet. Try saying it like: I work 2 days, 2 nights, then 4 off.',
            })
        );
        Analytics.track('guided_shift_chat_parse_needs_change', {
          status: result.status,
          parser_source: result.parserSource,
          question_count: result.questions.length,
        });
        return;
      }

      setParserResult(result);
      Analytics.track('guided_shift_chat_draft_created', {
        confidence: result.confidence,
        parser_source: result.parserSource,
        fallback_reason: result.fallbackReason,
        sequence_length: result.scheduleDraft.sequence.length,
      });
    } catch (err) {
      const message =
        err instanceof ShiftScheduleParserError
          ? err.message
          : t('guidedShiftChat.fallbackError', {
              defaultValue:
                'Ryvro could not read that pattern yet. Try saying it like: I work 2 days, 2 nights, then 4 off.',
            });
      setError(message);
      Analytics.track('guided_shift_chat_parse_failed', {
        code: err instanceof ShiftScheduleParserError ? err.code : 'unknown',
        retryable: err instanceof ShiftScheduleParserError ? err.retryable : false,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleChangeDraft = () => {
    setParserResult(null);
    setError(null);
  };

  const handleConfirmDraft = () => {
    if (!confirmedDraft) return;

    Analytics.onboardingStepCompleted('guided_shift_chat', Date.now() - mountTime.current, {
      sequence_length: confirmedDraft.sequence.length,
      shift_definition_count: confirmedDraft.shiftDefinitions.length,
    });

    if (onContinue) {
      onContinue(confirmedDraft);
    } else {
      navigation.navigate('ShiftTimesSetup', {
        scheduleDraft: confirmedDraft,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID={testID}
    >
      <LinearGradient
        colors={[RYVRO_COLORS.ink, RYVRO_COLORS.void, '#000204']}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cyanGlow} />
      <View style={styles.blueGlow} />
      <View style={styles.goldGlow} />
      <Animated.View style={[styles.orbit, orbitAnimatedStyle]} pointerEvents="none" />

      <ScrollView
        testID={`${testID}-scroll-view`}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 22, 42),
            paddingBottom: Math.max(insets.bottom + 56, 74),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.topRow, contentAnimatedStyle]}>
          <View style={[styles.stepPill, isSettingsFlow && styles.repairPill]}>
            <View style={styles.stepDot} />
            <Text style={styles.stepLabel}>
              {isSettingsFlow
                ? 'Fix pattern'
                : t('guidedShiftChat.stepLabel', { defaultValue: 'Pattern chat' })}
            </Text>
          </View>
          <View style={styles.stepCount}>
            {isSettingsFlow ? (
              <Ionicons name="sparkles" size={18} color={RYVRO_COLORS.silver} />
            ) : (
              <Text style={styles.stepCountText}>3</Text>
            )}
          </View>
        </Animated.View>

        <Animated.View style={[styles.hero, contentAnimatedStyle]}>
          <Text style={styles.headline}>
            {isSettingsFlow
              ? 'Tell Ryvro the pattern again.'
              : t('guidedShiftChat.headline', { defaultValue: 'Tell Ryvro your pattern.' })}
          </Text>
          <Text style={styles.support}>
            {isSettingsFlow
              ? 'Use the simple words you say at work. Ryvro will check it before saving.'
              : t('guidedShiftChat.support', {
                  defaultValue: 'Example: 2 days, 2 nights, then 4 off.',
                })}
          </Text>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.cardEntry}>
            <Animated.View
              style={[styles.chatCard, cardAnimatedStyle]}
              testID={`${testID}-chat-card`}
            >
              {parserResult?.scheduleDraft ? (
                <View style={styles.userPatternBubble}>
                  <Text style={styles.userPatternLabel}>You said</Text>
                  <Text style={styles.userPatternText}>{prompt}</Text>
                </View>
              ) : (
                <View style={styles.inputPanel}>
                  <Text style={styles.inputLabel}>
                    {t('guidedShiftChat.inputLabel', { defaultValue: 'Your pattern' })}
                  </Text>
                  <TextInput
                    value={prompt}
                    onChangeText={(value) => {
                      setPrompt(value);
                      setParserResult(null);
                      setError(null);
                    }}
                    placeholder={t('guidedShiftChat.inputPlaceholder', {
                      defaultValue: 'I work 2 days, 2 nights, then 4 off',
                    })}
                    placeholderTextColor="rgba(157, 178, 194, 0.62)"
                    style={styles.input}
                    multiline
                    maxLength={320}
                    editable={!isParsing}
                    testID={`${testID}-input`}
                  />
                  <View style={styles.quickRow}>
                    <TouchableOpacity
                      onPress={handleUseExample}
                      style={styles.quickButton}
                      activeOpacity={0.86}
                      testID={`${testID}-example-button`}
                    >
                      <Ionicons name="sparkles" size={16} color={RYVRO_COLORS.gold} />
                      <Text style={styles.quickButtonText}>
                        {t('guidedShiftChat.useExample', { defaultValue: 'Use example' })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {error ? (
                <Animated.View entering={FadeInDown.duration(260)} style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={RYVRO_COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              {parserResult?.scheduleDraft ? (
                <Animated.View
                  entering={FadeInDown.duration(320)}
                  style={styles.reviewPanel}
                  testID={`${testID}-review-panel`}
                >
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewIcon}>
                      <Ionicons name="checkmark" size={18} color={RYVRO_COLORS.void} />
                    </View>
                    <View style={styles.reviewCopy}>
                      <Text style={styles.reviewTitle}>
                        {t('guidedShiftChat.reviewTitle', {
                          defaultValue: 'Did Ryvro get this right?',
                        })}
                      </Text>
                      <Text style={styles.reviewSubtitle}>
                        {t('guidedShiftChat.reviewSubtitle', {
                          defaultValue:
                            'This is only a draft. You must confirm it before Ryvro uses it.',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.sequenceLabel}>
                    {t('guidedShiftChat.sequenceLabel', { defaultValue: 'Exact order' })}
                  </Text>
                  <View style={styles.sequenceWrap}>
                    {sequenceLabels.map((label, index) => (
                      <View
                        key={`${label}-${index}`}
                        style={[
                          styles.sequenceChip,
                          label.toLowerCase().includes('off') && styles.sequenceChipOff,
                        ]}
                      >
                        <Text style={styles.sequenceChipText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.bottomPanel}>
          {confirmedDraft ? (
            <View style={styles.confirmActions}>
              <PremiumButton
                title={t('guidedShiftChat.yes', { defaultValue: 'Yes, this is right' })}
                onPress={handleConfirmDraft}
                variant="primary"
                size="large"
                primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
                icon={<Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />}
                iconPosition="right"
                style={styles.primaryCtaButton}
                contentStyle={styles.primaryCtaButtonContent}
                textStyle={styles.primaryCtaText}
                titleNumberOfLines={1}
                accessibilityHint={t('guidedShiftChat.continueHint', {
                  defaultValue: 'Continue with this draft schedule.',
                })}
                testID={`${testID}-confirm-button`}
              />
              <TouchableOpacity
                onPress={handleChangeDraft}
                style={styles.changeButton}
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityHint={t('guidedShiftChat.changeHint', {
                  defaultValue: 'Go back and edit the pattern.',
                })}
                testID={`${testID}-change-button`}
              >
                <Text style={styles.changeButtonText}>
                  {t('guidedShiftChat.change', { defaultValue: 'No, change it' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <PremiumButton
              title={
                isParsing
                  ? t('guidedShiftChat.loading', {
                      defaultValue: 'Ryvro is reading your pattern...',
                    })
                  : t('guidedShiftChat.submit', { defaultValue: 'Check my pattern' })
              }
              onPress={handleSubmit}
              disabled={!canSubmit}
              variant="primary"
              size="large"
              primaryGradientColors={[RYVRO_COLORS.cyan, RYVRO_COLORS.blue]}
              icon={
                isParsing ? (
                  <ActivityIndicator size="small" color={RYVRO_COLORS.void} />
                ) : (
                  <Ionicons name="arrow-forward-circle" size={28} color={RYVRO_COLORS.void} />
                )
              }
              iconPosition="right"
              style={styles.primaryCtaButton}
              contentStyle={styles.primaryCtaButtonContent}
              textStyle={styles.primaryCtaText}
              titleNumberOfLines={1}
              testID={`${testID}-submit-button`}
            />
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RYVRO_COLORS.void,
  },
  cyanGlow: {
    position: 'absolute',
    top: -96,
    left: -98,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(32, 244, 220, 0.16)',
  },
  blueGlow: {
    position: 'absolute',
    top: 116,
    right: -128,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(20, 124, 255, 0.15)',
  },
  goldGlow: {
    position: 'absolute',
    bottom: 20,
    left: -110,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(244, 184, 66, 0.11)',
  },
  orbit: {
    position: 'absolute',
    top: 180,
    alignSelf: 'center',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.12)',
    borderRightColor: 'rgba(244, 184, 66, 0.34)',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  repairPill: {
    backgroundColor: 'rgba(20, 124, 255, 0.12)',
    borderColor: 'rgba(32, 244, 220, 0.34)',
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RYVRO_COLORS.cyan,
  },
  stepLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  stepCount: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 184, 66, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 184, 66, 0.28)',
  },
  stepCountText: {
    color: RYVRO_COLORS.gold,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 24,
  },
  cardEntry: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  headline: {
    maxWidth: 350,
    color: '#f6fbff',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      },
    }),
  },
  support: {
    maxWidth: 334,
    marginTop: 14,
    color: RYVRO_COLORS.muted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
  },
  chatCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    marginTop: 28,
    padding: 18,
    borderRadius: 28,
    backgroundColor: RYVRO_COLORS.panel,
    borderWidth: 1,
    borderColor: RYVRO_COLORS.line,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.42,
        shadowRadius: 34,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  inputPanel: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(2, 7, 11, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.14)',
  },
  inputLabel: {
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  input: {
    minHeight: 112,
    marginTop: 8,
    color: RYVRO_COLORS.silver,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: 0,
    textAlignVertical: 'top',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(191, 231, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(191, 231, 255, 0.14)',
  },
  quickButtonText: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  userPatternBubble: {
    marginTop: 14,
    borderRadius: 22,
    padding: 14,
    backgroundColor: 'rgba(32, 244, 220, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  userPatternLabel: {
    color: RYVRO_COLORS.cyan,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  userPatternText: {
    marginTop: 4,
    color: RYVRO_COLORS.silver,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  errorBox: {
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.24)',
  },
  errorText: {
    flex: 1,
    color: '#ffd6d6',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  reviewPanel: {
    marginTop: 14,
    borderRadius: 24,
    padding: 15,
    backgroundColor: RYVRO_COLORS.panelStrong,
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.22)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  reviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RYVRO_COLORS.gold,
  },
  reviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  reviewTitle: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0,
  },
  reviewSubtitle: {
    marginTop: 4,
    color: RYVRO_COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  sequenceLabel: {
    marginTop: 14,
    color: RYVRO_COLORS.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sequenceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  sequenceChip: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 244, 220, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(32, 244, 220, 0.24)',
  },
  sequenceChipOff: {
    backgroundColor: 'rgba(244, 184, 66, 0.12)',
    borderColor: 'rgba(244, 184, 66, 0.24)',
  },
  sequenceChipText: {
    color: RYVRO_COLORS.silver,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bottomPanel: {
    paddingTop: 2,
  },
  confirmActions: {
    gap: 12,
  },
  primaryCtaButton: {
    width: '100%',
    height: 76,
  },
  primaryCtaButtonContent: {
    height: 76,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  primaryCtaText: {
    color: RYVRO_COLORS.void,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  changeButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButtonText: {
    color: RYVRO_COLORS.muted,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
