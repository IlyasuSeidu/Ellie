import fs from 'fs';
import path from 'path';

type PngSpec = {
  minBytes: number;
  width: number;
  height: number;
};

const root = process.cwd();
const pngSignature = '89504e470d0a1a0a';
const densityDirs = ['1x', '2x', '3x'] as const;

const readPng = (relativePath: string): Buffer => {
  const absolutePath = path.join(root, relativePath);
  expect(fs.existsSync(absolutePath)).toBe(true);
  return fs.readFileSync(absolutePath);
};

const expectPngAsset = (relativePath: string, spec: PngSpec): void => {
  const file = readPng(relativePath);

  expect(file.length).toBeGreaterThanOrEqual(spec.minBytes);
  expect(file.subarray(0, 8).toString('hex')).toBe(pngSignature);
  expect(file.readUInt32BE(16)).toBe(spec.width);
  expect(file.readUInt32BE(20)).toBe(spec.height);
};

const readPngDimensions = (relativePath: string): Pick<PngSpec, 'width' | 'height'> => {
  const file = readPng(relativePath);

  expect(file.length).toBeGreaterThan(100);
  expect(file.subarray(0, 8).toString('hex')).toBe(pngSignature);

  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
};

const pngFilesIn = (relativeDir: string): string[] =>
  fs
    .readdirSync(path.join(root, relativeDir))
    .filter((file) => file.endsWith('.png'))
    .sort();

const consolidatedBaseName = (filename: string): string => filename.replace(/@\dx\.png$/, '.png');

const consolidatedVariantName = (
  baseName: string,
  density: (typeof densityDirs)[number]
): string => (density === '1x' ? baseName : baseName.replace(/\.png$/, `@${density}.png`));

describe('Ryvro launch assets', () => {
  it('keeps production Expo image assets present at release-ready dimensions', () => {
    expectPngAsset('assets/icon.png', {
      minBytes: 100_000,
      width: 1024,
      height: 1024,
    });
    expectPngAsset('assets/adaptive-icon.png', {
      minBytes: 100_000,
      width: 1024,
      height: 1024,
    });
    expectPngAsset('assets/splash-icon.png', {
      minBytes: 100_000,
      width: 1024,
      height: 1024,
    });
    expectPngAsset('assets/favicon.png', {
      minBytes: 1_000,
      width: 48,
      height: 48,
    });
  });

  it('keeps the Ryvro assistant mark bundled in standard 1x, 2x, and 3x sizes', () => {
    expectPngAsset('assets/onboarding/icons/consolidated/ryvro-shift-assistant.png', {
      minBytes: 8_000,
      width: 512,
      height: 512,
    });
    expectPngAsset('assets/onboarding/icons/consolidated/ryvro-shift-assistant@2x.png', {
      minBytes: 18_000,
      width: 1024,
      height: 1024,
    });
    expectPngAsset('assets/onboarding/icons/consolidated/ryvro-shift-assistant@3x.png', {
      minBytes: 30_000,
      width: 1536,
      height: 1536,
    });
  });

  it('keeps every active onboarding icon density present and renderable', () => {
    const filesByDensity = Object.fromEntries(
      densityDirs.map((density) => [density, pngFilesIn(`assets/onboarding/icons/${density}`)])
    ) as Record<(typeof densityDirs)[number], string[]>;

    expect(filesByDensity['1x'].length).toBeGreaterThanOrEqual(46);
    expect(filesByDensity['2x']).toEqual(filesByDensity['1x']);
    expect(filesByDensity['3x']).toEqual(filesByDensity['1x']);

    filesByDensity['1x'].forEach((filename) => {
      const oneX = readPngDimensions(`assets/onboarding/icons/1x/${filename}`);
      const twoX = readPngDimensions(`assets/onboarding/icons/2x/${filename}`);
      const threeX = readPngDimensions(`assets/onboarding/icons/3x/${filename}`);

      expect(twoX.width).toBe(oneX.width * 2);
      expect(twoX.height).toBe(oneX.height * 2);
      expect(threeX.width).toBeGreaterThanOrEqual(oneX.width * 3);
      expect(threeX.height).toBeGreaterThanOrEqual(oneX.height * 3);
    });
  });

  it('keeps the consolidated onboarding icon bundle complete for Metro resolution lookup', () => {
    const consolidatedFiles = pngFilesIn('assets/onboarding/icons/consolidated');
    const groupedByBaseName = consolidatedFiles.reduce<Record<string, string[]>>(
      (acc, filename) => {
        const baseName = consolidatedBaseName(filename);
        acc[baseName] = [...(acc[baseName] ?? []), filename];
        return acc;
      },
      {}
    );

    [
      'roster-type-fifo.png',
      'roster-type-rotating.png',
      'rotating-calendar-wheel.png',
      'shift-pattern-fifo-14-14.png',
      'shift-pattern-fifo-8-6.png',
      'ryvro-shift-assistant.png',
      'timeline-day-shift-sun.png',
      'timeline-night-shift-moon.png',
      'tips-lightbulb-glowing-small.png',
    ].forEach((expectedAsset) => {
      expect(Object.prototype.hasOwnProperty.call(groupedByBaseName, expectedAsset)).toBe(true);
    });

    Object.entries(groupedByBaseName).forEach(([baseName, variants]) => {
      expect(variants.sort()).toEqual(
        densityDirs.map((density) => consolidatedVariantName(baseName, density)).sort()
      );

      const oneX = readPngDimensions(`assets/onboarding/icons/consolidated/${baseName}`);
      const twoX = readPngDimensions(
        `assets/onboarding/icons/consolidated/${consolidatedVariantName(baseName, '2x')}`
      );
      const threeX = readPngDimensions(
        `assets/onboarding/icons/consolidated/${consolidatedVariantName(baseName, '3x')}`
      );

      expect(twoX.width).toBe(oneX.width * 2);
      expect(twoX.height).toBe(oneX.height * 2);
      expect(threeX.width).toBeGreaterThanOrEqual(oneX.width * 3);
      expect(threeX.height).toBeGreaterThanOrEqual(oneX.height * 3);
    });
  });

  it('does not keep retired helmet assistant art in active bundled image paths', () => {
    const activeImagePaths = fs
      .readdirSync(path.join(root, 'assets/onboarding/icons/consolidated'))
      .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file));

    expect(activeImagePaths).toContain('ryvro-shift-assistant.png');
    expect(activeImagePaths.some((file) => /helmet|hardhat|mining-helmet|ellie/i.test(file))).toBe(
      false
    );
  });
});
