import type { AgentId } from './types';

export interface SubAgentProfile {
  id: string;
  purpose: string;
  skills: string[];
}

export interface AgentProfile {
  id: AgentId;
  label: string;
  purpose: string;
  skills: string[];
  openClawTools?: {
    allow?: string[];
    deny?: string[];
  };
  requiredCapabilities: string[];
  subagents: SubAgentProfile[];
}

export const AUDIENCE_SKILLS = {
  manifestReader: 'audience-manifest-reader',
  leadSourceHygiene: 'lead-source-hygiene',
  researchSequencer: 'research-sequencer',
  conversationGuardrails: 'conversation-guardrails',
  activationLifecycle: 'activation-lifecycle',
  operatorBriefing: 'operator-briefing',
  googleSheetsOps: 'google-sheets-ops',
} as const;

export const AUDIENCE_AGENT_CATALOG: AgentProfile[] = [
  {
    id: 'orchestrator',
    label: 'Orchestrator',
    purpose: 'Runs the daily sweep, owns routing, and writes the operator brief.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.operatorBriefing],
    requiredCapabilities: ['cron', 'task-routing', 'daily-briefs'],
    subagents: [
      {
        id: 'scheduler',
        purpose: 'Decides which runs are due now.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'route-decider',
        purpose: 'Routes work to the next owning agent.',
        skills: [AUDIENCE_SKILLS.manifestReader],
      },
      {
        id: 'exception-manager',
        purpose: 'Handles low-confidence or failed runs.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'brief-writer',
        purpose: 'Writes the daily operator brief.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
    ],
  },
  {
    id: 'lead-gen-operator',
    label: 'Lead Gen Operator',
    purpose: 'Turns approved sources into clean leads and improves source quality.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.leadSourceHygiene],
    requiredCapabilities: ['csv-import', 'approved-source-ingest', 'dedupe'],
    subagents: [
      {
        id: 'audience-mapper',
        purpose: 'Finds where high-fit people already gather.',
        skills: [AUDIENCE_SKILLS.manifestReader],
      },
      {
        id: 'source-ingestor',
        purpose: 'Imports approved lead sources.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
      {
        id: 'profile-normalizer',
        purpose: 'Cleans titles, companies, and contact fields.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
      {
        id: 'dedupe-resolver',
        purpose: 'Merges duplicate people across sources.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
      {
        id: 'source-quality-analyst',
        purpose: 'Scores which sources produce real opportunities.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
    ],
  },
  {
    id: 'research-writer',
    label: 'Research Writer',
    purpose: 'Turns market evidence into post hooks, CTAs, and opt-in angles.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.researchSequencer],
    requiredCapabilities: ['content-drafting'],
    subagents: [
      {
        id: 'signal-miner',
        purpose: 'Extracts recurring pains from audience feedback.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'hook-designer',
        purpose: 'Creates post hooks that attract high-fit leads.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
      {
        id: 'cta-designer',
        purpose: 'Designs low-friction opt-in offers.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
      {
        id: 'channel-adapter',
        purpose: 'Rewrites the same idea for each outbound surface.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
      {
        id: 'editorial-qc',
        purpose: 'Removes hype, weak claims, and unclear phrasing.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
    ],
  },
  {
    id: 'inbound-intake',
    label: 'Inbound Intake',
    purpose: 'Validates consent, resolves identity, and creates structured lead records.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.leadSourceHygiene],
    requiredCapabilities: ['webhook-ingest', 'identity-resolution'],
    subagents: [
      {
        id: 'consent-checker',
        purpose: 'Verifies opt-in and channel safety.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'identity-resolver',
        purpose: 'Resolves duplicate contact points.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
      {
        id: 'profile-normalizer',
        purpose: 'Normalizes lead metadata.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
    ],
  },
  {
    id: 'lead-scorer',
    label: 'Lead Scorer',
    purpose: 'Classifies fit, urgency, and readiness before the product intro.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.leadSourceHygiene],
    requiredCapabilities: ['classification', 'scoring'],
    subagents: [
      {
        id: 'persona-classifier',
        purpose: 'Maps leads to the right persona.',
        skills: [AUDIENCE_SKILLS.manifestReader],
      },
      {
        id: 'pain-mapper',
        purpose: 'Separates current-fit pain from planned-feature demand.',
        skills: [AUDIENCE_SKILLS.manifestReader],
      },
      {
        id: 'readiness-scorer',
        purpose: 'Scores urgency and buying readiness.',
        skills: [AUDIENCE_SKILLS.leadSourceHygiene],
      },
      {
        id: 'stage-router',
        purpose: 'Chooses the next lifecycle stage.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
    ],
  },
  {
    id: 'conversation-operator',
    label: 'Conversation Operator',
    purpose: 'Runs the research-first nurture sequence without burning trust.',
    skills: [
      AUDIENCE_SKILLS.manifestReader,
      AUDIENCE_SKILLS.researchSequencer,
      AUDIENCE_SKILLS.conversationGuardrails,
    ],
    requiredCapabilities: ['message-delivery', 'thread-memory'],
    subagents: [
      {
        id: 'conversation-state-synthesizer',
        purpose: 'Compresses thread history into active state.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'discovery-interviewer',
        purpose: 'Chooses the next learning objective.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
      {
        id: 'message-composer',
        purpose: 'Drafts the next message naturally.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
      {
        id: 'intro-gatekeeper',
        purpose: 'Prevents premature product mentions.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'objection-handler',
        purpose: 'Handles pushback without pressure.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'reactivation-specialist',
        purpose: 'Re-engages paused leads carefully.',
        skills: [AUDIENCE_SKILLS.researchSequencer],
      },
    ],
  },
  {
    id: 'activation-operator',
    label: 'Activation Operator',
    purpose: 'Moves qualified leads into onboarding and first value.',
    skills: [
      AUDIENCE_SKILLS.manifestReader,
      AUDIENCE_SKILLS.activationLifecycle,
      AUDIENCE_SKILLS.conversationGuardrails,
    ],
    requiredCapabilities: ['onboarding-assist'],
    subagents: [
      {
        id: 'onboarding-planner',
        purpose: 'Chooses the shortest path to setup.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
      {
        id: 'setup-assistant',
        purpose: 'Guides setup and initial configuration.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
      {
        id: 'aha-tracker',
        purpose: 'Checks whether first value happened.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'blocker-resolver',
        purpose: 'Removes the friction that stops activation.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
    ],
  },
  {
    id: 'conversion-operator',
    label: 'Conversion Operator',
    purpose: 'Moves activated users into paid conversion without using pressure.',
    skills: [
      AUDIENCE_SKILLS.manifestReader,
      AUDIENCE_SKILLS.activationLifecycle,
      AUDIENCE_SKILLS.conversationGuardrails,
    ],
    requiredCapabilities: ['offer-selection'],
    subagents: [
      {
        id: 'offer-selector',
        purpose: 'Chooses the right offer or trial path.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
      {
        id: 'proof-selector',
        purpose: 'Chooses the most relevant proof or outcome.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'pricing-objection-handler',
        purpose: 'Handles pricing hesitation.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'checkout-rescuer',
        purpose: 'Handles abandoned conversion paths.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
    ],
  },
  {
    id: 'retention-operator',
    label: 'Retention Operator',
    purpose: 'Builds habit, prevents churn, and turns strong users into advocates.',
    skills: [
      AUDIENCE_SKILLS.manifestReader,
      AUDIENCE_SKILLS.activationLifecycle,
      AUDIENCE_SKILLS.conversationGuardrails,
    ],
    requiredCapabilities: ['usage-monitoring'],
    subagents: [
      {
        id: 'usage-monitor',
        purpose: 'Spots weak habit formation.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'success-coach',
        purpose: 'Nudges users toward repeat wins.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
      {
        id: 'churn-detector',
        purpose: 'Finds churn risk before the user disappears.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'winback-specialist',
        purpose: 'Re-engages lapsed users.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
      {
        id: 'advocacy-builder',
        purpose: 'Finds users who can become fans and referrers.',
        skills: [AUDIENCE_SKILLS.activationLifecycle],
      },
    ],
  },
  {
    id: 'product-learning',
    label: 'Product Learning',
    purpose: 'Turns audience evidence into product and messaging decisions.',
    skills: [AUDIENCE_SKILLS.manifestReader, AUDIENCE_SKILLS.operatorBriefing],
    requiredCapabilities: ['theme-clustering'],
    subagents: [
      {
        id: 'pain-clusterer',
        purpose: 'Groups repeated pains and objections.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'promise-gap-detector',
        purpose: 'Finds demand beyond current product truth.',
        skills: [AUDIENCE_SKILLS.manifestReader],
      },
      {
        id: 'request-prioritizer',
        purpose: 'Separates noisy asks from repeated demand.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
      {
        id: 'experiment-recommender',
        purpose: 'Proposes next content and funnel experiments.',
        skills: [AUDIENCE_SKILLS.operatorBriefing],
      },
    ],
  },
  {
    id: 'trust-governor',
    label: 'Trust Governor',
    purpose: 'Blocks unsafe automation patterns before they damage trust.',
    skills: [AUDIENCE_SKILLS.conversationGuardrails],
    openClawTools: {
      allow: ['read'],
      deny: ['exec', 'write', 'edit', 'apply_patch'],
    },
    requiredCapabilities: ['policy-checks'],
    subagents: [
      {
        id: 'consent-guardian',
        purpose: 'Blocks unconsented outreach.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'promise-checker',
        purpose: 'Blocks claims beyond the manifest.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'rate-limiter',
        purpose: 'Prevents message fatigue.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
      {
        id: 'policy-checker',
        purpose: 'Checks channel rules and internal policy.',
        skills: [AUDIENCE_SKILLS.conversationGuardrails],
      },
    ],
  },
  {
    id: 'sheet-sync-operator',
    label: 'Sheet Sync Operator',
    purpose: 'Mirrors backend state into Google Sheets for operator visibility.',
    skills: [AUDIENCE_SKILLS.googleSheetsOps, AUDIENCE_SKILLS.operatorBriefing],
    requiredCapabilities: ['google-sheets-sync'],
    subagents: [
      {
        id: 'tab-builder',
        purpose: 'Builds clean tab structures and column maps.',
        skills: [AUDIENCE_SKILLS.googleSheetsOps],
      },
      {
        id: 'delta-writer',
        purpose: 'Writes only the rows that changed.',
        skills: [AUDIENCE_SKILLS.googleSheetsOps],
      },
      {
        id: 'operator-view-qc',
        purpose: 'Prevents broken formulas and unreadable views.',
        skills: [AUDIENCE_SKILLS.googleSheetsOps],
      },
    ],
  },
];

export function getAudienceAgentProfile(agentId: AgentId): AgentProfile {
  const profile = AUDIENCE_AGENT_CATALOG.find((agent) => agent.id === agentId);
  if (!profile) {
    throw new Error(`Unknown audience agent: ${agentId}`);
  }

  return profile;
}
