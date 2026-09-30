import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import NfcScanScreen from '../screens/NfcScanScreen';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.bg,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '800' },
        },
      }}
    >
      <Root.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        {isAuthenticated ? (
          <>
            <Root.Screen name="Main" component={MainTabs} />
            <Root.Screen
              name="NfcScan"
              component={NfcScanScreen}
              options={{
                presentation: 'modal',
                contentStyle: { backgroundColor: '#0e1a2e' },
              }}
            />
          </>
        ) : (
          <Root.Screen name="Login" component={LoginScreen} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
