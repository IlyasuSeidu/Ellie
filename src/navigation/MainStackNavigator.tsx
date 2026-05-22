/**
 * MainStackNavigator
 *
 * Native stack wrapping the bottom-tab navigator so full-screen modal
 * screens (e.g. UniversalShiftBuilder) can be pushed on top of the tabs
 * without breaking the tab bar.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '@/utils/theme';
import { MainTabNavigator } from './MainTabNavigator';
import {
  UniversalShiftBuilderScreen,
  type UniversalShiftBuilderParams,
} from '@/screens/main/UniversalShiftBuilderScreen';

// ── Param list ────────────────────────────────────────────────────────────────

export type MainStackParamList = {
  MainTabs: undefined;
  UniversalShiftBuilder: UniversalShiftBuilderParams;
};

// ── Navigator ─────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.deepVoid },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="UniversalShiftBuilder"
        component={UniversalShiftBuilderScreen}
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: theme.colors.deepVoid },
        }}
      />
    </Stack.Navigator>
  );
};
