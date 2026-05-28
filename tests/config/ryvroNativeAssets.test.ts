import fs from 'fs';
import path from 'path';

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Ryvro native wake-word assets', () => {
  it('does not bundle retired Ellie classifier assets as launch defaults', () => {
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          'modules/ellie-openwakeword/ios/Resources/openwakeword/hey_ellie_v0.1.onnx'
        )
      )
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          process.cwd(),
          'modules/ellie-openwakeword/android/src/main/assets/openwakeword/hey_ellie_v0.1.onnx'
        )
      )
    ).toBe(false);
  });

  it('uses Ryvro as the native fallback keyword label', () => {
    expect(read('modules/ellie-openwakeword/ios/EllieOpenWakeWordModule.swift')).not.toContain(
      'Hey Ellie'
    );
    expect(
      read(
        'modules/ellie-openwakeword/android/src/main/java/expo/modules/ellieopenwakeword/EllieOpenWakeWordModule.kt'
      )
    ).not.toContain('Hey Ellie');
  });
});
