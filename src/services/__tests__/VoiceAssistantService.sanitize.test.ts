import {
  formatVoiceAssistantResponseText,
  sanitizeVoiceAssistantResponseText,
} from '../VoiceAssistantService';
import type { VoiceAssistantUserContext } from '@/types/voiceAssistant';

const baseContext = {
  name: 'Ilyasu Seidu',
} as VoiceAssistantUserContext;

describe('sanitizeVoiceAssistantResponseText', () => {
  it('removes a leftover leading greeting fragment from shift answers', () => {
    expect(sanitizeVoiceAssistantResponseText('there, Tuesday, 29 Dec is Off.')).toBe(
      'Tuesday, 29 Dec is Off.'
    );
  });

  it('removes complete leading greetings from assistant answers', () => {
    expect(sanitizeVoiceAssistantResponseText('Hi there, Tuesday, 29 Dec is Off.')).toBe(
      'Tuesday, 29 Dec is Off.'
    );
    expect(sanitizeVoiceAssistantResponseText('Hello, Friday is Day shift.')).toBe(
      'Friday is Day shift.'
    );
  });

  it('keeps normal answer text that contains there later in the sentence', () => {
    expect(sanitizeVoiceAssistantResponseText('You are off there too.')).toBe(
      'You are off there too.'
    );
  });

  it('adds the user first name to the cleaned answer', () => {
    expect(formatVoiceAssistantResponseText('there, Tuesday, 29 Dec is Off.', baseContext)).toBe(
      'Ilyasu, you’re off on Tuesday, 29 Dec. Enjoy the rest.'
    );
  });

  it('does not add the user name twice', () => {
    expect(formatVoiceAssistantResponseText('Ilyasu, Tuesday, 29 Dec is Off.', baseContext)).toBe(
      'Ilyasu, you’re off on Tuesday, 29 Dec. Enjoy the rest.'
    );
  });

  it('does not personalize when the name is missing or generic', () => {
    expect(formatVoiceAssistantResponseText('Tuesday, 29 Dec is Off.', null)).toBe(
      'you’re off on Tuesday, 29 Dec. Enjoy the rest.'
    );
    expect(
      formatVoiceAssistantResponseText('Tuesday, 29 Dec is Off.', {
        ...baseContext,
        name: 'Ryvro user',
      })
    ).toBe('you’re off on Tuesday, 29 Dec. Enjoy the rest.');
  });

  it('makes work shift answers sound natural', () => {
    expect(formatVoiceAssistantResponseText('Friday is Day shift.', baseContext)).toBe(
      'Ilyasu, you’re on Day shift on Friday.'
    );
  });

  it('keeps named work answers warm and preserves 12-hour time ranges', () => {
    expect(
      formatVoiceAssistantResponseText(
        'You are on Night shift on Friday, 7:00 PM to 7:00 AM.',
        baseContext
      )
    ).toBe('Ilyasu, you’re on Night shift on Friday, 7:00 PM to 7:00 AM.');
  });

  it('turns direct off answers into a pleasant named response', () => {
    expect(formatVoiceAssistantResponseText('You are off on Saturday.', baseContext)).toBe(
      'Ilyasu, you’re off on Saturday. Enjoy the rest.'
    );
  });

  it('does not duplicate the off-shift closing when the source answer already has it', () => {
    expect(
      formatVoiceAssistantResponseText(
        'Ilyasu, you are off on Tuesday, 29 Dec. Enjoy the rest.',
        baseContext
      )
    ).toBe('Ilyasu, you’re off on Tuesday, 29 Dec. Enjoy the rest.');
  });

  it('formats structured range answers so they are readable and voice friendly', () => {
    const text = formatVoiceAssistantResponseText(
      'In December, you have some days off and some shifts.',
      baseContext,
      {
        toolName: 'get_shifts_in_range',
        data: [
          {
            date: '2026-12-12',
            isWorkDay: true,
            isNightShift: false,
            shiftType: 'day',
            universal: { definitionName: 'Day Shift', startTime: '06:00', endTime: '18:00' },
          },
          {
            date: '2026-12-13',
            isWorkDay: true,
            isNightShift: false,
            shiftType: 'day',
            universal: { definitionName: 'Day Shift', startTime: '06:00', endTime: '18:00' },
          },
          {
            date: '2026-12-14',
            isWorkDay: true,
            isNightShift: true,
            shiftType: 'night',
            universal: { definitionName: 'Night Shift', startTime: '18:00', endTime: '06:00' },
          },
          {
            date: '2026-12-15',
            isWorkDay: true,
            isNightShift: true,
            shiftType: 'night',
            universal: { definitionName: 'Night Shift', startTime: '18:00', endTime: '06:00' },
          },
          { date: '2026-12-16', isWorkDay: false, isNightShift: false, shiftType: 'off' },
          { date: '2026-12-17', isWorkDay: false, isNightShift: false, shiftType: 'off' },
        ],
      }
    );

    expect(text).toContain(
      'Ilyasu, from Saturday, Dec 12 to Thursday, Dec 17, you work 4 days and have 2 days off.'
    );
    expect(text).toContain('Day Shift, 6:00 AM to 6:00 PM: Dec 12 to Dec 13.');
    expect(text).toContain('Night Shift, 6:00 PM to 6:00 AM: Dec 14 to Dec 15.');
    expect(text).toContain('Off: Dec 16 to Dec 17.');
  });
});
