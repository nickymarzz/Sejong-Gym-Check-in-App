import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync, addNotificationListeners } from './src/services/notifications/pushNotificationService';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <AuthProvider>
      <AppNavigator key={isDark ? 'dark' : 'light'} />
    </AuthProvider>
  );
}

export default function App() {
  useEffect(() => {
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
