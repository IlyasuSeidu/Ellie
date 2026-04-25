export type MinerPersonaId =
  | 'underground-production-operator'
  | 'fifo-field-worker'
  | 'maintenance-trades-miner'
  | 'process-plant-control-room-operator'
  | 'crew-lead-supervisor'
  | 'unknown';

export type ResearchStage =
  | 'new'
  | 'consent_pending'
  | 'opted_in'
  | 'enriched'
  | 'active_sequence'
  | 'awaiting_reply'
  | 'paused_no_reply'
  | 'fit_review'
  | 'ellie_intro_ready'
  | 'ellie_intro_sent'
  | 'research_only'
  | 'not_fit'
  | 'closed';

export type ChannelType = 'email' | 'whatsapp';
export type ContactOptInStatus = 'unknown' | 'opted_in' | 'blocked';
export type RosterHint = 'rotating' | 'fifo' | 'fixed' | 'unknown';
export type RosterComplexity = 'none' | 'simple' | 'moderate' | 'high';
export type PainSeverity = 'none' | 'low' | 'medium' | 'high';
export type BuyingReadiness = 'none' | 'curious' | 'asks_to_be_updated' | 'asks_for_solution';

export interface LeadContact {
  preferredChannel?: ChannelType;
  email?: string;
  whatsappNumber?: string;
  optInStatus: ContactOptInStatus;
}

export interface LeadSignals {
  rosterTypeHint: RosterHint;
  rosterComplexity: RosterComplexity;
  problemFitSignals: string[];
  replyCount: number;
  substantiveReplyCount: number;
  painSeverity: PainSeverity;
  buyingReadiness: BuyingReadiness;
  wantsCrewScheduling: boolean;
  wantsPlannedFeaturesOnly: boolean;
}

export interface ResearchLead {
  leadId: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  country?: string;
  personaId?: MinerPersonaId;
  stage: ResearchStage;
  sequenceDay: number;
  consecutiveMisses: number;
  contact: LeadContact;
  signals: LeadSignals;
  lastPainSummary?: string;
  lastWorkaroundSummary?: string;
  lastOutcomeSummary?: string;
}

export interface PersonaClassificationResult {
  personaId: MinerPersonaId;
  confidence: number;
  matchedSignals: string[];
}

export interface LeadScoreBreakdown {
  roleFitScore: number;
  rosterFitScore: number;
  problemFitScore: number;
  replyDepthScore: number;
  contactQualityScore: number;
  painUrgencyScore: number;
  buyingReadinessScore: number;
  staticFitScore: number;
  dynamicScore: number;
  totalScore: number;
  introEligible: boolean;
  disqualified: boolean;
  reasons: string[];
}

export type SequencePlanAction =
  | 'hold'
  | 'send_question'
  | 'send_ellie_intro'
  | 'pause_no_reply'
  | 'close_not_fit';

export interface SequencePlan {
  action: SequencePlanAction;
  personaId: MinerPersonaId;
  messageDay: number | null;
  nextSequenceDay: number;
  nextStage: ResearchStage;
  message: string | null;
  reason: string;
}
