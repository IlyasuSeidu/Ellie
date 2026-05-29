import fs from 'fs';
import path from 'path';

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
      };
      android?: {
        package?: string;
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

  const iosInfoPlist = fs.readFileSync(path.join(process.cwd(), 'ios/Ellie/Info.plist'), 'utf8');
  const iosGoogleServicePlist = fs.readFileSync(
    path.join(process.cwd(), 'ios/Ellie/GoogleService-Info.plist'),
    'utf8'
  );
  const androidGoogleServices = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'android/app/google-services.json'), 'utf8')
  ) as {
    client?: Array<{
      client_info?: {
        android_client_info?: {
          package_name?: string;
        };
      };
    }>;
  };

  it('uses Ryvro defaults for public launch configuration', () => {
    expect(envExample).toContain('API_BASE_URL=https://api.getryvro.com');
    expect(envExample).toContain(
      'RYVRO_BRAIN_URL=https://us-central1-your-project-id.cloudfunctions.net/ryvroBrain'
    );
    expect(envExample).toContain('WAKE_WORD_PHRASE=Ryvro');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_ANDROID=ryvro_android.ppn');
    expect(envExample).toContain('WAKE_WORD_KEYWORD_PATHS_IOS=ryvro_ios.ppn');
    expect(envExample).toContain('OPENWAKEWORD_MODEL_PATH=');
  });

  it('pins tracked Expo identity to Ryvro launch values', () => {
    expect(appJson.expo?.name).toBe('Ryvro Shift Planner');
    expect(appJson.expo?.slug).toBe('ryvro');
    expect(appJson.expo?.scheme).toBe('ryvro');
    expect(appJson.expo?.ios?.bundleIdentifier).toBe('com.ryvro.shiftplanner');
    expect(appJson.expo?.android?.package).toBe('com.ryvro.shiftplanner');
  });

  it('pins native installed identity to Ryvro launch values', () => {
    expect(iosInfoPlist).toContain('<key>CFBundleDisplayName</key>');
    expect(iosInfoPlist).toContain('<string>Ryvro</string>');
    expect(iosInfoPlist).toContain('<string>ryvro</string>');
    expect(iosInfoPlist).toContain('<string>com.ryvro.shiftplanner</string>');
    expect(iosInfoPlist).not.toContain('<string>Ellie</string>');
    expect(iosInfoPlist).not.toContain('<string>Ellie Shift Planner</string>');
  });

  it('pins tracked Firebase mobile clients to the Ryvro bundle and package', () => {
    expect(iosGoogleServicePlist).toContain('<key>BUNDLE_ID</key>');
    expect(iosGoogleServicePlist).toContain('<string>com.ryvro.shiftplanner</string>');
    expect(iosGoogleServicePlist).not.toContain('com.ellie.minershiftassistant');
    expect(iosGoogleServicePlist).not.toContain('com.ilyasuseidu.ellie');

    const packageNames =
      androidGoogleServices.client?.map(
        (client) => client.client_info?.android_client_info?.package_name
      ) ?? [];

    expect(packageNames).toContain('com.ryvro.shiftplanner');
    expect(packageNames).not.toContain('com.ellie.minershiftassistant');
    expect(packageNames).not.toContain('com.ilyasuseidu.ellie');
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

  it('keeps the store listing pack submission-ready without placeholder review contacts', () => {
    const storeListing = fs.readFileSync(
      path.join(process.cwd(), 'docs/RYVRO_STORE_LISTING.md'),
      'utf8'
    );

    expect(storeListing).toContain('reviewer@getryvro.com');
    expect(storeListing).toContain('support@getryvro.com');
    expect(storeListing).toContain('App Store Connect / Google Play review notes');
    expect(storeListing).not.toContain('to be created');
    expect(storeListing).not.toContain('TBD');
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
    expect(activeSource).not.toContain('EllieBrainService');
    expect(activeSource).not.toContain('ellieBrainService');
    expect(activeSource).not.toContain('isConfiguredEllieBrainUrl');
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
});
