import type { UniversalShiftSchedule } from '@/types';
import { classifyLocalShiftBrainIntent, answerWithLocalShiftBrain } from '@/utils/localShiftBrain';

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'AI shift schedule',
  timezone: 'UTC',
  anchorDate: '2026-06-18',
  phaseOffset: 0,
  source: 'manual',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#147cff',
      icon: 'sunny-outline',
    },
    {
      id: 'night',
      name: 'Night shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '19:00',
      endTime: '07:00',
      crossesMidnight: true,
      countsAsWork: true,
      countsAsNight: true,
      countsForStats: true,
      color: '#147cff',
      icon: 'moon-outline',
    },
    {
      id: 'off',
      name: 'Off',
      kind: 'off',
      timePolicy: 'none',
      activePolicy: 'not_active',
      countsAsWork: false,
      countsAsNight: false,
      countsForStats: true,
      color: '#8ea4b5',
      icon: 'home-outline',
    },
  ],
  sequence: [
    { id: 'seq-1', shiftDefinitionId: 'day' },
    { id: 'seq-2', shiftDefinitionId: 'night' },
    { id: 'seq-3', shiftDefinitionId: 'off' },
  ],
};

describe('localShiftBrain', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-18T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('answers the exact shift when the question says schedule and includes a date', () => {
    const result = answerWithLocalShiftBrain(
      'What is my shift schedule on 2026-06-19?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Night shift');
    expect(result.text).toContain('7:00 PM to 7:00 AM');
    expect(result.text).not.toContain('repeats every');
    expect(result.text).not.toContain('19:00');
  });

  it('answers today from the saved schedule in a voice-friendly response', () => {
    const result = answerWithLocalShiftBrain('What shift am I on today?', schedule, 'Ama Mensah');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Ama');
    expect(result.text).toContain('Day shift');
    expect(result.text).toContain('7:00 AM to 7:00 PM');
  });

  it('answers tomorrow from the saved schedule', () => {
    const result = answerWithLocalShiftBrain('What shift am I on tomorrow?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Night shift');
    expect(result.text).toContain('7:00 PM to 7:00 AM');
  });

  it('answers exact voice date questions far outside the next two years', () => {
    const result = answerWithLocalShiftBrain('What is my shift on 2126-06-19?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Day shift');
    expect(result.text).not.toContain('schedule window');
  });

  it('uses the search window for next-occurrence voice questions', () => {
    const longOffSchedule: UniversalShiftSchedule = {
      ...schedule,
      sequence: [
        ...Array.from({ length: 731 }, (_, index) => ({
          id: `off-${index}`,
          shiftDefinitionId: 'off',
        })),
        { id: 'night-after-search-window', shiftDefinitionId: 'night' },
      ],
    };

    const result = answerWithLocalShiftBrain(
      'When is my next night shift?',
      longOffSchedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_next_occurrence');
    expect(result.text).toBe('I could not find a night shift in this schedule window.');
  });

  it('treats weekday shift questions as date questions before pattern summaries', () => {
    const result = answerWithLocalShiftBrain('What is my shift schedule Friday?', schedule, 'Ama');

    expect(classifyLocalShiftBrainIntent('What is my shift schedule Friday?').intent).toBe(
      'calendar_date'
    );
    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Night shift');
  });

  it('understands next two weeks Saturday as the Saturday two weeks from now', () => {
    const result = answerWithLocalShiftBrain(
      'What shift do I have next two weeks Saturday?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Night shift');
    expect(result.text).toContain('Saturday, Jul 4');
  });

  it('understands Saturday two weeks from now as an exact date question', () => {
    const result = answerWithLocalShiftBrain(
      'What shift do I have Saturday two weeks from now?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Night shift');
    expect(result.text).toContain('Saturday, Jul 4');
  });

  it('answers multiple weekday questions such as next two Saturdays', () => {
    const result = answerWithLocalShiftBrain(
      'What shifts do I have the next two Saturdays?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Saturday, Jun 20: Off');
    expect(result.text).toContain('Saturday, Jun 27: Day shift');
  });

  it('treats next week as the following calendar week, not the next seven days', () => {
    const result = answerWithLocalShiftBrain('What shifts do I have next week?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.text).toContain('Sunday, Jun 21 to Saturday, Jun 27');
    expect(result.text).toContain('5 work days');
    expect(result.text).toContain('2 days off');
  });

  it('answers whether the user is working next weekend using Saturday and Sunday', () => {
    const result = answerWithLocalShiftBrain('Am I working next weekend?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.text).toContain('Saturday, Jun 27 to Sunday, Jun 28');
    expect(result.text).toContain('2 work days');
    expect(result.text).toContain('Saturday, Jun 27: Day shift');
    expect(result.text).toContain('Sunday, Jun 28: Night shift');
  });

  it('answers day-to-day month range questions offline', () => {
    const result = answerWithLocalShiftBrain(
      'What shifts do I have from the 12th to the 27th of June?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.data).toEqual(expect.any(Array));
    expect(result.text).toContain('Friday, Jun 12 to Saturday, Jun 27');
  });

  it('answers common spoken date range variations offline', () => {
    const questions = [
      'What shifts do I have next 7 days?',
      'What shifts do I have June 12 to June 27?',
      'What shifts do I have from June 12 to June 27?',
      'What shifts do I have between June 12 and June 27?',
      'What shifts do I have 12 June to 27 June?',
      'What shifts do I have from 2026-06-12 to 2026-06-27?',
      'What shifts do I have next 14 days?',
    ];

    for (const question of questions) {
      const result = answerWithLocalShiftBrain(question, schedule, 'Ama');

      expect(result.handled).toBe(true);
      expect(result.toolName).toBe('get_shifts_in_range');
      expect(result.data).toEqual(expect.any(Array));
    }
  });

  it('answers last week as the previous Sunday through Saturday range', () => {
    const result = answerWithLocalShiftBrain('What shifts did I have last week?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.data).toEqual(expect.any(Array));
    expect(result.text).toContain('Sunday, Jun 7 to Saturday, Jun 13');
  });

  it('answers first weekday in a month as an exact date question', () => {
    const result = answerWithLocalShiftBrain(
      'What shift do I have first Saturday in August?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Saturday, Aug 1');
  });

  it('answers end of the month as the final seven days of the month', () => {
    const result = answerWithLocalShiftBrain(
      'What shifts do I have at the end of the month?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.data).toEqual(expect.any(Array));
    expect(result.text).toContain('Wednesday, Jun 24 to Tuesday, Jun 30');
  });

  it('answers today to end of month as a remaining-month range', () => {
    const result = answerWithLocalShiftBrain(
      'What shifts do I have from today to the end of the month?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shifts_in_range');
    expect(result.data).toEqual(expect.any(Array));
    expect(result.text).toContain('Thursday, Jun 18 to Tuesday, Jun 30');
  });

  it('treats next week plus a weekday as that day in the following calendar week', () => {
    const expectedDatesByDay = [
      ['Sunday', 'Sunday, Jun 21'],
      ['Monday', 'Monday, Jun 22'],
      ['Tuesday', 'Tuesday, Jun 23'],
      ['Wednesday', 'Wednesday, Jun 24'],
      ['Thursday', 'Thursday, Jun 25'],
      ['Friday', 'Friday, Jun 26'],
      ['Saturday', 'Saturday, Jun 27'],
    ];

    for (const [weekday, expectedDate] of expectedDatesByDay) {
      const result = answerWithLocalShiftBrain(
        `What shift do I have next week ${weekday}?`,
        schedule,
        'Ama'
      );

      expect(result.handled).toBe(true);
      expect(result.toolName).toBe('get_shift_for_date');
      expect(result.text).toContain(expectedDate);
    }
  });

  it('treats weekday next week as that day in the following calendar week', () => {
    const result = answerWithLocalShiftBrain(
      'What shift do I have Saturday next week?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Saturday, Jun 27');
    expect(result.text).toContain('Day shift');
  });

  it('keeps true pattern questions as pattern summaries', () => {
    const result = answerWithLocalShiftBrain(
      'What pattern does my schedule repeat?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_statistics');
    expect(result.text).toContain('repeats every 3 days');
  });

  it('answers next month day-off counts using next month, not the current month', () => {
    const result = answerWithLocalShiftBrain(
      'How many days off do I have next month?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_statistics');
    expect(result.text).toContain('Wednesday, Jul 1 to Friday, Jul 31');
    expect(result.text).toContain('10 days off');
  });

  it('answers this month night-shift counts', () => {
    const result = answerWithLocalShiftBrain(
      'How many nights do I have this month?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_statistics');
    expect(result.text).toContain('Monday, Jun 1 to Tuesday, Jun 30');
    expect(result.text).toContain('10 night shifts');
  });

  it('answers next month night-shift counts instead of treating it as next night shift', () => {
    const result = answerWithLocalShiftBrain(
      'How many nights do I have next month?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_statistics');
    expect(result.text).toContain('Wednesday, Jul 1 to Friday, Jul 31');
    expect(result.text).toContain('11 night shifts');
  });

  it('answers Christmas as a real calendar date', () => {
    const result = answerWithLocalShiftBrain('Am I working Christmas?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Friday, Dec 25');
    expect(result.text).toContain('Night shift');
  });

  it('answers day month dates such as 29 December', () => {
    const result = answerWithLocalShiftBrain(
      'What shift do I have on 29 December?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_shift_for_date');
    expect(result.text).toContain('Tuesday, Dec 29');
    expect(result.text).toContain('you are off');
  });

  it('answers how many days until work', () => {
    jest.setSystemTime(new Date('2026-06-20T12:00:00'));

    const result = answerWithLocalShiftBrain('How many days until I work?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('days_until_work');
    expect(result.text).toContain('work again in 1 day');
  });

  it('answers what block the user is in', () => {
    const result = answerWithLocalShiftBrain('What block am I in?', schedule, 'Ama');

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('current_block_info');
    expect(result.text).toContain('Ama');
    expect(result.text).toContain('work block');
    expect(result.text).toContain('day 1 of 2');
  });

  it('answers when the next work block starts', () => {
    jest.setSystemTime(new Date('2026-06-20T12:00:00'));

    const result = answerWithLocalShiftBrain(
      'When does my next work block start?',
      schedule,
      'Ama'
    );

    expect(result.handled).toBe(true);
    expect(result.toolName).toBe('get_next_work_block');
    expect(result.text).toContain('next work block starts Sunday, June 21, 2026');
    expect(result.text).toContain('It lasts 2 days');
  });

  it('does not turn the word schedule alone into a generic pattern answer', () => {
    const result = answerWithLocalShiftBrain('Tell me about my shift schedule', schedule, 'Ama');

    expect(result.handled).toBe(false);
  });
});
