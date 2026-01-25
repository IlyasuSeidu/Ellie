import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  animations,
  theme,
} from '@/utils/theme';

describe('Theme', () => {
  describe('Colors', () => {
    it('should have all required color properties', () => {
      expect(colors.deepVoid).toBeDefined();
      expect(colors.darkStone).toBeDefined();
      expect(colors.softStone).toBeDefined();
      expect(colors.sacredGold).toBeDefined();
      expect(colors.brightGold).toBeDefined();
      expect(colors.paleGold).toBeDefined();
      expect(colors.paper).toBeDefined();
      expect(colors.dust).toBeDefined();
      expect(colors.shadow).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
    });

    it('should have valid hex color format', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(colors.deepVoid).toMatch(hexRegex);
      expect(colors.darkStone).toMatch(hexRegex);
      expect(colors.softStone).toMatch(hexRegex);
      expect(colors.sacredGold).toMatch(hexRegex);
      expect(colors.brightGold).toMatch(hexRegex);
      expect(colors.paleGold).toMatch(hexRegex);
      expect(colors.paper).toMatch(hexRegex);
      expect(colors.dust).toMatch(hexRegex);
      expect(colors.shadow).toMatch(hexRegex);
      expect(colors.success).toMatch(hexRegex);
      expect(colors.warning).toMatch(hexRegex);
      expect(colors.error).toMatch(hexRegex);
    });

    it('should have opacity helpers', () => {
      expect(colors.opacity.gold5).toBeDefined();
      expect(colors.opacity.gold10).toBeDefined();
      expect(colors.opacity.gold20).toBeDefined();
      expect(colors.opacity.gold30).toBeDefined();
    });

    it('should have valid RGBA format for opacity helpers', () => {
      const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;
      expect(colors.opacity.gold5).toMatch(rgbaRegex);
      expect(colors.opacity.gold10).toMatch(rgbaRegex);
      expect(colors.opacity.gold20).toMatch(rgbaRegex);
      expect(colors.opacity.gold30).toMatch(rgbaRegex);
    });
  });

  describe('Typography', () => {
    it('should have font sizes', () => {
      expect(typography.fontSizes.xs).toBe(12);
      expect(typography.fontSizes.sm).toBe(14);
      expect(typography.fontSizes.md).toBe(16);
      expect(typography.fontSizes.lg).toBe(18);
      expect(typography.fontSizes.xl).toBe(24);
      expect(typography.fontSizes.xxl).toBe(32);
      expect(typography.fontSizes.xxxl).toBe(40);
    });

    it('should have font weights', () => {
      expect(typography.fontWeights.regular).toBe('400');
      expect(typography.fontWeights.medium).toBe('500');
      expect(typography.fontWeights.semibold).toBe('600');
      expect(typography.fontWeights.bold).toBe('700');
      expect(typography.fontWeights.black).toBe('900');
    });

    it('should have line heights', () => {
      expect(typography.lineHeights.tight).toBe(1.2);
      expect(typography.lineHeights.normal).toBe(1.5);
      expect(typography.lineHeights.relaxed).toBe(1.8);
    });

    it('should have ascending font sizes', () => {
      expect(typography.fontSizes.xs).toBeLessThan(typography.fontSizes.sm);
      expect(typography.fontSizes.sm).toBeLessThan(typography.fontSizes.md);
      expect(typography.fontSizes.md).toBeLessThan(typography.fontSizes.lg);
      expect(typography.fontSizes.lg).toBeLessThan(typography.fontSizes.xl);
      expect(typography.fontSizes.xl).toBeLessThan(typography.fontSizes.xxl);
      expect(typography.fontSizes.xxl).toBeLessThan(typography.fontSizes.xxxl);
    });
  });

  describe('Spacing', () => {
    it('should have all spacing values', () => {
      expect(spacing.xs).toBe(4);
      expect(spacing.sm).toBe(8);
      expect(spacing.md).toBe(16);
      expect(spacing.lg).toBe(24);
      expect(spacing.xl).toBe(32);
      expect(spacing.xxl).toBe(48);
      expect(spacing.xxxl).toBe(64);
    });

    it('should have ascending spacing values', () => {
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
      expect(spacing.lg).toBeLessThan(spacing.xl);
      expect(spacing.xl).toBeLessThan(spacing.xxl);
      expect(spacing.xxl).toBeLessThan(spacing.xxxl);
    });
  });

  describe('Border Radius', () => {
    it('should have all border radius values', () => {
      expect(borderRadius.sm).toBe(8);
      expect(borderRadius.md).toBe(12);
      expect(borderRadius.lg).toBe(16);
      expect(borderRadius.xl).toBe(24);
      expect(borderRadius.full).toBe(9999);
    });

    it('should have ascending border radius values', () => {
      expect(borderRadius.sm).toBeLessThan(borderRadius.md);
      expect(borderRadius.md).toBeLessThan(borderRadius.lg);
      expect(borderRadius.lg).toBeLessThan(borderRadius.xl);
    });
  });

  describe('Shadows', () => {
    it('should have iOS shadow definitions', () => {
      expect(shadows.ios.small).toBeDefined();
      expect(shadows.ios.medium).toBeDefined();
      expect(shadows.ios.large).toBeDefined();
      expect(shadows.ios.goldGlow).toBeDefined();
    });

    it('should have Android elevation definitions', () => {
      expect(shadows.android.small).toBeDefined();
      expect(shadows.android.medium).toBeDefined();
      expect(shadows.android.large).toBeDefined();
    });

    it('should have valid iOS shadow structure', () => {
      expect(shadows.ios.small.shadowColor).toBeDefined();
      expect(shadows.ios.small.shadowOffset).toBeDefined();
      expect(shadows.ios.small.shadowOpacity).toBeDefined();
      expect(shadows.ios.small.shadowRadius).toBeDefined();
    });

    it('should have valid Android elevation structure', () => {
      expect(shadows.android.small.elevation).toBeDefined();
      expect(typeof shadows.android.small.elevation).toBe('number');
    });

    it('should have gold glow shadow with correct color', () => {
      expect(shadows.ios.goldGlow.shadowColor).toBe(colors.sacredGold);
    });
  });

  describe('Breakpoints', () => {
    it('should have all breakpoint values', () => {
      expect(breakpoints.mobile).toBe(0);
      expect(breakpoints.tablet).toBe(768);
      expect(breakpoints.desktop).toBe(1024);
    });

    it('should have ascending breakpoint values', () => {
      expect(breakpoints.mobile).toBeLessThan(breakpoints.tablet);
      expect(breakpoints.tablet).toBeLessThan(breakpoints.desktop);
    });
  });

  describe('Animations', () => {
    it('should have animation duration values', () => {
      expect(animations.fast).toBe(150);
      expect(animations.normal).toBe(300);
      expect(animations.slow).toBe(500);
    });

    it('should have ascending duration values', () => {
      expect(animations.fast).toBeLessThan(animations.normal);
      expect(animations.normal).toBeLessThan(animations.slow);
    });
  });

  describe('Theme Object', () => {
    it('should export complete theme object', () => {
      expect(theme).toBeDefined();
      expect(theme.colors).toEqual(colors);
      expect(theme.typography).toEqual(typography);
      expect(theme.spacing).toEqual(spacing);
      expect(theme.borderRadius).toEqual(borderRadius);
      expect(theme.shadows).toEqual(shadows);
      expect(theme.breakpoints).toEqual(breakpoints);
      expect(theme.animations).toEqual(animations);
    });

    it('should have all theme properties', () => {
      expect(Object.keys(theme)).toEqual([
        'colors',
        'typography',
        'spacing',
        'borderRadius',
        'shadows',
        'breakpoints',
        'animations',
      ]);
    });
  });
});
