import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageDetectorAsyncModule } from 'i18next';
import { STORAGE_KEYS } from '@/constants/storageKeys';

export const LANGUAGE_KEY = STORAGE_KEYS.i18n.language;
export const RETIRED_LANGUAGE_PREFERENCE_KEY = STORAGE_KEYS.i18n.retiredLanguagePreference;
export const SUPPORTED_LANGUAGES = ['en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(rawLanguage?: string | null): SupportedLanguage {
  void rawLanguage;
  return 'en';
}

export const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {
    // No initialization needed.
  },
  detect: (callback) => {
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then(async (savedLanguage) => {
        if (savedLanguage) {
          callback('en');
          return;
        }

        const retiredLanguagePreference = await AsyncStorage.getItem(
          RETIRED_LANGUAGE_PREFERENCE_KEY
        );
        if (retiredLanguagePreference) {
          await AsyncStorage.setItem(LANGUAGE_KEY, 'en');
          await AsyncStorage.removeItem(RETIRED_LANGUAGE_PREFERENCE_KEY);
          callback('en');
          return;
        }

        callback('en');
      })
      .catch(() => {
        callback('en');
      });
  },
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, normalizeLanguage(language));
      await AsyncStorage.removeItem(RETIRED_LANGUAGE_PREFERENCE_KEY);
    } catch {
      // Ignore persistence errors to avoid blocking language switch.
    }
  },
};
