/**
 * ProfileScreen
 *
 * Full profile screen with animated hero avatar, editable personal information,
 * shift configuration summary, and work overview statistics.
 * Uses the Sacred design system with Reanimated animations and haptic feedback.
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '@/utils/theme';
import { hexToRGBA } from '@/utils/styleUtils';
import { useProfileData } from '@/hooks/useProfileData';
import { useShiftAccent } from '@/hooks/useShiftAccent';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfileHeroSection } from '@/components/profile/ProfileHeroSection';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { ShiftSettingsPanel } from '@/components/profile/ShiftSettingsPanel';
import { WorkStatsSummary } from '@/components/profile/WorkStatsSummary';
import { LANGUAGE_NAMES, LanguageSelectorSheet } from '@/components/profile/LanguageSelectorSheet';
import { SmartRemindersPanel } from '@/components/profile/SmartRemindersPanel';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useSubscription } from '@/hooks/useSubscription';
import { getSettingsErrorMessage } from '@/utils/settingsErrorMessage';
import { setPersistedOnboardingComplete } from '@/utils/onboardingPersistence';
import { legalConfig } from '@/config/env';

export const ProfileScreen: React.FC = () => {
  const { t } = useTranslation('profile');
  const { t: tCommon } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const profile = useProfileData();
  const { language, setLanguage } = useLanguage();
  const { shiftType: liveShiftType, tabAccentColor } = useShiftAccent();
  const {
    isPro,
    isLoading: subscriptionLoading,
    openPaywall,
    openCustomerCenter,
    canOpenCustomerCenter,
  } = useSubscription();
  const [languageSheetVisible, setLanguageSheetVisible] = React.useState(false);
  const profileAccentGradient = useMemo<readonly [string, string]>(() => {
    if (tabAccentColor && tabAccentColor !== theme.colors.paleGold) {
      return [tabAccentColor, hexToRGBA(tabAccentColor, 0.62)] as const;
    }

    return ['#57534e', '#44403c'] as const;
  }, [tabAccentColor]);

  const personalInfoHeaderGradient = useMemo<readonly [string, string]>(() => {
    if (profile.data.universalSchedule) {
      return profileAccentGradient;
    }

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
  }, [liveShiftType, profile.data.universalSchedule, profileAccentGradient]);

  const handleRunOnboardingAgain = useCallback(async () => {
    try {
      await setPersistedOnboardingComplete(false);

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

  const handleSubscriptionRowPress = useCallback(async () => {
    if (subscriptionLoading) {
      return;
    }

    if (!isPro) {
      openPaywall();
      return;
    }

    if (!canOpenCustomerCenter) {
      Alert.alert(
        tCommon('errors.titles.error', { defaultValue: 'Error' }),
        tCommon('subscription.paywall.unavailable', {
          defaultValue:
            'Subscriptions are unavailable in this app build. Install the latest EAS development/production build.',
        })
      );
      return;
    }

    const result = await openCustomerCenter();
    if (result === 'unavailable') {
      Alert.alert(
        tCommon('errors.titles.error', { defaultValue: 'Error' }),
        tCommon('subscription.paywall.unavailable', {
          defaultValue:
            'Subscriptions are unavailable in this app build. Install the latest EAS development/production build.',
        })
      );
      return;
    }

    if (result !== 'presented') {
      Alert.alert(
        tCommon('errors.titles.error', { defaultValue: 'Error' }),
        tCommon('subscription.profile.customerCenterError', {
          defaultValue: 'Subscription management is unavailable right now. Please try again.',
        })
      );
    }
  }, [canOpenCustomerCenter, isPro, openCustomerCenter, openPaywall, subscriptionLoading, tCommon]);

  const handleOpenUrl = useCallback((url: string) => {
    void Linking.openURL(url);
  }, []);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.deepVoid, theme.colors.darkStone, theme.colors.deepVoid]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        testID="profile-screen"
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
          isSaving={profile.isSaving}
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
          isSaving={profile.isSaving}
          onFieldChange={profile.updateField}
          onSave={profile.saveChanges}
          onCancel={profile.cancelEditing}
          animationDelay={600}
        />

        <ShiftSettingsPanel
          data={profile.data}
          onUpdate={profile.updateDataAsync}
          animationDelay={800}
        />

        <ProfileSectionHeader
          title={t('sections.workOverview')}
          icon="stats-chart-outline"
          iconColor={tabAccentColor}
          backgroundGradientColors={profileAccentGradient}
          animationDelay={1100}
        />
        <WorkStatsSummary data={profile.data} animationDelay={1200} accentColor={tabAccentColor} />

        <ProfileSectionHeader
          title={t('sections.smartReminders', { defaultValue: 'Smart Reminders' })}
          icon="notifications-outline"
          iconColor={tabAccentColor}
          backgroundGradientColors={profileAccentGradient}
          animationDelay={1300}
        />
        <SmartRemindersPanel animationDelay={1400} />

        <TouchableOpacity
          style={[styles.languageRow, styles.subscriptionRow]}
          onPress={() => {
            void handleSubscriptionRowPress();
          }}
          disabled={subscriptionLoading}
          accessibilityRole="button"
          accessibilityLabel={
            isPro
              ? tCommon('subscription.profile.rowActiveA11y')
              : tCommon('subscription.profile.rowUpgradeA11y')
          }
          testID="subscription-management-row"
        >
          <Ionicons
            name={isPro ? 'sparkles-outline' : 'card-outline'}
            size={18}
            color={theme.colors.sacredGold}
          />
          <View style={styles.subscriptionCopy}>
            <Text style={styles.subscriptionTitle}>
              {isPro
                ? tCommon('subscription.profile.activeLabel')
                : tCommon('subscription.profile.upgradeLabel')}
            </Text>
            <Text style={styles.subscriptionHint}>
              {isPro
                ? tCommon('subscription.profile.activeHint')
                : tCommon('subscription.profile.upgradeHint')}
            </Text>
          </View>
          {subscriptionLoading ? (
            <ActivityIndicator size="small" color={theme.colors.dust} />
          ) : (
            <Ionicons name="chevron-forward" size={16} color={theme.colors.dust} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => setLanguageSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('language.label')}
          testID="language-selector-button"
        >
          <Ionicons name="language-outline" size={18} color={theme.colors.sacredGold} />
          <Text style={styles.languageLabel}>{t('language.label')}</Text>
          <Text style={styles.languageValue} testID="language-selector-current-value">
            {LANGUAGE_NAMES[language] ?? language}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.dust} />
        </TouchableOpacity>

        <ProfileSectionHeader
          title={t('sections.legalSupport', { defaultValue: 'Help & Legal' })}
          icon="help-circle-outline"
          iconColor={tabAccentColor}
          backgroundGradientColors={profileAccentGradient}
          animationDelay={1500}
        />

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => handleOpenUrl(legalConfig.supportUrl)}
          accessibilityRole="link"
          accessibilityLabel={t('legal.support.a11y', { defaultValue: 'Open Ryvro support' })}
          testID="profile-support-link"
        >
          <Ionicons name="help-buoy-outline" size={18} color={theme.colors.sacredGold} />
          <View style={styles.legalCopy}>
            <Text style={styles.legalTitle}>
              {t('legal.support.title', { defaultValue: 'Support' })}
            </Text>
            <Text style={styles.legalHint}>
              {t('legal.support.hint', { defaultValue: 'Get help with your account or schedule' })}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.dust} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => handleOpenUrl(legalConfig.accountDeletionUrl)}
          accessibilityRole="link"
          accessibilityLabel={t('legal.deleteAccount.a11y', {
            defaultValue: 'Open Ryvro account deletion',
          })}
          testID="profile-account-deletion-link"
        >
          <Ionicons name="trash-outline" size={18} color={theme.colors.sacredGold} />
          <View style={styles.legalCopy}>
            <Text style={styles.legalTitle}>
              {t('legal.deleteAccount.title', { defaultValue: 'Delete account' })}
            </Text>
            <Text style={styles.legalHint}>
              {t('legal.deleteAccount.hint', {
                defaultValue: 'Request account and app data deletion',
              })}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.dust} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => handleOpenUrl(legalConfig.privacyPolicyUrl)}
          accessibilityRole="link"
          accessibilityLabel={t('legal.privacy.a11y', {
            defaultValue: 'Open Ryvro privacy policy',
          })}
          testID="profile-privacy-link"
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.sacredGold} />
          <View style={styles.legalCopy}>
            <Text style={styles.legalTitle}>
              {t('legal.privacy.title', { defaultValue: 'Privacy policy' })}
            </Text>
            <Text style={styles.legalHint}>
              {t('legal.privacy.hint', { defaultValue: 'How Ryvro handles your data' })}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.dust} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languageRow}
          onPress={() => handleOpenUrl(legalConfig.termsOfServiceUrl)}
          accessibilityRole="link"
          accessibilityLabel={t('legal.terms.a11y', {
            defaultValue: 'Open Ryvro terms of service',
          })}
          testID="profile-terms-link"
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.sacredGold} />
          <View style={styles.legalCopy}>
            <Text style={styles.legalTitle}>
              {t('legal.terms.title', { defaultValue: 'Terms of service' })}
            </Text>
            <Text style={styles.legalHint}>
              {t('legal.terms.hint', { defaultValue: 'Subscription and app usage terms' })}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={theme.colors.dust} />
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
  subscriptionRow: {
    marginTop: theme.spacing.lg,
  },
  subscriptionCopy: {
    flex: 1,
    gap: 4,
  },
  subscriptionTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '700',
  },
  subscriptionHint: {
    color: theme.colors.dust,
    fontSize: 12,
    lineHeight: 16,
  },
  legalCopy: {
    flex: 1,
    gap: 4,
  },
  legalTitle: {
    color: theme.colors.paper,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '700',
  },
  legalHint: {
    color: theme.colors.dust,
    fontSize: 12,
    lineHeight: 16,
  },
  subscriptionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
