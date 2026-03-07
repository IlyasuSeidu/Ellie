import { renderHook } from '@testing-library/react-native';
import { getNextShiftAccentRefreshAt, useShiftAccent } from '../useShiftAccent';
import { shiftColors } from '@/constants/shiftStyles';
import { theme } from '@/utils/theme';

const mockUseOnboarding = jest.fn();
const mockUseActiveShift = jest.fn();
const mockBuildShiftCycle = jest.fn();
const mockCalculateShiftDay = jest.fn();
const mockGetShiftTimesFromData = jest.fn();

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/hooks/useActiveShift', () => ({
  useActiveShift: (...args: unknown[]) => mockUseActiveShift(...args),
}));

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: (...args: unknown[]) => mockBuildShiftCycle(...args),
  calculateShiftDay: (...args: unknown[]) => mockCalculateShiftDay(...args),
}));

jest.mock('@/utils/shiftTimeUtils', () => ({
  getShiftTimesFromData: (...args: unknown[]) => mockGetShiftTimesFromData(...args),
}));

describe('useShiftAccent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboarding.mockReturnValue({ data: {} });
    mockGetShiftTimesFromData.mockReturnValue([]);
  });

  it('returns FIFO straight-days accent colors from active day shift', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'day', accentShiftType: 'day' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('day');
    expect(result.current.statusAreaColor).toBe(shiftColors.day.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.day.primary);
    expect(result.current.tabGlowColor).toBe('rgba(33, 150, 243, 0.2)');
  });

  it('returns FIFO straight-nights accent colors from active night shift', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'night', accentShiftType: 'night' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('night');
    expect(result.current.statusAreaColor).toBe(shiftColors.night.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.night.primary);
    expect(result.current.tabGlowColor).toBe('rgba(101, 31, 255, 0.2)');
  });

  it('returns work-shift accent colors for FIFO swing day phase', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'day', accentShiftType: 'day' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.statusAreaColor).toBe(shiftColors.day.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.day.primary);
  });

  it('keeps the default colors for FIFO off days', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'off', accentShiftType: 'off' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('off');
    expect(result.current.statusAreaColor).toBe(theme.colors.deepVoid);
    expect(result.current.tabAccentColor).toBe(theme.colors.paleGold);
    expect(result.current.tabGlowColor).toBe(theme.colors.opacity.gold20);
  });

  it('keeps the default colors before a scheduled shift has actually started', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'rotating' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'day', accentShiftType: 'off' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('off');
    expect(result.current.statusAreaColor).toBe(theme.colors.deepVoid);
    expect(result.current.tabAccentColor).toBe(theme.colors.paleGold);
    expect(result.current.tabGlowColor).toBe(theme.colors.opacity.gold20);
  });

  it('schedules the next refresh at the exact current shift end boundary', () => {
    mockCalculateShiftDay.mockReturnValue({ shiftType: 'day' });
    mockGetShiftTimesFromData.mockReturnValue([
      { type: 'day', startTime: '07:00', endTime: '19:00', duration: 12 },
    ]);

    const now = new Date('2026-03-07T18:30:00');
    const nextRefreshAt = getNextShiftAccentRefreshAt(now, { shiftSystem: '2-shift' } as never, {
      shiftSystem: '2-shift',
    });

    expect(nextRefreshAt.toISOString()).toBe('2026-03-07T19:00:00.000Z');
  });

  it('schedules the next refresh at the exact current shift start boundary', () => {
    mockCalculateShiftDay.mockReturnValue({ shiftType: 'night' });
    mockGetShiftTimesFromData.mockReturnValue([
      { type: 'night', startTime: '18:00', endTime: '06:00', duration: 12 },
    ]);

    const now = new Date('2026-03-07T17:45:00');
    const nextRefreshAt = getNextShiftAccentRefreshAt(now, { shiftSystem: '2-shift' } as never, {
      shiftSystem: '2-shift',
    });

    expect(nextRefreshAt.toISOString()).toBe('2026-03-07T18:00:00.000Z');
  });

  it('falls back to midnight when the current day is off', () => {
    mockCalculateShiftDay.mockReturnValue({ shiftType: 'off' });
    mockGetShiftTimesFromData.mockReturnValue([
      { type: 'day', startTime: '07:00', endTime: '19:00', duration: 12 },
    ]);

    const now = new Date('2026-03-07T10:15:00');
    const nextRefreshAt = getNextShiftAccentRefreshAt(now, { shiftSystem: '2-shift' } as never, {
      shiftSystem: '2-shift',
    });

    expect(nextRefreshAt.toISOString()).toBe('2026-03-08T00:00:00.000Z');
  });
});
