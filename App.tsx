import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';
import { useShiftAccent } from './src/hooks/useShiftAccent';

function AppContent() {
  const insets = useSafeAreaInsets();
  const { statusAreaColor } = useShiftAccent();

  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={[
          styles.statusAreaBackground,
          {
            height: insets.top,
            backgroundColor: statusAreaColor,
          },
        ]}
      />
      <StatusBar style="light" backgroundColor={statusAreaColor} translucent={false} />
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
          <LanguageProvider>
            <VoiceAssistantProvider>
              <AppContent />
            </VoiceAssistantProvider>
          </LanguageProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusAreaBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
