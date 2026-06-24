/**
 * AiDraftReviewSheet
 *
 * Bottom sheet displayed after AI returns a draft schedule. Shows confidence,
 * summary, assumptions, questions, warnings, a chip preview of the sequence,
 * and CTAs to accept, edit manually, discard, or ask a follow-up.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';
import type { ShiftScheduleParserResult } from '@/services/ShiftScheduleParserService';
import type { UniversalShiftSchedule } from '@/types';

export interface AiDraftReviewSheetProps {
  visible: boolean;
  result: ShiftScheduleParserResult | null;
  onAccept: (draft: UniversalShiftSchedule) => void;
  onEditManually: () => void;
  onDiscard: () => void;
  onFollowUp: (prompt: string) => void;
  isFollowUpLoading: boolean;
}

type ConfidenceKey = 'high' | 'medium' | 'low';

function confidenceLabel(c: number): { text: ConfidenceKey; color: string } {
  if (c >= 0.8) return { text: 'high', color: theme.colors.success };
  if (c >= 0.5) return { text: 'medium', color: theme.colors.warning };
  return { text: 'low', color: theme.colors.error };
}

export const AiDraftReviewSheet: React.FC<AiDraftReviewSheetProps> = ({
  visible,
  result,
  onAccept,
  onEditManually,
  onDiscard,
  onFollowUp,
  isFollowUpLoading,
}) => {
  const { t } = useTranslation('onboarding');
  const [followUpText, setFollowUpText] = useState('');

  const handleAccept = useCallback(() => {
    if (!result?.scheduleDraft) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept(result.scheduleDraft);
  }, [result, onAccept]);

  const handleEditManually = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEditManually();
  }, [onEditManually]);

  const handleDiscard = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDiscard();
  }, [onDiscard]);

  const handleFollowUp = useCallback(() => {
    if (!followUpText.trim() || isFollowUpLoading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFollowUp(followUpText.trim());
    setFollowUpText('');
  }, [followUpText, isFollowUpLoading, onFollowUp]);

  if (!result) return null;

  const confidence = confidenceLabel(result.confidence);
  const draft = result.scheduleDraft;
  const hasDraft = !!draft;
  const needsClarification = result.status === 'needs_clarification';
  const defMap = draft ? new Map(draft.shiftDefinitions.map((d) => [d.id, d])) : new Map();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDiscard}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.aiIconBadge}>
                  <Ionicons name="sparkles" size={18} color="#20f4dc" />
                </View>
                <Text style={styles.headerTitle}>{t('shiftBuilder.review.aiDraft')}</Text>
              </View>
              <View style={[styles.confidenceBadge, { borderColor: confidence.color }]}>
                <View style={[styles.confidenceDot, { backgroundColor: confidence.color }]} />
                <Text style={[styles.confidenceText, { color: confidence.color }]}>
                  {t(`shiftBuilder.review.confidence.${confidence.text}`)}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
              {/* Clarification prompt */}
              {needsClarification && result.questions.length > 0 && (
                <View style={styles.clarificationBanner}>
                  <Ionicons name="help-circle" size={18} color={theme.colors.warning} />
                  <Text style={styles.clarificationText}>
                    {t('shiftBuilder.review.clarificationBanner')}
                  </Text>
                </View>
              )}

              {/* Summary */}
              {result.summary ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t('shiftBuilder.review.summary')}</Text>
                  <Text style={styles.summaryText}>{result.summary}</Text>
                </View>
              ) : null}

              {/* Questions (needs_clarification) */}
              {needsClarification && result.questions.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.warning }]}>
                    {t('shiftBuilder.review.questionsForYou')}
                  </Text>
                  {result.questions.map((q, i) => (
                    <View key={i} style={styles.questionRow}>
                      <Ionicons name="help-circle-outline" size={14} color={theme.colors.warning} />
                      <Text style={styles.questionText}>{q}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Assumptions */}
              {result.assumptions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>{t('shiftBuilder.review.assumptions')}</Text>
                  {result.assumptions.map((a, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.warning }]}>
                    {t('shiftBuilder.review.headsUp')}
                  </Text>
                  {result.warnings.map((w, i) => (
                    <View key={i} style={styles.warningRow}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color={theme.colors.warning}
                      />
                      <Text style={styles.warningText}>{w}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Draft sequence chips */}
              {draft && draft.sequence.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {t('shiftBuilder.review.sequencePreview')}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                  >
                    {draft.sequence.map((item, i) => {
                      const def = defMap.get(item.shiftDefinitionId);
                      if (!def) return null;
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.chip,
                            { backgroundColor: def.color + '33', borderColor: def.color },
                          ]}
                          accessibilityLabel={t('shiftBuilder.review.dayA11y', {
                            day: i + 1,
                            name: def.name,
                          })}
                        >
                          <Ionicons
                            name={def.icon as keyof typeof Ionicons.glyphMap}
                            size={10}
                            color={def.color}
                          />
                        </View>
                      );
                    })}
                  </ScrollView>
                  <Text style={styles.chipLegend}>
                    {t('shiftBuilder.review.cycleLength', { count: draft.sequence.length })}
                  </Text>

                  {/* Chip legend */}
                  <View style={styles.defLegend}>
                    {draft.shiftDefinitions.map((def) => (
                      <View key={def.id} style={styles.defLegendItem}>
                        <View style={[styles.defLegendDot, { backgroundColor: def.color }]} />
                        <Text style={styles.defLegendText}>{def.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Follow-up input */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('shiftBuilder.review.followUpLabel')}</Text>
                <View style={styles.followUpRow}>
                  <TextInput
                    style={styles.followUpInput}
                    value={followUpText}
                    onChangeText={setFollowUpText}
                    placeholder={t('shiftBuilder.review.followUpPlaceholder')}
                    placeholderTextColor="#6f8798"
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleFollowUp}
                    editable={!isFollowUpLoading}
                    accessibilityLabel={t('shiftBuilder.review.followUpA11y')}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!followUpText.trim() || isFollowUpLoading) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleFollowUp}
                    disabled={!followUpText.trim() || isFollowUpLoading}
                    accessibilityLabel={t('shiftBuilder.review.sendFollowUpA11y')}
                    accessibilityRole="button"
                  >
                    {isFollowUpLoading ? (
                      <ActivityIndicator size="small" color="#02070b" />
                    ) : (
                      <Ionicons name="send" size={16} color="#02070b" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* CTAs */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryCta, !hasDraft && styles.primaryCtaDisabled]}
                onPress={handleAccept}
                disabled={!hasDraft}
                accessibilityLabel={t('shiftBuilder.review.useDraftA11y')}
                accessibilityRole="button"
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={hasDraft ? '#02070b' : '#6f8798'}
                />
                <Text style={[styles.primaryCtaText, !hasDraft && styles.primaryCtaTextDisabled]}>
                  {t('shiftBuilder.review.useDraft')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={handleEditManually}
                accessibilityLabel={t('shiftBuilder.review.editManuallyA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryCtaText}>{t('shiftBuilder.review.editManually')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discardLink}
                onPress={handleDiscard}
                accessibilityLabel={t('shiftBuilder.review.discardDraftA11y')}
                accessibilityRole="button"
              >
                <Text style={styles.discardText}>{t('shiftBuilder.review.discardDraft')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  kav: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.opacity.black60,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(8, 22, 31, 0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 231, 242, 0.14)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  aiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(32, 244, 220, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.medium,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
  },
  clarificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  clarificationText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.md,
  },
  sectionLabel: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  summaryText: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    lineHeight: 22,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  questionText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#9db2c2',
    marginTop: 7,
  },
  bulletText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
    lineHeight: 19,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  warningText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
    lineHeight: 19,
  },
  chipsScroll: {
    flexGrow: 0,
    marginBottom: theme.spacing.xs,
  },
  chip: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 3,
  },
  chipLegend: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.xs,
    marginBottom: theme.spacing.xs,
  },
  defLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  defLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  defLegendText: {
    color: '#9db2c2',
    fontSize: theme.typography.fontSizes.xs,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214, 231, 242, 0.12)',
    paddingLeft: theme.spacing.sm,
    overflow: 'hidden',
  },
  followUpInput: {
    flex: 1,
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.sm,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#20f4dc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
  },
  bottomSpacer: { height: theme.spacing.md },
  actions: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 231, 242, 0.14)',
    gap: theme.spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#20f4dc',
    borderRadius: 20,
    paddingVertical: theme.spacing.md,
  },
  primaryCtaDisabled: {
    backgroundColor: 'rgba(214, 231, 242, 0.14)',
  },
  primaryCtaText: {
    color: '#02070b',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  primaryCtaTextDisabled: {
    color: '#6f8798',
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(214, 231, 242, 0.12)',
    borderRadius: 18,
  },
  secondaryCtaText: {
    color: '#d6e7f2',
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  discardLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  discardText: {
    color: '#6f8798',
    fontSize: theme.typography.fontSizes.sm,
    textDecorationLine: 'underline',
  },
});
