#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadSimpleEnv } = require(path.join(__dirname, 'lib', 'load-env'));
const { DEFAULT_ANTHROPIC_MODEL, refineDraftsWithAnthropic } = require(
  path.join(__dirname, 'lib', 'content-providers', 'anthropic')
);

const ROOT_DIR = process.cwd();
loadSimpleEnv(ROOT_DIR);
const OUTPUT_ROOT = path.join(ROOT_DIR, 'build-in-public', 'daily-content');
const { ANGLES, DAILY_SELECTION, LEGACY_ANGLE_ALIASES, PLATFORM_PROFILES } = require(
  path.join(ROOT_DIR, 'config', 'ellie-angle-framework')
);
const BRAND_CONTEXT = require(path.join(ROOT_DIR, 'config', 'ellie-brand-context'));
const { PLATFORM_PLAYBOOK } = require(path.join(ROOT_DIR, 'config', 'ellie-platform-playbook'));

const THEME_RULES = [
  {
    id: 'foundation',
    label: 'Foundation',
    publicLabel: 'invisible trust',
    keywords: [
      'initial project setup',
      'development environment',
      'typescript',
      'zod',
      'firebase',
      'services layer',
      'error handling',
      'foundation',
      'project documentation',
      'ci',
    ],
    pathFragments: ['package.json', 'tsconfig', 'src/services', 'src/utils', '.github/'],
  },
  {
    id: 'localization',
    label: 'Localization',
    publicLabel: 'language trust',
    keywords: ['i18n', 'locale', 'translation', 'language', 'localization'],
    pathFragments: ['src/i18n', 'locales/'],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    publicLabel: 'first-use clarity',
    keywords: ['onboarding', 'welcome', 'phase selector', 'start date', 'introduction'],
    pathFragments: ['src/screens/onboarding', 'src/components/onboarding'],
  },
  {
    id: 'paywall',
    label: 'Paywall',
    publicLabel: 'conversion clarity',
    keywords: ['paywall', 'trial', 'pricing', 'subscription'],
    pathFragments: ['paywall', 'RevenueCat'],
  },
  {
    id: 'calendar',
    label: 'Calendar Accuracy',
    publicLabel: 'schedule trust',
    keywords: ['calendar', 'date', 'phase', 'shift', 'anchor'],
    pathFragments: ['calendar', 'shiftUtils', 'dateUtils'],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    publicLabel: 'daily usefulness',
    keywords: ['dashboard', 'home screen', 'header'],
    pathFragments: ['dashboard', 'MainTabNavigator'],
  },
  {
    id: 'auth',
    label: 'Authentication',
    publicLabel: 'account trust',
    keywords: ['auth', 'sign in', 'sign up', 'verification', 'password'],
    pathFragments: ['src/screens/auth', 'AuthService'],
  },
  {
    id: 'voice',
    label: 'Voice Assistant',
    publicLabel: 'assistant responsiveness',
    keywords: ['voice', 'wake word', 'speech', 'ellie brain'],
    pathFragments: ['VoiceAssistant', 'wakeWord', 'SpeechRecognition'],
  },
  {
    id: 'design',
    label: 'Design Polish',
    publicLabel: 'visual trust',
    keywords: ['design', 'polish', 'animation', 'theme', 'copy'],
    pathFragments: ['theme', 'assets/', 'Premium', 'Screen.tsx'],
  },
  {
    id: 'testing',
    label: 'Testing',
    publicLabel: 'delivery confidence',
    keywords: ['test', 'coverage', 'mock', 'ci'],
    pathFragments: ['__tests__', '.test.', 'jest'],
  },
];

const CATEGORY_LABELS = {
  screens: 'screens',
  components: 'components',
  services: 'services',
  utils: 'utility logic',
  tests: 'tests',
  docs: 'docs',
  i18n: 'locales',
  navigation: 'navigation',
  assets: 'assets',
  config: 'config',
  native: 'native modules',
  other: 'other code',
};

const TEXT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
]);

const CODEBASE_SIGNAL_RULES = [
  {
    id: 'guided-onboarding-path',
    phrase: 'guided onboarding path',
    match: (filePath, content) =>
      filePath.includes('OnboardingNavigator') ||
      /createNativeStackNavigator|goToNextScreen|ProgressHeader/.test(content),
  },
  {
    id: 'chat-style-introduction',
    phrase: 'chat-style introduction that asks one thing at a time',
    match: (filePath, content) =>
      filePath.includes('PremiumIntroductionScreen') ||
      /ConversationStep|TypingIndicator|ChatMessage|QuickReply/.test(content),
  },
  {
    id: 'country-selection',
    phrase: 'country selection built into setup',
    match: (filePath, content) => /CountrySelector/.test(filePath) || /country/i.test(content),
  },
  {
    id: 'swipeable-pattern-cards',
    phrase: 'swipeable shift-pattern cards',
    match: (filePath, content) =>
      filePath.includes('PremiumShiftPatternScreen') ||
      /GestureDetector|Gesture\.Pan|swipe|SWIPE_THRESHOLD/.test(content),
  },
  {
    id: 'physics-motion',
    phrase: 'physics-based motion that needs to feel solid',
    match: (_filePath, content) => /withSpring|interpolate|ROTATION_ANGLE|Easing/.test(content),
  },
  {
    id: 'onboarding-state',
    phrase: 'setup state carried across screens',
    match: (_filePath, content) => /useOnboarding|OnboardingContext/.test(content),
  },
  {
    id: 'validated-input',
    phrase: 'validated setup inputs',
    match: (_filePath, content) => /z\.object|schema/.test(content),
  },
  {
    id: 'localized-copy',
    phrase: 'localized copy and language-aware UI',
    match: (_filePath, content) => /useTranslation|i18n|locales/.test(content),
  },
  {
    id: 'shift-math',
    phrase: 'shift and date math underneath the answer',
    match: (filePath, content) =>
      /shiftUtils|dateUtils/.test(filePath) || /ShiftPattern|Date/.test(content),
  },
  {
    id: 'service-layer',
    phrase: 'service and sync layer underneath the app',
    match: (filePath, content) =>
      filePath.includes('/services/') || /AsyncStorage|Firebase|AuthService|DataSync/.test(content),
  },
  {
    id: 'premium-first-impression',
    phrase: 'premium first impression on first open',
    match: (filePath, content) =>
      filePath.includes('PremiumWelcomeScreen') || /welcome screen|Get Started/i.test(content),
  },
  {
    id: 'calendar-setup',
    phrase: 'calendar-based shift setup',
    match: (filePath, content) =>
      /StartDate|Calendar|PhaseSelector/.test(filePath) || /calendar|phase/i.test(content),
  },
  {
    id: 'proof-through-tests',
    phrase: 'tests around the interaction and logic',
    match: (filePath, content) =>
      filePath.includes('__tests__') ||
      /\.test\./.test(filePath) ||
      /describe\(|it\(/.test(content),
  },
];

const SIGNAL_PRIORITIES = {
  'guided-onboarding-path': 12,
  'chat-style-introduction': 14,
  'country-selection': 8,
  'swipeable-pattern-cards': 14,
  'physics-motion': 6,
  'onboarding-state': 8,
  'validated-input': 6,
  'localized-copy': 3,
  'shift-math': 5,
  'service-layer': 5,
  'premium-first-impression': 10,
  'calendar-setup': 7,
  'proof-through-tests': 6,
};

const GENERIC_SIGNAL_IDS = new Set([
  'localized-copy',
  'shift-math',
  'service-layer',
  'validated-input',
  'proof-through-tests',
]);

const STORY_MODE_SIGNAL_BOOSTS = {
  'onboarding-momentum': {
    'guided-onboarding-path': 12,
    'chat-style-introduction': 16,
    'swipeable-pattern-cards': 16,
    'country-selection': 8,
    'physics-motion': 4,
  },
  'foundation-launch': {
    'shift-math': 12,
    'service-layer': 12,
    'premium-first-impression': 10,
    'proof-through-tests': 6,
  },
  'language-trust': {
    'localized-copy': 14,
    'premium-first-impression': 8,
  },
};

const FILE_SUMMARY_HINTS = [
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumIntroductionScreen\.tsx$/,
    summary:
      'One-question-at-a-time introduction flow that makes profile setup feel conversational instead of administrative.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumShiftPatternScreen\.tsx$/,
    summary:
      'Roster-pattern choice rebuilt into swipeable cards so people can recognize their schedule faster.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumWelcomeScreen\.tsx$/,
    summary: 'First screen that frames Ellie as a premium shift companion from the opening moment.',
  },
  {
    pattern: /src\/navigation\/OnboardingNavigator\.tsx$/,
    summary: 'Guided onboarding path that stitches the setup steps into one controlled flow.',
  },
  {
    pattern: /src\/components\/onboarding\/premium\/PremiumCountrySelector\.tsx$/,
    summary:
      'Country selection folded into setup so localization and future defaults start cleaner.',
  },
  {
    pattern: /src\/components\/onboarding\/premium\/PhaseSelector\.tsx$/,
    summary:
      'Phase selection that helps people place themselves correctly inside a repeating roster cycle.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumStartDateScreen\.tsx$/,
    summary:
      'Calendar-based start-date step that anchors the roster to a real day in the user’s life.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumShiftSystemScreen\.tsx$/,
    summary: 'Shift-system choice that separates two-shift and three-shift realities early.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumRosterTypeScreen\.tsx$/,
    summary:
      'Roster-type split that distinguishes rotating patterns from FIFO reality before setup gets deeper.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumAhaMomentScreen\.tsx$/,
    summary: 'Aha moment that turns setup effort into a visible long-range schedule payoff.',
  },
  {
    pattern: /src\/screens\/onboarding\/premium\/PremiumShiftTimeInputScreen\.tsx$/,
    summary:
      'Shift-time step that translates a selected roster into the hours a worker actually lives by.',
  },
  {
    pattern: /src\/components\/onboarding\/premium\/ProgressHeader\.tsx$/,
    summary: 'Progress header that makes a long setup feel finite and directed.',
  },
];

const SIGNAL_PUBLIC_PROOF_LINES = {
  'guided-onboarding-path': 'setup moved through one clearer path instead of feeling scattered',
  'chat-style-introduction':
    'the introduction started asking for profile details one thing at a time instead of dumping a form on people',
  'country-selection': 'country selection became part of the setup flow instead of an afterthought',
  'swipeable-pattern-cards':
    'roster-pattern choice shifted from a flat list into something people could recognize faster',
  'physics-motion':
    'the motion layer was cleaned up so the interaction could feel stable instead of fake',
  'onboarding-state': 'setup choices started carrying cleanly from screen to screen',
  'validated-input': 'setup inputs tightened so the flow could catch weak entries earlier',
  'localized-copy': 'the copy started sounding more native and less imported',
  'shift-math': 'the schedule answer had stronger shift and date logic underneath it',
  'service-layer': 'the app had more of the storage and service layer it needed under the surface',
  'premium-first-impression': 'the first screen started feeling more deliberate and premium',
  'calendar-setup': 'the calendar and phase steps became easier to place inside real roster life',
  'proof-through-tests':
    'the fragile parts got more test coverage before they could become trust leaks',
};

const THEME_STORY_FRAMES = {
  foundation: {
    area: 'the invisible foundation',
    stake: 'later moments should feel effortless because the underneath work is solid',
  },
  localization: {
    area: 'the language experience',
    stake: 'people should feel understood instantly, not translated at',
  },
  onboarding: {
    area: 'the first minute',
    stake: 'new people should know what to do without stopping to decode the screen',
  },
  paywall: {
    area: 'the pricing moment',
    stake: 'the offer should feel clear and earned, not pushy',
  },
  calendar: {
    area: 'the schedule answer',
    stake: 'people should trust what tomorrow says without second-guessing it',
  },
  dashboard: {
    area: 'the home screen answer',
    stake: 'the app should answer the reason someone opened it right away',
  },
  auth: {
    area: 'the sign-in moment',
    stake: 'entry should feel safe and simple',
  },
  voice: {
    area: 'the assistant moment',
    stake: 'help should feel immediate, not technical',
  },
  design: {
    area: 'the first impression',
    stake: 'the product should feel trustworthy before anyone learns the details',
  },
  testing: {
    area: 'the reliability layer',
    stake: 'the experience should hold up when real life gets messy',
  },
};

const META_STORY_ARCS = {
  clarity: {
    series: 'The First Minute',
    title: 'making the first minute easier to trust',
    promise:
      'show how tiny product choices change whether people understand the app fast enough to stay',
    character: 'someone deciding in the first minute whether this product deserves their attention',
  },
  trust: {
    series: 'Trust Leaks',
    title: 'closing a trust leak before it spreads',
    promise: 'show how small mismatches quietly break trust before users can explain why',
    character: 'someone looking for an answer they cannot afford to doubt',
  },
  responsiveness: {
    series: 'Fast Enough To Matter',
    title: 'making help feel immediate',
    promise: 'show how speed and clarity shape whether an assistant feels alive or frustrating',
    character: 'someone asking for help when they do not have time for friction',
  },
  momentum: {
    series: 'What The Product Is Becoming',
    title: 'turning scattered work into one visible chapter',
    promise: 'show how separate pieces of work add up to a product people can finally feel',
    character:
      'someone trying to understand what this product is becoming and whether it is for them',
  },
};

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function resolveContentProvider(args) {
  const explicitProvider = args.provider?.trim().toLowerCase();
  const envProvider = process.env.CONTENT_PROVIDER?.trim().toLowerCase();
  const requestedProvider = explicitProvider || envProvider || 'auto';

  if (requestedProvider === 'auto') {
    return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'local';
  }

  if (!['local', 'anthropic'].includes(requestedProvider)) {
    throw new Error(
      `Unsupported content provider "${requestedProvider}". Use "local", "anthropic", or omit the flag.`
    );
  }

  if (requestedProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is required when CONTENT_PROVIDER=anthropic or --provider anthropic is used.'
    );
  }

  return requestedProvider;
}

