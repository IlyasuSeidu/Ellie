/**
 * MainTabNavigator
 *
 * Bottom tab navigator for the main app with 5 tabs:
 *   Home | Schedule | Ellie (center) | Stats | Profile
 *
 * Uses a custom floating glassmorphic tab bar (CustomTabBar).
 * The center "Ellie" tab is an action button that opens the
 * VoiceAssistantModal rather than navigating to a screen.
 * The modal is rendered here so it works from every tab.
 */

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainDashboardScreen } from '@/screens/main/MainDashboardScreen';
import { ScheduleScreen } from '@/screens/main/ScheduleScreen';
import { StatsScreen } from '@/screens/main/StatsScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { VoiceAssistantModal } from '@/components/voice';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export type MainTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Ellie: undefined;
  Stats: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Empty component — the Ellie tab never actually renders, its button opens the modal */
const ElliePlaceholder = () => <View />;

export const MainTabNavigator: React.FC = () => {
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={MainDashboardScreen} />
        <Tab.Screen name="Schedule" component={ScheduleScreen} />
        <Tab.Screen name="Ellie" component={ElliePlaceholder} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Global voice assistant modal — accessible from any tab via center button */}
      <VoiceAssistantModal />
    </>
  );
};
