import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Platform, Animated, StyleSheet, Easing, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { theme, lightColors, darkColors } from '../theme';

const STORAGE_KEY = 'sgc_theme_dark';

export const ThemeContext = createContext({
  isDark: false,
  theme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) return saved === 'true';
      } catch (_) {}
    }
    return false;
  });

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [overlayBg, setOverlayBg] = useState(lightColors.bg);
  const isAnimating = useRef(false);

  const toggleTheme = useCallback(() => {
    if (Platform.OS === 'web') {
      const doToggle = () => {
        setIsDark((prev) => {
          const next = !prev;
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, String(next));
            } catch (_) {}
          }
          return next;
        });
      };

      if (
        typeof document !== 'undefined' &&
        document.startViewTransition &&
        !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        document.startViewTransition(() => {
          doToggle();
        });
      } else {
        doToggle();
      }
      return;
    }

    // Native Mobile (Android / iOS) smooth cross-dissolve:
    if (isAnimating.current) return;
    isAnimating.current = true;

    // 1. Capture outgoing theme background in an overlay at 100% opacity
    const oldBg = isDark ? darkColors.bg : lightColors.bg;
    setOverlayBg(oldBg);
    overlayOpacity.setValue(1);

    // 2. Flip theme state so all components re-render underneath
    setIsDark((prev) => !prev);

    // 3. Smoothly fade out the outgoing veil over 160ms at native 60/120fps
    requestAnimationFrame(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        isAnimating.current = false;
      });
    });
  }, [isDark, overlayOpacity]);

  useEffect(() => {
    const bg = isDark ? darkColors.bg : lightColors.bg;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = bg;
      document.documentElement.style.backgroundColor = bg;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      SystemUI.setBackgroundColorAsync(bg).catch(() => {});
    }
  }, [isDark]);

  const currentTheme = useMemo(() => {
    const activeColors = isDark ? darkColors : lightColors;
    Object.assign(theme.colors, activeColors);
    return {
      ...theme,
      colors: { ...activeColors },
    };
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      theme: currentTheme,
      toggleTheme,
    }),
    [isDark, currentTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={styles.container}>
        {children}
        {Platform.OS !== 'web' ? (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: overlayBg,
                opacity: overlayOpacity,
                zIndex: 99999,
              },
            ]}
          />
        ) : null}
      </View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
