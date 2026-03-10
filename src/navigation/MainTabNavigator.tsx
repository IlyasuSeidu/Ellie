/**
 * MainTabNavigator
 *
 * Bottom tab navigator for the main app with 3 tabs:
 *   Home | Ellie (center) | Profile
 *
 * Schedule and Stats are intentionally omitted for v1.0.
 * Uses a custom floating glassmorphic tab bar (CustomTabBar).
 * The center "Ellie" tab opens the VoiceAssistantModal.
 */

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainDashboardScreen } from '@/screens/main/MainDashboardScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { VoiceAssistantModal } from '@/components/voice';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export type MainTabParamList = {
  Home: undefined;
  Ellie: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Empty component — the Ellie tab never renders; its button opens the modal */
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
        <Tab.Screen name="Ellie" component={ElliePlaceholder} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Global voice assistant modal — accessible from any tab via center button */}
      <VoiceAssistantModal />
    </>
  );
};