function resolveAnthropicModel(args) {
  return (
    args['anthropic-model']?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    DEFAULT_ANTHROPIC_MODEL
  );
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatHumanDate(dateString) {
  const parsed = new Date(`${dateString}T12:00:00Z`);

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatHumanDateTime(dateTimeString) {
  const parsed = new Date(dateTimeString.replace(' ', 'T'));

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function parseHourMinute(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');

  if (!match) {
    throw new Error(`Invalid rollover time "${value}". Use HH:MM in 24-hour time.`);
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid rollover time "${value}". Use HH:MM in 24-hour time.`);
  }

  return { hour, minute };
}

function resolveWindow(dateString, args) {
  if (args.since || args.until) {
    return {
      mode: 'explicit',
      rolloverTime: null,
      since: args.since || `${dateString} 00:00:00`,
      until: args.until || `${dateString} 23:59:59`,
    };
  }

  const rolloverTime = args['rollover-time']?.trim();

  if (!rolloverTime) {
    return {
      mode: 'calendar-day',
      rolloverTime: null,
      since: `${dateString} 00:00:00`,
      until: `${dateString} 23:59:59`,
    };
  }

  const { hour, minute } = parseHourMinute(rolloverTime);
  const windowStart = new Date(`${dateString}T${pad(hour)}:${pad(minute)}:00`);
  windowStart.setDate(windowStart.getDate() - 1);
  const windowEnd = new Date(`${dateString}T${pad(hour)}:${pad(minute)}:00`);
  windowEnd.setSeconds(windowEnd.getSeconds() - 1);

  return {
    mode: 'rollover-time',
    rolloverTime,
    since: formatDateTimeString(windowStart),
    until: formatDateTimeString(windowEnd),
  };
}

function buildWindowLine(window) {
  if (!window || window.mode === 'calendar-day') {
    return null;
  }

  const label = window.mode === 'rollover-time' ? `Rollover (${window.rolloverTime})` : 'Window';
  return `${label}: ${formatHumanDateTime(window.since)} to ${formatHumanDateTime(window.until)}`;
}

function joinNatural(parts) {
  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function capitalizeFirst(value) {
  if (!value) {
    return '';
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getThemeStoryFrame(themeId) {
  return (
    THEME_STORY_FRAMES[themeId] || {
      area: 'the experience',
      stake: 'people should feel the value without extra explanation',
    }
  );
}

function getMetaStoryArc(metaFocusId) {
  return (
    META_STORY_ARCS[metaFocusId] || {
      series: 'Building The Feeling',
      title: 'making the product easier to feel',
      promise: 'show how product work changes what people feel in the first moments of use',
      character: 'someone deciding whether this product makes sense fast enough',
    }
  );
}

const ANGLES_BY_ID = new Map(ANGLES.map((angle) => [angle.id, angle]));

function normalizeAngleId(angleId) {
  return LEGACY_ANGLE_ALIASES[angleId] || angleId;
}

function uniqueList(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatAngleMix(angles) {
  const labels = uniqueList((angles || []).map((angle) => angle?.label));

  if (!labels.length) {
    return 'User Empathy + Proof / Demo';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return `${labels[0]} + ${labels[1]}`;
}

function getPublicAreasFromThemes(themes, limit = 3) {
  return uniqueList(themes.map((theme) => getThemeStoryFrame(theme.id).area)).slice(0, limit);
}

function getPublicAreas(analysis, limit = 3) {
  return getPublicAreasFromThemes(analysis.topThemes, limit);
}

function getPublicMomentLabel(commit) {
  const subject = commit.subject.toLowerCase();

  if (
    subject.includes('initial project setup') ||
    subject.includes('development environment') ||
    subject.includes('typescript') ||
    subject.includes('firebase') ||
    subject.includes('services layer') ||
    subject.includes('foundation')
  ) {
    return 'the invisible foundation';
  }

  if (subject.includes('welcome')) {
    return 'the welcome moment';
  }

  if (subject.includes('paywall') || subject.includes('trial') || subject.includes('pricing')) {
    return 'the pricing moment';
  }

  if (
    subject.includes('i18n') ||
    subject.includes('localization') ||
    subject.includes('locale') ||
    subject.includes('language')
  ) {
    return 'the language experience';
  }

  if (subject.includes('introduction')) {
    return 'the introduction flow';
  }

  if (subject.includes('phase selector')) {
    return 'the phase selection flow';
  }

  if (subject.includes('start date') || subject.includes('calendar')) {
    return 'the calendar moment';
  }

  if (subject.includes('shift time')) {
    return 'the shift-time step';
  }

  if (subject.includes('dashboard') || subject.includes('home')) {
    return 'the home screen answer';
  }

  if (
    subject.includes('auth') ||
    subject.includes('sign in') ||
    subject.includes('sign up') ||
    subject.includes('password')
  ) {
    return 'the sign-in moment';
  }

  return getPublicAreasFromThemes(commit.themes, 1)[0] || 'the experience';
}

function buildMomentEvidence(commit) {
  const evidence = [];
  const publicLabel = getPublicMomentLabel(commit);

  if (publicLabel === 'the invisible foundation') {
    evidence.push('the underneath work got strong enough to support everything that comes next');
  }

  if (commit.localesTouched.length) {
    evidence.push(`${commit.localesTouched.length} languages tightened`);
  }

  if (commit.action === 'polish') {
    evidence.push(`${publicLabel} now reads faster on first contact`);
  }

  if (commit.action === 'fix') {
    evidence.push(`the hesitation point inside ${publicLabel} resolves more cleanly now`);
  }

  if (commit.action === 'complete') {
    evidence.push(`the last confusing edges inside ${publicLabel} were removed`);
  }

  if (commit.action === 'implement') {
    evidence.push(`${publicLabel} now has a clearer payoff without extra explanation`);
  }

  if (!evidence.length) {
    evidence.push(`${publicLabel} was reworked to feel clearer in motion`);
  }

  return joinNatural(evidence.slice(0, 2));
}

function buildPublicProof(analysis) {
  const areas = getPublicAreas(analysis, 3);
  const hero = analysis.topMoments[0];
  const parts = [];

  if (areas.length) {
    parts.push(`Today tightened ${joinNatural(areas)}.`);
  }

  if (analysis.totals.localeCount) {
    parts.push(`The language layer now reads across ${analysis.totals.localeCount} languages.`);
  }

  if (hero) {
    parts.push(`${capitalizeFirst(hero.publicLabel)} got the clearest pass: ${hero.evidence}.`);
  }

  return parts.join(' ');
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function hashString(input) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function pickVariant(seed, options) {
  if (!options.length) {
    return '';
  }

  return options[hashString(seed) % options.length];
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeTextFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function writeJsonFile(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function removeFileIfExists(filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
  }
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
}

function safeNumber(value) {
  if (value === '-' || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function categorizeFile(filePath) {
  if (filePath.includes('__tests__') || filePath.includes('.test.')) {
    return 'tests';
  }

  if (filePath.startsWith('src/screens/')) {
    return 'screens';
  }

  if (filePath.startsWith('src/components/')) {
    return 'components';
  }

  if (filePath.startsWith('src/services/')) {
    return 'services';
  }

  if (filePath.startsWith('src/utils/')) {
    return 'utils';
  }

  if (filePath.startsWith('src/i18n/')) {
    return 'i18n';
  }

  if (filePath.startsWith('src/navigation/')) {
    return 'navigation';
  }

  if (filePath.startsWith('docs/')) {
    return 'docs';
  }

  if (filePath.startsWith('assets/')) {
    return 'assets';
  }

  if (
    filePath.startsWith('android/') ||
    filePath.startsWith('ios/') ||
    filePath.startsWith('modules/')
  ) {
    return 'native';
  }

  if (
    filePath.endsWith('.json') ||
    filePath.endsWith('.config.js') ||
    filePath === 'package.json' ||
    filePath === 'package-lock.json' ||
    filePath === 'tsconfig.json'
  ) {
    return 'config';
  }

  return 'other';
}

function detectThemes(subject, body, files) {
  const haystack =
    `${subject}\n${body}\n${files.map((file) => file.path).join('\n')}`.toLowerCase();

  return THEME_RULES.map((theme) => {
    let score = 0;

    theme.keywords.forEach((keyword) => {
      if (haystack.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });

    theme.pathFragments.forEach((fragment) => {
      if (haystack.includes(fragment.toLowerCase())) {
        score += 3;
      }
    });

    return {
      ...theme,
      score,
    };
  })
    .filter((theme) => theme.score > 0)
    .sort((left, right) => right.score - left.score);
}

function inferAction(subject) {
  const normalized = subject.trim().toLowerCase();

  if (/^(fix|resolve|restore|repair|stabilize)\b/.test(normalized)) {
    return 'fix';
  }

  if (/^(polish|refine|tune|tighten)\b/.test(normalized)) {
    return 'polish';
  }

  if (/^(implement|add|build|create|ship)\b/.test(normalized)) {
    return 'implement';
  }

  if (/^(complete|finish)\b/.test(normalized)) {
    return 'complete';
  }

  if (/^(test)\b/.test(normalized)) {
    return 'test';
  }

  if (/^(docs|document)\b/.test(normalized)) {
    return 'docs';
  }

  return 'update';
}

function summarizeFiles(files) {
  const categoryCounts = {};
  const localeSet = new Set();
  let testsTouched = 0;
  let added = 0;
  let deleted = 0;

  files.forEach((file) => {
    added += file.added;
    deleted += file.deleted;
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1;

    if (file.category === 'tests') {
      testsTouched += 1;
    }

    const localeMatch = file.path.match(/^src\/i18n\/locales\/([^/]+)\//);
    if (localeMatch) {
      localeSet.add(localeMatch[1]);
    }
  });

  return {
    added,
    deleted,
    testsTouched,
    categoryCounts,
    localesTouched: Array.from(localeSet).sort(),
  };
}

function scoreCommit(commit) {
  let score = 0;

  score += Math.min(commit.files.length, 8);
  score += Math.min(Math.round((commit.added + commit.deleted) / 80), 6);

  if (commit.action === 'fix') {
    score += 7;
  }

  if (commit.action === 'polish') {
    score += 6;
  }

  if (commit.action === 'complete') {
    score += 5;
  }

  if (commit.action === 'implement') {
    score += 4;
  }

  if (commit.categoryCounts.screens || commit.categoryCounts.components) {
    score += 4;
  }

  if (commit.categoryCounts.i18n) {
    score += 4;
  }

  if (commit.categoryCounts.tests) {
    score += 2;
  }

  if (/crash|off-by-one|merge|wrong|broken|fix/i.test(commit.subject)) {
    score += 4;
  }

  if (/welcome|paywall|intro|phase|calendar|language|localization/i.test(commit.subject)) {
    score += 3;
  }

  return score;
}

function parseCommitFiles(hash) {
  const raw = runGit(['show', '--numstat', '--format=', hash]);
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [addedRaw, deletedRaw, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t');

    return {
      path: filePath,
      added: safeNumber(addedRaw),
      deleted: safeNumber(deletedRaw),
      category: categorizeFile(filePath),
    };
  });
}

function parseCommits(since, until) {
  const raw = runGit([
    'log',
    `--since=${since}`,
    `--until=${until}`,
    '--reverse',
    '--date=iso-strict',
    '--pretty=format:%H%x1f%ad%x1f%s%x1f%b%x1e',
  ]);

  const records = raw
    .split('\x1e')
    .map((item) => item.trim())
    .filter(Boolean);

  return records.map((record) => {
    const [hash, authoredAt, subject, body = ''] = record.split('\x1f');
    const files = parseCommitFiles(hash);
    const fileSummary = summarizeFiles(files);
    const themes = detectThemes(subject, body, files);

    return {
      hash,
      shortHash: hash.slice(0, 7),
      authoredAt,
      subject: subject.trim(),
      body: body.trim(),
      files,
      added: fileSummary.added,
      deleted: fileSummary.deleted,
      testsTouched: fileSummary.testsTouched,
      localesTouched: fileSummary.localesTouched,
      categoryCounts: fileSummary.categoryCounts,
      action: inferAction(subject),
      themes,
    };
  });
}

function isTextFile(filePath) {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath));
}

function isExistingFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function resolveProjectFile(filePath) {
  const directPath = path.join(ROOT_DIR, filePath);

  if (isExistingFile(directPath)) {
    return directPath;
  }

  return null;
}

function tryResolveImport(baseAbsolutePath, importPath) {
  let candidateBase = null;

  if (importPath.startsWith('@/')) {
    candidateBase = path.join(ROOT_DIR, 'src', importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    candidateBase = path.resolve(path.dirname(baseAbsolutePath), importPath);
  } else {
    return null;
  }

  const attempts = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    path.join(candidateBase, 'index.ts'),
    path.join(candidateBase, 'index.tsx'),
    path.join(candidateBase, 'index.js'),
    path.join(candidateBase, 'index.jsx'),
  ];

  return attempts.find((candidate) => isExistingFile(candidate)) || null;
}

function readTextFileSafe(absolutePath) {
  if (!absolutePath || !isTextFile(absolutePath)) {
    return null;
  }

  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch (_error) {
    return null;
  }
}

function extractHeaderSummary(content) {
  if (!content) {
    return null;
  }

  const docBlockMatch = content.match(/^\/\*\*([\s\S]*?)\*\//);

  if (docBlockMatch) {
    const lines = docBlockMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('@'));
    const usefulLines = lines.filter(
      (line) => !/component$/i.test(line) && !/^feature$/i.test(line)
    );

    if (usefulLines.length) {
      return usefulLines.slice(0, 2).join(' ');
    }
  }

  const headingMatch = content.match(/^#\s+(.+)$/m);

  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return null;
}

function extractImports(content) {
  if (!content) {
    return [];
  }

  const matches = Array.from(content.matchAll(/from\s+['"]([^'"]+)['"]/g));
  return uniqueList(matches.map((match) => match[1]));
}

function detectCodebaseSignals(filePath, content) {
  return CODEBASE_SIGNAL_RULES.filter((rule) => rule.match(filePath, content));
}

function getSummaryHint(relativePath) {
  return FILE_SUMMARY_HINTS.find((hint) => hint.pattern.test(relativePath))?.summary || null;
}

function summarizeCurrentFile(relativePath, role = 'touched') {
  const absolutePath = resolveProjectFile(relativePath);

  if (!absolutePath) {
    return {
      path: relativePath,
      role,
      exists: false,
      summary: 'Current file no longer exists in the workspace.',
      signals: [],
      relatedFiles: [],
    };
  }

  const content = readTextFileSafe(absolutePath);
  const headerSummary = extractHeaderSummary(content);
  const signals = detectCodebaseSignals(relativePath, content || '');
  const relatedFiles = (content ? extractImports(content) : [])
    .map((importPath) => tryResolveImport(absolutePath, importPath))
    .filter(Boolean)
    .slice(0, 3)
    .map((resolvedPath) => path.relative(ROOT_DIR, resolvedPath));

  return {
    path: relativePath,
    role,
    exists: true,
    summary:
      getSummaryHint(relativePath) ||
      headerSummary ||
      `${path.basename(relativePath)} is part of the current codebase around this feature area.`,
    signals: signals.map((signal) => signal.id),
    signalPhrases: signals.map((signal) => signal.phrase),
    relatedFiles,
  };
}

function scoreContextFile(file) {
  let score = 0;

  if (file.category === 'screens') {
    score += 30;
  } else if (file.category === 'components') {
    score += 24;
  } else if (file.category === 'navigation') {
    score += 22;
  } else if (file.category === 'utils' || file.category === 'services') {
    score += 18;
  } else if (file.category === 'tests') {
    score += 10;
  } else {
    score += 4;
  }

  if (
    /onboarding|welcome|introduction|pattern|country|phase|calendar|paywall|dashboard|voice/i.test(
      file.path
    )
  ) {
    score += 18;
  }

  if (/Context/i.test(file.path)) {
    score += 8;
  }

  if (/App\.tsx|jest\.setup|babel\.config|tsconfig|package(-lock)?\.json/i.test(file.path)) {
    score -= 20;
  }

  return score;
}

function dedupeHighlights(values) {
  return uniqueList(
    (values || []).map((value) => value?.trim()).filter((value) => value && value.length > 0)
  );
}

function inferStoryModeFromSignals(signalCounts) {
  if (
    signalCounts.has('guided-onboarding-path') &&
    (signalCounts.has('swipeable-pattern-cards') || signalCounts.has('chat-style-introduction'))
  ) {
    return 'onboarding-momentum';
  }

  if (
    signalCounts.has('shift-math') &&
    signalCounts.has('service-layer') &&
    signalCounts.has('premium-first-impression')
  ) {
    return 'foundation-launch';
  }

  if (signalCounts.has('localized-copy')) {
    return 'language-trust';
  }

  return 'default';
}

function rankSignalsForStoryMode(signalCounts, storyMode) {
  const boosts = STORY_MODE_SIGNAL_BOOSTS[storyMode] || {};
  const hasSpecificSignal = Array.from(signalCounts.keys()).some(
    (signalId) => !GENERIC_SIGNAL_IDS.has(signalId)
  );

  return Array.from(signalCounts.entries())
    .map(([signalId, score]) => ({
      signalId,
      score:
        score +
        (boosts[signalId] || 0) +
        (hasSpecificSignal && GENERIC_SIGNAL_IDS.has(signalId) ? -4 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ signalId }) => CODEBASE_SIGNAL_RULES.find((rule) => rule.id === signalId))
    .filter(Boolean);
}

function buildStoryHighlightsFromContext(allFiles, rankedSignals, storyMode) {
  const summaryHighlights = allFiles
    .filter((file) => file.summary && file.exists)
    .map((file) => file.summary);
  const signalHighlights = rankedSignals.map((signal) => signal.phrase);

  if (storyMode === 'onboarding-momentum') {
    return dedupeHighlights([
      ...summaryHighlights.slice(0, 3),
      ...signalHighlights.slice(0, 3),
    ]).slice(0, 6);
  }

  if (storyMode === 'foundation-launch') {
    return dedupeHighlights([
      ...signalHighlights.slice(0, 3),
      ...summaryHighlights.slice(0, 2),
    ]).slice(0, 6);
  }

  return dedupeHighlights([
    ...signalHighlights.slice(0, 4),
    ...summaryHighlights.slice(0, 2),
  ]).slice(0, 6);
}

function collectCodebaseContext(analysis) {
  const candidateFiles = [];
  const seenPaths = new Set();

  analysis.commits.slice(0, 5).forEach((commit) => {
    commit.files.forEach((file) => {
      if (seenPaths.has(file.path)) {
        return;
      }

      if (
        ['screens', 'components', 'navigation', 'services', 'utils', 'tests', 'other'].includes(
          file.category
        ) &&
        isTextFile(file.path)
      ) {
        candidateFiles.push(file);
        seenPaths.add(file.path);
      }
    });
  });

  const touchedFiles = candidateFiles
    .sort((left, right) => scoreContextFile(right) - scoreContextFile(left))
    .slice(0, 6)
    .map((file) => summarizeCurrentFile(file.path));
  const relatedPaths = uniqueList(
    touchedFiles.flatMap((file) => file.relatedFiles).filter((filePath) => !seenPaths.has(filePath))
  ).slice(0, 4);
  const relatedFiles = relatedPaths.map((filePath) => summarizeCurrentFile(filePath, 'related'));
  const allFiles = [...touchedFiles, ...relatedFiles];
  const signalCounts = new Map();

  allFiles.forEach((file) => {
    (file.signals || []).forEach((signalId) => {
      signalCounts.set(
        signalId,
        (signalCounts.get(signalId) || 0) + (SIGNAL_PRIORITIES[signalId] || 1)
      );
    });
  });
  const storyMode = inferStoryModeFromSignals(signalCounts);
  const rankedSignals = rankSignalsForStoryMode(signalCounts, storyMode);
  const storyHighlights = buildStoryHighlightsFromContext(allFiles, rankedSignals, storyMode);

  return {
    storyMode,
    touchedFiles,
    relatedFiles,
    storyHighlights,
    signalIds: rankedSignals.map((signal) => signal.id),
  };
}

function buildCodebaseContextMarkdown(analysis) {
  const codebaseContext = analysis.codebaseContext;

  if (!codebaseContext) {
    return `
# Codebase Context

No current codebase context was captured for this day.
`;
  }

  const touchedLines = codebaseContext.touchedFiles.map(
    (file) =>
      `- \`${file.path}\`: ${file.summary}${file.signalPhrases?.length ? ` (${joinNatural(file.signalPhrases)})` : ''}`
  );
  const relatedLines = codebaseContext.relatedFiles.length
    ? codebaseContext.relatedFiles.map(
        (file) =>
          `- \`${file.path}\`: ${file.summary}${file.signalPhrases?.length ? ` (${joinNatural(file.signalPhrases)})` : ''}`
      )
    : ['- No extra related files were inspected.'];

  return `
# Codebase Context

This section uses the current workspace to understand what the touched feature area actually does now. Treat it as context for naming, behavior, and product understanding, not as proof that every current detail existed on the historical day.

## Story Highlights

${codebaseContext.storyHighlights.map((highlight) => `- ${highlight}`).join('\n')}

## Touched Files Reviewed

${touchedLines.join('\n')}

## Related Files Reviewed

${relatedLines.join('\n')}
`;
}

function loadHistory(outputRoot, currentDate) {
  if (!fs.existsSync(outputRoot)) {
    return [];
  }

  return fs
    .readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== currentDate)
    .map((entry) => path.join(outputRoot, entry.name, '00-brief.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildAngleUsage(history) {
  const usage = new Map();

  ANGLES.forEach((angle, index) => {
    usage.set(angle.id, { count: 0, lastSeen: -1, index });
  });

  history.forEach((entry, historyIndex) => {
    const uniqueAngleIds = new Set(
      [...(entry.selectedAngles || []), ...Object.values(entry.platformAngles || {}).flat()].map(
        normalizeAngleId
      )
    );

    uniqueAngleIds.forEach((angleId) => {
      const current = usage.get(angleId);
      if (!current) {
        return;
      }

      current.count += 1;
      current.lastSeen = historyIndex;
    });
  });

  return usage;
}

function scoreAngle(angle, analysis, platformId) {
  let score = 0;
  const topThemeIds = new Set(analysis.topThemes.map((theme) => theme.id));

  if (angle.metaFocus.includes(analysis.metaFocus.id)) {
    score += 12;
  }

  if (angle.actions.includes(analysis.dominantAction)) {
    score += 8;
  }

  angle.themes.forEach((themeId) => {
    if (topThemeIds.has(themeId)) {
      score += 4;
    }
  });

  if (platformId) {
    const profile = PLATFORM_PROFILES[platformId];
    const index = profile.bank.indexOf(angle.id);

    if (index === -1) {
      return Number.NEGATIVE_INFINITY;
    }

    score += (profile.bank.length - index) * 4;
  }

  return score;
}

function rankAngles(candidates, usage, analysis, seed, platformId) {
  return candidates.slice().sort((left, right) => {
    const leftScore = scoreAngle(left, analysis, platformId);
    const rightScore = scoreAngle(right, analysis, platformId);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftUsage = usage.get(left.id);
    const rightUsage = usage.get(right.id);

    if (leftUsage.count !== rightUsage.count) {
      return leftUsage.count - rightUsage.count;
    }

    if (leftUsage.lastSeen !== rightUsage.lastSeen) {
      return leftUsage.lastSeen - rightUsage.lastSeen;
    }

    const leftSeed = hashString(`${seed}:${platformId || 'daily'}:${left.id}`);
    const rightSeed = hashString(`${seed}:${platformId || 'daily'}:${right.id}`);
    return leftSeed - rightSeed;
  });
}

function chooseAngles(usage, analysis, seed) {
  const selected = [];
  const selectedIds = new Set();

  DAILY_SELECTION.lanes.forEach((lane) => {
    const candidates = ANGLES.filter((angle) => angle.lane === lane && !selectedIds.has(angle.id));
    const best = rankAngles(candidates, usage, analysis, seed).find(
      (angle) => !selectedIds.has(angle.id)
    );

    if (!best) {
      return;
    }

    selected.push(best);
    selectedIds.add(best.id);
  });

  if (selected.length < DAILY_SELECTION.selectionCount) {
    rankAngles(ANGLES, usage, analysis, seed).forEach((angle) => {
      if (selected.length >= DAILY_SELECTION.selectionCount || selectedIds.has(angle.id)) {
        return;
      }

      selected.push(angle);
      selectedIds.add(angle.id);
    });
  }

  return selected.slice(0, DAILY_SELECTION.selectionCount);
}

function choosePlatformAngleMix(platformId, usage, analysis, seed) {
  const profile = PLATFORM_PROFILES[platformId];
  const selected = [];
  const selectedIds = new Set();

  profile.preferredLanes.forEach((lane) => {
    if (selected.length >= 2) {
      return;
    }

    const candidates = ANGLES.filter(
      (angle) =>
        angle.lane === lane && profile.bank.includes(angle.id) && !selectedIds.has(angle.id)
    );
    const best = rankAngles(candidates, usage, analysis, seed, platformId).find(
      (angle) => !selectedIds.has(angle.id)
    );

    if (!best) {
      return;
    }

    selected.push(best);
    selectedIds.add(best.id);
  });

  if (selected.length < 2) {
    const bankAngles = profile.bank.map((angleId) => ANGLES_BY_ID.get(angleId)).filter(Boolean);

    rankAngles(bankAngles, usage, analysis, seed, platformId).forEach((angle) => {
      if (selected.length >= 2 || selectedIds.has(angle.id)) {
        return;
      }

      selected.push(angle);
      selectedIds.add(angle.id);
    });
  }

  return selected;
}

function choosePlatformAngles(usage, analysis, seed) {
  return Object.keys(PLATFORM_PROFILES).reduce((accumulator, platformId) => {
    accumulator[platformId] = choosePlatformAngleMix(platformId, usage, analysis, seed);
    return accumulator;
  }, {});
}

function getPlatformAngles(analysis, platformId, fallbackCount = 2) {
  const angles = analysis.platformAngles?.[platformId] || [];

  if (angles.length) {
    return angles;
  }

  return analysis.selectedAngles.slice(0, fallbackCount);
}

function selectTopMoments(rankedCommits, limit = 3) {
  const uniqueMoments = [];
  const fallbackMoments = [];
  const seenLabels = new Set();

  rankedCommits.forEach((commit) => {
    const moment = buildMoment(commit, 0);

    if (!seenLabels.has(moment.publicLabel) && uniqueMoments.length < limit) {
      seenLabels.add(moment.publicLabel);
      uniqueMoments.push(moment);
      return;
    }

    fallbackMoments.push(moment);
  });

  const selected = uniqueMoments.slice();

  fallbackMoments.forEach((moment) => {
    if (selected.length < limit) {
      selected.push(moment);
    }
  });

  return selected.slice(0, limit).map((moment, index) => ({
    ...moment,
    rank: index + 1,
    slug: `${String(index + 1).padStart(2, '0')}-${slugify(moment.subject)}`,
  }));
}

function aggregateAnalysis(commits, dateString, history, window) {
  const totals = {
    commits: commits.length,
    filesChanged: 0,
    additions: 0,
    deletions: 0,
    testsTouched: 0,
    localeCount: 0,
  };
  const allThemeScores = new Map();
  const allCategoryCounts = {};
  const allLocales = new Set();
  const actionCounts = {};

  commits.forEach((commit) => {
    totals.filesChanged += commit.files.length;
    totals.additions += commit.added;
    totals.deletions += commit.deleted;
    totals.testsTouched += commit.testsTouched;
    commit.localesTouched.forEach((locale) => allLocales.add(locale));
    actionCounts[commit.action] = (actionCounts[commit.action] || 0) + 1;

    Object.entries(commit.categoryCounts).forEach(([category, count]) => {
      allCategoryCounts[category] = (allCategoryCounts[category] || 0) + count;
    });

    commit.themes.forEach((theme) => {
      allThemeScores.set(theme.id, {
        id: theme.id,
        label: theme.label,
        publicLabel: theme.publicLabel,
        score: (allThemeScores.get(theme.id)?.score || 0) + theme.score,
      });
    });
  });

  totals.localeCount = allLocales.size;

  const topThemes = Array.from(allThemeScores.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);

  const dominantAction =
    Object.entries(actionCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || 'update';
  const metaFocus = inferMetaFocus(topThemes);
  const metaArc = getMetaStoryArc(metaFocus.id);
  const angleUsage = buildAngleUsage(history);
  const selectedAngles = chooseAngles(
    angleUsage,
    { topThemes, dominantAction, metaFocus },
    `${dateString}:${metaFocus.id}`
  );
  const platformAngles = choosePlatformAngles(
    angleUsage,
    { topThemes, dominantAction, metaFocus, selectedAngles },
    `${dateString}:${metaFocus.id}`
  );
  const rankedCommits = commits
    .map((commit) => ({ ...commit, score: scoreCommit(commit) }))
    .sort((left, right) => right.score - left.score);
  const topMoments = selectTopMoments(rankedCommits, 3);
  const analysisForContext = {
    commits: rankedCommits,
    topThemes,
    dominantAction,
    metaFocus,
  };
  const codebaseContext = collectCodebaseContext(analysisForContext);

  return {
    date: dateString,
    humanDate: formatHumanDate(dateString),
    window,
    totals,
    dominantAction,
    metaFocus,
    metaArc,
    topThemes,
    topCategories: Object.entries(allCategoryCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([category, count]) => ({
        id: category,
        label: CATEGORY_LABELS[category] || category,
        count,
      })),
    categoryCounts: allCategoryCounts,
    selectedAngles,
    platformAngles,
    commits: rankedCommits,
    topMoments,
    codebaseContext,
    allLocales: Array.from(allLocales).sort(),
  };
}

function hasTheme(analysis, themeId) {
  return analysis.topThemes.some((theme) => theme.id === themeId);
}

function commitTouchesVisibleLayer(commit) {
  const visibleThemes = new Set(['onboarding', 'design', 'paywall', 'dashboard', 'auth']);

  return (
    Boolean(commit.categoryCounts.screens || commit.categoryCounts.components) ||
    commit.themes.some((theme) => visibleThemes.has(theme.id))
  );
}

function findHighestScoringCommit(analysis, predicate) {
  return analysis.commits.find(predicate) || null;
}

function findLatestCommit(analysis, predicate) {
  return (
    analysis.commits
      .filter(predicate)
      .slice()
      .sort((left, right) => left.authoredAt.localeCompare(right.authoredAt))
      .pop() || null
  );
}

function isFoundationLaunchDay(analysis) {
  const initialFoundationCommitCount = analysis.commits.filter((commit) =>
    /initial project setup|development environment|typescript type definitions|utility functions|foundation layer|services layer|firebase configuration|error handling/i.test(
      commit.subject
    )
  ).length;
  const initialVisibleCommitCount = analysis.commits.filter((commit) =>
    /welcome|premium onboarding component library/i.test(commit.subject)
  ).length;

  return (
    hasTheme(analysis, 'foundation') &&
    hasTheme(analysis, 'testing') &&
    analysis.totals.commits >= 8 &&
    analysis.commits.some(commitTouchesVisibleLayer) &&
    initialFoundationCommitCount >= 2 &&
    initialVisibleCommitCount >= 1
  );
}

function buildFoundationProofLine(commit) {
  if (!commit) {
    return 'The invisible answer layer was built before the visible flow started making promises.';
  }

  if (/shift calculations|date handling|calendar/i.test(commit.subject)) {
    return 'Shift calculation and date handling landed early, so the answer layer existed before the visible flow started making promises.';
  }

  if (/services layer|foundation layer/i.test(commit.subject)) {
    return 'The underlying services landed before the visible flow asked anyone to trust the result.';
  }

  return `${capitalizeFirst(getPublicMomentLabel(commit))} was built before the visible flow started making promises.`;
}

function buildServiceProofLine(commit) {
  if (!commit) {
    return 'The service layer followed with the state and safeguards the later screens would depend on.';
  }

  if (/services layer/i.test(commit.subject)) {
    return 'The service layer followed with auth, storage, sync, notifications, and tests around the state later screens would depend on.';
  }

  if (/error handling|firebase|foundation/i.test(commit.subject)) {
    return 'The supporting layer followed with error handling, configuration, and safeguards around the experience later screens would depend on.';
  }

  return `${capitalizeFirst(getPublicMomentLabel(commit))} was hardened before the visible layer became the story people could see.`;
}

function buildSurfaceProofLine(componentCommit, screenCommit) {
  if (componentCommit && screenCommit) {
    return 'Later that same day, premium onboarding components and the first welcome screen appeared on top of that groundwork.';
  }

  if (screenCommit) {
    return 'Later that same day, the first welcome screen appeared on top of that groundwork.';
  }

  if (componentCommit) {
    return 'Later that same day, the first onboarding layer appeared on top of that groundwork.';
  }

  return 'The first visible layer showed up only after the underneath work could support it.';
}

function buildFoundationLaunchContext(analysis) {
  if (!isFoundationLaunchDay(analysis)) {
    return null;
  }

  const mathCommit =
    findHighestScoringCommit(analysis, (commit) =>
      /shift calculations|date handling/i.test(commit.subject)
    ) ||
    findHighestScoringCommit(
      analysis,
      (commit) =>
        /utility functions|foundation layer/i.test(commit.subject) ||
        commit.themes.some((theme) => theme.id === 'calendar')
    );
  const servicesCommit =
    findHighestScoringCommit(
      analysis,
      (commit) =>
        /services layer/i.test(commit.subject) || (commit.categoryCounts.services || 0) >= 3
    ) ||
    findHighestScoringCommit(analysis, (commit) =>
      /error handling|firebase|foundation layer/i.test(commit.subject)
    ) ||
    findHighestScoringCommit(analysis, (commit) =>
      commit.themes.some((theme) => theme.id === 'testing')
    );
  const componentCommit = findHighestScoringCommit(
    analysis,
    (commit) =>
      /onboarding|phase|calendar and country selector/i.test(commit.subject) ||
      Boolean(commit.categoryCounts.components)
  );
  const screenCommit = findLatestCommit(
    analysis,
    (commit) => /welcome/i.test(commit.subject) || Boolean(commit.categoryCounts.screens)
  );

  const proof = [
    buildFoundationProofLine(mathCommit),
    buildServiceProofLine(servicesCommit),
    buildSurfaceProofLine(componentCommit, screenCommit),
  ].join(' ');

  return {
    headline: `${analysis.humanDate}: building the answer before the screen`,
    storyLens:
      'Day 1 had two jobs: build the invisible foundation a miner will never see, then let the first visible layer land on something truthful.',
    character:
      'a miner checking tomorrow before dawn and deciding in half a second whether to trust the answer',
    friction:
      'The easy day-1 story is "ship something visible." For Ellie, the real risk was making promises on the surface before the answer layer deserved trust.',
    wrongRead:
      'It is tempting to tell a cleaner story and pretend day 1 was only invisible work. It was not. The real day had both: deep foundation work first, then the first visible onboarding layer on top of it.',
    shift:
      'Build shift math, services, and safeguards first. Then let the welcome flow and onboarding components start appearing on that base the same day.',
    proof,
    openLoop:
      'Now that the underneath work exists, which visible moment should prove that trust fastest?',
    mainAreas: 'shift math, the service layer, and the first onboarding layer',
    strongestScene: 'the first visible welcome layer landing on top of tested groundwork',
    scaleNote: 'Day 1 was both infrastructure and first surface, not one or the other.',
    moments: [
      {
        rank: 1,
        publicLabel: 'the shift answer',
        tension: `If "Tomorrow: Night Shift" is wrong, nothing else in the app matters.`,
        evidence:
          'Shift calculation and date handling landed before the visible flow started making promises.',
        lesson:
          'Foundational logic becomes story material when you tie it to the one answer the user is betting on.',
      },
      {
        rank: 2,
        publicLabel: 'the service layer',
        tension:
          'A polished screen still feels shaky if the state and sync underneath it are not trustworthy.',
        evidence:
          'Auth, storage, sync, notifications, and supporting services were built before the visible layer became the headline.',
        lesson:
          'Invisible reliability is worth posting when it changes whether a future screen deserves belief.',
      },
      {
        rank: 3,
        publicLabel: 'the first visible layer',
        tension:
          'Day 1 did end with something visible. The more interesting part is what that visible layer was standing on.',
        evidence:
          'Premium onboarding components and the first welcome screen landed later that same day on top of the groundwork.',
        lesson:
          'The first visible layer becomes a stronger story when you show the truth underneath it, not just the animation on top.',
      },
    ],
    hooks: [
      `If "Tomorrow: Night Shift" is wrong, the animation does not matter.`,
      'Day 1 had two jobs: build the answer, then build the first screen people could trust.',
      'Most day-1 posts chase something visible. I needed something believable.',
      'By the end of day 1 there was a welcome screen. The harder part was making sure it stood on real shift logic.',
      'The first screen is easy to show. The underneath truth is harder to earn.',
      'Trust is not a feature you add after the interface looks good.',
      'The welcome screen was never the real risk. The answer behind it was.',
      'If the first visible layer sits on shaky logic, design just hides the problem for a few seconds.',
      'The product did not start with animations. It started with whether tomorrow could be trusted.',
      'Day 1 was not setup. It was the first decision about whether Ellie would deserve belief.',
      'What do you secure first when the user cannot afford a wrong answer?',
      'The more interesting day-1 story is not what appeared on screen. It is what made that screen safe to believe.',
    ],
  };
}

function inferMetaFocus(topThemes) {
  const themeIds = new Set(topThemes.map((theme) => theme.id));

  if (themeIds.has('foundation')) {
    return {
      id: 'trust',
      label: 'product trust',
      explanation: 'how the product feels dependable under real-world use',
    };
  }

  if (
    themeIds.has('localization') ||
    themeIds.has('onboarding') ||
    themeIds.has('paywall') ||
    themeIds.has('design')
  ) {
    return {
      id: 'clarity',
      label: 'product clarity',
      explanation: 'how the product earns understanding, trust, and attention quickly',
    };
  }

  if (themeIds.has('calendar') || themeIds.has('testing') || themeIds.has('auth')) {
    return {
      id: 'trust',
      label: 'product trust',
      explanation: 'how the product feels dependable under real-world use',
    };
  }

  if (themeIds.has('voice')) {
    return {
      id: 'responsiveness',
      label: 'assistant responsiveness',
      explanation: 'how fast the product feels useful when someone needs help',
    };
  }

  return {
    id: 'momentum',
    label: 'product momentum',
    explanation: 'how the product keeps moving without losing coherence',
  };
}

function buildMoment(commit, rank) {
  const focusLabels = commit.themes.slice(0, 2).map((theme) => theme.publicLabel);
  const categoryLabels = Object.entries(commit.categoryCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([category]) => CATEGORY_LABELS[category] || category);
  const focusText = joinNatural(focusLabels.length ? focusLabels : ['product behavior']);
  const categoryText = joinNatural(categoryLabels.length ? categoryLabels : ['code']);
  const publicLabel = getPublicMomentLabel(commit);
  const evidence = buildMomentEvidence(commit);

  let tension = `${capitalizeFirst(publicLabel)} looks small until you notice where people hesitate.`;
  let lesson = 'Treat the visible screen and the underlying state as one system.';

  if (commit.action === 'fix') {
    tension = `If ${publicLabel} feels wrong once, people start doubting the whole product.`;
    lesson = `Bug fixes become content when you explain the wrong assumption, not just the patch.`;
  } else if (commit.action === 'polish') {
    tension = `Nothing was technically broken, but ${publicLabel} still made people hesitate.`;
    lesson = `Polish becomes stop-scrolling content when it changes comprehension, not just cosmetics.`;
  } else if (commit.action === 'complete') {
    tension = `Finishing ${publicLabel} only matters if it now reads instantly.`;
    lesson = `Completion posts work when they show the last 10 percent that made the experience click.`;
  } else if (commit.action === 'implement') {
    tension = `Building ${publicLabel} only matters if the payoff is obvious without extra explanation.`;
    lesson = `Ship posts land harder when they reveal why the implementation was harder than it looked.`;
  }

  return {
    rank,
    hash: commit.shortHash,
    subject: commit.subject,
    slug: `${String(rank).padStart(2, '0')}-${slugify(commit.subject)}`,
    publicLabel,
    focusText,
    categoryText,
    tension,
    lesson,
    evidence,
    proof: evidence,
    testsTouched: commit.testsTouched,
    localesTouched: commit.localesTouched,
    score: commit.score,
  };
}

function buildHeadline(analysis) {
  const areas = getPublicAreas(analysis, 2);
  const areaLine = joinNatural(areas);

  return pickVariant(`${analysis.date}:${analysis.metaFocus.id}`, [
    `${analysis.humanDate}: ${analysis.metaArc.title}`,
    `${analysis.humanDate}: making ${areaLine || 'the experience'} easier to feel`,
    `${analysis.humanDate}: the day clarity started reading faster`,
  ]);
}

function buildThesis(analysis) {
  const areas = getPublicAreas(analysis, 3);
  const areaLine = joinNatural(areas.length ? areas : ['the experience']);

  if (analysis.dominantAction === 'fix') {
    return `Today was about ${areaLine}. On the surface it looked like a fix. The more interesting story is that a small mismatch was quietly weakening trust. That is strong content because people do not leave when something is technically wrong. They leave when something starts feeling uncertain.`;
  }

  if (analysis.dominantAction === 'polish') {
    return `Today looked like polish work. The real chapter was bigger: make ${areaLine} read faster so people do not have to work so hard to trust what they are seeing. That is the kind of story worth posting because it sounds small and feels big in the hands of a real person.`;
  }

  if (analysis.dominantAction === 'complete') {
    return `Today closed loops around ${areaLine}. Completion is only interesting when people can feel what changed without being told. That makes this a good story chapter, not just a shipping note.`;
  }

  return `Today was about ${analysis.metaFocus.explanation}. The useful story is not a list of tasks. It is how separate decisions lined up into one clearer feeling around ${areaLine}.`;
}

function buildStoryAtoms(analysis) {
  const areas = getPublicAreas(analysis, 3);
  const areaLine = joinNatural(areas.length ? areas : ['the experience']);
  const proof = buildPublicProof(analysis);

  let problem = `People were still doing too much interpretation around ${areaLine}.`;
  let falseAssumption = `The tempting read was "this just needs polish." The deeper problem was that the meaning was arriving too slowly.`;
  let decision = `Strip friction out of the first moments and make the value legible faster.`;
  let openLoop = `Where does the experience still make a new person pause instead of move?`;

  if (analysis.dominantAction === 'fix') {
    problem = `A small mismatch in the flow could make the whole product feel unreliable.`;
    falseAssumption = `The wrong assumption was that the issue lived only in the visible screen. It was actually hiding in state, timing, or mapping underneath.`;
    decision = `Normalize the underlying behavior before touching the presentation layer.`;
    openLoop = `What edge case still exists when real users arrive mid-flow, not at the ideal starting point?`;
  } else if (analysis.dominantAction === 'polish') {
    problem = `The product worked, but the first minute was still asking people to think too hard.`;
    falseAssumption = `The wrong assumption was that prettier visuals alone would solve it. The real job was sharper meaning, not just nicer styling.`;
    decision = `Reduce cognitive load in the first seconds and make the next action feel inevitable.`;
    openLoop = `Which part of the journey still asks people to think harder than they should?`;
  }

  return {
    problem,
    falseAssumption,
    decision,
    proof,
    openLoop,
  };
}

function buildDailyBrief(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);
  const windowLine = buildWindowLine(analysis.window);

  if (foundationLaunch) {
    const angleLines = analysis.selectedAngles.map(
      (angle) => `- **${angle.label}**: ${angle.purpose}`
    );
    const themeLines = analysis.topThemes.map((theme) => `- ${theme.label}: ${theme.publicLabel}`);
    const codebaseLines = (analysis.codebaseContext?.storyHighlights || []).map(
      (highlight) => `- ${highlight}`
    );
    const momentLines = foundationLaunch.moments.map(
      (moment) =>
        `### ${moment.rank}. ${capitalizeFirst(moment.publicLabel)}\n\n- Why people would care: ${moment.tension}\n- What shifted: ${moment.evidence}\n- Content lesson: ${moment.lesson}`
    );

    return `
# ${foundationLaunch.headline}

**Date**: ${analysis.humanDate}
${windowLine ? `**Window**: ${windowLine}\n` : ''}**Series**: ${analysis.metaArc.series}
**Story Thesis**: ${analysis.metaFocus.label}
**Audience Promise**: ${analysis.metaArc.promise}

## Story Lens

${foundationLaunch.storyLens}

## Story Spine

- **Character**: ${foundationLaunch.character}
- **Friction**: ${foundationLaunch.friction}
- **Wrong Read**: ${foundationLaunch.wrongRead}
- **Shift**: ${foundationLaunch.shift}
- **Proof**: ${foundationLaunch.proof}
- **Open Loop**: ${foundationLaunch.openLoop}

## What Shifted

- Main areas: ${foundationLaunch.mainAreas}
- Strongest scene: ${foundationLaunch.strongestScene}
- Scale note: ${foundationLaunch.scaleNote}

## Theme Stack

${themeLines.join('\n')}

## Codebase Context

${codebaseLines.length ? codebaseLines.join('\n') : '- No current codebase highlights captured.'}

## Angle Mix

${angleLines.join('\n')}

## Best Story Moments

${momentLines.join('\n\n')}

## Pack Outputs

- \`02-hook-bank.md\`
- \`03-hero-short.md\`
- \`04-instagram-carousel.md\`
- \`05-linkedin-post.md\`
- \`06-x-thread.md\`
- \`07-funnel-cuts.md\`
- \`08-community-loop.md\`
- \`09-platform-playbook.md\`
- \`10-codebase-context.md\`
- \`ready-to-post/\`
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    const angleLines = analysis.selectedAngles.map(
      (angle) => `- **${angle.label}**: ${angle.purpose}`
    );
    const themeLines = analysis.topThemes.map((theme) => `- ${theme.label}: ${theme.publicLabel}`);
    const codebaseLines = (analysis.codebaseContext?.storyHighlights || []).map(
      (highlight) => `- ${highlight}`
    );

    return `
# ${analysis.humanDate}: when onboarding stopped feeling like paperwork

**Date**: ${analysis.humanDate}
${windowLine ? `**Window**: ${windowLine}\n` : ''}**Series**: The First Minute
**Story Thesis**: product clarity
**Audience Promise**: show how small product choices change whether people keep moving or stall out in setup

## Story Lens

Day 2 was about one risk: asking mining workers to do admin before Ellie had earned enough trust to ask it.

The day started by turning separate onboarding pieces into a guided path: navigation, a stronger introduction screen, and a country selector that made setup feel coherent.

By the end of the day, the hardest choice in the flow, shift pattern selection, had been rebuilt again. Not because the information was wrong. Because the interaction still felt like work.

## Story Spine

- **Character**: someone tired, trying to set up a shift app without decoding roster jargon
- **Friction**: Too much of onboarding could still feel like form-filling instead of forward motion.
- **Wrong Read**: The tempting fix was more explanation. The better fix was to change how the choice felt.
- **Shift**: Build the guided onboarding path first, then redesign shift-pattern selection into a swipeable interaction people could move through naturally.
- **Proof**: Onboarding navigation and the introduction screen landed early. The country selector tightened the setup path. Later, the shift-pattern step was redesigned into swipeable cards, then hardened with gesture and animation fixes so the interaction could actually hold up.
- **Open Loop**: Which onboarding step still feels like admin instead of momentum?

## What Shifted

- Main areas: the guided onboarding flow, the introduction screen, and the pattern-selection moment
- Strongest scene: shift patterns stopped reading like a list and started feeling selectable
- Scale note: This chapter turned setup into a path, then turned the hardest decision inside that path into an interaction.

## Theme Stack

${themeLines.join('\n')}

## Codebase Context

${codebaseLines.length ? codebaseLines.join('\n') : '- No current codebase highlights captured.'}

## Angle Mix

${angleLines.join('\n')}

## Best Story Moments

### 1. The guided onboarding flow

- Why people would care: If the first screens feel like paperwork, people leave before the product earns trust.
- What shifted: Navigation, the introduction screen, and country selection were connected into one guided path instead of scattered setup steps.
- Content lesson: Onboarding gets stronger when it feels like forward motion, not data collection.

### 2. The pattern-selection moment

- Why people would care: Most people do not know the official name of their roster pattern. They know what their weeks feel like.
- What shifted: The shift-pattern step was redesigned into swipeable cards with gestures, learn-more detail, and onboarding-state integration.
- Content lesson: You do not make the pattern interesting. You make the interaction easier to understand.

### 3. The interaction layer

- Why people would care: Delight disappears fast when gestures glitch or motion feels fake.
- What shifted: Gesture-handler setup, test fixes, and animation cleanups removed the friction that would have made the new interaction feel broken.
- Content lesson: Playful interaction only works when the mechanics underneath it stay invisible.

## Pack Outputs

- \`02-hook-bank.md\`
- \`03-hero-short.md\`
- \`04-instagram-carousel.md\`
- \`05-linkedin-post.md\`
- \`06-x-thread.md\`
- \`07-funnel-cuts.md\`
- \`08-community-loop.md\`
- \`09-platform-playbook.md\`
- \`10-codebase-context.md\`
- \`ready-to-post/\`
`;
  }

  const storyAtoms = buildStoryAtoms(analysis);
  const areas = getPublicAreas(analysis, 3);
  const angleLines = analysis.selectedAngles.map(
    (angle) => `- **${angle.label}**: ${angle.purpose}`
  );
  const themeLines = analysis.topThemes.map((theme) => `- ${theme.label}: ${theme.publicLabel}`);
  const codebaseLines = (analysis.codebaseContext?.storyHighlights || []).map(
    (highlight) => `- ${highlight}`
  );
  const momentLines = analysis.topMoments.map(
    (moment) =>
      `### ${moment.rank}. ${capitalizeFirst(moment.publicLabel)}\n\n- Why people would care: ${moment.tension}\n- What shifted: ${moment.evidence}\n- Content lesson: ${moment.lesson}`
  );

  return `
# ${buildHeadline(analysis)}

**Date**: ${analysis.humanDate}
${windowLine ? `**Window**: ${windowLine}\n` : ''}**Series**: ${analysis.metaArc.series}
**Story Thesis**: ${analysis.metaFocus.label}
**Audience Promise**: ${analysis.metaArc.promise}

## Story Lens

${buildThesis(analysis)}

## Story Spine

- **Character**: ${analysis.metaArc.character}
- **Friction**: ${storyAtoms.problem}
- **Wrong Read**: ${storyAtoms.falseAssumption}
- **Shift**: ${storyAtoms.decision}
- **Proof**: ${storyAtoms.proof}
- **Open Loop**: ${storyAtoms.openLoop}

## What Shifted

- Main areas: ${joinNatural(areas)}
- Strongest scene: ${analysis.topMoments[0] ? analysis.topMoments[0].publicLabel : 'the experience'}
- Scale note: ${analysis.totals.localeCount ? `${analysis.totals.localeCount} languages were tightened in this pass.` : 'This chapter was about clarity inside the existing flow.'}

## Theme Stack

${themeLines.join('\n')}

## Codebase Context

${codebaseLines.length ? codebaseLines.join('\n') : '- No current codebase highlights captured.'}

## Angle Mix

${angleLines.join('\n')}

## Best Story Moments

${momentLines.join('\n\n')}

## Pack Outputs

- \`02-hook-bank.md\`
- \`03-hero-short.md\`
- \`04-instagram-carousel.md\`
- \`05-linkedin-post.md\`
- \`06-x-thread.md\`
- \`07-funnel-cuts.md\`
- \`08-community-loop.md\`
- \`09-platform-playbook.md\`
- \`10-codebase-context.md\`
- \`ready-to-post/\`
`;
}

function buildHookBank(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    return `
# Hook Bank

Use these as opening lines for Reels, TikTok, Shorts, LinkedIn, X, or Threads. Every hook carries tension, proof, or a reaction trigger.

${foundationLaunch.hooks.map((hook, index) => `${index + 1}. ${hook}`).join('\n')}
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    const hooks = [
      'If choosing your roster feels like paperwork, people quit before the app earns trust.',
      'I built the pattern picker three times before it felt right.',
      'Shift patterns are boring. The interaction could not be.',
      'The problem was not lack of information. It was lack of momentum.',
      'A list can be accurate and still make people stop.',
      'I stopped asking users to study shift jargon and started letting them move through it.',
      'The onboarding win was not more screens. It was a smoother path between them.',
      'If the gesture feels broken, the delight disappears instantly.',
      'The fix was not more explanation. It was a better interaction.',
      'The hardest onboarding choice should feel like progress, not admin.',
      'What onboarding step in most apps still feels like paperwork to you?',
      'People do not know the official name of their roster. They know what their weeks feel like.',
    ];

    return `
# Hook Bank

Use these as opening lines for Reels, TikTok, Shorts, LinkedIn, X, or Threads. Every hook carries tension, proof, or a reaction trigger.

${hooks.map((hook, index) => `${index + 1}. ${hook}`).join('\n')}
`;
  }

  const hero = analysis.topMoments[0];
  const areas = getPublicAreas(analysis, 2);
  const areaLine = joinNatural(areas.length ? areas : ['the experience']);

  const hooks = [
    {
      type: 'Confession',
      copy: `I thought this was a small cleanup. It turned into a trust problem.`,
    },
    {
      type: 'Specific Pain',
      copy: `The fastest way to lose someone is to make ${areaLine} feel uncertain in the first minute.`,
    },
    {
      type: 'Contrarian',
      copy: `Most "polish" work is not visual. It is meaning arriving faster.`,
    },
    {
      type: 'Before/After',
      copy: `Before today, ${hero.publicLabel} still made people pause. After today, the path is much harder to miss.`,
    },
    {
      type: 'User Lens',
      copy: `Nothing was broken. People were still hesitating. That is the problem I care about.`,
    },
    {
      type: 'Result First',
      copy: `${capitalizeFirst(hero.publicLabel)} now reads faster. The story is why it did not before.`,
    },
    {
      type: 'Builder Lesson',
      copy: `If someone has to stop and interpret your screen, the screen is not done.`,
    },
    {
      type: 'Emotional Angle',
      copy: `I want the app to feel like it understands you before it asks anything from you.`,
    },
    {
      type: 'Founder Opinion',
      copy: `I trust products more when they feel clear quickly than when they look impressive slowly.`,
    },
    {
      type: 'Open Loop',
      copy: `The question I care about now is whether the hesitation is actually gone.`,
    },
    {
      type: 'Community Prompt',
      copy: `What is one tiny moment in an app that instantly makes you trust it less?`,
    },
    {
      type: 'Callout',
      copy: `If ${hero.publicLabel} sounds like a tiny change, that is usually where the real story lives.`,
    },
  ];

  return `
# Hook Bank

Use these as opening lines for Reels, TikTok, Shorts, LinkedIn, X, or Threads. Every hook carries tension, proof, or a reaction trigger.

${hooks.map((hook, index) => `${index + 1}. **${hook.type}**: ${hook.copy}`).join('\n')}
`;
}

function buildHeroShort(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);
  const shortAngleMix = formatAngleMix(getPlatformAngles(analysis, 'tiktok'));

  if (foundationLaunch) {
    return `
# Hero Short

## Best Fit

- Primary platforms: TikTok, Instagram Reels, YouTube Shorts
- Recommended length: 30 to 45 seconds for TikTok/Reels, up to 60 seconds for Shorts
- Blend of angles: ${shortAngleMix}
- Structure: hook in the first 1-2 seconds, proof by second 6, lesson before the close

## Hook Options

1. If "Tomorrow: Night Shift" is wrong, the animation does not matter.
2. Day 1 had two jobs: build the answer, then build the first screen people could trust.
3. By the end of day 1 there was a welcome screen. The harder part was making sure it stood on real shift logic.

## Story-First Script

If "Tomorrow: Night Shift" is wrong, the animation does not matter.

That was day 1 of Ellie.

The first job was invisible: shift math, date handling, services, and the reliability underneath the app.

The second job was visible: start building the onboarding layer and the first welcome screen.

Both mattered. But only one of them decides whether the later screen deserves belief.

So the order mattered.

The answer layer came first. The first visible layer followed on top of it the same day.

That is what I want this product to feel like from the start: not impressive first, trustworthy first.

What is one product moment where the surface means nothing if the underneath truth is shaky?

## Visual Beat Sheet

1. Open with the strongest visible shot from the welcome screen or onboarding layer.
2. Cut immediately to the line: "If 'Tomorrow: Night Shift' is wrong, the animation does not matter."
3. Flash one proof beat for the underneath work: shift logic, service names, or tests passing.
4. Return to the visible layer so the audience sees what is sitting on top of that foundation.
5. End face-to-camera or with text on screen asking the question.

## Caption Draft

By the end of day 1, Ellie had a welcome screen.

The more important part is what happened before that.

Shift math. Date handling. Services. The reliability underneath the answer a miner will eventually trust before dawn.

Then the first onboarding layer and welcome screen landed on top of that groundwork.

Trust is not a feature you add after the interface looks good.

What is one product moment where design means nothing if the underlying answer is shaky?

## Edit Notes

- Open with tension, not context.
- Show the visible layer first, then reveal what had to exist underneath it.
- Keep the proof visual and fast.
- Use captions throughout.
- End with a question that builders and users can answer from experience.
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    return `
# Hero Short

## Best Fit

- Primary platforms: TikTok, Instagram Reels, YouTube Shorts
- Recommended length: 25 to 45 seconds for TikTok/Reels, up to 60 seconds for Shorts
- Blend of angles: ${shortAngleMix}
- Structure: hook in the first 1-2 seconds, visible proof by second 5, lesson before the close

## Hook Options

1. If choosing your roster feels like paperwork, people quit before the app earns trust.
2. I built the pattern picker three times before it felt right.
3. Shift patterns are boring. The interaction could not be.

## Story-First Script

If choosing your roster feels like paperwork, people quit before the app earns trust.

That was the problem on day 2.

The morning was about structure: onboarding navigation, a stronger introduction screen, and a country selector that made setup feel like one path instead of scattered steps.

The harder problem showed up later.

Shift pattern selection was still asking people to study shift jargon when most workers just know what their weeks feel like.

So I rebuilt that step as swipeable cards.

Not because swiping is trendy. Because the old interaction made the decision feel heavier than it needed to.

The lesson from today is simple: you do not make the pattern interesting. You make the interaction easier to understand.

What onboarding step in most apps still feels like paperwork to you?

## Visual Beat Sheet

1. Open with the swipeable pattern cards in motion.
2. Hard cut to the line: "If choosing your roster feels like paperwork, people quit before the app earns trust."
3. Show one quick before/after beat: static selection versus swipeable selection.
4. Flash the introduction screen or onboarding navigator to prove the larger path got tighter too.
5. End on the question sticker or comment CTA.

## Caption Draft

Day 2 of Ellie was not really about adding another onboarding screen.

It was about removing the feeling of admin.

First the flow got structure: navigation, introduction, country selection.

Then the hardest decision in the flow got rebuilt again. Shift pattern selection stopped feeling like a list and started feeling like something people could move through.

The fix was not more explanation. It was a better interaction.

What onboarding step still feels like paperwork in most apps?

## Edit Notes

- Open on motion, not context.
- Show the pattern cards immediately.
- Keep one before/after proof beat on screen.
- Use captions throughout.
- End with a question people can answer from experience.
`;
  }

  const hero = analysis.topMoments[0];
  const secondary = analysis.topMoments[1];
  const areas = getPublicAreas(analysis, 3);
  const proofLine = buildPublicProof(analysis);
  const hookA = `Nothing was broken. People were still hesitating.`;
  const hookB = `I thought this was a visual tweak. It was really a trust problem.`;
  const hookC = `The first minute of an app tells you whether it respects your time.`;

  return `
# Hero Short

## Best Fit

- Primary platforms: TikTok, Instagram Reels, YouTube Shorts
- Recommended length: 25 to 45 seconds for TikTok/Reels, up to 60 seconds for Shorts
- Blend of angles: ${shortAngleMix}
- Structure: hook in the first 1-2 seconds, visible proof by second 5, lesson before the close

## Hook Options

1. ${hookA}
2. ${hookB}
3. ${hookC}

## Story-First Script

Today I was working on ${joinNatural(areas)}.

On the surface those looked like separate jobs. They were really the same story.

The product was still asking people to think too hard in the first minute.

The clearest example was ${hero.publicLabel}. ${capitalizeFirst(hero.tension)}

The deeper lesson is this: people do not experience our work task by task. They experience whether the product feels obvious, trustworthy, and worth staying with.

So instead of adding more, I tried to make the meaning arrive faster.

${proofLine}

What is one tiny moment in a product that instantly makes you trust it less?

## Visual Beat Sheet

1. Open on the strongest before/after scene from ${hero.publicLabel}.
2. Hard cut to the specific screen or flow affected by ${hero.publicLabel}.
3. Overlay the tension line: "${hero.tension}".
4. Show one proof beat: updated copy, before/after sequence, or language spread.
5. Bring in the secondary moment: ${secondary ? secondary.publicLabel : hero.publicLabel}.
6. End on the question sticker or comment CTA.

## Caption Draft

Today was not about adding more. It was about removing the tiny pauses that make a product feel harder than it should. ${proofLine} That is the chapter I want to document more: the moment a screen starts reading faster and feeling more trustworthy. What tiny product moment makes you hesitate fastest?

## Edit Notes

- Keep the first on-screen text under 9 words.
- Use captions throughout.
- Open with the result or tension, not context.
- Cut every 1.5 to 2.5 seconds unless the before/after needs space.
- Show proof, not just face-to-camera commentary.
`;
}

function buildInstagramCarousel(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    return `
# Instagram Carousel

## Concept

Turn day 1 into a trust story, not a setup recap.

## Slides

1. **Cover**: If "Tomorrow: Night Shift" is wrong, the design does not matter
2. **The Tension**: Day 1 had two jobs: build the answer, then build the first screen people could trust.
3. **The Underneath Work**: Shift math, date handling, and the service layer had to exist before the product started making promises on screen.
4. **The Visible Layer**: Later that same day, the onboarding components and first welcome screen started appearing on top of that groundwork.
5. **Why The Order Matters**: A polished screen still feels shaky if the state and logic underneath it are not trustworthy.
6. **The Principle**: Trust is not a feature you add after the interface looks good. It is a structural decision.
7. **The Question**: What do you secure first when the user cannot afford a wrong answer?

## Caption

The lazy version of this story would be: day 1 started invisible, day 2 became visual.

That is not what happened.

Day 1 of Ellie had both. The invisible answer layer came first. The first visible onboarding layer followed on top of it later that same day.

That order matters because Ellie will eventually answer one simple question for a miner before dawn:

"What shift am I on tomorrow?"

If that answer is shaky, the welcome screen does not save you.

What do you make trustworthy before you make it pretty?

## Visual Direction

- Use the welcome screen on the cover, then reveal the underneath layers in the next slides.
- Keep slides text-light and declarative.
- Let one slide carry the principle line on its own.
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    return `
# Instagram Carousel

## Concept

Turn day 2 into a story about momentum in onboarding, not just new screens.

## Slides

1. **Cover**: If choosing your roster feels like paperwork, people quit.
2. **The Problem**: The setup flow was collecting the right information but still making people work too hard.
3. **The Wrong Assumption**: More explanation was not the fix. The interaction itself was the friction.
4. **The Path**: Navigation, introduction, and country selection tightened the onboarding path early in the day.
5. **The Hardest Decision**: Shift pattern selection was rebuilt so people could swipe through options instead of studying a heavy list.
6. **The Principle**: You do not make a boring decision exciting by adding words. You make it easier to move through.
7. **The Question**: Which onboarding step still feels like admin instead of momentum?

## Caption

The easy version of this story is: more onboarding work shipped.

The real version is better.

Day 2 of Ellie was about removing the feeling of paperwork.

The morning built the guided path.
The evening rebuilt the hardest decision inside that path.

Most workers do not know the official name of their shift pattern. They know what their weeks feel like.

That is why the fix was not more explanation.
It was a better interaction.

What is one onboarding step most products still make heavier than it needs to be?

## Visual Direction

- Open with the swipeable cards, not a generic title slide.
- Use one slide to show the guided path tightening.
- Let the principle line stand alone on one slide.
`;
  }

  const storyAtoms = buildStoryAtoms(analysis);
  const hero = analysis.topMoments[0];

  return `
# Instagram Carousel

## Concept

Turn today's work into a seven-slide story that starts with tension, moves into the wrong assumption, and ends with a question people can answer from experience.

## Slides

1. **Cover**: The update that looked small but changed product trust
2. **The Problem**: ${storyAtoms.problem}
3. **The Wrong Assumption**: ${storyAtoms.falseAssumption}
4. **The Turn**: ${capitalizeFirst(hero.publicLabel)} forced a better decision.
5. **The Decision**: ${storyAtoms.decision}
6. **The Proof**: ${storyAtoms.proof}
7. **The Question**: ${storyAtoms.openLoop}

## Caption

Today I was working across ${joinNatural(getPublicAreas(analysis, 3))}.

What tied them together was ${analysis.metaFocus.label}.

That is the kind of work I want to document more often: not just the shiny reveal, but the moment a product gets easier to trust.

The most useful part of the day was ${hero.publicLabel}. Not because it was loud, but because it exposed a wrong assumption and replaced it with a clearer one.

If you build products, where do you most often see hidden trust leaks: onboarding, pricing, data, or something else?

## Visual Direction

- Use one strong cover line with a dark high-contrast background.
- Show one screenshot or code snippet only when it proves the point.
- Keep each slide to one idea and one emotional beat.
`;
}

function buildLinkedInPost(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    return `
# LinkedIn Post

Day 1 of Ellie had two jobs:

Build the answer.
Then build the first screen people could trust.

The lazy version of this story would be "day 1 was all infrastructure."

That is not quite true.

Yes, a huge part of the day was invisible work: shift calculation, date handling, services, and the reliability underneath the product.

But by the end of the day there was also a visible layer: premium onboarding pieces and the first welcome screen.

That is the more honest story, and it teaches the better lesson.

If Ellie eventually says "Tomorrow: Night Shift," that answer has to deserve belief before the interface starts looking polished.

So the sequencing mattered.

The answer layer came first.
The visible layer followed on top of it.

That is what I mean when I say trust is structural.

Not a copy change.
Not a loading animation.
Not something you add after the design starts feeling expensive.

A structural decision.

Day 1 confirmed something I want to keep true for the rest of this product:

If the underneath truth is shaky, the surface is just buying you a few seconds before trust collapses.

What is something you have built where the visible layer only worked because of a decision nobody sees?
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    return `
# LinkedIn Post

Day 2 of Ellie taught a very specific product lesson:

If onboarding feels like paperwork, people leave before the product earns enough trust to ask for anything.

The morning work was straightforward.
I connected the onboarding path properly: navigation, a stronger introduction screen, and country selection.

The more interesting problem showed up in shift pattern selection.

The information was fine.
The interaction was not.

Most mining workers do not think in formal pattern names first.
They think in lived rhythm:
4 on, 4 off.
Days, nights, off days.
What the week feels like.

So asking them to study a heavy selector was the wrong move.

I rebuilt that step into swipeable cards.
Not to make it flashy.
To make the hardest decision in setup feel lighter and easier to move through.

That is the part I think people miss about onboarding.

The bottleneck is often not missing information.
It is the weight of the interaction.

A product can be technically correct and still feel like admin.
And once it feels like admin, people start asking whether the product is worth finishing.

The principle I want to keep from this day:

You do not make a boring decision better by explaining it harder.
You make it better by changing how it feels to move through.

What is one onboarding choice you have seen products make unnecessarily heavy?
`;
  }

  const storyAtoms = buildStoryAtoms(analysis);
  const proof = buildPublicProof(analysis);
  const areas = getPublicAreas(analysis, 3);
  const hero = analysis.topMoments[0];

  return `
# LinkedIn Post

Nothing was technically broken today.

People could still feel friction around ${joinNatural(areas)}.

That matters because product work gets interesting when you stop describing tasks and start describing the hesitation underneath them.

Today's tension was simple:

${storyAtoms.problem}

The wrong assumption was this:

${storyAtoms.falseAssumption}

So the product decision became:

${storyAtoms.decision}

That is the lens I want this daily content system to keep enforcing: every chapter needs conflict, proof, and a human consequence.

The clearest scene today was ${hero.publicLabel}. ${capitalizeFirst(hero.tension)}

Proof that the story is real: ${proof}

The visible output will be short-form videos, carousels, and threads.
The durable asset is the underlying insight.

What is one class of "small" product work that consistently teaches you the most?
`;
}

function buildPlatformPlaybook(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);
  const reelsAngleMix = formatAngleMix(getPlatformAngles(analysis, 'reels'));
  const tiktokAngleMix = formatAngleMix(getPlatformAngles(analysis, 'tiktok'));
  const shortsAngleMix = formatAngleMix(getPlatformAngles(analysis, 'shorts'));
  const carouselAngleMix = formatAngleMix(getPlatformAngles(analysis, 'carousel'));
  const linkedinAngleMix = formatAngleMix(getPlatformAngles(analysis, 'linkedin'));
  const xAngleMix = formatAngleMix(getPlatformAngles(analysis, 'x'));
  const threadsAngleMix = formatAngleMix(getPlatformAngles(analysis, 'threads'));

  if (foundationLaunch) {
    return `
# Platform Playbook

Use the same day in native formats, but keep the public story focused on trust and sequencing, not internal mechanics.

## Instagram Reels

- Best format: 20 to 35 second vertical video
- Best angle: ${reelsAngleMix}
- Opening move: start with "If 'Tomorrow: Night Shift' is wrong, the animation does not matter."
- Structure: visible layer -> underneath truth -> principle -> question
- Best proof to show: the welcome screen, then one fast proof beat from the answer layer underneath it
- Testing note: test one hook that starts with the welcome screen and one that starts face-to-camera

## TikTok

- Best format: 30 to 45 second creator-led vertical video
- Best angle: ${tiktokAngleMix}
- Opening move: admit the real day-1 job immediately
- Structure: consequence first -> what had to exist underneath -> what appeared on top -> audience question
- Best proof to show: the contrast between visible onboarding and invisible trust work
- Tone note: serious and grounded, not inspirational

## YouTube Shorts

- Best format: 40 to 60 second short with one extra proof beat
- Best angle: ${shortsAngleMix}
- Opening move: lead with the consequence line, then explain the two-job structure
- Structure: consequence -> sequencing -> proof -> principle
- Best proof to show: that the welcome layer landed later the same day, not instead of the groundwork
- Retention note: alternate between the visible layer and the proof beats underneath it

## Instagram Carousel

- Best format: 6 to 7 slides
- Best angle: ${carouselAngleMix}
- Opening move: use the consequence line on the cover
- Structure: consequence -> two jobs -> underneath layer -> visible layer -> principle -> question
- Best proof to show: the first visible layer sitting on top of the groundwork
- Saveability note: the trust principle should stand alone on one slide

## LinkedIn

- Best format: text post
- Best angle: ${linkedinAngleMix}
- Opening move: "Day 1 of Ellie had two jobs"
- Structure: honest chronology -> why the order mattered -> principle -> question
- Best proof to show: the answer layer came before the visible layer, even though both happened on the same day
- Tone note: reflective, sharp, and defensible

## X

- Best format: 6 to 8 post thread
- Best angle: ${xAngleMix}
- Opening move: "If 'Tomorrow: Night Shift' is wrong, the animation does not matter."
- Structure: consequence -> sequencing -> proof -> lesson -> question
- Best proof to show: one sentence about the invisible layer and one sentence about the visible layer
- Conversation note: end with a question about what people secure first

## Threads

- Best format: short thread or single post with reply follow-up
- Best angle: ${threadsAngleMix}
- Opening move: one honest line, not a polished summary
- Structure: feeling -> realization -> question
- Best proof to show: one human moment plus one sharp lesson
- Conversation note: treat replies as the continuation of the post, not just engagement

## Cross-Platform Rule

- Do not flatten the story into "all invisible work" if the visible layer also landed that day.
- Keep the strongest true tension line.
- Show the surface, then explain what had to exist underneath it.
- Make trust feel structural, not cosmetic.
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    return `
# Platform Playbook

Use the same day in native formats, but keep the public story focused on momentum, interaction weight, and first-use clarity.

## Instagram Reels

- Best format: 20 to 35 second vertical video
- Best angle: ${reelsAngleMix}
- Opening move: start with "If choosing your roster feels like paperwork, people quit before the app earns trust."
- Structure: hard choice -> better interaction -> principle -> question
- Best proof to show: list-style selection contrasted against swipeable cards
- Testing note: test one version that opens on the swipe motion and one that starts face-to-camera

## TikTok

- Best format: 25 to 45 second creator-led vertical video
- Best angle: ${tiktokAngleMix}
- Opening move: say "I built the pattern picker three times before it felt right"
- Structure: consequence first -> what felt heavy -> what changed -> ask for reaction
- Best proof to show: the shift-pattern redesign plus one beat from the guided onboarding path
- Tone note: sound like a builder admitting a product mistake, not selling a feature

## YouTube Shorts

- Best format: 35 to 60 second short with slightly more explanation
- Best angle: ${shortsAngleMix}
- Opening move: "The problem was not missing information. It was the weight of the interaction."
- Structure: friction -> wrong assumption -> redesign -> lesson
- Best proof to show: why swipeable pattern selection worked better than a heavier selector
- Retention note: alternate between the introduction flow and the pattern cards so the chapter feels like one story

## Instagram Carousel

- Best format: 5 to 7 slides
- Best angle: ${carouselAngleMix}
- Opening move: bold cover line about paperwork versus momentum
- Structure: problem -> wrong assumption -> guided path -> redesigned decision -> principle -> question
- Best proof to show: the hardest decision inside onboarding becoming easier to move through
- Saveability note: keep the principle line strong enough to stand alone on one slide

## LinkedIn

- Best format: text post or document carousel
- Best angle: ${linkedinAngleMix}
- Opening move: "If onboarding feels like paperwork, people leave before the product earns trust."
- Structure: friction -> what changed -> lesson -> question
- Best proof to show: morning path improvements plus the later pattern-selection redesign
- Tone note: make the judgment sharp and practical, not inspirational

## X

- Best format: 5 to 9 post thread
- Best angle: ${xAngleMix}
- Opening move: one hard sentence about paperwork and drop-off
- Structure: claim -> friction -> redesign -> lesson -> question
- Best proof to show: one sentence about the guided path and one sentence about the swipeable redesign
- Conversation note: end on a question people can answer from experience in one line

## Threads

- Best format: short thread or single post with reply follow-up
- Best angle: ${threadsAngleMix}
- Opening move: "I built the pattern picker three times before it felt right."
- Structure: confession -> realization -> debate question
- Best proof to show: one honest admission plus one concrete product change
- Conversation note: this is the best place to ask whether playful onboarding helps or distracts

## Cross-Platform Rule

- Do not frame this day as "more onboarding screens shipped."
- Lead with the feeling of paperwork versus momentum.
- Show the redesign of the hardest decision, not just the existence of more UI.
- Keep the lesson anchored in how real people move through setup.
`;
  }

  const hero = analysis.topMoments[0];
  const storyAtoms = buildStoryAtoms(analysis);
  const areas = getPublicAreas(analysis, 3);

  return `
# Platform Playbook

Use the same daily story in native formats, not copy-pasted formats.

## Instagram Reels

- Best format: 20 to 35 second vertical video
- Best angle: ${reelsAngleMix}
- Opening move: start with "${hero.tension}"
- Structure: hook -> visual proof -> one lesson -> question
- Best proof to show: the strongest before/after scene from ${hero.publicLabel}
- Testing note: use Trial Reels to test alternate hooks before posting the strongest version broadly

## TikTok

- Best format: 25 to 45 second creator-led vertical video
- Best angle: ${tiktokAngleMix}
- Opening move: say the mistake or wrong assumption immediately
- Structure: tension first -> what I realized -> what changed -> ask for reaction
- Best proof to show: ${storyAtoms.proof}
- Tone note: speak like a builder telling a real story, not a brand reciting a release note

## YouTube Shorts

- Best format: 35 to 60 second short with slightly more explanation
- Best angle: ${shortsAngleMix}
- Opening move: result or problem in the first 1-2 seconds
- Structure: what felt off -> why it mattered -> the shift -> takeaway
- Best proof to show: ${capitalizeFirst(hero.publicLabel)} and the lesson inside it
- Retention note: keep motion or framing changes every few seconds until the payoff lands

## Instagram Carousel

- Best format: 5 to 7 slides
- Best angle: ${carouselAngleMix}
- Opening move: bold cover line about the hesitation you were removing
- Structure: cover -> problem -> wrong assumption -> turn -> proof -> question
- Best proof to show: ${storyAtoms.proof}
- Saveability note: one idea per slide, one sentence per idea

## LinkedIn

- Best format: text post or document carousel, with vertical video when the before/after is visually obvious
- Best angle: ${linkedinAngleMix}
- Opening move: "Nothing was technically broken..." or another tension-led line
- Structure: tension -> false assumption -> decision -> professional lesson -> question
- Best proof to show: how ${joinNatural(areas)} got clearer in one chapter
- Tone note: teach from the work, do not narrate internal process terms

## X

- Best format: 5 to 8 post thread
- Best angle: ${xAngleMix}
- Opening move: one sharp sentence, not context
- Structure: claim -> problem -> wrong assumption -> change -> question
- Best proof to show: a single scene or sentence, not a wall of details
- Conversation note: end on a question people can answer from experience in one sentence

## Threads

- Best format: short thread or single post with reply follow-up
- Best angle: ${threadsAngleMix}
- Opening move: one honest line, not a polished summary
- Structure: feeling -> realization -> question
- Best proof to show: one human moment plus one sharp lesson
- Conversation note: treat replies as the continuation of the post, not just engagement

## Cross-Platform Rule

- Never lead with internal build terms in publishable content.
- Lead with the human moment, the hesitation, the reveal, or the opinion.
- Keep the recurring series name visible so the audience can recognize the chapter style over time.
`;
}

function buildXThread(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    const posts = [
      `If "Tomorrow: Night Shift" is wrong, the animation does not matter.`,
      `Day 1 of Ellie had two jobs: build the answer, then build the first screen people could trust.`,
      `The first job was invisible: shift math, date handling, services, and the reliability underneath the product.`,
      `The second job was visible: premium onboarding pieces and the first welcome screen.`,
      `Both landed on day 1. The sequencing is the point.`,
      `The answer layer came first. The visible layer followed on top of it.`,
      `That is what I mean when I say trust is structural, not cosmetic.`,
      `What do you secure first when the user cannot afford a wrong answer?`,
    ];

    return `
# X / Threads Thread

${posts.map((post, index) => `${index + 1}. ${post}`).join('\n\n')}
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    const posts = [
      `If choosing your roster feels like paperwork, people quit before the app earns trust.`,
      `That was the real problem on day 2 of Ellie.`,
      `The morning tightened the path: onboarding navigation, a stronger introduction screen, and country selection.`,
      `The harder problem was shift pattern selection.`,
      `Most workers do not know the official name of their pattern first. They know what their weeks feel like.`,
      `So the fix was not more explanation. It was a better interaction.`,
      `I rebuilt the pattern step as swipeable cards so the hardest choice in setup felt lighter and easier to move through.`,
      `Product lesson: you do not make a boring decision better by explaining it harder. You make it better by changing how it feels.`,
      `What onboarding step still feels like paperwork in most apps?`,
    ];

    return `
# X / Threads Thread

${posts.map((post, index) => `${index + 1}. ${post}`).join('\n\n')}
`;
  }

  const storyAtoms = buildStoryAtoms(analysis);
  const hero = analysis.topMoments[0];
  const areas = getPublicAreas(analysis, 3);

  const posts = [
    `Today was really about ${analysis.metaArc.title}.`,
    `I was working on ${joinNatural(areas)}.`,
    `The visible problem: ${storyAtoms.problem}`,
    `The wrong assumption: ${storyAtoms.falseAssumption}`,
    `The clearest example was ${hero.publicLabel} because ${hero.tension.toLowerCase()}`,
    `What changed in the experience: ${storyAtoms.decision}`,
    `Proof: ${buildPublicProof(analysis)}`,
    `Best build-in-public lesson from today: ${hero.lesson}`,
    `Question for builders: ${storyAtoms.openLoop}`,
  ];

  return `
# X / Threads Thread

${posts.map((post, index) => `${index + 1}. ${post}`).join('\n\n')}
`;
}

function buildFunnelCuts(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    const stages = [
      {
        stage: 'Awareness',
        platform: 'TikTok / Reels',
        asset: 'Pattern interrupt short',
        copy: `Hook with "If 'Tomorrow: Night Shift' is wrong, the animation does not matter." then show the welcome screen.`,
      },
      {
        stage: 'Consideration',
        platform: 'Instagram Carousel',
        asset: 'Trust sequencing breakdown',
        copy: `Show the two jobs from day 1: the answer layer first, the visible layer second.`,
      },
      {
        stage: 'Decision',
        platform: 'LinkedIn',
        asset: 'Founder judgment post',
        copy: `Explain why the visible layer only works because of what came first underneath it.`,
      },
      {
        stage: 'Activation',
        platform: 'Short-form video follow-up',
        asset: 'One practical product lesson',
        copy: `Teach the principle that trust is structural, not cosmetic.`,
      },
      {
        stage: 'Retention',
        platform: 'Stories / Threads',
        asset: 'Open loop + reply mining',
        copy: `Ask what people secure first when the user cannot afford a wrong answer, then use the replies for tomorrow's angle.`,
      },
      {
        stage: 'Advocacy',
        platform: 'LinkedIn / X',
        asset: 'Opinion post',
        copy: `Turn the day into a sharp viewpoint: if the underneath truth is shaky, good design only delays the loss of trust.`,
      },
    ];

    return `
# Funnel Cuts

Use the same day of work to feed every stage of the funnel instead of publishing one recap and moving on.

${stages
  .map(
    (stage) =>
      `## ${stage.stage}\n\n- Platform: ${stage.platform}\n- Asset: ${stage.asset}\n- Draft: ${stage.copy}`
  )
  .join('\n\n')}

