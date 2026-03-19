/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const PROVIDER_FILE_TARGETS = [
  {
    path: '03-hero-short.md',
    kind: 'hero-short',
    label: 'Hero short pack',
    platformId: null,
  },
  {
    path: '04-instagram-carousel.md',
    kind: 'carousel-pack',
    label: 'Instagram carousel pack',
    platformId: 'carousel',
  },
  {
    path: '05-linkedin-post.md',
    kind: 'linkedin-pack',
    label: 'LinkedIn post pack',
    platformId: 'linkedin',
  },
  {
    path: '06-x-thread.md',
    kind: 'x-pack',
    label: 'X thread pack',
    platformId: 'x',
  },
  {
    path: path.join('ready-to-post', 'instagram-reels', 'post.md'),
    kind: 'ready-post',
    label: 'Instagram Reels ready post',
    platformId: 'reels',
  },
  {
    path: path.join('ready-to-post', 'tiktok', 'post.md'),
    kind: 'ready-post',
    label: 'TikTok ready post',
    platformId: 'tiktok',
  },
  {
    path: path.join('ready-to-post', 'youtube-shorts', 'post.md'),
    kind: 'ready-post',
    label: 'YouTube Shorts ready post',
    platformId: 'shorts',
  },
  {
    path: path.join('ready-to-post', 'instagram-carousel', 'post.md'),
    kind: 'ready-post',
    label: 'Instagram carousel ready post',
    platformId: 'carousel',
  },
  {
    path: path.join('ready-to-post', 'linkedin', 'post.md'),
    kind: 'ready-post',
    label: 'LinkedIn ready post',
    platformId: 'linkedin',
  },
  {
    path: path.join('ready-to-post', 'x', 'post.md'),
    kind: 'ready-post',
    label: 'X ready post',
    platformId: 'x',
  },
  {
    path: path.join('ready-to-post', 'threads', 'post.md'),
    kind: 'ready-post',
    label: 'Threads ready post',
    platformId: 'threads',
  },
];

function buildSystemPrompt() {
  return [
    'You are the Ellie Build-in-Public Content Writer.',
    'Your job is to rewrite one markdown content file into stronger public-facing copy while keeping every claim defensible.',
    'Ellie is a shift scheduling product for miners, built by a miner from Ghana.',
    'Keep Ellie product-first.',
    'Use the miner-builder and vibe-coding overlays carefully, mainly on builder-facing platforms.',
    'Do not invent users, traction, revenue, launch results, or external outcomes.',
    'Do not mention GitHub, commit, push, repo, diff, workflow, or pipeline in publishable drafts.',
    'Do not return code fences or commentary. Return only the final markdown for the requested file.',
  ].join(' ');
}

function stringifyJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildBrandContextBlock(brandContext) {
  return [
    `Identity: ${brandContext.identity.shortLabel}`,
    `Builder line: ${brandContext.identity.builderLine}`,
    `Builder long line: ${brandContext.identity.builderLongLine}`,
    `Product: ${brandContext.product.name}`,
    `Current niche: ${brandContext.product.currentNiche}`,
    `Long-term vision: ${brandContext.product.longTermVision}`,
    `Positioning: ${brandContext.product.positioning.join(', ')}`,
    `Primary audience: ${brandContext.audience.primary.join(', ')}`,
    `Secondary audience: ${brandContext.audience.secondary.join(', ')}`,
    `Voice traits: ${brandContext.voice.traits.join(', ')}`,
    `Avoid: ${brandContext.voice.avoid.join(', ')}`,
    `Story rules: ${Object.values(brandContext.storyRules).join(' ')}`,
  ].join('\n');
}

function buildTargetInstructions(target, platformPlaybook) {
  const platformSpec = target.platformId ? platformPlaybook[target.platformId] : null;
  const instructions = [
    `Target file: ${target.path}`,
    `Target kind: ${target.kind}`,
    `Target label: ${target.label}`,
  ];

  if (platformSpec) {
    instructions.push(`Platform: ${platformSpec.label}`);
    instructions.push(`Audience: ${platformSpec.audience}`);
    instructions.push(`Objective: ${platformSpec.objective}`);
    instructions.push(`Native format: ${platformSpec.nativeFormat}`);
    instructions.push(`Target length: ${platformSpec.targetLength}`);
    instructions.push(`Hook rule: ${platformSpec.hookRule}`);
    instructions.push(`Structure: ${platformSpec.structure.join(' -> ')}`);
    instructions.push(`Overlay mode: ${platformSpec.overlayMode}`);
    instructions.push(`CTA style: ${platformSpec.ctaStyle}`);
  }

  if (target.kind === 'hero-short') {
    instructions.push(
      'Keep the pack optimized for short-form video with strong hooks, visual clarity, and clear proof.'
    );
  }

  if (target.kind === 'carousel-pack') {
    instructions.push('Make the carousel easy to scan, save, and share.');
  }

  if (target.kind === 'linkedin-pack') {
    instructions.push(
      'Make the post sharper, more opinionated, and builder-relevant without hype.'
    );
  }

  if (target.kind === 'x-pack') {
    instructions.push('Make the thread tight, sharp, and defensible.');
  }

  if (target.kind === 'ready-post') {
    instructions.push(
      'Preserve the markdown file structure, but strengthen the actual publishable words inside it.'
    );
  }

  return instructions.join('\n');
}

