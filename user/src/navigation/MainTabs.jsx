import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { theme } from '../theme';
import { View, StyleSheet, Text } from 'react-native';

const Tab = createBottomTabNavigator();

function TabIcon({ route, color, size, focused }) {
  if (route.name === 'Home') {
    return (
      <View style={focused ? styles.activeTabIconBg : null}>
        <MaterialCommunityIcons name="home-outline" size={size} color={color} />
      </View>
    );
  }
  if (route.name === 'History') {
    return (
      <View style={focused ? styles.activeTabIconBg : null}>
        <Ionicons name="time-outline" size={size} color={color} />
      </View>
    );
  }
  if (route.name === 'Profile') {
    return (
      <View style={focused ? styles.activeTabIconBg : null}>
        <Ionicons name="person-outline" size={size} color={color} />
      </View>
    );
  }
  return null;
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  const BASE_HEIGHT = 52;
  const BASE_PAD_TOP = 2;
  const BASE_PAD_BOTTOM = 2;

  // Dynamic tab bar sizing: never hard-code Android/iOS system heights.
  //   - Android gesture nav:   insets.bottom ≈ 16–24
  //   - Android 3-button nav:  insets.bottom ≈ 48
  //   - iPhone without home:   insets.bottom ≈ 34
  //   - iPhone with home:      insets.bottom = 0
  const tabBarStyle = {
    height: BASE_HEIGHT + insets.bottom,
    paddingBottom: BASE_PAD_BOTTOM + insets.bottom,
    paddingTop: BASE_PAD_TOP + Math.max(0, insets.top > 24 ? 0 : 0),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 10.5,
          marginTop: -2,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarLabel: ({ focused, color }) => {
          const label =
            route.name === 'Home' ? 'Home' :
            route.name === 'History' ? 'History' :
            route.name === 'Profile' ? 'Profile' : '';
          return (
            <Text style={[styles.tabLabel, { color, fontWeight: focused ? '800' : '500' }]}>
              {label}
            </Text>
          );
        },
        tabBarIcon: ({ color, size, focused }) => (
          <TabIcon route={route} color={color} size={20} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 10.5, letterSpacing: 0.2 },
  activeTabIconBg: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