## Publishing Order

1. Post the short video first while the tension is strongest.
2. Follow with the carousel for saves and shares.
3. Publish the LinkedIn post for the structural lesson.
4. Use replies to turn trust questions into the next chapter.
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    const stages = [
      {
        stage: 'Awareness',
        platform: 'TikTok / Reels',
        asset: 'Pattern interrupt short',
        copy: 'Hook with "If choosing your roster feels like paperwork, people quit before the app earns trust." then show the swipeable cards immediately.',
      },
      {
        stage: 'Consideration',
        platform: 'Instagram Carousel',
        asset: 'Wrong-assumption breakdown',
        copy: 'Show that the issue was not missing information. It was the weight of the interaction.',
      },
      {
        stage: 'Decision',
        platform: 'LinkedIn',
        asset: 'Founder judgment post',
        copy: 'Explain why onboarding friction is often about admin-feel, not lack of instructions.',
      },
      {
        stage: 'Activation',
        platform: 'Short-form video follow-up',
        asset: 'One practical lesson from the build',
        copy: 'Teach the principle that the hardest onboarding choice should feel like momentum, not form-filling.',
      },
      {
        stage: 'Retention',
        platform: 'Stories / Threads',
        asset: 'Open loop + reply mining',
        copy: 'Ask which onboarding step still feels like paperwork, then use the replies to shape the next chapter.',
      },
      {
        stage: 'Advocacy',
        platform: 'LinkedIn / X',
        asset: 'Opinion post',
        copy: 'Turn the day into a sharper viewpoint: a technically correct flow can still lose people if it feels like admin.',
      },
    ];

    return `
# Funnel Cuts

Use the same day of work to feed every stage of the funnel instead of publishing one recap and moving on.

${stages
  .map(
    (stage) =>
      `## ${stage.stage}\n\n- Platform: ${stage.platform}\n- Asset: ${stage.asset}\n- Draft: ${stage.copy}`
  )
  .join('\n\n')}

