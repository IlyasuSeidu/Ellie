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
const clearanceDomainSocialHandoff = read('docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md');
const submitBlockerTriage = read('docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md');
const appStoreTestFlightHandoff = read('docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md');
const firebaseOauthBackendHandoff = read('docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md');
const revenueCatProductsHandoff = read('docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md');
const playInternalTestingHandoff = read('docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md');
const launchEvidenceLog = read('docs/RYVRO_LAUNCH_EVIDENCE_LOG.md');
const screenshotChecklist = read('docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md');
const deviceQaTemplate = read('docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md');
const launchReadme = read('web/launch/README.md');
const launchHome = read('web/launch/index.html');
const launchPrivacy = read('web/launch/privacy/index.html');
const launchTerms = read('web/launch/terms/index.html');
const launchSupport = read('web/launch/support/index.html');
const launchDeletion = read('web/launch/delete-account/index.html');
const launchAuthAction = read('web/launch/auth/action/index.html');
const launchAuthActionHandler = read('web/launch/auth/action/handler.js');

[
  ['formal trademark/legal clearance', releaseTasks],
  ['App Store Connect app name `Ryvro Shift Planner`', releaseTasks],
  ['Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`', releaseTasks],
  ['getryvro.com', releaseTasks],
  ['Reserve social handles directly while logged in', releaseTasks],
  ['Create RevenueCat project', releaseTasks],
  ['RevenueCat app `Ryvro (Play Store)` exists as `appab0f4b628d`', releaseTasks],
  ['RevenueCat → Entitlements → Add entitlement: ID = `pro`', releaseTasks],
  ['ryvro_pro_monthly', releaseTasks],
  ['ryvro_pro_annual', releaseTasks],
  ['Enroll Apple Developer account', releaseTasks],
  ['Run `eas login` then `eas init`', releaseTasks],
  ['Run `npm run release:env:push`', releaseTasks],
  ['npm run release:env:files', releaseTasks],
  ['npm run release:submit:check', releaseTasks],
  ['Build production iOS binary', releaseTasks],
  ['Build production Android AAB', releaseTasks],
  ['not live in the App Store or Google Play yet', readme],
  ['npm run release:owner:check', readme],
  ['owner handoff preflight', readme],
  ['TestFlight build `4` iPhone smoke test', readme],
  ['npm run release:owner:check', deploymentPlan],
  ['owner handoff preflight', deploymentPlan],
  ['RevenueCat `pro` entitlement', deploymentPlan],
  ['Manual smoke tests pass on 2 physical devices', deploymentPlan],
  [
    'Remaining App Store Connect and Play Console metadata, review forms, screenshots, subscription-product declarations',
    deploymentPlan,
  ],
  ['Physical iOS and Android smoke tests', ownerRunbook],
  ['Store screenshots, app privacy, data safety, content rating', ownerRunbook],
  ['npm run release:submit:check', ownerRunbook],
  ['Production `ryvroBrain` and `parseShiftScheduleDescription` endpoints', ownerRunbook],
  ['SHIFT_SCHEDULE_PARSER_URL', ownerRunbook],
  ['SHIFT_SCHEDULE_PARSER_URL', externalSetup],
  ['parseShiftScheduleDescription', externalSetup],
  ['static launch pages in `web/launch`', externalSetup],
  ['repo static launch pages in `web/launch`', ownerRunbook],
  [
    'Static HTML launch pages now live in `web/launch` and are published at `https://getryvro.com`',
    privacySupport,
  ],
  ['Static launch pages now exist in `web/launch`', readinessReport],
  ['owner legal/content review', readinessReport],
  ['support mailbox delivery proof', readinessReport],
  ['static launch legal/support pages', releaseTasks],
  ['root-level Firebase native service files', ownerRunbook],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', externalSetup],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md', ownerRunbook],
  ['submit blocker triage', releaseTasks],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', externalSetup],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', externalSetup],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', launchEvidenceLog],
  ['Production env preflight', launchEvidenceLog],
  ['EAS production environment push', launchEvidenceLog],
  ['local `.env` that will be pushed to EAS passes', launchEvidenceLog],
  ['APP_ENV=production', launchEvidenceLog],
  ['b306643e-1688-448e-8acd-f72bf74312c3', launchEvidenceLog],
  [
    'root service-file paths `./GoogleService-Info.plist` and `./google-services.json`',
    launchEvidenceLog,
  ],
  ['GOOGLE_SERVICES_PLIST', externalSetup],
  ['GOOGLE_SERVICES_JSON', externalSetup],
  ['GOOGLE_SERVICES_PLIST', firebaseOauthBackendHandoff],
  ['GOOGLE_SERVICES_JSON', firebaseOauthBackendHandoff],
  ['npm run release:env:files', firebaseOauthBackendHandoff],
  ['mirrored native and Expo public Google OAuth IDs', launchEvidenceLog],
  ['mirrored native and Expo public RevenueCat SDK keys', launchEvidenceLog],
  ['rejection of retired Ellie or ShiftSync IDs', launchEvidenceLog],
  ['variable names updated, visibility classes', launchEvidenceLog],
  ['Do not record API keys, SDK key values', launchEvidenceLog],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', externalSetup],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', ownerRunbook],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', externalSetup],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', launchEvidenceLog],
  ['Google Play service account', launchEvidenceLog],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', storeListing],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', launchEvidenceLog],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', launchEvidenceLog],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', screenshotChecklist],
  ['npm run release:submit:check', launchEvidenceLog],
  ['npm run release:versions:get', ownerRunbook],
  ['eas build:version:set --platform ios --profile production', ownerRunbook],
  ['eas build:version:set --platform android --profile production', ownerRunbook],
  [
    'Upload historical iOS build number `2` to App Store Connect / TestFlight for internal testing; do not use it as final production-auth-ready evidence',
    deploymentPlan,
  ],
  ['Production EAS builds now use `autoIncrement: true`', deploymentPlan],
  ['601af1ee-5192-442f-9caa-deef5b9b6120', deploymentPlan],
  [
    'current production-auth-ready EAS build `601af1ee-5192-442f-9caa-deef5b9b6120` uses iOS build number `4`',
    submitBlockerTriage,
  ],
  ['iOS production build `601af1ee-5192-442f-9caa-deef5b9b6120` finished', submitBlockerTriage],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', releaseTasks],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', ownerRunbook],
  ['Firebase project `ryvro-shift-planner`, iOS app, Android app', readinessReport],
  ['real root-level Firebase native service files', readinessReport],
  [
    'deployed `ryvroBrain`, deployed `parseShiftScheduleDescription`, and backend smoke tests',
    readinessReport,
  ],
  [
    'The remaining Firebase blocker is email-template evidence, not project, backend, production environment, or EAS environment setup.',
    readinessReport,
  ],
].forEach(([expected, content]) => requireIncludes(content, expected, 'owner launch handoff'));

