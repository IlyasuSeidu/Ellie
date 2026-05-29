import fs from 'fs';
import path from 'path';
import {
  UNIVERSAL_SHIFT_TEMPLATES,
  type UniversalShiftTemplateIndustry,
} from '@/constants/universalShiftTemplates';
import { validateUniversalSchedule } from '@/utils/universalShiftUtils';

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

  it('localizes the template library copy in every schedule locale', () => {
    const localeRoot = path.join(process.cwd(), 'src/i18n/locales');
    const requiredKeys = [
      'templateTitle',
      'templateHint',
      'templateReplaceTitle',
      'templateReplaceMessage',
      'templateUseButton',
      'useTemplateA11y',
      'templateCycleLength',
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
