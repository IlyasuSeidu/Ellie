import { ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/utils/theme';
import { hexToRGBA } from '@/utils/styleUtils';

/**
 * Shift pattern color mappings
 * Maps shift types to their corresponding colors from the Sacred palette
 */
export const shiftColors = {
  day: {
    primary: colors.brightGold, // #d97706
    background: hexToRGBA(colors.brightGold, 0.1),
    border: hexToRGBA(colors.brightGold, 0.3),
    text: colors.brightGold,
  },
  night: {
    primary: colors.sacredGold, // #b45309
    background: hexToRGBA(colors.sacredGold, 0.1),
    border: hexToRGBA(colors.sacredGold, 0.3),
    text: colors.sacredGold,
  },
  off: {
    primary: colors.dust, // #a8a29e
    background: hexToRGBA(colors.dust, 0.05),
    border: hexToRGBA(colors.dust, 0.2),
    text: colors.dust,
  },
} as const;

/**
 * Calendar day state styles
 * Used for rendering calendar days with different states
 */
export const calendarDayStyles = {
  container: {
    base: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      margin: spacing.xs / 2,
    } as ViewStyle,

    today: {
      borderWidth: 2,
      borderColor: colors.sacredGold,
    } as ViewStyle,

    selected: {
      backgroundColor: colors.sacredGold,
    } as ViewStyle,

    disabled: {
      opacity: 0.3,
    } as ViewStyle,

    offDay: {
      backgroundColor: hexToRGBA(colors.dust, 0.1),
    } as ViewStyle,

    dayShift: {
      backgroundColor: hexToRGBA(colors.brightGold, 0.15),
    } as ViewStyle,

    nightShift: {
      backgroundColor: hexToRGBA(colors.sacredGold, 0.15),
    } as ViewStyle,
  },

  text: {
    base: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.medium,
      color: colors.paper,
    } as TextStyle,

    today: {
      fontWeight: typography.fontWeights.bold,
      color: colors.sacredGold,
    } as TextStyle,

    selected: {
      color: colors.deepVoid,
      fontWeight: typography.fontWeights.bold,
    } as TextStyle,

    disabled: {
      color: colors.dust,
    } as TextStyle,

    otherMonth: {
      color: colors.dust,
      opacity: 0.5,
    } as TextStyle,
  },
} as const;

/**
 * Notification type styles
 * Different visual treatments for various notification types
 */
export const notificationStyles = {
  shiftReminder: {
    container: {
      backgroundColor: colors.darkStone,
      borderLeftWidth: 4,
      borderLeftColor: colors.sacredGold,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    } as ViewStyle,
    icon: {
      color: colors.sacredGold,
    } as TextStyle,
    title: {
      color: colors.paper,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    } as TextStyle,
    message: {
      color: colors.dust,
      fontSize: typography.fontSizes.sm,
    } as TextStyle,
  },

  success: {
    container: {
      backgroundColor: colors.darkStone,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    } as ViewStyle,
    icon: {
      color: colors.success,
    } as TextStyle,
    title: {
      color: colors.paper,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    } as TextStyle,
    message: {
      color: colors.dust,
      fontSize: typography.fontSizes.sm,
    } as TextStyle,
  },

  warning: {
    container: {
      backgroundColor: colors.darkStone,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    } as ViewStyle,
    icon: {
      color: colors.warning,
    } as TextStyle,
    title: {
      color: colors.paper,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    } as TextStyle,
    message: {
      color: colors.dust,
      fontSize: typography.fontSizes.sm,
    } as TextStyle,
  },

  error: {
    container: {
      backgroundColor: colors.darkStone,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    } as ViewStyle,
    icon: {
      color: colors.error,
    } as TextStyle,
    title: {
      color: colors.paper,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    } as TextStyle,
    message: {
      color: colors.dust,
      fontSize: typography.fontSizes.sm,
    } as TextStyle,
  },
} as const;

/**
 * Common card styles with Sacred design system
 */
export const cardStyles = {
  base: {
    backgroundColor: colors.darkStone,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.softStone,
  } as ViewStyle,

  elevated: {
    backgroundColor: colors.darkStone,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  } as ViewStyle,

  interactive: {
    backgroundColor: colors.darkStone,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.softStone,
  } as ViewStyle,

  interactivePressed: {
    backgroundColor: hexToRGBA(colors.sacredGold, 0.05),
    borderColor: hexToRGBA(colors.sacredGold, 0.3),
  } as ViewStyle,
} as const;

/**
 * Button styles with Sacred design system
 */
export const buttonStyles = {
  primary: {
    container: {
      backgroundColor: colors.sacredGold,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    text: {
      color: colors.deepVoid,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.bold,
    } as TextStyle,
    pressed: {
      backgroundColor: colors.brightGold,
    } as ViewStyle,
  },

  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.sacredGold,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    text: {
      color: colors.sacredGold,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.bold,
    } as TextStyle,
    pressed: {
      backgroundColor: hexToRGBA(colors.sacredGold, 0.1),
    } as ViewStyle,
  },

  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    text: {
      color: colors.paper,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    } as TextStyle,
    pressed: {
      backgroundColor: hexToRGBA(colors.softStone, 0.5),
    } as ViewStyle,
  },
} as const;
