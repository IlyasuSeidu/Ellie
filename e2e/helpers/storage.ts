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

import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BUNDLE_ID = 'com.ryvro.shiftplanner';
const STORAGE_RELATIVE =
  'Library/Application Support/com.ryvro.shiftplanner/RCTAsyncLocalStorage_V1';
const MANIFEST = 'manifest.json';
const APP_PREFIX = 'app:';
const ANDROID_STORAGE_DB = 'RKStorage';
const ANDROID_STORAGE_TABLE = 'catalystLocalStorage';

function isAndroidDetoxRun(): boolean {
  return Boolean(
    process.env.DETOX_ANDROID_AVD ||
    process.env.DETOX_ANDROID_ARCHS ||
    process.env.DETOX_CONFIGURATION?.toLowerCase().includes('android')
  );
}

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

function sqliteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function getAdbPath(): string {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    const candidate = path.join(androidHome, 'platform-tools', 'adb');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'adb';
}

function createAndroidStorageDb(items: Record<string, unknown>): string {
  const dbPath = path.join(os.tmpdir(), `ryvro-e2e-${Date.now()}-${Math.random()}.db`);
  const statements = [
    `CREATE TABLE ${ANDROID_STORAGE_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
    ...Object.entries(items).map(([key, value]) => {
      const fullKey = `${APP_PREFIX}${key}`;
      return `INSERT OR REPLACE INTO ${ANDROID_STORAGE_TABLE} (key, value) VALUES (${sqliteLiteral(
        fullKey
      )}, ${sqliteLiteral(serialize(value))});`;
    }),
    'PRAGMA user_version = 1;',
  ];

  execFileSync('sqlite3', [dbPath], {
    input: statements.join('\n'),
  });
  return dbPath;
}

function removeAndroidStorageFiles(adb = getAdbPath()): void {
  execFileSync(adb, [
    'shell',
    'run-as',
    BUNDLE_ID,
    'rm',
    '-f',
    `databases/${ANDROID_STORAGE_DB}`,
    `databases/${ANDROID_STORAGE_DB}-journal`,
    `databases/${ANDROID_STORAGE_DB}-shm`,
    `databases/${ANDROID_STORAGE_DB}-wal`,
  ]);
}

function replaceAndroidStorage(items: Record<string, unknown>): void {
  const adb = getAdbPath();
  const dbPath = createAndroidStorageDb(items);
  const remotePath = `/data/local/tmp/${path.basename(dbPath)}`;
  const runAs = (...args: string[]) => execFileSync(adb, ['shell', 'run-as', BUNDLE_ID, ...args]);

  try {
    execFileSync(adb, ['shell', 'am', 'force-stop', BUNDLE_ID]);
    execFileSync(adb, ['push', dbPath, remotePath]);
    try {
      runAs('mkdir', 'databases');
    } catch {
      // The directory already exists on most launches.
    }
    removeAndroidStorageFiles(adb);
    runAs('cp', remotePath, `databases/${ANDROID_STORAGE_DB}`);
    runAs('chmod', '600', `databases/${ANDROID_STORAGE_DB}`);
    execFileSync(adb, ['shell', 'rm', '-f', remotePath]);
  } finally {
    fs.rmSync(dbPath, { force: true });
  }
}

/**
 * Write multiple logical keys into the app's AsyncStorage manifest.json.
 * Call this BEFORE device.launchApp() so the app boots with the seeded state.
 *
 * @param items  Map of logical key → value (e.g. { 'onboarding:complete': true })
 */
export function seedStorage(items: Record<string, unknown>): void {
  if (isAndroidDetoxRun()) {
    replaceAndroidStorage(items);
    return;
  }

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
  if (isAndroidDetoxRun()) {
    removeAndroidStorageFiles();
    return;
  }

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