## Publishing Order

1. Post the short video first while the contrast between list and swipe interaction is freshest.
2. Follow with the carousel for saves and shares.
3. Publish the LinkedIn post for the broader product lesson.
4. Use replies to identify which onboarding friction to tackle in the next post.
`;
  }

  const hero = analysis.topMoments[0];
  const storyAtoms = buildStoryAtoms(analysis);

  const stages = [
    {
      stage: 'Awareness',
      platform: 'TikTok / Reels',
      asset: 'Pattern interrupt short',
      copy: `Hook with "${hero.tension}" and show the affected screen in the first two seconds.`,
    },
    {
      stage: 'Consideration',
      platform: 'Instagram Carousel',
      asset: 'Problem -> assumption -> decision breakdown',
      copy: `Use ${storyAtoms.problem} as the opening frame, then walk through the wrong assumption and what changed.`,
    },
    {
      stage: 'Decision',
      platform: 'LinkedIn',
      asset: 'Proof-heavy founder post',
      copy: `Lead with the hesitation you were trying to remove, then explain why the product feels clearer or more trustworthy after today's work.`,
    },
    {
      stage: 'Activation',
      platform: 'Short-form video follow-up',
      asset: 'One practical lesson from the build',
      copy: `Teach the lesson inside ${hero.publicLabel} so people can apply it to their own product.`,
    },
    {
      stage: 'Retention',
      platform: 'Stories / Threads',
      asset: 'Open loop + behind-the-scenes clip',
      copy: `Ask ${storyAtoms.openLoop} and use the replies to shape tomorrow's post.`,
    },
    {
      stage: 'Advocacy',
      platform: 'LinkedIn / X',
      asset: 'Opinion post',
      copy: `Turn today's work into a sharper viewpoint: small product friction kills trust faster than missing features.`,
    },
  ];

  return `
# Funnel Cuts

Use the same day of work to feed every stage of the funnel instead of publishing one recap and moving on.

${stages
  .map(
    (stage) =>
      `## ${stage.stage}\n\n- Platform: ${stage.platform}\n- Asset: ${stage.asset}\n- Draft: ${stage.copy}`
  )
  .join('\n\n')}

