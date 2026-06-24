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

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BUNDLE_ID = 'com.ryvro.shiftplanner';
const STORAGE_RELATIVE =
  'Library/Application Support/com.ryvro.shiftplanner/RCTAsyncLocalStorage_V1';
const MANIFEST = 'manifest.json';
const APP_PREFIX = 'app:';
const RAW_STORAGE_KEYS = new Set(['i18n:language', '@ellie_language']);
const ANDROID_STORAGE_DB = 'RKStorage';
const ANDROID_STORAGE_TABLE = 'catalystLocalStorage';

function isAndroidDetoxRun(): boolean {
  return Boolean(
    process.env.DETOX_ANDROID_AVD ||
    process.env.DETOX_ANDROID_ARCHS ||
    process.env.DETOX_CONFIGURATION?.toLowerCase().includes('android')
  );
}

function getIosDeviceId(deviceId?: string): string {
  return deviceId || process.env.DETOX_DEVICE_ID || process.env.SIMULATOR_UDID || 'booted';
}

function getAppDataContainer(deviceId?: string): string {
  return execFileSync(
    'xcrun',
    ['simctl', 'get_app_container', getIosDeviceId(deviceId), BUNDLE_ID, 'data'],
    {
      encoding: 'utf8',
    }
  ).trim();
}

function getManifestPath(deviceId?: string): string {
  const container = getAppDataContainer(deviceId);
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
      const fullKey = RAW_STORAGE_KEYS.has(key) ? key : `${APP_PREFIX}${key}`;
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
export function seedStorage(items: Record<string, unknown>, deviceId?: string): void {
  if (isAndroidDetoxRun()) {
    replaceAndroidStorage(items);
    return;
  }

  const manifestPath = getManifestPath(deviceId);
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
    const fullKey = RAW_STORAGE_KEYS.has(key) ? key : `${APP_PREFIX}${key}`;
    manifest[fullKey] = serialize(value);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}

function shouldClearSeededKey(key: string): boolean {
  return (
    key.startsWith(`${APP_PREFIX}e2e:`) ||
    key.startsWith(`${APP_PREFIX}onboarding:`) ||
    RAW_STORAGE_KEYS.has(key)
  );
}

/**
 * Remove E2E auth, onboarding, and language seed keys from the manifest.
 */
export function clearE2ESeedKeys(deviceId?: string): void {
  if (isAndroidDetoxRun()) {
    removeAndroidStorageFiles();
    return;
  }

  const manifestPath = getManifestPath(deviceId);
  if (!fs.existsSync(manifestPath)) return;

  let manifest: Record<string, string | null>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, string | null>;
  } catch {
    return;
  }

  for (const key of Object.keys(manifest)) {
    if (shouldClearSeededKey(key)) {
      delete manifest[key];
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
}
