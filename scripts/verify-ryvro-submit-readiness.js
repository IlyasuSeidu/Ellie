#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function addError(message) {
  errors.push(message);
}

function requireIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    addError(`${label} must include ${expected}`);
  }
}

function isPlaceholder(value) {
  if (!value || typeof value !== 'string') {
    return true;
  }

  return /^(YOUR_|FILL_|TODO|TBD|REPLACE_|CHANGE_)/i.test(value);
}

function parseEvidenceRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim())
    )
    .filter((cells) => cells.length >= 4)
    .filter((cells) => !cells.every((cell) => /^-+$/.test(cell.replace(/\s/g, ''))))
    .filter(([item]) => item !== 'Item');
}

function looksLikePlaceholderToken(value) {
  const compactValue = value.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  return (
    compactValue.length === 0 ||
    /^(x+|example|placeholder|replace|redacted|todo|tbd|yourkey|yourtoken)$/.test(compactValue) ||
    compactValue.includes('xxxxxxxx') ||
    compactValue.includes('replace') ||
    compactValue.includes('redacted') ||
    compactValue.includes('placeholder')
  );
}

function scanEvidenceForSecrets(files) {
  const literalSecretPatterns = [
    ['private key block', /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/],
    ['Google service-account private key JSON', /"private_key"\s*:/],
    ['Google service-account private key ID JSON', /"private_key_id"\s*:/],
    ['EAS access token', /\beas_[A-Za-z0-9_-]{20,}\b/],
  ];
  const tokenSecretPatterns = [
    ['Firebase API key', /\bAIza[0-9A-Za-z_-]{20,}\b/g],
    ['RevenueCat SDK key', /\b(?:appl|goog)_[A-Za-z0-9]{12,}\b/g],
  ];

  files.forEach(([relativePath, content]) => {
    literalSecretPatterns.forEach(([label, pattern]) => {
      if (pattern.test(content)) {
        addError(`${relativePath} appears to contain ${label}; record only non-secret evidence`);
      }
    });

    tokenSecretPatterns.forEach(([label, pattern]) => {
      Array.from(content.matchAll(pattern)).forEach(([value]) => {
        if (!looksLikePlaceholderToken(value)) {
          addError(`${relativePath} appears to contain ${label}; record only non-secret evidence`);
        }
      });
    });
  });
}

const easJson = JSON.parse(read('eas.json'));
const evidenceLog = read('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
const ownerRunbook = read('docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md');
const releaseTasks = read('RYVRO_RELEASE_TASKS.md');
const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
const submitBlockerTriage = read('docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md');
const deploymentGuide = read('docs/DEPLOYMENT.md');
const playInternalTestingHandoff = read('docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md');
const deviceQaTemplate = read('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');

scanEvidenceForSecrets([
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', evidenceLog],
  ['docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md', ownerRunbook],
  ['docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md', submitBlockerTriage],
  [
    'docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md',
    read('docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md'),
  ],
  [
    'docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md',
    read('docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md'),
  ],
  [
    'docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md',
    read('docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md'),
  ],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', read('docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md')],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', playInternalTestingHandoff],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', deviceQaTemplate],
]);

[
  [
    'Do not submit to App Store review or Google Play production until all of these are true',
    ownerRunbook,
  ],
  [
    'Before launch, every required row above should be `Passed` or explicitly `Not applicable`',
    evidenceLog,
  ],
  ['Store-ready screenshot file names and capture metadata', ownerRunbook],
  ['app-store-iphone-01-template-start.png', screenshotChecklist],
  ['google-play-phone-02-dashboard-calendar.png', screenshotChecklist],
  ['eas submit --platform ios --latest', ownerRunbook],
  ['eas submit --platform android --latest', ownerRunbook],
  ['TestFlight install QA passes on a real iPhone', deploymentGuide],
  ['Submit to TestFlight first', deploymentGuide],
  ['Submit to the internal track first', deploymentGuide],
  ['The emulator is not acceptable', deploymentGuide],
  ['# Ryvro Submit Blocker Triage', submitBlockerTriage],
  ['Current Submit Gate', submitBlockerTriage],
  ['Recommended Order', submitBlockerTriage],
  ['Android service account key path `./google-play-key.json`', submitBlockerTriage],
  ['Formal trademark/legal clearance for `Ryvro`', submitBlockerTriage],
  ['Finish Google Play Verification And App Setup', submitBlockerTriage],
  ['Finish Firebase Email Templates And Production Env', submitBlockerTriage],
  ['Finish RevenueCat And Store Products', submitBlockerTriage],
  ['Rebuild, Test, Screenshot, Then Submit', submitBlockerTriage],
  ['npm run release:versions:get', submitBlockerTriage],
  ['eas build:version:set --platform ios --profile production', submitBlockerTriage],
  ['eas build:version:set --platform android --profile production', submitBlockerTriage],
  ['Android mobile device access verification', submitBlockerTriage],
  ['physical Android 10 or newer device', submitBlockerTriage],
  [
    "You can't verify using this device. To verify, use a device running Android 10 (SDK 29) or newer.",
    playInternalTestingHandoff,
  ],
  [
    'Treat this as requiring a physical Android 10 or newer device signed into the owner Google account',
    playInternalTestingHandoff,
  ],
  ['Android SDK level:', deviceQaTemplate],
  ['Physical device confirmation: Yes / No', deviceQaTemplate],
  ['Android version is 10 or newer and Android SDK level is 29 or newer', deviceQaTemplate],
  [
    'The install came from Play internal testing or a production-equivalent store-signed build',
    deviceQaTemplate,
  ],
  ['not an Android emulator, Expo Go, local development client, or debug APK', deviceQaTemplate],
  ['Only mark a row in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` as `Passed`', submitBlockerTriage],
].forEach(([expected, content]) => requireIncludes(content, expected, 'submit readiness handoff'));

