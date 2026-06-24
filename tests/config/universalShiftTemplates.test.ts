import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SHIFT_TEMPLATES } from '@/constants/universalShiftTemplates';
import { validateUniversalSchedule } from '@/utils/universalShiftUtils';

const root = process.cwd();

describe('Universal shift template data', () => {
  it('keeps template schedules valid for the underlying schedule engine', () => {
    expect(UNIVERSAL_SHIFT_TEMPLATES.length).toBeGreaterThan(0);

    for (const template of UNIVERSAL_SHIFT_TEMPLATES) {
      const validation = validateUniversalSchedule(template.schedule);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(template.schedule.shiftDefinitions.length).toBeGreaterThan(0);
      expect(template.schedule.sequence.length).toBeGreaterThan(0);
    }
  });

  it('keeps broad shift-worker examples available as data, not as the main UI concept', () => {
    const industries = new Set(UNIVERSAL_SHIFT_TEMPLATES.map((template) => template.industry));

    expect(industries.has('healthcare')).toBe(true);
    expect(industries.has('security')).toBe(true);
    expect(industries.has('transport_logistics')).toBe(true);
    expect(industries.has('hospitality_retail')).toBe(true);
    expect(industries.has('mining_fifo')).toBe(true);
  });

  it('does not restore the old Universal Shift Builder screen as an active main screen', () => {
    expect(fs.existsSync(path.join(root, 'src/screens/main/UniversalShiftBuilderScreen.tsx'))).toBe(
      false
    );
  });
});
