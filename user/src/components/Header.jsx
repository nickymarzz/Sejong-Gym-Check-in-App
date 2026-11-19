import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function Header({ userData, onLogout, title = 'SGC', subtitle = 'Sejong Gym Check-in' }) {
  const inGym = !!userData?.checkedIn;
  const { isDark, toggleTheme } = useTheme();

  // Apply device status-bar height ABOVE the navbar background/border so the
  // header's 1-px bottom border ALWAYS begins below the time / battery /
  // signal row. Never hardcode status-bar heights.
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: theme.colors.surface, paddingTop: insets.top }}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.colors.surface} />
      <View style={[styles.navbar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View style={styles.brand}>
          <View style={styles.logoIcon}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.colors.primary }]}>{title}</Text>
            <Text style={[styles.brandSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.right}>
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [styles.themeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityLabel="Toggle light or dark theme"
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon-outline'}
              size={18}
              color={isDark ? '#f59e0b' : theme.colors.textSecondary}
            />
          </Pressable>

          <View style={[styles.badge, inGym ? styles.badgeIn : [styles.badgeOut, { backgroundColor: theme.colors.bg, borderColor: theme.colors.border }]]}>
            <View style={[styles.badgeDot, inGym ? styles.dotIn : styles.dotOut]} />
            <Text style={[styles.badgeText, inGym ? styles.badgeTextIn : [styles.badgeTextOut, { color: theme.colors.textSecondary }]]}>
              {inGym ? 'In Gym' : 'Outside'}
            </Text>
          </View>

          {onLogout ? (
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => [styles.logoutBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && { opacity: 0.7 }]}
              hitSlop={12}
              accessibilityLabel="Log out"
            >
              <Ionicons name="log-out-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 24,
    height: 24,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    lineHeight: 22,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  badgeIn: {
    backgroundColor: theme.colors.successBg,
    borderColor: theme.colors.successBorder,
  },
  badgeOut: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 99 },
  dotIn: { backgroundColor: theme.colors.success },
  dotOut: { backgroundColor: theme.colors.textMuted },
  badgeText: { fontSize: 11, fontWeight: theme.fontWeight.bold },
  badgeTextIn: { color: theme.colors.success },
  badgeTextOut: { color: theme.colors.textSecondary },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  themeBtn: {
    width: 34,
    height: 34,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
});
