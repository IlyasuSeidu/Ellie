/**
 * Theme Configuration
 *
 * Comprehensive theme system with colors, typography, spacing, and design tokens.
 * Inspired by the Sacred design system - earth tones with gold accents for
 * a sophisticated, low-dopamine interface.
 */

import { ViewStyle, TextStyle } from 'react-native';

/**
 * Color Palette
 */
export const colors = {
  // Deep backgrounds (Stone scale)
  deepVoid: '#0c0a09', // Stone 950 - Main app background
  darkStone: '#1c1917', // Stone 900 - Cards and containers
  softStone: '#292524', // Stone 800 - Borders, dividers, inactive elements

  // Primary accent (Gold/Amber scale)
  sacredGold: '#b45309', // Primary accent for actions and progress
  brightGold: '#d97706', // Lighter gold for hover states
  paleGold: '#f59e0b', // Even lighter for subtle highlights

  // Text colors
  paper: '#e7e5e4', // Stone 200 - Primary text
  dust: '#a8a29e', // Stone 400 - Secondary text, icons, timestamps
  shadow: '#78716c', // Stone 500 - Tertiary text, disabled states

  // Shift-specific colors (aligned with dashboard calendar)
  workDay: '#2196F3', // Blue for day shifts
  offDay: '#78716c', // Stone 500 for off days
  nightShift: '#651FFF', // Purple for night shifts
  holiday: '#ea580c', // Orange 600 for holidays

  // Shift visualization colors (calendar/timeline UI)
  shiftVisualization: {
    dayShift: '#2196F3', // Blue - for calendar day shift indicators
    nightShift: '#651FFF', // Purple - for calendar night shift indicators
    morningShift: '#F59E0B', // Amber 500 - sunrise gold for morning shifts
    afternoonShift: '#FB923C', // Orange 400 - midday warmth for afternoon shifts
    daysOff: '#78716c', // Stone 500 - for calendar days off indicators
  },

  // Status colors
  success: '#22c55e', // Green 500
  successBg: '#14532d', // Green 900/20 background
  warning: '#eab308', // Yellow 500
  warningBg: '#422006', // Yellow 900/20 background
  error: '#ef4444', // Red 500
  errorBg: '#450a0a', // Red 900/20 background

  // Border and divider
  border: '#292524', // Stone 800
  divider: '#1c1917', // Stone 900

  // Background variants
  background: {
    primary: '#0c0a09', // Stone 950
    secondary: '#1c1917', // Stone 900
    tertiary: '#292524', // Stone 800
  },

  // Text variants
  text: {
    primary: '#e7e5e4', // Stone 200
    secondary: '#a8a29e', // Stone 400
    tertiary: '#78716c', // Stone 500
    inverse: '#0c0a09', // Stone 950
  },

  // Accent variants
  accent: {
    primary: '#b45309', // Amber 700
    light: '#d97706', // Amber 600
    lighter: '#f59e0b', // Amber 500
    dark: '#92400e', // Amber 800
  },

  // Opacity helpers (for glow effects)
  opacity: {
    gold5: 'rgba(180, 83, 9, 0.05)',
    gold10: 'rgba(180, 83, 9, 0.1)',
    gold20: 'rgba(180, 83, 9, 0.2)',
    gold30: 'rgba(180, 83, 9, 0.3)',
    stone5: 'rgba(28, 25, 23, 0.05)',
    stone10: 'rgba(28, 25, 23, 0.1)',
    stone20: 'rgba(28, 25, 23, 0.2)',
    stone30: 'rgba(28, 25, 23, 0.3)',
    stone50: 'rgba(41, 37, 36, 0.5)', // softStone with 50% opacity
    stone95: 'rgba(28, 25, 23, 0.95)',
    void95: 'rgba(12, 10, 9, 0.95)', // End screen overlays
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

    // Gold glow effect
    goldGlow: {
      shadowColor: '#b45309',
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