[
  ['docs/RYVRO_RELEASE_READINESS_REPORT.md', ownerRunbook],
  ['docs/RYVRO_EXTERNAL_SERVICE_SETUP.md', ownerRunbook],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md', ownerRunbook],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', ownerRunbook],
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
  ['https://getryvro.com/privacy', launchReadme],
  ['https://getryvro.com/terms', launchReadme],
  ['https://getryvro.com/support', launchReadme],
  ['https://getryvro.com/delete-account', launchReadme],
  ['https://getryvro.com/auth/action', launchReadme],
  ['Sender name: Ryvro Support', privacySupport],
  ['Reply-to email: support@getryvro.com', privacySupport],
  ['Public action domain: getryvro.com', privacySupport],
  ['Custom action URL: https://getryvro.com/auth/action/', privacySupport],
  ['Custom action URL: https://getryvro.com/auth/action/', externalSetup],
  ['web/launch/auth/action/index.html', privacySupport],
  ['web/launch/auth/action/handler.js', privacySupport],
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
  ['metadata readback proves the callback URI persists', launchEvidenceLog],
  ['owner records an approved fallback that keeps Firebase', launchEvidenceLog],
  ['end-to-end email verification plus password reset smoke results', launchEvidenceLog],
  ['Do not mark passed from console save toasts alone', launchEvidenceLog],
  ['Backend deploy - ryvroBrain', launchEvidenceLog],
  ['Backend smoke - ryvroBrain', launchEvidenceLog],
  ['Backend deploy - parser', launchEvidenceLog],
  ['Shift parser smoke', launchEvidenceLog],
  ['stored as Firebase Secret Manager `OPENAI_API_KEY` version `1`', launchEvidenceLog],
  ['roles/run.invoker', launchEvidenceLog],
  [
    'targeted redeploys of `functions:ryvro-brain:parseShiftScheduleDescription` succeeded',
    launchEvidenceLog,
  ],
  ['HTTP `200` with `status` `draft`', launchEvidenceLog],
  ['an 8-item 2 days, 2 nights, 4 off schedule', launchEvidenceLog],
  ['schedule name `2-week roster`', launchEvidenceLog],
  ['## RevenueCat And Store Products', launchEvidenceLog],
  ['App Store Connect in-app purchase key', launchEvidenceLog],
  ['RevenueCat SDK keys', launchEvidenceLog],
  ['Entitlement ID `pro`, display name `Ryvro Pro`', launchEvidenceLog],
  ['`ryvro_pro_monthly` and `ryvro_pro_annual`', launchEvidenceLog],
  ['validated store product status', launchEvidenceLog],
  ['RevenueCat logged-in browser recheck on 2026-06-14', launchEvidenceLog],
  ['Store product validation', launchEvidenceLog],
  ['package `$rc_annual` / Annual access', launchEvidenceLog],
  ['paywall screenshot metadata if required', launchEvidenceLog],
  ['active for the testing track', launchEvidenceLog],
  ['Store pricing, trial metadata', launchEvidenceLog],
  ['Do not mark passed from web dashboards, RevenueCat Test Store', launchEvidenceLog],
  ['offering/package tested, paywall metadata shown', launchEvidenceLog],
  ['## Legal, Support, And Store Forms', launchEvidenceLog],
  ['web/launch/privacy/index.html', launchEvidenceLog],
  ['web/launch/terms/index.html', launchEvidenceLog],
  ['web/launch/support/index.html', launchEvidenceLog],
  ['web/launch/delete-account/index.html', launchEvidenceLog],
  ['web/launch/auth/action/index.html', launchEvidenceLog],
  ['web/launch/auth/action/handler.js', launchEvidenceLog],
  ['https://getryvro.com/auth/action/', launchEvidenceLog],
  ['Live `https://getryvro.com/delete-account` URL', launchEvidenceLog],
  ['owner legal/content review confirms the live policy matches', launchEvidenceLog],
  ['Firebase Auth, Firestore, Firebase Hosting, Cloud Functions', launchEvidenceLog],
  ['calendar import/export, reminders, and subscription behavior', launchEvidenceLog],
  ['owner legal/content review confirms the live terms match', launchEvidenceLog],
  ['subscription terms, trial behavior, cancellation/renewal wording', launchEvidenceLog],
  ['not-for-safety-critical-decisions warning', launchEvidenceLog],
  ['Record only the approval note, reviewer name or role, review date', launchEvidenceLog],
  ['Google Play Data safety form', launchEvidenceLog],
  ['docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md', launchEvidenceLog],
  [
    'completed and saved the Data safety declaration for Play app ID `4974146267407561805`',
    launchEvidenceLog,
  ],
  ['Voice audio was marked as ephemeral collection', launchEvidenceLog],
  ['The preview showed Data shared and Data collected sections', launchEvidenceLog],
  ['Content rating and export compliance', launchEvidenceLog],
  ['completed the Play App content declarations', launchEvidenceLog],
  ['Target audience was saved as `18 and over`', launchEvidenceLog],
  ['Brazil `14+`, ESRB `Everyone`, PEGI `3`', launchEvidenceLog],
  ['working-adult productivity app with subscriptions', launchEvidenceLog],
  ['AI-assisted schedule drafting', launchEvidenceLog],
  ['no child-directed audience, no gambling, no dating', launchEvidenceLog],
  ['standard HTTPS/TLS encryption only', launchEvidenceLog],
  ['Record only non-secret completion notes or console status references', launchEvidenceLog],
  ['EU trader status', launchEvidenceLog],
  ['selected trader or non-trader path', launchEvidenceLog],
  ['EU storefront scope', launchEvidenceLog],
  ['public contact details reviewed note', launchEvidenceLog],
  ['owner-approved reason and storefront scope', launchEvidenceLog],
  ['Do not record personal addresses, tax identifiers', launchEvidenceLog],
  ['Reviewer account', launchEvidenceLog],
  ['reviewer-access fields', launchEvidenceLog],
  ['production-auth-ready build', launchEvidenceLog],
  ['completes onboarding with a non-mining sample schedule', launchEvidenceLog],
  ['reaches the dashboard/calendar', launchEvidenceLog],
  ['sandbox purchase or restore path', launchEvidenceLog],
  ['do not record the password, one-time email links', launchEvidenceLog],
  ['## Production Builds And Device QA', launchEvidenceLog],
  ['TestFlight iPhone QA', launchEvidenceLog],
  ['Physical Android QA', launchEvidenceLog],
  ['real physical Android 10 / SDK 29 or newer phone or tablet', launchEvidenceLog],
  ['not an emulator', launchEvidenceLog],
  ['package proof for `com.ryvro.shiftplanner`', launchEvidenceLog],
  ['Play internal release ID or opt-in link', launchEvidenceLog],
  ['RevenueCat sandbox purchase and restore result', launchEvidenceLog],
  ['Do not mark this row `Passed` from an Android emulator', launchEvidenceLog],
  ['Store submission', launchEvidenceLog],
  ['exact commit being submitted', launchEvidenceLog],
  ['GitHub CI is green for that commit', launchEvidenceLog],
  ['App Store submission ID or dashboard note', launchEvidenceLog],
  ['Google Play release ID, track name, track status', launchEvidenceLog],
  ['rollout percentage or internal-only note', launchEvidenceLog],
  ['owner approval note', launchEvidenceLog],
  ['Do not mark this row `Passed` from a draft console form', launchEvidenceLog],
  ['Pending owner evidence', launchEvidenceLog],
].forEach(([expected, content]) => requireIncludes(content, expected, 'launch evidence log'));

