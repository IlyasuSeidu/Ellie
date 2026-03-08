import { ViewStyle, Platform } from 'react-native';
import { colors, spacing } from './theme';

/**
 * Calculate responsive size based on screen width
 * Uses a scaling factor based on a reference width of 375px (iPhone SE)
 */
export function getResponsiveSize(size: number, screenWidth: number): number {
  const baseWidth = 375; // Reference width
  const scale = screenWidth / baseWidth;

  // Limit scaling to prevent extreme sizes
  const minScale = 0.8;
  const maxScale = 1.3;
  const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

  return Math.round(size * clampedScale);
}

/**
 * Create platform-specific shadow styles
 * iOS uses shadow properties, Android uses elevation
 */
export function createShadow(elevation: number): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: colors.deepVoid,
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: 0.1 + elevation * 0.05,
      shadowRadius: elevation,
    };
  }

  // Android
  return {
    elevation,
  };
}

/**
 * Create gold glow shadow effect (iOS only)
 * Android will fall back to standard elevation
 */
export function createGoldGlow(intensity: number = spacing.sm): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: colors.sacredGold,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.3,
      shadowRadius: intensity,
    };
  }

  // Android fallback
  return {
    elevation: 4,
  };
}

/**
 * Convert hex color to RGBA string
 * Supports both 6-digit (#RRGGBB) and 3-digit (#RGB) hex codes
 */
export function hexToRGBA(hex: string, alpha: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  let r: number, g: number, b: number;

  if (cleanHex.length === 3) {
    // 3-digit hex (#RGB)
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    // 6-digit hex (#RRGGBB)
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Clamp alpha between 0 and 1
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

/**
 * Returns a high-contrast foreground color for a given hex background.
 * Uses WCAG relative luminance thresholding.
 */
export function getContrastTextColor(
  backgroundHex: string,
  lightColor: string = '#FFFFFF',
  darkColor: string = '#0C0A09'
): string {
  const cleanHex = backgroundHex.replace('#', '');

  let r: number, g: number, b: number;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return lightColor;
  }

  const toLinear = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.55 ? darkColor : lightColor;
}
