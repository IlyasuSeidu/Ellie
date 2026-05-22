import { useMemo } from 'react';
import { calculateShiftDay } from '@/utils/shiftUtils';
import { addDays, getToday } from '@/utils/dateUtils';
import { formatTimeForDisplay } from '@/utils/shiftTimeUtils';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { ShiftCycle, ShiftType, UniversalShiftDayMeta } from '@/types';
import i18n from '@/i18n';

export interface ActiveShiftResult {
  shiftType: ShiftType;
  accentShiftType: ShiftType;
  scheduledShiftType: ShiftType;
  isWorkDay: boolean;
  isOnShift: boolean;
  isOvernightCarryOver: boolean;
  timeDisplay: string;
  countdown: string;
  universalDisplay?: {
    title: string;
    subtitle: string;
    color: string;
    icon: string;
  };
  scheduledUniversalDisplay?: {
    title: string;
    subtitle: string;
    color: string;
    icon: string;
  };
}

function parseTimeToMinutes(time24h: string): number {
  const [h, m] = time24h.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatMinutesCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function tDashboard(key: string, options: Record<string, unknown>, fallback: string): string {
  return String(i18n.t(key, { ns: 'dashboard', defaultValue: fallback, ...options }));
}

function formatUniversalSubtitle(universal?: UniversalShiftDayMeta): string {
  if (!universal) return '';
  const kind = universal.kind.replace('_', ' ');
  if (universal.timePolicy === 'timed' && universal.startTime && universal.endTime) {
    return `${kind} - ${formatTimeForDisplay(universal.startTime)} - ${formatTimeForDisplay(
      universal.endTime
    )}${universal.crossesMidnight ? ' +1' : ''}`;
  }
  if (universal.timePolicy === 'all_day') {
    return `${kind} - All day`;
  }
  return kind;
}

function toUniversalDisplay(universal?: UniversalShiftDayMeta) {
  if (!universal) return undefined;
  return {
    title: universal.definitionName,
    subtitle: formatUniversalSubtitle(universal),
    color: universal.color,
    icon: universal.icon,
  };
}

function isActiveNow(universal: UniversalShiftDayMeta | undefined, nowMinutes: number): boolean {
  if (!universal) return false;
  if (universal.activePolicy === 'not_active') return false;
  if (universal.activePolicy === 'all_day_active') return universal.countsAsWork;
  if (!universal.startTime || !universal.endTime) return false;

  const start = parseTimeToMinutes(universal.startTime);
  const end = parseTimeToMinutes(universal.endTime);
  if (universal.crossesMidnight || end < start) {
    return nowMinutes >= start || nowMinutes < end;
  }
  return nowMinutes >= start && nowMinutes < end;
}

function buildTimeDisplay(universal?: UniversalShiftDayMeta): string {
  if (!universal) return '';
  if (universal.timePolicy === 'all_day') return 'All day';
  if (universal.timePolicy !== 'timed' || !universal.startTime || !universal.endTime) return '';
  return `${formatTimeForDisplay(universal.startTime)} - ${formatTimeForDisplay(universal.endTime)}${
    universal.crossesMidnight ? ' +1' : ''
  }`;
}

function buildCountdown(universal: UniversalShiftDayMeta | undefined, isOnShift: boolean): string {
  if (!universal?.startTime || !universal.endTime || universal.activePolicy !== 'timed_window') {
    return '';
  }

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(universal.startTime);
  const end = parseTimeToMinutes(universal.endTime);
  const adjustedEnd = universal.crossesMidnight || end < start ? end + 1440 : end;
  const adjustedNow = nowMinutes < start && adjustedEnd > 1440 ? nowMinutes + 1440 : nowMinutes;

  if (isOnShift) {
    const remaining = adjustedEnd - adjustedNow;
    const duration = formatMinutesCountdown(remaining);
    return tDashboard(
      'countdown.leftIn',
      {
        time: duration,
        shiftName: universal.definitionName,
      },
      `${duration} left in ${universal.definitionName}`
    );
  }

  const untilStart = start > nowMinutes ? start - nowMinutes : start + 1440 - nowMinutes;
  const duration = formatMinutesCountdown(untilStart);
  return tDashboard(
    'countdown.untilStarts',
    {
      time: duration,
      shiftName: universal.definitionName,
    },
    `${duration} until ${universal.definitionName} starts`
  );
}

export function useActiveShift(
  shiftCycle: ShiftCycle | null,
  _data: OnboardingData | null,
  _liveTick = 0,
  _currentDateStr?: string
): ActiveShiftResult | null {
  return useMemo(() => {
    void _liveTick;
    void _currentDateStr;
    if (!shiftCycle) return null;

    const today = getToday();
    const todayShift = calculateShiftDay(today, shiftCycle);
    const yesterdayShift = calculateShiftDay(addDays(today, -1), shiftCycle);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const yesterdayCarryOver =
      yesterdayShift.universal?.crossesMidnight &&
      yesterdayShift.universal.endTime &&
      nowMinutes < parseTimeToMinutes(yesterdayShift.universal.endTime)
        ? yesterdayShift
        : null;

    const effectiveShift = yesterdayCarryOver ?? todayShift;
    const effectiveUniversal = effectiveShift.universal;
    const scheduledUniversal = todayShift.universal;
    const isOnShift = isActiveNow(effectiveUniversal, nowMinutes);

    return {
      shiftType: effectiveShift.shiftType,
      accentShiftType: isOnShift ? effectiveShift.shiftType : 'off',
      scheduledShiftType: todayShift.shiftType,
      isWorkDay: effectiveShift.isWorkDay,
      isOnShift,
      isOvernightCarryOver: Boolean(yesterdayCarryOver),
      timeDisplay: buildTimeDisplay(effectiveUniversal),
      countdown: buildCountdown(effectiveUniversal, isOnShift),
      universalDisplay: toUniversalDisplay(effectiveUniversal),
      scheduledUniversalDisplay: toUniversalDisplay(scheduledUniversal),
    };
  }, [shiftCycle, _liveTick, _currentDateStr]);
}
