import type { UniversalShiftDefinition, UniversalShiftSchedule } from '@/types';

export type UniversalShiftTemplateIndustry =
  | 'healthcare'
  | 'security'
  | 'emergency_services'
  | 'manufacturing'
  | 'transport_logistics'
  | 'hospitality_retail'
  | 'aviation_rail'
  | 'mining_fifo';

export interface UniversalShiftTemplate {
  id: string;
  industry: UniversalShiftTemplateIndustry;
  title: string;
  subtitle: string;
  aiPromptExample: string;
  schedule: UniversalShiftSchedule;
}

const updatedAt = '2026-05-28T00:00:00.000Z';

const definition = (
  id: string,
  name: string,
  startTime: string | undefined,
  endTime: string | undefined,
  color: string,
  icon: string,
  options: Partial<UniversalShiftDefinition> = {}
): UniversalShiftDefinition => ({
  id,
  name,
  kind: startTime && endTime ? 'work' : 'off',
  timePolicy: startTime && endTime ? 'timed' : 'none',
  activePolicy: startTime && endTime ? 'timed_window' : 'not_active',
  startTime,
  endTime,
  crossesMidnight: Boolean(startTime && endTime && endTime <= startTime),
  countsAsWork: Boolean(startTime && endTime),
  countsAsNight: Boolean(startTime && endTime && (startTime >= '18:00' || endTime <= '07:00')),
  countsForStats: true,
  color,
  icon,
  ...options,
});

const sequence = (items: Array<[string, number]>) =>
  items.flatMap(([shiftDefinitionId, count]) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${shiftDefinitionId}-${index + 1}`,
      shiftDefinitionId,
    }))
  );

const schedule = (
  name: string,
  shiftDefinitions: UniversalShiftDefinition[],
  sequenceItems: Array<[string, number]>,
  phaseOffset = 0
): UniversalShiftSchedule => ({
  version: 3,
  name,
  timezone: 'UTC',
  anchorDate: '2026-05-28',
  phaseOffset,
  source: 'template',
  updatedAt,
  shiftDefinitions,
  sequence: sequence(sequenceItems),
});

const day = definition('day', 'Day Shift', '07:00', '19:00', '#2563EB', 'sunny');
const night = definition('night', 'Night Shift', '19:00', '07:00', '#6D28D9', 'moon');
const off = definition('off', 'Day Off', undefined, undefined, '#94A3B8', 'home', {
  kind: 'off',
});
const early = definition('early', 'Early Shift', '05:00', '13:00', '#0EA5E9', 'partly-sunny');
const late = definition('late', 'Late Shift', '13:00', '21:00', '#F59E0B', 'time');
const travel = definition('travel', 'Travel Day', '08:00', '16:00', '#14B8A6', 'airplane', {
  kind: 'travel',
  reminderProfile: { earlyReminderHours: 24 },
});

export const UNIVERSAL_SHIFT_TEMPLATES: UniversalShiftTemplate[] = [
  {
    id: 'healthcare-2-2-3',
    industry: 'healthcare',
    title: 'Healthcare 2-2-3',
    subtitle: 'Two days, two off, three nights/off rotation used by hospital teams.',
    aiPromptExample:
      'I am a nurse working 2 day shifts, 2 days off, 3 night shifts, then 2 days off.',
    schedule: schedule(
      'Healthcare 2-2-3',
      [day, night, off],
      [
        ['day', 2],
        ['off', 2],
        ['night', 3],
        ['off', 2],
      ]
    ),
  },
  {
    id: 'security-4-4',
    industry: 'security',
    title: 'Security 4 Days / 4 Nights / 4 Off',
    subtitle: 'A common security rotation with equal day, night, and rest blocks.',
    aiPromptExample: 'I work security: 4 days 6am to 6pm, 4 nights 6pm to 6am, then 4 off.',
    schedule: schedule(
      'Security 4/4/4',
      [day, night, off],
      [
        ['day', 4],
        ['night', 4],
        ['off', 4],
      ]
    ),
  },
  {
    id: 'emergency-24-48',
    industry: 'emergency_services',
    title: 'Emergency 24/48',
    subtitle: 'One full-day duty period followed by two recovery days.',
    aiPromptExample: 'I work a 24-hour paramedic shift from 8am, then 48 hours off.',
    schedule: schedule(
      'Emergency 24/48',
      [
        definition('duty24', '24h Duty', '08:00', '08:00', '#DC2626', 'medical', {
          durationMinutes: 1440,
          crossesMidnight: true,
          reminderProfile: { earlyReminderHours: 12 },
        }),
        off,
      ],
      [
        ['duty24', 1],
        ['off', 2],
      ]
    ),
  },
  {
    id: 'manufacturing-continental',
    industry: 'manufacturing',
    title: 'Manufacturing Continental',
    subtitle: 'Day/night manufacturing pattern with a longer rest block.',
    aiPromptExample: 'I work a continental plant roster with 2 days, 2 nights, then 4 off.',
    schedule: schedule(
      'Manufacturing Continental',
      [day, night, off],
      [
        ['day', 2],
        ['night', 2],
        ['off', 4],
      ]
    ),
  },
  {
    id: 'transport-early-late-night',
    industry: 'transport_logistics',
    title: 'Transport Early / Late / Night',
    subtitle: 'Three-shift rotation for depots, rail, logistics, and control rooms.',
    aiPromptExample: 'I work 2 early shifts, 2 late shifts, 2 night shifts, then 4 off.',
    schedule: schedule(
      'Transport Early/Late/Night',
      [early, late, night, off],
      [
        ['early', 2],
        ['late', 2],
        ['night', 2],
        ['off', 4],
      ]
    ),
  },
  {
    id: 'hospitality-5-2',
    industry: 'hospitality_retail',
    title: 'Hospitality Five On / Two Off',
    subtitle: 'Simple repeating week for venue, retail, hotel, and duty managers.',
    aiPromptExample: 'I work five late shifts from 2pm to 10pm, then two days off.',
    schedule: schedule(
      'Hospitality 5/2',
      [late, off],
      [
        ['late', 5],
        ['off', 2],
      ]
    ),
  },
  {
    id: 'aviation-early-late-night',
    industry: 'aviation_rail',
    title: 'Aviation Early / Late / Night',
    subtitle: 'Airport and rail operations pattern with early starts and overnight coverage.',
    aiPromptExample:
      'Airport operations: 2 early, 2 late, 2 night, 4 days off, starting first late.',
    schedule: schedule(
      'Aviation Early/Late/Night',
      [early, late, night, off],
      [
        ['early', 2],
        ['late', 2],
        ['night', 2],
        ['off', 4],
      ],
      2
    ),
  },
  {
    id: 'mining-fifo-14-14',
    industry: 'mining_fifo',
    title: 'Mining FIFO 14/14',
    subtitle: 'Launch-wedge FIFO template for mining and remote site crews.',
    aiPromptExample: 'I do FIFO mining: 14 days on site, travel home, then 14 days off.',
    schedule: schedule(
      'Mining FIFO 14/14',
      [day, travel, off],
      [
        ['day', 14],
        ['travel', 1],
        ['off', 14],
      ]
    ),
  },
];
