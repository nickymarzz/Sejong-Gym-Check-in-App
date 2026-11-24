import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync, addNotificationListeners } from './src/services/notifications/pushNotificationService';

function AppContent() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Initialize notification channels and permissions
    registerForPushNotificationsAsync();

    // Real push notification listener
    const cleanup = addNotificationListeners(
      (notification) => {
        console.log('Push notification received:', notification?.request?.content?.title);
      },
      (response) => {
        console.log('Push notification opened:', response?.notification?.request?.content?.data);
      }
    );

    return () => cleanup && cleanup();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
