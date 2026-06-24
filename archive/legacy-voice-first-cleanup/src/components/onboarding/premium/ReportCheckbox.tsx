/**
 * ReportCheckbox Component
 *
 * Interactive report selection checkbox using stone and gold theme
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { theme } from '@/utils/theme';
import { triggerImpactHaptic } from '@/utils/hapticsDiagnostics';

export type ReportType = 'shift-summary' | 'earnings' | 'work-life' | 'holiday-impact';

export interface ReportMetadata {
  type: ReportType;
  title: string;
  description: string;
  badgeCount?: number;
}

export interface ReportCheckboxProps {
  /** Report metadata */
  report: ReportMetadata;
  /** Checked state */
  checked?: boolean;
  /** Change handler */
  onChange?: (checked: boolean, report: ReportMetadata) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID */
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const ReportCheckbox: React.FC<ReportCheckboxProps> = ({
  report,
  checked = false,
  onChange,
  disabled = false,
  accessibilityLabel,
  testID,
}) => {
  const { t } = useTranslation('onboarding');
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(checked ? 1 : 0);

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      void triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light, {
        source: `ReportCheckbox.pressIn:${report.type}`,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const handlePress = () => {
    if (!disabled && onChange) {
      const newChecked = !checked;
      checkScale.value = withSpring(newChecked ? 1 : 0, { damping: 15, stiffness: 300 });
      void triggerImpactHaptic(
        newChecked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        {
          source: `ReportCheckbox.press:${report.type}`,
        }
      );
      onChange(newChecked, report);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: withTiming(checked ? 1 : 0, { duration: 200 }),
  }));

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[
        animatedStyle,
        styles.container,
        checked && styles.checkedContainer,
        disabled && styles.disabledContainer,
      ]}
      accessibilityRole="checkbox"
      accessibilityLabel={
        accessibilityLabel ||
        t('reportOptions.accessibility.label', {
          title: report.title,
          status: checked
            ? t('reportOptions.accessibility.checked', { defaultValue: 'checked' })
            : t('reportOptions.accessibility.unchecked', { defaultValue: 'unchecked' }),
          defaultValue: '{{title}}, {{status}}',
        })
      }
      accessibilityState={{ checked, disabled }}
      testID={testID}
    >
      {checked && <View style={styles.goldGlow} />}

      {/* Checkbox */}
      <View style={styles.checkboxContainer}>
        {checked ? (
          <LinearGradient
            colors={[theme.colors.sacredGold, theme.colors.brightGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkbox}
          >
            <Animated.Text style={[styles.checkmark, checkmarkStyle]}>✓</Animated.Text>
          </LinearGradient>
        ) : (
          <View style={[styles.checkbox, styles.uncheckedCheckbox]} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.title, checked && styles.checkedTitle]}>
          {report.title}
        </Animated.Text>
        <Animated.Text style={styles.description}>{report.description}</Animated.Text>
      </View>

      {/* Badge */}
      {report.badgeCount !== undefined && report.badgeCount > 0 && (
        <View style={styles.badge}>
          <Animated.Text style={styles.badgeText}>{report.badgeCount}</Animated.Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 80,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    padding: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  checkedContainer: {
    borderColor: theme.colors.sacredGold,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.sacredGold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  disabledContainer: {
    opacity: 0.5,
  },
  goldGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.sacredGold,
    opacity: 0.05,
    borderRadius: theme.borderRadius.md,
  },
  checkboxContainer: {
    marginRight: theme.spacing.md,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedCheckbox: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.shadow,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
  content: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
    marginBottom: 4,
  },
  checkedTitle: {
    color: theme.colors.sacredGold,
  },
  description: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: theme.colors.sacredGold,
    borderRadius: theme.borderRadius.full,
    minWidth: 28,
    height: 28,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.paper,
  },
});

/**
 * Helper function to create report metadata
 */
export const createReportMetadata = (type: ReportType, badgeCount?: number): ReportMetadata => {
  const reportConfig: Record<ReportType, { title: string; description: string }> = {
    'shift-summary': {
      title: String(
        i18n.t('reportOptions.shiftSummary.title', {
          ns: 'onboarding',
          defaultValue: 'Shift Summary',
        })
      ),
      description: String(
        i18n.t('reportOptions.shiftSummary.description', {
          ns: 'onboarding',
          defaultValue: 'View count of shifts by type',
        })
      ),
    },
    earnings: {
      title: String(
        i18n.t('reportOptions.earnings.title', {
          ns: 'onboarding',
          defaultValue: 'Earnings Report',
        })
      ),
      description: String(
        i18n.t('reportOptions.earnings.description', {
          ns: 'onboarding',
          defaultValue: 'Calculate total pay and breakdown',
        })
      ),
    },
    'work-life': {
      title: String(
        i18n.t('reportOptions.workLife.title', {
          ns: 'onboarding',
          defaultValue: 'Work-Life Balance',
        })
      ),
      description: String(
        i18n.t('reportOptions.workLife.description', {
          ns: 'onboarding',
          defaultValue: 'Analyze off days and work percentage',
        })
      ),
    },
    'holiday-impact': {
      title: String(
        i18n.t('reportOptions.holidayImpact.title', {
          ns: 'onboarding',
          defaultValue: 'Holiday Impact',
        })
      ),
      description: String(
        i18n.t('reportOptions.holidayImpact.description', {
          ns: 'onboarding',
          defaultValue: 'See holidays falling on shift days',
        })
      ),
    },
  };

  return {
    type,
    ...reportConfig[type],
    badgeCount,
  };
};
