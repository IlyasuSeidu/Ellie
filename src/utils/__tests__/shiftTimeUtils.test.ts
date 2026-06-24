import { formatTimeForDisplay, formatTimesInTextForDisplay } from '@/utils/shiftTimeUtils';

describe('shiftTimeUtils', () => {
  it('formats one 24-hour time into 12-hour time', () => {
    expect(formatTimeForDisplay('07:00')).toBe('7:00 AM');
    expect(formatTimeForDisplay('19:00')).toBe('7:00 PM');
  });

  it('formats day and night ranges with one AM or PM suffix per time', () => {
    expect(formatTimesInTextForDisplay('Day shift is 07:00 to 19:00.')).toBe(
      'Day shift is 7:00 AM to 7:00 PM.'
    );
    expect(formatTimesInTextForDisplay('Night shift is 19:00 to 07:00.')).toBe(
      'Night shift is 7:00 PM to 7:00 AM.'
    );
  });

  it('removes duplicate AM and PM suffixes when backend text already includes them', () => {
    expect(formatTimesInTextForDisplay('You work 07:00 am to 19:00 pm.')).toBe(
      'You work 7:00 AM to 7:00 PM.'
    );
    expect(formatTimesInTextForDisplay('You work 19:00 pm to 07:00 am.')).toBe(
      'You work 7:00 PM to 7:00 AM.'
    );
  });
});
