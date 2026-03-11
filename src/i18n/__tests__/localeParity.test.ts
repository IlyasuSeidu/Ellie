import fs from 'fs';
import path from 'path';

const LOCALES_ROOT = path.resolve(__dirname, '..', 'locales');
const NAMESPACES = ['common', 'onboarding', 'dashboard', 'profile', 'schedule'] as const;

function flattenKeys(value: unknown, prefix = '', output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    output.add(prefix);
    return output;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenKeys(child, nextPrefix, output);
    });
    return output;
  }

  output.add(prefix);
  return output;
}

function flattenStringValues(
  value: unknown,
  prefix = '',
  output = new Map<string, string>()
): Map<string, string> {
  if (Array.isArray(value)) {
    return output;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenStringValues(child, nextPrefix, output);
    });
    return output;
  }

  if (typeof value === 'string') {
    output.set(prefix, value);
  }

  return output;
}

function extractInterpolationTokens(value: string): string[] {
  const tokenRegex = /\{\{\s*([\w.]+)\s*\}\}/g;
  const tokens = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    tokens.add(match[1]);
  }

  return Array.from(tokens).sort();
}

describe('locale parity', () => {
  const locales = fs
    .readdirSync(LOCALES_ROOT)
    .filter((entry) => fs.statSync(path.join(LOCALES_ROOT, entry)).isDirectory())
    .sort();

  it('all locale files include all baseline keys', () => {
    const baselineLocale = 'en';
    const targetLocales = locales.filter((locale) => locale !== baselineLocale);

    NAMESPACES.forEach((namespace) => {
      const baselinePath = path.join(LOCALES_ROOT, baselineLocale, `${namespace}.json`);
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, unknown>;
      const baselineKeys = flattenKeys(baseline);

      targetLocales.forEach((locale) => {
        const localePath = path.join(LOCALES_ROOT, locale, `${namespace}.json`);
        const localized = JSON.parse(fs.readFileSync(localePath, 'utf8')) as Record<
          string,
          unknown
        >;
        const localizedKeys = flattenKeys(localized);

        const missingKeys = Array.from(baselineKeys).filter((key) => !localizedKeys.has(key));

        expect(missingKeys).toEqual([]);
      });
    });
  });

  it('interpolation tokens match baseline for translated strings', () => {
    const baselineLocale = 'en';
    const targetLocales = locales.filter((locale) => locale !== baselineLocale);

    NAMESPACES.forEach((namespace) => {
      const baselinePath = path.join(LOCALES_ROOT, baselineLocale, `${namespace}.json`);
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, unknown>;
      const baselineStrings = flattenStringValues(baseline);

      targetLocales.forEach((locale) => {
        const localePath = path.join(LOCALES_ROOT, locale, `${namespace}.json`);
        const localized = JSON.parse(fs.readFileSync(localePath, 'utf8')) as Record<
          string,
          unknown
        >;
        const localizedStrings = flattenStringValues(localized);

        baselineStrings.forEach((baselineValue, key) => {
          const localizedValue = localizedStrings.get(key);
          if (localizedValue === undefined) {
            return;
          }

          const baselineTokens = extractInterpolationTokens(baselineValue);
          const localizedTokens = extractInterpolationTokens(localizedValue);

          expect(localizedTokens).toEqual(baselineTokens);
        });
      });
    });
  });
});
