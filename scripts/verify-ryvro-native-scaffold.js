#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const strictGenerated = process.argv.includes('--strict-generated');
const strictGeneratedServices = process.argv.includes('--strict-generated-services');
const errors = [];
const warnings = [];

const retiredVisibleIdentityPattern =
  /(Ellie Shift Planner|Hey Ellie|EllieMinerShiftAssistant|com\.ellie|com\.ilyasuseidu\.ellie|MineShift|ShiftSync)/i;
const retiredFirebaseProjectPattern = /(ellie|shiftsync|mineshift)/i;

function readRequiredJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function readOptional(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
  } catch (_error) {
    return null;
  }
}

function addError(message) {
  errors.push(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    addError(`${label} must be ${expected}; received ${actual || '<missing>'}`);
  }
}

function assertAbsent(content, pattern, label) {
  if (content && pattern.test(content)) {
    addError(`${label} still contains retired Ellie-era identity`);
  }
}

function getDynamicExpoConfig() {
  const buildExpoConfig = require(path.join(root, 'app.config.js'));
  return buildExpoConfig({ config: {} });
}

const appJsonExpo = readRequiredJson('app.json').expo || {};
const dynamicExpo = getDynamicExpoConfig();

assertEqual(appJsonExpo.name, 'Ryvro Shift Planner', 'app.json expo.name');
assertEqual(appJsonExpo.slug, 'ryvro', 'app.json expo.slug');
assertEqual(appJsonExpo.scheme, 'ryvro', 'app.json expo.scheme');
assertEqual(appJsonExpo.icon, './assets/icon.png', 'app.json expo.icon');
assertEqual(appJsonExpo.splash?.image, './assets/splash-icon.png', 'app.json expo.splash.image');
assertEqual(
  appJsonExpo.ios?.bundleIdentifier,
  'com.ryvro.shiftplanner',
  'app.json ios.bundleIdentifier'
);
assertEqual(
  appJsonExpo.ios?.googleServicesFile,
  './ios/Ryvro/GoogleService-Info.plist',
  'app.json ios.googleServicesFile'
);
assertEqual(appJsonExpo.android?.package, 'com.ryvro.shiftplanner', 'app.json android.package');
assertEqual(
  appJsonExpo.android?.googleServicesFile,
  './android/app/google-services.json',
  'app.json android.googleServicesFile'
);
assertEqual(
  appJsonExpo.android?.adaptiveIcon?.foregroundImage,
  './assets/adaptive-icon.png',
  'app.json android.adaptiveIcon.foregroundImage'
);
assertEqual(appJsonExpo.web?.favicon, './assets/favicon.png', 'app.json web.favicon');

assertEqual(dynamicExpo.name, 'Ryvro Shift Planner', 'app.config.js name');
assertEqual(dynamicExpo.slug, 'ryvro', 'app.config.js slug');
assertEqual(dynamicExpo.scheme, 'ryvro', 'app.config.js scheme');
assertEqual(dynamicExpo.icon, './assets/icon.png', 'app.config.js icon');
assertEqual(dynamicExpo.splash?.image, './assets/splash-icon.png', 'app.config.js splash.image');
assertEqual(
  dynamicExpo.ios?.bundleIdentifier,
  'com.ryvro.shiftplanner',
  'app.config.js ios.bundleIdentifier'
);
assertEqual(
  dynamicExpo.android?.package,
  'com.ryvro.shiftplanner',
  'app.config.js android.package'
);
assertEqual(
  dynamicExpo.android?.adaptiveIcon?.foregroundImage,
  './assets/adaptive-icon.png',
  'app.config.js android.adaptiveIcon.foregroundImage'
);
assertEqual(dynamicExpo.web?.favicon, './assets/favicon.png', 'app.config.js web.favicon');

assertAbsent(readOptional('app.json'), retiredVisibleIdentityPattern, 'app.json');
assertAbsent(readOptional('app.config.js'), retiredVisibleIdentityPattern, 'app.config.js');

const generatedInfoPlist =
  readOptional('ios/Ryvro/Info.plist') || readOptional('ios/Ellie/Info.plist');
if (generatedInfoPlist) {
  if (!generatedInfoPlist.includes('<string>Ryvro</string>')) {
    addError('Generated iOS Info.plist must contain Ryvro as the visible app name');
  }
  assertAbsent(generatedInfoPlist, retiredVisibleIdentityPattern, 'Generated iOS Info.plist');
}

const generatedXcodeProject =
  readOptional('ios/Ryvro.xcodeproj/project.pbxproj') ||
  readOptional('ios/Ellie.xcodeproj/project.pbxproj');
if (generatedXcodeProject) {
  if (!generatedXcodeProject.includes('PRODUCT_BUNDLE_IDENTIFIER = com.ryvro.shiftplanner;')) {
    addError('Generated iOS Xcode project must build com.ryvro.shiftplanner');
  }
  if (!generatedXcodeProject.includes('PRODUCT_NAME = Ryvro;')) {
    addError('Generated iOS Xcode project must build product name Ryvro');
  }
  if (/TARGET_NAME = Ellie|PBXNativeTarget "Ellie"|name = Ellie;/.test(generatedXcodeProject)) {
    warnings.push(
      'Ignored generated iOS target/workspace still use Ellie internally; regenerate or rename native scaffolding before a final native archive if internal Xcode labels must be clean.'
    );
  }
}

const generatedIosGoogleService =
  readOptional('ios/Ryvro/GoogleService-Info.plist') ||
  readOptional('ios/Ellie/GoogleService-Info.plist');
if (generatedIosGoogleService) {
  if (!generatedIosGoogleService.includes('<string>com.ryvro.shiftplanner</string>')) {
    addError('Generated iOS GoogleService-Info.plist must target com.ryvro.shiftplanner');
  }
  if (retiredFirebaseProjectPattern.test(generatedIosGoogleService)) {
    const message =
      'Generated iOS GoogleService-Info.plist still appears to point at a retired Firebase project; replace it with fresh Ryvro Firebase config before production builds.';
    if (strictGeneratedServices) {
      addError(message);
    } else {
      warnings.push(message);
    }
  }
}

if (strictGenerated && warnings.length > 0) {
  warnings.forEach(addError);
}

if (errors.length > 0) {
  console.error('Ryvro native scaffold check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('Ryvro native scaffold warnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

console.log('Ryvro native scaffold check passed');
