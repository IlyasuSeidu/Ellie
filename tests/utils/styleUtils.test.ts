// Mock Platform before importing react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  ViewStyle: {},
  TextStyle: {},
}));

import { Platform } from 'react-native';
import { getResponsiveSize, createShadow, createGoldGlow, hexToRGBA } from '@/utils/styleUtils';
import { colors, spacing } from '@/utils/theme';

describe('Style Utilities', () => {
  describe('getResponsiveSize', () => {
    it('should return original size for base width', () => {
      const size = 16;
      const baseWidth = 375;
      const result = getResponsiveSize(size, baseWidth);
      expect(result).toBe(16);
    });

    it('should scale up for larger screens', () => {
      const size = 16;
      const largeWidth = 768;
      const result = getResponsiveSize(size, largeWidth);
      expect(result).toBeGreaterThan(size);
    });

    it('should scale down for smaller screens', () => {
      const size = 16;
      const smallWidth = 320;
      const result = getResponsiveSize(size, smallWidth);
      expect(result).toBeLessThan(size);
    });

    it('should clamp scaling to minimum', () => {
      const size = 100;
      const tinyWidth = 100; // Would normally scale to 0.27x
      const result = getResponsiveSize(size, tinyWidth);
      expect(result).toBe(80); // 100 * 0.8 (min scale)
    });

    it('should clamp scaling to maximum', () => {
      const size = 100;
      const hugeWidth = 1920; // Would normally scale to 5.12x
      const result = getResponsiveSize(size, hugeWidth);
      expect(result).toBe(130); // 100 * 1.3 (max scale)
    });

    it('should return rounded integers', () => {
      const size = 15.7;
      const screenWidth = 400;
      const result = getResponsiveSize(size, screenWidth);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('createShadow', () => {
    beforeEach(() => {
      // Reset Platform.OS before each test
      jest.clearAllMocks();
    });

    it('should create iOS shadow with correct structure', () => {
      Platform.OS = 'ios';
      const elevation = 4;
      const shadow = createShadow(elevation);

      expect(shadow.shadowColor).toBe(colors.deepVoid);
      expect(shadow.shadowOffset).toBeDefined();
      expect(shadow.shadowOffset?.width).toBe(0);
      expect(shadow.shadowOffset?.height).toBe(2); // elevation / 2
      expect(shadow.shadowOpacity).toBeDefined();
      expect(shadow.shadowRadius).toBe(4);
    });

    it('should create Android elevation with correct structure', () => {
      Platform.OS = 'android';
      const elevation = 4;
      const shadow = createShadow(elevation);

      expect(shadow.elevation).toBe(4);
      expect(shadow.shadowColor).toBeUndefined();
    });

    it('should increase shadow intensity with higher elevation (iOS)', () => {
      Platform.OS = 'ios';
      const lowElevation = createShadow(2);
      const highElevation = createShadow(8);

      expect(highElevation.shadowOpacity as number).toBeGreaterThan(
        lowElevation.shadowOpacity as number
      );
      expect(highElevation.shadowRadius as number).toBeGreaterThan(
        lowElevation.shadowRadius as number
      );
    });

    it('should pass through elevation value (Android)', () => {
      Platform.OS = 'android';
      expect(createShadow(2).elevation).toBe(2);
      expect(createShadow(8).elevation).toBe(8);
      expect(createShadow(16).elevation).toBe(16);
    });
  });

  describe('createGoldGlow', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create gold glow effect on iOS', () => {
      Platform.OS = 'ios';
      const glow = createGoldGlow();

      expect(glow.shadowColor).toBe(colors.sacredGold);
      expect(glow.shadowOffset).toEqual({ width: 0, height: 0 });
      expect(glow.shadowOpacity).toBe(0.3);
      expect(glow.shadowRadius).toBe(spacing.sm); // default intensity
    });

    it('should use custom intensity on iOS', () => {
      Platform.OS = 'ios';
      const customIntensity = 16;
      const glow = createGoldGlow(customIntensity);

      expect(glow.shadowRadius).toBe(customIntensity);
    });

    it('should fall back to elevation on Android', () => {
      Platform.OS = 'android';
      const glow = createGoldGlow();

      expect(glow.elevation).toBe(4);
      expect(glow.shadowColor).toBeUndefined();
    });
  });

  describe('hexToRGBA', () => {
    it('should convert 6-digit hex to RGBA', () => {
      const result = hexToRGBA('#b45309', 0.5);
      expect(result).toBe('rgba(180, 83, 9, 0.5)');
    });

    it('should convert 3-digit hex to RGBA', () => {
      const result = hexToRGBA('#abc', 0.8);
      expect(result).toBe('rgba(170, 187, 204, 0.8)');
    });

    it('should handle hex without # prefix', () => {
      const result = hexToRGBA('b45309', 0.3);
      expect(result).toBe('rgba(180, 83, 9, 0.3)');
    });

    it('should clamp alpha to 0', () => {
      const result = hexToRGBA('#ffffff', -0.5);
      expect(result).toBe('rgba(255, 255, 255, 0)');
    });

    it('should clamp alpha to 1', () => {
      const result = hexToRGBA('#000000', 1.5);
      expect(result).toBe('rgba(0, 0, 0, 1)');
    });

    it('should handle full transparency', () => {
      const result = hexToRGBA('#ff0000', 0);
      expect(result).toBe('rgba(255, 0, 0, 0)');
    });

    it('should handle full opacity', () => {
      const result = hexToRGBA('#00ff00', 1);
      expect(result).toBe('rgba(0, 255, 0, 1)');
    });

    it('should throw error for invalid hex length', () => {
      expect(() => hexToRGBA('#12', 0.5)).toThrow('Invalid hex color: #12');
      expect(() => hexToRGBA('#1234567', 0.5)).toThrow('Invalid hex color: #1234567');
    });

    it('should convert Sacred palette colors', () => {
      // Test with actual colors from the theme
      const goldRgba = hexToRGBA(colors.sacredGold, 0.1);
      expect(goldRgba).toBe('rgba(180, 83, 9, 0.1)');

      const voidRgba = hexToRGBA(colors.deepVoid, 0.9);
      expect(voidRgba).toBe('rgba(12, 10, 9, 0.9)');
    });

    it('should handle lowercase hex', () => {
      const result = hexToRGBA('#b45309', 0.5);
      expect(result).toBe('rgba(180, 83, 9, 0.5)');
    });

    it('should handle uppercase hex', () => {
      const result = hexToRGBA('#B45309', 0.5);
      expect(result).toBe('rgba(180, 83, 9, 0.5)');
    });

    it('should handle mixed case hex', () => {
      const result = hexToRGBA('#B4530a', 0.5);
      expect(result).toBe('rgba(180, 83, 10, 0.5)');
    });
  });
});
