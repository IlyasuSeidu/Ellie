import type { ProductManifest, ProductOnboardingProfile, ProductOnboardingQuestion } from './types';

export const PRODUCT_ONBOARDING_QUESTIONS: ProductOnboardingQuestion[] = [
  {
    id: 'product-stage',
    category: 'product',
    fieldPath: 'onboarding.productStage',
    required: true,
    question: 'What stage is the product in right now: idea, prototype, beta, or live?',
    whyItMatters: 'Messaging, promise boundaries, and conversion asks depend on product maturity.',
  },
  {
    id: 'product-type',
    category: 'product',
    fieldPath: 'onboarding.productType',
    required: true,
    question:
      'What kind of product is this: mobile app, web app, SaaS, marketplace, service, or something else?',
    whyItMatters: 'The system needs to know the onboarding path and usage model.',
  },
  {
    id: 'delivery-model',
    category: 'product',
    fieldPath: 'onboarding.deliveryModel',
    required: true,
    question:
      'How is value delivered: self-serve software, assisted service, community, or hybrid?',
    whyItMatters: 'Activation and conversion flows must match how the product is delivered.',
  },
  {
    id: 'primary-outcome',
    category: 'audience',
    fieldPath: 'onboarding.primaryAudienceOutcome',
    required: true,
    question: 'What is the main outcome the product helps the user achieve?',
    whyItMatters:
      'The entire conversation system should orient around the user outcome, not features.',
  },
  {
    id: 'primary-audience',
    category: 'audience',
    fieldPath: 'targetAudience',
    required: true,
    question: 'Who are the primary audience segments and what are their defining pains?',
    whyItMatters: 'Lead gen and personalization depend on clear audience definition.',
  },
  {
    id: 'current-strengths',
    category: 'product',
    fieldPath: 'currentStrengths',
    required: true,
    question: 'What can the product truthfully do today?',
    whyItMatters: 'The system must not sell future promises as current reality.',
  },
  {
    id: 'planned-features',
    category: 'product',
    fieldPath: 'plannedFeatures',
    required: false,
    question: 'What is planned soon but should not be sold as live yet?',
    whyItMatters: 'This prevents trust damage from premature promises.',
  },
  {
    id: 'activation-moment',
    category: 'conversion',
    fieldPath: 'onboarding.activationMoment',
    required: true,
    question: 'What exact moment tells us the user reached first value?',
    whyItMatters: 'Activation agents need a measurable target.',
  },
  {
    id: 'primary-conversion-event',
    category: 'conversion',
    fieldPath: 'onboarding.primaryConversionEvent',
    required: true,
    question: 'What event counts as the main conversion goal?',
    whyItMatters: 'The system needs one clear conversion objective per product.',
  },
  {
    id: 'retention-moment',
    category: 'conversion',
    fieldPath: 'onboarding.retentionMoment',
    required: true,
    question: 'What repeated behavior or outcome indicates retention?',
    whyItMatters: 'Retention and advocacy logic need a clear target behavior.',
  },
  {
    id: 'sales-motion',
    category: 'conversion',
    fieldPath: 'onboarding.salesMotion',
    required: true,
    question: 'Is the sales motion self-serve, sales-assisted, community-led, or hybrid?',
    whyItMatters: 'The conversion operator should not use the wrong closing style.',
  },
  {
    id: 'pricing-model',
    category: 'conversion',
    fieldPath: 'onboarding.pricingModel',
    required: true,
    question: 'What is the pricing model or offer structure?',
    whyItMatters: 'Offer selection and objection handling depend on pricing reality.',
  },
  {
    id: 'approved-channels',
    category: 'operations',
    fieldPath: 'onboarding.approvedContactChannels',
    required: true,
    question: 'Which contact channels are approved for consented outreach and follow-up?',
    whyItMatters: 'The system should only automate on approved channels.',
  },
  {
    id: 'support-channels',
    category: 'operations',
    fieldPath: 'onboarding.supportChannels',
    required: true,
    question: 'Where can users get help if they reply, get stuck, or want a human?',
    whyItMatters: 'Autonomous systems still need a clear support path.',
  },
  {
    id: 'geography-focus',
    category: 'operations',
    fieldPath: 'onboarding.geographyFocus',
    required: false,
    question: 'Which countries, regions, or timezones matter most right now?',
    whyItMatters: 'Timing, language, and lead qualification often depend on geography.',
  },
  {
    id: 'language-support',
    category: 'operations',
    fieldPath: 'onboarding.languageSupport',
    required: false,
    question: 'Which languages should the system support in messaging and onboarding?',
    whyItMatters: 'Personalization is weaker if language support is unclear.',
  },
  {
    id: 'brand-voice',
    category: 'messaging',
    fieldPath: 'onboarding.brandVoice.tones',
    required: true,
    question: 'What tone should the product speak with, and what phrases should never be used?',
    whyItMatters: 'Every agent should sound coherent and on-brand.',
  },
  {
    id: 'forbidden-claims',
    category: 'trust',
    fieldPath: 'onboarding.forbiddenClaims',
    required: true,
    question: 'What claims, promises, or topics are forbidden?',
    whyItMatters: 'Trust governance needs explicit boundaries.',
  },
  {
    id: 'trust-constraints',
    category: 'trust',
    fieldPath: 'onboarding.trustConstraints',
    required: true,
    question: 'What legal, policy, compliance, or reputational constraints must the system obey?',
    whyItMatters: 'The platform should encode trust constraints before growth logic.',
  },
];

export function getMissingProductOnboardingFields(manifest: ProductManifest): string[] {
  const onboarding = manifest.onboarding;
  if (!onboarding) {
    return ['onboarding'];
  }

  const missing: string[] = [];
  const requiredStringFields: Array<keyof ProductOnboardingProfile> = [
    'productStage',
    'productType',
    'deliveryModel',
    'salesMotion',
    'pricingModel',
    'primaryAudienceOutcome',
    'primaryConversionEvent',
    'activationMoment',
    'retentionMoment',
  ];

  for (const field of requiredStringFields) {
    const value = onboarding[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      missing.push(`onboarding.${field}`);
    }
  }

  const requiredArrays: Array<keyof ProductOnboardingProfile> = [
    'approvedContactChannels',
    'supportChannels',
    'trustConstraints',
    'forbiddenClaims',
  ];

  for (const field of requiredArrays) {
    const value = onboarding[field];
    if (!Array.isArray(value) || value.length === 0) {
      missing.push(`onboarding.${field}`);
    }
  }

  if (!onboarding.brandVoice || onboarding.brandVoice.tones.length === 0) {
    missing.push('onboarding.brandVoice.tones');
  }

  return missing;
}
