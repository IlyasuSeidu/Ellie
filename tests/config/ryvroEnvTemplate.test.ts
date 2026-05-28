import fs from 'fs';
import path from 'path';

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
});
