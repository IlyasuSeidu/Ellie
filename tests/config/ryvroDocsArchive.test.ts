import fs from 'fs';
import path from 'path';

const root = process.cwd();
const exists = (relativePath: string): boolean => fs.existsSync(path.join(root, relativePath));
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Ryvro documentation archive', () => {
  const retiredRootDocs = [
    'ELLIE_ANALYTICS_AI_INTELLIGENCE_STRATEGY.md',
    'ELLIE_APP_MINIMUM_VIABLE_DEPLOYMENT_PLAN.md',
    'ELLIE_AUTH_IMPLEMENTATION_TASKS.md',
    'ELLIE_AUTH_QA_REPORT_REAL_SIGNED_BUILDS_RECOVERED.md',
    'ELLIE_DEPLOYMENT_GUIDE_RECOVERED.md',
    'ELLIE_NARROWING_AUDIT.md',
    'ELLIE_SHIFT_CERTAINTY_MASTERPLAN.md',
    'ELLIE_SHIFT_CERTAINTY_MASTERPLAN_Tasks.md',
    'ELLIE_TESTING_STRATEGY_RECOVERED.md',
    'ellie-auth.md',
    'ellie-sleep-tracking.md',
    'ellie-smart-shift-reminders.md',
    'ellie_Paywall_&_Subscription_Plan Tasks.md',
  ];

  it('keeps retired Ellie launch docs out of the repository root', () => {
    for (const doc of retiredRootDocs) {
      expect(exists(doc)).toBe(false);
      expect(exists(path.join('docs/archive/legacy-ellie', doc))).toBe(true);
    }
  });

  it('labels archived Ellie docs as historical instead of current launch guidance', () => {
    const archiveReadme = read('docs/archive/legacy-ellie/README.md');

    expect(archiveReadme).toContain('Historical Ellie Documentation Archive');
    expect(archiveReadme).toContain('Do not use these files as current launch guidance');
    expect(archiveReadme).toContain('docs/UNIVERSAL_SHIFT_BUILDER_SPEC.md');
    expect(archiveReadme).toContain('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
  });

  it('describes the current setup path as the Universal Shift Builder', () => {
    const readme = read('README.md');

    expect(readme).toContain('Universal Shift Builder');
    expect(readme).toContain('AI/template/manual builder');
    expect(readme).not.toContain('Phase Selector');
    expect(readme).not.toContain('Onboarding Screens');
    expect(readme).not.toContain('Pattern Selection');
  });
});
