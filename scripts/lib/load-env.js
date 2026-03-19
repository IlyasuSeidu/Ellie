/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = parseEnvValue(line.slice(separatorIndex + 1));

      if (!key) {
        return accumulator;
      }

      accumulator[key] = value;
      return accumulator;
    }, {});
}

function loadSimpleEnv(rootDir) {
  const files = ['.env', '.env.local'].map((fileName) => path.join(rootDir, fileName));
  const loaded = {};

  files.forEach((filePath) => {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return;
    }

    const parsed = parseEnvFile(fs.readFileSync(filePath, 'utf8'));
    Object.assign(loaded, parsed);
  });

  Object.entries(loaded).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });

  return loaded;
}

module.exports = {
  loadSimpleEnv,
};
