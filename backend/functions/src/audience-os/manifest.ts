import type { ProductBrandVoice, ProductManifest, ProductOnboardingProfile } from './types';

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid product manifest: "${field}" must be a non-empty string.`);
  }

  return value.trim();
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid product manifest: "${field}" must be a string array.`);
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function normalizeBrandVoice(value: ProductBrandVoice | undefined): ProductBrandVoice {
  return {
    tones: value ? assertStringArray(value.tones, 'onboarding.brandVoice.tones') : [],
    bannedPhrases: value
      ? assertStringArray(value.bannedPhrases, 'onboarding.brandVoice.bannedPhrases')
      : [],
    preferredVocabulary: value?.preferredVocabulary
      ? assertStringArray(value.preferredVocabulary, 'onboarding.brandVoice.preferredVocabulary')
      : [],
    signatureStyle: value?.signatureStyle?.trim(),
  };
}

function normalizeOnboardingProfile(
  value: ProductOnboardingProfile | undefined
): ProductOnboardingProfile | undefined {
  if (!value) {
    return undefined;
  }

  return {
    productStage: assertNonEmptyString(
      value.productStage,
      'onboarding.productStage'
    ) as ProductOnboardingProfile['productStage'],
    productType: assertNonEmptyString(value.productType, 'onboarding.productType'),
    deliveryModel: assertNonEmptyString(value.deliveryModel, 'onboarding.deliveryModel'),
    salesMotion: assertNonEmptyString(value.salesMotion, 'onboarding.salesMotion'),
    pricingModel: assertNonEmptyString(value.pricingModel, 'onboarding.pricingModel'),
    primaryAudienceOutcome: assertNonEmptyString(
      value.primaryAudienceOutcome,
      'onboarding.primaryAudienceOutcome'
    ),
    primaryConversionEvent: assertNonEmptyString(
      value.primaryConversionEvent,
      'onboarding.primaryConversionEvent'
    ),
    activationMoment: assertNonEmptyString(value.activationMoment, 'onboarding.activationMoment'),
    retentionMoment: assertNonEmptyString(value.retentionMoment, 'onboarding.retentionMoment'),
    geographyFocus: value.geographyFocus
      ? assertStringArray(value.geographyFocus, 'onboarding.geographyFocus')
      : [],
    languageSupport: value.languageSupport
      ? assertStringArray(value.languageSupport, 'onboarding.languageSupport')
      : [],
    supportChannels: assertStringArray(value.supportChannels, 'onboarding.supportChannels'),
    approvedContactChannels: assertStringArray(
      value.approvedContactChannels,
      'onboarding.approvedContactChannels'
    ) as ProductOnboardingProfile['approvedContactChannels'],
    trustConstraints: assertStringArray(value.trustConstraints, 'onboarding.trustConstraints'),
    forbiddenClaims: assertStringArray(value.forbiddenClaims, 'onboarding.forbiddenClaims'),
    brandVoice: normalizeBrandVoice(value.brandVoice),
    operatorNotes: value.operatorNotes
      ? assertStringArray(value.operatorNotes, 'onboarding.operatorNotes')
      : [],
  };
}

export function normalizeProductManifest(input: ProductManifest): ProductManifest {
  const manifest: ProductManifest = {
    productId: assertNonEmptyString(input.productId, 'productId'),
    name: assertNonEmptyString(input.name, 'name'),
    category: assertNonEmptyString(input.category, 'category'),
    oneSentencePositioning: assertNonEmptyString(
      input.oneSentencePositioning,
      'oneSentencePositioning'
    ),
    targetAudience: input.targetAudience.map((persona, index) => ({
      personaId: assertNonEmptyString(persona.personaId, `targetAudience[${index}].personaId`),
      label: assertNonEmptyString(persona.label, `targetAudience[${index}].label`),
      titles: assertStringArray(persona.titles, `targetAudience[${index}].titles`),
      corePains: assertStringArray(persona.corePains, `targetAudience[${index}].corePains`),
      bestHooks: assertStringArray(persona.bestHooks, `targetAudience[${index}].bestHooks`),
    })),
    currentStrengths: assertStringArray(input.currentStrengths, 'currentStrengths'),
    plannedFeatures: assertStringArray(input.plannedFeatures, 'plannedFeatures'),
    highFitSignals: assertStringArray(input.highFitSignals, 'highFitSignals'),
    disqualifiers: assertStringArray(input.disqualifiers, 'disqualifiers'),
    introRules: {
      minTotalScore: Number(input.introRules?.minTotalScore ?? 65),
      minStaticFitScore: Number(input.introRules?.minStaticFitScore ?? 40),
      minSubstantiveReplies: Number(input.introRules?.minSubstantiveReplies ?? 2),
      requireOptIn: Boolean(input.introRules?.requireOptIn ?? true),
    },
    sequenceQuestions:
      input.sequenceQuestions && typeof input.sequenceQuestions === 'object'
        ? input.sequenceQuestions
        : {},
    activationGoals: input.activationGoals
      ? assertStringArray(input.activationGoals, 'activationGoals')
      : [],
    conversionOffers: input.conversionOffers
      ? assertStringArray(input.conversionOffers, 'conversionOffers')
      : [],
    retentionGoals: input.retentionGoals
      ? assertStringArray(input.retentionGoals, 'retentionGoals')
      : [],
    onboarding: normalizeOnboardingProfile(input.onboarding),
  };

  if (manifest.targetAudience.length === 0) {
    throw new Error(
      'Invalid product manifest: "targetAudience" must contain at least one persona.'
    );
  }

  if (Object.keys(manifest.sequenceQuestions).length === 0) {
    throw new Error(
      'Invalid product manifest: "sequenceQuestions" must define at least one research question.'
    );
  }

  return manifest;
}
