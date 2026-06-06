import { randomUUID } from 'crypto';
import type {
  UniversalShiftDefinition,
  UniversalShiftKind,
  UniversalShiftSchedule,
  UniversalShiftSequenceItem,
  UniversalShiftTimePolicy,
  UniversalShiftActivePolicy,
} from './universal-shift-types';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_IN_TEXT_RE = /\b\d{4}-\d{2}-\d{2}\b/;

type HeuristicShiftSpec = {
  id: string;
  name: string;
  kind: UniversalShiftKind;
  aliases: string[];
  color: string;
  icon: string;
  timePolicy: UniversalShiftTimePolicy;
  activePolicy: UniversalShiftActivePolicy;
  startTime?: string;
  endTime?: string;
  crossesMidnight?: boolean;
  countsAsWork: boolean;
  countsAsNight: boolean;
  countsForStats: boolean;
};

const HEURISTIC_SHIFT_SPECS: HeuristicShiftSpec[] = [
  {
    id: 'day',
    name: 'Day Shift',
    kind: 'work',
    aliases: ['day', 'days', 'morning', 'mornings', 'early', 'earlies'],
    color: '#2196F3',
    icon: 'sunny',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '06:00',
    endTime: '18:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'evening',
    name: 'Evening Shift',
    kind: 'work',
    aliases: ['evening', 'evenings', 'swing', 'swings', 'late', 'lates', 'afternoon', 'afternoons'],
    color: '#FF9800',
    icon: 'cafe',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '14:00',
    endTime: '22:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'night',
    name: 'Night Shift',
    kind: 'work',
    aliases: ['night', 'nights', 'graveyard', 'graveyards'],
    color: '#7C4DFF',
    icon: 'moon',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '18:00',
    endTime: '06:00',
    crossesMidnight: true,
    countsAsWork: true,
    countsAsNight: true,
    countsForStats: true,
  },
  {
    id: 'off',
    name: 'Off',
    kind: 'off',
    aliases: ['off', 'rest', 'home', 'break', 'days off', 'rest days'],
    color: '#57534e',
    icon: 'home',
    timePolicy: 'none',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: false,
  },
  {
    id: 'travel',
    name: 'Travel Day',
    kind: 'travel',
    aliases: ['travel', 'travels', 'fly', 'fly-in', 'fly-out', 'mobilisation', 'mobilization'],
    color: '#00BCD4',
    icon: 'airplane',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'on_call',
    name: 'On Call',
    kind: 'on_call',
    aliases: ['on call', 'on-call', 'standby', 'callout', 'call-out'],
    color: '#E91E63',
    icon: 'phone-portrait',
    timePolicy: 'all_day',
    activePolicy: 'all_day_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'training',
    name: 'Training',
    kind: 'training',
    aliases: ['training', 'trainings', 'course', 'courses', 'induction', 'inductions'],
    color: '#4CAF50',
    icon: 'school',
    timePolicy: 'timed',
    activePolicy: 'timed_window',
    startTime: '08:00',
    endTime: '16:00',
    countsAsWork: true,
    countsAsNight: false,
    countsForStats: true,
  },
  {
    id: 'leave',
    name: 'Leave',
    kind: 'leave',
    aliases: ['leave', 'vacation', 'holiday', 'pto', 'annual leave', 'sick leave'],
    color: '#8BC34A',
    icon: 'bed',
    timePolicy: 'all_day',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: false,
  },
  {
    id: 'custom',
    name: 'Custom Shift',
    kind: 'custom',
    aliases: ['custom', 'clinic', 'relief', 'cover', 'maintenance', 'admin', 'meeting'],
    color: '#9C27B0',
    icon: 'star',
    timePolicy: 'none',
    activePolicy: 'not_active',
    countsAsWork: false,
    countsAsNight: false,
    countsForStats: true,
  },
];

const WEEKDAY_INDEXES: Record<string, number> = {
  monday: 0,
  mon: 0,
  tuesday: 1,
  tue: 1,
  tues: 1,
  wednesday: 2,
  wed: 2,
  thursday: 3,
  thu: 3,
  thur: 3,
  thurs: 3,
  friday: 4,
  fri: 4,
  saturday: 5,
  sat: 5,
  sunday: 6,
  sun: 6,
};

