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

function main() {
  const { envFile, force } = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    console.error(`Missing env file: ${envPath}`);
    process.exit(1);
  }

  run('node', ['scripts/verify-ryvro-production-env.js', '--env-file', envFile]);

  const easArgs = ['eas-cli', 'env:push', 'production', '--path', envFile];
  if (force) {
    easArgs.push('--force');
  }

  console.log('Ryvro production env check passed. Pushing checked values to EAS production.');
  run('npx', easArgs);
  console.log(
    [
      'Plain production env values are pushed.',
      'Create or refresh Firebase native service files as separate EAS file variables before cloud builds:',
      'npm run release:env:files',
    ].join('\n')
  );
}

main();
