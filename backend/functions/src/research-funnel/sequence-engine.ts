import { classifyMinerPersona } from './personas';
import { scoreResearchLead } from './score-lead';
import type { MinerPersonaId, ResearchLead, ResearchStage, SequencePlan } from './types';

type DayPrompt = {
  default: string;
  variants?: Partial<Record<MinerPersonaId, string>>;
};

const DAY_PROMPTS: Record<number, DayPrompt> = {
  1: {
    default:
      'What roster are you on right now, and what part of keeping track of it is the most annoying?',
    variants: {
      'underground-production-operator':
        'Do you ever lose track of whether the next swing is days, nights, or off?',
      'fifo-field-worker':
        'What is harder to keep straight for you: next swing in, next swing home, or planning around the block?',
    },
  },
  2: {
    default:
      'How do you keep track today: head math, screenshot, paper, calendar, WhatsApp, spreadsheet, or something else?',
  },
  3: {
    default:
      'What is the last real problem this caused for you: wrong alarm, late planning, family clash, travel confusion, or something else?',
  },
  4: {
    default:
      'When do you usually need the answer fast: the night before, pre-dawn, during handover, or when planning time off?',
  },
  5: {
    default:
      'How far ahead do you usually need to trust the roster: tomorrow, next week, next swing, or months out for life planning?',
  },
  6: {
    default:
      'If one tool fixed this properly, what would it need to answer in under 10 seconds for you?',
  },
  7: {
    default:
      'We’re building Ellie around exactly this problem. Want early access when the next version is ready?',
  },
};

function normalizeSequenceDay(sequenceDay: number): number {
  if (!Number.isFinite(sequenceDay) || sequenceDay < 1) {
    return 1;
  }
  if (sequenceDay > 7) {
    return 7;
  }
  return Math.floor(sequenceDay);
}

function choosePrompt(day: number, personaId: MinerPersonaId): string {
  const prompt = DAY_PROMPTS[day];
  if (!prompt) {
    return DAY_PROMPTS[7].default;
  }
  return prompt.variants?.[personaId] ?? prompt.default;
}

function buildEllieIntroMessage(lead: ResearchLead): string {
  const painSummary = lead.lastPainSummary?.trim();
  if (painSummary) {
    return `We’re building Ellie around exactly this problem: ${painSummary}. Want early access when the next version is ready?`;
  }

  return DAY_PROMPTS[7].default;
}

function activeOrAwaitingStage(currentStage: ResearchStage): ResearchStage {
  if (currentStage === 'awaiting_reply') {
    return 'awaiting_reply';
  }

  return 'active_sequence';
}

export function planNextResearchMessage(lead: ResearchLead): SequencePlan {
  const classification = classifyMinerPersona(lead);
  const scoring = scoreResearchLead({
    ...lead,
    personaId: lead.personaId ?? classification.personaId,
  });
  const personaId = lead.personaId ?? classification.personaId;

  if (scoring.disqualified) {
    return {
      action: 'close_not_fit',
      personaId,
      messageDay: null,
      nextSequenceDay: normalizeSequenceDay(lead.sequenceDay),
      nextStage: 'not_fit',
      message: null,
      reason: 'Lead is disqualified because the problem does not fit Ellie’s current wedge.',
    };
  }

  if (lead.contact.optInStatus !== 'opted_in') {
    return {
      action: 'hold',
      personaId,
      messageDay: null,
      nextSequenceDay: normalizeSequenceDay(lead.sequenceDay),
      nextStage: 'consent_pending',
      message: null,
      reason: 'Lead cannot receive automated outreach without direct opt-in.',
    };
  }

  if (lead.consecutiveMisses >= 2) {
    return {
      action: 'pause_no_reply',
      personaId,
      messageDay: null,
      nextSequenceDay: normalizeSequenceDay(lead.sequenceDay),
      nextStage: 'paused_no_reply',
      message: null,
      reason: 'Lead ignored two outreach attempts in a row and should be paused.',
    };
  }

  const day = normalizeSequenceDay(lead.sequenceDay);

  if (scoring.introEligible && day >= 7) {
    return {
      action: 'send_ellie_intro',
      personaId,
      messageDay: 7,
      nextSequenceDay: 7,
      nextStage: 'ellie_intro_ready',
      message: buildEllieIntroMessage(lead),
      reason: 'Lead is qualified for Ellie introduction.',
    };
  }

  return {
    action: 'send_question',
    personaId,
    messageDay: day,
    nextSequenceDay: Math.min(day + 1, 7),
    nextStage: activeOrAwaitingStage(lead.stage),
    message: choosePrompt(day, personaId),
    reason: `Lead should receive the Day ${day} research question.`,
  };
}
