/**
 * BuilderValidationBanner
 *
 * Compact banner showing validation errors (red, blocks save) or warnings
 * (yellow, can be dismissed). Expandable to see the full list.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/utils/theme';

export interface BuilderValidationBannerProps {
  errors: string[];
  warnings: string[];
  onDismissWarnings: () => void;
}

export const BuilderValidationBanner: React.FC<BuilderValidationBannerProps> = ({
  errors,
  warnings,
  onDismissWarnings,
}) => {
  const [expanded, setExpanded] = useState(false);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const handleToggleExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((v) => !v);
  }, []);

  const handleDismissWarnings = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismissWarnings();
    setExpanded(false);
  }, [onDismissWarnings]);

  if (!hasErrors && !hasWarnings) return null;

  // Show errors first; if both present, errors take priority for color
  const mode: 'error' | 'warning' = hasErrors ? 'error' : 'warning';
  const count = hasErrors ? errors.length : warnings.length;
  const allItems = hasErrors ? errors : warnings;

  const bannerColor = mode === 'error' ? theme.colors.error : theme.colors.warning;
  const bannerBg = mode === 'error' ? theme.colors.errorBg : theme.colors.warningBg;
  const iconName = mode === 'error' ? 'alert-circle' : 'warning';
  const headline =
    mode === 'error'
      ? `Fix ${count} issue${count !== 1 ? 's' : ''} before saving`
      : `${count} warning${count !== 1 ? 's' : ''} — review before saving`;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.container, { backgroundColor: bannerBg, borderColor: bannerColor }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {/* Header row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={handleToggleExpand}
        accessibilityLabel={`${headline}. Tap to ${expanded ? 'collapse' : 'expand'} list.`}
        accessibilityRole="button"
      >
        <Ionicons name={iconName} size={16} color={bannerColor} />
        <Text style={[styles.headline, { color: bannerColor }]} numberOfLines={1}>
          {headline}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={bannerColor} />
      </TouchableOpacity>

      {/* Expanded list */}
      {expanded && (
        <View style={styles.list}>
          {allItems.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <View style={[styles.listBullet, { backgroundColor: bannerColor }]} />
              <Text style={[styles.listText, { color: bannerColor }]}>{item}</Text>
            </View>
          ))}

          {/* If there are both errors and warnings, show warnings too */}
          {hasErrors && hasWarnings && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.warningBg }]} />
              <Text style={styles.warningsHeader}>Warnings:</Text>
              {warnings.map((w, i) => (
                <View key={`w${i}`} style={styles.listRow}>
                  <View style={[styles.listBullet, { backgroundColor: theme.colors.warning }]} />
                  <Text style={[styles.listText, { color: theme.colors.warning }]}>{w}</Text>
                </View>
              ))}
            </>
          )}

          {/* Dismiss button (warnings only) */}
          {!hasErrors && hasWarnings && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismissWarnings}
              accessibilityLabel="Dismiss warnings"
              accessibilityRole="button"
            >
              <Text style={styles.dismissText}>Dismiss warnings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  headline: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  listBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
  },
  listText: {
    fontSize: theme.typography.fontSizes.sm,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.sm,
  },
  warningsHeader: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.sm,
    paddingVertical: 4,
  },
  dismissText: {
    color: theme.colors.warning,
    fontSize: theme.typography.fontSizes.sm,
    textDecorationLine: 'underline',
  },
});
