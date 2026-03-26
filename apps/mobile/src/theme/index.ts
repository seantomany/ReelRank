import { MD3DarkTheme } from 'react-native-paper';

export const colors = {
  primary: '#ff2d55',
  primaryLight: '#ff4f6f',
  primaryDark: '#e0264d',
  background: '#000000',
  surface: '#141414',
  surfaceVariant: '#1a1a1a',
  card: '#141414',
  text: '#e8e8e8',
  textSecondary: '#888888',
  textTertiary: '#555555',
  accent: '#ff2d55',
  success: '#34c759',
  error: '#ff3b30',
  warning: '#ff9500',
  info: '#5ac8fa',
  border: 'rgba(255,255,255,0.08)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',
  want: '#ff2d55',
  pass: '#ff3b30',
  onPrimary: '#FFFFFF',
  onAccent: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' as const },
  h2: { fontSize: 24, fontWeight: 'bold' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16 },
  bodySmall: { fontSize: 14 },
  caption: { fontSize: 12 },
};

export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    error: colors.error,
    onPrimary: '#FFFFFF',
    onBackground: colors.text,
    onSurface: colors.text,
  },
};
