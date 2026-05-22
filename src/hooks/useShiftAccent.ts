import { useEffect, useMemo, useState } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useActiveShift } from '@/hooks/useActiveShift';
import { buildShiftCycle, calculateShiftDay } from '@/utils/shiftUtils';
import { addDays, toDateString } from '@/utils/dateUtils';
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
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function dateAtMinutes(baseDate: Date, totalMinutes: number): Date {
  const next = new Date(baseDate);
  next.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return next;
}

export function getNextShiftAccentRefreshAt(now: Date, shiftCycle: ShiftCycle | null): Date {
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);

  if (!shiftCycle) {
    return nextMidnight;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidates: Date[] = [nextMidnight];

  for (let offset = -1; offset <= 1; offset += 1) {
    const shiftDate = addDays(today, offset);
    const shiftDay = calculateShiftDay(shiftDate, shiftCycle);
    const universal = shiftDay.universal;
    if (!universal?.startTime || !universal.endTime) {
      continue;
    }

    const startMinutes = parseTimeToMinutes(universal.startTime);
    const endMinutes = parseTimeToMinutes(universal.endTime);
    const startAt = dateAtMinutes(shiftDate, startMinutes);
    const endBaseDate = endMinutes > startMinutes ? shiftDate : addDays(shiftDate, 1);
    const endAt = dateAtMinutes(endBaseDate, endMinutes);

    if (startAt > now) candidates.push(startAt);
    if (endAt > now) candidates.push(endAt);
  }

  return candidates.reduce((closest, candidate) =>
    candidate.getTime() < closest.getTime() ? candidate : closest
  );
}

export function useShiftAccent(): ShiftAccentResult {
  const { data } = useOnboarding();
  const [liveTick, setLiveTick] = useState(0);
  const [currentDateStr, setCurrentDateStr] = useState(() => toDateString(new Date()));

  const shiftCycle = useMemo(() => buildShiftCycle(data), [data]);

  useEffect(() => {
    const now = new Date();
    const nextRefreshAt = getNextShiftAccentRefreshAt(now, shiftCycle);
    const delayMs = Math.max(250, nextRefreshAt.getTime() - now.getTime() + 250);

    const timer = setTimeout(() => {
      setLiveTick((tick) => tick + 1);
      setCurrentDateStr(toDateString(new Date()));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [shiftCycle, liveTick]);

  const activeShift = useActiveShift(shiftCycle, data, liveTick, currentDateStr);
  const activeShiftType = activeShift?.scheduledShiftType ?? null;
  const resolvedAccentColor = activeShift?.scheduledUniversalDisplay?.color ?? null;

  const tabAccentColor = resolvedAccentColor ?? theme.colors.paleGold;
  const tabGlowColor = resolvedAccentColor
    ? hexToRGBA(resolvedAccentColor, 0.2)
    : theme.colors.opacity.gold20;
  const statusAreaColor = resolvedAccentColor ?? theme.colors.deepVoid;

  return {
    shiftType: activeShiftType,
    statusAreaColor,
    tabAccentColor,
    tabGlowColor,
  };
}
