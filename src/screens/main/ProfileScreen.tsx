/**
 * ProfileScreen
 *
 * Full profile screen with animated hero avatar, editable personal information,
 * shift configuration summary, and work overview statistics.
 * Uses the Sacred design system with Reanimated animations and haptic feedback.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { useProfileData } from '@/hooks/useProfileData';
import { useShiftAccent } from '@/hooks/useShiftAccent';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfileHeroSection } from '@/components/profile/ProfileHeroSection';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { ShiftSettingsPanel } from '@/components/profile/ShiftSettingsPanel';
import { WorkStatsSummary } from '@/components/profile/WorkStatsSummary';
import { LANGUAGE_NAMES, LanguageSelectorSheet } from '@/components/profile/LanguageSelectorSheet';
import { asyncStorageService } from '@/services/AsyncStorageService';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { useSubscription } from '@/hooks/useSubscription';
import { getSettingsErrorMessage } from '@/utils/settingsErrorMessage';

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const profile = useProfileData();
  const { language, setLanguage } = useLanguage();
  const { shiftType: liveShiftType, tabAccentColor } = useShiftAccent();
  const { isPro, openPaywall } = useSubscription();
  const { isEditing, cancelEditing } = profile;
  const [languageSheetVisible, setLanguageSheetVisible] = React.useState(false);
  const personalInfoHeaderGradient = useMemo<readonly [string, string]>(() => {
    switch (liveShiftType) {
      case 'day':
        return ['#2196F3', '#1565C0'] as const;
      case 'night':
        return ['#7C4DFF', '#4A148C'] as const;
      case 'morning':
        return ['#F59E0B', '#D97706'] as const;
      case 'afternoon':
        return ['#06B6D4', '#0E7490'] as const;
      case 'off':
      default:
        return ['#57534e', '#44403c'] as const;
    }
  }, [liveShiftType]);

  useEffect(() => {
    if (!isFocused && isEditing) {
      cancelEditing();
    }
  }, [isFocused, isEditing, cancelEditing]);

  const handleRunOnboardingAgain = useCallback(async () => {
    try {
      await asyncStorageService.set('onboarding:complete', false);

      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (rootNavigation && typeof rootNavigation.reset === 'function') {
        rootNavigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (error) {
      Alert.alert(
        tCommon('errors.titles.error', { defaultValue: 'Error' }),
        getSettingsErrorMessage(error, 'onboardingReset')
      );
    }
  }, [navigation, tCommon]);

  const handleOpenPatternOnboarding = useCallback(() => {
    const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (!rootNavigation) return;

    rootNavigation.navigate('Onboarding', {
      screen: 'ShiftPattern',
      params: {
        entryPoint: 'settings',
        returnToMainOnSelect: true,
      } satisfies OnboardingStackParamList['ShiftPattern'],
    });
  }, [navigation]);

  const handleOpenShiftTimeOnboarding = useCallback(
    (
      _seed: Partial<OnboardingData>,
      initialShiftType?: 'day' | 'night' | 'morning' | 'afternoon'
    ) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'ShiftTimeInput',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
          initialShiftType,
        } satisfies OnboardingStackParamList['ShiftTimeInput'],
      });
    },
    [navigation]
  );

  const handleOpenStartDateOnboarding = useCallback(
    (_seed: Partial<OnboardingData>) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'StartDate',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
        } satisfies OnboardingStackParamList['StartDate'],
      });
    },
    [navigation]
  );

  const handleOpenPhaseOnboarding = useCallback(
    (_seed: Partial<OnboardingData>) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'PhaseSelector',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
        } satisfies OnboardingStackParamList['PhaseSelector'],
      });
    },
    [navigation]
  );

  const handleOpenCustomPatternOnboarding = useCallback(
    (seed: Partial<OnboardingData>) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'CustomPattern',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
          settingsBaseline: {
            patternType: seed.patternType,
            customPattern: seed.customPattern,
            fifoConfig: seed.fifoConfig,
            rosterType: seed.rosterType,
            shiftSystem: seed.shiftSystem,
          },
        } satisfies OnboardingStackParamList['CustomPattern'],
      });
    },
    [navigation]
  );

  const handleOpenFIFOPhaseOnboarding = useCallback(
    (_seed: Partial<OnboardingData>) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'FIFOPhaseSelector',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
        } satisfies OnboardingStackParamList['FIFOPhaseSelector'],
      });
    },
    [navigation]
  );

  const handleOpenFIFOCustomPatternOnboarding = useCallback(
    (seed: Partial<OnboardingData>) => {
      const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
      if (!rootNavigation) return;

      rootNavigation.navigate('Onboarding', {
        screen: 'FIFOCustomPattern',
        params: {
          entryPoint: 'settings',
          returnToMainOnSelect: true,
          settingsBaseline: {
            patternType: seed.patternType,
            customPattern: seed.customPattern,
            fifoConfig: seed.fifoConfig,
            rosterType: seed.rosterType,
            shiftSystem: seed.shiftSystem,
          },
        } satisfies OnboardingStackParamList['FIFOCustomPattern'],
      });
    },
    [navigation]
  );

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.deepVoid, theme.colors.darkStone, theme.colors.deepVoid]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeroSection
          name={profile.data.name || ''}
          occupation={
            profile.isEditing
              ? (profile.editedFields.occupation ?? profile.data.occupation)
              : profile.data.occupation
          }
          company={
            profile.isEditing
              ? (profile.editedFields.company ?? profile.data.company)
              : profile.data.company
          }
          country={
            profile.isEditing
              ? (profile.editedFields.country ?? profile.data.country)
              : profile.data.country
          }
          avatarUri={profile.data.avatarUri}
          isEditing={profile.isEditing}
          onAvatarChange={profile.handleAvatarChange}
          onEditPress={profile.isEditing ? profile.saveChanges : profile.startEditing}
          animationDelay={0}
        />

        <ProfileSectionHeader
          title={t('sections.personalInfo')}
          icon="person-outline"
          iconColor={tabAccentColor}
          backgroundGradientColors={personalInfoHeaderGradient}
          animationDelay={500}
        />
        <ProfileEditForm
          name={
            profile.isEditing
              ? (profile.editedFields.name ?? profile.data.name ?? '')
              : (profile.data.name ?? '')
          }
          occupation={
            profile.isEditing
              ? (profile.editedFields.occupation ?? profile.data.occupation ?? '')
              : (profile.data.occupation ?? '')
          }
          company={
            profile.isEditing
              ? (profile.editedFields.company ?? profile.data.company ?? '')
              : (profile.data.company ?? '')
          }
          country={
            profile.isEditing
              ? (profile.editedFields.country ?? profile.data.country ?? '')
              : (profile.data.country ?? '')
          }
          iconColor={tabAccentColor}
          isEditing={profile.isEditing}
          onFieldChange={profile.updateField}
          onSave={profile.saveChanges}
          onCancel={profile.cancelEditing}
          animationDelay={600}
        />

        <ShiftSettingsPanel
          data={profile.data}
          onUpdate={profile.updateData}
          onOpenPatternOnboarding={handleOpenPatternOnboarding}
          onOpenStartDateOnboarding={handleOpenStartDateOnboarding}
          onOpenShiftTimeOnboarding={handleOpenShiftTimeOnboarding}
          onOpenPhaseOnboarding={handleOpenPhaseOnboarding}
          onOpenCustomPatternOnboarding={handleOpenCustomPatternOnboarding}
          onOpenFIFOPhaseOnboarding={handleOpenFIFOPhaseOnboarding}
          onOpenFIFOCustomPatternOnboarding={handleOpenFIFOCustomPatternOnboarding}
          animationDelay={800}
        />

        <ProfileSectionHeader
          title={t('sections.workOverview')}
          icon="stats-chart-outline"
          animationDelay={1100}
        />
        <WorkStatsSummary data={profile.data} animationDelay={1200} />

        {/* Ellie Pro subscription row */}
        <View style={styles.onboardingToolsSection}>
          <Pressable
            style={styles.onboardingButton}
            onPress={isPro ? undefined : openPaywall}
            disabled={isPro}
            accessibilityRole="button"
            accessibilityLabel={
              isPro
                ? tCommon('subscription.profile.rowActiveA11y')
                : tCommon('subscription.profile.rowUpgradeA11y')
            }
            testID="subscription-row"
          >
            <View style={styles.subscriptionRowContent}>
              <View>
                <Text style={styles.onboardingButtonText}>
                  {isPro
                    ? tCommon('subscription.profile.activeLabel')
                    : tCommon('subscription.profile.upgradeLabel')}
                </Text>
                <Text style={styles.onboardingButtonHint}>
                  {isPro
                    ? tCommon('subscription.profile.activeHint')
                    : tCommon('subscription.profile.upgradeHint')}
                </Text>
              </View>
              {!isPro && (
                <Ionicons name="chevron-forward" size={18} color={theme.colors.paleGold} />
              )}
            </View>
          </Pressable>
        </View>

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => setLanguageSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('language.label')}
        >
          <Ionicons name="language-outline" size={18} color={theme.colors.sacredGold} />
          <Text style={styles.languageLabel}>{t('language.label')}</Text>
          <Text style={styles.languageValue}>{LANGUAGE_NAMES[language] ?? language}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.dust} />
        </TouchableOpacity>

        {__DEV__ ? (
          <View style={styles.onboardingToolsSection}>
            <Pressable
              style={styles.onboardingButton}
              onPress={handleRunOnboardingAgain}
              accessibilityRole="button"
              accessibilityLabel={t('dev.runOnboardingA11y')}
              accessibilityHint={t('dev.runOnboardingA11yHint')}
              testID="run-onboarding-again-button"
            >
              <Text style={styles.onboardingButtonText}>{t('dev.runOnboardingAgain')}</Text>
              <Text style={styles.onboardingButtonHint}>{t('dev.runOnboardingHint')}</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.ScrollView>

      <LanguageSelectorSheet
        visible={languageSheetVisible}
        onClose={() => setLanguageSheetVisible(false)}
        currentLanguage={language}
        onSelect={setLanguage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.deepVoid,
  },
  scrollContent: {
    flexGrow: 1,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    backgroundColor: theme.colors.darkStone,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  languageLabel: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.dust,
  },
  languageValue: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.paper,
  },
  onboardingToolsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  onboardingButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  onboardingButtonText: {
    color: theme.colors.paper,
    fontSize: 16,
    fontWeight: '700',
  },
  onboardingButtonHint: {
    color: theme.colors.dust,
    fontSize: 13,
    marginTop: 4,
  },
  subscriptionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
