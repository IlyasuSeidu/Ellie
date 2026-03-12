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
        'xcodebuild -workspace ios/Ellie.xcworkspace -scheme Ellie -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 16 Pro" -derivedDataPath ios/build build',
        'APP="ios/build/Build/Products/Release-iphonesimulator/EllieMinerShiftAssistant.app"',
        'find "$APP/Frameworks" -type f | while read -r f; do if file "$f" | grep -q "Mach-O"; then codesign --force --sign - --timestamp=none "$f"; fi; done',
        'find "$APP/Frameworks" -type d -name "*.framework" -exec codesign --force --sign - --timestamp=none {} \\;',
        'codesign --force --sign - --deep --timestamp=none "$APP"',
      ].join(' && '),
      binaryPath: './ios/build/Build/Products/Release-iphonesimulator/EllieMinerShiftAssistant.app',
    },
    'android.release': {
      type: 'android.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
      binaryPath: './android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath:
        './android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
