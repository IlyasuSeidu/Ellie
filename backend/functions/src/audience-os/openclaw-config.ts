import { AUDIENCE_AGENT_CATALOG } from './agent-catalog';

export function buildOpenClawAudienceConfig(rootPath: string): Record<string, unknown> {
  return {
    skills: {
      load: {
        extraDirs: [`${rootPath}/shared-skills`],
      },
    },
    agents: {
      list: AUDIENCE_AGENT_CATALOG.map((agent, index) => ({
        id: agent.id,
        default: index === 0,
        workspace: `${rootPath}/workspaces/${agent.id}`,
        skills: agent.skills,
        ...(agent.openClawTools ? { tools: agent.openClawTools } : {}),
      })),
    },
    bindings: [
      {
        agentId: 'inbound-intake',
        match: {
          channel: 'whatsapp',
          accountId: 'audience',
        },
      },
      {
        agentId: 'inbound-intake',
        match: {
          channel: 'telegram',
          accountId: 'audience',
        },
      },
    ],
    hooks: {
      enabled: true,
      token: 'replace-me',
      path: '/hooks',
      defaultSessionKey: 'hook:signalloop',
      allowRequestSessionKey: false,
      allowedSessionKeyPrefixes: ['hook:'],
      internal: {
        enabled: true,
        entries: {
          'session-memory': { enabled: true },
          'command-logger': { enabled: true },
        },
      },
      mappings: [
        {
          match: { path: 'opt-in' },
          action: 'agent',
          agentId: 'inbound-intake',
          deliver: false,
        },
        {
          match: { path: 'daily-run' },
          action: 'agent',
          agentId: 'orchestrator',
          deliver: false,
        },
        {
          match: { path: 'sheet-sync' },
          action: 'agent',
          agentId: 'sheet-sync-operator',
          deliver: false,
        },
      ],
    },
    cron: {
      enabled: true,
      maxConcurrentRuns: 2,
      sessionRetention: '24h',
      runLog: {
        maxBytes: '2mb',
        keepLines: 2000,
      },
    },
  };
}
