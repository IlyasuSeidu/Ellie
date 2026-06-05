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

function resolveEnvPath(envPath, value) {
  return path.isAbsolute(value) ? value : path.resolve(path.dirname(envPath), value);
}

function requireNativeServiceFile(errors, env, envPath, key, expectedFileName, validate) {
  const value = env[key]?.trim();

  if (!value || isPlaceholder(value)) {
    errors.push(`${key}: must point to the real ${expectedFileName} file downloaded for Ryvro`);
    return;
  }

  if (path.basename(value) !== expectedFileName) {
    errors.push(`${key}: must point to ${expectedFileName}`);
    return;
  }

  if (/\/(ios|android)\//.test(value.replace(/\\/g, '/'))) {
    errors.push(
      `${key}: keep the production Firebase service file outside generated ios/ and android/ folders so clean prebuilds do not delete the source file`
    );
    return;
  }

  if (/config\/firebase|\.local\./i.test(value.replace(/\\/g, '/'))) {
    errors.push(`${key}: must not use tracked local placeholder Firebase service files`);
    return;
  }

  const absolutePath = resolveEnvPath(envPath, value);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${key}: ${expectedFileName} does not exist at ${absolutePath}`);
    return;
  }

  try {
    validate(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    errors.push(`${key}: ${error.message}`);
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
      !parsed.hostname.includes('example') &&
      !parsed.hostname.includes('ellie')
    );
  } catch {
    return false;
  }
}

function isRyvroPublicUrl(value, pathPattern) {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.includes('ryvro') &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      !parsed.hostname.endsWith('.local') &&
      !parsed.hostname.includes('example') &&
      !hasRetiredRyvroName(parsed.hostname) &&
      pathPattern.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function hasRetiredRyvroName(value) {
  return /(ellie|shift[-_]?sync|mineshift|miner)/i.test(value);
}

function isRyvroFirebaseProjectId(value) {
  return (
    /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(value) &&
    value.includes('ryvro') &&
    !hasRetiredRyvroName(value)
  );
}

function isRyvroCloudFunctionUrl(value, functionName) {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.cloudfunctions.net') &&
      parsed.pathname === `/${functionName}` &&
      parsed.hostname.includes('ryvro') &&
      !hasRetiredRyvroName(parsed.hostname) &&
      !hasRetiredRyvroName(parsed.pathname)
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
  requireValue(
    errors,
    env,
    'FIREBASE_PROJECT_ID',
    isRyvroFirebaseProjectId,
    'must be the Ryvro Firebase project ID and must not contain retired Ellie/ShiftSync names'
  );
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
  requireNativeServiceFile(
    errors,
    env,
    envPath,
    'EXPO_IOS_GOOGLE_SERVICES_FILE',
    'GoogleService-Info.plist',
    (content) => {
      if (hasRetiredRyvroName(content) || content.includes('ryvro-local')) {
        throw new Error('must be a fresh Ryvro production plist, not a retired or local file');
      }

      if (!content.includes('<key>BUNDLE_ID</key>')) {
        throw new Error('must include BUNDLE_ID');
      }

      if (!content.includes('<string>com.ryvro.shiftplanner</string>')) {
        throw new Error('must target BUNDLE_ID com.ryvro.shiftplanner');
      }

      if (!content.includes('<key>PROJECT_ID</key>')) {
        throw new Error('must include PROJECT_ID');
      }

      if (!content.includes(`<string>${env.FIREBASE_PROJECT_ID}</string>`)) {
        throw new Error('PROJECT_ID must match FIREBASE_PROJECT_ID');
      }
    }
  );
  requireNativeServiceFile(
    errors,
    env,
    envPath,
    'EXPO_ANDROID_GOOGLE_SERVICES_FILE',
    'google-services.json',
    (content) => {
      if (hasRetiredRyvroName(content) || content.includes('ryvro-local')) {
        throw new Error('must be a fresh Ryvro production JSON file, not a retired or local file');
      }

      const parsed = JSON.parse(content);
      const projectId = parsed?.project_info?.project_id;
      const packageNames =
        parsed?.client
          ?.map((client) => client?.client_info?.android_client_info?.package_name)
          .filter(Boolean) || [];

      if (projectId !== env.FIREBASE_PROJECT_ID) {
        throw new Error('project_info.project_id must match FIREBASE_PROJECT_ID');
      }

      if (!packageNames.includes('com.ryvro.shiftplanner')) {
        throw new Error('must include Android package com.ryvro.shiftplanner');
      }
    }
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
    'GOOGLE_ANDROID_CLIENT_ID',
    (value) => value.endsWith('.apps.googleusercontent.com'),
    'must be the real Google Android OAuth client ID for com.ryvro.shiftplanner'
  );
  requireMatchingValue(
    errors,
    env,
    'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
    'GOOGLE_ANDROID_CLIENT_ID',
    'must match GOOGLE_ANDROID_CLIENT_ID so the Expo runtime receives the same Ryvro Android OAuth client'
  );
  requireValue(
    errors,
    env,
    'RYVRO_BRAIN_URL',
    (value) => isRyvroCloudFunctionUrl(value, 'ryvroBrain'),
    'must be the deployed ryvroBrain HTTPS function URL scoped to a Ryvro Firebase project, not a retired Ellie/ShiftSync host'
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
    (value) => isRyvroPublicUrl(value, /privacy/i),
    'must be the live HTTPS Ryvro privacy policy URL on a Ryvro-owned domain'
  );
  requireValue(
    errors,
    env,
    'LEGAL_TERMS_OF_SERVICE_URL',
    (value) => isRyvroPublicUrl(value, /(terms|legal)/i),
    'must be the live HTTPS Ryvro terms URL on a Ryvro-owned domain'
  );
  requireValue(
    errors,
    env,
    'SUPPORT_URL',
    (value) => isRyvroPublicUrl(value, /(support|help)/i),
    'must be the live HTTPS Ryvro support URL on a Ryvro-owned domain'
  );
  requireValue(
    errors,
    env,
    'ACCOUNT_DELETION_URL',
    (value) => isRyvroPublicUrl(value, /(delete-account|account-deletion|delete|deletion)/i),
    'must be the live HTTPS Ryvro account deletion URL on a Ryvro-owned domain'
  );

  if (Object.prototype.hasOwnProperty.call(env, 'ELLIE_BRAIN_URL')) {
    errors.push(
      'ELLIE_BRAIN_URL: remove retired Ellie voice endpoint keys from Ryvro production env files'
    );
  }

  if (Object.prototype.hasOwnProperty.call(env, 'ELLIE_BRAIN_TIMEOUT')) {
    errors.push(
      'ELLIE_BRAIN_TIMEOUT: remove retired Ellie voice endpoint keys from Ryvro production env files'
    );
  }

  if (env.AI_SHIFT_BUILDER_ENABLED === 'true') {
    requireValue(
      errors,
      env,
      'SHIFT_SCHEDULE_PARSER_URL',
      (value) => isRyvroCloudFunctionUrl(value, 'parseShiftScheduleDescription'),
      'must be the deployed parseShiftScheduleDescription HTTPS function URL scoped to a Ryvro Firebase project when AI builder is enabled'
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
