import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

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
  const envConfigurationTemplate = fs.readFileSync(
    path.join(process.cwd(), 'RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md'),
    'utf8'
  );
  const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8')) as {
    expo?: {
      name?: string;
      slug?: string;
      scheme?: string;
      icon?: string;
      splash?: {
        image?: string;
      };
      ios?: {
        bundleIdentifier?: string;
        googleServicesFile?: string;
        infoPlist?: Record<string, unknown>;
      };
      android?: {
        package?: string;
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

  it('uses Ryvro defaults for public launch configuration', () => {
    expect(envExample).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envConfigurationTemplate).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envExample).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envConfigurationTemplate).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envExample).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
    expect(envConfigurationTemplate).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
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
      icon?: string;
      splash?: { image?: string };
      ios?: { bundleIdentifier?: string; googleServicesFile?: string };
      android?: {
        package?: string;
        googleServicesFile?: string;
        adaptiveIcon?: { foregroundImage?: string };
      };
      web?: { favicon?: string };
      extra?: Record<string, unknown>;
    };

    const previousIosGoogleServices = process.env.EXPO_IOS_GOOGLE_SERVICES_FILE;
    const previousAndroidGoogleServices = process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE;
    process.env.EXPO_IOS_GOOGLE_SERVICES_FILE = './ios/Ryvro/GoogleService-Info.plist';
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE = './android/app/ryvro-google-services.json';

    try {
      const dynamicConfig = buildAppConfig({ config: {} });

      expect(dynamicConfig.name).toBe('Ryvro Shift Planner');
      expect(dynamicConfig.slug).toBe('ryvro');
      expect(dynamicConfig.scheme).toBe('ryvro');
      expect(dynamicConfig.icon).toBe('./assets/icon.png');
      expect(dynamicConfig.splash?.image).toBe('./assets/splash-icon.png');
      expect(dynamicConfig.ios?.bundleIdentifier).toBe('com.ryvro.shiftplanner');
      expect(dynamicConfig.ios?.googleServicesFile).toBe('./ios/Ryvro/GoogleService-Info.plist');
      expect(dynamicConfig.android?.package).toBe('com.ryvro.shiftplanner');
      expect(dynamicConfig.android?.adaptiveIcon?.foregroundImage).toBe(
        './assets/adaptive-icon.png'
      );
      expect(dynamicConfig.android?.googleServicesFile).toBe(
        './android/app/ryvro-google-services.json'
      );
      expect(dynamicConfig.web?.favicon).toBe('./assets/favicon.png');
      expect(dynamicConfig.extra?.LEGAL_PRIVACY_POLICY_URL).toBe('https://getryvro.com/privacy');
      expect(dynamicConfig.extra?.LEGAL_TERMS_OF_SERVICE_URL).toBe('https://getryvro.com/terms');
      expect(dynamicConfig.extra?.SUPPORT_URL).toBe('https://getryvro.com/support');
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
    }
  });

  it('pins native installed identity to Ryvro launch values', () => {
    expect(appJson.expo?.ios?.infoPlist).toMatchObject({
      NSSpeechRecognitionUsageDescription:
        'Ryvro needs speech recognition to understand your questions.',
      NSMicrophoneUsageDescription: 'Ryvro needs microphone access for voice commands.',
    });

    const iosInfoPlist = readOptional('ios/Ellie/Info.plist');
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

    const iosInfoPlist = readOptional('ios/Ellie/Info.plist');
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

    expect(detoxConfig).toContain('Release-iphonesimulator/Ryvro.app');
    expect(detoxConfig).toContain('name=iPhone 16');
    expect(detoxConfig).toContain("type: 'iPhone 16'");
    expect(detoxConfig).toContain("'ios.release.xsmax'");
    expect(detoxConfig).toContain("'simulator.xsmax'");
    expect(detoxConfig).toContain("id: '0D934C32-AFB6-497E-8A1E-39F2DB3C447F'");
    expect(detoxConfig).not.toContain('EllieMinerShiftAssistant.app');
    expect(detoxConfig).not.toContain('name=iPhone 15 Pro');
  });

  it('keeps the native iOS build product on the Ryvro app artifact', () => {
    const xcodeProject = readOptional('ios/Ellie.xcodeproj/project.pbxproj');
    const xcodeScheme = readOptional('ios/Ellie.xcodeproj/xcshareddata/xcschemes/Ellie.xcscheme');

    if (xcodeProject) {
      expect(xcodeProject).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner;');
      expect(xcodeProject).toContain('PRODUCT_NAME = Ryvro;');
      expect(xcodeProject).toContain('productName = Ryvro;');
      expect(xcodeProject).toContain('path = Ryvro.app;');
      expect(xcodeProject).not.toContain('path = Ellie.app;');
    }

    if (xcodeScheme) {
      expect(xcodeScheme).toContain('BuildableName = "Ryvro.app"');
      expect(xcodeScheme).not.toContain('BuildableName = "Ellie.app"');
    }
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
    expect(appJson.expo?.ios?.googleServicesFile).toBe('./ios/Ryvro/GoogleService-Info.plist');
    expect(appJson.expo?.android?.googleServicesFile).toBe('./android/app/google-services.json');

    const iosGoogleServicePlist = readOptional('ios/Ryvro/GoogleService-Info.plist');
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

  it('keeps old brain keys only as empty migration fallbacks', () => {
    expect(envExample).toContain('ELLIE_BRAIN_URL=');
    expect(envExample).toContain('ELLIE_BRAIN_TIMEOUT=');
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
    expect(script).toContain('GOOGLE_WEB_CLIENT_ID');
    expect(script).toContain('GOOGLE_IOS_CLIENT_ID');
    expect(script).toContain('RYVRO_BRAIN_URL');
    expect(script).toContain('REVENUECAT_IOS_KEY');
    expect(script).toContain('REVENUECAT_ANDROID_KEY');
    expect(script).toContain('LEGAL_PRIVACY_POLICY_URL');
    expect(script).toContain('LEGAL_TERMS_OF_SERVICE_URL');
    expect(script).toContain('SUPPORT_URL');
    expect(envExample).toContain('REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envExample).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envConfigurationTemplate).toContain('REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx');
    expect(envConfigurationTemplate).toContain('REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx');
    expect(envConfigurationTemplate).toContain('REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envConfigurationTemplate).toContain('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro');
    expect(envExample).toContain('LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy');
    expect(envExample).toContain('LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms');
    expect(envExample).toContain('SUPPORT_URL=https://getryvro.com/support');
    expect(envConfigurationTemplate).toContain(
      'LEGAL_PRIVACY_POLICY_URL=https://getryvro.com/privacy'
    );
    expect(envConfigurationTemplate).toContain(
      'LEGAL_TERMS_OF_SERVICE_URL=https://getryvro.com/terms'
    );
    expect(envConfigurationTemplate).toContain('SUPPORT_URL=https://getryvro.com/support');
    expect(envConfigurationTemplate).toContain(
      'SHIFT_SCHEDULE_PARSER_URL=https://us-central1-your-project-id.cloudfunctions.net/parseShiftScheduleDescription'
    );
    expect(envConfigurationTemplate).toContain('SHIFT_SCHEDULE_PARSER_TIMEOUT_MS=45000');
    expect(envConfigurationTemplate).toContain('SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH=2000');
    expect(envConfigurationTemplate).toContain('UNIVERSAL_SHIFT_BUILDER_ENABLED=true');
    expect(envConfigurationTemplate).toContain('AI_SHIFT_BUILDER_ENABLED=true');
    expect(script).toContain('ELLIE_BRAIN_URL: leave empty for new Ryvro production builds');
    expect(externalSetup).toContain('npm run release:env:check');
    expect(externalSetup).toContain('live HTTPS `LEGAL_PRIVACY_POLICY_URL`');
    expect(releaseTasks).toContain('npm run release:env:check');
    expect(releaseTasks).toContain('set live HTTPS legal/support URLs');
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

    expect(clearanceEvidence).toContain('2026-05-30 at 07:46:33Z');
    expect(clearanceEvidence).toContain('2026-05-30T07:46:33.337Z');
    expect(clearanceEvidence).toContain('no exact `Ryvro` or `Ryvro Shift Planner` app result');
    expect(clearanceEvidence).toContain('Visible fuzzy names included `Rydoo` and `Rydora`');
    expect(clearanceEvidence).toContain(
      'Chrome/Computer Use read the public Google Play search page for `Ryvro`'
    );
    expect(clearanceEvidence).toContain('no exact Ryvro listing visible');
    expect(clearanceEvidence).toContain('Do not treat this as logged-in Play Console evidence');
    expect(clearanceEvidence).toContain('LinkedIn `company/ryvro`: public URL returned `404`');
    expect(clearanceEvidence).toContain('Formal trademark/legal clearance');
    expect(clearanceEvidence).toContain('App Store Connect and Google Play Console name checks');
    expect(clearanceEvidence).toContain('Play Console title/package availability');
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
    expect(clearanceEvidence).not.toContain(
      'LinkedIn `company/ryvro`: public URL returned bot-protection status `999`'
    );
  });

  it('keeps the active deployment plan on Ryvro and repo-root release paths', () => {
    const deploymentPlan = fs.readFileSync(
      path.join(process.cwd(), 'docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md'),
      'utf8'
    );

    expect(deploymentPlan).toContain('Repository: repo root');
    expect(deploymentPlan).toContain('cd <repo-root>');
    expect(deploymentPlan).toContain('Hide Schedule and Stats tabs for v1.');
    expect(deploymentPlan).toContain(
      'Schedule and Stats tabs are not visible anywhere in the bottom navigation.'
    );
    expect(deploymentPlan).toContain('-archivePath /tmp/Ryvro.xcarchive archive');
    expect(deploymentPlan).toContain(
      '<repo-root>/android/app/build/outputs/bundle/release/app-release.aab'
    );
    expect(deploymentPlan).not.toContain('Keep tabs visible');
    expect(deploymentPlan).not.toContain('beta placeholders');
    expect(deploymentPlan).not.toContain('/Users/Shared/Ellie');
    expect(deploymentPlan).not.toContain('/tmp/Ellie.xcarchive');
  });

  it('keeps the active deployment guide aligned with Ryvro release preflight', () => {
    const deploymentGuide = fs.readFileSync(path.join(process.cwd(), 'docs/DEPLOYMENT.md'), 'utf8');

    expect(deploymentGuide).toContain('docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md');
    expect(deploymentGuide).toContain('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
    expect(deploymentGuide).toContain('RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md');
    expect(deploymentGuide).toContain('RYVRO_RELEASE_TASKS.md');
    expect(deploymentGuide).toContain('npm run release:env:check');
    expect(deploymentGuide).toContain('eas secret:push --scope project --env-file .env');
    expect(deploymentGuide).toContain('"name": "Ryvro Shift Planner"');
    expect(deploymentGuide).toContain('"slug": "ryvro"');
    expect(deploymentGuide).toContain('"image": "./assets/splash-icon.png"');
    expect(deploymentGuide).toContain('"bundleIdentifier": "com.ryvro.shiftplanner"');
    expect(deploymentGuide).toContain('"package": "com.ryvro.shiftplanner"');
    expect(deploymentGuide).toContain('"permissions": ["INTERNET", "RECORD_AUDIO"]');
    expect(deploymentGuide).toContain('"serviceAccountKeyPath": "./google-play-key.json"');
    expect(deploymentGuide).toContain('ryvro-upload-key.keystore');
    expect(deploymentGuide).toContain('RYVRO_UPLOAD_*');
    expect(deploymentGuide).toContain('https://u.expo.dev/FILL_AFTER_EAS_INIT');
    expect(deploymentGuide).not.toContain('"permissions": ["CAMERA"');
    expect(deploymentGuide).not.toContain('READ_EXTERNAL_STORAGE');
    expect(deploymentGuide).not.toContain('WRITE_EXTERNAL_STORAGE');
    expect(deploymentGuide).not.toContain('"image": "./assets/splash.png"');
    expect(deploymentGuide).not.toContain('"projectId": "your-project-id"');
    expect(deploymentGuide).not.toContain('your-api-key');
    expect(deploymentGuide).not.toContain('your-apple-id@example.com');
    expect(deploymentGuide).not.toContain('your-app-store-connect-id');
    expect(deploymentGuide).not.toContain('your-team-id');
  });

  it('keeps the release task checklist on Ryvro and repo-root release paths', () => {
    const releaseTasks = fs.readFileSync(
      path.join(process.cwd(), 'RYVRO_RELEASE_TASKS.md'),
      'utf8'
    );

    expect(releaseTasks).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner');
    expect(releaseTasks).toContain('PRODUCT_NAME = Ryvro');
    expect(releaseTasks).toContain('internal generated workspace/scheme');
    expect(releaseTasks).toContain('cd <repo-root>');
    expect(releaseTasks).toContain('-archivePath /tmp/Ryvro.xcarchive archive');
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
    expect(easJson.submit?.production?.ios?.appleId).toBe('YOUR_APPLE_ID_EMAIL');
    expect(easJson.submit?.production?.ios?.ascAppId).toBe('FILL_AFTER_STEP_6');
    expect(easJson.submit?.production?.ios?.appleTeamId).toBe('BZ798WZJCB');
    expect(easJson.submit?.production?.android?.serviceAccountKeyPath).toBe(
      './google-play-key.json'
    );
    expect(easJson.submit?.production?.android?.track).toBe('internal');
    expect(gitignore).toContain('google-play-key.json');
    expect(trackedFiles).not.toContain('google-play-key.json');
  });

  it('keeps the Ryvro release readiness report explicit about evidence and remaining blockers', () => {
    const readinessReport = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_RELEASE_READINESS_REPORT.md'),
      'utf8'
    );

    expect(readinessReport).toContain('CI run `26659012373`');
    expect(readinessReport).toContain('commit `92a52ab`');
    expect(readinessReport).toContain('commit `610795d`');
    expect(readinessReport).toContain('CI run `26678024310`');
    expect(readinessReport).toContain(
      'commits `f004097`, `10353e7`, `3f92d56`, `90d403d`, and `82fd530`'
    );
    expect(readinessReport).toContain('passed Lint and Type Check, Unit Tests, and Build Check');
    expect(readinessReport).toContain('106 Jest suites / 1,725 tests');
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

  it('keeps the store listing pack submission-ready without placeholder review contacts', () => {
    const storeListing = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_STORE_LISTING.md'),
      'utf8'
    );

    expect(storeListing).toContain('reviewer@getryvro.com');
    expect(storeListing).toContain('support@getryvro.com');
    expect(storeListing).toContain('App Store Connect / Google Play review notes');
    expect(storeListing).toContain('App Store iPhone 6.7 inch: 3 screenshots at 1290 x 2796');
    expect(storeListing).toContain('App Store iPad Pro 12.9 inch: 3 screenshots at 2048 x 2732');
    expect(storeListing).toContain('Google Play phone: at least 2 screenshots at 1080 x 1920');
    expect(storeListing).toContain(
      'Universal Shift Builder template screen showing FIFO, healthcare, aviation, and rail options'
    );
    expect(storeListing).toContain('Ryvro Pro paywall screen showing the free-trial CTA');
    expect(storeListing).toContain(
      'Launch audience: FIFO crews, rotating shift workers, miners, healthcare teams, security'
    );
    expect(storeListing).toContain(
      'Ryvro helps FIFO crews, healthcare teams, security staff, emergency services'
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
  });

  it('keeps RevenueCat launch guidance free of retired Ellie entitlement aliases', () => {
    const externalSetup = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_EXTERNAL_SERVICE_SETUP.md'),
      'utf8'
    );

    expect(externalSetup).toContain('ryvro_pro_monthly');
    expect(externalSetup).toContain('ryvro_pro_annual');
    expect(externalSetup).toContain('Do not use RevenueCat `test_` API keys');
    expect(externalSetup).toContain('Do not configure retired Ellie entitlement IDs');
    expect(externalSetup).not.toContain('ellie_pro');
    expect(externalSetup).not.toContain('Ellie Shift Planner Pro');
    expect(externalSetup).not.toContain('Keep old entitlement aliases');
  });

  it('keeps legal, privacy, and support launch templates broad enough for universal schedules', () => {
    const privacySupport = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md'),
      'utf8'
    );

    expect(privacySupport).toContain(
      'Ryvro Shift Planner helps shift workers create, edit, and understand work schedules'
    );
    expect(privacySupport).toContain('AI builder prompts used to draft schedules');
    expect(privacySupport).toContain('Calendar Import And Export');
    expect(privacySupport).toContain('importing or exporting a calendar');
    expect(privacySupport).toContain('holiday exceptions');
    expect(privacySupport).toContain('reminders');
    expect(privacySupport).toContain('account deletion');
    expect(privacySupport).toContain('support@getryvro.com');
    expect(privacySupport).not.toMatch(/mine site|haul truck|underground miner/i);
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
      'Do not configure `ellieBrain` as the launch `RYVRO_BRAIN_URL`'
    );
    expect(externalSetup).toContain('Analytics property/report labels: Ryvro');
    expect(externalSetup).toContain(
      'Segment schedule setup dashboards by industry, template, and source'
    );
    expect(externalSetup).toContain(
      'Do not send raw ward, depot, plant, terminal, venue, rig, station, or site names into analytics dimensions'
    );
    expect(externalSetup).toContain('Profile shows `Ryvro Pro - Active`');
    expect(externalSetup).toContain('Do not configure retired Ellie entitlement IDs');
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

      expect(launchProof).not.toMatch(/underground miner|subterr[aâ]ne|haul truck|drill/i);
      expect(launchProof).not.toMatch(/site roster|roster site|low-signal sites/i);
      expect(launchProof).toMatch(/FIFO|shift|turno|santé|health|security|transport|equipes/i);
    }
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
      expect(onboarding.shiftBuilder?.inspector?.location).toBe(expected.location);

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
            details?: {
              regions?: string[];
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
    expect(onboarding.rosterType?.cards?.fifo?.details?.regions).toContain('Remote global sites');
    expect(onboarding.rosterType?.cards?.fifo?.details?.regions).not.toContain(
      'Remote global mining'
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
    expect(researchAutomationPrompt).toContain('closest Ryvro launch persona');
    expect(researchAutomationPrompt).not.toContain('closest Ryvro miner persona');
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
    expect(activeSource).not.toContain('EllieBrainService');
    expect(activeSource).not.toContain('ellieBrainService');
    expect(activeSource).not.toContain('isConfiguredEllieBrainUrl');
    expect(activeSource).not.toContain("'ellie_brain'");
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

    expect(builderScreen).toContain("t('builder.oneOffListSubtitle'");
    expect(dashboardScreen).toContain('QuickActionsBar');
    expect(dashboardScreen).toContain('dashboardQuickActions');
    expect(dashboardScreen).toContain('dashboard-quick-actions');
    expect(dashboardScreen).toContain('handleDashboardQuickActionPress');
    expect(dashboardScreen).toContain('quick_action_builder');
    expect(dashboardScreen).toContain('quick_action_export');
    expect(dashboardScreen).not.toContain('QuickActionsBar hidden');
    expect(dashboardScreen).not.toContain('actions not yet implemented');
    expect(shiftInspectorSheet).toContain('Work location (optional)');
    expect(shiftInspectorSheet).toContain('Work location name');
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
      shiftInspectorSheet,
    ].join('\n');

    expect(guardedCopy).not.toMatch(/mine site|haul truck|underground|Location \/ Site|site name/i);
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
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');

    expect(scheduleScreen).toContain("t('availableNow')");
    expect(statsScreen).toContain("t('availableNow')");
    expect(scheduleScreen).not.toMatch(/coming soon|placeholder|will provide/i);
    expect(statsScreen).not.toMatch(/coming soon|placeholder|will provide/i);

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
      ],
    };

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