[
  ['# Ryvro Clearance, Domain, And Social Handoff', clearanceDomainSocialHandoff],
  ['Formal trademark/legal clearance', clearanceDomainSocialHandoff],
  ['Brand: `Ryvro`', clearanceDomainSocialHandoff],
  ['App Store name: `Ryvro Shift Planner`', clearanceDomainSocialHandoff],
  ['Google Play title: `Ryvro Shift Planner`', clearanceDomainSocialHandoff],
  ['Preferred domain: `getryvro.com`', clearanceDomainSocialHandoff],
  ['Privacy policy URL: `https://getryvro.com/privacy`', clearanceDomainSocialHandoff],
  ['Terms URL: `https://getryvro.com/terms`', clearanceDomainSocialHandoff],
  ['Support URL: `https://getryvro.com/support`', clearanceDomainSocialHandoff],
  ['Account deletion URL: `https://getryvro.com/delete-account`', clearanceDomainSocialHandoff],
  ['Support email: `support@getryvro.com`', clearanceDomainSocialHandoff],
  ['Preferred social handle: `@ryvro`', clearanceDomainSocialHandoff],
  ['Fallback social handles: `@getryvro`, `@tryryvro`', clearanceDomainSocialHandoff],
  ['2026-06-06T13:11:48.530Z', clearanceDomainSocialHandoff],
  ['no exact `Ryvro` or `Ryvro Shift Planner` app result', clearanceDomainSocialHandoff],
  ['visible fuzzy names were `Rydoo` and `Rydora`', clearanceDomainSocialHandoff],
  ['USPTO Trademark Search app was reachable with status `200`', clearanceDomainSocialHandoff],
  ['`getryvro.com` had no public DNS records', clearanceDomainSocialHandoff],
  ['`ryvro.com` is already registered through GoDaddy/Afternic', clearanceDomainSocialHandoff],
  [
    'X, Instagram, and TikTok `@ryvro` returned public `200` responses',
    clearanceDomainSocialHandoff,
  ],
  [
    'YouTube `@ryvro` and LinkedIn `company/ryvro` returned public `404` responses',
    clearanceDomainSocialHandoff,
  ],
  ['Spaceship showed `getryvro.com` as available', clearanceDomainSocialHandoff],
  ['visible total `$9.08`', clearanceDomainSocialHandoff],
  ['Domain Reservation And DNS', clearanceDomainSocialHandoff],
  ['Static Launch Pages', clearanceDomainSocialHandoff],
  ['Social Handle Reservation', clearanceDomainSocialHandoff],
  ['Do not store registrar passwords', clearanceDomainSocialHandoff],
].forEach(([expected, content]) =>
  requireIncludes(content, expected, 'clearance domain social handoff')
);

