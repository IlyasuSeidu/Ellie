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

const easJson = JSON.parse(read('eas.json'));
const evidenceLog = read('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
const ownerRunbook = read('docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md');
const releaseTasks = read('RYVRO_RELEASE_TASKS.md');
const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
const submitBlockerTriage = read('docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md');

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
  ['# Ryvro Submit Blocker Triage', submitBlockerTriage],
  ['Current Submit Gate', submitBlockerTriage],
  ['Recommended Order', submitBlockerTriage],
  ['Android service account key path `./google-play-key.json`', submitBlockerTriage],
  ['Formal trademark/legal clearance for `Ryvro`', submitBlockerTriage],
  ['Finish Google Play Enrollment', submitBlockerTriage],
  ['Create Production Firebase And OAuth', submitBlockerTriage],
  ['Finish RevenueCat And Store Products', submitBlockerTriage],
  ['Rebuild, Test, Screenshot, Then Submit', submitBlockerTriage],
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
  'EAS secret push',
  'RevenueCat apps',
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
  'Privacy Policy published and URL live',
  'Manual smoke tests pass on physical iOS + Android devices',
].forEach((expected) => requireIncludes(releaseTasks, expected, 'release task submit gate'));

if (errors.length > 0) {
  console.error('Ryvro submit readiness check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Ryvro submit readiness check passed');
