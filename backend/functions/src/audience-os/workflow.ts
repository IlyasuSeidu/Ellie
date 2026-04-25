import type {
  AgentAction,
  AgentTask,
  AudienceLead,
  AudienceProductAdapter,
  AudienceStage,
  LeadAssessment,
  ProductManifest,
} from './types';
import { buildLeadPersonalizationSummary, needsAudienceEnrichment } from './audience-intelligence';
import { getMissingProductOnboardingFields } from './product-onboarding';

function createTask(
  lead: AudienceLead | undefined,
  now: string,
  agentId: AgentTask['agentId'],
  taskType: string,
  summary: string,
  priority: AgentTask['priority'],
  details: Record<string, unknown>,
  subagentId?: string,
  stage?: AudienceStage
): AgentTask {
  return {
    taskId: `${agentId}-${lead?.leadId ?? 'system'}-${taskType}-${Date.parse(now)}`,
    agentId,
    subagentId,
    leadId: lead?.leadId,
    stage: stage ?? lead?.stage,
    priority,
    taskType,
    dueAt: now,
    summary,
    details,
  };
}

function createAction(
  now: string,
  agentId: AgentAction['agentId'],
  leadId: string | undefined,
  actionType: string,
  summary: string,
  status: AgentAction['status'],
  metadata?: Record<string, unknown>
): AgentAction {
  return {
    timestamp: now,
    agentId,
    leadId,
    actionType,
    summary,
    status,
    metadata,
  };
}

function isResearchStage(stage: AudienceStage): boolean {
  return [
    'opted_in',
    'enriched',
    'active_sequence',
    'awaiting_reply',
    'research_only',
    'paused',
  ].includes(stage);
}

