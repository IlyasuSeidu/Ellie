import { parseCalendarDate, toCalendarDateString } from '../dateUtils';

describe('calendar date helpers', () => {
  it('parses YYYY-MM-DD as the same local calendar day', () => {
    const parsed = parseCalendarDate('2026-03-15');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(2);
    expect(parsed?.getDate()).toBe(15);
  });

  it('keeps Date -> ISO string roundtrip on the same local calendar day', () => {
    const localCalendarDate = new Date(2026, 2, 15);
    const isoTimestamp = localCalendarDate.toISOString();
    expect(toCalendarDateString(isoTimestamp)).toBe(toCalendarDateString(localCalendarDate));
  });

  it('returns null for invalid calendar date strings', () => {
    expect(parseCalendarDate('not-a-date')).toBeNull();
    expect(toCalendarDateString('2026-02-31')).toBeNull();
  });
});
