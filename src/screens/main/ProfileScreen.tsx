/**
 * ProfileScreen
 *
 * Full profile screen with animated hero avatar, editable personal information,
 * shift configuration summary, and work overview statistics.
 * Uses the Sacred design system with Reanimated animations and haptic feedback.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { theme } from '@/utils/theme';
import { useProfileData } from '@/hooks/useProfileData';
import { useShiftAccent } from '@/hooks/useShiftAccent';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import { ProfileHeroSection } from '@/components/profile/ProfileHeroSection';
import { ProfileSectionHeader } from '@/components/profile/ProfileSectionHeader';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { ShiftSettingsPanel } from '@/components/profile/ShiftSettingsPanel';
import { WorkStatsSummary } from '@/components/profile/WorkStatsSummary';
import { asyncStorageService } from '@/services/AsyncStorageService';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const profile = useProfileData();
  const { shiftType: liveShiftType, tabAccentColor } = useShiftAccent();
  const { isEditing, cancelEditing } = profile;
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
    await asyncStorageService.set('onboarding:complete', false);

    const rootNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (rootNavigation && typeof rootNavigation.reset === 'function') {
      rootNavigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  }, [navigation]);

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
          title="Personal Information"
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
          onOpenShiftTimeOnboarding={handleOpenShiftTimeOnboarding}
          animationDelay={800}
        />

        <ProfileSectionHeader
          title="Work Overview"
          icon="stats-chart-outline"
          animationDelay={1100}
        />
        <WorkStatsSummary data={profile.data} animationDelay={1200} />

        {__DEV__ ? (
          <View style={styles.onboardingToolsSection}>
            <Pressable
              style={styles.onboardingButton}
              onPress={handleRunOnboardingAgain}
              accessibilityRole="button"
              accessibilityLabel="Run onboarding flow again"
              accessibilityHint="Re-open onboarding screens from the first step"
              testID="run-onboarding-again-button"
            >
              <Text style={styles.onboardingButtonText}>Run Onboarding Again</Text>
              <Text style={styles.onboardingButtonHint}>Opens onboarding from step one</Text>
            </Pressable>
          </View>
        ) : null}
      </Animated.ScrollView>
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
});