[
  ['# Ryvro Submit Blocker Triage', submitBlockerTriage],
  ['Current Submit Gate', submitBlockerTriage],
  ['Recommended Order', submitBlockerTriage],
  [
    'local ignored `./google-play-key.json` is present before Android EAS submit',
    submitBlockerTriage,
  ],
  ['Formal trademark/legal clearance for `Ryvro`', submitBlockerTriage],
  ['Finish Google Play Internal Testing And Merchant Setup', submitBlockerTriage],
  ['Google Payments merchant account', submitBlockerTriage],
  ['at least 12 opted-in testers', submitBlockerTriage],
  ['at least 14 days of closed testing', submitBlockerTriage],
  ['Finish Firebase Email Templates And Production Env', submitBlockerTriage],
  ['backend provider smoke tests have passed', submitBlockerTriage],
  ['Finish RevenueCat And Store Products', submitBlockerTriage],
  ['Rebuild, Test, Screenshot, Then Submit', submitBlockerTriage],
  ['scans the owner evidence packet for high-risk secret material', submitBlockerTriage],
  ['rotate the exposed key in the owning console', submitBlockerTriage],
  ['Only mark a row in `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` as `Passed`', submitBlockerTriage],
].forEach(([expected, content]) => requireIncludes(content, expected, 'submit blocker triage'));

[
  ['# Ryvro Device QA Evidence Template', deviceQaTemplate],
  ['TestFlight iPhone QA', deviceQaTemplate],
  ['Physical Android QA', deviceQaTemplate],
  ['Sandbox purchase QA', deviceQaTemplate],
  ['Installed bundle/package proof', deviceQaTemplate],
  ['Must-Pass Smoke Matrix', deviceQaTemplate],
  ['Fresh install from TestFlight or Play/internal store channel', deviceQaTemplate],
  ['reviewer@getryvro.com', deviceQaTemplate],
  ['Google Sign-In', deviceQaTemplate],
  ['Apple Sign-In', deviceQaTemplate],
  ['RevenueCat entitlement `pro` becomes active', deviceQaTemplate],
  ['Pending-sync status appears and clears after reconnect', deviceQaTemplate],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', deviceQaTemplate],
  ['Failure Record', deviceQaTemplate],
  ['Do not record passwords, private keys', deviceQaTemplate],
].forEach(([expected, content]) => requireIncludes(content, expected, 'device QA template'));

