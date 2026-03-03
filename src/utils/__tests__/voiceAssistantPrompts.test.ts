import { buildSystemPrompt, CLAUDE_TOOL_DEFINITIONS } from '../voiceAssistantPrompts';
import { RosterType, type ShiftCycle } from '@/types';

describe('voiceAssistantPrompts', () => {
  it('builds prompt for 2-shift FIFO user with occupation', () => {
    const prompt = buildSystemPrompt({
      name: 'Alex',
      occupation: 'Operator',
      shiftCycle: {} as ShiftCycle,
      shiftSystem: '2-shift',
      rosterType: RosterType.FIFO,
      currentDate: '2026-02-28',
      currentTime: '08:00',
    });

    expect(prompt).toContain('2-shift system (12-hour shifts: day and night)');
    expect(prompt).toContain('FIFO / block roster');
    expect(prompt).toContain("User's occupation: Operator");
    expect(prompt).toContain('Current date: 2026-02-28');
  });

  it('builds prompt for 3-shift rotating user without occupation', () => {
    const prompt = buildSystemPrompt({
      name: 'Jamie',
      shiftCycle: {} as ShiftCycle,
      shiftSystem: '3-shift',
      rosterType: RosterType.ROTATING,
      currentDate: '2026-02-28',
      currentTime: '21:00',
    });

    expect(prompt).toContain('3-shift system (8-hour shifts: morning, afternoon, and night)');
    expect(prompt).toContain('rotating roster');
    expect(prompt).not.toContain("User's occupation:");
  });

  it('exposes required Claude tools for FIFO and rotating queries', () => {
    const toolNames = CLAUDE_TOOL_DEFINITIONS.map((tool) => tool.name);

    expect(toolNames).toEqual(
      expect.arrayContaining([
        'get_shift_for_date',
        'get_shifts_in_range',
        'get_current_status',
        'get_statistics',
        'get_next_occurrence',
        'get_next_work_block',
        'get_next_rest_block',
        'days_until_work',
        'days_until_rest',
        'current_block_info',
      ])
    );
  });
});
