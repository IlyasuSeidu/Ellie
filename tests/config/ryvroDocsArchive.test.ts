import fs from 'fs';
import path from 'path';

const root = process.cwd();
const exists = (relativePath: string): boolean => fs.existsSync(path.join(root, relativePath));
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');
const walkFiles = (relativeDir: string): string[] => {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(relativePath);
    }
    return [relativePath];
  });
};

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
    'DUAL_PARADIGM_ROSTER_IMPLEMENTATION_PLAN.md',
    'FIFO_ONBOARDING_FLOW_ANALYSIS.md',
    'ANALYTICS_INTELLIGENCE_UI_CLAUDE_CODE_PROMPT.md',
    'FIFO_CALENDAR_VISUALIZATION_PLAN.md',
    'I18N_GAP_CLOSURE_EXECUTION_PLAN.md',
    'I18N_IMPLEMENTATION_PLAN.md',
    'I18N_PHASE1_EXECUTION_TASKS.md',
    'I18N_RUNTIME_LANGUAGE_POLISH_EXECUTION_PLAN.md',
    'OFFLINE_FIRST_SYSTEM.md',
    'ONBOARDING_PHYSICAL_DEVICE_TEST_RUNBOOK.md',
    'PROFILE_SCREEN_PLAN.md',
    'ellie-auth.md',
    'ellie-sleep-tracking.md',
    'ellie-smart-shift-reminders.md',
    'ellie_Paywall_&_Subscription_Plan Tasks.md',
  ];

  const retiredDocs = [
    'ADDING_SHIFT_PATTERNS.md',
    'FIFO_QA_CHECKLIST.md',
    'RELEASE_NOTES_FIFO_DUAL_ROSTER.md',
    'dashboard-implementation-plan.md',
    'personalized-header-redesign-plan.md',
    'profile-shift-settings-plan.md',
  ];

  const retiredDesignPrototypes = [
    'design-prototypes/homescreen/index.html',
    'design-prototypes/homescreen-redesign/index.html',
  ];

  it('keeps retired Ellie launch docs out of the repository root', () => {
    for (const doc of retiredRootDocs) {
      expect(exists(doc)).toBe(false);
      expect(exists(path.join('docs/archive/legacy-ellie', doc))).toBe(true);
    }
  });

  it('keeps retired fixed-roster docs out of active docs', () => {
    for (const doc of retiredDocs) {
      expect(exists(path.join('docs', doc))).toBe(false);
      expect(exists(path.join('docs/archive/legacy-ellie', doc))).toBe(true);
    }
  });

  it('keeps retired Ellie design prototypes out of active design folders', () => {
    for (const prototype of retiredDesignPrototypes) {
      expect(
        exists(path.join('design/prototypes', prototype.replace('design-prototypes/', '')))
      ).toBe(false);
      expect(exists(path.join('docs/archive/legacy-ellie', prototype))).toBe(true);
    }
  });

  it('labels archived Ellie docs as historical instead of current launch guidance', () => {
    const archiveReadme = read('docs/archive/legacy-ellie/README.md');

    expect(archiveReadme).toContain('Historical Ellie Documentation Archive');
    expect(archiveReadme).toContain('Do not use these files as current launch guidance');
    expect(archiveReadme).toContain('pre-Universal-Shift-Builder FIFO');
    expect(archiveReadme).toContain('physical-device runbook plans');
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

  it('keeps the active rebrand audit aligned with completed Ryvro asset replacement', () => {
    const audit = read('SHIFT_WORKER_APP_REBRAND_AUDIT.md');

    expect(audit).toContain('Implementation Status: 2026-05-29');
    expect(audit).toContain('Current tracked app icon, adaptive icon, splash icon, favicon');
    expect(audit).toContain('The retired onboarding mining helmet asset family has been removed');
    expect(audit).not.toContain('Current asset family includes `mining-helmet-sacred-flame`');
    expect(audit).not.toContain(
      'replace `assets/onboarding/icons/consolidated/mining-helmet-sacred-flame.png`'
    );
  });

  it('keeps retired mining-specific default examples out of active launch surfaces', () => {
    const activeFiles = [
      'README.md',
      'assets/onboarding/icons/source/README.md',
      'e2e/helpers/testData.ts',
      ...walkFiles('src/i18n/locales'),
    ];

    for (const file of activeFiles) {
      const content = read(file);
      expect(content).not.toContain('Test Mine Co.');
      expect(content).not.toContain('mining-helmet-sacred-flame');
      expect(content).not.toContain('helmet.png');
      expect(content).not.toContain('haul truck');
      expect(content).not.toContain('Hey Ellie');
    }
  });
});
