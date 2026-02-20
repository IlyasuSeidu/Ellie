import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <VoiceAssistantProvider>
            <View style={styles.container}>
              <StatusBar style="light" />
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </View>
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
