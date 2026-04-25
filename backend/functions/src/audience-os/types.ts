import type { LeadScoreBreakdown, ResearchLead } from '../research-funnel';

export type AgentId =
  | 'orchestrator'
  | 'lead-gen-operator'
  | 'research-writer'
  | 'inbound-intake'
  | 'lead-scorer'
  | 'conversation-operator'
  | 'activation-operator'
  | 'conversion-operator'
  | 'retention-operator'
  | 'product-learning'
  | 'trust-governor'
  | 'sheet-sync-operator';

export type AudienceStage =
  | 'new'
  | 'sourced'
  | 'consent_pending'
  | 'opted_in'
  | 'enriched'
  | 'active_sequence'
  | 'awaiting_reply'
  | 'intro_ready'
  | 'intro_sent'
  | 'activated'
  | 'paid'
  | 'retained'
  | 'advocate'
  | 'research_only'
  | 'paused'
  | 'not_fit'
  | 'blocked'
  | 'closed';

export type ApprovedSourceType =
  | 'opt_in_form'
  | 'manual_list'
  | 'sales_nav_export'
  | 'referral'
  | 'event'
  | 'community'
  | 'csv_import';

export type ContactChannel = 'email' | 'whatsapp' | 'telegram' | 'linkedin';
export type ConsentStatus = 'unknown' | 'opted_in' | 'blocked';
export type Priority = 'low' | 'medium' | 'high';
export type ActivationStatus = 'not_started' | 'onboarding' | 'first_value' | 'activated';
export type PaymentStatus = 'none' | 'trial' | 'paid';
export type AdvocacyStatus = 'none' | 'candidate' | 'advocate';
export type ProductStage = 'idea' | 'prototype' | 'beta' | 'live';
export type RelationshipWarmth = 'cold' | 'warm' | 'referred' | 'community';

export interface ProductBrandVoice {
  tones: string[];
  bannedPhrases: string[];
  preferredVocabulary?: string[];
  signatureStyle?: string;
}

export interface ProductOnboardingProfile {
  productStage: ProductStage;
  productType: string;
  deliveryModel: string;
  salesMotion: string;
  pricingModel: string;
  primaryAudienceOutcome: string;
  primaryConversionEvent: string;
  activationMoment: string;
  retentionMoment: string;
  geographyFocus: string[];
  languageSupport: string[];
  supportChannels: string[];
  approvedContactChannels: ContactChannel[];
  trustConstraints: string[];
  forbiddenClaims: string[];
  brandVoice: ProductBrandVoice;
  operatorNotes?: string[];
}

export interface ProductOnboardingQuestion {
  id: string;
  category: 'product' | 'audience' | 'conversion' | 'messaging' | 'trust' | 'operations';
  fieldPath: string;
  required: boolean;
  question: string;
  whyItMatters: string;
}

export interface AudienceRelationshipContext {
  warmth?: RelationshipWarmth;
  sourceContext?: string;
  mutualContext: string[];
  lastHook?: string;
}

export interface AudienceProfile {
  timezone?: string;
  language?: string;
  roleSeniority?: string;
  department?: string;
  responsibilities: string[];
  goals: string[];
  frustrations: string[];
  currentTools: string[];
  preferredTone?: 'direct' | 'casual' | 'technical' | 'warm' | 'practical';
  communicationStyleNotes: string[];
  buyingTriggers: string[];
  objections: string[];
  lifeContext: string[];
  personalFacts: string[];
  relationship: AudienceRelationshipContext;
}

export interface ProductPersona {
  personaId: string;
  label: string;
  titles: string[];
  corePains: string[];
  bestHooks: string[];
}

export interface ProductManifest {
  productId: string;
  name: string;
  category: string;
  oneSentencePositioning: string;
  targetAudience: ProductPersona[];
  currentStrengths: string[];
  plannedFeatures: string[];
  highFitSignals: string[];
  disqualifiers: string[];
  introRules: {
    minTotalScore: number;
    minStaticFitScore: number;
    minSubstantiveReplies: number;
    requireOptIn: boolean;
  };
  sequenceQuestions: Record<string, string>;
  activationGoals?: string[];
  conversionOffers?: string[];
  retentionGoals?: string[];
  onboarding?: ProductOnboardingProfile;
}

