#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const strictGenerated = process.argv.includes('--strict-generated');
const strictGeneratedServices = process.argv.includes('--strict-generated-services');
const isCi = process.env.CI === 'true';
const errors = [];
const warnings = [];

const retiredVisibleIdentityPattern =
  /(Ellie Shift Planner|Hey Ellie|EllieMinerShiftAssistant|com\.ellie|com\.ilyasuseidu\.ellie|MineShift|ShiftSync)/i;
const retiredFirebaseProjectPattern = /(ellie|shiftsync|mineshift)/i;
const iosFirebaseAppIdPattern = /^1:\d+:ios:[a-f0-9]+$/i;

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

function readOptionalJson(relativePath) {
  const content = readOptional(relativePath);
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (_error) {
    addError(`${relativePath} must be valid JSON`);
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

function getPlistStringValue(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content?.match(new RegExp(`<key>${escapedKey}</key>\\s*<string>([^<]*)</string>`));

  return match?.[1] ?? '';
}

function validateIosGoogleService(content, label) {
  if (!content) {
    addError(`${label} is missing`);
    return;
  }

  const bundleId = getPlistStringValue(content, 'BUNDLE_ID');
  const projectId = getPlistStringValue(content, 'PROJECT_ID');
  const appId = getPlistStringValue(content, 'GOOGLE_APP_ID');
  const senderId = getPlistStringValue(content, 'GCM_SENDER_ID');

  assertEqual(bundleId, 'com.ryvro.shiftplanner', `${label} BUNDLE_ID`);

  if (!projectId || /placeholder|local/i.test(projectId)) {
    addError(
      `${label} PROJECT_ID must be a real Firebase project; received ${projectId || '<missing>'}`
    );
  }

  if (retiredFirebaseProjectPattern.test(projectId)) {
    addError(`${label} PROJECT_ID still points at a retired Firebase project: ${projectId}`);
  }

  if (
    !iosFirebaseAppIdPattern.test(appId) ||
    appId.includes('000000000000') ||
    /placeholder|local/i.test(appId)
  ) {
    addError(
      `${label} GOOGLE_APP_ID must be a real iOS Firebase app id; received ${appId || '<missing>'}`
    );
  }

  if (!/^\d+$/.test(senderId) || senderId === '000000000000') {
    addError(
      `${label} GCM_SENDER_ID must be a real numeric sender id; received ${senderId || '<missing>'}`
    );
  }
}

function validateRootIosGoogleService(content) {
  const label = 'Root iOS GoogleService-Info.plist';

  if (!content && isCi) {
    warnings.push(
      `${label} is ignored and unavailable in CI; release:env:check validates the real production service file before store builds.`
    );
    return;
  }

  validateIosGoogleService(content, label);
}

function validateTrackedIosLocalGoogleService(content) {
  const label = 'Tracked iOS GoogleService-Info.local.plist';

  if (!content) {
    addError(`${label} is missing`);
    return;
  }

  const bundleId = getPlistStringValue(content, 'BUNDLE_ID');
  const projectId = getPlistStringValue(content, 'PROJECT_ID');
  const apiKey = getPlistStringValue(content, 'API_KEY');
  const appId = getPlistStringValue(content, 'GOOGLE_APP_ID');
  const senderId = getPlistStringValue(content, 'GCM_SENDER_ID');

  assertEqual(bundleId, 'com.ryvro.shiftplanner', `${label} BUNDLE_ID`);

  if (projectId !== 'ryvro-local') {
    addError(`${label} PROJECT_ID must stay on the local placeholder project`);
  }

  if (apiKey !== 'local-ryvro-placeholder') {
    addError(`${label} API_KEY must remain a placeholder and must not store real Firebase keys`);
  }

  if (appId !== '1:000000000000:ios:localryvroplaceholder') {
    addError(`${label} GOOGLE_APP_ID must remain the local placeholder app id`);
  }

  if (senderId !== '000000000000') {
    addError(`${label} GCM_SENDER_ID must remain the local placeholder sender id`);
  }

  assertAbsent(content, retiredFirebaseProjectPattern, label);
}

function findAndroidClient(parsed) {
  return Array.isArray(parsed?.client)
    ? parsed.client.find(
        (entry) =>
          entry?.client_info?.android_client_info?.package_name === 'com.ryvro.shiftplanner'
      )
    : null;
}

function getAndroidServiceValues(parsed) {
  const client = findAndroidClient(parsed);

  return {
    projectNumber: parsed?.project_info?.project_number || '',
    projectId: parsed?.project_info?.project_id || '',
    storageBucket: parsed?.project_info?.storage_bucket || '',
    client,
    appId: client?.client_info?.mobilesdk_app_id || '',
    packageName: client?.client_info?.android_client_info?.package_name || '',
    apiKey: client?.api_key?.[0]?.current_key || '',
  };
}

function validateAndroidGoogleService(parsed, label) {
  if (!parsed) {
    addError(`${label} is missing`);
    return;
  }

  const { projectNumber, projectId, storageBucket, client, appId, packageName } =
    getAndroidServiceValues(parsed);

  assertEqual(packageName, 'com.ryvro.shiftplanner', `${label} package_name`);

  if (!client) {
    addError(`${label} must include a client for com.ryvro.shiftplanner`);
  }

  if (!projectId || /placeholder|local/i.test(projectId)) {
    addError(
      `${label} project_info.project_id must be a real Firebase project; received ${
        projectId || '<missing>'
      }`
    );
  }

  if (retiredFirebaseProjectPattern.test(projectId)) {
    addError(
      `${label} project_info.project_id still points at a retired Firebase project: ${projectId}`
    );
  }

  if (projectId !== 'ryvro-shift-planner') {
    addError(`${label} project_info.project_id must be ryvro-shift-planner`);
  }

  if (projectNumber !== '1002666052675') {
    addError(`${label} project_info.project_number must be 1002666052675`);
  }

  if (storageBucket !== 'ryvro-shift-planner.firebasestorage.app') {
    addError(
      `${label} project_info.storage_bucket must be ryvro-shift-planner.firebasestorage.app`
    );
  }

  if (
    !/^1:\d+:android:[a-f0-9]+$/i.test(appId) ||
    appId.includes('000000000000') ||
    /placeholder|local/i.test(appId)
  ) {
    addError(
      `${label} client_info.mobilesdk_app_id must be a real Android Firebase app id; received ${
        appId || '<missing>'
      }`
    );
  }
}

function validateRootAndroidGoogleService(parsed) {
  const label = 'Root Android google-services.json';

  if (!parsed && isCi) {
    warnings.push(
      `${label} is ignored and unavailable in CI; release:env:check validates the real production service file before store builds.`
    );
    return;
  }

  validateAndroidGoogleService(parsed, label);
}

function validateTrackedAndroidLocalGoogleService(parsed) {
  const label = 'Tracked Android google-services.local.json';

  if (!parsed) {
    addError(`${label} is missing`);
    return;
  }

  const { projectNumber, projectId, storageBucket, appId, packageName, apiKey } =
    getAndroidServiceValues(parsed);

  assertEqual(packageName, 'com.ryvro.shiftplanner', `${label} package_name`);

  if (projectId !== 'ryvro-local') {
    addError(`${label} project_info.project_id must stay on the local placeholder project`);
  }

  if (projectNumber !== '000000000000') {
    addError(`${label} project_info.project_number must remain the local placeholder sender id`);
  }

  if (storageBucket !== 'ryvro-local.firebasestorage.app') {
    addError(`${label} project_info.storage_bucket must stay on the local placeholder bucket`);
  }

  if (apiKey !== 'local-ryvro-placeholder') {
    addError(`${label} API key must remain a placeholder and must not store real Firebase keys`);
  }

  if (appId !== '1:000000000000:android:localryvroplaceholder') {
    addError(`${label} mobilesdk_app_id must remain the local placeholder app id`);
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
assertEqual(appJsonExpo.android?.package, 'com.ryvro.shiftplanner', 'app.json android.package');
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
  dynamicExpo.ios?.googleServicesFile,
  './GoogleService-Info.plist',
  'app.config.js ios.googleServicesFile without env override'
);
assertEqual(
  dynamicExpo.android?.package,
  'com.ryvro.shiftplanner',
  'app.config.js android.package'
);
assertEqual(
  dynamicExpo.android?.googleServicesFile,
  './google-services.json',
  'app.config.js android.googleServicesFile without env override'
);
assertEqual(
  dynamicExpo.android?.adaptiveIcon?.foregroundImage,
  './assets/adaptive-icon.png',
  'app.config.js android.adaptiveIcon.foregroundImage'
);
assertEqual(dynamicExpo.web?.favicon, './assets/favicon.png', 'app.config.js web.favicon');

assertAbsent(readOptional('app.json'), retiredVisibleIdentityPattern, 'app.json');
assertAbsent(readOptional('app.config.js'), retiredVisibleIdentityPattern, 'app.config.js');
validateTrackedIosLocalGoogleService(
  readOptional('config/firebase/GoogleService-Info.local.plist')
);
validateTrackedAndroidLocalGoogleService(
  readOptionalJson('config/firebase/google-services.local.json')
);
validateRootIosGoogleService(readOptional('GoogleService-Info.plist'));
validateRootAndroidGoogleService(readOptionalJson('google-services.json'));

if (fs.existsSync(path.join(root, 'app.config.js.backup'))) {
  addError(
    'app.config.js.backup must not be tracked for the Ryvro launch; remove stale backup config files instead of carrying alternate app identity sources.'
  );
}

const generatedInfoPlist = readOptional('ios/RyvroShiftPlanner/Info.plist');
if (generatedInfoPlist) {
  if (
    !generatedInfoPlist.includes('<key>CFBundleDisplayName</key>') ||
    !generatedInfoPlist.includes('<string>Ryvro</string>')
  ) {
    addError('Generated iOS Info.plist must contain CFBundleDisplayName = Ryvro');
  }
  assertAbsent(generatedInfoPlist, retiredVisibleIdentityPattern, 'Generated iOS Info.plist');
}

const generatedAppDelegate = readOptional('ios/RyvroShiftPlanner/AppDelegate.swift');
if (generatedAppDelegate) {
  if (!generatedAppDelegate.includes('import FirebaseCore')) {
    addError('Generated iOS AppDelegate.swift must import FirebaseCore');
  }
  if (!generatedAppDelegate.includes('FirebaseApp.configure()')) {
    addError('Generated iOS AppDelegate.swift must configure the Firebase default app');
  }
}

const generatedXcodeProject = readOptional('ios/RyvroShiftPlanner.xcodeproj/project.pbxproj');
if (generatedXcodeProject) {
  if (!/PRODUCT_BUNDLE_IDENTIFIER = "?com\.ryvro\.shiftplanner"?;/.test(generatedXcodeProject)) {
    addError('Generated iOS Xcode project must build com.ryvro.shiftplanner');
  }
  if (!/PRODUCT_NAME = "?RyvroShiftPlanner"?;/.test(generatedXcodeProject)) {
    addError('Generated iOS Xcode project must build the RyvroShiftPlanner native product');
  }
  if (/TARGET_NAME = Ellie|PBXNativeTarget "Ellie"|name = Ellie;/.test(generatedXcodeProject)) {
    warnings.push(
      'Ignored generated iOS target/workspace still use Ellie internally; regenerate or rename native scaffolding before a final native archive if internal Xcode labels must be clean.'
    );
  }
}

const generatedIosGoogleService = readOptional('ios/RyvroShiftPlanner/GoogleService-Info.plist');
if (generatedIosGoogleService) {
  validateIosGoogleService(generatedIosGoogleService, 'Generated iOS GoogleService-Info.plist');
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

const generatedAndroidGoogleService = readOptionalJson('android/app/google-services.json');
if (generatedAndroidGoogleService) {
  validateAndroidGoogleService(
    generatedAndroidGoogleService,
    'Generated Android google-services.json'
  );
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
