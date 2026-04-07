/**
 * E2E Storage Seeder
 *
 * Writes values directly into the iOS simulator's AsyncStorage manifest
 * before the app launches, so tests can pre-seed auth and onboarding state
 * without going through any real authentication flow.
 *
 * Key format mirrors AsyncStorageService:
 *   logical key  →  "app:" + key  (stored in RCTAsyncLocalStorage_V1/manifest.json)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BUNDLE_ID = 'com.ellie.minershiftassistant';
const STORAGE_RELATIVE =
  'Library/Application Support/com.ellie.minershiftassistant/RCTAsyncLocalStorage_V1';
const MANIFEST = 'manifest.json';
const APP_PREFIX = 'app:';

function getAppDataContainer(): string {
  return execSync(`xcrun simctl get_app_container booted ${BUNDLE_ID} data`, {
    encoding: 'utf8',
  }).trim();
}

function getManifestPath(): string {
  const container = getAppDataContainer();
  return path.join(container, STORAGE_RELATIVE, MANIFEST);
}

/**
 * Mirrors AsyncStorageService.serialize():
 *  - strings stored as-is
 *  - everything else JSON.stringify'd
 */
function serialize(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Write multiple logical keys into the app's AsyncStorage manifest.json.
 * Call this BEFORE device.launchApp() so the app boots with the seeded state.
 *
 * @param items  Map of logical key → value (e.g. { 'onboarding:complete': true })
 */
export function seedStorage(items: Record<string, unknown>): void {
  const manifestPath = getManifestPath();
  const dir = path.dirname(manifestPath);

  fs.mkdirSync(dir, { recursive: true });

  let manifest: Record<string, string | null> = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, string | null>;
    } catch {
      manifest = {};
    }
  }

  for (const [key, value] of Object.entries(items)) {
    manifest[`${APP_PREFIX}${key}`] = serialize(value);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

/**
 * Remove all keys with the "app:e2e:" prefix from the manifest.
 */
export function clearE2ESeedKeys(): void {
  const manifestPath = getManifestPath();
  if (!fs.existsSync(manifestPath)) return;

  let manifest: Record<string, string | null>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, string | null>;
  } catch {
    return;
  }

  for (const key of Object.keys(manifest)) {
    if (key.startsWith(`${APP_PREFIX}e2e:`)) {
      delete manifest[key];
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}