const WEEK_ORDINALS: Record<string, number> = {
  one: 0,
  first: 0,
  '1': 0,
  two: 1,
  second: 1,
  '2': 1,
  three: 2,
  third: 2,
  '3': 2,
  four: 3,
  fourth: 3,
  '4': 3,
};

export function normalizeUniversalScheduleDraft(
  schedule: UniversalShiftSchedule,
  originalPrompt: string
): UniversalShiftSchedule {
  const idMap = new Map<string, string>();
  const shiftDefinitions: UniversalShiftDefinition[] = schedule.shiftDefinitions.map(
    (definition) => {
      const id = `shift-${randomUUID()}`;
      idMap.set(definition.id, id);
      return {
        ...definition,
        id,
      };
    }
  );
  const sequence: UniversalShiftSequenceItem[] = [];
  for (const item of schedule.sequence) {
    const mappedId = idMap.get(item.shiftDefinitionId);
    if (!mappedId) continue;
    sequence.push({
      id: `item-${randomUUID()}`,
      shiftDefinitionId: mappedId,
      ...(item.labelOverride ? { labelOverride: item.labelOverride } : {}),
    });
  }

  return {
    ...schedule,
    version: 3,
    source: 'ai',
    shiftDefinitions,
    sequence,
    phaseOffset: sequence.length
      ? ((schedule.phaseOffset % sequence.length) + sequence.length) % sequence.length
      : 0,
    updatedAt: new Date().toISOString(),
    aiDraftMeta: {
      originalPrompt,
      confidence: schedule.aiDraftMeta?.confidence ?? 0.7,
      assumptions: schedule.aiDraftMeta?.assumptions ?? [],
      unresolvedQuestions: schedule.aiDraftMeta?.unresolvedQuestions ?? [],
    },
  };
}

export function validateUniversalScheduleDraft(schedule: UniversalShiftSchedule): string[] {
  const errors: string[] = [];
  if (schedule.version !== 3) errors.push('version must be 3');
  if (!schedule.name?.trim()) errors.push('schedule name is required');
  if (!schedule.timezone?.trim()) errors.push('timezone is required');
  if (!DATE_RE.test(schedule.anchorDate)) errors.push('anchorDate must be YYYY-MM-DD');
  if (!schedule.shiftDefinitions.length) errors.push('at least one shift definition is required');
  if (!schedule.sequence.length) errors.push('at least one sequence item is required');

  const ids = new Set(schedule.shiftDefinitions.map((definition) => definition.id));
  for (const [index, item] of schedule.sequence.entries()) {
    if (!ids.has(item.shiftDefinitionId)) {
      errors.push(`sequence.${index}.shiftDefinitionId is missing`);
    }
  }
  for (const [index, definition] of schedule.shiftDefinitions.entries()) {
    if (definition.timePolicy === 'timed') {
      if (!definition.startTime || !TIME_RE.test(definition.startTime)) {
        errors.push(`shiftDefinitions.${index}.startTime must be HH:mm`);
      }
      if (!definition.endTime || !TIME_RE.test(definition.endTime)) {
        errors.push(`shiftDefinitions.${index}.endTime must be HH:mm`);
      }
      if (definition.startTime === definition.endTime && !definition.crossesMidnight) {
        errors.push(
          `shiftDefinitions.${index} start and end match; set crossesMidnight for a 24-hour shift`
        );
      }
      if (
        definition.startTime &&
        definition.endTime &&
        definition.endTime < definition.startTime &&
        !definition.crossesMidnight
      ) {
        errors.push(`shiftDefinitions.${index} must confirm crossesMidnight`);
      }
    }
  }
  return errors;
}

