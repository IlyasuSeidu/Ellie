import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const readOptional = (relativePath: string): string | null => {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
};

describe('Ryvro native wake-word assets', () => {
  it('uses Ryvro-branded native module identifiers', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'modules/ryvro-openwakeword'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'modules/ellie-openwakeword'))).toBe(false);

    const packageJson = JSON.parse(read('modules/ryvro-openwakeword/package.json')) as {
      name?: string;
      description?: string;
    };
    const expoModuleConfig = read('modules/ryvro-openwakeword/expo-module.config.json');
    const jsAdapter = read('src/services/openWakeWordNative.ts');

    expect(packageJson.name).toBe('ryvro-openwakeword');
    expect(packageJson.description).toContain('Ryvro');
    expect(expoModuleConfig).toContain('expo.modules.ryvroopenwakeword.RyvroOpenWakeWordModule');
    expect(jsAdapter).toContain("require('ryvro-openwakeword')");
    expect(jsAdapter).toContain("require('../../modules/ryvro-openwakeword/src')");
    expect(expoModuleConfig).not.toContain('ellieopenwakeword');
    expect(jsAdapter).not.toContain('ellie-openwakeword');
  });

  it('does not bundle retired Ellie classifier assets as launch defaults', () => {
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          'modules/ryvro-openwakeword/ios/Resources/openwakeword/hey_ellie_v0.1.onnx'
        )
      )
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          'modules/ryvro-openwakeword/android/src/main/assets/openwakeword/hey_ellie_v0.1.onnx'
        )
      )
    ).toBe(false);
  });

  it('uses Ryvro as the native fallback keyword label', () => {
    const iosModule = read('modules/ryvro-openwakeword/ios/RyvroOpenWakeWordModule.swift');
    const androidModule = read(
      'modules/ryvro-openwakeword/android/src/main/java/expo/modules/ryvroopenwakeword/RyvroOpenWakeWordModule.kt'
    );

    expect(iosModule).toContain('Name("RyvroOpenWakeWord")');
    expect(iosModule).toContain('keywordLabel = "Ryvro"');
    expect(iosModule).toContain('RyvroOpenWakeWordResources');
    expect(androidModule).toContain('Name("RyvroOpenWakeWord")');
    expect(androidModule).toContain('keywordLabel = "Ryvro"');
    expect(androidModule).toContain('package expo.modules.ryvroopenwakeword');
    expect(iosModule).not.toContain('Hey Ellie');
    expect(androidModule).not.toContain('Hey Ellie');
    expect(iosModule).not.toContain('EllieOpenWakeWord');
    expect(androidModule).not.toContain('EllieOpenWakeWord');
  });

  it('keeps generated iOS pods aligned with the Ryvro wake-word module when present', () => {
    const podfileLock = readOptional('ios/Podfile.lock');
    const podspec = readOptional('ios/Pods/Local Podspecs/RyvroOpenWakeWord.podspec.json');
    const retiredPodspecPath = path.join(
      process.cwd(),
      'ios/Pods/Local Podspecs/EllieOpenWakeWord.podspec.json'
    );

    if (!podfileLock && !podspec) {
      return;
    }

    if (podfileLock) {
      expect(podfileLock).toContain('RyvroOpenWakeWord');
      expect(podfileLock).toContain('../modules/ryvro-openwakeword/ios');
      expect(podfileLock).not.toContain('EllieOpenWakeWord');
      expect(podfileLock).not.toContain('../modules/ellie-openwakeword/ios');
    }

    if (podspec) {
      expect(podspec).toContain('"name": "RyvroOpenWakeWord"');
      expect(podspec).toContain('RyvroOpenWakeWordResources');
      expect(podspec).not.toContain('EllieOpenWakeWord');
    }

    expect(fs.existsSync(retiredPodspecPath)).toBe(false);
  });
});
