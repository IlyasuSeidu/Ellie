import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider, useOnboardingOptional } from './src/contexts/OnboardingContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { useSmartReminders } from './src/hooks/useSmartReminders';
import { expoNotificationScheduler } from './src/services/ExpoNotificationScheduler';
import { notificationService } from './src/services/NotificationService';
import { useShiftAccent } from './src/hooks/useShiftAccent';
import { appStateStorageService } from './src/services/AppStateStorageService';
import { OfflineBanner } from './src/components/system/OfflineBanner';
import { PostShiftCheckInController } from './src/components/checkin/PostShiftCheckInController';
import { storageMaintenanceService } from './src/services/StorageMaintenanceService';
import { PaywallScreen } from './src/screens/subscription/PaywallScreen';

notificationService.setScheduler(expoNotificationScheduler);

if (__DEV__) {
  // React Native 0.81 / iOS can emit this from native animated internals during
  // navigator and gesture-driven transitions even when app listeners are healthy.
  // Keep the console usable without suppressing unrelated warnings.
  LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered.']);
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { statusAreaColor } = useShiftAccent();
  useSmartReminders();

  useEffect(() => {
    void appStateStorageService.cleanupObsoleteKeys();
    storageMaintenanceService.initialize();

    return () => {
      storageMaintenanceService.destroy();
    };
  }, []);

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
      <OfflineBanner />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

function AppShell() {
  const [showGlobalPaywall, setShowGlobalPaywall] = useState(false);
  const onboarding = useOnboardingOptional();

  return (
    <SubscriptionProvider onOpenPaywall={() => setShowGlobalPaywall(true)}>
      <VoiceAssistantProvider>
        <AppContent />
        <PostShiftCheckInController />
        {showGlobalPaywall ? (
          <PaywallScreen
            onDismiss={() => setShowGlobalPaywall(false)}
            onboardingData={onboarding?.data}
            entryPoint="feature_gate"
          />
        ) : null}
      </VoiceAssistantProvider>
    </SubscriptionProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <LanguageProvider>
              <AppShell />
            </LanguageProvider>
          </OnboardingProvider>
        </AuthProvider>
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
