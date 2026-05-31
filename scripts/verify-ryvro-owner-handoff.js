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

function requireMatches(content, pattern, label) {
  if (!pattern.test(content)) {
    addError(`${label} must match ${pattern}`);
  }
}

function requireNotMatches(content, pattern, label) {
  if (pattern.test(content)) {
    addError(`${label} must not match ${pattern}`);
  }
}

const releaseTasks = read('RYVRO_RELEASE_TASKS.md');
const packageJson = JSON.parse(read('package.json'));
const readme = read('README.md');
const deploymentPlan = read('docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md');
const readinessReport = read('docs/RYVRO_RELEASE_READINESS_REPORT.md');
const ownerRunbook = read('docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md');
const externalSetup = read('docs/RYVRO_EXTERNAL_SERVICE_SETUP.md');
const storeListing = read('docs/RYVRO_STORE_LISTING.md');
const privacySupport = read('docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md');
const submissionDraft = read('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
const launchEvidenceLog = read('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');

[
  ['formal trademark/legal clearance', releaseTasks],
  ['App Store Connect app name `Ryvro Shift Planner`', releaseTasks],
  ['Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`', releaseTasks],
  ['getryvro.com', releaseTasks],
  ['Reserve social handles directly while logged in', releaseTasks],
  ['Create RevenueCat account', releaseTasks],
  ['RevenueCat → Entitlements → Add entitlement: ID = `pro`', releaseTasks],
  ['ryvro_pro_monthly', releaseTasks],
  ['ryvro_pro_annual', releaseTasks],
  ['Enroll Apple Developer account', releaseTasks],
  ['Run `eas login` then `eas init`', releaseTasks],
  ['Run `npm run release:env:check`, then push `.env` secrets to EAS', releaseTasks],
  ['npm run release:submit:check', releaseTasks],
  ['Build production iOS binary', releaseTasks],
  ['Build production Android AAB', releaseTasks],
  ['not live in the App Store or Google Play yet', readme],
  ['npm run release:owner:check', readme],
  ['owner handoff preflight', readme],
  ['Physical iOS and Android device smoke tests', readme],
  ['npm run release:owner:check', deploymentPlan],
  ['owner handoff preflight', deploymentPlan],
  ['RevenueCat `pro` entitlement', deploymentPlan],
  ['Manual smoke tests pass on 2 physical devices', deploymentPlan],
  ['App Store Connect + Play Console metadata/privacy/forms, screenshots', deploymentPlan],
  ['Physical iOS and Android smoke tests', ownerRunbook],
  ['Store screenshots, app privacy, data safety, content rating', ownerRunbook],
  ['npm run release:submit:check', ownerRunbook],
  ['Production `ryvroBrain` and `parseShiftScheduleDescription` endpoints', ownerRunbook],
  ['SHIFT_SCHEDULE_PARSER_URL', ownerRunbook],
  ['SHIFT_SCHEDULE_PARSER_URL', externalSetup],
  ['parseShiftScheduleDescription', externalSetup],
  ['root-level Firebase native service files', ownerRunbook],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', storeListing],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', launchEvidenceLog],
  ['npm run release:submit:check', launchEvidenceLog],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', releaseTasks],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', ownerRunbook],
  ['Fresh Firebase iOS/Android app configs and OAuth clients', readinessReport],
  ['real root-level Firebase native service files', readinessReport],
  [
    'Production Firebase deploy and smoke tests for both `ryvroBrain` and `parseShiftScheduleDescription`',
    readinessReport,
  ],
  ['valid-prompt `SHIFT_SCHEDULE_PARSER_URL` `200` draft response', readinessReport],
].forEach(([expected, content]) => requireIncludes(content, expected, 'owner launch handoff'));

[
  ['docs/RYVRO_RELEASE_READINESS_REPORT.md', ownerRunbook],
  ['docs/RYVRO_EXTERNAL_SERVICE_SETUP.md', ownerRunbook],
  ['docs/RYVRO_STORE_LISTING.md', ownerRunbook],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
  ['docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md', ownerRunbook],
  ['docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md', ownerRunbook],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', ownerRunbook],
  ['docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md', externalSetup],
].forEach(([expected, content]) => requireIncludes(content, expected, 'cross-linked owner docs'));

[
  ['Reviewer account: reviewer@getryvro.com', submissionDraft],
  ['Privacy policy URL: https://getryvro.com/privacy', submissionDraft],
  ['Terms URL: https://getryvro.com/terms', submissionDraft],
  ['Support URL: https://getryvro.com/support', submissionDraft],
  ['Account deletion URL: https://getryvro.com/delete-account', submissionDraft],
  ['Data deletion URL: https://getryvro.com/delete-account', submissionDraft],
  ['Account deletion URL: `https://getryvro.com/delete-account`', privacySupport],
  ['Support email: `support@getryvro.com`', privacySupport],
  ['Sender name: Ryvro Support', privacySupport],
  ['Reply-to email: support@getryvro.com', privacySupport],
  ['Public action domain: getryvro.com', privacySupport],
  ['Continue URL / action URL domain: https://getryvro.com', privacySupport],
  ['App Store name: Ryvro Shift Planner', storeListing],
  ['Google Play app name: Ryvro Shift Planner', storeListing],
  ['Bundle ID: com.ryvro.shiftplanner', storeListing],
  ['Android package: com.ryvro.shiftplanner', storeListing],
].forEach(([expected, content]) => requireIncludes(content, expected, 'launch console handoff'));