[
  ['# Ryvro App Store Connect And TestFlight Handoff', appStoreTestFlightHandoff],
  ['App name: `Ryvro Shift Planner`', appStoreTestFlightHandoff],
  ['Native display name: `Ryvro`', appStoreTestFlightHandoff],
  ['Bundle ID: `com.ryvro.shiftplanner`', appStoreTestFlightHandoff],
  ['SKU: `ryvro-shift-001`', appStoreTestFlightHandoff],
  ['Apple app ID / ASC app ID: `6776994726`', appStoreTestFlightHandoff],
  ['Owner Apple ID email: `seiduilyasu94@gmail.com`', appStoreTestFlightHandoff],
  ['Apple Team ID: `BZ798WZJCB`', appStoreTestFlightHandoff],
  ['First iOS release version: `1.0.0`', appStoreTestFlightHandoff],
  ['First iOS build number: `1`', appStoreTestFlightHandoff],
  ['EAS submit command: `eas submit --platform ios --latest`', appStoreTestFlightHandoff],
  ['Reviewer account email: `reviewer@getryvro.com`', appStoreTestFlightHandoff],
  ['production-auth-ready build', appStoreTestFlightHandoff],
  ['non-mining sample schedule', appStoreTestFlightHandoff],
  ['dashboard/calendar smoke result', appStoreTestFlightHandoff],
  ['paywall smoke result', appStoreTestFlightHandoff],
  ['sandbox purchase or restore result', appStoreTestFlightHandoff],
  ['EAS iOS production build `c99b0e0a-829c-4ab7-bd93-164586ade68a`', appStoreTestFlightHandoff],
  ['npm run release:versions:get', appStoreTestFlightHandoff],
  ['EAS remote version check', appStoreTestFlightHandoff],
  ['Historical EAS iOS production build-list evidence from 2026-06-05', appStoreTestFlightHandoff],
  ['782b6dec-1cf1-4cf2-9159-69ef1ab4078a', appStoreTestFlightHandoff],
  ['Do not submit build `782b6dec-1cf1-4cf2-9159-69ef1ab4078a` as-is', appStoreTestFlightHandoff],
  ['incremented iOS build number', appStoreTestFlightHandoff],
  ['build `4` is the current TestFlight candidate', appStoreTestFlightHandoff],
  ['EAS Submit `c17b593c-7909-42db-96f6-a81f095f7479`', appStoreTestFlightHandoff],
  [
    'TestFlight previously showed version `1.0.0`, build `1`, status `Ready to Submit`',
    appStoreTestFlightHandoff,
  ],
  ['71fde2ff-aa36-4741-aa69-e4f11ba30acd', appStoreTestFlightHandoff],
  ['final status `FINISHED`', appStoreTestFlightHandoff],
  ['BQG8N6UP7Y', appStoreTestFlightHandoff],
  ['b53825db-0f5c-4f56-b19e-c5af5f1999f3', appStoreTestFlightHandoff],
  ['cd86140b-6b5f-4707-9fa1-fde6beda10fa', appStoreTestFlightHandoff],
  ['Apple was processing the binary after upload', appStoreTestFlightHandoff],
  ['Internal TestFlight group `Ryvro iPhone QA`', appStoreTestFlightHandoff],
  [
    'Tester `seiduilyasu94@gmail.com` / `Ilyasu Seidu` is currently `Invited`',
    appStoreTestFlightHandoff,
  ],
  ['EU trader-status warning', appStoreTestFlightHandoff],
  ['Digital Services Act / EU trader status', appStoreTestFlightHandoff],
  ['public trader contact details are correct', appStoreTestFlightHandoff],
  ['EU trader status path selected, EU storefront scope', appStoreTestFlightHandoff],
  ['Do not record personal addresses, tax identifiers', appStoreTestFlightHandoff],
  ['local placeholder Firebase/OAuth URL schemes', appStoreTestFlightHandoff],
  ['App Store Connect App Record', appStoreTestFlightHandoff],
  ['TestFlight Internal Testing', appStoreTestFlightHandoff],
  ['App Store Privacy, Review Forms, And Reviewer Access', appStoreTestFlightHandoff],
  ['Subscription And In-App Purchase Review', appStoreTestFlightHandoff],
  ['EAS Submit And App Review', appStoreTestFlightHandoff],
  ['Production App Store Gate', appStoreTestFlightHandoff],
  ['npm run release:submit:check', appStoreTestFlightHandoff],
  ['exact commit being submitted', appStoreTestFlightHandoff],
  ['GitHub CI is green for that commit', appStoreTestFlightHandoff],
  ['Confirm TestFlight iPhone QA passed on the selected build', appStoreTestFlightHandoff],
  ['Exact commit SHA submitted', appStoreTestFlightHandoff],
  ['GitHub CI run URL and result for that commit', appStoreTestFlightHandoff],
  ['Owner approval note', appStoreTestFlightHandoff],
  ['Do not store Apple ID passwords', appStoreTestFlightHandoff],
].forEach(([expected, content]) =>
  requireIncludes(content, expected, 'App Store TestFlight handoff')
);

