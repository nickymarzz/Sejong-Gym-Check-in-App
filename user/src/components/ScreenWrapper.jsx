import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { StatusBar } from 'expo-status-bar';

// Layout wrapper for every screen.
//
// Uses useSafeAreaInsets instead of SafeAreaView because:
//   - On Android 3-button navigation, SafeAreaView may report zero bottom
//     inset when the system gesture line should still be respected.
//   - On iPhones with dynamic island/notch, we want explicit control over
//     how much extra top padding goes into the scroll area vs header area.
//
// DO NOT hard-code status-bar / bottom-indicator heights anywhere in the
// app. Always read from the useSafeAreaInsets hook, which returns device-
// specific values in real time (works in split-screen, foldables, etc).
export default function ScreenWrapper({
  children,
  scroll = true,
  bg = theme.colors.bg,
  // Which safe insets to apply the full background color behind.
  // Default: let top/bottom insets receive the page background color.
  padTop = true,
  padBottom = true,
  padLeft = true,
  padRight = true,
  // Extra bottom padding added BELOW the content area (beyond the bottom
  // safe inset). Use for screens that need breathing room past last item.
  extraBottomPadding = theme.spacing.xxxl,
}) {
  const insets = useSafeAreaInsets();

  const outerPad = {
    paddingTop: padTop ? insets.top : 0,
    paddingBottom: padBottom ? insets.bottom : 0,
    paddingLeft: padLeft ? insets.left : 0,
    paddingRight: padRight ? insets.right : 0,
  };

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          // Keep content below the top status/inset area.
          paddingTop: theme.spacing.lg,
          // Never compress content against the bottom gesture/nav area.
          paddingBottom: extraBottomPadding,
          // Account for foldables / landscape with side insets (left/right).
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, { paddingHorizontal: theme.spacing.lg }]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }, outerPad]}>
      <StatusBar style="dark" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
});
