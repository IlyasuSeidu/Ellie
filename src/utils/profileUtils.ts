import type { OnboardingData } from '@/contexts/OnboardingContext';

export function getPatternDisplayName(data: OnboardingData): string {
  return data.universalSchedule?.name ?? 'Universal Schedule';
}

export function getCycleLengthDays(data: OnboardingData): number | null {
  return data.universalSchedule?.sequence.length ?? null;
}

export function getWorkRestRatio(data: OnboardingData): string {
  const schedule = data.universalSchedule;
  if (!schedule || schedule.sequence.length === 0) return 'Not set';

  const definitions = new Map(
    schedule.shiftDefinitions.map((definition) => [definition.id, definition])
  );
  let workDays = 0;
  let restDays = 0;

  for (const item of schedule.sequence) {
    const definition = definitions.get(item.shiftDefinitionId);
    if (definition?.countsAsWork) workDays += 1;
    else restDays += 1;
  }

  return `${workDays}:${restDays}`;
}

export function getShiftDurationSummary(data: OnboardingData): string {
  const timedDefinitions =
    data.universalSchedule?.shiftDefinitions.filter(
      (definition) => definition.timePolicy === 'timed' && definition.durationMinutes
    ) ?? [];
  if (timedDefinitions.length === 0) return 'Flexible';

  const durations = Array.from(
    new Set(
      timedDefinitions.map((definition) => Math.round((definition.durationMinutes ?? 0) / 60))
    )
  ).sort((a, b) => a - b);

  if (durations.length === 1) {
    return `${durations[0]}h`;
  }
  return `${durations[0]}-${durations[durations.length - 1]}h`;
}

export function formatShiftTime(time?: string): string {
  if (!time) return '';
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return minutes === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