## Publishing Order

1. Post the short video first while the tension is freshest.
2. Follow with the carousel for saves and shares.
3. Publish the LinkedIn post for deeper trust and founder voice.
4. Use Stories, Threads, or replies to turn audience reactions into tomorrow's hook.
`;
}

function buildCommunityLoop(analysis) {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const platformStory = buildPlatformStoryContext(analysis);

  if (foundationLaunch) {
    const replies = [
      'Exactly. The visible layer was never the whole story. The sequencing was the story.',
      'That is the trap I want to avoid in public: making day 1 sound cleaner than it really was.',
      'Agreed. When the answer has real consequences, the underneath work stops being optional.',
      'That is why I do not want to frame trust like a design flourish. It starts much earlier than that.',
      'Good point. The better follow-up is probably which visible moment proves trust fastest once the groundwork exists.',
    ];

    return `
# Community Loop

## Poll

When users cannot afford a wrong answer, what do you secure first?

- Answer accuracy
- Interface clarity
- Speed / responsiveness
- Onboarding flow

## Comment Seed

What do you secure first when the user cannot afford a wrong answer?

## Story Sticker Prompt

What is one product moment where the surface means nothing if the underneath truth is shaky?

## Reply Seeds

${replies.map((reply, index) => `${index + 1}. ${reply}`).join('\n')}