export function buildHeuristicDraft(
  prompt: string,
  timezone: string,
  today: string
): UniversalShiftSchedule | null {
  const weekdayRosterDraft = buildWeekdayRosterDraft(prompt, timezone, today);
  if (weekdayRosterDraft) return weekdayRosterDraft;

  const matched = HEURISTIC_SHIFT_SPECS.map((spec) => {
    const count = findCountForAliases(prompt, spec.aliases);
    return count > 0 ? { spec, count } : null;
  }).filter((item): item is { spec: HeuristicShiftSpec; count: number } => item !== null);

  if (matched.length === 0) return null;

  const shiftDefinitions: UniversalShiftDefinition[] = matched.map(({ spec }) => ({
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    timePolicy: spec.timePolicy,
    activePolicy: spec.activePolicy,
    startTime: spec.startTime,
    endTime: spec.endTime,
    crossesMidnight: spec.crossesMidnight,
    countsAsWork: spec.countsAsWork,
    countsAsNight: spec.countsAsNight,
    countsForStats: spec.countsForStats,
    color: spec.color,
    icon: spec.icon,
  }));

  const sequence: UniversalShiftSequenceItem[] = matched
    .flatMap(({ spec, count }) => Array.from({ length: count }, () => spec))
    .map((definition, index) => ({ id: `item-${index}`, shiftDefinitionId: definition.id }));
  const assumptions = [
    'Used common default times where the prompt did not specify exact start and end times.',
    ...(matched.some(({ spec }) => spec.id === 'custom')
      ? [
          'Mapped unsupported named duties to a configurable custom shift when no built-in kind matched.',
        ]
      : []),
  ];

  return {
    version: 3,
    name: 'AI shift schedule',
    timezone,
    anchorDate: today,
    phaseOffset: resolvePhaseOffset(prompt, matched),
    shiftDefinitions,
    sequence,
    source: 'ai',
    aiDraftMeta: {
      originalPrompt: prompt,
      confidence: 0.62,
      assumptions,
      unresolvedQuestions: [],
    },
  };
}

function buildWeekdayRosterDraft(
  prompt: string,
  timezone: string,
  today: string
): UniversalShiftSchedule | null {
  const weekSegments = extractWeekSegments(prompt);
  if (weekSegments.length === 0) return null;

  const weekCount = Math.max(...weekSegments.map((segment) => segment.weekIndex)) + 1;
  const weekAssignments: Array<Array<HeuristicShiftSpec | null>> = Array.from(
    { length: weekCount },
    () => Array.from({ length: 7 }, () => null)
  );

  for (const segment of weekSegments) {
    const assignments = parseWeekdayAssignments(segment.text);
    for (const assignment of assignments) {
      for (const dayIndex of assignment.weekdayIndexes) {
        weekAssignments[segment.weekIndex][dayIndex] = assignment.spec;
      }
    }
  }

  if (
    weekAssignments.some((week) => week.some((spec) => spec === null)) ||
    weekAssignments.every((week) => week.every((spec) => spec?.id === 'off'))
  ) {
    return null;
  }

  const orderedSpecs = Array.from(
    new Map(
      weekAssignments
        .flat()
        .filter((spec): spec is HeuristicShiftSpec => spec !== null)
        .map((spec) => [spec.id, spec])
    ).values()
  );
  const shiftDefinitions = orderedSpecs.map(specToDefinition);
  const sequence = weekAssignments
    .flat()
    .filter((spec): spec is HeuristicShiftSpec => spec !== null)
    .map((spec, index) => ({ id: `weekday-item-${index}`, shiftDefinitionId: spec.id }));
  const anchorDate = DATE_IN_TEXT_RE.exec(prompt)?.[0] ?? today;

  return {
    version: 3,
    name: weekCount === 1 ? 'Weekly roster' : `${weekCount}-week roster`,
    timezone,
    anchorDate,
    phaseOffset: 0,
    shiftDefinitions,
    sequence,
    source: 'ai',
    aiDraftMeta: {
      originalPrompt: prompt,
      confidence: 0.72,
      assumptions: [
        'Interpreted each named week from Monday through Sunday.',
        'Used common default times where the prompt did not specify exact start and end times.',
      ],
      unresolvedQuestions: [],
    },
  };
}

