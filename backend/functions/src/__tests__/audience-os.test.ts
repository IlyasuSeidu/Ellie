import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIENCE_AGENT_CATALOG,
  buildDailyAudienceRun,
  buildOpenClawAudienceConfig,
  ellieAudienceAdapter,
  getMissingProductOnboardingFields,
  PRODUCT_ONBOARDING_QUESTIONS,
  type AudienceLead,
  type ProductManifest,
  type RawLeadInput,
} from '../audience-os';

const ellieManifest: ProductManifest = {
  productId: 'ellie',
  name: 'Ellie',
  category: 'miner shift certainty app',
  oneSentencePositioning:
    'Ellie gives mining shift workers fast confidence about their next shift, next block, and future roster dates without mental math.',
  targetAudience: [
    {
      personaId: 'underground-production-operator',
      label: 'Underground Production Operator',
      titles: ['Jumbo operator', 'Bogger operator'],
      corePains: ['Losing track of where they are in the cycle'],
      bestHooks: ['Do you ever need to double-check if tomorrow is days, nights, or off?'],
    },
  ],
  currentStrengths: ['Rotating and FIFO roster support', 'Future-date shift lookup'],
  plannedFeatures: ['Sleep intelligence'],
  highFitSignals: ['Counts forward manually'],
  disqualifiers: ['Needs crew allocation more than personal shift certainty'],
  introRules: {
    minTotalScore: 65,
    minStaticFitScore: 40,
    minSubstantiveReplies: 2,
    requireOptIn: true,
  },
  sequenceQuestions: {
    day1: 'What roster are you on right now?',
    day2: 'How do you keep track today?',
    day3: 'What did that last cost you?',
    day4: 'When do you need the answer fastest?',
    day5: 'How far ahead do you need confidence?',
    day6: 'What would a good tool need to answer instantly?',
    day7Qualified: 'We are building Ellie around exactly this pain. Want early access?',
  },
  activationGoals: ['Get the user to confirm their next shift correctly.'],
  conversionOffers: ['Early access upgrade'],
  retentionGoals: ['Repeat usage before each swing'],
  onboarding: {
    productStage: 'beta',
    productType: 'mobile app',
    deliveryModel: 'self-serve software',
    salesMotion: 'self-serve',
    pricingModel: 'freemium with premium upgrade',
    primaryAudienceOutcome: 'Know the next shift and next block instantly without mental math.',
    primaryConversionEvent: 'User upgrades to premium after using shift lookup and reminders.',
    activationMoment: 'User confirms their next shift correctly and enables reminders.',
    retentionMoment: 'User uses Ellie repeatedly before each swing or planning event.',
    geographyFocus: ['Australia', 'Ghana'],
    languageSupport: ['English'],
    supportChannels: ['Email support', 'WhatsApp help'],
    approvedContactChannels: ['email', 'whatsapp'],
    trustConstraints: ['Do not promise crew-wide scheduling.', 'Do not message without opt-in.'],
    forbiddenClaims: ['Sleep intelligence is already live.', 'Crew scheduling is already live.'],
    brandVoice: {
      tones: ['practical', 'clear', 'grounded'],
      bannedPhrases: ['revolutionary AI', 'guaranteed results'],
      preferredVocabulary: ['roster', 'swing', 'shift'],
      signatureStyle: 'Short, practical, and respectful.',
    },
    operatorNotes: ['Stay anchored to personal shift certainty first.'],
  },
};

