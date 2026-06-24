/**
 * MainStackNavigator
 *
 * Native stack for the main app.
 * Ryvro opens directly into the voice assistant after onboarding.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { VoiceAssistantScreen } from '@/screens/main/VoiceAssistantScreen';
import { SimpleSettingsScreen } from '@/screens/main/SimpleSettingsScreen';
import {
  RepairFixMenuScreen,
  RepairKnownShiftDateScreen,
  RepairKnownShiftPhaseScreen,
  RepairKnownShiftTypeScreen,
  RepairPatternScreen,
  RepairReminderSetupScreen,
  RepairSchedulePreviewScreen,
  RepairShiftTimesScreen,
} from '@/screens/main/setup/RepairSetupScreens';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';

// ── Param list ────────────────────────────────────────────────────────────────

export type MainStackParamList = {
  Ask: undefined;
  Settings: undefined;
  GuidedShiftChatSetup: undefined;
  ShiftTimesSetup: OnboardingStackParamList['ShiftTimesSetup'];
  KnownShiftDateSetup: OnboardingStackParamList['KnownShiftDateSetup'];
  KnownShiftTypeSetup: OnboardingStackParamList['KnownShiftTypeSetup'];
  KnownShiftPhaseSetup: OnboardingStackParamList['KnownShiftPhaseSetup'];
  SchedulePreviewSetup: OnboardingStackParamList['SchedulePreviewSetup'];
  FixMenuSetup: OnboardingStackParamList['FixMenuSetup'];
  ReminderSetup: OnboardingStackParamList['ReminderSetup'];
};

// ── Navigator ─────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<MainStackParamList>();

const repairScreenOptions = {
  headerShown: true,
  headerTransparent: true,
  headerTitle: '',
  headerBackTitle: 'Settings',
  headerTintColor: theme.colors.paper,
  headerShadowVisible: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: theme.colors.deepVoid },
};

export const MainStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.deepVoid },
      }}
    >
      <Stack.Screen name="Ask" component={VoiceAssistantScreen} />
      <Stack.Screen
        name="Settings"
        component={SimpleSettingsScreen}
        options={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.deepVoid },
        }}
      />
      <Stack.Screen
        name="GuidedShiftChatSetup"
        component={RepairPatternScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="ShiftTimesSetup"
        component={RepairShiftTimesScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="KnownShiftDateSetup"
        component={RepairKnownShiftDateScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="KnownShiftTypeSetup"
        component={RepairKnownShiftTypeScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="KnownShiftPhaseSetup"
        component={RepairKnownShiftPhaseScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="SchedulePreviewSetup"
        component={RepairSchedulePreviewScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="FixMenuSetup"
        component={RepairFixMenuScreen}
        options={repairScreenOptions}
      />
      <Stack.Screen
        name="ReminderSetup"
        component={RepairReminderSetupScreen}
        options={repairScreenOptions}
      />
    </Stack.Navigator>
  );
};
