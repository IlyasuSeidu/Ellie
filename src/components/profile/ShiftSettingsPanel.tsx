import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import config from '@/config/env';
import type { UniversalShiftDefinition } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { MainStackParamList } from '@/navigation/MainStackNavigator';
import { useShiftAccent } from '@/hooks/useShiftAccent';
import { useSubscription } from '@/hooks/useSubscription';
import { IS_E2E_TEST_MODE } from '@/utils/e2e';
import { getContrastTextColor, hexToRGBA } from '@/utils/styleUtils';
import { formatShiftTime } from '@/utils/profileUtils';
import { calculateUniversalShiftDay, getUniversalScheduleStats } from '@/utils/universalShiftUtils';
import { formatLocalizedDate } from '@/utils/i18nFormat';
import i18n from '@/i18n';

function clampColorByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function darkenHex(hex: string, factor = 0.68): string {
  const normalized = /^#[0-9A-F]{6}$/i.test(hex) ? hex.slice(1) : null;
  if (!normalized) return '#44403c';

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return `#${clampColorByte(r * factor)
    .toString(16)
    .padStart(2, '0')}${clampColorByte(g * factor)
    .toString(16)
    .padStart(2, '0')}${clampColorByte(b * factor)
    .toString(16)
    .padStart(2, '0')}`;
}

function formatDateValue(date?: string): string {
  if (!date) return 'Not set';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Not set';
  return formatLocalizedDate(
    parsed,
    { day: 'numeric', month: 'short', year: 'numeric' },
    i18n.resolvedLanguage ?? i18n.language
  );
}

function formatDefinitionMeta(definition: UniversalShiftDefinition): string {
  if (definition.timePolicy === 'all_day') return 'All day';
  if (definition.timePolicy === 'none') return definition.kind.replace('_', ' ');
  if (definition.startTime && definition.endTime) {
    return `${formatShiftTime(definition.startTime)} - ${formatShiftTime(definition.endTime)}${
      definition.crossesMidnight ? ' +1' : ''
    }`;
  }
  return definition.kind.replace('_', ' ');
}

export interface ShiftSettingsPanelProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void | Promise<void>;
  animationDelay?: number;
}

