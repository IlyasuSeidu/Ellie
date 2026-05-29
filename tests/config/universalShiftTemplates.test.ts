import fs from 'fs';
import path from 'path';
import {
  UNIVERSAL_SHIFT_TEMPLATES,
  type UniversalShiftTemplateIndustry,
} from '@/constants/universalShiftTemplates';
import { validateUniversalSchedule } from '@/utils/universalShiftUtils';
import {
  MAIN_APP_SEED,
  MINING_FIFO_MAIN_APP_SEED,
  NON_MINING_PROOF_MAIN_APP_SEED,
  UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES,
} from '../../e2e/helpers/testData';
import type { UniversalShiftSchedule } from '@/types';

const REQUIRED_INDUSTRIES: UniversalShiftTemplateIndustry[] = [
  'healthcare',
  'security',
  'emergency_services',
  'manufacturing',
  'transport_logistics',
  'hospitality_retail',
  'aviation_rail',
  'mining_fifo',
];

function expectCompleteUniversalSchedule(schedule: UniversalShiftSchedule): void {
  expect(schedule.name.trim()).toBeTruthy();
  expect(schedule.anchorDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(schedule.sequence.length).toBeGreaterThan(0);
  expect(schedule.shiftDefinitions.length).toBeGreaterThan(0);
}

describe('Universal shift templates', () => {
  it('ships launch templates for mining plus broad non-mining shift-worker industries', () => {
    const industries = new Set(UNIVERSAL_SHIFT_TEMPLATES.map((template) => template.industry));

    for (const industry of REQUIRED_INDUSTRIES) {
      expect(industries.has(industry)).toBe(true);
    }

    expect(UNIVERSAL_SHIFT_TEMPLATES.length).toBeGreaterThanOrEqual(REQUIRED_INDUSTRIES.length);
    expect(
      UNIVERSAL_SHIFT_TEMPLATES.filter((template) => template.industry !== 'mining_fifo').length
    ).toBeGreaterThanOrEqual(7);
  });

  it('keeps every template usable as a valid Universal Shift Builder schedule', () => {
    for (const template of UNIVERSAL_SHIFT_TEMPLATES) {
      const validation = validateUniversalSchedule(template.schedule);

      expect(validation.errors).toEqual([]);
      expect(validation.valid).toBe(true);
      expect(template.schedule.source).toBe('template');
      expect(template.schedule.shiftDefinitions.length).toBeGreaterThan(0);
      expect(template.schedule.sequence.length).toBeGreaterThan(0);
      expect(template.aiPromptExample.trim().length).toBeGreaterThan(20);
    }
  });

  it('keeps non-mining template copy from inheriting mining or site-specific language', () => {
    for (const template of UNIVERSAL_SHIFT_TEMPLATES.filter(
      (candidate) => candidate.industry !== 'mining_fifo'
    )) {
      const launchCopy = [template.title, template.subtitle, template.aiPromptExample].join('\n');

      expect(launchCopy).not.toMatch(/\bsite\b|mine|mining|FIFO|fly-in|fly-out/i);
    }
  });

  it('keeps completed E2E onboarding seeds compatible with the main app gate', () => {
    const completedSeeds = [
      MAIN_APP_SEED,
      MINING_FIFO_MAIN_APP_SEED,
      NON_MINING_PROOF_MAIN_APP_SEED,
    ];

    for (const seed of completedSeeds) {
      expect(seed['onboarding:complete']).toBe(true);
      const onboardingData = seed['onboarding:data'] as {
        universalSchedule?: UniversalShiftSchedule;
      };
      expect(onboardingData.universalSchedule).toBeDefined();
      expectCompleteUniversalSchedule(onboardingData.universalSchedule as UniversalShiftSchedule);
    }

    for (const fixture of Object.values(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES)) {
      expectCompleteUniversalSchedule(fixture.universalSchedule);
    }
  });

  it('gives every template visible color and icon choices for calendar/dashboard rendering', () => {
    for (const template of UNIVERSAL_SHIFT_TEMPLATES) {
      for (const definition of template.schedule.shiftDefinitions) {
        expect(definition.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(definition.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes the template library from the Universal Builder screen', () => {
    const builderScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/UniversalShiftBuilderScreen.tsx'),
      'utf8'
    );

    expect(builderScreen).toContain("from '@/constants/universalShiftTemplates'");
    expect(builderScreen).toContain('renderTemplateSection');
    expect(builderScreen).toContain("t('builder.templateTitle')");
    expect(builderScreen).toContain("t('builder.templateHint')");
    expect(builderScreen).toContain("t('builder.templateCycleLength'");
    expect(builderScreen).not.toContain('Start from a template');
    expect(builderScreen).not.toContain('Pick a real shift-worker pattern');
    expect(builderScreen).toContain('shift_builder_template_applied');
  });

  it('localizes launch-critical exception and calendar builder sections', () => {
    const builderScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/UniversalShiftBuilderScreen.tsx'),
      'utf8'
    );

    for (const key of [
      'holidayTitle',
      'holidayHint',
      'oneOffTitle',
      'oneOffHint',
      'calendarTitle',
      'calendarHint',
      'calendarExport',
      'calendarImport',
    ]) {
      expect(builderScreen).toContain(`t('builder.${key}'`);
    }

    for (const retiredLiteral of [
      'Holiday exceptions',
      'One-off changes',
      'Calendar import/export',
      'Export this schedule as an .ics calendar',
      'Reason, e.g. swapped with Alex',
    ]) {
      expect(builderScreen).not.toContain(retiredLiteral);
    }
  });

  it('localizes high-traffic schedule naming and sequence editor copy', () => {
    const builderScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/UniversalShiftBuilderScreen.tsx'),
      'utf8'
    );

    for (const key of [
      'defaultScheduleName',
      'aiGenericError',
      'aiRetryA11y',
      'useTodayA11y',
      'restoreCurrentDateA11y',
      'sequenceDayTitle',
      'sequenceLabelSubtitle',
      'customDayLabelHelp',
      'scheduleName',
      'saveSchedule',
    ]) {
      expect(builderScreen).toContain(`t('builder.${key}'`);
    }

    for (const retiredLiteral of [
      'Something went wrong. Please try again.',
      'Schedule Name',
      'Save schedule',
      'Custom day label',
      'Leave blank to use the reusable shift type name.',
      'Close sequence item editor',
    ]) {
      expect(builderScreen).not.toContain(retiredLiteral);
    }
  });

  it('localizes launch-critical builder copy in every schedule locale', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const requiredKeys = [
      'templateTitle',
      'templateHint',
      'templateReplaceTitle',
      'templateReplaceMessage',
      'templateUseButton',
      'useTemplateA11y',
      'templateCycleLength',
      'holidayTitle',
      'holidayHint',
      'holidayDetailsTitle',
      'holidayCountryYearError',
      'noHolidaysTitle',
      'noHolidaysMessage',
      'holidayImportFailedTitle',
      'holidayImportFailedMessage',
      'holidayManualError',
      'holidayCountryA11y',
      'holidayYearA11y',
      'holidayImportA11y',
      'import',
      'holidayNamePlaceholder',
      'holidayNameA11y',
      'holidayDateA11y',
      'holidayAddA11y',
      'holidayListSubtitle',
      'removeHolidayA11y',
      'oneOffTitle',
      'oneOffHint',
      'oneOffDetailsTitle',
      'oneOffDateError',
      'oneOffShiftTypeTitle',
      'oneOffShiftTypeError',
      'oneOffSwapToLabel',
      'oneOffShiftSwapLabel',
      'oneOffOffDayLabel',
      'swapShift',
      'makeOff',
      'oneOffDateA11y',
      'oneOffReasonPlaceholder',
      'oneOffReasonA11y',
      'oneOffAddA11y',
      'makeThisDayShift',
      'selectedShift',
      'makeThisDayOff',
      'shift',
      'removeOneOffA11y',
      'calendarTitle',
      'calendarHint',
      'calendarExportBlockedTitle',
      'calendarExportDatesTitle',
      'calendarExportDatesError',
      'calendarExportFailedTitle',
      'calendarExportFailedMessage',
      'calendarImportNotesTitle',
      'calendarImportFailedTitle',
      'calendarImportFailedMessage',
      'calendarExportStartA11y',
      'calendarExportEndA11y',
      'calendarIncludeOffA11y',
      'calendarIncludeOff',
      'calendarExportA11y',
      'calendarExport',
      'calendarImportA11y',
      'calendarImport',
      'defaultScheduleName',
      'aiGenericError',
      'aiRetryA11y',
      'useTodayA11y',
      'restoreCurrentDateA11y',
      'sequenceDayTitle',
      'sequenceLabelSubtitle',
      'sequenceItem',
      'closeSequenceEditorA11y',
      'customDayLabel',
      'customDayLabelA11y',
      'customDayLabelHelp',
      'clearCustomDayLabelA11y',
      'clearLabel',
      'saveCustomDayLabelA11y',
      'saveLabel',
      'scheduleName',
      'scheduleNameA11y',
      'saveScheduleA11y',
      'saveSchedule',
    ];

    for (const locale of fs.readdirSync(localeRoot)) {
      const schedulePath = path.join(localeRoot, locale, 'schedule.json');
      if (!fs.existsSync(schedulePath)) continue;

      const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8')) as {
        builder?: Record<string, string>;
      };

      for (const key of requiredKeys) {
        expect(schedule.builder?.[key]?.trim()).toBeTruthy();
      }
    }
  });
});