export interface RawLeadInput {
  externalId?: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  country?: string;
  profileUrl?: string;
  sourceType: ApprovedSourceType;
  sourceLabel: string;
  preferredChannel?: ContactChannel;
  email?: string;
  whatsappNumber?: string;
  telegramHandle?: string;
  linkedinUrl?: string;
  consentStatus?: ConsentStatus;
  notes?: string[];
  tags?: string[];
  capturedAt?: string;
  researchProfile?: Partial<ResearchLead>;
  audienceProfile?: Partial<AudienceProfile>;
}

export interface AudienceContact {
  preferredChannel?: ContactChannel;
  email?: string;
  whatsappNumber?: string;
  telegramHandle?: string;
  linkedinUrl?: string;
  consentStatus: ConsentStatus;
}

export interface LeadSource {
  sourceType: ApprovedSourceType;
  sourceLabel: string;
  externalId?: string;
  capturedAt: string;
}

export interface AudienceConversationState {
  replyCount: number;
  substantiveReplyCount: number;
  consecutiveMisses: number;
  lastPainSummary?: string;
  lastWorkaroundSummary?: string;
  lastOutcomeSummary?: string;
  lastInboundAt?: string;
  lastOutboundAt?: string;
}

export interface LeadLifecycleState {
  activationStatus: ActivationStatus;
  paymentStatus: PaymentStatus;
  advocacyStatus: AdvocacyStatus;
}

export interface LeadOperationalState {
  ownerAgent?: AgentId;
  nextAction?: string;
  nextActionAt?: string;
  lastAgent?: AgentId;
  lastActionSummary?: string;
  lastActionAt?: string;
}

export interface AudienceLead {
  leadId: string;
  productId: string;
  stage: AudienceStage;
  sequenceDay: number;
  profile: {
    fullName?: string;
    jobTitle?: string;
    company?: string;
    country?: string;
    profileUrl?: string;
  };
  source: LeadSource;
  contact: AudienceContact;
  audienceProfile: AudienceProfile;
  personalizationSummary?: string;
  personaId?: string;
  personaConfidence?: number;
  matchedSignals: string[];
  tags: string[];
  notes: string[];
  conversation: AudienceConversationState;
  lifecycle: LeadLifecycleState;
  operational: LeadOperationalState;
  researchProfile?: ResearchLead;
  score?: LeadScoreBreakdown;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAssessment {
  leadId: string;
  personaId: string;
  personaConfidence: number;
  matchedSignals: string[];
  score: LeadScoreBreakdown;
  introEligible: boolean;
  reasons: string[];
}

export interface ResearchTaskPlan {
  action: 'hold' | 'send_question' | 'send_intro' | 'pause' | 'close_not_fit';
  nextStage: AudienceStage;
  nextSequenceDay: number;
  message: string | null;
  reason: string;
  subagentId?: string;
}

export interface AgentTask {
  taskId: string;
  agentId: AgentId;
  subagentId?: string;
  leadId?: string;
  stage?: AudienceStage;
  priority: Priority;
  taskType: string;
  dueAt: string;
  summary: string;
  details: Record<string, unknown>;
}

export interface AgentAction {
  timestamp: string;
  agentId: AgentId;
  leadId?: string;
  actionType: string;
  summary: string;
  status: 'planned' | 'completed' | 'blocked';
  metadata?: Record<string, unknown>;
}

export interface DailyBrief {
  generatedAt: string;
  productId: string;
  productName: string;
  leadCount: number;
  ingestedCount: number;
  queuedTaskCount: number;
  blockedCount: number;
  introReadyCount: number;
  activationDueCount: number;
  conversionDueCount: number;
  retentionDueCount: number;
  topPersonas: Array<{ personaId: string; count: number }>;
  topSignals: Array<{ signal: string; count: number }>;
  summary: string;
}

export interface SheetTab {
  name: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
}

export interface SheetWorkbook {
  tabs: SheetTab[];
}

export interface DailyRunResult {
  manifest: Pick<ProductManifest, 'productId' | 'name'>;
  leadSnapshots: AudienceLead[];
  ingestedLeads: AudienceLead[];
  assessments: LeadAssessment[];
  tasks: AgentTask[];
  actions: AgentAction[];
  sheetWorkbook: SheetWorkbook;
  brief: DailyBrief;
}

export interface AudienceRunInput {
  manifest: ProductManifest;
  rawLeads?: RawLeadInput[];
  leads?: AudienceLead[];
  now?: string;
}

export interface AudienceProductAdapter {
  adapterId: string;
  assessLead(manifest: ProductManifest, lead: AudienceLead): LeadAssessment;
  planResearchStep(
    manifest: ProductManifest,
    lead: AudienceLead,
    assessment: LeadAssessment
  ): ResearchTaskPlan;
}
