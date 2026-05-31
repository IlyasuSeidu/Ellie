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

function extractSection(content, heading) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(
    new RegExp(`(?:^|\\n)## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`)
  );
  return match?.[1]?.trim() || '';
}

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*/g, '')
    .trim();
}

function firstPlainLine(section) {
  return stripMarkdown(section)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)[0];
}

function characterCount(value) {
  return Array.from(value).length;
}

const storeListing = read('docs/RYVRO_STORE_LISTING.md');
const submissionDraft = read('docs/RYVRO_STORE_SUBMISSION_FORM_DRAFT.md');
const privacySupport = read('docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md');

const appStoreName = 'Ryvro Shift Planner';
const googlePlayName = 'Ryvro Shift Planner';
const googleShortDescription = firstPlainLine(
  extractSection(storeListing, 'Google Play Short Description')
);
const googleFullDescription = stripMarkdown(
  extractSection(storeListing, 'Google Play Full Description')
);
const appStoreSubtitle = firstPlainLine(extractSection(storeListing, 'App Store Subtitle'));
const appStoreDescription = stripMarkdown(extractSection(storeListing, 'App Store Description'));
const screenshotPlan = extractSection(storeListing, 'Submission Screenshot Capture Plan');

[
  ['App Store name: Ryvro Shift Planner', storeListing, 'store listing app identity'],
  ['Google Play app name: Ryvro Shift Planner', storeListing, 'store listing app identity'],
  ['Native display name: Ryvro', storeListing, 'store listing app identity'],
  ['Bundle ID: com.ryvro.shiftplanner', storeListing, 'store listing app identity'],
  ['Android package: com.ryvro.shiftplanner', storeListing, 'store listing app identity'],
  ['Reviewer account: reviewer@getryvro.com', submissionDraft, 'store submission draft'],
  ['Subscription entitlement: pro', submissionDraft, 'store submission draft'],
  ['Monthly product: ryvro_pro_monthly', submissionDraft, 'store submission draft'],
  ['Annual product: ryvro_pro_annual', submissionDraft, 'store submission draft'],
  ['Privacy policy URL: https://getryvro.com/privacy', submissionDraft, 'store submission draft'],
  ['Terms URL: https://getryvro.com/terms', submissionDraft, 'store submission draft'],
  ['Support URL: https://getryvro.com/support', submissionDraft, 'store submission draft'],
  ['Support email: `support@getryvro.com`', privacySupport, 'privacy/support templates'],
].forEach(([expected, content, label]) => requireIncludes(content, expected, label));

if (characterCount(appStoreName) > 30) {
  addError(
    `App Store app name is ${characterCount(appStoreName)} characters; keep it at or below 30`
  );
}

if (characterCount(googlePlayName) > 30) {
  addError(
    `Google Play app name is ${characterCount(googlePlayName)} characters; keep it at or below 30`
  );
}

if (!appStoreSubtitle || characterCount(appStoreSubtitle) > 30) {
  addError(
    `App Store subtitle must be present and at or below 30 characters; received ${characterCount(
      appStoreSubtitle || ''
    )}`
  );
}

if (!googleShortDescription || characterCount(googleShortDescription) > 80) {
  addError(
    `Google Play short description must be present and at or below 80 characters; received ${characterCount(
      googleShortDescription || ''
    )}`
  );
}

if (!googleFullDescription || characterCount(googleFullDescription) > 4000) {
  addError(
    `Google Play full description must be present and at or below 4000 characters; received ${characterCount(
      googleFullDescription || ''
    )}`
  );
}

if (!appStoreDescription) {
  addError('App Store description must be present');
}

[
  'App Store iPhone 6.7 inch: 3 screenshots at 1290 x 2796',
  'App Store iPad Pro 12.9 inch: 3 screenshots at 2048 x 2732',
  'Google Play phone: at least 2 screenshots at 1080 x 1920 or higher',
  'Ryvro Pro paywall screen showing the free-trial CTA and restore purchases link',
  'Capture from production, TestFlight, or Play internal builds only',
  'reviewer@getryvro.com',
  'Required capture matrix',
  'app-store-iphone-01-template-start.png',
  'google-play-phone-02-dashboard-calendar.png',
].forEach((expected) => requireIncludes(screenshotPlan, expected, 'store screenshot capture plan'));

const forbiddenClaims = [
  /best ever/i,
  /#1 shift app/i,
  /\bguaranteed\b/i,
  /anonymous testimonials/i,
  /replaces employer payroll/i,
  /replaces employer.*HR/i,
  /replaces employer.*rostering/i,
];

const publishableStoreCopy = [
  appStoreSubtitle,
  googleShortDescription,
  appStoreDescription,
  googleFullDescription,
  extractSection(storeListing, 'Promotional Text'),
  extractSection(storeListing, 'Screenshot Set'),
  screenshotPlan,
].join('\n');

forbiddenClaims.forEach((pattern) => {
  if (pattern.test(publishableStoreCopy)) {
    addError(`Publishable store copy contains forbidden claim pattern ${pattern}`);
  }
});

if (
  !/healthcare/i.test(storeListing) ||
  !/aviation/i.test(storeListing) ||
  !/rail/i.test(storeListing)
) {
  addError('Store listing must keep the launch audience broader than mining/FIFO');
}

if (!submissionDraft.includes('No, Ryvro does not use collected data to track users')) {
  addError('Store submission draft must explicitly answer App Store tracking status');
}

if (!submissionDraft.includes('Data is encrypted in transit: Yes')) {
  addError('Store submission draft must explicitly answer Google Play encryption status');
}

if (!submissionDraft.includes('In-app purchases: Yes, Ryvro Pro subscription')) {
  addError('Store submission draft must explicitly declare in-app purchases for content rating');
}

if (!submissionDraft.includes('Reviewer password: create a fresh strong password')) {
  addError('Store submission draft must avoid committing a reusable reviewer password');
}

if (errors.length > 0) {
  console.error('Ryvro store readiness check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Ryvro store readiness check passed');
