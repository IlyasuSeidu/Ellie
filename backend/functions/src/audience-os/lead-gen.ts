import type { ResearchLead } from '../research-funnel';
import {
  buildLeadPersonalizationSummary,
  createEmptyAudienceProfile,
  mergeAudienceProfiles,
  normalizeAudienceProfile,
} from './audience-intelligence';
import type {
  AgentAction,
  AudienceLead,
  ConsentStatus,
  ProductManifest,
  RawLeadInput,
} from './types';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildLeadId(input: RawLeadInput): string {
  const stableSeed =
    input.externalId ??
    input.email ??
    input.whatsappNumber ??
    input.linkedinUrl ??
    input.profileUrl ??
    input.fullName ??
    `${input.sourceType}-${input.sourceLabel}`;

  return slugify(stableSeed || 'lead');
}

function resolveConsentStatus(input: RawLeadInput): ConsentStatus {
  return input.consentStatus ?? (input.email || input.whatsappNumber ? 'opted_in' : 'unknown');
}

function resolvePreferredChannel(input: RawLeadInput) {
  if (input.preferredChannel) {
    return input.preferredChannel;
  }
  if (input.whatsappNumber) {
    return 'whatsapp';
  }
  if (input.email) {
    return 'email';
  }
  if (input.telegramHandle) {
    return 'telegram';
  }
  if (input.linkedinUrl || input.profileUrl) {
    return 'linkedin';
  }

  return undefined;
}

function mergeResearchProfile(
  defaultLeadId: string,
  input: RawLeadInput
): ResearchLead | undefined {
  if (!input.researchProfile) {
    return undefined;
  }

  const defaults: ResearchLead = {
    leadId: defaultLeadId,
    fullName: input.fullName,
    jobTitle: input.jobTitle,
    company: input.company,
    country: input.country,
    stage: 'opted_in',
    sequenceDay: 1,
    consecutiveMisses: 0,
    contact: {
      preferredChannel: input.whatsappNumber ? 'whatsapp' : 'email',
      email: input.email,
      whatsappNumber: input.whatsappNumber,
      optInStatus: resolveConsentStatus(input) === 'blocked' ? 'blocked' : 'opted_in',
    },
    signals: {
      rosterTypeHint: 'unknown',
      rosterComplexity: 'none',
      problemFitSignals: [],
      replyCount: 0,
      substantiveReplyCount: 0,
      painSeverity: 'none',
      buyingReadiness: 'none',
      wantsCrewScheduling: false,
      wantsPlannedFeaturesOnly: false,
    },
  };

  return {
    ...defaults,
    ...input.researchProfile,
    leadId: defaultLeadId,
    fullName: input.researchProfile.fullName ?? defaults.fullName,
    jobTitle: input.researchProfile.jobTitle ?? defaults.jobTitle,
    company: input.researchProfile.company ?? defaults.company,
    country: input.researchProfile.country ?? defaults.country,
    sequenceDay: input.researchProfile.sequenceDay ?? defaults.sequenceDay,
    consecutiveMisses: input.researchProfile.consecutiveMisses ?? defaults.consecutiveMisses,
    stage: input.researchProfile.stage ?? defaults.stage,
    contact: {
      ...defaults.contact,
      ...input.researchProfile.contact,
    },
    signals: {
      ...defaults.signals,
      ...input.researchProfile.signals,
    },
  };
}

function mergeLead(existing: AudienceLead, incoming: AudienceLead): AudienceLead {
  const pickedStage = existing.stage === 'blocked' ? existing.stage : incoming.stage;
  const audienceProfile = mergeAudienceProfiles(existing.audienceProfile, incoming.audienceProfile);

  const mergedLead: AudienceLead = {
    ...existing,
    stage: pickedStage,
    profile: {
      fullName: existing.profile.fullName ?? incoming.profile.fullName,
      jobTitle: existing.profile.jobTitle ?? incoming.profile.jobTitle,
      company: existing.profile.company ?? incoming.profile.company,
      country: existing.profile.country ?? incoming.profile.country,
      profileUrl: existing.profile.profileUrl ?? incoming.profile.profileUrl,
    },
    source: existing.source,
    contact: {
      preferredChannel: existing.contact.preferredChannel ?? incoming.contact.preferredChannel,
      email: existing.contact.email ?? incoming.contact.email,
      whatsappNumber: existing.contact.whatsappNumber ?? incoming.contact.whatsappNumber,
      telegramHandle: existing.contact.telegramHandle ?? incoming.contact.telegramHandle,
      linkedinUrl: existing.contact.linkedinUrl ?? incoming.contact.linkedinUrl,
      consentStatus:
        existing.contact.consentStatus === 'blocked'
          ? 'blocked'
          : incoming.contact.consentStatus === 'opted_in'
            ? 'opted_in'
            : existing.contact.consentStatus,
    },
    matchedSignals: Array.from(new Set([...existing.matchedSignals, ...incoming.matchedSignals])),
    tags: Array.from(new Set([...existing.tags, ...incoming.tags])),
    notes: Array.from(new Set([...existing.notes, ...incoming.notes])),
    conversation: {
      replyCount: Math.max(existing.conversation.replyCount, incoming.conversation.replyCount),
      substantiveReplyCount: Math.max(
        existing.conversation.substantiveReplyCount,
        incoming.conversation.substantiveReplyCount
      ),
      consecutiveMisses: Math.max(
        existing.conversation.consecutiveMisses,
        incoming.conversation.consecutiveMisses
      ),
      lastPainSummary:
        incoming.conversation.lastPainSummary ?? existing.conversation.lastPainSummary,
      lastWorkaroundSummary:
        incoming.conversation.lastWorkaroundSummary ?? existing.conversation.lastWorkaroundSummary,
      lastOutcomeSummary:
        incoming.conversation.lastOutcomeSummary ?? existing.conversation.lastOutcomeSummary,
      lastInboundAt: incoming.conversation.lastInboundAt ?? existing.conversation.lastInboundAt,
      lastOutboundAt: incoming.conversation.lastOutboundAt ?? existing.conversation.lastOutboundAt,
    },
    audienceProfile,
    operational: {
      ...existing.operational,
      ...incoming.operational,
    },
    researchProfile: incoming.researchProfile ?? existing.researchProfile,
    updatedAt: incoming.updatedAt,
  };

  return {
    ...mergedLead,
    personalizationSummary: buildLeadPersonalizationSummary(mergedLead),
  };
}

