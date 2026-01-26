import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { PremiumWelcomeScreen } from './src/screens/onboarding/premium/PremiumWelcomeScreen';

export default function App() {
  const handleContinue = () => {
    console.log('Continue to next screen');
    // TODO: Navigate to next onboarding screen
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <PremiumWelcomeScreen onContinue={handleContinue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
