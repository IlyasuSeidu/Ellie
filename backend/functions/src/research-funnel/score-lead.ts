import { classifyMinerPersona } from './personas';
import type { BuyingReadiness, LeadScoreBreakdown, PainSeverity, ResearchLead } from './types';

function roleFitScore(lead: ResearchLead): number {
  const personaId = lead.personaId ?? classifyMinerPersona(lead).personaId;

  switch (personaId) {
    case 'underground-production-operator':
    case 'fifo-field-worker':
    case 'maintenance-trades-miner':
    case 'process-plant-control-room-operator':
      return 20;
    case 'crew-lead-supervisor':
      return 14;
    default:
      return 0;
  }
}

function rosterFitScore(lead: ResearchLead): number {
  switch (lead.signals.rosterTypeHint) {
    case 'fifo':
      return lead.signals.rosterComplexity === 'high' ? 20 : 16;
    case 'rotating':
      return lead.signals.rosterComplexity === 'high' ? 20 : 16;
    case 'fixed':
      return 6;
    default:
      return 0;
  }
}

function problemFitScore(lead: ResearchLead): number {
  if (lead.signals.wantsCrewScheduling) {
    return 0;
  }

  const signalCount = lead.signals.problemFitSignals.length;
  if (signalCount >= 3) {
    return 20;
  }
  if (signalCount === 2) {
    return 14;
  }
  if (signalCount === 1) {
    return 6;
  }
  return 0;
}

function replyDepthScore(lead: ResearchLead): number {
  if (lead.signals.substantiveReplyCount >= 2) {
    return 10;
  }
  if (lead.signals.substantiveReplyCount === 1) {
    return 6;
  }
  if (lead.signals.replyCount > 0) {
    return 2;
  }
  return 0;
}

function contactQualityScore(lead: ResearchLead): number {
  const hasDirectChannel = Boolean(lead.contact.email || lead.contact.whatsappNumber);
  if (lead.contact.optInStatus === 'opted_in' && hasDirectChannel) {
    return 10;
  }
  if (hasDirectChannel) {
    return 6;
  }
  return 0;
}

function painUrgencyScore(painSeverity: PainSeverity): number {
  switch (painSeverity) {
    case 'high':
      return 10;
    case 'medium':
      return 6;
    case 'low':
      return 3;
    default:
      return 0;
  }
}

function buyingReadinessScore(value: BuyingReadiness): number {
  switch (value) {
    case 'asks_for_solution':
      return 10;
    case 'asks_to_be_updated':
      return 8;
    case 'curious':
      return 4;
    default:
      return 0;
  }
}

export function scoreResearchLead(lead: ResearchLead): LeadScoreBreakdown {
  const reasons: string[] = [];
  const resolvedPersona = lead.personaId ?? classifyMinerPersona(lead).personaId;
  const roleFit = roleFitScore({ ...lead, personaId: resolvedPersona });
  const rosterFit = rosterFitScore(lead);
  const problemFit = problemFitScore(lead);
  const replyDepth = replyDepthScore(lead);
  const contactQuality = contactQualityScore(lead);
  const painUrgency = painUrgencyScore(lead.signals.painSeverity);
  const buyingReadiness = buyingReadinessScore(lead.signals.buyingReadiness);
  const staticFitScore = roleFit + rosterFit + problemFit;
  const dynamicScore = replyDepth + contactQuality + painUrgency + buyingReadiness;
  const totalScore = staticFitScore + dynamicScore;

  let disqualified = false;

  if (resolvedPersona === 'unknown') {
    reasons.push('No clear mining persona match found.');
  } else {
    reasons.push(`Persona matched: ${resolvedPersona}.`);
  }

  if (lead.signals.wantsCrewScheduling) {
    disqualified = true;
    reasons.push('Lead primarily wants crew scheduling rather than personal roster certainty.');
  }

  if (lead.signals.rosterTypeHint === 'fixed') {
    reasons.push('Lead appears to work a fixed shift with lower roster complexity.');
  }

  if (lead.signals.problemFitSignals.length > 0) {
    reasons.push(`Problem-fit signals: ${lead.signals.problemFitSignals.join(', ')}.`);
  }

  if (lead.signals.wantsPlannedFeaturesOnly) {
    reasons.push('Lead is asking for planned features rather than today’s core wedge.');
  }

  const introEligible =
    !disqualified &&
    totalScore >= 65 &&
    staticFitScore >= 40 &&
    lead.signals.substantiveReplyCount >= 2 &&
    lead.contact.optInStatus === 'opted_in' &&
    !lead.signals.wantsPlannedFeaturesOnly;

  if (introEligible) {
    reasons.push('Lead is eligible for Ellie introduction.');
  }

  return {
    roleFitScore: roleFit,
    rosterFitScore: rosterFit,
    problemFitScore: problemFit,
    replyDepthScore: replyDepth,
    contactQualityScore: contactQuality,
    painUrgencyScore: painUrgency,
    buyingReadinessScore: buyingReadiness,
    staticFitScore,
    dynamicScore,
    totalScore,
    introEligible,
    disqualified,
    reasons,
  };
}