const submitConfig = easJson.submit?.production;
if (!submitConfig) {
  addError('eas.json must define submit.production before store submission');
} else {
  const iosSubmit = submitConfig.ios || {};
  const androidSubmit = submitConfig.android || {};

  [
    ['submit.production.ios.appleId', iosSubmit.appleId],
    ['submit.production.ios.ascAppId', iosSubmit.ascAppId],
    ['submit.production.ios.appleTeamId', iosSubmit.appleTeamId],
    ['submit.production.android.serviceAccountKeyPath', androidSubmit.serviceAccountKeyPath],
    ['submit.production.android.track', androidSubmit.track],
  ].forEach(([label, value]) => {
    if (isPlaceholder(value)) {
      addError(`${label} must be a real owner console value before EAS submit`);
    }
  });

  if (androidSubmit.track !== 'internal') {
    addError(
      'submit.production.android.track must stay on internal until internal-track QA passes'
    );
  }

  if (
    androidSubmit.serviceAccountKeyPath &&
    !isPlaceholder(androidSubmit.serviceAccountKeyPath) &&
    !fs.existsSync(path.join(root, androidSubmit.serviceAccountKeyPath))
  ) {
    addError(
      `Android service account key path ${androidSubmit.serviceAccountKeyPath} must exist locally before EAS submit`
    );
  }
}

const evidenceRows = parseEvidenceRows(evidenceLog);
const requiredEvidenceItems = [
  'Formal trademark/legal clearance for `Ryvro`',
  'App Store Connect app name `Ryvro Shift Planner`',
  'Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`',
  'Domain control for `getryvro.com`',
  'Social handles',
  'Apple Developer account',
  'Apple App ID',
  'Google Play app',
  'Google Play service account',
  'EAS project',
  'iOS signing',
  'Android release signing',
  'Firebase project',
  'Firebase iOS app',
  'Firebase Android app',
  'OAuth clients',
  'Firebase Auth domains',
  'Firebase Auth email templates',
  'Backend deploy - ryvroBrain',
  'Backend smoke - ryvroBrain',
  'Backend deploy - parser',
  'Shift parser smoke',
  'Production env preflight',
  'EAS production environment push',
  'RevenueCat apps',
  'App Store Connect in-app purchase key',
  'RevenueCat SDK keys',
  'Entitlement',
  'App Store products',
  'Google Play products',
  'Default offering',
  'Sandbox purchase QA',
  'Privacy page',
  'Terms page',
  'Support page/mailbox',
  'Account deletion page',
  'App Store privacy form',
  'Google Play Data safety form',
  'Content rating and export compliance',
  'EU trader status',
  'Reviewer account',
  'iOS production build',
  'Android production AAB',
  'TestFlight iPhone QA',
  'Physical Android QA',
  'Store screenshots',
  'Store submission',
];

const rowsByItem = new Map(evidenceRows.map((row) => [row[0], row]));
requiredEvidenceItems.forEach((item) => {
  if (!rowsByItem.has(item)) {
    addError(`Launch evidence log is missing required row: ${item}`);
  }
});

evidenceRows.forEach(([item, requiredEvidence, status, notes]) => {
  if (status === 'Pending owner evidence') {
    addError(`${item} still has pending owner evidence: ${requiredEvidence}`);
  }

  if (status.startsWith('Failed')) {
    addError(`${item} is marked failed and must be resolved before submission`);
  }

  if ((status === 'Passed' || status === 'Not applicable') && !notes) {
    addError(`${item} must include a non-secret evidence location or note`);
  }
});

[
  'eas submit --platform ios --latest',
  'eas submit --platform android --latest',
  'Take screenshots',
  'Privacy Policy live URL and owner review complete',
  'Manual smoke tests pass on physical iOS + Android devices',
].forEach((expected) => requireIncludes(releaseTasks, expected, 'release task submit gate'));

if (errors.length > 0) {
  console.error('Ryvro submit readiness check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Ryvro submit readiness check passed');
