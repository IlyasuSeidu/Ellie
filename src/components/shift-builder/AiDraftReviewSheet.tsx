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

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.8) return { text: 'High confidence', color: theme.colors.success };
  if (c >= 0.5) return { text: 'Medium confidence', color: theme.colors.warning };
  return { text: 'Low confidence', color: theme.colors.error };
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
                  <Ionicons name="sparkles" size={18} color={theme.colors.sacredGold} />
                </View>
                <Text style={styles.headerTitle}>AI Draft</Text>
              </View>
              <View style={[styles.confidenceBadge, { borderColor: confidence.color }]}>
                <View style={[styles.confidenceDot, { backgroundColor: confidence.color }]} />
                <Text style={[styles.confidenceText, { color: confidence.color }]}>
                  {confidence.text}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
              {/* Clarification prompt */}
              {needsClarification && result.questions.length > 0 && (
                <View style={styles.clarificationBanner}>
                  <Ionicons name="help-circle" size={18} color={theme.colors.warning} />
                  <Text style={styles.clarificationText}>
                    I need a bit more info to build this accurately
                  </Text>
                </View>
              )}

              {/* Summary */}
              {result.summary ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>What I understood</Text>
                  <Text style={styles.summaryText}>{result.summary}</Text>
                </View>
              ) : null}

              {/* Questions (needs_clarification) */}
              {needsClarification && result.questions.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.warning }]}>
                    Questions for you
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
                  <Text style={styles.sectionLabel}>Assumptions</Text>
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
                    Heads up
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

              {/* Sequence preview chips */}
              {draft && draft.sequence.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Sequence preview</Text>
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
                          accessibilityLabel={`Day ${i + 1}: ${def.name}`}
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
                  <Text style={styles.chipLegend}>{draft.sequence.length}-day cycle</Text>

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
                <Text style={styles.sectionLabel}>Ask a follow-up</Text>
                <View style={styles.followUpRow}>
                  <TextInput
                    style={styles.followUpInput}
                    value={followUpText}
                    onChangeText={setFollowUpText}
                    placeholder="e.g. Make it 8-hour shifts instead"
                    placeholderTextColor={theme.colors.shadow}
                    multiline={false}
                    returnKeyType="send"
                    onSubmitEditing={handleFollowUp}
                    editable={!isFollowUpLoading}
                    accessibilityLabel="Follow-up question for AI"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!followUpText.trim() || isFollowUpLoading) && styles.sendButtonDisabled,
                    ]}
                    onPress={handleFollowUp}
                    disabled={!followUpText.trim() || isFollowUpLoading}
                    accessibilityLabel="Send follow-up"
                    accessibilityRole="button"
                  >
                    {isFollowUpLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.deepVoid} />
                    ) : (
                      <Ionicons name="send" size={16} color={theme.colors.deepVoid} />
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
                accessibilityLabel="Use this AI draft"
                accessibilityRole="button"
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={hasDraft ? theme.colors.deepVoid : theme.colors.shadow}
                />
                <Text style={[styles.primaryCtaText, !hasDraft && styles.primaryCtaTextDisabled]}>
                  Use this draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={handleEditManually}
                accessibilityLabel="Edit schedule manually instead"
                accessibilityRole="button"
              >
                <Text style={styles.secondaryCtaText}>Edit manually</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discardLink}
                onPress={handleDiscard}
                accessibilityLabel="Discard AI draft"
                accessibilityRole="button"
              >
                <Text style={styles.discardText}>Discard</Text>
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
    backgroundColor: theme.colors.darkStone,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.softStone,
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
    borderBottomColor: theme.colors.softStone,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  aiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.opacity.gold20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.paper,
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
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.xs,
  },
  summaryText: {
    color: theme.colors.paper,
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
    backgroundColor: theme.colors.dust,
    marginTop: 7,
  },
  bulletText: {
    color: theme.colors.dust,
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
    color: theme.colors.shadow,
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
    color: theme.colors.dust,
    fontSize: theme.typography.fontSizes.xs,
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
    paddingLeft: theme.spacing.sm,
    overflow: 'hidden',
  },
  followUpInput: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    paddingVertical: theme.spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.sacredGold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.softStone,
  },
  bottomSpacer: { height: theme.spacing.md },
  actions: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.softStone,
    gap: theme.spacing.sm,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
  },
  primaryCtaDisabled: {
    backgroundColor: theme.colors.softStone,
  },
  primaryCtaText: {
    color: theme.colors.deepVoid,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  primaryCtaTextDisabled: {
    color: theme.colors.shadow,
  },
  secondaryCta: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.softStone,
    borderRadius: theme.borderRadius.md,
  },
  secondaryCtaText: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  discardLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  discardText: {
    color: theme.colors.shadow,
    fontSize: theme.typography.fontSizes.sm,
    textDecorationLine: 'underline',
  },
});
