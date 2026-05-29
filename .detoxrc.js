const androidAvdName = process.env.DETOX_ANDROID_AVD || 'TestEmulator';
const androidArchitectures = process.env.DETOX_ANDROID_ARCHS || 'x86_64,arm64-v8a';

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      build: [
        'E2E_TEST_MODE=1 EXPO_PUBLIC_E2E_TEST_MODE=1 xcodebuild -workspace ios/Ellie.xcworkspace -scheme Ellie -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 16" -derivedDataPath ios/build build',
        'APP="ios/build/Build/Products/Release-iphonesimulator/Ryvro.app"',
        'find "$APP/Frameworks" -type f | while read -r f; do if file "$f" | grep -q "Mach-O"; then codesign --force --sign - --timestamp=none "$f"; fi; done',
        'find "$APP/Frameworks" -type d -name "*.framework" -exec codesign --force --sign - --timestamp=none {} \\;',
        'codesign --force --sign - --deep --timestamp=none "$APP"',
      ].join(' && '),
      binaryPath: './ios/build/Build/Products/Release-iphonesimulator/Ryvro.app',
    },
    'android.release': {
      type: 'android.apk',
      build: `cd android && E2E_TEST_MODE=1 EXPO_PUBLIC_E2E_TEST_MODE=1 ./gradlew --no-daemon --no-parallel :app:assembleRelease :app:assembleAndroidTest -DtestBuildType=release -PreactNativeArchitectures=${androidArchitectures}`,
      binaryPath: './android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath:
        './android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16',
      },
    },
    'simulator.xsmax': {
      type: 'ios.simulator',
      device: {
        id: '0D934C32-AFB6-497E-8A1E-39F2DB3C447F',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: androidAvdName,
      },
    },
  },
  configurations: {
    'ios.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'ios.release.xsmax': {
      device: 'simulator.xsmax',
      app: 'ios.release',
    },
    'android.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
