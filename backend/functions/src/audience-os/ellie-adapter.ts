import {
  classifyMinerPersona,
  planNextResearchMessage,
  scoreResearchLead,
  type ResearchLead,
} from '../research-funnel';
import type {
  AudienceLead,
  AudienceProductAdapter,
  LeadAssessment,
  ProductManifest,
  ResearchTaskPlan,
} from './types';

function buildDefaultResearchLead(lead: AudienceLead): ResearchLead {
  return {
    leadId: lead.leadId,
    fullName: lead.profile.fullName,
    jobTitle: lead.profile.jobTitle,
    company: lead.profile.company,
    country: lead.profile.country,
    personaId: lead.personaId as ResearchLead['personaId'],
    stage:
      lead.stage === 'blocked'
        ? 'not_fit'
        : lead.stage === 'consent_pending'
          ? 'consent_pending'
          : 'opted_in',
    sequenceDay: lead.sequenceDay,
    consecutiveMisses: lead.conversation.consecutiveMisses,
    contact: {
      preferredChannel: lead.contact.preferredChannel === 'whatsapp' ? 'whatsapp' : 'email',
      email: lead.contact.email,
      whatsappNumber: lead.contact.whatsappNumber,
      optInStatus:
        lead.contact.consentStatus === 'blocked'
          ? 'blocked'
          : lead.contact.consentStatus === 'opted_in'
            ? 'opted_in'
            : 'unknown',
    },
    signals: {
      rosterTypeHint: 'unknown',
      rosterComplexity: 'none',
      problemFitSignals: [],
      replyCount: lead.conversation.replyCount,
      substantiveReplyCount: lead.conversation.substantiveReplyCount,
      painSeverity: 'none',
      buyingReadiness: 'none',
      wantsCrewScheduling: false,
      wantsPlannedFeaturesOnly: false,
    },
    lastPainSummary: lead.conversation.lastPainSummary,
    lastWorkaroundSummary: lead.conversation.lastWorkaroundSummary,
    lastOutcomeSummary: lead.conversation.lastOutcomeSummary,
  };
}

function toResearchLead(lead: AudienceLead): ResearchLead {
  if (!lead.researchProfile) {
    return buildDefaultResearchLead(lead);
  }

  return {
    ...buildDefaultResearchLead(lead),
    ...lead.researchProfile,
    leadId: lead.leadId,
    fullName: lead.profile.fullName ?? lead.researchProfile.fullName,
    jobTitle: lead.profile.jobTitle ?? lead.researchProfile.jobTitle,
    company: lead.profile.company ?? lead.researchProfile.company,
    country: lead.profile.country ?? lead.researchProfile.country,
    sequenceDay: lead.sequenceDay,
    consecutiveMisses: lead.conversation.consecutiveMisses,
    lastPainSummary: lead.conversation.lastPainSummary ?? lead.researchProfile.lastPainSummary,
    lastWorkaroundSummary:
      lead.conversation.lastWorkaroundSummary ?? lead.researchProfile.lastWorkaroundSummary,
    lastOutcomeSummary:
      lead.conversation.lastOutcomeSummary ?? lead.researchProfile.lastOutcomeSummary,
    contact: {
      ...lead.researchProfile.contact,
      email: lead.contact.email ?? lead.researchProfile.contact.email,
      whatsappNumber: lead.contact.whatsappNumber ?? lead.researchProfile.contact.whatsappNumber,
      preferredChannel:
        lead.contact.preferredChannel === 'whatsapp'
          ? 'whatsapp'
          : (lead.researchProfile.contact.preferredChannel ?? 'email'),
      optInStatus:
        lead.contact.consentStatus === 'blocked'
          ? 'blocked'
          : lead.contact.consentStatus === 'opted_in'
            ? 'opted_in'
            : lead.researchProfile.contact.optInStatus,
    },
    signals: {
      ...lead.researchProfile.signals,
      replyCount: lead.conversation.replyCount,
      substantiveReplyCount: lead.conversation.substantiveReplyCount,
    },
  };
}

export const ellieAudienceAdapter: AudienceProductAdapter = {
  adapterId: 'ellie',
  assessLead(_manifest: ProductManifest, lead: AudienceLead): LeadAssessment {
    const researchLead = toResearchLead(lead);
    const classification = classifyMinerPersona(researchLead);
    const score = scoreResearchLead({
      ...researchLead,
      personaId: classification.personaId,
    });

    return {
      leadId: lead.leadId,
      personaId: classification.personaId,
      personaConfidence: classification.confidence,
      matchedSignals: classification.matchedSignals,
      score,
      introEligible: score.introEligible,
      reasons: score.reasons,
    };
  },
  planResearchStep(
    _manifest: ProductManifest,
    lead: AudienceLead,
    _assessment: LeadAssessment
  ): ResearchTaskPlan {
    const researchLead = toResearchLead(lead);
    const plan = planNextResearchMessage(researchLead);

    switch (plan.action) {
      case 'send_question':
        return {
          action: 'send_question',
          nextStage: 'awaiting_reply',
          nextSequenceDay: plan.nextSequenceDay,
          message: plan.message,
          reason: plan.reason,
          subagentId: 'discovery-interviewer',
        };
      case 'send_ellie_intro':
        return {
          action: 'send_intro',
          nextStage: 'intro_ready',
          nextSequenceDay: plan.nextSequenceDay,
          message: plan.message,
          reason: plan.reason,
          subagentId: 'intro-gatekeeper',
        };
      case 'pause_no_reply':
        return {
          action: 'pause',
          nextStage: 'paused',
          nextSequenceDay: plan.nextSequenceDay,
          message: null,
          reason: plan.reason,
          subagentId: 'reactivation-specialist',
        };
      case 'close_not_fit':
        return {
          action: 'close_not_fit',
          nextStage: 'not_fit',
          nextSequenceDay: plan.nextSequenceDay,
          message: null,
          reason: plan.reason,
        };
      default:
        return {
          action: 'hold',
          nextStage: lead.stage,
          nextSequenceDay: lead.sequenceDay,
          message: null,
          reason: plan.reason,
        };
    }
  },
};
