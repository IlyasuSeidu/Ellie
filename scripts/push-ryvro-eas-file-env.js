#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {
    envFile: '.env',
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--env-file') {
      args.envFile = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--force') {
      args.force = true;
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

function resolveEnvPath(envPath, value) {
  return path.isAbsolute(value) ? value : path.resolve(path.dirname(envPath), value);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(result.status || 1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function requirePath(env, envPath, key) {
  const value = env[key]?.trim();
  if (!value) {
    console.error(`${key} must be set in ${envPath}`);
    process.exit(1);
  }

  const absolutePath = resolveEnvPath(envPath, value);
  if (!fs.existsSync(absolutePath)) {
    console.error(`${key} file does not exist at ${absolutePath}`);
    process.exit(1);
  }

  return value;
}

function pushFileVariable(name, value, force) {
  const args = [
    'eas-cli',
    'env:create',
    'production',
    '--name',
    name,
    '--type',
    'file',
    '--visibility',
    'secret',
    '--value',
    value,
    '--non-interactive',
  ];

  if (force) {
    args.push('--force');
  }

  run('npx', args);
}

function main() {
  const { envFile, force } = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    console.error(`Missing env file: ${envPath}`);
    process.exit(1);
  }

  run('node', ['scripts/verify-ryvro-production-env.js', '--env-file', envFile]);

  const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  const iosFile = requirePath(env, envPath, 'EXPO_IOS_GOOGLE_SERVICES_FILE');
  const androidFile = requirePath(env, envPath, 'EXPO_ANDROID_GOOGLE_SERVICES_FILE');

  console.log('Ryvro production env check passed. Pushing Firebase service files to EAS.');
  pushFileVariable('GOOGLE_SERVICES_PLIST', iosFile, force);
  pushFileVariable('GOOGLE_SERVICES_JSON', androidFile, force);
  console.log('Ryvro EAS Firebase service file variables are configured for production.');
}

main();