function extractWeekSegments(prompt: string): Array<{ weekIndex: number; text: string }> {
  const segments: Array<{ weekIndex: number; text: string }> = [];
  const weekPattern =
    /\bweek\s+(one|first|1|two|second|2|three|third|3|four|fourth|4)\b([\s\S]*?)(?=\bweek\s+(?:one|first|1|two|second|2|three|third|3|four|fourth|4)\b|$)/gi;

  for (const match of prompt.matchAll(weekPattern)) {
    const weekIndex = WEEK_ORDINALS[match[1]?.toLowerCase() ?? ''];
    const text = match[2]?.trim();
    if (weekIndex === undefined || !text) continue;
    segments.push({ weekIndex, text });
  }

  return segments;
}

function parseWeekdayAssignments(
  text: string
): Array<{ spec: HeuristicShiftSpec; weekdayIndexes: number[] }> {
  const aliasMatches = HEURISTIC_SHIFT_SPECS.flatMap((spec) =>
    spec.aliases
      .map((alias) => {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[\\s-]+');
        const match = new RegExp(`\\b${escaped}\\b`, 'i').exec(text);
        return match ? { spec, index: match.index } : null;
      })
      .filter((match): match is { spec: HeuristicShiftSpec; index: number } => match !== null)
  ).sort((a, b) => a.index - b.index);

  return aliasMatches.flatMap((match, index) => {
    const next = aliasMatches.find((candidate, candidateIndex) => {
      return candidateIndex > index && candidate.spec.id !== match.spec.id;
    });
    const phrase = text.slice(match.index, next?.index).trim();
    const weekdayIndexes = parseWeekdayIndexes(phrase);
    return weekdayIndexes.length > 0 ? [{ spec: match.spec, weekdayIndexes }] : [];
  });
}

function parseWeekdayIndexes(text: string): number[] {
  const indexes = new Set<number>();
  const dayName = Object.keys(WEEKDAY_INDEXES).join('|');
  const rangePattern = new RegExp(
    `\\b(${dayName})\\b\\s*(?:through|thru|to|until|-|–)\\s*\\b(${dayName})\\b`,
    'gi'
  );

  for (const match of text.matchAll(rangePattern)) {
    const start = WEEKDAY_INDEXES[match[1]?.toLowerCase() ?? ''];
    const end = WEEKDAY_INDEXES[match[2]?.toLowerCase() ?? ''];
    if (start === undefined || end === undefined) continue;

    const span = end >= start ? end - start : end + 7 - start;
    for (let offset = 0; offset <= span; offset += 1) {
      indexes.add((start + offset) % 7);
    }
  }

  const singlePattern = new RegExp(`\\b(${dayName})\\b`, 'gi');
  for (const match of text.matchAll(singlePattern)) {
    const index = WEEKDAY_INDEXES[match[1]?.toLowerCase() ?? ''];
    if (index !== undefined) indexes.add(index);
  }

  return [...indexes].sort((a, b) => a - b);
}

function specToDefinition(spec: HeuristicShiftSpec): UniversalShiftDefinition {
  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    timePolicy: spec.timePolicy,
    activePolicy: spec.activePolicy,
    startTime: spec.startTime,
    endTime: spec.endTime,
    crossesMidnight: spec.crossesMidnight,
    countsAsWork: spec.countsAsWork,
    countsAsNight: spec.countsAsNight,
    countsForStats: spec.countsForStats,
    color: spec.color,
    icon: spec.icon,
  };
}

function findCountForAliases(prompt: string, aliases: string[]): number {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '[\\s-]+');
    const before = new RegExp(`(\\d+)\\s*(?:x\\s*)?(?:${escaped})\\b`, 'i').exec(prompt);
    if (before) return Number(before[1]);
    const after = new RegExp(`\\b(?:${escaped})\\s*(?:for\\s*)?(\\d+)\\b`, 'i').exec(prompt);
    if (after) return Number(after[1]);
  }
  return 0;
}

function resolvePhaseOffset(
  prompt: string,
  matched: Array<{ spec: { id: string }; count: number }>
): number {
  const first = /\bfirst\s+([a-z_-]+)/i.exec(prompt)?.[1]?.toLowerCase();
  if (!first) return 0;

  let offset = 0;
  for (const { spec, count } of matched) {
    if (spec.id.includes(first) || first.includes(spec.id)) return offset;
    offset += count;
  }
  return 0;
}