export function buildLeadWorkflow(
  manifest: ProductManifest,
  lead: AudienceLead,
  adapter: AudienceProductAdapter,
  now: string
): {
  updatedLead: AudienceLead;
  assessment: LeadAssessment;
  tasks: AgentTask[];
  actions: AgentAction[];
} {
  const assessment = adapter.assessLead(manifest, lead);
  const tasks: AgentTask[] = [];
  const actions: AgentAction[] = [];
  const updatedLead: AudienceLead = {
    ...lead,
    personaId: assessment.personaId,
    personaConfidence: assessment.personaConfidence,
    matchedSignals: assessment.matchedSignals,
    score: assessment.score,
    updatedAt: now,
    personalizationSummary: buildLeadPersonalizationSummary({
      ...lead,
      personaId: assessment.personaId,
      personaConfidence: assessment.personaConfidence,
      matchedSignals: assessment.matchedSignals,
      score: assessment.score,
      updatedAt: now,
    }),
  };
  const missingOnboardingFields = getMissingProductOnboardingFields(manifest);

  actions.push(
    createAction(
      now,
      'lead-scorer',
      lead.leadId,
      'lead_scored',
      'Lead scored and classified.',
      'completed',
      {
        personaId: assessment.personaId,
        totalScore: assessment.score.totalScore,
        introEligible: assessment.introEligible,
      }
    )
  );

  if (lead.contact.consentStatus === 'blocked' || lead.stage === 'blocked') {
    updatedLead.stage = 'blocked';
    updatedLead.blockedReason = lead.blockedReason ?? 'Lead is blocked from contact.';
    tasks.push(
      createTask(
        lead,
        now,
        'trust-governor',
        'blocked_contact_review',
        'Review blocked contact and preserve do-not-contact status.',
        'high',
        { blockedReason: updatedLead.blockedReason ?? null },
        'consent-guardian',
        'blocked'
      )
    );
    actions.push(
      createAction(
        now,
        'trust-governor',
        lead.leadId,
        'lead_blocked',
        'Lead remains blocked from outreach.',
        'completed',
        { blockedReason: updatedLead.blockedReason ?? null }
      )
    );

    return { updatedLead, assessment, tasks, actions };
  }

  if (needsAudienceEnrichment(updatedLead.audienceProfile)) {
    tasks.push(
      createTask(
        updatedLead,
        now,
        'lead-gen-operator',
        'profile_enrichment',
        'Collect more audience context so conversation can stay highly personal.',
        'medium',
        {
          personalizationSummary: updatedLead.personalizationSummary ?? null,
          currentCoverage: {
            goals: updatedLead.audienceProfile.goals.length,
            frustrations: updatedLead.audienceProfile.frustrations.length,
            currentTools: updatedLead.audienceProfile.currentTools.length,
            lifeContext: updatedLead.audienceProfile.lifeContext.length,
            personalFacts: updatedLead.audienceProfile.personalFacts.length,
          },
        },
        'profile-normalizer',
        updatedLead.stage
      )
    );
  }

  if (lead.stage === 'new' || lead.stage === 'sourced' || lead.stage === 'consent_pending') {
    updatedLead.stage = lead.contact.consentStatus === 'opted_in' ? 'opted_in' : 'consent_pending';
    tasks.push(
      createTask(
        lead,
        now,
        'inbound-intake',
        'intake_review',
        'Validate consent, identity, and contact readiness.',
        'high',
        {
          sourceType: lead.source.sourceType,
          sourceLabel: lead.source.sourceLabel,
          consentStatus: lead.contact.consentStatus,
          personalizationSummary: updatedLead.personalizationSummary ?? null,
        },
        'consent-checker',
        updatedLead.stage
      )
    );
    actions.push(
      createAction(
        now,
        'inbound-intake',
        lead.leadId,
        'intake_routed',
        'Lead routed into inbound intake.',
        'planned',
        { nextStage: updatedLead.stage }
      )
    );

    if (updatedLead.stage !== 'opted_in') {
      return { updatedLead, assessment, tasks, actions };
    }
  }

  if (isResearchStage(updatedLead.stage)) {
    const plan = adapter.planResearchStep(manifest, updatedLead, assessment);
    updatedLead.stage = plan.nextStage;
    updatedLead.sequenceDay = plan.nextSequenceDay;
    updatedLead.operational = {
      ownerAgent: 'conversation-operator',
      nextAction:
        plan.action === 'send_question'
          ? 'Send next research question.'
          : plan.action === 'send_intro'
            ? 'Send product intro.'
            : plan.reason,
      nextActionAt: now,
      lastAgent: 'lead-scorer',
      lastActionSummary: assessment.reasons.join(' '),
      lastActionAt: now,
    };

    if (plan.action === 'send_question' || plan.action === 'send_intro') {
      tasks.push(
        createTask(
          updatedLead,
          now,
          'conversation-operator',
          plan.action,
          plan.reason,
          plan.action === 'send_intro' ? 'high' : 'medium',
          {
            message: plan.message,
            sequenceDay: lead.sequenceDay,
            reasons: assessment.reasons,
            personalizationSummary: updatedLead.personalizationSummary ?? null,
            audienceProfile: {
              goals: updatedLead.audienceProfile.goals,
              frustrations: updatedLead.audienceProfile.frustrations,
              currentTools: updatedLead.audienceProfile.currentTools,
              preferredTone: updatedLead.audienceProfile.preferredTone ?? null,
              objections: updatedLead.audienceProfile.objections,
              lifeContext: updatedLead.audienceProfile.lifeContext,
              personalFacts: updatedLead.audienceProfile.personalFacts,
            },
            missingOnboardingFields,
          },
          plan.subagentId,
          plan.nextStage
        )
      );
      tasks.push(
        createTask(
          updatedLead,
          now,
          'trust-governor',
          'message_safety_check',
          'Check message for consent, truthfulness, and cadence.',
          'medium',
          {
            pendingAgent: 'conversation-operator',
            message: plan.message,
            missingOnboardingFields,
          },
          'promise-checker',
          plan.nextStage
        )
      );
    } else if (plan.action === 'pause') {
      tasks.push(
        createTask(
          updatedLead,
          now,
          'conversation-operator',
          'reactivation_review',
          plan.reason,
          'low',
          { reasons: assessment.reasons },
          plan.subagentId,
          plan.nextStage
        )
      );
    }

    actions.push(
      createAction(
        now,
        'conversation-operator',
        lead.leadId,
        'research_planned',
        plan.reason,
        plan.action === 'close_not_fit' ? 'blocked' : 'planned',
        {
          action: plan.action,
          nextStage: plan.nextStage,
          nextSequenceDay: plan.nextSequenceDay,
        }
      )
    );

    return { updatedLead, assessment, tasks, actions };
  }

  if (updatedLead.stage === 'intro_ready') {
    tasks.push(
      createTask(
        updatedLead,
        now,
        'conversation-operator',
        'send_intro',
        'Send the product intro and move the lead into activation.',
        'high',
        {
          personaId: updatedLead.personaId ?? null,
          score: updatedLead.score?.totalScore ?? null,
          personalizationSummary: updatedLead.personalizationSummary ?? null,
          missingOnboardingFields,
        },
        'intro-gatekeeper',
        'intro_ready'
      )
    );
    tasks.push(
      createTask(
        updatedLead,
        now,
        'trust-governor',
        'intro_safety_check',
        'Check intro eligibility and product truthfulness.',
        'high',
        {
          introEligible: assessment.introEligible,
          reasons: assessment.reasons,
          missingOnboardingFields,
        },
        'promise-checker',
        'intro_ready'
      )
    );

    return { updatedLead, assessment, tasks, actions };
  }

  if (
    updatedLead.stage === 'intro_sent' ||
    updatedLead.lifecycle.activationStatus !== 'not_started'
  ) {
    const subagentId =
      updatedLead.lifecycle.activationStatus === 'first_value'
        ? 'aha-tracker'
        : 'onboarding-planner';
    tasks.push(
      createTask(
        updatedLead,
        now,
        'activation-operator',
        'activation_followup',
        'Move the lead to first value quickly.',
        'high',
        {
          activationStatus: updatedLead.lifecycle.activationStatus,
          product: manifest.name,
          personalizationSummary: updatedLead.personalizationSummary ?? null,
          activationMoment: manifest.onboarding?.activationMoment ?? null,
        },
        subagentId,
        updatedLead.stage
      )
    );

    if (updatedLead.lifecycle.activationStatus === 'activated') {
      updatedLead.stage = 'activated';
    }

    if (updatedLead.lifecycle.paymentStatus !== 'paid') {
      const conversionSubagent =
        updatedLead.lifecycle.paymentStatus === 'trial' ? 'checkout-rescuer' : 'offer-selector';
      tasks.push(
        createTask(
          updatedLead,
          now,
          'conversion-operator',
          'conversion_followup',
          'Handle the next step toward paid conversion.',
          'medium',
          {
            activationStatus: updatedLead.lifecycle.activationStatus,
            paymentStatus: updatedLead.lifecycle.paymentStatus,
            pricingModel: manifest.onboarding?.pricingModel ?? null,
            primaryConversionEvent: manifest.onboarding?.primaryConversionEvent ?? null,
          },
          conversionSubagent,
          updatedLead.stage
        )
      );
    }

    if (
      updatedLead.lifecycle.paymentStatus === 'paid' ||
      updatedLead.lifecycle.advocacyStatus === 'candidate' ||
      updatedLead.lifecycle.advocacyStatus === 'advocate'
    ) {
      const retentionSubagent =
        updatedLead.lifecycle.advocacyStatus === 'candidate' ||
        updatedLead.lifecycle.advocacyStatus === 'advocate'
          ? 'advocacy-builder'
          : 'success-coach';
      tasks.push(
        createTask(
          updatedLead,
          now,
          'retention-operator',
          'retention_followup',
          'Protect usage, prevent churn, and build advocacy.',
          'medium',
          {
            paymentStatus: updatedLead.lifecycle.paymentStatus,
            advocacyStatus: updatedLead.lifecycle.advocacyStatus,
            retentionMoment: manifest.onboarding?.retentionMoment ?? null,
          },
          retentionSubagent,
          updatedLead.stage
        )
      );
    }

    return { updatedLead, assessment, tasks, actions };
  }

  return { updatedLead, assessment, tasks, actions };
}
