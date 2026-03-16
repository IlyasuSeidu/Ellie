import { parseCalendarDate, toCalendarDateString } from '../dateUtils';

describe('calendar date helpers', () => {
  it('parses YYYY-MM-DD as the same local calendar day', () => {
    const parsed = parseCalendarDate('2026-03-15');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(15);
  });

  it('keeps ISO datetime date prefix stable for calendar semantics', () => {
    expect(toCalendarDateString('2026-03-15T00:00:00.000+10:00')).toBe('2026-03-15');
    expect(toCalendarDateString('2026-03-15T23:59:59.999Z')).toBe('2026-03-15');
  });

  it('returns null for invalid calendar date strings', () => {
    expect(parseCalendarDate('not-a-date')).toBeNull();
    expect(toCalendarDateString('2026-02-31')).toBeNull();
  });
});
