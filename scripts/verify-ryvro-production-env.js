#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = { envFile: '.env' };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env-file') {
      args.envFile = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function parseEnvFile(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) return accumulator;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key) accumulator[key] = value;
      return accumulator;
    }, {});
}

function isPlaceholder(value) {
  return (
    !value ||
    /^(your-|FILL_|YOUR_|example-|placeholder|xxx|appl_x+|goog_x+)/i.test(value) ||
    /^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(value) ||
    value.includes('REPLACE') ||
    value.includes('your-project-id') ||
    value.includes('REGION-PROJECT') ||
    value.includes('<region>') ||
    value.includes('<project-id>')
  );
}

function requireValue(errors, env, key, predicate, message) {
  const value = env[key]?.trim();
  if (!value || isPlaceholder(value) || (predicate && !predicate(value))) {
    errors.push(`${key}: ${message}`);
  }
}

function requireMatchingValue(errors, env, key, expectedKey, message) {
  const value = env[key]?.trim();
  const expected = env[expectedKey]?.trim();

  if (!value || isPlaceholder(value) || value !== expected) {
    errors.push(`${key}: ${message}`);
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isProductionHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      !parsed.hostname.endsWith('.local') &&
      !parsed.hostname.includes('ellie')
    );
  } catch {
    return false;
  }
}

function isUuid(value) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
    !/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(value)
  );
}

function isFirebaseApiKey(value) {
  return /^AIza[A-Za-z0-9_-]{20,}$/.test(value);
}

function isFirebaseAppId(value) {
  return /^1:\d+:(web|ios|android):[A-Za-z0-9_-]+$/.test(value);
}

function main() {
  const { envFile } = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    console.error(`Missing env file: ${envPath}`);
    process.exitCode = 1;
    return;
  }

  const env = {
    ...parseEnvFile(fs.readFileSync(envPath, 'utf8')),
    ...process.env,
  };
  const errors = [];

  requireValue(errors, env, 'APP_ENV', (value) => value === 'production', 'must be production');
  requireValue(errors, env, 'EAS_PROJECT_ID', isUuid, 'must be the real EAS project UUID');
  requireValue(errors, env, 'FIREBASE_PROJECT_ID', undefined, 'must be the Ryvro Firebase project');
  requireValue(
    errors,
    env,
    'FIREBASE_API_KEY',
    isFirebaseApiKey,
    'must be the real Ryvro Firebase web API key'
  );
  requireValue(
    errors,
    env,
    'FIREBASE_AUTH_DOMAIN',
    (value) => value === `${env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
    'must match FIREBASE_PROJECT_ID as <project-id>.firebaseapp.com'
  );
  requireValue(
    errors,
    env,
    'FIREBASE_STORAGE_BUCKET',
    (value) =>
      value === `${env.FIREBASE_PROJECT_ID}.firebasestorage.app` ||
      value === `${env.FIREBASE_PROJECT_ID}.appspot.com`,
    'must match FIREBASE_PROJECT_ID as a Firebase Storage bucket'
  );
  requireValue(
    errors,
    env,
    'FIREBASE_MESSAGING_SENDER_ID',
    (value) => /^\d{6,}$/.test(value),
    'must be the numeric Ryvro Firebase messaging sender ID'
  );
  requireValue(
    errors,
    env,
    'FIREBASE_APP_ID',
    isFirebaseAppId,
    'must be the real Ryvro Firebase app ID'
  );
  requireValue(
    errors,
    env,
    'API_BASE_URL',
    isProductionHttpsUrl,
    'must be the live HTTPS Ryvro API base URL, not localhost, HTTP, or a retired Ellie host'
  );
  requireValue(
    errors,
    env,
    'GOOGLE_WEB_CLIENT_ID',
    (value) => value.endsWith('.apps.googleusercontent.com'),
    'must be the real Google web OAuth client ID'
  );
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'GOOGLE_WEB_CLIENT_ID',
    'must match GOOGLE_WEB_CLIENT_ID so the Expo runtime receives the same Ryvro web OAuth client'
  );
  requireValue(
    errors,
    env,
    'GOOGLE_IOS_CLIENT_ID',
    (value) => value.endsWith('.apps.googleusercontent.com'),
    'must be the real Google iOS OAuth client ID for com.ryvro.shiftplanner'
  );
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    'GOOGLE_IOS_CLIENT_ID',
    'must match GOOGLE_IOS_CLIENT_ID so the Expo runtime receives the same Ryvro iOS OAuth client'
  );
  requireValue(
    errors,
    env,
    'RYVRO_BRAIN_URL',
    (value) =>
      /^https:\/\/.+\.cloudfunctions\.net\/ryvroBrain$/.test(value) &&
      !value.includes('ellieBrain'),
    'must be the deployed ryvroBrain HTTPS function URL'
  );
  requireValue(
    errors,
    env,
    'REVENUECAT_IOS_KEY',
    (value) => /^appl_[A-Za-z0-9]+/.test(value) && !value.startsWith('appl_test'),
    'must be a real Ryvro iOS RevenueCat SDK key, not a test_ or placeholder key'
  );
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
    'REVENUECAT_IOS_KEY',
    'must match REVENUECAT_IOS_KEY so the Expo runtime receives the same Ryvro iOS SDK key'
  );
  requireValue(
    errors,
    env,
    'REVENUECAT_ANDROID_KEY',
    (value) => /^goog_[A-Za-z0-9]+/.test(value) && !value.startsWith('goog_test'),
    'must be a real Ryvro Android RevenueCat SDK key, not a test_ or placeholder key'
  );
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
    'REVENUECAT_ANDROID_KEY',
    'must match REVENUECAT_ANDROID_KEY so the Expo runtime receives the same Ryvro Android SDK key'
  );
  requireValue(errors, env, 'REVENUECAT_ENTITLEMENT_ID', (value) => value === 'pro', 'must be pro');
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID',
    'REVENUECAT_ENTITLEMENT_ID',
    'must match REVENUECAT_ENTITLEMENT_ID so the Expo runtime checks the same Ryvro entitlement'
  );
  requireValue(
    errors,
    env,
    'LEGAL_PRIVACY_POLICY_URL',
    isHttpsUrl,
    'must be the live HTTPS Ryvro privacy policy URL'
  );
  requireValue(
    errors,
    env,
    'LEGAL_TERMS_OF_SERVICE_URL',
    isHttpsUrl,
    'must be the live HTTPS Ryvro terms URL'
  );
  requireValue(errors, env, 'SUPPORT_URL', isHttpsUrl, 'must be the live HTTPS Ryvro support URL');

  if (env.ELLIE_BRAIN_URL?.trim()) {
    errors.push('ELLIE_BRAIN_URL: leave empty for new Ryvro production builds');
  }

  if (env.AI_SHIFT_BUILDER_ENABLED === 'true') {
    requireValue(
      errors,
      env,
      'SHIFT_SCHEDULE_PARSER_URL',
      (value) => /^https:\/\/.+\.cloudfunctions\.net\/parseShiftScheduleDescription$/.test(value),
      'must be the deployed parseShiftScheduleDescription HTTPS function URL when AI builder is enabled'
    );
  }

  if (errors.length > 0) {
    console.error('Ryvro production env check failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Ryvro production env check passed for ${envPath}`);
}

main();
