/**
 * Tests for Offline Fallback Handler
 *
 * Verifies that tryOfflineFallback correctly pattern-matches common shift
 * queries and returns the appropriate offline responses.
 */

import { tryOfflineFallback } from '@/utils/offlineFallback';
import { ShiftPattern, ShiftSystem, ShiftCycle } from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * 4-4-4 two-shift cycle starting 2024-01-01.
 *
 * Cycle length = 12 days:
 *   positions 0-3  -> day shift
 *   positions 4-7  -> night shift
 *   positions 8-11 -> off
 *
 * Concrete calendar mapping (cycle repeats every 12 days):
 *   Jan  1-4  : day      Jan 13-16 : day      Jan 25-28 : day
 *   Jan  5-8  : night    Jan 17-20 : night    Jan 29-31 : night (+ Feb 1)
 *   Jan  9-12 : off      Jan 21-24 : off      Feb  2-5  : off
 */
const shiftCycle: ShiftCycle = {
  patternType: ShiftPattern.STANDARD_4_4_4,
  shiftSystem: ShiftSystem.TWO_SHIFT,
  daysOn: 4,
  nightsOn: 4,
  daysOff: 4,
  startDate: '2024-01-01',
  phaseOffset: 0,
};

const userName = 'Alex';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set the fake system clock to midnight local time on the given YYYY-MM-DD date.
 */
