import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingProvider, useOnboarding } from './src/contexts/OnboardingContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';
import { useActiveShift } from './src/hooks/useActiveShift';
import { buildShiftCycle } from './src/utils/shiftUtils';
import { toDateString } from './src/utils/dateUtils';
import { shiftColors } from './src/constants/shiftStyles';
import { theme } from './src/utils/theme';
import { RosterType } from './src/types';

function AppContent() {
  const { data } = useOnboarding();
  const [liveTick, setLiveTick] = useState(0);
  const [currentDateStr, setCurrentDateStr] = useState(() => toDateString(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((tick) => tick + 1);
      setCurrentDateStr(toDateString(new Date()));
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const shiftCycle = useMemo(() => {
    try {
      return buildShiftCycle(data);
    } catch {
      return null;
    }
  }, [data]);

  const activeShift = useActiveShift(shiftCycle, data, liveTick, currentDateStr);

  const statusBarColor = useMemo(() => {
    if (!shiftCycle || shiftCycle.rosterType !== RosterType.ROTATING || !activeShift) {
      return theme.colors.deepVoid;
    }
    if (activeShift.shiftType === 'off') {
      return theme.colors.deepVoid;
    }
    return shiftColors[activeShift.shiftType].primary;
  }, [activeShift, shiftCycle]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={statusBarColor} translucent={false} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <VoiceAssistantProvider>
            <AppContent />
          </VoiceAssistantProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
