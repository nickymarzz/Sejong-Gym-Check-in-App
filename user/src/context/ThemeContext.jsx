import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { theme, lightColors, darkColors } from '../theme';

export const ThemeContext = createContext({
  isDark: false,
  theme,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
