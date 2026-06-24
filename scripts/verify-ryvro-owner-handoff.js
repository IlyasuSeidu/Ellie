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

function requireIncludes(content, expected, label) {
  if (!content.includes(expected)) {
    errors.push(`${label} must include ${expected}`);
  }
}

function requireMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    errors.push(`${label} must match ${pattern}`);
  }
}

const packageJson = JSON.parse(read('package.json'));
const readme = read('README.md');
const releaseTasks = read('RYVRO_RELEASE_TASKS.md');
const readinessReport = read('docs/RYVRO_RELEASE_READINESS_REPORT.md');
const architecture = read('docs/ARCHITECTURE.md');
const storeListing = read('docs/RYVRO_STORE_LISTING.md');
const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
const deviceQaTemplate = read('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');
const ownerRunbook = read('docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md');
const externalSetup = read('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
const revenueCatProductsHandoff = read('docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md');
const appStoreTestFlightHandoff = read('docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md');
const launchEvidenceLog = read('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
const privacySupport = read('docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md');
const submissionDraft = read('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');

const concept =
  'Configure your shift once. Ask Ryvro by voice. Get the right shift answer instantly.';

[
  ['README', readme],
  ['release task list', releaseTasks],
  ['release readiness report', readinessReport],
  ['architecture doc', architecture],
].forEach(([label, content]) => {
  requireIncludes(content, concept, label);
});

[
  ['Ask screen', readme, 'README'],
  ['There is no chat composer, no typing box, and no bottom tab bar', readme, 'README'],
  ['English-only', readme, 'README'],
  ['dark base, cyan, blue, silver, and muted text', readme, 'README'],
  [
    'Firebase functions were deployed to project `ryvro-shift-planner`',
    releaseTasks,
    'release tasks',
  ],
  ['ryvro_pro_monthly', releaseTasks, 'release tasks'],
  ['ryvro_pro_annual', releaseTasks, 'release tasks'],
  ['RevenueCat entitlement is `pro`', releaseTasks, 'release tasks'],
  ['Trademark/legal clearance for Ryvro completed on June 16, 2026', releaseTasks, 'release tasks'],
  ['Social handles reserved', releaseTasks, 'release tasks'],
  ['support@getryvro.com', releaseTasks, 'release tasks'],
  ['Ask screen answers the required voice QA questions', releaseTasks, 'release tasks'],
  [
    'Online backend answers broad natural-language date and range questions',
    releaseTasks,
    'release tasks',
  ],
  ['Physical iPhone QA passes', releaseTasks, 'release tasks'],
  ['Physical Android QA passes', releaseTasks, 'release tasks'],
  ['Before Store Launch', readinessReport, 'readiness report'],
  [
    'Backend functions were deployed to Firebase project `ryvro-shift-planner`',
    readinessReport,
    'readiness report',
  ],
  ['Physical iPhone TestFlight QA', readinessReport, 'readiness report'],
  ['RevenueCat sandbox purchase and restore QA', readinessReport, 'readiness report'],
  ['App Store name: Ryvro Shift Planner', storeListing, 'store listing'],
  ['Google Play app name: Ryvro Shift Planner', storeListing, 'store listing'],
  ['Native display name: Ryvro', storeListing, 'store listing'],
  ['Bundle ID: `com.ryvro.shiftplanner`', storeListing, 'store listing'],
  ['Android package: `com.ryvro.shiftplanner`', storeListing, 'store listing'],
  ['voice-first shift assistant', storeListing, 'store listing'],
  ['personal planning aid', storeListing, 'store listing'],
  ['app-store-iphone-01-welcome.png', screenshotChecklist, 'screenshot checklist'],
  ['app-store-iphone-03-ask.png', screenshotChecklist, 'screenshot checklist'],
  ['google-play-phone-04-paywall.png', screenshotChecklist, 'screenshot checklist'],
  ['Keep the screenshot files out of Git', screenshotChecklist, 'screenshot checklist'],
  ['Required Voice Questions', deviceQaTemplate, 'device QA template'],
  ['What shift do I have next week Saturday?', deviceQaTemplate, 'device QA template'],
  ['Offline exact-date and range answers', ownerRunbook, 'owner runbook'],
  ['npm run release:submit:check', ownerRunbook, 'owner runbook'],
  ['SHIFT_SCHEDULE_PARSER_URL', externalSetup, 'external service setup'],
  ['RevenueCat offering `default`', revenueCatProductsHandoff, 'RevenueCat handoff'],
  ['entitlement `pro`', revenueCatProductsHandoff, 'RevenueCat handoff'],
  ['asks one voice question', appStoreTestFlightHandoff, 'App Store handoff'],
  ['App Store Connect app name `Ryvro Shift Planner`', launchEvidenceLog, 'launch evidence log'],
  ['Google Play title `Ryvro Shift Planner`', launchEvidenceLog, 'launch evidence log'],
  ['Not For Safety-Critical Decisions', privacySupport, 'privacy support templates'],
  ['Reviewer password: create a fresh strong password', submissionDraft, 'submission draft'],
].forEach(([expected, content, label]) => requireIncludes(content, expected, label));

requireMatches(
  packageJson.scripts?.['release:check'] || '',
  /release:owner:check/,
  'package release check'
);

requireMatches(
  packageJson.scripts?.['release:check'] || '',
  /release:store:check/,
  'package release check'
);

if (errors.length > 0) {
  console.error('Ryvro owner handoff check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Ryvro owner handoff check passed');