## Tomorrow Follow-Ups

1. Turn the strongest answer into a Reel hook.
2. Turn the sharpest reply into a quote slide.
3. If people debate sequencing, make a post about what should be built before the first visible layer.
4. If people ask for proof, show the welcome screen next to one underneath layer it depended on.
`;
  }

  if (platformStory.slug === 'onboarding-momentum') {
    const replies = [
      'Exactly. The information can be right and the interaction can still feel heavier than it needs to.',
      'That is the distinction I care about here: accurate is not the same thing as easy to move through.',
      'Agreed. Once setup starts feeling like admin, the product has to work much harder to earn trust back.',
      'That is why I rebuilt the decision itself, not just the copy around it.',
      'Good point. The next useful question is which onboarding choice should feel obvious in under five seconds.',
    ];

    return `
# Community Loop

## Poll

What kills onboarding momentum fastest?

- Too many fields at once
- Confusing choices
- Slow interactions
- Asking for info too early

## Comment Seed

What onboarding step still feels like paperwork in most apps?

## Story Sticker Prompt

Have you ever quit an app setup because one decision felt heavier than it should have?

## Reply Seeds

${replies.map((reply, index) => `${index + 1}. ${reply}`).join('\n')}

## Tomorrow Follow-Ups

1. Turn the strongest reply into a Reel hook.
2. Turn the best onboarding complaint into a quote slide.
3. If people argue about playfulness versus gimmick, make that the next post.
4. If people ask for proof, post the static versus swipeable pattern selection comparison.
`;
  }

  const storyAtoms = buildStoryAtoms(analysis);
  const hero = analysis.topMoments[0];

  const replies = [
    `Exactly. The visible issue was ${hero.publicLabel}, but the deeper lesson was ${storyAtoms.falseAssumption.toLowerCase()}`,
    `That is the part I think more builders should show in public: the wrong assumption before the fix.`,
    `Agreed. I am trying to document not just what changed, but what the user was forced to feel before it changed.`,
    `This is why I want the daily pack to include proof. Otherwise the post turns into generic inspiration.`,
    `That is a good point. The next version of this should probably test whether the confusion is actually gone, not just theoretically solved.`,
  ];

  return `
