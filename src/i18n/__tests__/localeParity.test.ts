import fs from 'fs';
import path from 'path';

const LOCALES_ROOT = path.resolve(__dirname, '..', 'locales');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
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

function collectSourceFiles(dir: string, output: string[] = []): string[] {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    if (entry.name === '__tests__') {
      return;
    }

    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(nextPath, output);
      return;
    }

    if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      output.push(nextPath);
    }
  });

  return output;
}

function collectCodeTranslationKeys(): string[] {
  const codeFiles = [
    ...collectSourceFiles(path.join(PROJECT_ROOT, 'src')),
    path.join(PROJECT_ROOT, 'App.tsx'),
  ];
  const keyPattern =
    /(?:\bt\(|\bi18n\.t\(|\btCommon\(|\btOnboarding\(|\btDashboard\(|\btProfile\(|\btSchedule\()\s*['"]([^'"]+)['"]/g;
  const keys = new Set<string>();

  codeFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    let match: RegExpExecArray | null;

    while ((match = keyPattern.exec(source)) !== null) {
      const key = match[1];
      if (!key.includes('${')) {
        keys.add(key);
      }
    }
  });

  return Array.from(keys).sort();
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

  it('all static translation keys referenced in code exist in the English source locale', () => {
    const baselineKeys = new Set<string>();

    NAMESPACES.forEach((namespace) => {
      const baselinePath = path.join(LOCALES_ROOT, 'en', `${namespace}.json`);
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, unknown>;

      flattenKeys(baseline).forEach((key) => baselineKeys.add(key));
    });

    const missingKeys = collectCodeTranslationKeys().filter((key) => !baselineKeys.has(key));

    expect(missingKeys).toEqual([]);
  });

  it('localizes launch-critical Profile help and legal strings', () => {
    const keys = [
      'sections.legalSupport',
      'legal.support.title',
      'legal.support.hint',
      'legal.support.a11y',
      'legal.deleteAccount.title',
      'legal.deleteAccount.hint',
      'legal.deleteAccount.a11y',
      'legal.privacy.title',
      'legal.privacy.hint',
      'legal.privacy.a11y',
      'legal.terms.title',
      'legal.terms.hint',
      'legal.terms.a11y',
    ];
    const baselinePath = path.join(LOCALES_ROOT, 'en', 'profile.json');
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, unknown>;
    const baselineStrings = flattenStringValues(baseline);
    const untranslated: string[] = [];

    locales
      .filter((locale) => locale !== 'en')
      .forEach((locale) => {
        const localePath = path.join(LOCALES_ROOT, locale, 'profile.json');
        const localized = JSON.parse(fs.readFileSync(localePath, 'utf8')) as Record<
          string,
          unknown
        >;
        const localizedStrings = flattenStringValues(localized);

        keys.forEach((key) => {
          if (localizedStrings.get(key) === baselineStrings.get(key)) {
            untranslated.push(`${locale}:${key}`);
          }
        });
      });

    expect(untranslated).toEqual([]);
  });

  it('does not expose technical cycle-alignment terms in onboarding copy', () => {
    const forbiddenPhrases = [
      'phase offset',
      'offset fase',
      'deslocamento de fase',
      'desfase de fase',
      'décalage de phase',
      'faseverskuiwing',
      'смещение фазы',
      'إزاحة المرحلة',
      'फेज़ ऑफ़सेट',
      '阶段偏移',
      'anchor date',
    ];

    locales.forEach((locale) => {
      const localePath = path.join(LOCALES_ROOT, locale, 'onboarding.json');
      const localized = JSON.parse(fs.readFileSync(localePath, 'utf8')) as Record<string, unknown>;
      const strings = Array.from(flattenStringValues(localized).entries());
      const matches = strings
        .filter(([, value]) =>
          forbiddenPhrases.some((phrase) => value.toLowerCase().includes(phrase))
        )
        .map(([key, value]) => `${locale}:${key}=${value}`);

      expect(matches).toEqual([]);
    });
  });
});
