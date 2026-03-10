import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { LanguageDetectorAsyncModule } from 'i18next';

export const LANGUAGE_KEY = '@ellie_language';
export const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'pt-BR',
  'fr',
  'ar',
  'zh-CN',
  'ru',
  'hi',
  'af',
  'zu',
  'id',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const SUPPORTED_LANGUAGE_SET = new Set<SupportedLanguage>(SUPPORTED_LANGUAGES);

export function normalizeLanguage(rawLanguage?: string | null): SupportedLanguage {
  if (!rawLanguage) {
    return 'en';
  }

  if (SUPPORTED_LANGUAGE_SET.has(rawLanguage as SupportedLanguage)) {
    return rawLanguage as SupportedLanguage;
  }

  const lower = rawLanguage.toLowerCase();

  if (lower.startsWith('es')) {
    return 'es';
  }

  if (lower.startsWith('pt')) {
    return 'pt-BR';
  }

  if (lower.startsWith('fr')) {
    return 'fr';
  }

  if (lower.startsWith('ar')) {
    return 'ar';
  }

  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }

  if (lower.startsWith('ru')) {
    return 'ru';
  }

  if (lower.startsWith('hi')) {
    return 'hi';
  }

  if (lower.startsWith('af')) {
    return 'af';
  }

  if (lower.startsWith('zu')) {
    return 'zu';
  }

  if (lower.startsWith('id')) {
    return 'id';
  }

  return 'en';
}

function getDeviceLanguage(): string {
  const locales = Localization.getLocales();
  return locales[0]?.languageTag ?? locales[0]?.languageCode ?? 'en';
}

export const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {
    // No initialization needed.
  },
  detect: (callback) => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((savedLanguage) => {
        if (savedLanguage) {
          callback(normalizeLanguage(savedLanguage));
          return;
        }

        callback(normalizeLanguage(getDeviceLanguage()));
      })
      .catch(() => {
        callback('en');
      });
  },
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, normalizeLanguage(language));
    } catch {
      // Ignore persistence errors to avoid blocking language switch.
    }
  },
};