# Community Loop

## Poll

Where do small product issues destroy trust fastest?

- Onboarding
- Pricing / paywall
- Localization / copy
- Data accuracy

## Comment Seed

${storyAtoms.openLoop}

## Story Sticker Prompt

What is one "tiny" product issue that made users hesitate longer than you expected?

## Reply Seeds

${replies.map((reply, index) => `${index + 1}. ${reply}`).join('\n')}

## Tomorrow Follow-Ups

1. Turn the strongest objection into a new Reel hook.
2. Turn the best builder reply into a quote-card or carousel slide.
3. If people argue about the assumption, make a bug-autopsy follow-up.
4. If people ask for proof, post the before/after or the widened language/screen example.
`;
}

function getPlatformSpec(platformId) {
  return (
    PLATFORM_PLAYBOOK[platformId] || {
      id: platformId,
      label: platformId,
      folder: platformId,
      audience: 'people likely to care about Ellie',
      objective: 'turn a real product chapter into a public story',
      nativeFormat: 'platform-native post',
      targetLength: 'n/a',
      hookRule: 'Lead with tension.',
      structure: ['hook', 'problem', 'proof', 'lesson', 'question'],
      overlayMode: 'light',
      ctaStyle: 'question-led',
      coverStyle: 'short line',
      assetNeeds: ['post'],
    }
  );
}

function buildPublicProofFragments(analysis) {
  const signalFragments = (analysis.codebaseContext?.signalIds || [])
    .map((signalId) => SIGNAL_PUBLIC_PROOF_LINES[signalId])
    .filter(Boolean);
  const summaryFragments = (analysis.codebaseContext?.touchedFiles || [])
    .map((file) => file.summary)
    .filter(Boolean);

  return dedupeHighlights([...signalFragments, ...summaryFragments]);
}

function buildFallbackPublicProof(analysis) {
  const fragments = buildPublicProofFragments(analysis).slice(0, 3);

  if (!fragments.length) {
    return buildPublicProof(analysis);
  }

  const proofLine = joinNatural(fragments.map((fragment) => fragment.replace(/\.$/, '')));
  return `${capitalizeFirst(proofLine)}.`;
}

function buildBuilderOverlay(platformId, variant = 'primary') {
  const spec = getPlatformSpec(platformId);

  if (spec.overlayMode === 'builder') {
    if (variant === 'primary') {
      return 'I am a miner building Ellie with AI-native, mostly vibe-coded workflows. The point is not the tooling flex. The point is turning real shift-work pain into working product decisions.';
    }

    return 'The longer arc is simple: build software out of real operator pain, learn the AI-native workflow well enough to repeat it, then teach other people how to do the same with useful apps.';
  }

  if (spec.overlayMode === 'light-builder') {
    if (variant === 'primary') {
      return 'Built by a miner for shift workers.';
    }

    return 'I am building Ellie as a miner with AI-native, mostly vibe-coded workflows, but the product problem stays first.';
  }

  return BRAND_CONTEXT.identity.builderLine;
}

function buildReadyPostHashtags(platformId) {
  if (platformId === 'carousel' || platformId === 'reels' || platformId === 'tiktok') {
    return '#ellieapp #shiftwork #mining #buildinpublic #theminerbuildingtech #vibecoding';
  }

  if (platformId === 'shorts') {
    return '#ellieapp #shiftwork #mining #buildinpublic #theminerbuildingtech';
  }

  return '';
}

function buildPlatformStoryContext(analysis, platformId = 'linkedin') {
  const foundationLaunch = buildFoundationLaunchContext(analysis);
  const codebaseHighlights = analysis.codebaseContext?.storyHighlights || [];
  const spec = getPlatformSpec(platformId);

  if (foundationLaunch) {
    return {
      slug: 'foundation-launch',
      title: 'building the answer before the screen',
      hook: `If "Tomorrow: Night Shift" is wrong, the animation does not matter.`,
      altHook:
        'Day 1 had two jobs: build the answer, then build the first screen people could trust.',
      problem:
        'The surface could not start making promises before the answer layer deserved trust.',
      shift:
        'Build shift math, services, and safeguards first. Then let the first visible layer land on top of that base.',
      proof:
        'By the end of the day, Ellie had the answer layer underneath it and the first onboarding surface finally had something truthful to stand on.',
      lesson:
        'Trust is not a feature you add after the interface looks good. It is a structural decision.',
      question: 'What do you secure first when the user cannot afford a wrong answer?',
      codebaseProof: codebaseHighlights,
      coverText: `If "Tomorrow: Night Shift" is wrong, the animation does not matter.`,
      pinnedComment: 'High-stakes products live or die on the first answer people decide to trust.',
      builderVariation:
        'I am building Ellie as a miner using AI-native workflows, but the lesson is older than the tooling: if the answer underneath is shaky, the product never deserves trust.',
      overlayLine: buildBuilderOverlay(platformId, 'primary'),
      deeperOverlayLine: buildBuilderOverlay(platformId, 'secondary'),
      platformLabel: spec.label,
    };
  }

  if (analysis.codebaseContext?.storyMode === 'onboarding-momentum') {
    return {
      slug: 'onboarding-momentum',
      title: 'when onboarding stopped feeling like paperwork',
      hook: 'If choosing your roster feels like paperwork, people quit before the app earns trust.',
      altHook:
        'I rebuilt the pattern picker because the right information was still asking too much from tired people.',
      problem:
        'The setup path was collecting the right information but still making people work too hard.',
      shift:
        'Tighten the onboarding path first, then redesign the hardest decision so it feels lighter to move through.',
      proof:
        'By the end of the day, setup had a clearer path, a one-question-at-a-time introduction, and a swipeable way to choose a roster pattern.',
      lesson:
        'You do not make a boring decision better by explaining it harder. You make it better by changing how it feels to move through.',
      question: 'What onboarding step still feels like paperwork in most apps?',
      codebaseProof: codebaseHighlights,
      coverText: 'If setup feels like paperwork, people quit before trust starts.',
      pinnedComment:
        'The hardest onboarding step is usually not the one with the most fields. It is the one that feels like work.',
      builderVariation:
        'I am building Ellie as a miner with AI-native, mostly vibe-coded workflows. The useful part is not the novelty of the tooling. It is that it lets me turn real shift-work friction into working product decisions fast.',
      overlayLine: buildBuilderOverlay(platformId, 'primary'),
      deeperOverlayLine: buildBuilderOverlay(platformId, 'secondary'),
      platformLabel: spec.label,
    };
  }

  if (analysis.codebaseContext?.storyMode === 'language-trust') {
    return {
      slug: 'language-trust',
      title: 'when the app started sounding understood instead of translated',
      hook: 'If the app sounds translated instead of understood, people stop trusting it fast.',
      altHook: 'The first minute got better when the language stopped sounding imported.',
      problem:
        'The product was technically readable, but parts of the first minute still sounded like software, not like something built for real people.',
      shift:
        'Tighten the copy, first impression, and pricing moment so the app reads naturally in more languages.',
      proof:
        'The first minute started reading more naturally across the surfaces people hit early, especially where trust is still fragile.',
      lesson:
        'Localization is not coverage. It is whether the product still feels native after the words change.',
      question: 'What is the fastest way a translated app loses your trust?',
      codebaseProof: codebaseHighlights,
      coverText: 'Translation is not the same thing as trust.',
      pinnedComment: 'People feel translated at much faster than most product teams think.',
      builderVariation:
        'One reason I care about AI-native building is speed, but speed without language quality just creates a product that feels generated. The standard has to stay higher than that.',
      overlayLine: buildBuilderOverlay(platformId, 'primary'),
      deeperOverlayLine: buildBuilderOverlay(platformId, 'secondary'),
      platformLabel: spec.label,
    };
  }

  const hero = analysis.topMoments[0];
  const areas = codebaseHighlights.slice(0, 3);
  const areaLine = joinNatural(
    areas.length ? areas : getPublicAreas(analysis, 3).map((area) => area.toLowerCase())
  );

  return {
    slug: 'default',
    title: buildHeadline(analysis).replace(`${analysis.humanDate}: `, '').trim(),
    hook: capitalizeFirst(hero.tension),
    altHook: `Today was really about ${areaLine}.`,
    problem: buildStoryAtoms(analysis).problem,
    shift: buildStoryAtoms(analysis).decision,
    proof: buildFallbackPublicProof(analysis),
    lesson: hero.lesson,
    question: buildStoryAtoms(analysis).openLoop,
    codebaseProof: codebaseHighlights,
    coverText: capitalizeFirst(hero.tension),
    pinnedComment: buildStoryAtoms(analysis).openLoop,
    builderVariation:
      'I am building Ellie as a miner using AI-native workflows, but I still want the public story to stay grounded in the product problem, not the tooling alone.',
    overlayLine: buildBuilderOverlay(platformId, 'primary'),
    deeperOverlayLine: buildBuilderOverlay(platformId, 'secondary'),
    platformLabel: spec.label,
  };
}

function buildPlatformAssetBrief(platformId, analysis) {
  const spec = getPlatformSpec(platformId);
  const story = buildPlatformStoryContext(analysis, platformId);

  return `
