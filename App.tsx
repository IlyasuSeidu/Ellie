import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { OnboardingProvider } from './src/contexts/OnboardingContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <NavigationContainer>
            <OnboardingNavigator />
          </NavigationContainer>
        </View>
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
