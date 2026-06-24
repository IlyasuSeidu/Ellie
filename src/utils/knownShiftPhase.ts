import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';
import { getDateRelation } from '@/utils/dateTenseUtils';

export type KnownShiftChoice = 'day' | 'night' | 'off' | 'other';

export type KnownShiftPhaseOption = {
  sequenceIndex: number;
  occurrence: number;
  label: string;
  body: string;
  shiftName: string;
};

function normalizedName(definition: UniversalShiftDefinition): string {
  return definition.name.toLowerCase();
}

export function isNightDefinition(definition: UniversalShiftDefinition): boolean {
  return definition.countsAsNight || normalizedName(definition).includes('night');
}

export function isOffDefinition(definition: UniversalShiftDefinition): boolean {
  const name = normalizedName(definition);
  return definition.kind === 'off' || !definition.countsAsWork || name.includes('off');
}

export function isDayDefinition(definition: UniversalShiftDefinition): boolean {
  const name = normalizedName(definition);
  return (
    !isNightDefinition(definition) &&
    !isOffDefinition(definition) &&
    (definition.kind === 'work' || definition.countsAsWork || name.includes('day'))
  );
}

export function matchesKnownShiftChoice(
  definition: UniversalShiftDefinition,
  choice: KnownShiftChoice
): boolean {
  if (choice === 'day') return isDayDefinition(definition);
  if (choice === 'night') return isNightDefinition(definition);
  if (choice === 'off') return isOffDefinition(definition);
  return (
    !isDayDefinition(definition) && !isNightDefinition(definition) && !isOffDefinition(definition)
  );
}

export function getKnownShiftChoiceLabel(choice: KnownShiftChoice): string {
  if (choice === 'day') return 'day shift';
  if (choice === 'night') return 'night shift';
  if (choice === 'off') return 'day off';
  return 'shift';
}

function getOrdinal(value: number): string {
  const lastTwoDigits = value % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${value}th`;

  const lastDigit = value % 10;
  if (lastDigit === 1) return `${value}st`;
  if (lastDigit === 2) return `${value}nd`;
  if (lastDigit === 3) return `${value}rd`;

  return `${value}th`;
}

function stripShiftSuffix(name: string): string {
  return name.replace(/\s+shift$/i, '').trim();
}

export function getKnownShiftPhaseOptions(
  schedule: UniversalShiftSchedule,
  choice: KnownShiftChoice
): KnownShiftPhaseOption[] {
  const definitionById = new Map(
    schedule.shiftDefinitions.map((definition) => [definition.id, definition])
  );
  const choiceLabel = getKnownShiftChoiceLabel(choice);
  let occurrence = 0;

  return schedule.sequence.reduce<KnownShiftPhaseOption[]>((options, item, sequenceIndex) => {
    const definition = definitionById.get(item.shiftDefinitionId);
    if (!definition || !matchesKnownShiftChoice(definition, choice)) return options;

    occurrence += 1;
    const ordinal = getOrdinal(occurrence);
    const shiftName = stripShiftSuffix(item.labelOverride || definition.name || choiceLabel);
    const relation = getDateRelation(schedule.anchorDate);
    const phaseBody =
      relation === 'today'
        ? choice === 'off'
          ? `This is off day ${occurrence}.`
          : `This is ${shiftName} ${occurrence}.`
        : relation === 'future'
          ? choice === 'off'
            ? `This will be off day ${occurrence}.`
            : `This will be ${shiftName} ${occurrence}.`
          : choice === 'off'
            ? `This was off day ${occurrence}.`
            : `This was ${shiftName} ${occurrence}.`;

    options.push({
      sequenceIndex,
      occurrence,
      label: choice === 'other' ? `${ordinal} ${shiftName}` : `${ordinal} ${choiceLabel}`,
      body: phaseBody,
      shiftName,
    });

    return options;
  }, []);
}

export function buildScheduleWithExactPhase(
  schedule: UniversalShiftSchedule,
  sequenceIndex: number
): UniversalShiftSchedule {
  return {
    ...schedule,
    phaseOffset: sequenceIndex,
    updatedAt: new Date().toISOString(),
  };
}