# ${spec.label} Asset Brief

- Audience: ${spec.audience}
- Objective: ${spec.objective}
- Native format: ${spec.nativeFormat}
- Target length: ${spec.targetLength}
- Hook rule: ${spec.hookRule}
- Structure: ${joinNatural(spec.structure)}
- Cover style: ${spec.coverStyle}
- CTA style: ${spec.ctaStyle}
- Overlay mode: ${spec.overlayMode}
- Angle mix: ${formatAngleMix(getPlatformAngles(analysis, platformId))}

## Story Fit

- Chapter: ${story.title}
- Hook: ${story.hook}
- Proof line: ${story.proof}
- Builder overlay: ${story.overlayLine}

## Asset Needs

${spec.assetNeeds.map((item) => `- ${item}`).join('\n')}
`;
}

function buildReadyPostReels(analysis) {
  const story = buildPlatformStoryContext(analysis, 'reels');
  const spec = getPlatformSpec('reels');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'reels'))}
- Runtime target: ${spec.targetLength}
- Cover text: ${story.coverText}
- Pinned comment: ${story.pinnedComment}

## Post

### Voiceover

${story.hook}

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.question}

### On-screen Text

1. ${story.hook}
2. ${story.shift}
3. ${story.proof}
4. ${story.lesson}

### Caption

${story.problem}

${story.shift}

${story.proof}

${story.overlayLine}

${story.question}

${buildReadyPostHashtags('reels')}
`;
}

function buildReadyPostTikTok(analysis) {
  const story = buildPlatformStoryContext(analysis, 'tiktok');
  const spec = getPlatformSpec('tiktok');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'tiktok'))}
- Runtime target: ${spec.targetLength}
- Cover text: ${story.coverText}
- Pinned comment: ${story.pinnedComment}

## Post

### Script

${story.altHook}

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.question}

### Caption

${story.problem}

${story.shift}

${story.proof}

${story.overlayLine}

${story.question}

${buildReadyPostHashtags('tiktok')}

## Optional Builder Turn

${story.builderVariation}
`;
}

function buildReadyPostShorts(analysis) {
  const story = buildPlatformStoryContext(analysis, 'shorts');
  const spec = getPlatformSpec('shorts');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'shorts'))}
- Runtime target: ${spec.targetLength}
- Cover text: ${story.coverText}
- Top comment prompt: ${story.question}

## Post

### Script

${story.hook}

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.overlayLine}

${story.question}

### Description

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.deeperOverlayLine}

${buildReadyPostHashtags('shorts')}
`;
}

function buildReadyPostCarousel(analysis) {
  const story = buildPlatformStoryContext(analysis, 'carousel');
  const spec = getPlatformSpec('carousel');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'carousel'))}
- Cover text: ${story.coverText}
- Final slide CTA: ${story.question}

## Post

### Slide Copy

1. ${story.coverText}
2. ${story.problem}
3. The wrong fix was more explanation. The better fix was a better path and a better decision moment.
4. ${story.shift}
5. ${story.proof}
6. ${story.lesson}
7. ${story.question}

### Caption

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.overlayLine}

${story.question}

${buildReadyPostHashtags('carousel')}
`;
}

function buildReadyPostLinkedIn(analysis) {
  const story = buildPlatformStoryContext(analysis, 'linkedin');
  const spec = getPlatformSpec('linkedin');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'linkedin'))}
- Format: ${spec.nativeFormat}
- Comment prompt: ${story.question}

## Primary Post

${story.hook}

${story.problem}

${story.shift}

${story.proof}

${story.lesson}

${story.overlayLine}

${story.question}

## Builder Variation

${story.hook}

${story.problem}

${story.shift}

${story.builderVariation}

${story.lesson}

${story.question}
`;
}

function buildReadyPostX(analysis) {
  const story = buildPlatformStoryContext(analysis, 'x');
  const spec = getPlatformSpec('x');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'x'))}
- Format: ${spec.nativeFormat}
- Reply seed: ${story.question}

## Primary Thread

1. ${story.hook}

2. ${story.problem}

3. ${story.shift}

4. ${story.proof}

5. ${story.lesson}

6. ${story.question}

## Short Version

${story.hook} ${story.shift} ${story.lesson}

## Builder Variation

1. ${story.hook}

2. ${story.problem}

3. ${story.builderVariation}

4. ${story.lesson}

5. ${story.question}
`;
}

function buildReadyPostThreads(analysis) {
  const story = buildPlatformStoryContext(analysis, 'threads');
  const spec = getPlatformSpec('threads');

  return `
# ${spec.label} Ready Post

## Strategy

- Angle Mix: ${formatAngleMix(getPlatformAngles(analysis, 'threads'))}
- Format: ${spec.nativeFormat}
- Reply seed: ${story.question}

## Primary Post

${story.altHook}

${story.problem}

${story.proof}

${story.lesson}

${story.question}

## Builder Variation

${story.altHook}

${story.builderVariation}

${story.lesson}

${story.question}
`;
}

function buildLocalDrafts(analysis) {
  return {
    '01-daily-brief.md': buildDailyBrief(analysis),
    '02-hook-bank.md': buildHookBank(analysis),
    '03-hero-short.md': buildHeroShort(analysis),
    '04-instagram-carousel.md': buildInstagramCarousel(analysis),
    '05-linkedin-post.md': buildLinkedInPost(analysis),
    '06-x-thread.md': buildXThread(analysis),
    '07-funnel-cuts.md': buildFunnelCuts(analysis),
    '08-community-loop.md': buildCommunityLoop(analysis),
    '09-platform-playbook.md': buildPlatformPlaybook(analysis),
    '10-codebase-context.md': buildCodebaseContextMarkdown(analysis),
    [path.join('ready-to-post', 'instagram-reels', 'post.md')]: buildReadyPostReels(analysis),
    [path.join('ready-to-post', 'instagram-reels', 'asset-brief.md')]: buildPlatformAssetBrief(
      'reels',
      analysis
    ),
    [path.join('ready-to-post', 'tiktok', 'post.md')]: buildReadyPostTikTok(analysis),
    [path.join('ready-to-post', 'tiktok', 'asset-brief.md')]: buildPlatformAssetBrief(
      'tiktok',
      analysis
    ),
    [path.join('ready-to-post', 'youtube-shorts', 'post.md')]: buildReadyPostShorts(analysis),
    [path.join('ready-to-post', 'youtube-shorts', 'asset-brief.md')]: buildPlatformAssetBrief(
      'shorts',
      analysis
    ),
    [path.join('ready-to-post', 'instagram-carousel', 'post.md')]: buildReadyPostCarousel(analysis),
    [path.join('ready-to-post', 'instagram-carousel', 'asset-brief.md')]: buildPlatformAssetBrief(
      'carousel',
      analysis
    ),
    [path.join('ready-to-post', 'linkedin', 'post.md')]: buildReadyPostLinkedIn(analysis),
    [path.join('ready-to-post', 'linkedin', 'asset-brief.md')]: buildPlatformAssetBrief(
      'linkedin',
      analysis
    ),
    [path.join('ready-to-post', 'x', 'post.md')]: buildReadyPostX(analysis),
    [path.join('ready-to-post', 'x', 'asset-brief.md')]: buildPlatformAssetBrief('x', analysis),
    [path.join('ready-to-post', 'threads', 'post.md')]: buildReadyPostThreads(analysis),
    [path.join('ready-to-post', 'threads', 'asset-brief.md')]: buildPlatformAssetBrief(
      'threads',
      analysis
    ),
  };
}

function writeDraftMap(outputDir, drafts) {
  Object.entries(drafts).forEach(([relativePath, content]) => {
    writeTextFile(path.join(outputDir, relativePath), content);
  });
}

function getRepositoryName(remoteUrl) {
  const match = remoteUrl.match(/\/([^/]+?)(?:\.git)?$/);
  return match ? match[1] : path.basename(ROOT_DIR);
}

function getRemoteUrl() {
  const output = runGit(['remote', 'get-url', 'origin']).trim();
  return output || 'unknown';
}

function getCurrentBranch() {
  return runGit(['branch', '--show-current']).trim() || 'unknown';
}

function createEmptyPack(
  outputDir,
  dateString,
  repositoryName,
  branchName,
  remoteUrl,
  generation = { provider: 'local', usedAnthropic: false, model: null },
  window = null
) {
  const humanDate = formatHumanDate(dateString);
  const windowLine = buildWindowLine(window);
  const summary = `
# No Work Found Today

**Date**: ${humanDate}
${windowLine ? `**Window**: ${windowLine}\n` : ''}**Repository**: ${repositoryName}
**Branch**: ${branchName}
**Remote**: ${remoteUrl}

No tracked work was found inside the selected window, so no stop-scroll pack was generated.
`;
  const codebaseSummary = `
# Codebase Context

No tracked work was found for this day, so no codebase-context pass was generated.
`;

  const json = {
    date: dateString,
    status: 'no_work',
    selectedAngles: [],
    platformAngles: {},
    codebaseContext: {
      storyMode: 'no_work',
      storyHighlights: [],
    },
    window,
    generation,
    totals: {
      commits: 0,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      testsTouched: 0,
      localeCount: 0,
    },
  };

  writeJsonFile(path.join(outputDir, '00-brief.json'), json);
  writeTextFile(path.join(outputDir, '01-daily-brief.md'), summary);
  writeTextFile(path.join(outputDir, '10-codebase-context.md'), codebaseSummary);

  if (!generation.usedAnthropic) {
    removeFileIfExists(path.join(outputDir, '11-provider-report.json'));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const contentProvider = resolveContentProvider(args);
  const anthropicModel = resolveAnthropicModel(args);
  const dateString = args.date || getLocalDateString();
  const window = resolveWindow(dateString, args);
  const since = window.since;
  const until = window.until;
  const outputRoot = args['output-root']
    ? path.resolve(ROOT_DIR, args['output-root'])
    : OUTPUT_ROOT;
  const outputDir = path.join(outputRoot, dateString);
  const remoteUrl = getRemoteUrl();
  const branchName = getCurrentBranch();
  const repositoryName = getRepositoryName(remoteUrl);
  const emptyGeneration = {
    provider: contentProvider,
    usedAnthropic: contentProvider === 'anthropic',
    model: contentProvider === 'anthropic' ? anthropicModel : null,
    refinedFiles: [],
    failedFiles: [],
    requestCount: 0,
    usage: null,
  };

  ensureDir(outputDir);

  const commits = parseCommits(since, until);
  const history = loadHistory(outputRoot, dateString);

  if (!commits.length) {
    createEmptyPack(
      outputDir,
      dateString,
      repositoryName,
      branchName,
      remoteUrl,
      emptyGeneration,
      window
    );
    console.log(`No tracked work found for ${dateString}. Empty pack written to ${outputDir}`);
    return;
  }

  const analysis = aggregateAnalysis(commits, dateString, history, window);
  const providerRun = {
    provider: contentProvider,
    usedAnthropic: contentProvider === 'anthropic',
    model: contentProvider === 'anthropic' ? anthropicModel : null,
    refinedFiles: [],
    failedFiles: [],
    requestCount: 0,
    usage: null,
  };
  let drafts = buildLocalDrafts(analysis);

  if (contentProvider === 'anthropic') {
    const refinement = await refineDraftsWithAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: anthropicModel,
      analysis,
      drafts,
      brandContext: BRAND_CONTEXT,
      platformPlaybook: PLATFORM_PLAYBOOK,
      outputDir,
    });

    drafts = refinement.drafts;
    providerRun.refinedFiles = refinement.metadata.refinedFiles;
    providerRun.failedFiles = refinement.metadata.failedFiles;
    providerRun.requestCount = refinement.metadata.requestCount;
    providerRun.usage = refinement.metadata.usage;
  }

  const briefJson = {
    date: analysis.date,
    humanDate: analysis.humanDate,
    repository: repositoryName,
    branch: branchName,
    remote: remoteUrl,
    window,
    selectedAngles: analysis.selectedAngles.map((angle) => angle.id),
    platformAngles: Object.fromEntries(
      Object.entries(analysis.platformAngles).map(([platformId, angles]) => [
        platformId,
        angles.map((angle) => angle.id),
      ])
    ),
    codebaseContext: {
      storyMode: analysis.codebaseContext.storyMode,
      storyHighlights: analysis.codebaseContext.storyHighlights,
      touchedFiles: analysis.codebaseContext.touchedFiles.map((file) => ({
        path: file.path,
        role: file.role,
        summary: file.summary,
        signals: file.signals,
        relatedFiles: file.relatedFiles,
      })),
      relatedFiles: analysis.codebaseContext.relatedFiles.map((file) => ({
        path: file.path,
        role: file.role,
        summary: file.summary,
        signals: file.signals,
        relatedFiles: file.relatedFiles,
      })),
    },
    generation: providerRun,
    metaFocus: analysis.metaFocus,
    metaArc: analysis.metaArc,
    dominantAction: analysis.dominantAction,
    totals: analysis.totals,
    topThemes: analysis.topThemes,
    topCategories: analysis.topCategories,
    allLocales: analysis.allLocales,
    commits: analysis.commits.map((commit) => ({
      hash: commit.hash,
      shortHash: commit.shortHash,
      authoredAt: commit.authoredAt,
      subject: commit.subject,
      action: commit.action,
      score: commit.score,
      added: commit.added,
      deleted: commit.deleted,
      filesChanged: commit.files.length,
      testsTouched: commit.testsTouched,
      localesTouched: commit.localesTouched,
      files: commit.files.map((file) => ({
        path: file.path,
        added: file.added,
        deleted: file.deleted,
        category: file.category,
      })),
    })),
    topMoments: analysis.topMoments,
  };

  writeJsonFile(path.join(outputDir, '00-brief.json'), briefJson);
  writeDraftMap(outputDir, drafts);

  if (contentProvider !== 'anthropic') {
    removeFileIfExists(path.join(outputDir, '11-provider-report.json'));
  }

  console.log(
    `Stop-scroll pack generated for ${dateString}: ${outputDir} (provider: ${contentProvider}${
      contentProvider === 'anthropic' ? `, model: ${anthropicModel}` : ''
    })`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