[
  ['# Ryvro Launch Evidence Log', launchEvidenceLog],
  ['Do not paste passwords, private keys, signing certificates', launchEvidenceLog],
  ['## Clearance And Reservations', launchEvidenceLog],
  ['Formal trademark/legal clearance for `Ryvro`', launchEvidenceLog],
  ['App Store Connect app name `Ryvro Shift Planner`', launchEvidenceLog],
  [
    'Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`',
    launchEvidenceLog,
  ],
  ['Domain control for `getryvro.com`', launchEvidenceLog],
  ['## Firebase, OAuth, Backend, And Email', launchEvidenceLog],
  ['Firebase Auth email templates', launchEvidenceLog],
  [
    'Sender `Ryvro Support`, reply-to `support@getryvro.com`, action domain `getryvro.com`',
    launchEvidenceLog,
  ],
  ['Backend deploy - ryvroBrain', launchEvidenceLog],
  ['Backend smoke - ryvroBrain', launchEvidenceLog],
  ['Backend deploy - parser', launchEvidenceLog],
  ['Shift parser smoke', launchEvidenceLog],
  ['## RevenueCat And Store Products', launchEvidenceLog],
  ['Entitlement ID `pro`, display name `Ryvro Pro`', launchEvidenceLog],
  ['`ryvro_pro_monthly` and `ryvro_pro_annual`', launchEvidenceLog],
  ['## Legal, Support, And Store Forms', launchEvidenceLog],
  ['Live `https://getryvro.com/delete-account` URL', launchEvidenceLog],
  ['## Production Builds And Device QA', launchEvidenceLog],
  ['TestFlight iPhone QA', launchEvidenceLog],
  ['Physical Android QA', launchEvidenceLog],
  ['Store submission', launchEvidenceLog],
  ['Pending owner evidence', launchEvidenceLog],
].forEach(([expected, content]) => requireIncludes(content, expected, 'launch evidence log'));

[
  ['# Ryvro Screenshot Capture Checklist', screenshotChecklist],
  ['Do not use Expo Go, web previews, local development-client screenshots', screenshotChecklist],
  ['reviewer@getryvro.com', screenshotChecklist],
  ['app-store-iphone-01-template-start.png', screenshotChecklist],
  ['app-store-iphone-02-dashboard-calendar.png', screenshotChecklist],
  ['app-store-iphone-03-paywall.png', screenshotChecklist],
  ['app-store-ipad-01-template-start.png', screenshotChecklist],
  ['app-store-ipad-02-dashboard-calendar.png', screenshotChecklist],
  ['app-store-ipad-03-paywall.png', screenshotChecklist],
  ['google-play-phone-01-template-start.png', screenshotChecklist],
  ['google-play-phone-02-dashboard-calendar.png', screenshotChecklist],
  ['google-play-phone-03-paywall.png', screenshotChecklist],
  ['1290 x 2796', screenshotChecklist],
  ['2048 x 2732', screenshotChecklist],
  ['1080 x 1920 or higher', screenshotChecklist],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', screenshotChecklist],
  ['Keep the screenshot files out of Git', screenshotChecklist],
].forEach(([expected, content]) => requireIncludes(content, expected, 'screenshot checklist'));

requireIncludes(
  readinessReport,
  'launch is not complete until the account-only and physical-device checks above are done',
  'readiness report merge readiness'
);
requireIncludes(
  ownerRunbook,
  'Do not submit to App Store review or Google Play production until all of these are true',
  'owner runbook stop gates'
);
requireIncludes(
  readinessReport,
  'dedicated Release Check job running `npm run release:check`',
  'readiness report CI evidence'
);
requireIncludes(
  ownerRunbook,
  'dedicated Release Check job running `npm run release:check`',
  'owner runbook CI evidence'
);
requireMatches(
  readinessReport,
  /CI run `\d+` passed Lint and Type Check/,
  'readiness report CI run evidence'
);
requireMatches(ownerRunbook, /CI run `\d+` on commit `[0-9a-f]+`/, 'owner runbook CI run evidence');
requireMatches(readme, /CI run `\d+` on commit `[0-9a-f]+`/, 'README CI run evidence');
[
  ['CI run `26724505909`', readme],
  ['commit `b143808`', readme],
  ['CI run `26724505909`', readinessReport],
  ['commit `b143808`', readinessReport],
  ['CI run `26724505909`', ownerRunbook],
  ['commit `b143808`', ownerRunbook],
  ['store screenshot capture checklist', readinessReport],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
].forEach(([expected, content]) => requireIncludes(content, expected, 'pushed launch evidence'));

if (
  packageJson.scripts?.['release:submit:check'] !== 'node scripts/verify-ryvro-submit-readiness.js'
) {
  addError('package.json must expose release:submit:check');
}

requireMatches(
  releaseTasks,
  /\|\s*0b\s*\|[\s\S]*formal trademark\/legal clearance[\s\S]*👤 Todo/,
  'release task 0b'
);
requireMatches(
  releaseTasks,
  /\|\s*20\s*\|[\s\S]*requires `eas login` \+ real production `\.env` values/,
  'release task 20'
);
requireMatches(
  releaseTasks,
  /\|\s*21\s*\|[\s\S]*signing\/provisioning not configured yet/,
  'release task 21'
);
requireMatches(releaseTasks, /\|\s*22\s*\|[\s\S]*EAS build pending login/, 'release task 22');

const unsafeCompletionPattern =
  /(app is live|ready for production submission|all launch blockers are complete)/i;
requireNotMatches(readinessReport, unsafeCompletionPattern, 'readiness report');
requireNotMatches(ownerRunbook, unsafeCompletionPattern, 'owner runbook');
requireNotMatches(readme, unsafeCompletionPattern, 'README release snapshot');
requireNotMatches(deploymentPlan, unsafeCompletionPattern, 'minimum viable deployment plan');

if (errors.length > 0) {
  console.error('Ryvro owner handoff check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Ryvro owner handoff check passed');
