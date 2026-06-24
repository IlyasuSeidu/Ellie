/**
 * MainTabNavigator
 *
 * Bottom tab navigator for the main app with 3 tabs:
 *   Home | Assistant (center) | Profile
 *
 * Schedule and Stats are intentionally omitted for v1.0.
 * Uses a custom floating glassmorphic tab bar (CustomTabBar).
 * The center assistant tab opens the VoiceAssistantModal.
 */

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainDashboardScreen } from '@/screens/main/MainDashboardScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';
import { VoiceAssistantModal } from '@/components/voice';

export type MainTabParamList = {
  Home: undefined;
  Assistant: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Empty component: the assistant tab opens the modal instead of rendering a screen. */
const AssistantPlaceholder = () => <View />;

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
        <Tab.Screen name="Assistant" component={AssistantPlaceholder} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Global voice assistant modal — accessible from any tab via center button */}
      <VoiceAssistantModal />
    </>
  );
};