export function normalizeRawLead(
  manifest: ProductManifest,
  input: RawLeadInput,
  now: string
): AudienceLead {
  const leadId = buildLeadId(input);
  const consentStatus = resolveConsentStatus(input);
  const preferredChannel = resolvePreferredChannel(input);
  const stage =
    consentStatus === 'blocked'
      ? 'blocked'
      : consentStatus === 'opted_in'
        ? 'opted_in'
        : 'consent_pending';

  const lead: AudienceLead = {
    leadId,
    productId: manifest.productId,
    stage,
    sequenceDay: 1,
    profile: {
      fullName: input.fullName,
      jobTitle: input.jobTitle,
      company: input.company,
      country: input.country,
      profileUrl: input.profileUrl ?? input.linkedinUrl,
    },
    source: {
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      externalId: input.externalId,
      capturedAt: input.capturedAt ?? now,
    },
    contact: {
      preferredChannel,
      email: input.email,
      whatsappNumber: input.whatsappNumber,
      telegramHandle: input.telegramHandle,
      linkedinUrl: input.linkedinUrl,
      consentStatus,
    },
    audienceProfile: input.audienceProfile
      ? normalizeAudienceProfile(input.audienceProfile)
      : createEmptyAudienceProfile(),
    matchedSignals: [],
    tags: input.tags ?? [],
    notes: input.notes ?? [],
    conversation: {
      replyCount: input.researchProfile?.signals?.replyCount ?? 0,
      substantiveReplyCount: input.researchProfile?.signals?.substantiveReplyCount ?? 0,
      consecutiveMisses: input.researchProfile?.consecutiveMisses ?? 0,
      lastPainSummary: input.researchProfile?.lastPainSummary,
      lastWorkaroundSummary: input.researchProfile?.lastWorkaroundSummary,
      lastOutcomeSummary: input.researchProfile?.lastOutcomeSummary,
    },
    lifecycle: {
      activationStatus: 'not_started',
      paymentStatus: 'none',
      advocacyStatus: 'none',
    },
    operational: {},
    researchProfile: mergeResearchProfile(leadId, input),
    blockedReason: consentStatus === 'blocked' ? 'Lead is blocked from contact.' : undefined,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...lead,
    personalizationSummary: buildLeadPersonalizationSummary(lead),
  };
}

function dedupeKey(lead: AudienceLead): string {
  return (
    lead.contact.email ??
    lead.contact.whatsappNumber ??
    lead.contact.linkedinUrl ??
    lead.profile.profileUrl ??
    lead.source.externalId ??
    lead.leadId
  );
}

export function dedupeLeads(leads: AudienceLead[]): AudienceLead[] {
  const map = new Map<string, AudienceLead>();

  for (const lead of leads) {
    const key = dedupeKey(lead);
    const existing = map.get(key);
    map.set(key, existing ? mergeLead(existing, lead) : lead);
  }

  return Array.from(map.values());
}

export function ingestRawLeads(
  manifest: ProductManifest,
  inputs: RawLeadInput[],
  now: string
): { leads: AudienceLead[]; actions: AgentAction[] } {
  const normalized = inputs.map((input) => normalizeRawLead(manifest, input, now));
  const deduped = dedupeLeads(normalized);

  const actions: AgentAction[] = deduped.map((lead) => ({
    timestamp: now,
    agentId: 'lead-gen-operator',
    leadId: lead.leadId,
    actionType: 'lead_ingested',
    summary: `Lead ingested from ${lead.source.sourceLabel}.`,
    status: 'completed',
    metadata: {
      sourceType: lead.source.sourceType,
      consentStatus: lead.contact.consentStatus,
      preferredChannel: lead.contact.preferredChannel ?? null,
      profileCoverage: {
        goals: lead.audienceProfile.goals.length,
        frustrations: lead.audienceProfile.frustrations.length,
        tools: lead.audienceProfile.currentTools.length,
      },
    },
  }));

  return { leads: deduped, actions };
}
