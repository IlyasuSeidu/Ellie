import { useEffect, useMemo, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useActiveShift } from '@/hooks/useActiveShift';
import { shiftColors } from '@/constants/shiftStyles';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { toDateString } from '@/utils/dateUtils';
import { hexToRGBA } from '@/utils/styleUtils';
import { theme } from '@/utils/theme';
import type { ShiftType } from '@/types';

interface ShiftAccentResult {
  shiftType: ShiftType | null;
  statusAreaColor: string;
  tabAccentColor: string;
  tabGlowColor: string;
}

/**
 * Dynamic shift accent colors shared by status area + tab UI.
 * Uses live active shift state (time-aware, including overnight carry-over).
 */
export function useShiftAccent(): ShiftAccentResult {
  const { data } = useOnboarding();
  const [liveTick, setLiveTick] = useState(0);
  const [currentDateStr, setCurrentDateStr] = useState(() => toDateString(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((tick) => tick + 1);
      setCurrentDateStr(toDateString(new Date()));
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const shiftCycle = useMemo(() => {
    try {
      return buildShiftCycle(data);
    } catch {
      return null;
    }
  }, [data]);

  const activeShift = useActiveShift(shiftCycle, data, liveTick, currentDateStr);

  const activeShiftType = useMemo<ShiftType | null>(() => {
    if (!shiftCycle || !activeShift) {
      return null;
    }
    return activeShift.shiftType;
  }, [activeShift, shiftCycle]);

  const isWorkShift = activeShiftType !== null && activeShiftType !== 'off';

  const tabAccentColor = isWorkShift ? shiftColors[activeShiftType].primary : theme.colors.paleGold;
  const tabGlowColor = isWorkShift
    ? hexToRGBA(shiftColors[activeShiftType].primary, 0.2)
    : theme.colors.opacity.gold20;
  const statusAreaColor = isWorkShift
    ? shiftColors[activeShiftType].primary
    : theme.colors.deepVoid;

  return {
    shiftType: activeShiftType,
    statusAreaColor,
    tabAccentColor,
    tabGlowColor,
  };
}