export const ShiftSettingsPanel: React.FC<ShiftSettingsPanelProps> = ({
  data,
  animationDelay = 0,
}) => {
  const { t } = useTranslation('profile');
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { tabAccentColor } = useShiftAccent();
  const { isPro, isLoading: subscriptionLoading, openPaywall } = useSubscription();
  const schedule = data.universalSchedule;
  const currentShift = useMemo(() => {
    if (!schedule) return null;
    return calculateUniversalShiftDay(new Date(), schedule).universal ?? null;
  }, [schedule]);
  const stats = useMemo(() => (schedule ? getUniversalScheduleStats(schedule) : null), [schedule]);
  const accentColor = currentShift?.color ?? tabAccentColor;
  const headerGradient = [accentColor, darkenHex(accentColor)] as const;
  const iconColor = getContrastTextColor(accentColor, theme.colors.paper, theme.colors.deepVoid);
  const canOpenUniversalBuilder = isPro || IS_E2E_TEST_MODE;

  const handleOpenUniversalBuilder = useCallback(() => {
    if (subscriptionLoading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canOpenUniversalBuilder) {
      openPaywall();
      return;
    }
    navigation.navigate('UniversalShiftBuilder', {
      mode: schedule ? 'edit' : 'create',
      entryPoint: 'settings',
      existingSchedule: schedule,
    });
  }, [canOpenUniversalBuilder, navigation, openPaywall, schedule, subscriptionLoading]);

  return (
    <Animated.View entering={FadeInUp.delay(animationDelay).duration(350)} style={styles.wrapper}>
      <LinearGradient colors={[...headerGradient]} style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            name={
              currentShift
                ? (currentShift.icon as keyof typeof Ionicons.glyphMap)
                : 'calendar-outline'
            }
            size={20}
            color={iconColor}
          />
        </View>
        <View style={styles.headerCopy}>
          <Animated.Text style={styles.headerTitle}>{t('shift.header')}</Animated.Text>
          <Animated.Text style={styles.headerSubtitle} numberOfLines={1}>
            {schedule ? 'Universal schedule active' : 'No schedule configured'}
          </Animated.Text>
        </View>
        {config.features.universalShiftBuilderEnabled && (
          <TouchableOpacity
            style={styles.headerEditButton}
            onPress={handleOpenUniversalBuilder}
            disabled={subscriptionLoading}
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={schedule ? 'Open schedule builder' : 'Create schedule'}
            testID="shift-settings-builder-button"
          >
            <Ionicons
              name={schedule ? 'create-outline' : 'build-outline'}
              size={18}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.card}>
        {schedule && stats ? (
          <>
            <View style={styles.summaryTop}>
              <View style={[styles.summaryIcon, { backgroundColor: hexToRGBA(accentColor, 0.14) }]}>
                <Ionicons name="construct" size={18} color={accentColor} />
              </View>
              <View style={styles.summaryCopy}>
                <Animated.Text style={styles.summaryTitle}>{schedule.name}</Animated.Text>
                <Animated.Text style={styles.summarySubtitle}>
                  {stats.totalDays}-day cycle · {stats.avgWorkDaysPerWeek.toFixed(1)} work days/week
                </Animated.Text>
              </View>
            </View>

            <View style={styles.rows}>
              <ReadRow
                icon="calendar-outline"
                iconColor={accentColor}
                label="Anchor"
                value={formatDateValue(schedule.anchorDate)}
              />
              <Divider />
              <ReadRow
                icon="repeat-outline"
                iconColor={accentColor}
                label="Cycle"
                value={`${stats.workDays} work · ${stats.offDays} off · ${stats.nightShifts} night`}
              />
              <Divider />
              <View style={styles.definitionList}>
                {schedule.shiftDefinitions.slice(0, 5).map((definition) => (
                  <View key={definition.id} style={styles.definitionRow}>
                    <View
                      style={[
                        styles.definitionIcon,
                        { backgroundColor: hexToRGBA(definition.color, 0.16) },
                      ]}
                    >
                      <Ionicons
                        name={definition.icon as keyof typeof Ionicons.glyphMap}
                        size={15}
                        color={definition.color}
                      />
                    </View>
                    <View style={styles.definitionCopy}>
                      <Animated.Text style={styles.definitionName} numberOfLines={1}>
                        {definition.name}
                      </Animated.Text>
                      <Animated.Text style={styles.definitionMeta} numberOfLines={1}>
                        {formatDefinitionMeta(definition)}
                      </Animated.Text>
                    </View>
                    <Animated.Text style={styles.definitionCount}>
                      x{stats.definitionCounts[definition.name] ?? 0}
                    </Animated.Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={22} color={theme.colors.dust} />
            <Animated.Text style={styles.emptyTitle}>No shift schedule yet</Animated.Text>
            <Animated.Text style={styles.emptyBody}>
              Create one universal schedule for calendar colors, icons, reminders, and AI help.
            </Animated.Text>
          </View>
        )}

        {config.features.universalShiftBuilderEnabled && (
          <TouchableOpacity
            style={[
              styles.builderButton,
              {
                borderColor: hexToRGBA(accentColor, 0.36),
                backgroundColor: hexToRGBA(accentColor, 0.1),
              },
              subscriptionLoading && styles.builderButtonDisabled,
            ]}
            onPress={handleOpenUniversalBuilder}
            disabled={subscriptionLoading}
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={schedule ? 'Edit Universal Schedule' : 'Build Universal Schedule'}
            testID="shift-settings-builder-card-button"
          >
            <View style={styles.builderButtonLeft}>
              <Ionicons
                name={schedule ? 'create-outline' : 'build-outline'}
                size={18}
                color={accentColor}
              />
              <View>
                <Animated.Text style={[styles.builderButtonTitle, { color: accentColor }]}>
                  {schedule ? 'Edit Universal Schedule' : 'Build Universal Schedule'}
                </Animated.Text>
                <Animated.Text style={styles.builderButtonSubtitle}>
                  {canOpenUniversalBuilder
                    ? 'Names, colors, icons, AI drafting, and manual drag-and-drop'
                    : 'Included with Pro'}
                </Animated.Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={accentColor} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const ReadRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}> = ({ icon, iconColor, label, value }) => (
  <View style={styles.readRow}>
    <View style={styles.readRowLeft}>
      <View style={[styles.readRowIcon, { backgroundColor: hexToRGBA(iconColor, 0.14) }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Animated.Text style={styles.readRowLabel}>{label}</Animated.Text>
    </View>
    <Animated.Text style={styles.readRowValue} numberOfLines={2}>
      {value}
    </Animated.Text>
  </View>
);

const Divider: React.FC = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  header: {
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerCopy: {
    flex: 1,
  },
  headerEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.paper,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
  },
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.softStone,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: {
    flex: 1,
  },
  summaryTitle: {
    color: theme.colors.paper,
    fontSize: 17,
    fontWeight: '800',
  },
  summarySubtitle: {
    marginTop: 3,
    color: theme.colors.dust,
    fontSize: 12,
    lineHeight: 17,
  },
  rows: {
    marginTop: theme.spacing.lg,
  },
  readRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  readRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readRowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readRowLabel: {
    color: theme.colors.dust,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  readRowValue: {
    flex: 1,
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  definitionList: {
    gap: theme.spacing.sm,
  },
  definitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  definitionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  definitionCopy: {
    flex: 1,
  },
  definitionName: {
    color: theme.colors.paper,
    fontSize: 13,
    fontWeight: '800',
  },
  definitionMeta: {
    marginTop: 1,
    color: theme.colors.dust,
    fontSize: 11,
  },
  definitionCount: {
    color: theme.colors.dust,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
    color: theme.colors.paper,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBody: {
    marginTop: theme.spacing.xs,
    color: theme.colors.dust,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },
  builderButton: {
    marginTop: theme.spacing.lg,
    minHeight: 62,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  builderButtonDisabled: {
    opacity: 0.58,
  },
  builderButtonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  builderButtonTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  builderButtonSubtitle: {
    marginTop: 2,
    color: theme.colors.dust,
    fontSize: 11,
    lineHeight: 15,
  },
});
