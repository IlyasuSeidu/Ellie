import { useEffect, useMemo, useState } from 'react';
import { useOnboarding, type OnboardingData } from '@/contexts/OnboardingContext';
import { useActiveShift } from '@/hooks/useActiveShift';
import { shiftColors } from '@/constants/shiftStyles';
import { buildShiftCycle, calculateShiftDay } from '@/utils/shiftUtils';
import { addDays, toDateString } from '@/utils/dateUtils';
import { getShiftTimesFromData } from '@/utils/shiftTimeUtils';
import { hexToRGBA } from '@/utils/styleUtils';
import { theme } from '@/utils/theme';
import type { ShiftCycle, ShiftType } from '@/types';

interface ShiftAccentResult {
  shiftType: ShiftType | null;
  statusAreaColor: string;
  tabAccentColor: string;
  tabGlowColor: string;
}

function parseTimeToMinutes(time24h: string): number {
  const [hours, minutes] = time24h.split(':').map(Number);
  return hours * 60 + minutes;
}

function dateAtMinutes(baseDate: Date, totalMinutes: number): Date {
  const next = new Date(baseDate);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

function findShiftTime(
  shiftTimes: Array<{ type: string; startTime: string; endTime: string; duration: number }>,
  shiftType: ShiftType,
  data: OnboardingData | null
) {
  const matches = shiftTimes.filter((shift) => shift.type === shiftType);
  if (matches.length <= 1) return matches[0] ?? null;

  const is3Shift = data?.shiftSystem === '3-shift';
  return (
    matches.find((shift) => (is3Shift ? shift.duration === 8 : shift.duration === 12)) ?? matches[0]
  );
}

export function getNextShiftAccentRefreshAt(
  now: Date,
  shiftCycle: ShiftCycle | null,
  data: OnboardingData | null
): Date {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);

  if (!shiftCycle || !data) {
    return nextMidnight;
  }

  const shiftTimes = getShiftTimesFromData(data);
  if (shiftTimes.length === 0) {
    return nextMidnight;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidates: Date[] = [nextMidnight];

  for (let offset = -1; offset <= 1; offset += 1) {
    const shiftDate = addDays(today, offset);
    const shiftDay = calculateShiftDay(shiftDate, shiftCycle);
    if (shiftDay.shiftType === 'off') {
      continue;
    }

    const shiftTime = findShiftTime(shiftTimes, shiftDay.shiftType, data);
    if (!shiftTime) {
      continue;
    }

    const startMinutes = parseTimeToMinutes(shiftTime.startTime);
    const endMinutes = parseTimeToMinutes(shiftTime.endTime);
    const startAt = dateAtMinutes(shiftDate, startMinutes);
    const endBaseDate = endMinutes > startMinutes ? shiftDate : addDays(shiftDate, 1);
    const endAt = dateAtMinutes(endBaseDate, endMinutes);

    if (startAt > now) {
      candidates.push(startAt);
    }
    if (endAt > now) {
      candidates.push(endAt);
    }
  }

  return candidates.reduce((closest, candidate) =>
    candidate.getTime() < closest.getTime() ? candidate : closest
  );
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
    const now = new Date();
    const nextRefreshAt = getNextShiftAccentRefreshAt(now, buildShiftCycle(data), data);
    const delayMs = Math.max(250, nextRefreshAt.getTime() - now.getTime() + 250);

    const timer = setTimeout(() => {
      setLiveTick((tick) => tick + 1);
      setCurrentDateStr(toDateString(new Date()));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [data, liveTick]);

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
