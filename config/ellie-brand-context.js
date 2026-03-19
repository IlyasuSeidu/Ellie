const BRAND_CONTEXT = {
  identity: {
    shortLabel: 'the miner building tech',
    builderLine: 'Built by a miner for shift workers.',
    builderLongLine:
      'I am a miner building software for the kind of shift-work reality I actually live.',
    builderOrigin: [
      'Miner since 2016',
      'Trained as a blast hole driller in 2017',
      'Long rotating shifts',
      'Builder after work',
    ],
  },
  product: {
    name: 'Ellie',
    currentNiche: 'mining shift workers',
    longTermVision: 'a general shift scheduler for all industries',
    positioning: [
      'practical',
      'premium',
      'reliable',
      'worker-first',
      'purpose-built shift companion',
    ],
    solves: [
      'complex rotating shift schedules',
      'day shifts, night shifts, off days, and repeating cycles',
      'future-date schedule confusion',
      'wrong alarms and missed shifts',
      'planning life around roster patterns',
      'offline shift access when needed',
      'FIFO and custom cycles',
    ],
  },
  audience: {
    primary: ['miners', 'shift workers'],
    secondary: ['builders', 'founders', 'future SaaS operators'],
    positioningRule:
      'Keep Ellie product-first. The miner-builder identity should support the product story, not replace it.',
  },
  narrativeOverlays: {
    minerBuilder: {
      id: 'miner-builder',
      label: 'Miner Builder',
      guidance: 'Reinforce that Ellie is built by someone who actually lives shift-work reality.',
    },
    vibeCoding: {
      id: 'vibe-coding',
      label: 'Vibe Coding',
      guidance:
        'For builder-facing content, frame Ellie as an AI-native, vibe-coded product built from lived pain into working software without letting the tooling become the whole story.',
    },
    freedomArc: {
      id: 'freedom-arc',
      label: 'Freedom Arc',
      guidance:
        'Use carefully. This is the long-term story of a miner building toward more freedom through software, not a hype claim.',
    },
    builderTeachingArc: {
      id: 'builder-teaching-arc',
      label: 'Builder Teaching Arc',
      guidance:
        'Use as a secondary layer on builder platforms: Ellie is part of a larger path toward teaching people how to build useful apps for others through AI-native workflows.',
    },
  },
  voice: {
    traits: ['direct', 'clear', 'thoughtful', 'real', 'disciplined', 'quietly ambitious'],
    avoid: [
      'fake startup hype',
      'invented traction',
      'invented revenue',
      'guru language',
      'overclaiming',
    ],
  },
  storyRules: {
    productFirst:
      'Lead with the product pain, the product decision, or the user tension before mentioning building methods.',
    proofRule:
      'Use current codebase inspection to understand the feature area, but do not convert current implementation details into false historical claims.',
    builderOverlayRule:
      'Use the miner-builder and vibe-coding overlays most heavily on builder-facing platforms. Keep them lighter on user-facing platforms.',
    trustRule:
      'Do not invent users, traction, revenue, or outcomes. Keep the story grounded in the actual product work.',
  },
  platformBias: {
    userFacing: ['tiktok', 'reels', 'shorts', 'carousel'],
    builderFacing: ['linkedin', 'x', 'threads'],
  },
};

module.exports = BRAND_CONTEXT;