[
  ['# Ryvro Firebase, OAuth, And Backend Handoff', firebaseOauthBackendHandoff],
  ['Firebase project display name: `Ryvro` or `Ryvro Shift Planner`', firebaseOauthBackendHandoff],
  ['iOS bundle ID: `com.ryvro.shiftplanner`', firebaseOauthBackendHandoff],
  ['Android package name: `com.ryvro.shiftplanner`', firebaseOauthBackendHandoff],
  ['Public domain: `getryvro.com`', firebaseOauthBackendHandoff],
  ['Support reply-to: `support@getryvro.com`', firebaseOauthBackendHandoff],
  ['Voice function: `ryvroBrain`', firebaseOauthBackendHandoff],
  ['Parser function: `parseShiftScheduleDescription`', firebaseOauthBackendHandoff],
  ['firebase login --reauth', firebaseOauthBackendHandoff],
  ['firebase projects:list', firebaseOauthBackendHandoff],
  ['credentials are no longer valid', launchEvidenceLog],
  ['Firebase CLI wants to access your Google Account', firebaseOauthBackendHandoff],
  ['Firebase CLI wants to access your Google Account', launchEvidenceLog],
  ['administer Firebase data and settings', firebaseOauthBackendHandoff],
  ['see, edit, configure, and delete Google Cloud data', launchEvidenceLog],
  ['If Google Analytics terms or other legal terms appear', firebaseOauthBackendHandoff],
  ['Firebase native apps were created on 2026-06-05', firebaseOauthBackendHandoff],
  ['1:1002666052675:ios:bf72c1cc611308a76b98f6', firebaseOauthBackendHandoff],
  ['1:1002666052675:android:735fd0ef9443ddf76b98f6', firebaseOauthBackendHandoff],
  ['The fresh iOS file was downloaded as `GoogleService-Info.plist`', firebaseOauthBackendHandoff],
  ['The fresh Android file was downloaded as `google-services.json`', firebaseOauthBackendHandoff],
  ['Both files are placed at the repo root only', firebaseOauthBackendHandoff],
  ['Both files are ignored by Git', firebaseOauthBackendHandoff],
  ['Do not use tracked local placeholders under `config/firebase/`', firebaseOauthBackendHandoff],
  ['Web OAuth client', firebaseOauthBackendHandoff],
  [
    '1002666052675-p31u9msgqrtmg1sgcl1vv5mu5fijo98o.apps.googleusercontent.com',
    firebaseOauthBackendHandoff,
  ],
  [
    '1002666052675-qnj0l50lectmqq4g44alrvb0iuvaoh75.apps.googleusercontent.com',
    firebaseOauthBackendHandoff,
  ],
  [
    '1002666052675-le1ivq51bi0dv77pt24kvtir90qli2io.apps.googleusercontent.com',
    firebaseOauthBackendHandoff,
  ],
  [
    '1002666052675-94b6mo0a78vr4kjb8ql8rorpe9rrovch.apps.googleusercontent.com',
    firebaseOauthBackendHandoff,
  ],
  ['Web client secret was shown by Google Cloud but was not recorded', firebaseOauthBackendHandoff],
  [
    'Firebase Android app signing fingerprints were registered on 2026-06-06',
    firebaseOauthBackendHandoff,
  ],
  [
    'The current ignored root files were refreshed after OAuth client creation',
    firebaseOauthBackendHandoff,
  ],
  ['Android release signing SHA-1 and SHA-256 fingerprints', firebaseOauthBackendHandoff],
  ['Current state updated on 2026-06-06', firebaseOauthBackendHandoff],
  ['Firebase Secret Manager is reachable', firebaseOauthBackendHandoff],
  ['stored as Firebase Secret Manager `OPENAI_API_KEY` version `1`', firebaseOauthBackendHandoff],
  ['non-production placeholder Secret Manager value', firebaseOauthBackendHandoff],
  ['Firebase Auth authorized domain: `getryvro.com`', firebaseOauthBackendHandoff],
  ['Firebase Auth was enabled on 2026-06-06', firebaseOauthBackendHandoff],
  [
    'Metadata-only Identity Toolkit Admin API verification on 2026-06-06',
    firebaseOauthBackendHandoff,
  ],
  ['Firebase Auth email templates are still pending', firebaseOauthBackendHandoff],
  ['Required Firebase Auth sender name: `Ryvro Support`', firebaseOauthBackendHandoff],
  [
    'firebase deploy --only functions:ryvro-brain:ryvroBrain,functions:ryvro-brain:parseShiftScheduleDescription',
    firebaseOauthBackendHandoff,
  ],
  [
    'RYVRO_BRAIN_URL=https://us-central1-ryvro-shift-planner.cloudfunctions.net/ryvroBrain',
    firebaseOauthBackendHandoff,
  ],
  [
    'SHIFT_SCHEDULE_PARSER_URL=https://us-central1-ryvro-shift-planner.cloudfunctions.net/parseShiftScheduleDescription',
    firebaseOauthBackendHandoff,
  ],
  ['Do not configure `ellieBrain`', firebaseOauthBackendHandoff],
  [
    'parseShiftScheduleDescription`: must return `200` with a draft schedule',
    firebaseOauthBackendHandoff,
  ],
  [
    'Provider-backed parser calls now have launch-ready smoke coverage',
    firebaseOauthBackendHandoff,
  ],
  [
    'Final evidence must be either metadata readback proving `callbackUri` persists',
    firebaseOauthBackendHandoff,
  ],
  ['owner-approved first-release fallback', firebaseOauthBackendHandoff],
  ['end-to-end email verification plus password reset smoke results', firebaseOauthBackendHandoff],
  ['Do not mark passed from console save toasts alone', firebaseOauthBackendHandoff],
  ['HTTP `200` with `status` `draft`', firebaseOauthBackendHandoff],
  ['schedule name `2-week roster`', firebaseOauthBackendHandoff],
  ['npm run release:native:check', firebaseOauthBackendHandoff],
  ['npm run release:env:check', firebaseOauthBackendHandoff],
  ['npm run release:env:push', firebaseOauthBackendHandoff],
  ['local `.env` that will be pushed to EAS', firebaseOauthBackendHandoff],
  ['APP_ENV=production', firebaseOauthBackendHandoff],
  ['EAS project ID is `b306643e-1688-448e-8acd-f72bf74312c3`', firebaseOauthBackendHandoff],
  [
    'Root service-file paths are `./GoogleService-Info.plist` and `./google-services.json`',
    firebaseOauthBackendHandoff,
  ],
  ['Google OAuth native IDs match their Expo public mirrors', firebaseOauthBackendHandoff],
  [
    'RevenueCat iOS and Android SDK keys match their Expo public mirrors',
    firebaseOauthBackendHandoff,
  ],
  ['variable names updated, visibility classes', firebaseOauthBackendHandoff],
  ['Do not record Firebase API keys, RevenueCat SDK keys', firebaseOauthBackendHandoff],
  ['Do not store Firebase service-file contents', firebaseOauthBackendHandoff],
].forEach(([expected, content]) =>
  requireIncludes(content, expected, 'Firebase OAuth backend handoff')
);