test('daily audience run ingests leads, routes tasks, and builds sheet tabs', () => {
  const rawLeads: RawLeadInput[] = [
    {
      externalId: 'alpha-1',
      fullName: 'Ayo Miner',
      jobTitle: 'Bogger operator',
      company: 'Gold Ridge',
      country: 'Ghana',
      sourceType: 'opt_in_form',
      sourceLabel: 'LinkedIn form',
      email: 'ayo@example.com',
      consentStatus: 'opted_in',
      audienceProfile: {
        timezone: 'Africa/Accra',
        language: 'English',
        preferredTone: 'practical',
        goals: ['Stop checking the roster repeatedly', 'Plan family time better'],
        frustrations: ['Wrong alarms', 'Manual counting before shift'],
        currentTools: ['Screenshots', 'WhatsApp'],
        lifeContext: ['Has family events to plan around swings'],
        personalFacts: ['Prefers short messages before dawn'],
        relationship: {
          warmth: 'warm',
          sourceContext: 'LinkedIn opt-in form',
          mutualContext: [],
        },
      },
      researchProfile: {
        stage: 'opted_in',
        sequenceDay: 7,
        signals: {
          rosterTypeHint: 'rotating',
          rosterComplexity: 'high',
          problemFitSignals: ['wrong alarms', 'manual counting', 'family planning'],
          replyCount: 4,
          substantiveReplyCount: 3,
          painSeverity: 'high',
          buyingReadiness: 'asks_to_be_updated',
          wantsCrewScheduling: false,
          wantsPlannedFeaturesOnly: false,
        },
        lastPainSummary: 'I still count forward manually before night shift.',
      },
    },
  ];

  const existingLeads: AudienceLead[] = [
    {
      leadId: 'activated-user',
      productId: 'ellie',
      stage: 'intro_sent',
      sequenceDay: 7,
      profile: {
        fullName: 'Kofi Shift',
        jobTitle: 'FIFO operator',
      },
      source: {
        sourceType: 'referral',
        sourceLabel: 'Referral',
        capturedAt: '2026-04-24T00:00:00.000Z',
      },
      contact: {
        preferredChannel: 'whatsapp',
        whatsappNumber: '+233555000000',
        consentStatus: 'opted_in',
      },
      audienceProfile: {
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
      },
      matchedSignals: [],
      tags: [],
      notes: [],
      conversation: {
        replyCount: 2,
        substantiveReplyCount: 2,
        consecutiveMisses: 0,
      },
      lifecycle: {
        activationStatus: 'activated',
        paymentStatus: 'trial',
        advocacyStatus: 'none',
      },
      operational: {},
      createdAt: '2026-04-24T00:00:00.000Z',
      updatedAt: '2026-04-24T00:00:00.000Z',
    },
    {
      leadId: 'paid-user',
      productId: 'ellie',
      stage: 'activated',
      sequenceDay: 7,
      profile: {
        fullName: 'Ama Crew',
        jobTitle: 'Process operator',
      },
      source: {
        sourceType: 'community',
        sourceLabel: 'Private group',
        capturedAt: '2026-04-23T00:00:00.000Z',
      },
      contact: {
        preferredChannel: 'email',
        email: 'ama@example.com',
        consentStatus: 'opted_in',
      },
      audienceProfile: {
        responsibilities: [],
        goals: ['Keep shift planning stable'],
        frustrations: ['Still double-checking roster'],
        currentTools: ['Calendar'],
        communicationStyleNotes: [],
        buyingTriggers: [],
        objections: [],
        lifeContext: [],
        personalFacts: [],
        relationship: {
          mutualContext: [],
        },
      },
      matchedSignals: [],
      tags: [],
      notes: [],
      conversation: {
        replyCount: 3,
        substantiveReplyCount: 2,
        consecutiveMisses: 0,
      },
      lifecycle: {
        activationStatus: 'activated',
        paymentStatus: 'paid',
        advocacyStatus: 'candidate',
      },
      operational: {},
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    },
  ];

  const result = buildDailyAudienceRun(
    {
      manifest: ellieManifest,
      rawLeads,
      leads: existingLeads,
      now: '2026-04-25T08:00:00.000Z',
    },
    ellieAudienceAdapter
  );

  assert.equal(result.manifest.productId, 'ellie');
  assert.equal(result.ingestedLeads.length, 1);
  assert.equal(result.leadSnapshots.length, 3);
  assert.ok(result.tasks.some((task) => task.agentId === 'conversation-operator'));
  assert.ok(result.tasks.some((task) => task.agentId === 'activation-operator'));
  assert.ok(result.tasks.some((task) => task.agentId === 'conversion-operator'));
  assert.ok(result.tasks.some((task) => task.agentId === 'retention-operator'));
  assert.ok(result.tasks.some((task) => task.agentId === 'sheet-sync-operator'));
  assert.ok(result.tasks.some((task) => task.agentId === 'lead-gen-operator'));
  assert.ok(result.sheetWorkbook.tabs.some((sheet) => sheet.name === 'Leads_Master'));
  assert.ok(result.leadSnapshots.some((lead) => lead.personalizationSummary?.includes('Goals:')));
  assert.ok(result.brief.leadCount >= 3);
});

test('OpenClaw config includes shared skills, agents, and hook routing', () => {
  const config = buildOpenClawAudienceConfig('/Users/Shared/SignalLoop');
  const agents = (config.agents as { list: Array<{ id: string; skills: string[] }> }).list;

  assert.ok(Array.isArray(agents));
  assert.ok(agents.some((agent) => agent.id === 'lead-gen-operator'));
  assert.ok(agents.some((agent) => agent.id === 'sheet-sync-operator'));
  assert.deepEqual((config.skills as { load: { extraDirs: string[] } }).load.extraDirs, [
    '/Users/Shared/SignalLoop/shared-skills',
  ]);
});

test('agent catalog includes trust governor and lead generation ownership', () => {
  const ids = AUDIENCE_AGENT_CATALOG.map((agent) => agent.id);

  assert.ok(ids.includes('lead-gen-operator'));
  assert.ok(ids.includes('trust-governor'));
  assert.ok(ids.includes('sheet-sync-operator'));
});

test('product onboarding questionnaire and manifest completeness helpers are available', () => {
  assert.ok(PRODUCT_ONBOARDING_QUESTIONS.length > 10);
  assert.deepEqual(getMissingProductOnboardingFields(ellieManifest), []);
  assert.deepEqual(getMissingProductOnboardingFields({ ...ellieManifest, onboarding: undefined }), [
    'onboarding',
  ]);
});
