import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(read(relativePath)) as T;
}

describe('Ryvro repository alignment', () => {
  it('keeps the current product concept in the main GitHub-facing docs', () => {
    const concept =
      'Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.';

    [
      'README.md',
      'RYVRO_RELEASE_TASKS.md',
      'docs/ARCHITECTURE.md',
      'docs/RYVRO_RELEASE_READINESS_REPORT.md',
    ].forEach((file) => {
      expect(read(file)).toContain(concept);
    });
  });

  it('keeps the native identity and store-console identity pinned', () => {
    const appConfig = read('app.config.js');
    const storeListing = read('docs/RYVRO_STORE_LISTING.md');

    expect(appConfig).toContain("name: 'Ryvro Shift Planner'");
    expect(appConfig).toContain("CFBundleDisplayName: 'Ryvro'");
    expect(appConfig).toContain("iosBundleIdentifier: 'com.ryvro.shiftplanner'");
    expect(appConfig).toContain("androidPackage: 'com.ryvro.shiftplanner'");

    expect(storeListing).toContain('App Store name: Ryvro Shift Planner');
    expect(storeListing).toContain('Google Play app name: Ryvro Shift Planner');
    expect(storeListing).toContain('Native display name: Ryvro');
    expect(storeListing).toContain('Bundle ID: `com.ryvro.shiftplanner`');
    expect(storeListing).toContain('Android package: `com.ryvro.shiftplanner`');
  });

  it('keeps Ryvro Pro product and entitlement IDs documented', () => {
    const docs = [
      read('README.md'),
      read('RYVRO_RELEASE_TASKS.md'),
      read('docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md'),
      read('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md'),
    ].join('\n');

    expect(docs).toContain('ryvro_pro_monthly');
    expect(docs).toContain('ryvro_pro_annual');
    expect(docs).toContain('pro');
  });

  it('keeps the current screenshot plan away from old dashboard and builder frames', () => {
    const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
    const storeListing = read('docs/RYVRO_STORE_LISTING.md');

    expect(screenshotChecklist).toContain('app-store-iphone-01-welcome.png');
    expect(screenshotChecklist).toContain('app-store-iphone-03-ask.png');
    expect(screenshotChecklist).toContain('google-play-phone-04-paywall.png');
    expect(storeListing).toContain(
      'Use the current Ryvro screens: Welcome, Setup, Ask, and Paywall'
    );

    expect(screenshotChecklist).not.toContain('template-start');
    expect(screenshotChecklist).not.toContain('dashboard-calendar');
    expect(screenshotChecklist).not.toContain('manual-builder');
  });

  it('keeps English-only and voice-first guardrails documented', () => {
    const readme = read('README.md');
    const architecture = read('docs/ARCHITECTURE.md');

    expect(readme).toContain('The active product is English-only');
    expect(readme).toContain('There is no chat composer, no typing box, and no bottom tab bar');
    expect(architecture).toContain('There is no main bottom tab bar in the current concept');
    expect(architecture).toContain('Do not add typing or chat UI to the main voice experience');
  });

  it('keeps release preflight scripts available', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>('package.json');

    expect(packageJson.scripts['release:check']).toContain('npm run release:store:check');
    expect(packageJson.scripts['release:check']).toContain('npm run release:owner:check');
    expect(packageJson.scripts['release:env:check']).toBe(
      'node scripts/verify-ryvro-production-env.js'
    );
    expect(packageJson.scripts['release:submit:check']).toBe(
      'node scripts/verify-ryvro-submit-readiness.js'
    );
  });

  it('passes the current store and owner handoff guards', () => {
    const store = spawnSync('npm', ['run', 'release:store:check'], {
      cwd: root,
      encoding: 'utf8',
    });
    const owner = spawnSync('npm', ['run', 'release:owner:check'], {
      cwd: root,
      encoding: 'utf8',
    });

    expect(store.status).toBe(0);
    expect(store.stdout).toContain('Ryvro store readiness check passed');
    expect(owner.status).toBe(0);
    expect(owner.stdout).toContain('Ryvro owner handoff check passed');
  });
});
