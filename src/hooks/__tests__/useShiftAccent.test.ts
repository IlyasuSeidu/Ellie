import { renderHook } from '@testing-library/react-native';
import { useShiftAccent } from '../useShiftAccent';
import { shiftColors } from '@/constants/shiftStyles';
import { theme } from '@/utils/theme';

const mockUseOnboarding = jest.fn();
const mockUseActiveShift = jest.fn();
const mockBuildShiftCycle = jest.fn();

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/hooks/useActiveShift', () => ({
  useActiveShift: (...args: unknown[]) => mockUseActiveShift(...args),
}));

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: (...args: unknown[]) => mockBuildShiftCycle(...args),
}));

describe('useShiftAccent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboarding.mockReturnValue({ data: {} });
  });

  it('returns FIFO straight-days accent colors from active day shift', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'day' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('day');
    expect(result.current.statusAreaColor).toBe(shiftColors.day.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.day.primary);
    expect(result.current.tabGlowColor).toBe('rgba(33, 150, 243, 0.2)');
  });

  it('returns FIFO straight-nights accent colors from active night shift', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'night' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('night');
    expect(result.current.statusAreaColor).toBe(shiftColors.night.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.night.primary);
    expect(result.current.tabGlowColor).toBe('rgba(101, 31, 255, 0.2)');
  });

  it('returns work-shift accent colors for FIFO swing day phase', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'day' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.statusAreaColor).toBe(shiftColors.day.primary);
    expect(result.current.tabAccentColor).toBe(shiftColors.day.primary);
  });

  it('keeps the default colors for FIFO off days', () => {
    mockBuildShiftCycle.mockReturnValue({ rosterType: 'fifo' });
    mockUseActiveShift.mockReturnValue({ shiftType: 'off' });

    const { result } = renderHook(() => useShiftAccent());

    expect(result.current.shiftType).toBe('off');
    expect(result.current.statusAreaColor).toBe(theme.colors.deepVoid);
    expect(result.current.tabAccentColor).toBe(theme.colors.paleGold);
    expect(result.current.tabGlowColor).toBe(theme.colors.opacity.gold20);
  });
});
