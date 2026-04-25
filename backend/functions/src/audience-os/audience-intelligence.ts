import type { AudienceLead, AudienceProfile } from './types';

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

export function createEmptyAudienceProfile(): AudienceProfile {
  return {
    responsibilities: [],
    goals: [],
    frustrations: [],
    currentTools: [],
    communicationStyleNotes: [],
    buyingTriggers: [],
    objections: [],
    lifeContext: [],
    personalFacts: [],
    relationship: {
      mutualContext: [],
    },
  };
}

export function normalizeAudienceProfile(input?: Partial<AudienceProfile> | null): AudienceProfile {
  const profile = input ?? {};
  const relationship = profile.relationship ?? { mutualContext: [] };

  return {
    timezone: profile.timezone?.trim(),
    language: profile.language?.trim(),
    roleSeniority: profile.roleSeniority?.trim(),
    department: profile.department?.trim(),
    responsibilities: uniqueStrings(profile.responsibilities ?? []),
    goals: uniqueStrings(profile.goals ?? []),
    frustrations: uniqueStrings(profile.frustrations ?? []),
    currentTools: uniqueStrings(profile.currentTools ?? []),
    preferredTone: profile.preferredTone,
    communicationStyleNotes: uniqueStrings(profile.communicationStyleNotes ?? []),
    buyingTriggers: uniqueStrings(profile.buyingTriggers ?? []),
    objections: uniqueStrings(profile.objections ?? []),
    lifeContext: uniqueStrings(profile.lifeContext ?? []),
    personalFacts: uniqueStrings(profile.personalFacts ?? []),
    relationship: {
      warmth: relationship.warmth,
      sourceContext: relationship.sourceContext?.trim(),
      mutualContext: uniqueStrings(relationship.mutualContext ?? []),
      lastHook: relationship.lastHook?.trim(),
    },
  };
}

export function mergeAudienceProfiles(
  existing: AudienceProfile,
  incoming: AudienceProfile
): AudienceProfile {
  return {
    timezone: incoming.timezone ?? existing.timezone,
    language: incoming.language ?? existing.language,
    roleSeniority: incoming.roleSeniority ?? existing.roleSeniority,
    department: incoming.department ?? existing.department,
    responsibilities: uniqueStrings([...existing.responsibilities, ...incoming.responsibilities]),
    goals: uniqueStrings([...existing.goals, ...incoming.goals]),
    frustrations: uniqueStrings([...existing.frustrations, ...incoming.frustrations]),
    currentTools: uniqueStrings([...existing.currentTools, ...incoming.currentTools]),
    preferredTone: incoming.preferredTone ?? existing.preferredTone,
    communicationStyleNotes: uniqueStrings([
      ...existing.communicationStyleNotes,
      ...incoming.communicationStyleNotes,
    ]),
    buyingTriggers: uniqueStrings([...existing.buyingTriggers, ...incoming.buyingTriggers]),
    objections: uniqueStrings([...existing.objections, ...incoming.objections]),
    lifeContext: uniqueStrings([...existing.lifeContext, ...incoming.lifeContext]),
    personalFacts: uniqueStrings([...existing.personalFacts, ...incoming.personalFacts]),
    relationship: {
      warmth: incoming.relationship.warmth ?? existing.relationship.warmth,
      sourceContext: incoming.relationship.sourceContext ?? existing.relationship.sourceContext,
      mutualContext: uniqueStrings([
        ...existing.relationship.mutualContext,
        ...incoming.relationship.mutualContext,
      ]),
      lastHook: incoming.relationship.lastHook ?? existing.relationship.lastHook,
    },
  };
}

export function needsAudienceEnrichment(profile: AudienceProfile): boolean {
  let coverage = 0;

  if (profile.goals.length > 0) {
    coverage += 1;
  }
  if (profile.frustrations.length > 0) {
    coverage += 1;
  }
  if (profile.currentTools.length > 0) {
    coverage += 1;
  }
  if (profile.lifeContext.length > 0 || profile.personalFacts.length > 0) {
    coverage += 1;
  }
  if (
    profile.preferredTone ||
    profile.language ||
    profile.timezone ||
    profile.relationship.warmth ||
    profile.relationship.sourceContext
  ) {
    coverage += 1;
  }

  return coverage < 3;
}

export function buildLeadPersonalizationSummary(lead: AudienceLead): string {
  const parts: string[] = [];

  if (lead.profile.fullName || lead.profile.jobTitle) {
    const identity = [lead.profile.fullName, lead.profile.jobTitle].filter(Boolean).join(', ');
    if (identity) {
      parts.push(identity);
    }
  }

  if (lead.profile.company) {
    parts.push(`Company: ${lead.profile.company}`);
  }

  if (lead.audienceProfile.goals.length > 0) {
    parts.push(`Goals: ${lead.audienceProfile.goals.slice(0, 2).join('; ')}`);
  }

  if (lead.audienceProfile.frustrations.length > 0) {
    parts.push(`Frustrations: ${lead.audienceProfile.frustrations.slice(0, 2).join('; ')}`);
  }

  if (lead.audienceProfile.currentTools.length > 0) {
    parts.push(`Current tools: ${lead.audienceProfile.currentTools.slice(0, 3).join(', ')}`);
  }

  if (lead.conversation.lastPainSummary) {
    parts.push(`Recent pain: ${lead.conversation.lastPainSummary}`);
  }

  if (lead.audienceProfile.lifeContext.length > 0) {
    parts.push(`Life context: ${lead.audienceProfile.lifeContext.slice(0, 2).join('; ')}`);
  }

  if (lead.audienceProfile.personalFacts.length > 0) {
    parts.push(`Personal notes: ${lead.audienceProfile.personalFacts.slice(0, 2).join('; ')}`);
  }

  if (lead.audienceProfile.preferredTone) {
    parts.push(`Tone: ${lead.audienceProfile.preferredTone}`);
  }

  if (lead.audienceProfile.relationship.warmth) {
    parts.push(`Relationship: ${lead.audienceProfile.relationship.warmth}`);
  }

  return parts.join(' | ');
}
