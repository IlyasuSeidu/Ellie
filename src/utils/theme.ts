/**
 * Theme Configuration
 *
 * Comprehensive theme system with colors, typography, spacing, and design tokens.
 * Ryvro brand system: dark base, cyan, blue, silver, and muted text.
 */

import { ViewStyle, TextStyle } from 'react-native';

/**
 * Color Palette
 */
const ryvro = {
  void: '#02070b',
  ink: '#07121a',
  panel: '#08161f',
  panelStrong: '#0d2230',
  cyan: '#20f4dc',
  teal: '#19bdb5',
  blue: '#147cff',
  silver: '#d6e7f2',
  muted: '#9db2c2',
  quiet: '#5f7484',
  line: '#244255',
  white: '#f7fbff',
} as const;

export const colors = {
  // Deep backgrounds
  deepVoid: ryvro.void, // Main app background
  darkStone: ryvro.panel, // Cards and containers
  softStone: ryvro.line, // Borders, dividers, inactive elements

  // Primary accent aliases. Names are kept for compatibility with older components.
  sacredGold: ryvro.cyan, // Primary action and progress color
  brightGold: ryvro.cyan, // Secondary action and hover color
  paleGold: ryvro.silver, // Light highlight color

  // Text colors
  paper: ryvro.silver, // Primary text
  dust: ryvro.muted, // Secondary text, icons, timestamps
  shadow: ryvro.quiet, // Tertiary text, disabled states

  // Compatibility aliases kept for older helpers. Values stay inside the Ryvro palette.
  workDay: ryvro.cyan,
  offDay: ryvro.quiet,
  nightShift: ryvro.blue,
  holiday: ryvro.teal,

  // Compatibility aliases for simple schedule previews.
  shiftVisualization: {
    dayShift: ryvro.cyan,
    nightShift: ryvro.blue,
    morningShift: ryvro.cyan,
    afternoonShift: ryvro.blue,
    daysOff: ryvro.quiet,
  },

  // Status colors
  success: '#22c55e', // Green 500
  successBg: '#14532d', // Green 900/20 background
  warning: '#eab308', // Yellow 500
  warningBg: '#422006', // Yellow 900/20 background
  error: '#ef4444', // Red 500
  errorBg: '#450a0a', // Red 900/20 background

  // Border and divider
  border: ryvro.line,
  divider: ryvro.panelStrong,

  // Background variants
  background: {
    primary: ryvro.void,
    secondary: ryvro.panel,
    tertiary: ryvro.panelStrong,
  },

  // Text variants
  text: {
    primary: ryvro.silver,
    secondary: ryvro.muted,
    tertiary: ryvro.quiet,
    inverse: ryvro.void,
  },

  // Accent variants
  accent: {
    primary: ryvro.cyan,
    light: ryvro.cyan,
    lighter: ryvro.silver,
    dark: ryvro.teal,
  },

  // Opacity helpers (for glow effects)
  opacity: {
    gold5: 'rgba(32, 244, 220, 0.05)',
    gold10: 'rgba(32, 244, 220, 0.1)',
    gold20: 'rgba(32, 244, 220, 0.2)',
    gold30: 'rgba(32, 244, 220, 0.3)',
    stone5: 'rgba(8, 22, 31, 0.05)',
    stone10: 'rgba(8, 22, 31, 0.1)',
    stone20: 'rgba(8, 22, 31, 0.2)',
    stone30: 'rgba(8, 22, 31, 0.3)',
    stone50: 'rgba(36, 66, 85, 0.5)',
    stone95: 'rgba(8, 22, 31, 0.95)',
    void95: 'rgba(2, 7, 11, 0.95)',
    white10: 'rgba(255, 255, 255, 0.1)', // Button backgrounds
    white20: 'rgba(255, 255, 255, 0.2)', // Highlights
    white30: 'rgba(255, 255, 255, 0.3)', // Stronger highlights
    black40: 'rgba(0, 0, 0, 0.4)', // Light modal backdrops
    black60: 'rgba(0, 0, 0, 0.6)', // Standard modal backdrops
  },
} as const;

/**
 * Typography Scale
 */
export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },

  fontWeights: {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

/**
 * Spacing Scale
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

/**
 * Border Radius Scale
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Shadow Definitions
 */
export const shadows = {
  // iOS shadows
  ios: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    } as ViewStyle,

    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    } as ViewStyle,

    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    } as ViewStyle,

    // Primary brand glow effect. Name is kept for compatibility.
    goldGlow: {
      shadowColor: '#20f4dc',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    } as ViewStyle,
  },

  // Android elevation
  android: {
    small: { elevation: 2 } as ViewStyle,
    medium: { elevation: 4 } as ViewStyle,
    large: { elevation: 8 } as ViewStyle,
  },
} as const;

/**
 * Breakpoints for Responsive Design
 */
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

/**
 * Animation Durations
 */
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Complete Theme Object
 */
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  animations,
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;

export default theme;
