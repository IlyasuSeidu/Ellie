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

[
  ['formal trademark/legal clearance', releaseTasks],
  ['App Store Connect app name `Ryvro Shift Planner`', releaseTasks],
  ['Google Play title `Ryvro Shift Planner` and package `com.ryvro.shiftplanner`', releaseTasks],
  ['getryvro.com', releaseTasks],
  ['Reserve social handles directly while logged in', releaseTasks],
  ['Create RevenueCat project', releaseTasks],
  ['Android app `Ryvro (Play Store)` exists as `appab0f4b628d`', releaseTasks],
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
  ['static launch pages in `web/launch`', externalSetup],
  ['repo static launch pages in `web/launch`', ownerRunbook],
  ['Static HTML launch-page drafts now live in `web/launch`', privacySupport],
  ['Static launch-page drafts now exist in `web/launch`', readinessReport],
  ['static launch legal/support pages', releaseTasks],
  ['root-level Firebase native service files', ownerRunbook],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', externalSetup],
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', externalSetup],
  ['docs/RYVRO_APP_STORE_TESTFLIGHT_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', externalSetup],
  ['docs/RYVRO_FIREBASE_OAUTH_BACKEND_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', externalSetup],
  ['docs/RYVRO_REVENUECAT_PRODUCTS_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', ownerRunbook],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', ownerRunbook],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', ownerRunbook],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', externalSetup],
  ['docs/RYVRO_GOOGLE_PLAY_INTERNAL_TESTING_HANDOFF.md', launchEvidenceLog],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', storeListing],
  ['docs/RYVRO_SCREENSHOT_CAPTURE_CHECKLIST.md', launchEvidenceLog],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', launchEvidenceLog],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', screenshotChecklist],
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
  ['docs/RYVRO_CLEARANCE_DOMAIN_SOCIAL_HANDOFF.md', ownerRunbook],
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
  ['web/launch/privacy/index.html', launchEvidenceLog],
  ['web/launch/terms/index.html', launchEvidenceLog],
  ['web/launch/support/index.html', launchEvidenceLog],
  ['web/launch/delete-account/index.html', launchEvidenceLog],
  ['Live `https://getryvro.com/delete-account` URL', launchEvidenceLog],
  ['## Production Builds And Device QA', launchEvidenceLog],
  ['TestFlight iPhone QA', launchEvidenceLog],
  ['Physical Android QA', launchEvidenceLog],
  ['Store submission', launchEvidenceLog],
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
  ['2026-06-05T13:31:53.172Z', clearanceDomainSocialHandoff],
  ['no exact `Ryvro` or `Ryvro Shift Planner` app result', clearanceDomainSocialHandoff],
  [
    'visible fuzzy names were `Rydoo`, `Rydora`, `Ryver`, and `Ryver LLC`',
    clearanceDomainSocialHandoff,
  ],
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
  ['Domain Reservation And DNS', clearanceDomainSocialHandoff],
  ['Static Launch Pages', clearanceDomainSocialHandoff],
  ['Social Handle Reservation', clearanceDomainSocialHandoff],
  ['Do not store registrar passwords', clearanceDomainSocialHandoff],
].forEach(([expected, content]) =>
  requireIncludes(content, expected, 'clearance domain social handoff')
);

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
  ['EAS iOS production build `c99b0e0a-829c-4ab7-bd93-164586ade68a`', appStoreTestFlightHandoff],
  ['EAS Submit `c17b593c-7909-42db-96f6-a81f095f7479`', appStoreTestFlightHandoff],
  [
    'TestFlight shows version `1.0.0`, build `1`, status `Ready to Submit`',
    appStoreTestFlightHandoff,
  ],
  ['Internal TestFlight group `Ryvro iPhone QA`', appStoreTestFlightHandoff],
  [
    'Tester `seiduilyasu94@gmail.com` / `Ilyasu Seidu` is currently `Invited`',
    appStoreTestFlightHandoff,
  ],
  ['EU trader-status warning', appStoreTestFlightHandoff],
  ['local placeholder Firebase/OAuth URL schemes', appStoreTestFlightHandoff],
  ['App Store Connect App Record', appStoreTestFlightHandoff],
  ['TestFlight Internal Testing', appStoreTestFlightHandoff],
  ['App Store Privacy, Review Forms, And Reviewer Access', appStoreTestFlightHandoff],
  ['Subscription And In-App Purchase Review', appStoreTestFlightHandoff],
  ['EAS Submit And App Review', appStoreTestFlightHandoff],
  ['Production App Store Gate', appStoreTestFlightHandoff],
  ['npm run release:submit:check', appStoreTestFlightHandoff],
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
  ['If Google Analytics terms or other legal terms appear', firebaseOauthBackendHandoff],
  ['Download the fresh iOS file as `GoogleService-Info.plist`', firebaseOauthBackendHandoff],
  ['Download the fresh Android file as `google-services.json`', firebaseOauthBackendHandoff],
  ['Place both files at the repo root only', firebaseOauthBackendHandoff],
  ['Do not use tracked local placeholders under `config/firebase/`', firebaseOauthBackendHandoff],
  ['Web OAuth client', firebaseOauthBackendHandoff],
  ['Android release signing SHA-1 and SHA-256 fingerprints', firebaseOauthBackendHandoff],
  ['Firebase Auth authorized domain: `getryvro.com`', firebaseOauthBackendHandoff],
  ['Firebase Auth sender name: `Ryvro Support`', firebaseOauthBackendHandoff],
  ['firebase deploy --only functions', firebaseOauthBackendHandoff],
  [
    'RYVRO_BRAIN_URL=https://<region>-<project-id>.cloudfunctions.net/ryvroBrain',
    firebaseOauthBackendHandoff,
  ],
  [
    'SHIFT_SCHEDULE_PARSER_URL=https://<region>-<project-id>.cloudfunctions.net/parseShiftScheduleDescription',
    firebaseOauthBackendHandoff,
  ],
  ['Do not configure `ellieBrain`', firebaseOauthBackendHandoff],
  [
    'parseShiftScheduleDescription`: must return `200` with a draft schedule',
    firebaseOauthBackendHandoff,
  ],
  ['npm run release:native:check', firebaseOauthBackendHandoff],
  ['npm run release:env:check', firebaseOauthBackendHandoff],
  ['eas secret:push --scope project --env-file .env', firebaseOauthBackendHandoff],
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
  ['Service Account And API Access', playInternalTestingHandoff],
  ['least-privilege Google Play service account', playInternalTestingHandoff],
  ['Save the downloaded JSON key locally as `google-play-key.json`', playInternalTestingHandoff],
  ['Do not paste the JSON contents anywhere', playInternalTestingHandoff],
  ['Internal Testing Track', playInternalTestingHandoff],
  ['Track: Internal testing', playInternalTestingHandoff],
  ['Physical Android QA', playInternalTestingHandoff],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', playInternalTestingHandoff],
  ['Production Promotion Gate', playInternalTestingHandoff],
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
  ['docs/RYVRO_LAUNCH_EVIDENCE_LOG.md', screenshotChecklist],
  ['docs/RYVRO_DEVICE_QA_EVIDENCE_TEMPLATE.md', screenshotChecklist],
  ['Keep the screenshot files out of Git', screenshotChecklist],
].forEach(([expected, content]) => requireIncludes(content, expected, 'screenshot checklist'));

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
].forEach(([expected, content]) => requireIncludes(content, expected, 'launch static pages'));

[launchHome, launchPrivacy, launchTerms, launchSupport, launchDeletion].forEach((content) => {
  [
    'Ryvro',
    '/privacy/',
    '/terms/',
    '/support/',
    '/delete-account/',
    'support@getryvro.com',
  ].forEach((expected) => requireIncludes(content, expected, 'launch static page navigation'));
  requireNotMatches(content, /Ellie Shift Planner|ellie_pro|mine site|haul truck/i, 'launch page');
});

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
  ['CI run `27014539880`', readme],
  ['commit `8b277ee`', readme],
  ['CI run `27014539880`', readinessReport],
  ['commit `8b277ee`', readinessReport],
  ['CI run `27014539880`', ownerRunbook],
  ['commit `8b277ee`', ownerRunbook],
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
  /\|\s*21\s*\|[\s\S]*c99b0e0a-829c-4ab7-bd93-164586ade68a[\s\S]*real Firebase\/OAuth\/RevenueCat env evidence/,
  'release task 21'
);
requireMatches(
  releaseTasks,
  /\|\s*22\s*\|[\s\S]*318b4e8f-b344-4ed9-8bcd-a5805093339d[\s\S]*com\.ryvro\.shiftplanner/,
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