[
  ['# Ryvro RevenueCat And Store Products Handoff', revenueCatProductsHandoff],
  ['Entitlement ID: `pro`', revenueCatProductsHandoff],
  ['Entitlement display name: `Ryvro Pro`', revenueCatProductsHandoff],
  ['Offering ID: `default`', revenueCatProductsHandoff],
  ['Monthly product ID: `ryvro_pro_monthly`', revenueCatProductsHandoff],
  ['Annual product ID: `ryvro_pro_annual`', revenueCatProductsHandoff],
  ['First-release requirement', revenueCatProductsHandoff],
  ['RevenueCat project: `Ryvro`', revenueCatProductsHandoff],
  ['REST API identifier `appab0f4b628d`', revenueCatProductsHandoff],
  ['App Store Connect Subscription Setup', revenueCatProductsHandoff],
  ['Google Play Subscription Setup', revenueCatProductsHandoff],
  ['Create entitlement ID `pro`', revenueCatProductsHandoff],
  ['Create offering ID `default`', revenueCatProductsHandoff],
  ['REVENUECAT_IOS_KEY=<real appl_ key>', revenueCatProductsHandoff],
  ['REVENUECAT_ANDROID_KEY=<real goog_ key>', revenueCatProductsHandoff],
  ['npm run release:env:check', revenueCatProductsHandoff],
  ['Sandbox Purchase QA', revenueCatProductsHandoff],
  ['RevenueCat entitlement `pro` becomes active', revenueCatProductsHandoff],
  ['Restore Purchases works', revenueCatProductsHandoff],
  ['not Test Store only', revenueCatProductsHandoff],
  [
    'RevenueCat is connected to real App Store Connect and Google Play products',
    revenueCatProductsHandoff,
  ],
  ['offering `default` has Monthly and Annual packages', revenueCatProductsHandoff],
  ['package identifiers, pricing metadata, and trial metadata', revenueCatProductsHandoff],
  [
    'entitlement ID `pro` mirrored into `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`',
    revenueCatProductsHandoff,
  ],
  ['Offering ID `default` and package identifier tested', revenueCatProductsHandoff],
  ['Paywall metadata shown to the tester', revenueCatProductsHandoff],
  ['Do not mark sandbox purchase QA as passed from web dashboards', revenueCatProductsHandoff],
  ['production-equivalent iOS and Android binaries', revenueCatProductsHandoff],
  ['Do not store RevenueCat SDK keys', revenueCatProductsHandoff],
].forEach(([expected, content]) => requireIncludes(content, expected, 'RevenueCat handoff'));

[
  ['# Ryvro Google Play Internal Testing Handoff', playInternalTestingHandoff],
  ['App name: `Ryvro Shift Planner`', playInternalTestingHandoff],
  ['Package name: `com.ryvro.shiftplanner`', playInternalTestingHandoff],
  ['First release track: Internal testing', playInternalTestingHandoff],
  ['EAS submit command: `eas submit --platform android --latest`', playInternalTestingHandoff],
  ['EAS submit service account key path: `./google-play-key.json`', playInternalTestingHandoff],
  ['Developer Account Enrollment', playInternalTestingHandoff],
  ['Your identity has been verified successfully', playInternalTestingHandoff],
  ['only the account owner can complete it', playInternalTestingHandoff],
  ['Google Play Console app on a real Android mobile device', playInternalTestingHandoff],
  ['Next owner action: finish the internal testing tester list', playInternalTestingHandoff],
  ['Google Payments merchant account', playInternalTestingHandoff],
  ['at least 12 opted-in testers', playInternalTestingHandoff],
  ['at least 14 days of closed testing', playInternalTestingHandoff],
  [
    'contact phone verification blocker is now recorded as owner-resolved',
    playInternalTestingHandoff,
  ],
  ['Service Account And API Access', playInternalTestingHandoff],
  [
    'Service account email: `ryvro-eas-submit@ryvro-shift-planner.iam.gserviceaccount.com`',
    playInternalTestingHandoff,
  ],
  ['Local ignored key path: `./google-play-key.json`', playInternalTestingHandoff],
  ['Do not paste the JSON contents anywhere', playInternalTestingHandoff],
  ['Internal Testing Track', playInternalTestingHandoff],
  ['Track: Internal testing', playInternalTestingHandoff],
  ['Physical Android QA', playInternalTestingHandoff],
  ['real physical Android 10 / SDK 29 or newer phone or tablet', playInternalTestingHandoff],
  ['Do not use an Android emulator', playInternalTestingHandoff],
  ['Android SDK level if the device reports it', playInternalTestingHandoff],
  ['Play internal release ID or opt-in link', playInternalTestingHandoff],
  ['Install source', playInternalTestingHandoff],
  ['Failed or retaken steps without passwords', playInternalTestingHandoff],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', playInternalTestingHandoff],
  ['Production Promotion Gate', playInternalTestingHandoff],
  ['exact commit being submitted', playInternalTestingHandoff],
  ['GitHub CI is green for that commit', playInternalTestingHandoff],
  [
    'real Google Play subscription products `ryvro_pro_monthly` and `ryvro_pro_annual` plus base plans are created after the merchant-account blocker clears',
    playInternalTestingHandoff,
  ],
  ['rollout percentage or internal-only note', playInternalTestingHandoff],
  ['policy warning, or rejected release note', playInternalTestingHandoff],
  ['npm run release:submit:check', playInternalTestingHandoff],
].forEach(([expected, content]) => requireIncludes(content, expected, 'Google Play handoff'));

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
  ['6.9 inch bucket', screenshotChecklist],
  ['13 inch bucket', screenshotChecklist],
  ['9:16', screenshotChecklist],
  ['JPEG or 24-bit PNG without alpha', screenshotChecklist],
  ['3840 px or less', screenshotChecklist],
  ['long side no more than twice the short side', screenshotChecklist],
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', screenshotChecklist],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', screenshotChecklist],
  ['Keep the screenshot files out of Git', screenshotChecklist],
].forEach(([expected, content]) => requireIncludes(content, expected, 'screenshot checklist'));

