import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';

const walkFiles = (dir: string): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
};

describe('Ryvro environment template', () => {
  const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
  const productionEnvExample = fs.readFileSync(
    path.join(process.cwd(), '.env.production.example'),
    'utf8'
  );
  const envConfigurationTemplate = fs.readFileSync(
    path.join(process.cwd(), 'RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md'),
    'utf8'
  );
  const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8')) as {
    expo?: {
      name?: string;
      slug?: string;
      scheme?: string;
      version?: string;
      icon?: string;
      splash?: {
        image?: string;
      };
      ios?: {
        bundleIdentifier?: string;
        buildNumber?: string;
        googleServicesFile?: string;
        infoPlist?: Record<string, unknown>;
      };
      android?: {
        package?: string;
        versionCode?: number;
        googleServicesFile?: string;
        adaptiveIcon?: {
          foregroundImage?: string;
        };
      };
      web?: {
        favicon?: string;
      };
    };
  };
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
  ) as {
    version?: string;
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const easJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'eas.json'), 'utf8')) as {
    cli?: {
      appVersionSource?: string;
    };
    build?: {
      development?: {
        distribution?: string;
        developmentClient?: boolean;
      };
      preview?: {
        distribution?: string;
      };
      production?: {
        ios?: {
          buildConfiguration?: string;
        };
        android?: {
          buildType?: string;
        };
      };
    };
    submit?: {
      production?: {
        ios?: {
          appleId?: string;
          ascAppId?: string;
          appleTeamId?: string;
        };
        android?: {
          serviceAccountKeyPath?: string;
          track?: string;
        };
      };
    };
  };

  const readOptional = (relativePath: string): string | null => {
    const absolutePath = path.join(process.cwd(), relativePath);
    return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
  };

  const readLocale = (locale: string, file: string): Record<string, unknown> =>
    JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales', locale, file), 'utf8')
    ) as Record<string, unknown>;

  const getNestedString = (source: Record<string, unknown>, key: string): string | undefined => {
    const value = key.split('.').reduce<unknown>((current, part) => {
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }
      return (current as Record<string, unknown>)[part];
    }, source);

    return typeof value === 'string' ? value : undefined;
  };

  const validProductionEnv = [
    'APP_ENV=production',
    'EAS_PROJECT_ID=3dcb1926-9b5b-4f20-93b1-2f5b8f490000',
    'FIREBASE_API_KEY=AIzaSyRyvroProd1234567890abcdefghiJKLMN',
    'FIREBASE_AUTH_DOMAIN=ryvro-prod.firebaseapp.com',
    'FIREBASE_PROJECT_ID=ryvro-prod',
    'FIREBASE_STORAGE_BUCKET=ryvro-prod.firebasestorage.app',
    'FIREBASE_MESSAGING_SENDER_ID=123456789012',
    'FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890',
    'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist',
    'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json',
    'API_BASE_URL=https://api.getryvro.com',
    'GOOGLE_WEB_CLIENT_ID=1234567890-web.apps.googleusercontent.com',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-web.apps.googleusercontent.com',
    'GOOGLE_IOS_CLIENT_ID=1234567890-ios.apps.googleusercontent.com',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-ios.apps.googleusercontent.com',
    'RYVRO_BRAIN_URL=https://us-central1-ryvro-prod.cloudfunctions.net/ryvroBrain',
    'REVENUECAT_IOS_KEY=appl_liveios123',
    'EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_liveios123',
    'REVENUECAT_ANDROID_KEY=goog_liveandroid123',
    'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_liveandroid123',
    'REVENUECAT_ENTITLEMENT_ID=pro',
    'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro',
    'LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy',
    'LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms',
    'SUPPORT_URL=https://getryvro.com/support',
    'ACCOUNT_DELETION_URL=https://getryvro.com/delete-account',
    'AI_SHIFT_BUILDER_ENABLED=true',
    [
      'SHIFT_SCHEDULE_PARSER_URL=',
      'https://us-central1-ryvro-prod.cloudfunctions.net/parseShiftScheduleDescription',
    ].join(''),
  ].join('\n');

  const runProductionEnvCheck = (envContent: string) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ryvro-env-check-'));
    const envPath = path.join(tempDir, '.env.production');
    fs.writeFileSync(
      path.join(tempDir, 'GoogleService-Info.plist'),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<plist version="1.0">',
        '<dict>',
        '<key>BUNDLE_ID</key>',
        '<string>com.ryvro.shiftplanner</string>',
        '<key>PROJECT_ID</key>',
        '<string>ryvro-prod</string>',
        '<key>GOOGLE_APP_ID</key>',
        '<string>1:123456789012:ios:abcdef1234567890</string>',
        '</dict>',
        '</plist>',
      ].join('\n')
    );
    fs.writeFileSync(
      path.join(tempDir, 'google-services.json'),
      JSON.stringify(
        {
          project_info: {
            project_number: '123456789012',
            project_id: 'ryvro-prod',
            storage_bucket: 'ryvro-prod.firebasestorage.app',
          },
          client: [
            {
              client_info: {
                mobilesdk_app_id: '1:123456789012:android:abcdef1234567890',
                android_client_info: {
                  package_name: 'com.ryvro.shiftplanner',
                },
              },
              api_key: [{ current_key: 'AIzaSyRyvroProd1234567890abcdefghiJKLMN' }],
            },
          ],
          configuration_version: '1',
        },
        null,
        2
      )
    );
    fs.writeFileSync(envPath, envContent);

    return spawnSync(
      process.execPath,
      ['scripts/verify-ryvro-production-env.js', '--env-file', envPath],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          NODE_ENV: process.env.NODE_ENV ?? 'test',
          PATH: process.env.PATH,
        },
      }
    );
  };

  it('uses Ryvro defaults for public launch configuration', () => {
    expect(envExample).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envConfigurationTemplate).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envExample).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envConfigurationTemplate).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envExample).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist');
    expect(envExample).toContain('EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json');
    expect(productionEnvExample).toContain(
      'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist'
    );
    expect(productionEnvExample).toContain(
      'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json'
    );
    expect(envConfigurationTemplate).toContain(
      'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist'
    );
    expect(envConfigurationTemplate).toContain(
      'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json'
    );
    expect(envExample).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
    const wakeWordGuide = fs.readFileSync(
      path.join(process.cwd(), 'docs/wake-word-ryvro.md'),
      'utf8'
    );
    expect(wakeWordGuide).toContain('<repo-root>/ios/RyvroShiftPlanner/ryvro_ios.ppn');
    expect(wakeWordGuide).toContain('<repo-root>/ios/RyvroShiftPlanner.xcworkspace');
    expect(wakeWordGuide).not.toContain('<repo-root>/ios/Ellie/ryvro_ios.ppn');
    expect(envExample).toContain('OPENWAKEWORD_MODEL_PATH=');
    expect(envConfigurationTemplate).toContain('OPENWAKEWORD_MODEL_PATH=');
    expect(envConfigurationTemplate).not.toContain('OPENWAKEWORD_MODEL_PATH=openwakeword/');
  });

  it('pins tracked Expo identity to Ryvro launch values', () => {
    expect(appJson.expo?.name).toBe('Ryvro Shift Planner');
    expect(appJson.expo?.slug).toBe('ryvro');
    expect(appJson.expo?.scheme).toBe('ryvro');
    expect(appJson.expo?.ios?.bundleIdentifier).toBe('com.ryvro.shiftplanner');
    expect(appJson.expo?.android?.package).toBe('com.ryvro.shiftplanner');
  });

  it('pins dynamic Expo config to Ryvro identity even without inherited static config', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buildAppConfig = require('../../app.config.js') as (params: {
      config?: Record<string, unknown>;
    }) => {
      name?: string;
      slug?: string;
      scheme?: string;
      version?: string;
      icon?: string;
      splash?: { image?: string };
      ios?: {
        bundleIdentifier?: string;
        buildNumber?: string;
        googleServicesFile?: string;
        supportsTablet?: boolean;
        usesAppleSignIn?: boolean;
        infoPlist?: Record<string, unknown>;
      };
      android?: {
        package?: string;
        versionCode?: number;
        googleServicesFile?: string;
        edgeToEdgeEnabled?: boolean;
        predictiveBackGestureEnabled?: boolean;
        permissions?: string[];
        adaptiveIcon?: { foregroundImage?: string };
      };
      web?: { favicon?: string };
      plugins?: unknown[];
      extra?: Record<string, unknown>;
    };

    const previousIosGoogleServices = process.env.EXPO_IOS_GOOGLE_SERVICES_FILE;
    const previousAndroidGoogleServices = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE;
    const previousFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    const previousRyvroBrainUrl = process.env.RYVRO_BRAIN_URL;
    const previousRyvroBrainTimeout = process.env.RYVRO_BRAIN_TIMEOUT;
    const previousShiftScheduleParserUrl = process.env.SHIFT_SCHEDULE_PARSER_URL;
    process.env.EXPO_IOS_GOOGLE_SERVICES_FILE = './GoogleService-Info.plist';
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE = './google-services.json';
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.RYVRO_BRAIN_URL;
    delete process.env.RYVRO_BRAIN_TIMEOUT;
    delete process.env.SHIFT_SCHEDULE_PARSER_URL;

    try {
      const dynamicConfig = buildAppConfig({ config: {} });

      expect(dynamicConfig.name).toBe('Ryvro Shift Planner');
      expect(dynamicConfig.slug).toBe('ryvro');
      expect(dynamicConfig.scheme).toBe('ryvro');
      expect(dynamicConfig.version).toBe('1.0.0');
      expect(dynamicConfig.icon).toBe('./assets/icon.png');
      expect(dynamicConfig.splash?.image).toBe('./assets/splash-icon.png');
      expect(dynamicConfig.ios?.bundleIdentifier).toBe('com.ryvro.shiftplanner');
      expect(dynamicConfig.ios?.buildNumber).toBe('1');
      expect(dynamicConfig.ios?.googleServicesFile).toBe('./GoogleService-Info.plist');
      expect(dynamicConfig.ios?.supportsTablet).toBe(true);
      expect(dynamicConfig.ios?.usesAppleSignIn).toBe(true);
      expect(dynamicConfig.ios?.infoPlist).toMatchObject({
        CFBundleDisplayName: 'Ryvro',
        NSSpeechRecognitionUsageDescription:
          'Ryvro needs speech recognition to understand your questions.',
        NSMicrophoneUsageDescription: 'Ryvro needs microphone access for voice commands.',
        ITSAppUsesNonExemptEncryption: false,
      });
      expect(dynamicConfig.android?.package).toBe('com.ryvro.shiftplanner');
      expect(dynamicConfig.android?.versionCode).toBe(1);
      expect(dynamicConfig.android?.edgeToEdgeEnabled).toBe(true);
      expect(dynamicConfig.android?.predictiveBackGestureEnabled).toBe(false);
      expect(dynamicConfig.android?.permissions).toEqual(['android.permission.RECORD_AUDIO']);
      expect(dynamicConfig.android?.adaptiveIcon?.foregroundImage).toBe(
        './assets/adaptive-icon.png'
      );
      expect(dynamicConfig.android?.googleServicesFile).toBe('./google-services.json');
      expect(dynamicConfig.web?.favicon).toBe('./assets/favicon.png');
      expect(dynamicConfig.plugins).toEqual(
        expect.arrayContaining([
          'expo-localization',
          'expo-font',
          'expo-asset',
          '@react-native-firebase/app',
          '@react-native-firebase/auth',
          expect.arrayContaining(['expo-build-properties']),
          expect.arrayContaining(['@react-native-google-signin/google-signin']),
          expect.arrayContaining(['expo-image-picker']),
          expect.arrayContaining(['expo-speech-recognition']),
        ])
      );
      expect(dynamicConfig.extra?.LEGAL_PRIVACY_POLICY_URL).toBe('https://getryvro.com/privacy');
      expect(dynamicConfig.extra?.LEGAL_TERMS_OF_SERVICE_URL).toBe('https://getryvro.com/terms');
      expect(dynamicConfig.extra?.SUPPORT_URL).toBe('https://getryvro.com/support');
      expect(dynamicConfig.extra?.ACCOUNT_DELETION_URL).toBe('https://getryvro.com/delete-account');
      expect(dynamicConfig.extra?.RYVRO_BRAIN_URL).toBe('');
      expect(dynamicConfig.extra?.RYVRO_BRAIN_TIMEOUT).toBe('30000');
      expect(dynamicConfig.extra).not.toHaveProperty('ELLIE_BRAIN_URL');
      expect(dynamicConfig.extra).not.toHaveProperty('ELLIE_BRAIN_TIMEOUT');
      expect(dynamicConfig.extra?.SHIFT_SCHEDULE_PARSER_URL).toBe('');
    } finally {
      if (previousIosGoogleServices === undefined) {
        delete process.env.EXPO_IOS_GOOGLE_SERVICES_FILE;
      } else {
        process.env.EXPO_IOS_GOOGLE_SERVICES_FILE = previousIosGoogleServices;
      }

      if (previousAndroidGoogleServices === undefined) {
        delete process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE;
      } else {
        process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE = previousAndroidGoogleServices;
      }

      if (previousFirebaseProjectId === undefined) {
        delete process.env.FIREBASE_PROJECT_ID;
      } else {
        process.env.FIREBASE_PROJECT_ID = previousFirebaseProjectId;
      }

      if (previousRyvroBrainUrl === undefined) {
        delete process.env.RYVRO_BRAIN_URL;
      } else {
        process.env.RYVRO_BRAIN_URL = previousRyvroBrainUrl;
      }

      if (previousRyvroBrainTimeout === undefined) {
        delete process.env.RYVRO_BRAIN_TIMEOUT;
      } else {
        process.env.RYVRO_BRAIN_TIMEOUT = previousRyvroBrainTimeout;
      }

      if (previousShiftScheduleParserUrl === undefined) {
        delete process.env.SHIFT_SCHEDULE_PARSER_URL;
      } else {
        process.env.SHIFT_SCHEDULE_PARSER_URL = previousShiftScheduleParserUrl;
      }
    }
  });

  it('keeps the dynamic Expo extra map free of duplicate launch keys', () => {
    const appConfigSource = fs.readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');

    for (const key of [
      'E2E_TEST_MODE',
      'EXPO_PUBLIC_E2E_TEST_MODE',
      'RYVRO_BRAIN_URL',
      'SHIFT_SCHEDULE_PARSER_URL',
      'LEGAL_PRIVACY_POLICY_URL',
      'ACCOUNT_DELETION_URL',
    ]) {
      const matches = appConfigSource.match(new RegExp(`\\b${key}:`, 'g')) || [];
      expect(matches).toHaveLength(1);
    }
  });

  it('derives Ryvro Cloud Function defaults from the Firebase project when present', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buildAppConfig = require(path.join(process.cwd(), 'app.config.js')) as ({
      config,
    }: {
      config?: Record<string, unknown>;
    }) => { extra?: Record<string, unknown> };

    const previousFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
    const previousRyvroBrainUrl = process.env.RYVRO_BRAIN_URL;
    const previousShiftScheduleParserUrl = process.env.SHIFT_SCHEDULE_PARSER_URL;

    process.env.FIREBASE_PROJECT_ID = 'ryvro-staging';
    delete process.env.RYVRO_BRAIN_URL;
    delete process.env.SHIFT_SCHEDULE_PARSER_URL;

    try {
      const dynamicConfig = buildAppConfig({ config: {} });

      expect(dynamicConfig.extra?.RYVRO_BRAIN_URL).toBe(
        'https://us-central1-ryvro-staging.cloudfunctions.net/ryvroBrain'
      );
      expect(dynamicConfig.extra?.SHIFT_SCHEDULE_PARSER_URL).toBe(
        'https://us-central1-ryvro-staging.cloudfunctions.net/parseShiftScheduleDescription'
      );
    } finally {
      if (previousFirebaseProjectId === undefined) {
        delete process.env.FIREBASE_PROJECT_ID;
      } else {
        process.env.FIREBASE_PROJECT_ID = previousFirebaseProjectId;
      }

      if (previousRyvroBrainUrl === undefined) {
        delete process.env.RYVRO_BRAIN_URL;
      } else {
        process.env.RYVRO_BRAIN_URL = previousRyvroBrainUrl;
      }

      if (previousShiftScheduleParserUrl === undefined) {
        delete process.env.SHIFT_SCHEDULE_PARSER_URL;
      } else {
        process.env.SHIFT_SCHEDULE_PARSER_URL = previousShiftScheduleParserUrl;
      }
    }
  });

  it('derives the Google Sign-In iOS URL scheme from the Ryvro OAuth client at build time', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buildAppConfig = require('../../app.config.js') as (params: {
      config?: Record<string, unknown>;
    }) => {
      plugins?: unknown[];
      extra?: Record<string, unknown>;
    };
    const previousGoogleIosClientId = process.env.GOOGLE_IOS_CLIENT_ID;
    const previousExpoGoogleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    process.env.GOOGLE_IOS_CLIENT_ID = '1234567890-ryvroios.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '1234567890-ryvroios.apps.googleusercontent.com';

    try {
      const dynamicConfig = buildAppConfig({ config: appJson.expo as Record<string, unknown> });
      const googleSignInPlugin = dynamicConfig.plugins?.find(
        (plugin): plugin is [string, { iosUrlScheme?: string }] =>
          Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin'
      );

      expect(dynamicConfig.extra?.GOOGLE_IOS_CLIENT_ID).toBe(
        '1234567890-ryvroios.apps.googleusercontent.com'
      );
      expect(dynamicConfig.extra?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).toBe(
        '1234567890-ryvroios.apps.googleusercontent.com'
      );
      expect(googleSignInPlugin?.[1].iosUrlScheme).toBe(
        'com.googleusercontent.apps.1234567890-ryvroios'
      );
      expect(googleSignInPlugin?.[1].iosUrlScheme).not.toBe(
        'com.googleusercontent.apps.197162533368-5mhtc7pnngbq2n50rll6857n90n3t97r'
      );
    } finally {
      if (previousGoogleIosClientId === undefined) {
        delete process.env.GOOGLE_IOS_CLIENT_ID;
      } else {
        process.env.GOOGLE_IOS_CLIENT_ID = previousGoogleIosClientId;
      }

      if (previousExpoGoogleIosClientId === undefined) {
        delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      } else {
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = previousExpoGoogleIosClientId;
      }
    }
  });

  it('pins native installed identity to Ryvro launch values', () => {
    expect(appJson.expo?.ios?.infoPlist).toMatchObject({
      CFBundleDisplayName: 'Ryvro',
      NSSpeechRecognitionUsageDescription:
        'Ryvro needs speech recognition to understand your questions.',
      NSMicrophoneUsageDescription: 'Ryvro needs microphone access for voice commands.',
    });

    const iosInfoPlist = readOptional('ios/RyvroShiftPlanner/Info.plist');
    if (iosInfoPlist) {
      expect(iosInfoPlist).toContain('<key>CFBundleDisplayName</key>');
      expect(iosInfoPlist).toContain('<string>Ryvro</string>');
      expect(iosInfoPlist).toContain('<string>ryvro</string>');
      expect(iosInfoPlist).toContain('<string>com.ryvro.shiftplanner</string>');
      expect(iosInfoPlist).not.toContain('<string>Ellie</string>');
      expect(iosInfoPlist).not.toContain('<string>Ellie Shift Planner</string>');
    }
  });

  it('keeps native URL schemes aligned to the Ryvro launch scheme', () => {
    const androidManifest = readOptional('android/app/src/main/AndroidManifest.xml');
    if (androidManifest) {
      expect(androidManifest).toContain('<data android:scheme="ryvro"/>');
      expect(androidManifest).toContain('<data android:scheme="com.ryvro.shiftplanner"/>');
      expect(androidManifest).toContain('<data android:scheme="exp+ryvro"/>');
      expect(androidManifest).not.toContain('<data android:scheme="ellie"');
      expect(androidManifest).not.toContain('<data android:scheme="exp+ellie"');
      expect(androidManifest).not.toContain('com.ellie.minershiftassistant');
      expect(androidManifest).not.toContain('com.ilyasuseidu.ellie');
    }

    const iosInfoPlist = readOptional('ios/RyvroShiftPlanner/Info.plist');
    if (iosInfoPlist) {
      expect(iosInfoPlist).toContain('<string>ryvro</string>');
      expect(iosInfoPlist).toContain('<string>com.ryvro.shiftplanner</string>');
      expect(iosInfoPlist).toContain('<string>exp+ryvro</string>');
      expect(iosInfoPlist).not.toContain('<string>ellie</string>');
      expect(iosInfoPlist).not.toContain('<string>exp+ellie</string>');
      expect(iosInfoPlist).not.toContain('com.ellie.minershiftassistant');
      expect(iosInfoPlist).not.toContain('com.ilyasuseidu.ellie');
    }
  });

  it('keeps Detox iOS release configuration on the Ryvro simulator app identity', () => {
    const detoxConfig = fs.readFileSync(path.join(process.cwd(), '.detoxrc.js'), 'utf8');

    expect(detoxConfig).toContain('RyvroShiftPlanner.xcworkspace');
    expect(detoxConfig).toContain('-scheme RyvroShiftPlanner');
    expect(detoxConfig).toContain('Release-iphonesimulator/RyvroShiftPlanner.app');
    expect(detoxConfig).toContain('name=iPhone 16');
    expect(detoxConfig).toContain("type: 'iPhone 16'");
    expect(detoxConfig).toContain("'ios.release.xsmax'");
    expect(detoxConfig).toContain("'simulator.xsmax'");
    expect(detoxConfig).toContain("id: '0D934C32-AFB6-497E-8A1E-39F2DB3C447F'");
    expect(detoxConfig).toContain("'ios.release.iphone16e'");
    expect(detoxConfig).toContain("'simulator.iphone16e'");
    expect(detoxConfig).toContain("id: 'E19B62D4-CF73-49E3-8E6B-F0663DA6E76C'");
    expect(detoxConfig).not.toContain('EllieMinerShiftAssistant.app');
    expect(detoxConfig).not.toContain('name=iPhone 15 Pro');
  });

  it('keeps the native iOS build product on the Ryvro app artifact', () => {
    const appDelegate = readOptional('ios/RyvroShiftPlanner/AppDelegate.swift');
    const xcodeProject = readOptional('ios/RyvroShiftPlanner.xcodeproj/project.pbxproj');
    const xcodeScheme = readOptional(
      'ios/RyvroShiftPlanner.xcodeproj/xcshareddata/xcschemes/RyvroShiftPlanner.xcscheme'
    );

    if (appDelegate) {
      expect(appDelegate).toContain(
        'Firebase default app is initialized through the React Native Firebase JS registry'
      );
      expect(appDelegate).not.toContain('FirebaseApp.configure()');
    }

    if (xcodeProject) {
      expect(xcodeProject).toMatch(/PRODUCT_BUNDLE_IDENTIFIER = "?com\.ryvro\.shiftplanner"?;/);
      expect(xcodeProject).toMatch(/PRODUCT_NAME = "?RyvroShiftPlanner"?;/);
      expect(xcodeProject).toContain('productName = RyvroShiftPlanner;');
      expect(xcodeProject).toContain('path = RyvroShiftPlanner.app;');
      expect(xcodeProject).not.toContain('path = Ellie.app;');
    }

    if (xcodeScheme) {
      expect(xcodeScheme).toContain('BuildableName = "RyvroShiftPlanner.app"');
      expect(xcodeScheme).not.toContain('BuildableName = "Ellie.app"');
    }
  });

  it('keeps the Ryvro native scaffold preflight in the release gate', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-native-scaffold.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(packageJson.scripts?.['release:native:check']).toBe(
      'node scripts/verify-ryvro-native-scaffold.js'
    );
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:native:check');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Ryvro native scaffold check passed');
    expect(script).toContain('Ryvro Shift Planner');
    expect(script).toContain('com.ryvro.shiftplanner');
    expect(script).toContain('app.config.js.backup must not be tracked');
    expect(fs.existsSync(path.join(process.cwd(), 'app.config.js.backup'))).toBe(false);
    expect(script).not.toContain("readOptional('ios/Ellie");
    expect(script).not.toContain("readOptional('ios/Ryvro/");
    expect(script).not.toContain("readOptional('ios/Ryvro.xcodeproj");
    expect(script).toContain('ios/RyvroShiftPlanner/GoogleService-Info.plist');
    expect(script).toContain('--strict-generated');
    expect(script).toContain('--strict-generated-services');
    expect(script).toContain('retired Firebase project');
  });

  it('keeps the Ryvro store readiness preflight in the release gate', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-store-readiness.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(packageJson.scripts?.['release:store:check']).toBe(
      'node scripts/verify-ryvro-store-readiness.js'
    );
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:store:check');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Ryvro store readiness check passed');
    expect(script).toContain('Google Play short description');
    expect(script).toContain('4000');
    expect(script).toContain('1290 x 2796');
    expect(script).toContain('reviewer@getryvro.com');
    expect(script).toContain('ryvro_pro_monthly');
    expect(script).toContain('forbidden claim');
  });

  it('keeps the Ryvro owner handoff preflight in the release gate', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-owner-handoff.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(packageJson.scripts?.['release:owner:check']).toBe(
      'node scripts/verify-ryvro-owner-handoff.js'
    );
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:owner:check');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Ryvro owner handoff check passed');
    expect(script).toContain("const readme = read('README.md')");
    expect(script).toContain(
      "const deploymentPlan = read('docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md')"
    );
    expect(script).toContain('formal trademark/legal clearance');
    expect(script).toContain('App Store Connect app name `Ryvro Shift Planner`');
    expect(script).toContain('Google Play title `Ryvro Shift Planner`');
    expect(script).toContain('Create RevenueCat project');
    expect(script).toContain('Android app `Ryvro (Play Store)` exists as `appab0f4b628d`');
    expect(script).toContain('Run `eas login` then `eas init`');
    expect(script).toContain('not live in the App Store or Google Play yet');
    expect(script).toContain('npm run release:owner:check');
    expect(script).toContain('owner handoff preflight');
    expect(script).toContain('Manual smoke tests pass on 2 physical devices');
    expect(script).toContain('Physical iOS and Android smoke tests');
    expect(script).toContain('Store screenshots, app privacy, data safety, content rating');
    expect(script).toContain('Production Firebase deploy and smoke test');
    expect(script).toContain(
      'launch is not complete until the account-only and physical-device checks above are done'
    );
    expect(script).toContain('release:submit:check');
    expect(script).toContain('npm run release:submit:check');
    expect(script).toContain('CI run `27014539880`');
    expect(script).toContain('commit `8b277ee`');
  });

  it('keeps final EAS submit readiness behind an owner evidence guard', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-submit-readiness.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(packageJson.scripts?.['release:submit:check']).toBe(
      'node scripts/verify-ryvro-submit-readiness.js'
    );
    expect(packageJson.scripts?.['release:check']).not.toContain('release:submit:check');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Ryvro submit readiness check failed');
    expect(result.stderr).not.toContain('submit.production.ios.appleId');
    expect(result.stderr).toContain('Android service account key path ./google-play-key.json');
    expect(result.stderr).toContain('Formal trademark/legal clearance for `Ryvro`');
    expect(result.stderr).toContain('Store screenshots still has pending owner evidence');
    expect(script).toContain('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
    expect(script).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(script).toContain('eas submit --platform ios --latest');
    expect(script).toContain('eas submit --platform android --latest');
    expect(script).toContain('Social handles');
    expect(script).toContain('Backend deploy - ryvroBrain');
    expect(script).toContain('Backend smoke - ryvroBrain');
    expect(script).toContain('Backend deploy - parser');
    expect(script).toContain('Shift parser smoke');
    expect(script).toContain('Store submission');
    expect(script).toContain('Pending owner evidence');
    expect(script).toContain('submit.production.android.track must stay on internal');
  });

  it('does not keep retired Ellie app paths in tracked release artifacts', () => {
    const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
    const artifactFiles = walkFiles(path.join(process.cwd(), 'artifacts')).filter((file) =>
      /\.(json|log|txt)$/.test(file)
    );
    const artifactContent = artifactFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

    expect(gitignore).toContain('artifacts/');
    expect(artifactContent).not.toContain('Release-iphonesimulator/Ellie.app');
    expect(artifactContent).not.toContain('/Ellie.app installed');
  });

  it('pins tracked Firebase mobile clients to the Ryvro bundle and package', () => {
    expect(appJson.expo?.ios?.googleServicesFile).toBeUndefined();
    expect(appJson.expo?.android?.googleServicesFile).toBeUndefined();

    const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    const productionEnvExample = fs.readFileSync(
      path.join(process.cwd(), '.env.production.example'),
      'utf8'
    );
    const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');

    expect(envExample).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist');
    expect(envExample).toContain('EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json');
    expect(productionEnvExample).toContain(
      'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist'
    );
    expect(productionEnvExample).toContain(
      'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json'
    );
    expect(gitignore).toContain('GoogleService-Info.plist');
    expect(gitignore).toContain('google-services.json');

    const iosGoogleServicePlist = readOptional('ios/RyvroShiftPlanner/GoogleService-Info.plist');
    if (iosGoogleServicePlist) {
      expect(iosGoogleServicePlist).toContain('<key>BUNDLE_ID</key>');
      expect(iosGoogleServicePlist).toContain('<string>com.ryvro.shiftplanner</string>');
      expect(iosGoogleServicePlist).not.toContain('com.ellie.minershiftassistant');
      expect(iosGoogleServicePlist).not.toContain('com.ilyasuseidu.ellie');
    }

    const androidGoogleServices = readOptional('android/app/google-services.json');
    if (androidGoogleServices) {
      const parsedAndroidGoogleServices = JSON.parse(androidGoogleServices) as {
        client?: Array<{
          client_info?: {
            android_client_info?: {
              package_name?: string;
            };
          };
        }>;
      };
      const packageNames =
        parsedAndroidGoogleServices.client?.map(
          (client) => client.client_info?.android_client_info?.package_name
        ) ?? [];

      expect(packageNames).toContain('com.ryvro.shiftplanner');
      expect(packageNames).not.toContain('com.ellie.minershiftassistant');
      expect(packageNames).not.toContain('com.ilyasuseidu.ellie');
    }
  });

  it('pins tracked Expo assets to Ryvro launch assets', () => {
    expect(appJson.expo?.icon).toBe('./assets/icon.png');
    expect(appJson.expo?.splash?.image).toBe('./assets/splash-icon.png');
    expect(appJson.expo?.android?.adaptiveIcon?.foregroundImage).toBe('./assets/adaptive-icon.png');
    expect(appJson.expo?.web?.favicon).toBe('./assets/favicon.png');
  });

  it('does not advertise retired Ellie or ShiftSync values in new environments', () => {
    expect(envExample).not.toContain('https://api.shiftsync.app');
    expect(envExample).not.toContain('cloudfunctions.net/ellieBrain');
    expect(envExample).not.toContain('WAKE_WORD_PHRASE=Hey Ellie');
    expect(envExample).not.toContain('ellie_android.ppn');
    expect(envExample).not.toContain('ellie_ios.ppn');
    expect(envExample).not.toContain('hey_ellie');
  });

  it('does not keep retired ShiftSync config in the Jest Expo Constants mock', () => {
    const jestSetup = fs.readFileSync(path.join(process.cwd(), 'jest.setup.js'), 'utf8');

    expect(jestSetup).toContain("name: 'Ryvro Shift Planner'");
    expect(jestSetup).not.toContain("name: 'ShiftSync'");
  });

  it('does not expose retired Ellie brain keys in new Ryvro environment templates', () => {
    expect(envExample).not.toContain('ELLIE_BRAIN_URL');
    expect(envExample).not.toContain('ELLIE_BRAIN_TIMEOUT');
    expect(productionEnvExample).not.toContain('ELLIE_BRAIN_URL');
    expect(productionEnvExample).not.toContain('ELLIE_BRAIN_TIMEOUT');
    expect(envConfigurationTemplate).not.toContain('ELLIE_BRAIN_URL');
    expect(envConfigurationTemplate).not.toContain('ELLIE_BRAIN_TIMEOUT');
  });

  it('keeps the Ryvro public clearance preflight command available', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-clearance.js');

    expect(packageJson.scripts?.['release:clearance']).toBe(
      'node scripts/verify-ryvro-clearance.js'
    );
    expect(fs.existsSync(scriptPath)).toBe(true);
  });

  it('keeps the Ryvro production env preflight command available before EAS builds', () => {
    const scriptPath = path.join(process.cwd(), 'scripts/verify-ryvro-production-env.js');
    const script = fs.readFileSync(scriptPath, 'utf8');
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );
    const releaseTasks = fs.readFileSync(
      path.join(process.cwd(), 'RYVRO_RELEASE_TASKS.md'),
      'utf8'
    );

    expect(packageJson.scripts?.['release:env:check']).toBe(
      'node scripts/verify-ryvro-production-env.js'
    );
    expect(script).toContain('APP_ENV');
    expect(script).toContain('EAS_PROJECT_ID');
    expect(script).toContain('FIREBASE_API_KEY');
    expect(script).toContain('FIREBASE_AUTH_DOMAIN');
    expect(script).toContain('FIREBASE_PROJECT_ID');
    expect(script).toContain('FIREBASE_STORAGE_BUCKET');
    expect(script).toContain('FIREBASE_MESSAGING_SENDER_ID');
    expect(script).toContain('FIREBASE_APP_ID');
    expect(script).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE');
    expect(script).toContain('EXPO_ANDROID_GOOGLE_SERVICES_FILE');
    expect(script).toContain('GoogleService-Info.plist');
    expect(script).toContain('google-services.json');
    expect(script).toContain('API_BASE_URL');
    expect(script).toContain('GOOGLE_WEB_CLIENT_ID');
    expect(script).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    expect(script).toContain('GOOGLE_IOS_CLIENT_ID');
    expect(script).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    expect(script).toContain('RYVRO_BRAIN_URL');
    expect(script).toContain('REVENUECAT_IOS_KEY');
    expect(script).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    expect(script).toContain('REVENUECAT_ANDROID_KEY');
    expect(script).toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY');
    expect(script).toContain('REVENUECAT_ENTITLEMENT_ID');
    expect(script).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID');
    expect(script).toContain('LEGAL_PRIVACY_POLICY_URL');
    expect(script).toContain('LEGAL_TERMS_OF_SERVICE_URL');
    expect(script).toContain('SUPPORT_URL');
    expect(script).toContain('ACCOUNT_DELETION_URL');
    expect(envExample).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx');
    expect(envExample).toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx');
    expect(envExample).toContain('REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envExample).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envConfigurationTemplate).toContain('REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx');
    expect(envConfigurationTemplate).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx');
    expect(envConfigurationTemplate).toContain('REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx');
    expect(envConfigurationTemplate).toContain(
      'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx'
    );
    expect(envConfigurationTemplate).toContain('REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envConfigurationTemplate).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envExample).toContain('LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy');
    expect(envExample).toContain('LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms');
    expect(envExample).toContain('SUPPORT_URL=https://getryvro.com/support');
    expect(envExample).toContain('ACCOUNT_DELETION_URL=https://getryvro.com/delete-account');
    expect(envConfigurationTemplate).toContain(
      'LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy'
    );
    expect(envConfigurationTemplate).toContain(
      'LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms'
    );
    expect(envConfigurationTemplate).toContain('SUPPORT_URL=https://getryvro.com/support');
    expect(envConfigurationTemplate).toContain(
      'ACCOUNT_DELETION_URL=https://getryvro.com/delete-account'
    );
    expect(envConfigurationTemplate).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://us-central1-your-project-id.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(envConfigurationTemplate).toContain('SHIFT_SCHEDULE_PARSER_TIMEOUT_MS=45000');
    expect(envConfigurationTemplate).toContain('SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH=2000');
    expect(envConfigurationTemplate).toContain('UNIVERSAL_SHIFT_BUILDER_ENABLED=true');
    expect(envConfigurationTemplate).toContain('AI_SHIFT_BUILDER_ENABLED=true');
    expect(script).toContain('ELLIE_BRAIN_URL');
    expect(script).toContain('remove retired Ellie voice endpoint keys');
    expect(script).toContain('must match FIREBASE_PROJECT_ID as <project-id>.firebaseapp.com');
    expect(script).toContain('must match FIREBASE_PROJECT_ID as a Firebase Storage bucket');
    expect(script).toContain('must be the Ryvro Firebase project ID');
    expect(script).toContain('scoped to a Ryvro Firebase project');
    expect(script).toContain('retired Ellie/ShiftSync');
    expect(script).toContain('must not use tracked local placeholder Firebase service files');
    expect(script).toContain('outside generated ios/ and android/ folders');
    expect(script).toContain('must target BUNDLE_ID com.ryvro.shiftplanner');
    expect(script).toContain('must include Android package com.ryvro.shiftplanner');
    expect(script).toContain('must be the live HTTPS Ryvro API base URL');
    expect(script).toContain('must match GOOGLE_WEB_CLIENT_ID');
    expect(script).toContain('must match GOOGLE_IOS_CLIENT_ID');
    expect(script).toContain('must match REVENUECAT_IOS_KEY');
    expect(script).toContain('must match REVENUECAT_ANDROID_KEY');
    expect(script).toContain('must match REVENUECAT_ENTITLEMENT_ID');
    expect(script).toContain('Ryvro-owned domain');
    expect(script).toContain('Ryvro account deletion URL');
    expect(envExample).toContain('Ryvro local development environment template');
    expect(envExample).toContain('For release builds, copy .env.production.example to .env');
    expect(envExample).toContain('npm run release:env:check');
    expect(envConfigurationTemplate).toContain('Ryvro Environment Configuration Reference');
    expect(envConfigurationTemplate).toContain('For local development, copy .env.example to .env');
    expect(envConfigurationTemplate).toContain(
      'For release builds, copy .env.production.example to .env and run npm run release:env:check'
    );
    expect(productionEnvExample).toContain('APP_ENV=production');
    expect(productionEnvExample).toContain('EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000');
    expect(productionEnvExample).toContain('FIREBASE_PROJECT_ID=ryvro-prod');
    expect(productionEnvExample).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(productionEnvExample).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-ryvro-prod.cloudfunctions.net/ryvroBrain'
    );
    expect(productionEnvExample).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://us-central1-ryvro-prod.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(productionEnvExample).toContain(
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=REPLACE-web.apps.googleusercontent.com'
    );
    expect(productionEnvExample).toContain(
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=REPLACE-ios.apps.googleusercontent.com'
    );
    expect(productionEnvExample).toContain('REVENUECAT_ENTITLEMENT_ID=pro');
    expect(productionEnvExample).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro');
    expect(productionEnvExample).toContain(
      'ACCOUNT_DELETION_URL=https://getryvro.com/delete-account'
    );
    expect(productionEnvExample).not.toContain('ELLIE_BRAIN_URL');
    expect(productionEnvExample).not.toContain('ELLIE_BRAIN_TIMEOUT');
    expect(productionEnvExample).not.toContain('com.ellie.minershiftassistant');
    expect(productionEnvExample).not.toContain('Hey Ellie');
    expect(externalSetup).toContain('npm run release:env:check');
    expect(externalSetup).toContain('cp .env.production.example .env');
    expect(externalSetup).toContain(
      'it must fail the preflight until every placeholder is replaced'
    );
    expect(externalSetup).toContain(
      'rejects retired Ellie/ShiftSync Firebase project IDs, retired `ELLIE_BRAIN_*` env keys'
    );
    expect(externalSetup).toContain(
      'tracked local service-file placeholders under `config/firebase/`'
    );
    expect(externalSetup).toContain(
      'generated native-folder service-file paths under `ios/` or `android/`'
    );
    expect(externalSetup).toContain('live HTTPS Ryvro-owned `LEGAL_PRIVACY_POLICY_URL`');
    expect(externalSetup).toContain('`ACCOUNT_DELETION_URL`');
    expect(releaseTasks).toContain('npm run release:env:check');
    expect(releaseTasks).toContain('Copy `.env.production.example` to `.env`');
    expect(releaseTasks).toContain('Reject retired Ellie/ShiftSync Firebase project IDs');
    expect(releaseTasks).toContain('live HTTPS Ryvro-owned legal/support/account deletion URLs');
  });

  it('accepts a production env only when Expo public service values mirror native values', () => {
    const result = runProductionEnvCheck(validProductionEnv);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Ryvro production env check passed');
  });

  it('rejects production env files with mismatched Expo public Google OAuth client IDs', () => {
    const webResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-web.apps.googleusercontent.com',
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-other-web.apps.googleusercontent.com'
      )
    );

    expect(webResult.status).toBe(1);
    expect(webResult.stderr).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    expect(webResult.stderr).toContain('must match GOOGLE_WEB_CLIENT_ID');

    const iosResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-ios.apps.googleusercontent.com',
        'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-other-ios.apps.googleusercontent.com'
      )
    );

    expect(iosResult.status).toBe(1);
    expect(iosResult.stderr).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    expect(iosResult.stderr).toContain('must match GOOGLE_IOS_CLIENT_ID');
  });

  it('rejects production env files with mismatched Expo public RevenueCat keys', () => {
    const result = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_liveios123',
        'EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_different123'
      )
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
    expect(result.stderr).toContain('must match REVENUECAT_IOS_KEY');
  });

  it('rejects production env files with mismatched Expo public RevenueCat entitlement IDs', () => {
    const result = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro',
        'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=ellie_pro'
      )
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID');
    expect(result.stderr).toContain('must match REVENUECAT_ENTITLEMENT_ID');
  });

  it('rejects production env files without the real EAS project UUID', () => {
    const result = runProductionEnvCheck(
      validProductionEnv.replace(
        'EAS_PROJECT_ID=3dcb1926-9b5b-4f20-93b1-2f5b8f490000',
        'EAS_PROJECT_ID=ryvro-prod'
      )
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EAS_PROJECT_ID');
    expect(result.stderr).toContain('must be the real EAS project UUID');

    const zeroUuidResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EAS_PROJECT_ID=3dcb1926-9b5b-4f20-93b1-2f5b8f490000',
        'EAS_PROJECT_ID=00000000-0000-0000-0000-000000000000'
      )
    );

    expect(zeroUuidResult.status).toBe(1);
    expect(zeroUuidResult.stderr).toContain('EAS_PROJECT_ID');
    expect(zeroUuidResult.stderr).toContain('must be the real EAS project UUID');
  });

  it('rejects production env files with placeholder or mismatched Firebase values', () => {
    const apiKeyResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'FIREBASE_API_KEY=AIzaSyRyvroProd1234567890abcdefghiJKLMN',
        'FIREBASE_API_KEY=your-firebase-api-key'
      )
    );

    expect(apiKeyResult.status).toBe(1);
    expect(apiKeyResult.stderr).toContain('FIREBASE_API_KEY');
    expect(apiKeyResult.stderr).toContain('must be the real Ryvro Firebase web API key');

    const authDomainResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'FIREBASE_AUTH_DOMAIN=ryvro-prod.firebaseapp.com',
        'FIREBASE_AUTH_DOMAIN=other-project.firebaseapp.com'
      )
    );

    expect(authDomainResult.status).toBe(1);
    expect(authDomainResult.stderr).toContain('FIREBASE_AUTH_DOMAIN');
    expect(authDomainResult.stderr).toContain(
      'must match FIREBASE_PROJECT_ID as <project-id>.firebaseapp.com'
    );

    const storageBucketResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'FIREBASE_STORAGE_BUCKET=ryvro-prod.firebasestorage.app',
        'FIREBASE_STORAGE_BUCKET=other-project.firebasestorage.app'
      )
    );

    expect(storageBucketResult.status).toBe(1);
    expect(storageBucketResult.stderr).toContain('FIREBASE_STORAGE_BUCKET');
    expect(storageBucketResult.stderr).toContain(
      'must match FIREBASE_PROJECT_ID as a Firebase Storage bucket'
    );

    const retiredProjectResult = runProductionEnvCheck(
      validProductionEnv
        .replace(
          'FIREBASE_AUTH_DOMAIN=ryvro-prod.firebaseapp.com',
          'FIREBASE_AUTH_DOMAIN=ellie-prod.firebaseapp.com'
        )
        .replace('FIREBASE_PROJECT_ID=ryvro-prod', 'FIREBASE_PROJECT_ID=ellie-prod')
        .replace(
          'FIREBASE_STORAGE_BUCKET=ryvro-prod.firebasestorage.app',
          'FIREBASE_STORAGE_BUCKET=ellie-prod.firebasestorage.app'
        )
    );

    expect(retiredProjectResult.status).toBe(1);
    expect(retiredProjectResult.stderr).toContain('FIREBASE_PROJECT_ID');
    expect(retiredProjectResult.stderr).toContain('retired Ellie/ShiftSync names');

    const genericProjectResult = runProductionEnvCheck(
      validProductionEnv
        .replace(
          'FIREBASE_AUTH_DOMAIN=ryvro-prod.firebaseapp.com',
          'FIREBASE_AUTH_DOMAIN=shiftplanner-prod.firebaseapp.com'
        )
        .replace('FIREBASE_PROJECT_ID=ryvro-prod', 'FIREBASE_PROJECT_ID=shiftplanner-prod')
        .replace(
          'FIREBASE_STORAGE_BUCKET=ryvro-prod.firebasestorage.app',
          'FIREBASE_STORAGE_BUCKET=shiftplanner-prod.firebasestorage.app'
        )
    );

    expect(genericProjectResult.status).toBe(1);
    expect(genericProjectResult.stderr).toContain('FIREBASE_PROJECT_ID');
    expect(genericProjectResult.stderr).toContain('must be the Ryvro Firebase project ID');
  });

  it('rejects production env files without real Ryvro Firebase native service files', () => {
    const missingIosResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist',
        'EXPO_IOS_GOOGLE_SERVICES_FILE=./missing/GoogleService-Info.plist'
      )
    );

    expect(missingIosResult.status).toBe(1);
    expect(missingIosResult.stderr).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE');
    expect(missingIosResult.stderr).toContain('does not exist');

    const generatedIosPathResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist',
        'EXPO_IOS_GOOGLE_SERVICES_FILE=./ios/RyvroShiftPlanner/GoogleService-Info.plist'
      )
    );

    expect(generatedIosPathResult.status).toBe(1);
    expect(generatedIosPathResult.stderr).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE');
    expect(generatedIosPathResult.stderr).toContain('outside generated ios/ and android/ folders');

    const localPlaceholderResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json',
        'EXPO_ANDROID_GOOGLE_SERVICES_FILE=./config/firebase/google-services.json'
      )
    );

    expect(localPlaceholderResult.status).toBe(1);
    expect(localPlaceholderResult.stderr).toContain('EXPO_ANDROID_GOOGLE_SERVICES_FILE');
    expect(localPlaceholderResult.stderr).toContain('must not use tracked local placeholder');
  });

  it('rejects production env files with retired Cloud Function project hosts', () => {
    const brainResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'RYVRO_BRAIN_URL=https://us-central1-ryvro-prod.cloudfunctions.net/ryvroBrain',
        'RYVRO_BRAIN_URL=https://us-central1-ellie-prod.cloudfunctions.net/ryvroBrain'
      )
    );

    expect(brainResult.status).toBe(1);
    expect(brainResult.stderr).toContain('RYVRO_BRAIN_URL');
    expect(brainResult.stderr).toContain('scoped to a Ryvro Firebase project');
    expect(brainResult.stderr).toContain('retired Ellie/ShiftSync host');

    const parserResult = runProductionEnvCheck(
      validProductionEnv.replace(
        [
          'SHIFT_SCHEDULE_PARSER_URL=',
          'https://us-central1-ryvro-prod.cloudfunctions.net/parseShiftScheduleDescription',
        ].join(''),
        [
          'SHIFT_SCHEDULE_PARSER_URL=',
          'https://us-central1-shift-sync-prod.cloudfunctions.net/parseShiftScheduleDescription',
        ].join('')
      )
    );

    expect(parserResult.status).toBe(1);
    expect(parserResult.stderr).toContain('SHIFT_SCHEDULE_PARSER_URL');
    expect(parserResult.stderr).toContain('scoped to a Ryvro Firebase project');
  });

  it('rejects production env files that still carry retired Ellie brain keys', () => {
    const result = runProductionEnvCheck(
      [
        validProductionEnv,
        'ELLIE_BRAIN_URL=https://us-central1-ryvro-prod.cloudfunctions.net/ellieBrain',
        'ELLIE_BRAIN_TIMEOUT=30000',
      ].join('\n')
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ELLIE_BRAIN_URL');
    expect(result.stderr).toContain('ELLIE_BRAIN_TIMEOUT');
    expect(result.stderr).toContain('remove retired Ellie voice endpoint keys');
  });

  it('rejects production env files with unsafe API base URLs', () => {
    const localhostResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'API_BASE_URL=https://api.getryvro.com',
        'API_BASE_URL=http://localhost:3000'
      )
    );

    expect(localhostResult.status).toBe(1);
    expect(localhostResult.stderr).toContain('API_BASE_URL');
    expect(localhostResult.stderr).toContain('must be the live HTTPS Ryvro API base URL');

    const retiredHostResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'API_BASE_URL=https://api.getryvro.com',
        'API_BASE_URL=https://api.ellie-shift.example.com'
      )
    );

    expect(retiredHostResult.status).toBe(1);
    expect(retiredHostResult.stderr).toContain('API_BASE_URL');
    expect(retiredHostResult.stderr).toContain('retired Ellie host');
  });

  it('rejects production env files with generic or mismatched legal and support URLs', () => {
    const genericPrivacyResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy',
        'LEGAL_PRIVACY_POLICY_URL=https://example.com/privacy'
      )
    );

    expect(genericPrivacyResult.status).toBe(1);
    expect(genericPrivacyResult.stderr).toContain('LEGAL_PRIVACY_POLICY_URL');
    expect(genericPrivacyResult.stderr).toContain('Ryvro-owned domain');

    const wrongTermsPathResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms',
        'LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/privacy'
      )
    );

    expect(wrongTermsPathResult.status).toBe(1);
    expect(wrongTermsPathResult.stderr).toContain('LEGAL_TERMS_OF_SERVICE_URL');
    expect(wrongTermsPathResult.stderr).toContain('Ryvro terms URL');

    const retiredSupportHostResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'SUPPORT_URL=https://getryvro.com/support',
        'SUPPORT_URL=https://support.ellie-shift.example.com/support'
      )
    );

    expect(retiredSupportHostResult.status).toBe(1);
    expect(retiredSupportHostResult.stderr).toContain('SUPPORT_URL');
    expect(retiredSupportHostResult.stderr).toContain('Ryvro support URL');

    const wrongDeletionPathResult = runProductionEnvCheck(
      validProductionEnv.replace(
        'ACCOUNT_DELETION_URL=https://getryvro.com/delete-account',
        'ACCOUNT_DELETION_URL=https://getryvro.com/support'
      )
    );

    expect(wrongDeletionPathResult.status).toBe(1);
    expect(wrongDeletionPathResult.stderr).toContain('ACCOUNT_DELETION_URL');
    expect(wrongDeletionPathResult.stderr).toContain('Ryvro account deletion URL');
  });

  it('keeps public clearance evidence current while preserving account-only caveats', () => {
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );
    const audit = fs.readFileSync(
      path.join(process.cwd(), 'SHIFT_WORKER_APP_REBRAND_AUDIT.md'),
      'utf8'
    );
    const clearanceEvidence = `${externalSetup}\n${audit}`;

    expect(clearanceEvidence).toContain('2026-06-05 at 11:04:32Z');
    expect(clearanceEvidence).toContain('2026-06-05T11:04:32.887Z');
    expect(clearanceEvidence).toContain('no exact `Ryvro` or `Ryvro Shift Planner` app result');
    expect(clearanceEvidence).toContain(
      'Visible fuzzy names included `Rydoo`, `Rydora`, `Ryver`, and `Ryver LLC`'
    );
    expect(clearanceEvidence).toContain(
      'Chrome/Computer Use previously read the public Google Play search page for `Ryvro`'
    );
    expect(clearanceEvidence).toContain('no exact Ryvro listing visible');
    expect(clearanceEvidence).toContain('Do not treat this as logged-in Play Console evidence');
    expect(clearanceEvidence).toContain('LinkedIn `company/ryvro`: public URL returned `404`');
    expect(clearanceEvidence).toContain('Formal trademark/legal clearance');
    expect(clearanceEvidence).toContain('App Store Connect and Google Play Console name checks');
    expect(clearanceEvidence).toContain('Play Console title/package availability');
    expect(clearanceEvidence).toContain('76.223.54.146');
    expect(clearanceEvidence).toContain('2026-06-16T10:06:52Z');
    expect(clearanceEvidence).toContain('reserve directly while logged in');
    expect(clearanceEvidence).not.toContain('2026-05-29 at 14:36:21Z');
    expect(clearanceEvidence).not.toContain('2026-05-29T14:36:21.446Z');
    expect(clearanceEvidence).not.toContain('2026-05-29 at 19:51:39Z');
    expect(clearanceEvidence).not.toContain('2026-05-29T19:51:39.887Z');
    expect(clearanceEvidence).not.toContain('2026-05-29 at 21:22:25Z');
    expect(clearanceEvidence).not.toContain('2026-05-29T21:22:25.775Z');
    expect(clearanceEvidence).not.toContain('2026-05-29 at 22:09:36Z');
    expect(clearanceEvidence).not.toContain('2026-05-29T22:09:36.826Z');
    expect(clearanceEvidence).not.toContain('2026-05-30 at 04:26:28Z');
    expect(clearanceEvidence).not.toContain('2026-05-30T04:26:28.800Z');
    expect(clearanceEvidence).not.toContain('2026-05-30 at 05:08:52Z');
    expect(clearanceEvidence).not.toContain('2026-05-30T05:08:52.377Z');
    expect(clearanceEvidence).not.toContain('2026-05-30 at 05:38:18Z');
    expect(clearanceEvidence).not.toContain('2026-05-30T05:38:18.547Z');
    expect(clearanceEvidence).not.toContain('2026-05-30 at 06:28:28Z');
    expect(clearanceEvidence).not.toContain('2026-05-30T06:28:28.205Z');
    expect(clearanceEvidence).not.toContain('2026-05-31 at 05:16:18Z');
    expect(clearanceEvidence).not.toContain('2026-05-31T05:16:18.075Z');
    expect(clearanceEvidence).not.toContain('2026-05-31 at 07:14Z');
    expect(clearanceEvidence).not.toContain('2026-05-31 at 19:32:28Z');
    expect(clearanceEvidence).not.toContain('2026-05-31T19:32:28.044Z');
    expect(clearanceEvidence).not.toContain(
      'LinkedIn `company/ryvro`: public URL returned bot-protection status `999`'
    );
  });

  it('keeps the active deployment plan on Ryvro and repo-root release paths', () => {
    const deploymentPlan = fs.readFileSync(
      path.join(process.cwd(), 'docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md'),
      'utf8'
    );
    const androidBuildGradle = fs.readFileSync(
      path.join(process.cwd(), 'android/app/build.gradle'),
      'utf8'
    );

    expect(deploymentPlan).toContain('Repository: repo root');
    expect(deploymentPlan).toContain('Last updated: May 31, 2026');
    expect(deploymentPlan).toContain('cd <repo-root>');
    expect(deploymentPlan).toContain(
      'including the native scaffold, store readiness, owner handoff preflight, and backend build gates'
    );
    expect(deploymentPlan).toContain('npm run release:owner:check');
    expect(deploymentPlan).toContain('Hide Schedule and Stats tabs for v1.');
    expect(deploymentPlan).toContain(
      'Schedule and Stats tabs are not visible anywhere in the bottom navigation.'
    );
    expect(deploymentPlan).toContain('-archivePath /tmp/Ryvro.xcarchive archive');
    expect(deploymentPlan).toContain(
      '<repo-root>/android/app/build/outputs/bundle/release/app-release.aab'
    );
    expect(deploymentPlan).toContain('README now includes a Ryvro release status snapshot');
    expect(deploymentPlan).toContain(
      '[x] Verify every visible tab/action is complete or routed to an implemented launch surface'
    );
    expect(deploymentPlan).toContain('[x] Update README release status snapshot');
    expect(deploymentPlan).toContain(
      '## A1) Verify Ryvro app identifiers and provision owner accounts'
    );
    expect(deploymentPlan).toContain(
      'Repo-side app identifiers are already pinned to `Ryvro Shift Planner`, native display name `Ryvro`, URL scheme `ryvro`, and bundle/package ID `com.ryvro.shiftplanner`'
    );
    expect(deploymentPlan).toContain('Tracked files that must stay pinned');
    expect(deploymentPlan).toContain(
      'Create Apple App ID, App Store Connect record, Google Play app, Firebase apps, OAuth clients, RevenueCat apps, and EAS project values for `com.ryvro.shiftplanner`'
    );
    expect(deploymentPlan).toContain('`npm run release:native:check` passes');
    expect(deploymentPlan).toContain(
      '`npm run release:submit:check` remains blocked until owner console values and non-secret evidence are complete'
    );
    expect(deploymentPlan).not.toContain('## A1) Replace placeholder app identifiers');
    expect(deploymentPlan).toContain(
      'Non-E2E release tasks now fail fast when upload-key credentials are missing'
    );
    expect(deploymentPlan).toContain(
      'Add tracked Gradle release-signing guard so non-E2E release tasks require `RYVRO_UPLOAD_*`'
    );
    expect(deploymentPlan).toContain(
      'Generate/upload the real Android release keystore through EAS/local secrets before store upload'
    );
    expect(deploymentPlan).toContain('Initial v1 store versions are pinned across tracked config');
    expect(deploymentPlan).toContain(
      'Pin first-store-build iOS build number + Android versionCode across tracked config'
    );
    expect(deploymentPlan).toContain(
      'Increment iOS build number + Android versionCode again after each uploaded binary'
    );
    expect(deploymentPlan).toContain(
      'Ryvro Pro subscription gating, paywall, restore purchases, and RevenueCat product loading in the first submitted binary'
    );
    expect(deploymentPlan).toContain(
      'RevenueCat `pro` entitlement, `ryvro_pro_monthly`, `ryvro_pro_annual`, and `default` offering are configured for both stores'
    );
    expect(deploymentPlan).toContain('## B4) Keep Ryvro Pro in the first-store-build scope');
    expect(deploymentPlan).toContain(
      'Fresh install -> complete onboarding via Universal Shift Builder template start with a non-mining template'
    );
    expect(deploymentPlan).toContain(
      'Fresh install -> complete onboarding via Universal Shift Builder AI description with a FIFO/block-roster or rotating-shift prompt'
    );
    expect(deploymentPlan).not.toContain('FIFO/mining or rotating-shift prompt');
    expect(deploymentPlan).toContain(
      'Fresh install -> complete onboarding via Universal Shift Builder manual setup with custom shift names, colors, icons, reminders, exceptions, and calendar export enabled'
    );
    expect(deploymentPlan).toContain('Subscription must-pass flows');
    expect(deploymentPlan).toContain(
      'Tap center mic while not subscribed -> PaywallScreen appears; annual plan is pre-selected'
    );
    expect(deploymentPlan).toContain('Start the sandbox 7-day free trial -> `isPro` becomes true');
    expect(deploymentPlan).toContain('Restore Purchases reactivates Ryvro Pro');
    expect(deploymentPlan).toContain('monthly product: `ryvro_pro_monthly`');
    expect(deploymentPlan).toContain('annual product: `ryvro_pro_annual`');
    expect(deploymentPlan).toContain('Include a paywall screenshot');
    expect(deploymentPlan).toContain(
      '[x] Add repo-side Ryvro Pro subscription gating, paywall, and RevenueCat runtime guards'
    );
    expect(deploymentPlan).toContain(
      '[x] Add owner handoff preflight for account-only blockers, not-live status, physical-device QA, and store submission handoff docs'
    );
    expect(deploymentPlan).toContain(
      '[ ] Create RevenueCat `pro` entitlement, `default` offering, and both Ryvro store products'
    );
    expect(deploymentPlan).toContain(
      '[ ] Pass sandbox purchase/cancel/restore smoke on iOS and Android'
    );
    expect(androidBuildGradle).toContain('RYVRO_UPLOAD_STORE_FILE');
    expect(androidBuildGradle).toContain('RYVRO_UPLOAD_STORE_PASSWORD');
    expect(androidBuildGradle).toContain('RYVRO_UPLOAD_KEY_ALIAS');
    expect(androidBuildGradle).toContain('RYVRO_UPLOAD_KEY_PASSWORD');
    expect(androidBuildGradle).toContain('throw new GradleException');
    expect(androidBuildGradle).toContain('Ryvro release signing is not configured');
    expect(androidBuildGradle).toContain('!isE2ETestMode');
    expect(androidBuildGradle).toContain("storeFile file('debug.keystore')");
    expect(deploymentPlan).not.toContain('Keep tabs visible');
    expect(deploymentPlan).not.toContain('beta placeholders');
    expect(deploymentPlan).not.toContain('complete onboarding with manual drag/drop builder');
    expect(deploymentPlan).not.toContain('complete onboarding from mining/FIFO template');
    expect(deploymentPlan).not.toContain('/Users/Shared/Ellie');
    expect(deploymentPlan).not.toContain('/tmp/Ellie.xcarchive');
  });

  it('keeps the README release status aligned with current Ryvro launch readiness', () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');

    expect(readme).toContain('## Release Status Snapshot');
    expect(readme).toContain('not live in the App Store or Google Play yet');
    expect(readme).toContain('github.com/IlyasuSeidu/Ellie/workflows/CI%20Pipeline');
    expect(readme).toContain('git clone https://github.com/IlyasuSeidu/Ellie.git');
    expect(readme).toContain('Current Ryvro app repository');
    expect(readme).toContain('FIREBASE_API_KEY=your-firebase-api-key');
    expect(readme).toContain('FIREBASE_PROJECT_ID=your-project-id');
    expect(readme).toContain('FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app');
    expect(readme).toContain(
      'App identity: `Ryvro Shift Planner`, native display name `Ryvro`, bundle/package `com.ryvro.shiftplanner`'
    );
    expect(readme).toContain('110 Jest suites / 1,782 tests / 4 snapshots');
    expect(readme).toContain('the Ryvro native scaffold preflight');
    expect(readme).toContain('the store readiness preflight');
    expect(readme).toContain('the owner handoff preflight');
    expect(readme).toContain('Latest iOS simulator gate');
    expect(readme).toContain('fresh onboarding path into the Universal Shift Builder');
    expect(readme).toContain('active universal shift icon');
    expect(readme).toContain('auth, onboarding, dashboard, profile, and builder mobile-fit checks');
    expect(readme).toContain('Recent pushed PR gates');
    expect(readme).toContain('GitHub Actions CI run `27014539880`');
    expect(readme).toContain('commit `8b277ee`');
    expect(readme).toContain('CI run `27014075248`');
    expect(readme).toContain('commit `c424ff3`');
    expect(readme).toContain('CI run `27013691021`');
    expect(readme).toContain('commit `8d24c2a`');
    expect(readme).toContain('CI run `27013231061`');
    expect(readme).toContain('commit `9e69151`');
    expect(readme).toContain('[docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md]');
    expect(readme).toContain('Fresh Firebase, Google OAuth, Apple Sign-In, RevenueCat');
    expect(readme).toContain(
      'Production `ryvroBrain` and `parseShiftScheduleDescription` deploys and smoke tests'
    );
    expect(readme).toContain('valid-prompt `SHIFT_SCHEDULE_PARSER_URL` parser response');
    expect(readme).toContain('[docs/RYVRO_RELEASE_READINESS_REPORT.md]');
    expect(readme).toContain('Works at remote work locations');
    expect(readme).toContain('Testing infrastructure (1,782 tests in the latest release check)');
    expect(readme).toContain('Dashboard quick actions route to implemented launch surfaces');
    expect(readme).toContain('Every Work Pattern Is Different');
    expect(readme).toContain('work location, and reminder settings');
    expect(readme).toContain(
      'heading to a work location, ward, depot, airport, plant, venue, or control room'
    );
    expect(readme).toContain('Full Schedule tab');
    expect(readme).toContain('**Physical device smoke**: still required before store submission');
    expect(readme).toContain('Jest (1,782 tests in the latest release check)');
    expect(readme).toContain('Current Status (as of 2026-06-05 release check)');
    expect(readme).toContain('Total Tests**: 1,782 passing (110 Jest suites, 4 snapshots)');
    expect(readme).not.toContain('1,732 Tests');
    expect(readme).not.toContain('### 📋 Phase 4: Main App (Planned)');
    expect(readme).not.toContain('- [ ] Home screen with "Tomorrow: [Shift Type]" display');
    expect(readme).not.toContain('E2E Tests (Planned)');
    expect(readme).not.toContain('Total Tests**: 1,701 passing (51 test suites)');
    expect(readme).not.toContain('Jest (1,500 tests)');
    expect(readme).not.toContain('github.com/IlyasuSeidu/ryvro');
    expect(readme).not.toContain('Works on-site');
    expect(readme).not.toContain('Every Site Is Different');
    expect(readme).not.toContain('location/site');
    expect(readme).not.toContain('heading to site');
    expect(readme).not.toContain('FIREBASE_PROJECT_ID=your_project_id');
    expect(readme).not.toContain('FIREBASE_STORAGE_BUCKET=your_storage_bucket');
  });

  it('keeps the offline-first strategy aligned with the current NetInfo implementation', () => {
    const offlineStrategy = fs.readFileSync(
      path.join(process.cwd(), 'docs/OFFLINE_FIRST_STRATEGY.md'),
      'utf8'
    );
    const dataSyncService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/DataSyncService.ts'),
      'utf8'
    );
    const firebaseService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/firebase/FirebaseService.ts'),
      'utf8'
    );
    const networkService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/NetworkService.ts'),
      'utf8'
    );
    const useNetworkStatus = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/useNetworkStatus.ts'),
      'utf8'
    );
    const offlineBanner = fs.readFileSync(
      path.join(process.cwd(), 'src/components/system/OfflineBanner.tsx'),
      'utf8'
    );
    const syncStatusIndicator = fs.readFileSync(
      path.join(process.cwd(), 'src/components/system/SyncStatusIndicator.tsx'),
      'utf8'
    );
    const usePendingSyncStatus = fs.readFileSync(
      path.join(process.cwd(), 'src/hooks/usePendingSyncStatus.ts'),
      'utf8'
    );
    const app = fs.readFileSync(path.join(process.cwd(), 'App.tsx'), 'utf8');
    const storageMaintenanceService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/StorageMaintenanceService.ts'),
      'utf8'
    );
    const cacheConfig = fs.readFileSync(
      path.join(process.cwd(), 'src/config/cacheConfig.ts'),
      'utf8'
    );
    const shiftDataService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/ShiftDataService.ts'),
      'utf8'
    );
    const holidayService = fs.readFileSync(
      path.join(process.cwd(), 'src/services/HolidayService.ts'),
      'utf8'
    );

    expect(packageJson.dependencies?.['@react-native-community/netinfo']).toBeTruthy();
    expect(networkService).toContain("require('@react-native-community/netinfo')");
    expect(dataSyncService).toContain('networkService.subscribe((snapshot)');
    expect(firebaseService).toContain('networkService.subscribe((snapshot)');
    expect(useNetworkStatus).toContain('networkService.subscribe(setSnapshot)');
    expect(offlineBanner).toContain('useNetworkStatus()');
    expect(syncStatusIndicator).toContain('usePendingSyncStatus()');
    expect(usePendingSyncStatus).toContain('STORAGE_KEYS.users.pendingMutationPrefix');
    expect(usePendingSyncStatus).toContain('STORAGE_KEYS.shiftLogs.pendingPrefix');
    expect(usePendingSyncStatus).toContain('STORAGE_KEYS.sessions.pendingPrefix');
    expect(usePendingSyncStatus).toContain('STORAGE_KEYS.analytics.pendingEvents');
    expect(app).toContain('<OfflineBanner />');
    expect(app).toContain('<SyncStatusIndicator />');
    expect(app).toContain('storageMaintenanceService.initialize()');
    expect(storageMaintenanceService).toContain('this.storage.removeExpired()');
    expect(storageMaintenanceService).toContain('CACHE_TTL_MS.storageMaintenanceInterval');
    expect(cacheConfig).toContain('shiftSchedules: 7 * MS_PER_DAY');
    expect(cacheConfig).toContain('holidays: 30 * MS_PER_DAY');
    expect(cacheConfig).toContain('voiceAssistantPersistence: 12 * 60 * 60');
    expect(shiftDataService).toContain('CACHE_TTL_MS.shiftSchedules');
    expect(holidayService).toContain('CACHE_TTL_MS.holidays');
    expect(offlineStrategy).toContain('NetInfo-backed network state');
    expect(offlineStrategy).toContain('remote work locations');
    expect(offlineStrategy).toContain('Resolved since the original audit');
    expect(offlineStrategy).toContain('Network status hook');
    expect(offlineStrategy).toContain('Offline banner');
    expect(offlineStrategy).toContain('Pending sync indicator');
    expect(offlineStrategy).toContain('Storage cleanup maintenance');
    expect(offlineStrategy).toContain('Runtime cache TTLs live in `src/config/cacheConfig.ts`');
    expect(offlineStrategy).not.toContain('No shared cache TTL constants');
    expect(offlineStrategy).not.toContain('No pending-sync indicator in edit flows');
    expect(offlineStrategy).not.toContain('Network detection hardcoded to `true`');
    expect(offlineStrategy).not.toContain('Queue never activates');
    expect(offlineStrategy).not.toContain('@react-native-community/netinfo` not installed');
    expect(offlineStrategy).not.toContain('No offline banner or sync indicator');
    expect(offlineStrategy).not.toContain('No app-level network context/hook');
    expect(offlineStrategy).not.toContain('Startup cache expiry sweep needs stronger evidence');
    expect(offlineStrategy).not.toContain('remote sites');
  });

  it('keeps active contributor setup on the current Ryvro app repository', () => {
    const contributing = fs.readFileSync(path.join(process.cwd(), 'docs/CONTRIBUTING.md'), 'utf8');

    expect(contributing).toContain(
      'git remote add upstream https://github.com/IlyasuSeidu/Ellie.git'
    );
    expect(contributing).toContain('git clone https://github.com/YOUR_USERNAME/Ellie.git');
    expect(contributing).toContain('cd Ellie');
    expect(contributing).not.toContain(
      'git remote add upstream https://github.com/IlyasuSeidu/ryvro.git'
    );
    expect(contributing).not.toContain('git clone https://github.com/YOUR_USERNAME/ryvro.git');
    expect(contributing).not.toContain('cd ryvro');
  });

  it('keeps the active deployment guide aligned with Ryvro release preflight', () => {
    const deploymentGuide = fs.readFileSync(path.join(process.cwd(), 'docs/DEPLOYMENT.md'), 'utf8');

    expect(deploymentGuide).toContain('docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md');
    expect(deploymentGuide).toContain('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
    expect(deploymentGuide).toContain('RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md');
    expect(deploymentGuide).toContain('RYVRO_RELEASE_TASKS.md');
    expect(deploymentGuide).toContain('npm run release:env:check');
    expect(deploymentGuide).toContain('SHIFT_SCHEDULE_PARSER_URL');
    expect(deploymentGuide).toContain('parser timeout/length values');
    expect(deploymentGuide).toContain(
      'retired `ELLIE_BRAIN_*` values must be removed before Ryvro release builds'
    );
    expect(deploymentGuide).not.toContain('legacy `ELLIE_BRAIN_*` values are migration fallbacks');
    expect(deploymentGuide).toContain(
      'Do not start release builds from `.env.example`; that file is for local development defaults'
    );
    expect(deploymentGuide).toContain(
      '`.env.production.example` when the key is required for release builds'
    );
    expect(deploymentGuide).toContain('eas secret:push --scope project --env-file .env');
    expect(deploymentGuide).toContain('Do not replace the committed `eas.json`');
    expect(deploymentGuide).toContain('"version": ">= 12.0.0"');
    expect(deploymentGuide).toContain('"node": "20.19.4"');
    expect(deploymentGuide).toContain('"buildType": "app-bundle"');
    expect(deploymentGuide).toContain('`npm run release:submit:check` must fail until');
    expect(deploymentGuide).toContain("name: 'Ryvro Shift Planner'");
    expect(deploymentGuide).toContain("slug: 'ryvro'");
    expect(deploymentGuide).toContain("scheme: 'ryvro'");
    expect(deploymentGuide).toContain("icon: './assets/icon.png'");
    expect(deploymentGuide).toContain("splash.image: './assets/splash-icon.png'");
    expect(deploymentGuide).toContain('iOS bundle identifier `com.ryvro.shiftplanner`');
    expect(deploymentGuide).toContain('Android package `com.ryvro.shiftplanner`');
    expect(deploymentGuide).toContain('native display name `Ryvro`');
    expect(deploymentGuide).toContain('Ryvro function defaults for `ryvroBrain`');
    expect(deploymentGuide).toContain('"ascAppId": "6776994726"');
    expect(deploymentGuide).toContain('"serviceAccountKeyPath": "./google-play-key.json"');
    expect(deploymentGuide).toContain('eas submit --platform ios --latest');
    expect(deploymentGuide).toContain('eas submit --platform android --latest');
    expect(deploymentGuide).not.toContain('eas submit --platform ios --profile production');
    expect(deploymentGuide).not.toContain('eas submit --platform android --profile production');
    expect(deploymentGuide).toContain('ryvro-upload-key.keystore');
    expect(deploymentGuide).toContain('RYVRO_UPLOAD_*');
    expect(deploymentGuide).not.toContain('"permissions": ["CAMERA"');
    expect(deploymentGuide).not.toContain('READ_EXTERNAL_STORAGE');
    expect(deploymentGuide).not.toContain('WRITE_EXTERNAL_STORAGE');
    expect(deploymentGuide).not.toContain('"image": "./assets/splash.png"');
    expect(deploymentGuide).not.toContain('"projectId": "your-project-id"');
    expect(deploymentGuide).not.toContain('your-api-key');
    expect(deploymentGuide).not.toContain('your-apple-id@example.com');
    expect(deploymentGuide).not.toContain('your-app-store-connect-id');
    expect(deploymentGuide).not.toContain('your-team-id');
    expect(deploymentGuide).not.toContain('FILL_AFTER_APP_STORE_CONNECT_APP_EXISTS');
  });

  it('keeps the active API reference aligned with Ryvro launch configuration', () => {
    const apiReference = fs.readFileSync(path.join(process.cwd(), 'docs/API_REFERENCE.md'), 'utf8');

    expect(apiReference).toContain('POST /ryvroBrain');
    expect(apiReference).toContain('"occupation": "Nurse"');
    expect(apiReference).toContain('"industry": "healthcare"');
    expect(apiReference).toContain('FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app');
    expect(apiReference).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(apiReference).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://us-central1-your-project-id.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(apiReference).toContain('EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx');
    expect(apiReference).toContain('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx');
    expect(apiReference).toContain('LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy');
    expect(apiReference).toContain('ACCOUNT_DELETION_URL=https://getryvro.com/delete-account');
    expect(apiReference).toContain('npm run release:env:check');
    expect(apiReference).toContain('<repo-root>/GoogleService-Info.plist');
    expect(apiReference).toContain('<repo-root>/google-services.json');
    expect(apiReference).toContain('EXPO_IOS_GOOGLE_SERVICES_FILE');
    expect(apiReference).toContain('EXPO_ANDROID_GOOGLE_SERVICES_FILE');
    expect(apiReference).toContain('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
    expect(apiReference).toContain('Constants.expoConfig?.extra?.FIREBASE_API_KEY');
    expect(apiReference).toContain('Constants.expoConfig?.extra?.RYVRO_BRAIN_URL');
    expect(apiReference).not.toContain('ryvro-brain-REGION-PROJECT');
    expect(apiReference).not.toContain('your_project_id.appspot.com');
    expect(apiReference).not.toContain('Constants.expoConfig?.extra?.firebaseApiKey');
    expect(apiReference).not.toContain('Constants.expoConfig?.extra?.apiTimeout');
    expect(apiReference).not.toContain('"name": "Alex"');
    expect(apiReference).not.toContain('"patternType": "FIFO_8_6"');
  });

  it('keeps backend deployment notes on both Ryvro HTTPS function URLs', () => {
    const backendReadme = fs.readFileSync(path.join(process.cwd(), 'backend/README.md'), 'utf8');

    expect(backendReadme).toContain(
      'RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain'
    );
    expect(backendReadme).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(backendReadme).toContain(
      'New Ryvro builds do not accept `ELLIE_BRAIN_URL` or deploy an `ellieBrain` compatibility endpoint.'
    );
  });

  it('keeps the release task checklist on Ryvro and repo-root release paths', () => {
    const releaseTasks = fs.readFileSync(
      path.join(process.cwd(), 'RYVRO_RELEASE_TASKS.md'),
      'utf8'
    );

    expect(releaseTasks).toContain(
      'Last updated: June 5, 2026 (Ryvro rebrand, universal builder rollout, broad launch personas, research-funnel docs, research sequence persona hooks, production Firebase service-file preflight, screenshot capture checklist, final submit evidence guard, Firebase-project-derived backend function defaults, retired Ellie voice endpoint fallback removal, FIFO work-block language cleanup, work-location icon source guidance, localized FIFO helper copy cleanup, localized mining-only launch-proof cleanup, mining FIFO template work-location cleanup, voice rest-block tool copy cleanup, deployment-guide EAS/app-config cleanup, storage-key symbol cleanup, native-scaffold verifier cleanup, wake-word filename cleanup, Firebase service sidecar symbol cleanup, asset checklist reconciliation, industry template visual badge checklist reconciliation, working tracker reconciliation, social profile and landing-page source copy, settings builder entry coverage, settings color/icon coverage, latest public clearance evidence at 11:04Z, iOS simulator onboarding, dashboard, mobile-fit proof, consolidated onboarding icon density coverage, user-safe Ryvro Pro fallback copy, localized Profile help/legal copy, Ryvro Pro unavailable/unconfigured copy cleanup, Ryvro Pro runtime diagnostics cleanup, Play Console account-type handoff, iOS IPA identity proof, Android AAB proof, RevenueCat project and Android app handoff, task checklist reconciliation, static launch legal/support pages, device QA evidence template, and recent pushed PR #1 CI pass `27014539880` on `8b277ee`)'
    );
    expect(releaseTasks).toContain('## Phase 0 — External Clearance And Reservation');
    expect(releaseTasks).toContain('npm run release:clearance');
    expect(releaseTasks).toContain('latest public evidence: 2026-06-05 11:04Z');
    expect(releaseTasks).not.toContain('latest public evidence: 2026-05-31 19:32Z');
    expect(releaseTasks).not.toContain('latest public evidence: 2026-05-31 07:14Z');
    expect(releaseTasks).toContain('formal trademark/legal clearance for `Ryvro`');
    expect(releaseTasks).toContain(
      'Reserve or create App Store Connect app name `Ryvro Shift Planner`'
    );
    expect(releaseTasks).toContain('✅ Done (ASC app ID `6776994726`)');
    expect(releaseTasks).toContain(
      'Reserve or create Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`'
    );
    expect(releaseTasks).toContain('`getryvro.com` as the current cleanest public candidate');
    expect(releaseTasks).toContain('starting with `@ryvro`');
    expect(releaseTasks).toContain('com.ryvro.shiftplanner');
    expect(releaseTasks).toContain('CFBundleDisplayName = Ryvro');
    expect(releaseTasks).toContain('RyvroShiftPlanner.xcworkspace');
    expect(releaseTasks).toContain('-scheme RyvroShiftPlanner');
    expect(releaseTasks).toContain(
      'Add RevenueCat native/public key and entitlement placeholders to `.env.example`, `.env.production.example`, runtime config, and `npm run release:env:check`'
    );
    expect(releaseTasks).toContain(
      'iOS app save is blocked on App Store Connect in-app purchase p8 key, Key ID, and Issuer ID'
    );
    expect(releaseTasks).toContain('Android app `Ryvro (Play Store)` exists as `appab0f4b628d`');
    expect(releaseTasks).toContain('Team ID `BZ798WZJCB`');
    expect(releaseTasks).toContain(
      '`@ilyasu/ryvro`, project ID `b306643e-1688-448e-8acd-f72bf74312c3`'
    );
    expect(releaseTasks).toContain(
      'distribution certificate and provisioning profile active through March 11, 2027'
    );
    expect(releaseTasks).toContain(
      'Align research-funnel runtime personas, docs, scoring, and automation prompts with Ryvro'
    );
    expect(releaseTasks).toContain(
      'Derive the Google Sign-In iOS URL scheme from `GOOGLE_IOS_CLIENT_ID`'
    );
    expect(releaseTasks).toContain(
      'Pin dynamic Expo config fallbacks for Apple Sign-In, iOS privacy strings'
    );
    expect(releaseTasks).toContain(
      'Require the Ryvro production env preflight to validate real root-level Firebase native service files'
    );
    expect(releaseTasks).toContain(
      'rejecting tracked local placeholders and generated native-folder paths'
    );
    expect(releaseTasks).toContain('Use `docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md`');
    expect(releaseTasks).toContain('`docs/RYVRO_LAUNCH_EVIDENCE_LOG.md`');
    expect(releaseTasks).toContain('non-secret evidence ledger');
    expect(releaseTasks).toContain(
      'Guard final EAS submit readiness with `npm run release:submit:check`'
    );
    expect(releaseTasks).toContain('npm run release:submit:check');
    expect(releaseTasks).toContain(
      'Verify Firebase Cloud Functions are deployed: `curl` the configured `RYVRO_BRAIN_URL` endpoint and `SHIFT_SCHEDULE_PARSER_URL` endpoint'
    );
    expect(releaseTasks).toContain(
      'parser launch evidence must include a valid-prompt `200` draft response'
    );
    expect(releaseTasks).toContain(
      'Add app-level offline/pending-sync status visibility for queued local writes'
    );
    expect(releaseTasks).toContain(
      'Centralize runtime cache TTL policy for launch offline caches and recovery windows'
    );
    expect(releaseTasks).toContain('Repo-side offline basics are now covered');
    expect(releaseTasks).toContain('Physical-device QA still has to prove');
    expect(releaseTasks).toContain(
      'EAS iOS build `c99b0e0a-829c-4ab7-bd93-164586ade68a` uploaded to TestFlight'
    );
    expect(releaseTasks).toContain(
      'EAS Android AAB `318b4e8f-b344-4ed9-8bcd-a5805093339d` proves package `com.ryvro.shiftplanner`'
    );
    expect(releaseTasks).toContain('EAS Submit `c17b593c-7909-42db-96f6-a81f095f7479`');
    expect(releaseTasks).toContain(
      'Install Play internal testing build or a store-signed Android QA build'
    );
    expect(releaseTasks).toContain(
      'Fresh install → complete onboarding via Universal Shift Builder template start with a non-mining template'
    );
    expect(releaseTasks).toContain('oil/gas offshore, transport, warehouse logistics');
    expect(releaseTasks).toContain(
      'Fresh install → complete onboarding via Universal Shift Builder AI description with a FIFO/block-roster or rotating-shift prompt'
    );
    expect(releaseTasks).not.toContain('FIFO/mining or rotating-shift prompt');
    expect(releaseTasks).toContain(
      'Fresh install → complete onboarding via Universal Shift Builder manual setup with custom shift names, colors, icons, reminders, exceptions, and calendar export enabled'
    );
    expect(releaseTasks).toContain('cd <repo-root>');
    expect(releaseTasks).toContain('-archivePath /tmp/Ryvro.xcarchive archive');
    expect(releaseTasks).not.toContain('complete onboarding via rotating roster path');
    expect(releaseTasks).not.toContain('complete onboarding via FIFO path');
    expect(releaseTasks).not.toContain('all 13 items');
    expect(releaseTasks).not.toContain('/Users/Shared/Ellie');
    expect(releaseTasks).not.toContain('/tmp/Ellie.xcarchive');
    expect(releaseTasks).not.toContain('PRODUCT_NAME = Ellie');
  });

  it('keeps EAS build and submit scaffolding aligned to Ryvro release flow', () => {
    const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
    const trackedFiles = execFileSync('git', ['ls-files'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(easJson.cli?.appVersionSource).toBe('remote');
    expect(easJson.build?.development?.developmentClient).toBe(true);
    expect(easJson.build?.development?.distribution).toBe('internal');
    expect(easJson.build?.preview?.distribution).toBe('internal');
    expect(easJson.build?.production?.ios?.buildConfiguration).toBe('Release');
    expect(easJson.build?.production?.android?.buildType).toBe('app-bundle');
    expect(easJson.submit?.production?.ios?.appleId).toBe('seiduilyasu94@gmail.com');
    expect(easJson.submit?.production?.ios?.ascAppId).toBe('6776994726');
    expect(easJson.submit?.production?.ios?.appleTeamId).toBe('BZ798WZJCB');
    expect(easJson.submit?.production?.android?.serviceAccountKeyPath).toBe(
      './google-play-key.json'
    );
    expect(easJson.submit?.production?.android?.track).toBe('internal');
    expect(packageJson.scripts?.['release:submit:check']).toBe(
      'node scripts/verify-ryvro-submit-readiness.js'
    );
    expect(gitignore).toContain('google-play-key.json');
    expect(trackedFiles).not.toContain('google-play-key.json');
  });

  it('keeps the Ryvro release readiness report explicit about evidence and remaining blockers', () => {
    const readinessReport = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_RELEASE_READINESS_REPORT.md'),
      'utf8'
    );

    expect(readinessReport).toContain(
      'production env preflight now rejects retired `ELLIE_BRAIN_*` keys'
    );
    expect(readinessReport).toContain(
      'New Expo config no longer exports legacy `ELLIE_BRAIN_*` extras'
    );
    expect(readinessReport).not.toContain('preserving old `ELLIE_BRAIN_*` keys');
    expect(readinessReport).not.toContain('legacy brain values stay empty');
    expect(readinessReport).toContain('CI run `26659012373`');
    expect(readinessReport).toContain('commit `92a52ab`');
    expect(readinessReport).toContain('commit `610795d`');
    expect(readinessReport).toContain('CI run `26678024310`');
    expect(readinessReport).toContain('commit `e638418`');
    expect(readinessReport).toContain('CI run `26679223794`');
    expect(readinessReport).toContain('commit `47441dd`');
    expect(readinessReport).toContain('CI run `26704558053`');
    expect(readinessReport).toContain('commit `3d85add`');
    expect(readinessReport).toContain('CI run `26704249051`');
    expect(readinessReport).toContain('commit `82909cc`');
    expect(readinessReport).toContain('CI run `26705470020`');
    expect(readinessReport).toContain('commit `b001c10`');
    expect(readinessReport).toContain('CI run `26705685141`');
    expect(readinessReport).toContain('commit `7115d85`');
    expect(readinessReport).toContain('CI run `26706091677`');
    expect(readinessReport).toContain('commit `df0b161`');
    expect(readinessReport).toContain('CI run `26706309637`');
    expect(readinessReport).toContain('commit `5b63d05`');
    expect(readinessReport).toContain('CI run `26706418121`');
    expect(readinessReport).toContain('commit `6b1c125`');
    expect(readinessReport).toContain('CI run `26706616710`');
    expect(readinessReport).toContain('commit `c1fd791`');
    expect(readinessReport).toContain('CI run `26706771178`');
    expect(readinessReport).toContain('commit `cd8bd5f`');
    expect(readinessReport).toContain('commit `680454e`');
    expect(readinessReport).toContain('CI run `26707724396`');
    expect(readinessReport).toContain('commit `71e70f1`');
    expect(readinessReport).toContain('CI run `26707866556`');
    expect(readinessReport).toContain('commit `7c33bd4`');
    expect(readinessReport).toContain('CI run `26707996159`');
    expect(readinessReport).toContain('commit `9bdae31`');
    expect(readinessReport).toContain('CI run `26708126932`');
    expect(readinessReport).toContain('commit `2202b94`');
    expect(readinessReport).toContain('CI run `26711015976`');
    expect(readinessReport).toContain('commit `4d7519e`');
    expect(readinessReport).toContain('CI run `26712571047`');
    expect(readinessReport).toContain('commit `0edba23`');
    expect(readinessReport).toContain('CI run `26714150098`');
    expect(readinessReport).toContain('commit `55beb97`');
    expect(readinessReport).toContain('CI run `26713667593`');
    expect(readinessReport).toContain('commit `37057ae`');
    expect(readinessReport).toContain('CI run `26713338408`');
    expect(readinessReport).toContain('commit `1deb795`');
    expect(readinessReport).toContain('CI run `26712150556`');
    expect(readinessReport).toContain('commit `134a5ca`');
    expect(readinessReport).toContain('CI run `26711178813`');
    expect(readinessReport).toContain('commit `d2a45bb`');
    expect(readinessReport).toContain('CI run `26711322778`');
    expect(readinessReport).toContain('commit `1892dcb`');
    expect(readinessReport).toContain('CI run `26707461391`');
    expect(readinessReport).toContain('commit `c07d19e`');
    expect(readinessReport).toContain('CI run `26707609409`');
    expect(readinessReport).toContain('CI run `26707355628`');
    expect(readinessReport).toContain('CI run `26707093043`');
    expect(readinessReport).toContain('CI run `26706926728`');
    expect(readinessReport).toContain('commit `7bd2cf4`');
    expect(readinessReport).toContain(
      'commits `f004097`, `10353e7`, `3f92d56`, `90d403d`, and `82fd530`'
    );
    expect(readinessReport).toContain('passed Lint and Type Check, Unit Tests, and Build Check');
    expect(readinessReport).toContain('106 Jest suites / 1,729 tests');
    expect(readinessReport).toContain('106 Jest suites / 1,732 tests');
    expect(readinessReport).toContain('106 Jest suites / 1,734 tests');
    expect(readinessReport).toContain('106 Jest suites / 1,735 tests');
    expect(readinessReport).toContain('108 Jest suites / 1,740 tests');
    expect(readinessReport).toContain('adding global pending-sync visibility');
    expect(readinessReport).toContain('109 Jest suites / 1,742 tests');
    expect(readinessReport).toContain('centralizing cache TTL policy');
    expect(readinessReport).toContain('109 Jest suites / 1,743 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,745 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,746 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,747 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,748 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,749 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,750 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,751 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,752 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,753 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,754 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,755 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,756 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,757 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,758 tests');
    expect(readinessReport).toContain('109 Jest suites / 1,759 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,760 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,761 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,765 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,766 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,767 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,771 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,776 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,781 tests');
    expect(readinessReport).toContain('110 Jest suites / 1,782 tests');
    expect(readinessReport).toContain('Profile legal/support link coverage');
    expect(readinessReport).toContain(
      'requiring real root-level Firebase native service files for Ryvro production builds'
    );
    expect(readinessReport).toContain(
      'Production env preflight now requires real root-level Firebase native service files'
    );
    expect(readinessReport).toContain('CI run `26714544097`');
    expect(readinessReport).toContain('commit `35ea875`');
    expect(readinessReport).toContain('CI run `26714684603`');
    expect(readinessReport).toContain('commit `1bc3031`');
    expect(readinessReport).toContain('CI run `26715426451`');
    expect(readinessReport).toContain('commit `a019d6c`');
    expect(readinessReport).toContain('CI run `27014539880`');
    expect(readinessReport).toContain('commit `8b277ee`');
    expect(readinessReport).toContain('CI run `27013691021`');
    expect(readinessReport).toContain('commit `8d24c2a`');
    expect(readinessReport).toContain('CI run `27011414391`');
    expect(readinessReport).toContain('commit `6fcced7`');
    expect(readinessReport).toContain('CI run `27011090251`');
    expect(readinessReport).toContain('commit `00cb507`');
    expect(readinessReport).toContain('CI run `27009866646`');
    expect(readinessReport).toContain('commit `94d5ad0`');
    expect(readinessReport).toContain('CI run `27003005078`');
    expect(readinessReport).toContain('commit `b157126`');
    expect(readinessReport).toContain('CI run `27002675763`');
    expect(readinessReport).toContain('commit `02947b1`');
    expect(readinessReport).toContain('CI run `27002389818`');
    expect(readinessReport).toContain('commit `23d1a71`');
    expect(readinessReport).toContain('CI run `27002002928`');
    expect(readinessReport).toContain('commit `cf9f7e2`');
    expect(readinessReport).toContain('CI run `26776633987`');
    expect(readinessReport).toContain('commit `7a51dc6`');
    expect(readinessReport).toContain('CI run `26776194564`');
    expect(readinessReport).toContain('commit `63cbbef`');
    expect(readinessReport).toContain('CI run `26735606843`');
    expect(readinessReport).toContain('commit `f194981`');
    expect(readinessReport).toContain(
      'fresh Welcome, pain-hook, introduction, and Universal Shift Builder entry path'
    );
    expect(readinessReport).toContain('active universal shift icon from the healthcare template');
    expect(readinessReport).toContain('signed-out auth controls, fresh onboarding CTA');
    expect(readinessReport).toContain('profile language/settings controls');
    expect(readinessReport).toContain('CI run `26728238458`');
    expect(readinessReport).toContain('commit `d7f8f0e`');
    expect(readinessReport).toContain('CI run `26727972848`');
    expect(readinessReport).toContain('commit `5bee483`');
    expect(readinessReport).toContain('CI run `26727672100`');
    expect(readinessReport).toContain('commit `3d494f8`');
    expect(readinessReport).toContain('CI run `26727544770`');
    expect(readinessReport).toContain('commit `9baa0ba`');
    expect(readinessReport).toContain('CI run `26727378127`');
    expect(readinessReport).toContain('commit `5101ca3`');
    expect(readinessReport).toContain('CI run `26722400690`');
    expect(readinessReport).toContain('commit `4af8a23`');
    expect(readinessReport).toContain('CI run `26721974527`');
    expect(readinessReport).toContain('commit `20f4758`');
    expect(readinessReport).toContain('CI run `26721813503`');
    expect(readinessReport).toContain('commit `e18acb5`');
    expect(readinessReport).toContain('CI run `26721538596`');
    expect(readinessReport).toContain('commit `dd1b0ce`');
    expect(readinessReport).toContain(
      'adding Day 1 research-sequence hooks for every launch persona'
    );
    expect(readinessReport).toContain(
      'adding social-handle and final store-submission rows to the submit-readiness evidence guard'
    );
    expect(readinessReport).toContain('adding the store screenshot capture checklist');
    expect(readinessReport).toContain('Screenshot capture checklist now defines store-ready');
    expect(readinessReport).toContain(
      'recording the Firebase service-file gate in the launch handoff'
    );
    expect(readinessReport).toContain(
      'deriving Ryvro Cloud Function defaults from `FIREBASE_PROJECT_ID`'
    );
    expect(readinessReport).toContain('CI run `26714296664`');
    expect(readinessReport).toContain('commit `574f3b1`');
    expect(readinessReport).toContain('Release native scaffold preflight now runs');
    expect(readinessReport).toContain('adding the Ryvro native scaffold preflight');
    expect(readinessReport).toContain('Store readiness preflight now runs');
    expect(readinessReport).toContain('adding the store metadata preflight');
    expect(readinessReport).toContain('Owner handoff preflight now runs');
    expect(readinessReport).toContain('adding the owner-only launch blocker preflight');
    expect(readinessReport).toContain(
      'Final EAS submit readiness now has a separate owner-only guard'
    );
    expect(readinessReport).toContain('npm run release:submit:check');
    expect(readinessReport).toContain('aligning Firebase service-file paths');
    expect(readinessReport).toContain('clean-generated `RyvroShiftPlanner` iOS scaffolding');
    expect(readinessReport).toContain(
      'GitHub Actions CI now includes a dedicated `Release Check` job'
    );
    expect(readinessReport).toContain(
      'dedicated Release Check job running `npm run release:check`'
    );
    expect(readinessReport).toContain('installing backend function dependencies inside that job');
    expect(readinessReport).toContain('legal and support URLs to be live HTTPS Ryvro-owned URLs');
    expect(readinessReport).toContain('requiring Ryvro-owned legal/support URLs');
    expect(readinessReport).toContain('aligning dynamic Expo version fallbacks');
    expect(readinessReport).toContain('refreshing public clearance evidence');
    expect(readinessReport).toContain(
      'tightening the production env preflight for EAS UUIDs and RevenueCat entitlement mirrors'
    );
    expect(readinessReport).toContain(
      'adding Google OAuth native/public mirror checks to the production env preflight'
    );
    expect(readinessReport).toContain(
      'adding Firebase value-shape and project-scope checks to the production env preflight'
    );
    expect(readinessReport).toContain(
      'adding live HTTPS API base URL checks to the production env preflight'
    );
    expect(readinessReport).toContain('removing retired Arabic Ellie labels');
    expect(readinessReport).toContain('broadening backend research-funnel runtime personas');
    expect(readinessReport).toContain(
      'aligning active research-funnel docs and automation prompts with the broad runtime persona model'
    );
    expect(readinessReport).toContain(
      'active research-funnel operating-system and automation prompt docs now match the runtime launch-persona model'
    );
    expect(readinessReport).toContain('First-store-build version values are aligned');
    expect(readinessReport).toContain(
      'Production env preflight now requires the real EAS project UUID'
    );
    expect(readinessReport).toContain(
      'Production env preflight also requires Expo public Google OAuth client IDs'
    );
    expect(readinessReport).toContain(
      "Dynamic Expo config now derives the Google Sign-In plugin's iOS URL scheme"
    );
    expect(readinessReport).toContain(
      'Dynamic Expo config now also pins launch native capability fallbacks'
    );
    expect(readinessReport).toContain(
      'Production env preflight now rejects retired Ellie/ShiftSync Firebase project IDs'
    );
    expect(readinessReport).toContain('Owner launch runbook now sequences clearance');
    expect(readinessReport).toContain(
      'deriving the Google Sign-In iOS URL scheme from the Ryvro OAuth client ID'
    );
    expect(readinessReport).toContain(
      'rejecting retired Firebase project IDs and Cloud Function hosts'
    );
    expect(readinessReport).toContain(
      'adding the App Store privacy, Google Play Data safety, content rating'
    );
    expect(readinessReport).toContain(
      'adding the sequenced owner launch runbook and refreshing pushed CI evidence'
    );
    expect(readinessReport).toContain(
      'Production env preflight now validates the Firebase API key'
    );
    expect(readinessReport).toContain(
      'Production env preflight now rejects unsafe production `API_BASE_URL` values'
    );
    expect(readinessReport).toContain('Global pending-sync visibility now surfaces queued');
    expect(readinessReport).toContain('Runtime cache TTL policy is centralized');
    expect(readinessReport).toContain(
      'aligning offline-first docs with the current NetInfo-backed implementation'
    );
    expect(readinessReport).toContain(
      'Local release verification on 2026-05-31 passed `git diff --check`, focused readiness/audit config tests'
    );
    expect(readinessReport).toContain('`npm run release:clearance`');
    expect(readinessReport).toContain(
      'focused README/deployment-plan config tests, and `npm run release:check`'
    );
    expect(readinessReport).toContain(
      'fresh onboarding E2E happy path uses non-mining healthcare worker data'
    );
    expect(readinessReport).toContain(
      'launch smoke-test matrix now follows the shipped Universal Shift Builder entry modes'
    );
    expect(readinessReport).toContain(
      'non-mining template start, FIFO/block-roster or rotating-shift AI description, and manual custom setup'
    );
    expect(readinessReport).not.toContain('FIFO/mining or rotating-shift AI description');
    expect(readinessReport).toContain('oil/gas offshore, transport/logistics, warehouse logistics');
    expect(readinessReport).toContain(
      'active API reference now uses a broad healthcare rotating-schedule example'
    );
    expect(readinessReport).toContain('RYVRO_BRAIN_*');
    expect(readinessReport).toContain('ryvroBrain');
    expect(readinessReport).toContain(
      'Production Firebase deploy and smoke tests for both `ryvroBrain` and `parseShiftScheduleDescription`'
    );
    expect(readinessReport).toContain(
      'valid-prompt `SHIFT_SCHEDULE_PARSER_URL` `200` draft response'
    );
    expect(readinessReport).toContain(
      'Schedule and Stats helper screens no longer present launch users with "Coming Soon" copy'
    );
    expect(readinessReport).toContain('Prior completed pushed GitHub Actions baseline');
    expect(readinessReport).toContain('Repo-Proven Status');
    expect(readinessReport).toContain('internal OpenWakeWord Expo module now uses Ryvro-branded');
    expect(readinessReport).toContain('Device QA Notes');
    expect(readinessReport).toContain('Account-Only Work');
    expect(readinessReport).toContain('Focused Phase 9 automated QA passed on 2026-05-29');
    expect(readinessReport).toContain('8 suites, 162 tests');
    expect(readinessReport).toContain('4 suites, 107 tests');
    expect(readinessReport).toContain('TypeScript build plus 38 Node tests');
    expect(readinessReport).toContain(
      'completed E2E onboarding seeds carry Universal Shift Builder schedules'
    );
    expect(readinessReport).toContain('15 dashboard smoke tests');
    expect(readinessReport).toContain('iPhone XS Max simulator');
    expect(readinessReport).toContain('Small-screen simulator QA passed on an iPhone XS Max');
    expect(readinessReport).toContain('Android debug build passed on 2026-05-29');
    expect(readinessReport).toContain('Android release-style Detox build passed on 2026-05-29');
    expect(readinessReport).toContain(
      'Android release-style Detox dashboard smoke passed on 2026-05-29'
    );
    expect(readinessReport).toContain(
      'Android release-style Detox auth form/navigation smoke passed on 2026-05-29'
    );
    expect(readinessReport).toContain(
      'Android release-style Detox onboarding happy path passed on 2026-05-29'
    );
    expect(readinessReport).toContain(
      'Android release-style Detox profile language-selector smoke passed on 2026-05-29'
    );
    expect(readinessReport).toContain('Medium_Phone_API_36.0');
    expect(readinessReport).toContain('com.ryvro.shiftplanner');
    expect(readinessReport).toContain('15 Detox dashboard smoke tests');
    expect(readinessReport).toContain('16 auth tests');
    expect(readinessReport).toContain('3 profile tests');
    expect(readinessReport).toContain('Physical iPhone 13');
    expect(readinessReport).toContain('Physical iPhone XS Max');
    expect(readinessReport).toContain(
      'Physical Android device QA. Android release-style build, dashboard, auth form/navigation, onboarding through Universal Shift Builder'
    );
    expect(readinessReport).toContain('not as fully launch-cleared production release evidence');
    expect(readinessReport).not.toContain('no Android device or emulator was attached');
    expect(readinessReport).not.toContain('commit `4a78448`: CI run `26675838354`');
  });

  it('keeps the rebrand audit aligned with the retired Ellie brain endpoint removal', () => {
    const audit = fs.readFileSync(
      path.join(process.cwd(), 'SHIFT_WORKER_APP_REBRAND_AUDIT.md'),
      'utf8'
    );

    expect(audit).toContain('## Implementation Status: 2026-05-31');
    expect(audit).toContain('Removed from the tracked launch tree');
    expect(audit).toContain('Remove `app.config.js.backup` and guard against it returning.');
    expect(audit).toContain('removed retired `ELLIE_BRAIN_*` fallbacks from new Ryvro builds');
    expect(audit).toContain('kept `ryvroBrain` as the only launch HTTPS function export');
    expect(audit).toContain(
      'removed the retired `ellieBrain` HTTP export from active backend source'
    );
    expect(audit).toContain('CI run `27011713114` on commit `885089b`');
    expect(audit).toContain(
      'Added settings-panel regression coverage proving saved shift definition names, colors, icons, times, and cycle counts render in Profile settings.'
    );
    expect(audit).toContain(
      'Aligned the active deployment guide to the committed Ryvro `eas.json`, dynamic `app.config.js`, and guarded `npm run release:submit:check` plus `eas submit --latest` store-submission flow.'
    );
    expect(audit).toContain(
      'Renamed retired Ellie storage-key code symbols to neutral Ryvro-era `retired...` names while preserving the raw old keys only for migration/removal.'
    );
    expect(audit).toContain(
      'Tightened the Ryvro native scaffold verifier so active release checks inspect only `ios/RyvroShiftPlanner` generated paths instead of accepting old iOS project-name fallbacks.'
    );
    expect(audit).toContain(
      'Confirmed active wake-word keyword/model guidance uses Ryvro filenames (`ryvro_ios.ppn`, `ryvro_android.ppn`, and optional `openwakeword/ryvro.onnx`) with no active `hey_ellie`, `ellie_ios`, or `ellie_android` launch defaults.'
    );
    expect(audit).toContain(
      'Renamed the retired Firebase JS service sidecar code symbol to neutral Ryvro-era cleanup wording while preserving the raw old sidecar app name only as a compatibility lookup.'
    );
    expect(audit).toContain(
      'Reconciled the asset checklist with current launch asset evidence: production Expo icons, splash, favicon, neutral Ryvro assistant densities, retired helmet cleanup, first-pass industry visual badges, and consolidated onboarding icon density render checks are now tracked as done, while future optional bitmap scene thumbnails remain open.'
    );
    expect(audit).toContain(
      'Replaced developer-facing paywall fallback copy across bundled locales and hardcoded defaults so missing or unavailable subscription setup says Ryvro Pro is unavailable and directs users to update Ryvro or contact support instead of exposing RevenueCat, build, or EAS setup language.'
    );
    expect(audit).toContain(
      'Localized the launch-critical Profile help/legal labels, hints, and accessibility text across bundled non-English locales so support, account deletion, privacy, and terms rows no longer fall back to English.'
    );
    expect(audit).toContain(
      'Reconciled the older implementation tracker with current Ryvro evidence so repo-complete items are checked off and owner-only/live-device gaps remain explicit instead of mixed with stale implementation tasks.'
    );
    expect(audit).toContain(
      'Added repo-side social profile and launch landing-page source copy so the owner can publish external launch surfaces after handle/domain reservation without inventing new mining-only language.'
    );
    expect(audit).toContain(
      'Added focused settings-entry coverage proving Profile settings opens the Universal Shift Builder in both edit and create modes with the AI/manual builder affordance visible.'
    );
    expect(audit).toContain('Reconciled on 2026-05-31 against the current Ryvro branch evidence.');
    expect(audit).toContain('- [x] Rebrand `common.json`.');
    expect(audit).toContain('- [x] Verify onboarding AI builder entry.');
    expect(audit).toContain('- [x] Verify settings AI builder entry.');
    expect(audit).toContain('- [x] Verify settings manual builder entry.');
    expect(audit).toContain(
      '- [x] Builder is universal and complete from onboarding and settings.'
    );
    expect(audit).toContain('- [x] CI is green.');
    expect(audit).toContain('- [x] P0 repo task count complete: 18/18.');
    expect(audit).toContain('- [x] Draft social bios.');
    expect(audit).toContain('- [x] Draft landing page copy.');
    expect(audit).not.toContain('- [ ] Rebrand `common.json`.');
    expect(audit).not.toContain('- [ ] Verify onboarding AI builder entry.');
    expect(audit).not.toContain('- [ ] Verify settings AI builder entry.');
    expect(audit).not.toContain('- [ ] Verify settings manual builder entry.');
    expect(audit).not.toContain('- [ ] CI is green.');
    expect(audit).not.toContain('- [ ] P0 task count complete: 18/18.');
    expect(audit).not.toContain('- [ ] Update social bios.');
    expect(audit).not.toContain('- [ ] Update landing page copy if present.');
    expect(audit).toContain(
      'Any remaining legacy `Ellie` references are intentional compatibility inputs, migration removals, historical evidence, or test guards.'
    );
    expect(audit).not.toContain('and wake-word model filenames');
    expect(audit).toContain(
      'Broadened remaining translated FIFO helper tips and active voice-assistant rest-block tool copy away from site/off-site wording.'
    );
    expect(audit).toContain(
      'Broadened translated shift-system, assistant-avatar, and paywall offline copy that still framed launch proof around mines, underground work, or mining infrastructure.'
    );
    expect(audit).toContain(
      'Kept the mining/FIFO launch template explicit while changing its subtitle and parser example from site-based wording to work-location/remote-operations wording.'
    );
    expect(audit).toContain(
      'production env preflight now rejects retired `ELLIE_BRAIN_*` keys before release builds'
    );
    expect(audit).toContain(
      'Repo code no longer exposes the retired `ellieBrain` endpoint for new Ryvro builds'
    );
    expect(audit).not.toContain('preserving the old `ELLIE_BRAIN_*` keys as migration fallbacks');
    expect(audit).not.toContain('old `ellieBrain` export remains as a compatibility endpoint');
    expect(audit).not.toContain('both preferred and legacy compatibility variables');
    expect(audit).not.toContain('Repo code now exposes both endpoints');
    expect(audit).not.toContain('retaining legacy `ELLIE_BRAIN_*` fallbacks for migration');
    expect(audit).toContain('- [x] Replace app icon.');
    expect(audit).toContain('- [x] Replace adaptive icon.');
    expect(audit).toContain('- [x] Replace splash image.');
    expect(audit).toContain('- [x] Replace favicon.');
    expect(audit).toContain('- [x] Replace mining helmet assistant avatar in all density folders.');
    expect(audit).toContain('- [x] Replace consolidated mining helmet assets.');
    expect(audit).toContain('- [x] Add universal assistant/source asset.');
    expect(audit).toContain('- [x] Update import paths from old asset names where needed.');
    expect(audit).toContain('- [x] Add first-pass industry template visual badge set.');
    expect(audit).not.toContain('- [ ] Add industry template thumbnail set.');
    expect(audit).toContain('- [x] Verify assets are wired into onboarding.');
    expect(audit).toContain(
      '- [x] Verify app icon/home-screen asset paths are pinned to Ryvro launch assets.'
    );
  });

  it('keeps Android release-style Detox E2E wiring reproducible', () => {
    const detoxConfig = fs.readFileSync(path.join(process.cwd(), '.detoxrc.js'), 'utf8');
    const androidBuildGradle = fs.readFileSync(
      path.join(process.cwd(), 'android/app/build.gradle'),
      'utf8'
    );
    const androidRootBuildGradle = fs.readFileSync(
      path.join(process.cwd(), 'android/build.gradle'),
      'utf8'
    );
    const androidMainApplication = fs.readFileSync(
      path.join(
        process.cwd(),
        'android/app/src/main/java/com/ryvro/shiftplanner/MainApplication.kt'
      ),
      'utf8'
    );
    const androidE2EModule = fs.readFileSync(
      path.join(
        process.cwd(),
        'android/app/src/main/java/com/ryvro/shiftplanner/E2EConfigModule.kt'
      ),
      'utf8'
    );
    const androidDetoxTest = fs.readFileSync(
      path.join(
        process.cwd(),
        'android/app/src/androidTest/java/com/ryvro/shiftplanner/DetoxTest.java'
      ),
      'utf8'
    );
    const appConfig = fs.readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8');
    const e2eUtils = fs.readFileSync(path.join(process.cwd(), 'src/utils/e2e.ts'), 'utf8');
    const e2eStorage = fs.readFileSync(path.join(process.cwd(), 'e2e/helpers/storage.ts'), 'utf8');
    const currentShiftStatusCard = fs.readFileSync(
      path.join(process.cwd(), 'src/components/dashboard/CurrentShiftStatusCard.tsx'),
      'utf8'
    );

    expect(detoxConfig).toContain('DETOX_ANDROID_AVD');
    expect(detoxConfig).toContain('DETOX_ANDROID_ARCHS');
    expect(detoxConfig).toContain('EXPO_PUBLIC_E2E_TEST_MODE=1');
    expect(detoxConfig).toContain(':app:assembleRelease :app:assembleAndroidTest');
    expect(detoxConfig).toContain('--no-daemon --no-parallel');

    expect(androidRootBuildGradle).toContain('node_modules/detox/Detox-android');
    expect(androidBuildGradle).toContain('buildConfigField "boolean", "E2E_TEST_MODE"');
    expect(androidBuildGradle).toContain('debuggable isE2ETestMode');
    expect(androidBuildGradle).toContain("testBuildType 'release'");
    expect(androidBuildGradle).toContain('testInstrumentationRunner');
    expect(androidBuildGradle).toContain('androidTestImplementation("com.wix:detox:20.47.0")');
    expect(androidBuildGradle).toContain('protobuf-lite');
    expect(androidMainApplication).toContain('E2EConfigPackage');
    expect(androidE2EModule).toContain('RyvroE2EConfig');
    expect(androidE2EModule).toContain('BuildConfig.E2E_TEST_MODE');
    expect(androidDetoxTest).toContain('Detox.runTests');

    expect(appConfig).toContain('expoUpdates.enabled = false');
    expect(e2eUtils).toContain('RyvroE2EConfig');
    expect(e2eUtils).toContain('EXPO_PUBLIC_E2E_TEST_MODE');
    expect(e2eUtils).toContain('manifest2');
    expect(e2eStorage).toContain('PRAGMA user_version = 1');
    expect(e2eStorage).toContain('run-as');
    expect(e2eStorage).toContain('RKStorage');
    expect(currentShiftStatusCard).toContain('collapsable={false}');
    expect(currentShiftStatusCard).toContain('shift-status-badge-icon');
  });

  it('keeps first-store-build version values aligned across tracked native and Expo config', () => {
    const androidBuildGradle = fs.readFileSync(
      path.join(process.cwd(), 'android/app/build.gradle'),
      'utf8'
    );
    const iosProject = readOptional('ios/RyvroShiftPlanner.xcodeproj/project.pbxproj');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buildAppConfig = require('../../app.config.js') as (params: {
      config?: Record<string, unknown>;
    }) => {
      version?: string;
      ios?: { buildNumber?: string };
      android?: { versionCode?: number };
    };
    const dynamicConfig = buildAppConfig({ config: {} });

    expect(packageJson.version).toBe('1.0.0');
    expect(appJson.expo?.version).toBe('1.0.0');
    expect(appJson.expo?.ios?.buildNumber).toBe('1');
    expect(appJson.expo?.android?.versionCode).toBe(1);
    expect(dynamicConfig.version).toBe('1.0.0');
    expect(dynamicConfig.ios?.buildNumber).toBe('1');
    expect(dynamicConfig.android?.versionCode).toBe(1);
    expect(androidBuildGradle).toContain('versionCode 1');
    expect(androidBuildGradle).toContain('versionName "1.0.0"');
    if (iosProject) {
      expect(iosProject).toContain('CURRENT_PROJECT_VERSION = 1;');
      expect(iosProject).toMatch(/MARKETING_VERSION = 1\.0(?:\.0)?;/);
    }
  });

  it('keeps the store listing pack submission-ready without placeholder review contacts', () => {
    const storeListing = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_STORE_LISTING.md'),
      'utf8'
    );
    const screenshotChecklist = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md'),
      'utf8'
    );

    expect(storeListing).toContain('reviewer@getryvro.com');
    expect(storeListing).toContain('support@getryvro.com');
    expect(storeListing).toContain('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
    expect(storeListing).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(storeListing).toContain('App Store Connect / Google Play review notes');
    expect(storeListing).toContain('App Store iPhone 6.7 inch: 3 screenshots at 1290 x 2796');
    expect(storeListing).toContain('App Store iPad Pro 12.9 inch: 3 screenshots at 2048 x 2732');
    expect(storeListing).toContain('Google Play phone: at least 2 screenshots at 1080 x 1920');
    expect(storeListing).toContain(
      'Capture from production, TestFlight, or Play internal builds only'
    );
    expect(storeListing).toContain('Required capture matrix');
    expect(storeListing).toContain('App Store iPhone');
    expect(storeListing).toContain('App Store iPad');
    expect(storeListing).toContain('Internal QA attachment');
    expect(storeListing).toContain('app-store-iphone-01-template-start.png');
    expect(storeListing).toContain('google-play-phone-02-dashboard-calendar.png');
    expect(storeListing).toContain(
      'Universal Shift Builder template screen showing FIFO, healthcare, oil/gas offshore, warehouse logistics, aviation, and rail options'
    );
    expect(storeListing).toContain('Ryvro Pro paywall screen showing the free-trial CTA');
    expect(storeListing).toContain('## Launch Landing Page Copy');
    expect(storeListing).toContain('Headline: Ryvro Shift Planner');
    expect(storeListing).toContain('AI schedules, reminders, and calendar exports for FIFO');
    expect(storeListing).toContain('Build your schedule three ways');
    expect(storeListing).toContain('Footer disclaimer');
    expect(storeListing).toContain('## Social Profile Source Copy');
    expect(storeListing).toContain(
      'Start with `@ryvro`; fall back consistently to `@getryvro` or `@tryryvro`'
    );
    expect(storeListing).toContain(
      'AI shift planner for FIFO, nights, rotating rosters, reminders, and calendar export.'
    );
    expect(storeListing).toContain('Meet Ryvro Shift Planner');
    expect(storeListing).toContain(
      'Claims that Ryvro is already live before App Store and Play evidence exists'
    );
    expect(storeListing).toContain(
      'Launch audience: FIFO crews, rotating shift workers, miners, healthcare teams, security'
    );
    expect(storeListing).toContain(
      'Ryvro helps FIFO crews, healthcare teams, security staff, emergency services'
    );
    expect(storeListing).toContain('Ryvro is a personal planning aid');
    expect(storeListing).toContain(
      "does not replace your employer's official roster, payroll, HR, fatigue-management, dispatch, clinical, aviation, rail, transport compliance, or safety systems"
    );
    expect(storeListing).toContain('changes by work location');
    expect(storeListing).toContain('heading to work');
    expect(storeListing).not.toContain('miners, FIFO crews, and shift workers');
    expect(storeListing).not.toContain('miner-first because');
    expect(storeListing).not.toContain('miner/FIFO-first');
    expect(storeListing).not.toContain('to be created');
    expect(storeListing).not.toContain('TBD');
    expect(storeListing).not.toContain('aviation/rail templates');
    expect(storeListing).not.toMatch(/changes by site|heading to site/i);

    expect(screenshotChecklist).toContain('# Ryvro Screenshot Capture Checklist');
    expect(screenshotChecklist).toContain('Do not use Expo Go, web previews');
    expect(screenshotChecklist).toContain('reviewer@getryvro.com');
    expect(screenshotChecklist).toContain('app-store-iphone-01-template-start.png');
    expect(screenshotChecklist).toContain('app-store-iphone-02-dashboard-calendar.png');
    expect(screenshotChecklist).toContain('app-store-iphone-03-paywall.png');
    expect(screenshotChecklist).toContain('app-store-ipad-01-template-start.png');
    expect(screenshotChecklist).toContain('app-store-ipad-02-dashboard-calendar.png');
    expect(screenshotChecklist).toContain('app-store-ipad-03-paywall.png');
    expect(screenshotChecklist).toContain('google-play-phone-01-template-start.png');
    expect(screenshotChecklist).toContain('google-play-phone-02-dashboard-calendar.png');
    expect(screenshotChecklist).toContain('google-play-phone-03-paywall.png');
    expect(screenshotChecklist).toContain('1290 x 2796');
    expect(screenshotChecklist).toContain('2048 x 2732');
    expect(screenshotChecklist).toContain('1080 x 1920 or higher');
    expect(screenshotChecklist).toContain('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
    expect(screenshotChecklist).toContain('Keep the screenshot files out of Git');
  });

  it('keeps RevenueCat launch guidance free of retired Ellie entitlement aliases', () => {
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );

    expect(externalSetup).toContain('ryvro_pro_monthly');
    expect(externalSetup).toContain('ryvro_pro_annual');
    expect(externalSetup).toContain(
      'Project URL path: `https://app.revenuecat.com/projects/42dccd7e/overview`'
    );
    expect(externalSetup).toContain('Android app: saved as `Ryvro (Play Store)`');
    expect(externalSetup).toContain(
      'app URL `https://app.revenuecat.com/projects/42dccd7e/apps/appab0f4b628d`'
    );
    expect(externalSetup).toContain('REST API identifier `appab0f4b628d`');
    expect(externalSetup).toContain('upload the Google Play service account credentials JSON');
    expect(externalSetup).toContain('iOS app: the App Store app form was filled');
    expect(externalSetup).toContain('In-App Purchase Key ID and In-App Purchase Issuer ID');
    expect(externalSetup).toContain('App Store Connect in-app purchase p8 key');
    expect(externalSetup).toContain('Do not use RevenueCat `test_` API keys');
    expect(externalSetup).toContain('Do not configure retired Ellie entitlement IDs');
    expect(externalSetup).toContain(
      'Fill these in `.env` from the `.env.production.example` slots'
    );
    expect(externalSetup).toContain(
      '`npm run release:env:check` passes with the real RevenueCat native/public key mirrors before secrets are pushed to EAS'
    );
    expect(externalSetup).not.toContain('ellie_pro');
    expect(externalSetup).not.toContain('Ellie Shift Planner Pro');
    expect(externalSetup).not.toContain('Keep old entitlement aliases');
  });

  it('keeps legal, privacy, and support launch templates broad enough for universal schedules', () => {
    const privacySupport = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md'),
      'utf8'
    );
    const launchReadme = fs.readFileSync(path.join(process.cwd(), 'web/launch/README.md'), 'utf8');
    const launchHome = fs.readFileSync(path.join(process.cwd(), 'web/launch/index.html'), 'utf8');
    const launchPrivacy = fs.readFileSync(
      path.join(process.cwd(), 'web/launch/privacy/index.html'),
      'utf8'
    );
    const launchTerms = fs.readFileSync(
      path.join(process.cwd(), 'web/launch/terms/index.html'),
      'utf8'
    );
    const launchSupport = fs.readFileSync(
      path.join(process.cwd(), 'web/launch/support/index.html'),
      'utf8'
    );
    const launchDeletion = fs.readFileSync(
      path.join(process.cwd(), 'web/launch/delete-account/index.html'),
      'utf8'
    );
    const launchStyles = fs.readFileSync(path.join(process.cwd(), 'web/launch/styles.css'), 'utf8');
    const profileScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/ProfileScreen.tsx'),
      'utf8'
    );
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');

    expect(privacySupport).toContain('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
    expect(privacySupport).toContain('Static HTML launch-page drafts now live in `web/launch`');
    expect(privacySupport).toContain('web/launch/privacy/index.html');
    expect(privacySupport).toContain('web/launch/terms/index.html');
    expect(privacySupport).toContain('web/launch/support/index.html');
    expect(privacySupport).toContain('web/launch/delete-account/index.html');
    expect(privacySupport).toContain(
      'Ryvro Shift Planner helps shift workers create, edit, and understand work schedules'
    );
    expect(privacySupport).toContain('AI builder prompts used to draft schedules');
    expect(privacySupport).toContain('Calendar Import And Export');
    expect(privacySupport).toContain('importing or exporting a calendar');
    expect(privacySupport).toContain('holiday exceptions');
    expect(privacySupport).toContain('reminders');
    expect(privacySupport).toContain('account deletion');
    expect(privacySupport).toContain('Account deletion URL: `https://getryvro.com/delete-account`');
    expect(privacySupport).toContain('# Delete Your Ryvro Account');
    expect(privacySupport).toContain(
      'Account deletion does not automatically cancel App Store or Google Play subscriptions'
    );
    expect(privacySupport).toContain('support@getryvro.com');
    expect(privacySupport).toContain('## Firebase Auth Email Template Copy');
    expect(privacySupport).toContain('Sender name: Ryvro Support');
    expect(privacySupport).toContain('Reply-to email: support@getryvro.com');
    expect(privacySupport).toContain('Public action domain: getryvro.com');
    expect(privacySupport).toContain('Continue URL / action URL domain: https://getryvro.com');
    expect(privacySupport).toContain('Subject: Verify your Ryvro email');
    expect(privacySupport).toContain('Subject: Reset your Ryvro password');
    expect(privacySupport).toContain('Subject: Your Ryvro email was changed');
    expect(privacySupport).toContain('Not For Safety-Critical Decisions');
    expect(privacySupport).toContain(
      'not a clinical, aviation, rail, emergency dispatch, transport compliance, fatigue-management, or mine-safety system'
    );
    expect(privacySupport).toContain(
      "follow their employer's official roster, handover, dispatch, duty-time, fatigue, safety, and compliance systems"
    );
    expect(privacySupport).not.toMatch(/mine site|haul truck|underground miner/i);

    expect(launchReadme).toContain('https://getryvro.com/privacy');
    expect(launchReadme).toContain('https://getryvro.com/terms');
    expect(launchReadme).toContain('https://getryvro.com/support');
    expect(launchReadme).toContain('https://getryvro.com/delete-account');
    expect(launchReadme).toContain('firebase target:apply hosting launch-site');
    expect(launchReadme).toContain(
      'firebase deploy --config firebase.json --only hosting:launch-site'
    );
    expect(launchReadme).toContain('Do not replace the existing analytics admin hosting target');

    [launchHome, launchPrivacy, launchTerms, launchSupport, launchDeletion].forEach((page) => {
      expect(page).toContain('Ryvro');
      expect(page).toContain('/privacy/');
      expect(page).toContain('/terms/');
      expect(page).toContain('/support/');
      expect(page).toContain('/delete-account/');
      expect(page).toContain('support@getryvro.com');
      expect(page).not.toMatch(/Ellie Shift Planner|ellie_pro|mine site|haul truck/i);
    });
    expect(launchHome).toContain('Ryvro Shift Planner');
    expect(launchHome).toContain('FIFO crews, healthcare teams, security staff');
    expect(launchHome).toContain('It does not replace an employer roster');
    expect(launchPrivacy).toContain('AI builder prompts used to draft schedules');
    expect(launchPrivacy).toContain('RevenueCat');
    expect(launchPrivacy).toContain('https://getryvro.com/delete-account');
    expect(launchTerms).toContain('Not For Safety-Critical Decisions');
    expect(launchTerms).toContain('Ryvro Pro');
    expect(launchTerms).toContain('App Store, Google Play, and RevenueCat');
    expect(launchSupport).toContain('Managing Ryvro Pro subscriptions and restore purchases');
    expect(launchDeletion).toContain('Ryvro account deletion request');
    expect(launchDeletion).toContain(
      'Account deletion does not automatically cancel App Store or Google Play subscriptions'
    );
    expect(launchStyles).toContain('--accent: #c5975c');
    expect(launchStyles).toContain('max-width: 920px');

    expect(profileScreen).toContain('legalConfig.supportUrl');
    expect(profileScreen).toContain('legalConfig.accountDeletionUrl');
    expect(profileScreen).toContain('legalConfig.privacyPolicyUrl');
    expect(profileScreen).toContain('legalConfig.termsOfServiceUrl');
    expect(profileScreen).toContain('profile-support-link');
    expect(profileScreen).toContain('profile-account-deletion-link');
    expect(profileScreen).toContain('profile-privacy-link');
    expect(profileScreen).toContain('profile-terms-link');

    for (const locale of fs.readdirSync(localeRoot)) {
      const profileLocale = JSON.parse(
        fs.readFileSync(path.join(localeRoot, locale, 'profile.json'), 'utf8')
      ) as {
        sections?: {
          legalSupport?: string;
        };
        legal?: {
          support?: { title?: string; hint?: string; a11y?: string };
          deleteAccount?: { title?: string; hint?: string; a11y?: string };
          privacy?: { title?: string; hint?: string; a11y?: string };
          terms?: { title?: string; hint?: string; a11y?: string };
        };
      };

      expect(profileLocale.sections?.legalSupport).toBeTruthy();
      expect(profileLocale.legal?.support?.title).toBeTruthy();
      expect(profileLocale.legal?.support?.hint).toBeTruthy();
      expect(profileLocale.legal?.support?.a11y).toBeTruthy();
      expect(profileLocale.legal?.deleteAccount?.title).toBeTruthy();
      expect(profileLocale.legal?.deleteAccount?.hint).toBeTruthy();
      expect(profileLocale.legal?.deleteAccount?.a11y).toBeTruthy();
      expect(profileLocale.legal?.privacy?.title).toBeTruthy();
      expect(profileLocale.legal?.privacy?.hint).toBeTruthy();
      expect(profileLocale.legal?.privacy?.a11y).toBeTruthy();
      expect(profileLocale.legal?.terms?.title).toBeTruthy();
      expect(profileLocale.legal?.terms?.hint).toBeTruthy();
      expect(profileLocale.legal?.terms?.a11y).toBeTruthy();
    }
  });

  it('keeps store submission form answers drafted for account-owner console work', () => {
    const storeSubmissionDraft = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md'),
      'utf8'
    );
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );
    const releaseTasks = fs.readFileSync(
      path.join(process.cwd(), 'RYVRO_RELEASE_TASKS.md'),
      'utf8'
    );
    const readinessReport = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_RELEASE_READINESS_REPORT.md'),
      'utf8'
    );

    expect(storeSubmissionDraft).toContain('Apple App Store Connect app privacy');
    expect(storeSubmissionDraft).toContain('Google Play Data safety form');
    expect(storeSubmissionDraft).toContain('Google Play account deletion requirements');
    expect(storeSubmissionDraft).toContain(
      'Answer: Yes, Ryvro and third-party partners collect data'
    );
    expect(storeSubmissionDraft).toContain(
      'Answer: No, Ryvro does not use collected data to track'
    );
    expect(storeSubmissionDraft).toContain('Contact Info: email address and name');
    expect(storeSubmissionDraft).toContain('User Content: shift schedules');
    expect(storeSubmissionDraft).toContain('Identifiers: Firebase Auth UID');
    expect(storeSubmissionDraft).toContain('Purchases: subscription status');
    expect(storeSubmissionDraft).toContain('Usage Data: app interactions');
    expect(storeSubmissionDraft).toContain('Diagnostics: crash logs');
    expect(storeSubmissionDraft).toContain('Data is encrypted in transit: Yes');
    expect(storeSubmissionDraft).toContain('Users can request data deletion: Yes');
    expect(storeSubmissionDraft).toContain(
      'Account deletion URL: https://getryvro.com/delete-account'
    );
    expect(storeSubmissionDraft).toContain(
      'Data deletion URL: https://getryvro.com/delete-account'
    );
    expect(storeSubmissionDraft).toContain('RevenueCat for subscription status');
    expect(storeSubmissionDraft).toContain('OpenAI or the configured AI provider');
    expect(storeSubmissionDraft).toContain('Audio files: declare only if');
    expect(storeSubmissionDraft).toContain('No gambling, contests, or real-money games');
    expect(storeSubmissionDraft).toContain('In-app purchases: Yes, Ryvro Pro subscription');
    expect(storeSubmissionDraft).toContain(
      'No clinical, emergency dispatch, aviation, rail, transport compliance, fatigue-management, mine-safety, or other regulated-duty replacement claims'
    );
    expect(storeSubmissionDraft).toContain(
      'not a clinical, aviation, rail, emergency dispatch, transport compliance, fatigue-management, or mine-safety system'
    );
    expect(storeSubmissionDraft).toContain(
      "follow their employer's official roster, handover, dispatch, duty-time, fatigue, safety, and compliance systems"
    );
    expect(storeSubmissionDraft).toContain('ITSAppUsesNonExemptEncryption');
    expect(storeSubmissionDraft).toContain('reviewer@getryvro.com');
    expect(storeSubmissionDraft).toContain('ryvro_pro_monthly');
    expect(storeSubmissionDraft).toContain('ryvro_pro_annual');
    expect(storeSubmissionDraft).toContain('does not replace employer rosters');
    expect(storeSubmissionDraft).not.toContain('TBD');
    expect(storeSubmissionDraft).not.toContain('ellie_pro');

    expect(externalSetup).toContain('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
    expect(releaseTasks).toContain('Use `docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md`');
    expect(readinessReport).toContain('Store-submission form draft now covers');
    expect(readinessReport).toContain(
      'Profile/settings now exposes configured support, account deletion, privacy policy, and terms links'
    );
  });

  it('keeps the owner launch runbook sequenced for the remaining account and device work', () => {
    const ownerRunbook = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md'),
      'utf8'
    );
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );
    const launchEvidenceLog = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_LAUNCH_EVIDENCE_LOG.md'),
      'utf8'
    );
    const screenshotChecklist = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md'),
      'utf8'
    );
    const deviceQaTemplate = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md'),
      'utf8'
    );

    expect(ownerRunbook).toContain('Do not submit to App Store review or Google Play production');
    expect(ownerRunbook).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(ownerRunbook).toContain('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
    expect(ownerRunbook).toContain('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');
    expect(ownerRunbook).toContain('non-secret owner evidence');
    expect(ownerRunbook).toContain('Formal trademark/legal clearance for `Ryvro`');
    expect(ownerRunbook).toContain('Apple Developer Program License Agreement');
    expect(ownerRunbook).toContain('ASC app ID `6776994726`');
    expect(ownerRunbook).toContain('EU trader status');
    expect(ownerRunbook).toContain('Creating a Play Console developer account');
    expect(ownerRunbook).toContain('To get started, choose an account type');
    expect(ownerRunbook).toContain('`An organization` and `Yourself`');
    expect(ownerRunbook).toContain(
      'ownership cannot be changed after the developer account is created'
    );
    expect(ownerRunbook).toContain('verified organization type');
    expect(ownerRunbook).toContain('personal account path');
    expect(ownerRunbook).toContain('Reserve or create Google Play title `Ryvro Shift Planner`');
    expect(ownerRunbook).toContain('Purchase or reserve the launch domain');
    expect(ownerRunbook).toContain('https://getryvro.com/delete-account');
    expect(ownerRunbook).toContain('Apple App ID for `com.ryvro.shiftplanner`');
    expect(ownerRunbook).toContain('EAS project ID');
    expect(ownerRunbook).toContain('project slug matches `ryvro`');
    expect(ownerRunbook).toContain(
      '`@ilyasu/ryvro`, project ID `b306643e-1688-448e-8acd-f72bf74312c3`'
    );
    expect(ownerRunbook).toContain('App Store Connect API key');
    expect(ownerRunbook).toContain('npm run release:native:check');
    expect(ownerRunbook).toContain('npm run release:env:check');
    expect(ownerRunbook).toContain('real root-level Firebase native service files');
    expect(ownerRunbook).toContain('eas secret:push --scope project --env-file .env');
    expect(ownerRunbook).toContain('RYVRO_BRAIN_URL');
    expect(ownerRunbook).toContain('SHIFT_SCHEDULE_PARSER_URL');
    expect(ownerRunbook).toContain('parseShiftScheduleDescription');
    expect(ownerRunbook).toContain(
      '{"prompt":"I work 2 days, 2 nights, then 4 off.","timezone":"UTC","locale":"en-US","today":"2026-05-31"}'
    );
    expect(ownerRunbook).toContain('RevenueCat `pro` entitlement');
    expect(ownerRunbook).toContain('ryvro_pro_monthly');
    expect(ownerRunbook).toContain('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
    expect(ownerRunbook).toContain('social profile, and launch landing-page copy');
    expect(ownerRunbook).toContain('repo static launch pages in `web/launch`');
    expect(ownerRunbook).toContain('Publish the launch landing page');
    expect(ownerRunbook).toContain('Apply the reserved social handle bios');
    expect(ownerRunbook).toContain('Deployment note for the reviewed `web/launch` static pages');
    expect(ownerRunbook).toContain('eas build --platform ios --profile production');
    expect(ownerRunbook).toContain('eas build --platform android --profile production');
    expect(ownerRunbook).toContain('Physical iOS and Android smoke tests');
    expect(ownerRunbook).toContain('TestFlight iPhone');
    expect(ownerRunbook).toContain('Play internal testing install');
    expect(ownerRunbook).toContain('fill-in QA packet for each platform');
    expect(ownerRunbook).toContain('Completed `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` packet');
    expect(ownerRunbook).toContain('FIFO/block-roster or rotating-shift AI description');
    expect(ownerRunbook).not.toContain('FIFO/mining or rotating-shift AI description');
    expect(ownerRunbook).toContain('eas submit --platform ios --latest');
    expect(ownerRunbook).toContain('eas submit --platform android --latest');
    expect(ownerRunbook).toContain('npm run release:submit:check');
    expect(ownerRunbook).toContain('Final submit readiness is guarded');
    expect(ownerRunbook).toContain('110 Jest suites, 1,782 tests');
    expect(ownerRunbook).toContain('npm run release:owner:check');
    expect(ownerRunbook).toContain('owner handoff preflight');
    expect(ownerRunbook).toContain('not-yet-live stop gates');
    expect(ownerRunbook).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(ownerRunbook).toContain('Recent pushed PR gate evidence includes');
    expect(ownerRunbook).not.toContain('Latest pushed PR gate');
    expect(ownerRunbook).toContain('recording RevenueCat project/app evidence');
    expect(ownerRunbook).toContain('CI run `27014539880`');
    expect(ownerRunbook).toContain('commit `8b277ee`');
    expect(ownerRunbook).toContain('CI run `27013691021`');
    expect(ownerRunbook).toContain('commit `8d24c2a`');
    expect(ownerRunbook).toContain('CI run `27013231061`');
    expect(ownerRunbook).toContain('commit `9e69151`');
    expect(ownerRunbook).toContain('CI run `27012828719`');
    expect(ownerRunbook).toContain('commit `0fb439b`');
    expect(ownerRunbook).toContain('dedicated Release Check job');
    expect(ownerRunbook).not.toContain('Ellie Shift Planner');
    expect(ownerRunbook).not.toContain('ellie_pro');

    expect(launchEvidenceLog).toContain('# Ryvro Launch Evidence Log');
    expect(launchEvidenceLog).toContain('Do not paste passwords, private keys');
    expect(launchEvidenceLog).toContain('Formal trademark/legal clearance for `Ryvro`');
    expect(launchEvidenceLog).toContain('App Store Connect app name `Ryvro Shift Planner`');
    expect(launchEvidenceLog).toContain('ASC app ID: `6776994726`');
    expect(launchEvidenceLog).toContain('Apple Developer Program License Agreement accepted');
    expect(launchEvidenceLog).toContain('explicit bundle ID `com.ryvro.shiftplanner`');
    expect(launchEvidenceLog).toContain('Logged-in Chrome Play Console check');
    expect(launchEvidenceLog).toContain('`An organization` and `Yourself`');
    expect(launchEvidenceLog).toContain('ownership cannot be changed after creation');
    expect(launchEvidenceLog).toContain('EU trader status');
    expect(launchEvidenceLog).toContain('status `Ready to Submit`');
    expect(launchEvidenceLog).toContain('`Ryvro iPhone QA` internal group');
    expect(launchEvidenceLog).toContain('Fresh logged-in Chrome inspection');
    expect(launchEvidenceLog).toContain('testflight/groups/c9ea8051-517c-4d81-b8a0-57099d9e864d');
    expect(launchEvidenceLog).toContain('Internal Group ∙ 1 Tester ∙ 1 Build');
    expect(launchEvidenceLog).toContain('tester status `Invited`');
    expect(launchEvidenceLog).toContain('EAS-managed Android keystore');
    expect(launchEvidenceLog).toContain('c99b0e0a-829c-4ab7-bd93-164586ade68a');
    expect(launchEvidenceLog).toContain(
      '2efbacac748ea9471a4b28ca332b37aed86cbc80ff654a22651a6bbde7f45cf2'
    );
    expect(launchEvidenceLog).toContain('`CFBundleIdentifier` is `com.ryvro.shiftplanner`');
    expect(launchEvidenceLog).toContain('`CFBundleDisplayName` is `Ryvro`');
    expect(launchEvidenceLog).toContain('`CFBundleShortVersionString` is `1.0.0`');
    expect(launchEvidenceLog).toContain('`CFBundleVersion` is `1`');
    expect(launchEvidenceLog).toContain(
      'local placeholder Firebase/OAuth URL schemes (`com.googleusercontent.apps.local-ryvro-placeholder` and `app-1-000000000000-ios-localryvroplaceholder`)'
    );
    expect(launchEvidenceLog).toContain('318b4e8f-b344-4ed9-8bcd-a5805093339d');
    expect(launchEvidenceLog).toContain('version code `1`');
    expect(launchEvidenceLog).toContain('77QGA2J8tMvr4Rj3iF9DNM.aab');
    expect(launchEvidenceLog).toContain('c3ef1f79945b09e8e6190cfccac4951db65ff8aa');
    expect(launchEvidenceLog).toContain(
      '9eafac4baaab0119c7237347c6cdd5b41572912e6cbe4351112950927bf9e1fa'
    );
    expect(launchEvidenceLog).toContain('Expo dashboard display name is `Ryvro Shift Planner`');
    expect(launchEvidenceLog).toContain('Created and linked EAS project `@ilyasu/ryvro`');
    expect(launchEvidenceLog).toContain('b306643e-1688-448e-8acd-f72bf74312c3');
    expect(launchEvidenceLog).toContain('no saved ASC API keys');
    expect(launchEvidenceLog).toContain(
      'Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`'
    );
    expect(launchEvidenceLog).toContain('Domain control for `getryvro.com`');
    expect(launchEvidenceLog).toContain('Social handles');
    expect(launchEvidenceLog).toContain('generated project ID `ryvro-shift-planner`');
    expect(launchEvidenceLog).toContain('optional Gemini in Firebase was switched off');
    expect(launchEvidenceLog).toContain('`Ryvro Google Analytics`');
    expect(launchEvidenceLog).toContain('`I accept the Google Analytics terms`');
    expect(launchEvidenceLog).toContain('do not accept this legal term on behalf of the owner');
    expect(launchEvidenceLog).toContain('Firebase Auth email templates');
    expect(launchEvidenceLog).toContain(
      'Sender `Ryvro Support`, reply-to `support@getryvro.com`, action domain `getryvro.com`'
    );
    expect(launchEvidenceLog).toContain('Backend deploy - ryvroBrain');
    expect(launchEvidenceLog).toContain('Backend smoke - ryvroBrain');
    expect(launchEvidenceLog).toContain('Backend deploy - parser');
    expect(launchEvidenceLog).toContain('Shift parser smoke');
    expect(launchEvidenceLog).toContain('SHIFT_SCHEDULE_PARSER_URL');
    expect(launchEvidenceLog).toContain('created project `Ryvro`');
    expect(launchEvidenceLog).toContain('app.revenuecat.com/projects/42dccd7e/overview');
    expect(launchEvidenceLog).toContain('category `Productivity`');
    expect(launchEvidenceLog).toContain('`Native Apple` plus `Native Android`');
    expect(launchEvidenceLog).toContain('connected to the Test Store only');
    expect(launchEvidenceLog).toContain('`Ryvro (Play Store)`');
    expect(launchEvidenceLog).toContain('package `com.ryvro.shiftplanner`');
    expect(launchEvidenceLog).toContain('app.revenuecat.com/projects/42dccd7e/apps/appab0f4b628d');
    expect(launchEvidenceLog).toContain('REST API identifier `appab0f4b628d`');
    expect(launchEvidenceLog).toContain('Google developer notifications remain pending');
    expect(launchEvidenceLog).toContain('`Ryvro (App Store)`');
    expect(launchEvidenceLog).toContain('In-App Purchase Key ID and In-App Purchase Issuer ID');
    expect(launchEvidenceLog).toContain('Entitlement ID `pro`, display name `Ryvro Pro`');
    expect(launchEvidenceLog).toContain('`ryvro_pro_monthly` and `ryvro_pro_annual`');
    expect(launchEvidenceLog).toContain('Live `https://getryvro.com/delete-account` URL');
    expect(launchEvidenceLog).toContain('TestFlight iPhone QA');
    expect(launchEvidenceLog).toContain('Physical Android QA');
    expect(launchEvidenceLog).toContain(
      'Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` for the TestFlight iPhone QA packet'
    );
    expect(launchEvidenceLog).toContain(
      'Use `docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md` for the Android physical device or Play internal testing QA packet'
    );
    expect(launchEvidenceLog).toContain('Store submission');
    expect(launchEvidenceLog).toContain('Pending owner evidence');
    expect(launchEvidenceLog).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(launchEvidenceLog).toContain('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');
    expect(launchEvidenceLog).toContain('npm run release:submit:check');
    expect(screenshotChecklist).toContain('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');
    expect(screenshotChecklist).toContain('device model');
    expect(screenshotChecklist).toContain('final file list');

    expect(externalSetup).toContain('docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md');

    expect(deviceQaTemplate).toContain('# Ryvro Device QA Evidence Template');
    expect(deviceQaTemplate).toContain('TestFlight iPhone QA');
    expect(deviceQaTemplate).toContain('Physical Android QA');
    expect(deviceQaTemplate).toContain('Sandbox purchase QA');
    expect(deviceQaTemplate).toContain('Installed bundle/package proof');
    expect(deviceQaTemplate).toContain('Must-Pass Smoke Matrix');
    expect(deviceQaTemplate).toContain(
      'Fresh install from TestFlight or Play/internal store channel'
    );
    expect(deviceQaTemplate).toContain('reviewer@getryvro.com');
    expect(deviceQaTemplate).toContain('Google Sign-In');
    expect(deviceQaTemplate).toContain('Apple Sign-In');
    expect(deviceQaTemplate).toContain('RevenueCat entitlement `pro` becomes active');
    expect(deviceQaTemplate).toContain('Pending-sync status appears and clears after reconnect');
    expect(deviceQaTemplate).toContain('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    expect(deviceQaTemplate).toContain('Failure Record');
    expect(deviceQaTemplate).toContain('Do not record passwords, private keys');
    expect(deviceQaTemplate).not.toMatch(/Ellie Shift Planner|ellie_pro|mine site|haul truck/i);
  });

  it('keeps external account setup instructions on Ryvro console names', () => {
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );

    expect(externalSetup).toContain('iOS app nickname: Ryvro iOS');
    expect(externalSetup).toContain('Android app nickname: Ryvro Android');
    expect(externalSetup).toContain('Display name: Ryvro Pro');
    expect(externalSetup).toContain('Preferred voice endpoint for new builds: ryvroBrain');
    expect(externalSetup).toContain(
      'RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain'
    );
    expect(externalSetup).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(externalSetup).toContain('SHIFT_SCHEDULE_PARSER_TIMEOUT_MS=45000');
    expect(externalSetup).toContain('SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH=2000');
    expect(externalSetup).toContain('curl -i -X POST "$SHIFT_SCHEDULE_PARSER_URL"');
    expect(externalSetup).toContain(
      '{"prompt":"I work 2 days, 2 nights, then 4 off.","timezone":"UTC","locale":"en-US","today":"2026-05-31"}'
    );
    expect(externalSetup).toContain(
      'Do not configure `ellieBrain` as the launch `RYVRO_BRAIN_URL`'
    );
    expect(externalSetup).toContain('retired `ELLIE_BRAIN_*` env keys');
    expect(externalSetup).toContain('Analytics property/report labels: Ryvro');
    expect(externalSetup).toContain(
      'Segment schedule setup dashboards by industry, template, and source'
    );
    expect(externalSetup).toContain(
      'Do not send raw ward, depot, plant, terminal, venue, rig, station, or site names into analytics dimensions'
    );
    expect(externalSetup).toContain('Profile shows `Ryvro Pro - Active`');
    expect(externalSetup).toContain('Do not configure retired Ellie entitlement IDs');
    expect(externalSetup).toContain('Account deletion URL: `https://getryvro.com/delete-account`');
    expect(externalSetup).toContain('static launch pages in `web/launch`');
    expect(externalSetup).toContain('firebase target:apply hosting launch-site');
    expect(externalSetup).toContain(
      'firebase deploy --config firebase.json --only hosting:launch-site'
    );
    expect(externalSetup).toContain('existing analytics admin hosting path is not overwritten');
    expect(externalSetup).toContain('Record the live `https://getryvro.com/privacy`');
    expect(externalSetup).toContain('support/privacy/account deletion URLs');
    expect(externalSetup).toContain(
      'Configure Firebase Auth email templates from `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`'
    );
    expect(externalSetup).toContain('sender name `Ryvro Support`');
    expect(externalSetup).toContain('reply-to email `support@getryvro.com`');
    expect(externalSetup).toContain('continue/action URLs on `https://getryvro.com`');
    expect(externalSetup).not.toContain('Ellie iOS');
    expect(externalSetup).not.toContain('Ellie Android');
    expect(externalSetup).not.toContain('Ellie Pro');
    expect(externalSetup).not.toContain(
      'RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ellieBrain'
    );
  });

  it('keeps active launch paywall proof broad enough for non-mining shift teams', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const commonLocaleFiles = fs
      .readdirSync(localeRoot)
      .map((locale) => path.join(localeRoot, locale, 'common.json'))
      .filter((file) => fs.existsSync(file));

    for (const file of commonLocaleFiles) {
      const common = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        subscription?: {
          paywall?: {
            features?: {
              offline?: string;
            };
            unconfigured?: string;
            unavailable?: string;
            socialProof?: string;
            testimonials?: Array<{ author?: string; quote?: string }>;
          };
        };
      };
      const paywall = common.subscription?.paywall;
      const launchProof = [
        paywall?.socialProof ?? '',
        paywall?.features?.offline ?? '',
        ...(paywall?.testimonials ?? []).flatMap((testimonial) => [
          testimonial.author ?? '',
          testimonial.quote ?? '',
        ]),
      ].join('\n');

      expect(launchProof).not.toMatch(
        /underground miner|subterr[aâ]ne|ondergronds|bawah tanah|भूमिगत|под зем|地下|haul truck|drill/i
      );
      expect(launchProof).not.toMatch(/site roster|roster site|low-signal sites/i);
      expect(launchProof).toMatch(/FIFO|shift|turno|santé|health|security|transport|equipes/i);

      expect(paywall?.unconfigured).toContain('Ryvro Pro');
      expect(paywall?.unconfigured).not.toMatch(
        /RevenueCat|SDK key|build environment|rebuild|not configured|this build|app build|\bEAS\b|development\/production/i
      );
      expect(paywall?.unavailable).toContain('Ryvro Pro');
      expect(paywall?.unavailable).not.toMatch(
        /\bEAS\b|development\/production|SDK key|build environment|rebuild|app build/i
      );
    }

    const paywallScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/subscription/PaywallScreen.tsx'),
      'utf8'
    );
    expect(paywallScreen).toContain(
      'Ryvro Pro is not available yet. Please update Ryvro or contact support if this keeps happening.'
    );
    expect(paywallScreen).toContain(
      'Ryvro Pro is unavailable right now. Please update Ryvro or contact support if this keeps happening.'
    );
    expect(paywallScreen).not.toContain('Add the RevenueCat SDK key');
    expect(paywallScreen).not.toContain('build environment and rebuild');
    expect(paywallScreen).not.toContain('Install the latest EAS development/production build');
    expect(paywallScreen).not.toContain('Ryvro Pro is not available in this build yet');
  });

  it('keeps translated work-location labels broad instead of site-specific', () => {
    const expectedLabels: Record<
      string,
      {
        location: string;
        section: string;
        site: string;
        topFunnel: string[];
      }
    > = {
      af: {
        location: 'Werkplek (opsioneel)',
        section: 'WERKPLEKBESONDERHEDE',
        site: 'Werkplek',
        topFunnel: ['skofwerkrol', 'werkplek', 'span'],
      },
      ar: {
        location: 'موقع العمل (اختياري)',
        section: 'تفاصيل موقع العمل',
        site: 'موقع العمل',
        topFunnel: ['الورديات', 'مكان عملك', 'فريقك'],
      },
      en: {
        location: 'Work location (optional)',
        section: 'WORK LOCATION',
        site: 'Work location',
        topFunnel: ['shift-work role', 'Workplace', 'team'],
      },
      es: {
        location: 'Lugar de trabajo (opcional)',
        section: 'LUGAR DE TRABAJO',
        site: 'Lugar de trabajo',
        topFunnel: ['trabajo por turnos', 'lugar de trabajo', 'equipo'],
      },
      fr: {
        location: 'Lieu de travail (facultatif)',
        section: 'LIEU DE TRAVAIL',
        site: 'Lieu de travail',
        topFunnel: ['travail posté', 'lieu de travail', 'équipe'],
      },
      hi: {
        location: 'कार्य स्थान (वैकल्पिक)',
        section: 'कार्य स्थान विवरण',
        site: 'कार्य स्थान',
        topFunnel: ['शिफ्ट-वर्क', 'कार्यस्थल', 'टीम'],
      },
      id: {
        location: 'Lokasi kerja (opsional)',
        section: 'DETAIL LOKASI KERJA',
        site: 'Lokasi kerja',
        topFunnel: ['kerja shift', 'tempat kerja', 'tim'],
      },
      'pt-BR': {
        location: 'Local de trabalho (opcional)',
        section: 'DETALHES DO LOCAL DE TRABALHO',
        site: 'Local de trabalho',
        topFunnel: ['trabalho por turnos', 'local de trabalho', 'equipe'],
      },
      ru: {
        location: 'Место работы (необязательно)',
        section: 'МЕСТО РАБОТЫ',
        site: 'Место работы',
        topFunnel: ['сменной работе', 'рабочем месте', 'команда'],
      },
      'zh-CN': {
        location: '工作地点（可选）',
        section: '工作地点',
        site: '工作地点',
        topFunnel: ['轮班工作', '工作地点', '团队'],
      },
      zu: {
        location: 'Indawo yokusebenza (ongakukhetha)',
        section: 'IMINININGWANE YENDAWO YOKUSEBENZA',
        site: 'Indawo yokusebenza',
        topFunnel: ['yomsebenzi wamashifu', 'indawo yakho yokusebenza', 'ithimba'],
      },
    };

    for (const [locale, expected] of Object.entries(expectedLabels)) {
      const profile = JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), 'src/i18n/locales', locale, 'profile.json'),
          'utf8'
        )
      ) as {
        shift?: {
          configCard?: {
            workDaysOnSite?: string;
            restDaysAtHome?: string;
          };
          sections?: {
            siteDetails?: string;
          };
          site?: string;
          siteName?: string;
        };
      };
      const onboarding = JSON.parse(
        fs.readFileSync(
          path.join(process.cwd(), 'src/i18n/locales', locale, 'onboarding.json'),
          'utf8'
        )
      ) as {
        intro?: {
          askOccupation?: string;
          placeholders?: {
            occupation?: string;
          };
        };
        shiftBuilder?: {
          inspector?: {
            location?: string;
          };
        };
        shiftPattern?: {
          instruction?: string;
        };
        rosterType?: {
          instruction?: string;
        };
        fifoPhaseSelector?: {
          title?: {
            workPattern?: string;
            block_named?: string;
          };
          blocks?: {
            work?: {
              title?: string;
              descriptionDay?: string;
              descriptionNight?: string;
              descriptionNeutral?: string;
            };
          };
          days?: {
            work?: {
              firstDayAtSite?: string;
              firstNightAtSite?: string;
              firstShiftAtSite?: string;
            };
            rest?: {
              lastDayBeforeSite?: string;
            };
            swing?: {
              firstDayShiftAtSite?: string;
            };
          };
        };
        shiftSystem?: {
          instruction?: string;
          title?: string;
          title_named?: string;
        };
      };

      expect(profile.shift?.site).toBe(expected.site);
      expect(profile.shift?.siteName).toBe(expected.location);
      expect(profile.shift?.sections?.siteDetails).toBe(expected.section);
      expect(profile.shift?.configCard?.workDaysOnSite).toBeTruthy();
      expect(profile.shift?.configCard?.restDaysAtHome).toBeTruthy();
      expect(onboarding.shiftBuilder?.inspector?.location).toBe(expected.location);
      expect(onboarding.intro?.placeholders?.occupation).toBeTruthy();
      expect(onboarding.intro?.placeholders?.occupation).not.toMatch(
        /miner|minero|mineração|minería|mine|mining|haul truck|dump truck|camión|caminhão|самосвал|矿卡|boilermaker|calderero|caldeireiro|chaudronnier|ketelmaker|котельщик|बॉयलरमेकर/i
      );

      const topFunnelCopy = [
        onboarding.intro?.askOccupation,
        onboarding.shiftSystem?.title,
        onboarding.shiftSystem?.title_named,
        onboarding.shiftSystem?.instruction,
        onboarding.shiftPattern?.instruction,
        onboarding.rosterType?.instruction,
        onboarding.fifoPhaseSelector?.title?.workPattern,
        onboarding.fifoPhaseSelector?.title?.block_named,
        onboarding.fifoPhaseSelector?.blocks?.work?.title,
        onboarding.fifoPhaseSelector?.blocks?.work?.descriptionDay,
        onboarding.fifoPhaseSelector?.blocks?.work?.descriptionNight,
        onboarding.fifoPhaseSelector?.blocks?.work?.descriptionNeutral,
        onboarding.fifoPhaseSelector?.days?.work?.firstDayAtSite,
        onboarding.fifoPhaseSelector?.days?.work?.firstNightAtSite,
        onboarding.fifoPhaseSelector?.days?.work?.firstShiftAtSite,
        onboarding.fifoPhaseSelector?.days?.rest?.lastDayBeforeSite,
        onboarding.fifoPhaseSelector?.days?.swing?.firstDayShiftAtSite,
      ].join('\n');

      for (const phrase of expected.topFunnel) {
        expect(topFunnelCopy).toContain(phrase);
      }

      const fullOnboardingCopy = JSON.stringify(onboarding);
      const fullProfileCopy = JSON.stringify(profile);
      expect(fullOnboardingCopy).not.toMatch(
        /Votre mine comporte|Sites miniers|Minería global remota|Mineração global remota|Jou myn|Mynterreine|Myninfrastruktuur|مواقع التعدين|مناجم تحت الأرض|بنية المنجم|يعمل منجمك|आपकी खदान|खनन स्थल|भूमिगत खदानें|खनन अवसंरचना|您的矿山|地下矿山|矿山基础设施/i
      );
      expect(fullProfileCopy).not.toMatch(/"Minero"/i);
      expect(
        [profile.shift?.configCard?.workDaysOnSite, profile.shift?.configCard?.restDaysAtHome].join(
          '\n'
        )
      ).not.toMatch(
        /on-site|on site|site|sitio|situs|terrein|werf|موقع|साइट|现场|месте|kusayithi/i
      );

      expect(topFunnelCopy).not.toMatch(
        /site minier|site minero|site de mina|site mine|site your|your site|your mine|mine site|mining site|sitio|situs|сайт|участок|站点|网站|साइट|موقعك|موقع منجمك|موقع المنجم|موقع التعدين|terrein|werf|webwerf|mynterrein|mynperseel|esizeni|indawo yakho yemigodi|na mina|à mina|de volta à mina|en la mina/i
      );
    }
  });

  it('localizes launch-visible fallback copy outside the schedule builder locales', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const guardedKeys: Record<string, string[]> = {
      'onboarding.json': [
        'completion.summary.allDay',
        'completion.summary.notTimed',
        'completion.summary.rosterTypeUniversal',
        'completion.summary.universalShiftSystem',
        'completion.summary.scheduleEngine',
        'completion.summary.scheduleType',
        'completion.setupReady',
        'fifoPhaseSelector.days.custom.title',
        'startDate.preview.phaseLabel',
        'shiftBuilder.inspector.kind.label',
        'shiftBuilder.validation.errorTitle_one',
      ],
      'dashboard.json': [
        'notifications.smartReminders.travel.outToday.title',
        'notifications.smartReminders.travel.tomorrow.body',
        'countdown.leftInShift',
        'countdown.untilShift',
        'shiftCheckIn.energy.medium',
        'onboardingChecklist.items.schedule',
      ],
      'profile.json': ['smartReminders.sections.travel', 'smartReminders.units.hoursShort'],
    };
    const englishLocales = Object.fromEntries(
      Object.keys(guardedKeys).map((file) => [file, readLocale('en', file)])
    );

    for (const locale of fs.readdirSync(localeRoot)) {
      if (locale === 'en') continue;

      for (const [file, keys] of Object.entries(guardedKeys)) {
        const localeFile = path.join(localeRoot, locale, file);
        if (!fs.existsSync(localeFile)) continue;

        const translated = readLocale(locale, file);
        const english = englishLocales[file];

        for (const key of keys) {
          expect(getNestedString(translated, key)?.trim()).toBeTruthy();
          expect(getNestedString(translated, key)).not.toBe(getNestedString(english, key));
        }
      }
    }
  });

  it('keeps build-in-public content prompts aligned with broader shift-worker positioning', () => {
    const anthropicProvider = fs.readFileSync(
      path.join(process.cwd(), 'scripts/lib/content-providers/anthropic.js'),
      'utf8'
    );
    const buildInPublicBrief = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_BUILD_IN_PUBLIC_AGENT.md'),
      'utf8'
    );
    const activeContentGuidance = `${anthropicProvider}\n${buildInPublicBrief}`;

    expect(activeContentGuidance).toContain('FIFO crews and shift workers');
    expect(activeContentGuidance).toContain('launched from real mining roster pain');
    expect(activeContentGuidance).not.toContain('Ryvro is a shift scheduling product for miners');
    expect(activeContentGuidance).not.toContain(
      'Current focus: shift scheduling and shift calendar for miners'
    );
  });

  it('keeps generated content brand context universal-ready instead of mining-only', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const brandContext = require('../../config/ryvro-brand-context.js') as {
      product?: {
        currentNiche?: string;
        longTermVision?: string;
      };
      audience?: {
        primary?: string[];
      };
    };
    const angleFramework = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_ANGLE_FRAMEWORK.md'),
      'utf8'
    );
    const onboarding = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/onboarding.json'), 'utf8')
    ) as {
      rosterType?: {
        cards?: {
          fifo?: {
            description?: string;
            details?: {
              howItWorks?: string;
              examples?: string[];
              regions?: string[];
              pros?: string[];
            };
          };
        };
      };
    };

    expect(brandContext.product?.currentNiche).toContain('FIFO crews and shift workers');
    expect(brandContext.product?.longTermVision).toBe(
      'a general shift scheduler for all industries'
    );
    expect(brandContext.audience?.primary).toEqual(
      expect.arrayContaining(['healthcare workers', 'security teams', 'shift workers'])
    );
    expect(brandContext.product?.currentNiche).not.toBe('mining shift workers');
    expect(angleFramework).toContain(
      'shift workers need a fast answer they can trust, and the launch story starts from mining and FIFO roster pain'
    );
    expect(onboarding.rosterType?.cards?.fifo?.details?.regions).toContain(
      'Remote global operations'
    );
    expect(onboarding.rosterType?.cards?.fifo?.details?.regions).not.toContain(
      'Remote global mining'
    );

    const fifoRosterType = onboarding.rosterType?.cards?.fifo;
    const fifoRosterTypeCopy = [
      fifoRosterType?.description,
      fifoRosterType?.details?.howItWorks,
      ...(fifoRosterType?.details?.examples ?? []),
      ...(fifoRosterType?.details?.regions ?? []),
      ...(fifoRosterType?.details?.pros ?? []),
    ].join('\n');
    expect(fifoRosterTypeCopy).toContain('Remote global operations');
    expect(fifoRosterTypeCopy).not.toMatch(
      /on-site|remote sites|global mining|remote global sites/i
    );
  });

  it('keeps publishable build-in-public packs on current Ryvro file names', () => {
    const contentFiles = walkFiles(path.join(process.cwd(), 'build-in-public')).filter((file) =>
      file.endsWith('.json')
    );
    const content = contentFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

    expect(content).toContain('backend/functions/src/audience-os/ryvro-adapter.ts');
    expect(content).toContain('src/components/voice/RyvroVoiceButton.tsx');
    expect(content).toContain('src/services/RyvroBrainService.ts');
    expect(content).not.toContain('backend/functions/src/audience-os/ellie-adapter.ts');
    expect(content).not.toContain('src/components/voice/EllieButton.tsx');
    expect(content).not.toContain('src/services/EllieBrainService.ts');
    expect(content).not.toContain('docs/ELLIE_RESEARCH_FUNNEL_OS.md');
  });

  it('keeps active English shift-system onboarding copy universal-ready', () => {
    const onboarding = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/onboarding.json'), 'utf8')
    ) as {
      shiftSystem?: {
        title?: string;
        title_named?: string;
        instruction?: string;
        cards?: Record<
          string,
          {
            description?: string;
            details?: {
              useCases?: string[];
            };
          }
        >;
      };
      shiftPattern?: {
        cards?: Record<
          string,
          {
            description?: string;
          }
        >;
      };
      completion?: {
        features?: Record<string, string | undefined>;
      };
      fifoCustom?: {
        preview?: {
          ratioLabel?: string;
          siteDays?: string;
          subtitle?: string;
        };
        sliders?: {
          daysAtSite?: string;
        };
        subtitle?: string;
        success?: string;
        tip?: string;
        workPatternSubtitle?: string;
        workPatterns?: Record<
          string,
          {
            description?: string;
          }
        >;
      };
    };
    const shiftSystem = onboarding.shiftSystem;
    const guardedCopy = [
      shiftSystem?.title ?? '',
      shiftSystem?.title_named ?? '',
      shiftSystem?.instruction ?? '',
      ...Object.values(shiftSystem?.cards ?? {}).flatMap((card) => [
        card.description ?? '',
        ...(card.details?.useCases ?? []),
      ]),
      onboarding.shiftPattern?.cards?.continental?.description ?? '',
      onboarding.shiftPattern?.cards?.custom?.description ?? '',
      onboarding.shiftPattern?.cards?.['4-4-4']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-8-6']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-7-7']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-14-14']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-14-7']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-21-7']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-28-14']?.description ?? '',
      onboarding.shiftPattern?.cards?.['fifo-custom']?.description ?? '',
    ].join('\n');

    expect(guardedCopy).toContain('workplace');
    expect(guardedCopy).toContain('8-hour shift teams');
    expect(guardedCopy).toContain('Healthcare');
    expect(guardedCopy).toContain('Security');
    expect(guardedCopy).toContain('Manufacturing');
    expect(guardedCopy).toContain('Transport hubs');
    expect(guardedCopy).not.toMatch(
      /your mine|your site uses|underground mines|mine infrastructure|mining sites|8-hour shift sites/i
    );

    const fifoCustom = onboarding.fifoCustom;
    const fifoBuilderCopy = [
      fifoCustom?.preview?.ratioLabel,
      fifoCustom?.preview?.siteDays,
      fifoCustom?.preview?.subtitle,
      fifoCustom?.sliders?.daysAtSite,
      fifoCustom?.subtitle,
      fifoCustom?.success,
      fifoCustom?.workPatternSubtitle,
      ...Object.values(fifoCustom?.workPatterns ?? {}).map((pattern) => pattern.description),
    ].join('\n');

    expect(fifoBuilderCopy).toContain('work-block days');
    expect(fifoBuilderCopy).toContain('rest days');
    expect(fifoBuilderCopy).not.toMatch(/site|on-site|on site|at site|site block/i);

    const completionFeatures = onboarding.completion?.features ?? {};
    const completionBenefitCopy = [
      completionFeatures.remindersDesc,
      completionFeatures.balanceDesc,
      completionFeatures.earningsDesc,
      completionFeatures.mealsDesc,
    ].join('\n');

    expect(completionBenefitCopy).toContain('handover, callout, or early start');
    expect(completionBenefitCopy).toContain('shift hours, allowances, and overtime');
    expect(completionBenefitCopy).not.toMatch(
      /roster swing|FIFO loadings|site allowances|FIFO swings|12-hour underground/i
    );
  });

  it('keeps localized completion benefits and Arabic voice labels off retired launch copy', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const locales = fs.readdirSync(localeRoot);
    const completionFeatureKeys = [
      'completion.features.remindersDesc',
      'completion.features.fatigueDesc',
      'completion.features.balanceDesc',
      'completion.features.earningsDesc',
      'completion.features.mealsDesc',
    ];

    for (const locale of locales) {
      const onboarding = readLocale(locale, 'onboarding.json');
      const completionBenefitCopy = completionFeatureKeys
        .map((key) => getNestedString(onboarding, key) ?? '')
        .join('\n');

      expect(completionBenefitCopy).not.toMatch(
        /FIFO loadings|FIFO-ladings|muatan FIFO|cargas FIFO|cargas? FIFO|FIFO费用|FIFO लोडिंग|FIFO-нагрузки|terrein(toelae)?|site allowances|sitio subterráneo|situs bawah tanah|сайт FIFO|участке, FIFO|现场津贴|साइट भत्ते|izibonelelo zesite|underground|subterr[aâ]ne|subterráne|subterrâneo|ondergrondse|bawah tanah|भूमिगत|под зем|地下|engaphansi komhlaba/i
      );
    }

    const arabicOnboarding = JSON.stringify(readLocale('ar', 'onboarding.json'));
    const arabicDashboard = JSON.stringify(readLocale('ar', 'dashboard.json'));
    expect(arabicOnboarding).toContain('Ryvro');
    expect(arabicDashboard).toContain('Ryvro');
    expect([arabicOnboarding, arabicDashboard].join('\n')).not.toMatch(/ايلي|إيلي|إيلى/i);
  });

  it('keeps translated onboarding FIFO setup copy broad instead of site-specific', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');

    for (const locale of fs.readdirSync(localeRoot)) {
      const onboarding = readLocale(locale, 'onboarding.json') as {
        shiftPattern?: {
          cards?: Record<
            string,
            {
              description?: string;
            }
          >;
        };
        rosterType?: {
          cards?: {
            fifo?: {
              description?: string;
              details?: {
                howItWorks?: string;
                examples?: string[];
                regions?: string[];
                pros?: string[];
              };
            };
          };
        };
        fifoCustom?: {
          preview?: {
            ratioLabel?: string;
            siteDays?: string;
            subtitle?: string;
          };
          sliders?: {
            daysAtSite?: string;
          };
          subtitle?: string;
          success?: string;
          tip?: string;
          workPatternSubtitle?: string;
          workPatterns?: Record<
            string,
            {
              description?: string;
            }
          >;
        };
        fifoPhaseSelector?: {
          title?: {
            block_named?: string;
          };
          patterns?: {
            straightNights?: {
              quickInfo?: string;
            };
          };
          blocks?: {
            work?: {
              title?: string;
            };
            rest?: {
              title?: string;
            };
          };
          days?: {
            work?: {
              firstDayAtSite?: string;
              firstNightAtSite?: string;
              firstShiftAtSite?: string;
            };
            rest?: {
              lastDayBeforeSite?: string;
            };
            swing?: {
              firstDayShiftAtSite?: string;
            };
          };
        };
      };
      const fifoCards = onboarding.shiftPattern?.cards ?? {};
      const fifoRosterType = onboarding.rosterType?.cards?.fifo;
      const fifoCustom = onboarding.fifoCustom;
      const fifoPhaseSelector = onboarding.fifoPhaseSelector;
      const launchVisibleFifoCopy = [
        fifoRosterType?.description,
        fifoRosterType?.details?.howItWorks,
        ...(fifoRosterType?.details?.examples ?? []),
        ...(fifoRosterType?.details?.regions ?? []),
        ...(fifoRosterType?.details?.pros ?? []),
        fifoCards['4-4-4']?.description,
        fifoCards['fifo-8-6']?.description,
        fifoCards['fifo-7-7']?.description,
        fifoCards['fifo-14-14']?.description,
        fifoCards['fifo-14-7']?.description,
        fifoCards['fifo-21-7']?.description,
        fifoCards['fifo-28-14']?.description,
        fifoCards['fifo-custom']?.description,
        fifoCustom?.preview?.ratioLabel,
        fifoCustom?.preview?.siteDays,
        fifoCustom?.preview?.subtitle,
        fifoCustom?.sliders?.daysAtSite,
        fifoCustom?.subtitle,
        fifoCustom?.success,
        fifoCustom?.tip,
        fifoCustom?.workPatternSubtitle,
        ...Object.values(fifoCustom?.workPatterns ?? {}).map((pattern) => pattern.description),
        fifoPhaseSelector?.title?.block_named,
        fifoPhaseSelector?.patterns?.straightNights?.quickInfo,
        fifoPhaseSelector?.blocks?.work?.title,
        fifoPhaseSelector?.blocks?.rest?.title,
        fifoPhaseSelector?.days?.work?.firstDayAtSite,
        fifoPhaseSelector?.days?.work?.firstNightAtSite,
        fifoPhaseSelector?.days?.work?.firstShiftAtSite,
        fifoPhaseSelector?.days?.rest?.lastDayBeforeSite,
        fifoPhaseSelector?.days?.swing?.firstDayShiftAtSite,
      ].join('\n');

      expect(launchVisibleFifoCopy).not.toMatch(
        /on-site|on site|at site|back at site|returning to site|site block|site days|days at site|your site|site uses|site crews|remote sites|long-haul remote sites|remote global mining|global mining|sitio|situs|terrein|werf|webwerf|موقع|साइट|现场|站点|объект|месте|сайт|esizeni|sayithi/i
      );
      expect(launchVisibleFifoCopy).not.toMatch(/mine|myn|mina|mining|haul truck|underground/i);
    }
  });

  it('keeps active assistant tool descriptions off site-specific launch wording', () => {
    const voiceAssistantPrompts = fs.readFileSync(
      path.join(process.cwd(), 'src/utils/voiceAssistantPrompts.ts'),
      'utf8'
    );

    expect(voiceAssistantPrompts).toContain('when does my next break start?');
    expect(voiceAssistantPrompts).not.toMatch(/off-site|on-site|at site|next site/i);
  });

  it('keeps content generation outputs broad while preserving the miner-builder origin story', () => {
    const contentGenerator = fs.readFileSync(
      path.join(process.cwd(), 'scripts/generate-stop-scroll-content.js'),
      'utf8'
    );
    const platformPlaybook = fs.readFileSync(
      path.join(process.cwd(), 'config/ryvro-platform-playbook.js'),
      'utf8'
    );
    const researchAutomationPrompt = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_RESEARCH_FUNNEL_AUTOMATION_PROMPT.md'),
      'utf8'
    );
    const activeGenerationGuidance = [
      contentGenerator,
      platformPlaybook,
      researchAutomationPrompt,
    ].join('\n');

    expect(activeGenerationGuidance).toContain('Built by a miner for shift workers');
    expect(contentGenerator).toContain('#shiftworkers');
    expect(contentGenerator).toContain('#rosterlife');
    expect(contentGenerator).not.toContain('#mining #buildinpublic');
    expect(platformPlaybook).toContain('FIFO crews, shift workers, and broad discovery viewers');
    expect(platformPlaybook).not.toContain('miners, shift workers, and broad discovery viewers');
    expect(researchAutomationPrompt).toContain('closest Ryvro shift-worker launch persona');
    expect(researchAutomationPrompt).not.toContain('closest Ryvro miner persona');
  });

  it('keeps the research funnel operating system aligned with broad shift-worker personas', () => {
    const researchFunnelOs = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_RESEARCH_FUNNEL_OS.md'),
      'utf8'
    );

    expect(researchFunnelOs).toContain('Turn shift-worker discovery');
    expect(researchFunnelOs).toContain('## Exact Shift-Worker Personas');
    expect(researchFunnelOs).toContain('Runtime persona ID: `underground-production-operator`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `fifo-field-worker`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `maintenance-trades-miner`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `process-plant-control-room-operator`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `healthcare-rotating-clinician`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `security-operations-officer`');
    expect(researchFunnelOs).toContain('Runtime persona ID: `transport-logistics-shift-worker`');
    expect(researchFunnelOs).toContain(
      'Runtime persona ID: `hospitality-manufacturing-shift-worker`'
    );
    expect(researchFunnelOs).toContain('Runtime persona ID: `crew-lead-supervisor`');
    expect(researchFunnelOs).toContain('Healthcare variant:');
    expect(researchFunnelOs).toContain('Security variant:');
    expect(researchFunnelOs).toContain('Transport variant:');
    expect(researchFunnelOs).toContain('Hospitality/manufacturing variant:');
    expect(researchFunnelOs).toContain('personas.ts');
    expect(researchFunnelOs).not.toContain('## Exact Miner Personas');
    expect(researchFunnelOs).not.toContain('Turn miner discovery');
    expect(researchFunnelOs).not.toContain('no mining relevance');
    expect(researchFunnelOs).not.toContain('persona-classifier.ts');
    expect(researchFunnelOs).not.toContain('the exact problems the miner described');
  });

  it('keeps tracked publishable build-in-public content on Ryvro naming', () => {
    const publishableContentFiles = ['build-in-public', 'reports/stop-scroll-rollover-test']
      .flatMap((relativeDir) => walkFiles(path.join(process.cwd(), relativeDir)))
      .filter((file) => /\.(json|md|txt)$/.test(file));

    for (const file of publishableContentFiles) {
      const content = fs.readFileSync(file, 'utf8');

      expect(content).not.toMatch(/#ellieapp|#mining|Hey Ellie|\bEllie\b/);
      expect(content).not.toContain('miners, shift workers, and broad discovery viewers');
      expect(content).not.toMatch(/mining helmet|helmet icon|mining-helmet-sacred-flame/i);
    }
  });

  it('does not keep retired Ellie brain endpoints in CI workflows', () => {
    const ciWorkflow = fs.readFileSync(
      path.join(process.cwd(), '.github/workflows/ci.yml'),
      'utf8'
    );
    const e2eWorkflow = fs.readFileSync(
      path.join(process.cwd(), '.github/workflows/e2e.yml'),
      'utf8'
    );

    expect(ciWorkflow).not.toContain('ellie-brain-test.cloudfunctions.net/ellieBrain');
    expect(e2eWorkflow).not.toContain('ellie-brain-test.cloudfunctions.net/ellieBrain');
    expect(ciWorkflow).not.toContain('ELLIE_BRAIN_URL');
    expect(ciWorkflow).not.toContain('ELLIE_BRAIN_TIMEOUT');
    expect(e2eWorkflow).not.toContain('ELLIE_BRAIN_URL');
    expect(e2eWorkflow).not.toContain('ELLIE_BRAIN_TIMEOUT');
    expect(ciWorkflow).toContain('ryvro-brain-test.cloudfunctions.net/ryvroBrain');
    expect(e2eWorkflow).toContain('ryvro-brain-test.cloudfunctions.net/ryvroBrain');
    expect(ciWorkflow).toContain('name: Release Check');
    expect(ciWorkflow).toContain('backend/functions/package-lock.json');
    expect(ciWorkflow).toContain('npm --prefix backend/functions ci');
    expect(ciWorkflow).toContain('run: npm run release:check');
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:native:check');
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:store:check');
    expect(packageJson.scripts?.['release:check']).toContain('npm run release:owner:check');
  });

  it('keeps active voice backend source on Ryvro naming', () => {
    const files = [
      ...walkFiles(path.join(process.cwd(), 'src')),
      ...walkFiles(path.join(process.cwd(), 'backend/functions/src')),
    ].filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
    const activeSource = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

    expect(activeSource).toContain('RyvroBrainService');
    expect(activeSource).toContain('ryvroBrainService');
    expect(activeSource).toContain('isConfiguredRyvroBrainUrl');
    expect(activeSource).toContain("'ryvro_brain'");
    expect(activeSource).toContain('classifyShiftWorkerPersona');
    expect(activeSource).toContain('ShiftWorkerPersonaId');
    expect(activeSource).toContain('healthcare-rotating-clinician');
    expect(activeSource).toContain('security-operations-officer');
    expect(activeSource).toContain('transport-logistics-shift-worker');
    expect(activeSource).toContain('hospitality-manufacturing-shift-worker');
    expect(activeSource).not.toContain('EllieBrainService');
    expect(activeSource).not.toContain('ellieBrainService');
    expect(activeSource).not.toContain('export const ellieBrain');
    expect(activeSource).not.toContain('isConfiguredEllieBrainUrl');
    expect(activeSource).not.toContain("'ellie_brain'");
    expect(activeSource).not.toContain('classifyMinerPersona');
    expect(activeSource).not.toContain('MinerPersonaId');
    expect(activeSource).not.toContain('No clear mining persona match found.');
  });

  it('keeps active voice UI and admin surfaces on Ryvro naming', () => {
    const activeUiFiles = [
      'src/navigation/MainTabNavigator.tsx',
      'src/components/navigation/CustomTabBar.tsx',
      'src/components/voice/index.ts',
      'src/components/voice/RyvroVoiceButton.tsx',
      'web-admin/analytics-intelligence/index.html',
      'web-admin/analytics-intelligence/app.js',
      'web-admin/analytics-intelligence/README.md',
      'web-admin/analytics-intelligence/styles.css',
    ].map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
    const activeUi = activeUiFiles.join('\n');

    expect(activeUi).toContain('RyvroVoiceButton');
    expect(activeUi).toContain('Ryvro Founder Console');
    expect(activeUi).toContain('Assistant');
    expect(activeUi).not.toContain('EllieButton');
    expect(activeUi).not.toContain('Ellie Founder Console');
    expect(activeUi).not.toContain('name="Ellie"');
    expect(activeUi).not.toContain("route.name === 'Ellie'");
    expect(activeUi).not.toContain('tabs.ellie');

    const localeDirs = fs.readdirSync(path.join(process.cwd(), 'src/i18n/locales'));
    for (const locale of localeDirs) {
      const dashboardPath = path.join(process.cwd(), 'src/i18n/locales', locale, 'dashboard.json');
      if (!fs.existsSync(dashboardPath)) continue;
      const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) as {
        tabs?: Record<string, string>;
      };
      expect(dashboard.tabs?.assistant).toBe('Ryvro');
      expect(dashboard.tabs).not.toHaveProperty('ellie');
      if (locale !== 'en') {
        expect(dashboard.tabs?.openProPlansA11y).not.toBe('View Pro plans');
        expect(dashboard.tabs?.voiceAssistantLoadingA11y).not.toBe(
          'Checking voice assistant access'
        );
      }
    }
  });

  it('keeps active storage code symbols neutral while preserving retired key cleanup', () => {
    const storageFiles = [
      'src/constants/storageKeys.ts',
      'src/i18n/languageDetector.ts',
      'src/services/AppStateStorageService.ts',
    ].map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
    const activeStorageCode = storageFiles.join('\n');

    expect(activeStorageCode).toContain('retiredLanguagePreference');
    expect(activeStorageCode).toContain('retiredAssistantChecklistDone');
    expect(activeStorageCode).toContain('RETIRED_LANGUAGE_PREFERENCE_KEY');
    expect(activeStorageCode).toContain('RETIRED_ASSISTANT_CHECKLIST_DONE_KEY');
    expect(activeStorageCode).toContain("'@ellie_language'");
    expect(activeStorageCode).toContain("'checklist:ask_ellie_done'");
    expect(activeStorageCode).not.toContain('legacyLanguage');
    expect(activeStorageCode).not.toContain('legacyAskEllieDone');
    expect(activeStorageCode).not.toContain('LEGACY_LANGUAGE_KEY');
    expect(activeStorageCode).not.toContain('LEGACY_CHECKLIST_ASK_ELLIE_DONE_KEY');
  });

  it('keeps active Firebase JS service-app symbols neutral while preserving retired cleanup', () => {
    const firebaseConfigSource = fs.readFileSync(
      path.join(process.cwd(), 'src/config/firebase.ts'),
      'utf8'
    );
    const firebaseServiceSource = fs.readFileSync(
      path.join(process.cwd(), 'src/services/firebase/FirebaseService.ts'),
      'utf8'
    );
    const firebaseFallbackTest = fs.readFileSync(
      path.join(process.cwd(), 'tests/config/firebase.native-fallback.test.ts'),
      'utf8'
    );

    expect(firebaseConfigSource).toContain('const RYVRO_JS_SERVICE_APP_NAME');
    expect(firebaseConfigSource).toContain('const RETIRED_JS_SERVICE_APP_NAME');
    expect(firebaseConfigSource).toContain('if (getApps().length === 0)');
    expect(firebaseConfigSource).toContain('void initializeApp(buildFirebaseOptions())');
    expect(firebaseServiceSource).toContain(
      "import { getFirebaseInstances } from '@/config/firebase'"
    );
    expect(firebaseServiceSource).toContain('const firebaseInstances = getFirebaseInstances()');
    expect(
      fs.readFileSync(
        path.join(process.cwd(), 'src/services/firebase/nativeAvailability.ts'),
        'utf8'
      )
    ).toContain("process.env.EXPO_PUBLIC_E2E_TEST_MODE === '1'");
    expect(firebaseConfigSource).toContain("'__RYVRO_JS_SERVICES__'");
    expect(firebaseConfigSource).toContain("'__ELLIE_JS_SERVICES__'");
    expect(firebaseConfigSource).not.toContain('LEGACY_ELLIE_JS_SERVICE_APP_NAME');
    expect(firebaseFallbackTest).toContain(
      "expect(jsInitializeApp).not.toHaveBeenCalledWith(expect.anything(), '__ELLIE_JS_SERVICES__')"
    );
  });

  it('keeps the web admin Firebase config path on Ryvro-safe values', () => {
    const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
    const firebaseJson = fs.readFileSync(path.join(process.cwd(), 'firebase.json'), 'utf8');
    const adminReadme = fs.readFileSync(
      path.join(process.cwd(), 'web-admin/analytics-intelligence/README.md'),
      'utf8'
    );
    const exampleConfig = fs.readFileSync(
      path.join(process.cwd(), 'web-admin/analytics-intelligence/firebase-config.example.js'),
      'utf8'
    );
    const localConfig = readOptional('web-admin/analytics-intelligence/firebase-config.local.js');
    const guardedConfig = [exampleConfig, localConfig ?? ''].join('\n');

    expect(gitignore).toContain('web-admin/analytics-intelligence/firebase-config.local.js');
    expect(firebaseJson).toContain('"firebase-config.local.js"');
    expect(adminReadme).toContain('Ryvro Firebase web config values');
    expect(adminReadme).toContain('Do not point the local admin console at the retired Ellie');
    expect(adminReadme).toContain('iOS/Android Ryvro shift-worker app');
    expect(adminReadme).not.toContain('iOS/Android miner app');
    expect(exampleConfig).toContain('YOUR_RYVRO_PROJECT_ID.firebaseapp.com');
    expect(exampleConfig).toContain('YOUR_RYVRO_PROJECT_ID.firebasestorage.app');
    expect(guardedConfig).not.toContain('ellie-20260220135308');
    expect(guardedConfig).not.toContain('ellieBrain');
    expect(guardedConfig).not.toContain('com.ilyasuseidu.ellie');
    expect(guardedConfig).not.toContain('com.ellie.minershiftassistant');
  });

  it('pins universal exception, calendar, and reminder copy for launch surfaces', () => {
    const scheduleLocale = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/schedule.json'), 'utf8')
    ) as {
      builder?: Record<string, string>;
    };
    const dashboardLocale = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/dashboard.json'), 'utf8')
    ) as {
      fifo?: {
        onSite?: string;
      };
      voiceAssistant?: {
        offlineFallback?: {
          patternSummaryFifo?: string;
        };
      };
    };
    const profileLocale = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/profile.json'), 'utf8')
    ) as {
      shift?: {
        site?: string;
        siteName?: string;
        sections?: Record<string, string>;
      };
      smartReminders?: {
        rows?: {
          commute?: {
            sublabel?: string;
          };
        };
      };
    };
    const onboardingLocale = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/onboarding.json'), 'utf8')
    ) as {
      shiftBuilder?: {
        inspector?: {
          location?: string;
        };
      };
    };
    const builderScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/UniversalShiftBuilderScreen.tsx'),
      'utf8'
    );
    const dashboardScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/MainDashboardScreen.tsx'),
      'utf8'
    );
    const smartRemindersPanel = fs.readFileSync(
      path.join(process.cwd(), 'src/components/profile/SmartRemindersPanel.tsx'),
      'utf8'
    );
    const shiftInspectorSheet = fs.readFileSync(
      path.join(process.cwd(), 'src/components/shift-builder/ShiftInspectorSheet.tsx'),
      'utf8'
    );
    const calendarUtils = fs.readFileSync(
      path.join(process.cwd(), 'src/utils/universalShiftCalendarUtils.ts'),
      'utf8'
    );

    expect(profileLocale.shift?.site).toBe('Work location');
    expect(profileLocale.shift?.siteName).toBe('Work location (optional)');
    expect(profileLocale.shift?.sections?.siteDetails).toBe('WORK LOCATION');
    expect(scheduleLocale.builder?.holidayHint).toContain('preserving the original shift');
    expect(scheduleLocale.builder?.oneOffHint).toBe(
      'Change one specific day without changing the repeating schedule.'
    );
    expect(scheduleLocale.builder?.oneOffListSubtitle).toContain('Changed just this day');
    expect(scheduleLocale.builder?.calendarHint).toContain('shift times, locations, and notes');
    expect(profileLocale.smartReminders?.rows?.commute?.sublabel).toBe(
      'How long to reach your work location'
    );
    expect(dashboardLocale.fifo?.onSite).toBe('Work block active');
    expect(dashboardLocale.voiceAssistant?.offlineFallback?.patternSummaryFifo).toBe(
      'Your pattern is {{workDays}} work days, then {{restDays}} days off.'
    );

    expect(builderScreen).toContain("t('builder.oneOffListSubtitle'");
    expect(dashboardScreen).toContain('QuickActionsBar');
    expect(dashboardScreen).toContain('dashboardQuickActions');
    expect(dashboardScreen).toContain('dashboard-quick-actions');
    expect(dashboardScreen).toContain('handleDashboardQuickActionPress');
    expect(dashboardScreen).toContain('quick_action_builder');
    expect(dashboardScreen).toContain('quick_action_export');
    expect(dashboardScreen).not.toContain('QuickActionsBar hidden');
    expect(dashboardScreen).not.toContain('actions not yet implemented');
    expect(shiftInspectorSheet).toContain("t('shiftBuilder.inspector.location')");
    expect(shiftInspectorSheet).toContain("t('shiftBuilder.inspector.locationA11y')");
    expect(onboardingLocale.shiftBuilder?.inspector?.location).toBe('Work location (optional)');
    expect(smartRemindersPanel).toContain('How long to reach your work location');
    expect(calendarUtils).toContain('LOCATION:');
    expect(calendarUtils).toContain('Changed just this day');

    const guardedCopy = [
      scheduleLocale.builder?.holidayHint,
      scheduleLocale.builder?.oneOffHint,
      scheduleLocale.builder?.oneOffListSubtitle,
      scheduleLocale.builder?.calendarHint,
      profileLocale.smartReminders?.rows?.commute?.sublabel,
      profileLocale.shift?.site,
      profileLocale.shift?.siteName,
      profileLocale.shift?.sections?.siteDetails,
      onboardingLocale.shiftBuilder?.inspector?.location,
      dashboardLocale.fifo?.onSite,
      dashboardLocale.voiceAssistant?.offlineFallback?.patternSummaryFifo,
      shiftInspectorSheet,
    ].join('\n');

    expect(guardedCopy).not.toMatch(/mine site|haul truck|underground|Location \/ Site|site name/i);
  });

  it('keeps translated dashboard FIFO summaries broad instead of site-specific', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');

    for (const locale of fs.readdirSync(localeRoot)) {
      const dashboardLocale = JSON.parse(
        fs.readFileSync(path.join(localeRoot, locale, 'dashboard.json'), 'utf8')
      ) as {
        fifo?: {
          onSite?: string;
        };
        voiceAssistant?: {
          offlineFallback?: {
            patternSummaryFifo?: string;
          };
        };
      };

      const launchVisibleFifoCopy = [
        dashboardLocale.fifo?.onSite,
        dashboardLocale.voiceAssistant?.offlineFallback?.patternSummaryFifo,
      ].join('\n');

      expect(launchVisibleFifoCopy).not.toMatch(
        /on-site|on site|site|sitio|situs|terrein|موقع|साइट|现场|esizeni|объект|месте/i
      );
      expect(launchVisibleFifoCopy).not.toMatch(/mine|myn|mina|mining|haul truck|underground/i);
    }
  });

  it('keeps hidden Schedule and Stats helper screens free of launch placeholder copy', () => {
    const scheduleScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/ScheduleScreen.tsx'),
      'utf8'
    );
    const statsScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/StatsScreen.tsx'),
      'utf8'
    );
    const universalShiftBuilderSpec = fs.readFileSync(
      path.join(process.cwd(), 'docs/UNIVERSAL_SHIFT_BUILDER_SPEC.md'),
      'utf8'
    );
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');

    expect(scheduleScreen).toContain("t('availableNow')");
    expect(statsScreen).toContain("t('availableNow')");
    expect(scheduleScreen).not.toMatch(/coming soon|placeholder|will provide/i);
    expect(statsScreen).not.toMatch(/coming soon|placeholder|will provide/i);
    expect(universalShiftBuilderSpec).toContain(
      'Internal Schedule surfaces or future schedule screen'
    );
    expect(universalShiftBuilderSpec).not.toContain('Schedule screen placeholders');

    for (const locale of fs.readdirSync(localeRoot)) {
      const scheduleLocalePath = path.join(localeRoot, locale, 'schedule.json');
      if (!fs.existsSync(scheduleLocalePath)) continue;

      const scheduleLocale = JSON.parse(fs.readFileSync(scheduleLocalePath, 'utf8')) as {
        availableNow?: string;
        comingSoon?: string;
        description?: string;
        statsDescription?: string;
      };

      expect(scheduleLocale.availableNow?.trim()).toBeTruthy();
      expect(scheduleLocale.comingSoon).toBeUndefined();
      expect([scheduleLocale.description, scheduleLocale.statsDescription].join('\n')).not.toMatch(
        /coming soon|will appear here|will provide/i
      );
    }
  });

  it('localizes remaining high-risk reminder, dashboard, and onboarding launch labels', () => {
    const schedulePreviewCalendar = fs.readFileSync(
      path.join(process.cwd(), 'src/components/shift-builder/SchedulePreviewCalendar.tsx'),
      'utf8'
    );
    const shiftSequenceCanvas = fs.readFileSync(
      path.join(process.cwd(), 'src/components/shift-builder/ShiftSequenceCanvas.tsx'),
      'utf8'
    );
    const shiftInspectorSheet = fs.readFileSync(
      path.join(process.cwd(), 'src/components/shift-builder/ShiftInspectorSheet.tsx'),
      'utf8'
    );
    const guardedLocaleKeys: Record<string, string[]> = {
      'common.json': ['subscription.paywall.plans.weeklySuffix'],
      'profile.json': ['smartReminders.sections.travel', 'smartReminders.units.hoursShort'],
      'dashboard.json': [
        'notifications.smartReminders.travel.outToday.title',
        'notifications.smartReminders.travel.tomorrow.body',
        'countdown.leftInShift',
        'countdown.untilShift',
        'shiftCheckIn.energy.medium',
        'onboardingChecklist.items.schedule',
      ],
      'onboarding.json': [
        'completion.summary.universalShiftSystem',
        'shiftBuilder.validation.errorTitle_one',
        'shiftTime.customInput.period.am',
        'shiftTime.customInput.period.pm',
        'shiftBuilder.inspector.kind.label',
        'shiftBuilder.preview.errorHint',
        'shiftBuilder.canvas.noShiftTypesTitle',
        'shiftBuilder.canvas.emptyTitle',
        'shiftBuilder.canvas.modalAddRepeated',
        'shiftBuilder.inspector.nameRequiredTitle',
        'shiftBuilder.inspector.remindersTitle',
        'shiftBuilder.inspector.travelRemindersTitle',
      ],
    };

    expect(schedulePreviewCalendar).toContain("useTranslation('onboarding')");
    expect(schedulePreviewCalendar).toContain("t('shiftBuilder.preview.title')");
    expect(schedulePreviewCalendar).toContain("t('shiftBuilder.preview.errorHint')");
    expect(schedulePreviewCalendar).not.toContain('Fix this in the validation card above');
    expect(schedulePreviewCalendar).not.toContain('Complete your schedule to see a preview');
    expect(shiftSequenceCanvas).toContain("useTranslation('onboarding')");
    expect(shiftSequenceCanvas).toContain("t('shiftBuilder.canvas.noShiftTypesTitle')");
    expect(shiftSequenceCanvas).toContain("t('shiftBuilder.canvas.modalAddRepeated')");
    expect(shiftSequenceCanvas).not.toContain('No shift types');
    expect(shiftSequenceCanvas).not.toContain('Create a shift type first using the palette below.');
    expect(shiftSequenceCanvas).not.toContain('No shifts in sequence');
    expect(shiftSequenceCanvas).not.toContain('Add shift types below then tap Add shift');
    expect(shiftInspectorSheet).toContain("useTranslation('onboarding')");
    expect(shiftInspectorSheet).toContain("t('shiftBuilder.inspector.nameRequiredTitle')");
    expect(shiftInspectorSheet).toContain("t('shiftBuilder.inspector.remindersTitle')");
    expect(shiftInspectorSheet).not.toContain('Name required');
    expect(shiftInspectorSheet).not.toContain('Times required');
    expect(shiftInspectorSheet).not.toContain('Reminders for this shift');
    expect(shiftInspectorSheet).not.toContain('Travel reminders');

    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const locales = fs.readdirSync(localeRoot).filter((locale) => locale !== 'en');

    for (const [file, keys] of Object.entries(guardedLocaleKeys)) {
      const englishLocale = readLocale('en', file);

      for (const locale of locales) {
        const localePath = path.join(localeRoot, locale, file);
        if (!fs.existsSync(localePath)) continue;

        const translatedLocale = readLocale(locale, file);

        for (const key of keys) {
          const englishValue = getNestedString(englishLocale, key);
          const translatedValue = getNestedString(translatedLocale, key);

          if (!translatedValue) continue;

          expect(translatedValue).not.toBe(englishValue);
        }
      }
    }
  });
});
