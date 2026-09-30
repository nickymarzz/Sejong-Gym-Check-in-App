// Design tokens ported directly from web src/index.css :root variables.
// Changing a value here will update the whole app's theme.
// FUTURE: Add dark mode support by exporting a second theme object.

export const theme = {
  colors: {
    primary: '#1e56a0',
    primaryDark: '#163c6e',
    primaryLight: '#e8f0fa',

    success: '#2e7d32',
    successBg: '#e8f5e9',
    successBorder: '#c8e6c9',

    danger: '#c62828',
    dangerBg: '#ffebee',
    dangerBorder: '#ffcdd2',

    warning: '#ef6c00',
    warningBg: '#fff3e0',
    warningBorder: '#ffe0b2',

    text: '#1a2332',
    textSecondary: '#5c6b7d',
    textMuted: '#8a97a8',

    border: '#e2e8f0',
    bg: '#f4f7fb',
    surface: '#ffffff',

    dev: '#5e35b1',
    devBg: '#ede7f6',
    devBorder: '#c5cae9',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  shadow: {
    sm: {
      shadowColor: '#1a2332',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#1a2332',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    lg: {
      shadowColor: '#1a2332',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 6,
    },
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 20,
    xxl: 22,
    hero: 48,
    big: 32,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 18,
    pill: 999,
  },
};

export default theme;