[
  ['Store screenshots', launchEvidenceLog],
  ['real native builds only', launchEvidenceLog],
  ['app-store-iphone-01-template-start.png', launchEvidenceLog],
  ['app-store-ipad-03-paywall.png', launchEvidenceLog],
  ['google-play-phone-02-dashboard-calendar.png', launchEvidenceLog],
  ['google-play-phone-03-paywall.png', launchEvidenceLog],
  ['device model, OS version, build number or versionCode', launchEvidenceLog],
  ['rejected or retaken frames', launchEvidenceLog],
  ['avoid private employer names, workplace names, personal notifications', launchEvidenceLog],
  ['price claims, ranking claims, testimonials', launchEvidenceLog],
  ['real user email addresses outside the reviewer account', launchEvidenceLog],
  ['ryvro_pro_monthly', launchEvidenceLog],
  ['ryvro_pro_annual', launchEvidenceLog],
  ['entitlement `pro`, offering `default`', launchEvidenceLog],
].forEach(([expected, content]) =>
  requireIncludes(content, expected, 'launch evidence screenshot row')
);

[
  ['Ryvro Shift Planner', launchHome],
  ['FIFO crews, healthcare teams, security staff', launchHome],
  ['It does not replace an employer roster', launchHome],
  ['AI builder prompts used to draft schedules', launchPrivacy],
  ['RevenueCat', launchPrivacy],
  ['https://getryvro.com/delete-account', launchPrivacy],
  ['Not For Safety-Critical Decisions', launchTerms],
  ['App Store, Google Play, and RevenueCat', launchTerms],
  ['Managing Ryvro Pro subscriptions and restore purchases', launchSupport],
  ['Ryvro account deletion request', launchDeletion],
  [
    'Account deletion does not automatically cancel App Store or Google Play subscriptions',
    launchDeletion,
  ],
  ['Ryvro Account Action', launchAuthAction],
  ['Checking your Ryvro link', launchAuthAction],
  ['reset-password-form', launchAuthAction],
  ['/__/firebase/8.10.1/firebase-app.js', launchAuthAction],
  ['/__/firebase/8.10.1/firebase-auth.js', launchAuthAction],
  ['/__/firebase/init.js', launchAuthAction],
  ['/auth/action/handler.js?v=20260606', launchAuthAction],
  ['new URLSearchParams(window.location.search)', launchAuthActionHandler],
  ["mode === 'resetPassword'", launchAuthActionHandler],
  ["mode === 'verifyEmail'", launchAuthActionHandler],
  ["mode === 'recoverEmail'", launchAuthActionHandler],
  ['verifyPasswordResetCode', launchAuthActionHandler],
  ['confirmPasswordReset', launchAuthActionHandler],
  ['applyActionCode', launchAuthActionHandler],
  ['checkActionCode', launchAuthActionHandler],
  ['continueUrl', launchAuthActionHandler],
].forEach(([expected, content]) => requireIncludes(content, expected, 'launch static pages'));

[launchHome, launchPrivacy, launchTerms, launchSupport, launchDeletion, launchAuthAction].forEach(
  (content) => {
    [
      'Ryvro',
      '/privacy/',
      '/terms/',
      '/support/',
      '/delete-account/',
      'support@getryvro.com',
    ].forEach((expected) => requireIncludes(content, expected, 'launch static page navigation'));
    requireNotMatches(
      content,
      /Ellie Shift Planner|ellie_pro|mine site|haul truck/i,
      'launch page'
    );
  }
);

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
  ['Recent recorded pushed PR gate', readme],
  ['Recent recorded pushed GitHub Actions check', readinessReport],
  ['Recent recorded pushed PR gate evidence', ownerRunbook],
  ['docs/RYVRO_SUBMIT_BLOCKER_TRIAGE.md', readme],
  ['store screenshot capture checklist', readinessReport],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
  ['Launch Landing Page Copy', storeListing],
  ['Social Profile Source Copy', storeListing],
  [
    'AI shift planner for FIFO, nights, rotating rosters, reminders, and calendar export.',
    storeListing,
  ],
].forEach(([expected, content]) => requireIncludes(content, expected, 'pushed launch evidence'));

if (
  packageJson.scripts?.['release:submit:check'] !== 'node scripts/verify-ryvro-submit-readiness.js'
) {
  addError('package.json must expose release:submit:check');
}

requireMatches(
  releaseTasks,
  /\|\s*0b\s*\|[\s\S]*formal trademark\/legal clearance[\s\S]*✅ Done[\s\S]*owner-approved search packet completed 2026-06-16/,
  'release task 0b'
);
requireMatches(
  releaseTasks,
  /\|\s*0f\s*\|[\s\S]*Reserve social handles directly while logged in[\s\S]*✅ Done[\s\S]*@getryvro[\s\S]*LinkedIn `Ryvro`/,
  'release task 0f'
);
requireMatches(
  releaseTasks,
  /\|\s*20\s*\|[\s\S]*npm run release:env:push -- --force[\s\S]*npm run release:env:files -- --force[\s\S]*passed on 2026-06-14/,
  'release task 20'
);
requireMatches(
  releaseTasks,
  /\|\s*21\s*\|[\s\S]*601af1ee-5192-442f-9caa-deef5b9b6120[\s\S]*build `4`[\s\S]*IPA inspection confirmed/,
  'release task 21'
);
requireMatches(
  releaseTasks,
  /\|\s*22\s*\|[\s\S]*versionCode `8`[\s\S]*com\.ryvro\.shiftplanner[\s\S]*cb58e3e5-a4c9-4935-af29-88065f7c3f28[\s\S]*internal track release `1\.0\.0`[\s\S]*status `completed`/,
  'release task 22'
);

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
