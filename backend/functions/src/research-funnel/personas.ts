import type { PersonaClassificationResult, ResearchLead, ShiftWorkerPersonaId } from './types';

type PersonaRule = {
  personaId: ShiftWorkerPersonaId;
  jobTitleKeywords: string[];
  contextKeywords: string[];
  rosterBonus?: 'rotating' | 'fifo';
};

const PERSONA_RULES: PersonaRule[] = [
  {
    personaId: 'underground-production-operator',
    jobTitleKeywords: [
      'jumbo',
      'bogger',
      'loader',
      'haul truck',
      'truck operator',
      'driller',
      'shotfirer',
      'production operator',
      'underground operator',
      'miner',
    ],
    contextKeywords: ['days', 'nights', 'off', 'cycle', 'rotation', 'swing'],
    rosterBonus: 'rotating',
  },
  {
    personaId: 'fifo-field-worker',
    jobTitleKeywords: [
      'fifo',
      'field service',
      'shutdown',
      'contractor',
      'site worker',
      'remote site',
    ],
    contextKeywords: ['fly in', 'fly out', 'swing home', 'work block', 'rest block', 'roster'],
    rosterBonus: 'fifo',
  },
  {
    personaId: 'maintenance-trades-miner',
    jobTitleKeywords: [
      'boilermaker',
      'fitter',
      'electrician',
      'diesel mechanic',
      'mechanic',
      'maintainer',
      'maintenance',
      'fixed plant',
      'auto sparky',
    ],
    contextKeywords: ['turnaround', 'fatigue', 'prep', 'start time', 'night shift'],
  },
  {
    personaId: 'process-plant-control-room-operator',
    jobTitleKeywords: [
      'process operator',
      'plant operator',
      'control room',
      'control-room',
      'mill operator',
      'processing',
    ],
    contextKeywords: ['panel', 'plant', 'control room', 'pattern', 'night shift'],
    rosterBonus: 'rotating',
  },
  {
    personaId: 'crew-lead-supervisor',
    jobTitleKeywords: [
      'supervisor',
      'foreman',
      'crew lead',
      'team lead',
      'coordinator',
      'superintendent',
    ],
    contextKeywords: ['crew', 'handover', 'shift plan', 'people'],
  },
  {
    personaId: 'healthcare-rotating-clinician',
    jobTitleKeywords: [
      'nurse',
      'registered nurse',
      'enrolled nurse',
      'midwife',
      'paramedic',
      'doctor',
      'resident',
      'clinician',
      'care worker',
      'healthcare assistant',
    ],
    contextKeywords: ['ward', 'hospital', 'clinic', 'handover', 'nights', 'on call', 'rota'],
    rosterBonus: 'rotating',
  },
  {
    personaId: 'security-operations-officer',
    jobTitleKeywords: [
      'security',
      'guard',
      'security officer',
      'control room operator',
      'patrol',
      'dispatcher',
      'emergency services',
      'firefighter',
      'police',
    ],
    contextKeywords: ['patrol', 'post', 'site rotation', 'control room', 'night shift', 'coverage'],
    rosterBonus: 'rotating',
  },
  {
    personaId: 'transport-logistics-shift-worker',
    jobTitleKeywords: [
      'driver',
      'truck driver',
      'bus driver',
      'train driver',
      'rail',
      'aviation',
      'ground crew',
      'dispatcher',
      'logistics',
      'warehouse',
      'operator',
    ],
    contextKeywords: ['route', 'depot', 'terminal', 'dispatch', 'early start', 'late finish'],
    rosterBonus: 'rotating',
  },
  {
    personaId: 'hospitality-manufacturing-shift-worker',
    jobTitleKeywords: [
      'chef',
      'cook',
      'bartender',
      'front desk',
      'hotel',
      'factory operator',
      'production worker',
      'machine operator',
      'manufacturing',
      'plant operator',
    ],
    contextKeywords: ['venue', 'factory', 'plant', 'line', 'weekend', 'split shift', 'night shift'],
    rosterBonus: 'rotating',
  },
];

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function countKeywordHits(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

export function classifyShiftWorkerPersona(lead: ResearchLead): PersonaClassificationResult {
  const jobTitle = normalize(lead.jobTitle);
  const context = normalize(
    [lead.lastPainSummary, lead.lastWorkaroundSummary, lead.lastOutcomeSummary]
      .filter(Boolean)
      .join(' ')
  );

  let bestPersona: ShiftWorkerPersonaId = 'unknown';
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const rule of PERSONA_RULES) {
    const jobSignals = countKeywordHits(jobTitle, rule.jobTitleKeywords);
    const contextSignals = countKeywordHits(context, rule.contextKeywords);
    let score = jobSignals.length * 3 + contextSignals.length * 2;

    if (rule.rosterBonus && lead.signals.rosterTypeHint === rule.rosterBonus) {
      score += 3;
    }

    if (score > bestScore) {
      bestPersona = rule.personaId;
      bestScore = score;
      bestSignals = [...jobSignals, ...contextSignals];
    }
  }

  if (bestScore <= 0) {
    return {
      personaId: 'unknown',
      confidence: 0,
      matchedSignals: [],
    };
  }

  return {
    personaId: bestPersona,
    confidence: Math.min(1, Number((bestScore / 10).toFixed(2))),
    matchedSignals: bestSignals,
  };
}
