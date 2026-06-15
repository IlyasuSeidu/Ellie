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
  'oil_gas_offshore',
  'transport_logistics',
  'warehouse_logistics',
  'hospitality_retail',
  'aviation',
  'rail',
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
    ).toBeGreaterThanOrEqual(8);
    expect(UNIVERSAL_SHIFT_TEMPLATES.some((template) => template.id.startsWith('aviation-'))).toBe(
      true
    );
    expect(UNIVERSAL_SHIFT_TEMPLATES.some((template) => template.id.startsWith('rail-'))).toBe(
      true
    );
    expect(
      UNIVERSAL_SHIFT_TEMPLATES.some((template) => template.id.startsWith('oil-gas-offshore-'))
    ).toBe(true);
    expect(UNIVERSAL_SHIFT_TEMPLATES.some((template) => template.id.startsWith('warehouse-'))).toBe(
      true
    );
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
      expect(template.visual.label.trim().length).toBeGreaterThan(2);
      expect(template.visual.icon.trim().length).toBeGreaterThan(0);
      expect(template.visual.accentColor).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('keeps template copy free of internal launch-planning terms', () => {
    for (const template of UNIVERSAL_SHIFT_TEMPLATES) {
      const launchCopy = [template.title, template.subtitle, template.aiPromptExample].join('\n');

      expect(launchCopy).not.toMatch(/\blaunch[- ]?wedge\b|\bwedge\b|internal/i);
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

  it('keeps the mining FIFO launch template explicit without making site the default concept', () => {
    const miningFifoTemplate = UNIVERSAL_SHIFT_TEMPLATES.find(
      (template) => template.id === 'mining-fifo-14-14'
    );

    expect(miningFifoTemplate).toBeDefined();
    expect(miningFifoTemplate?.industry).toBe('mining_fifo');
    expect(miningFifoTemplate?.title).toContain('Mining FIFO');

    const launchCopy = [
      miningFifoTemplate?.title,
      miningFifoTemplate?.subtitle,
      miningFifoTemplate?.aiPromptExample,
    ].join('\n');

    expect(launchCopy).toContain('remote operations crews');
    expect(launchCopy).toContain('work location');
    expect(launchCopy).not.toMatch(/\bsite\b|mine site|mining site|site crews/i);
  });

  it('keeps completed E2E onboarding seeds compatible with the main app gate', () => {
    expect(Object.keys(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES)).toEqual(
      expect.arrayContaining([
        'healthcare',
        'security',
        'emergencyServices',
        'manufacturing',
        'offshore',
        'transport',
        'warehouseLogistics',
        'hospitality',
        'aviation',
        'rail',
        'miningFifo',
      ])
    );

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

  it('keeps E2E fixture personas broad enough for launch QA', () => {
    const fixtureCopy = Object.values(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES)
      .map((fixture) => [fixture.name, fixture.occupation, fixture.company].join(' '))
      .join('\n');

    for (const expectedPersona of [
      'Nurse',
      'Security Officer',
      'Firefighter',
      'Plant Operator',
      'Linehaul Driver',
      'Warehouse Lead',
      'Hotel Duty Manager',
      'Airport Operations Coordinator',
      'Offshore Technician',
      'FIFO Site Operator',
    ]) {
      expect(fixtureCopy).toContain(expectedPersona);
    }

    expect(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES.transport.occupation).toContain('Driver');
    expect(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES.emergencyServices.occupation).toBe('Firefighter');
    expect(UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES.offshore.universalSchedule.name).toContain(
      'Offshore'
    );
    expect(
      UNIVERSAL_INDUSTRY_ONBOARDING_FIXTURES.warehouseLogistics.universalSchedule.name
    ).toContain('Warehouse');
  });

  it('keeps the fresh onboarding E2E entry path on a non-mining launch fixture', () => {
    const onboardingE2E = fs.readFileSync(
      path.join(process.cwd(), 'e2e/onboarding.test.ts'),
      'utf8'
    );

    expect(onboardingE2E).toContain("submitIntroAnswer('Amina')");
    expect(onboardingE2E).toContain("submitIntroAnswer('Nurse')");
    expect(onboardingE2E).toContain('universal-shift-builder-screen');
    expect(onboardingE2E).toContain('universal-shift-builder-template-search');
    expect(onboardingE2E).not.toContain("submitIntroAnswer('Miner')");
    expect(onboardingE2E).not.toContain("submitIntroAnswer('FIFO");
  });

  it('gives every template visible color and icon choices for calendar/dashboard rendering', () => {
    for (const template of UNIVERSAL_SHIFT_TEMPLATES) {
      for (const definition of template.schedule.shiftDefinitions) {
        expect(definition.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(definition.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('ships industry visual badges for launch template cards', () => {
    const visualLabels = new Set(
      UNIVERSAL_SHIFT_TEMPLATES.map((template) => template.visual.label)
    );

    expect(Array.from(visualLabels)).toEqual(
      expect.arrayContaining([
        'Hospital',
        'Security Post',
        'Station',
        'Plant',
        'Rig',
        'Depot',
        'Warehouse',
        'Hotel',
        'Airport',
        'Rail',
        'Mine',
      ])
    );
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
    expect(builderScreen).toContain('templateSearchQuery');
    expect(builderScreen).toContain('filteredTemplates');
    expect(builderScreen).toContain('normalizeTemplateSearch');
    expect(builderScreen).toContain("t('builder.templateSearchPlaceholder')");
    expect(builderScreen).toContain("t('builder.templateEmptyTitle')");
    expect(builderScreen).toContain('template.visual.icon');
    expect(builderScreen).toContain('template.visual.accentColor');
    expect(builderScreen).toContain('template.visual.label');
    expect(builderScreen).not.toContain('Start from a template');
    expect(builderScreen).not.toContain('Pick a real shift-worker pattern');
    expect(builderScreen).toContain('shift_builder_template_applied');
  });

  it('keeps template search above the template cards in the builder flow', () => {
    const builderScreen = fs.readFileSync(
      path.join(process.cwd(), 'src/screens/main/UniversalShiftBuilderScreen.tsx'),
      'utf8'
    );

    const templateSearchIndex = builderScreen.indexOf('styles.templateSearchGroup');
    const templateScrollIndex = builderScreen.indexOf('styles.templateScroll');
    const shiftPaletteIndex = builderScreen.indexOf('<ShiftDefinitionPalette');

    expect(templateSearchIndex).toBeGreaterThan(-1);
    expect(templateScrollIndex).toBeGreaterThan(-1);
    expect(shiftPaletteIndex).toBeGreaterThan(-1);
    expect(templateSearchIndex).toBeLessThan(templateScrollIndex);
    expect(templateScrollIndex).toBeLessThan(shiftPaletteIndex);
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
      'holidayCountryPlaceholder',
      'holidayYearPlaceholder',
      'dateFormatPlaceholder',
      'calendarExportStartPlaceholder',
      'calendarExportEndPlaceholder',
    ]) {
      expect(builderScreen).toContain(`t('builder.${key}'`);
    }

    for (const retiredLiteral of [
      'Holiday exceptions',
      'One-off changes',
      'Calendar import/export',
      'Export this schedule as an .ics calendar',
      'Reason, e.g. swapped with Alex',
      'placeholder="US"',
      'placeholder="2026"',
      'placeholder="YYYY-MM-DD"',
      'placeholder="Start YYYY-MM-DD"',
      'placeholder="End YYYY-MM-DD"',
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
    const englishPlaceholders = {
      aiUnavailable: 'AI builder not available - build manually below',
      aiTitle: 'Build with AI',
      aiPromptPlaceholder: 'Describe your schedule... e.g. 4 days on, 4 nights, 4 off',
      fallbackTitle: 'Shift Builder',
      unsavedChanges: 'Unsaved changes',
      save: 'Save',
      aiPromptLabel: 'AI schedule description prompt',
      aiBuildLabel: 'Build schedule with AI',
      aiRetry: 'Retry',
      discardTitle: 'Discard changes?',
      discardMessage: 'You have unsaved changes to this schedule.',
      keepEditing: 'Keep editing',
      discard: 'Discard',
      cannotSave: 'Cannot save',
      fixIssues: 'Fix these issues:',
      reviewWarnings: 'Review warnings',
      review: 'Review',
      saveAnyway: 'Save anyway',
      saveFailed: 'Save failed',
      saveFailedMessage: 'Could not save your schedule. Please try again.',
      cancel: 'Cancel',
      followUpFailed: 'Follow-up failed',
      tryAgain: 'Please try again.',
      matchFrom: 'Match schedule from',
      matchFromHint:
        'Pick the real date you want Ryvro to line up with your rotation. Most people use today.',
      whatDayAreYouOn: 'What day are you on?',
      cycleDaySummary: 'On {{date}}, you are on day {{day}} of your cycle: {{label}}.',
      cycleDayNumberLabel: 'Cycle day number',
      dayNumber: 'Day {{day}}',
      closeDatePicker: 'Close date picker',
      matchDateSubtitle: 'Choose the date Ryvro should line up with your cycle',
      dateInputLabel: 'Date to match schedule from in YYYY-MM-DD format',
      invalidDateFormat: 'Use YYYY-MM-DD format, e.g. 2026-01-01.',
      invalidDate: 'Enter a real calendar date.',
      dateHelp: 'Use a date you can confidently match to one day in your rotation.',
      today: 'Today',
      current: 'Current',
      applyDate: 'Apply date',
      notSet: 'Not set',
      unknownShift: 'Unknown shift',
      goBack: 'Go back',
      saveAnywayQuestion: 'Save anyway?',
      holidayTitle: 'Holiday exceptions',
      holidayHint: 'Mark matching work shifts as holiday/off while preserving the original shift.',
      holidayDetailsTitle: 'Check holiday details',
      holidayCountryYearError: 'Use a two-letter country code and a four-digit year.',
      noHolidaysTitle: 'No public holidays found',
      holidayCountryA11y: 'Holiday country code',
      noHolidaysMessage:
        'No public holiday data is available for that country/year yet. You can add a holiday exception manually below.',
      holidayImportFailedTitle: 'Holiday import failed',
      holidayImportFailedMessage: 'Try again, or add the holiday manually.',
      holidayManualError: 'Add a holiday name, YYYY-MM-DD date, and two-letter country code.',
      holidayYearA11y: 'Holiday year',
      holidayImportA11y: 'Import public holidays',
      import: 'Import',
      holidayNamePlaceholder: 'Holiday name',
      holidayNameA11y: 'Holiday exception name',
      holidayDateA11y: 'Holiday exception date',
      holidayAddA11y: 'Add holiday exception',
      holidayListSubtitle: '{{date}} • {{country}} • mark work shift off',
      removeHolidayA11y: 'Remove {{holiday}}',
      oneOffTitle: 'One-off changes',
      oneOffHint: 'Change one specific day without changing the repeating schedule.',
      oneOffDetailsTitle: 'Check one-off change',
      oneOffDateError: 'Use a YYYY-MM-DD date.',
      oneOffShiftTypeTitle: 'Choose a shift type',
      oneOffShiftTypeError: 'Pick the shift this one day should become.',
      oneOffSwapToLabel: 'Swap to {{shift}}',
      oneOffShiftSwapLabel: 'One-off shift swap',
      oneOffOffDayLabel: 'One-off off day',
      swapShift: 'Swap shift',
      makeOff: 'Make off',
      oneOffDateA11y: 'One-off change date',
      oneOffReasonPlaceholder: 'Reason, e.g. swapped with Alex',
      oneOffReasonA11y: 'Reason for one-off change',
      oneOffAddA11y: 'Add one-off change',
      oneOffListSubtitle: '{{date}} • Changed just this day{{reason}}',
      makeThisDayShift: 'Make this day {{shift}}',
      selectedShift: 'selected shift',
      makeThisDayOff: 'Make this day off',
      shift: 'shift',
      removeOneOffA11y: 'Remove one-off change',
      calendarTitle: 'Calendar import/export',
      calendarHint:
        'Export this schedule as an .ics calendar with shift times, locations, and notes, or import roster events as one-off shift changes.',
      calendarExportBlockedTitle: 'Calendar export blocked',
      calendarExportDatesTitle: 'Check export dates',
      calendarExportDatesError: 'Use a valid YYYY-MM-DD start date and end date.',
      calendarExportFailedTitle: 'Calendar export failed',
      calendarExportFailedMessage: 'The calendar file could not be created.',
      calendarImportNotesTitle: 'Calendar import finished with notes',
      calendarImportFailedTitle: 'Calendar import failed',
      calendarImportFailedMessage: 'The selected calendar file could not be imported.',
      calendarExportStartA11y: 'Calendar export start date',
      calendarExportEndA11y: 'Calendar export end date',
      calendarIncludeOffA11y: 'Include off days in exported calendar',
      calendarIncludeOff: 'Include off, leave, and rest days',
      calendarExportA11y: 'Export shift calendar',
      calendarExport: 'Export calendar',
      calendarImportA11y: 'Import roster calendar',
      calendarImport: 'Import roster',
      defaultScheduleName: 'My Schedule',
      aiGenericError: 'Something went wrong. Please try again.',
      aiRetryA11y: 'Retry AI',
      useTodayA11y: 'Use today as the date to match from',
      restoreCurrentDateA11y: 'Restore current match date',
      sequenceDayTitle: 'Day {{day}}',
      sequenceLabelSubtitle: '{{label}} label',
      sequenceItem: 'Sequence item',
      closeSequenceEditorA11y: 'Close sequence item editor',
      customDayLabel: 'Custom day label',
      customDayLabelA11y: 'Custom label for this sequence day',
      customDayLabelHelp: 'Leave blank to use the reusable shift type name.',
      clearCustomDayLabelA11y: 'Clear custom day label',
      clearLabel: 'Clear label',
      saveCustomDayLabelA11y: 'Save custom day label',
      saveLabel: 'Save label',
      scheduleName: 'Schedule Name',
      scheduleNameA11y: 'Schedule name',
      saveScheduleA11y: 'Save schedule',
      saveSchedule: 'Save schedule',
    };
    const requiredKeys = [
      'templateTitle',
      'templateHint',
      'templateReplaceTitle',
      'templateReplaceMessage',
      'templateUseButton',
      'useTemplateA11y',
      'templateCycleLength',
      'templateSearchPlaceholder',
      'templateSearchA11y',
      'templateEmptyTitle',
      'templateEmptyHint',
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
      'holidayCountryPlaceholder',
      'holidayYearA11y',
      'holidayYearPlaceholder',
      'holidayImportA11y',
      'import',
      'holidayNamePlaceholder',
      'holidayNameA11y',
      'holidayDateA11y',
      'dateFormatPlaceholder',
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
      'calendarExportStartPlaceholder',
      'calendarExportEndPlaceholder',
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

      if (locale !== 'en') {
        for (const [key, englishValue] of Object.entries(englishPlaceholders)) {
          expect(schedule.builder?.[key]).not.toBe(englishValue);
        }
      }
    }
  });
});