function buildPrompt({ target, analysis, brandContext, platformPlaybook, localDraft }) {
  const analysisSummary = {
    date: analysis.date,
    humanDate: analysis.humanDate,
    storyMode: analysis.codebaseContext?.storyMode || 'default',
    metaFocus: analysis.metaFocus,
    selectedAngles: (analysis.selectedAngles || []).map((angle) => angle.id),
    platformAngles: Object.fromEntries(
      Object.entries(analysis.platformAngles || {}).map(([platformId, angles]) => [
        platformId,
        angles.map((angle) => angle.id),
      ])
    ),
    topThemes: analysis.topThemes,
    topMoments: (analysis.topMoments || []).map((moment) => ({
      publicLabel: moment.publicLabel,
      tension: moment.tension,
      evidence: moment.evidence,
      lesson: moment.lesson,
    })),
    codebaseContext: {
      storyHighlights: analysis.codebaseContext?.storyHighlights || [],
      touchedFiles: (analysis.codebaseContext?.touchedFiles || []).map((file) => ({
        path: file.path,
        summary: file.summary,
      })),
    },
  };

  return [
    'Rewrite the draft below into stronger publishable markdown for Ellie.',
    '',
    'Brand context:',
    buildBrandContextBlock(brandContext),
    '',
    'Target instructions:',
    buildTargetInstructions(target, platformPlaybook),
    '',
    'Factual brief:',
    stringifyJson(analysisSummary),
    '',
    'Important constraints:',
    '- Keep chronology and proof defensible.',
    '- Use codebase context only to understand naming, flow, and product reality.',
    '- Do not convert current implementation details into false historical claims.',
    '- Product pain comes before tooling.',
    '- Miner-builder and vibe-coding can be layered in lightly on user-facing platforms and more strongly on builder-facing platforms.',
    '- Do not add fake metrics, traction, user quotes, or launch claims.',
    '- Return markdown only.',
    '',
    'Current local draft:',
    localDraft,
  ].join('\n');
}

async function callAnthropic({ apiKey, model, prompt, temperature, maxTokens }) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node runtime.');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      output_config: {
        effort: process.env.ANTHROPIC_EFFORT?.trim() || 'low',
      },
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const payload = await response.json();
  const text = (payload.content || [])
    .filter((entry) => entry.type === 'text')
    .map((entry) => entry.text)
    .join('\n\n')
    .trim();

  if (!text) {
    throw new Error('Anthropic returned an empty response.');
  }

  return {
    text,
    usage: payload.usage || {},
    id: payload.id || null,
    stopReason: payload.stop_reason || null,
  };
}

function ensureMarkdownShape(text, fallback) {
  const cleaned = text.trim();

  if (!cleaned) {
    return fallback;
  }

  return cleaned;
}

async function refineDraftsWithAnthropic({
  apiKey,
  model = DEFAULT_ANTHROPIC_MODEL,
  analysis,
  drafts,
  brandContext,
  platformPlaybook,
  outputDir,
  temperature = 0.7,
  maxTokens = 2400,
}) {
  const nextDrafts = { ...drafts };
  const metadata = {
    provider: 'anthropic',
    model,
    refinedFiles: [],
    failedFiles: [],
    requestCount: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };

  for (const target of PROVIDER_FILE_TARGETS) {
    const currentDraft = drafts[target.path];

    if (!currentDraft) {
      continue;
    }

    const prompt = buildPrompt({
      target,
      analysis,
      brandContext,
      platformPlaybook,
      localDraft: currentDraft,
    });

    try {
      const result = await callAnthropic({
        apiKey,
        model,
        prompt,
        temperature,
        maxTokens,
      });
      const finalText = ensureMarkdownShape(result.text, currentDraft);

      nextDrafts[target.path] = finalText;
      metadata.refinedFiles.push(target.path);
      metadata.requestCount += 1;
      metadata.usage.input_tokens += result.usage.input_tokens || 0;
      metadata.usage.output_tokens += result.usage.output_tokens || 0;
      metadata.usage.cache_creation_input_tokens += result.usage.cache_creation_input_tokens || 0;
      metadata.usage.cache_read_input_tokens += result.usage.cache_read_input_tokens || 0;
    } catch (error) {
      metadata.failedFiles.push({
        path: target.path,
        error: error.message,
      });
    }
  }

  fs.writeFileSync(
    path.join(outputDir, '11-provider-report.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8'
  );

  return {
    drafts: nextDrafts,
    metadata,
  };
}

module.exports = {
  DEFAULT_ANTHROPIC_MODEL,
  refineDraftsWithAnthropic,
};
