import fs from 'fs';
import path from 'path';

type PngSpec = {
  minBytes: number;
  width: number;
  height: number;
};

const root = process.cwd();
const pngSignature = '89504e470d0a1a0a';

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