function setFakeDate(dateStr: string): void {
  // Create a Date at midnight local time for the given date string
  const [year, month, day] = dateStr.split('-').map(Number);
  const fakeNow = new Date(year, month - 1, day, 0, 0, 0, 0);
  jest.setSystemTime(fakeNow);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── 1. Today's shift queries ──────────────────────────────────────────────

describe('tryOfflineFallback', () => {
  describe("today's shift queries", () => {
    it('should handle "What shift do I have today?" on a day-shift day', () => {
      // Jan 2 2024 -> position 1 -> day shift
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback('What shift do I have today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('day');
      expect(result.text).toContain('shift');
      expect(result.text).toContain('today');
      expect(result.text).toContain(userName);
      expect(result.toolName).toBe('get_current_status');
    });

    it('should handle "What shift do I have today?" on a night-shift day', () => {
      // Jan 6 2024 -> position 5 -> night shift
      setFakeDate('2024-01-06');

      const result = tryOfflineFallback('What shift do I have today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('night');
      expect(result.text).toContain('shift');
      expect(result.text).toContain('today');
      expect(result.text).toContain(userName);
    });

    it('should handle "What shift do I have today?" on a day off', () => {
      // Jan 10 2024 -> position 9 -> off
      setFakeDate('2024-01-10');

      const result = tryOfflineFallback('What shift do I have today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('day off');
      expect(result.text).toContain(userName);
    });

    it('should handle "What\'s my shift tonight?"', () => {
      // Jan 5 2024 -> position 4 -> night shift
      setFakeDate('2024-01-05');

      const result = tryOfflineFallback("What's my shift tonight?", shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.toolName).toBe('get_current_status');
    });

    it('should handle "my work schedule today"', () => {
      setFakeDate('2024-01-03');

      const result = tryOfflineFallback('my work schedule today', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.toolName).toBe('get_current_status');
    });
  });

  // ── 2. Tomorrow's shift queries ───────────────────────────────────────────

  describe("tomorrow's shift queries", () => {
    it('should handle "What shift do I have tomorrow?" when tomorrow is a work day', () => {
      // Today = Jan 4 2024 -> tomorrow Jan 5 -> position 4 -> night shift
      setFakeDate('2024-01-04');

      const result = tryOfflineFallback(
        'What shift do I have tomorrow?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Tomorrow');
      expect(result.text).toContain('night');
      expect(result.text).toContain('shift');
      expect(result.toolName).toBe('get_shift_for_date');
    });

    it('should handle "What shift do I have tomorrow?" when tomorrow is a day off', () => {
      // Today = Jan 8 2024 -> tomorrow Jan 9 -> position 8 -> off
      setFakeDate('2024-01-08');

      const result = tryOfflineFallback(
        'What shift do I have tomorrow?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Tomorrow');
      expect(result.text).toContain('day off');
      expect(result.toolName).toBe('get_shift_for_date');
    });

    it('should handle "tomorrow work schedule"', () => {
      setFakeDate('2024-01-01');

      const result = tryOfflineFallback('tomorrow work schedule', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Tomorrow');
      expect(result.toolName).toBe('get_shift_for_date');
    });

    it('should include the formatted date string in tomorrow responses', () => {
      // Today = Jan 12 -> tomorrow Jan 13 (Saturday) -> position 0 in 2nd cycle -> day shift
      setFakeDate('2024-01-12');

      const result = tryOfflineFallback(
        'What shift do I have tomorrow?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      // dayjs formats as "Saturday, January 13"
      expect(result.text).toContain('Saturday');
      expect(result.text).toContain('January 13');
    });
  });

  // ── 3. Am I working queries ─────────────────────────────────────────────

  describe('"Am I working" queries', () => {
    it('should handle "Am I working today?" when working', () => {
      // Jan 1 2024 -> position 0 -> day shift
      setFakeDate('2024-01-01');

      const result = tryOfflineFallback('Am I working today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toMatch(/yes/i);
      expect(result.text).toContain('day');
      expect(result.text).toContain('shift');
      expect(result.toolName).toBe('get_current_status');
    });

    it('should handle "Am I working today?" when not working', () => {
      // Jan 11 2024 -> position 10 -> off
      setFakeDate('2024-01-11');

      const result = tryOfflineFallback('Am I working today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toMatch(/no/i);
      expect(result.text).toContain('day off');
      expect(result.toolName).toBe('get_current_status');
    });

    it('should handle "Do I work today?" when on night shift', () => {
      // Jan 7 2024 -> position 6 -> night shift
      setFakeDate('2024-01-07');

      const result = tryOfflineFallback('Do I work today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toMatch(/yes/i);
      expect(result.text).toContain('night');
      expect(result.text).toContain('shift');
    });

    it('should handle "am i on today?"', () => {
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback('am i on today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.toolName).toBe('get_current_status');
    });
  });

  // ── 4. Next day off queries ─────────────────────────────────────────────

  describe('next day off queries', () => {
    it('should handle "When is my next day off?" when currently on day shift', () => {
      // Jan 2 2024 -> position 1 -> day shift
      // Next off day searching from Jan 2: Jan 9 (position 8 -> off)
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback(
        'When is my next day off?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.text).toContain('next day off');
      expect(result.toolName).toBe('get_next_occurrence');
    });

    it('should handle "next rest day"', () => {
      setFakeDate('2024-01-05');

      const result = tryOfflineFallback('next rest day', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next day off');
      expect(result.toolName).toBe('get_next_occurrence');
    });

    it('should handle "next free day"', () => {
      setFakeDate('2024-01-05');

      const result = tryOfflineFallback('next free day', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next day off');
      expect(result.toolName).toBe('get_next_occurrence');
    });

    it('should include a formatted date in the response', () => {
      // Jan 7 -> next off = Jan 9 (Tuesday)
      setFakeDate('2024-01-07');

      const result = tryOfflineFallback(
        'When is my next day off?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      // dayjs formats: "Tuesday, January 9"
      expect(result.text).toContain('Tuesday');
      expect(result.text).toContain('January 9');
    });

    it('should find the next day off even when currently on a day off', () => {
      // Jan 9 -> off, but getNextOccurrence searches from the day *after*
      // so it should find Jan 10 (also off).
      setFakeDate('2024-01-09');

      const result = tryOfflineFallback(
        'When is my next day off?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.toolName).toBe('get_next_occurrence');
    });
  });

  // ── 5. Next night shift queries ─────────────────────────────────────────

  describe('next night shift queries', () => {
    it('should handle "When is my next night shift?"', () => {
      // Jan 3 -> position 2 -> day shift
      // Next night searching from Jan 3: Jan 5 (position 4 -> night)
      setFakeDate('2024-01-03');

      const result = tryOfflineFallback(
        'When is my next night shift?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next night shift');
      // Jan 5 2024 is a Friday
      expect(result.text).toContain('Friday');
      expect(result.text).toContain('January 5');
      expect(result.toolName).toBe('get_next_occurrence');
    });

    it('should handle "next night"', () => {
      setFakeDate('2024-01-10');

      const result = tryOfflineFallback('next night', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next night shift');
      expect(result.toolName).toBe('get_next_occurrence');
    });

    it('should handle "next night shift" with a formatted date', () => {
      // Jan 12 (off) -> next night = Jan 17 (Wednesday, position 4 in 2nd cycle)
      setFakeDate('2024-01-12');

      const result = tryOfflineFallback('next night shift', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Wednesday');
      expect(result.text).toContain('January 17');
    });

    it('should handle "next nightshift" (no space)', () => {
      setFakeDate('2024-01-01');

      // The regex is /\bnight\s*(shift)?\b/ so "nightshift" should match
      const result = tryOfflineFallback('next nightshift', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next night shift');
    });
  });

  // ── 6. Unhandled queries ────────────────────────────────────────────────

  describe('unhandled queries', () => {
    beforeEach(() => {
      setFakeDate('2024-01-05');
    });

    it('should not handle "What shifts next week?"', () => {
      const result = tryOfflineFallback('What shifts next week?', shiftCycle, userName);

      expect(result.handled).toBe(false);
      expect(result.text).toBeUndefined();
      expect(result.toolName).toBeUndefined();
    });

    it('should not handle "How many night shifts this month?"', () => {
      const result = tryOfflineFallback(
        'How many night shifts this month?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(false);
      expect(result.text).toBeUndefined();
    });

    it('should not handle random text', () => {
      const result = tryOfflineFallback(
        'Tell me a joke about shift workers',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(false);
      expect(result.text).toBeUndefined();
    });

    it('should not handle a query about today that lacks shift/work/schedule keywords', () => {
      const result = tryOfflineFallback('What is the weather today?', shiftCycle, userName);

      expect(result.handled).toBe(false);
    });

    it('should not handle a query about tomorrow that lacks shift/work/schedule keywords', () => {
      const result = tryOfflineFallback('What is tomorrow?', shiftCycle, userName);

      expect(result.handled).toBe(false);
    });

    it('should not match today queries that also mention "next" or "week"', () => {
      // matchesToday explicitly excludes "next" and "week"
      const result = tryOfflineFallback(
        'What shift today and next week?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(false);
    });
  });

  // ── 7. Edge cases ──────────────────────────────────────────────────────

  describe('edge cases', () => {
    beforeEach(() => {
      setFakeDate('2024-01-03');
    });

    it('should not handle an empty string', () => {
      const result = tryOfflineFallback('', shiftCycle, userName);

      expect(result.handled).toBe(false);
      expect(result.text).toBeUndefined();
    });

    it('should handle queries with mixed case', () => {
      const result = tryOfflineFallback(
        'WHAT SHIFT DO I HAVE TODAY?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
    });

    it('should handle queries with extra leading/trailing spaces', () => {
      const result = tryOfflineFallback(
        '   What shift do I have today?   ',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
    });

    it('should handle queries with mixed case and extra spaces', () => {
      const result = tryOfflineFallback(
        '  AM I WORKING TODAY?  ',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toBeDefined();
    });

    it('should handle "Do I Work Today?" with title case', () => {
      setFakeDate('2024-01-09'); // off day

      const result = tryOfflineFallback('Do I Work Today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toMatch(/no/i);
    });

    it('should handle "When Is My Next Day Off?" with title case', () => {
      const result = tryOfflineFallback(
        'When Is My Next Day Off?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next day off');
    });

    it('should handle "NEXT NIGHT SHIFT" in all caps', () => {
      const result = tryOfflineFallback('NEXT NIGHT SHIFT', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next night shift');
    });

    it('should handle "Tomorrow Work Schedule" with various casing', () => {
      const result = tryOfflineFallback(
        'Tomorrow Work Schedule',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Tomorrow');
    });
  });

  // ── 8. Return shape validation ──────────────────────────────────────────

  describe('return value shape', () => {
    beforeEach(() => {
      setFakeDate('2024-01-02');
    });

    it('should return { handled: false } with no text or toolName for unhandled queries', () => {
      const result = tryOfflineFallback('some random query', shiftCycle, userName);

      expect(result).toEqual({ handled: false });
    });

    it('should include handled, text, and toolName for handled queries', () => {
      const result = tryOfflineFallback(
        'What shift do I have today?',
        shiftCycle,
        userName
      );

      expect(result).toHaveProperty('handled', true);
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('toolName');
      expect(typeof result.text).toBe('string');
      expect(typeof result.toolName).toBe('string');
    });
  });

  // ── 9. Different shift cycle configurations ─────────────────────────────

  describe('with a 3-shift system cycle', () => {
    const threeShiftCycle: ShiftCycle = {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: ShiftSystem.THREE_SHIFT,
      daysOn: 0,
      nightsOn: 0,
      morningOn: 2,
      afternoonOn: 2,
      nightOn: 2,
      daysOff: 3,
      startDate: '2024-01-01',
      phaseOffset: 0,
    };
    // Cycle length = 2 + 2 + 2 + 3 = 9
    // Jan 1-2: morning, Jan 3-4: afternoon, Jan 5-6: night, Jan 7-9: off

    it('should report morning shift for today query', () => {
      setFakeDate('2024-01-01');

      const result = tryOfflineFallback(
        'What shift do I have today?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('morning');
      expect(result.text).toContain('shift');
    });

    it('should report afternoon shift for today query', () => {
      setFakeDate('2024-01-03');

      const result = tryOfflineFallback(
        'What shift do I have today?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('afternoon');
    });

    it('should report night shift for today query', () => {
      setFakeDate('2024-01-05');

      const result = tryOfflineFallback(
        'What shift do I have today?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('night');
    });

    it('should report day off for today query', () => {
      setFakeDate('2024-01-08');

      const result = tryOfflineFallback(
        'What shift do I have today?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('day off');
    });

    it('should find next night shift from a morning-shift day', () => {
      // Jan 1 (morning) -> next night = Jan 5
      setFakeDate('2024-01-01');

      const result = tryOfflineFallback(
        'When is my next night shift?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('next night shift');
      expect(result.text).toContain('Friday');
      expect(result.text).toContain('January 5');
    });

    it('should find next day off when on night shift', () => {
      // Jan 5 (night) -> next off = Jan 7 (Sunday)
      setFakeDate('2024-01-05');

      const result = tryOfflineFallback(
        'When is my next day off?',
        threeShiftCycle,
        userName
      );

      expect(result.handled).toBe(true);
      expect(result.text).toContain('Sunday');
      expect(result.text).toContain('January 7');
    });

    it('should correctly answer "Am I working today?" during afternoon shift', () => {
      setFakeDate('2024-01-04');

      const result = tryOfflineFallback('Am I working today?', threeShiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.text).toMatch(/yes/i);
      expect(result.text).toContain('afternoon');
    });
  });

  // ── 10. Priority / exclusion rules ──────────────────────────────────────

  describe('pattern matching priority and exclusion', () => {
    it('should match today query before "am I working" check for compound queries', () => {
      // "What shift today?" matches matchesToday; it should not fall through
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback('What shift today?', shiftCycle, userName);

      expect(result.handled).toBe(true);
      expect(result.toolName).toBe('get_current_status');
    });

    it('should NOT match today when "tomorrow" is also in the query', () => {
      // matchesToday excludes queries containing "tomorrow"
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback(
        'What shift today or tomorrow?',
        shiftCycle,
        userName
      );

      // "today" is excluded because "tomorrow" is present, but this should
      // still match matchesTomorrow since it has "tomorrow" + "shift"
      expect(result.handled).toBe(true);
      expect(result.toolName).toBe('get_shift_for_date');
    });

    it('should NOT match today when "month" is in the query', () => {
      setFakeDate('2024-01-02');

      const result = tryOfflineFallback(
        'What is my shift today this month?',
        shiftCycle,
        userName
      );

      expect(result.handled).toBe(false);
    });
  });
});
