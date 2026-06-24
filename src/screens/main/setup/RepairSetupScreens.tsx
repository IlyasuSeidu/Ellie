import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { MainStackParamList } from '@/navigation/MainStackNavigator';
import { PremiumFixMenuScreen } from '@/screens/onboarding/premium/PremiumFixMenuScreen';
import { PremiumGuidedShiftChatScreen } from '@/screens/onboarding/premium/PremiumGuidedShiftChatScreen';
import { PremiumKnownShiftDateScreen } from '@/screens/onboarding/premium/PremiumKnownShiftDateScreen';
import { PremiumKnownShiftPhaseScreen } from '@/screens/onboarding/premium/PremiumKnownShiftPhaseScreen';
import { PremiumKnownShiftTypeScreen } from '@/screens/onboarding/premium/PremiumKnownShiftTypeScreen';
import { PremiumReminderSetupScreen } from '@/screens/onboarding/premium/PremiumReminderSetupScreen';
import { PremiumSchedulePreviewScreen } from '@/screens/onboarding/premium/PremiumSchedulePreviewScreen';
import { PremiumShiftTimesScreen } from '@/screens/onboarding/premium/PremiumShiftTimesScreen';
import type { UniversalShiftSchedule } from '@/types';
import {
  getKnownShiftPhaseOptions,
  type KnownShiftChoice,
  type KnownShiftPhaseOption,
} from '@/utils/knownShiftPhase';

type MainSetupNavigation = NativeStackNavigationProp<MainStackParamList>;

export const RepairPatternScreen: React.FC = () => {
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumGuidedShiftChatScreen
      flowContext="settings"
      onContinue={(scheduleDraft) => {
        navigation.navigate('ShiftTimesSetup', { scheduleDraft, returnTo: 'KnownShiftDateSetup' });
      }}
      testID="repair-pattern-screen"
    />
  );
};

export const RepairShiftTimesScreen: React.FC = () => {
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumShiftTimesScreen
      flowContext="settings"
      onContinue={(scheduleDraft) => {
        navigation.navigate('SchedulePreviewSetup', { scheduleDraft });
      }}
      testID="repair-shift-times-screen"
    />
  );
};

export const RepairKnownShiftDateScreen: React.FC = () => {
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumKnownShiftDateScreen
      flowContext="settings"
      onContinue={(scheduleDraft) => {
        navigation.navigate('KnownShiftTypeSetup', { scheduleDraft });
      }}
      testID="repair-known-shift-date-screen"
    />
  );
};

export const RepairKnownShiftTypeScreen: React.FC = () => {
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumKnownShiftTypeScreen
      flowContext="settings"
      onContinue={(scheduleDraft: UniversalShiftSchedule, selectedShift: KnownShiftChoice) => {
        const phaseOptions = getKnownShiftPhaseOptions(scheduleDraft, selectedShift);
        if (phaseOptions.length > 1) {
          navigation.navigate('KnownShiftPhaseSetup', { scheduleDraft, selectedShift });
          return;
        }
        navigation.navigate('SchedulePreviewSetup', { scheduleDraft });
      }}
      testID="repair-known-shift-type-screen"
    />
  );
};

export const RepairKnownShiftPhaseScreen: React.FC = () => {
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumKnownShiftPhaseScreen
      flowContext="settings"
      onContinue={(scheduleDraft: UniversalShiftSchedule, _option: KnownShiftPhaseOption) => {
        navigation.navigate('SchedulePreviewSetup', { scheduleDraft });
      }}
      onUnsure={(scheduleDraft) => {
        navigation.navigate('FixMenuSetup', { scheduleDraft });
      }}
      testID="repair-known-shift-phase-screen"
    />
  );
};

export const RepairSchedulePreviewScreen: React.FC = () => {
  const { updateDataAsync } = useOnboarding();
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumSchedulePreviewScreen
      flowContext="settings"
      onConfirm={async (schedule) => {
        await updateDataAsync({ universalSchedule: schedule });
        navigation.navigate('Settings');
      }}
      onFix={(scheduleDraft) => {
        navigation.navigate('FixMenuSetup', { scheduleDraft });
      }}
      testID="repair-schedule-preview-screen"
    />
  );
};

export const RepairFixMenuScreen: React.FC = () => (
  <PremiumFixMenuScreen flowContext="settings" testID="repair-fix-menu-screen" />
);

export const RepairReminderSetupScreen: React.FC = () => {
  const { updateDataAsync } = useOnboarding();
  const navigation = useNavigation<MainSetupNavigation>();

  return (
    <PremiumReminderSetupScreen
      flowContext="settings"
      onContinue={async (schedule) => {
        await updateDataAsync({ universalSchedule: schedule });
        navigation.navigate('Settings');
      }}
      testID="repair-reminder-setup-screen"
    />
  );
};
