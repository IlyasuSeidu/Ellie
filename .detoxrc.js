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
      build:
        'eas build --platform ios --profile preview --local --output ./ios/build/Ellie.app --non-interactive',
      binaryPath: './ios/build/Ellie.app',
    },
    'android.release': {
      type: 'android.apk',
      build:
        'eas build --platform android --profile preview --local --output ./android/app/build/Ellie.apk --non-interactive',
      binaryPath: './android/app/build/Ellie.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro',
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
